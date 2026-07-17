import Stripe from "https://esm.sh/stripe@14.5.0";
import { buildCorsHeaders, getAuthenticatedUser, jsonResponse } from "../_shared/auth.ts";
import { isStripeTierAllowed, normalizeCanonicalTier } from "../_shared/monetization.ts";

const corsHeaders = {
    ...buildCorsHeaders(),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TIER_PRICE_ENV_MAP: Record<string, string> = {
    academic: "STRIPE_ACADEMIC_PRICE_ID",
    pro: "STRIPE_PRO_PRICE_ID",
    elite: "STRIPE_ELITE_PRICE_ID",
    enterprise: "STRIPE_ENTERPRISE_PRICE_ID",
};

const EDU_DOMAINS = ['.edu', '.ac.uk', '.edu.au', '.edu.in', '.ac.nz', '.edu.sg'];

function isAcademicEmail(email: string) {
    const lowered = email.toLowerCase();
    return EDU_DOMAINS.some((domain) => lowered.endsWith(domain));
}

function sanitizeRedirectUrl(candidate: string | undefined, fallbackPath: string, origin: string) {
    const fallback = new URL(fallbackPath, origin);
    if (!candidate) return fallback.toString();

    try {
        const parsed = new URL(candidate);
        if (parsed.origin !== origin) {
            return fallback.toString();
        }
        return parsed.toString();
    } catch {
        return fallback.toString();
    }
}

function getStripePriceIdForTier(tier: string) {
    const envKey = TIER_PRICE_ENV_MAP[tier];
    if (!envKey) {
        throw new Error(`Unsupported Stripe tier: ${tier}`);
    }

    const priceId = Deno.env.get(envKey);
    if (!priceId) {
        throw new Error(`${envKey} is not configured`);
    }

    return priceId;
}

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
        if (!stripeSecretKey) {
            throw new Error("Stripe secret key not configured");
        }

        const stripe = new Stripe(stripeSecretKey, {
            apiVersion: "2023-10-16",
            httpClient: Stripe.createFetchHttpClient(),
        });

        const payload = await req.json();
        const requestedEmail = typeof payload?.email === "string" ? payload.email.toLowerCase() : "";
        const tier = normalizeCanonicalTier(payload?.tier);
        const userEmail = user.email?.toLowerCase() || "";

        if (!userEmail) {
            return jsonResponse(400, { error: "Authenticated user is missing an email address" }, corsHeaders);
        }

        if (requestedEmail && requestedEmail !== userEmail) {
            return jsonResponse(403, { error: "Authenticated user email does not match checkout email" }, corsHeaders);
        }

        if (!isStripeTierAllowed(tier)) {
            return jsonResponse(403, { error: "Stripe checkout is not enabled for this tier" }, corsHeaders);
        }

        if (tier === "academic" && !isAcademicEmail(userEmail)) {
            return jsonResponse(400, { error: "Academic pricing requires a .edu email address" }, corsHeaders);
        }

        const priceId = getStripePriceIdForTier(tier);

        const requestOrigin = req.headers.get("origin") || Deno.env.get("APP_URL") || "http://localhost:5173";
        const successUrl = sanitizeRedirectUrl(payload?.successUrl, "/checkout/stripe?success=true&session_id={CHECKOUT_SESSION_ID}", requestOrigin);
        const cancelUrl = sanitizeRedirectUrl(payload?.cancelUrl, "/pricing", requestOrigin);

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            customer_email: userEmail,
            client_reference_id: user.id,
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
                user_id: user.id,
                tier,
                email: userEmail,
                price_id: priceId,
                is_academic: tier === 'academic' ? 'true' : 'false'
            },
            subscription_data: {
                metadata: {
                    user_id: user.id,
                    tier,
                    email: userEmail,
                    price_id: priceId,
                    is_academic: tier === 'academic' ? 'true' : 'false'
                }
            }
        });

        return jsonResponse(200, {
            sessionId: session.id,
            url: session.url
        }, corsHeaders);
    } catch (error) {
        console.error("Stripe checkout error:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return jsonResponse(500, { error: message }, corsHeaders);
    }
});
