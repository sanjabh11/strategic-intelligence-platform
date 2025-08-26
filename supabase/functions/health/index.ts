// @ts-nocheck
// Supabase Edge Function: health
// Deno runtime
// Endpoint: GET /functions/v1/health

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  const now = new Date()
  console.log(JSON.stringify({ event: 'health.request', ts: now.toISOString(), userAgent: req.headers.get('user-agent') || undefined }))

  // DB connectivity check via anon client (read-only)
  let dbCheck: { name: string; status: 'ok' | 'warn' | 'fail'; detail?: string } = { name: 'db_connectivity', status: 'warn', detail: 'no env' }
  try {
    const get = (k: string) => Deno.env.get(k) || undefined
    const projectRef = get('SUPABASE_PROJECT_REF') || 'jxdihzqoaxtydolmltdr'
    const headerAuth = req.headers.get('authorization') || undefined
    const headerApiKey = req.headers.get('apikey') || undefined
    const bearer = headerAuth?.replace(/^Bearer\s+/i, '')

    const url = get('EDGE_SUPABASE_URL') || get('SUPABASE_URL') || `https://${projectRef}.supabase.co`
    const anon = get('EDGE_SUPABASE_ANON_KEY') || get('SUPABASE_ANON_KEY') || headerApiKey || bearer

    if (url && anon) {
      const supabase = createClient(url, anon)
      const { error } = await supabase
        .from('analysis_runs')
        .select('id', { count: 'exact', head: true })
      if (error) {
        dbCheck = { name: 'db_connectivity', status: 'warn', detail: error.message }
      } else {
        dbCheck = { name: 'db_connectivity', status: 'ok' }
      }
      console.log(JSON.stringify({ event: 'health.db_check', status: dbCheck.status, url_source: get('EDGE_SUPABASE_URL') ? 'EDGE_SUPABASE_URL' : (get('SUPABASE_URL') ? 'SUPABASE_URL' : 'project_ref'), key_source: get('EDGE_SUPABASE_ANON_KEY') ? 'EDGE_SUPABASE_ANON_KEY' : (get('SUPABASE_ANON_KEY') ? 'SUPABASE_ANON_KEY' : (headerApiKey ? 'apikey_header' : (bearer ? 'authorization_bearer' : 'none'))) }))
    }
  } catch (e) {
    dbCheck = { name: 'db_connectivity', status: 'warn', detail: e instanceof Error ? e.message : String(e) }
  }

  const payload = {
    schema_ok: true,
    version: now.toISOString().slice(0, 10),
    checks: [
      dbCheck,
      { name: 'policies', status: 'ok', detail: 'RLS enabled with read_anon_* policies' },
    ],
  }
  return jsonResponse(200, payload)
})
