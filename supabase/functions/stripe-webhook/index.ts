// Stripe Webhook Handler
// Processes subscription events from Stripe
// Part of Monetization Strategy - Core payment processing

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Stripe event types we handle
type StripeEventType = 
  | 'checkout.session.completed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.paid'
  | 'invoice.payment_failed';

interface StripeEvent {
  id: string;
  type: StripeEventType;
  data: {
    object: any;
  };
}

// Map Stripe price IDs to tiers (configure in Stripe dashboard)
const PRICE_TO_TIER: Record<string, string> = {
  'price_analyst_monthly': 'analyst',
  'price_analyst_yearly': 'analyst',
  'price_pro_monthly': 'pro',
  'price_pro_yearly': 'pro',
  'price_enterprise_monthly': 'enterprise',
  'price_enterprise_yearly': 'enterprise',
  'price_academic_monthly': 'academic',
  'price_academic_yearly': 'academic',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get the raw body for signature verification
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    // In production, verify Stripe signature
    // For now, we'll parse the event directly
    // TODO: Add proper Stripe signature verification with stripe-node
    let event: StripeEvent
    try {
      event = JSON.parse(body)
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing Stripe event: ${event.type}`)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        await handleCheckoutCompleted(supabase, session)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object
        await handleSubscriptionUpdate(supabase, subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        await handleSubscriptionCanceled(supabase, subscription)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object
        await handleInvoicePaid(supabase, invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        await handlePaymentFailed(supabase, invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(
      JSON.stringify({ received: true, event_type: event.type }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Webhook error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function handleCheckoutCompleted(supabase: any, session: any) {
  const customerId = session.customer
  const subscriptionId = session.subscription
  const userId = session.client_reference_id || session.metadata?.user_id

  if (!userId) {
    console.error('No user_id found in checkout session')
    return
  }

  // Get subscription details
  // In production, fetch from Stripe API
  const priceId = session.metadata?.price_id || 'price_analyst_monthly'
  const tier = PRICE_TO_TIER[priceId] || 'analyst'

  // Create or update subscription record
  const { error } = await supabase
    .from('user_subscriptions')
    .upsert({
      user_id: userId,
      tier: tier,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    })

  if (error) {
    console.error('Error creating subscription:', error)
    throw error
  }

  console.log(`Subscription created for user ${userId}: ${tier}`)
}

async function handleSubscriptionUpdate(supabase: any, subscription: any) {
  const customerId = subscription.customer
  const subscriptionId = subscription.id
  const status = mapStripeStatus(subscription.status)
  const priceId = subscription.items?.data?.[0]?.price?.id
  const tier = priceId ? (PRICE_TO_TIER[priceId] || 'analyst') : 'analyst'

  // Find user by Stripe customer ID
  const { data: existingSub } = await supabase
    .from('user_subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!existingSub) {
    console.log('No existing subscription found for customer:', customerId)
    return
  }

  // Update subscription
  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      tier: tier,
      status: status,
      stripe_subscription_id: subscriptionId,
      current_period_start: subscription.current_period_start 
        ? new Date(subscription.current_period_start * 1000).toISOString() 
        : null,
      current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_customer_id', customerId)

  if (error) {
    console.error('Error updating subscription:', error)
    throw error
  }

  console.log(`Subscription updated for customer ${customerId}: ${tier} (${status})`)
}

async function handleSubscriptionCanceled(supabase: any, subscription: any) {
  const customerId = subscription.customer

  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      status: 'canceled',
      tier: 'free',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_customer_id', customerId)

  if (error) {
    console.error('Error canceling subscription:', error)
    throw error
  }

  console.log(`Subscription canceled for customer ${customerId}`)
}

async function handleInvoicePaid(supabase: any, invoice: any) {
  const customerId = invoice.customer
  const subscriptionId = invoice.subscription

  // Log payment for analytics
  await supabase
    .from('payment_logs')
    .insert({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      amount_cents: invoice.amount_paid,
      currency: invoice.currency,
      status: 'paid',
      invoice_id: invoice.id,
      created_at: new Date().toISOString()
    })
    .catch((e: Error) => console.log('Payment log insert failed (table may not exist):', e.message))

  // Ensure subscription is active
  await supabase
    .from('user_subscriptions')
    .update({
      status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_customer_id', customerId)

  console.log(`Invoice paid for customer ${customerId}: ${invoice.amount_paid} ${invoice.currency}`)
}

async function handlePaymentFailed(supabase: any, invoice: any) {
  const customerId = invoice.customer

  // Update subscription status
  await supabase
    .from('user_subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_customer_id', customerId)

  // Log failed payment
  await supabase
    .from('payment_logs')
    .insert({
      stripe_customer_id: customerId,
      stripe_subscription_id: invoice.subscription,
      amount_cents: invoice.amount_due,
      currency: invoice.currency,
      status: 'failed',
      invoice_id: invoice.id,
      created_at: new Date().toISOString()
    })
    .catch((e: Error) => console.log('Payment log insert failed:', e.message))

  console.log(`Payment failed for customer ${customerId}`)

  // TODO: Send email notification to user about failed payment
}

function mapStripeStatus(stripeStatus: string): string {
  const statusMap: Record<string, string> = {
    'active': 'active',
    'past_due': 'past_due',
    'canceled': 'canceled',
    'unpaid': 'past_due',
    'trialing': 'trialing',
    'incomplete': 'paused',
    'incomplete_expired': 'canceled',
    'paused': 'paused'
  }
  return statusMap[stripeStatus] || 'active'
}
