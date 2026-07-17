// @ts-nocheck
// Supabase Edge Function: get-analysis-status (real job status)
// Deno runtime
// Endpoint: GET /functions/v1/get-analysis-status?request_id=...

import { createClient } from 'npm:@supabase/supabase-js@2'
import { jsonResponse } from '../_shared/auth.ts'
import { hydrateAnalysisJson } from '../_shared/analysis-artifacts.ts'

function isTerminalAnalysisStatus(status: string | null | undefined) {
  return status === 'completed' || status === 'under_review' || status === 'needs_review' || status === 'rejected' || status === 'failed'
}

// PUBLIC: No auth required
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return jsonResponse(200, { ok: true })
  }

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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('EDGE_SUPABASE_SERVICE_ROLE_KEY') || ''
    if (!(supabaseUrl && anonKey)) {
      return jsonResponse(500, { ok: false, message: 'Server configuration error' })
    }
    const supabase = createClient(supabaseUrl, anonKey)
    const supabaseAdmin = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null

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
        .select('status, review_reason, analysis_json, payload_mode, artifact_bucket, artifact_path')
        .eq('id', job.analysis_run_id)
        .single()
      if (runErr) {
        return jsonResponse(500, { ok: false, message: runErr.message })
      }
      const runStatus = runRow?.status || 'processing'
      if (runStatus === 'failed') {
        return jsonResponse(200, {
          ok: true,
          status: 'failed',
          analysis_run_id: job.analysis_run_id,
          analysis_status: runStatus,
          message: runRow?.review_reason || job.error || 'failed',
        })
      }
      if (!isTerminalAnalysisStatus(runStatus)) {
        return jsonResponse(200, {
          ok: true,
          status: 'processing',
          analysis_run_id: job.analysis_run_id,
          analysis_status: runStatus,
          message: 'Analysis run not finalized yet',
        })
      }
      const analysisJson = supabaseAdmin
        ? await hydrateAnalysisJson(supabaseAdmin, runRow)
        : runRow?.analysis_json
      if (!analysisJson || typeof analysisJson !== 'object') {
        return jsonResponse(500, { ok: false, message: 'analysis_json missing from completed run' })
      }
      return jsonResponse(200, {
        ok: true,
        status: 'completed',
        analysis_run_id: job.analysis_run_id,
        analysis_status: runRow?.status || 'completed',
        analysis: analysisJson
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
