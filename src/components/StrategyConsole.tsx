// Strategy Console - Core Product Component
// Hero-style analysis interface aligned with Whop monetization strategy
// Central prompt + "Run Analysis" CTA + Engine selection + Tier gating

import React, { Suspense, useState, useEffect, useMemo } from 'react';
import {
  Brain, Zap, Sparkles, Crown, Play, ChevronDown, ChevronUp,
  FileText, Search, Loader2, CheckCircle2, AlertCircle, Clock,
  Atom, GitBranch, Layers, TrendingUp, Target, Info, Lock, Shield
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStrategyAnalysis, getExampleScenarios } from '../hooks/useStrategyAnalysis';
import { normalizeSubscriptionTier, useSubscription, SubscriptionTier } from '../hooks/useSubscription';
import { assessForecastReadiness, assessPublishGovernance, buildGovernanceSummary, getAnalysisFreshness, type ForecastGovernanceDraft } from '../lib/forecastGovernance';
import type { AudienceAnalysisData } from '../types/audience-views';
import { ENDPOINTS, getAuthHeaders, getUserAuthHeaders, isLocalPreviewOrigin, supabase } from '../lib/supabase';
import WelcomeToConsole from './WelcomeToConsole';
import { normalizeStrategistResponse, type StrategistAnalysis } from '../lib/strategistContract';
import { buildEnterpriseEvidenceBundle, buildEnterpriseWorkflowStatus } from '../lib/enterpriseWorkflow';
import type { WarRoomRouteState } from '../lib/warRoom';
import { labelCalibrationStatus } from '../../shared/mlAdvisory';
import { isPublicAnalysisOnlyBeta } from '../lib/publicBeta';
import { getCachedQuestionContext, persistQuestionContext } from '../lib/questionContextCache';
import {
  appendPublicQuestionContext,
  evaluateQuestionIntake,
  routeCitizenQuestion,
  type ClarificationQuestionId,
  type ClarificationState,
  type QuestionIntakeResponse,
} from '../../shared/publicForecasting';

// Engine configuration with tier requirements
interface EngineConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  minTier: 'free' | 'pro' | 'elite';
  color: string;
}

type DeepReviewSection = 'evidence' | 'governance' | 'ml' | 'forecast' | 'supporting';

const ENGINES: EngineConfig[] = [
  {
    id: 'baseline',
    name: 'Baseline Analysis',
    description: 'Standard Nash equilibrium computation',
    icon: Brain,
    minTier: 'free',
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
const mapToWhopTier = (tier: SubscriptionTier): 'free' | 'pro' | 'elite' => {
  switch (normalizeSubscriptionTier(tier)) {
    case 'free':
    case 'pro':
      return 'pro';
    case 'academic':
    case 'enterprise':
      return 'elite';
    default:
      return 'free';
  }
};

const tierHierarchy: Record<string, number> = {
  'free': 1,
  'pro': 2,
  'elite': 3
};

const AudienceViewRouter = React.lazy(() => import('./audience-views').then((module) => ({ default: module.AudienceViewRouter })));
const PersonalLifeCoach = React.lazy(() => import('./PersonalLifeCoach').then((module) => ({ default: module.PersonalLifeCoach })));
const StrategistBriefPanel = React.lazy(() => import('./StrategistBriefPanel').then((module) => ({ default: module.StrategistBriefPanel })));
const EnterpriseBriefingPanel = React.lazy(() => import('./EnterpriseBriefingPanel').then((module) => ({ default: module.EnterpriseBriefingPanel })));
const MultiAgentForecastPanel = React.lazy(() => import('./MultiAgentForecastPanel'));
const EvidenceSourcesDashboard = React.lazy(() => import('./EvidenceSourcesDashboard'));

const lazySectionFallback = (
  <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-4 text-sm text-slate-400">
    Loading panel…
  </div>
);

const intakeStatusScore: Record<QuestionIntakeResponse['status'], number> = {
  ready: 4,
  needs_input: 3,
  blocked: 2,
  out_of_scope: 1,
};

function chooseSharperIntake(primary: QuestionIntakeResponse, fallback: QuestionIntakeResponse) {
  const primaryScore = intakeStatusScore[primary.status];
  const fallbackScore = intakeStatusScore[fallback.status];
  if (fallbackScore > primaryScore) return fallback;
  if (fallbackScore < primaryScore) return primary;

  const primaryCompleteness = primary.question_context?.completeness_score || 0;
  const fallbackCompleteness = fallback.question_context?.completeness_score || 0;
  if (fallbackCompleteness > primaryCompleteness + 0.05) return fallback;
  if (primaryCompleteness > fallbackCompleteness + 0.05) return primary;

  const primaryQuestions = primary.questions?.length || 0;
  const fallbackQuestions = fallback.questions?.length || 0;
  if (fallbackQuestions < primaryQuestions) return fallback;

  return primary;
}

const StrategyConsole: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeTargetTier, setUpgradeTargetTier] = useState<'pro' | 'elite'>('pro');
  const [activeSurface, setActiveSurface] = useState<'analysis' | 'strategist'>('analysis');
  const [openDeepSection, setOpenDeepSection] = useState<DeepReviewSection>('evidence');
  const [clarificationAnswers, setClarificationAnswers] = useState<Partial<Record<ClarificationQuestionId, string>>>({});
  const [clarificationProgress, setClarificationProgress] = useState<ClarificationState>({
    answers: {},
    askedQuestionIds: [],
    totalQuestionsAsked: 0,
  });
  const [questionIntake, setQuestionIntake] = useState<QuestionIntakeResponse | null>(null);
  const [questionIntakeLoading, setQuestionIntakeLoading] = useState(false);
  const [questionIntakeError, setQuestionIntakeError] = useState<string | null>(null);
  const [strategistBrief, setStrategistBrief] = useState<StrategistAnalysis | null>(null);
  const [strategistLoading, setStrategistLoading] = useState(false);
  const [strategistError, setStrategistError] = useState<string | null>(null);
  const [strategistRequestKey, setStrategistRequestKey] = useState<string | null>(null);
  const [hasAuthenticatedSession, setHasAuthenticatedSession] = useState(false);
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

  useEffect(() => {
    let active = true;

    async function syncAuthState() {
      if (!supabase) {
        if (active) setHasAuthenticatedSession(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (active) {
        setHasAuthenticatedSession(Boolean(data.session?.access_token));
      }
    }

    void syncAuthState();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasAuthenticatedSession(Boolean(session?.access_token));
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Load run count from localStorage and check for template state
  useEffect(() => {
    const count = parseInt(localStorage.getItem('strategy-console-run-count') || '0', 10);
    setAnalysisRunCount(count);

    // Check for scenario text passed from template library
    const templateState = location.state as { scenarioText?: string } | null;
    if (templateState?.scenarioText) {
      setPrompt(templateState.scenarioText);
      // Clear the state so it doesn't persist on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const exampleScenarios = getExampleScenarios();
  const publicBetaAnonymous = isPublicAnalysisOnlyBeta && !hasAuthenticatedSession;
  const promptIntentGuess = useMemo(() => {
    if (prompt.trim().length < 12) return null;
    return evaluateQuestionIntake({
      prompt,
      mode: publicBetaAnonymous ? 'public' : 'internal',
      audience: publicBetaAnonymous ? 'public' : 'analyst',
    }).intent;
  }, [prompt, publicBetaAnonymous]);
  const cachedClarificationAnswers = useMemo(
    () => getCachedQuestionContext(promptIntentGuess),
    [promptIntentGuess]
  );
  const effectiveClarificationAnswers = useMemo(
    () => ({ ...clarificationAnswers }),
    [clarificationAnswers]
  );
  const promptRoute = useMemo(
    () => routeCitizenQuestion(
      prompt,
      questionIntake?.question_context || {
        intent: promptIntentGuess || 'generic_public_analysis',
        answers: effectiveClarificationAnswers,
        clarification_status: questionIntake?.status || 'ready',
        completeness_score: questionIntake?.question_context?.completeness_score || 0,
        asked_question_ids: clarificationProgress.askedQuestionIds || [],
        confidence: questionIntake?.confidence || 0.5,
        normalized_prompt: appendPublicQuestionContext(prompt, effectiveClarificationAnswers),
        context_locked_fields: questionIntake?.question_context?.context_locked_fields || [],
        unresolved_dimensions: questionIntake?.question_context?.unresolved_dimensions || [],
        question_cluster: questionIntake?.question_context?.question_cluster || 'Public strategic forecast',
        required_inputs: questionIntake?.question_context?.required_inputs || [],
      }
    ),
    [prompt, questionIntake, promptIntentGuess, effectiveClarificationAnswers, clarificationProgress]
  );
  const promptMissingInputs = useMemo(
    () => {
      const requiredInputs = questionIntake?.question_context?.required_inputs || promptRoute.requiredInputs;
      return requiredInputs.filter((entry) => !effectiveClarificationAnswers[entry.id]?.trim());
    },
    [questionIntake, promptRoute, effectiveClarificationAnswers]
  );
  const clarificationQuestions = questionIntake?.questions || [];
  const clarificationStatus = questionIntake?.status || 'ready';
  const clarificationBlocking = publicBetaAnonymous && prompt.trim().length >= 12 && clarificationStatus !== 'ready';

  useEffect(() => {
    if (!promptIntentGuess) {
      setClarificationAnswers({});
      setClarificationProgress({
        answers: {},
        askedQuestionIds: [],
        totalQuestionsAsked: 0,
      });
      setQuestionIntake(null);
      setQuestionIntakeError(null);
      setQuestionIntakeLoading(false);
      return;
    }

    setClarificationProgress((current) => {
      if ((current.askedQuestionIds?.length || 0) === 0 && (current.totalQuestionsAsked || 0) === 0) {
        return current;
      }
      return {
        answers: {},
        askedQuestionIds: [],
        totalQuestionsAsked: 0,
      };
    });
    setClarificationAnswers({});
  }, [promptIntentGuess]);

  useEffect(() => {
    if (prompt.trim().length < 12) {
      setQuestionIntake(null);
      setQuestionIntakeError(null);
      setQuestionIntakeLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const clarificationState: ClarificationState = {
      answers: effectiveClarificationAnswers,
      askedQuestionIds: clarificationProgress.askedQuestionIds || [],
      totalQuestionsAsked: clarificationProgress.totalQuestionsAsked || 0,
    };

    const fallback = () => evaluateQuestionIntake({
      prompt,
      knownContext: {
        intent: promptIntentGuess || 'generic_public_analysis',
        decision_use: publicBetaAnonymous ? 'public_beta_console' : 'internal_console',
      },
      clarificationState,
      mode: publicBetaAnonymous ? 'public' : 'internal',
      audience: publicBetaAnonymous ? 'public' : 'analyst',
    });

    const run = async () => {
      setQuestionIntakeLoading(true);
      setQuestionIntakeError(null);
      const localResult = fallback();

      try {
        if (isLocalPreviewOrigin) {
          if (!cancelled) {
            setQuestionIntake(localResult);
          }
          return;
        }

        const response = await fetch(ENDPOINTS.QUESTION_INTAKE, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            prompt,
            known_context: {
              intent: promptIntentGuess || 'generic_public_analysis',
              decision_use: publicBetaAnonymous ? 'public_beta_console' : 'internal_console',
            },
            clarification_state: clarificationState,
            mode: publicBetaAnonymous ? 'public' : 'internal',
            audience: publicBetaAnonymous ? 'public' : 'analyst',
          }),
          signal: controller.signal,
        });
        const json = await response.json().catch(() => null);
        if (!response.ok || !json?.ok) {
          throw new Error(json?.message || `HTTP ${response.status}`);
        }
        if (!cancelled) {
          const { ok: _ok, ...payload } = json;
          const hostedResult = payload as QuestionIntakeResponse;
          const preferred = chooseSharperIntake(hostedResult, localResult);
          setQuestionIntake(preferred);
          if (preferred !== hostedResult) {
            setQuestionIntakeError('Hosted intake drift detected; using the sharper local clarification policy until runtime catches up.');
          }
        }
      } catch (error) {
        if (cancelled) return;
        setQuestionIntake(localResult);
        setQuestionIntakeError(error instanceof Error ? error.message : 'Question intake degraded to local fallback');
      } finally {
        if (!cancelled) {
          setQuestionIntakeLoading(false);
        }
      }
    };

    const timeoutId = window.setTimeout(() => {
      void run();
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    prompt,
    promptIntentGuess,
    effectiveClarificationAnswers,
    clarificationProgress,
    cachedClarificationAnswers,
    publicBetaAnonymous,
  ]);

  useEffect(() => {
    if (!questionIntake?.questions?.length) return;

    setClarificationProgress((current) => {
      const asked = current.askedQuestionIds || [];
      const unseen = questionIntake.questions
        .map((question) => question.id)
        .filter((id) => !asked.includes(id));

      if (unseen.length === 0) {
        return current;
      }

      return {
        answers: current.answers || {},
        askedQuestionIds: [...asked, ...unseen],
        totalQuestionsAsked: Math.min(4, (current.totalQuestionsAsked || 0) + unseen.length),
      };
    });
  }, [questionIntake]);

  useEffect(() => {
    if (!questionIntake || questionIntake.status !== 'ready') return;
    persistQuestionContext(questionIntake.intent, effectiveClarificationAnswers);
  }, [questionIntake, effectiveClarificationAnswers]);

  const inferForecastCategory = (text: string): 'geopolitical' | 'financial' | 'technology' | 'economic' | 'social' | 'other' => {
    const lower = text.toLowerCase();
    if (/(war|sanction|nato|china|russia|border|diplomatic|election|conflict)/.test(lower)) return 'geopolitical';
    if (/(gold|oil|stock|market|equity|bond|fx|currency|price)/.test(lower)) return 'financial';
    if (/(gdp|inflation|rates|trade|economy|recession|growth)/.test(lower)) return 'economic';
    if (/(ai|model|chip|software|platform|technology|compute)/.test(lower)) return 'technology';
    if (/(society|public|consumer|population|social|labor)/.test(lower)) return 'social';
    return 'other';
  };

  const inferStrategistCategory = (text: string): 'business' | 'financial' | 'conflict' | 'other' => {
    const lower = text.toLowerCase();
    if (/(deal|board|strategy|market|competitive|regulatory|procurement|policy|merger|negotiat)/.test(lower)) return 'business';
    if (/(gold|oil|stock|market|equity|bond|fx|currency|price|hedge|treasury)/.test(lower)) return 'financial';
    if (/(conflict|sanction|war|dispute|union|labor|strike|border)/.test(lower)) return 'conflict';
    return 'other';
  };

  const buildStrategistTitle = (text: string) => {
    const firstSentence = text
      .split(/[.?!]/)
      .map((part) => part.trim())
      .find(Boolean);

    return (firstSentence || 'Strategic decision brief').slice(0, 120);
  };

  const buildStrategistDescription = () => {
    const scenarioText = analysis?.scenario_text || prompt;
    const summaryText = analysis?.summary?.text || audienceData?.summary?.text || '';
    const retrievalCount = analysis?.retrievals?.length || analysis?.retrieval_count || 0;
    const evidenceStatus = analysis?.provenance?.evidence_backed ? 'Evidence-backed analysis is available.' : 'Evidence is limited or fallback-derived.';

    return [
      scenarioText,
      summaryText ? `Current analysis summary: ${summaryText}` : null,
      analysis?.equilibrium?.stability !== undefined
        ? `Current equilibrium stability: ${(analysis.equilibrium.stability * 100).toFixed(0)}%.`
        : null,
      analysis?.multiAgentForecast
        ? `Current champion forecast: ${(analysis.multiAgentForecast.consensus.champion.probability * 100).toFixed(1)}% with ${(analysis.multiAgentForecast.consensus.champion.confidence * 100).toFixed(0)}% confidence.`
        : null,
      `Evidence count: ${retrievalCount}. ${evidenceStatus}`
    ].filter(Boolean).join('\n\n');
  };

  const buildStrategistEvidenceContext = () => {
    const retrievalEvidence = (analysis?.retrievals || []).slice(0, 8).map((retrieval, index) => ({
      id: retrieval.id || `retrieval_${index + 1}`,
      label: retrieval.title || retrieval.url || `Source ${index + 1}`,
      detail: [retrieval.snippet, retrieval.url].filter(Boolean).join(' | '),
      sourceType: 'market_reference' as const
    }));

    const summaryEvidence = audienceData?.summary?.text
      ? [{
          id: 'analysis_summary',
          label: 'Analysis summary',
          detail: audienceData.summary.text,
          sourceType: 'llm_inference' as const
        }]
      : [];

    const scenarioEvidence = [{
      id: 'scenario_input',
      label: 'Scenario input',
      detail: analysis?.scenario_text || prompt,
      sourceType: 'user_input' as const
    }];

    return [...scenarioEvidence, ...retrievalEvidence, ...summaryEvidence];
  };

  const buildEvidenceBundle = () => buildEnterpriseEvidenceBundle({
    analysis,
    scenarioText: analysis?.scenario_text || prompt,
    strategist: strategistBrief
  });

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
        workflow_handoff: {
          source: 'strategy-console',
          created_at: new Date().toISOString(),
          flagship_path: ['analysis', 'strategist_brief', 'review', 'forecast_draft']
        },
        evidence_bundle: buildEvidenceBundle(),
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
        provenance: analysis.provenance || null,
        constraint_checks: analysis.constraint_checks || null,
        drift_signal: analysis.drift_signal || null,
        attribution: analysis.attribution || null,
        strategist_brief: strategistBrief ? {
          executive_summary: strategistBrief.executive_summary,
          recommendation: strategistBrief.recommendation,
          provenance_status: strategistBrief.provenance_status,
          claim_to_evidence: strategistBrief.claim_to_evidence
        } : null
      }
    };
  };

  const handleCreateForecastDraft = () => {
    const draft = buildForecastDraft();
    if (!draft) return;

    sessionStorage.setItem('forecast-registry-draft', JSON.stringify(draft));
    navigate('/forecasts/new', { state: { prefillDraft: draft, openCreate: true } });
  };

  const handleSaveToWarRoom = () => {
    if (!strategistBrief) return;

    const state: WarRoomRouteState = {
      decisionLogDraft: {
        title: strategistBrief.recommendation.primary_action.replace(/_/g, ' '),
        summary: strategistBrief.executive_summary,
        sourceSurface: 'strategist_brief',
        strategistBrief,
        linkedForecastId: null,
        linkedForecastTitle: analysis?.multiAgentForecast?.question.title || null
      }
    };

    navigate('/war-room', { state });
  };

  // Load audience data when analysis completes
  useEffect(() => {
    async function loadAudience() {
      if (status === 'completed' && analysis && analysisRunId) {
        if (isLocalPreviewOrigin) {
          setAudienceData(null);
          setAnalysisReviewState(prev => ({
            ...prev,
            status: null,
            reviewReason: null,
            evidenceBacked: analysis?.provenance?.evidence_backed ?? false,
            createdAt: null,
            loading: false,
            message: null
          }));
          setAudienceLoading(false);
          return;
        }

        setAudienceLoading(true);
        setAnalysisReviewState(prev => ({ ...prev, loading: true }));
        try {
          const headers = await getUserAuthHeaders();
          const response = await fetch(`${ENDPOINTS.HYDRATE_ANALYSIS}?analysis_run_id=${encodeURIComponent(analysisRunId)}`, {
            method: 'GET',
            headers,
          });
          const payload = await response.json().catch(() => ({}));

          if (!response.ok || !payload?.ok) {
            throw new Error(payload?.message || 'Failed to hydrate analysis');
          }

          if (payload?.analysis && typeof payload.analysis === 'object') {
            setAudienceData(payload.analysis as AudienceAnalysisData);
          }

          if (payload) {
            setAnalysisReviewState(prev => ({
              ...prev,
              status: typeof payload.status === 'string' ? payload.status : null,
              reviewReason: typeof payload.review_reason === 'string' ? payload.review_reason : null,
              evidenceBacked: typeof payload.evidence_backed === 'boolean' ? payload.evidence_backed : null,
              createdAt: typeof payload.created_at === 'string' ? payload.created_at : null,
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

  useEffect(() => {
    let cancelled = false;

    async function loadStrategistBrief() {
      if (status !== 'completed' || !analysis || !analysisRunId) {
        setStrategistBrief(null);
        setStrategistError(null);
        setStrategistLoading(false);
        setStrategistRequestKey(null);
        return;
      }

      if (!hasAuthenticatedSession) {
        setStrategistBrief(null);
        setStrategistError(null);
        setStrategistLoading(false);
        setStrategistRequestKey(null);
        return;
      }

      const requestKey = `${analysisRunId}:${analysis.provenance?.retrieval_count || analysis.retrievals?.length || 0}:${analysis.provenance?.evidence_backed ? 'evidence' : 'limited'}`;
      if (strategistRequestKey === requestKey && strategistBrief) {
        return;
      }

      try {
        setStrategistLoading(true);
        setStrategistError(null);

        const headers = await getUserAuthHeaders();
        const response = await fetch(ENDPOINTS.PERSONAL_LIFE_COACH, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            title: buildStrategistTitle(analysis.scenario_text || prompt),
            description: buildStrategistDescription(),
            category: inferStrategistCategory(`${analysis.scenario_text || prompt} ${analysis.summary?.text || ''}`),
            persist: false,
            evidenceContext: buildStrategistEvidenceContext()
          })
        });

        const json = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(typeof json?.message === 'string' ? json.message : `HTTP ${response.status}`);
        }

        const normalized = normalizeStrategistResponse(json);
        if (!cancelled) {
          setStrategistBrief(normalized.strategist);
          setStrategistRequestKey(requestKey);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load strategist brief:', err);
          setStrategistBrief(null);
          setStrategistError(err instanceof Error ? err.message : 'Failed to generate strategist brief');
        }
      } finally {
        if (!cancelled) {
          setStrategistLoading(false);
        }
      }
    }

    loadStrategistBrief();

    return () => {
      cancelled = true;
    };
  }, [status, analysis, analysisRunId, prompt, strategistBrief, strategistRequestKey, audienceData, hasAuthenticatedSession]);

  const handleCopyStrategistBrief = async () => {
    if (!strategistBrief) return;

    const actorLines = strategistBrief.actor_map.map((actor) =>
      `- ${actor.name} (${actor.role}): objective=${actor.objective}; likely move=${actor.likelyMove}`
    );
    const countermoveLines = strategistBrief.countermoves.map((entry) =>
      `- ${entry.countermove} | why likely: ${entry.whyLikely} | response: ${entry.recommendedResponse}`
    );
    const uncertaintyLines = strategistBrief.key_uncertainties.map((entry) =>
      `- ${entry.uncertainty} | signpost: ${entry.signpost} | mitigation: ${entry.mitigation}`
    );
    const evidenceLines = strategistBrief.claim_to_evidence.map((claim) =>
      `- ${claim.claim_text} :: ${claim.evidence_refs.map((ref) => `${ref.label} (${ref.support})`).join(', ')}`
    );

    const briefText = [
      'Strategist Brief',
      '',
      `Trust status: ${strategistBrief.provenance_status}`,
      '',
      'Executive Summary',
      strategistBrief.executive_summary,
      '',
      'Recommendation',
      `${strategistBrief.recommendation.primary_action}: ${strategistBrief.recommendation.rationale}`,
      `Expected outcome: ${strategistBrief.recommendation.expected_outcome}`,
      '',
      'Actor Map',
      ...actorLines,
      '',
      'Countermoves',
      ...countermoveLines,
      '',
      'Key Uncertainties',
      ...uncertaintyLines,
      '',
      'Claim to Evidence',
      ...(evidenceLines.length > 0 ? evidenceLines : ['- No claim-level evidence map available'])
    ].join('\n');

    try {
      await navigator.clipboard.writeText(briefText);
      setAnalysisReviewState(prev => ({
        ...prev,
        message: 'Strategist brief copied to clipboard'
      }));
    } catch (err) {
      console.error('Failed to copy strategist brief:', err);
      setAnalysisReviewState(prev => ({
        ...prev,
        message: 'Unable to copy strategist brief'
      }));
    }
  };

  const handleRequestHumanReview = async () => {
    if (!analysisRunId) {
      return;
    }

    if (!hasAuthenticatedSession) {
      setAnalysisReviewState(prev => ({
        ...prev,
        message: publicAnalysisOnlyViewer
          ? 'Human review requests are reserved for analyst accounts during this beta.'
          : 'Sign in to request human review for this analysis package.'
      }));
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
    if (!engine) return;

    // Show upgrade modal if engine is locked
    if (!canAccessEngine(engine)) {
      if (publicAnalysisOnlyViewer) {
        setAnalysisReviewState(prev => ({
          ...prev,
          message: 'Advanced engine presets stay private during the first public beta. The public console runs the hosted evidence-backed analysis path only.'
        }));
        return;
      }
      setShowUpgradeModal(true);
      setUpgradeTargetTier(engine.minTier === 'elite' ? 'elite' : 'pro');
      return;
    }

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

    if (clarificationBlocking || promptMissingInputs.length > 0) {
      setAnalysisReviewState((prev) => ({
        ...prev,
        message: questionIntake?.relevance_summary
          || `This question needs ${promptMissingInputs.map((entry) => entry.label.toLowerCase()).join(', ')} before the public beta should present it as a citizen-ready forecast.`,
      }));
      return;
    }

    const intakeFallback = evaluateQuestionIntake({
      prompt,
      knownContext: {
        intent: promptIntentGuess || 'generic_public_analysis',
        decision_use: publicAnalysisOnlyViewer ? 'public_beta_console' : 'internal_console',
      },
      clarificationState: {
        answers: effectiveClarificationAnswers,
        askedQuestionIds: clarificationProgress.askedQuestionIds,
        totalQuestionsAsked: clarificationProgress.totalQuestionsAsked,
      },
      mode: publicAnalysisOnlyViewer ? 'public' : 'internal',
      audience: publicAnalysisOnlyViewer ? 'public' : 'analyst',
    });
    const activeQuestionContext = {
      ...(questionIntake?.question_context || intakeFallback.question_context),
      decision_use: publicAnalysisOnlyViewer ? 'public_beta_console' : 'internal_console',
    };
    const scenarioText = activeQuestionContext.normalized_prompt
      || appendPublicQuestionContext(prompt, effectiveClarificationAnswers);

    persistQuestionContext(activeQuestionContext.intent, effectiveClarificationAnswers);

    await runAnalysis({
      scenario_text: scenarioText,
      question_context: activeQuestionContext,
      mode: publicAnalysisOnlyViewer
        ? 'standard'
        : selectedEngines.length > 1
          ? 'standard'
          : 'education_quick',
      options: {
        beliefDepth: selectedEngines.includes('recursive') ? 3 : 2,
        iterations: selectedEngines.length > 2 ? 1000 : 500
      }
    });
  };

  const workflowDraft = useMemo(() => buildForecastDraft(), [analysis, analysisRunId, prompt, strategistBrief]);
  const workflowDraftReadiness = useMemo(
    () => (workflowDraft ? assessForecastReadiness(workflowDraft) : null),
    [workflowDraft]
  );
  const workflowDraftGovernance = useMemo(
    () => workflowDraft && workflowDraftReadiness
      ? assessPublishGovernance(workflowDraft, workflowDraftReadiness, {
          status: analysisReviewState.status,
          reviewReason: analysisReviewState.reviewReason,
          evidenceBacked: analysisReviewState.evidenceBacked,
          createdAt: analysisReviewState.createdAt,
          loading: analysisReviewState.loading
        })
      : null,
    [workflowDraft, workflowDraftReadiness, analysisReviewState]
  );
  const workflowGovernanceSummary = useMemo(
    () => buildGovernanceSummary({
      readiness: workflowDraftReadiness,
      governance: workflowDraftGovernance,
      reviewState: {
        status: analysisReviewState.status,
        reviewReason: analysisReviewState.reviewReason,
        evidenceBacked: analysisReviewState.evidenceBacked,
        createdAt: analysisReviewState.createdAt,
        loading: analysisReviewState.loading
      },
      disagreementIndex: analysis?.multiAgentForecast?.panel.disagreementIndex ?? null,
      evidenceCount: analysis?.multiAgentForecast?.metadata.evidenceCount ?? analysis?.retrievals?.length ?? null
    }),
    [workflowDraftReadiness, workflowDraftGovernance, analysisReviewState, analysis]
  );
  const workflowStatus = useMemo(
    () => buildEnterpriseWorkflowStatus({
      strategist: strategistBrief,
      reviewState: {
        status: analysisReviewState.status,
        reviewReason: analysisReviewState.reviewReason,
        evidenceBacked: analysisReviewState.evidenceBacked,
        createdAt: analysisReviewState.createdAt,
        loading: analysisReviewState.loading
      },
      draftReadiness: workflowDraftReadiness,
      draftGovernance: workflowDraftGovernance
    }),
    [strategistBrief, analysisReviewState, workflowDraftReadiness, workflowDraftGovernance]
  );
  const groundedEntities = useMemo(
    () => analysis?.provenance?.grounded_entities || [],
    [analysis]
  );
  const constraintWarnings = useMemo(
    () => analysis?.constraint_checks?.checks?.filter((check) => check.status !== 'pass') || [],
    [analysis]
  );
  const calibrationStatus = analysis?.multiAgentForecast?.consensus?.champion?.calibrationStatus || analysis?.provenance?.calibration_status || 'uncalibrated';
  const driftSignal = analysis?.drift_signal || null;
  const strategistRequiresAuth = status === 'completed' && Boolean(analysis) && Boolean(analysisRunId) && !hasAuthenticatedSession;
  const retrievalCount = analysis?.retrievals?.length || analysis?.retrieval_count || 0;
  const publishBlockerCount = workflowGovernanceSummary.publish_blockers.length;
  const publicAnalysisOnlyViewer = publicBetaAnonymous;
  const forecastUsesLocalFallback = analysis?.multiAgentForecast?.consensus?.champion?.method === 'local fallback consensus';
  const publicAnswer = analysis?.multiAgentForecast?.publicAnswer || null;
  const publicAnswerNeedsInput = publicAnswer?.needs_more_input === true
    || publicAnswer?.context_status === 'needs_input'
    || publicAnswer?.context_status === 'blocked'
    || publicAnswer?.answer_release_status === 'needs_more_input';
  const publicPredictionEligible = !publicAnalysisOnlyViewer || (
    analysis?.provenance?.evidence_backed === true
    && retrievalCount >= 3
    && !forecastUsesLocalFallback
    && !publicAnswerNeedsInput
    && (publicAnswer?.answer_release_status ?? 'ready') === 'ready'
    && (publicAnswer?.context_alignment_score ?? 1) >= 0.65
  );
  const publicEvidenceGateActive = status === 'completed' && Boolean(analysis) && !publicPredictionEligible;
  const providerOutageHoldingAnswer = analysis?.provenance?.failure_class === 'quota_exceeded'
    || analysis?.provenance?.failure_class === 'config_missing'
    || analysis?.provenance?.failure_class === 'auth_error'
    || analysis?.provenance?.failure_class === 'provider_transport_error'
    || analysis?.provenance?.failure_class === 'provider_failure';
  const effectiveNextAction = useMemo(() => {
    if (publicAnalysisOnlyViewer && strategistRequiresAuth && !strategistBrief) {
      return {
        action: 'public_analysis_only',
        label: 'Continue with evidence-backed analysis',
        detail: 'Strategist brief generation is reserved for analyst accounts during this beta.'
      };
    }

    if (strategistRequiresAuth && !strategistBrief) {
      return {
        action: 'sign_in',
        label: 'Sign in to unlock strategist brief',
        detail: 'Doctrine-backed briefing, persistence, and governed handoff require account context.'
      };
    }

    return workflowStatus.nextAction;
  }, [publicAnalysisOnlyViewer, strategistRequiresAuth, strategistBrief, workflowStatus]);

  const primaryNextActionDisabled =
    analysisReviewState.requesting ||
    effectiveNextAction.action === 'wait_for_review' ||
    effectiveNextAction.action === 'strengthen_evidence';

  const calibrationCopy = useMemo(() => {
    switch (calibrationStatus) {
      case 'empirical':
        return 'Probabilities are calibrated against resolved outcomes.'
      case 'prior_smoothed':
        return 'Probabilities are stabilized with a prior while resolved history is still sparse.'
      case 'uncalibrated':
        return 'Model support exists, but there is not enough resolved history yet to treat calibration as mature.'
      default:
        return 'Calibration support is not yet available for this analysis.'
    }
  }, [calibrationStatus]);

  const decisionWorkspace = useMemo(() => {
    const strategistMove = strategistBrief?.recommendation?.primary_action?.replace(/_/g, ' ');
    const strategistOutcome = strategistBrief?.recommendation?.expected_outcome;
    const forecastChampion = forecastUsesLocalFallback && publicAnalysisOnlyViewer
      ? null
      : analysis?.multiAgentForecast?.consensus?.champion;
    const summaryText = analysis?.summary?.text || audienceData?.summary?.text || '';
    const forecastQuestion = analysis?.multiAgentForecast?.question?.title || analysis?.multiAgentForecast?.question?.question;

    const headline = publicAnswer?.best_current_call
      ? publicAnswer.best_current_call
      : strategistMove
      ? strategistMove
      : forecastChampion
        ? `Best current call: ${(forecastChampion.probability * 100).toFixed(1)}%`
        : 'Best current decision view';

    const summary = publicAnswer?.direct_answer
      || strategistBrief?.executive_summary
      || summaryText
      || 'Use the evidence and forecast workflow below to tighten this decision before publication.';

    const support = publicAnswer?.why_this_is_the_call
      || strategistOutcome
      || (forecastQuestion ? `Forecast package: ${forecastQuestion}` : null)
      || (analysis?.equilibrium?.stability !== undefined
        ? `Current equilibrium stability is ${(analysis.equilibrium.stability * 100).toFixed(0)}%.`
        : 'Run a forecast draft or review path once this answer is stable enough to act on.');

    return {
      headline,
      summary,
      support,
      whatToDoNext: publicAnswer?.what_to_do_next || null,
      timeHorizon: publicAnswer?.time_horizon || analysis?.multiAgentForecast?.question?.horizonLabel || null,
      confidenceLabel: publicAnswer?.confidence_label || null,
    };
  }, [analysis, audienceData, strategistBrief, forecastUsesLocalFallback, publicAnalysisOnlyViewer, publicAnswer]);

  const topRiskCard = useMemo(() => {
    if (publicAnswer) {
      return {
        title: 'What could change this call?',
        body: publicAnswer.what_could_change_it,
        detail: publicAnswer.watch_factors[0] || publicAnswer.what_to_do_next,
      };
    }

    const contradiction = analysis?.multiAgentForecast?.adversarialReview?.contradictionPoints?.[0];
    const missingEvidence = analysis?.multiAgentForecast?.adversarialReview?.missingEvidence?.[0];
    const driftDetail = driftSignal
      ? `${driftSignal.surface} is in ${driftSignal.state} with score ${driftSignal.score.toFixed(3)}.`
      : null;
    const constraintDetail = constraintWarnings[0]?.detail || null;

    if (contradiction) {
      return {
        title: 'What could change this call?',
        body: contradiction,
        detail: analysis?.multiAgentForecast?.adversarialReview?.recommendation || 'Keep challenger reasoning visible before acting.'
      };
    }

    if (missingEvidence) {
      return {
        title: 'What still needs verification?',
        body: missingEvidence,
        detail: 'Trust should remain review-visible until stronger evidence is attached.'
      };
    }

    if (driftDetail) {
      return {
        title: 'What could change this call?',
        body: driftDetail,
        detail: 'Open the advisory ML panel to see whether the environment is shifting.'
      };
    }

    if (constraintDetail) {
      return {
        title: 'What still needs verification?',
        body: constraintDetail,
        detail: 'Constraint checks flagged a doctrine or evidence issue worth reviewing.'
      };
    }

    return {
      title: 'What could change this call?',
      body: 'No major contradiction is leading yet, but challenger reasoning and governance checks should stay visible for high-stakes use.',
      detail: 'Use the deep review panels if the decision will be published or escalated.'
    };
  }, [analysis, constraintWarnings, driftSignal, publicAnswer]);

  const deepReviewChips = useMemo(() => {
    const chips: Array<{
      id: DeepReviewSection;
      label: string;
      detail: string;
      tone: string;
    }> = [
      {
        id: 'evidence',
        label: workflowGovernanceSummary.evidence_backed_state.label,
        detail: workflowGovernanceSummary.evidence_backed_state.detail,
        tone: workflowGovernanceSummary.evidence_backed_state.tone
      },
      {
        id: 'governance',
        label: workflowGovernanceSummary.review_state.label,
        detail: workflowGovernanceSummary.review_state.detail,
        tone: workflowGovernanceSummary.review_state.tone
      },
      {
        id: 'forecast',
        label: workflowGovernanceSummary.consensus_reliability?.label || 'Consensus still forming',
        detail: workflowGovernanceSummary.consensus_reliability?.detail || 'Open the forecast panel to inspect challenger and adversarial views.',
        tone: workflowGovernanceSummary.consensus_reliability?.tone || 'border-slate-600 bg-slate-800 text-slate-300'
      },
      {
        id: 'ml',
        label: driftSignal && driftSignal.state !== 'stable'
          ? `Drift ${driftSignal.state}`
          : `Advisory ${labelCalibrationStatus(calibrationStatus)}`,
        detail: driftSignal && driftSignal.state !== 'stable'
          ? `${driftSignal.surface} shows a non-stable signal.`
          : calibrationCopy,
        tone: driftSignal && driftSignal.state !== 'stable'
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
          : calibrationStatus === 'empirical'
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
            : calibrationStatus === 'prior_smoothed'
              ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
              : 'border-slate-600 bg-slate-800 text-slate-300'
      },
      {
        id: 'supporting',
        label: 'Supporting views',
        detail: 'Educational and audience-specific renderings stay available when you need to go deeper.',
        tone: 'border-slate-600 bg-slate-800 text-slate-300'
      }
    ];

    if (publishBlockerCount > 0) {
      chips.splice(2, 0, {
        id: 'governance',
        label: `${publishBlockerCount} governance ${publishBlockerCount === 1 ? 'blocker' : 'blockers'}`,
        detail: workflowGovernanceSummary.publish_blockers[0] || 'Publication blockers remain open.',
        tone: 'border-rose-500/30 bg-rose-500/10 text-rose-300'
      });
    }

    return chips;
  }, [workflowGovernanceSummary, driftSignal, calibrationStatus, calibrationCopy, publishBlockerCount]);

  useEffect(() => {
    if (status !== 'completed' || !analysis) {
      return;
    }

    if (strategistRequiresAuth || publishBlockerCount > 0) {
      setOpenDeepSection('governance');
      return;
    }

    if (retrievalCount > 0) {
      setOpenDeepSection('evidence');
      return;
    }

    if (analysis.multiAgentForecast) {
      setOpenDeepSection('forecast');
      return;
    }

    setOpenDeepSection('ml');
  }, [status, analysis, strategistRequiresAuth, publishBlockerCount, retrievalCount]);

  useEffect(() => {
    if (publicAnalysisOnlyViewer && activeSurface === 'strategist') {
      setActiveSurface('analysis');
    }
  }, [publicAnalysisOnlyViewer, activeSurface]);

  const handleWorkflowNextAction = async () => {
    if (effectiveNextAction.action === 'public_analysis_only') {
      setOpenDeepSection('evidence');
      return;
    }

    if (effectiveNextAction.action === 'sign_in') {
      navigate('/signup');
      return;
    }

    switch (workflowStatus.nextAction.action) {
      case 'request_review':
        await handleRequestHumanReview();
        return;
      case 'open_forecast_draft':
      case 'resolve_blockers':
        handleCreateForecastDraft();
        return;
      default:
        return;
    }
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
      {showWelcome && activeSurface === 'analysis' && (
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
            {activeSurface === 'analysis'
              ? 'Run evidence-backed strategic analysis in seconds. Real citations. Real simulations. Real clarity.'
              : 'Use the strategist engine to turn ambiguous decisions into structured incentive maps, equilibria, and adaptive recommendations.'}
          </p>
        </div>

        <div className="mb-6 flex justify-center">
          <div className="inline-flex rounded-xl border border-slate-700 bg-slate-800 p-1">
            <button
              onClick={() => setActiveSurface('analysis')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeSurface === 'analysis'
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              Strategic Analysis
            </button>
            {!publicAnalysisOnlyViewer && (
              <button
                onClick={() => setActiveSurface('strategist')}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeSurface === 'strategist'
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                Strategist
              </button>
            )}
          </div>
        </div>

        {activeSurface === 'strategist' ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-800 shadow-2xl">
            <Suspense fallback={lazySectionFallback}>
              <PersonalLifeCoach />
            </Suspense>
          </div>
        ) : (
          <>

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

            {prompt.trim().length >= 12 && (clarificationQuestions.length > 0 || clarificationStatus === 'blocked' || questionIntakeLoading) && (
              <div className={`mt-5 rounded-2xl border p-4 ${
                clarificationStatus === 'blocked'
                  ? 'border-rose-500/20 bg-rose-500/5'
                  : 'border-amber-500/20 bg-amber-500/5'
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-amber-300">Adaptive clarification gate</div>
                  <div className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300">
                    {(clarificationProgress.totalQuestionsAsked || 0)} of 4 clarification questions
                  </div>
                </div>
                <div className="mt-2 text-sm font-medium text-white">
                  {clarificationStatus === 'blocked'
                    ? 'The engine still needs more scope before it should release a responsible public forecast.'
                    : 'The engine is asking only the highest-value context questions before it forecasts.'}
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-300">
                  {questionIntake?.relevance_summary || 'Clarification is running so the public analysis can stay relevant and resolvable.'}
                </div>
                {questionIntakeError && (
                  <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-300">
                    Hosted intake degraded; using the local clarification policy. {questionIntakeError}
                  </div>
                )}
                {questionIntakeLoading ? (
                  <div className="mt-4 flex items-center gap-2 text-sm text-slate-300">
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                    Checking what the engine still needs before analysis…
                  </div>
                ) : clarificationQuestions.length > 0 ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {clarificationQuestions.map((entry) => (
                      <label key={entry.id} className="block">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{entry.label}</div>
                          {effectiveClarificationAnswers[entry.id] && (
                            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                              Set
                            </span>
                          )}
                        </div>
                        {entry.kind === 'select' ? (
                          <select
                            value={effectiveClarificationAnswers[entry.id] || ''}
                            onChange={(event) => setClarificationAnswers((current) => ({ ...current, [entry.id]: event.target.value }))}
                            className="w-full rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none"
                          >
                            <option value="">Select {entry.label.toLowerCase()}</option>
                            {entry.options?.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={effectiveClarificationAnswers[entry.id] || ''}
                            onChange={(event) => setClarificationAnswers((current) => ({ ...current, [entry.id]: event.target.value }))}
                            placeholder={entry.prompt}
                            className="w-full rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                          />
                        )}
                        {!effectiveClarificationAnswers[entry.id] && cachedClarificationAnswers[entry.id] && (
                          <button
                            type="button"
                            onClick={() => setClarificationAnswers((current) => ({ ...current, [entry.id]: cachedClarificationAnswers[entry.id] || '' }))}
                            className="mt-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[11px] text-cyan-200 hover:bg-cyan-500/15"
                          >
                            Use recent context: {cachedClarificationAnswers[entry.id]}
                          </button>
                        )}
                        <div className="mt-2 text-xs leading-5 text-slate-400">
                          Why this matters: {entry.reason}
                        </div>
                      </label>
                    ))}
                  </div>
                ) : null}
                {promptMissingInputs.length > 0 && (
                  <div className="mt-3 text-xs text-amber-200">
                    Missing: {promptMissingInputs.map((entry) => entry.label).join(', ')}
                  </div>
                )}
              </div>
            )}
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
                        ? 'Real citations from Exa, Crossref, GDELT, Firecrawl, and official data providers'
                        : 'Enable to fetch verified sources (recommended)'
                      }
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (publicAnalysisOnlyViewer) return;
                    setEvidenceEnabled(!evidenceEnabled);
                  }}
                  disabled={publicAnalysisOnlyViewer}
                  className={`w-14 h-7 rounded-full transition-all relative ${
                    evidenceEnabled
                      ? 'bg-cyan-500 shadow-lg shadow-cyan-500/30'
                      : 'bg-slate-600'
                  } ${publicAnalysisOnlyViewer ? 'cursor-not-allowed opacity-80' : ''}`}
                >
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow ${
                    evidenceEnabled ? 'left-8' : 'left-1'
                  }`} />
                </button>
              </div>
              {publicAnalysisOnlyViewer && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200">
                  <Shield className="w-4 h-4" />
                  <span>External beta mode keeps evidence retrieval on and routes every public run through the hosted evidence-backed path.</span>
                </div>
              )}
              {/* Tier-based evidence limit info */}
              {evidenceEnabled && whopTier === 'free' && (
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
                      Advanced analysis settings ({selectedEngines.length} selected)
                    </div>
                    <div className="text-xs text-slate-400">
                      {whopTier === 'free' ? 'Upgrade for more engines' : 'Keep the flagship path simple and open these only when needed'}
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
              disabled={loading || !prompt.trim() || questionIntakeLoading || clarificationBlocking || promptMissingInputs.length > 0}
              className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 ${
                loading || !prompt.trim() || questionIntakeLoading || clarificationBlocking || promptMissingInputs.length > 0
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white hover:from-cyan-400 hover:to-emerald-400 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Analyzing...
                </>
              ) : questionIntakeLoading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Clarifying context…
                </>
              ) : (
                <>
                  <Play className="w-6 h-6" />
                  Run Analysis
                </>
              )}
            </button>

            {analysisReviewState.message && (
              <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
                {analysisReviewState.message}
              </div>
            )}

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
            {publicEvidenceGateActive ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <div className="text-xs uppercase tracking-[0.2em] text-amber-300">Public trust gate</div>
                    <div className="mt-3 text-2xl font-semibold text-white">
                      {publicAnswerNeedsInput ? 'More context is needed for a citizen-ready answer' : 'Insufficient evidence for a public call'}
                    </div>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">
                      {publicAnswerNeedsInput
                        ? 'This question depends on local or personal context that the public beta is designed to collect explicitly. The system is refusing to generalize silently.'
                        : providerOutageHoldingAnswer
                          ? 'This beta only surfaces public predictions when the hosted run is genuinely evidence-backed. The current result is being withheld because the hosted synthesis providers did not complete a verified answer.'
                          : 'This beta only surfaces public predictions when the hosted run is genuinely evidence-backed. The current result is being withheld because the evidence threshold was not met strongly enough for a public-facing recommendation.'}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
                      <span className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1">
                        {retrievalCount} sources
                      </span>
                      <span className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1">
                        {analysis?.provenance?.evidence_backed ? 'Evidence-backed' : 'Evidence not verified'}
                      </span>
                      <span className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1">
                        {(analysis?.provenance?.retrieval_provider_summary?.distinctProviderCount ?? 0)} providers
                      </span>
                      {analysis?.provenance?.failure_class && (
                        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1">
                          {analysis.provenance.failure_class.replace(/_/g, ' ')}
                        </span>
                      )}
                      {publicAnswer?.time_horizon && (
                        <span className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1">
                          {publicAnswer.time_horizon}
                        </span>
                      )}
                    </div>
                    {publicAnswerNeedsInput ? (
                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-200">
                        {(publicAnswer?.required_inputs || []).map((entry) => (
                          <span key={entry.id} className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1">
                            Add {entry.label.toLowerCase()}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-slate-400">
                        Refine the scenario, narrow the claim, or browse a curated template while stronger evidence is gathered.
                      </p>
                    )}
                  </div>

                  <div className="w-full rounded-2xl border border-slate-700 bg-slate-900/70 p-5 lg:max-w-sm">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Next step</div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {publicAnswerNeedsInput ? 'Provide the missing context' : 'Strengthen the evidence case'}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-400">
                      {publicAnswerNeedsInput
                        ? publicAnswer?.what_to_do_next || 'Add the missing context so the platform can frame the question correctly.'
                        : providerOutageHoldingAnswer
                          ? analysis?.provenance?.warning || 'A working hosted synthesis provider must complete the answer before the public recommendation can be released.'
                          : 'Public beta users only receive a recommendation after the hosted run clears the evidence threshold.'}
                    </div>
                    <div className="mt-4 flex flex-col gap-3">
                      <button
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="w-full rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-400"
                      >
                        Refine scenario
                      </button>
                      <button
                        onClick={() => navigate('/templates')}
                        className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-100 hover:bg-slate-950"
                      >
                        Browse templates
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1">
                  <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">Decision Workspace</div>
                  <div className="mt-3 text-2xl font-semibold text-white">{decisionWorkspace.headline}</div>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">{decisionWorkspace.summary}</p>
                  <p className="mt-3 text-sm text-slate-400">{decisionWorkspace.support}</p>
                  {publicAnswer?.clarification_summary && (
                    <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">Context locked for this answer</div>
                      <div className="mt-1 text-sm text-slate-200">{publicAnswer.clarification_summary}</div>
                      {publicAnswer.context_locked_fields.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                          {publicAnswer.context_locked_fields.map((field) => (
                            <span key={field} className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1">
                              {field}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {(decisionWorkspace.timeHorizon || decisionWorkspace.confidenceLabel || decisionWorkspace.whatToDoNext) && (
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {decisionWorkspace.timeHorizon && (
                        <div className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500">Time horizon</div>
                          <div className="mt-1 text-sm font-medium text-white">{decisionWorkspace.timeHorizon}</div>
                        </div>
                      )}
                      {decisionWorkspace.confidenceLabel && (
                        <div className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500">Confidence label</div>
                          <div className="mt-1 text-sm font-medium text-white">{decisionWorkspace.confidenceLabel}</div>
                        </div>
                      )}
                      {decisionWorkspace.whatToDoNext && (
                        <div className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500">What to do next</div>
                          <div className="mt-1 text-sm font-medium text-white">{decisionWorkspace.whatToDoNext}</div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
                    <span className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1">
                      {analysis.players?.length || 0} players
                    </span>
                    <span className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1">
                      {analysis.equilibrium?.stability
                        ? `${(analysis.equilibrium.stability * 100).toFixed(0)}% stability`
                        : 'Stability pending'}
                    </span>
                    <span className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1">
                      {retrievalCount} sources
                    </span>
                    <span className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1">
                      {analysis.processing_stats?.processing_time_ms
                        ? `${(analysis.processing_stats.processing_time_ms / 1000).toFixed(1)}s processing`
                        : 'Processing complete'}
                    </span>
                  </div>
                </div>

                <div className="w-full rounded-2xl border border-slate-700 bg-slate-900/70 p-5 lg:max-w-sm">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Next step</div>
                  <div className="mt-2 text-lg font-semibold text-white">{effectiveNextAction.label}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">{effectiveNextAction.detail}</div>
                  <button
                    onClick={handleWorkflowNextAction}
                    disabled={primaryNextActionDisabled}
                    className="mt-4 w-full rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-400"
                  >
                    {effectiveNextAction.label}
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[1.25fr,0.75fr]">
                <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Why should I trust this?</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {deepReviewChips.map((chip) => (
                      <button
                        key={`${chip.id}:${chip.label}`}
                        onClick={() => setOpenDeepSection(chip.id)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          openDeepSection === chip.id
                            ? `${chip.tone} shadow-sm`
                            : 'border-slate-600 bg-slate-900 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 text-sm leading-6 text-slate-300">
                    {deepReviewChips.find((chip) => chip.id === openDeepSection)?.detail}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{topRiskCard.title}</div>
                  <div className="mt-2 text-sm font-medium leading-6 text-white">{topRiskCard.body}</div>
                  <div className="mt-3 text-xs leading-5 text-slate-400">{topRiskCard.detail}</div>
                </div>
              </div>
            </div>
            )}

            <div className="rounded-2xl border border-slate-700 bg-slate-800">
              <div className="border-b border-slate-700 px-6 py-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-lg font-semibold text-white">Governance &amp; Deep Review</div>
                    <div className="mt-1 text-sm text-slate-400">
                      Go deeper when needed. The answer stays upfront; evidence, governance, and renderings remain one click away.
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {deepReviewChips.map((chip) => (
                      <button
                        key={`panel-${chip.id}:${chip.label}`}
                        onClick={() => setOpenDeepSection(chip.id)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          openDeepSection === chip.id
                            ? `${chip.tone} shadow-sm`
                            : 'border-slate-600 bg-slate-900 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6">
                {openDeepSection === 'evidence' && (
                  <Suspense fallback={lazySectionFallback}>
                    <EvidenceSourcesDashboard
                      analysis={analysis}
                      onRequestReview={handleRequestHumanReview}
                      privateBetaMode={publicAnalysisOnlyViewer}
                    />
                  </Suspense>
                )}

                {openDeepSection === 'governance' && (
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="text-base font-semibold text-white">Governed workflow status</div>
                          <div className="mt-1 text-sm text-slate-400">
                            Enterprise governance stays intact, but it no longer needs to dominate the first screen.
                          </div>
                        </div>
                        <div className="rounded-full border border-slate-600 bg-slate-950 px-3 py-1 text-xs text-slate-300">
                          {effectiveNextAction.label}
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-4">
                        {workflowStatus.steps.map((step) => (
                          <div
                            key={step.id}
                            className={`rounded-xl border px-4 py-3 ${
                              step.status === 'complete'
                                ? 'border-emerald-500/20 bg-emerald-500/5'
                                : step.status === 'active'
                                  ? 'border-amber-500/20 bg-amber-500/5'
                                  : 'border-slate-700 bg-slate-800/80'
                            }`}
                          >
                            <div className="text-xs uppercase tracking-wide text-slate-500">{step.label}</div>
                            <div className="mt-1 text-sm font-medium text-white">
                              {step.status === 'complete' ? 'Complete' : step.status === 'active' ? 'In progress' : 'Available'}
                            </div>
                            <div className="mt-2 text-xs text-slate-400">{step.detail}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Suspense fallback={lazySectionFallback}>
                      <StrategistBriefPanel
                        strategist={strategistBrief}
                        loading={strategistLoading}
                        error={strategistError}
                        requiresSignIn={strategistRequiresAuth}
                        privateBetaMode={publicAnalysisOnlyViewer}
                        onCopyBrief={handleCopyStrategistBrief}
                        onSaveToWarRoom={handleSaveToWarRoom}
                        onRequestHumanReview={handleRequestHumanReview}
                        onOpenForecastDraft={handleCreateForecastDraft}
                        onSignIn={() => navigate('/signup')}
                        onContinueWithoutSignIn={() => setOpenDeepSection(analysis?.multiAgentForecast ? 'forecast' : 'evidence')}
                        reviewActionDisabled={!analysisRunId || analysisReviewState.requesting || analysisReviewState.status === 'under_review' || !hasAuthenticatedSession}
                      />
                    </Suspense>

                    {strategistBrief && (
                      <Suspense fallback={lazySectionFallback}>
                        <EnterpriseBriefingPanel
                          strategist={strategistBrief}
                          analysis={analysis}
                          multiAgentForecast={analysis.multiAgentForecast}
                          governanceSummary={workflowGovernanceSummary}
                        />
                      </Suspense>
                    )}
                  </div>
                )}

                {openDeepSection === 'ml' && (
                  <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="text-base font-semibold text-white">Advisory ML layer</div>
                        <div className="mt-1 text-sm text-slate-400">
                          Grounding, calibration, drift, and deterministic constraint checks support the core answer without replacing human judgment.
                        </div>
                      </div>
                      <div className="rounded-full border border-cyan-500/20 bg-slate-900/70 px-3 py-1 text-xs text-cyan-100">
                        Calibration {labelCalibrationStatus(calibrationStatus)}
                      </div>
                    </div>
                    <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-300">
                      {calibrationCopy}
                    </div>
                    {groundedEntities.length > 0 && (
                      <div className="mt-4">
                        <div className="text-xs uppercase tracking-wide text-slate-500">Grounded entities</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {groundedEntities.map((entity) => (
                            <span key={`${entity.entity_key}:${entity.matched_text}`} className="rounded-full border border-cyan-500/20 bg-slate-900/70 px-3 py-1 text-xs text-cyan-100">
                              {entity.label} · {(entity.confidence * 100).toFixed(0)}%
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                        <div className="text-xs uppercase tracking-wide text-slate-500">Drift state</div>
                        <div className="mt-1 text-sm font-medium text-white">
                          {driftSignal ? `${driftSignal.surface} · ${driftSignal.state}` : 'No active drift signal'}
                        </div>
                        <div className="mt-2 text-xs text-slate-400">
                          {driftSignal
                            ? `Score ${driftSignal.score.toFixed(3)} vs threshold ${driftSignal.threshold.toFixed(3)}`
                            : 'The latest analysis did not inherit a drift-triggered refresh advisory.'}
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                        <div className="text-xs uppercase tracking-wide text-slate-500">Constraint checks</div>
                        <div className="mt-1 text-sm font-medium text-white">
                          {analysis?.constraint_checks ? `Score ${(analysis.constraint_checks.score * 100).toFixed(0)}%` : 'Not available'}
                        </div>
                        <div className="mt-2 space-y-1 text-xs text-slate-300">
                          {constraintWarnings.length > 0 ? constraintWarnings.slice(0, 3).map((check) => (
                            <div key={check.id}>{check.title}: {check.detail}</div>
                          )) : (
                            <div>No major doctrine or evidence violations were flagged.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {openDeepSection === 'forecast' && (
                  analysis.multiAgentForecast ? (
                    <Suspense fallback={lazySectionFallback}>
                      <MultiAgentForecastPanel
                        multiAgentForecast={analysis.multiAgentForecast}
                        analysisRunId={analysisRunId}
                        analysisReviewState={analysisReviewState}
                        draftReadiness={workflowDraftReadiness}
                        draftGovernance={workflowDraftGovernance}
                        onRequestHumanReview={handleRequestHumanReview}
                        onCreateForecastDraft={handleCreateForecastDraft}
                        privateBetaMode={publicAnalysisOnlyViewer}
                      />
                    </Suspense>
                  ) : (
                    <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5 text-sm text-slate-400">
                      Forecast challenger views are not available for this run yet. Open evidence or governance detail to continue.
                    </div>
                  )
                )}

                {openDeepSection === 'supporting' && (
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5">
                    <div className="mb-4">
                      <div className="text-base font-semibold text-white">Supporting technical and educational renderings</div>
                      <div className="mt-1 text-sm text-slate-400">
                        Use these only when the audience needs expanded explanation or alternate renderings of the same analysis.
                      </div>
                    </div>
                    <Suspense fallback={lazySectionFallback}>
                      <AudienceViewRouter
                        analysisData={audienceData || undefined}
                        analysisRunId={analysisRunId || undefined}
                        isLoading={audienceLoading}
                      />
                    </Suspense>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tier Upgrade Prompt (for free users) */}
        {whopTier === 'free' && !loading && !publicAnalysisOnlyViewer && (
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
          </>
        )}
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && !publicAnalysisOnlyViewer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <Lock className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Upgrade Required</h3>
                <p className="text-sm text-slate-400">
                  {upgradeTargetTier === 'elite' ? 'Elite' : 'Pro'} tier feature
                </p>
              </div>
            </div>
            <p className="text-slate-300 mb-6">
              This analysis engine requires the {upgradeTargetTier === 'elite' ? 'Elite' : 'Pro'} tier.
              Upgrade now to unlock advanced strategic analysis capabilities.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/pricing')}
                className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-400 text-white rounded-lg font-medium transition-colors"
              >
                View Plans
              </button>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-medium transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StrategyConsole;
