import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_ANON_KEY =
  Deno.env.get('SUPABASE_ANON_KEY') ||
  Deno.env.get('SB_ANON_KEY') ||
  Deno.env.get('ANON_KEY') ||
  ''

export function buildCorsHeaders() {
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('APP_URL') || ''
  return {
    'Access-Control-Allow-Origin': allowedOrigin || 'null',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  }
}

export function jsonResponse(status: number, body: unknown, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...buildCorsHeaders(),
      ...extraHeaders
    }
  })
}

export function buildAuthClient(req: Request) {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }
  })

  return { token, client }
}

export async function getAuthenticatedUser(req: Request) {
  const { token, client } = buildAuthClient(req)
  if (!token) return null
  const { data, error } = await client.auth.getUser()
  if (error || !data?.user) return null
  return data.user
}

export async function requireAuth(req: Request): Promise<{ user: any; response: null } | { user: null; response: Response }> {
  if (req.method === 'OPTIONS') {
    return { user: null, response: new Response('ok', { headers: buildCorsHeaders() }) }
  }
  const user = await getAuthenticatedUser(req)
  if (!user) {
    return { user: null, response: jsonResponse(401, { ok: false, error: 'authentication_required' }) }
  }
  return { user, response: null }
}

export function withAuth(handler: (req: Request) => Promise<Response>): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: buildCorsHeaders() })
    }
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return jsonResponse(401, { ok: false, error: 'authentication_required' })
    }
    return handler(req)
  }
}
