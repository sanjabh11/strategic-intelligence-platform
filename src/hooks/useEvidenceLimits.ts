// Evidence Limits Hook
// Enforces tier-based evidence source limits per Whop monetization strategy
// Basic: 5 sources, Pro: 20 sources, Elite: Unlimited

import { useCallback, useMemo } from 'react';
import { useSubscription, SubscriptionTier } from './useSubscription';

export interface EvidenceLimits {
  maxSources: number;
  maxSourcesPerProvider: number;
  providers: string[];
  canUsePremiumProviders: boolean;
  isUnlimited: boolean;
}

// Evidence limits per Whop tier
const TIER_EVIDENCE_LIMITS: Record<'basic' | 'pro' | 'elite', EvidenceLimits> = {
  basic: {
    maxSources: 5,
    maxSourcesPerProvider: 2,
    providers: ['google_cse'], // Basic only gets Google CSE
    canUsePremiumProviders: false,
    isUnlimited: false
  },
  pro: {
    maxSources: 20,
    maxSourcesPerProvider: 8,
    providers: ['google_cse', 'perplexity', 'crossref', 'gdelt'],
    canUsePremiumProviders: true,
    isUnlimited: false
  },
  elite: {
    maxSources: -1, // Unlimited
    maxSourcesPerProvider: -1,
    providers: ['google_cse', 'perplexity', 'crossref', 'gdelt', 'firecrawl'],
    canUsePremiumProviders: true,
    isUnlimited: true
  }
};

// Map subscription tiers to Whop tiers
const mapToWhopTier = (tier: SubscriptionTier): 'basic' | 'pro' | 'elite' => {
  switch (tier) {
    case 'free':
    case 'analyst':
      return 'basic';
    case 'pro':
    case 'academic':
      return 'pro';
    case 'enterprise':
      return 'elite';
    default:
      return 'basic';
  }
};

export function useEvidenceLimits(userId?: string) {
  const { currentTier, loading } = useSubscription(userId);
  const whopTier = mapToWhopTier(currentTier);

  const limits = useMemo(() => {
    return TIER_EVIDENCE_LIMITS[whopTier];
  }, [whopTier]);

  // Check if a specific provider is available
  const canUseProvider = useCallback((provider: string): boolean => {
    return limits.providers.includes(provider.toLowerCase());
  }, [limits]);

  // Filter sources based on tier limits
  const filterSources = useCallback(<T extends { source?: string }>(sources: T[]): T[] => {
    if (limits.isUnlimited) return sources;

    // Filter by allowed providers
    const filteredByProvider = sources.filter(s => 
      !s.source || limits.providers.includes(s.source.toLowerCase())
    );

    // Apply max sources limit
    return filteredByProvider.slice(0, limits.maxSources);
  }, [limits]);

  // Get remaining sources allowed
  const getRemainingSourcesAllowed = useCallback((currentCount: number): number => {
    if (limits.isUnlimited) return Infinity;
    return Math.max(0, limits.maxSources - currentCount);
  }, [limits]);

  // Check if at limit
  const isAtLimit = useCallback((currentCount: number): boolean => {
    if (limits.isUnlimited) return false;
    return currentCount >= limits.maxSources;
  }, [limits]);

  // Get upgrade message based on current tier
  const getUpgradeMessage = useCallback((): string | null => {
    if (whopTier === 'elite') return null;
    
    if (whopTier === 'basic') {
      return 'Upgrade to Pro for 20 sources from 4 providers, or Elite for unlimited access.';
    }
    
    return 'Upgrade to Elite for unlimited sources and Firecrawl deep research.';
  }, [whopTier]);

  return {
    // Current tier info
    whopTier,
    limits,
    loading,

    // Limit checks
    canUseProvider,
    filterSources,
    getRemainingSourcesAllowed,
    isAtLimit,
    getUpgradeMessage,

    // Quick access
    maxSources: limits.maxSources,
    isUnlimited: limits.isUnlimited,
    availableProviders: limits.providers
  };
}

export default useEvidenceLimits;
