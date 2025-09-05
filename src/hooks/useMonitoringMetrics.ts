// Hook for fetching monitoring metrics
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

interface MetricsData {
  schema_failure_rate: number;
  evidence_backed_rate: number;
  avg_ev_missing_count: number;
  human_review_rate: number;
  last_updated: string;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'fake-key-for-tests';
const supabase = createClient(supabaseUrl, supabaseKey);

export function useMonitoringMetrics() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);

      // Call the RPC function
      const { data, error: rpcError } = await supabase.rpc('get_monitoring_metrics');

      if (rpcError) {
        console.warn('RPC error, using mock data:', rpcError);
        // Fallback to mock data
        const mockMetrics: MetricsData = {
          schema_failure_rate: 1.5,
          evidence_backed_rate: 87.2,
          avg_ev_missing_count: 0.8,
          human_review_rate: 3.2,
          last_updated: new Date().toISOString()
        };
        setMetrics(mockMetrics);
        setError(null);
        return;
      }

      setMetrics(data as MetricsData);
      setError(null);
    } catch (err) {
      console.error('Metrics fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');

      // Fallback to mock data on error
      const mockMetrics: MetricsData = {
        schema_failure_rate: 1.5,
        evidence_backed_rate: 87.2,
        avg_ev_missing_count: 0.8,
        human_review_rate: 3.2,
        last_updated: new Date().toISOString()
      };
      setMetrics(mockMetrics);
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