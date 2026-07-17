import Stripe from 'https://esm.sh/stripe@14.5.0'
import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  normalizeCanonicalTier,
  resolveTierFromStripePriceId,
  syncStripeEntitlement
} from '../_shared/monetization.ts'
import { isLocalWebhookDevelopment, verifyStripeSignature } from '../_shared/webhook-signatures.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('APP_URL') || 'null',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type StripeEventType =
  | 'checkout.session.completed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.paid'
  | 'invoice.payment_failed'

interface StripeEvent {
  id: string
  type: StripeEventType
  data: {
    object: any
  }
}

// WEBHOOK: Signature verification required, not user auth
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured')
    }

    if (!stripeWebhookSecret && !isLocalWebhookDevelopment()) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured')
    }

    const rawBody = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (stripeWebhookSecret) {
      const verification = await verifyStripeSignature(rawBody, signature, stripeWebhookSecret)
      if (!verification.ok) {
        return new Response(
          JSON.stringify({ error: 'Invalid Stripe signature', details: verification.error }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const event: StripeEvent = JSON.parse(rawBody)
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })
    const supabase = createClient(supabaseUrl, supabaseKey)

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(supabase, stripe, event.data.object)
        break
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpsert(supabase, stripe, event.data.object)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(supabase, stripe, event.data.object)
        break
      case 'invoice.paid':
        await handleInvoicePaid(supabase, event.data.object)
        break
      case 'invoice.payment_failed':
        await handlePaymentFailed(supabase, event.data.object)
        break
      default:
        console.log(`Unhandled Stripe event type: ${event.type}`)
    }

    return new Response(
      JSON.stringify({ received: true, event_type: event.type }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    console.error('Stripe webhook error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function fetchSubscriptionDetails(stripe: Stripe, subscriptionRef: string | Stripe.Subscription | null | undefined) {
  if (!subscriptionRef) return null
  if (typeof subscriptionRef !== 'string') return subscriptionRef
  return await stripe.subscriptions.retrieve(subscriptionRef)
}

async function fetchCustomerEmail(stripe: Stripe, customerRef: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined) {
  if (!customerRef) return null
  if (typeof customerRef !== 'string') {
    return 'email' in customerRef ? customerRef.email || null : null
  }

  const customer = await stripe.customers.retrieve(customerRef)
  return 'email' in customer ? customer.email || null : null
}

async function handleCheckoutCompleted(supabase: any, stripe: Stripe, session: any) {
  const subscription = await fetchSubscriptionDetails(stripe, session.subscription)
  const metadataTier = session.metadata?.tier || subscription?.metadata?.tier
  const priceId = session.metadata?.price_id || subscription?.items?.data?.[0]?.price?.id
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
  const userId = session.client_reference_id || session.metadata?.user_id || subscription?.metadata?.user_id || null
  const email =
    session.customer_email ||
    session.metadata?.email ||
    subscription?.metadata?.email ||
    await fetchCustomerEmail(stripe, session.customer)

  if (!email) {
    throw new Error('Unable to determine email for completed Stripe checkout')
  }

  const tier = resolveTierFromStripePriceId(priceId, metadataTier)
  await syncStripeEntitlement(supabase, {
    userId,
    email,
    tier,
    customerId,
    subscriptionId: subscription?.id || (typeof session.subscription === 'string' ? session.subscription : null),
    status: subscription?.status || 'active',
    currentPeriodStart: subscription?.current_period_start
      ? new Date(subscription.current_period_start * 1000).toISOString()
      : new Date().toISOString(),
    currentPeriodEnd: subscription?.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
    cancelAtPeriodEnd: subscription?.cancel_at_period_end || false,
  })
}

async function handleSubscriptionUpsert(supabase: any, stripe: Stripe, subscription: Stripe.Subscription) {
  const priceId = subscription.items?.data?.[0]?.price?.id
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id
  const email = subscription.metadata?.email || await fetchCustomerEmail(stripe, subscription.customer)
  const tier = resolveTierFromStripePriceId(priceId, subscription.metadata?.tier)

  if (!email) {
    throw new Error(`Unable to determine email for subscription ${subscription.id}`)
  }

  await syncStripeEntitlement(supabase, {
    userId: subscription.metadata?.user_id || null,
    email,
    tier,
    customerId,
    subscriptionId: subscription.id,
    status: subscription.status,
    currentPeriodStart: subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000).toISOString()
      : null,
    currentPeriodEnd: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
  })
}

async function handleSubscriptionCanceled(supabase: any, stripe: Stripe, subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id
  const email = subscription.metadata?.email || await fetchCustomerEmail(stripe, subscription.customer)

  if (!email) {
    throw new Error(`Unable to determine email for canceled subscription ${subscription.id}`)
  }

  await syncStripeEntitlement(supabase, {
    userId: subscription.metadata?.user_id || null,
    email,
    tier: 'free',
    customerId,
    subscriptionId: subscription.id,
    status: 'canceled',
    currentPeriodStart: subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000).toISOString()
      : null,
    currentPeriodEnd: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
  })
}

async function handleInvoicePaid(supabase: any, invoice: any) {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
  const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id

  try {
    await supabase.from('payment_logs').insert({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      amount_cents: invoice.amount_paid,
      currency: invoice.currency,
      status: 'paid',
      invoice_id: invoice.id,
      created_at: new Date().toISOString()
    })
  } catch (error) {
    console.log('Payment log insert failed:', error)
  }

  if (customerId) {
    await supabase
      .from('user_subscriptions')
      .update({
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_customer_id', customerId)
  }
}

async function handlePaymentFailed(supabase: any, invoice: any) {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
  const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id

  if (customerId) {
    await supabase
      .from('user_subscriptions')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_customer_id', customerId)
  }

  try {
    await supabase.from('payment_logs').insert({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      amount_cents: invoice.amount_due,
      currency: invoice.currency,
      status: 'failed',
      invoice_id: invoice.id,
      created_at: new Date().toISOString()
    })
  } catch (error) {
    console.log('Payment failure log insert failed:', error)
  }
}
