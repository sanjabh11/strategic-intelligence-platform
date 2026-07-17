import { createClient } from 'npm:@supabase/supabase-js@2'
import { buildCorsHeaders, jsonResponse } from '../_shared/auth.ts'
import { createEventFeedProvider } from '../_shared/live-data-providers.ts'
import { buildTimeBucketDedupe, deriveEntityRefs, enqueueMlJob, fetchLatestDriftSignal } from '../_shared/ml-platform.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

async function enqueueGeopoliticalDriftEvaluation() {
  const dedupeKey = buildTimeBucketDedupe('event:drift:geopolitical_radar', 30)
  await enqueueMlJob(supabase, {
    jobType: 'drift_evaluate',
    payload: {
      threshold: 0.12,
      source: 'geopolitical_radar',
      trigger: 'event_ingest',
    },
    dedupeKey,
    priority: 135,
    maxAttempts: 5,
  })
}

const GAME_THEORY_EVENT_CODES = {
  '043': { name: 'Cooperate', pattern: 'cooperation', value: 3 },
  '044': { name: 'Consult', pattern: 'coordination', value: 2 },
  '046': { name: 'Engage in negotiation', pattern: 'bargaining', value: 4 },
  '190': { name: 'Use conventional military force', pattern: 'conflict', value: -5 },
  '195': { name: 'Employ aerial weapons', pattern: 'escalation', value: -8 },
  '172': { name: 'Impose embargo/boycott', pattern: 'punishment', value: -3 },
  '051': { name: 'Express intent to cooperate', pattern: 'signaling_cooperation', value: 2 },
  '112': { name: 'Accuse', pattern: 'signaling_defection', value: -2 }
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function parseEventToGameTheory(event: any) {
  const gameInfo = GAME_THEORY_EVENT_CODES[event.eventCode as keyof typeof GAME_THEORY_EVENT_CODES]

  let gameType = 'unknown'
  if (event.goldsteinScale > 2) {
    gameType = 'coordination_game'
  } else if (event.goldsteinScale < -2) {
    gameType = 'conflict_game'
  } else if (Math.abs(event.avgTone) > 5) {
    gameType = 'prisoners_dilemma'
  } else {
    gameType = 'bargaining_game'
  }

  let recommendedStrategy = ''
  switch (gameType) {
    case 'coordination_game':
      recommendedStrategy = 'Cooperate openly, build trust'
      break
    case 'conflict_game':
      recommendedStrategy = 'Strengthen defenses, seek allies'
      break
    case 'prisoners_dilemma':
      recommendedStrategy = 'Use tit-for-tat with forgiveness'
      break
    default:
      recommendedStrategy = 'Negotiate from BATNA, reveal information strategically'
  }

  return {
    event_id: event.eventId,
    actors: [event.actor1, event.actor2],
    pattern: gameInfo?.pattern || 'unknown',
    goldstein_scale: event.goldsteinScale,
    sentiment: event.avgTone,
    game_type: gameType,
    recommended_strategy: recommendedStrategy,
    context: {
      description: `${gameInfo?.name || 'Unknown event'} between ${event.actor1} and ${event.actor2}`,
      strategic_value: gameInfo?.value || 0,
      source_url: event.sourceUrl,
      confidence: 0.75
    },
    realtime: true,
    timestamp: new Date().toISOString()
  }
}

// PUBLIC: No auth required
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return jsonResponse(200, { ok: true })
  }

  try {
    const provider = createEventFeedProvider()
    const { events, diagnostics } = await provider.fetchEvents()
    const marketDrift = await fetchLatestDriftSignal(supabase, 'geopolitical_radar', 'global').catch(() => null)
    const strategicScenarios = events.map(parseEventToGameTheory).map((scenario) => {
      const grounded = deriveEntityRefs(
        [...scenario.actors, scenario.context.description, scenario.recommended_strategy],
        null
      )
      const actorRefs = scenario.actors.map((actor) => ({
        entity_key: `actor:${slugify(actor)}`,
        entity_type: 'actor',
        domain: 'geopolitical_radar',
        label: actor,
        confidence: 0.72,
        matched_text: actor,
      }))
      const entity_refs = Array.from(new Map(
        [...actorRefs, ...grounded].map((entity) => [entity.entity_key, entity])
      ).values())
      const shadowScore = Math.min(
        0.99,
        Math.max(
          0.05,
          (Math.abs(Number(scenario.goldstein_scale || 0)) / 10) * 0.55 +
          (Math.abs(Number(scenario.sentiment || 0)) / 10) * 0.2 +
          ((marketDrift?.score || 0) * 0.25)
        )
      )

      return {
        ...scenario,
        entity_refs,
        shadow_risk: {
          score: Number(shadowScore.toFixed(4)),
          model_version: 'heuristic_shadow_v1',
        },
        drift_signal: marketDrift,
      }
    })

    if (strategicScenarios.length > 0) {
      await supabase.from('real_time_events').insert(strategicScenarios.map((scenario) => ({
        source: provider.name,
        event_type: scenario.pattern,
        actors: scenario.actors,
        strategic_context: scenario.context,
        goldstein_scale: scenario.goldstein_scale,
        game_type: scenario.game_type,
        recommended_strategy: scenario.recommended_strategy,
        confidence: scenario.context.confidence,
        timestamp: scenario.timestamp
      })))
      await enqueueGeopoliticalDriftEvaluation().catch(() => null)
    }

    if (req.headers.get('accept') === 'text/event-stream') {
      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder()
          controller.enqueue(encoder.encode(`event: meta\ndata: ${JSON.stringify({ provider: diagnostics })}\n\n`))
          strategicScenarios.forEach((scenario) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(scenario)}\n\n`))
          })
          controller.close()
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

    return jsonResponse(200, {
      success: true,
      events_count: strategicScenarios.length,
      scenarios: strategicScenarios.slice(0, 20),
      provider: diagnostics,
      last_updated: new Date().toISOString(),
      next_update_in_minutes: 15
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return jsonResponse(500, { error: message })
  }
})
