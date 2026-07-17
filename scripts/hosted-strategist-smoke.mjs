import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

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
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY
const configuredOpenRouterModel = typeof env.OPENROUTER_MODEL === 'string'
  ? env.OPENROUTER_MODEL.replace(/^['"]|['"]$/g, '')
  : ''
const expectedProviderOrder = configuredOpenRouterModel && configuredOpenRouterModel !== 'openrouter/free'
  ? ['openrouter', 'gemini']
  : ['gemini', 'openrouter']
const expectedOpenRouterModel = configuredOpenRouterModel || 'openrouter/free'
const proofEmail = env.HOSTED_STRATEGIST_PROOF_EMAIL || `codex-strategist-proof+${Date.now()}@stanford.edu`
const proofPassword = env.HOSTED_STRATEGIST_PROOF_PASSWORD || `StrategistProof!${crypto.randomUUID().slice(0, 8)}`
const authTimeoutMs = Number(env.HOSTED_STRATEGIST_AUTH_TIMEOUT_MS || 15000)
const strategistTimeoutMs = Number(env.HOSTED_STRATEGIST_REQUEST_TIMEOUT_MS || 120000)

if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
  throw new Error('Missing VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY.')
}

function loadFixture(name) {
  const filepath = path.resolve(process.cwd(), 'supabase/functions/_shared/test-fixtures', name)
  return JSON.parse(fs.readFileSync(filepath, 'utf8'))
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  return fetch(url, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs)
  })
}

async function verifyObservabilityContract() {
  let response
  try {
    response = await fetchWithTimeout(`${supabaseUrl}/functions/v1/test-secrets`, {
      method: 'GET',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    }, authTimeoutMs)
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new Error(`test-secrets timed out after ${authTimeoutMs}ms`)
    }
    throw error
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload) {
    throw new Error(`test-secrets failed with HTTP ${response.status}: ${JSON.stringify(payload)}`)
  }

  if (payload.openrouter_api_key_exists !== true) {
    throw new Error(`test-secrets did not confirm OpenRouter secret presence: ${JSON.stringify(payload)}`)
  }
  if (payload.openrouter_http_referer_set !== true) {
    throw new Error(`test-secrets did not confirm OpenRouter HTTP-Referer wiring: ${JSON.stringify(payload)}`)
  }
  if (!Array.isArray(payload.provider_order) || payload.provider_order[0] !== expectedProviderOrder[0] || payload.provider_order[1] !== expectedProviderOrder[1]) {
    throw new Error(`test-secrets reported an unexpected provider order: ${JSON.stringify(payload.provider_order)}`)
  }
  if (payload.openrouter_model !== expectedOpenRouterModel) {
    throw new Error(`test-secrets reported an unexpected OpenRouter model: ${JSON.stringify(payload.openrouter_model)}`)
  }
  if (payload.cross_provider_fallback_configured !== true) {
    throw new Error(`test-secrets did not confirm cross-provider fallback: ${JSON.stringify(payload)}`)
  }
  if (typeof payload.gemini_same_provider_retry_configured !== 'boolean') {
    throw new Error(`test-secrets returned malformed Gemini retry diagnostics: ${JSON.stringify(payload)}`)
  }

  return {
    provider_order: payload.provider_order,
    openrouter_model: payload.openrouter_model,
    openrouter_base_url: payload.openrouter_base_url,
    cross_provider_fallback_configured: payload.cross_provider_fallback_configured,
    gemini_same_provider_retry_configured: payload.gemini_same_provider_retry_configured,
  }
}

async function ensureUser() {
  let response
  try {
    response = await fetchWithTimeout(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: proofEmail,
        password: proofPassword,
        email_confirm: true
      })
    }, authTimeoutMs)
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new Error(`admin user creation timed out after ${authTimeoutMs}ms`)
    }
    throw error
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(`admin user creation failed with HTTP ${response.status}: ${JSON.stringify(payload)}`)
  }

  return payload
}

async function signIn() {
  let response
  try {
    response = await fetchWithTimeout(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: proofEmail,
        password: proofPassword
      })
    }, authTimeoutMs)
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new Error(`password sign-in timed out after ${authTimeoutMs}ms`)
    }
    throw error
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.access_token) {
    throw new Error(`password sign-in failed with HTTP ${response.status}: ${JSON.stringify(payload)}`)
  }

  return payload.access_token
}

async function runStrategist(accessToken, requestBody) {
  let response
  try {
    response = await fetchWithTimeout(`${supabaseUrl}/functions/v1/personal-life-coach`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(requestBody)
    }, strategistTimeoutMs)
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new Error(`personal-life-coach timed out after ${strategistTimeoutMs}ms`)
    }
    throw error
  }

  const responsePayload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(`personal-life-coach failed with HTTP ${response.status}: ${JSON.stringify(responsePayload)}`)
  }

  if (!responsePayload?.success || !responsePayload?.strategist) {
    throw new Error(`personal-life-coach returned an unexpected payload: ${JSON.stringify(responsePayload)}`)
  }

  return responsePayload
}

async function verifyPersistedDoctrinePayload(decisionId, expectedFramework, expectedEvidenceIds) {
  let response
  try {
    response = await fetchWithTimeout(`${supabaseUrl}/rest/v1/life_decisions?id=eq.${decisionId}&select=id,expected_outcomes`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`
      }
    }, authTimeoutMs)
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new Error(`life_decisions verification timed out after ${authTimeoutMs}ms`)
    }
    throw error
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(`life_decisions verification failed with HTTP ${response.status}: ${JSON.stringify(payload)}`)
  }

  const expectedOutcomes = payload?.[0]?.expected_outcomes
  if (!expectedOutcomes) {
    throw new Error(`No expected_outcomes payload found for decision ${decisionId}`)
  }

  const requiredKeys = [
    'game_classification',
    'outside_options',
    'countermoves',
    'key_uncertainties',
    'claim_to_evidence',
    'provenance_status',
    'advanced_game_outputs',
  ]

  for (const key of requiredKeys) {
    if (!(key in expectedOutcomes)) {
      throw new Error(`Persisted strategist payload is missing ${key}`)
    }
  }

  if (!Array.isArray(expectedOutcomes.claim_to_evidence)) {
    throw new Error('Persisted strategist payload claim_to_evidence field is malformed')
  }

  const referencedEvidenceIds = expectedOutcomes.claim_to_evidence.flatMap((claim) =>
    Array.isArray(claim.evidence_refs) ? claim.evidence_refs.map((ref) => ref.evidence_id) : []
  )

  const inventedEvidenceIds = referencedEvidenceIds.filter((id) => !expectedEvidenceIds.includes(id))
  if (inventedEvidenceIds.length > 0) {
    throw new Error(`Persisted strategist payload referenced unexpected evidence ids: ${inventedEvidenceIds.join(', ')}`)
  }

  const frameworkOutput = expectedOutcomes.advanced_game_outputs?.[expectedFramework]
  if (!frameworkOutput) {
    throw new Error(`Persisted strategist payload is missing advanced_game_outputs.${expectedFramework}`)
  }
  if (frameworkOutput.status !== 'deterministic') {
    throw new Error(`Expected deterministic ${expectedFramework} output, got ${frameworkOutput.status}`)
  }
  if (!frameworkOutput.normalized_inputs || Object.keys(frameworkOutput.normalized_inputs).length === 0) {
    throw new Error(`Expected normalized inputs for ${expectedFramework}`)
  }

  return {
    top_level_keys: Object.keys(expectedOutcomes).sort(),
    claim_to_evidence_count: expectedOutcomes.claim_to_evidence.length,
    provenance_status: expectedOutcomes.provenance_status,
    game_classification: expectedOutcomes.game_classification,
    referenced_evidence_ids: referencedEvidenceIds,
    advanced_framework_status: frameworkOutput.status,
    advanced_framework: expectedFramework,
    normalized_input_keys: Object.keys(frameworkOutput.normalized_inputs),
    diagnostics: expectedOutcomes.diagnostics ?? null,
  }
}

const fixtures = [
  loadFixture('strategist-bounded-rationality.json'),
  loadFixture('strategist-coalitional.json'),
]

const observability = await verifyObservabilityContract()
const user = await ensureUser()
const accessToken = await signIn()
const results = []

for (const fixture of fixtures) {
  const result = await runStrategist(accessToken, fixture)
  const persisted = await verifyPersistedDoctrinePayload(
    result.decision_id,
    fixture.expected_framework,
    fixture.evidenceContext.map((entry) => entry.id),
  )

  const output = result.strategist?.advanced_game_outputs?.[fixture.expected_framework]
  if (!output) {
    throw new Error(`Strategist response is missing advanced_game_outputs.${fixture.expected_framework}`)
  }
  if (output.status !== 'deterministic') {
    throw new Error(`Strategist response expected deterministic ${fixture.expected_framework}, got ${output.status}`)
  }

  results.push({
    decision_id: result.decision_id,
    expected_framework: fixture.expected_framework,
    strategist_source: result.strategist?.source,
    framework_status: output.status,
    normalized_input_keys: Object.keys(output.normalized_inputs || {}),
    recommendation: result.strategist?.recommendation?.primary_action ?? null,
    claim_to_evidence_count: persisted.claim_to_evidence_count,
    provenance_status: persisted.provenance_status,
    game_classification: persisted.game_classification,
    referenced_evidence_ids: persisted.referenced_evidence_ids,
    fallback_diagnostics: persisted.diagnostics,
  })
}

const output = {
  user_id: user.id,
  scenarios_checked: fixtures.length,
  observability,
  results,
}

console.log(JSON.stringify(output, null, 2))

const heuristicResults = results.filter((entry) => entry.strategist_source !== 'llm')
if (heuristicResults.length > 0) {
  throw new Error(`Hosted strategist smoke expected llm strategist_source for all fixtures. Fallback diagnostics: ${JSON.stringify(heuristicResults)}`)
}
