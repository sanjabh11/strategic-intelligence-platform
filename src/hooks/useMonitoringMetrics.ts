// Hook for fetching monitoring metrics
import { useState, useEffect } from 'react';
import { supabase, isLocalMode } from '../lib/supabase';

interface MetricsData {
  schema_failure_rate: number;
  evidence_backed_rate: number;
  avg_ev_missing_count: number;
  human_review_rate: number;
  last_updated: string;
}

export function useMonitoringMetrics() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      if (isLocalMode || !supabase) {
        setMetrics(null);
        setError('Local mode is enabled or Supabase client is not configured. Configure environment for RPC access.');
        return;
      }

      // Call the RPC function (no mock fallback allowed)
      const { data, error: rpcError } = await supabase.rpc('get_monitoring_metrics');

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      // Metrics RPC returns json; ensure object shape
      setMetrics(data as unknown as MetricsData);
      setError(null);
    } catch (err) {
      console.error('Metrics fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();

    // Refresh metrics every 60 seconds
    const interval = setInterval(fetchMetrics, 60000);

    return () => clearInterval(interval);
  }, []);

  return {
    metrics,
    loading,
    error,
    refresh: fetchMetrics
  };
}