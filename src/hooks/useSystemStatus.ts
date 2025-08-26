// System status hook for monitoring backend health
import { useState, useEffect } from 'react';
import { ENDPOINTS, getAuthHeaders, isLocalMode } from '../lib/supabase';
import type { SystemStatus } from '../types/strategic-analysis';

export function useSystemStatus() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchSystemStatus = async () => {
    try {
      setLoading(true);
      // Local mode: return mock status without network calls
      if (isLocalMode) {
        const now = new Date().toISOString();
        const mock: SystemStatus = {
          healthy: true,
          timestamp: now,
          version: 'local-1.0.0',
          services: {
            database: 'healthy',
            edge_functions: 'healthy',
            worker_service: 'healthy',
            external_apis: 'healthy'
          },
          metrics: {
            active_analyses: 0,
            queue_depth: 0,
            avg_processing_time_ms: 75,
            success_rate: 1
          },
          health: {
            schema_ok: true,
            checks: [
              { name: 'Local Mode', status: 'ok', detail: 'Using mock status' }
            ],
            version: 'local'
          }
        };
        setStatus(mock);
        setError(null);
        return;
      }
      const response = await fetch(ENDPOINTS.SYSTEM_STATUS, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      const result = await response.json();
      
      // Handle successful responses - the backend now always returns 200 OK
      if (response.ok) {
        // Transform the backend response to match frontend expectations
        const transformedStatus: SystemStatus = {
          healthy: result.overall_status === 'healthy',
          timestamp: result.timestamp,
          version: result.version?.platform_version || '1.0.0',
          services: {
            database: result.components?.database?.status || 'unknown',
            edge_functions: result.components?.edge_functions?.status || 'unknown', 
            worker_service: result.components?.worker_service?.status || 'unknown',
            external_apis: result.components?.external_apis?.status || 'unknown'
          },
          metrics: {
            active_analyses: (result.metrics?.active_analyses ?? result.metrics?.queue_depth ?? 0) as number,
            queue_depth: (result.metrics?.queue_depth ?? 0) as number,
            avg_processing_time_ms: (result.metrics?.avg_processing_time ?? 0) as number,
            success_rate: ((result.metrics?.success_rate ?? 100) as number) / 100
          }
        };

        // Optionally fetch health endpoint for schema checks
        try {
          const healthResp = await fetch(ENDPOINTS.HEALTH, {
            method: 'GET',
            headers: getAuthHeaders()
          });
          if (healthResp.ok) {
            const healthJson = await healthResp.json();
            const checks = Array.isArray(healthJson.checks)
              ? healthJson.checks.map((c: any) => ({
                  name: String(c.name ?? c.id ?? 'check'),
                  status: (c.status ?? c.state ?? 'ok') as 'ok' | 'warn' | 'fail',
                  detail: c.detail ?? c.message ?? undefined
                }))
              : undefined;
            transformedStatus.health = {
              schema_ok: typeof healthJson.schema_ok === 'boolean' ? healthJson.schema_ok : undefined,
              checks,
              version: typeof healthJson.version === 'string' ? healthJson.version : undefined
            };
          }
        } catch (e) {
          // Ignore health fetch errors to keep UI resilient
        }

        setStatus(transformedStatus);
        setError(null);
      } else {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }
      
    } catch (err) {
      console.error('System status error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchSystemStatus();
    
    // Refresh status every 30 seconds
    const interval = setInterval(fetchSystemStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  return {
    status,
    loading,
    error,
    refresh: fetchSystemStatus
  };
}
