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
const authTimeoutMs = Number(env.HOSTED_WARROOM_AUTH_TIMEOUT_MS || 15000)
const requestTimeoutMs = Number(env.HOSTED_WARROOM_REQUEST_TIMEOUT_MS || 15000)

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

  return payload
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

function getCreatedUserId(payload) {
  return payload?.user?.id || payload?.id || null
}

async function createRow(table, token, body) {
  const response = await fetchWithTimeout(`${supabaseUrl}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(body)
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || !Array.isArray(payload) || !payload[0]?.id) {
    throw new Error(`${table} insert failed with HTTP ${response.status}: ${JSON.stringify(payload)}`)
  }

  return payload[0]
}

async function verifyRows(sessionId) {
  const tables = [
    'warroom_decision_logs',
    'warroom_assumptions',
    'warroom_scenario_versions',
    'warroom_comments'
  ]

  const results = {}
  for (const table of tables) {
    const response = await fetchWithTimeout(`${supabaseUrl}/rest/v1/${table}?session_id=eq.${sessionId}&select=id`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`
      }
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok || !Array.isArray(payload) || payload.length === 0) {
      throw new Error(`${table} verification failed with HTTP ${response.status}: ${JSON.stringify(payload)}`)
    }

    results[table] = payload.length
  }

  return results
}

const email = `codex-warroom+${Date.now()}@stanford.edu`
const password = `WarRoomProof!${crypto.randomUUID().slice(0, 8)}`
const user = await ensureUser(email, password)
const userId = getCreatedUserId(user)

if (!userId) {
  throw new Error(`admin user creation returned an unexpected payload: ${JSON.stringify(user)}`)
}

const accessToken = await signIn(email, password)

const session = await createRow('warroom_sessions', accessToken, {
  name: 'Hosted smoke war room',
  scenario: 'A supplier renewal package needs a team decision with linked forecast governance.',
  scenario_type: 'pricing_war',
  status: 'lobby',
  current_round: 0,
  total_rounds: 5,
  created_by: userId,
  teams: [
    { id: 'buyer', name: 'Buyer Team', color: '#3B82F6', resources: { leverage: 7 } },
    { id: 'supplier', name: 'Supplier Team', color: '#F59E0B', resources: { leverage: 6 } }
  ],
  is_enterprise_only: true
})

const decisionLog = await createRow('warroom_decision_logs', accessToken, {
  session_id: session.id,
  created_by: userId,
  title: 'Counter the renewal anchor',
  summary: 'Push back on the 14% increase, exchange term length for price relief, and keep the outside option visible.',
  source_surface: 'strategist_brief',
  strategist_brief_snapshot: {
    executive_summary: 'Counter with a smaller increase tied to term and flexibility concessions.',
    provenance_status: 'llm_unverified',
    claim_to_evidence: [
      {
        claim_id: 'claim_1',
        claim_text: 'The outside option weakens supplier leverage.',
        evidence_refs: [
          { evidence_id: 'evidence_1', label: 'Outside option', sourceType: 'user_input', support: 'direct' }
        ],
        confidence: 0.74
      }
    ]
  },
  linked_forecast_title: 'Supplier renewal clears below a 10% increase'
})

const assumption = await createRow('warroom_assumptions', accessToken, {
  session_id: session.id,
  created_by: userId,
  assumption: 'The alternate supplier can cover 40% of demand within one quarter.',
  rationale: 'Operations can tolerate a staged migration if the incumbent refuses price relief.',
  status: 'active'
})

const scenarioVersion = await createRow('warroom_scenario_versions', accessToken, {
  session_id: session.id,
  created_by: userId,
  title: 'Renewal under switching leverage',
  scenario_text: 'Supplier renewal with a 14% opening increase, a weaker alternate supplier, and term length as a tradeable.',
  source_surface: 'game_studio',
  template_id: 'renewal-under-switching-leverage',
  studio_brief: 'Backward induction favors an early counter anchored on price-for-term exchange.',
  report: {
    doctrine_ids: ['sequential_bargaining'],
    next_countermove: 'Anchor the counter before the supplier reframes the outside option.'
  }
})

const comment = await createRow('warroom_comments', accessToken, {
  session_id: session.id,
  created_by: userId,
  target_type: 'session',
  body: 'Escalate to review only if the supplier refuses movement on both price and renewal flexibility.'
})

const counts = await verifyRows(session.id)

console.log(JSON.stringify({
  user_id: userId,
  session_id: session.id,
  decision_log_id: decisionLog.id,
  assumption_id: assumption.id,
  scenario_version_id: scenarioVersion.id,
  comment_id: comment.id,
  counts
}, null, 2))
