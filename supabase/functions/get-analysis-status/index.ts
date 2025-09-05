// @ts-nocheck
// Supabase Edge Function: get-analysis-status (real job status)
// Deno runtime
// Endpoint: GET /functions/v1/get-analysis-status?request_id=...

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return jsonResponse(405, { ok: false, message: 'Method Not Allowed' })
  }

  const url = new URL(req.url)
  const requestId = url.searchParams.get('request_id')
  if (!requestId) {
    return jsonResponse(400, { ok: false, message: 'request_id is required' })
  }

  try {
    const ref = Deno.env.get('SUPABASE_PROJECT_REF') || 'jxdihzqoaxtydolmltdr'
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || `https://${ref}.supabase.co`
    const headerApiKey = req.headers.get('apikey') || (req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || headerApiKey
    if (!(supabaseUrl && anonKey)) {
      return jsonResponse(500, { ok: false, message: 'Server configuration error' })
    }
    const supabase = createClient(supabaseUrl, anonKey)

    const { data: job, error: jobErr } = await supabase
      .from('analysis_jobs')
      .select('request_id,status,analysis_run_id,error')
      .eq('request_id', requestId)
      .maybeSingle()
    if (jobErr) {
      return jsonResponse(500, { ok: false, message: jobErr.message })
    }
    if (!job) {
      return jsonResponse(200, { ok: true, status: 'processing', message: 'Job not yet registered' })
    }

    if (job.status === 'completed' && job.analysis_run_id) {
      const { data: runRow, error: runErr } = await supabase
        .from('analysis_runs')
        .select('scenario_text, processing_time_ms, stability_score')
        .eq('id', job.analysis_run_id)
        .single()
      if (runErr) {
        return jsonResponse(500, { ok: false, message: runErr.message })
      }
      // Minimal reconstruction; frontend primarily uses analyze-engine immediate response
      return jsonResponse(200, {
        ok: true,
        status: 'completed',
        analysis: {
          scenario_text: runRow.scenario_text,
          players: [],
          equilibrium: {
            profile: {},
            stability: runRow.stability_score ?? 0,
            method: 'edge-mvp-1.0'
          },
          retrievals: [],
          retrieval_count: 0,
          processing_stats: { processing_time_ms: runRow.processing_time_ms ?? 0, stability_score: runRow.stability_score ?? 0 },
          provenance: { evidence_backed: false, retrieval_count: 0, model: 'edge-mvp-1.0' }
        }
      })
    }

    if (job.status === 'failed') {
      return jsonResponse(200, { ok: true, status: 'failed', message: job.error || 'failed' })
    }

    return jsonResponse(200, { ok: true, status: job.status })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return jsonResponse(500, { ok: false, message: msg })
  }
})
