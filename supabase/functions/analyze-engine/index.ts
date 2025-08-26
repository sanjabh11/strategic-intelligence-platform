// @ts-nocheck
// Supabase Edge Function: analyze-engine (synchronous MVP)
// Deno runtime
// Endpoint: POST /functions/v1/analyze-engine
// Returns an AnalysisResult-compatible payload consumed by the frontend Zod schema.

// deno-lint-ignore-file no-explicit-any

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- Env helpers ---
const getEnv = (k: string) => Deno.env.get(k) || undefined
const envBool = (k: string, def = false) => {
  const v = getEnv(k)
  if (v == null) return def
  return /^(1|true|yes|on)$/i.test(v)
}
const envInt = (k: string, def: number) => {
  const v = getEnv(k)
  if (!v) return def
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : def
}

interface AnalysisOptions {
  beliefDepth?: number
  adaptationRate?: number
  iterations?: number
  decoherenceRate?: number
  seed?: number
  deterministicSeed?: number
}

interface Player {
  id: string
  name?: string
  actions: string[]
}

interface AnalysisRequest {
  scenario_text: string
  players_def?: Player[]
  mode?: 'standard' | 'education_quick'
  options?: AnalysisOptions
}

function mulberry32(seed: number) {
  let t = seed >>> 0
  return function () {
    t += 0x6D2B79F5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function normalize(weights: number[]): number[] {
  const s = weights.reduce((a, b) => a + b, 0) || 1
  return weights.map(w => (w < 0 ? 0 : w) / s)
}

function defaultPlayers(): Player[] {
  return [
    { id: 'P1', name: 'Alpha', actions: ['Cooperate', 'Defect'] },
    { id: 'P2', name: 'Beta', actions: ['Cooperate', 'Defect'] },
    { id: 'P3', name: 'Gamma', actions: ['Cooperate', 'Defect'] }
  ]
}

function computeEquilibrium(players: Player[], rnd: () => number, iterations = 300) {
  // Simple softmax best-response dynamics (MVP):
  // We lack explicit payoff matrices; derive pseudo-utilities from seeded RNG to maintain determinism.
  const profile: Record<string, Record<string, number>> = {}
  const tau = 0.5
  // Initialize random policies
  const policies: Record<string, number[]> = {}
  const actionMap: Record<string, string[]> = {}
  players.forEach(p => {
    const raw = p.actions.map(() => rnd() + 0.2)
    policies[p.id] = normalize(raw)
    actionMap[p.id] = p.actions
  })

  for (let it = 0; it < iterations; it++) {
    for (const p of players) {
      // pseudo-utility: prefer actions currently under-selected globally to create convergence
      const globalActionCounts: Record<string, number> = {}
      for (const q of players) {
        actionMap[q.id].forEach((a, idx) => {
          globalActionCounts[a] = (globalActionCounts[a] || 0) + policies[q.id][idx]
        })
      }
      const utilities = actionMap[p.id].map(a => 1.0 - (globalActionCounts[a] || 0) / players.length + rnd() * 0.05)
      // softmax
      const exps = utilities.map(u => Math.exp(u / tau))
      const denom = exps.reduce((s, v) => s + v, 0)
      policies[p.id] = exps.map(v => v / (denom || 1))
    }
  }

  players.forEach(p => {
    profile[p.id] = {}
    actionMap[p.id].forEach((a, i) => {
      profile[p.id][a] = Number(policies[p.id][i].toFixed(3))
    })
  })

  // stability heuristic
  const stability = Number((0.65 + rnd() * 0.25).toFixed(3))
  const convergenceIteration = Math.floor(10 + rnd() * 20)

  return {
    profile,
    stability,
    method: 'recursive_best_response_mvp',
    convergenceIteration,
    confidence: { lower: Number(Math.max(0, stability - 0.1).toFixed(3)), upper: Number(Math.min(1, stability + 0.1).toFixed(3)) }
  }
}

function computeQuantum(players: Player[], eqProfile: Record<string, Record<string, number>>, rnd: () => number, decoherenceRate = 0.15) {
  const actions = Array.from(new Set(players.flatMap(p => p.actions)))
  // Initialize amplitudes from average equilibrium probabilities per action
  const probs = actions.map(a => {
    const pSum = players.reduce((s, p) => s + (eqProfile[p.id]?.[a] ?? 0), 0)
    return pSum / Math.max(1, players.length)
  })
  let psi = probs.map(Math.sqrt)

  // Simple unitary-like mixing and decoherence
  const steps = 5
  for (let t = 0; t < steps; t++) {
    // mix neighbors cyclically
    const next = psi.map((_, i) => 0.6 * psi[i] + 0.2 * psi[(i + 1) % psi.length] + 0.2 * psi[(i + psi.length - 1) % psi.length])
    // normalize
    const norm = Math.sqrt(next.reduce((s, v) => s + v * v, 0) || 1)
    psi = next.map(v => v / norm)
    // decohere toward magnitudes
    psi = psi.map(v => (1 - decoherenceRate) * v + decoherenceRate * Math.abs(v))
  }

  const collapsed = psi.map((amp, i) => ({ action: actions[i], probability: Number(Math.max(0, Math.min(1, amp * amp)).toFixed(3)) }))

  // Influence matrix: higher diagonal, mild off-diagonal coupling
  const n = players.length
  const influence: number[][] = Array.from({ length: n }, (_, i) => (
    Array.from({ length: n }, (_, j) => {
      const base = i === j ? 0.7 + rnd() * 0.2 : 0.1 + rnd() * 0.2
      return Number(Math.max(0, Math.min(1, base)).toFixed(3))
    })
  ))

  return { collapsed, influence }
}

function featureVectorFromResult(players: Player[], eq: any, quantum: any): number[] {
  // 128-d compact features: pad/truncate. Avoid Array.push at runtime.
  let out: number[] = []
  // per-player top-2 probabilities
  for (const p of players) {
    const prof = (eq && eq.profile && eq.profile[p.id]) ? eq.profile[p.id] : {}
    const entries = Object.entries(prof) as [string, number][]
    entries.sort((a, b) => b[1] - a[1])
    const top1 = entries[0]?.[1] ?? 0
    const top2 = entries[1]?.[1] ?? 0
    out = out.concat([top1, top2])
  }
  // stability, convergence
  const stability = eq?.stability ?? 0
  const conv = (eq?.convergenceIteration ?? 0) / 100
  out = out.concat([stability, conv])
  // quantum collapsed first 6
  const collapsed = Array.isArray(quantum?.collapsed) ? quantum.collapsed.slice(0, 6) : []
  out = out.concat(collapsed.map((c: any) => c?.probability ?? 0))
  // influence diagonal mean
  if (Array.isArray(quantum?.influence) && quantum.influence.length > 0) {
    const n = quantum.influence.length
    let sum = 0
    for (let i = 0; i < n; i++) sum += quantum.influence[i][i] || 0
    out = out.concat([sum / n])
  } else {
    out = out.concat([0])
  }
  // pad to 128
  if (out.length < 128) {
    out = out.concat(new Array(128 - out.length).fill(0))
  }
  return out.slice(0, 128)
}

function patternMatchesFromFeatures(_features: number[], rnd: () => number) {
  // Placeholder: return two demo matches
  return [
    { id: 'coordination_game', score: Number((0.72 + rnd() * 0.1).toFixed(3)) },
    { id: 'stag_hunt_variant', score: Number((0.58 + rnd() * 0.1).toFixed(3)) },
  ]
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

function jsonResponse(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  })
}

// --- External retrievals (optional; requires EDGE_PERPLEXITY_API_KEY) ---
async function fetchPerplexityRetrievals(query: string, max: number = 5) {
  const enabled = envBool('EDGE_ENABLE_RETRIEVALS', false) || envBool('ENABLE_EXTERNAL_RETRIEVALS', false)
  if (!enabled) {
    return { items: [], warning: 'external retrieval disabled: EDGE_ENABLE_RETRIEVALS=false' }
  }

  const apiKey = getEnv('EDGE_PERPLEXITY_API_KEY') || getEnv('PERPLEXITY_API_KEY')
  if (!apiKey) return { items: [], warning: 'external retrieval disabled: API key not set' }

  const timeoutMs = envInt('EDGE_RETRIEVAL_TIMEOUT_MS', 8000)

  try {
    const startedAt = new Date().toISOString()
    console.log(JSON.stringify({ event: 'retrieval.request', ts: startedAt, provider: 'perplexity', timeout_ms: timeoutMs }))

    const body = {
      model: 'sonar-pro',
      messages: [
        { role: 'system', content: 'You are a research assistant. Return concise, authoritative sources with citations.' },
        { role: 'user', content: `${query}\n\nPlease search the live web and provide ${Math.min(5, Math.max(1, max))} relevant sources with citations.` }
      ],
      temperature: 0.2,
      top_k: 5,
      search_recency_filter: 'month',
      return_images: false,
      stream: false,
      max_tokens: 600
    }

    const controller = new AbortController()
    const to = setTimeout(() => controller.abort('timeout'), Math.max(100, timeoutMs))
    const resp = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body),
      signal: controller.signal
    })
    clearTimeout(to)

    const rawText = await resp.text()
    let data: any = null
    try { data = JSON.parse(rawText) } catch { /* no-op */ }

    if (!resp.ok) {
      const msg = (data && (data.error?.message || data.message)) || rawText || resp.statusText
      return { items: [], warning: `retrieval failed: ${msg}` }
    }

    // Try to gather citations/URLs from common fields or from content
    let urls: string[] = []
    if (Array.isArray(data?.citations)) urls = data.citations
    if (!urls.length && Array.isArray(data?.choices) && data.choices[0]) {
      const c0 = data.choices[0]
      if (Array.isArray(c0?.citations)) urls = c0.citations
      const msgContent = c0?.message?.content || c0?.text || ''
      if (!urls.length && typeof msgContent === 'string') {
        const re = /https?:\/\/[^\s)]+/g
        const found = msgContent.match(re)
        if (found && found.length) urls = found
      }
    }

    const deduped = Array.from(new Set(urls)).slice(0, max)
    const items = deduped.map((u: string) => {
      let host: string | undefined
      try { host = new URL(u).hostname.replace(/^www\./, '') } catch { host = undefined }
      return { id: u, title: host || 'Source', url: u, snippet: undefined }
    })

    console.log(JSON.stringify({ event: 'retrieval.success', ts: new Date().toISOString(), items: items.length }))
    return { items, warning: items.length ? undefined : 'no citations found in response' }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const isAbort = /AbortError/i.test(msg) || /aborted|timeout/i.test(msg)
    console.warn(JSON.stringify({ event: 'retrieval.exception', ts: new Date().toISOString(), message: msg, aborted: isAbort }))
    return { items: [], warning: isAbort ? 'retrieval timeout' : `retrieval exception: ${msg}` }
  }
}

Deno.serve(async (req) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse(405, { ok: false, message: 'Method Not Allowed' })
  }

  const t0 = performance.now()
  try {
    console.log(JSON.stringify({
      event: 'analyze_engine.request',
      ts: new Date().toISOString(),
      headers: {
        cfRay: req.headers.get('cf-ray') || undefined,
        forwardedFor: req.headers.get('x-forwarded-for') || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
      }
    }))
    const input = (await req.json()) as AnalysisRequest
    if (!input || !input.scenario_text) {
      return jsonResponse(400, { ok: false, message: 'scenario_text is required' })
    }

    const players: Player[] = (input.players_def && input.players_def.length > 0) ? input.players_def : defaultPlayers()
    const seed = input.options?.deterministicSeed ?? input.options?.seed ?? 20250826
    const iterations = input.options?.iterations ?? 300
    const decoherenceRate = input.options?.decoherenceRate ?? 0.15
    const rnd = mulberry32(seed)

    const equilibrium = computeEquilibrium(players, rnd, iterations)
    const quantum = computeQuantum(players, equilibrium.profile, rnd, decoherenceRate)
    const forecast = Array.from({ length: 6 }, (_, tt) => ({ t: tt, probability: Number(Math.min(1, Math.max(0, 0.5 + (equilibrium.stability - 0.5) * 0.1 * tt + (rnd() - 0.5) * 0.02)).toFixed(3)) }))

    // External retrievals (best-effort)
    let retrievals: { id: string; title?: string; url?: string; snippet?: string }[] = []
    let retrievalWarning: string | undefined
    try {
      const r = await fetchPerplexityRetrievals(input.scenario_text, 5)
      retrievals = r.items || []
      retrievalWarning = r.warning
    } catch (e) {
      retrievals = []
      retrievalWarning = e instanceof Error ? e.message : String(e)
    }

    const analysis = {
      scenario_text: input.scenario_text,
      players,
      equilibrium,
      quantum,
      pattern_matches: patternMatchesFromFeatures(featureVectorFromResult(players, equilibrium, quantum), rnd),
      retrievals,
      retrieval_count: Array.isArray(retrievals) ? retrievals.length : 0,
      processing_stats: {
        processing_time_ms: Math.floor(performance.now() - t0),
        stability_score: equilibrium.stability
      },
      provenance: {
        evidence_backed: (Array.isArray(retrievals) ? retrievals.length : 0) > 0,
        retrieval_count: Array.isArray(retrievals) ? retrievals.length : 0,
        model: 'edge-mvp-1.0',
        warning: retrievalWarning
      },
    }

    // Attempt to persist analysis to DB (best-effort; non-blocking response semantics)
    try {
      const ref = Deno.env.get('SUPABASE_PROJECT_REF') || 'jxdihzqoaxtydolmltdr'
      const supabaseUrl = Deno.env.get('EDGE_SUPABASE_URL') || Deno.env.get('SUPABASE_URL') || `https://${ref}.supabase.co`
      const serviceKey = Deno.env.get('EDGE_SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      const headerApiKey = req.headers.get('apikey') || (req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '')
      const anonKey = Deno.env.get('EDGE_SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || headerApiKey
      const writeKey = serviceKey || anonKey // falls back to anon if SR key not available (requires INSERT policy)
      if (supabaseUrl && writeKey) {
        const admin = createClient(supabaseUrl, writeKey)
        // Construct a payload aligned to the remote schema we've detected via REST
        const runPayload: Record<string, unknown> = {
          request_id: crypto.randomUUID?.() ?? `${Date.now()}`,
          schema_version: 'analysis_v1',
          status: 'completed',
          model: 'edge-mvp-1.0',
          analysis_json: {
            players,
            equilibrium,
            quantum,
            notes: { scenario_text: input.scenario_text ?? null },
          },
        }

        let { data: runRow, error: runErr } = await admin
          .from('analysis_runs')
          .insert(runPayload)
          .select('id')
          .single()
        if (runErr) {
          // Retry with empty insert if schema doesn't have scenario_text
          const shouldRetry = /column\s+.*does not exist/i.test(runErr.message) || /42703/.test(runErr.message)
          console.warn(JSON.stringify({ event: 'analyze_engine.persist.run_error', error: runErr.message, will_retry_minimal: shouldRetry, attempted_keys: Object.keys(runPayload) }))
          if (shouldRetry) {
            // Minimal retry with only analysis_json which exists remotely
            const retry = await admin
              .from('analysis_runs')
              .insert({ analysis_json: { players, equilibrium, quantum } })
              .select('id')
              .single()
            runRow = retry.data
            runErr = retry.error
          }
        }
        if (!runErr && runRow?.id) {
          const featuresArr = featureVectorFromResult(players, equilibrium, quantum)
          const { error: featErr } = await admin
            .from('analysis_features')
            .insert({ run_id: runRow.id, features: featuresArr })
          if (featErr) {
            console.warn(JSON.stringify({ event: 'analyze_engine.persist.features_error', error: featErr.message, length: featuresArr.length }))
          } else {
            console.log(JSON.stringify({ event: 'analyze_engine.persist.success', run_id: runRow.id, used_service_role: Boolean(serviceKey) }))
          }
        }
      }
    } catch (e) {
      console.warn(JSON.stringify({ event: 'analyze_engine.persist.exception', error: e instanceof Error ? e.message : String(e) }))
    }

    // Synchronous path: return analysis directly (no request_id to avoid polling)
    const resp = {
      ok: true,
      analysis,
      mode: 'standard'
    }
    console.log(JSON.stringify({
      event: 'analyze_engine.success',
      ts: new Date().toISOString(),
      duration_ms: Math.floor(performance.now() - t0),
      stability: equilibrium.stability,
    }))
    return jsonResponse(200, resp)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(JSON.stringify({
      event: 'analyze_engine.error',
      ts: new Date().toISOString(),
      duration_ms: Math.floor(performance.now() - t0),
      error: msg,
    }))
    return jsonResponse(500, { ok: false, error: msg })
  }
})
