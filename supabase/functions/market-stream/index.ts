import { createClient } from 'npm:@supabase/supabase-js@2'
import { buildCorsHeaders, jsonResponse } from '../_shared/auth.ts'
import { createMarketFeedProvider } from '../_shared/live-data-providers.ts'
import {
  buildMarketAttribution,
  buildTimeBucketDedupe,
  deriveEntityRefs,
  enqueueMlJob,
  fetchLatestDriftSignal,
  maybeCallMlService,
} from '../_shared/ml-platform.ts'

type MarketStrategicScenario = {
  asset: string
  current_price: number
  change_24h: number
  pattern: string
  game_type: string
  description: string
  recommendation: string
  nash_equilibrium: string
  cooperative_outcome: string
  timestamp: string
}

function analyzeNashBargaining(price: { asset: string; price: number; change_24h: number }) {
  const priceChange = price.change_24h

  let scenario: Omit<MarketStrategicScenario, 'asset' | 'current_price' | 'change_24h' | 'timestamp'>
  if (priceChange > 2) {
    scenario = {
      pattern: 'buyers_competing',
      game_type: 'auction_game',
      description: `High demand for ${price.asset} creates competitive bidding`,
      recommendation: 'Sellers: Hold for higher prices. Buyers: Bid strategically with reservation price',
      nash_equilibrium: 'Price converges to highest buyer valuation',
      cooperative_outcome: 'Price stabilizes near efficient market level'
    }
  } else if (priceChange < -2) {
    scenario = {
      pattern: 'sellers_competing',
      game_type: 'bertrand_competition',
      description: `Excess supply of ${price.asset} drives prices down`,
      recommendation: 'Buyers: Wait for further drops. Sellers: Form coalition or differentiate',
      nash_equilibrium: 'Price falls to marginal cost',
      cooperative_outcome: 'Sellers coordinate to maintain higher prices'
    }
  } else {
    scenario = {
      pattern: 'market_equilibrium',
      game_type: 'nash_bargaining',
      description: `${price.asset} price stable at Nash equilibrium`,
      recommendation: 'Fair trade zone: Both buyers and sellers accept current price',
      nash_equilibrium: 'Current price reflects balanced supply-demand',
      cooperative_outcome: 'Efficient allocation achieved'
    }
  }

  return {
    asset: price.asset,
    current_price: price.price,
    change_24h: price.change_24h,
    ...scenario,
    timestamp: new Date().toISOString()
  }
}

const ref = Deno.env.get('SUPABASE_PROJECT_REF') || 'jxdihzqoaxtydolmltdr'
const supabaseUrl = Deno.env.get('SUPABASE_URL') || `https://${ref}.supabase.co`
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('EDGE_SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = supabaseUrl && serviceKey ? createClient(supabaseUrl, serviceKey) : null

function inferMarketDomain(asset: string) {
  return /gold|oil|energy|commodity/i.test(asset) ? 'commodity_procurement' : null
}

async function enqueueMarketDriftEvaluation() {
  if (!supabase) return
  const dedupeKey = buildTimeBucketDedupe('event:drift:market_stream', 15)
  await enqueueMlJob(supabase, {
    jobType: 'drift_evaluate',
    payload: {
      threshold: 0.12,
      source: 'market_stream',
      trigger: 'event_ingest',
    },
    dedupeKey,
    priority: 140,
    maxAttempts: 5,
  })
}

async function enrichScenarios(prices: Array<{ asset: string; price: number; change_24h: number }>) {
  const driftSignals = supabase
    ? await Promise.all(prices.map(async (price) => {
        const scopeKey = price.asset.toLowerCase()
        return await fetchLatestDriftSignal(supabase, 'market_stream', scopeKey).catch(() => null)
      }))
    : prices.map(() => null)

  return await Promise.all(prices.map(async (price, index) => {
    const scenario = analyzeNashBargaining(price)
    const entity_refs = deriveEntityRefs(
      [scenario.description, scenario.recommendation, scenario.asset],
      inferMarketDomain(price.asset)
    )
    const drift_signal = driftSignals[index]
    const fallbackAttribution = buildMarketAttribution({
      asset: scenario.asset,
      change24h: scenario.change_24h,
      driftSignal: drift_signal,
      groundedEntities: entity_refs,
    })
    const mlAttribution = await maybeCallMlService('/attribution/score', {
      subject_type: 'market_stream',
      features: {
        change_24h: Number(scenario.change_24h || 0),
        drift_score: Number(drift_signal?.score || 0),
        entity_count: entity_refs.length,
      },
    }).catch((error) => {
      console.warn('ML attribution fallback for market-stream:', error)
      return null
    })

    return {
      ...scenario,
      entity_refs,
      drift_signal,
      attribution: mlAttribution
        ? {
            subjectType: 'market_stream',
            drivers: Array.isArray(mlAttribution.drivers) ? mlAttribution.drivers : fallbackAttribution.drivers,
            series: fallbackAttribution.series,
          }
        : fallbackAttribution,
    }
  }))
}

// PUBLIC: No auth required
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return jsonResponse(200, { ok: true })
  }

  try {
    const provider = createMarketFeedProvider()

    if (req.headers.get('accept') === 'text/event-stream') {
	      const stream = new ReadableStream({
	        async start(controller) {
	          const encoder = new TextEncoder()
	          const initialResult = await provider.fetchPrices()
          const initialScenarios = await enrichScenarios(initialResult.prices)
	          controller.enqueue(
	            encoder.encode(`data: ${JSON.stringify({ type: 'init', prices: initialResult.prices, provider: initialResult.diagnostics, scenarios: initialScenarios })}\n\n`)
	          )

	          const intervalId = setInterval(async () => {
	            try {
	              const result = await provider.fetchPrices()
	              const scenarios = await enrichScenarios(result.prices)
                if (supabase && scenarios.length > 0) {
                  try {
                    await supabase.from('real_time_events').insert(scenarios.map((scenario) => ({
                      source: /oil|energy/i.test(scenario.asset) ? 'energy' : 'financial_markets',
                      event_type: scenario.pattern,
                      actors: [scenario.asset, 'market'],
                      strategic_context: {
                        description: scenario.description,
                        recommendation: scenario.recommendation,
                        attribution: scenario.attribution,
                      },
                      goldstein_scale: scenario.change_24h,
                      game_type: scenario.game_type,
                      recommended_strategy: scenario.recommendation,
                      confidence: 0.7,
                      timestamp: scenario.timestamp
                    })))
                    await enqueueMarketDriftEvaluation()
                  } catch {
                    // Feed response should still stream if event persistence fails.
                  }
                }
	              controller.enqueue(
	                encoder.encode(`data: ${JSON.stringify({ type: 'update', prices: result.prices, provider: result.diagnostics, scenarios, timestamp: new Date().toISOString() })}\n\n`)
	              )
	            } catch (error) {
              const message = error instanceof Error ? error.message : 'Unexpected error'
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`))
            }
          }, 60000)

          setTimeout(() => {
            clearInterval(intervalId)
            controller.close()
          }, 600000)
        }
      })

      return new Response(stream, {
        headers: {
          ...buildCorsHeaders(),
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      })
    }

	    const result = await provider.fetchPrices()
	    const scenarios = await enrichScenarios(result.prices)
      if (supabase && scenarios.length > 0) {
        try {
          await supabase.from('real_time_events').insert(scenarios.map((scenario) => ({
            source: /oil|energy/i.test(scenario.asset) ? 'energy' : 'financial_markets',
            event_type: scenario.pattern,
            actors: [scenario.asset, 'market'],
            strategic_context: {
              description: scenario.description,
              recommendation: scenario.recommendation,
              attribution: scenario.attribution,
            },
            goldstein_scale: scenario.change_24h,
            game_type: scenario.game_type,
            recommended_strategy: scenario.recommendation,
            confidence: 0.7,
            timestamp: scenario.timestamp
          })))
          await enqueueMarketDriftEvaluation()
        } catch {
          // Keep read path available even if persistence is temporarily unavailable.
        }
      }

	    return jsonResponse(200, {
	      success: true,
	      provider: result.diagnostics,
	      market_data: result.prices,
	      strategic_scenarios: scenarios,
        entity_refs: Array.from(new Map(
          scenarios.flatMap((scenario) => scenario.entity_refs || []).map((entity) => [entity.entity_key, entity])
        ).values()),
        drift_signal: scenarios.find((scenario) => scenario.drift_signal?.state === 'triggered')?.drift_signal
          || scenarios.find((scenario) => scenario.drift_signal)?.drift_signal
          || null,
	      timestamp: new Date().toISOString()
	    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return jsonResponse(500, { error: message })
  }
})
