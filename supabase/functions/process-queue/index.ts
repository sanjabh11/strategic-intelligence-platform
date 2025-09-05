// @ts-nocheck
// Supabase Edge Function: process-queue
// Deno runtime
// Endpoint: POST /functions/v1/process-queue
// Scans analysis_jobs for stuck processing > 10m and marks failed.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return jsonResponse(405, { ok: false, message: 'Method Not Allowed' })
  try {
    const ref = Deno.env.get('SUPABASE_PROJECT_REF') || 'jxdihzqoaxtydolmltdr'
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || `https://${ref}.supabase.co`
    const serviceKey = Deno.env.get('EDGE_SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const headerApiKey = req.headers.get('apikey') || (req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '')
    const writeKey = serviceKey || headerApiKey
    if (!(supabaseUrl && writeKey)) return jsonResponse(500, { ok: false, message: 'Server configuration error' })
    const admin = createClient(supabaseUrl, writeKey)

    const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { data, error } = await admin
      .from('analysis_jobs')
      .select('request_id, started_at, status')
      .eq('status', 'processing')
      .lt('started_at', cutoff)
    if (error) return jsonResponse(500, { ok: false, message: error.message })

    let updated = 0
    for (const row of data || []) {
      const up = await admin.from('analysis_jobs').update({ status: 'failed', error: 'timeout', completed_at: new Date().toISOString() }).eq('request_id', row.request_id)
      if (!up.error) updated++
    }

    return jsonResponse(200, { ok: true, updated })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return jsonResponse(500, { ok: false, message: msg })
  }
})





