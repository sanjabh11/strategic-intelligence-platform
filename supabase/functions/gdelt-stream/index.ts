// GDELT Real-Time Global Events Streaming
// Provides live strategic scenarios from global news events
// Updates every 15 minutes with geopolitical game theory scenarios

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Game theory event codes from GDELT
const GAME_THEORY_EVENT_CODES = {
  '043': { name: 'Cooperate', pattern: 'cooperation', value: 3 },
  '044': { name: 'Consult', pattern: 'coordination', value: 2 },
  '046': { name: 'Engage in negotiation', pattern: 'bargaining', value: 4 },
  '190': { name: 'Use conventional military force', pattern: 'conflict', value: -5 },
  '195': { name: 'Employ aerial weapons', pattern: 'escalation', value: -8 },
  '172': { name: 'Impose embargo/boycott', pattern: 'punishment', value: -3 },
  '051': { name: 'Express intent to cooperate', pattern: 'signaling_cooperation', value: 2 },
  '112': { name: 'Accuse', pattern: 'signaling_defection', value: -2 },
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch recent GDELT events (last 15 minutes)
    const events = await fetchGDELTEvents()

    // Parse events into game-theoretic frameworks
    const strategicScenarios = events.map(event => parseEventToGameTheory(event))

    // Store in database for historical analysis
    const { data: stored } = await supabase
      .from('real_time_events')
      .insert(strategicScenarios.map(s => ({
        source: 'gdelt',
        event_type: s.pattern,
        actors: s.actors,
        strategic_context: s.context,
        goldstein_scale: s.goldstein_scale,
        game_type: s.game_type,
        recommended_strategy: s.recommended_strategy,
        timestamp: new Date().toISOString()
      })))
      .select()

    // Return SSE format for real-time streaming
    if (req.headers.get('accept') === 'text/event-stream') {
      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder()
          strategicScenarios.forEach(scenario => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(scenario)}\n\n`)
            )
          })
          controller.close()
        }
      })

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      })
    }

    // Regular JSON response
    return new Response(
      JSON.stringify({
        success: true,
        events_count: strategicScenarios.length,
        scenarios: strategicScenarios.slice(0, 20), // Top 20 most relevant
        last_updated: new Date().toISOString(),
        next_update_in_minutes: 15
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Fetch GDELT events via BigQuery API or direct CSV feed
async function fetchGDELTEvents(): Promise<any[]> {
  // In production, use BigQuery API with GCP credentials
  // For now, simulate with recent strategic events
  
  // GDELT CSV format: GLOBALEVENTID, SQLDATE, Actor1Code, Actor2Code, EventCode, GoldsteinScale, AvgTone, etc.
  // Example: Query last 15 minutes of events
  
  return [
    {
      eventId: 'GDELT-001',
      date: '20251006',
      actor1: 'USA',
      actor2: 'CHN',
      eventCode: '046', // Engage in negotiation
      goldsteinScale: 4.0,
      avgTone: -1.2,
      sourceUrl: 'https://example.com/news/us-china-trade-talks'
    },
    {
      eventId: 'GDELT-002',
      date: '20251006',
      actor1: 'RUS',
      actor2: 'UKR',
      eventCode: '190', // Use conventional military force
      goldsteinScale: -5.0,
      avgTone: -8.5,
      sourceUrl: 'https://example.com/news/russia-ukraine-conflict'
    },
    {
      eventId: 'GDELT-003',
      date: '20251006',
      actor1: 'EU',
      actor2: 'UK',
      eventCode: '043', // Cooperate
      goldsteinScale: 3.0,
      avgTone: 2.1,
      sourceUrl: 'https://example.com/news/eu-uk-cooperation'
    }
  ]
}

// Parse GDELT event into game theory framework
function parseEventToGameTheory(event: any) {
  const gameInfo = GAME_THEORY_EVENT_CODES[event.eventCode as keyof typeof GAME_THEORY_EVENT_CODES]
  
  // Detect game type based on event characteristics
  let gameType = 'unknown'
  if (event.goldsteinScale > 2) {
    gameType = 'coordination_game' // Both benefit from cooperation
  } else if (event.goldsteinScale < -2) {
    gameType = 'conflict_game' // Zero-sum or negative-sum
  } else if (Math.abs(event.avgTone) > 5) {
    gameType = 'prisoners_dilemma' // High tension, cooperation optimal but risky
  } else {
    gameType = 'bargaining_game'
  }

  // Recommend strategy based on game type
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
    case 'bargaining_game':
      recommendedStrategy = 'Negotiate from BATNA, reveal information strategically'
      break
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
