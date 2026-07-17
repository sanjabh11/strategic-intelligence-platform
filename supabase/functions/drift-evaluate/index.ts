import { jsonResponse } from '../_shared/auth.ts'

function isAuthorized(req: Request) {
  const token = (req.headers.get('authorization') || req.headers.get('Authorization') || '')
    .replace(/^Bearer\s+/i, '')
    .trim()
  const internalToken = Deno.env.get('INTERNAL_JOB_TOKEN') || Deno.env.get('WHITEBOX_SCHEDULE_TOKEN') || ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('EDGE_SUPABASE_SERVICE_ROLE_KEY') || ''
  return Boolean(token) && (token === internalToken || token === serviceKey)
}

async function callMlService(path: string, payload: Record<string, unknown>) {
  const baseUrl = Deno.env.get('ML_SERVICE_URL')?.replace(/\/$/, '')
  if (!baseUrl) {
    throw new Error('ML_SERVICE_URL not configured')
  }

  const token = Deno.env.get('ML_SERVICE_TOKEN') || ''
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(`ML service ${path} failed with HTTP ${response.status}${message ? `: ${message}` : ''}`)
  }

  return await response.json()
}

// INTERNAL: Called server-side, relies on RLS for auth
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return jsonResponse(200, { ok: true })
  if (req.method !== 'POST') return jsonResponse(405, { ok: false, message: 'Method Not Allowed' })
  if (!isAuthorized(req)) return jsonResponse(401, { ok: false, message: 'Unauthorized' })

  try {
    const body = await req.json().catch(() => ({}))
    const result = await callMlService('/ops/drift-evaluate', body)
    return jsonResponse(200, {
      ok: true,
      ...result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('drift-evaluate failed:', error)
    return jsonResponse(503, { ok: false, message })
  }
})
