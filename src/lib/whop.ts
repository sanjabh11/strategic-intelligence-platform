// Whop Integration Utilities
// Monetization Feature F6: Dynamic License Management
// Provides Whop SDK-compatible utilities for license management and subscription validation

// Note: Install @whop/sdk when integrating with actual Whop API
// For now, this provides the interface and mock implementation

export interface WhopUser {
    id: string;
    email: string;
    username: string;
    profilePicUrl?: string;
    createdAt: Date;
}

export interface WhopMembership {
    id: string;
    userId: string;
    productId: string;
    planId: string;
    status: 'active' | 'past_due' | 'canceled' | 'trialing';
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    metadata?: Record<string, string>;
}

export interface WhopProduct {
    id: string;
    name: string;
    description: string;
    visibility: 'visible' | 'hidden' | 'archived';
    createdAt: Date;
}

export interface WhopPlan {
    id: string;
    productId: string;
    name: string;
    billingPeriod: 'day' | 'week' | 'month' | 'year';
    price: number;
    currency: string;
}

// Tier mapping for Strategy Console
export type WhopTier = 'basic' | 'pro' | 'elite' | 'enterprise';

export interface TierFeatures {
    canAccessLabs: boolean;
    canAccessForecasting: boolean;
    canAccessIntel: boolean;
    maxDailyRuns: number;
    evidenceSources: number;
    monteCarloIterations: number;
    hasSignalAccess: boolean;
    hasMarketplace: boolean;
}

export const TIER_FEATURES: Record<WhopTier, TierFeatures> = {
    basic: {
        canAccessLabs: false,
        canAccessForecasting: false,
        canAccessIntel: false,
        maxDailyRuns: 10,
        evidenceSources: 2,
        monteCarloIterations: 100,
        hasSignalAccess: false,
        hasMarketplace: false
    },
    pro: {
        canAccessLabs: true,
        canAccessForecasting: false,
        canAccessIntel: false,
        maxDailyRuns: 50,
        evidenceSources: 5,
        monteCarloIterations: 1000,
        hasSignalAccess: false,
        hasMarketplace: true
    },
    elite: {
        canAccessLabs: true,
        canAccessForecasting: true,
        canAccessIntel: true,
        maxDailyRuns: -1, // Unlimited
        evidenceSources: 10,
        monteCarloIterations: 10000,
        hasSignalAccess: true,
        hasMarketplace: true
    },
    enterprise: {
        canAccessLabs: true,
        canAccessForecasting: true,
        canAccessIntel: true,
        maxDailyRuns: -1,
        evidenceSources: -1,
        monteCarloIterations: 10000,
        hasSignalAccess: true,
        hasMarketplace: true
    }
};

// Plan ID to Tier mapping (configure these with actual Whop plan IDs)
const PLAN_TIER_MAP: Record<string, WhopTier> = {
    'plan_basic_monthly': 'basic',
    'plan_pro_monthly': 'pro',
    'plan_elite_monthly': 'elite',
    'plan_enterprise_monthly': 'enterprise'
};

/**
 * Validate user's Whop membership and return tier
 * In production, use actual Whop SDK
 */
export async function validateWhopMembership(
    accessToken: string
): Promise<{ valid: boolean; tier: WhopTier | null; membership: WhopMembership | null }> {
    // TODO: Replace with actual Whop SDK call
    // import { WhopSDK } from '@whop/sdk';
    // const sdk = new WhopSDK({ accessToken });
    // const membership = await sdk.memberships.retrieveCurrentMembership();

    // Mock implementation for development
    if (!accessToken || accessToken === '') {
        return { valid: false, tier: null, membership: null };
    }

    // Simulate API call
    const mockMembership: WhopMembership = {
        id: 'mem_' + Math.random().toString(36).substring(7),
        userId: 'usr_' + Math.random().toString(36).substring(7),
        productId: 'prod_strategy_console',
        planId: 'plan_pro_monthly',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false
    };

    const tier = PLAN_TIER_MAP[mockMembership.planId] || 'basic';

    return {
        valid: mockMembership.status === 'active',
        tier,
        membership: mockMembership
    };
}

/**
 * Generate a signed license key for desktop app validation
 */
export function generateLicenseKey(
    userId: string,
    tier: WhopTier,
    expiresAt: Date,
    secretKey: string
): string {
    // Create payload
    const payload = {
        u: userId,
        t: tier,
        e: expiresAt.getTime()
    };

    // Base64 encode payload
    const encodedPayload = btoa(JSON.stringify(payload));

    // Create simple HMAC-like signature (use actual HMAC in production)
    const signatureInput = encodedPayload + secretKey;
    let hash = 0;
    for (let i = 0; i < signatureInput.length; i++) {
        const char = signatureInput.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    const signature = Math.abs(hash).toString(36).substring(0, 8);

    // Format: STRATEGY-{payload}-{signature}
    return `STRATEGY-${encodedPayload}-${signature}`;
}

/**
 * Validate a license key
 */
export function validateLicenseKey(
    licenseKey: string,
    secretKey: string
): { valid: boolean; userId?: string; tier?: WhopTier; expired?: boolean } {
    try {
        const parts = licenseKey.split('-');
        if (parts.length !== 3 || parts[0] !== 'STRATEGY') {
            return { valid: false };
        }

        const encodedPayload = parts[1];
        const providedSignature = parts[2];

        // Verify signature
        const signatureInput = encodedPayload + secretKey;
        let hash = 0;
        for (let i = 0; i < signatureInput.length; i++) {
            const char = signatureInput.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        const expectedSignature = Math.abs(hash).toString(36).substring(0, 8);

        if (providedSignature !== expectedSignature) {
            return { valid: false };
        }

        // Decode payload
        const payload = JSON.parse(atob(encodedPayload));
        const expired = payload.e < Date.now();

        return {
            valid: !expired,
            userId: payload.u,
            tier: payload.t as WhopTier,
            expired
        };
    } catch {
        return { valid: false };
    }
}

/**
 * Get tier features for a user
 */
export function getTierFeatures(tier: WhopTier): TierFeatures {
    return TIER_FEATURES[tier] || TIER_FEATURES.basic;
}

/**
 * Check if user can access a specific feature
 */
export function canAccessFeature(
    tier: WhopTier,
    feature: keyof TierFeatures
): boolean {
    const features = getTierFeatures(tier);
    const value = features[feature];

    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'number') {
        return value !== 0;
    }
    return false;
}

/**
 * Hook-compatible subscription check result
 */
export interface UseWhopSubscriptionResult {
    isLoading: boolean;
    isAuthenticated: boolean;
    tier: WhopTier;
    features: TierFeatures;
    membership: WhopMembership | null;
    error: string | null;
}

/**
 * Default export for module
 */
export default {
    validateWhopMembership,
    generateLicenseKey,
    validateLicenseKey,
    getTierFeatures,
    canAccessFeature,
    TIER_FEATURES,
    PLAN_TIER_MAP
};
