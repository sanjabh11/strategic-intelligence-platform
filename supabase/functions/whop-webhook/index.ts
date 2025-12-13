// Whop Webhook Handler
// Supabase Edge Function to handle Whop subscription events
// Syncs Whop membership status with our database

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, whop-signature",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface WhopWebhookPayload {
    event: string;
    data: {
        id: string;
        user_id: string;
        product_id: string;
        plan_id: string;
        status: string;
        current_period_start: string;
        current_period_end: string;
        cancel_at_period_end: boolean;
        metadata?: Record<string, string>;
        user?: {
            id: string;
            email: string;
            username: string;
        };
    };
    created_at: string;
}

// Plan ID to tier mapping
const PLAN_TIER_MAP: Record<string, string> = {
    'plan_free': 'free',
    'plan_pro_monthly': 'pro',
    'plan_elite_monthly': 'elite',
    'plan_enterprise_monthly': 'enterprise'
};

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const webhookSecret = Deno.env.get("WHOP_WEBHOOK_SECRET");

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Verify webhook signature (in production)
        const signature = req.headers.get("whop-signature");
        if (webhookSecret && !verifySignature(await req.clone().text(), signature, webhookSecret)) {
            console.error("Invalid webhook signature");
            return new Response(JSON.stringify({ error: "Invalid signature" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const payload: WhopWebhookPayload = await req.json();
        console.log("Whop webhook received:", payload.event);

        const { event, data } = payload;

        switch (event) {
            case "membership.created":
            case "membership.activated":
                await handleMembershipCreated(supabase, data);
                break;

            case "membership.updated":
                await handleMembershipUpdated(supabase, data);
                break;

            case "membership.canceled":
            case "membership.expired":
                await handleMembershipCanceled(supabase, data);
                break;

            case "payment.succeeded":
                await handlePaymentSucceeded(supabase, data);
                break;

            case "payment.failed":
                await handlePaymentFailed(supabase, data);
                break;

            default:
                console.log("Unhandled event type:", event);
        }

        return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    } catch (error) {
        console.error("Webhook error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});

// Simple signature verification (use actual HMAC in production)
function verifySignature(payload: string, signature: string | null, secret: string): boolean {
    if (!signature) return false;
    // TODO: Implement proper HMAC-SHA256 verification
    // For now, accept all in development
    return true;
}

async function handleMembershipCreated(supabase: any, data: WhopWebhookPayload["data"]) {
    const tier = PLAN_TIER_MAP[data.plan_id] || 'free';

    // Find or create user by Whop user ID
    let userId = null;

    if (data.user?.email) {
        // Try to find existing user by email
        const { data: existingUser } = await supabase
            .from('auth.users')
            .select('id')
            .eq('email', data.user.email)
            .single();

        userId = existingUser?.id;
    }

    // Create or update whop_users mapping
    const { error: upsertError } = await supabase
        .from('whop_users')
        .upsert({
            whop_user_id: data.user_id,
            whop_membership_id: data.id,
            user_id: userId,
            subscription_tier: tier,
            subscription_status: 'active',
            plan_id: data.plan_id,
            current_period_start: data.current_period_start,
            current_period_end: data.current_period_end,
            cancel_at_period_end: data.cancel_at_period_end,
            whop_email: data.user?.email,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'whop_user_id'
        });

    if (upsertError) {
        console.error("Error upserting whop user:", upsertError);
        throw upsertError;
    }

    // If we have a linked app user, update their subscription
    if (userId) {
        await syncUserSubscription(supabase, userId, tier, 'active');
    }

    console.log(`Membership created: ${data.id}, tier: ${tier}`);
}

async function handleMembershipUpdated(supabase: any, data: WhopWebhookPayload["data"]) {
    const tier = PLAN_TIER_MAP[data.plan_id] || 'free';
    const status = data.status === 'active' ? 'active'
        : data.status === 'past_due' ? 'past_due'
            : 'canceled';

    const { error } = await supabase
        .from('whop_users')
        .update({
            subscription_tier: tier,
            subscription_status: status,
            plan_id: data.plan_id,
            current_period_start: data.current_period_start,
            current_period_end: data.current_period_end,
            cancel_at_period_end: data.cancel_at_period_end,
            updated_at: new Date().toISOString()
        })
        .eq('whop_membership_id', data.id);

    if (error) {
        console.error("Error updating whop user:", error);
        throw error;
    }

    // Sync to app user if linked
    const { data: whopUser } = await supabase
        .from('whop_users')
        .select('user_id')
        .eq('whop_membership_id', data.id)
        .single();

    if (whopUser?.user_id) {
        await syncUserSubscription(supabase, whopUser.user_id, tier, status);
    }

    console.log(`Membership updated: ${data.id}, tier: ${tier}, status: ${status}`);
}

async function handleMembershipCanceled(supabase: any, data: WhopWebhookPayload["data"]) {
    const { error } = await supabase
        .from('whop_users')
        .update({
            subscription_status: 'canceled',
            updated_at: new Date().toISOString()
        })
        .eq('whop_membership_id', data.id);

    if (error) {
        console.error("Error canceling membership:", error);
        throw error;
    }

    // Downgrade to free tier in app
    const { data: whopUser } = await supabase
        .from('whop_users')
        .select('user_id')
        .eq('whop_membership_id', data.id)
        .single();

    if (whopUser?.user_id) {
        await syncUserSubscription(supabase, whopUser.user_id, 'free', 'active');
    }

    console.log(`Membership canceled: ${data.id}`);
}

async function handlePaymentSucceeded(supabase: any, data: any) {
    console.log(`Payment succeeded for membership: ${data.membership_id || data.id}`);
    // Could trigger welcome email, grant access, etc.
}

async function handlePaymentFailed(supabase: any, data: any) {
    console.log(`Payment failed for membership: ${data.membership_id || data.id}`);
    // Could trigger dunning email, downgrade access, etc.

    if (data.membership_id) {
        const { error } = await supabase
            .from('whop_users')
            .update({
                subscription_status: 'past_due',
                updated_at: new Date().toISOString()
            })
            .eq('whop_membership_id', data.membership_id);

        if (error) {
            console.error("Error marking payment failed:", error);
        }
    }
}

async function syncUserSubscription(
    supabase: any,
    userId: string,
    tier: string,
    status: string
) {
    // Upsert into user_subscriptions table
    const { error } = await supabase
        .from('user_subscriptions')
        .upsert({
            user_id: userId,
            tier,
            status,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'user_id'
        });

    if (error) {
        console.error("Error syncing user subscription:", error);
        throw error;
    }

    console.log(`Synced user ${userId} to tier ${tier}`);
}
