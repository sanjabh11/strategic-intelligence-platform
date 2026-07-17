import fs from 'node:fs'
import path from 'node:path'

function loadEnvFile(filepath) {
  if (!fs.existsSync(filepath)) return {}
  const content = fs.readFileSync(filepath, 'utf8')
  const entries = {}
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator === -1) continue
    entries[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim()
  }
  return entries
}

function unquote(value) {
  if (typeof value !== 'string') return value
  return value.replace(/^['"]|['"]$/g, '')
}

const env = Object.fromEntries(
  Object.entries({ ...loadEnvFile(path.resolve(process.cwd(), '.env')), ...process.env })
    .map(([key, value]) => [key, unquote(value)])
)

const supabaseUrl = env.VITE_SUPABASE_URL
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY
const configuredOpenRouterModel = env.OPENROUTER_MODEL || ''
const openRouterPrimaryEnabled = configuredOpenRouterModel.length > 0 && configuredOpenRouterModel !== 'openrouter/free'
const expectedPrimaryProvider = openRouterPrimaryEnabled ? 'openrouter' : 'gemini'

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
}

const canaries = [
  {
    id: 'india_macro',
    scenario: 'How will India be affected if the global economy enters a recession over the next 24 months, and what is the most likely base case for growth versus contraction?'
  },
  {
    id: 'india_assets',
    scenario: 'For India / INR investors over the next 12 months with medium risk tolerance, is it safer to stay mostly in stocks, cash, or a more defensive allocation if growth slows and inflation stays sticky?'
  },
  {
    id: 'india_gold',
    scenario: 'For India / INR savers over the next 12 months, are gold and other safe-haven assets more likely to outperform local purchasing power or lose relative value if global risk aversion rises?'
  },
  {
    id: 'brazil_macro',
    scenario: 'How will Brazil be affected if global growth weakens over the next 24 months, and is recession risk or resilient growth the more likely base case?'
  },
  {
    id: 'japan_geopolitics',
    scenario: 'How will Japan be affected if tensions between the United States and China intensify in the Indo-Pacific over the next 3 years, and is escalation or cooling more likely?'
  }
]

const pollIntervalMs = 5000
const maxWaitMs = Number(env.ANALYZE_ENGINE_PROVIDER_PROBE_MAX_WAIT_MS || '330000')

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${serviceRoleKey}`,
    apikey: serviceRoleKey,
  }
}

function compactAttempts(providerAttempts) {
  if (!Array.isArray(providerAttempts)) return []
  return providerAttempts.map((attempt) => ({
    provider: attempt.provider || null,
    model: attempt.model || null,
    ok: attempt.ok === true,
    failure_stage: attempt.failure_stage || null,
    failure_class: attempt.failure_class || null,
    http_status: attempt.http_status ?? null,
    error: attempt.error || null,
  }))
}

async function fetchJson(url, init) {
  const response = await fetch(url, init)
  const payload = await response.json().catch(() => null)
  return { response, payload }
}

async function verifyHostedProviderOrder() {
  const { response, payload } = await fetchJson(`${supabaseUrl}/functions/v1/test-secrets`, {
    method: 'GET',
    headers: authHeaders(),
  })

  if (!response.ok || !payload) {
    throw new Error(`test-secrets failed: ${JSON.stringify(payload)}`)
  }

  const providerOrder = Array.isArray(payload.provider_order) ? payload.provider_order : []
  const hostedPrimaryProvider = providerOrder[0] || null
  if (hostedPrimaryProvider !== expectedPrimaryProvider) {
    throw new Error(`Hosted provider order mismatch. expected_primary=${expectedPrimaryProvider} actual=${JSON.stringify(providerOrder)}`)
  }

  return {
    provider_order: providerOrder,
    openrouter_model: payload.openrouter_model || null,
  }
}

async function pollAnalysisStatus(requestId) {
  const deadline = Date.now() + maxWaitMs
  while (Date.now() < deadline) {
    const { response, payload } = await fetchJson(
      `${supabaseUrl}/functions/v1/get-analysis-status?request_id=${encodeURIComponent(requestId)}`,
      {
        method: 'GET',
        headers: authHeaders(),
      },
    )

    if (!response.ok || !payload?.ok) {
      throw new Error(`get-analysis-status failed for ${requestId}: ${JSON.stringify(payload)}`)
    }

    if (payload.status === 'failed') {
      throw new Error(`${requestId} async job failed: ${payload.message || 'unknown failure'}`)
    }

    if (payload.status === 'completed' && payload.analysis_status === 'processing') {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
      continue
    }

    if (payload.status === 'completed') {
      return payload
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }

  throw new Error(`${requestId} polling timed out after ${maxWaitMs}ms`)
}

function assertCompletedAnalysis(entry, completedPayload) {
  const analysis = completedPayload?.analysis
  if (!analysis || typeof analysis !== 'object') {
    throw new Error(`${entry.id} completed without hydrated analysis payload`)
  }

  const analysisStatus = completedPayload?.analysis_status || analysis?.status || 'completed'
  if (analysisStatus === 'processing') {
    throw new Error(`${entry.id} completed response still points at a processing analysis run`)
  }
  if (analysisStatus === 'needs_review' || analysisStatus === 'under_review' || analysisStatus === 'failed' || analysisStatus === 'rejected') {
    throw new Error(`${entry.id} ended in non-pass analysis status: ${analysisStatus}`)
  }

  const provenance = analysis?.provenance || {}
  const retrievalCount = Number(provenance?.retrieval_count || analysis?.retrieval_count || analysis?.retrievals?.length || 0)
  const providerAttempts = compactAttempts(provenance?.provider_attempts || analysis?.provenance?.provider_attempts)
  const failureClass = provenance?.failure_class || analysis?.provenance?.failure_class || null
  const failureStage = provenance?.failure_stage || analysis?.provenance?.failure_stage || null
  const fallbackReason = provenance?.reason || null
  const firstAttemptProvider = providerAttempts[0]?.provider || null

  if (retrievalCount < 3) {
    throw new Error(`${entry.id} retrieval_count below threshold: ${retrievalCount}`)
  }

  if (analysis?.mode === 'fallback' || fallbackReason === 'llm_failed' || fallbackReason === 'llm_exception') {
    throw new Error(`${entry.id} provider fallback triggered: reason=${fallbackReason} failure_class=${failureClass} failure_stage=${failureStage} attempts=${JSON.stringify(providerAttempts)}`)
  }

  if (failureClass || failureStage) {
    throw new Error(`${entry.id} surfaced structured provider failure metadata: class=${failureClass} stage=${failureStage} attempts=${JSON.stringify(providerAttempts)}`)
  }

  if (firstAttemptProvider && firstAttemptProvider !== expectedPrimaryProvider) {
    throw new Error(`${entry.id} primary provider mismatch: expected=${expectedPrimaryProvider} actual=${firstAttemptProvider} attempts=${JSON.stringify(providerAttempts)}`)
  }

  return {
    id: entry.id,
    request_id: completedPayload?.request_id || null,
    analysis_run_id: completedPayload?.analysis_run_id || null,
    retrieval_count: retrievalCount,
    evidence_backed: provenance?.evidence_backed === true,
    analysis_status: analysisStatus,
    provider_attempts: providerAttempts,
  }
}

async function runScenario(entry, index) {
  const requestId = `analyze-provider-probe-${Date.now()}-${index + 1}`
  const { response, payload } = await fetchJson(`${supabaseUrl}/functions/v1/analyze-engine`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      request_id: requestId,
      runId: requestId,
      scenario_text: entry.scenario,
      audience: 'researcher',
      mode: 'standard',
      async_probe: true,
    }),
  })

  if (response.status !== 202 || !payload?.ok || payload?.status !== 'processing' || typeof payload?.analysis_run_id !== 'string') {
    throw new Error(`${entry.id} async launch failed: ${JSON.stringify(payload)}`)
  }

  const completedPayload = await pollAnalysisStatus(requestId)
  return assertCompletedAnalysis(entry, completedPayload)
}

const hostedProviderConfig = await verifyHostedProviderOrder()
const results = []
for (const [index, entry] of canaries.entries()) {
  console.error(`[analyze-engine-provider-probe] ${index + 1}/${canaries.length}: ${entry.id}`)
  results.push(await runScenario(entry, index))
}

console.log(JSON.stringify({
  expected_primary_provider: expectedPrimaryProvider,
  hosted_provider_order: hostedProviderConfig.provider_order,
  openrouter_model: hostedProviderConfig.openrouter_model,
  canaries_checked: canaries.length,
  passed: true,
  results,
}, null, 2))
