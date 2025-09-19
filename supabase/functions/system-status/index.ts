// @ts-nocheck
// Supabase Edge Function: system-status
// Deno runtime
// Endpoint: GET /functions/v1/system-status

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function jsonResponse(status: number, body: unknown) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'apikey, authorization, x-client-info, x-requested-with, content-type',
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    },
  })
}

// Track module start time for uptime within the same instance
const START_MS = Date.now()

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'apikey, authorization, x-client-info, x-requested-with, content-type',
        'Access-Control-Max-Age': '86400',
      }
    });
  }

  if (req.method !== 'GET') {
    return jsonResponse(405, { ok: false, message: 'Method Not Allowed' })
  }

  const now = new Date()
  const uptimeMs = Math.max(0, Date.now() - START_MS)
  const uptimeSec = Math.max(0, Math.floor(uptimeMs / 1000))
  console.log(JSON.stringify({
    event: 'system_status.request',
    ts: now.toISOString(),
    headers: {
      cfRay: req.headers.get('cf-ray') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    }
  }))

  // Database connectivity check using anon client (read-only select)
  let dbStatus: 'healthy' | 'degraded' | 'unknown' = 'unknown'
  let dbInfo: Record<string, unknown> | undefined
  let runsCount: number | undefined
  let featuresCount: number | undefined
  try {
    const ref = Deno.env.get('SUPABASE_PROJECT_REF') || 'jxdihzqoaxtydolmltdr'
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || `https://${ref}.supabase.co`
    const headerApiKey = req.headers.get('apikey') || (req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || headerApiKey
    if (supabaseUrl && anonKey) {
      const supabase = createClient(supabaseUrl, anonKey)
      const { error, count } = await supabase
        .from('analysis_runs')
        .select('id', { count: 'exact', head: true })
      if (error) {
        dbStatus = 'degraded'
        dbInfo = { error: error.message }
      } else {
        dbStatus = 'healthy'
        runsCount = count ?? 0
        // fetch features count too
        const { error: fErr, count: fCount } = await supabase
          .from('analysis_features')
          .select('run_id', { count: 'exact', head: true })
        if (fErr) {
          dbInfo = { reachable: true, runs_count: runsCount, features_count_error: fErr.message }
        } else {
          featuresCount = fCount ?? 0
          dbInfo = { reachable: true, runs_count: runsCount, features_count: featuresCount }
        }
      }
    }
  } catch (e) {
    dbStatus = 'degraded'
    dbInfo = { error: e instanceof Error ? e.message : String(e) }
  }

  // Shape aligned to frontend expectations in src/hooks/useSystemStatus.ts
  const body = {
    overall_status: 'healthy',
    timestamp: now.toISOString(),
    version: { platform_version: `edge-${Deno.version?.deno ?? 'unknown'}` },
    components: {
      database: { status: dbStatus, info: dbInfo },
      edge_functions: { status: 'healthy', info: { uptime_sec: uptimeSec } },
      worker_service: { status: 'unknown' },
      external_apis: {
        status: 'unknown',
        services: {
          perplexity: {
            configured: Boolean(Deno.env.get('PERPLEXITY_API_KEY') || Deno.env.get('EDGE_PERPLEXITY_API_KEY')),
            missing_env: (!Deno.env.get('PERPLEXITY_API_KEY') && !Deno.env.get('EDGE_PERPLEXITY_API_KEY')) ? ['PERPLEXITY_API_KEY','EDGE_PERPLEXITY_API_KEY'] : [],
          },
          firecrawl: {
            configured: Boolean(Deno.env.get('FIRECRAWL_API_KEY')),
            missing_env: !Deno.env.get('FIRECRAWL_API_KEY') ? ['FIRECRAWL_API_KEY'] : [],
          },
        }
      },
    },
    metrics: {
      active_analyses: 0,
      queue_depth: 0,
      avg_processing_time: 0,
      success_rate: 100,
    },
    runtime: {
      deno: Deno.version?.deno,
      v8: Deno.version?.v8,
      typescript: Deno.version?.typescript,
      uptime_sec: uptimeSec,
    },
  }

  // Enrich with community metrics (best-effort)
  try {
    const ref = Deno.env.get('SUPABASE_PROJECT_REF') || 'jxdihzqoaxtydolmltdr'
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || `https://${ref}.supabase.co`
    const headerApiKey = req.headers.get('apikey') || (req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || headerApiKey
    if (supabaseUrl && anonKey) {
      const supabase = createClient(supabaseUrl, anonKey)
      const { count: shares } = await supabase.from('shared_strategies').select('id', { count: 'exact', head: true })
      const { count: runs } = await supabase.from('analysis_runs').select('id', { count: 'exact', head: true })
      const { count: feats } = await supabase.from('analysis_features').select('run_id', { count: 'exact', head: true })
      ;(body as any).metrics.total_shares = shares || 0
      ;(body as any).metrics.total_runs = runs || 0
      ;(body as any).metrics.feature_vectors = feats || 0
    }
  } catch {}

  console.log(JSON.stringify({
    event: 'system_status.success', ts: now.toISOString(), uptime_sec: uptimeSec
  }))
  return jsonResponse(200, body)
})
