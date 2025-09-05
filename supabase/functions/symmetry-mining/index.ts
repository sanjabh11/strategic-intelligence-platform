// @ts-nocheck
// Supabase Edge Function: symmetry-mining
// Deno runtime
// Endpoint: POST /functions/v1/symmetry-mining
// Input: { features?: number[], top_k?: number }
// If features omitted, returns top recent analyses.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return jsonResponse(200, { ok: true })
  if (req.method !== 'POST') return jsonResponse(405, { ok: false, message: 'Method Not Allowed' })
  try {
    const ref = Deno.env.get('SUPABASE_PROJECT_REF') || 'jxdihzqoaxtydolmltdr'
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || `https://${ref}.supabase.co`
    const headerApiKey = req.headers.get('apikey') || (req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || headerApiKey
    if (!(supabaseUrl && anonKey)) return jsonResponse(500, { ok: false, message: 'Server configuration error' })
    const supabase = createClient(supabaseUrl, anonKey)

    const body = await req.json().catch(() => ({}))
    const topK = Math.min(20, Math.max(1, body?.top_k ?? 5))
    const features = Array.isArray(body?.features) ? body.features : null

    if (features && features.length === 128) {
      // Use pgvector operator <-> for distance; via RPC or filter is not directly available in JS client without SQL
      // Fallback: retrieve recent and compute cosine similarity client-side (MVP)
      const { data, error } = await supabase
        .from('analysis_features')
        .select('run_id, features')
        .limit(200)
      if (error) return jsonResponse(500, { ok: false, message: error.message })

      const dot = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * (b[i] || 0), 0)
      const norm = (a: number[]) => Math.sqrt(a.reduce((s, v) => s + v * v, 0) || 1)
      const nf = norm(features)
      const scored = (data || []).map(r => {
        const f = (r as any).features as number[]
        const score = f && Array.isArray(f) && f.length === 128 ? dot(features, f) / (nf * norm(f)) : -1
        return { run_id: (r as any).run_id, score }
      }).filter(x => x.score >= 0)
      scored.sort((a, b) => b.score - a.score)

      const top = scored.slice(0, topK)
      return jsonResponse(200, { ok: true, items: top })
    }

    // No features provided: return recent runs
    const { data: runs, error: runsErr } = await supabase
      .from('analysis_runs')
      .select('id, scenario_text, created_at, stability_score')
      .order('created_at', { ascending: false })
      .limit(topK)
    if (runsErr) return jsonResponse(500, { ok: false, message: runsErr.message })
    return jsonResponse(200, { ok: true, items: runs })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return jsonResponse(500, { ok: false, message: msg })
  }
})


