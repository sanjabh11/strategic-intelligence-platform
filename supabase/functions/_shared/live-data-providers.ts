export interface StrategicEventSeed {
  eventId: string
  date: string
  actor1: string
  actor2: string
  eventCode: string
  goldsteinScale: number
  avgTone: number
  sourceUrl: string
}

export interface MarketPricePoint {
  asset: string
  price: number
  currency: string
  unit: string
  change_24h: number
}

export interface ProviderDetail {
  name: string
  mode: 'live' | 'degraded' | 'unconfigured' | 'simulated'
  url?: string
  note?: string
}

export interface ProviderDiagnostics {
  provider: string
  mode: 'live' | 'degraded' | 'simulated'
  warnings: string[]
  details: ProviderDetail[]
  sources: string[]
  fetched_at: string
}

export interface EventFeedResult {
  events: StrategicEventSeed[]
  diagnostics: ProviderDiagnostics
}

export interface MarketFeedResult {
  prices: MarketPricePoint[]
  diagnostics: ProviderDiagnostics
}

export interface EventFeedProvider {
  name: string
  fetchEvents: () => Promise<EventFeedResult>
}

export interface MarketFeedProvider {
  name: string
  fetchPrices: () => Promise<MarketFeedResult>
}

const simulatedEvents: StrategicEventSeed[] = [
  {
    eventId: 'SIM-GDELT-001',
    date: '20260426',
    actor1: 'USA',
    actor2: 'CHN',
    eventCode: '046',
    goldsteinScale: 4,
    avgTone: -1.2,
    sourceUrl: 'https://example.com/local-simulation/us-china-trade-talks'
  },
  {
    eventId: 'SIM-GDELT-002',
    date: '20260426',
    actor1: 'RUS',
    actor2: 'UKR',
    eventCode: '190',
    goldsteinScale: -5,
    avgTone: -8.5,
    sourceUrl: 'https://example.com/local-simulation/russia-ukraine-conflict'
  },
  {
    eventId: 'SIM-GDELT-003',
    date: '20260426',
    actor1: 'EU',
    actor2: 'UK',
    eventCode: '043',
    goldsteinScale: 3,
    avgTone: 2.1,
    sourceUrl: 'https://example.com/local-simulation/eu-uk-cooperation'
  }
]

const simulatedPrices: MarketPricePoint[] = [
  { asset: 'Bitcoin', price: 78000, currency: 'USD', unit: 'BTC', change_24h: 0.8 },
  { asset: 'Gold', price: 2335, currency: 'USD', unit: 'oz', change_24h: 0.2 },
  { asset: 'Crude Oil (WTI)', price: 78.4, currency: 'USD', unit: 'barrel', change_24h: -0.4 }
]

const PROVIDER_FETCH_TIMEOUT_MS = 4500
const PROVIDER_FETCH_MAX_ATTEMPTS = 2
const PROVIDER_FETCH_RETRY_DELAY_MS = 250

function isLocalSimulationAllowed(envKey: string) {
  return (
    Deno.env.get(envKey) === 'true' ||
    Deno.env.get('LOCAL_DEV') === 'true' ||
    Deno.env.get('ENV') === 'local'
  )
}

function toNumeric(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^\d.-]/g, ''))
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function normalizeActor(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (!trimmed) return fallback
  return trimmed.length > 24 ? trimmed.slice(0, 24) : trimmed
}

function normalizeEventCode(title: string, tone: number) {
  const lowered = title.toLowerCase()
  if (/(sanction|embargo|boycott|tariff)/.test(lowered)) return { eventCode: '172', goldsteinScale: -3 }
  if (/(attack|invasion|missile|military|troop|airstrike|shelling)/.test(lowered)) return { eventCode: '190', goldsteinScale: -5 }
  if (/(negotiat|talks|summit|meeting|ceasefire|dialogue)/.test(lowered)) return { eventCode: '046', goldsteinScale: 4 }
  if (/(deal|agreement|partnership|cooperat|joint)/.test(lowered)) return { eventCode: '043', goldsteinScale: 3 }
  if (/(accuse|blame|condemn|criticize)/.test(lowered)) return { eventCode: '112', goldsteinScale: -2 }
  if (tone >= 1.5) return { eventCode: '043', goldsteinScale: 3 }
  if (tone <= -2) return { eventCode: '112', goldsteinScale: -2 }
  return { eventCode: '044', goldsteinScale: 2 }
}

function normalizeGdeltDate(value: unknown) {
  if (typeof value !== 'string' || value.length < 8) {
    return new Date().toISOString().slice(0, 10).replace(/-/g, '')
  }
  return value.slice(0, 8)
}

function inferSecondActor(article: Record<string, unknown>) {
  return normalizeActor(
    article.sourcecommonname || article.domain || article.language || article.theme || article.seendate,
    'Global'
  )
}

function articleToEvent(article: Record<string, unknown>, index: number): StrategicEventSeed {
  const title = typeof article.title === 'string' ? article.title : typeof article.seendate === 'string' ? article.seendate : 'Strategic event'
  const tone = toNumeric(article.tone, toNumeric(article.toneavg, 0))
  const { eventCode, goldsteinScale } = normalizeEventCode(title, tone)

  return {
    eventId: String(article.url || article.id || `GDELT-${Date.now()}-${index}`),
    date: normalizeGdeltDate(article.seendate || article.date || article.published),
    actor1: normalizeActor(article.sourcecountry || article.sourcelang || article.domain, 'Global'),
    actor2: inferSecondActor(article),
    eventCode,
    goldsteinScale,
    avgTone: tone,
    sourceUrl: String(article.url || article.socialimage || 'https://api.gdeltproject.org')
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableProviderStatus(status: number) {
  return status === 429 || status >= 500
}

function isRetryableProviderError(error: unknown) {
  if (!(error instanceof Error)) return false
  return (
    error.name === 'TimeoutError' ||
    error.name === 'TypeError' ||
    /timed out/i.test(error.message) ||
    /network/i.test(error.message) ||
    /fetch failed/i.test(error.message)
  )
}

async function fetchJson(
  url: string,
  options: {
    timeoutMs?: number
    maxAttempts?: number
    retryDelayMs?: number
  } = {}
) {
  const timeoutMs = options.timeoutMs ?? PROVIDER_FETCH_TIMEOUT_MS
  const maxAttempts = options.maxAttempts ?? PROVIDER_FETCH_MAX_ATTEMPTS
  const retryDelayMs = options.retryDelayMs ?? PROVIDER_FETCH_RETRY_DELAY_MS
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
      if (!response.ok) {
        const error = new Error(`Provider request failed with HTTP ${response.status}`)
        if (isRetryableProviderStatus(response.status) && attempt < maxAttempts) {
          lastError = error
          await sleep(retryDelayMs)
          continue
        }
        throw error
      }

      return {
        payload: await response.json(),
        attempts: attempt
      }
    } catch (error) {
      if (error instanceof Error) {
        lastError = error
      } else {
        lastError = new Error('Unknown provider request error')
      }

      if (attempt < maxAttempts && isRetryableProviderError(lastError)) {
        await sleep(retryDelayMs)
        continue
      }

      throw new Error(`${lastError.message} after ${attempt} attempt(s)`)
    }
  }

  throw new Error(lastError?.message || 'Provider request failed')
}

function parseCoinbasePrice(payload: unknown) {
  if (typeof payload !== 'object' || payload === null) return null
  const record = payload as Record<string, unknown>
  const nestedData = typeof record.data === 'object' && record.data !== null ? record.data as Record<string, unknown> : null
  const amount = toNumeric(nestedData?.amount)
  return amount > 0 ? amount : null
}

function parseGenericPrice(payload: unknown) {
  if (typeof payload === 'number') return payload
  if (typeof payload === 'string') return toNumeric(payload, NaN)

  if (Array.isArray(payload) && payload.length > 0) {
    const first = payload[0]
    if (typeof first === 'number') return first
    if (Array.isArray(first) && first.length > 1) return toNumeric(first[first.length - 1], NaN)
    if (typeof first === 'object' && first !== null) {
      return (
        toNumeric((first as Record<string, unknown>).price, NaN) ||
        toNumeric((first as Record<string, unknown>).value, NaN) ||
        toNumeric((first as Record<string, unknown>).close, NaN)
      )
    }
  }

  if (typeof payload === 'object' && payload !== null) {
    const record = payload as Record<string, unknown>
    const candidates = [record.price, record.data, record.value, record.amount, record.close, record.gold]
    for (const candidate of candidates) {
      const numeric = toNumeric(candidate, NaN)
      if (Number.isFinite(numeric)) return numeric
      if (typeof candidate === 'object' && candidate !== null) {
        const nested = candidate as Record<string, unknown>
        const nestedNumeric = toNumeric(nested.price ?? nested.amount ?? nested.value, NaN)
        if (Number.isFinite(nestedNumeric)) return nestedNumeric
      }
    }
  }

  return null
}

function buildDiagnostics(provider: string, details: ProviderDetail[], warnings: string[]): ProviderDiagnostics {
  const hasSimulated = details.some((detail) => detail.mode === 'simulated')
  const hasDegraded = details.some((detail) => detail.mode === 'degraded' || detail.mode === 'unconfigured')
  const mode = hasSimulated ? 'simulated' : hasDegraded ? 'degraded' : 'live'

  return {
    provider,
    mode,
    warnings,
    details,
    sources: details.map((detail) => detail.url).filter((url): url is string => Boolean(url)),
    fetched_at: new Date().toISOString()
  }
}

export function createEventFeedProvider(): EventFeedProvider {
  const providerName = 'gdelt-doc-v2'
  const gdeltApiUrl = Deno.env.get('GDELT_DOC_API_URL') || 'https://api.gdeltproject.org/api/v2/doc/doc'
  const query = Deno.env.get('GDELT_QUERY') || '(geopolitics OR diplomacy OR sanctions OR conflict)'
  const timespan = Deno.env.get('GDELT_TIMESPAN') || '7d'
  const maxRecords = Number(Deno.env.get('GDELT_MAX_RECORDS') || '20')
  const allowSimulation = isLocalSimulationAllowed('GDELT_ALLOW_SIMULATION')

  return {
    name: providerName,
    async fetchEvents() {
      const warnings: string[] = []
      const details: ProviderDetail[] = []
      const params = new URLSearchParams({
        query,
        mode: 'artlist',
        format: 'json',
        sort: 'datedesc',
        timespan,
        maxrecords: String(Number.isFinite(maxRecords) && maxRecords > 0 ? maxRecords : 20)
      })
      const url = `${gdeltApiUrl}?${params.toString()}`

      try {
        const { payload, attempts } = await fetchJson(url)
        const articles = Array.isArray((payload as Record<string, unknown>).articles)
          ? ((payload as Record<string, unknown>).articles as Record<string, unknown>[])
          : []
        const events = articles.map(articleToEvent).filter((event) => Boolean(event.sourceUrl))
        details.push({
          name: 'gdelt-doc-v2',
          mode: 'live',
          url,
          note: `Fetched ${events.length} live events after ${attempts} attempt(s)`
        })
        if (attempts > 1) {
          warnings.push(`GDELT succeeded after ${attempts} attempt(s).`)
        }
        if (events.length === 0) {
          warnings.push('GDELT returned no events for the current query window.')
          details[0].mode = 'degraded'
        }
        return { events, diagnostics: buildDiagnostics(providerName, details, warnings) }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        warnings.push(`Live GDELT fetch failed: ${message}`)
        details.push({
          name: 'gdelt-doc-v2',
          mode: 'degraded',
          url,
          note: message
        })

        if (allowSimulation) {
          warnings.push('Using simulated geopolitical events because local simulation is enabled.')
          details.push({
            name: 'local-simulation',
            mode: 'simulated',
            note: 'Enable only for local development.'
          })
          return { events: simulatedEvents, diagnostics: buildDiagnostics(providerName, details, warnings) }
        }

        return { events: [], diagnostics: buildDiagnostics(providerName, details, warnings) }
      }
    }
  }
}

export function createMarketFeedProvider(): MarketFeedProvider {
  const providerName = 'market-feeds'
  const btcUrl = Deno.env.get('MARKET_BTC_URL') || 'https://api.coinbase.com/v2/prices/BTC-USD/spot'
  const goldUrl = Deno.env.get('MARKET_GOLD_URL')
  const oilUrl = Deno.env.get('MARKET_OIL_URL')
  const allowSimulation = isLocalSimulationAllowed('MARKET_ALLOW_SIMULATION')

  return {
    name: providerName,
    async fetchPrices() {
      const warnings: string[] = []
      const details: ProviderDetail[] = []
      const prices: MarketPricePoint[] = []

      try {
          const { payload: btcPayload, attempts } = await fetchJson(btcUrl)
          const btcPrice = parseCoinbasePrice(btcPayload)
          if (!btcPrice) throw new Error('Unable to parse Coinbase BTC payload')
          prices.push({ asset: 'Bitcoin', price: btcPrice, currency: 'USD', unit: 'BTC', change_24h: 0 })
          details.push({ name: 'coinbase-btc', mode: 'live', url: btcUrl, note: `Fetched after ${attempts} attempt(s)` })
          if (attempts > 1) warnings.push(`BTC provider succeeded after ${attempts} attempt(s).`)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          warnings.push(`BTC provider failed: ${message}`)
          details.push({ name: 'coinbase-btc', mode: 'degraded', url: btcUrl, note: message })
        }

      if (goldUrl) {
        try {
          const { payload: goldPayload, attempts } = await fetchJson(goldUrl)
          const goldPrice = parseGenericPrice(goldPayload)
          if (!goldPrice || !Number.isFinite(goldPrice)) throw new Error('Unable to parse gold provider payload')
          prices.push({ asset: 'Gold', price: goldPrice, currency: 'USD', unit: 'oz', change_24h: 0 })
          details.push({ name: 'gold-provider', mode: 'live', url: goldUrl, note: `Fetched after ${attempts} attempt(s)` })
          if (attempts > 1) warnings.push(`Gold provider succeeded after ${attempts} attempt(s).`)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          warnings.push(`Gold provider failed: ${message}`)
          details.push({ name: 'gold-provider', mode: 'degraded', url: goldUrl, note: message })
        }
      } else {
        warnings.push('Gold provider is not configured.')
        details.push({ name: 'gold-provider', mode: 'unconfigured', note: 'Set MARKET_GOLD_URL to enable live gold prices.' })
      }

      if (oilUrl) {
        try {
          const { payload: oilPayload, attempts } = await fetchJson(oilUrl)
          const oilPrice = parseGenericPrice(oilPayload)
          if (!oilPrice || !Number.isFinite(oilPrice)) throw new Error('Unable to parse oil provider payload')
          prices.push({ asset: 'Crude Oil (WTI)', price: oilPrice, currency: 'USD', unit: 'barrel', change_24h: 0 })
          details.push({ name: 'oil-provider', mode: 'live', url: oilUrl, note: `Fetched after ${attempts} attempt(s)` })
          if (attempts > 1) warnings.push(`Oil provider succeeded after ${attempts} attempt(s).`)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          warnings.push(`Oil provider failed: ${message}`)
          details.push({ name: 'oil-provider', mode: 'degraded', url: oilUrl, note: message })
        }
      } else {
        warnings.push('Oil provider is not configured.')
        details.push({ name: 'oil-provider', mode: 'unconfigured', note: 'Set MARKET_OIL_URL to enable live oil prices.' })
      }

      if (prices.length === 0 && allowSimulation) {
        warnings.push('Using simulated market prices because local simulation is enabled.')
        details.push({ name: 'local-simulation', mode: 'simulated', note: 'Enable only for local development.' })
        return { prices: simulatedPrices, diagnostics: buildDiagnostics(providerName, details, warnings) }
      }

      return { prices, diagnostics: buildDiagnostics(providerName, details, warnings) }
    }
  }
}
