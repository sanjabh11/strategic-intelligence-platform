import crypto from 'node:crypto'
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
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY
const authTimeoutMs = Number(env.HOSTED_INSIGHTS_AUTH_TIMEOUT_MS || 15000)
const requestTimeoutMs = Number(env.HOSTED_INSIGHTS_REQUEST_TIMEOUT_MS || 20000)

if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
  throw new Error('Missing VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY.')
}

async function fetchWithTimeout(url, options = {}, timeoutMs = requestTimeoutMs) {
  return fetch(url, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs)
  })
}

async function ensureUser(email, password) {
  const response = await fetchWithTimeout(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true
    })
  }, authTimeoutMs)

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(`admin user creation failed with HTTP ${response.status}: ${JSON.stringify(payload)}`)
  }
}

async function signIn(email, password) {
  const response = await fetchWithTimeout(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  }, authTimeoutMs)

  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.access_token) {
    throw new Error(`password sign-in failed with HTTP ${response.status}: ${JSON.stringify(payload)}`)
  }

  return payload.access_token
}

const email = `codex-insights+${Date.now()}@stanford.edu`
const password = `InsightsProof!${crypto.randomUUID().slice(0, 8)}`
await ensureUser(email, password)
const accessToken = await signIn(email, password)

const response = await fetchWithTimeout(`${supabaseUrl}/functions/v1/gdelt-stream`, {
  headers: {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
})

const payload = await response.json().catch(() => null)
if (!response.ok) {
  throw new Error(`gdelt-stream failed with HTTP ${response.status}: ${JSON.stringify(payload)}`)
}

const provider = payload?.provider
const scenarios = Array.isArray(payload?.scenarios) ? payload.scenarios : []

if (!provider || typeof provider !== 'object') {
  throw new Error(`gdelt-stream returned no provider diagnostics: ${JSON.stringify(payload)}`)
}

if (provider.mode === 'simulated') {
  throw new Error(`gdelt-stream fell back to simulated mode in hosted smoke: ${JSON.stringify(provider)}`)
}

if (!Array.isArray(provider.details) || provider.details.length === 0) {
  throw new Error(`gdelt-stream returned malformed provider details: ${JSON.stringify(provider)}`)
}

if (provider.mode === 'degraded' && (!Array.isArray(provider.warnings) || provider.warnings.length === 0)) {
  throw new Error(`gdelt-stream degraded without warnings: ${JSON.stringify(provider)}`)
}

if (scenarios.length > 0 && typeof scenarios[0]?.event_id !== 'string') {
  throw new Error(`gdelt-stream returned malformed scenarios: ${JSON.stringify(scenarios[0])}`)
}

console.log(JSON.stringify({
  provider_mode: provider.mode,
  warnings_count: Array.isArray(provider.warnings) ? provider.warnings.length : 0,
  detail_modes: provider.details.map((detail) => detail.mode),
  scenario_count: scenarios.length,
  first_event_id: scenarios[0]?.event_id ?? null
}, null, 2))
