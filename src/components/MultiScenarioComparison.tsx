// Advanced Multi-Scenario Comparison Dashboard
// Compare multiple strategic scenarios side-by-side with quantum analysis

import React, { useState, useEffect, useMemo } from 'react';
import {
  GitCompare, BarChart3, TrendingUp, Award, AlertTriangle,
  Target, Clock, CheckCircle, Users, Star, Plus, Minus
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, ScatterChart, Scatter,
  ComposedChart, Area, AreaChart
} from 'recharts';

interface ScenarioResult {
  id: string;
  name: string;
  description: string;
  equilibrium: {
    profile: Record<string, Record<string, number>>;
    stability: number;
    method: string;
  };
  quantum?: {
    collapsed?: Array<{action: string; probability: number}>;
  };
  pattern_matches?: Array<{id: string; score: number}>;
  processing_stats?: {
    processing_time_ms: number;
    stability_score: number;
  };
  provenance?: {
    model: string;
    confidence: number;
  };
  strategic_score: number; // Overall weighted score
}

interface ComparisonMetrics {
  winning_solutions: number;
  average_stability: number;
  processing_efficiency: number;
  strategic_diversity: number;
  risk_distribution: number;
}

interface MultiScenarioComparisonProps {
  scenarios: ScenarioResult[];
  isLearningMode?: boolean;
  onScenarioSelect?: (scenario: ScenarioResult) => void;
  comparisonMetrics?: ComparisonMetrics;
}

const MultiScenarioComparison: React.FC<MultiScenarioComparisonProps> = ({
  scenarios = [],
  isLearningMode = false,
  onScenarioSelect,
  comparisonMetrics
}) => {

  const [selectedScenarios, setSelectedScenarios] = useState<ScenarioResult[]>([]);
  const [comparisonView, setComparisonView] = useState<'overview' | 'detailed' | 'trends'>('overview');
  const [sortBy, setSortBy] = useState<'score' | 'stability' | 'processing_time' | 'diversity'>('score');

  // Safe number validation function
  const safeNumber = (v: any): number | null => (typeof v === 'number' && isFinite(v) ? v : null);

  // No mock scenarios. The component renders only what is provided via props.
  const displayScenarios = scenarios;

  // Sort scenarios based on selected criteria
  const sortedScenarios = useMemo(() => {
    return [...displayScenarios].sort((a, b) => {
      switch (sortBy) {
        case 'score': return b.strategic_score - a.strategic_score;
        case 'stability': return b.equilibrium?.stability - a.equilibrium?.stability;
        case 'processing_time': return a.processing_stats?.processing_time_ms - b.processing_stats?.processing_time_ms;
        case 'diversity': return (b.processing_stats?.stability_score || 0) - (a.processing_stats?.stability_score || 0);
        default: return 0;
      }
    });
  }, [displayScenarios, sortBy]);

  // Calculate comparison metrics with NaN protection
  const calculatedMetrics = useMemo((): ComparisonMetrics => {
    if (displayScenarios.length === 0) return {
      winning_solutions: 0,
      average_stability: 0,
      processing_efficiency: 0,
      strategic_diversity: 0,
      risk_distribution: 0
    };

    // Filter out scenarios with invalid data
    const validScenarios = displayScenarios.filter(s => {
      const stability = safeNumber(s.equilibrium?.stability);
      const score = safeNumber(s.strategic_score);
      return stability !== null && score !== null && (stability as number) >= 0 && (stability as number) <= 1 && (score as number) >= 0 && (score as number) <= 100;
    });

    if (validScenarios.length === 0) return {
      winning_solutions: 0,
      average_stability: 0,
      processing_efficiency: 0,
      strategic_diversity: 0,
      risk_distribution: 0
    };

    const avgStability = validScenarios.reduce((sum, s) => sum + (safeNumber(s.equilibrium?.stability) || 0), 0) / validScenarios.length;
    const avgProcessingTime = validScenarios.reduce((sum, s) => sum + (safeNumber(s.processing_stats?.processing_time_ms) || 0), 0) / validScenarios.length;
    const riskVariance = validScenarios.reduce((acc, s) => acc + Math.pow((safeNumber(s.equilibrium?.stability) || 0) - avgStability, 2), 0) / validScenarios.length;

    return {
      winning_solutions: validScenarios.filter(s => s.strategic_score > 80).length,
      average_stability: isNaN(avgStability) ? 0 : avgStability,
      processing_efficiency: isNaN(avgProcessingTime) || avgProcessingTime === 0 ? 0 : 100000 / avgProcessingTime,
      strategic_diversity: isNaN(riskVariance) || isNaN(avgStability) ? 0 : 1 - (riskVariance / (avgStability * (1 - avgStability))),
      risk_distribution: isNaN(riskVariance) ? 0 : Math.sqrt(riskVariance)
    };
  }, [displayScenarios]);

  return (
    <div className="space-y-6">
      {/* Header with Comparison Controls */}
      <div className="bg-gradient-to-r from-cyan-600 to-green-600 p-6 rounded-xl text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <GitCompare className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Multi-Scenario Comparison</h2>
              <p className="text-cyan-100">Compare strategic scenarios across game-theoretic models</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{displayScenarios.length}</div>
            <div className="text-sm text-cyan-100">Scenarios Analyzed</div>
          </div>
        </div>

        {/* Comparison Controls */}
        <div className="flex items-center gap-4 mt-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white/10 border border-white/20 rounded px-3 py-1 text-sm"
            >
              <option value="score">Strategic Score</option>
              <option value="stability">Equilibrium Stability</option>
              <option value="processing_time">Processing Time</option>
              <option value="diversity">Strategic Diversity</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">View:</span>
            <div className="flex gap-1">
              {['overview', 'detailed', 'trends'].map((view) => (
                <button
                  key={view}
                  onClick={() => setComparisonView(view as any)}
                  className={`px-3 py-1 rounded text-sm capitalize ${
                    comparisonView === view
                      ? 'bg-white text-cyan-600'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {view}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Overview Comparison Chart */}
      {comparisonView === 'overview' && (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center mb-6">
            <BarChart3 className="w-6 h-6 mr-3 text-cyan-400" />
            <h3 className="text-xl font-semibold text-slate-200">Strategic Comparison Matrix</h3>
          </div>

          <div className="h-96 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={sortedScenarios.filter(s => {
                // Safe number validation
                const score = safeNumber(s.strategic_score);
                const stability = safeNumber(s.equilibrium?.stability);
                return score !== null && stability !== null && (score as number) >= 0 && (score as number) <= 100 && (stability as number) >= 0 && (stability as number) <= 1;
              })}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                  stroke="#94a3b8"
                />
                <YAxis yAxisId="score" orientation="left" domain={[0, 100]} stroke="#94a3b8" />
                <YAxis yAxisId="stability" orientation="right" domain={[0, 1]} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number, name: string) => [
                    typeof value === 'number' ? (name.includes('stability') ? (value * 100).toFixed(1) + '%' : value) : value,
                    name
                  ]}
                />
                <Legend />
                <Bar yAxisId="score" dataKey="strategic_score" fill="#06b6d4" name="Strategic Score" />
                <Line
                  yAxisId="stability"
                  type="monotone"
                  dataKey="equilibrium.stability"
                  stroke="#10b981"
                  strokeWidth={3}
                  name="Equilibrium Stability"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-slate-700 p-4 rounded-lg text-center">
              <Award className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
              <div className="text-lg font-mono text-slate-200">{calculatedMetrics.winning_solutions}</div>
              <div className="text-xs text-slate-400">Top Strategies</div>
            </div>
            <div className="bg-slate-700 p-4 rounded-lg text-center">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-400" />
              <div className="text-lg font-mono text-slate-200">{(calculatedMetrics.average_stability * 100).toFixed(1)}%</div>
              <div className="text-xs text-slate-400">Avg Stability</div>
            </div>
            <div className="bg-slate-700 p-4 rounded-lg text-center">
              <Clock className="w-6 h-6 mx-auto mb-2 text-blue-400" />
              <div className="text-lg font-mono text-slate-200">{sortedScenarios[0]?.processing_stats?.processing_time_ms || 0}ms</div>
              <div className="text-xs text-slate-400">Best Performance</div>
            </div>
            <div className="bg-slate-700 p-4 rounded-lg text-center">
              <Target className="w-6 h-6 mx-auto mb-2 text-purple-400" />
              <div className="text-lg font-mono text-slate-200">{calculatedMetrics.strategic_diversity.toFixed(2)}</div>
              <div className="text-xs text-slate-400">Strategic Diversity</div>
            </div>
            <div className="bg-slate-700 p-4 rounded-lg text-center">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-red-400" />
              <div className="text-lg font-mono text-slate-200">{calculatedMetrics.risk_distribution.toFixed(2)}</div>
              <div className="text-xs text-slate-400">Risk Variation</div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Comparison */}
      {comparisonView === 'detailed' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedScenarios.map((scenario) => (
            <div
              key={scenario.id}
              className="bg-slate-700 rounded-lg p-4 border border-slate-600 hover:border-cyan-500/50 transition-all cursor-pointer"
              onClick={() => onScenarioSelect?.(scenario)}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-slate-200">{scenario.name}</h3>
                <div className="text-right">
                  <div className="text-lg font-bold text-cyan-400">{scenario.strategic_score}</div>
                  <div className="text-xs text-slate-400">score</div>
                </div>
              </div>

              <p className="text-sm text-slate-400 mb-4 line-clamp-2">{scenario.description}</p>

              {/* Key Metrics */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Stability:</span>
                  <span className="font-mono text-emerald-400">
                    {(scenario.equilibrium.stability * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Method:</span>
                  <span className="font-mono text-blue-400 text-xs">
                    {scenario.equilibrium.method}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Processing:</span>
                  <span className="font-mono text-purple-400">
                    {scenario.processing_stats?.processing_time_ms || 0}ms
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Confidence:</span>
                  <span className="font-mono text-yellow-400">
                    {(scenario.provenance?.confidence || 0) * 100}%
                  </span>
                </div>
              </div>

              {/* Top Actions */}
              <div className="mt-4 pt-4 border-t border-slate-600">
                <div className="text-xs font-medium text-slate-300 mb-2">Strategy Profile:</div>
                <div className="space-y-1">
                  {Object.entries(scenario.equilibrium.profile).slice(0, 2).map(([player, actions]) => (
                    <div key={player} className="text-xs text-slate-400">
                      <span className="font-medium">{player}:</span> {
                        Object.entries(actions)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 1)[0]?.[0] || 'mixed'
                      } ({((Object.entries(actions).sort((a, b) => b[1] - a[1])[0]?.[1] || 0) * 100).toFixed(0)}%)
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance Indicator */}
              <div className="mt-4 flex items-center gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.ceil(scenario.strategic_score / 20)
                        ? 'text-yellow-400 fill-current'
                        : 'text-slate-600'
                    }`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Trends Analysis */}
      {comparisonView === 'trends' && (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center mb-6">
            <TrendingUp className="w-6 h-6 mr-3 text-green-400" />
            <h3 className="text-xl font-semibold text-slate-200">Strategic Trend Analysis</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Over Time Simulation */}
            <div className="h-80">
              <h4 className="text-sm font-medium text-slate-300 mb-4">Strategy Performance Evolution</h4>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={sortedScenarios.map((s, idx) => ({
                    scenario: s.name.split(' ')[0] + '...' + s.name.split(' ')[1]?s.name.split(' ')[1].charAt(0):'',
                    score: safeNumber(s.strategic_score) || 0,
                    stability: safeNumber(s.equilibrium?.stability) || 0,
                    processing: safeNumber(s.processing_stats?.processing_time_ms) || 0,
                    order: sortedScenarios.length - idx
                  }))}
                >
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="scenario" stroke="#94a3b8" />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#06b6d4"
                    fill="url(#scoreGradient)"
                    name="Strategic Score"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Risk vs Reward Analysis */}
            <div className="h-80">
              <h4 className="text-sm font-medium text-slate-300 mb-4">Risk-Reward Distribution</h4>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  data={sortedScenarios.map(s => ({
                    reward: safeNumber(s.strategic_score) || 0,
                    risk: (1 - (safeNumber(s.equilibrium?.stability) || 0)) * 100,
                    name: s.name.split(' ')[0],
                    confidence: safeNumber(s.provenance?.confidence) || 0
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    type="number"
                    dataKey="reward"
                    name="Expected Reward"
                    domain={[60, 100]}
                    stroke="#94a3b8"
                  />
                  <YAxis
                    type="number"
                    dataKey="risk"
                    name="Risk Level"
                    domain={[0, 50]}
                    stroke="#94a3b8"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number, name: string) =>
                      name === 'Expected Reward' ? [`${value}%`, 'Reward Potential'] :
                      name === 'Risk Level' ? [`${value}%`, 'Risk Level'] :
                      [value, name]
                    }
                  />
                  <Scatter
                    dataKey="risk"
                    fill="#ef4444"
                    name="Strategy Risk/Reward"
                  />
                </ScatterChart>
              </ResponsiveContainer>
              <p className="text-xs text-slate-400 mt-2 text-center">
                Optimal strategies maximize reward while minimizing risk
              </p>
            </div>
          </div>

          {/* Strategic Recommendations */}
          <div className="mt-6 p-4 bg-cyan-900/20 rounded-lg border border-cyan-500/30">
            <div className="flex items-center mb-3">
              <Target className="w-4 h-4 mr-2 text-cyan-400" />
              <span className="text-sm font-medium text-cyan-300">Strategic Recommendations</span>
            </div>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Winners:</strong> {
                  sortedScenarios.filter(s => s.strategic_score > 80)
                    .map(s => s.name.split(' ')[0])
                    .join(', ')
                }
                show consistent superiority across stability and efficiency metrics.
              </p>
              <p>
                <strong>Risk Trade-offs:</strong> Higher scoring strategies typically involve moderate risk,
                suggesting balanced approaches perform best in uncertain environments.
              </p>
              <p>
                <strong>Diversification:</strong> {
                  sortedScenarios.length > 1 ? 'Maintaining strategy diversity across ' +
                  new Set(sortedScenarios.map(s => s.equilibrium.method)).size + ' different game-theoretic models '
                  + 'provides robust decision coverage.' : 'Multiple strategic approaches enhance decision resilience.'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Learning Mode Insights */}
      {isLearningMode && (
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-2 text-blue-400" />
            <span className="text-sm font-medium text-blue-300">Comparison Learning Insights</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 space-y-1">
            <p>• Compare strategic outcomes across different models to understand assumption impacts</p>
            <p>• Higher scorable strategies typically balance risk and reward more effectively</p>
            <p>• Stability and efficiency trade-offs vary significantly by strategic context</p>
            <p>• Best practices emerge from consistent patterns across multiple scenarios</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiScenarioComparison;