import { describe, expect, it } from 'vitest'
import { buildBriefingSummary, buildRadarScenarioPrompt, enrichRadarEvent, inferEventRegion } from '../src/lib/geopoliticalRadar'
import type { GDELTEvent } from '../src/types/geopolitical'

const baseEvent: GDELTEvent = {
  event_id: 'evt-1',
  actors: ['USA', 'IRN'],
  pattern: 'conflict',
  goldstein_scale: -8,
  sentiment: -5.2,
  game_type: 'conflict_game',
  recommended_strategy: 'Strengthen defenses, seek allies',
  context: {
    description: 'Military escalation between USA and IRN raises regional deterrence concerns.',
    strategic_value: 9,
    source_url: 'https://example.com/conflict',
    confidence: 0.84
  },
  realtime: true,
  timestamp: '2026-04-29T08:00:00.000Z'
}

describe('geopolitical radar helpers', () => {
  it('ranks high-severity escalation above lower-value coordination events', () => {
    const enrichedConflict = enrichRadarEvent(baseEvent, new Date('2026-04-29T10:00:00.000Z').getTime())
    const enrichedCoordination = enrichRadarEvent({
      ...baseEvent,
      event_id: 'evt-2',
      actors: ['CAN', 'USA'],
      pattern: 'cooperation',
      goldstein_scale: 2,
      game_type: 'coordination_game',
      context: {
        ...baseEvent.context,
        strategic_value: 2,
        description: 'Routine diplomatic coordination between allied governments.',
        confidence: 0.65
      }
    }, new Date('2026-04-29T10:00:00.000Z').getTime())

    expect(enrichedConflict.priority_score).toBeGreaterThan(enrichedCoordination.priority_score)
    expect(enrichedConflict.attention_tier).toBe('critical')
  })

  it('matches watch reason to the top scoring driver and assigns region', () => {
    const enriched = enrichRadarEvent(baseEvent, new Date('2026-04-29T10:00:00.000Z').getTime())

    expect(enriched.watch_reason).toContain('Conflict or escalation spike')
    expect(inferEventRegion(baseEvent)).toBe('middle_east')
  })

  it('builds actor-aware briefing and console handoff text', () => {
    const watchReason = 'High strategic value actor interaction with downstream policy and market implications'
    const briefing = buildBriefingSummary(baseEvent, watchReason, 'high')
    const enriched = enrichRadarEvent(baseEvent, new Date('2026-04-29T10:00:00.000Z').getTime())
    const prompt = buildRadarScenarioPrompt(enriched)

    expect(briefing).toContain('USA and IRN')
    expect(briefing.length).toBeGreaterThan(80)
    expect(prompt).toContain('Priority score:')
    expect(prompt).toContain('Source URL:')
  })
})
