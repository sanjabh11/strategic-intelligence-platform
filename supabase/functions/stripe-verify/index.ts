// Stripe Subscription Verification
// Edge Function to verify Stripe checkout and activate subscription
// Called after successful Stripe checkout redirect

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
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

        // Retrieve checkout session
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['subscription', 'customer']
        });

        if (session.payment_status !== 'paid') {
            throw new Error("Payment not completed");
        }

        const email = session.customer_email;
        const tier = session.metadata?.tier || 'academic';
        const subscription = session.subscription as Stripe.Subscription;

        if (!email) {
            throw new Error("No email in session");
        }

        // Find or create user
        let userId: string | null = null;

        // Check if user exists
        const { data: existingUser } = await supabase
            .from('auth.users')
            .select('id')
            .eq('email', email)
            .single();

        if (existingUser) {
            userId = existingUser.id;
        }

        // Create/update whop_users entry for Stripe subscription
        const whopUserData = {
            whop_user_id: `stripe_${session.customer}`,
            whop_email: email,
            user_id: userId,
            subscription_tier: tier,
            subscription_status: 'active',
            plan_id: `stripe_${tier}`,
            payment_provider: 'stripe',
            current_period_start: subscription
                ? new Date(subscription.current_period_start * 1000).toISOString()
                : new Date().toISOString(),
            current_period_end: subscription
                ? new Date(subscription.current_period_end * 1000).toISOString()
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            cancel_at_period_end: subscription?.cancel_at_period_end || false,
            updated_at: new Date().toISOString()
        };

        const { error: upsertError } = await supabase
            .from('whop_users')
            .upsert(whopUserData, {
                onConflict: 'whop_email'
            });

        if (upsertError) {
            console.error("Error upserting whop user:", upsertError);
            // Don't throw - payment succeeded, log for manual review
        }

        // Update user_subscriptions if we have a user
        if (userId) {
            const { error: subError } = await supabase
                .from('user_subscriptions')
                .upsert({
                    user_id: userId,
                    tier,
                    status: 'active',
                    stripe_subscription_id: subscription?.id,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                });

            if (subError) {
                console.error("Error updating subscription:", subError);
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                email,
                tier,
                subscription_id: subscription?.id
            }),
            {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
        );
    } catch (error) {
        console.error("Stripe verification error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
