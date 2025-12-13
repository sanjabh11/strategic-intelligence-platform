// Strategy Console - Core Product Component
// Hero-style analysis interface aligned with Whop monetization strategy
// Central prompt + "Run Analysis" CTA + Engine selection + Tier gating

import React, { useState, useEffect } from 'react';
import { 
  Brain, Zap, Sparkles, Crown, Play, ChevronDown, ChevronUp,
  FileText, Search, Loader2, CheckCircle2, AlertCircle, Clock,
  Atom, GitBranch, Layers, TrendingUp, Target, Info, Lock, Shield
} from 'lucide-react';
import { useStrategyAnalysis, getExampleScenarios } from '../hooks/useStrategyAnalysis';
import { useSubscription, SubscriptionTier } from '../hooks/useSubscription';
import { AudienceViewRouter } from './audience-views';
import type { AudienceAnalysisData } from '../types/audience-views';
import { supabase } from '../lib/supabase';
import WelcomeToConsole from './WelcomeToConsole';

// Engine configuration with tier requirements
interface EngineConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  minTier: 'basic' | 'pro' | 'elite';
  color: string;
}

const ENGINES: EngineConfig[] = [
  {
    id: 'baseline',
    name: 'Baseline Analysis',
    description: 'Standard Nash equilibrium computation',
    icon: Brain,
    minTier: 'basic',
    color: 'cyan'
  },
  {
    id: 'recursive',
    name: 'Recursive Equilibrium',
    description: 'Multi-level belief modeling ("I think you think...")',
    icon: GitBranch,
    minTier: 'pro',
    color: 'purple'
  },
  {
    id: 'symmetry',
    name: 'Symmetry Mining',
    description: 'Pattern recognition across strategic structures',
    icon: Layers,
    minTier: 'pro',
    color: 'blue'
  },
  {
    id: 'quantum',
    name: 'Quantum Strategy',
    description: 'Stochastic superposition modeling',
    icon: Atom,
    minTier: 'pro',
    color: 'emerald'
  },
  {
    id: 'voi',
    name: 'Value of Information',
    description: 'Information gain optimization',
    icon: Target,
    minTier: 'pro',
    color: 'amber'
  },
  {
    id: 'forecasting',
    name: 'Forecasting Engine',
    description: 'Temporal outcome probability projection',
    icon: TrendingUp,
    minTier: 'elite',
    color: 'rose'
  }
];

// Map subscription tiers to Whop tiers
const mapToWhopTier = (tier: SubscriptionTier): 'basic' | 'pro' | 'elite' => {
  switch (tier) {
    case 'free':
    case 'analyst':
      return 'basic';
    case 'pro':
    case 'academic':
      return 'pro';
    case 'enterprise':
      return 'elite';
    default:
      return 'basic';
  }
};

const tierHierarchy: Record<string, number> = {
  'basic': 1,
  'pro': 2,
  'elite': 3
};

const StrategyConsole: React.FC = () => {
  const {
    analysis,
    loading,
    error,
    status,
    analysisRunId,
    runAnalysis,
    clearResults
  } = useStrategyAnalysis();

  const { currentTier, hasFeature, loading: subLoading } = useSubscription();
  const whopTier = mapToWhopTier(currentTier);

  // State
  const [prompt, setPrompt] = useState('');
  const [selectedEngines, setSelectedEngines] = useState<string[]>(['baseline']);
  const [showEngines, setShowEngines] = useState(false);
  const [evidenceEnabled, setEvidenceEnabled] = useState(true);
  const [audienceData, setAudienceData] = useState<AudienceAnalysisData | null>(null);
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [analysisRunCount, setAnalysisRunCount] = useState(0);

  // Load run count from localStorage
  useEffect(() => {
    const count = parseInt(localStorage.getItem('strategy-console-run-count') || '0', 10);
    setAnalysisRunCount(count);
  }, []);

  const exampleScenarios = getExampleScenarios();

  // Check if engine is accessible for current tier
  const canAccessEngine = (engine: EngineConfig): boolean => {
    return tierHierarchy[whopTier] >= tierHierarchy[engine.minTier];
  };

  // Toggle engine selection
  const toggleEngine = (engineId: string) => {
    const engine = ENGINES.find(e => e.id === engineId);
    if (!engine || !canAccessEngine(engine)) return;

    if (engineId === 'baseline') {
      // Baseline is always required
      return;
    }

    setSelectedEngines(prev => 
      prev.includes(engineId)
        ? prev.filter(id => id !== engineId)
        : [...prev, engineId]
    );
  };

  // Load audience data when analysis completes
  useEffect(() => {
    async function loadAudience() {
      if (status === 'completed' && analysis && analysisRunId) {
        setAudienceLoading(true);
        try {
          const { data, error: qErr } = await supabase
            .from('analysis_runs')
            .select('analysis_json')
            .eq('id', analysisRunId)
            .maybeSingle();
          
          if (!qErr && data?.analysis_json) {
            setAudienceData(data.analysis_json as AudienceAnalysisData);
          }
        } catch (e) {
          console.error('Failed to load audience data:', e);
        } finally {
          setAudienceLoading(false);
        }
      }
    }
    loadAudience();
  }, [status, analysis, analysisRunId]);

  // Run analysis handler
  const handleRunAnalysis = async () => {
    if (!prompt.trim()) return;

    await runAnalysis({
      scenario_text: prompt,
      mode: selectedEngines.length > 1 ? 'standard' : 'education_quick',
      options: {
        beliefDepth: selectedEngines.includes('recursive') ? 3 : 2,
        iterations: selectedEngines.length > 2 ? 1000 : 500
      }
    });
  };

  // Status configuration
  const statusConfig = {
    idle: { color: 'text-slate-400', bg: 'bg-slate-800', icon: Clock, text: 'Ready to analyze' },
    queued: { color: 'text-blue-400', bg: 'bg-blue-900/30', icon: Clock, text: 'Queued...' },
    processing: { color: 'text-cyan-400', bg: 'bg-cyan-900/30', icon: Loader2, text: 'Analyzing...' },
    completed: { color: 'text-emerald-400', bg: 'bg-emerald-900/30', icon: CheckCircle2, text: 'Complete' },
    failed: { color: 'text-red-400', bg: 'bg-red-900/30', icon: AlertCircle, text: 'Failed' }
  };

  const currentStatus = statusConfig[status];
  const StatusIcon = currentStatus.icon;

  // Increment run count after successful analysis
  useEffect(() => {
    if (status === 'completed') {
      const newCount = analysisRunCount + 1;
      setAnalysisRunCount(newCount);
      localStorage.setItem('strategy-console-run-count', newCount.toString());
    }
  }, [status]);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Welcome Modal for new users or <3 runs */}
      {showWelcome && (
        <WelcomeToConsole 
          analysisRunCount={analysisRunCount}
          onDismiss={() => setShowWelcome(false)}
        />
      )}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Strategy Console
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Run evidence-backed strategic analysis in seconds. 
            Real citations. Real simulations. Real clarity.
          </p>
        </div>

        {/* Main Console Card */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
          {/* Prompt Input Section */}
          <div className="p-6 md:p-8">
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Describe your strategic scenario
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Three tech companies must decide on AI safety standards. Each can lead with strict standards, follow consensus, or prioritize competitive advantage..."
              className="w-full h-36 px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none text-base"
            />

            {/* Quick Examples */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-xs text-slate-500">Try:</span>
              {exampleScenarios.slice(0, 3).map((example, idx) => (
                <button
                  key={idx}
                  onClick={() => setPrompt(example.scenario)}
                  className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-full transition-colors"
                >
                  {example.title.slice(0, 35)}...
                </button>
              ))}
            </div>
          </div>

          {/* Options Section */}
          <div className="px-6 md:px-8 pb-4 space-y-4">
            {/* Evidence Toggle - Enhanced with tier info */}
            <div className={`p-4 rounded-xl border transition-all ${
              evidenceEnabled 
                ? 'bg-cyan-500/10 border-cyan-500/30' 
                : 'bg-slate-900/50 border-slate-700'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg mr-3 ${
                    evidenceEnabled ? 'bg-cyan-500/20' : 'bg-slate-700'
                  }`}>
                    <Search className={`w-5 h-5 ${evidenceEnabled ? 'text-cyan-400' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white flex items-center gap-2">
                      Evidence Retrieval
                      {evidenceEnabled && (
                        <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      {evidenceEnabled 
                        ? 'Real citations from Google CSE, Perplexity, Crossref, GDELT'
                        : 'Enable to fetch verified sources (recommended)'
                      }
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setEvidenceEnabled(!evidenceEnabled)}
                  className={`w-14 h-7 rounded-full transition-all relative ${
                    evidenceEnabled 
                      ? 'bg-cyan-500 shadow-lg shadow-cyan-500/30' 
                      : 'bg-slate-600'
                  }`}
                >
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow ${
                    evidenceEnabled ? 'left-8' : 'left-1'
                  }`} />
                </button>
              </div>
              {/* Tier-based evidence limit info */}
              {evidenceEnabled && whopTier === 'basic' && (
                <div className="mt-3 flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 px-3 py-2 rounded-lg">
                  <Shield className="w-4 h-4" />
                  <span>Basic tier: Limited to 5 sources per analysis. Upgrade for full evidence depth.</span>
                </div>
              )}
            </div>

            {/* Engine Selection */}
            <div className="bg-slate-900/50 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowEngines(!showEngines)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center">
                  <Zap className="w-5 h-5 text-purple-400 mr-3" />
                  <div>
                    <div className="text-sm font-medium text-white">
                      Analysis Engines ({selectedEngines.length} selected)
                    </div>
                    <div className="text-xs text-slate-400">
                      {whopTier === 'basic' ? 'Upgrade for more engines' : 'Select analysis methods'}
                    </div>
                  </div>
                </div>
                {showEngines ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>

              {showEngines && (
                <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ENGINES.map((engine) => {
                    const Icon = engine.icon;
                    const isAccessible = canAccessEngine(engine);
                    const isSelected = selectedEngines.includes(engine.id);
                    const isRequired = engine.id === 'baseline';

                    return (
                      <button
                        key={engine.id}
                        onClick={() => toggleEngine(engine.id)}
                        disabled={!isAccessible || isRequired}
                        className={`relative flex items-start p-3 rounded-lg border transition-all text-left ${
                          isSelected
                            ? `border-${engine.color}-500 bg-${engine.color}-500/10`
                            : isAccessible
                              ? 'border-slate-600 bg-slate-800 hover:border-slate-500'
                              : 'border-slate-700 bg-slate-800/50 opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <div className={`p-2 rounded-lg mr-3 ${
                          isSelected ? `bg-${engine.color}-500/20` : 'bg-slate-700'
                        }`}>
                          <Icon className={`w-4 h-4 ${
                            isSelected ? `text-${engine.color}-400` : 'text-slate-400'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${
                              isSelected ? 'text-white' : 'text-slate-300'
                            }`}>
                              {engine.name}
                            </span>
                            {!isAccessible && (
                              <span className="flex items-center text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                                <Lock className="w-3 h-3 mr-1" />
                                {engine.minTier}
                              </span>
                            )}
                            {isRequired && (
                              <span className="text-xs text-slate-500">(required)</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                            {engine.description}
                          </p>
                        </div>
                        {isSelected && isAccessible && (
                          <CheckCircle2 className={`w-4 h-4 text-${engine.color}-400 absolute top-3 right-3`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Run Analysis CTA */}
          <div className="p-6 md:p-8 bg-gradient-to-r from-slate-800 to-slate-800/80 border-t border-slate-700">
            <button
              onClick={handleRunAnalysis}
              disabled={loading || !prompt.trim()}
              className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 ${
                loading || !prompt.trim()
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white hover:from-cyan-400 hover:to-emerald-400 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className="w-6 h-6" />
                  Run Analysis
                </>
              )}
            </button>

            {/* Status Indicator */}
            {status !== 'idle' && (
              <div className={`mt-4 flex items-center justify-center gap-2 ${currentStatus.color}`}>
                <StatusIcon className={`w-4 h-4 ${status === 'processing' ? 'animate-spin' : ''}`} />
                <span className="text-sm">{currentStatus.text}</span>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Results Section */}
        {analysis && status === 'completed' && (
          <div className="mt-8 space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <div className="text-2xl font-bold text-cyan-400">
                  {analysis.players?.length || 0}
                </div>
                <div className="text-sm text-slate-400">Players</div>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <div className="text-2xl font-bold text-emerald-400">
                  {analysis.equilibrium?.stability 
                    ? `${(analysis.equilibrium.stability * 100).toFixed(0)}%`
                    : 'N/A'}
                </div>
                <div className="text-sm text-slate-400">Stability</div>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <div className="text-2xl font-bold text-purple-400">
                  {analysis.retrievals?.length || 0}
                </div>
                <div className="text-sm text-slate-400">Sources</div>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <div className="text-2xl font-bold text-amber-400">
                  {analysis.processing_stats?.processing_time_ms 
                    ? `${(analysis.processing_stats.processing_time_ms / 1000).toFixed(1)}s`
                    : 'N/A'}
                </div>
                <div className="text-sm text-slate-400">Processing</div>
              </div>
            </div>

            {/* Audience Views */}
            <AudienceViewRouter
              analysisData={audienceData || undefined}
              analysisRunId={analysisRunId || undefined}
              isLoading={audienceLoading}
            />
          </div>
        )}

        {/* Tier Upgrade Prompt (for basic users) */}
        {whopTier === 'basic' && !loading && (
          <div className="mt-8 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-xl p-6 border border-purple-500/20">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Unlock More Analysis Power
                </h3>
                <p className="text-slate-400 text-sm mb-4">
                  Upgrade to Pro for recursive equilibrium, symmetry mining, quantum strategies, 
                  and value-of-information analysis. Elite unlocks forecasting and Labs access.
                </p>
                <a
                  href="/pricing"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-400 text-white rounded-lg font-medium transition-colors"
                >
                  View Plans
                  <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StrategyConsole;
