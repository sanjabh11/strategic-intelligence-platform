import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

function loadEnvFile(filepath) {
  if (!fs.existsSync(filepath)) return {}
  const content = fs.readFileSync(filepath, 'utf8')
  const entries = {}
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator === -1) continue
    const key = trimmed.slice(0, separator).trim()
    const value = trimmed.slice(separator + 1).trim()
    entries[key] = value
  }
  return entries
}

const envFile = loadEnvFile(path.resolve(process.cwd(), '.env'))
const env = { ...envFile, ...process.env }

const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
  throw new Error('Missing VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY.')
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const proofEmail = env.HOSTED_STRIPE_PROOF_EMAIL || `codex-academic-proof+${Date.now()}@stanford.edu`
const proofPassword = env.HOSTED_STRIPE_PROOF_PASSWORD || `AcademicProof!${crypto.randomUUID().slice(0, 8)}`
const checkoutCancelUrl = env.HOSTED_STRIPE_PROOF_CANCEL_URL || 'https://example.com/cancel'
const projectRef = (() => {
  try {
    return env.SUPABASE_PROJECT_REF || new URL(supabaseUrl).hostname.split('.')[0]
  } catch {
    return env.SUPABASE_PROJECT_REF || 'unknown-project'
  }
})()

async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs)
  })
  return response
}

function formatError(error) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`
  }
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

async function verifyEntitlementTablesAccessible() {
  for (const table of ['user_subscriptions', 'whop_users']) {
    const response = await fetchWithTimeout(`${supabaseUrl}/rest/v1/${table}?select=user_id&limit=1`, {
      method: 'GET',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`
      }
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(
        `Hosted table probe failed for ${table}: HTTP ${response.status} ${body}. ` +
        `The hosted project ${projectRef} is missing the expected schema or PostgREST cache for that table.`
      )
    }
  }
}

async function ensureAcademicUser() {
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
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new Error(
        'admin user creation timed out after 10s. Inspect hosted auth hooks, ' +
        'repo-untracked auth.users triggers, and database connection pressure before retrying.'
      )
    }
    throw error
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(`admin user creation failed with HTTP ${response.status}: ${JSON.stringify(payload)}`)
  }

  if (!payload?.id) {
    throw new Error(`admin user creation returned no user id: ${JSON.stringify(payload)}`)
  }

  return payload
}

async function signInAcademicUser() {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    signal: AbortSignal.timeout(10000),
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: proofEmail,
      password: proofPassword
    })
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(`password sign-in failed with HTTP ${response.status}: ${JSON.stringify(payload)}`)
  }

  if (!payload?.access_token) {
    throw new Error(`password sign-in returned no access token: ${JSON.stringify(payload)}`)
  }
  return payload
}

async function queryEntitlements(userId) {
  const { data: subscriptions, error: subscriptionError } = await admin
    .from('user_subscriptions')
    .select('user_id, tier, status, stripe_customer_id, stripe_subscription_id, current_period_end, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(3)

  if (subscriptionError) throw subscriptionError

  const { data: whopMirror, error: whopError } = await admin
    .from('whop_users')
    .select('user_id, subscription_tier, subscription_status, plan_id, payment_provider, current_period_end, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(3)

  if (whopError) throw whopError

  return {
    subscriptions: subscriptions || [],
    whopMirror: whopMirror || []
  }
}

async function checkInvalidSignature() {
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

  const body = await response.text()
  return {
    status: response.status,
    ok: response.ok,
    body
  }
}

function assertWebhookProbe(probe) {
  if (probe.status === 404) {
    throw new Error(
      `stripe-webhook returned 404 for project ${projectRef}. Deploy the hosted function before rerunning the proof.`
    )
  }
  if (probe.status !== 400 && probe.status !== 401) {
    throw new Error(
      `stripe-webhook invalid-signature probe returned HTTP ${probe.status}: ${probe.body}`
    )
  }
}

async function createCheckoutSession(accessToken) {
  const response = await fetchWithTimeout(`${supabaseUrl}/functions/v1/stripe-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      tier: 'academic',
      successUrl: 'https://example.com/stripe-proof-success',
      cancelUrl: checkoutCancelUrl
    })
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const payloadText = JSON.stringify(payload)
    if (response.status === 404) {
      throw new Error(`stripe-checkout returned 404 for project ${projectRef}. Deploy the hosted function before rerunning the proof.`)
    }
    if (response.status === 500 && /secret key/i.test(payloadText)) {
      throw new Error(`stripe-checkout failed because hosted STRIPE_SECRET_KEY is not configured for project ${projectRef}.`)
    }
    throw new Error(`stripe-checkout failed with HTTP ${response.status}: ${JSON.stringify(payload)}`)
  }

  return payload
}

async function pollForAcademicEntitlement(userId, timeoutMs = 120000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const entitlements = await queryEntitlements(userId)
    const academicSubscription = entitlements.subscriptions.find((row) => row.tier === 'academic' && row.status === 'active')
    const academicMirror = entitlements.whopMirror.find((row) => row.subscription_tier === 'academic' && row.subscription_status === 'active')
    if (academicSubscription && academicMirror) {
      return { matched: true, entitlements }
    }
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }

  return {
    matched: false,
    entitlements: await queryEntitlements(userId)
  }
}

async function main() {
  console.log('Hosted Stripe proof: starting')

  const signatureProbe = await checkInvalidSignature()
  assertWebhookProbe(signatureProbe)
  console.log(`Invalid signature probe: HTTP ${signatureProbe.status}`)

  await verifyEntitlementTablesAccessible()
  console.log('Hosted entitlement tables are reachable.')

  const proofUser = await ensureAcademicUser()
  console.log(`Academic proof user ready: ${proofUser.email}`)

  const before = await queryEntitlements(proofUser.id)
  console.log(`Pre-check entitlements: ${before.subscriptions.length} subscription row(s), ${before.whopMirror.length} mirror row(s)`)

  const session = await signInAcademicUser()
  const checkout = await createCheckoutSession(session.access_token)

  if (!checkout?.url) {
    throw new Error(`stripe-checkout did not return a hosted URL: ${JSON.stringify(checkout)}`)
  }

  console.log('Hosted checkout session created successfully.')
  console.log(`Checkout URL: ${checkout.url}`)
  console.log('Complete the checkout with Stripe test card 4242 4242 4242 4242, then rerun with --poll or keep this process running with --wait.')

  if (process.argv.includes('--wait')) {
    const result = await pollForAcademicEntitlement(proofUser.id)
    console.log(JSON.stringify(result, null, 2))
    if (!result.matched) {
      process.exitCode = 2
    }
  }
}

main().catch((error) => {
  console.error('Hosted Stripe proof failed:', formatError(error))
  process.exitCode = 1
})
