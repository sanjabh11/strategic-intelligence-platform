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

const requiredTables = [
  'tier_limits',
  'user_subscriptions',
  'forecasts',
  'forecast_scores',
  'classrooms',
  'classroom_members',
  'classroom_assignments',
  'assignment_submissions',
  'classroom_activity',
  'warroom_sessions',
  'warroom_decision_logs',
  'warroom_assumptions',
  'warroom_scenario_versions',
  'warroom_comments'
]

async function checkTable(table) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*&limit=1`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`
    }
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    return {
      table,
      ok: false,
      status: response.status,
      message: payload?.message || payload?.hint || JSON.stringify(payload)
    }
  }

  return {
    table,
    ok: true,
    status: response.status,
    rowCount: Array.isArray(payload) ? payload.length : 0
  }
}

const results = await Promise.all(requiredTables.map(checkTable))
const missing = results.filter((result) => !result.ok)

console.log(JSON.stringify({
  checked: results.length,
  missing_count: missing.length,
  results
}, null, 2))

if (missing.length > 0) {
  process.exitCode = 1
}
