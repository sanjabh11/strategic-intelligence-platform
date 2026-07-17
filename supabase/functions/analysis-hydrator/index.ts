import { createClient } from 'npm:@supabase/supabase-js@2'
import { buildAuthClient, jsonResponse } from '../_shared/auth.ts'
import { hydrateAnalysisJson } from '../_shared/analysis-artifacts.ts'

const SUPABASE_PROJECT_REF = Deno.env.get('SUPABASE_PROJECT_REF') || 'jxdihzqoaxtydolmltdr'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || `https://${SUPABASE_PROJECT_REF}.supabase.co`
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('EDGE_SUPABASE_SERVICE_ROLE_KEY') || ''

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return jsonResponse(200, { ok: true })
  }

  if (req.method !== 'GET') {
    return jsonResponse(405, { ok: false, message: 'Method Not Allowed' })
  }

  const url = new URL(req.url)
  const analysisRunId = url.searchParams.get('analysis_run_id')

  if (!analysisRunId) {
    return jsonResponse(400, { ok: false, message: 'analysis_run_id is required' })
  }

  try {
    const { client } = buildAuthClient(req)
    const { data, error } = await client
      .from('analysis_runs')
      .select('id, status, review_reason, evidence_backed, created_at, analysis_json, payload_mode, artifact_bucket, artifact_path, artifact_sha256, artifact_bytes')
      .eq('id', analysisRunId)
      .maybeSingle()

    if (error) {
      return jsonResponse(500, { ok: false, message: error.message })
    }

    if (!data) {
      return jsonResponse(404, { ok: false, message: 'Analysis not found' })
    }

    const analysis = await hydrateAnalysisJson(supabaseAdmin, data)

    return jsonResponse(200, {
      ok: true,
      analysis_run_id: data.id,
      status: data.status,
      review_reason: data.review_reason,
      evidence_backed: data.evidence_backed,
      created_at: data.created_at,
      analysis,
      payload_mode: data.payload_mode || 'inline',
      artifact: data.payload_mode === 'storage_pointer'
        ? {
            bucket: data.artifact_bucket,
            path: data.artifact_path,
            sha256: data.artifact_sha256,
            bytes: data.artifact_bytes,
          }
        : null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return jsonResponse(500, { ok: false, message })
  }
})
