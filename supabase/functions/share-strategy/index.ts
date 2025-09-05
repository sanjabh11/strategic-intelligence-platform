// @ts-nocheck
// Supabase Edge Function: share-strategy
// Deno runtime
// Endpoint: POST /functions/v1/share-strategy

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
    const { run_id, title, scenario_summary, strategy } = await req.json()
    if (!title || !strategy) return jsonResponse(400, { ok: false, message: 'title and strategy required' })

    const ref = Deno.env.get('SUPABASE_PROJECT_REF') || 'jxdihzqoaxtydolmltdr'
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || `https://${ref}.supabase.co`
    const headerApiKey = req.headers.get('apikey') || (req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || headerApiKey
    if (!(supabaseUrl && anonKey)) return jsonResponse(500, { ok: false, message: 'Server configuration error' })
    const supabase = createClient(supabaseUrl, anonKey)

    const ins = await supabase.from('shared_strategies').insert({ run_id: run_id || null, title, scenario_summary: scenario_summary || null, strategy })
    if (ins.error) return jsonResponse(500, { ok: false, message: ins.error.message })
    return jsonResponse(200, { ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return jsonResponse(500, { ok: false, message: msg })
  }
})


