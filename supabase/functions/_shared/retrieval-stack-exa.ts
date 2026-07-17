import { rankEvidenceWithGrounding, type GroundedEntityRef } from '../../../shared/mlAdvisory.ts'
import { buildOntologySeed, maybeCallMlService, persistRetrievalEntityLinks } from './ml-platform.ts'

export type RetrievalProviderStatus =
  | 'success'
  | 'empty'
  | 'degraded'
  | 'auth_error'
  | 'rate_limited'
  | 'config_error'

export interface QueryVariant {
  key: 'canonical_query' | 'entity_query' | 'institutional_query'
  query: string
}

export interface NormalizedEvidenceItem {
  id: string
  provider: string
  title: string
  content: string
  url?: string
  source_type: 'academic' | 'news' | 'expert' | 'historical' | 'web' | 'official'
  relevance_score: number
  credibility_score: number
  temporal_distance: number
  query_variant: QueryVariant['key']
  passage_excerpt?: string
  grounded_entities?: GroundedEntityRef[]
  ranking_score?: number
}

export interface RetrievalProviderRun {
  request_id?: string | null
  query_hash: string
  provider: string
  status: RetrievalProviderStatus
  http_status: number | null
  latency_ms: number
  source_count: number
  query_variant: QueryVariant['key']
  error_message?: string | null
}

export interface RetrievalProviderSummary {
  normalizedEvidenceCount: number
  distinctProviderCount: number
  statuses: Array<{
    provider: string
    status: RetrievalProviderStatus
    source_count: number
    http_status?: number | null
    query_variant: QueryVariant['key']
  }>
}

export interface RetrievalStackResult {
  evidence: NormalizedEvidenceItem[]
  providerRuns: RetrievalProviderRun[]
  cacheHit: boolean
  retrievalCount: number
  distinctProviderCount: number
  queryHash: string
}

const SUPABASE_PROJECT_REF = Deno.env.get('SUPABASE_PROJECT_REF') || 'jxdihzqoaxtydolmltdr'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || `https://${SUPABASE_PROJECT_REF}.supabase.co`
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('EDGE_SUPABASE_SERVICE_ROLE_KEY') || ''
export const RETRIEVAL_STACK_VERSION = 'exa-cutover-v4'

const EXA_API_KEY = Deno.env.get('EXA_API_KEY') || ''
const EXA_SEARCH_TYPE = Deno.env.get('EXA_SEARCH_TYPE') || 'auto'
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || ''
const GEMINI_RETRIEVAL_MODEL = Deno.env.get('GEMINI_RETRIEVAL_MODEL') || 'gemini-2.5-flash'
const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY') || ''
const UNCOMTRADE_BASE = Deno.env.get('UNCOMTRADE_BASE') || 'https://comtrade.un.org/api/get'
const WORLD_BANK_BASE = Deno.env.get('WORLD_BANK_BASE') || 'https://api.worldbank.org/v2'
const GDELT_BASE = Deno.env.get('GDELT_BASE') || 'https://api.gdeltproject.org/api/v2/doc/doc'

const REQUEST_TIMEOUT_MS = 12000
const DEFAULT_CACHE_TTL_SECONDS = 12 * 60 * 60
const COUNTRY_CODE_MAP: Record<string, string> = {
  usa: 'USA',
  us: 'USA',
  unitedstates: 'USA',
  china: 'CHN',
  india: 'IND',
  russia: 'RUS',
  japan: 'JPN',
  germany: 'DEU',
  france: 'FRA',
  uk: 'GBR',
  britain: 'GBR',
  europe: 'EUU',
}

function uuid() {
  return crypto.randomUUID()
}

function simpleHash(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index++) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function safeHostname(url?: string) {
  try {
    return new URL(url || 'https://example.com').hostname
  } catch {
    return 'unknown'
  }
}

function safeCitation(title: string, url?: string) {
  const year = new Date().getFullYear()
  const hostname = safeHostname(url)
  return {
    apa: `${hostname}. (${year}). ${title}. ${url || ''}`,
    mla: `"${title}" ${hostname}, ${new Date().toISOString().slice(0, 10)}, ${url || ''}`,
    chicago: `${hostname}. "${title}" ${year}. ${url || ''}`,
  }
}

function classifyHttpStatus(status: number): RetrievalProviderStatus {
  if (status === 401) return 'auth_error'
  if (status === 403) return 'config_error'
  if (status === 429) return 'rate_limited'
  if (status >= 500) return 'degraded'
  return 'empty'
}

function fallbackTemporalDistance(provider: string) {
  switch (provider) {
    case 'gdelt':
    case 'exa':
    case 'firecrawl':
      return 14
    case 'crossref':
      return 365
    default:
      return 45
  }
}

function defaultCredibility(provider: string) {
  switch (provider) {
    case 'exa':
      return 0.78
    case 'firecrawl':
      return 0.75
    case 'imf':
    case 'worldbank':
    case 'uncomtrade':
      return 0.86
    case 'crossref':
      return 0.82
    case 'gdelt':
      return 0.64
    case 'gemini':
      return 0.58
    default:
      return 0.55
  }
}

function defaultScore(provider: string) {
  switch (provider) {
    case 'exa':
      return 0.9
    case 'firecrawl':
      return 0.82
    case 'imf':
    case 'worldbank':
    case 'uncomtrade':
      return 0.84
    case 'crossref':
      return 0.76
    case 'gdelt':
      return 0.72
    case 'gemini':
      return 0.58
    default:
      return 0.5
  }
}

function determineTTL(query: string, audience?: string): number {
  const lowerQuery = query.toLowerCase()
  const financialKeywords = ['price', 'stock', 'market', 'trading', 'gold', 'oil', 'bitcoin', 'crypto', 'currency', 'forex']
  if (financialKeywords.some((keyword) => lowerQuery.includes(keyword))) {
    return 30 * 60
  }

  const geopoliticalKeywords = ['war', 'conflict', 'sanctions', 'election', 'treaty', 'diplomatic', 'military', 'troop', 'nato']
  if (geopoliticalKeywords.some((keyword) => lowerQuery.includes(keyword))) {
    return 12 * 60 * 60
  }

  if (audience === 'market') return 30 * 60
  if (audience === 'student' || audience === 'personal') return 60 * 60
  return DEFAULT_CACHE_TTL_SECONDS
}

function shouldBypassCache(query: string, forceFresh?: boolean, audience?: string) {
  if (forceFresh) return true

  const bypassAudiences = ['student', 'personal', 'market']
  if (audience && bypassAudiences.includes(audience)) return true

  const lowerQuery = query.toLowerCase()
  const realTimeKeywords = [
    'today', 'current', 'latest', 'breaking', 'live', 'now', 'recent',
    'this week', 'this month', 'real-time', 'realtime', 'fresh', 'spot price',
  ]
  return realTimeKeywords.some((keyword) => lowerQuery.includes(keyword))
}

function deriveCountryCodes(entities: string[], query: string) {
  const tokens = [...entities, ...query.split(/[^A-Za-z]+/g)]
    .map((token) => token.trim())
    .filter(Boolean)

  const countryCodes = new Set<string>()
  for (const token of tokens) {
    const normalized = token.toLowerCase().replace(/[^a-z]/g, '')
    const code = COUNTRY_CODE_MAP[normalized]
    if (code) countryCodes.add(code)
    if (/^[A-Z]{3}$/.test(token)) countryCodes.add(token)
  }
  return [...countryCodes]
}

function extractActionKeywords(query: string) {
  const keywordMatches = query.match(/\b(withdrawal|withdraw|tariff|sanction|procurement|supply chain|rare earth|troop|nato|trade|pharmaceutical|export restriction|military|security)\b/gi) || []
  const compact = keywordMatches.map((item) => item.toLowerCase())
  return [...new Set(compact)].slice(0, 5)
}

export function buildQueryVariants(query: string, entities: string[] = []): QueryVariant[] {
  const canonical = normalizeWhitespace(query)
  const entityTerms = [...new Set(entities.map((item) => normalizeWhitespace(item)).filter(Boolean))].slice(0, 6)
  const actionTerms = extractActionKeywords(query)
  const entityQuery = normalizeWhitespace([...entityTerms, ...actionTerms].join(' ')) || canonical
  const institutionalSuffix = actionTerms.some((term) => term.includes('trade') || term.includes('tariff') || term.includes('procurement'))
    ? 'official data policy trade security strategic analysis'
    : 'defense policy strategic security analysis official data'
  const institutionalQuery = normalizeWhitespace(`${entityQuery} ${institutionalSuffix}`) || canonical
  return [
    { key: 'canonical_query', query: canonical },
    { key: 'entity_query', query: entityQuery },
    { key: 'institutional_query', query: institutionalQuery },
  ]
}

function buildQueryHash(query: string, _entities: string[], domain?: string) {
  return simpleHash(`${normalizeWhitespace(query)}::${(domain || 'all').trim().toLowerCase()}`)
}

async function fetchJson(url: string, init: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS) {
  const started = Date.now()
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
  const text = await response.text()
  let json: any = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }
  return {
    ok: response.ok,
    status: response.status,
    latencyMs: Date.now() - started,
    json,
    text,
  }
}

async function backoffDelay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function callExaSearch(query: string, variant: QueryVariant): Promise<NormalizedEvidenceItem[]> {
  const response = await fetchJson('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': EXA_API_KEY,
    },
    body: JSON.stringify({
      query,
      type: EXA_SEARCH_TYPE,
      numResults: 5,
      contents: {
        highlights: true,
      },
    }),
  })

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`)
    ;(error as any).httpStatus = response.status
    ;(error as any).latencyMs = response.latencyMs
    throw error
  }

  const results = Array.isArray(response.json?.results) ? response.json.results.slice(0, 5) : []
  return results.map((item: any, index: number) => {
    const highlights = Array.isArray(item?.highlights) ? item.highlights.filter(Boolean) : []
    const content = highlights.join('\n').trim() || String(item?.summary || item?.text || item?.title || '').slice(0, 500)
    return {
      id: `exa-${uuid()}`,
      provider: 'exa',
      title: item?.title || `Exa result ${index + 1}`,
      content,
      url: item?.url,
      source_type: 'web' as const,
      relevance_score: clamp(0.9 - (index * 0.05), 0.62, 0.9),
      credibility_score: 0.8,
      temporal_distance: 7,
      query_variant: variant.key,
      passage_excerpt: content.slice(0, 320),
    }
  })
}

async function callGdelt(query: string, variant: QueryVariant): Promise<NormalizedEvidenceItem[]> {
  const url = `${GDELT_BASE}?query=${encodeURIComponent(query)}&mode=artlist&format=json&maxrecords=5&sort=DateDesc`
  let attempts = 0
  while (attempts < 3) {
    const response = await fetchJson(url, { method: 'GET' }, 8000)
    if (response.ok) {
      const articles = Array.isArray(response.json?.articles) ? response.json.articles.slice(0, 5) : []
      return articles.map((article: any, index: number) => ({
        id: `gdelt-${uuid()}`,
        provider: 'gdelt',
        title: article.title || `GDELT article ${index + 1}`,
        content: String(article.segments || article.summary || article.title || '').slice(0, 500),
        url: article.url || article.document_url,
        source_type: 'news' as const,
        relevance_score: clamp(0.78 - (index * 0.05), 0.5, 0.78),
        credibility_score: 0.64,
        temporal_distance: 7,
        query_variant: variant.key,
        passage_excerpt: String(article.summary || article.segments || '').slice(0, 300),
      }))
    }

    if (response.status === 429 && attempts < 2) {
      await backoffDelay(500 * Math.pow(2, attempts))
      attempts += 1
      continue
    }

    const error = new Error(`HTTP ${response.status}`)
    ;(error as any).httpStatus = response.status
    ;(error as any).latencyMs = response.latencyMs
    throw error
  }
  return []
}

async function callFirecrawl(query: string, variant: QueryVariant, domain: string, entities: string[]): Promise<NormalizedEvidenceItem[]> {
  if (!FIRECRAWL_API_KEY) {
    return []
  }

  const response = await fetchJson(`${SUPABASE_URL}/functions/v1/firecrawl-research`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({
      runId: `retrieval-firecrawl-${uuid()}`,
      mode: 'search',
      query,
      config: {
        maxPages: 3,
        returnFormat: 'markdown',
        includeMetadata: true,
        extractSchemas: false,
      },
      context: {
        domain,
        stakeholders: entities,
        strategicContext: query,
      },
    }),
  }, 20000)

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`)
    ;(error as any).httpStatus = response.status
    ;(error as any).latencyMs = response.latencyMs
    throw error
  }

  const payload = response.json?.response || response.json
  const evidence = Array.isArray(payload?.evidence) ? payload.evidence : []
  return evidence.map((item: any, index: number) => ({
    id: `firecrawl-${uuid()}`,
    provider: 'firecrawl',
    title: item.title || `Firecrawl result ${index + 1}`,
    content: String(item.content || '').slice(0, 500),
    url: item.url,
    source_type: 'web' as const,
    relevance_score: clamp(Number(item.relevance_score || 0.74), 0.45, 0.95),
    credibility_score: clamp(Number(item.credibility_score || 0.75), 0.45, 0.95),
    temporal_distance: Number.isFinite(Number(item.temporal_distance)) ? Number(item.temporal_distance) : 21,
    query_variant: variant.key,
    passage_excerpt: String(item.passage_excerpt || item.content || '').slice(0, 300),
  }))
}

async function callCrossref(query: string, variant: QueryVariant): Promise<NormalizedEvidenceItem[]> {
  const response = await fetchJson(`https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=5`, { method: 'GET' }, 8000)
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`)
    ;(error as any).httpStatus = response.status
    ;(error as any).latencyMs = response.latencyMs
    throw error
  }
  const items = Array.isArray(response.json?.message?.items) ? response.json.message.items.slice(0, 5) : []
  return items.map((item: any, index: number) => ({
    id: `crossref-${uuid()}`,
    provider: 'crossref',
    title: item.title?.[0] || item['container-title']?.[0] || `Crossref result ${index + 1}`,
    content: String(item.abstract || item.title?.[0] || '').slice(0, 500),
    url: item.URL || (Array.isArray(item.link) ? item.link[0]?.URL : undefined),
    source_type: 'academic' as const,
    relevance_score: clamp(0.76 - (index * 0.03), 0.55, 0.76),
    credibility_score: 0.82,
    temporal_distance: 365,
    query_variant: variant.key,
    passage_excerpt: String(item.abstract || item.title?.[0] || '').slice(0, 300),
  }))
}

async function callWorldBank(countryCode: string, variant: QueryVariant): Promise<NormalizedEvidenceItem[]> {
  const indicator = 'NY.GDP.MKTP.CD'
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetchJson(`${WORLD_BANK_BASE}/country/${countryCode}/indicator/${indicator}?format=json&per_page=5`, { method: 'GET' }, 12000)
    if (response.ok) {
      const values = Array.isArray(response.json?.[1]) ? response.json[1].filter(Boolean).slice(0, 3) : []
      if (!values.length) return []
      const snippet = values.map((entry: any) => `${entry.date}:${entry.value}`).join(', ')
      return [{
        id: `worldbank-${uuid()}`,
        provider: 'worldbank',
        title: `World Bank GDP data for ${countryCode}`,
        content: snippet,
        url: `${WORLD_BANK_BASE}/country/${countryCode}/indicator/${indicator}?format=json`,
        source_type: 'official',
        relevance_score: 0.82,
        credibility_score: 0.88,
        temporal_distance: 90,
        query_variant: variant.key,
        passage_excerpt: snippet,
      }]
    }

    if (attempt === 0) {
      await backoffDelay(600)
      continue
    }

    const error = new Error(`HTTP ${response.status}`)
    ;(error as any).httpStatus = response.status
    ;(error as any).latencyMs = response.latencyMs
    throw error
  }
  return []
}

async function callImf(countryCode: string, variant: QueryVariant): Promise<NormalizedEvidenceItem[]> {
  const response = await fetchJson(`https://www.imf.org/external/datamapper/api/v1/forecasts?periods=2024,2025&countryCodes=${countryCode}`, { method: 'GET' }, 8000)
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`)
    ;(error as any).httpStatus = response.status
    ;(error as any).latencyMs = response.latencyMs
    throw error
  }
  const values = response.json?.values || {}
  const series = Object.entries(values).slice(0, 3).map(([key, value]) => `${key}:${JSON.stringify(value)}`).join(', ')
  if (!series) return []
  return [{
    id: `imf-${uuid()}`,
    provider: 'imf',
    title: `IMF forecast data for ${countryCode}`,
    content: series.slice(0, 500),
    url: `https://www.imf.org/external/datamapper/api/v1/forecasts?periods=2024,2025&countryCodes=${countryCode}`,
    source_type: 'official',
    relevance_score: 0.8,
    credibility_score: 0.86,
    temporal_distance: 90,
    query_variant: variant.key,
    passage_excerpt: series.slice(0, 300),
  }]
}

async function callUnComtrade(primaryCountry: string, secondaryCountry: string, variant: QueryVariant): Promise<NormalizedEvidenceItem[]> {
  const yearsList = Array.from({ length: 5 }, (_, index) => new Date().getFullYear() - index).join(',')
  const url = `${UNCOMTRADE_BASE}?max=25&type=C&freq=A&px=HS&ps=${yearsList}&r=${primaryCountry}&p=${secondaryCountry}&fmt=json`
  const response = await fetchJson(url, { method: 'GET' }, 8000)
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`)
    ;(error as any).httpStatus = response.status
    ;(error as any).latencyMs = response.latencyMs
    throw error
  }
  const dataset = Array.isArray(response.json?.dataset) ? response.json.dataset : []
  if (!dataset.length) return []
  const total = dataset.reduce((sum: number, row: any) => sum + Number(row.TradeValue || 0), 0)
  const snippet = `Bilateral trade value between ${primaryCountry} and ${secondaryCountry}: $${Math.round(total).toLocaleString()}`
  return [{
    id: `uncomtrade-${uuid()}`,
    provider: 'uncomtrade',
    title: `UN Comtrade bilateral trade for ${primaryCountry}/${secondaryCountry}`,
    content: snippet,
    url,
    source_type: 'official',
    relevance_score: 0.84,
    credibility_score: 0.88,
    temporal_distance: 180,
    query_variant: variant.key,
    passage_excerpt: snippet,
  }]
}

async function callGemini(query: string, variant: QueryVariant): Promise<NormalizedEvidenceItem[]> {
  const response = await fetchJson(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_RETRIEVAL_MODEL)}:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Return JSON only with an array named sources. Each source must have title, url and snippet. Query: ${query}`,
            },
          ],
        },
      ],
      generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
    }),
  })
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`)
    ;(error as any).httpStatus = response.status
    ;(error as any).latencyMs = response.latencyMs
    throw error
  }
  const text = String(response.json?.candidates?.[0]?.content?.parts?.[0]?.text || '')
  const match = text.match(/\[[\s\S]*\]/)
  const sources = match ? JSON.parse(match[0]) : []
  return Array.isArray(sources)
    ? sources.slice(0, 4).map((item: any, index: number) => ({
        id: `gemini-${uuid()}`,
        provider: 'gemini',
        title: item.title || `Gemini source ${index + 1}`,
        content: String(item.snippet || '').slice(0, 500),
        url: item.url,
        source_type: 'web' as const,
        relevance_score: 0.56,
        credibility_score: 0.58,
        temporal_distance: 30,
        query_variant: variant.key,
        passage_excerpt: String(item.snippet || '').slice(0, 300),
      }))
    : []
}

type ProviderFetcher = (query: string, variant: QueryVariant, context: {
  domain: string
  entities: string[]
  countryCodes: string[]
}) => Promise<NormalizedEvidenceItem[]>

async function executeProvider(args: {
  provider: string
  variants: QueryVariant[]
  enabled: boolean
  queryHash: string
  requestId?: string | null
  domain: string
  entities: string[]
  fetcher: ProviderFetcher
}) {
  const terminalConfigError: RetrievalProviderStatus = args.enabled ? 'empty' : 'config_error'
  if (!args.enabled) {
    return {
      items: [] as NormalizedEvidenceItem[],
      run: {
        request_id: args.requestId || null,
        query_hash: args.queryHash,
        provider: args.provider,
        status: terminalConfigError,
        http_status: null,
        latency_ms: 0,
        source_count: 0,
        query_variant: args.variants[0]?.key || 'canonical_query',
        error_message: 'provider_not_configured',
      } satisfies RetrievalProviderRun,
    }
  }

  const context = {
    domain: args.domain,
    entities: args.entities,
    countryCodes: deriveCountryCodes(args.entities, args.variants[0]?.query || ''),
  }

  let lastRun: RetrievalProviderRun | null = null
  for (const variant of args.variants) {
    const started = Date.now()
    try {
      const items = await args.fetcher(variant.query, variant, context)
      const run: RetrievalProviderRun = {
        request_id: args.requestId || null,
        query_hash: args.queryHash,
        provider: args.provider,
        status: items.length ? 'success' : 'empty',
        http_status: 200,
        latency_ms: Date.now() - started,
        source_count: items.length,
        query_variant: variant.key,
        error_message: items.length ? null : 'empty_result',
      }
      if (items.length) {
        return { items, run }
      }
      lastRun = run
    } catch (error) {
      const httpStatus = Number((error as any)?.httpStatus || 0) || null
      const run: RetrievalProviderRun = {
        request_id: args.requestId || null,
        query_hash: args.queryHash,
        provider: args.provider,
        status: httpStatus ? classifyHttpStatus(httpStatus) : 'degraded',
        http_status: httpStatus,
        latency_ms: Number((error as any)?.latencyMs || (Date.now() - started)),
        source_count: 0,
        query_variant: variant.key,
        error_message: error instanceof Error ? error.message : String(error),
      }
      lastRun = run
      if (run.status === 'auth_error' || run.status === 'config_error' || run.status === 'rate_limited') {
        break
      }
    }
  }

  return {
    items: [] as NormalizedEvidenceItem[],
    run: lastRun || {
      request_id: args.requestId || null,
      query_hash: args.queryHash,
      provider: args.provider,
      status: 'empty',
      http_status: null,
      latency_ms: 0,
      source_count: 0,
      query_variant: args.variants[0]?.key || 'canonical_query',
      error_message: 'no_attempt',
    },
  }
}

function dedupeEvidence(evidence: NormalizedEvidenceItem[]) {
  const byKey = new Map<string, NormalizedEvidenceItem>()
  for (const item of evidence) {
    const url = item.url || ''
    const title = normalizeWhitespace(item.title || '')
    const key = `${item.provider}:${url || title}`
    if (!byKey.has(key)) {
      byKey.set(key, item)
      continue
    }
    const existing = byKey.get(key)!
    if ((item.relevance_score + item.credibility_score) > (existing.relevance_score + existing.credibility_score)) {
      byKey.set(key, item)
    }
  }
  return [...byKey.values()]
}

function buildCacheEvidence(row: any): NormalizedEvidenceItem {
  const provider = String(row.provider || 'cache')
  return {
    id: String(row.retrieval_id || row.id || uuid()),
    provider,
    title: String(row.title || row.url || 'Cached retrieval'),
    content: String(row.snippet || row.title || '').slice(0, 500),
    url: row.url || undefined,
    source_type: provider === 'crossref' ? 'academic' : provider === 'gdelt' ? 'news' : provider === 'imf' || provider === 'worldbank' || provider === 'uncomtrade' ? 'official' : 'web',
    relevance_score: defaultScore(provider),
    credibility_score: defaultCredibility(provider),
    temporal_distance: fallbackTemporalDistance(provider),
    query_variant: 'canonical_query',
    passage_excerpt: String(row.snippet || '').slice(0, 300),
  }
}

export async function getCachedRetrievals(admin: any, queryHash: string, ttlSeconds = DEFAULT_CACHE_TTL_SECONDS) {
  const cutoff = new Date(Date.now() - (ttlSeconds * 1000)).toISOString()
  const { data, error } = await admin
    .from('retrieval_cache')
    .select('retrieval_id, title, url, snippet, provider, created_at, query_hash')
    .eq('query_hash', queryHash)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })

  if (error) {
    console.warn(`retrieval_cache lookup failed: ${error.message}`)
    return []
  }

  return Array.isArray(data) ? data.map(buildCacheEvidence) : []
}

export async function cacheRetrievalResults(admin: any, queryHash: string, results: NormalizedEvidenceItem[], query?: string, audience?: string) {
  if (!results.length) return
  const ttlSeconds = determineTTL(query || '', audience)
  const freshCutoff = new Date(Date.now() - ttlSeconds * 1000).toISOString()
  await admin
    .from('retrieval_cache')
    .delete()
    .eq('query_hash', queryHash)
    .lt('created_at', freshCutoff)

  const rows = results.map((item) => ({
    query_hash: queryHash,
    retrieval_id: item.id,
    title: item.title || item.url || 'retrieval',
    url: item.url || null,
    snippet: (item.passage_excerpt || item.content || '').slice(0, 500),
    provider: item.provider,
    created_at: new Date().toISOString(),
  }))

  const { error } = await admin.from('retrieval_cache').insert(rows)
  if (error) {
    console.warn(`retrieval_cache insert failed: ${error.message}`)
  }
}

export async function persistProviderRuns(admin: any, runs: RetrievalProviderRun[]) {
  if (!runs.length) return
  const { error } = await admin
    .from('retrieval_provider_runs')
    .insert(runs.map((run) => ({
      request_id: run.request_id || null,
      query_hash: run.query_hash,
      provider: run.provider,
      status: run.status,
      http_status: run.http_status,
      latency_ms: run.latency_ms,
      source_count: run.source_count,
      query_variant: run.query_variant,
      error_message: run.error_message || null,
    })))
  if (error) {
    console.warn(`retrieval_provider_runs insert failed: ${error.message}`)
  }
}

export function summarizeProviderRuns(runs: RetrievalProviderRun[]): RetrievalProviderSummary {
  return {
    normalizedEvidenceCount: runs.reduce((sum, run) => sum + (run.status === 'success' ? run.source_count : 0), 0),
    distinctProviderCount: new Set(runs.filter((run) => run.status === 'success').map((run) => run.provider)).size,
    statuses: runs.map((run) => ({
      provider: run.provider,
      status: run.status,
      source_count: run.source_count,
      http_status: run.http_status,
      query_variant: run.query_variant,
    })),
  }
}

export function summarizeEvidenceItems(items: Array<{ provider?: string }>): RetrievalProviderSummary {
  const counts = new Map<string, number>()
  for (const item of items) {
    const provider = String(item.provider || 'unknown')
    counts.set(provider, (counts.get(provider) || 0) + 1)
  }

  return {
    normalizedEvidenceCount: items.length,
    distinctProviderCount: counts.size,
    statuses: Array.from(counts.entries()).map(([provider, sourceCount]) => ({
      provider,
      status: 'success' as const,
      source_count: sourceCount,
      http_status: null,
      query_variant: 'canonical_query' as const,
    })),
  }
}

export function isEvidenceBackedRetrievals(items: Array<{ provider?: string; score?: number; credibility_score?: number; grounded_entities?: GroundedEntityRef[] }>) {
  if (!Array.isArray(items) || items.length < 3) return false
  const distinctProviders = new Set(items.map((item) => item.provider || 'unknown'))
  if (distinctProviders.size < 2) return false
  return items.some((item) => {
    const provider = item.provider || ''
    if (provider === 'exa') return true
    if (provider === 'firecrawl') return true
    if (provider === 'imf' || provider === 'worldbank' || provider === 'uncomtrade') return true
    const score = Number(item.credibility_score ?? item.score ?? 0)
    return score >= 0.7
  })
}

export async function rankAndGroundEvidence(evidence: NormalizedEvidenceItem[], domain: string) {
  const locallyRanked = rankEvidenceWithGrounding({
    evidence: evidence.map((entry) => ({ ...entry, domain })),
    domain,
  })

  const seed = buildOntologySeed()
  const entityMap = new Map(seed.entities.map((entity) => [entity.entity_key, entity]))
  const aliasMap = seed.aliases.reduce<Record<string, string[]>>((acc, alias) => {
    acc[alias.entity_key] = acc[alias.entity_key] || []
    acc[alias.entity_key].push(alias.alias)
    return acc
  }, {})

  const enriched = await Promise.all(locallyRanked.map(async (entry) => {
    const mlMatches = await maybeCallMlService('/ontology/link', {
      texts: [entry.title, entry.content, entry.passage_excerpt, entry.url].filter(Boolean),
      aliases: aliasMap,
    }).catch(() => null)

    if (!Array.isArray(mlMatches?.matches) || mlMatches.matches.length === 0) {
      return entry
    }

    const extraEntities = mlMatches.matches.flatMap((match: any) => {
      const entity = entityMap.get(String(match.entity_key || ''))
      if (!entity) return []
      return [{
        entity_key: entity.entity_key,
        entity_type: entity.entity_type,
        domain: entity.domain,
        label: entity.label,
        confidence: Number(match.confidence || 0.8),
        matched_text: String(match.matched_text || entity.label),
      } satisfies GroundedEntityRef]
    })

    const deduped = Array.from(new Map(
      [...(entry.grounded_entities || []), ...extraEntities].map((entity) => [`${entity.entity_key}:${entity.matched_text}`, entity])
    ).values())

    return {
      ...entry,
      grounded_entities: deduped,
    }
  }))

  return enriched
}

export async function persistRankedEvidence(admin: any, query: string, rankedEvidence: NormalizedEvidenceItem[]) {
  if (!rankedEvidence.length) {
    return { evidence: rankedEvidence, groundedEntities: [] as GroundedEntityRef[] }
  }

  const retrievalRows = rankedEvidence.map((entry, index) => ({
    query_hash: simpleHash(query),
    retrieval_id: index + 1,
    title: entry.title,
    url: entry.url || null,
    snippet: (entry.passage_excerpt || entry.content || '').slice(0, 300),
    score: entry.ranking_score ?? entry.relevance_score,
  }))

  const { data: insertedRetrievals, error: retrievalInsertError } = await admin
    .from('retrievals')
    .insert(retrievalRows)
    .select('id')

  if (retrievalInsertError) {
    throw retrievalInsertError
  }

  const links = rankedEvidence.flatMap((entry, index) => {
    const retrievalId = insertedRetrievals?.[index]?.id
    if (!retrievalId || !Array.isArray(entry.grounded_entities)) return []
    return entry.grounded_entities.map((entity) => ({
      retrieval_id: retrievalId,
      entity_key: entity.entity_key,
      confidence: entity.confidence,
      matched_text: entity.matched_text,
      domain: entity.domain,
    }))
  })

  await persistRetrievalEntityLinks(admin, links)

  const hydratedEvidence = rankedEvidence.map((entry, index) => ({
    ...entry,
    retrieval_id: insertedRetrievals?.[index]?.id || entry.id,
  }))

  return {
    evidence: hydratedEvidence,
    groundedEntities: Array.from(new Map(
      hydratedEvidence.flatMap((entry) => entry.grounded_entities || []).map((entity) => [`${entity.entity_key}:${entity.matched_text}`, entity])
    ).values()),
  }
}

export async function runRetrievalStack(args: {
  admin: any
  requestId?: string | null
  query: string
  entities?: string[]
  domain?: string
  audience?: string
  includeAcademic?: boolean
  includeNews?: boolean
  includeFirecrawl?: boolean
  includeOfficial?: boolean
  maxSources?: number
  forceFresh?: boolean
  queryHash?: string
}) : Promise<RetrievalStackResult> {
  const entities = Array.isArray(args.entities) ? args.entities.filter(Boolean) : []
  const domain = args.domain || 'all'
  const queryHash = args.queryHash || buildQueryHash(args.query, entities, domain)
  const ttlSeconds = determineTTL(args.query, args.audience)

  if (!shouldBypassCache(args.query, args.forceFresh, args.audience)) {
    const cached = await getCachedRetrievals(args.admin, queryHash, ttlSeconds)
    if (cached.length) {
      const topCached = cached.slice(0, args.maxSources || 8)
      return {
        evidence: topCached,
        providerRuns: [],
        cacheHit: true,
        retrievalCount: topCached.length,
        distinctProviderCount: new Set(topCached.map((item) => item.provider)).size,
        queryHash,
      }
    }
  }

  const variants = buildQueryVariants(args.query, entities)
  const providerCalls = [
    executeProvider({
      provider: 'exa',
      variants: [variants[0], variants[1]],
      enabled: Boolean(EXA_API_KEY),
      queryHash,
      requestId: args.requestId,
      domain,
      entities,
      fetcher: async (query, variant) => await callExaSearch(query, variant),
    }),
    executeProvider({
      provider: 'gdelt',
      variants: [variants[1], variants[0]],
      enabled: args.includeNews !== false,
      queryHash,
      requestId: args.requestId,
      domain,
      entities,
      fetcher: async (query, variant) => await callGdelt(query, variant),
    }),
    executeProvider({
      provider: 'firecrawl',
      variants: [variants[1], variants[2]],
      enabled: args.includeFirecrawl !== false && Boolean(FIRECRAWL_API_KEY),
      queryHash,
      requestId: args.requestId,
      domain,
      entities,
      fetcher: async (query, variant) => await callFirecrawl(query, variant, domain, entities),
    }),
    executeProvider({
      provider: 'crossref',
      variants: [variants[2], variants[0]],
      enabled: args.includeAcademic !== false,
      queryHash,
      requestId: args.requestId,
      domain,
      entities,
      fetcher: async (query, variant) => await callCrossref(query, variant),
    }),
    executeProvider({
      provider: 'gemini',
      variants: [variants[1]],
      enabled: Boolean(GEMINI_API_KEY),
      queryHash,
      requestId: args.requestId,
      domain,
      entities,
      fetcher: async (query, variant) => await callGemini(query, variant),
    }),
  ]

  const countryCodes = deriveCountryCodes(entities, args.query)
  if (args.includeOfficial !== false && countryCodes[0]) {
    providerCalls.push(
      executeProvider({
        provider: 'worldbank',
        variants: [variants[2]],
        enabled: true,
        queryHash,
        requestId: args.requestId,
        domain,
        entities,
        fetcher: async (_query, variant, context) => await callWorldBank(context.countryCodes[0], variant),
      }),
      executeProvider({
        provider: 'imf',
        variants: [variants[2]],
        enabled: true,
        queryHash,
        requestId: args.requestId,
        domain,
        entities,
        fetcher: async (_query, variant, context) => await callImf(context.countryCodes[0], variant),
      }),
    )
  }
  if (args.includeOfficial !== false && countryCodes[0] && countryCodes[1]) {
    providerCalls.push(
      executeProvider({
        provider: 'uncomtrade',
        variants: [variants[2]],
        enabled: true,
        queryHash,
        requestId: args.requestId,
        domain,
        entities,
        fetcher: async (_query, variant, context) => await callUnComtrade(context.countryCodes[0], context.countryCodes[1], variant),
      }),
    )
  }

  const providerResults = await Promise.all(providerCalls)
  const providerRuns = providerResults.map((entry) => entry.run)
  const evidence = dedupeEvidence(providerResults.flatMap((entry) => entry.items))
    .sort((left, right) => ((right.relevance_score + right.credibility_score) - (left.relevance_score + left.credibility_score)))
    .slice(0, args.maxSources || 8)

  await persistProviderRuns(args.admin, providerRuns)
  if (evidence.length) {
    await cacheRetrievalResults(args.admin, queryHash, evidence, args.query, args.audience)
  }

  return {
    evidence,
    providerRuns,
    cacheHit: false,
    retrievalCount: evidence.length,
    distinctProviderCount: new Set(evidence.map((item) => item.provider)).size,
    queryHash,
  }
}

export function toLegacyRetrievals(evidence: NormalizedEvidenceItem[]) {
  return evidence.map((entry) => ({
    id: String((entry as any).retrieval_id || entry.id),
    title: entry.title,
    source: entry.provider,
    url: entry.url,
    snippet: entry.passage_excerpt || entry.content || '',
    score: entry.ranking_score ?? entry.relevance_score,
    retrieved_at: new Date().toISOString(),
    grounded_entities: entry.grounded_entities || [],
  }))
}
