// Labs Catalog
// Defines lab modules and tier-based access control

import type { SubscriptionTier } from '../hooks/useSubscription';
import { Crown, GraduationCap, Sparkles, Factory } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface LabModule {
  id: string;
  name: string;
  description: string;
  minTier: 'free' | 'pro' | 'elite' | 'enterprise';
}

export interface SurfacedLabModule extends LabModule {
  icon: LucideIcon;
  focus: string;
  statusNote: string;
  href: string;
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

export const SURFACED_LAB_MODULES: SurfacedLabModule[] = [
  { ...LAB_MODULES.negotiation, icon: Sparkles, focus: 'Negotiation training', statusNote: 'Active', href: '/labs/negotiation' },
  { ...LAB_MODULES['game-tree'], icon: Factory, focus: 'Game tree analysis', statusNote: 'Active', href: '/labs/game-tree' },
  { ...LAB_MODULES['bias-profile'], icon: GraduationCap, focus: 'Bias assessment', statusNote: 'Active', href: '/labs/bias-profile' },
  { ...LAB_MODULES['monte-carlo'], icon: Crown, focus: 'Monte Carlo simulation', statusNote: 'Active', href: '/labs/monte-carlo' },
];

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

export function mapSubscriptionToLabTier(tier: SubscriptionTier | undefined): string {
  if (!tier) return 'free';
  if (tier === 'academic' || tier === 'enterprise') return 'elite';
  return tier;
}
