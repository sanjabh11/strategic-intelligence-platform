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
const proofEmail = env.HOSTED_STRIPE_PROOF_EMAIL || `codex-auth-diag+${Date.now()}@stanford.edu`
const proofPassword = env.HOSTED_STRIPE_PROOF_PASSWORD || `HostedDiag!${crypto.randomUUID().slice(0, 8)}`
const projectRef = (() => {
  try {
    return env.SUPABASE_PROJECT_REF || new URL(supabaseUrl).hostname.split('.')[0]
  } catch {
    return env.SUPABASE_PROJECT_REF || 'unknown-project'
  }
})()

if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
  throw new Error('Missing VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY.')
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs)
  })
  return response
}

async function probeWebhook() {
  const response = await fetchWithTimeout(`${supabaseUrl}/functions/v1/stripe-webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': 't=1,v1=invalid'
    },
    body: JSON.stringify({
      id: 'evt_invalid_signature_probe',
      type: 'checkout.session.completed',
      data: { object: {} }
    })
  })

  return {
    status: response.status,
    body: await response.text()
  }
}

async function probeTable(table) {
  try {
    const response = await fetchWithTimeout(`${supabaseUrl}/rest/v1/${table}?select=user_id&limit=1`, {
      method: 'GET',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`
      }
    })

    const bodyText = await response.text()
    let payload = null
    try {
      payload = bodyText ? JSON.parse(bodyText) : null
    } catch {
      payload = bodyText
    }

    return {
      table,
      ok: response.ok,
      status: response.status,
      payload
    }
  } catch (error) {
    return {
      table,
      ok: false,
      status: null,
      error: error instanceof Error ? { name: error.name, message: error.message } : { message: String(error) }
    }
  }
}

async function probeAdminCreateUser() {
  const startedAt = Date.now()
  try {
    const response = await fetchWithTimeout(`${supabaseUrl}/auth/v1/admin/users`, {
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
    })

    const payload = await response.json().catch(() => null)
    return {
      ok: response.ok,
      status: response.status,
      duration_ms: Date.now() - startedAt,
      payload
    }
  } catch (error) {
    return {
      ok: false,
      status: null,
      duration_ms: Date.now() - startedAt,
      error: error instanceof Error ? { name: error.name, message: error.message } : { message: String(error) }
    }
  }
}

const summary = {
  project_ref: projectRef,
  webhook: await probeWebhook(),
  tables: await Promise.all([
    probeTable('user_subscriptions'),
    probeTable('whop_users')
  ]),
  admin_create_user: await probeAdminCreateUser()
}

console.log(JSON.stringify(summary, null, 2))
