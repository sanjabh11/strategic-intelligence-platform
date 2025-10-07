// Strategic Intelligence Simulator - Main Component
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useStrategyAnalysis, getExampleScenarios } from '../hooks/useStrategyAnalysis';
import { useQueryHistoryCache } from '../hooks/useQueryHistoryCache';
import type { AnalysisOptions } from '../types/strategic-analysis';
import { Loader2, AlertCircle, CheckCircle2, Clock, Zap, Brain, Target, TrendingUp, Globe } from 'lucide-react';
import PerplexityDashboard from './PerplexityDashboard';
import FirecrawlDashboard from './FirecrawlDashboard';
import { ChartHeader, useLearningMode, explanationContent } from './explanations';
import type { ExplanationSection } from './explanations';
import { AudienceViewRouter } from './audience-views';
import { supabase } from '../lib/supabase';
import type { AudienceAnalysisData } from '../types/audience-views';

const StrategySimulator: React.FC = () => {
  const {
    analysis,
    loading,
    error,
    status,
    analysisRunId,
    runAnalysis,
    clearResults,
    canRunAnalysis
  } = useStrategyAnalysis();

  // Query history cache hook
  const { cachedQueries, addQueryToCache, clearCache, getCacheStats } = useQueryHistoryCache();

  // Learning mode context
  const { isLearningMode } = useLearningMode();

  // Audience analysis_json loader (real data)
  const [audienceData, setAudienceData] = useState<AudienceAnalysisData | null>(null);
  const [audienceError, setAudienceError] = useState<string | null>(null);
  const [audienceLoading, setAudienceLoading] = useState(false);

  useEffect(() => {
    async function loadAudience() {
      try {
        setAudienceError(null);
        setAudienceLoading(true);
        setAudienceData(null);
        if (!supabase) {
          setAudienceError('Supabase client not configured.');
          return;
        }
        // analysisRunId is managed by the hook
        // We only fetch after completion when id is present
        if (status === 'completed' && analysis && analysisRunId) {
          const { data, error: qErr } = await supabase
            .from('analysis_runs')
            .select('analysis_json')
            .eq('id', analysisRunId)
            .maybeSingle();
          if (qErr) {
            setAudienceError(qErr.message);
            return;
          }
          const aj = (data as any)?.analysis_json;
          if (aj && typeof aj === 'object') {
            setAudienceData(aj as AudienceAnalysisData);
          } else {
            setAudienceError('No audience analysis available for this run.');
          }
        }
      } catch (e: any) {
        setAudienceError(e?.message || String(e));
      } finally {
        setAudienceLoading(false);
      }
    }
    loadAudience();
  }, [status, analysis, analysisRunId]);

  // Safe number validation function
  const safeNumber = (v: any): number | null => (typeof v === 'number' && isFinite(v) ? v : null);

  // All useState hooks must be called unconditionally at the top
  const [scenario, setScenario] = useState<string>(
    "Three major technology companies (Apple, Google, Microsoft) must decide on AI safety standards. Each can choose to 'lead with strict standards', 'follow industry consensus', or 'maintain competitive advantage'. Their decisions affect regulatory oversight, public trust, innovation pace, and market positioning."
  );
  const [mode, setMode] = useState<'standard' | 'education_quick'>('standard');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showFirecrawlResearch, setShowFirecrawlResearch] = useState(false);
  const [advancedOptions, setAdvancedOptions] = useState<AnalysisOptions>({
    beliefDepth: 2,
    adaptationRate: 0.2,
    iterations: 500,
    decoherenceRate: 0.15
  });
  
  const exampleScenarios = getExampleScenarios();
  
  const handleRunAnalysis = async () => {
    const startTime = Date.now();
    await runAnalysis({
      scenario_text: scenario,
      mode: mode,
      options: showAdvanced ? advancedOptions : {}
    });

    // Cache the query (we'll rely on the hook's logic to manage updates)
    // Note: We cache immediately when the analysis starts, and it will be updated when results come back
    const externalSourcesCount = 0; // Will be updated when results arrive
    addQueryToCache({
      query: scenario,
      analysisResult: null, // Will be updated when analysis completes
      mode: mode,
      processingTimeMs: undefined, // Will be updated when analysis completes
      externalSourcesCount
    });
  };

  // Action sets (per-player)
  const ActionSets = () => {
    if (!analysis?.players || analysis.players.length === 0) return null;
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <ChartHeader
          title="Action Sets by Player"
          icon={<Target className="w-5 h-5 mr-2 text-emerald-400" />}
          helpContent={{
            title: 'Action Sets',
            quickTip: 'Lists the available actions for each player used in the equilibrium analysis.',
            detailed: 'Understanding each player\'s action set clarifies what strategies were considered when computing the equilibrium and quantum distributions.',
            keyPoints: [
              'Actions represent each player\'s strategic choices',
              'The equilibrium probabilities are over these actions',
              'Use this to validate model inputs'
            ]
          } as ExplanationSection}
          isLearningMode={isLearningMode}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analysis.players.map((p) => (
            <div key={p.id} className="bg-slate-700 p-4 rounded-lg border border-slate-600">
              <div className="font-medium text-slate-200 mb-2">{p.name || p.id}</div>
              <div className="flex flex-wrap gap-2">
                {p.actions.map((a) => (
                  <span key={a} className="text-xs px-2 py-1 rounded bg-slate-600 text-slate-200 border border-slate-500">{a}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Forecast visualization (optional)
  const ForecastChart = () => {
    if (!analysis?.forecast || analysis.forecast.length === 0) return null;
    const data = analysis.forecast.map(d => ({ t: safeNumber(d.t) || 0, probability: safeNumber(d.probability) || 0 }));
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <ChartHeader
          title="Outcome Probability Forecast"
          icon={<TrendingUp className="w-5 h-5 mr-2 text-emerald-400" />}
          helpContent={explanationContent.analysisMetadata}
          isLearningMode={isLearningMode}
        />
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="t" stroke="#9ca3af" />
              <YAxis domain={[0, 1]} stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#f3f4f6' }}
                formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, 'Probability']}
              />
              <Line type="monotone" dataKey="probability" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };
  
  const loadExampleScenario = (exampleScenario: string) => {
    setScenario(exampleScenario);
  };
  
  // Status indicator component
  const StatusIndicator = () => {
    const statusConfig = {
      idle: { color: 'text-slate-400', bg: 'bg-slate-800', icon: Clock, text: 'Ready' },
      queued: { color: 'text-blue-400', bg: 'bg-blue-900/30', icon: Clock, text: 'Queued' },
      processing: { color: 'text-cyan-400', bg: 'bg-cyan-900/30', icon: Loader2, text: 'Processing' },
      completed: { color: 'text-emerald-400', bg: 'bg-emerald-900/30', icon: CheckCircle2, text: 'Complete' },
      failed: { color: 'text-red-400', bg: 'bg-red-900/30', icon: AlertCircle, text: 'Failed' }
    };
    
    const config = statusConfig[status];
    const IconComponent = config.icon;
    
    return (
      <div className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium ${config.color} ${config.bg} border border-slate-700`}>
        <IconComponent className={`w-4 h-4 mr-2 ${status === 'processing' ? 'animate-spin' : ''}`} />
        {config.text}
      </div>
    );
  };
  
  // Equilibrium visualization (robust to number or object values)
  const EquilibriumChart = () => {
    if (!analysis?.equilibrium?.profile) return null;
    
    const playerNameMap = new Map((analysis.players || []).map(p => [p.id, p.name || p.id]));
    const profileEntries = Object.entries(analysis.equilibrium.profile);
    const allActions = Array.from(new Set(profileEntries.flatMap(([_, strategies]) => Object.keys(strategies as Record<string, any>))));

    const data = profileEntries.map(([playerId, strategies]) => {
      const row: Record<string, any> = { player: playerNameMap.get(playerId) || playerId };
      for (const action of allActions) {
        const v: any = (strategies as any)[action];
        const num = typeof v === 'number' ? v : (v && typeof v === 'object' && typeof v.value === 'number') ? v.value : 0;
        row[action] = num;
      }
      return row;
    });

    const actionKeys = allActions;
    const colors = ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <ChartHeader
          title="Nash Equilibrium Profile"
          icon={<Target className="w-5 h-5 mr-2 text-cyan-400" />}
          helpContent={explanationContent.nashEquilibrium}
          isLearningMode={isLearningMode}
        />
        
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="player" stroke="#9ca3af" />
              <YAxis domain={[0, 1]} stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#f3f4f6' }}
                formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, 'Probability']}
              />
              <Legend />
              {actionKeys.map((action, idx) => (
                <Bar key={action} dataKey={action} fill={colors[idx % colors.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-slate-700 p-3 rounded-lg">
            <span className="text-slate-400">Stability Score</span>
            <div className="text-lg font-mono text-cyan-400">{(analysis.equilibrium.stability * 100).toFixed(1)}%</div>
          </div>
          <div className="bg-slate-700 p-3 rounded-lg">
            <span className="text-slate-400">Method</span>
            <div className="text-lg font-mono text-emerald-400">{analysis.equilibrium.method}</div>
          </div>
          {analysis.equilibrium.convergenceIteration !== undefined && (
            <div className="bg-slate-700 p-3 rounded-lg">
              <span className="text-slate-400">Convergence Iteration</span>
              <div className="text-lg font-mono text-purple-400">{analysis.equilibrium.convergenceIteration}</div>
            </div>
          )}
          {analysis.equilibrium.confidence && (
            <div className="bg-slate-700 p-3 rounded-lg">
              <span className="text-slate-400">Confidence Interval</span>
              <div className="text-lg font-mono text-blue-400">
                {(analysis.equilibrium.confidence.lower * 100).toFixed(1)}% - {(analysis.equilibrium.confidence.upper * 100).toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Quantum visualization
  const QuantumChart = () => {
    if (!analysis?.quantum?.collapsed) return null;

    const data = analysis.quantum.collapsed.map(item => {
      const safeProb = safeNumber(item.probability) || 0;
      return {
        action: item.action,
        probability: safeProb,
        percentage: safeProb * 100
      };
    });
    
    const colors = ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const influence = analysis.quantum?.influence;
    const hasInfluence = Array.isArray(influence) && influence.length > 0 && Array.isArray(influence[0]);
    const infValues = hasInfluence ? (influence as number[][]).flat() : [];
    const infMin = hasInfluence ? Math.min(...infValues) : 0;
    const infMax = hasInfluence ? Math.max(...infValues) : 1;
    const denom = infMax - infMin === 0 ? 1 : infMax - infMin;
    const rowLabels = (analysis.players || []).map((p, idx) => p.name || p.id || `P${idx + 1}`);
    const colLabels = rowLabels; // assume square matrix for initial version
    
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <ChartHeader
          title="Quantum Strategy Collapse"
          icon={<Zap className="w-5 h-5 mr-2 text-cyan-400" />}
          helpContent={explanationContent.quantumStrategy}
          isLearningMode={isLearningMode}
        />
        
        <div className="flex flex-wrap gap-6">
          <div className="flex-1 min-w-64">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="probability"
                    nameKey="action"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({action, percentage}) => `${action}: ${percentage.toFixed(1)}%`}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="flex-1 min-w-48">
            <h5 className="font-medium mb-3 text-slate-300">Probability Distribution</h5>
            <div className="space-y-3">
              {data.map((item, idx) => (
                <div key={item.action} className="bg-slate-700 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded mr-2" 
                        style={{ backgroundColor: colors[idx % colors.length] }}
                      ></div>
                      <span className="text-sm text-slate-300">{item.action}</span>
                    </div>
                    <span className="text-sm font-mono text-cyan-400">{item.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-600 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ 
                        backgroundColor: colors[idx % colors.length],
                        width: `${item.percentage}%` 
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {hasInfluence && (
            <div className="w-full mt-4">
              <h5 className="font-medium mb-3 text-slate-300">Influence Matrix</h5>
              <div className="overflow-x-auto">
                <div
                  className="inline-grid"
                  style={{ gridTemplateColumns: `auto repeat(${(influence as number[][])[0].length}, minmax(28px, 1fr))` }}
                >
                  <div></div>
                  {(influence as number[][])[0].map((_, cIdx) => (
                    <div key={`col-${cIdx}`} className="text-xs text-slate-400 px-2 py-1 text-center">
                      {colLabels[cIdx] || `C${cIdx + 1}`}
                    </div>
                  ))}
                  {(influence as number[][]).map((row, rIdx) => (
                    <div key={`row-${rIdx}`} style={{ display: 'contents' }}>
                      <div className="text-xs text-slate-400 px-2 py-1">{rowLabels[rIdx] || `R${rIdx + 1}`}</div>
                      {row.map((v, cIdx) => {
                        const t = (v - infMin) / denom;
                        const hue = Math.round(200 - 200 * t); // 200 (blue) -> 0 (red)
                        const bg = `hsl(${hue} 80% 45%)`;
                        return (
                          <div
                            key={`cell-${rIdx}-${cIdx}`}
                            className="w-7 h-7 border border-slate-600"
                            title={`(${rowLabels[rIdx] || rIdx + 1}, ${colLabels[cIdx] || cIdx + 1}) = ${v.toFixed(3)}`}
                            style={{ backgroundColor: bg }}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-400">Low (blue) → High (red)</div>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Pattern matches
  const PatternMatches = () => {
    if (!analysis?.pattern_matches || analysis.pattern_matches.length === 0) return null;
    
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <ChartHeader
          title="Similar Strategic Patterns"
          icon={<Brain className="w-5 h-5 mr-2 text-cyan-400" />}
          helpContent={explanationContent.patternMatches}
          isLearningMode={isLearningMode}
        />
        
        <div className="space-y-3">
          {analysis.pattern_matches.map((match, idx) => (
            <div key={match.id} className="bg-slate-700 p-4 rounded-lg border border-slate-600">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <span className="font-medium text-slate-200">
                    {match.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
                <div className="text-right ml-4">
                  <div className="text-sm font-mono text-cyan-400">{(match.score * 100).toFixed(1)}% match</div>
                  <div className="w-24 bg-slate-600 rounded-full h-2 mt-2">
                    <div 
                      className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${match.score * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Analysis metadata
  const AnalysisMetadata = () => {
    if (!analysis?.processing_stats && !analysis?.provenance) return null;
    
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <ChartHeader
          title="Analysis Metadata"
          icon={<TrendingUp className="w-5 h-5 mr-2 text-cyan-400" />}
          helpContent={explanationContent.analysisMetadata}
          isLearningMode={isLearningMode}
        />
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {analysis.processing_stats?.processing_time_ms && (
            <div className="bg-slate-700 p-3 rounded-lg">
              <div className="text-sm text-slate-400">Processing Time</div>
              <div className="text-lg font-mono text-cyan-400">{analysis.processing_stats.processing_time_ms}ms</div>
            </div>
          )}
          {analysis.provenance?.retrieval_count !== undefined && (
            <div className="bg-slate-700 p-3 rounded-lg">
              <div className="text-sm text-slate-400">Evidence Sources</div>
              <div className="text-lg font-mono text-emerald-400">{analysis.provenance.retrieval_count}</div>
            </div>
          )}
          {analysis.provenance?.model && (
            <div className="bg-slate-700 p-3 rounded-lg">
              <div className="text-sm text-slate-400">Analysis Engine</div>
              <div className="text-lg font-mono text-blue-400">{analysis.provenance.model}</div>
            </div>
          )}
          {analysis.provenance?.evidence_backed !== undefined && (
            <div className="bg-slate-700 p-3 rounded-lg">
              <div className="text-sm text-slate-400">Evidence Backed</div>
              <div className={`text-lg font-mono ${analysis.provenance.evidence_backed ? 'text-emerald-400' : 'text-yellow-400'}`}>
                {analysis.provenance.evidence_backed ? 'Yes' : 'No'}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">

        {/* Audience Views Section: real analysis_json rendering */}
        {audienceLoading && (
          <div className="mb-6 p-4 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 text-sm">Loading audience view...</div>
        )}
        {audienceError && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-600/30 rounded-lg text-red-300 text-sm">{audienceError}</div>
        )}
        {status === 'completed' && audienceData && (
          <div className="mb-8">
            <AudienceViewRouter
              analysisData={audienceData}
              analysisRunId={analysisRunId || undefined}
              isLoading={false}
            />
          </div>
        )}
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Strategic Intelligence Platform
            </h1>
            <StatusIndicator />
          </div>
          <p className="text-slate-400 text-lg">
            Advanced game-theoretic analysis using quantum-inspired algorithms, recursive Nash equilibria, and strategic pattern mining.
          </p>
        </div>
        
        {/* Input Section */}
        <div className="bg-slate-800 rounded-xl p-6 mb-8 border border-slate-700">
          <h2 className="text-2xl font-semibold mb-6 text-slate-200">Strategic Scenario Analysis</h2>
          
          {/* Example Scenarios */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3 text-slate-300">Example Scenarios</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {exampleScenarios.map((example, idx) => (
                <button
                  key={idx}
                  onClick={() => loadExampleScenario(example.scenario)}
                  className="text-left p-3 bg-slate-700 hover:bg-slate-600 rounded-lg border border-slate-600 hover:border-cyan-500 transition-colors"
                >
                  <div className="text-sm font-medium text-cyan-400 mb-1">{example.title}</div>
                  <div className="text-xs text-slate-400 line-clamp-2">{example.scenario.substring(0, 100)}...</div>
                </button>
              ))}
            </div>
          </div>

          {/* Query History */}
          {cachedQueries.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3 text-slate-300 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-blue-400" />
                Recent Queries ({cachedQueries.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {cachedQueries.map((cachedQuery) => (
                  <button
                    key={cachedQuery.id}
                    onClick={() => {
                      setScenario(cachedQuery.query);
                      if (cachedQuery.analysisResult) {
                        // If we have the result cached, we could potentially load it directly
                        // For now, we'll just set the scenario text
                      }
                    }}
                    className="text-left p-3 bg-slate-700 hover:bg-slate-600 rounded-lg border border-slate-600 hover:border-blue-500 transition-colors"
                  >
                    <div className="text-sm font-medium text-blue-400 mb-1">
                      {cachedQuery.mode === 'standard' ? 'Standard Analysis' : 'Education Quick'}
                    </div>
                    <div className="text-xs text-slate-400 line-clamp-2 mb-2">
                      {cachedQuery.query.substring(0, 120)}...
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {cachedQuery.processingTimeMs
                          ? `${cachedQuery.processingTimeMs}ms`
                          : 'Cached'}
                      </span>
                      <span>
                        {cachedQuery.externalSourcesCount > 0
                          ? `${cachedQuery.externalSourcesCount} sources`
                          : 'Local'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={clearCache}
                  className="text-xs text-slate-400 hover:text-slate-300 px-3 py-1 rounded hover:bg-slate-700 transition-colors"
                >
                  Clear History
                </button>
              </div>
            </div>
          )}

          {/* Firecrawl Research */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowFirecrawlResearch(!showFirecrawlResearch)}
                className={`flex items-center px-4 py-2 rounded-lg border transition-colors ${
                  showFirecrawlResearch
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
                }`}
              >
                <Globe className="w-5 h-5 mr-2" />
                {showFirecrawlResearch ? 'Hide Web Research' : 'Show Web Research'}
              </button>
              <div className="text-xs text-slate-400">
                Advanced web scraping & content analysis
              </div>
            </div>

            {/* Firecrawl Dashboard */}
            {showFirecrawlResearch && (
              <div className="mt-6">
                <FirecrawlDashboard />
              </div>
            )}
          </div>

          {/* Scenario Input */}
          <div className="space-y-4">
            <div>
              <label htmlFor="scenario" className="block text-sm font-medium text-slate-300 mb-2">
                Strategic Scenario Description
              </label>
              <textarea
                id="scenario"
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                rows={4}
                className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white placeholder-slate-400"
                placeholder="Describe the strategic situation, key actors, and their potential actions..."
              />
            </div>
            
            {/* Analysis Mode */}
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Analysis Mode</label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="standard"
                      checked={mode === 'standard'}
                      onChange={(e) => setMode(e.target.value as 'standard')}
                      className="mr-2 text-cyan-500 focus:ring-cyan-500"
                    />
                    <span className="text-sm text-slate-300">Standard (Full Analysis)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="education_quick"
                      checked={mode === 'education_quick'}
                      onChange={(e) => setMode(e.target.value as 'education_quick')}
                      className="mr-2 text-cyan-500 focus:ring-cyan-500"
                    />
                    <span className="text-sm text-slate-300">Education Quick</span>
                  </label>
                </div>
              </div>
              
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-cyan-400 hover:text-cyan-300 underline"
              >
                {showAdvanced ? 'Hide' : 'Show'} Advanced Options
              </button>
            </div>
            
            {/* Advanced Options */}
            {showAdvanced && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-700 rounded-lg border border-slate-600">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Belief Depth</label>
                  <input
                    type="number"
                    value={advancedOptions.beliefDepth}
                    onChange={(e) => setAdvancedOptions({...advancedOptions, beliefDepth: parseInt(e.target.value)})}
                    min="1" max="5"
                    className="w-full text-sm bg-slate-600 border border-slate-500 rounded px-2 py-1 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Adaptation Rate</label>
                  <input
                    type="number"
                    value={advancedOptions.adaptationRate}
                    onChange={(e) => setAdvancedOptions({...advancedOptions, adaptationRate: parseFloat(e.target.value)})}
                    min="0.01" max="1" step="0.01"
                    className="w-full text-sm bg-slate-600 border border-slate-500 rounded px-2 py-1 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Max Iterations</label>
                  <input
                    type="number"
                    value={advancedOptions.iterations}
                    onChange={(e) => setAdvancedOptions({...advancedOptions, iterations: parseInt(e.target.value)})}
                    min="100" max="2000"
                    className="w-full text-sm bg-slate-600 border border-slate-500 rounded px-2 py-1 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Decoherence Rate</label>
                  <input
                    type="number"
                    value={advancedOptions.decoherenceRate}
                    onChange={(e) => setAdvancedOptions({...advancedOptions, decoherenceRate: parseFloat(e.target.value)})}
                    min="0" max="1" step="0.01"
                    className="w-full text-sm bg-slate-600 border border-slate-500 rounded px-2 py-1 text-white"
                  />
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex space-x-4 pt-2">
              <button
                onClick={handleRunAnalysis}
                disabled={!canRunAnalysis || !scenario.trim()}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center ${
                  !canRunAnalysis || !scenario.trim()
                    ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-600 to-emerald-600 text-white hover:from-cyan-500 hover:to-emerald-500 shadow-lg hover:shadow-xl'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                    {status === 'queued' ? 'Queuing Analysis...' : 
                     status === 'processing' ? 'Processing...' : 'Analyzing...'}
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Run Strategic Analysis
                  </>
                )}
              </button>
              
              {analysis && (
                <button
                  onClick={clearResults}
                  className="px-4 py-3 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors border border-slate-600"
                >
                  Clear Results
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 mb-8">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-red-400" />
              <span className="text-red-300 font-medium">Analysis Error</span>
            </div>
            <p className="text-red-200 mt-2">{error}</p>
          </div>
        )}
        
        {/* Results Section */}
        {analysis && (
          <div className="space-y-8">
            <PerplexityDashboard analysis={analysis} />
            <EquilibriumChart />
            <ActionSets />
            <ForecastChart />
            <QuantumChart />
            <PatternMatches />
            <AnalysisMetadata />
            {/* Advanced Insights from strategic engines (optional chaining to avoid type constraints) */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <ChartHeader
                title="Advanced Strategic Insights"
                icon={<Brain className="w-5 h-5 mr-2 text-emerald-400" />}
                helpContent={{
                  title: 'Advanced Insights',
                  quickTip: 'Results from enhanced engines: symmetry mining, information value, outcome forecasting.',
                  detailed: 'These insights come from specialized engines that augment the base equilibrium: cross-domain recommendations, EVPI analysis, and temporal forecasts.'
                } as any}
                isLearningMode={isLearningMode}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Cross-Domain Recommendations */}
                <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                  <div className="font-medium text-slate-200 mb-2">Cross-Domain Recommendations</div>
                  <div className="space-y-2 text-sm text-slate-300">
                    {((analysis as any)?.crossDomainInsights || (analysis as any)?.symmetryAnalysis?.strategicRecommendations || []).slice(0,3).map((rec: any, idx: number) => (
                      <div key={idx} className="bg-slate-600/60 p-2 rounded">
                        <div className="text-emerald-300">{rec?.strategy || rec?.title || `Recommendation ${idx+1}`}</div>
                        <div className="text-slate-400 text-xs">{rec?.reasoning || rec?.rationale || rec?.description || 'Analogical reasoning supports transfer.'}</div>
                      </div>
                    ))}
                    {(((analysis as any)?.crossDomainInsights || (analysis as any)?.symmetryAnalysis?.strategicRecommendations || []).length === 0) && (
                      <div className="text-slate-400 text-sm">No recommendations available.</div>
                    )}
                  </div>
                </div>
                {/* Information Value Highlights (Gap Fix #7 - Updated to use evpi_analysis) */}
                <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                  <div className="font-medium text-slate-200 mb-2">Information Value (EVPI)</div>
                  <div className="space-y-2 text-sm text-slate-300">
                    {(() => {
                      const evpiData = (analysis as any)?.evpi_analysis
                      if (evpiData) {
                        const ranking = evpiData.sensitivityAnalysis?.informationValueRanking || []
                        return (
                          <>
                            <div className="bg-slate-600/60 p-2 rounded mb-2">
                              <div className="text-xs text-slate-400 mb-1">Expected Value of Perfect Information</div>
                              <div className="font-mono text-emerald-300 text-lg">
                                ${(evpiData.expectedValueOfPerfectInformation || 0).toFixed(2)}
                              </div>
                            </div>
                            <div className="text-xs text-slate-400 mb-1">Most Valuable Information:</div>
                            {ranking.slice(0, 3).map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between bg-slate-600/60 p-2 rounded">
                                <span className="capitalize">{item.nodeId?.replace(/_/g, ' ') || `Info ${idx + 1}`}</span>
                                <span className="font-mono text-cyan-300">${(item.marginalValue || 0).toFixed(2)}</span>
                              </div>
                            ))}
                          </>
                        )
                      }
                      return <div className="text-slate-400 text-sm">EVPI analysis will appear here after computation.</div>
                    })()}
                  </div>
                </div>
                {/* Outcome Forecast Snapshot (Gap Fix #7 - Updated to use outcome_forecasts) */}
                <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                  <div className="font-medium text-slate-200 mb-2">Outcome Forecast Snapshot</div>
                  <div className="space-y-2 text-sm text-slate-300">
                    {(() => {
                      const forecastData = (analysis as any)?.outcome_forecasts
                      if (forecastData?.forecasts) {
                        const firstOutcome = Object.keys(forecastData.forecasts)[0]
                        const forecast = forecastData.forecasts[firstOutcome] || []
                        const firstPoint = forecast[0]
                        const lastPoint = forecast[forecast.length - 1]
                        
                        return (
                          <>
                            <div className="bg-slate-600/60 p-2 rounded">
                              <div className="text-xs text-slate-400 mb-1">Time Horizon: {forecastData.scenario?.timeHorizon || 168} hours</div>
                              <div className="flex justify-between">
                                <div>
                                  <div className="text-xs text-slate-400">Initial</div>
                                  <span className="text-emerald-300">{((firstPoint?.probability || 0) * 100).toFixed(1)}%</span>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs text-slate-400">Final</div>
                                  <span className="text-amber-300">{((lastPoint?.probability || 0) * 100).toFixed(1)}%</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-xs text-slate-400 mt-2">
                              {forecast.length} forecast points computed over {Math.round((forecastData.scenario?.timeHorizon || 168) / 24)} days
                            </div>
                          </>
                        )
                      }
                      return <div className="text-slate-400 text-sm">Outcome forecast will appear here after computation.</div>
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StrategySimulator;
