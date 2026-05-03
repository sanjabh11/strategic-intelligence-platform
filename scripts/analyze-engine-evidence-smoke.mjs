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

const env = { ...loadEnvFile(path.resolve(process.cwd(), '.env')), ...process.env }
const supabaseUrl = env.VITE_SUPABASE_URL
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
}

const canaries = [
  'NATO burden sharing and US troop withdrawal consequences for Europe, Russia, and China',
  'China rare-earth export restrictions and downstream EV supply-chain bargaining',
  'India-US tariff retaliation and pharmaceutical procurement strategy'
]

async function runScenario(scenario, index) {
  const response = await fetch(`${supabaseUrl}/functions/v1/analyze-engine`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
    body: JSON.stringify({
      runId: `analyze-evidence-smoke-${Date.now()}-${index + 1}`,
      scenario_text: scenario,
      audience: 'researcher',
      mode: 'standard',
    }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.ok || !payload?.analysis) {
    throw new Error(`Scenario ${index + 1} failed: ${JSON.stringify(payload)}`)
  }

  const analysis = payload.analysis
  const provenance = payload?.provenance ?? analysis?.provenance ?? {}
  const retrievalCount = Number(provenance?.retrieval_count || analysis?.retrieval_count || analysis?.retrievals?.length || 0)
  const evidenceBacked = provenance?.evidence_backed === true
  const providerSummary = provenance?.retrieval_provider_summary ?? null
  const distinctProviderCount = Number(providerSummary?.distinctProviderCount || 0)
  const providerAttempts = provenance?.provider_attempts || analysis?.provenance?.provider_attempts || []
  const failureClass = provenance?.failure_class || analysis?.provenance?.failure_class || null
  const failureStage = provenance?.failure_stage || analysis?.provenance?.failure_stage || null
  const fallbackReason = provenance?.reason || null

  if (retrievalCount < 3) {
    throw new Error(`Scenario ${index + 1} retrieval_count below threshold: ${retrievalCount}`)
  }

  if (payload.mode === 'fallback' || fallbackReason === 'llm_failed' || fallbackReason === 'llm_exception') {
    throw new Error(`Scenario ${index + 1} provider chain degraded before verified analysis: reason=${fallbackReason} failure_class=${failureClass} failure_stage=${failureStage} attempts=${JSON.stringify(providerAttempts)}`)
  }

  if (!evidenceBacked) {
    throw new Error(`Scenario ${index + 1} is not evidence-backed. failure_class=${failureClass} failure_stage=${failureStage} attempts=${JSON.stringify(providerAttempts)}`)
  }

  if (distinctProviderCount < 2) {
    throw new Error(`Scenario ${index + 1} distinct provider count below threshold: ${distinctProviderCount}`)
  }

  return {
    scenario,
    analysis_run_id: payload.analysis_run_id || payload.analysis_id || payload.request_id || null,
    retrieval_count: retrievalCount,
    evidence_backed: evidenceBacked,
    distinct_provider_count: distinctProviderCount,
    provider_summary: providerSummary,
    provider_attempts: providerAttempts,
  }
}

const results = []
for (const [index, scenario] of canaries.entries()) {
  results.push(await runScenario(scenario, index))
}

console.log(JSON.stringify({
  scenarios_checked: canaries.length,
  passed: true,
  results,
}, null, 2))
