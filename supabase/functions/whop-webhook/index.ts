import { createClient } from "npm:@supabase/supabase-js@2";
import { normalizeCanonicalTier, normalizeSubscriptionStatus, syncWhopEntitlement } from "../_shared/monetization.ts";
import { isLocalWebhookDevelopment, verifyWhopSignature } from "../_shared/webhook-signatures.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || Deno.env.get("APP_URL") || "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, webhook-id, webhook-signature, webhook-timestamp",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface WhopWebhookPayload {
    event?: string;
    type?: string;
    data: {
        id: string;
        user_id?: string;
        product_id?: string;
        plan_id?: string;
        status?: string;
        current_period_start?: string;
        current_period_end?: string;
        cancel_at_period_end?: boolean;
        membership_id?: string;
        metadata?: Record<string, string>;
        user?: {
            id: string;
            email?: string;
            username?: string;
        };
        customer?: {
            id?: string;
            email?: string;
        };
    };
    created_at?: string;
}

const PLAN_TIER_MAP: Record<string, string> = {
    plan_free: 'free',
    plan_basic_monthly: 'free',
    plan_pro_monthly: 'pro',
    plan_elite_monthly: 'elite',
    plan_enterprise_monthly: 'enterprise'
};

function getPayloadEvent(payload: WhopWebhookPayload) {
    return payload.type || payload.event || ''
}

function resolveTier(planId?: string | null) {
    return normalizeCanonicalTier(planId ? PLAN_TIER_MAP[planId] || planId : 'free')
}

function resolveEmail(data: WhopWebhookPayload['data']) {
    return data.user?.email || data.customer?.email || data.metadata?.email || null
}

// WEBHOOK: Signature verification required, not user auth
Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const webhookSecret = Deno.env.get("WHOP_WEBHOOK_SECRET");

        if (!webhookSecret && !isLocalWebhookDevelopment()) {
            throw new Error("WHOP_WEBHOOK_SECRET is not configured");
        }

        const rawBody = await req.text();
        if (webhookSecret) {
            const verification = await verifyWhopSignature(rawBody, req.headers, webhookSecret);
            if (!verification.ok) {
                return new Response(JSON.stringify({ error: "Invalid signature", details: verification.error }), {
                    status: 401,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }
        }

        const payload: WhopWebhookPayload = JSON.parse(rawBody);
        const event = getPayloadEvent(payload);
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        switch (event) {
            case "membership.created":
            case "membership.activated":
                await handleMembershipUpsert(supabase, payload.data, 'active');
                break;
            case "membership.updated":
            case "membership.cancel_at_period_end_changed":
                await handleMembershipUpsert(supabase, payload.data, payload.data.status);
                break;
            case "membership.canceled":
            case "membership.cancelled":
            case "membership.deactivated":
            case "membership.expired":
                await handleMembershipCanceled(supabase, payload.data);
                break;
            case "payment.succeeded":
            case "invoice.paid":
                await handlePaymentSucceeded(supabase, payload.data);
                break;
            case "payment.failed":
            case "invoice.past_due":
                await handlePaymentFailed(supabase, payload.data);
                break;
            default:
                console.log("Unhandled Whop event type:", event);
        }

        return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    } catch (error) {
        console.error("Whop webhook error:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});

async function handleMembershipUpsert(supabase: any, data: WhopWebhookPayload["data"], overrideStatus?: string) {
    const tier = resolveTier(data.plan_id);
    const email = resolveEmail(data);

    await syncWhopEntitlement(supabase, {
        email,
        whopUserId: data.user_id || data.user?.id || data.id,
        membershipId: data.id,
        planId: data.plan_id,
        tier,
        status: overrideStatus || data.status || 'active',
        currentPeriodStart: data.current_period_start || null,
        currentPeriodEnd: data.current_period_end || null,
        cancelAtPeriodEnd: data.cancel_at_period_end || false,
    });
}

async function handleMembershipCanceled(supabase: any, data: WhopWebhookPayload["data"]) {
    const email = resolveEmail(data);

    await syncWhopEntitlement(supabase, {
        email,
        whopUserId: data.user_id || data.user?.id || data.id,
        membershipId: data.id,
        planId: data.plan_id,
        tier: 'free',
        status: 'canceled',
        currentPeriodStart: data.current_period_start || null,
        currentPeriodEnd: data.current_period_end || null,
        cancelAtPeriodEnd: data.cancel_at_period_end || false,
    });
}

async function handlePaymentSucceeded(supabase: any, data: WhopWebhookPayload["data"]) {
    const membershipId = data.membership_id || data.id;
    if (!membershipId) return;

    const { data: membership } = await supabase
        .from('whop_users')
        .select('user_id, subscription_tier, whop_email, whop_user_id, plan_id, current_period_start, current_period_end, cancel_at_period_end')
        .eq('whop_membership_id', membershipId)
        .single();

    if (!membership) return;

    await syncWhopEntitlement(supabase, {
        userId: membership.user_id,
        email: membership.whop_email,
        whopUserId: membership.whop_user_id,
        membershipId,
        planId: membership.plan_id,
        tier: membership.subscription_tier,
        status: 'active',
        currentPeriodStart: membership.current_period_start,
        currentPeriodEnd: membership.current_period_end,
        cancelAtPeriodEnd: membership.cancel_at_period_end,
    });
}

async function handlePaymentFailed(supabase: any, data: WhopWebhookPayload["data"]) {
    const membershipId = data.membership_id || data.id;
    if (!membershipId) return;

    const { data: membership } = await supabase
        .from('whop_users')
        .select('user_id, subscription_tier, whop_email, whop_user_id, plan_id, current_period_start, current_period_end, cancel_at_period_end')
        .eq('whop_membership_id', membershipId)
        .single();

    if (!membership) return;

    await syncWhopEntitlement(supabase, {
        userId: membership.user_id,
        email: membership.whop_email,
        whopUserId: membership.whop_user_id,
        membershipId,
        planId: membership.plan_id,
        tier: membership.subscription_tier,
        status: normalizeSubscriptionStatus('past_due'),
        currentPeriodStart: membership.current_period_start,
        currentPeriodEnd: membership.current_period_end,
        cancelAtPeriodEnd: membership.cancel_at_period_end,
    });
}
