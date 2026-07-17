import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
)

const DEFAULT_LIMITS: Record<string, number> = {
  free: 10,
  pro: 100,
  elite: 500,
  enterprise: 1000,
  academic: 50,
}

export async function checkRateLimit(
  userId: string,
  action: string,
  maxPerHour?: number
): Promise<{ allowed: boolean; remaining: number; retryAfterSeconds: number }> {
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  try {
    const { count, error } = await supabase
      .from('api_usage_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('action', action)
      .gte('created_at', windowStart)

    if (error) {
      console.warn(`[rate-limiter] query error: ${error.message}, allowing request`)
      return { allowed: true, remaining: 999, retryAfterSeconds: 0 }
    }

    const current = count ?? 0
    const limit = maxPerHour ?? DEFAULT_LIMITS.free
    const allowed = current < limit
    const remaining = Math.max(0, limit - current)
    const retryAfterSeconds = allowed ? 0 : 3600

    return { allowed, remaining, retryAfterSeconds }
  } catch (err) {
    console.warn(`[rate-limiter] unexpected error: ${err}, allowing request`)
    return { allowed: true, remaining: 999, retryAfterSeconds: 0 }
  }
}

export async function logApiUsage(userId: string, action: string, metadata?: Record<string, unknown>): Promise<void> {
  try {
    await supabase
      .from('api_usage_log')
      .insert({
        user_id: userId,
        action,
        metadata: metadata || {},
        created_at: new Date().toISOString(),
      })
  } catch (err) {
    console.warn(`[rate-limiter] failed to log usage: ${err}`)
  }
}

export function rateLimitResponse(retryAfterSeconds: number): Response {
  return new Response(
    JSON.stringify({ ok: false, error: 'rate_limit_exceeded', message: 'Too many requests. Please try again later.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSeconds),
        'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('APP_URL') || 'null',
      },
    }
  )
}
