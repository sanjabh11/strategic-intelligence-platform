// Labs Catalog
// Defines lab modules and tier-based access control

import type { SubscriptionTier } from '../hooks/useSubscription';

export interface LabModule {
  id: string;
  name: string;
  description: string;
  minTier: 'free' | 'pro' | 'elite' | 'enterprise';
}

const LAB_MODULES: Record<string, LabModule> = {
  negotiation: {
    id: 'negotiation',
    name: 'Negotiation Dojo',
    description: 'Practice negotiation against AI opponents using game-theoretic logic.',
    minTier: 'pro',
  },
  'game-tree': {
    id: 'game-tree',
    name: 'Game Tree Builder',
    description: 'Build and analyze extensive-form game trees with backward induction.',
    minTier: 'pro',
  },
  'bias-profile': {
    id: 'bias-profile',
    name: 'Bias Profile Dashboard',
    description: 'Assess cognitive biases and track your strategic DNA.',
    minTier: 'pro',
  },
  'monte-carlo': {
    id: 'monte-carlo',
    name: 'Monte Carlo Simulator',
    description: 'Run Monte Carlo simulations on strategic scenarios.',
    minTier: 'elite',
  },
};

const TIER_ORDER: Record<string, number> = {
  free: 0,
  analyst: 1,
  pro: 2,
  elite: 3,
  enterprise: 4,
  academic: 2,
};

export function getSurfacedLabModule(moduleId: string): LabModule {
  return (
    LAB_MODULES[moduleId] ?? {
      id: moduleId,
      name: moduleId,
      description: '',
      minTier: 'elite',
    }
  );
}

export function canAccessLabModule(
  tier: string | undefined,
  labModule: LabModule
): boolean {
  if (!tier) return false;
  const tierLevel = TIER_ORDER[tier] ?? 0;
  const requiredLevel = TIER_ORDER[labModule.minTier] ?? 0;
  return tierLevel >= requiredLevel;
}
