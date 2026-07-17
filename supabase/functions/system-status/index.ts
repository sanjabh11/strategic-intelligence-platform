// @ts-nocheck
// Supabase Edge Function: system-status
// Deno runtime
// Endpoint: GET /functions/v1/system-status

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('APP_URL') || 'null',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'apikey, authorization, x-client-info, x-requested-with, content-type',
}

const START_MS = Date.now()
const STATUS_WINDOW_HOURS = 24
const STALE_QUEUE_MINUTES = 10
const STALE_PROCESSING_MINUTES = 20

type HealthState = 'healthy' | 'degraded' | 'unhealthy' | 'unknown'

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  })
}

function getSupabaseConfig(req: Request) {
  const ref = Deno.env.get('SUPABASE_PROJECT_REF') || 'jxdihzqoaxtydolmltdr'
  const url = Deno.env.get('SUPABASE_URL') || `https://${ref}.supabase.co`
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  const anonKey =
    Deno.env.get('SUPABASE_ANON_KEY') ||
    req.headers.get('apikey') ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    ''

  return { ref, url, serviceRoleKey, anonKey }
}

function createSupabaseAdmin(req: Request) {
  const { url, serviceRoleKey } = getSupabaseConfig(req)
  if (!url || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for system-status.')
  }
  return createClient(url, serviceRoleKey)
}

function minutesSince(timestamp?: string | null) {
  if (!timestamp) return null
  const value = new Date(timestamp).getTime()
  if (Number.isNaN(value)) return null
  return (Date.now() - value) / 60000
}

function chooseJobTimestamp(job: Record<string, unknown>) {
  return (
    (typeof job.started_at === 'string' && job.started_at) ||
    (typeof job.updated_at === 'string' && job.updated_at) ||
    (typeof job.created_at === 'string' && job.created_at) ||
    null
  )
}

function computeOverallStatus(statuses: HealthState[]): HealthState {
  if (statuses.includes('unhealthy')) return 'unhealthy'
  if (statuses.includes('degraded')) return 'degraded'
  if (statuses.every((status) => status === 'healthy')) return 'healthy'
  return 'unknown'
}

async function probeEdgeFunctions(req: Request, supabaseUrl: string, authKey: string) {
  if (!supabaseUrl || !authKey) {
    return {
      status: 'unknown' as HealthState,
      info: { reason: 'Missing SUPABASE_URL or auth key for health probe.' },
    }
  }

  const startedAt = performance.now()
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/health`, {
      method: 'GET',
      headers: {
        apikey: authKey,
        Authorization: `Bearer ${authKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    })

    const latencyMs = Math.round(performance.now() - startedAt)
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      return {
        status: 'degraded' as HealthState,
        info: {
          http_status: response.status,
          latency_ms: latencyMs,
          error: payload,
        },
      }
    }

    return {
      status: payload?.status === 'healthy' ? ('healthy' as HealthState) : ('degraded' as HealthState),
      info: {
        latency_ms: latencyMs,
        health_status: payload?.status ?? 'unknown',
        total_analysis_runs: payload?.total_analysis_runs ?? null,
        schema_failure_rate: payload?.schema_failure_rate ?? null,
      },
    }
  } catch (error) {
    return {
      status: 'degraded' as HealthState,
      info: {
        error: error instanceof Error ? error.message : String(error),
      },
    }
  }
}

// PUBLIC: No auth required
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  if (req.method !== 'GET') {
    return jsonResponse(405, { ok: false, message: 'Method Not Allowed' })
  }

  const now = new Date()
  const uptimeMs = Math.max(0, Date.now() - START_MS)
  const uptimeSec = Math.floor(uptimeMs / 1000)
  const windowStart = new Date(Date.now() - STATUS_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
  const { url: supabaseUrl, serviceRoleKey, anonKey } = getSupabaseConfig(req)

  let supabaseAdmin
  try {
    supabaseAdmin = createSupabaseAdmin(req)
  } catch (error) {
    return jsonResponse(500, {
      overall_status: 'unhealthy',
      timestamp: now.toISOString(),
      error: error instanceof Error ? error.message : String(error),
    })
  }

  const body = {
    overall_status: 'unknown' as HealthState,
    timestamp: now.toISOString(),
    version: { platform_version: `edge-${Deno.version?.deno ?? 'unknown'}` },
    components: {
      database: { status: 'unknown' as HealthState, info: {} as Record<string, unknown> },
      edge_functions: { status: 'unknown' as HealthState, info: {} as Record<string, unknown> },
      worker_service: { status: 'unknown' as HealthState, info: {} as Record<string, unknown> },
      external_apis: { status: 'unknown' as HealthState, info: {} as Record<string, unknown> },
    },
    metrics: {
      active_analyses: 0,
      queue_depth: 0,
      avg_processing_time: 0,
      success_rate: 0,
    },
    runtime: {
      deno: Deno.version?.deno,
      v8: Deno.version?.v8,
      typescript: Deno.version?.typescript,
      uptime_sec: uptimeSec,
    },
  }

  const [
    runsProbe,
    queuedCountResult,
    processingCountResult,
    queuedSampleResult,
    processingSampleResult,
    completedCountResult,
    failedCountResult,
    processingTimesResult,
    circuitBreakerResult,
    edgeFunctionsProbe,
  ] = await Promise.all([
    supabaseAdmin.from('analysis_runs').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('analysis_jobs').select('id', { count: 'exact', head: true }).eq('status', 'queued'),
    supabaseAdmin.from('analysis_jobs').select('id', { count: 'exact', head: true }).eq('status', 'processing'),
    supabaseAdmin.from('analysis_jobs').select('request_id, created_at, updated_at').eq('status', 'queued').limit(50),
    supabaseAdmin.from('analysis_jobs').select('request_id, created_at, started_at, updated_at').eq('status', 'processing').limit(50),
    supabaseAdmin.from('analysis_runs').select('id', { count: 'exact', head: true }).eq('status', 'completed').gte('created_at', windowStart),
    supabaseAdmin.from('analysis_runs').select('id', { count: 'exact', head: true }).eq('status', 'failed').gte('created_at', windowStart),
    supabaseAdmin
      .from('analysis_runs')
      .select('processing_time_ms, created_at, status')
      .eq('status', 'completed')
      .not('processing_time_ms', 'is', null)
      .gte('created_at', windowStart)
      .order('created_at', { ascending: false })
      .limit(100),
    supabaseAdmin.from('circuit_breaker').select('*'),
    probeEdgeFunctions(req, supabaseUrl, anonKey || serviceRoleKey),
  ])

  if (runsProbe.error) {
    body.components.database.status = 'unhealthy'
    body.components.database.info = { error: runsProbe.error.message }
  } else {
    body.components.database.status = 'healthy'
    body.components.database.info = {
      analysis_runs_count: runsProbe.count ?? 0,
      window_hours: STATUS_WINDOW_HOURS,
    }
  }

  body.components.edge_functions = edgeFunctionsProbe

  if (queuedCountResult.error || processingCountResult.error || queuedSampleResult.error || processingSampleResult.error) {
    body.components.worker_service.status = 'unknown'
    body.components.worker_service.info = {
      error:
        queuedCountResult.error?.message ||
        processingCountResult.error?.message ||
        queuedSampleResult.error?.message ||
        processingSampleResult.error?.message,
    }
  } else {
    const queueDepth = queuedCountResult.count ?? 0
    const activeAnalyses = processingCountResult.count ?? 0
    const queuedJobs = queuedSampleResult.data ?? []
    const processingJobs = processingSampleResult.data ?? []

    const staleQueuedJobs = queuedJobs.filter((job) => {
      const ageMinutes = minutesSince(chooseJobTimestamp(job))
      return ageMinutes !== null && ageMinutes > STALE_QUEUE_MINUTES
    })
    const staleProcessingJobs = processingJobs.filter((job) => {
      const ageMinutes = minutesSince(chooseJobTimestamp(job))
      return ageMinutes !== null && ageMinutes > STALE_PROCESSING_MINUTES
    })

    let workerStatus: HealthState = 'healthy'
    if (staleProcessingJobs.length >= 3) {
      workerStatus = 'unhealthy'
    } else if (staleQueuedJobs.length > 0 || staleProcessingJobs.length > 0) {
      workerStatus = 'degraded'
    }

    body.components.worker_service.status = workerStatus
    body.components.worker_service.info = {
      stale_queue_jobs: staleQueuedJobs.length,
      stale_processing_jobs: staleProcessingJobs.length,
      oldest_queue_age_minutes: Math.max(0, ...staleQueuedJobs.map((job) => minutesSince(chooseJobTimestamp(job)) ?? 0)),
      oldest_processing_age_minutes: Math.max(0, ...staleProcessingJobs.map((job) => minutesSince(chooseJobTimestamp(job)) ?? 0)),
    }
    body.metrics.active_analyses = activeAnalyses
    body.metrics.queue_depth = queueDepth
  }

  if (processingTimesResult.error) {
    body.metrics.avg_processing_time = 0
  } else {
    const times = (processingTimesResult.data ?? [])
      .map((row) => Number(row.processing_time_ms))
      .filter((value) => Number.isFinite(value) && value >= 0)
    body.metrics.avg_processing_time = times.length
      ? Math.round(times.reduce((sum, value) => sum + value, 0) / times.length)
      : 0
  }

  if (completedCountResult.error || failedCountResult.error) {
    body.metrics.success_rate = 0
  } else {
    const completed = completedCountResult.count ?? 0
    const failed = failedCountResult.count ?? 0
    const total = completed + failed
    body.metrics.success_rate = total > 0 ? Number(((completed / total) * 100).toFixed(1)) : 100
  }

  if (circuitBreakerResult.error) {
    body.components.external_apis.status = 'unknown'
    body.components.external_apis.info = { error: circuitBreakerResult.error.message }
  } else {
    const breakers = circuitBreakerResult.data ?? []
    const normalizedBreakers = breakers.map((breaker) => {
      const openedUntil = typeof breaker.opened_until === 'string' ? breaker.opened_until : null
      const hasOpenWindow = openedUntil ? new Date(openedUntil).getTime() > Date.now() : false
      const state =
        typeof breaker.state === 'string'
          ? breaker.state
          : hasOpenWindow
            ? 'open'
            : Number(breaker.consecutive_failures ?? 0) > 0
              ? 'half'
              : 'closed'

      return {
        service_name: breaker.service_name ?? breaker.provider ?? 'unknown',
        state,
        fail_count: breaker.fail_count ?? breaker.consecutive_failures ?? 0,
        last_failure: breaker.last_failure ?? breaker.opened_until ?? null,
      }
    })
    const openBreakers = normalizedBreakers.filter((breaker) => breaker.state === 'open')
    const halfOpenBreakers = normalizedBreakers.filter((breaker) => breaker.state === 'half')
    let externalStatus: HealthState = 'healthy'

    if (openBreakers.length > 0 && openBreakers.length >= Math.max(1, Math.ceil(normalizedBreakers.length / 2))) {
      externalStatus = 'unhealthy'
    } else if (openBreakers.length > 0 || halfOpenBreakers.length > 0) {
      externalStatus = 'degraded'
    } else if (normalizedBreakers.length === 0) {
      externalStatus = 'unknown'
    }

    body.components.external_apis.status = externalStatus
    body.components.external_apis.info = {
      total_services: normalizedBreakers.length,
      open_circuit_breakers: openBreakers.length,
      half_open_circuit_breakers: halfOpenBreakers.length,
      services: normalizedBreakers.map((breaker) => ({
        service_name: breaker.service_name,
        state: breaker.state,
        fail_count: breaker.fail_count,
        last_failure: breaker.last_failure,
      })),
    }
  }

  body.overall_status = computeOverallStatus([
    body.components.database.status,
    body.components.edge_functions.status,
    body.components.worker_service.status,
    body.components.external_apis.status,
  ])

  console.log(
    JSON.stringify({
      event: 'system_status.success',
      ts: now.toISOString(),
      overall_status: body.overall_status,
      metrics: body.metrics,
    }),
  )

  return jsonResponse(200, body)
})
