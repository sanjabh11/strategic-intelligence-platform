// Whop Authentication Hook
// React hook for managing Whop authentication and subscription state
// Supports both Whop and Stripe (academic) checkout flows

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
    PRICING_TIERS,
    ACADEMIC_TIER,
    getTierById,
    isAcademicEmail,
    getWhopAuthUrl,
    getWhopBillingPortalUrl,
    type WhopPricingTier,
    type TierLimits
} from '../lib/whop-config';

export interface WhopSession {
    userId: string;
    whopUserId: string;
    email: string;
    tier: WhopPricingTier;
    status: 'active' | 'past_due' | 'canceled' | 'trialing';
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    isAcademic: boolean;
}

export interface UseWhopAuthReturn {
    // State
    session: WhopSession | null;
    loading: boolean;
    error: string | null;

    // Current tier info
    currentTier: WhopPricingTier;
    limits: TierLimits;

    // Quick checks
    isAuthenticated: boolean;
    isPaid: boolean;
    isElite: boolean;
    isEnterprise: boolean;
    isAcademic: boolean;

    // Actions
    loginWithWhop: () => void;
    loginWithStripe: (email: string) => Promise<void>;
    logout: () => Promise<void>;
    openBillingPortal: () => void;
    refresh: () => Promise<void>;

    // Feature access
    canAccess: (feature: keyof TierLimits) => boolean;
    getLimit: (limit: keyof TierLimits) => number;
    needsUpgrade: (feature: keyof TierLimits) => boolean;
    getUpgradeTier: (feature: keyof TierLimits) => WhopPricingTier | null;
}

export function useWhopAuth(): UseWhopAuthReturn {
    const [session, setSession] = useState<WhopSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch current user session
    const fetchSession = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Get current Supabase user
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                setSession(null);
                return;
            }

            // Get Whop subscription status
            const { data: whopUser, error: whopError } = await supabase
                .from('whop_users')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (whopError && whopError.code !== 'PGRST116') {
                console.error('Error fetching whop user:', whopError);
            }

            // Get subscription from user_subscriptions as fallback
            const { data: subscription } = await supabase
                .from('user_subscriptions')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .single();

            // Determine tier
            const tierId = whopUser?.subscription_tier || subscription?.tier || 'free';
            const tier = getTierById(tierId) || PRICING_TIERS[0];
            const isAcademicUser = isAcademicEmail(user.email || '');

            setSession({
                userId: user.id,
                whopUserId: whopUser?.whop_user_id || '',
                email: user.email || '',
                tier: isAcademicUser && tierId !== 'free' ? ACADEMIC_TIER : tier,
                status: whopUser?.subscription_status || subscription?.status || 'active',
                currentPeriodEnd: whopUser?.current_period_end
                    ? new Date(whopUser.current_period_end)
                    : null,
                cancelAtPeriodEnd: whopUser?.cancel_at_period_end || false,
                isAcademic: isAcademicUser
            });
        } catch (err) {
            console.error('Error fetching session:', err);
            setError('Failed to load subscription status');
        } finally {
            setLoading(false);
        }
    }, []);

    // Initialize on mount
    useEffect(() => {
        fetchSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            fetchSession();
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [fetchSession]);

    // Login with Whop OAuth
    const loginWithWhop = useCallback(() => {
        const state = crypto.randomUUID();
        sessionStorage.setItem('whop_auth_state', state);
        window.location.href = getWhopAuthUrl(state);
    }, []);

    // Login with Stripe (for academic users)
    const loginWithStripe = useCallback(async (email: string) => {
        if (!isAcademicEmail(email)) {
            setError('Stripe checkout is only available for academic (.edu) email addresses');
            return;
        }

        // Redirect to Stripe checkout
        window.location.href = `/checkout/stripe?email=${encodeURIComponent(email)}&tier=academic`;
    }, []);

    // Logout
    const logout = useCallback(async () => {
        await supabase.auth.signOut();
        setSession(null);
    }, []);

    // Open billing portal
    const openBillingPortal = useCallback(() => {
        window.open(getWhopBillingPortalUrl(), '_blank');
    }, []);

    // Get current tier (default to free)
    const currentTier = session?.tier || PRICING_TIERS[0];
    const limits = currentTier.limits;

    // Feature access checks
    const canAccess = useCallback((feature: keyof TierLimits): boolean => {
        const value = limits[feature];
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value !== 0;
        return false;
    }, [limits]);

    const getLimit = useCallback((limit: keyof TierLimits): number => {
        const value = limits[limit];
        return typeof value === 'number' ? value : 0;
    }, [limits]);

    const needsUpgrade = useCallback((feature: keyof TierLimits): boolean => {
        return !canAccess(feature);
    }, [canAccess]);

    const getUpgradeTier = useCallback((feature: keyof TierLimits): WhopPricingTier | null => {
        if (canAccess(feature)) return null;

        // Find lowest tier that has this feature
        for (const tier of PRICING_TIERS) {
            const value = tier.limits[feature];
            if (typeof value === 'boolean' && value) return tier;
            if (typeof value === 'number' && value !== 0) return tier;
        }
        return null;
    }, [canAccess]);

    return {
        // State
        session,
        loading,
        error,

        // Current tier info
        currentTier,
        limits,

        // Quick checks
        isAuthenticated: !!session,
        isPaid: !!session && session.tier.priceMonthly > 0,
        isElite: session?.tier.id === 'elite',
        isEnterprise: session?.tier.id === 'enterprise',
        isAcademic: session?.isAcademic || false,

        // Actions
        loginWithWhop,
        loginWithStripe,
        logout,
        openBillingPortal,
        refresh: fetchSession,

        // Feature access
        canAccess,
        getLimit,
        needsUpgrade,
        getUpgradeTier
    };
}

export default useWhopAuth;
