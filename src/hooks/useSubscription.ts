// Subscription Management Hook
// Manages user subscription state, tier limits, and usage tracking
// Part of Monetization Strategy Implementation

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type SubscriptionTier = 'free' | 'analyst' | 'pro' | 'enterprise' | 'academic';

export interface TierLimits {
  tier: SubscriptionTier;
  displayName: string;
  priceMonthly: number;
  priceYearly: number;
  maxAnalysesPerDay: number;
  maxMatrixSize: number;
  maxPlayers: number;
  maxScenariosSaved: number;
  maxTemplatesAccess: number;
  canExportCsv: boolean;
  canExportPdf: boolean;
  canUseApi: boolean;
  canAccessGoldModule: boolean;
  canAccessSequentialGames: boolean;
  canAccessMonteCarlo: boolean;
  canAccessRealTimeData: boolean;
  canCollaborate: boolean;
  canCreatePrivateRooms: boolean;
  canWhiteLabel: boolean;
  supportLevel: string;
  // Whop-aligned tier flags
  canAccessLabs: boolean;
  canAccessForecasting: boolean;
  canAccessIntel: boolean;
}

export interface UserSubscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused';
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface UsageStatus {
  allowed: boolean;
  tier: SubscriptionTier;
  currentUsage?: number;
  maxAllowed?: number;
  remaining?: number;
  unlimited?: boolean;
}

const TIER_DISPLAY_INFO: Record<SubscriptionTier, { name: string; color: string; icon: string }> = {
  free: { name: 'Free', color: 'gray', icon: '🆓' },
  analyst: { name: 'Analyst', color: 'blue', icon: '📊' },
  pro: { name: 'Professional', color: 'purple', icon: '⚡' },
  enterprise: { name: 'Enterprise', color: 'gold', icon: '🏢' },
  academic: { name: 'Academic', color: 'green', icon: '🎓' }
};

export function useSubscription(userId?: string) {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [tierLimits, setTierLimits] = useState<TierLimits | null>(null);
  const [allTiers, setAllTiers] = useState<TierLimits[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's subscription
  const fetchSubscription = useCallback(async () => {
    if (!userId) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (data) {
        setSubscription({
          id: data.id,
          userId: data.user_id,
          tier: data.tier as SubscriptionTier,
          status: data.status,
          currentPeriodStart: data.current_period_start,
          currentPeriodEnd: data.current_period_end,
          cancelAtPeriodEnd: data.cancel_at_period_end
        });
      } else {
        // Default to free tier
        setSubscription({
          id: '',
          userId: userId,
          tier: 'free',
          status: 'active',
          currentPeriodStart: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false
        });
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError('Failed to load subscription');
    }
  }, [userId]);

  // Fetch tier limits
  const fetchTierLimits = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('tier_limits')
        .select('*')
        .order('price_monthly_cents', { ascending: true });

      if (fetchError) throw fetchError;

      const mapped = (data || []).map(row => ({
        tier: row.tier as SubscriptionTier,
        displayName: row.display_name,
        priceMonthly: row.price_monthly_cents / 100,
        priceYearly: row.price_yearly_cents / 100,
        maxAnalysesPerDay: row.max_analyses_per_day,
        maxMatrixSize: row.max_matrix_size,
        maxPlayers: row.max_players,
        maxScenariosSaved: row.max_scenarios_saved,
        maxTemplatesAccess: row.max_templates_access,
        canExportCsv: row.can_export_csv,
        canExportPdf: row.can_export_pdf,
        canUseApi: row.can_use_api,
        canAccessGoldModule: row.can_access_gold_module,
        canAccessSequentialGames: row.can_access_sequential_games,
        canAccessMonteCarlo: row.can_access_monte_carlo,
        canAccessRealTimeData: row.can_access_real_time_data,
        canCollaborate: row.can_collaborate,
        canCreatePrivateRooms: row.can_create_private_rooms,
        canWhiteLabel: row.can_white_label,
        supportLevel: row.support_level,
        // Whop-aligned tier flags
        canAccessLabs: row.can_access_labs ?? false,
        canAccessForecasting: row.can_access_forecasting ?? false,
        canAccessIntel: row.can_access_intel ?? false
      }));

      setAllTiers(mapped);

      // Set current tier limits
      const currentTier = subscription?.tier || 'free';
      const currentLimits = mapped.find(t => t.tier === currentTier);
      setTierLimits(currentLimits || null);
    } catch (err) {
      console.error('Error fetching tier limits:', err);
    }
  }, [subscription?.tier]);

  // Check if user can perform action
  const checkLimit = useCallback(async (action: string): Promise<UsageStatus> => {
    if (!userId) {
      return { allowed: false, tier: 'free' };
    }

    try {
      const { data, error: rpcError } = await supabase.rpc('check_tier_limit', {
        p_user_id: userId,
        p_action: action,
        p_increment: 0 // Just checking, not incrementing
      });

      if (rpcError) throw rpcError;

      return data as UsageStatus;
    } catch (err) {
      console.error('Error checking limit:', err);
      return { allowed: false, tier: subscription?.tier || 'free' };
    }
  }, [userId, subscription?.tier]);

  // Increment usage (call when action is performed)
  const incrementUsage = useCallback(async (action: string, amount: number = 1): Promise<UsageStatus> => {
    if (!userId) {
      return { allowed: false, tier: 'free' };
    }

    try {
      const { data, error: rpcError } = await supabase.rpc('check_tier_limit', {
        p_user_id: userId,
        p_action: action,
        p_increment: amount
      });

      if (rpcError) throw rpcError;

      return data as UsageStatus;
    } catch (err) {
      console.error('Error incrementing usage:', err);
      return { allowed: false, tier: subscription?.tier || 'free' };
    }
  }, [userId, subscription?.tier]);

  // Check if specific feature is available
  const hasFeature = useCallback((feature: keyof TierLimits): boolean => {
    if (!tierLimits) return false;
    const value = tierLimits[feature];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    return true;
  }, [tierLimits]);

  // Get tier display info
  const getTierInfo = useCallback((tier?: SubscriptionTier) => {
    const t = tier || subscription?.tier || 'free';
    return TIER_DISPLAY_INFO[t];
  }, [subscription?.tier]);

  // Check if user needs upgrade for feature
  const needsUpgradeFor = useCallback((feature: keyof TierLimits): SubscriptionTier | null => {
    if (hasFeature(feature)) return null;

    // Find lowest tier that has this feature
    for (const tier of allTiers) {
      const value = tier[feature];
      if (typeof value === 'boolean' && value) return tier.tier;
      if (typeof value === 'number' && value !== 0) return tier.tier;
    }
    return 'enterprise';
  }, [hasFeature, allTiers]);

  // Get upgrade options
  const getUpgradeOptions = useCallback(() => {
    const currentTierIndex = allTiers.findIndex(t => t.tier === subscription?.tier);
    return allTiers.slice(currentTierIndex + 1);
  }, [allTiers, subscription?.tier]);

  // Initialize
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchSubscription();
      await fetchTierLimits();
      setLoading(false);
    };
    init();
  }, [fetchSubscription, fetchTierLimits]);

  // Update tier limits when subscription changes
  useEffect(() => {
    if (subscription && allTiers.length > 0) {
      const limits = allTiers.find(t => t.tier === subscription.tier);
      setTierLimits(limits || null);
    }
  }, [subscription, allTiers]);

  return {
    // State
    subscription,
    tierLimits,
    allTiers,
    loading,
    error,
    
    // Current tier shortcuts
    currentTier: subscription?.tier || 'free',
    isFreeTier: subscription?.tier === 'free',
    isPaidTier: subscription?.tier !== 'free',
    isEnterprise: subscription?.tier === 'enterprise',
    
    // Actions
    checkLimit,
    incrementUsage,
    hasFeature,
    needsUpgradeFor,
    getUpgradeOptions,
    getTierInfo,
    
    // Refresh
    refresh: async () => {
      await fetchSubscription();
      await fetchTierLimits();
    }
  };
}

export default useSubscription;
