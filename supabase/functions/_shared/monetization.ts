export type CanonicalTier = 'free' | 'pro' | 'elite' | 'enterprise' | 'academic'
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing' | 'paused'
export type WhopMirrorStatus = 'active' | 'past_due' | 'canceled' | 'trialing'

export function normalizeCanonicalTier(input?: string | null): CanonicalTier {
  switch ((input || '').toLowerCase()) {
    case 'basic':
      return 'free'
    case 'analyst':
      return 'pro'
    case 'pro':
      return 'pro'
    case 'elite':
      return 'elite'
    case 'enterprise':
      return 'enterprise'
    case 'academic':
      return 'academic'
    case 'free':
    default:
      return 'free'
  }
}

export function normalizeSubscriptionStatus(input?: string | null): SubscriptionStatus {
  switch ((input || '').toLowerCase()) {
    case 'past_due':
    case 'unpaid':
      return 'past_due'
    case 'trialing':
      return 'trialing'
    case 'paused':
    case 'incomplete':
      return 'paused'
    case 'incomplete_expired':
    case 'deactivated':
    case 'canceled':
    case 'cancelled':
    case 'expired':
      return 'canceled'
    case 'active':
    default:
      return 'active'
  }
}

export function normalizeWhopMirrorStatus(input?: string | null): WhopMirrorStatus {
  const status = normalizeSubscriptionStatus(input)
  switch (status) {
    case 'paused':
      return 'past_due'
    case 'canceled':
      return 'canceled'
    case 'trialing':
      return 'trialing'
    case 'past_due':
      return 'past_due'
    case 'active':
    default:
      return 'active'
  }
}

export function resolveTierFromStripePriceId(priceId?: string | null, metadataTier?: string | null): CanonicalTier {
  const normalizedMetadataTier = normalizeCanonicalTier(metadataTier)
  if (normalizedMetadataTier !== 'free') {
    return normalizedMetadataTier
  }

  const candidates = new Map<string, CanonicalTier>()
  const add = (envKey: string, tier: CanonicalTier) => {
    const value = Deno.env.get(envKey)
    if (value) candidates.set(value, tier)
  }

  add('STRIPE_ACADEMIC_PRICE_ID', 'academic')
  add('STRIPE_PRO_PRICE_ID', 'pro')
  add('STRIPE_ELITE_PRICE_ID', 'elite')
  add('STRIPE_ENTERPRISE_PRICE_ID', 'enterprise')

  const fallbackMap: Record<string, CanonicalTier> = {
    price_academic_monthly: 'academic',
    price_academic_yearly: 'academic',
    price_pro_monthly: 'pro',
    price_pro_yearly: 'pro',
    price_elite_monthly: 'elite',
    price_elite_yearly: 'elite',
    price_enterprise_monthly: 'enterprise',
    price_enterprise_yearly: 'enterprise'
  }

  if (priceId && candidates.has(priceId)) {
    return candidates.get(priceId) as CanonicalTier
  }

  return priceId ? (fallbackMap[priceId] || normalizedMetadataTier) : normalizedMetadataTier
}

export function isStripeTierAllowed(tier?: string | null): boolean {
  const normalizedTier = normalizeCanonicalTier(tier)
  if (normalizedTier === 'academic') return true
  return Deno.env.get('STRIPE_GENERAL_TIERS_ENABLED') === 'true' && normalizedTier !== 'free'
}

export async function findAuthUserByEmail(supabase: any, email?: string | null) {
  if (!email) return null

  const { data, error } = await supabase.auth.admin.listUsers()
  if (error) {
    throw error
  }

  return data?.users?.find((user: { email?: string }) => user.email?.toLowerCase() === email.toLowerCase()) || null
}

interface SyncStripeEntitlementParams {
  userId?: string | null
  email: string
  tier: string
  customerId?: string | null
  subscriptionId?: string | null
  status?: string | null
  currentPeriodStart?: string | null
  currentPeriodEnd?: string | null
  cancelAtPeriodEnd?: boolean | null
}

export async function syncStripeEntitlement(supabase: any, params: SyncStripeEntitlementParams) {
  const tier = normalizeCanonicalTier(params.tier)
  const subscriptionStatus = normalizeSubscriptionStatus(params.status)
  const whopStatus = normalizeWhopMirrorStatus(params.status)

  let userId = params.userId || null
  if (!userId) {
    const existingUser = await findAuthUserByEmail(supabase, params.email)
    userId = existingUser?.id || null
  }

  const whopUserId = `stripe_${params.customerId || params.subscriptionId || params.email}`

  const { error: whopError } = await supabase
    .from('whop_users')
    .upsert({
      whop_user_id: whopUserId,
      whop_membership_id: params.subscriptionId || null,
      whop_email: params.email,
      user_id: userId,
      subscription_tier: tier,
      subscription_status: whopStatus,
      plan_id: `stripe_${tier}`,
      payment_provider: 'stripe',
      current_period_start: params.currentPeriodStart || null,
      current_period_end: params.currentPeriodEnd || null,
      cancel_at_period_end: Boolean(params.cancelAtPeriodEnd),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'whop_user_id'
    })

  if (whopError) {
    throw whopError
  }

  if (userId) {
    const { error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        tier,
        status: subscriptionStatus,
        stripe_customer_id: params.customerId || null,
        stripe_subscription_id: params.subscriptionId || null,
        current_period_start: params.currentPeriodStart || null,
        current_period_end: params.currentPeriodEnd || null,
        cancel_at_period_end: Boolean(params.cancelAtPeriodEnd),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (subscriptionError) {
      throw subscriptionError
    }
  }

  return { userId, tier, status: subscriptionStatus }
}

interface SyncWhopEntitlementParams {
  userId?: string | null
  email?: string | null
  whopUserId: string
  membershipId?: string | null
  planId?: string | null
  tier: string
  status?: string | null
  currentPeriodStart?: string | null
  currentPeriodEnd?: string | null
  cancelAtPeriodEnd?: boolean | null
}

export async function syncWhopEntitlement(supabase: any, params: SyncWhopEntitlementParams) {
  const tier = normalizeCanonicalTier(params.tier)
  const subscriptionStatus = normalizeSubscriptionStatus(params.status)
  const whopStatus = normalizeWhopMirrorStatus(params.status)

  let userId = params.userId || null
  if (!userId && params.email) {
    const existingUser = await findAuthUserByEmail(supabase, params.email)
    userId = existingUser?.id || null
  }

  const { error: whopError } = await supabase
    .from('whop_users')
    .upsert({
      whop_user_id: params.whopUserId,
      whop_membership_id: params.membershipId || null,
      whop_email: params.email || null,
      user_id: userId,
      subscription_tier: tier,
      subscription_status: whopStatus,
      plan_id: params.planId || null,
      payment_provider: 'whop',
      current_period_start: params.currentPeriodStart || null,
      current_period_end: params.currentPeriodEnd || null,
      cancel_at_period_end: Boolean(params.cancelAtPeriodEnd),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'whop_user_id'
    })

  if (whopError) {
    throw whopError
  }

  if (userId) {
    const { error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        tier,
        status: subscriptionStatus,
        current_period_start: params.currentPeriodStart || null,
        current_period_end: params.currentPeriodEnd || null,
        cancel_at_period_end: Boolean(params.cancelAtPeriodEnd),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (subscriptionError) {
      throw subscriptionError
    }
  }

  return { userId, tier, status: subscriptionStatus }
}
