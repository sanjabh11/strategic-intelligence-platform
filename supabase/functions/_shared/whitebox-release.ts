export const CONSENSUS_POLICIES = ['role_weighted', 'equal_weight', 'trimmed_mean', 'skeptic_adjusted'] as const
export type ConsensusPolicyId = (typeof CONSENSUS_POLICIES)[number]

export const DEFAULT_CONSENSUS_POLICY: ConsensusPolicyId = 'role_weighted'
export const DEFAULT_RELEASE_STATE_KEY = 'multi_agent_consensus'

const POLICY_LABELS: Record<ConsensusPolicyId, string> = {
  role_weighted: 'Role-Weighted Champion',
  equal_weight: 'Equal-Weight Challenger',
  trimmed_mean: 'Trimmed-Mean Challenger',
  skeptic_adjusted: 'Skeptic-Adjusted Challenger',
}

const POLICY_METHODS: Record<ConsensusPolicyId, string> = {
  role_weighted: 'role-weighted consensus',
  equal_weight: 'simple mean',
  trimmed_mean: 'drop extreme agent view',
  skeptic_adjusted: 'champion minus disagreement penalty',
}

export type ReleaseStateRow = {
  state_key: string
  active_policy: ConsensusPolicyId
  bootstrap_status: 'pending' | 'running' | 'completed'
  minimum_sample_size: number
  promotion_margin: number
  metrics?: Record<string, unknown> | null
  last_decision?: string | null
}

export type ConsensusVariantSnapshot = {
  id: ConsensusPolicyId
  label: string
  probability: number
  rawProbability?: number
  calibratedProbability?: number
  calibrationStatus?: 'empirical' | 'prior_smoothed' | 'uncalibrated' | 'missing_model' | 'calibrated'
  calibrationVersion?: string | null
  calibrationSampleSize?: number
  confidence: number
  method: string
  rationale?: string
}

export type WhiteboxEvaluationRecord = {
  forecast_id: string
  analysis_run_id: string | null
  variant_id: ConsensusPolicyId
  variant_label: string
  method: string
  probability: number
  outcome: number
  brier_score: number
  is_champion_variant: boolean
  active_policy_at_evaluation: ConsensusPolicyId
  forecast_resolved_at: string | null
  metadata: Record<string, unknown>
}

type EvaluationMetric = {
  policyId: ConsensusPolicyId
  label: string
  sampleSize: number
  avgBrier: number | null
  meanProbability: number | null
  meanAbsoluteError: number | null
  winsVsActive: number
  lossesVsActive: number
  tiesVsActive: number
  winRateVsActive: number | null
  championSelections: number
}

type ReleaseRecommendation = {
  action: 'hold' | 'promote'
  candidatePolicy: ConsensusPolicyId | null
  reason: string
  minimumSampleSize: number
  promotionMargin: number
  activeAvgBrier: number | null
  candidateAvgBrier: number | null
}

export function normalizePolicyId(value: unknown): ConsensusPolicyId {
  const text = String(value || '').trim().toLowerCase()
  if (CONSENSUS_POLICIES.includes(text as ConsensusPolicyId)) {
    return text as ConsensusPolicyId
  }
  if (text.includes('role-weighted') || text.includes('weighted specialist') || text.includes('weighted champion')) {
    return 'role_weighted'
  }
  if (text.includes('equal-weight') || text.includes('simple mean')) {
    return 'equal_weight'
  }
  if (text.includes('trimmed')) {
    return 'trimmed_mean'
  }
  if (text.includes('skeptic')) {
    return 'skeptic_adjusted'
  }
  return DEFAULT_CONSENSUS_POLICY
}

export function policyLabel(policyId: ConsensusPolicyId) {
  return POLICY_LABELS[policyId]
}

function policyMethod(policyId: ConsensusPolicyId) {
  return POLICY_METHODS[policyId]
}

function round(value: number, digits = 4) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function clampProbability(value: number) {
  if (Number.isNaN(value)) return 0.5
  return Math.min(1, Math.max(0, value))
}

function asNumber(value: unknown, fallback = 0.5) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function asNullableString(value: unknown) {
  const text = typeof value === 'string' ? value.trim() : ''
  return text.length > 0 ? text : null
}

function buildChampionRationale(policyId: ConsensusPolicyId) {
  switch (policyId) {
    case 'equal_weight':
      return 'Whitebox promotion selected the equal-weight aggregator after challenger calibration beat the incumbent policy.'
    case 'trimmed_mean':
      return 'Whitebox promotion selected the trimmed-mean aggregator after repeated outlier-sensitive wins on resolved forecasts.'
    case 'skeptic_adjusted':
      return 'Whitebox promotion selected the skeptic-adjusted aggregator because conservative disagreement penalties calibrated better on resolved forecasts.'
    case 'role_weighted':
    default:
      return 'Weighted specialist panel with skeptic-aware challenger comparison.'
  }
}

export function buildConsensusPresentation(
  variantsInput: Array<{
    id: unknown
    label?: string
    probability: number
    rawProbability?: number
    calibratedProbability?: number
    calibrationStatus?: 'empirical' | 'prior_smoothed' | 'uncalibrated' | 'missing_model' | 'calibrated'
    calibrationVersion?: string | null
    calibrationSampleSize?: number
    confidence: number
    method?: string
    rationale?: string
  }>,
  requestedPolicy?: unknown,
) {
  const variants = variantsInput
    .filter((variant) => CONSENSUS_POLICIES.includes(normalizePolicyId(variant.id)))
    .map((variant) => ({
      id: normalizePolicyId(variant.id),
      label: variant.label || policyLabel(normalizePolicyId(variant.id)),
      probability: clampProbability(asNumber(variant.probability)),
      rawProbability: clampProbability(asNumber(variant.rawProbability ?? variant.probability)),
      calibratedProbability: clampProbability(asNumber(variant.calibratedProbability ?? variant.probability)),
      calibrationStatus: variant.calibrationStatus || 'uncalibrated',
      calibrationVersion: asNullableString(variant.calibrationVersion),
      calibrationSampleSize: Number(variant.calibrationSampleSize || 0),
      confidence: clampProbability(asNumber(variant.confidence, 0.5)),
      method: variant.method || policyMethod(normalizePolicyId(variant.id)),
      rationale: variant.rationale,
    }))

  const activePolicy = variants.some((variant) => variant.id === normalizePolicyId(requestedPolicy))
    ? normalizePolicyId(requestedPolicy)
    : variants.some((variant) => variant.id === DEFAULT_CONSENSUS_POLICY)
      ? DEFAULT_CONSENSUS_POLICY
      : variants[0]?.id || DEFAULT_CONSENSUS_POLICY

  const championVariant = variants.find((variant) => variant.id === activePolicy) || variants[0]
  const challengers = variants
    .filter((variant) => variant.id !== championVariant?.id)
    .map((variant) => ({
      id: variant.id,
      label: variant.label,
      probability: round(variant.probability, 4),
      confidence: round(variant.confidence, 4),
      method: variant.method,
      deltaFromChampion: round(variant.probability - championVariant.probability, 4),
    }))

  const challengerSpread = challengers.reduce((max, challenger) => {
    return Math.max(max, Math.abs(challenger.deltaFromChampion))
  }, 0)

  return {
    activePolicy,
    champion: {
      policyId: championVariant.id,
      label: championVariant.label,
      probability: round(championVariant.probability, 4),
      rawProbability: round(championVariant.rawProbability ?? championVariant.probability, 4),
      calibratedProbability: round(championVariant.calibratedProbability ?? championVariant.probability, 4),
      calibrationStatus: championVariant.calibrationStatus || 'uncalibrated',
      calibrationVersion: championVariant.calibrationVersion ?? null,
      calibrationSampleSize: Number(championVariant.calibrationSampleSize || 0),
      confidence: round(championVariant.confidence, 4),
      method: championVariant.method,
      rationale: championVariant.rationale || buildChampionRationale(championVariant.id),
    },
    challengers,
    challengerSpread: round(challengerSpread, 4),
  }
}

export function extractConsensusVariantsFromModel(gameTheoryModel: unknown) {
  const model = gameTheoryModel && typeof gameTheoryModel === 'object' ? gameTheoryModel as Record<string, any> : null
  const multiAgent = model?.multi_agent_forecast
  const consensus = multiAgent?.consensus
  if (!consensus?.champion) return null

  const activePolicy = normalizePolicyId(
    consensus.activePolicy ||
    consensus.champion?.policyId ||
    multiAgent?.metadata?.activeConsensusPolicy ||
    DEFAULT_CONSENSUS_POLICY,
  )

  const variants: ConsensusVariantSnapshot[] = [
    {
      id: activePolicy,
      label: consensus.champion?.label || policyLabel(activePolicy),
      probability: clampProbability(asNumber(consensus.champion?.probability)),
      confidence: clampProbability(asNumber(consensus.champion?.confidence)),
      method: String(consensus.champion?.method || policyMethod(activePolicy)),
      rationale: asNullableString(consensus.champion?.rationale) || undefined,
    },
  ]

  for (const challenger of Array.isArray(consensus.challengers) ? consensus.challengers : []) {
    const policyId = normalizePolicyId(challenger?.id || challenger?.label || challenger?.method)
    if (variants.some((variant) => variant.id === policyId)) continue
    variants.push({
      id: policyId,
      label: challenger?.label || policyLabel(policyId),
      probability: clampProbability(asNumber(challenger?.probability)),
      confidence: clampProbability(asNumber(challenger?.confidence, consensus.champion?.confidence ?? 0.5)),
      method: String(challenger?.method || policyMethod(policyId)),
    })
  }

  return { activePolicy, variants }
}

export function resolveOutcomeValue(resolutionOutcome: unknown) {
  const outcome = String(resolutionOutcome || '').trim().toLowerCase()
  if (outcome === 'yes') return 1
  if (outcome === 'no') return 0
  return null
}

export function calculateBrierScore(probability: number, outcome: number) {
  return round((clampProbability(probability) - outcome) ** 2, 6)
}

export function buildWhiteboxEvaluations(forecast: Record<string, any>) {
  const outcome = resolveOutcomeValue(forecast.resolution_outcome)
  if (outcome === null) return []

  const extracted = extractConsensusVariantsFromModel(forecast.game_theory_model)
  if (!extracted) return []

  return extracted.variants.map((variant) => ({
    forecast_id: String(forecast.id),
    analysis_run_id: asNullableString(forecast.analysis_run_id),
    variant_id: variant.id,
    variant_label: variant.label,
    method: variant.method,
    probability: round(variant.probability, 6),
    outcome,
    brier_score: calculateBrierScore(variant.probability, outcome),
    is_champion_variant: variant.id === extracted.activePolicy,
    active_policy_at_evaluation: extracted.activePolicy,
    forecast_resolved_at: asNullableString(forecast.resolved_at),
    metadata: {
      question_type: forecast.game_theory_model?.multi_agent_forecast?.question?.questionType || null,
      disagreement_index: forecast.game_theory_model?.multi_agent_forecast?.panel?.disagreementIndex ?? null,
      evidence_count: forecast.game_theory_model?.multi_agent_forecast?.metadata?.evidenceCount ?? null,
    },
  }))
}

export async function ensureReleaseState(admin: any, stateKey = DEFAULT_RELEASE_STATE_KEY): Promise<ReleaseStateRow> {
  const { data: existing, error } = await admin
    .from('whitebox_release_state')
    .select('*')
    .eq('state_key', stateKey)
    .maybeSingle()

  if (error) throw new Error(`Failed to load whitebox release state: ${error.message}`)
  if (existing) {
    return {
      ...existing,
      active_policy: normalizePolicyId(existing.active_policy),
    }
  }

  const seed = {
    state_key: stateKey,
    active_policy: DEFAULT_CONSENSUS_POLICY,
    bootstrap_status: 'pending',
    minimum_sample_size: 12,
    promotion_margin: 0.015,
  }

  const { data: inserted, error: insertError } = await admin
    .from('whitebox_release_state')
    .insert(seed)
    .select('*')
    .single()

  if (insertError) throw new Error(`Failed to seed whitebox release state: ${insertError.message}`)

  return {
    ...inserted,
    active_policy: normalizePolicyId(inserted.active_policy),
  }
}

export async function loadActiveConsensusPolicy(admin: any, stateKey = DEFAULT_RELEASE_STATE_KEY) {
  const state = await ensureReleaseState(admin, stateKey)
  return normalizePolicyId(state.active_policy)
}

export async function fetchPendingWhiteboxForecasts(admin: any, limit = 25) {
  const { data, error } = await admin.rpc('whitebox_pending_forecasts', { p_limit: Math.max(1, Math.min(limit, 200)) })
  if (error) throw new Error(`Failed to load pending whitebox forecasts: ${error.message}`)
  return Array.isArray(data) ? data : []
}

export async function countPendingWhiteboxForecasts(admin: any) {
  const { data, error } = await admin.rpc('whitebox_pending_forecast_count')
  if (error) throw new Error(`Failed to count pending whitebox forecasts: ${error.message}`)
  return Number(data || 0)
}

export async function insertWhiteboxEvaluations(admin: any, evaluations: WhiteboxEvaluationRecord[], dryRun = false) {
  if (dryRun || evaluations.length === 0) return 0

  const payload = evaluations.map((evaluation) => ({
    ...evaluation,
    metadata: evaluation.metadata || {},
  }))

  const { error } = await admin
    .from('whitebox_release_evaluations')
    .upsert(payload, { onConflict: 'forecast_id,variant_id' })

  if (error) throw new Error(`Failed to persist whitebox release evaluations: ${error.message}`)
  return payload.length
}

export async function loadWhiteboxEvaluations(admin: any) {
  const { data, error } = await admin
    .from('whitebox_release_evaluations')
    .select('*')

  if (error) throw new Error(`Failed to load whitebox release evaluations: ${error.message}`)
  return Array.isArray(data) ? data : []
}

export function buildReleaseEvaluation(
  evaluations: Array<Record<string, any>>,
  state: Pick<ReleaseStateRow, 'active_policy' | 'minimum_sample_size' | 'promotion_margin'>,
) {
  const activePolicy = normalizePolicyId(state.active_policy)
  const minimumSampleSize = Number(state.minimum_sample_size || 12)
  const promotionMargin = Number(state.promotion_margin || 0.015)

  const perPolicy = new Map<ConsensusPolicyId, {
    sumBrier: number
    sumProbability: number
    sumAbsError: number
    sampleSize: number
    winsVsActive: number
    lossesVsActive: number
    tiesVsActive: number
    championSelections: number
  }>()

  for (const policyId of CONSENSUS_POLICIES) {
    perPolicy.set(policyId, {
      sumBrier: 0,
      sumProbability: 0,
      sumAbsError: 0,
      sampleSize: 0,
      winsVsActive: 0,
      lossesVsActive: 0,
      tiesVsActive: 0,
      championSelections: 0,
    })
  }

  const groupedByForecast = new Map<string, Map<ConsensusPolicyId, Record<string, any>>>()

  for (const evaluation of evaluations) {
    const policyId = normalizePolicyId(evaluation.variant_id)
    const bucket = perPolicy.get(policyId)!
    const brier = Number(evaluation.brier_score)
    const probability = Number(evaluation.probability)
    const outcome = Number(evaluation.outcome)

    bucket.sumBrier += Number.isFinite(brier) ? brier : 0
    bucket.sumProbability += Number.isFinite(probability) ? probability : 0
    bucket.sumAbsError += Number.isFinite(probability) && Number.isFinite(outcome) ? Math.abs(probability - outcome) : 0
    bucket.sampleSize += 1
    if (evaluation.is_champion_variant) bucket.championSelections += 1

    const forecastId = String(evaluation.forecast_id)
    const forecastBucket = groupedByForecast.get(forecastId) || new Map<ConsensusPolicyId, Record<string, any>>()
    forecastBucket.set(policyId, evaluation)
    groupedByForecast.set(forecastId, forecastBucket)
  }

  for (const variants of groupedByForecast.values()) {
    const activeRow = variants.get(activePolicy)
    if (!activeRow) continue
    const activeBrier = Number(activeRow.brier_score)

    for (const policyId of CONSENSUS_POLICIES) {
      if (policyId === activePolicy) continue
      const candidateRow = variants.get(policyId)
      if (!candidateRow) continue

      const candidateBucket = perPolicy.get(policyId)!
      const candidateBrier = Number(candidateRow.brier_score)

      if (candidateBrier + 1e-9 < activeBrier) candidateBucket.winsVsActive += 1
      else if (candidateBrier > activeBrier + 1e-9) candidateBucket.lossesVsActive += 1
      else candidateBucket.tiesVsActive += 1
    }
  }

  const policyMetrics: EvaluationMetric[] = CONSENSUS_POLICIES.map((policyId) => {
    const bucket = perPolicy.get(policyId)!
    const headToHeadSample = bucket.winsVsActive + bucket.lossesVsActive + bucket.tiesVsActive
    return {
      policyId,
      label: policyLabel(policyId),
      sampleSize: bucket.sampleSize,
      avgBrier: bucket.sampleSize > 0 ? round(bucket.sumBrier / bucket.sampleSize, 6) : null,
      meanProbability: bucket.sampleSize > 0 ? round(bucket.sumProbability / bucket.sampleSize, 4) : null,
      meanAbsoluteError: bucket.sampleSize > 0 ? round(bucket.sumAbsError / bucket.sampleSize, 6) : null,
      winsVsActive: bucket.winsVsActive,
      lossesVsActive: bucket.lossesVsActive,
      tiesVsActive: bucket.tiesVsActive,
      winRateVsActive: headToHeadSample > 0 ? round(bucket.winsVsActive / headToHeadSample, 4) : null,
      championSelections: bucket.championSelections,
    }
  })

  const activeMetrics = policyMetrics.find((metric) => metric.policyId === activePolicy) || null

  let recommendation: ReleaseRecommendation = {
    action: 'hold',
    candidatePolicy: null,
    reason: 'No challenger has outperformed the active policy with enough resolved samples yet.',
    minimumSampleSize,
    promotionMargin,
    activeAvgBrier: activeMetrics?.avgBrier ?? null,
    candidateAvgBrier: null,
  }

  if (!activeMetrics || activeMetrics.sampleSize < minimumSampleSize || activeMetrics.avgBrier === null) {
    recommendation = {
      ...recommendation,
      reason: `Need at least ${minimumSampleSize} resolved forecasts before promotion decisions are allowed.`,
    }
  } else {
    const eligibleCandidates = policyMetrics
      .filter((metric) => metric.policyId !== activePolicy && metric.sampleSize >= minimumSampleSize && metric.avgBrier !== null)
      .sort((left, right) => (left.avgBrier ?? 1) - (right.avgBrier ?? 1))

    const challenger = eligibleCandidates.find((metric) => {
      return (
        metric.avgBrier !== null &&
        activeMetrics.avgBrier !== null &&
        metric.avgBrier + promotionMargin < activeMetrics.avgBrier &&
        (metric.winRateVsActive ?? 0) >= 0.55
      )
    })

    if (challenger?.avgBrier !== null) {
      recommendation = {
        action: 'promote',
        candidatePolicy: challenger.policyId,
        reason: `${challenger.label} beat ${activeMetrics.label} on resolved forecasts with lower average Brier loss and a winning head-to-head rate.`,
        minimumSampleSize,
        promotionMargin,
        activeAvgBrier: activeMetrics.avgBrier,
        candidateAvgBrier: challenger.avgBrier,
      }
    } else if (eligibleCandidates[0]?.avgBrier !== null) {
      recommendation = {
        ...recommendation,
        candidateAvgBrier: eligibleCandidates[0].avgBrier,
        reason: `${eligibleCandidates[0].label} is the closest challenger, but it has not cleared the margin and win-rate thresholds for promotion.`,
      }
    }
  }

  return {
    activePolicy,
    evaluationCount: evaluations.length,
    evaluatedForecastCount: groupedByForecast.size,
    policyMetrics,
    recommendation,
  }
}

export async function persistReleaseState(admin: any, stateKey: string, patch: Record<string, unknown>, dryRun = false) {
  if (dryRun) return null
  const { data, error } = await admin
    .from('whitebox_release_state')
    .update(patch)
    .eq('state_key', stateKey)
    .select('*')
    .single()

  if (error) throw new Error(`Failed to update whitebox release state: ${error.message}`)
  return data
}

export async function recordReleaseDecision(admin: any, decision: Record<string, unknown>, dryRun = false) {
  if (dryRun) return null
  const { error } = await admin
    .from('whitebox_release_decisions')
    .insert(decision)

  if (error) throw new Error(`Failed to record whitebox release decision: ${error.message}`)
  return true
}
