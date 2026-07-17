// Supabase Edge Function: Market Prior Lookup
// Searches Polymarket (primary) and Kalshi (fallback) for market-implied probabilities.
// Both APIs are public — no authentication required for market data.

import { getAuthenticatedUser, jsonResponse } from '../_shared/auth.ts'
import { checkRateLimit, logApiUsage, rateLimitResponse } from '../_shared/rate-limiter.ts'
import {
  buildMarketPriorQuery,
  searchPolymarket,
  searchKalshi,
  extractMarketPrior,
  type MarketPriorResult,
} from '../../../shared/marketPriors.ts'

declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void
  env: {
    get: (key: string) => string | undefined
  }
}

type RequestBody = {
  scenario?: {
    description?: string
    title?: string
  }
  questionContext?: {
    intent?: string
    country?: string
  }
}

Deno.serve(async (req: Request) => {
  const _user = await getAuthenticatedUser(req)
  if (!_user) return jsonResponse(401, { ok: false, error: 'authentication_required' })

  const rateLimit = await checkRateLimit(_user.id, 'market-prior')
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds)
  await logApiUsage(_user.id, 'market-prior')

  if (req.method === 'OPTIONS') return jsonResponse(200, { ok: true })
  if (req.method !== 'POST') return jsonResponse(405, { ok: false, message: 'Method Not Allowed' })

  try {
    const body: RequestBody = await req.json().catch(() => ({}))
    const description = body.scenario?.description?.trim() || ''
    const title = body.scenario?.title?.trim() || ''
    const intent = body.questionContext?.intent || ''

    if (!description && !title) {
      return jsonResponse(400, { ok: false, message: 'Missing scenario description or title' })
    }

    const query = buildMarketPriorQuery(description || title, intent)

    // Search Polymarket first (primary)
    const polymarketResults = await searchPolymarket(query)

    // Fallback to Kalshi if Polymarket has no results
    const kalshiResults = polymarketResults.length === 0
      ? await searchKalshi(query)
      : []

    const result: MarketPriorResult = extractMarketPrior(query, polymarketResults, kalshiResults)

    return jsonResponse(200, {
      ok: true,
      marketPrior: result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return jsonResponse(500, { ok: false, message })
  }
})
