// Tier Badge Component
// Visual indicator for Pro/Elite features throughout the app
// Used in Labs, Engine selection, and feature cards

import React from 'react';
import { Crown, Sparkles, Zap, Lock } from 'lucide-react';

export type TierLevel = 'basic' | 'pro' | 'elite';

interface TierBadgeProps {
  tier: TierLevel;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  locked?: boolean;
  className?: string;
}

const TIER_CONFIG: Record<TierLevel, {
  label: string;
  icon: React.ElementType;
  bgColor: string;
  textColor: string;
  borderColor: string;
}> = {
  basic: {
    label: 'Basic',
    icon: Zap,
    bgColor: 'bg-slate-500/20',
    textColor: 'text-slate-400',
    borderColor: 'border-slate-500/30'
  },
  pro: {
    label: 'Pro',
    icon: Sparkles,
    bgColor: 'bg-purple-500/20',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/30'
  },
  elite: {
    label: 'Elite',
    icon: Crown,
    bgColor: 'bg-amber-500/20',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/30'
  }
};

const SIZE_CLASSES = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-xs px-2 py-1',
  lg: 'text-sm px-3 py-1.5'
};

const ICON_SIZES = {
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
  lg: 'w-4 h-4'
};

export const TierBadge: React.FC<TierBadgeProps> = ({
  tier,
  size = 'md',
  showIcon = true,
  locked = false,
  className = ''
}) => {
  const config = TIER_CONFIG[tier];
  const Icon = locked ? Lock : config.icon;

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${config.bgColor} ${config.textColor} ${config.borderColor}
        border ${SIZE_CLASSES[size]} ${className}
      `}
    >
      {showIcon && <Icon className={ICON_SIZES[size]} />}
      <span>{config.label}</span>
    </span>
  );
};

// Upgrade prompt badge
interface UpgradeBadgeProps {
  currentTier: TierLevel;
  requiredTier: TierLevel;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const UpgradeBadge: React.FC<UpgradeBadgeProps> = ({
  currentTier,
  requiredTier,
  size = 'sm',
  className = ''
}) => {
  const tierHierarchy: Record<TierLevel, number> = {
    basic: 1,
    pro: 2,
    elite: 3
  };

  const needsUpgrade = tierHierarchy[currentTier] < tierHierarchy[requiredTier];

  if (!needsUpgrade) return null;

  return (
    <TierBadge 
      tier={requiredTier} 
      size={size} 
      locked={true}
      className={className}
    />
  );
};

// Feature locked indicator
interface FeatureLockedProps {
  requiredTier: TierLevel;
  featureName: string;
  className?: string;
}

export const FeatureLocked: React.FC<FeatureLockedProps> = ({
  requiredTier,
  featureName,
  className = ''
}) => {
  const config = TIER_CONFIG[requiredTier];

  return (
    <div className={`flex items-center gap-2 text-sm ${config.textColor} ${className}`}>
      <Lock className="w-4 h-4" />
      <span>
        {featureName} requires <strong>{config.label}</strong> tier
      </span>
    </div>
  );
};

export default TierBadge;
