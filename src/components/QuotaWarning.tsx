import React from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { useQuotaTracking } from '../hooks/useQuotaTracking';

interface QuotaWarningProps {
  userId?: string;
  className?: string;
}

const QuotaWarning: React.FC<QuotaWarningProps> = ({ userId, className = '' }) => {
  const { usage, limits, getQuotaStatus, getUsagePercentage } = useQuotaTracking(userId);
  const status = getQuotaStatus();

  if (status.level === 'normal') return null;

  const isCritical = status.level === 'critical';
  const Icon = isCritical ? AlertTriangle : AlertCircle;
  const bgColor = isCritical ? 'bg-red-900/30' : 'bg-yellow-900/30';
  const borderColor = isCritical ? 'border-red-700' : 'border-yellow-700';
  const textColor = isCritical ? 'text-red-400' : 'text-yellow-400';
  const title = isCritical ? 'Quota Critical' : 'Quota Warning';
  const description = isCritical
    ? 'You have exceeded your usage limits. Please wait for the quota window to reset.'
    : 'You are approaching your usage limits. Consider spacing out requests.';

  const formatTimeRemaining = (milliseconds: number) => {
    const minutes = Math.ceil(milliseconds / (1000 * 60));
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.ceil(minutes / 60);
    return `${hours} hours`;
  };

  const timeRemaining = formatTimeRemaining(usage.windowEnd - Date.now());

  return (
    <div className={`${bgColor} border ${borderColor} rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <Icon className={`w-5 h-5 ${textColor} mr-3 mt-0.5 flex-shrink-0`} />
        <div className="flex-1">
          <h4 className={`${textColor} font-medium mb-2`}>{title}</h4>
          <p className="text-slate-300 text-sm mb-3">{description}</p>

          {/* Usage stats */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Total Requests:</span>
              <span className="text-slate-300">
                {usage.totalRequests} / {limits.totalRequests} ({getUsagePercentage().toFixed(1)}%)
              </span>
            </div>

            {Object.entries(usage.serviceUsage).map(([service, count]) => {
              const limit = limits.perService[service as keyof typeof limits.perService];
              const percentage = getUsagePercentage(service as keyof typeof usage.serviceUsage);
              const isOverLimit = count >= limit;

              return (
                <div key={service} className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 capitalize">{service}:</span>
                  <span className={`${isOverLimit ? 'text-red-400' : 'text-slate-300'}`}>
                    {count} / {limit} ({percentage.toFixed(1)}%)
                  </span>
                </div>
              );
            })}
          </div>

          {/* Reset info */}
          <p className="text-slate-400 text-xs">
            Quota resets in {timeRemaining}. Time-based limits per hour.
          </p>

          {isCritical && (
            <div className="mt-3 flex">
              <Info className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
              <p className="text-slate-400 text-xs">
                Service degradation active. Some features may be limited.
              </p>
            </div>
          )}

          {/* Progress bars for visual feedback */}
          <div className="mt-3 space-y-2">
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${isCritical ? 'bg-red-500' : 'bg-yellow-500'}`}
                style={{ width: `${Math.min(getUsagePercentage(), 100)}%` }}
              />
            </div>
            {status.services && status.services.length > 0 && (
              <div className="text-xs text-slate-400">
                High usage: {status.services.map(s => s.service).join(', ')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuotaWarning;