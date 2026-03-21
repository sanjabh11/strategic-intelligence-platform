// Strategy Console - Core Product Component
// Hero-style analysis interface aligned with Whop monetization strategy
// Central prompt + "Run Analysis" CTA + Engine selection + Tier gating

import React, { useState, useEffect } from 'react';
import { 
  Brain, Zap, Sparkles, Crown, Play, ChevronDown, ChevronUp,
  FileText, Search, Loader2, CheckCircle2, AlertCircle, Clock,
  Atom, GitBranch, Layers, TrendingUp, Target, Info, Lock, Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStrategyAnalysis, getExampleScenarios } from '../hooks/useStrategyAnalysis';
import { useSubscription, SubscriptionTier } from '../hooks/useSubscription';
import { AudienceViewRouter } from './audience-views';
import { assessForecastReadiness, assessPublishGovernance, getAnalysisFreshness, type ForecastGovernanceDraft } from '../lib/forecastGovernance';
import type { AudienceAnalysisData } from '../types/audience-views';
import { ENDPOINTS, getUserAuthHeaders, supabase } from '../lib/supabase';
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
  const navigate = useNavigate();
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
  const [analysisReviewState, setAnalysisReviewState] = useState<{
    status: string | null;
    reviewReason: string | null;
    evidenceBacked: boolean | null;
    createdAt: string | null;
    loading: boolean;
    requesting: boolean;
    message: string | null;
  }>({
    status: null,
    reviewReason: null,
    evidenceBacked: null,
    createdAt: null,
    loading: false,
    requesting: false,
    message: null
  });

  // Load run count from localStorage
  useEffect(() => {
    const count = parseInt(localStorage.getItem('strategy-console-run-count') || '0', 10);
    setAnalysisRunCount(count);
  }, []);

  const exampleScenarios = getExampleScenarios();

  const inferForecastCategory = (text: string): 'geopolitical' | 'financial' | 'technology' | 'economic' | 'social' | 'other' => {
    const lower = text.toLowerCase();
    if (/(war|sanction|nato|china|russia|border|diplomatic|election|conflict)/.test(lower)) return 'geopolitical';
    if (/(gold|oil|stock|market|equity|bond|fx|currency|price)/.test(lower)) return 'financial';
    if (/(gdp|inflation|rates|trade|economy|recession|growth)/.test(lower)) return 'economic';
    if (/(ai|model|chip|software|platform|technology|compute)/.test(lower)) return 'technology';
    if (/(society|public|consumer|population|social|labor)/.test(lower)) return 'social';
    return 'other';
  };

  const buildForecastDraft = (): ForecastGovernanceDraft & {
    description: string;
    category: 'geopolitical' | 'financial' | 'technology' | 'economic' | 'social' | 'other';
  } | null => {
    if (!analysis?.multiAgentForecast) return null;

    const multiAgentForecast = analysis.multiAgentForecast;
    const scenarioText = analysis.scenario_text || prompt;
    const category = inferForecastCategory(`${scenarioText} ${multiAgentForecast.question.question}`);
    const tags = Array.from(new Set([
      category,
      'multi-agent',
      'strategy-console',
      ...(multiAgentForecast.question.questionType === 'directional' ? ['directional'] : ['binary'])
    ])).join(', ');

    return {
      title: multiAgentForecast.question.title,
      description: [
        scenarioText,
        `Champion consensus: ${(multiAgentForecast.consensus.champion.probability * 100).toFixed(1)}% with ${(multiAgentForecast.consensus.champion.confidence * 100).toFixed(0)}% confidence.`,
        `Adversarial recommendation: ${multiAgentForecast.adversarialReview.recommendation}`
      ].filter(Boolean).join('\n\n'),
      category,
      question: multiAgentForecast.question.question,
      resolution_criteria: [
        multiAgentForecast.question.resolutionCriteria,
        `Primary source: ${multiAgentForecast.question.resolutionSource}.`,
        `Fallback: ${multiAgentForecast.question.fallbackResolution}`
      ].join(' '),
      resolution_date: multiAgentForecast.question.closeTime ? multiAgentForecast.question.closeTime.slice(0, 10) : '',
      tags,
      analysis_run_id: analysisRunId || '',
      game_theory_model: {
        source: 'strategy-console',
        multi_agent_forecast: {
          champion: multiAgentForecast.consensus.champion,
          challengers: multiAgentForecast.consensus.challengers,
          confidenceBand: multiAgentForecast.consensus.confidenceBand,
          disagreementIndex: multiAgentForecast.panel.disagreementIndex,
          skepticProbability: multiAgentForecast.adversarialReview.skepticProbability,
          contradictionPoints: multiAgentForecast.adversarialReview.contradictionPoints,
          missingEvidence: multiAgentForecast.adversarialReview.missingEvidence,
          evidenceCount: multiAgentForecast.metadata.evidenceCount
        },
        provenance: analysis.provenance || null
      }
    };
  };

  const handleCreateForecastDraft = () => {
    const draft = buildForecastDraft();
    if (!draft) return;

    sessionStorage.setItem('forecast-registry-draft', JSON.stringify(draft));
    navigate('/forecasts', { state: { prefillDraft: draft, openCreate: true } });
  };

  // Load audience data when analysis completes
  useEffect(() => {
    async function loadAudience() {
      if (status === 'completed' && analysis && analysisRunId) {
        setAudienceLoading(true);
        setAnalysisReviewState(prev => ({ ...prev, loading: true }));
        try {
          const { data, error: qErr } = await supabase
            .from('analysis_runs')
            .select('analysis_json, status, review_reason, evidence_backed, created_at')
            .eq('id', analysisRunId)
            .maybeSingle();
          
          if (!qErr && data?.analysis_json) {
            setAudienceData(data.analysis_json as AudienceAnalysisData);
          }

          if (!qErr && data) {
            setAnalysisReviewState(prev => ({
              ...prev,
              status: typeof data.status === 'string' ? data.status : null,
              reviewReason: typeof data.review_reason === 'string' ? data.review_reason : null,
              evidenceBacked: typeof data.evidence_backed === 'boolean' ? data.evidence_backed : null,
              createdAt: typeof data.created_at === 'string' ? data.created_at : null,
              loading: false,
              message: null
            }));
          } else {
            setAnalysisReviewState(prev => ({ ...prev, loading: false }));
          }
        } catch (e) {
          console.error('Failed to load audience analysis_json:', e);
          setAnalysisReviewState(prev => ({ ...prev, loading: false }));
        } finally {
          setAudienceLoading(false);
        }
      } else {
        setAnalysisReviewState({
          status: null,
          reviewReason: null,
          evidenceBacked: null,
          createdAt: null,
          loading: false,
          requesting: false,
          message: null
        });
      }
    }
    loadAudience();
  }, [status, analysis, analysisRunId]);

  const handleRequestHumanReview = async () => {
    if (!analysisRunId) {
      return;
    }

    try {
      setAnalysisReviewState(prev => ({ ...prev, requesting: true, message: null }));
      const headers = await getUserAuthHeaders();
      const response = await fetch(`${ENDPOINTS.HUMAN_REVIEW_POST}/${analysisRunId}/request-review`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          reason: 'Requested from Strategy Console after reviewing the forecast package'
        })
      });
      const json = await response.json().catch(() => null);

      if (!response.ok || !json?.ok) {
        throw new Error(json?.message || 'Failed to request human review');
      }

      setAnalysisReviewState(prev => ({
        ...prev,
        status: typeof json.status === 'string' ? json.status : 'under_review',
        reviewReason: typeof json.review_reason === 'string' ? json.review_reason : prev.reviewReason,
        requesting: false,
        message: typeof json.message === 'string' ? json.message : 'Analysis submitted for human review'
      }));
    } catch (e) {
      console.error('Failed to request human review:', e);
      setAnalysisReviewState(prev => ({
        ...prev,
        requesting: false,
        message: e instanceof Error ? e.message : 'Failed to request human review'
      }));
    }
  };

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

  const MultiAgentForecastPanel = () => {
    const multiAgentForecast = analysis?.multiAgentForecast;
    if (!multiAgentForecast) return null;

    const champion = multiAgentForecast.consensus.champion;
    const quality = multiAgentForecast.question.quality;
    const disagreementPct = (multiAgentForecast.panel.disagreementIndex * 100).toFixed(0);
    const reviewStatus = analysisReviewState.status;
    const draft = buildForecastDraft();
    const draftReadiness = draft ? assessForecastReadiness(draft) : null;
    const draftGovernance = draft && draftReadiness
      ? assessPublishGovernance(draft, draftReadiness, {
          status: analysisReviewState.status,
          reviewReason: analysisReviewState.reviewReason,
          evidenceBacked: analysisReviewState.evidenceBacked,
          createdAt: analysisReviewState.createdAt,
          loading: analysisReviewState.loading
        })
      : null;
    const analysisFreshness = getAnalysisFreshness(analysisReviewState.createdAt);
    const reviewTone = reviewStatus === 'approved'
      ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-200'
      : reviewStatus === 'under_review' || reviewStatus === 'needs_review'
        ? 'border-rose-500/20 bg-rose-500/5 text-rose-200'
        : reviewStatus === 'rejected'
          ? 'border-rose-500/20 bg-rose-500/5 text-rose-200'
          : 'border-slate-700 bg-slate-900/60 text-slate-300';

    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-white font-semibold text-lg">
              <Brain className="w-5 h-5 text-cyan-400" />
              Multi-Agent Prediction Engine
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Structured forecast question, specialist panel, adversarial review, and challenger consensus variants.
            </p>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-sm font-medium">
            {Math.round(champion.probability * 100)}% consensus
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-4 py-3">
          <div>
            <div className="text-sm font-medium text-cyan-200">Ready for the Forecast Registry lifecycle</div>
            <div className="text-xs text-slate-400">Carry this structured forecast into a public draft with the same governance checks the registry will enforce.</div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRequestHumanReview}
              disabled={!analysisRunId || analysisReviewState.requesting || reviewStatus === 'under_review'}
              className="px-4 py-2 bg-amber-500/90 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 rounded-lg font-medium"
            >
              {analysisReviewState.requesting ? 'Requesting review…' : reviewStatus === 'under_review' ? 'Review Pending' : 'Request Human Review'}
            </button>
            <button
              onClick={handleCreateForecastDraft}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg font-medium"
            >
              Open Registry Draft
            </button>
          </div>
        </div>

        {draftGovernance && draftReadiness && (
          <div className={`mb-6 rounded-lg border px-4 py-3 ${
            draftGovernance.status === 'ready'
              ? 'border-emerald-500/20 bg-emerald-500/5'
              : draftGovernance.status === 'review_required'
                ? 'border-amber-500/20 bg-amber-500/5'
                : 'border-rose-500/20 bg-rose-500/5'
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-white">
                  Registry publish governance preview: {draftGovernance.status === 'ready'
                    ? 'Ready'
                    : draftGovernance.status === 'review_required'
                      ? 'Review required'
                      : draftGovernance.status === 'blocked'
                        ? 'Blocked'
                        : 'Proceed with caution'}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Draft quality: {draftReadiness.status === 'strong' ? 'Strong' : draftReadiness.status === 'review' ? 'Needs review' : 'Needs work'}
                </div>
              </div>
              {analysisFreshness && (
                <span className={`px-2 py-1 rounded-full text-xs border ${analysisFreshness.tone}`}>
                  {analysisFreshness.label}
                </span>
              )}
            </div>
            {draftGovernance.blockers.length > 0 && (
              <div className="mt-3 space-y-1 text-xs text-rose-300">
                {draftGovernance.blockers.map(issue => (
                  <div key={issue}>{issue}</div>
                ))}
              </div>
            )}
            {draftGovernance.reviewRequired.length > 0 && (
              <div className="mt-3 space-y-1 text-xs text-amber-200">
                {draftGovernance.reviewRequired.map(item => (
                  <div key={item}>{item}</div>
                ))}
              </div>
            )}
            {draftGovernance.warnings.length > 0 && (
              <div className="mt-3 space-y-1 text-xs text-slate-300">
                {draftGovernance.warnings.map(item => (
                  <div key={item}>{item}</div>
                ))}
              </div>
            )}
            {draftGovernance.status !== 'ready' && (
              <div className="mt-3 text-xs text-slate-400">
                Opening the registry draft is still allowed so you can revise question quality or provenance before attempting public creation.
              </div>
            )}
          </div>
        )}

        <div className={`mb-6 rounded-lg border px-4 py-3 ${reviewTone}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-white">Human review status: {analysisReviewState.loading ? 'Loading…' : reviewStatus ? reviewStatus.replace(/_/g, ' ') : 'not requested'}</div>
              <div className="text-xs mt-1 text-slate-400">
                {analysisReviewState.reviewReason || (analysisReviewState.evidenceBacked ? 'Evidence-backed analysis available for linked forecast provenance.' : 'Use human review for high-stakes or contested forecast packages.')}
              </div>
            </div>
            {analysisRunId && (
              <div className="text-xs text-slate-500 break-all">Analysis run `{analysisRunId}`</div>
            )}
          </div>
          {analysisReviewState.message && (
            <div className="mt-2 text-xs text-slate-300">{analysisReviewState.message}</div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-700">
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Champion</div>
            <div className="text-3xl font-bold text-emerald-400">{(champion.probability * 100).toFixed(1)}%</div>
            <div className="text-sm text-slate-400 mt-1">Confidence {(champion.confidence * 100).toFixed(0)}%</div>
            <div className="text-xs text-slate-500 mt-2">{champion.method}</div>
          </div>
          <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-700">
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Question Quality</div>
            <div className="text-3xl font-bold text-cyan-400">{(quality.overall * 100).toFixed(0)}%</div>
            <div className="text-sm text-slate-400 mt-1">Clarity {(quality.clarity * 100).toFixed(0)}% · Resolvability {(quality.resolvability * 100).toFixed(0)}%</div>
            <div className="text-xs text-slate-500 mt-2">Evidence coverage {(quality.evidenceCoverage * 100).toFixed(0)}%</div>
          </div>
          <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-700">
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Panel Disagreement</div>
            <div className="text-3xl font-bold text-amber-400">{disagreementPct}%</div>
            <div className="text-sm text-slate-400 mt-1">{multiAgentForecast.panel.agents.length} specialist agents</div>
            <div className="text-xs text-slate-500 mt-2">Fresh evidence {multiAgentForecast.metadata.freshEvidenceCount}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center gap-2 text-white font-medium mb-3">
              <FileText className="w-4 h-4 text-cyan-400" />
              Forecast Question Package
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-slate-500 text-xs mb-1">Title</div>
                <div className="text-slate-200">{multiAgentForecast.question.title}</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs mb-1">Question</div>
                <div className="text-slate-200">{multiAgentForecast.question.question}</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-slate-500 text-xs mb-1">Resolution Source</div>
                  <div className="text-slate-300">{multiAgentForecast.question.resolutionSource}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs mb-1">Fallback Resolution</div>
                  <div className="text-slate-300">{multiAgentForecast.question.fallbackResolution}</div>
                </div>
              </div>
              <div>
                <div className="text-slate-500 text-xs mb-1">Resolution Criteria</div>
                <div className="text-slate-300">{multiAgentForecast.question.resolutionCriteria}</div>
              </div>
              {multiAgentForecast.question.quality.issues.length > 0 && (
                <div>
                  <div className="text-slate-500 text-xs mb-1">Question Issues</div>
                  <div className="space-y-1">
                    {multiAgentForecast.question.quality.issues.map((issue) => (
                      <div key={issue} className="text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded px-3 py-2">
                        {issue}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center gap-2 text-white font-medium mb-3">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              Adversarial Review
            </div>
            <div className="space-y-3 text-sm">
              <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                <div className="text-slate-500 text-xs mb-1">Skeptic Probability</div>
                <div className="text-amber-300 text-xl font-semibold">
                  {(multiAgentForecast.adversarialReview.skepticProbability * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-slate-500 text-xs mb-1">Recommendation</div>
                <div className="text-slate-200">{multiAgentForecast.adversarialReview.recommendation}</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs mb-1">Contradiction Points</div>
                <div className="space-y-1">
                  {multiAgentForecast.adversarialReview.contradictionPoints.length > 0 ? multiAgentForecast.adversarialReview.contradictionPoints.map((point) => (
                    <div key={point} className="text-slate-300 bg-slate-800 rounded px-3 py-2 border border-slate-700">{point}</div>
                  )) : (
                    <div className="text-slate-500 bg-slate-800 rounded px-3 py-2 border border-slate-700">No material contradictions surfaced in this pass.</div>
                  )}
                </div>
              </div>
              <div>
                <div className="text-slate-500 text-xs mb-1">Missing Evidence</div>
                <div className="space-y-1">
                  {multiAgentForecast.adversarialReview.missingEvidence.length > 0 ? multiAgentForecast.adversarialReview.missingEvidence.map((item) => (
                    <div key={item} className="text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded px-3 py-2">{item}</div>
                  )) : (
                    <div className="text-slate-500 bg-slate-800 rounded px-3 py-2 border border-slate-700">No major evidence gaps were flagged by the skeptic layer.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2 text-white font-medium mb-3">
            <Target className="w-4 h-4 text-emerald-400" />
            Specialist Agent Panel
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {multiAgentForecast.panel.agents.map((agent) => (
              <div key={agent.id} className="bg-slate-900/60 rounded-lg p-4 border border-slate-700">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="text-white font-medium">{agent.label}</div>
                    <div className="text-xs text-slate-500">Weight {(agent.weight * 100).toFixed(0)}%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-cyan-300">{(agent.probability * 100).toFixed(1)}%</div>
                    <div className="text-xs text-slate-500">Conf {(agent.confidence * 100).toFixed(0)}%</div>
                  </div>
                </div>
                <p className="text-sm text-slate-300 mb-3">{agent.thesis}</p>
                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Drivers</div>
                    <div className="flex flex-wrap gap-2">
                      {agent.drivers.map((driver) => (
                        <span key={driver} className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {driver}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Evidence IDs</div>
                    <div className="text-xs text-slate-400">{agent.evidence_ids.length > 0 ? agent.evidence_ids.join(', ') : 'No linked evidence ids'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center gap-2 text-white font-medium mb-3">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              Challenger Variants
            </div>
            <div className="space-y-2">
              {multiAgentForecast.consensus.challengers.map((challenger) => (
                <div key={challenger.id} className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-3 border border-slate-700">
                  <div>
                    <div className="text-sm text-slate-200">{challenger.label}</div>
                    <div className="text-xs text-slate-500">{challenger.method}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-purple-300">{(challenger.probability * 100).toFixed(1)}%</div>
                    <div className={`text-xs ${challenger.deltaFromChampion >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {challenger.deltaFromChampion >= 0 ? '+' : ''}{(challenger.deltaFromChampion * 100).toFixed(1)} pts
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center gap-2 text-white font-medium mb-3">
              <Shield className="w-4 h-4 text-emerald-400" />
              Execution Checkpoints
            </div>
            <div className="space-y-2">
              {multiAgentForecast.consensus.executionCheckpoints.map((checkpoint) => (
                <div key={checkpoint.id} className="bg-slate-800 rounded-lg px-3 py-3 border border-slate-700">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-slate-200">{checkpoint.title}</div>
                    <span className={`text-xs px-2 py-1 rounded-full ${checkpoint.status === 'pass' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                      {checkpoint.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{checkpoint.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
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

            <MultiAgentForecastPanel />
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
