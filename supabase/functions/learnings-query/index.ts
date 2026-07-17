// Supabase Edge Function: Learnings Query
// CRUD operations on the forecast_learnings table for calibration and outcome tracking.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { getAuthenticatedUser, jsonResponse } from '../_shared/auth.ts'
import { checkRateLimit, logApiUsage, rateLimitResponse } from '../_shared/rate-limiter.ts'

declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void
  env: {
    get: (key: string) => string | undefined
  }
}

type InsertBody = {
  run_id?: string
  scenario_hash?: string
  intent?: string
  skill_category?: string
  predicted_probability?: number
  market_prior?: number | null
  evidence_gate_decision?: string | null
}

type PatchBody = {
  actual_outcome?: number
  resolution_source?: string
}

function getAdminClient() {
  const ref = Deno.env.get('SUPABASE_PROJECT_REF') || 'jxdihzqoaxtydolmltdr'
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || `https://${ref}.supabase.co`
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('EDGE_SUPABASE_SERVICE_ROLE_KEY') || ''
  if (!supabaseUrl || !serviceKey) return null
  return createClient(supabaseUrl, serviceKey)
}

function computeBrierScore(predicted: number, actual: number): number {
  const diff = predicted - actual
  return Math.round(diff * diff * 10000) / 10000
}

Deno.serve(async (req: Request) => {
  const _user = await getAuthenticatedUser(req)
  if (!_user) return jsonResponse(401, { ok: false, error: 'authentication_required' })

  const rateLimit = await checkRateLimit(_user.id, 'learnings-query')
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds)
  await logApiUsage(_user.id, 'learnings-query')

  if (req.method === 'OPTIONS') return jsonResponse(200, { ok: true })

  const admin = getAdminClient()
  if (!admin) return jsonResponse(503, { ok: false, message: 'Database not configured' })

  try {
    // POST: Insert new learning record
    if (req.method === 'POST') {
      const body: InsertBody = await req.json().catch(() => ({}))
      if (!body.intent || body.predicted_probability === undefined) {
        return jsonResponse(400, { ok: false, message: 'Missing required fields: intent, predicted_probability' })
      }

      const { data, error } = await admin
        .from('forecast_learnings')
        .insert({
          run_id: body.run_id || null,
          user_id: _user.id,
          scenario_hash: body.scenario_hash || '',
          intent: body.intent,
          skill_category: body.skill_category || 'general',
          predicted_probability: body.predicted_probability,
          market_prior: body.market_prior ?? null,
          evidence_gate_decision: body.evidence_gate_decision ?? null,
        })
        .select('id')
        .single()

      if (error) {
        // Table might not exist yet — graceful fallback
        if (error.message.includes('does not exist') || error.message.includes('relation')) {
          return jsonResponse(200, { ok: true, learning: null, message: 'Learnings table not yet created — migration pending' })
        }
        throw new Error(`Insert failed: ${error.message}`)
      }

      return jsonResponse(200, { ok: true, learning: data })
    }

    // GET: Query learnings by intent for calibration
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const intent = url.searchParams.get('intent') || ''
      const skillCategory = url.searchParams.get('skill_category') || ''
      const limit = Math.min(500, Number(url.searchParams.get('limit') || '100'))

      let query = admin
        .from('forecast_learnings')
        .select('id, intent, skill_category, predicted_probability, actual_outcome, brier_score, evidence_gate_decision, market_prior, created_at, resolved_at')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (intent) query = query.eq('intent', intent)
      if (skillCategory) query = query.eq('skill_category', skillCategory)

      const { data, error } = await query

      if (error) {
        if (error.message.includes('does not exist') || error.message.includes('relation')) {
          return jsonResponse(200, { ok: true, learnings: [], message: 'Learnings table not yet created — migration pending' })
        }
        throw new Error(`Query failed: ${error.message}`)
      }

      return jsonResponse(200, { ok: true, learnings: data || [] })
    }

    // PATCH: Resolve learning with actual outcome
    if (req.method === 'PATCH') {
      const url = new URL(req.url)
      const id = url.searchParams.get('id')
      if (!id) return jsonResponse(400, { ok: false, message: 'Missing id parameter' })

      const body: PatchBody = await req.json().catch(() => ({}))
      if (body.actual_outcome === undefined) {
        return jsonResponse(400, { ok: false, message: 'Missing actual_outcome' })
      }

      // Fetch the learning to compute brier score
      const { data: existing } = await admin
        .from('forecast_learnings')
        .select('predicted_probability')
        .eq('id', id)
        .single()

      const brierScore = existing
        ? computeBrierScore(Number(existing.predicted_probability), Number(body.actual_outcome))
        : null

      const { data, error } = await admin
        .from('forecast_learnings')
        .update({
          actual_outcome: body.actual_outcome,
          brier_score: brierScore,
          resolution_source: body.resolution_source || null,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('id, brier_score')
        .single()

      if (error) {
        if (error.message.includes('does not exist') || error.message.includes('relation')) {
          return jsonResponse(200, { ok: true, learning: null, message: 'Learnings table not yet created — migration pending' })
        }
        throw new Error(`Update failed: ${error.message}`)
      }

      return jsonResponse(200, { ok: true, learning: data })
    }

    return jsonResponse(405, { ok: false, message: 'Method Not Allowed' })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return jsonResponse(500, { ok: false, message })
  }
})
