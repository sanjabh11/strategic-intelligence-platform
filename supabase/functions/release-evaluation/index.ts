// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  DEFAULT_RELEASE_STATE_KEY,
  buildReleaseEvaluation,
  ensureReleaseState,
  loadWhiteboxEvaluations,
  persistReleaseState,
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
    const dryRun = body.dryRun === true
    const persist = body.persist !== false

    const state = await ensureReleaseState(admin, stateKey)
    const evaluations = await loadWhiteboxEvaluations(admin)
    const summary = buildReleaseEvaluation(evaluations, state)

    if (persist) {
      await persistReleaseState(
        admin,
        stateKey,
        {
          last_release_evaluation_at: new Date().toISOString(),
          metrics: summary,
          last_decision: summary.recommendation.reason,
        },
        dryRun,
      )
    }

    return jsonResponse(200, {
      ok: true,
      stateKey,
      summary,
      dryRun,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('release-evaluation error:', message)
    return jsonResponse(500, { ok: false, message })
  }
})

