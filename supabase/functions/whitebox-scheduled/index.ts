// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  DEFAULT_RELEASE_STATE_KEY,
  buildReleaseEvaluation,
  buildWhiteboxEvaluations,
  countPendingWhiteboxForecasts,
  ensureReleaseState,
  fetchPendingWhiteboxForecasts,
  insertWhiteboxEvaluations,
  loadWhiteboxEvaluations,
  persistReleaseState,
  recordReleaseDecision,
} from '../_shared/whitebox-release.ts'

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('APP_URL') || 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info'
    }
  })
}

function getAdminClient() {
  const ref = Deno.env.get('SUPABASE_PROJECT_REF') || 'jxdihzqoaxtydolmltdr'
  const url = Deno.env.get('SUPABASE_URL') || `https://${ref}.supabase.co`
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('EDGE_SUPABASE_SERVICE_ROLE_KEY') || ''
  if (!url || !serviceKey) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceKey)
}

function isAuthorized(req: Request) {
  const expected = Deno.env.get('WHITEBOX_SCHEDULE_TOKEN') || ''
  if (!expected) return true
  const token = (req.headers.get('authorization') || req.headers.get('Authorization') || '')
    .replace(/^Bearer\s+/i, '')
    .trim()
  return token === expected
}

// INTERNAL: Called server-side, relies on RLS for auth
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return jsonResponse(200, { ok: true })
  if (req.method !== 'POST') return jsonResponse(405, { ok: false, message: 'Method Not Allowed' })
  if (!isAuthorized(req)) return jsonResponse(401, { ok: false, message: 'Unauthorized' })

  try {
    const admin = getAdminClient()
    const body = await req.json().catch(() => ({}))
    const stateKey = typeof body.stateKey === 'string' && body.stateKey.trim() ? body.stateKey.trim() : DEFAULT_RELEASE_STATE_KEY
    const mode = body.mode === 'bootstrap-rerun' ? 'bootstrap-rerun' : 'scheduled'
    const batchSize = Math.max(1, Math.min(Number(body.batchSize || 25), 200))
    const autoPromote = body.autoPromote !== false
    const dryRun = body.dryRun === true

    const state = await ensureReleaseState(admin, stateKey)
    const nowIso = new Date().toISOString()

    if (state.bootstrap_status === 'pending') {
      await persistReleaseState(admin, stateKey, {
        bootstrap_status: 'running',
        last_bootstrap_started_at: nowIso,
        last_decision: 'Bootstrap rerun started.',
      }, dryRun)
      await recordReleaseDecision(admin, {
        state_key: stateKey,
        action: 'bootstrap_started',
        rationale: 'Bootstrap rerun started for whitebox challenger calibration.',
        metrics: { mode, batchSize },
      }, dryRun)
    }

    const pendingBefore = await countPendingWhiteboxForecasts(admin)
    const pendingForecasts = await fetchPendingWhiteboxForecasts(admin, batchSize)
    const evaluations = pendingForecasts.flatMap((forecast) => buildWhiteboxEvaluations(forecast))
    const inserted = await insertWhiteboxEvaluations(admin, evaluations, dryRun)
    const pendingAfter = Math.max(0, pendingBefore - pendingForecasts.length)

    let bootstrapCompletedNow = false
    if (pendingAfter === 0 && state.bootstrap_status !== 'completed') {
      bootstrapCompletedNow = true
      await persistReleaseState(admin, stateKey, {
        bootstrap_status: 'completed',
        bootstrap_completed_at: nowIso,
        last_scheduled_run_at: nowIso,
        last_decision: 'Bootstrap rerun completed. Release evaluation is now active.',
      }, dryRun)
      await recordReleaseDecision(admin, {
        state_key: stateKey,
        action: 'bootstrap_completed',
        rationale: 'All resolved whitebox forecasts have been backfilled into the release evaluator.',
        metrics: { inserted, pendingBefore, pendingAfter },
      }, dryRun)
    } else {
      await persistReleaseState(admin, stateKey, {
        bootstrap_status: pendingAfter > 0 ? 'running' : state.bootstrap_status,
        last_scheduled_run_at: nowIso,
      }, dryRun)
    }

    let releaseSummary = null
    if ((state.bootstrap_status === 'completed' || bootstrapCompletedNow) && autoPromote) {
      const allEvaluations = await loadWhiteboxEvaluations(admin)
      releaseSummary = buildReleaseEvaluation(allEvaluations, state)

      await persistReleaseState(admin, stateKey, {
        last_release_evaluation_at: nowIso,
        metrics: releaseSummary,
        last_decision: releaseSummary.recommendation.reason,
      }, dryRun)

      if (releaseSummary.recommendation.action === 'promote' && releaseSummary.recommendation.candidatePolicy) {
        await persistReleaseState(admin, stateKey, {
          active_policy: releaseSummary.recommendation.candidatePolicy,
          last_promotion_at: nowIso,
          last_release_evaluation_at: nowIso,
          metrics: releaseSummary,
          last_decision: releaseSummary.recommendation.reason,
        }, dryRun)
        await recordReleaseDecision(admin, {
          state_key: stateKey,
          action: 'promote',
          previous_policy: state.active_policy,
          next_policy: releaseSummary.recommendation.candidatePolicy,
          recommended_policy: releaseSummary.recommendation.candidatePolicy,
          rationale: releaseSummary.recommendation.reason,
          metrics: releaseSummary,
        }, dryRun)
      } else {
        await recordReleaseDecision(admin, {
          state_key: stateKey,
          action: 'hold',
          previous_policy: state.active_policy,
          next_policy: state.active_policy,
          recommended_policy: releaseSummary?.recommendation?.candidatePolicy || null,
          rationale: releaseSummary?.recommendation?.reason || 'Hold active policy.',
          metrics: releaseSummary,
        }, dryRun)
      }
    }

    return jsonResponse(200, {
      ok: true,
      mode,
      dryRun,
      batchSize,
      pendingBefore,
      processedForecasts: pendingForecasts.length,
      insertedEvaluations: inserted,
      pendingAfter,
      bootstrapCompletedNow,
      releaseSummary,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('whitebox-scheduled error:', message)
    return jsonResponse(500, { ok: false, message })
  }
})

