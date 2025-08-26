// System Status Component
import React from 'react';
import { useSystemStatus } from '../hooks/useSystemStatus';
import { Server, Database, Cpu, Activity, AlertTriangle, CheckCircle2, RefreshCw, Globe, Zap } from 'lucide-react';

const SystemStatus: React.FC = () => {
  const { status, loading, error, refresh } = useSystemStatus();
  
  if (loading && !status) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-5 h-5 mr-2 animate-spin text-cyan-400" />
          <span className="text-slate-300">Loading system status...</span>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Server className="w-5 h-5 mr-2 text-cyan-400" />
            System Status
          </h3>
          <button
            onClick={refresh}
            className="p-2 text-slate-400 hover:text-cyan-400 transition-colors"
            title="Refresh status"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="flex items-center text-red-400">
          <AlertTriangle className="w-4 h-4 mr-2" />
          <span>Unable to fetch system status</span>
        </div>
        <div className="mt-2 text-xs text-slate-400">
          <details>
            <summary className="cursor-pointer hover:text-slate-300">Error details</summary>
            <pre className="mt-2 p-2 bg-slate-900 rounded text-xs overflow-x-auto">
              {error}
            </pre>
          </details>
        </div>
      </div>
    );
  }
  
  if (!status) return null;
  
  const getServiceStatusColor = (serviceStatus: string) => {
    switch (serviceStatus) {
      case 'healthy': return 'text-emerald-400';
      case 'degraded': return 'text-yellow-400';  
      case 'unhealthy': return 'text-red-400';
      case 'unknown': return 'text-slate-400';
      default: return 'text-slate-400';
    }
  };
  
  const getServiceIcon = (serviceStatus: string) => {
    switch (serviceStatus) {
      case 'healthy': return CheckCircle2;
      case 'degraded': case 'unhealthy': return AlertTriangle;
      default: return Activity;
    }
  };
  
  const getDisplayStatus = (serviceStatus: string) => {
    switch (serviceStatus) {
      case 'healthy': return 'Healthy';
      case 'degraded': return 'Degraded';
      case 'unhealthy': return 'Unhealthy';
      case 'unknown': return 'Unknown';
      default: return 'Unknown';
    }
  };

  const getServiceDisplayName = (service: string) => {
    switch (service) {
      case 'database': return 'Database';
      case 'edge_functions': return 'Edge Functions';
      case 'worker_service': return 'Worker Service';
      case 'external_apis': return 'External APIs';
      default: return service.replace('_', ' ');
    }
  };

  const getServiceIconComponent = (service: string) => {
    switch (service) {
      case 'database': return Database;
      case 'edge_functions': return Zap;
      case 'worker_service': return Cpu;
      case 'external_apis': return Globe;
      default: return Activity;
    }
  };

  const getOverallStatus = () => {
    if (status.healthy) return { label: 'All Systems Operational', color: 'text-emerald-400', bgColor: 'bg-emerald-900/30' };
    
    const degradedServices = Object.values(status.services).filter(s => s === 'degraded').length;
    const unhealthyServices = Object.values(status.services).filter(s => s === 'unhealthy').length;
    
    if (unhealthyServices > 0) {
      return { 
        label: `${unhealthyServices} Service${unhealthyServices > 1 ? 's' : ''} Down`, 
        color: 'text-red-400', 
        bgColor: 'bg-red-900/30' 
      };
    }
    
    if (degradedServices > 0) {
      return { 
        label: `${degradedServices} Service${degradedServices > 1 ? 's' : ''} Degraded`, 
        color: 'text-yellow-400', 
        bgColor: 'bg-yellow-900/30' 
      };
    }
    
    return { label: 'Unknown Status', color: 'text-slate-400', bgColor: 'bg-slate-900/30' };
  };

  const overallStatus = getOverallStatus();
  
  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <Server className="w-5 h-5 mr-2 text-cyan-400" />
          System Status
        </h3>
        <div className="flex items-center space-x-3">
          <div className={`flex items-center px-3 py-1 rounded-full text-sm ${overallStatus.bgColor} ${overallStatus.color}`}>
            {status.healthy ? (
              <CheckCircle2 className="w-3 h-3 mr-1" />
            ) : (
              <AlertTriangle className="w-3 h-3 mr-1" />
            )}
            {overallStatus.label}
          </div>
          <button
            onClick={refresh}
            className="p-2 text-slate-400 hover:text-cyan-400 transition-colors"
            title="Refresh status"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      
      {/* Services Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Object.entries(status.services).map(([service, serviceStatus]) => {
          const StatusIcon = getServiceIcon(serviceStatus);
          const ServiceIcon = getServiceIconComponent(service);
          const isHealthy = serviceStatus === 'healthy';
          
          return (
            <div 
              key={service} 
              className={`p-4 rounded-lg border transition-colors ${
                isHealthy 
                  ? 'bg-slate-700 border-slate-600' 
                  : 'bg-slate-700/80 border-red-500/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <ServiceIcon className="w-4 h-4 mr-2 text-slate-400" />
                  <span className="text-sm font-medium text-slate-200">
                    {getServiceDisplayName(service)}
                  </span>
                </div>
                <StatusIcon className={`w-4 h-4 ${getServiceStatusColor(serviceStatus)}`} />
              </div>
              <div className={`text-xs font-medium ${getServiceStatusColor(serviceStatus)}`}>
                {getDisplayStatus(serviceStatus)}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-slate-700 p-3 rounded-lg">
          <div className="text-xs text-slate-400 mb-1">Recent Analyses</div>
          <div className="text-lg font-mono text-cyan-400">{status.metrics.active_analyses}</div>
        </div>
        <div className="bg-slate-700 p-3 rounded-lg">
          <div className="text-xs text-slate-400 mb-1">Queue Depth</div>
          <div className="text-lg font-mono text-yellow-400">{status.metrics.queue_depth}</div>
        </div>
        <div className="bg-slate-700 p-3 rounded-lg">
          <div className="text-xs text-slate-400 mb-1">Avg Processing</div>
          <div className="text-lg font-mono text-emerald-400">{status.metrics.avg_processing_time_ms}ms</div>
        </div>
        <div className="bg-slate-700 p-3 rounded-lg">
          <div className="text-xs text-slate-400 mb-1">Success Rate</div>
          <div className="text-lg font-mono text-blue-400">{(status.metrics.success_rate * 100).toFixed(1)}%</div>
        </div>
      </div>

      {/* Optional Health/Schema Checks */}
      {status.health && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-slate-200 flex items-center">
              <Server className="w-4 h-4 mr-2 text-cyan-400" />
              Backend Health Checks
            </div>
            {typeof status.health.schema_ok === 'boolean' && (
              <div className={`px-2 py-1 rounded text-xs font-medium border ${status.health.schema_ok ? 'bg-emerald-900/30 text-emerald-400 border-emerald-600/30' : 'bg-red-900/30 text-red-400 border-red-600/30'}`}>
                Schema {status.health.schema_ok ? 'OK' : 'Mismatch'}
              </div>
            )}
          </div>
          {status.health.checks && status.health.checks.length > 0 ? (
            <div className="space-y-2">
              {status.health.checks.map((c, idx) => {
                const color = c.status === 'ok' ? 'text-emerald-400' : c.status === 'warn' ? 'text-yellow-400' : 'text-red-400';
                const Icon = c.status === 'ok' ? CheckCircle2 : AlertTriangle;
                return (
                  <div key={idx} className="flex items-start justify-between bg-slate-700 p-3 rounded border border-slate-600">
                    <div className="flex items-start">
                      <Icon className={`w-4 h-4 mr-2 ${color}`} />
                      <div>
                        <div className="text-sm text-slate-200">{c.name}</div>
                        {c.detail && <div className="text-xs text-slate-400 mt-0.5">{c.detail}</div>}
                      </div>
                    </div>
                    <div className={`text-xs font-medium ${color} ml-2 uppercase`}>{c.status}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-slate-400">No detailed checks reported.</div>
          )}
        </div>
      )}

      {/* Footer with Version and Timestamp */}
      <div className="pt-4 border-t border-slate-600 flex justify-between text-xs text-slate-400">
        <span>Platform v{status.version}</span>
        <span>Last updated: {new Date(status.timestamp).toLocaleTimeString()}</span>
      </div>
    </div>
  );
};

export default SystemStatus;
