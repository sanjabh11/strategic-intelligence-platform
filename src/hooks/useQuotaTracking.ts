import { useState, useEffect, useCallback } from 'react';

interface QuotaUsage {
  userId?: string;
  totalRequests: number;
  windowStart: number;
  windowEnd: number;
  serviceUsage: {
    perplexity: number;
    gemini: number;
    openai: number;
  };
}

interface QuotaLimits {
  totalRequests: number;
  perService: {
    perplexity: number;
    gemini: number;
    openai: number;
  };
  windowMinutes: number;
}

const DEFAULT_LIMITS: QuotaLimits = {
  totalRequests: 100,
  perService: {
    perplexity: 50,
    gemini: 100,
    openai: 100
  },
  windowMinutes: 60
};

export const useQuotaTracking = (userId?: string, customLimits?: Partial<QuotaLimits>) => {
  const limits = { ...DEFAULT_LIMITS, ...customLimits };

  const [usage, setUsage] = useState<QuotaUsage>(() => {
    const saved = localStorage.getItem(`quota_usage_${userId || 'anonymous'}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Check if window has expired
        const now = Date.now();
        if (now > parsed.windowEnd) {
          return {
            userId,
            totalRequests: 0,
            windowStart: now,
            windowEnd: now + (limits.windowMinutes * 60 * 1000),
            serviceUsage: { perplexity: 0, gemini: 0, openai: 0 }
          };
        }
        return parsed;
      } catch (e) {
        console.warn('Failed to parse quota usage from localStorage');
      }
    }
    return {
      userId,
      totalRequests: 0,
      windowStart: Date.now(),
      windowEnd: Date.now() + (limits.windowMinutes * 60 * 1000),
      serviceUsage: { perplexity: 0, gemini: 0, openai: 0 }
    };
  });

  // Save to localStorage when usage changes
  useEffect(() => {
    localStorage.setItem(`quota_usage_${userId || 'anonymous'}`, JSON.stringify(usage));
  }, [usage, userId]);

  // Check if we can make a request
  const canMakeRequest = useCallback((service?: keyof QuotaUsage['serviceUsage']) => {
    if (usage.totalRequests >= limits.totalRequests) {
      return { allowed: false, reason: 'total_quota_exceeded' };
    }

    if (service && usage.serviceUsage[service] >= limits.perService[service]) {
      return { allowed: false, reason: 'service_quota_exceeded', service };
    }

    return { allowed: true };
  }, [usage, limits]);

  // Increment usage
  const incrementUsage = useCallback((service?: keyof QuotaUsage['serviceUsage']) => {
    setUsage(prev => ({
      ...prev,
      totalRequests: prev.totalRequests + 1,
      serviceUsage: service ? {
        ...prev.serviceUsage,
        [service]: prev.serviceUsage[service] + 1
      } : prev.serviceUsage
    }));
  }, []);

  // Get usage percentage
  const getUsagePercentage = useCallback((service?: keyof QuotaUsage['serviceUsage']) => {
    if (service) {
      return (usage.serviceUsage[service] / limits.perService[service]) * 100;
    }
    return (usage.totalRequests / limits.totalRequests) * 100;
  }, [usage, limits]);

  // Get status
  const getQuotaStatus = useCallback(() => {
    const totalPercent = getUsagePercentage();
    const servicePercentages = Object.keys(usage.serviceUsage).map(service => ({
      service: service as keyof QuotaUsage['serviceUsage'],
      percentage: getUsagePercentage(service as keyof QuotaUsage['serviceUsage'])
    }));

    const criticalServices = servicePercentages.filter(s => s.percentage >= 90);
    const warningServices = servicePercentages.filter(s => s.percentage >= 75 && s.percentage < 90);

    if (criticalServices.length > 0 || totalPercent >= 90) {
      return { level: 'critical', services: criticalServices };
    }
    if (warningServices.length > 0 || totalPercent >= 75) {
      return { level: 'warning', services: warningServices };
    }

    return { level: 'normal' };
  }, [usage, limits, getUsagePercentage]);

  // Reset usage (for testing or manual reset)
  const resetUsage = useCallback(() => {
    setUsage({
      userId,
      totalRequests: 0,
      windowStart: Date.now(),
      windowEnd: Date.now() + (limits.windowMinutes * 60 * 1000),
      serviceUsage: { perplexity: 0, gemini: 0, openai: 0 }
    });
  }, [userId, limits]);

  return {
    usage,
    limits,
    canMakeRequest,
    incrementUsage,
    getUsagePercentage,
    getQuotaStatus,
    resetUsage
  };
};