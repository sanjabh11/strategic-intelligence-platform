import {
  applyCalibrationModel,
  buildOntologySeed,
  inferGroundedEntities,
  rankEvidenceWithGrounding,
  type CalibrationEnvelope,
  type CalibrationModelRecord,
  type DriftSignalSummary,
  type GroundedEntityRef,
} from '../../../shared/mlAdvisory.ts'

export {
  applyCalibrationModel,
  buildOntologySeed,
  buildConstraintChecks,
  buildMarketAttribution,
  detectDistributionDrift,
  fitIsotonicCalibration,
  inferGroundedEntities,
  rankEvidenceWithGrounding,
} from '../../../shared/mlAdvisory.ts'

export const DEFAULT_PROMPT_POLICY_ID = 'analysis_prompt_v1'
export const DEFAULT_RETRIEVAL_POLICY_ID = 'entity_rank_v1'

export function buildVersionTag(prefix: string) {
  return `${prefix}_${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`
}

export function buildTimeBucketDedupe(prefix: string, bucketMinutes: number, date = new Date()) {
  const bucketMs = Math.max(1, bucketMinutes) * 60 * 1000
  return `${prefix}:${Math.floor(date.getTime() / bucketMs)}`
}

export async function maybeCallMlService(path: string, payload: Record<string, unknown>) {
  const baseUrl = Deno.env.get('ML_SERVICE_URL')?.replace(/\/$/, '')
  if (!baseUrl) return null

  const token = Deno.env.get('ML_SERVICE_TOKEN') || ''
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`ML service ${path} failed with HTTP ${response.status}`)
  }

  return await response.json()
}

export async function loadActiveCalibrationModel(admin: any, segmentKey: string): Promise<CalibrationModelRecord | null> {
  const { data, error } = await admin
    .from('calibration_models')
    .select('segment_key, method, params_json, metrics_json, version, minimum_sample_size, active')
    .eq('segment_key', segmentKey)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`Failed to load calibration model for ${segmentKey}: ${error.message}`)
  return data || null
}

export async function annotateCalibration(admin: any, segmentKey: string, probability: number): Promise<CalibrationEnvelope> {
  const model = await loadActiveCalibrationModel(admin, segmentKey)
  return applyCalibrationModel(probability, model)
}

export async function persistCalibrationModel(admin: any, args: {
  scope?: string
  segmentKey: string
  method: 'isotonic_regression' | 'bayesian_smoothed_isotonic' | 'identity'
  paramsJson?: Record<string, unknown>
  metricsJson?: Record<string, unknown>
  minimumSampleSize?: number
  version?: string
}) {
  await admin
    .from('calibration_models')
    .update({ active: false })
    .eq('segment_key', args.segmentKey)
    .eq('active', true)

  const payload = {
    scope: args.scope || 'probability_surface',
    segment_key: args.segmentKey,
    method: args.method,
    params_json: args.paramsJson || {},
    metrics_json: args.metricsJson || {},
    minimum_sample_size: args.minimumSampleSize || 25,
    active: true,
    version: args.version || buildVersionTag(args.segmentKey),
  }

  const { data, error } = await admin
    .from('calibration_models')
    .insert(payload)
    .select('*')
    .single()

  if (error) throw new Error(`Failed to persist calibration model for ${args.segmentKey}: ${error.message}`)
  return data
}

export async function enqueueMlJob(admin: any, args: {
  jobType: string
  payload?: Record<string, unknown>
  dedupeKey?: string | null
  runAt?: string
  priority?: number
  maxAttempts?: number
}) {
  const { data, error } = await admin.rpc('enqueue_ml_job', {
    p_job_type: args.jobType,
    p_payload: args.payload || {},
    p_dedupe_key: args.dedupeKey ?? null,
    p_run_at: args.runAt || new Date().toISOString(),
    p_priority: args.priority ?? 100,
    p_max_attempts: args.maxAttempts ?? 5,
  })

  if (error) throw new Error(`Failed to enqueue ML job ${args.jobType}: ${error.message}`)
  return data
}

export async function ensureOntologySeed(admin: any) {
  const seed = buildOntologySeed()
  const { error: entityError } = await admin
    .from('ontology_entities')
    .upsert(
      seed.entities.map((entity) => ({
        ...entity,
        metadata: { seeded_from: 'DOMAIN_ONTOLOGY' },
      })),
      { onConflict: 'entity_key' },
    )

  if (entityError) throw new Error(`Failed to upsert ontology entities: ${entityError.message}`)

  const { error: aliasError } = await admin
    .from('ontology_aliases')
    .upsert(seed.aliases, { onConflict: 'entity_key,alias' })

  if (aliasError) throw new Error(`Failed to upsert ontology aliases: ${aliasError.message}`)
  return seed
}

export async function loadOntologyEntities(admin: any) {
  const { data, error } = await admin
    .from('ontology_entities')
    .select('entity_key, entity_type, domain, label, description')

  if (error) throw new Error(`Failed to load ontology entities: ${error.message}`)
  return Array.isArray(data) ? data : []
}

export async function persistRetrievalEntityLinks(admin: any, links: Array<{
  retrieval_id: string
  entity_key: string
  confidence: number
  matched_text: string
  domain: string
}>) {
  if (!links.length) return 0
  const { error } = await admin
    .from('retrieval_entity_links')
    .upsert(links, { onConflict: 'retrieval_id,entity_key,matched_text' })

  if (error) throw new Error(`Failed to persist retrieval links: ${error.message}`)
  return links.length
}

export async function fetchLatestDriftSignal(admin: any, surface: string, scopeKey?: string | null): Promise<DriftSignalSummary | null> {
  let query = admin
    .from('drift_signals')
    .select('surface, scope_key, detector, score, threshold, state, metadata, triggered_at')
    .eq('surface', surface)
    .order('triggered_at', { ascending: false })
    .limit(1)

  if (scopeKey) {
    query = query.eq('scope_key', scopeKey)
  }

  const { data, error } = await query.maybeSingle()
  if (error) throw new Error(`Failed to load drift signal for ${surface}: ${error.message}`)
  return data || null
}

export async function persistDriftSignal(admin: any, signal: DriftSignalSummary) {
  const payload = {
    surface: signal.surface,
    scope_key: signal.scope_key,
    detector: signal.detector,
    score: signal.score,
    threshold: signal.threshold,
    state: signal.state,
    metadata: signal.metadata || {},
    triggered_at: signal.triggered_at || new Date().toISOString(),
  }
  const { data, error } = await admin
    .from('drift_signals')
    .insert(payload)
    .select('*')
    .single()

  if (error) throw new Error(`Failed to persist drift signal: ${error.message}`)
  return data
}

export async function ensureExperimentTrack(admin: any, track: string, defaults?: {
  activeVariant?: string
  minimumSampleSize?: number
  promotionMargin?: number
}) {
  const { data: existing, error } = await admin
    .from('whitebox_experiment_state')
    .select('*')
    .eq('track', track)
    .maybeSingle()

  if (error) throw new Error(`Failed to load experiment track ${track}: ${error.message}`)
  if (existing) return existing

  const seed = {
    track,
    active_variant: defaults?.activeVariant || (track === 'retrieval_policy' ? DEFAULT_RETRIEVAL_POLICY_ID : DEFAULT_PROMPT_POLICY_ID),
    bootstrap_status: 'pending',
    minimum_sample_size: defaults?.minimumSampleSize || 12,
    promotion_margin: defaults?.promotionMargin || 0.015,
    metrics_json: {},
  }

  const { data, error: insertError } = await admin
    .from('whitebox_experiment_state')
    .insert(seed)
    .select('*')
    .single()

  if (insertError) throw new Error(`Failed to seed experiment track ${track}: ${insertError.message}`)
  return data
}

export async function upsertExperimentEvaluations(admin: any, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return 0
  const { error } = await admin
    .from('whitebox_experiment_evaluations')
    .upsert(rows, { onConflict: 'track,variant_id,forecast_id' })

  if (error) throw new Error(`Failed to persist experiment evaluations: ${error.message}`)
  return rows.length
}

export async function upsertShadowModel(admin: any, payload: {
  model_type: string
  segment_key: string
  version: string
  status: 'shadow' | 'active' | 'retired' | 'failed'
  metrics_json?: Record<string, unknown>
  trained_at?: string
}) {
  const { data, error } = await admin
    .from('shadow_model_registry')
    .upsert({
      ...payload,
      metrics_json: payload.metrics_json || {},
      trained_at: payload.trained_at || new Date().toISOString(),
    }, { onConflict: 'model_type,segment_key,version' })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to upsert shadow model: ${error.message}`)
  return data
}

export async function upsertShadowPredictions(admin: any, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return 0
  const { error } = await admin
    .from('shadow_predictions')
    .upsert(rows, { onConflict: 'model_type,subject_type,subject_id,version' })

  if (error) throw new Error(`Failed to upsert shadow predictions: ${error.message}`)
  return rows.length
}

export async function upsertEntityGraph(admin: any, args: {
  nodes: Array<Record<string, unknown>>
  edges: Array<Record<string, unknown>>
}) {
  if (args.nodes.length) {
    const { error } = await admin
      .from('entity_graph_nodes')
      .upsert(args.nodes, { onConflict: 'node_key' })
    if (error) throw new Error(`Failed to upsert entity graph nodes: ${error.message}`)
  }

  if (args.edges.length) {
    const { error } = await admin
      .from('entity_graph_edges')
      .upsert(args.edges, { onConflict: 'edge_key' })
    if (error) throw new Error(`Failed to upsert entity graph edges: ${error.message}`)
  }
}

export function deriveEntityRefs(texts: Array<string | null | undefined>, domain?: string | null): GroundedEntityRef[] {
  return inferGroundedEntities({ texts, domain })
}

export function rankGroundedEvidence<T extends Record<string, any>>(evidence: T[], domain?: string | null) {
  return rankEvidenceWithGrounding({ evidence, domain })
}

function mergeAdvisories(existing: Record<string, any> | null | undefined, advisory: Record<string, unknown>) {
  const current = existing && typeof existing === 'object' ? existing : {}
  const advisories = current.advisories && typeof current.advisories === 'object' ? current.advisories : {}
  return {
    ...current,
    advisories: {
      ...advisories,
      ...advisory,
    },
  }
}

export async function markForecastRefreshNeeded(admin: any, args: {
  forecastIds: string[]
  advisory: Record<string, unknown>
}) {
  if (!args.forecastIds.length) return 0
  const { data, error } = await admin
    .from('forecasts')
    .select('id, game_theory_model')
    .in('id', args.forecastIds)

  if (error) throw new Error(`Failed to load forecasts for refresh mark: ${error.message}`)

  let updated = 0
  for (const row of data || []) {
    const nextModel = mergeAdvisories(row.game_theory_model || {}, args.advisory)
    const { error: updateError } = await admin
      .from('forecasts')
      .update({ game_theory_model: nextModel })
      .eq('id', row.id)
    if (updateError) throw new Error(`Failed to update forecast refresh flag ${row.id}: ${updateError.message}`)
    updated += 1
  }

  return updated
}

export async function markAnalysisRefreshNeeded(admin: any, args: {
  analysisRunIds: string[]
  advisory: Record<string, unknown>
}) {
  if (!args.analysisRunIds.length) return 0
  const { data, error } = await admin
    .from('analysis_runs')
    .select('id, analysis_json')
    .in('id', args.analysisRunIds)

  if (error) throw new Error(`Failed to load analysis runs for refresh mark: ${error.message}`)

  let updated = 0
  for (const row of data || []) {
    const nextJson = mergeAdvisories(row.analysis_json || {}, args.advisory)
    const { error: updateError } = await admin
      .from('analysis_runs')
      .update({ analysis_json: nextJson })
      .eq('id', row.id)
    if (updateError) throw new Error(`Failed to update analysis refresh flag ${row.id}: ${updateError.message}`)
    updated += 1
  }

  return updated
}
