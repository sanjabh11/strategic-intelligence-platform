// Stripe Checkout Session Creator
// Edge Function to create Stripe checkout sessions for academic users
// Fallback payment method for .edu email addresses

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Price IDs - configure these in Stripe Dashboard
const TIER_PRICE_MAP: Record<string, string> = {
    'academic': Deno.env.get('STRIPE_ACADEMIC_PRICE_ID') || 'price_academic_monthly',
    'pro': Deno.env.get('STRIPE_PRO_PRICE_ID') || 'price_pro_monthly',
    'elite': Deno.env.get('STRIPE_ELITE_PRICE_ID') || 'price_elite_monthly',
    'enterprise': Deno.env.get('STRIPE_ENTERPRISE_PRICE_ID') || 'price_enterprise_monthly'
};

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeSecretKey) {
            throw new Error("Stripe secret key not configured");
        }

        const stripe = new Stripe(stripeSecretKey, {
            apiVersion: "2023-10-16",
            httpClient: Stripe.createFetchHttpClient(),
        });

        const { email, tier, successUrl, cancelUrl } = await req.json();

        // Validate academic email
        const eduDomains = ['.edu', '.ac.uk', '.edu.au', '.edu.in', '.ac.nz', '.edu.sg'];
        const isAcademic = eduDomains.some(domain => email.toLowerCase().endsWith(domain));

        if (tier === 'academic' && !isAcademic) {
            return new Response(
                JSON.stringify({ error: "Academic pricing requires a .edu email address" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const priceId = TIER_PRICE_MAP[tier];
        if (!priceId) {
            return new Response(
                JSON.stringify({ error: "Invalid tier" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            customer_email: email,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: successUrl,
            cancel_url: cancelUrl,
            allow_promotion_codes: true,
            billing_address_collection: 'required',
            metadata: {
                tier,
                email,
                is_academic: isAcademic ? 'true' : 'false'
            },
            subscription_data: {
                metadata: {
                    tier,
                    is_academic: isAcademic ? 'true' : 'false'
                }
            }
        });

        return new Response(
            JSON.stringify({
                sessionId: session.id,
                url: session.url
            }),
            {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
        );
    } catch (error) {
        console.error("Stripe checkout error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
