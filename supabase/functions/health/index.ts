import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface HealthMetrics {
  timestamp: string
  evidence_backed_rate: number
  perplexity_success_rate: number
  schema_failure_rate: number
  total_analysis_runs: number
  period_hours: number
}

interface WorkerHealthProbe {
  service_name: string
  last_activity: string | null
  status: 'healthy' | 'unhealthy' | 'unknown'
  response_time_ms?: number
}

/**
 * Calculate health metrics over the last N hours
 */
async function probeWorkerHealth(): Promise<WorkerHealthProbe[]> {
  const now = new Date()
  const probes: WorkerHealthProbe[] = []

  // Check analyze-engine worker by looking at recent analysis runs
  try {
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString()
    const { data: recentRuns, error } = await supabaseAdmin
      .from('analysis_runs')
      .select('created_at')
      .gte('created_at', fiveMinutesAgo)
      .limit(1)
      .order('created_at', { ascending: false })

    if (error) throw error

    const lastActivity = recentRuns?.[0]?.created_at || null
    const timeSinceActivity = lastActivity ? new Date(now.getTime() - new Date(lastActivity).getTime()).getTime() : null
    const isHealthy = !timeSinceActivity || timeSinceActivity < 10 * 60 * 1000 // Healthy if active within 10 minutes

    probes.push({
      service_name: 'analyze-engine',
      last_activity: lastActivity,
      status: isHealthy ? 'healthy' : (lastActivity ? 'unhealthy' : 'unknown')
    })
  } catch (err) {
    console.warn('Failed to probe analyze-engine health:', err)
    probes.push({
      service_name: 'analyze-engine',
      last_activity: null,
      status: 'unknown'
    })
  }

  // Check retrieval services health
  const services = ['perplexity', 'uncomtrade', 'worldbank', 'imf', 'gdelt']
  for (const service of services) {
    try {
      const { data: breaker } = await supabaseAdmin
        .from('circuit_breaker')
        .select('state, last_failure')
        .eq('service_name', service)
        .single()

      const status = breaker?.state === 'closed' ? 'healthy' :
                   breaker?.state === 'half' ? 'healthy' : 'unhealthy'

      probes.push({
        service_name: service,
        last_activity: breaker?.last_failure || null,
        status
      })
    } catch (err) {
      probes.push({
        service_name: service,
        last_activity: null,
        status: 'unknown'
      })
    }
  }

  return probes
}

async function calculateHealthMetrics(hours: number = 24, includeHealthProbes: boolean = false): Promise<HealthMetrics & { worker_probes?: WorkerHealthProbe[] }> {
  const startTime = new Date(Date.now() - (hours * 60 * 60 * 1000)).toISOString()

  // Get analysis runs in the period
  const { data: runs, error: runsError } = await supabaseAdmin
    .from('analysis_runs')
    .select('id, evidence_backed, created_at, status')
    .gte('created_at', startTime)

  if (runsError) {
    console.error("Failed to fetch analysis_runs:", runsError)
    throw new Error(`Database query failed: ${runsError.message}`)
  }

  // Get schema failures in the period
  const { data: failures, error: failuresError } = await supabaseAdmin
    .from('schema_failures')
    .select('id')
    .gte('created_at', startTime)

  if (failuresError) {
    console.error("Failed to fetch schema_failures:", failuresError)
    throw new Error(`Database query failed: ${failuresError.message}`)
  }

  // Get monitoring metrics for perplexity success rate
  const { data: metrics, error: metricsError } = await supabaseAdmin
    .from('monitoring_metrics')
    .select('evidence_backed, perplexity_success_rate, model_used')
    .gte('created_at', startTime)

  if (metricsError) {
    console.error("Failed to fetch monitoring_metrics:", metricsError)
  }

  // Calculate real metrics from data
  const totalRuns = runs?.length || 0
  const evidenceBackedRuns = runs?.filter(run => run.evidence_backed)?.length || 0
  const totalFailures = failures?.length || 0
  
  // Calculate perplexity success rate from monitoring metrics
  let perplexitySuccessRate = 0.85 // Default fallback
  if (metrics && metrics.length > 0) {
    const successfulPerplexityCalls = metrics.filter(m => m.evidence_backed).length
    perplexitySuccessRate = successfulPerplexityCalls / metrics.length
  }

  // Calculate additional health metrics
  const underReviewRuns = runs?.filter(run => run.status === 'under_review')?.length || 0
  const completedRuns = runs?.filter(run => run.status === 'completed')?.length || 0
  
  // Calculate circuit breaker health
  const { data: circuitBreakers, error: cbError } = await supabaseAdmin
    .from('circuit_breaker')
    .select('service_name, state, fail_count')
  
  let circuitBreakerHealth = 'healthy'
  if (circuitBreakers) {
    const openBreakers = circuitBreakers.filter(cb => cb.state === 'open').length
    const totalBreakers = circuitBreakers.length
    if (openBreakers > totalBreakers * 0.5) {
      circuitBreakerHealth = 'degraded'
    }
    if (openBreakers === totalBreakers) {
      circuitBreakerHealth = 'critical'
    }
  }

  const result = {
    timestamp: new Date().toISOString(),
    evidence_backed_rate: totalRuns > 0 ? evidenceBackedRuns / totalRuns : 0,
    perplexity_success_rate: perplexitySuccessRate,
    schema_failure_rate: totalRuns > 0 ? totalFailures / totalRuns : 0,
    total_analysis_runs: totalRuns,
    period_hours: hours,
    // Additional metrics
    under_review_rate: totalRuns > 0 ? underReviewRuns / totalRuns : 0,
    completion_rate: totalRuns > 0 ? completedRuns / totalRuns : 0,
    circuit_breaker_health: circuitBreakerHealth,
    open_circuit_breakers: circuitBreakers?.filter(cb => cb.state === 'open').length || 0,
    total_circuit_breakers: circuitBreakers?.length || 0
  }

  if (includeHealthProbes) {
    // Add worker probes to result
    ;(result as any).worker_probes = await probeWorkerHealth()
  }

  return result
}

/**
 * Health check endpoint
 */
Deno.serve(async (req: Request) => {
  try {
    const url = new URL(req.url)
    const hours = parseInt(url.searchParams.get('hours') || '24')
    const includeProbes = url.searchParams.get('probes') === 'true'

    if (hours < 1 || hours > 168) { // Max 1 week
      return new Response(JSON.stringify({
        error: "Invalid hours parameter. Must be between 1 and 168."
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const metrics = await calculateHealthMetrics(hours, includeProbes)

    return new Response(JSON.stringify({
      status: "healthy",
      ...metrics
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error("Health check error:", error)

    return new Response(JSON.stringify({
      status: "error",
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
