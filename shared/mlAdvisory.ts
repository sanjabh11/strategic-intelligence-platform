import { DOMAIN_ONTOLOGY, SCENARIO_TEMPLATES, type DomainOntologyEntity } from './gameTheoryKnowledge.ts'

export type CalibrationStatus = 'empirical' | 'prior_smoothed' | 'uncalibrated' | 'missing_model'
export type CalibrationStatusLike = CalibrationStatus | 'calibrated'

export type CalibrationSegmentKey =
  | 'registry_binary'
  | 'multi_agent_binary'
  | 'strategist_linked_binary'

export interface CalibrationPoint {
  probability: number
  outcome: number
}

export interface CalibrationModelShape {
  x: number[]
  y: number[]
}

export interface CalibrationModelRecord {
  segment_key: string
  method: 'isotonic_regression' | 'bayesian_smoothed_isotonic' | 'identity'
  params_json?: {
    isotonic?: CalibrationModelShape
  } | null
  metrics_json?: {
    sample_size?: number
    brier_raw?: number
    brier_calibrated?: number
  } | null
  version?: string | number | null
  minimum_sample_size?: number | null
  active?: boolean
}

export interface CalibrationEnvelope {
  rawProbability: number
  calibratedProbability: number
  calibrationStatus: CalibrationStatus
  calibrationVersion: string | null
  calibrationSampleSize: number
}

export interface GroundedEntityRef {
  entity_key: string
  entity_type: DomainOntologyEntity['entity_type']
  domain: DomainOntologyEntity['domain']
  label: string
  confidence: number
  matched_text: string
}

export interface DriftSignalSummary {
  surface: string
  scope_key: string
  detector: string
  score: number
  threshold: number
  state: 'stable' | 'watch' | 'triggered'
  metadata?: Record<string, unknown>
  triggered_at?: string
}

export interface ConstraintCheck {
  id: string
  title: string
  status: 'pass' | 'warn' | 'fail'
  detail: string
  penalty: number
}

export interface ConstraintCheckSummary {
  score: number
  checks: ConstraintCheck[]
}

export interface AttributionDriver {
  label: string
  contribution: number
  direction: 'positive' | 'negative'
}

export interface AttributionSummary {
  subjectType: string
  drivers: AttributionDriver[]
  series?: Array<{
    label: string
    value: number
  }>
}

const ENTITY_ALIAS_OVERRIDES: Record<string, string[]> = {
  buyer: ['procurement lead', 'procurement', 'buyer'],
  supplier: ['vendor', 'incumbent supplier', 'primary supplier'],
  alternate_supplier: ['secondary supplier', 'fallback supplier', 'alternate vendor'],
  regulator: ['regulator', 'trade authority', 'tariff authority'],
  logistics_node: ['port', 'transit route', 'shipping lane', 'logistics'],
  central_bank: ['fed', 'ecb', 'pboc', 'reserve manager', 'central bank'],
  producer_cartel: ['opec', 'producer bloc', 'supply bloc'],
  inventory_buffer: ['inventory', 'stockpile', 'buffer stock'],
  substitution: ['alternative spec', 'substitution', 'swap product'],
  hedging: ['hedge', 'hedging', 'risk transfer'],
  price_spike: ['price spike', 'price surge', 'market spike'],
  supply_disruption: ['outage', 'supply disruption', 'shortage', 'allocation event'],
  sanctions: ['sanction', 'export control', 'trade restriction'],
  shipping_delay: ['transit delay', 'shipping delay', 'port congestion'],
  tariff_change: ['tariff', 'duty increase', 'import duty'],
  fx_move: ['currency move', 'fx move', 'exchange rate'],
  demand_shock: ['demand shock', 'demand surge', 'demand collapse'],
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function clampProbability(value: number) {
  return clamp(Number.isFinite(value) ? value : 0.5, 0, 1)
}

/**
 * Apply a longshot probability floor to prevent assigning near-zero probability
 * to outcomes that historically resolve more often than the model expects.
 *
 * Inspired by ProphetHacks (Robby955/prophet-hacks): sub-$0.10 contracts
 * lose >60% on average on Kalshi, so flooring at min(0.10, max(0.05, 0.5/n))
 * prevents systematic underestimation of unlikely outcomes.
 *
 * Source: https://www.prophetarena.co/research/prophethacks
 */
export function applyLongshotFloor(probability: number, nOutcomes: number = 2): number {
  const floor = Math.min(0.10, Math.max(0.05, 0.5 / nOutcomes))
  return clampProbability(Math.max(probability, floor))
}

export function normalizeCalibrationStatus(status?: string | null): CalibrationStatus {
  switch (status) {
    case 'empirical':
    case 'prior_smoothed':
    case 'uncalibrated':
    case 'missing_model':
      return status
    case 'calibrated':
      return 'empirical'
    default:
      return 'missing_model'
  }
}

export function labelCalibrationStatus(status?: string | null) {
  return normalizeCalibrationStatus(status).replace(/_/g, ' ')
}

function round(value: number, digits = 6) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[_/()-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function distinct<T>(values: T[]) {
  return Array.from(new Set(values))
}

function average(values: number[]) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function standardDeviation(values: number[]) {
  if (values.length < 2) return 0
  const mean = average(values)
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)))
}

function brierScore(probability: number, outcome: number) {
  return (clampProbability(probability) - clampProbability(outcome)) ** 2
}

export function inferEntityAliases(entity: DomainOntologyEntity) {
  const baseAliases = [
    entity.key,
    entity.key.replace(/_/g, ' '),
    entity.label,
    ...(ENTITY_ALIAS_OVERRIDES[entity.key] || []),
  ]

  const templateAliases = SCENARIO_TEMPLATES
    .filter((template) => template.domain === entity.domain)
    .flatMap((template) => template.keywords || [])
    .filter((keyword) => keyword.includes(entity.key.split('_')[0] || ''))

  return distinct(
    [...baseAliases, ...templateAliases]
      .map((alias) => normalizeText(alias))
      .filter((alias) => alias.length >= 3)
  )
}

export function buildOntologySeed() {
  const aliases = DOMAIN_ONTOLOGY.flatMap((entity) =>
    inferEntityAliases(entity).map((alias) => ({
      entity_key: entity.key,
      alias,
      alias_type: alias === normalizeText(entity.label) ? 'canonical' : 'synonym',
      weight: alias === normalizeText(entity.label) ? 1 : alias === normalizeText(entity.key.replace(/_/g, ' ')) ? 0.95 : 0.75,
    }))
  )

  return {
    entities: DOMAIN_ONTOLOGY.map((entity) => ({
      entity_key: entity.key,
      entity_type: entity.entity_type,
      domain: entity.domain,
      label: entity.label,
      description: entity.description,
    })),
    aliases,
  }
}

export function inferGroundedEntities(args: {
  texts: Array<string | null | undefined>
  domain?: string | null
  ontology?: DomainOntologyEntity[]
  maxResults?: number
}): GroundedEntityRef[] {
  const ontology = args.ontology || DOMAIN_ONTOLOGY
  const maxResults = args.maxResults || 8
  const searchable = args.texts.filter(Boolean).join(' \n ')
  const normalized = normalizeText(searchable)
  if (!normalized) return []

  const results = ontology
    .filter((entity) => !args.domain || entity.domain === args.domain || args.domain === 'all')
    .map((entity) => {
      const aliases = inferEntityAliases(entity)
      let bestMatch = ''
      let bestWeight = 0

      for (const alias of aliases) {
        const pattern = new RegExp(`\\b${escapeRegex(alias)}\\b`, 'i')
        if (pattern.test(normalized)) {
          const aliasWeight = alias === normalizeText(entity.label)
            ? 0.96
            : alias === normalizeText(entity.key.replace(/_/g, ' '))
              ? 0.9
              : 0.75
          if (aliasWeight > bestWeight) {
            bestWeight = aliasWeight
            bestMatch = alias
          }
        }
      }

      if (!bestMatch) return null

      const domainBoost = !args.domain || args.domain === entity.domain ? 0.04 : 0
      const coverageBoost = normalized.includes(normalizeText(entity.description).split(' ').slice(0, 2).join(' ')) ? 0.03 : 0

      return {
        entity_key: entity.key,
        entity_type: entity.entity_type,
        domain: entity.domain,
        label: entity.label,
        confidence: round(clamp(bestWeight + domainBoost + coverageBoost, 0.55, 0.99), 4),
        matched_text: bestMatch,
      } satisfies GroundedEntityRef
    })
    .filter((value): value is GroundedEntityRef => Boolean(value))
    .sort((left, right) => right.confidence - left.confidence)

  return results.slice(0, maxResults)
}

export function rankEvidenceWithGrounding<T extends Record<string, any>>(args: {
  evidence: T[]
  domain?: string | null
}): Array<T & { grounded_entities: GroundedEntityRef[]; ranking_score: number }> {
  return args.evidence
    .map((item) => {
      const grounded = inferGroundedEntities({
        texts: [item.title, item.content, item.snippet, item.url],
        domain: args.domain,
        maxResults: 4,
      })
      const entityScore = grounded.length > 0 ? grounded[0].confidence : 0
      const domainScore = args.domain && item.domain === args.domain ? 1 : 0.6
      const credibilityScore = Number(item.credibility_score ?? item.credibility ?? 0.5)
      const temporalScore = 1 - clamp(Number(item.temporal_distance ?? 365) / 365, 0, 1)
      const semanticScore = Number(item.relevance_score ?? item.score ?? 0.5)
      const rankingScore = round(
        entityScore * 0.35 +
        domainScore * 0.2 +
        credibilityScore * 0.2 +
        temporalScore * 0.15 +
        semanticScore * 0.1,
        6,
      )

      return {
        ...item,
        grounded_entities: grounded,
        ranking_score: rankingScore,
      }
    })
    .sort((left, right) => right.ranking_score - left.ranking_score)
}

function interpolateCalibration(probability: number, shape: CalibrationModelShape) {
  const x = shape.x || []
  const y = shape.y || []
  const p = clampProbability(probability)
  if (!x.length || !y.length || x.length !== y.length) return p
  if (p <= x[0]) return clampProbability(y[0])
  if (p >= x[x.length - 1]) return clampProbability(y[y.length - 1])

  for (let i = 1; i < x.length; i++) {
    if (p <= x[i]) {
      const leftX = x[i - 1]
      const rightX = x[i]
      const leftY = y[i - 1]
      const rightY = y[i]
      const ratio = rightX === leftX ? 0 : (p - leftX) / (rightX - leftX)
      return clampProbability(leftY + (rightY - leftY) * ratio)
    }
  }

  return p
}

function computeCalibrationMetrics(points: CalibrationPoint[], shape: CalibrationModelShape) {
  const raw = average(points.map((point) => brierScore(point.probability, point.outcome)))
  const calibrated = average(points.map((point) => brierScore(interpolateCalibration(point.probability, shape), point.outcome)))
  return {
    sample_size: points.length,
    brier_raw: round(raw, 6),
    brier_calibrated: round(calibrated, 6),
  }
}

const BAYESIAN_PRIOR_SHAPE: CalibrationModelShape = {
  x: [0, 0.01, 0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99, 1],
  y: [0.05, 0.08, 0.15, 0.2, 0.32, 0.5, 0.68, 0.8, 0.83, 0.85, 0.86],
}

function buildBayesianSmoothedShape(points: CalibrationPoint[]) {
  if (!points.length) {
    return BAYESIAN_PRIOR_SHAPE
  }

  const buckets = BAYESIAN_PRIOR_SHAPE.x.map((x, index) => ({
    x,
    value: BAYESIAN_PRIOR_SHAPE.y[index],
    weight: 3,
  }))

  for (const point of points) {
    const nearestIndex = buckets.reduce((bestIndex, bucket, index) => {
      const bestDistance = Math.abs(point.probability - buckets[bestIndex].x)
      const nextDistance = Math.abs(point.probability - bucket.x)
      return nextDistance < bestDistance ? index : bestIndex
    }, 0)
    const bucket = buckets[nearestIndex]
    const blendedWeight = bucket.weight + 1
    bucket.value = ((bucket.value * bucket.weight) + point.outcome) / blendedWeight
    bucket.weight = blendedWeight
  }

  let lastValue = 0
  const y = buckets.map((bucket) => {
    lastValue = clamp(round(Math.max(lastValue, bucket.value), 6), 0, 1)
    return lastValue
  })

  return {
    x: [...BAYESIAN_PRIOR_SHAPE.x],
    y,
  }
}

export function fitIsotonicCalibration(
  points: CalibrationPoint[],
  segmentKey: CalibrationSegmentKey,
  minimumSampleSize = 25,
): CalibrationModelRecord {
  const sanitized = points
    .map((point) => ({
      probability: clampProbability(point.probability),
      outcome: clampProbability(point.outcome) >= 0.5 ? 1 : 0,
    }))
    .sort((left, right) => left.probability - right.probability)

  if (sanitized.length < minimumSampleSize) {
    const shape = buildBayesianSmoothedShape(sanitized)
    return {
      segment_key: segmentKey,
      method: 'bayesian_smoothed_isotonic',
      params_json: {
        isotonic: shape,
      },
      metrics_json: computeCalibrationMetrics(sanitized, shape),
      minimum_sample_size: minimumSampleSize,
      active: true,
    }
  }

  const blocks = sanitized.map((point) => ({
    probabilities: [point.probability],
    sumWeight: 1,
    sumOutcome: point.outcome,
    averageOutcome: point.outcome,
  }))

  for (let index = 0; index < blocks.length; index++) {
    while (
      index > 0 &&
      blocks[index - 1].averageOutcome > blocks[index].averageOutcome
    ) {
      const previous = blocks[index - 1]
      const current = blocks[index]
      const mergedWeight = previous.sumWeight + current.sumWeight
      const mergedOutcome = previous.sumOutcome + current.sumOutcome
      blocks.splice(index - 1, 2, {
        probabilities: [...previous.probabilities, ...current.probabilities],
        sumWeight: mergedWeight,
        sumOutcome: mergedOutcome,
        averageOutcome: mergedOutcome / mergedWeight,
      })
      index -= 1
    }
  }

  const fittedPairs = blocks.flatMap((block) =>
    block.probabilities.map((probability) => ({
      probability,
      fitted: block.averageOutcome,
    }))
  )

  const byProbability = new Map<number, number[]>()
  for (const pair of fittedPairs) {
    const bucket = byProbability.get(pair.probability) || []
    bucket.push(pair.fitted)
    byProbability.set(pair.probability, bucket)
  }

  const x = [...byProbability.keys()].sort((left, right) => left - right)
  const y = x.map((probability) => round(average(byProbability.get(probability) || [0.5]), 6))
  const shape = { x, y }

  return {
    segment_key: segmentKey,
    method: 'isotonic_regression',
    params_json: { isotonic: shape },
    metrics_json: computeCalibrationMetrics(sanitized, shape),
    minimum_sample_size: minimumSampleSize,
    active: true,
  }
}

export function applyCalibrationModel(
  probability: number,
  model?: CalibrationModelRecord | null,
): CalibrationEnvelope {
  const rawProbability = round(clampProbability(probability), 6)
  if (!model) {
    return {
      rawProbability,
      calibratedProbability: rawProbability,
      calibrationStatus: 'missing_model',
      calibrationVersion: null,
      calibrationSampleSize: 0,
    }
  }

  const shape = model.params_json?.isotonic
  const calibratedProbability = (model.method === 'isotonic_regression' || model.method === 'bayesian_smoothed_isotonic') && shape
    ? round(interpolateCalibration(rawProbability, shape), 6)
    : rawProbability

  const calibrationStatus: CalibrationStatus = model.method === 'identity'
    ? 'uncalibrated'
    : model.method === 'bayesian_smoothed_isotonic'
      ? 'prior_smoothed'
      : 'empirical'

  return {
    rawProbability,
    calibratedProbability,
    calibrationStatus,
    calibrationVersion: model.version != null ? String(model.version) : null,
    calibrationSampleSize: Number(model.metrics_json?.sample_size || 0),
  }
}

export function detectDistributionDrift(args: {
  reference: number[]
  current: number[]
  threshold?: number
  surface: string
  scopeKey: string
  detector?: string
}): DriftSignalSummary {
  const reference = args.reference.filter(Number.isFinite).map(Number)
  const current = args.current.filter(Number.isFinite).map(Number)
  const threshold = Number(args.threshold || 0.12)
  const detector = args.detector || 'wasserstein_proxy_v1'

  if (!reference.length || !current.length) {
    return {
      surface: args.surface,
      scope_key: args.scopeKey,
      detector,
      score: 0,
      threshold,
      state: 'stable',
      metadata: {
        reference_size: reference.length,
        current_size: current.length,
        reason: 'insufficient_samples',
      },
      triggered_at: new Date().toISOString(),
    }
  }

  const sortedReference = [...reference].sort((left, right) => left - right)
  const sortedCurrent = [...current].sort((left, right) => left - right)
  const samples = Math.max(sortedReference.length, sortedCurrent.length)
  let transport = 0

  for (let index = 0; index < samples; index++) {
    const referenceIndex = Math.min(sortedReference.length - 1, Math.floor(index * sortedReference.length / samples))
    const currentIndex = Math.min(sortedCurrent.length - 1, Math.floor(index * sortedCurrent.length / samples))
    transport += Math.abs(sortedReference[referenceIndex] - sortedCurrent[currentIndex])
  }

  const normalizedTransport = transport / samples
  const meanShift = Math.abs(average(sortedReference) - average(sortedCurrent))
  const volatilityShift = Math.abs(standardDeviation(sortedReference) - standardDeviation(sortedCurrent))
  const score = round(normalizedTransport * 0.55 + meanShift * 0.3 + volatilityShift * 0.15, 6)
  const state = score >= threshold ? 'triggered' : score >= threshold * 0.65 ? 'watch' : 'stable'

  return {
    surface: args.surface,
    scope_key: args.scopeKey,
    detector,
    score,
    threshold,
    state,
    metadata: {
      reference_size: sortedReference.length,
      current_size: sortedCurrent.length,
      normalized_transport: round(normalizedTransport, 6),
      mean_shift: round(meanShift, 6),
      volatility_shift: round(volatilityShift, 6),
    },
    triggered_at: new Date().toISOString(),
  }
}

export function buildConstraintChecks(args: {
  scenarioText?: string | null
  questionText?: string | null
  recommendedStrategy?: string | null
  evidenceCount?: number | null
  groundedEntityCount?: number | null
  contradictionCount?: number | null
  hasBatnaSignal?: boolean | null
  hasMoveSequenceSignal?: boolean | null
}): ConstraintCheckSummary {
  const scenario = normalizeText(args.scenarioText || '')
  const question = normalizeText(args.questionText || '')
  const strategy = normalizeText(args.recommendedStrategy || '')
  const evidenceCount = Number(args.evidenceCount || 0)
  const groundedEntityCount = Number(args.groundedEntityCount || 0)
  const contradictionCount = Number(args.contradictionCount || 0)
  const hasBatnaSignal = args.hasBatnaSignal ?? /(batna|alternate supplier|fallback|inventory|switch)/.test(`${scenario} ${strategy}`)
  const hasMoveSequenceSignal = args.hasMoveSequenceSignal ?? /(first|then|if|after|before|countermove|retaliat|sequence)/.test(`${scenario} ${strategy} ${question}`)

  const checks: ConstraintCheck[] = [
    evidenceCount >= 4
      ? {
          id: 'evidence_completeness',
          title: 'Evidence completeness',
          status: 'pass',
          detail: `${evidenceCount} evidence items support the forecast package.`,
          penalty: 0,
        }
      : evidenceCount >= 2
        ? {
            id: 'evidence_completeness',
            title: 'Evidence completeness',
            status: 'warn',
            detail: `Only ${evidenceCount} evidence items were available; recommendation should remain advisory.`,
            penalty: 0.12,
          }
        : {
            id: 'evidence_completeness',
            title: 'Evidence completeness',
            status: 'fail',
            detail: 'The forecast package is under-evidenced and needs more grounding before promotion.',
            penalty: 0.24,
          },
    groundedEntityCount >= 2
      ? {
          id: 'entity_grounding',
          title: 'Entity grounding',
          status: 'pass',
          detail: `${groundedEntityCount} grounded entities were linked to the scenario or evidence bundle.`,
          penalty: 0,
        }
      : {
          id: 'entity_grounding',
          title: 'Entity grounding',
          status: groundedEntityCount === 1 ? 'warn' : 'fail',
          detail: groundedEntityCount === 1
            ? 'Only one grounded entity was linked; geopolitical or commodity reasoning may still be too generic.'
            : 'No grounded entities were linked to the scenario or evidence bundle.',
          penalty: groundedEntityCount === 1 ? 0.08 : 0.16,
        },
    hasBatnaSignal
      ? {
          id: 'batna_presence',
          title: 'BATNA or fallback path',
          status: 'pass',
          detail: 'A fallback option or BATNA signal was detected in the strategy package.',
          penalty: 0,
        }
      : {
          id: 'batna_presence',
          title: 'BATNA or fallback path',
          status: 'warn',
          detail: 'No explicit BATNA or fallback path was detected; negotiation posture may be overstated.',
          penalty: 0.1,
        },
    hasMoveSequenceSignal
      ? {
          id: 'move_order_consistency',
          title: 'Move-order consistency',
          status: 'pass',
          detail: 'The package includes a discernible move order or countermove sequence.',
          penalty: 0,
        }
      : {
          id: 'move_order_consistency',
          title: 'Move-order consistency',
          status: 'warn',
          detail: 'The package lacks an explicit move sequence, which weakens extensive-form reasoning.',
          penalty: 0.08,
        },
    contradictionCount === 0
      ? {
          id: 'credible_threat_consistency',
          title: 'Credible-threat consistency',
          status: 'pass',
          detail: 'No major contradiction points were surfaced by the adversarial layer.',
          penalty: 0,
        }
      : contradictionCount <= 2
        ? {
            id: 'credible_threat_consistency',
            title: 'Credible-threat consistency',
            status: 'warn',
            detail: `${contradictionCount} contradiction point(s) remain open in the adversarial review.`,
            penalty: 0.1,
          }
        : {
            id: 'credible_threat_consistency',
            title: 'Credible-threat consistency',
            status: 'fail',
            detail: `${contradictionCount} contradiction points remain unresolved, so the package should not be promoted automatically.`,
            penalty: 0.2,
          },
  ]

  const totalPenalty = checks.reduce((sum, check) => sum + check.penalty, 0)
  return {
    score: round(clamp(1 - totalPenalty, 0, 1), 4),
    checks,
  }
}

export function buildMarketAttribution(args: {
  asset: string
  change24h: number
  driftSignal?: DriftSignalSummary | null
  groundedEntities?: GroundedEntityRef[]
}): AttributionSummary {
  const changeMagnitude = Math.abs(args.change24h)
  const direction: 'positive' | 'negative' = args.change24h >= 0 ? 'positive' : 'negative'
  const drivers: AttributionDriver[] = [
    {
      label: `${args.asset} 24h move`,
      contribution: round(clamp(changeMagnitude / 5, 0.12, 0.58), 4),
      direction,
    },
  ]

  if (args.driftSignal && args.driftSignal.state !== 'stable') {
    drivers.push({
      label: `${args.driftSignal.surface} drift`,
      contribution: round(clamp(args.driftSignal.score, 0.08, 0.28), 4),
      direction: 'positive',
    })
  }

  if (args.groundedEntities?.length) {
    drivers.push({
      label: `${args.groundedEntities[0].label} grounding`,
      contribution: round(clamp(args.groundedEntities[0].confidence * 0.2, 0.05, 0.2), 4),
      direction: 'positive',
    })
  }

  return {
    subjectType: 'market_stream',
    drivers,
    series: [
      { label: '24h move', value: round(args.change24h, 4) },
      { label: 'drift score', value: round(args.driftSignal?.score || 0, 4) },
    ],
  }
}
