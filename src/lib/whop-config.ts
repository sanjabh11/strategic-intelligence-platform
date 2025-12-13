// Whop Platform Configuration
// Central configuration for Whop integration with Strategic Intelligence Platform
// Updated pricing: $0 / $19 / $49 / $199 with Stripe fallback for .edu

export interface WhopConfig {
    appId: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    webhookSecret: string;
}

export interface WhopPricingTier {
    id: string;
    name: string;
    whopPlanId: string;
    stripePriceId: string;
    priceMonthly: number;
    priceYearly: number;
    features: string[];
    limits: TierLimits;
    badge: {
        icon: string;
        color: string;
        gradient: string;
    };
}

export interface TierLimits {
    maxDailyRuns: number;
    maxMatrixSize: number;
    maxPlayers: number;
    maxScenariosSaved: number;
    evidenceSources: number;
    monteCarloIterations: number;
    canAccessLabs: boolean;
    canAccessForecasting: boolean;
    canAccessIntel: boolean;
    canAccessGoldModule: boolean;
    canAccessGameTree: boolean;
    canAccessNegotiationDojo: boolean;
    canAccessWarRoom: boolean;
    canAccessMarketplace: boolean;
    canAccessTradingSignals: boolean;
    canAccessBiasProfile: boolean;
    canExportPdf: boolean;
    canUseApi: boolean;
    canCollaborate: boolean;
    canWhiteLabel: boolean;
}

// Whop App Configuration (set in environment variables)
export const WHOP_CONFIG: WhopConfig = {
    appId: import.meta.env.VITE_WHOP_APP_ID || '',
    clientId: import.meta.env.VITE_WHOP_CLIENT_ID || '',
    clientSecret: import.meta.env.VITE_WHOP_CLIENT_SECRET || '', // Server-side only
    redirectUri: import.meta.env.VITE_WHOP_REDIRECT_URI || `${window.location.origin}/auth/whop/callback`,
    webhookSecret: import.meta.env.VITE_WHOP_WEBHOOK_SECRET || '' // Server-side only
};

// Stripe fallback configuration
export const STRIPE_CONFIG = {
    publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
    academicDiscountPercent: 30, // 30% discount for .edu emails
    enabledForEdu: true
};

// Updated Pricing Tiers: $0 / $19 / $49 / $199
export const PRICING_TIERS: WhopPricingTier[] = [
    {
        id: 'free',
        name: 'Free',
        whopPlanId: 'plan_free',
        stripePriceId: '', // No Stripe price for free
        priceMonthly: 0,
        priceYearly: 0,
        features: [
            '2x2 Payoff Matrices',
            '5 analyses per day',
            'Student & Learner modes',
            'Basic evidence retrieval',
            'Community access'
        ],
        limits: {
            maxDailyRuns: 5,
            maxMatrixSize: 2,
            maxPlayers: 2,
            maxScenariosSaved: 3,
            evidenceSources: 2,
            monteCarloIterations: 100,
            canAccessLabs: false,
            canAccessForecasting: false,
            canAccessIntel: false,
            canAccessGoldModule: false,
            canAccessGameTree: false,
            canAccessNegotiationDojo: false,
            canAccessWarRoom: false,
            canAccessMarketplace: false,
            canAccessTradingSignals: false,
            canAccessBiasProfile: false,
            canExportPdf: false,
            canUseApi: false,
            canCollaborate: false,
            canWhiteLabel: false
        },
        badge: {
            icon: '🆓',
            color: 'slate',
            gradient: 'from-slate-500 to-slate-600'
        }
    },
    {
        id: 'pro',
        name: 'Pro',
        whopPlanId: 'plan_pro_monthly',
        stripePriceId: 'price_pro_monthly', // Configure in Stripe dashboard
        priceMonthly: 19,
        priceYearly: 190, // ~17% discount
        features: [
            'Everything in Free',
            'Unlimited matrices up to 5x5',
            '50 analyses per day',
            'All audience modes',
            'Full evidence retrieval (5 sources)',
            '1,000 Monte Carlo iterations',
            'Bias Profile Dashboard',
            'Negotiation Dojo',
            'PDF export',
            'Scenario Marketplace access'
        ],
        limits: {
            maxDailyRuns: 50,
            maxMatrixSize: 5,
            maxPlayers: 5,
            maxScenariosSaved: 25,
            evidenceSources: 5,
            monteCarloIterations: 1000,
            canAccessLabs: true,
            canAccessForecasting: false,
            canAccessIntel: false,
            canAccessGoldModule: false,
            canAccessGameTree: true,
            canAccessNegotiationDojo: true,
            canAccessWarRoom: false,
            canAccessMarketplace: true,
            canAccessTradingSignals: false,
            canAccessBiasProfile: true,
            canExportPdf: true,
            canUseApi: false,
            canCollaborate: false,
            canWhiteLabel: false
        },
        badge: {
            icon: '⚡',
            color: 'blue',
            gradient: 'from-blue-500 to-blue-600'
        }
    },
    {
        id: 'elite',
        name: 'Elite',
        whopPlanId: 'plan_elite_monthly',
        stripePriceId: 'price_elite_monthly',
        priceMonthly: 49,
        priceYearly: 490,
        features: [
            'Everything in Pro',
            'Unlimited analyses',
            'Unlimited matrix size',
            '10,000 Monte Carlo iterations',
            'Gold Forecasting Module',
            'Live Intel Dashboard',
            'Trading Signals (BUY/SELL/HOLD)',
            'Corporate War Room',
            'Game Tree Builder (n-player)',
            'Forecasting Engine',
            'API access',
            'Priority support'
        ],
        limits: {
            maxDailyRuns: -1, // Unlimited
            maxMatrixSize: 10,
            maxPlayers: 10,
            maxScenariosSaved: 100,
            evidenceSources: 10,
            monteCarloIterations: 10000,
            canAccessLabs: true,
            canAccessForecasting: true,
            canAccessIntel: true,
            canAccessGoldModule: true,
            canAccessGameTree: true,
            canAccessNegotiationDojo: true,
            canAccessWarRoom: true,
            canAccessMarketplace: true,
            canAccessTradingSignals: true,
            canAccessBiasProfile: true,
            canExportPdf: true,
            canUseApi: true,
            canCollaborate: true,
            canWhiteLabel: false
        },
        badge: {
            icon: '💎',
            color: 'purple',
            gradient: 'from-purple-500 to-purple-600'
        }
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        whopPlanId: 'plan_enterprise_monthly',
        stripePriceId: 'price_enterprise_monthly',
        priceMonthly: 199,
        priceYearly: 1990,
        features: [
            'Everything in Elite',
            'Unlimited everything',
            'White-label branding',
            'Custom integrations',
            'SSO / SAML authentication',
            'Dedicated account manager',
            'SLA guarantee',
            'Custom training modules',
            'Private scenario library',
            'Team collaboration (10 seats)',
            'Audit logs & compliance'
        ],
        limits: {
            maxDailyRuns: -1,
            maxMatrixSize: -1,
            maxPlayers: -1,
            maxScenariosSaved: -1,
            evidenceSources: -1,
            monteCarloIterations: 10000,
            canAccessLabs: true,
            canAccessForecasting: true,
            canAccessIntel: true,
            canAccessGoldModule: true,
            canAccessGameTree: true,
            canAccessNegotiationDojo: true,
            canAccessWarRoom: true,
            canAccessMarketplace: true,
            canAccessTradingSignals: true,
            canAccessBiasProfile: true,
            canExportPdf: true,
            canUseApi: true,
            canCollaborate: true,
            canWhiteLabel: true
        },
        badge: {
            icon: '👑',
            color: 'amber',
            gradient: 'from-amber-500 to-amber-600'
        }
    }
];

// Academic tier (same as Elite but with .edu discount via Stripe)
export const ACADEMIC_TIER: WhopPricingTier = {
    id: 'academic',
    name: 'Academic',
    whopPlanId: '', // Not on Whop - Stripe only
    stripePriceId: 'price_academic_monthly',
    priceMonthly: 34, // ~30% off Elite ($49)
    priceYearly: 340,
    features: [
        ...PRICING_TIERS.find(t => t.id === 'elite')!.features,
        '30% academic discount (.edu only)',
        'LMS integration support',
        'Classroom mode'
    ],
    limits: PRICING_TIERS.find(t => t.id === 'elite')!.limits,
    badge: {
        icon: '🎓',
        color: 'green',
        gradient: 'from-green-500 to-green-600'
    }
};

// Helper functions
export function getTierById(tierId: string): WhopPricingTier | undefined {
    if (tierId === 'academic') return ACADEMIC_TIER;
    return PRICING_TIERS.find(t => t.id === tierId);
}

export function getTierByWhopPlanId(planId: string): WhopPricingTier | undefined {
    return PRICING_TIERS.find(t => t.whopPlanId === planId);
}

export function isAcademicEmail(email: string): boolean {
    const eduDomains = ['.edu', '.ac.uk', '.edu.au', '.edu.in', '.ac.nz', '.edu.sg'];
    const lowered = email.toLowerCase();
    return eduDomains.some(domain => lowered.endsWith(domain));
}

export function getCheckoutUrl(tierId: string, email?: string): string {
    const tier = getTierById(tierId);
    if (!tier) return '/pricing';

    // Academic users go to Stripe
    if (email && isAcademicEmail(email)) {
        return `/checkout/stripe?tier=academic&email=${encodeURIComponent(email)}`;
    }

    // Free tier - no checkout needed
    if (tier.priceMonthly === 0) {
        return '/signup';
    }

    // Paid tiers go to Whop
    return `https://whop.com/checkout/${tier.whopPlanId}/`;
}

export function getUpgradeOptions(currentTierId: string): WhopPricingTier[] {
    const currentIndex = PRICING_TIERS.findIndex(t => t.id === currentTierId);
    if (currentIndex === -1) return PRICING_TIERS.slice(1); // All paid tiers
    return PRICING_TIERS.slice(currentIndex + 1);
}

// Whop OAuth URLs
export function getWhopAuthUrl(state?: string): string {
    const params = new URLSearchParams({
        client_id: WHOP_CONFIG.clientId,
        redirect_uri: WHOP_CONFIG.redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state: state || crypto.randomUUID()
    });
    return `https://whop.com/oauth/authorize?${params.toString()}`;
}

export function getWhopBillingPortalUrl(): string {
    return 'https://whop.com/portal/billing';
}

export default {
    WHOP_CONFIG,
    STRIPE_CONFIG,
    PRICING_TIERS,
    ACADEMIC_TIER,
    getTierById,
    getTierByWhopPlanId,
    isAcademicEmail,
    getCheckoutUrl,
    getUpgradeOptions,
    getWhopAuthUrl,
    getWhopBillingPortalUrl
};
