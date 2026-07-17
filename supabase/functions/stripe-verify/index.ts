import Stripe from "https://esm.sh/stripe@14.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildCorsHeaders, getAuthenticatedUser, jsonResponse } from "../_shared/auth.ts";
import { resolveTierFromStripePriceId, syncStripeEntitlement } from "../_shared/monetization.ts";

const corsHeaders = {
    ...buildCorsHeaders(),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const user = await getAuthenticatedUser(req);
        if (!user) {
            return jsonResponse(401, { error: "Authentication required" }, corsHeaders);
        }

        const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        if (!stripeSecretKey) {
            throw new Error("Stripe secret key not configured");
        }

        const stripe = new Stripe(stripeSecretKey, {
            apiVersion: "2023-10-16",
            httpClient: Stripe.createFetchHttpClient(),
        });

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { sessionId } = await req.json();

        if (!sessionId) {
            return jsonResponse(400, { error: "sessionId is required" }, corsHeaders);
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['subscription', 'customer']
        });

        if (session.payment_status !== 'paid') {
            throw new Error("Payment not completed");
        }

        const sessionUserId = session.client_reference_id || session.metadata?.user_id;
        if (!sessionUserId || sessionUserId !== user.id) {
            return jsonResponse(403, { error: "Checkout session does not belong to the authenticated user" }, corsHeaders);
        }

        const email = session.customer_email || session.metadata?.email || user.email;
        const subscription = session.subscription as Stripe.Subscription | null;
        const priceId = session.metadata?.price_id || subscription?.items?.data?.[0]?.price?.id;
        const tier = resolveTierFromStripePriceId(priceId, session.metadata?.tier || subscription?.metadata?.tier);

        if (!email) {
            throw new Error("No email found for checkout session");
        }

        await syncStripeEntitlement(supabase, {
            userId: user.id,
            email,
            tier,
            customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
            subscriptionId: subscription?.id || (typeof session.subscription === 'string' ? session.subscription : null),
            status: subscription?.status || 'active',
            currentPeriodStart: subscription?.current_period_start
                ? new Date(subscription.current_period_start * 1000).toISOString()
                : new Date().toISOString(),
            currentPeriodEnd: subscription?.current_period_end
                ? new Date(subscription.current_period_end * 1000).toISOString()
                : null,
            cancelAtPeriodEnd: subscription?.cancel_at_period_end || false,
        });

        return jsonResponse(200, {
            success: true,
            email,
            tier,
            subscription_id: subscription?.id || null
        }, corsHeaders);
    } catch (error) {
        console.error("Stripe verification error:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return jsonResponse(500, { error: message }, corsHeaders);
    }
});
