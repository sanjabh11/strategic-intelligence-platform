// Monitoring Dashboard Component
// Displays key metrics with alerts when performance degrades

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Activity, TrendingDown, TrendingUp, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { useMonitoringMetrics } from '../hooks/useMonitoringMetrics';

interface MetricsData {
  schema_failure_rate: number; // Target: <2%
  evidence_backed_rate: number; // Target: >=85%
  avg_ev_missing_count: number;
  human_review_rate: number;
  last_updated: string;
}

interface MetricsData {
  schema_failure_rate: number;
  evidence_backed_rate: number;
  avg_ev_missing_count: number;
  human_review_rate: number;
  last_updated: string;
}

const MonitoringDashboard: React.FC = () => {
  const { metrics, loading, error, refresh } = useMonitoringMetrics();
  const [alerts, setAlerts] = useState<string[]>([]);

  const currentMetrics = metrics;

  useEffect(() => {
    const newAlerts: string[] = [];

    if (currentMetrics) {
      if (currentMetrics.schema_failure_rate >= 2) {
        newAlerts.push(`Schema failure rate (${currentMetrics.schema_failure_rate}%) exceeds 2% threshold`);
      }

      if (currentMetrics.evidence_backed_rate < 85) {
        newAlerts.push(`Evidence backed rate (${currentMetrics.evidence_backed_rate}%) below 85% target`);
      }

      if (currentMetrics.avg_ev_missing_count > 1) {
        newAlerts.push(`Average EV missing count (${currentMetrics.avg_ev_missing_count}) is elevated`);
      }
    }

    setAlerts(newAlerts);
  }, [currentMetrics]);

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const getStatusColor = (value: number, threshold: number, higherIsBetter = false) => {
    const isGood = higherIsBetter ? value >= threshold : value <= threshold;
    return isGood ? 'text-green-400' : 'text-red-400';
  };

  const getStatusIcon = (value: number, threshold: number, higherIsBetter = false) => {
    const isGood = higherIsBetter ? value >= threshold : value <= threshold;
    return isGood ? (
      <CheckCircle className="w-5 h-5" />
    ) : (
      <XCircle className="w-5 h-5" />
    );
  };

  const MetricCard: React.FC<{
    title: string;
    value: number;
    unit: string;
    threshold: number;
    higherIsBetter?: boolean;
    icon: React.ReactNode;
  }> = ({ title, value, unit, threshold, higherIsBetter = false, icon }) => (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          {icon}
          <h3 className="text-lg font-semibold text-slate-200 ml-3">{title}</h3>
        </div>
        {getStatusIcon(value, threshold, higherIsBetter)}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className={`text-2xl font-mono font-bold ${getStatusColor(value, threshold, higherIsBetter)}`}>
            {unit === '%' ? formatPercentage(value) : value.toFixed(1)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Target: {higherIsBetter ? '≥' : '≤'} {unit === '%' ? formatPercentage(threshold) : threshold}
          </div>
        </div>

        <div className="flex items-center">
          {value > threshold !== higherIsBetter ? (
            <TrendingDown className="w-4 h-4 text-red-400" />
          ) : (
            <TrendingUp className="w-4 h-4 text-green-400" />
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-slate-900 min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-200 flex items-center">
              <Activity className="w-8 h-8 mr-3 text-blue-400" />
              System Monitoring Dashboard
            </h1>
            <p className="text-slate-400 mt-1">
              Real-time performance metrics and alerts
            </p>
          </div>

          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <div className="flex items-center mb-3">
              <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
              <h2 className="text-lg font-semibold text-red-300">Active Alerts</h2>
            </div>

            <div className="space-y-2">
              {alerts.map((alert, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className="flex-shrink-0 w-2 h-2 bg-red-400 rounded-full mt-2"></div>
                  <p className="text-red-200 text-sm">{alert}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Schema Failure Rate"
            value={currentMetrics.schema_failure_rate}
            unit="%"
            threshold={2}
            higherIsBetter={false}
            icon={<Activity className="w-6 h-6 text-blue-400" />}
          />

          <MetricCard
            title="Evidence Backed Rate"
            value={currentMetrics.evidence_backed_rate}
            unit="%"
            threshold={85}
            higherIsBetter={true}
            icon={<CheckCircle className="w-6 h-6 text-green-400" />}
          />

          <MetricCard
            title="Avg EV Missing"
            value={currentMetrics.avg_ev_missing_count}
            unit=""
            threshold={1}
            higherIsBetter={false}
            icon={<TrendingDown className="w-6 h-6 text-orange-400" />}
          />

          <MetricCard
            title="Human Review Rate"
            value={currentMetrics.human_review_rate}
            unit="%"
            threshold={10} // Assuming reasonable threshold
            higherIsBetter={false}
            icon={<AlertTriangle className="w-6 h-6 text-yellow-400" />}
          />
        </div>

        {/* Additional Status Info */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-semibold text-slate-200 mb-4">System Status</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-2">Last Updated</h3>
              <p className="text-slate-200 font-mono">
                {new Date(currentMetrics.last_updated).toLocaleString()}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-2">Overall Health</h3>
              <div className="flex items-center space-x-2">
                {alerts.length === 0 ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-green-400">Healthy</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    <span className="text-yellow-400">
                      {alerts.length} alert{alerts.length > 1 ? 's' : ''}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitoringDashboard;