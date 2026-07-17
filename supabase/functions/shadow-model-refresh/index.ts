import { createClient } from 'npm:@supabase/supabase-js@2'
import { jsonResponse } from '../_shared/auth.ts'
import {
  DEFAULT_PROMPT_POLICY_ID,
  DEFAULT_RETRIEVAL_POLICY_ID,
  buildVersionTag,
  ensureExperimentTrack,
  fetchLatestDriftSignal,
  maybeCallMlService,
  upsertEntityGraph,
  upsertExperimentEvaluations,
  upsertShadowModel,
  upsertShadowPredictions,
} from '../_shared/ml-platform.ts'

function getAdminClient() {
  const ref = Deno.env.get('SUPABASE_PROJECT_REF') || 'jxdihzqoaxtydolmltdr'
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || `https://${ref}.supabase.co`
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('EDGE_SUPABASE_SERVICE_ROLE_KEY') || ''
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Server configuration error')
  }
  return createClient(supabaseUrl, serviceKey)
}

function isAuthorized(req: Request) {
  const token = (req.headers.get('authorization') || req.headers.get('Authorization') || '')
    .replace(/^Bearer\s+/i, '')
    .trim()
  const internalToken = Deno.env.get('INTERNAL_JOB_TOKEN') || Deno.env.get('WHITEBOX_SCHEDULE_TOKEN') || ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('EDGE_SUPABASE_SERVICE_ROLE_KEY') || ''
  return Boolean(token) && (token === internalToken || token === serviceKey)
}

function resolveOutcomeValue(value: unknown) {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'yes') return 1
  if (normalized === 'no') return 0
  return null
}

// INTERNAL: Called server-side, relies on RLS for auth
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return jsonResponse(200, { ok: true })
  if (req.method !== 'POST') return jsonResponse(405, { ok: false, message: 'Method Not Allowed' })
  if (!isAuthorized(req)) return jsonResponse(401, { ok: false, message: 'Unauthorized' })

  try {
    const admin = getAdminClient()
    const version = buildVersionTag('shadow')

    await ensureExperimentTrack(admin, 'prompt_policy', { activeVariant: DEFAULT_PROMPT_POLICY_ID })
    await ensureExperimentTrack(admin, 'retrieval_policy', { activeVariant: DEFAULT_RETRIEVAL_POLICY_ID })

    const { data: forecasts, error: forecastError } = await admin
      .from('forecasts')
      .select('id, analysis_run_id, current_probability, resolution_outcome, game_theory_model, created_at')

    if (forecastError) throw new Error(`Failed to load forecasts: ${forecastError.message}`)

    const resolved = (forecasts || []).filter((forecast: any) => resolveOutcomeValue(forecast.resolution_outcome) !== null)
    const unresolved = (forecasts || []).filter((forecast: any) => resolveOutcomeValue(forecast.resolution_outcome) === null)

    const experimentRows = resolved.flatMap((forecast: any) => {
      const outcome = resolveOutcomeValue(forecast.resolution_outcome)
      const provenance = forecast.game_theory_model?.provenance || {}
      const retrievalVariant = provenance.retrieval_policy_id || DEFAULT_RETRIEVAL_POLICY_ID
      const promptVariant = provenance.prompt_policy_id || DEFAULT_PROMPT_POLICY_ID
      const probability = Number(
        forecast.game_theory_model?.multi_agent_forecast?.champion?.rawProbability
          ?? forecast.game_theory_model?.multi_agent_forecast?.champion?.probability
          ?? forecast.current_probability
      )
      if (!Number.isFinite(probability) || outcome === null) return []

      const brierScore = (probability - outcome) ** 2
      return [
        {
          track: 'prompt_policy',
          variant_id: promptVariant,
          forecast_id: forecast.id,
          analysis_run_id: forecast.analysis_run_id,
          probability,
          outcome,
          brier_score: Number(brierScore.toFixed(6)),
          metadata: { source: 'shadow_model_refresh' },
        },
        {
          track: 'retrieval_policy',
          variant_id: retrievalVariant,
          forecast_id: forecast.id,
          analysis_run_id: forecast.analysis_run_id,
          probability,
          outcome,
          brier_score: Number(brierScore.toFixed(6)),
          metadata: { source: 'shadow_model_refresh' },
        },
      ]
    })

    await upsertExperimentEvaluations(admin, experimentRows)

    await upsertShadowModel(admin, {
      model_type: 'human_correction_shadow',
      segment_key: 'forecast_registry',
      version,
      status: 'shadow',
      metrics_json: {
        resolved_sample_size: resolved.length,
        unresolved_sample_size: unresolved.length,
      },
    })

    const correctionPredictions = await Promise.all(unresolved.map(async (forecast: any) => {
      const disagreementIndex = Number(forecast.game_theory_model?.multi_agent_forecast?.disagreementIndex ?? 0.12)
      const evidenceCount = Number(forecast.game_theory_model?.multi_agent_forecast?.evidenceCount ?? 0)
      const driftSignal = await fetchLatestDriftSignal(admin, 'market_stream', 'gold').catch(() => null)
      const mlScore = await maybeCallMlService('/shadow/score', {
        subject_type: 'forecast',
        features: {
          disagreement_index: disagreementIndex,
          evidence_count: evidenceCount,
          drift_score: Number(driftSignal?.score || 0),
        },
      }).catch((error) => {
        console.warn('ML shadow score fallback:', error)
        return null
      })

      const overconfidenceRisk = Number(
        mlScore?.overconfidence_risk
          ?? Math.min(0.95, Math.max(0.05, disagreementIndex * 0.6 + (evidenceCount < 3 ? 0.2 : 0.05) + ((driftSignal?.score || 0) * 0.35)))
      )
      const correctionDelta = Number(
        mlScore?.correction_delta
          ?? (-(overconfidenceRisk - 0.5) * 0.12).toFixed(4)
      )
      return {
        model_type: 'human_correction_shadow',
        subject_type: 'forecast',
        subject_id: String(forecast.id),
        version,
        prediction_json: {
          correction_delta: correctionDelta,
          overconfidence_risk: Number(overconfidenceRisk.toFixed(4)),
          needs_reviewer_attention: Boolean(mlScore?.needs_reviewer_attention ?? (overconfidenceRisk >= 0.62)),
          drift_state: driftSignal?.state || 'stable',
        },
        visible: false,
        evaluated_at: new Date().toISOString(),
      }
    }))

    await upsertShadowPredictions(admin, correctionPredictions)

    await upsertShadowModel(admin, {
      model_type: 'forecast_attribution_shadow',
      segment_key: 'forecast_registry',
      version,
      status: 'shadow',
      metrics_json: {
        unresolved_sample_size: unresolved.length,
      },
    })

    const attributionPredictions = await Promise.all(unresolved.map(async (forecast: any) => {
      const disagreementIndex = Number(forecast.game_theory_model?.multi_agent_forecast?.disagreementIndex ?? 0.12)
      const evidenceCount = Number(forecast.game_theory_model?.multi_agent_forecast?.evidenceCount ?? 0)
      const driftSignal = await fetchLatestDriftSignal(admin, 'outcome_forecasting', 'global').catch(() => null)
      const response = await maybeCallMlService('/attribution/score', {
        subject_type: 'forecast',
        features: {
          disagreement_index: disagreementIndex,
          evidence_count: evidenceCount,
          drift_score: Number(driftSignal?.score || 0),
          probability: Number(forecast.current_probability || 0.5),
        },
      }).catch((error) => {
        console.warn('ML attribution fallback:', error)
        return null
      })

      return {
        model_type: 'forecast_attribution_shadow',
        subject_type: 'forecast',
        subject_id: String(forecast.id),
        version,
        prediction_json: response || {
          subject_type: 'forecast',
          drivers: [
            { label: 'disagreement_index', contribution: Number(disagreementIndex.toFixed(4)), direction: disagreementIndex >= 0 ? 'positive' : 'negative' },
            { label: 'evidence_count', contribution: Number((evidenceCount / 10).toFixed(4)), direction: evidenceCount >= 0 ? 'positive' : 'negative' },
            { label: 'drift_score', contribution: Number((driftSignal?.score || 0).toFixed(4)), direction: (driftSignal?.score || 0) >= 0 ? 'positive' : 'negative' },
          ],
        },
        visible: false,
        evaluated_at: new Date().toISOString(),
      }
    }))

    await upsertShadowPredictions(admin, attributionPredictions)

    const { data: events, error: eventError } = await admin
      .from('real_time_events')
      .select('id, source, event_type, actors, goldstein_scale, game_type, recommended_strategy, timestamp')
      .order('timestamp', { ascending: false })
      .limit(40)

    if (eventError) throw new Error(`Failed to load real_time_events: ${eventError.message}`)

    const nodes = new Map<string, Record<string, unknown>>()
    const edges: Array<Record<string, unknown>> = []
    const temporalShadowPredictions: Array<Record<string, unknown>> = []

    for (const event of events || []) {
      const actors = Array.isArray(event.actors) ? event.actors.filter(Boolean) : []
      const isGeopoliticalSource = /^gdelt/i.test(String(event.source || ''))
      for (const actor of actors) {
        const nodeKey = String(actor).toLowerCase().replace(/[^a-z0-9]+/g, '_')
        nodes.set(nodeKey, {
          node_key: nodeKey,
          node_type: 'actor',
          domain: isGeopoliticalSource ? 'geopolitical_radar' : 'commodity_procurement',
          label: actor,
          metadata: { source: event.source },
          last_seen_at: event.timestamp,
        })
      }

      if (actors.length >= 2) {
        const fromKey = String(actors[0]).toLowerCase().replace(/[^a-z0-9]+/g, '_')
        const toKey = String(actors[1]).toLowerCase().replace(/[^a-z0-9]+/g, '_')
        edges.push({
          edge_key: `${event.id}:${fromKey}:${toKey}:${event.event_type}`,
          from_node_key: fromKey,
          to_node_key: toKey,
          relation_type: event.event_type,
          weight: Number(event.goldstein_scale || 0),
          source_event_id: event.id,
          metadata: { game_type: event.game_type, recommended_strategy: event.recommended_strategy },
          observed_at: event.timestamp,
        })
      }

      temporalShadowPredictions.push({
        model_type: 'temporal_kg_shadow',
        subject_type: 'real_time_event',
        subject_id: String(event.id),
        version,
        prediction_json: {
          likely_next_event_type: event.event_type,
          likely_affected_entity_set: actors,
          short_horizon_risk_score: Number(Math.min(0.95, Math.abs(Number(event.goldstein_scale || 0)) / 10 + 0.15).toFixed(4)),
        },
        visible: false,
        evaluated_at: new Date().toISOString(),
      })
    }

    await upsertEntityGraph(admin, {
      nodes: Array.from(nodes.values()),
      edges,
    })

    await upsertShadowModel(admin, {
      model_type: 'temporal_kg_shadow',
      segment_key: 'real_time_events',
      version,
      status: 'shadow',
      metrics_json: {
        event_count: (events || []).length,
        node_count: nodes.size,
        edge_count: edges.length,
      },
    })

    await upsertShadowPredictions(admin, temporalShadowPredictions)

    return jsonResponse(200, {
      ok: true,
      version,
      experimentEvaluations: experimentRows.length,
      correctionPredictions: correctionPredictions.length,
      attributionPredictions: attributionPredictions.length,
      graphNodes: nodes.size,
      graphEdges: edges.length,
      temporalPredictions: temporalShadowPredictions.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('shadow-model-refresh failed:', error)
    return jsonResponse(500, { ok: false, message })
  }
})
