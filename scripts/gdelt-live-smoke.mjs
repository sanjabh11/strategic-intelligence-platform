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

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.')
}

if (process.env.RUN_LIVE_GDELT_SMOKE !== 'true') {
  console.log('Skipping live GDELT smoke check. Set RUN_LIVE_GDELT_SMOKE=true to execute it.')
  process.exit(0)
}

let response
try {
  response = await fetch(`${supabaseUrl}/functions/v1/gdelt-stream`, {
    signal: AbortSignal.timeout(15000),
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json'
    }
  })
} catch (error) {
  if (error instanceof Error && error.name === 'TimeoutError') {
    throw new Error('gdelt-stream timed out after 15s. The hosted function is stale, unresponsive, or blocked upstream.')
  }
  throw error
}

const payload = await response.json().catch(() => null)

if (!response.ok) {
  throw new Error(`gdelt-stream failed with HTTP ${response.status}: ${JSON.stringify(payload)}`)
}

const provider = payload?.provider
const firstScenario = Array.isArray(payload?.scenarios) ? payload.scenarios[0] ?? null : null
const firstEventId = typeof firstScenario?.event_id === 'string' ? firstScenario.event_id : null

if (!provider || typeof provider !== 'object') {
  throw new Error('gdelt-stream returned no provider diagnostics. The hosted function is stale or malformed.')
}

if (provider.mode === 'simulated') {
  throw new Error(`gdelt-stream is still running in simulated mode: ${JSON.stringify(provider)}`)
}

if (firstEventId && (/^SIM-GDELT-/.test(firstEventId) || /^GDELT-00\d$/.test(firstEventId))) {
  throw new Error(`gdelt-stream returned placeholder event id ${firstEventId}. The hosted function is stale.`)
}

console.log(JSON.stringify({
  success: payload?.success === true,
  events_count: payload?.events_count ?? 0,
  provider,
  first_scenario: firstScenario
}, null, 2))
