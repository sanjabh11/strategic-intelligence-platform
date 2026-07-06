/**
 * Market Priors — ProphetHacks-inspired market-implied probability integration.
 *
 * Fetches market-implied probabilities from Polymarket (primary, no auth) and
 * Kalshi (fallback, no auth for market data) to use as a prior anchor for
 * multi-agent forecasts.
 *
 * Source: https://www.prophetarena.co/research/prophethacks
 * Pattern: CodexProphet's market prior blending
 *
 * API details:
 *   Polymarket: GET https://gamma-api.polymarket.com/public-search?q={query}
 *     - No auth required
 *     - Markets have `outcomes` and `outcomePrices` arrays (JSON strings)
 *     - outcomePrices[0] = "Yes" implied probability
 *
 *   Kalshi: GET https://api.kalshi.com/markets?status=open&limit=10
 *     - No auth required for market data
 *     - Markets have `yes_bid`, `no_bid`, `last_price` fields
 */

export type MarketPriorSource = 'polymarket' | 'kalshi'

export interface MarketPrior {
  source: MarketPriorSource
  marketId: string
  question: string
  yesPrice: number
  noPrice: number
  volume: number
  url: string
  fetchedAt: string
}

export interface MarketPriorResult {
  bestMatch: MarketPrior | null
  alternatives: MarketPrior[]
  query: string
  source: MarketPriorSource | 'none'
}

const POLYMARKET_SEARCH_URL = 'https://gamma-api.polymarket.com/public-search'
const KALSHI_MARKETS_URL = 'https://api.kalshi.com/markets'
const FETCH_TIMEOUT_MS = 5000

function clampProbability(value: number): number {
  if (!Number.isFinite(value)) return 0.5
  return Math.min(0.99, Math.max(0.01, value))
}

/**
 * Build a search query from a scenario description and forecast intent.
 * Strips excessive detail and focuses on the core question.
 */
export function buildMarketPriorQuery(
  scenario: string,
  intent?: string,
): string {
  const base = scenario.trim().split(/[.?!]/)[0] || scenario.trim()
  const intentSuffix = intent && intent !== 'generic_public_analysis'
    ? ` ${intent.replace(/_/g, ' ')}`
    : ''
  return `${base}${intentSuffix}`.slice(0, 200)
}

/**
 * Extract probability from a Polymarket market object.
 * outcomePrices is a JSON string array like '["0.20", "0.80"]'.
 */
export function extractProbabilityFromPolymarket(market: Record<string, unknown>): number | null {
  try {
    const prices = typeof market.outcomePrices === 'string'
      ? JSON.parse(market.outcomePrices)
      : market.outcomePrices
    if (Array.isArray(prices) && prices.length > 0) {
      const yesPrice = Number(prices[0])
      if (Number.isFinite(yesPrice)) return clampProbability(yesPrice)
    }
  } catch {
    // fall through
  }
  return null
}

/**
 * Extract probability from a Kalshi market object.
 * Uses yes_bid or last_price as the implied probability.
 */
export function extractProbabilityFromKalshi(market: Record<string, unknown>): number | null {
  const yesBid = Number(market.yes_bid)
  if (Number.isFinite(yesBid) && yesBid > 0) return clampProbability(yesBid)
  const lastPrice = Number(market.last_price)
  if (Number.isFinite(lastPrice) && lastPrice > 0) return clampProbability(lastPrice)
  return null
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function scoreRelevance(query: string, marketQuestion: string): number {
  const q = normalizeText(query)
  const m = normalizeText(marketQuestion)
  if (!q || !m) return 0
  const qWords = new Set(q.split(' ').filter((w) => w.length > 2))
  const mWords = m.split(' ').filter((w) => w.length > 2)
  if (qWords.size === 0 || mWords.length === 0) return 0
  let matches = 0
  for (const word of mWords) {
    if (qWords.has(word)) matches++
  }
  return matches / Math.max(qWords.size, mWords.length)
}

/**
 * Search Polymarket for markets matching the query.
 * Returns raw API response or null on failure.
 */
export async function searchPolymarket(query: string): Promise<MarketPrior[]> {
  if (!query.trim()) return []
  try {
    const url = `${POLYMARKET_SEARCH_URL}?q=${encodeURIComponent(query)}&limit=10`
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { 'Accept': 'application/json' },
    })
    if (!res.ok) return []
    const data = await res.json()
    const markets: unknown[] = Array.isArray(data?.markets) ? data.markets
      : Array.isArray(data?.events) ? data.events.flatMap((e: any) => e.markets || [])
      : Array.isArray(data) ? data
      : []
    return markets
      .map((m: any): MarketPrior | null => {
        const prob = extractProbabilityFromPolymarket(m)
        if (prob === null) return null
        const question = String(m.question || m.title || '')
        return {
          source: 'polymarket' as const,
          marketId: String(m.id || m.conditionId || ''),
          question,
          yesPrice: prob,
          noPrice: clampProbability(1 - prob),
          volume: Number(m.volume || m.volumeNum || 0),
          url: m.slug ? `https://polymarket.com/market/${m.slug}` : '',
          fetchedAt: new Date().toISOString(),
        }
      })
      .filter((m: MarketPrior | null): m is MarketPrior => m !== null)
  } catch {
    return []
  }
}

/**
 * Search Kalshi for markets matching the query.
 * Returns raw API response or null on failure.
 */
export async function searchKalshi(query: string): Promise<MarketPrior[]> {
  if (!query.trim()) return []
  try {
    const params = new URLSearchParams({
      status: 'open',
      limit: '10',
    })
    const res = await fetch(`${KALSHI_MARKETS_URL}?${params.toString()}`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { 'Accept': 'application/json' },
    })
    if (!res.ok) return []
    const data = await res.json()
    const markets: unknown[] = Array.isArray(data?.markets) ? data.markets : []
    return markets
      .map((m: any): MarketPrior | null => {
        const prob = extractProbabilityFromKalshi(m)
        if (prob === null) return null
        const question = String(m.title || m.subtitle || '')
        return {
          source: 'kalshi' as const,
          marketId: String(m.ticker || m.id || ''),
          question,
          yesPrice: prob,
          noPrice: clampProbability(1 - prob),
          volume: Number(m.volume || 0),
          url: m.ticker ? `https://kalshi.com/markets/${m.ticker}` : '',
          fetchedAt: new Date().toISOString(),
        }
      })
      .filter((m: MarketPrior | null): m is MarketPrior => m !== null)
  } catch {
    return []
  }
}

/**
 * Extract the best matching market prior from search results.
 */
export function extractMarketPrior(
  query: string,
  polymarketResults: MarketPrior[],
  kalshiResults: MarketPrior[],
): MarketPriorResult {
  const all = [...polymarketResults, ...kalshiResults]
  if (all.length === 0) {
    return { bestMatch: null, alternatives: [], query, source: 'none' }
  }
  const scored = all
    .map((m) => ({ market: m, score: scoreRelevance(query, m.question) }))
    .sort((a, b) => b.score - a.score)
  const best = scored[0]
  const alternatives = scored.slice(1, 5).map((s) => s.market)
  return {
    bestMatch: best.market,
    alternatives,
    query,
    source: best.market.source,
  }
}

/**
 * Blend model probability with market prior.
 * Default weight: 30% market, 70% model.
 * Returns modelProb unchanged if marketProb is null.
 */
export function blendMarketPrior(
  modelProb: number,
  marketProb: number | null,
  weight = 0.30,
): number {
  if (marketProb === null || !Number.isFinite(marketProb)) return modelProb
  const w = Math.min(0.5, Math.max(0.05, weight))
  return clampProbability(modelProb * (1 - w) + marketProb * w)
}
