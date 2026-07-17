import type { AttentionTier, GDELTEvent, RadarEvent, RegionFilter } from '../types/geopolitical'

const MAX_GOLDSTEIN = 10
const MAX_STRATEGIC_VALUE = 10
const FRESHNESS_WINDOW_HOURS = 72

const REGION_KEYWORDS: Record<Exclude<RegionFilter, 'all'>, string[]> = {
  asia_pacific: ['chn', 'china', 'taiwan', 'jpn', 'japan', 'kor', 'korea', 'aus', 'australia', 'ind', 'india', 'asean', 'philippines', 'vnm', 'vietnam'],
  europe: ['eu', 'europe', 'uk', 'united kingdom', 'gbr', 'france', 'fra', 'deu', 'germany', 'poland', 'ukraine', 'rus', 'russia', 'nato'],
  middle_east: ['irn', 'iran', 'irq', 'iraq', 'isr', 'israel', 'gaza', 'saudi', 'ksa', 'uae', 'qatar', 'turkey', 'turkiye', 'syria', 'syr', 'yemen', 'yem'],
  americas: ['usa', 'united states', 'can', 'canada', 'mex', 'mexico', 'brazil', 'bra', 'argentina', 'latam', 'latin america'],
  africa: ['africa', 'nigeria', 'nga', 'egypt', 'egy', 'ethiopia', 'kenya', 'south africa', 'zaf', 'sudan']
}

const GAME_TYPE_PATTERN_WEIGHT: Record<string, number> = {
  conflict_game: 1,
  prisoners_dilemma: 0.85,
  bargaining_game: 0.7,
  coordination_game: 0.45,
  unknown: 0.4
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

function normalizeAbsolute(value: number, maxValue: number) {
  return clamp(Math.abs(value) / maxValue)
}

function recencyScore(timestamp: string, now = Date.now()) {
  const eventTime = new Date(timestamp).getTime()
  if (!Number.isFinite(eventTime)) return 0.25
  const ageHours = Math.max(0, (now - eventTime) / (1000 * 60 * 60))
  return clamp(1 - (ageHours / FRESHNESS_WINDOW_HOURS))
}

function gamePatternWeight(event: GDELTEvent) {
  const pattern = event.pattern.toLowerCase()
  if (pattern.includes('escalation') || pattern.includes('conflict')) return 1
  if (pattern.includes('bargaining') || pattern.includes('negotiation')) return 0.78
  if (pattern.includes('cooperation') || pattern.includes('coordination')) return 0.48
  return GAME_TYPE_PATTERN_WEIGHT[event.game_type] ?? GAME_TYPE_PATTERN_WEIGHT.unknown
}

function inferAttentionTier(priorityScore: number): AttentionTier {
  if (priorityScore >= 75) return 'critical'
  if (priorityScore >= 55) return 'high'
  return 'monitor'
}

export function inferEventRegion(event: GDELTEvent): RegionFilter {
  const searchable = [event.actors.join(' '), event.context.description, event.context.source_url]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const scored = (Object.entries(REGION_KEYWORDS) as Array<[Exclude<RegionFilter, 'all'>, string[]]>)
    .map(([region, keywords]) => ({
      region,
      matches: keywords.reduce((count, keyword) => count + (searchable.includes(keyword) ? 1 : 0), 0)
    }))
    .filter((entry) => entry.matches > 0)
    .sort((left, right) => {
      if (right.matches !== left.matches) {
        return right.matches - left.matches
      }

      const rank: Record<Exclude<RegionFilter, 'all'>, number> = {
        middle_east: 5,
        asia_pacific: 4,
        europe: 3,
        africa: 2,
        americas: 1
      }

      return rank[right.region] - rank[left.region]
    })

  if (scored[0]) {
    return scored[0].region
  }

  return 'all'
}

function deriveWatchReason(
  event: GDELTEvent,
  contributions: {
    severity: number
    strategic: number
    pattern: number
    confidence: number
    recency: number
  }
) {
  const ranked = Object.entries(contributions).sort((a, b) => b[1] - a[1])
  const topDriver = ranked[0]?.[0] ?? 'severity'

  if (topDriver === 'pattern' || event.pattern.toLowerCase().includes('escalation') || event.game_type === 'conflict_game') {
    return 'Conflict or escalation spike with immediate strategic consequences'
  }

  if (topDriver === 'strategic') {
    return 'High strategic value actor interaction with downstream policy and market implications'
  }

  if (event.game_type === 'bargaining_game' && contributions.severity >= 20) {
    return 'Bargaining event carrying unusually high severity for a negotiation dynamic'
  }

  if (topDriver === 'confidence' || (contributions.confidence >= 8 && contributions.recency >= 7)) {
    return 'High-confidence event that warrants immediate monitoring and escalation tracking'
  }

  if (topDriver === 'recency') {
    return 'Fresh event signal that could reshape the near-term strategic picture quickly'
  }

  return 'Elevated severity signal that deserves active strategic monitoring'
}

export function buildBriefingSummary(event: GDELTEvent, watchReason: string, attentionTier: AttentionTier) {
  const [actorOne = 'Actor 1', actorTwo = 'Actor 2'] = event.actors
  const pattern = event.pattern.replace(/_/g, ' ')
  const importance = attentionTier === 'critical'
    ? 'This is a critical strategic signal.'
    : attentionTier === 'high'
      ? 'This is a high-priority development.'
      : 'This remains a monitor-level development.'

  return `${actorOne} and ${actorTwo} are in a ${pattern} dynamic: ${event.context.description}. ${importance} Watch for ${watchReason.toLowerCase()} and consider ${event.recommended_strategy.toLowerCase()}.`
}

export function enrichRadarEvent(event: GDELTEvent, now = Date.now()): RadarEvent {
  const severity = normalizeAbsolute(event.goldstein_scale, MAX_GOLDSTEIN) * 35
  const strategic = normalizeAbsolute(event.context.strategic_value, MAX_STRATEGIC_VALUE) * 25
  const pattern = gamePatternWeight(event) * 20
  const confidence = clamp(event.context.confidence) * 10
  const recency = recencyScore(event.timestamp, now) * 10
  const priorityScore = Math.round(clamp((severity + strategic + pattern + confidence + recency) / 100) * 100)
  const attentionTier = inferAttentionTier(priorityScore)
  const watchReason = deriveWatchReason(event, { severity, strategic, pattern, confidence, recency })

  return {
    ...event,
    priority_score: priorityScore,
    watch_reason: watchReason,
    briefing_summary: buildBriefingSummary(event, watchReason, attentionTier),
    attention_tier: attentionTier,
    region: inferEventRegion(event)
  }
}

export function buildRadarScenarioPrompt(event: RadarEvent) {
  const sourceLine = event.context.source_url ? `Source URL: ${event.context.source_url}` : 'Source URL: unavailable'

  return [
    `Strategic briefing request: ${event.briefing_summary}`,
    `Actors: ${event.actors.join(' vs ')}`,
    `Priority score: ${event.priority_score}/100 (${event.attention_tier})`,
    `Watch reason: ${event.watch_reason}`,
    `Game type: ${event.game_type}`,
    `Pattern: ${event.pattern}`,
    `Recommended strategy: ${event.recommended_strategy}`,
    sourceLine
  ].join('\n')
}
