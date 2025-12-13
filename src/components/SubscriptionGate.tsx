// Subscription Gate Component
// Enforces tier-based access control with upgrade prompts
// Part of Monetization Strategy Implementation

import React, { ReactNode } from 'react';
import { Lock, Zap, Crown, Sparkles, ArrowRight, Check } from 'lucide-react';
import { useSubscription, SubscriptionTier, TierLimits } from '../hooks/useSubscription';

interface SubscriptionGateProps {
  feature: keyof TierLimits;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
  userId?: string;
}

const TIER_COLORS: Record<SubscriptionTier, string> = {
  free: 'from-slate-500 to-slate-600',
  analyst: 'from-blue-500 to-blue-600',
  pro: 'from-purple-500 to-purple-600',
  enterprise: 'from-amber-500 to-amber-600',
  academic: 'from-green-500 to-green-600'
};

const TIER_ICONS: Record<SubscriptionTier, React.ElementType> = {
  free: Lock,
  analyst: Zap,
  pro: Sparkles,
  enterprise: Crown,
  academic: Sparkles
};

export const SubscriptionGate: React.FC<SubscriptionGateProps> = ({
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
  userId
}) => {
  const { hasFeature, needsUpgradeFor, allTiers, loading, currentTier } = useSubscription(userId);

  if (loading) {
    return (
      <div className="animate-pulse bg-slate-700 rounded-lg p-4">
        <div className="h-4 bg-slate-600 rounded w-3/4"></div>
      </div>
    );
  }

  const hasAccess = hasFeature(feature);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback && !showUpgradePrompt) {
    return <>{fallback}</>;
  }

  const requiredTier = needsUpgradeFor(feature);
  const tierInfo = allTiers.find(t => t.tier === requiredTier);
  const TierIcon = requiredTier ? TIER_ICONS[requiredTier] : Lock;
  const tierGradient = requiredTier ? TIER_COLORS[requiredTier] : TIER_COLORS.analyst;

  return (
    <div className="relative">
      {/* Blurred preview of locked content */}
      <div className="filter blur-sm opacity-50 pointer-events-none select-none">
        {fallback || children}
      </div>

      {/* Upgrade overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm rounded-lg">
        <div className="text-center p-6 max-w-md">
          <div className={`inline-flex p-3 rounded-full bg-gradient-to-r ${tierGradient} mb-4`}>
            <TierIcon className="w-8 h-8 text-white" />
          </div>
          
          <h3 className="text-xl font-bold text-white mb-2">
            Upgrade to {tierInfo?.displayName || 'Premium'}
          </h3>
          
          <p className="text-slate-300 mb-4">
            This feature requires a {tierInfo?.displayName || 'premium'} subscription.
            Unlock advanced capabilities and take your strategic analysis to the next level.
          </p>

          {tierInfo && (
            <div className="bg-slate-800 rounded-lg p-4 mb-4 text-left">
              <div className="text-2xl font-bold text-white mb-1">
                ${tierInfo.priceMonthly}<span className="text-sm text-slate-400">/month</span>
              </div>
              <div className="text-xs text-slate-400 mb-3">
                or ${tierInfo.priceYearly}/year (save 17%)
              </div>
              <ul className="space-y-2 text-sm">
                {tierInfo.maxAnalysesPerDay > 0 && (
                  <li className="flex items-center text-slate-300">
                    <Check className="w-4 h-4 text-green-400 mr-2" />
                    {tierInfo.maxAnalysesPerDay === -1 ? 'Unlimited' : tierInfo.maxAnalysesPerDay} analyses/day
                  </li>
                )}
                {tierInfo.canAccessGoldModule && (
                  <li className="flex items-center text-slate-300">
                    <Check className="w-4 h-4 text-green-400 mr-2" />
                    Gold Forecasting Module
                  </li>
                )}
                {tierInfo.canExportPdf && (
                  <li className="flex items-center text-slate-300">
                    <Check className="w-4 h-4 text-green-400 mr-2" />
                    PDF Report Generation
                  </li>
                )}
                {tierInfo.canUseApi && (
                  <li className="flex items-center text-slate-300">
                    <Check className="w-4 h-4 text-green-400 mr-2" />
                    API Access
                  </li>
                )}
              </ul>
            </div>
          )}

          <button
            onClick={() => window.open('/pricing', '_blank')}
            className={`w-full py-3 px-6 rounded-lg bg-gradient-to-r ${tierGradient} text-white font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2`}
          >
            Upgrade Now
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-xs text-slate-500 mt-3">
            Current plan: {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}
          </p>
        </div>
      </div>
    </div>
  );
};

// Feature-specific gate components for common use cases
export const GoldModuleGate: React.FC<{ children: ReactNode; userId?: string }> = ({ children, userId }) => (
  <SubscriptionGate feature="canAccessGoldModule" userId={userId}>
    {children}
  </SubscriptionGate>
);

export const SequentialGamesGate: React.FC<{ children: ReactNode; userId?: string }> = ({ children, userId }) => (
  <SubscriptionGate feature="canAccessSequentialGames" userId={userId}>
    {children}
  </SubscriptionGate>
);

export const MonteCarloGate: React.FC<{ children: ReactNode; userId?: string }> = ({ children, userId }) => (
  <SubscriptionGate feature="canAccessMonteCarlo" userId={userId}>
    {children}
  </SubscriptionGate>
);

export const ExportPdfGate: React.FC<{ children: ReactNode; userId?: string }> = ({ children, userId }) => (
  <SubscriptionGate feature="canExportPdf" userId={userId}>
    {children}
  </SubscriptionGate>
);

export const ApiAccessGate: React.FC<{ children: ReactNode; userId?: string }> = ({ children, userId }) => (
  <SubscriptionGate feature="canUseApi" userId={userId}>
    {children}
  </SubscriptionGate>
);

export const RealTimeDataGate: React.FC<{ children: ReactNode; userId?: string }> = ({ children, userId }) => (
  <SubscriptionGate feature="canAccessRealTimeData" userId={userId}>
    {children}
  </SubscriptionGate>
);

// Usage limit indicator component
interface UsageLimitIndicatorProps {
  action: string;
  userId?: string;
  showBar?: boolean;
}

export const UsageLimitIndicator: React.FC<UsageLimitIndicatorProps> = ({ 
  action, 
  userId,
  showBar = true 
}) => {
  const { checkLimit, tierLimits } = useSubscription(userId);
  const [usage, setUsage] = React.useState<{ current: number; max: number; remaining: number } | null>(null);

  React.useEffect(() => {
    const fetchUsage = async () => {
      const result = await checkLimit(action);
      if (result.currentUsage !== undefined && result.maxAllowed !== undefined) {
        setUsage({
          current: result.currentUsage,
          max: result.maxAllowed,
          remaining: result.remaining || 0
        });
      }
    };
    fetchUsage();
  }, [action, checkLimit]);

  if (!usage || usage.max === -1) return null;

  const percentage = Math.min((usage.current / usage.max) * 100, 100);
  const isWarning = percentage >= 75;
  const isCritical = percentage >= 90;

  return (
    <div className="text-sm">
      <div className="flex justify-between text-slate-400 mb-1">
        <span>{action.replace('_', ' ')}</span>
        <span className={isCritical ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-slate-400'}>
          {usage.current}/{usage.max}
        </span>
      </div>
      {showBar && (
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isCritical ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-blue-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default SubscriptionGate;
