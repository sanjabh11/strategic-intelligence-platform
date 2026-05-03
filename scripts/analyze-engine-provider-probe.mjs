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

async function runScenario(entry, index) {
  const response = await fetch(`${supabaseUrl}/functions/v1/analyze-engine`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
    body: JSON.stringify({
      runId: `analyze-provider-probe-${Date.now()}-${index + 1}`,
      scenario_text: entry.scenario,
      audience: 'researcher',
      mode: 'standard',
    }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.ok || !payload?.analysis) {
    throw new Error(`${entry.id} failed: ${JSON.stringify(payload)}`)
  }

  const analysis = payload.analysis
  const provenance = payload?.provenance ?? analysis?.provenance ?? {}
  const retrievalCount = Number(provenance?.retrieval_count || analysis?.retrieval_count || analysis?.retrievals?.length || 0)
  const providerAttempts = compactAttempts(provenance?.provider_attempts || analysis?.provenance?.provider_attempts)
  const failureClass = provenance?.failure_class || analysis?.provenance?.failure_class || null
  const failureStage = provenance?.failure_stage || analysis?.provenance?.failure_stage || null
  const fallbackReason = provenance?.reason || null

  if (retrievalCount < 3) {
    throw new Error(`${entry.id} retrieval_count below threshold: ${retrievalCount}`)
  }

  if (payload.mode === 'fallback' || fallbackReason === 'llm_failed' || fallbackReason === 'llm_exception') {
    throw new Error(`${entry.id} provider fallback triggered: reason=${fallbackReason} failure_class=${failureClass} failure_stage=${failureStage} attempts=${JSON.stringify(providerAttempts)}`)
  }

  if (failureClass || failureStage) {
    throw new Error(`${entry.id} surfaced structured provider failure metadata: class=${failureClass} stage=${failureStage} attempts=${JSON.stringify(providerAttempts)}`)
  }

  return {
    id: entry.id,
    retrieval_count: retrievalCount,
    evidence_backed: provenance?.evidence_backed === true,
    provider_attempts: providerAttempts,
  }
}

const results = []
for (const [index, entry] of canaries.entries()) {
  console.error(`[analyze-engine-provider-probe] ${index + 1}/${canaries.length}: ${entry.id}`)
  results.push(await runScenario(entry, index))
}

console.log(JSON.stringify({
  canaries_checked: canaries.length,
  passed: true,
  results,
}, null, 2))
