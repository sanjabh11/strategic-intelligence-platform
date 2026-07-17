// Public Forecast Registry Component
// Community predictions with game-theoretic analysis
// Part of Monetization Strategy Phase 2 - Community Engagement

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, Clock, Users, Target, Filter,
  Plus, Search, ChevronRight, Award, BarChart3, Calendar,
  CheckCircle, XCircle, HelpCircle, Globe, Zap, Eye
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { assessForecastReadiness, assessPublishGovernance, buildGovernanceSummary, getAnalysisFreshness, type ForecastLinkedAnalysisState, type GovernanceSummary } from '../lib/forecastGovernance';
import { ENDPOINTS, getAuthHeaders, getUserAuthHeaders, isLocalPreviewOrigin, supabase } from '../lib/supabase';
import type { WarRoomRouteState } from '../lib/warRoom';
import { labelCalibrationStatus, type CalibrationStatusLike } from '../../shared/mlAdvisory';
import { isPublicAnalysisOnlyBeta } from '../lib/publicBeta';

interface Forecast {
  id: string;
  title: string;
  description: string;
  category: 'geopolitical' | 'financial' | 'technology' | 'economic' | 'social' | 'other';
  question: string;
  resolution_criteria: string;
  resolution_date: string | null;
  current_probability: number | null;
  prediction_count: number;
  view_count: number;
  is_resolved: boolean;
  resolution_outcome: 'yes' | 'no' | 'ambiguous' | 'canceled' | null;
  tags: string[];
  created_at: string;
  creator_id: string;
  analysis_run_id?: string | null;
  game_theory_model?: Record<string, unknown> | null;
}

interface ForecastDraft {
  title: string;
  description: string;
  category: Forecast['category'];
  question: string;
  resolution_criteria: string;
  resolution_date: string;
  tags: string;
  analysis_run_id?: string;
  game_theory_model?: Record<string, unknown> | null;
}

interface WeightedConsensusResult {
  communityConsensus: number;
  superforecasterConsensus: number;
  consensusGap: number;
  participantCount: number;
  superforecasterCount: number;
  brierWeightedMean: number;
  confidenceWeightedMean: number;
  extremizationFactor?: number;
  topForecasters: Array<{
    user_id: string;
    probability: number;
    brier_score: number | null;
    weight: number;
  }>;
  reliability: {
    score: number;
    sampleSize: string;
    expertAgreement: number;
  };
  rawProbability: number;
  calibratedProbability: number;
  calibrationStatus: CalibrationStatusLike;
  calibrationVersion: string | null;
  calibrationSampleSize: number;
}

interface UserPrediction {
  id: string;
  forecast_id: string;
  probability: number;
  confidence: number | null;
  reasoning: string;
  created_at: string;
}

interface LeaderboardEntry {
  user_id: string;
  total_predictions: number;
  resolved_predictions: number;
  brier_score: number | null;
  accuracy_rate: number | null;
  rank: number;
  badges: string[];
}

interface LinkedAnalysisReviewState {
  analysisId: string | null;
  status: ForecastLinkedAnalysisState['status'];
  reviewReason: ForecastLinkedAnalysisState['reviewReason'];
  evidenceBacked: ForecastLinkedAnalysisState['evidenceBacked'];
  createdAt: ForecastLinkedAnalysisState['createdAt'];
  loading: boolean;
}

interface GovernanceSignal {
  label: string;
  tone: string;
}

function getForecastModel(forecast: Forecast) {
  return (forecast.game_theory_model as Record<string, any> | null) || null;
}

function getForecastPublicAnswer(forecast: Forecast) {
  return getForecastModel(forecast)?.multi_agent_forecast?.publicAnswer
    || getForecastModel(forecast)?.public_answer
    || null;
}

function getForecastProvenance(forecast: Forecast) {
  return getForecastModel(forecast)?.provenance || null;
}

function getForecastEvidenceCount(forecast: Forecast) {
  const model = getForecastModel(forecast);
  const multiAgentForecast = model?.multi_agent_forecast;
  return typeof multiAgentForecast?.metadata?.evidenceCount === 'number'
    ? multiAgentForecast.metadata.evidenceCount
    : typeof multiAgentForecast?.evidenceCount === 'number'
      ? multiAgentForecast.evidenceCount
      : typeof model?.retrieval_count === 'number'
        ? model.retrieval_count
        : typeof model?.evidence_bundle?.source_count === 'number'
          ? model.evidence_bundle.source_count
          : null;
}

function getForecastDistinctProviderCount(forecast: Forecast) {
  const summary = getForecastModel(forecast)?.retrieval_provider_summary;
  return typeof summary?.distinctProviderCount === 'number' ? summary.distinctProviderCount : null;
}

function normalizeConsensusError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || 'Consensus unavailable')
  if (/not_found|requested function was not found|failed to fetch|http 404/i.test(message)) {
    return 'Consensus view is not live for this forecast yet.'
  }
  return message
}

const EMPTY_LINKED_ANALYSIS_REVIEW: LinkedAnalysisReviewState = {
  analysisId: null,
  status: null,
  reviewReason: null,
  evidenceBacked: null,
  createdAt: null,
  loading: false
};

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Globe },
  { id: 'geopolitical', label: 'Geopolitical', icon: Globe },
  { id: 'financial', label: 'Financial', icon: TrendingUp },
  { id: 'technology', label: 'Technology', icon: Zap },
  { id: 'economic', label: 'Economic', icon: BarChart3 },
  { id: 'social', label: 'Social', icon: Users },
];

const CATEGORY_COLORS: Record<string, string> = {
  geopolitical: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  financial: 'bg-green-500/20 text-green-400 border-green-500/30',
  technology: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  economic: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  social: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  other: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const useHostedForecastRegistryInLocalPreview =
  String(import.meta.env.VITE_HOSTED_FORECASTS_IN_LOCAL_PREVIEW ?? '').toLowerCase() === 'true';

interface ForecastRegistryProps {
  userId?: string;
}

const ForecastRegistry: React.FC<ForecastRegistryProps> = ({ userId }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const publicAnalysisOnlyViewer = isPublicAnalysisOnlyBeta && !userId;
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedForecast, setSelectedForecast] = useState<Forecast | null>(null);
  const [userPrediction, setUserPrediction] = useState<UserPrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'detail' | 'create' | 'leaderboard'>('list');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showResolved, setShowResolved] = useState(false);

  // Prediction form state
  const [predictionForm, setPredictionForm] = useState({
    probability: 50,
    confidence: 70,
    reasoning: ''
  });

  // New forecast form state
  const [newForecast, setNewForecast] = useState({
    title: '',
    description: '',
    category: 'other' as Forecast['category'],
    question: '',
    resolution_criteria: '',
    resolution_date: '',
    tags: '',
    analysis_run_id: '',
    game_theory_model: null as Record<string, unknown> | null
  });
  const [weightedConsensus, setWeightedConsensus] = useState<WeightedConsensusResult | null>(null);
  const [weightedConsensusLoading, setWeightedConsensusLoading] = useState(false);
  const [weightedConsensusError, setWeightedConsensusError] = useState<string | null>(null);
  const [creatingForecast, setCreatingForecast] = useState(false);
  const [createForecastError, setCreateForecastError] = useState<string | null>(null);
  const [forecastLoadError, setForecastLoadError] = useState<string | null>(null);
  const [linkedAnalysisReview, setLinkedAnalysisReview] = useState<LinkedAnalysisReviewState>({
    analysisId: null,
    status: null,
    reviewReason: null,
    evidenceBacked: null,
    createdAt: null,
    loading: false
  });
  const [forecastReviewStates, setForecastReviewStates] = useState<Record<string, LinkedAnalysisReviewState>>({});

  const getTrustSignals = (forecast: Forecast, consensus: WeightedConsensusResult | null, reviewState: LinkedAnalysisReviewState) => {
    const gameTheoryModel = getForecastModel(forecast);
    const multiAgentForecast = gameTheoryModel?.multi_agent_forecast;
    const publicAnswer = getForecastPublicAnswer(forecast);
    const provenance = getForecastProvenance(forecast);
    const contradictionCount = Array.isArray(multiAgentForecast?.contradictionPoints)
      ? multiAgentForecast.contradictionPoints.length
      : 0;
    const linkedAnalysisFreshness = getAnalysisFreshness(reviewState.createdAt);
    const signals: GovernanceSignal[] = [];

    if (forecast.analysis_run_id) {
      signals.push({ label: 'Analysis-linked', tone: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300' });
    }

    if (reviewState.status === 'approved') {
      signals.push({ label: 'Human-reviewed', tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' });
    } else if (reviewState.status === 'under_review' || reviewState.status === 'needs_review') {
      signals.push({ label: 'Review pending', tone: 'border-amber-500/30 bg-amber-500/10 text-amber-300' });
    } else if (reviewState.status === 'rejected') {
      signals.push({ label: 'Review rejected', tone: 'border-rose-500/30 bg-rose-500/10 text-rose-300' });
    } else if (reviewState.evidenceBacked === true || provenance?.evidence_backed === true) {
      signals.push({ label: 'Evidence-backed analysis', tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' });
    }

    if (linkedAnalysisFreshness) {
      signals.push({ label: linkedAnalysisFreshness.label, tone: linkedAnalysisFreshness.tone });
    }

    const evidenceCount = getForecastEvidenceCount(forecast);

    if (typeof evidenceCount === 'number') {
      signals.push(
        (reviewState.evidenceBacked === true || provenance?.evidence_backed === true || evidenceCount >= 4)
          ? { label: 'Evidence-backed', tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' }
          : { label: 'Limited evidence', tone: 'border-amber-500/30 bg-amber-500/10 text-amber-300' }
      );
    }

    if (publicAnswer?.answer_release_status && publicAnswer.answer_release_status !== 'ready') {
      signals.push(
        publicAnswer.answer_release_status === 'needs_more_input'
          ? { label: 'Awaiting context', tone: 'border-amber-500/30 bg-amber-500/10 text-amber-300' }
          : { label: 'Public answer withheld', tone: 'border-rose-500/30 bg-rose-500/10 text-rose-300' }
      );
    } else if (publicAnswer?.confidence_label) {
      signals.push(
        publicAnswer.confidence_label === 'High'
          ? { label: 'High-confidence public answer', tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' }
          : publicAnswer.confidence_label === 'Moderate'
            ? { label: 'Moderate-confidence public answer', tone: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300' }
            : publicAnswer.confidence_label === 'Needs more input'
              ? { label: 'Needs more input', tone: 'border-amber-500/30 bg-amber-500/10 text-amber-300' }
              : { label: 'Limited-confidence public answer', tone: 'border-amber-500/30 bg-amber-500/10 text-amber-300' }
      );
    }

    const providerCount = getForecastDistinctProviderCount(forecast);
    if (typeof providerCount === 'number' && providerCount >= 2) {
      signals.push({ label: `${providerCount} providers`, tone: 'border-slate-500/30 bg-slate-500/10 text-slate-300' });
    }

    if ((multiAgentForecast?.disagreementIndex ?? 0) >= 0.2 || contradictionCount > 0) {
      signals.push({ label: 'Contested', tone: 'border-rose-500/30 bg-rose-500/10 text-rose-300' });
    }

    if (consensus) {
      signals.push(
        consensus.reliability.score >= 0.7
          ? { label: 'High consensus reliability', tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' }
          : consensus.participantCount < 5
            ? { label: 'Thin participation', tone: 'border-amber-500/30 bg-amber-500/10 text-amber-300' }
            : { label: 'Developing signal', tone: 'border-slate-500/30 bg-slate-500/10 text-slate-300' }
      );
    }

    return signals;
  };

  const draftReadiness = assessForecastReadiness(newForecast);
  const draftPublishGovernance = assessPublishGovernance(newForecast, draftReadiness, linkedAnalysisReview);

  const applyDraft = useCallback((draft: ForecastDraft | null | undefined) => {
    if (!draft) return;
    setCreateForecastError(null);
    setNewForecast({
      title: draft.title || '',
      description: draft.description || '',
      category: draft.category || 'other',
      question: draft.question || '',
      resolution_criteria: draft.resolution_criteria || '',
      resolution_date: draft.resolution_date || '',
      tags: draft.tags || '',
      analysis_run_id: draft.analysis_run_id || '',
      game_theory_model: draft.game_theory_model || null
    });
    setView('create');
  }, []);

  // Fetch forecasts
  const fetchForecasts = useCallback(async () => {
    setLoading(true);
    setForecastLoadError(null);
    if (isLocalPreviewOrigin && !useHostedForecastRegistryInLocalPreview) {
      setForecasts([]);
      setLoading(false);
      return;
    }
    try {
      let query = supabase
        .from('forecasts')
        .select('id, title, description, category, question, resolution_criteria, resolution_date, current_probability, prediction_count, view_count, is_resolved, resolution_outcome, tags, created_at, creator_id, analysis_run_id, game_theory_model')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      if (!showResolved) {
        query = query.eq('is_resolved', false);
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,question.ilike.%${searchQuery}%`);
      }

      const result = await Promise.race([
        query.limit(50),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Forecast list request timed out. Please retry.')), 10000);
        })
      ]) as Awaited<ReturnType<typeof query.limit>>;

      const { data, error } = result;

      if (error) throw error;
      setForecasts(data || []);
    } catch (err) {
      if (isLocalPreviewOrigin) {
        console.warn('Forecast registry using local preview empty state because hosted forecasts are unreachable:', err);
        setForecasts([]);
        setForecastLoadError(null);
        return;
      }
      console.error('Error fetching forecasts:', err);
      setForecasts([]);
      setForecastLoadError(err instanceof Error ? err.message : 'Failed to load forecasts');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, showResolved, searchQuery]);

  const hydrateForecastReviewStates = useCallback(async (items: Forecast[]) => {
    const analysisIds = Array.from(new Set(items.map((forecast) => forecast.analysis_run_id).filter(Boolean))) as string[];

    if (analysisIds.length === 0) {
      setForecastReviewStates({});
      return;
    }

    if (isLocalPreviewOrigin) {
      setForecastReviewStates({});
      return;
    }

    const baseState = Object.fromEntries(
      analysisIds.map((analysisId) => [analysisId, {
        analysisId,
        status: null,
        reviewReason: null,
        evidenceBacked: null,
        createdAt: null,
        loading: false
      } satisfies LinkedAnalysisReviewState])
    );

    try {
      const { data, error } = await supabase
        .from('analysis_runs')
        .select('id, status, review_reason, evidence_backed, created_at')
        .in('id', analysisIds);

      if (error) throw error;

      for (const row of data || []) {
        baseState[row.id] = {
          analysisId: row.id,
          status: typeof row.status === 'string' ? row.status : null,
          reviewReason: typeof row.review_reason === 'string' ? row.review_reason : null,
          evidenceBacked: typeof row.evidence_backed === 'boolean' ? row.evidence_backed : null,
          createdAt: typeof row.created_at === 'string' ? row.created_at : null,
          loading: false
        };
      }
      setForecastReviewStates(baseState);
    } catch {
      setForecastReviewStates(baseState);
    }
  }, []);

  const fetchForecastById = useCallback(async (forecastId: string) => {
    const { data, error } = await supabase
      .from('forecasts')
      .select('id, title, description, category, question, resolution_criteria, resolution_date, current_probability, prediction_count, view_count, is_resolved, resolution_outcome, tags, created_at, creator_id, analysis_run_id, game_theory_model')
      .eq('id', forecastId)
      .single();

    if (error) throw error;
    return data as Forecast;
  }, []);

  const fetchWeightedConsensus = useCallback(async (forecastId: string) => {
    setWeightedConsensusLoading(true);
    setWeightedConsensusError(null);

    try {
      const response = await fetch(ENDPOINTS.BRIER_WEIGHTED_CONSENSUS, {
        method: 'POST',
        headers: await getUserAuthHeaders(),
        body: JSON.stringify({ forecastId })
      });
      const json = await response.json();

      if (!response.ok || !json?.ok) {
        throw new Error(json?.message || 'Failed to load weighted consensus');
      }

      setWeightedConsensus(json.response as WeightedConsensusResult);
    } catch (err) {
      console.error('Error fetching weighted consensus:', err);
      setWeightedConsensus(null);
      setWeightedConsensusError(normalizeConsensusError(err));
    } finally {
      setWeightedConsensusLoading(false);
    }
  }, []);

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async () => {
    if (isLocalPreviewOrigin && !useHostedForecastRegistryInLocalPreview) {
      setLeaderboard([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('forecast_scores')
        .select('*')
        .order('brier_score', { ascending: true })
        .limit(20);

      if (error) throw error;
      setLeaderboard(data || []);
    } catch (err) {
      if (isLocalPreviewOrigin) {
        setLeaderboard([]);
        return;
      }
      console.error('Error fetching leaderboard:', err);
    }
  }, []);

  // Fetch user's prediction for selected forecast
  const fetchUserPrediction = useCallback(async (forecastId: string) => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('forecast_predictions')
        .select('*')
        .eq('forecast_id', forecastId)
        .eq('user_id', userId)
        .single();

      if (!error && data) {
        setUserPrediction(data);
        setPredictionForm({
          probability: data.probability * 100,
          confidence: (data.confidence || 0.7) * 100,
          reasoning: data.reasoning || ''
        });
      } else {
        setUserPrediction(null);
        setPredictionForm({ probability: 50, confidence: 70, reasoning: '' });
      }
    } catch (err) {
      console.error('Error fetching prediction:', err);
    }
  }, [userId]);

  useEffect(() => {
    fetchForecasts();
    fetchLeaderboard();
  }, [fetchForecasts, fetchLeaderboard]);

  useEffect(() => {
    hydrateForecastReviewStates(forecasts);
  }, [forecasts, hydrateForecastReviewStates]);

  useEffect(() => {
    const routeState = location.state as { prefillDraft?: ForecastDraft; openCreate?: boolean } | null;
    const stateDraft = routeState?.prefillDraft;
    const requestedAnalysisRunId = new URLSearchParams(location.search).get('analysis_run_id')?.trim() || '';
    if (stateDraft) {
      applyDraft(stateDraft);
      return;
    }

    const shouldOpenCreate = location.pathname === '/forecasts/new' || Boolean(routeState?.openCreate);
    if (shouldOpenCreate) {
      if (!userId) {
        setView('list');
        return;
      }
      if (requestedAnalysisRunId) {
        setNewForecast(prev => prev.analysis_run_id === requestedAnalysisRunId ? prev : {
          ...prev,
          analysis_run_id: requestedAnalysisRunId
        });
      }
      setView('create');
      return;
    }

    try {
      const storedDraft = sessionStorage.getItem('forecast-registry-draft');
      if (storedDraft) {
        applyDraft(JSON.parse(storedDraft) as ForecastDraft);
      }
    } catch (err) {
      console.error('Failed to parse forecast registry draft:', err);
    }
  }, [location.pathname, location.search, location.state, applyDraft]);

  useEffect(() => {
    if (selectedForecast) {
      fetchUserPrediction(selectedForecast.id);
    }
  }, [selectedForecast, fetchUserPrediction]);

  useEffect(() => {
    const activeAnalysisId = view === 'create'
      ? newForecast.analysis_run_id || null
      : selectedForecast?.analysis_run_id || null;

    if (!activeAnalysisId) {
      setLinkedAnalysisReview(EMPTY_LINKED_ANALYSIS_REVIEW);
      return;
    }

    let isCancelled = false;

    async function hydrateLinkedAnalysisReview() {
      setLinkedAnalysisReview(prev => ({
        ...prev,
        analysisId: activeAnalysisId,
        loading: true
      }));

      try {
        const { data, error } = await supabase
          .from('analysis_runs')
          .select('status, review_reason, evidence_backed, created_at')
          .eq('id', activeAnalysisId)
          .maybeSingle();

        if (error) throw error;

        if (!isCancelled) {
          setLinkedAnalysisReview({
            analysisId: activeAnalysisId,
            status: typeof data?.status === 'string' ? data.status : null,
            reviewReason: typeof data?.review_reason === 'string' ? data.review_reason : null,
            evidenceBacked: typeof data?.evidence_backed === 'boolean' ? data.evidence_backed : null,
            createdAt: typeof data?.created_at === 'string' ? data.created_at : null,
            loading: false
          });
        }
      } catch (err) {
        console.error('Error fetching linked analysis review state:', err);
        if (!isCancelled) {
          setLinkedAnalysisReview({
            analysisId: activeAnalysisId,
            status: null,
            reviewReason: null,
            evidenceBacked: null,
            createdAt: null,
            loading: false
          });
        }
      }
    }

    hydrateLinkedAnalysisReview();

    return () => {
      isCancelled = true;
    };
  }, [view, newForecast.analysis_run_id, selectedForecast?.analysis_run_id]);

  useEffect(() => {
    if (!selectedForecast || view !== 'detail') return;

    let isCancelled = false;

    async function hydrateForecastDetail() {
      try {
        if (!selectedForecast) return;
        const hasLoadedGameTheoryModel = Object.prototype.hasOwnProperty.call(selectedForecast, 'game_theory_model');

        if (!hasLoadedGameTheoryModel) {
          const fullForecast = await fetchForecastById(selectedForecast.id);
          if (!isCancelled) {
            setSelectedForecast(fullForecast);
          }
        }

        if (selectedForecast.prediction_count > 0) {
          await fetchWeightedConsensus(selectedForecast.id);
        } else if (!isCancelled) {
          setWeightedConsensus(null);
          setWeightedConsensusError(null);
        }
      } catch (err) {
        console.error('Error hydrating forecast detail:', err);
      }
    }

    hydrateForecastDetail();

    return () => {
      isCancelled = true;
    };
  }, [selectedForecast, view, fetchForecastById, fetchWeightedConsensus]);

  // Submit prediction
  const handleSubmitPrediction = async () => {
    if (!userId || !selectedForecast) return;

    try {
      const predictionData = {
        forecast_id: selectedForecast.id,
        user_id: userId,
        probability: predictionForm.probability / 100,
        confidence: predictionForm.confidence / 100,
        reasoning: predictionForm.reasoning,
        is_public: false
      };

      if (userPrediction) {
        await supabase
          .from('forecast_predictions')
          .update(predictionData)
          .eq('id', userPrediction.id);
      } else {
        await supabase
          .from('forecast_predictions')
          .insert(predictionData);
      }

      // Update aggregate probability
      await supabase.rpc('update_forecast_probability', { p_forecast_id: selectedForecast.id });

      const refreshedForecast = await fetchForecastById(selectedForecast.id);
      setSelectedForecast(refreshedForecast);
      setForecasts(prev => prev.map(forecast => forecast.id === refreshedForecast.id ? { ...forecast, ...refreshedForecast } : forecast));
      await fetchUserPrediction(selectedForecast.id);
      await fetchWeightedConsensus(selectedForecast.id);
    } catch (err) {
      console.error('Error submitting prediction:', err);
    }
  };

  // Create new forecast
  const handleCreateForecast = async () => {
    if (!userId || !newForecast.title || !newForecast.question || !newForecast.resolution_criteria || !draftPublishGovernance.canPublish) {
      setCreateForecastError(draftPublishGovernance.blockers[0] || draftPublishGovernance.reviewRequired[0] || 'Resolve the publish governance issues before creating this forecast.');
      return;
    }

    try {
      setCreatingForecast(true);
      setCreateForecastError(null);
      const headers = await getUserAuthHeaders();
      const response = await fetch(ENDPOINTS.FORECAST_CREATE, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: newForecast.title,
          description: newForecast.description,
          category: newForecast.category,
          question: newForecast.question,
          resolution_criteria: newForecast.resolution_criteria,
          resolution_date: newForecast.resolution_date || null,
          tags: newForecast.tags,
          analysis_run_id: newForecast.analysis_run_id || null,
          game_theory_model: newForecast.game_theory_model
        })
      });
      const json = await response.json().catch(() => null);

      if (!response.ok || !json?.ok || !json?.forecast) {
        throw new Error(json?.message || 'Failed to create forecast');
      }

      setForecasts(prev => [json.forecast as Forecast, ...prev]);
      setView('list');
      setCreateForecastError(null);
      setNewForecast({
        title: '',
        description: '',
        category: 'other',
        question: '',
        resolution_criteria: '',
        resolution_date: '',
        tags: '',
        analysis_run_id: '',
        game_theory_model: null
      });
      sessionStorage.removeItem('forecast-registry-draft');
    } catch (err) {
      console.error('Error creating forecast:', err);
      setCreateForecastError(err instanceof Error ? err.message : 'Failed to create forecast');
    } finally {
      setCreatingForecast(false);
    }
  };

  const handleFixBlockers = () => {
    const requiredFields = [
      { field: 'question' as const, label: 'Forecast Question' },
      { field: 'resolution_criteria' as const, label: 'Resolution Criteria' },
      { field: 'title' as const, label: 'Title' }
    ];

    for (const { field, label } of requiredFields) {
      const value = newForecast[field];
      if (!value || (typeof value === 'string' && !value.trim())) {
        setCreateForecastError(`${label} is required to publish.`);
        return;
      }
    }

    // If no required fields missing, check publish governance blockers
    if (draftPublishGovernance.blockers.length > 0) {
      setCreateForecastError(draftPublishGovernance.blockers[0]);
    }
  };

  // Format probability display
  const formatProbability = (prob: number | null) => {
    if (prob === null) return '?%';
    return `${Math.round(prob * 100)}%`;
  };

  const buildForecastGovernanceSummary = (
    forecast: Forecast,
    reviewState: LinkedAnalysisReviewState,
    consensus: WeightedConsensusResult | null = null,
    governance?: ReturnType<typeof assessPublishGovernance>,
    readiness?: ReturnType<typeof assessForecastReadiness>
  ) => {
    const multiAgentForecast = (forecast.game_theory_model as Record<string, any> | null)?.multi_agent_forecast;
    const provenance = getForecastProvenance(forecast);
    return buildGovernanceSummary({
      readiness,
      governance,
      reviewState,
      consensus,
      provenanceEvidenceBacked: typeof provenance?.evidence_backed === 'boolean' ? provenance.evidence_backed : null,
      disagreementIndex: typeof multiAgentForecast?.disagreementIndex === 'number' ? multiAgentForecast.disagreementIndex : null,
      evidenceCount: getForecastEvidenceCount(forecast)
    });
  };

  const renderGovernanceSnapshot = (summary: GovernanceSummary) => (
    <div className="grid gap-3 md:grid-cols-3">
      <div className={`rounded-lg border px-3 py-3 ${summary.review_state.tone}`}>
        <div className="text-[11px] uppercase tracking-wide opacity-80">Review state</div>
        <div className="mt-1 text-sm font-medium">{summary.review_state.label}</div>
        <div className="mt-1 text-xs opacity-90">{summary.review_state.detail}</div>
      </div>
      <div className={`rounded-lg border px-3 py-3 ${summary.evidence_backed_state.tone}`}>
        <div className="text-[11px] uppercase tracking-wide opacity-80">Evidence status</div>
        <div className="mt-1 text-sm font-medium">{summary.evidence_backed_state.label}</div>
        <div className="mt-1 text-xs opacity-90">{summary.evidence_backed_state.detail}</div>
      </div>
      <div className={`rounded-lg border px-3 py-3 ${(summary.consensus_reliability || summary.review_state).tone}`}>
        <div className="text-[11px] uppercase tracking-wide opacity-80">Consensus quality</div>
        <div className="mt-1 text-sm font-medium">{summary.consensus_reliability?.label || 'Consensus still forming'}</div>
        <div className="mt-1 text-xs opacity-90">
          {summary.consensus_reliability?.detail || 'Consensus quality becomes more precise once more scoring signal is available.'}
        </div>
      </div>
    </div>
  );

  // Render forecast card
  const renderForecastCard = (forecast: Forecast) => {
    const reviewState = forecast.analysis_run_id ? (forecastReviewStates[forecast.analysis_run_id] || EMPTY_LINKED_ANALYSIS_REVIEW) : EMPTY_LINKED_ANALYSIS_REVIEW;
    const governanceSummary = buildForecastGovernanceSummary(forecast, reviewState);
    const trustSignals = getTrustSignals(forecast, null, reviewState).slice(0, 3);
    const evidenceBundle = (forecast.game_theory_model as Record<string, any> | null)?.evidence_bundle;
    const publicAnswer = getForecastPublicAnswer(forecast);

    return (
      <div
        key={forecast.id}
        className={`bg-slate-800 rounded-xl border transition-all cursor-pointer ${
          forecast.is_resolved ? 'border-slate-700 opacity-75' : 'border-slate-700 hover:border-cyan-500/50'
        }`}
        onClick={() => {
          setSelectedForecast(forecast);
          setView('detail');
        }}
      >
        <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <span className={`px-2 py-1 rounded-full text-xs border ${CATEGORY_COLORS[forecast.category]}`}>
            {forecast.category}
          </span>
          {forecast.is_resolved && (
            <span className={`px-2 py-1 rounded-full text-xs ${
              forecast.resolution_outcome === 'yes' ? 'bg-green-500/20 text-green-400' :
              forecast.resolution_outcome === 'no' ? 'bg-red-500/20 text-red-400' :
              'bg-slate-600 text-slate-400'
            }`}>
              {forecast.resolution_outcome === 'yes' ? 'Resolved: Yes' :
               forecast.resolution_outcome === 'no' ? 'Resolved: No' :
               'Resolved'}
            </span>
          )}
        </div>

        {/* Question */}
        <h3 className="font-semibold text-white mb-2 line-clamp-2">{forecast.question}</h3>
        {publicAnswer?.direct_answer && (
          <p className="mb-3 text-sm leading-6 text-slate-300 line-clamp-3">{publicAnswer.direct_answer}</p>
        )}

        <div className="mb-3 flex flex-wrap gap-2">
          <span className={`px-2 py-1 rounded-full text-[11px] border ${governanceSummary.review_state.tone}`}>
            {governanceSummary.review_state.label}
          </span>
          <span className={`px-2 py-1 rounded-full text-[11px] border ${governanceSummary.evidence_backed_state.tone}`}>
            {governanceSummary.evidence_backed_state.label}
          </span>
          {governanceSummary.freshness && (
            <span className={`px-2 py-1 rounded-full text-[11px] border ${governanceSummary.freshness.tone}`}>
              {governanceSummary.freshness.label}
            </span>
          )}
        </div>

        {trustSignals.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {trustSignals.map(signal => (
              <span key={signal.label} className={`px-2 py-1 rounded-full text-[11px] border ${signal.tone}`}>
                {signal.label}
              </span>
            ))}
          </div>
        )}

        {/* Probability Display */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-slate-400">Community Probability</span>
            <span className={`font-bold ${
              (forecast.current_probability || 0) >= 0.7 ? 'text-green-400' :
              (forecast.current_probability || 0) <= 0.3 ? 'text-red-400' :
              'text-yellow-400'
            }`}>
              {formatProbability(forecast.current_probability)}
            </span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                (forecast.current_probability || 0) >= 0.7 ? 'bg-green-500' :
                (forecast.current_probability || 0) <= 0.3 ? 'bg-red-500' :
                'bg-yellow-500'
              }`}
              style={{ width: `${(forecast.current_probability || 0.5) * 100}%` }}
            />
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {forecast.prediction_count}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {forecast.view_count}
            </span>
          </div>
          {forecast.resolution_date && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(forecast.resolution_date).toLocaleDateString()}
            </span>
          )}
        </div>
        {evidenceBundle && (
          <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-400">
            Evidence bundle: {evidenceBundle.source_count || evidenceBundle.items?.length || 0} sources · {evidenceBundle.claim_count || 0} mapped claims
          </div>
        )}
      </div>
      </div>
    );
  };

  // Render forecast detail
  const renderForecastDetail = () => {
    if (!selectedForecast) return null;

    const trustSignals = getTrustSignals(selectedForecast, weightedConsensus, linkedAnalysisReview);
    const model = getForecastModel(selectedForecast);
    const multiAgentForecast = model?.multi_agent_forecast;
    const publicAnswer = getForecastPublicAnswer(selectedForecast);
    const evidenceBundle = model?.evidence_bundle;
    const refreshAdvisory = model?.advisories as Record<string, any> | undefined;
    const groundedEntities = Array.from(
      new Map(
        (((model?.provenance?.grounded_entities as Array<Record<string, any>> | undefined) || [])
          .map((entity) => [entity.entity_key || entity.label, entity]))
      ).values()
    );
    const linkedAnalysisFreshness = getAnalysisFreshness(linkedAnalysisReview.createdAt);
    const governanceSummary = buildForecastGovernanceSummary(selectedForecast, linkedAnalysisReview, weightedConsensus);
    const sendForecastToWarRoom = () => {
      const state: WarRoomRouteState = {
        decisionLogDraft: {
          title: selectedForecast.question,
          summary: selectedForecast.description || selectedForecast.resolution_criteria,
          sourceSurface: 'forecast_detail',
          linkedForecastId: selectedForecast.id,
          linkedForecastTitle: selectedForecast.title
        }
      };

      navigate('/war-room', { state });
    };

    return (
      <div className="space-y-6">
        <button
          onClick={() => { setSelectedForecast(null); setView('list'); }}
          className="text-slate-400 hover:text-white text-sm flex items-center gap-1"
        >
          ← Back to Forecasts
        </button>

        {/* Main Info */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-start justify-between mb-4">
            <span className={`px-3 py-1 rounded-full text-sm border ${CATEGORY_COLORS[selectedForecast.category]}`}>
              {selectedForecast.category}
            </span>
            {selectedForecast.is_resolved && (
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                selectedForecast.resolution_outcome === 'yes' ? 'bg-green-500/20 text-green-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {selectedForecast.resolution_outcome === 'yes' ?
                  <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                Resolved: {selectedForecast.resolution_outcome?.toUpperCase()}
              </div>
            )}
          </div>

          <h2 className="text-2xl font-bold text-white mb-4">{selectedForecast.question}</h2>

          {publicAnswer?.direct_answer && (
            <div className="mb-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">Direct answer</div>
              <div className="mt-2 text-lg font-semibold text-white">{publicAnswer.best_current_call}</div>
              <p className="mt-2 text-sm leading-6 text-slate-200">{publicAnswer.direct_answer}</p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">Time horizon</div>
                  <div className="mt-1 text-sm font-medium text-white">{publicAnswer.time_horizon}</div>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">Confidence label</div>
                  <div className="mt-1 text-sm font-medium text-white">{publicAnswer.confidence_label}</div>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">What to do next</div>
                  <div className="mt-1 text-sm font-medium text-white">{publicAnswer.what_to_do_next}</div>
                </div>
              </div>
            </div>
          )}

          {selectedForecast.description && (
            <p className="text-slate-400 mb-4 whitespace-pre-line">{selectedForecast.description}</p>
          )}

          {trustSignals.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {trustSignals.map(signal => (
                <span key={signal.label} className={`px-3 py-1 rounded-full text-xs border ${signal.tone}`}>
                  {signal.label}
                </span>
              ))}
            </div>
          )}

          {!publicAnalysisOnlyViewer && (
            <div className="mb-4 flex flex-wrap gap-3">
              <button
                onClick={sendForecastToWarRoom}
                className="rounded-lg bg-fuchsia-500/90 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-fuchsia-400"
              >
                Save to war room
              </button>
            </div>
          )}

          {renderGovernanceSnapshot(governanceSummary)}

          {refreshAdvisory?.refresh_needed && (
            <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="text-sm font-medium text-amber-200">Refresh recommended</div>
              <div className="mt-1 text-sm text-amber-100">
                {refreshAdvisory.refresh_reason || 'A recent drift signal marked this forecast for re-evaluation.'}
              </div>
              {refreshAdvisory.refresh_marked_at && (
                <div className="mt-2 text-xs text-amber-200/80">
                  Marked {new Date(refreshAdvisory.refresh_marked_at).toLocaleString()}
                </div>
              )}
            </div>
          )}

          {/* Big Probability Display */}
          <div className="bg-slate-700 rounded-xl p-6 mb-6">
            <div className="text-center">
              <div className="text-sm text-slate-400 mb-2">Community Prediction</div>
              <div className={`text-6xl font-bold ${
                (selectedForecast.current_probability || 0) >= 0.7 ? 'text-green-400' :
                (selectedForecast.current_probability || 0) <= 0.3 ? 'text-red-400' :
                'text-yellow-400'
              }`}>
                {formatProbability(selectedForecast.current_probability)}
              </div>
              <div className="text-sm text-slate-500 mt-2">
                Based on {selectedForecast.prediction_count} predictions
              </div>
              {weightedConsensus && (
                <div className="mt-3 text-xs text-slate-400">
                  Advisory calibration {formatProbability(weightedConsensus.calibratedProbability)} · {labelCalibrationStatus(weightedConsensus.calibrationStatus)}
                  {weightedConsensus.calibrationSampleSize > 0 && ` · ${weightedConsensus.calibrationSampleSize} resolved cases`}
                </div>
              )}
            </div>

            <div className="h-4 bg-slate-600 rounded-full overflow-hidden mt-4">
              <div
                className={`h-full rounded-full transition-all ${
                  (selectedForecast.current_probability || 0) >= 0.7 ? 'bg-green-500' :
                  (selectedForecast.current_probability || 0) <= 0.3 ? 'bg-red-500' :
                  'bg-yellow-500'
                }`}
                style={{ width: `${(selectedForecast.current_probability || 0.5) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>0% (No)</span>
              <span>100% (Yes)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">Weighted Consensus</div>
              <div className="text-2xl font-bold text-cyan-300">
                {weightedConsensus ? formatProbability(weightedConsensus.calibratedProbability) : '—'}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                {weightedConsensusLoading
                  ? 'Computing weighted consensus…'
                  : weightedConsensus
                    ? `Raw ${formatProbability(weightedConsensus.rawProbability)} · reliability ${(weightedConsensus.reliability.score * 100).toFixed(0)}%`
                    : weightedConsensusError || 'Available once predictions accumulate'}
              </div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">Superforecaster View</div>
              <div className="text-2xl font-bold text-emerald-300">
                {weightedConsensus ? formatProbability(weightedConsensus.superforecasterConsensus) : '—'}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                {weightedConsensus ? `${weightedConsensus.superforecasterCount} top-weighted forecasters` : 'Not enough signal yet'}
              </div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">Consensus Gap</div>
              <div className="text-2xl font-bold text-amber-300">
                {weightedConsensus ? `${(weightedConsensus.consensusGap * 100).toFixed(1)} pts` : '—'}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                {weightedConsensus ? `${weightedConsensus.participantCount} participants` : 'Gap shown after weighted consensus loads'}
              </div>
            </div>
          </div>

          {(selectedForecast.analysis_run_id || multiAgentForecast) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {selectedForecast.analysis_run_id && (
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <div className="text-sm text-slate-400 mb-1">Analysis Provenance</div>
                  <div className="text-white text-sm break-all">{selectedForecast.analysis_run_id}</div>
                  <div className="text-xs text-slate-500 mt-2">
                    {linkedAnalysisReview.loading
                      ? 'Loading review state…'
                      : linkedAnalysisReview.status
                        ? `Review status: ${linkedAnalysisReview.status.replace(/_/g, ' ')}`
                        : linkedAnalysisReview.evidenceBacked === true
                          ? 'Evidence-backed linked analysis'
                          : 'No human review requested'}
                  </div>
                  {linkedAnalysisReview.reviewReason && (
                    <div className="text-xs text-slate-500 mt-1">{linkedAnalysisReview.reviewReason}</div>
                  )}
                  {linkedAnalysisFreshness && (
                    <div className="mt-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs border ${linkedAnalysisFreshness.tone}`}>
                        {linkedAnalysisFreshness.label}
                      </span>
                      <div className="text-xs text-slate-500 mt-2">{linkedAnalysisFreshness.description}</div>
                    </div>
                  )}
                </div>
              )}
              {multiAgentForecast && (
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <div className="text-sm text-slate-400 mb-1">Engine Review</div>
                  <div className="text-white text-sm">
                    {typeof multiAgentForecast.skepticProbability === 'number'
                      ? `Skeptic estimate ${(multiAgentForecast.skepticProbability * 100).toFixed(1)}%`
                      : 'Engine-linked forecast draft'}
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    {typeof multiAgentForecast.disagreementIndex === 'number'
                      ? `Disagreement ${(multiAgentForecast.disagreementIndex * 100).toFixed(0)}%`
                      : 'Structured forecast metadata available'}
                  </div>
                </div>
              )}
            </div>
          )}

          {evidenceBundle && (
            <div className="mb-6 rounded-lg border border-slate-700 bg-slate-700/50 p-4">
              <div className="text-sm text-slate-400 mb-1">Evidence Bundle</div>
              <div className="text-white text-sm">{evidenceBundle.name || 'Strategy Console evidence bundle'}</div>
              <div className="text-xs text-slate-500 mt-2">
                {evidenceBundle.source_count || evidenceBundle.items?.length || 0} sources · {evidenceBundle.claim_count || 0} mapped claims
              </div>
              {Array.isArray(evidenceBundle.items) && evidenceBundle.items.length > 0 && (
                <div className="mt-3 space-y-2">
                  {evidenceBundle.items.slice(0, 3).map((item: any) => (
                    <div key={item.id} className="rounded-lg border border-slate-600 bg-slate-800/80 px-3 py-2 text-xs text-slate-300">
                      <span className="font-medium text-slate-100">{item.label}</span>
                      <span className="text-slate-500"> · {item.sourceType}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {groundedEntities.length > 0 && (
            <div className="mb-6 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
              <div className="text-sm text-cyan-200 mb-2">Grounded entities</div>
              <div className="flex flex-wrap gap-2">
                {groundedEntities.map((entity: any) => (
                  <span
                    key={`${entity.entity_key || entity.label}:${entity.matched_text || entity.label}`}
                    className="rounded-full border border-cyan-500/20 bg-slate-900/70 px-3 py-1 text-xs text-cyan-100"
                  >
                    {entity.label}
                    {typeof entity.confidence === 'number' && ` · ${(entity.confidence * 100).toFixed(0)}%`}
                  </span>
                ))}
              </div>
              <div className="mt-2 text-xs text-slate-400">
                Retrieval policy: {(model?.provenance?.retrieval_policy_id as string | undefined) || 'entity_rank_v1'}
              </div>
            </div>
          )}

          {publicAnswer?.watch_factors?.length ? (
            <div className="mb-6 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="text-sm text-amber-200 mb-2">Watch factors</div>
              <div className="flex flex-wrap gap-2">
                {publicAnswer.watch_factors.map((factor: any) => (
                  <span
                    key={factor}
                    className="rounded-full border border-amber-500/20 bg-slate-900/70 px-3 py-1 text-xs text-amber-100"
                  >
                    {factor}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* Resolution Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">Resolution Criteria</div>
              <div className="text-white">{selectedForecast.resolution_criteria}</div>
            </div>
            {selectedForecast.resolution_date && (
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="text-sm text-slate-400 mb-1">Resolution Date</div>
                <div className="text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {new Date(selectedForecast.resolution_date).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Make Prediction */}
        {!selectedForecast.is_resolved && userId && (
          <div className="bg-slate-800 rounded-xl p-6 border border-cyan-500/30">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-cyan-400" />
              {userPrediction ? 'Update Your Prediction' : 'Make Your Prediction'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Your Probability Estimate: {predictionForm.probability}%
                </label>
                <input
                  type="range"
                  min="1"
                  max="99"
                  value={predictionForm.probability}
                  onChange={(e) => setPredictionForm(p => ({ ...p, probability: parseInt(e.target.value) }))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Very Unlikely</span>
                  <span>Uncertain</span>
                  <span>Very Likely</span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Confidence in your estimate: {predictionForm.confidence}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={predictionForm.confidence}
                  onChange={(e) => setPredictionForm(p => ({ ...p, confidence: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Reasoning (optional)</label>
                <textarea
                  value={predictionForm.reasoning}
                  onChange={(e) => setPredictionForm(p => ({ ...p, reasoning: e.target.value }))}
                  placeholder="Why do you think this probability is accurate?"
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>

              <button
                onClick={handleSubmitPrediction}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg"
              >
                {userPrediction ? 'Update Prediction' : 'Submit Prediction'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render leaderboard
  const renderLeaderboard = () => (
    <div className="bg-slate-800 rounded-xl border border-slate-700">
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          Forecast Leaderboard
        </h3>
        <p className="text-sm text-slate-400">Top forecasters by Brier score (lower is better)</p>
      </div>

      <div className="divide-y divide-slate-700">
        {leaderboard.map((entry, idx) => (
          <div key={entry.user_id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                idx === 0 ? 'bg-amber-500 text-white' :
                idx === 1 ? 'bg-slate-400 text-white' :
                idx === 2 ? 'bg-amber-700 text-white' :
                'bg-slate-700 text-slate-400'
              }`}>
                {idx + 1}
              </div>
              <div>
                <div className="text-white font-medium">Forecaster #{entry.user_id.slice(0, 6)}</div>
                <div className="text-xs text-slate-500">
                  {entry.resolved_predictions} resolved predictions
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-cyan-400">
                {entry.brier_score?.toFixed(3) || 'N/A'}
              </div>
              <div className="text-xs text-slate-500">
                {entry.accuracy_rate ? `${(entry.accuracy_rate * 100).toFixed(0)}% accurate` : ''}
              </div>
            </div>
          </div>
        ))}

        {leaderboard.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            No forecasters ranked yet. Be the first!
          </div>
        )}
      </div>
    </div>
  );

  // Render create forecast form
  const renderCreateForm = () => {
    const draftModel = newForecast.game_theory_model as Record<string, any> | null;
    const draftEvidenceBundle = draftModel?.evidence_bundle;
    const draftGovernanceSummary = buildGovernanceSummary({
      readiness: draftReadiness,
      governance: draftPublishGovernance,
      reviewState: linkedAnalysisReview,
      disagreementIndex: typeof draftModel?.multi_agent_forecast?.disagreementIndex === 'number'
        ? draftModel.multi_agent_forecast.disagreementIndex
        : null,
      evidenceCount: typeof draftModel?.multi_agent_forecast?.evidenceCount === 'number'
        ? draftModel.multi_agent_forecast.evidenceCount
        : null
    });

    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 max-w-2xl">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <Plus className="w-5 h-5 text-cyan-400" />
        Create New Forecast
      </h3>

      {newForecast.analysis_run_id && (
        <div className="mb-4 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-4 py-3">
          <div className="text-sm font-medium text-cyan-200">Prefilled from Strategy Console analysis</div>
          <div className="text-xs text-slate-400 mt-1">Analysis run `{newForecast.analysis_run_id}` is linked to this draft so the forecast can stay connected to its originating reasoning.</div>
          <div className="text-xs text-slate-500 mt-2">
            {linkedAnalysisReview.loading
              ? 'Loading linked analysis review state…'
              : linkedAnalysisReview.status
                ? `Review status: ${linkedAnalysisReview.status.replace(/_/g, ' ')}`
                : linkedAnalysisReview.evidenceBacked === true
                  ? 'Evidence-backed analysis available'
                  : 'No human review requested yet'}
          </div>
          {linkedAnalysisReview.reviewReason && (
            <div className="text-xs text-slate-500 mt-1">{linkedAnalysisReview.reviewReason}</div>
          )}
          {draftPublishGovernance.freshness && (
            <div className="mt-3">
              <span className={`inline-flex px-2 py-1 rounded-full text-xs border ${draftPublishGovernance.freshness.tone}`}>
                {draftPublishGovernance.freshness.label}
              </span>
              <div className="text-xs text-slate-500 mt-2">{draftPublishGovernance.freshness.description}</div>
            </div>
          )}
        </div>
      )}

      <div className="mb-4">
        {renderGovernanceSnapshot(draftGovernanceSummary)}
      </div>

      <div className={`mb-4 rounded-lg border px-4 py-3 ${
        draftPublishGovernance.status === 'ready'
          ? 'border-emerald-500/20 bg-emerald-500/5'
          : draftPublishGovernance.status === 'review_required'
            ? 'border-amber-500/20 bg-amber-500/5'
            : 'border-rose-500/20 bg-rose-500/5'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-white">
              Publish governance: {draftPublishGovernance.status === 'ready'
                ? 'Ready'
                : draftPublishGovernance.status === 'review_required'
                  ? 'Review required'
                  : draftPublishGovernance.status === 'blocked'
                    ? 'Blocked'
                    : 'Proceed with caution'}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Resolution discipline: {draftReadiness.status === 'strong' ? 'Strong' : draftReadiness.status === 'review' ? 'Needs review' : 'Needs work'}
            </div>
          </div>
          {draftPublishGovernance.freshness && (
            <span className={`px-2 py-1 rounded-full text-xs border ${draftPublishGovernance.freshness.tone}`}>
              {draftPublishGovernance.freshness.label}
            </span>
          )}
        </div>
        {draftPublishGovernance.blockers.length > 0 && (
          <div className="mt-3 space-y-1 text-xs text-rose-300">
            {draftPublishGovernance.blockers.map(issue => (
              <div key={issue}>{issue}</div>
            ))}
          </div>
        )}
        {draftPublishGovernance.reviewRequired.length > 0 && (
          <div className="mt-3 space-y-1 text-xs text-amber-200">
            {draftPublishGovernance.reviewRequired.map(item => (
              <div key={item}>{item}</div>
            ))}
          </div>
        )}
        {draftPublishGovernance.warnings.length > 0 && (
          <div className="mt-3 space-y-1 text-xs text-slate-300">
            {draftPublishGovernance.warnings.map(warning => (
              <div key={warning}>{warning}</div>
            ))}
          </div>
        )}
      </div>

      {draftEvidenceBundle && (
        <div className="mb-4 rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3">
          <div className="text-sm font-medium text-white">Research-to-forecast evidence bundle</div>
          <div className="mt-1 text-xs text-slate-400">
            {draftEvidenceBundle.name || 'Strategy Console evidence bundle'} · {draftEvidenceBundle.source_count || draftEvidenceBundle.items?.length || 0} sources · {draftEvidenceBundle.claim_count || 0} mapped claims
          </div>
          {Array.isArray(draftEvidenceBundle.items) && draftEvidenceBundle.items.length > 0 && (
            <div className="mt-3 space-y-2">
              {draftEvidenceBundle.items.slice(0, 4).map((item: any) => (
                <div key={item.id} className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs text-slate-300">
                  <span className="font-medium text-slate-100">{item.label}</span>
                  <span className="text-slate-500"> · {item.sourceType}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {createForecastError && (
        <div className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-200">
          {createForecastError}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Forecast Question *</label>
          <input
            type="text"
            value={newForecast.question}
            onChange={(e) => setNewForecast(p => ({ ...p, question: e.target.value }))}
            placeholder="Will X happen by Y date?"
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Description</label>
          <textarea
            value={newForecast.description}
            onChange={(e) => setNewForecast(p => ({ ...p, description: e.target.value }))}
            placeholder="Context, forecast summary, and relevant notes"
            rows={4}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Title</label>
          <input
            type="text"
            value={newForecast.title}
            onChange={(e) => setNewForecast(p => ({ ...p, title: e.target.value }))}
            placeholder="Short descriptive title"
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Resolution Criteria *</label>
          <textarea
            value={newForecast.resolution_criteria}
            onChange={(e) => setNewForecast(p => ({ ...p, resolution_criteria: e.target.value }))}
            placeholder="How will this forecast be resolved? Be specific."
            rows={3}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Category</label>
            <select
              value={newForecast.category}
              onChange={(e) => setNewForecast(p => ({ ...p, category: e.target.value as Forecast['category'] }))}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            >
              <option value="geopolitical">Geopolitical</option>
              <option value="financial">Financial</option>
              <option value="technology">Technology</option>
              <option value="economic">Economic</option>
              <option value="social">Social</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Resolution Date</label>
            <input
              type="date"
              value={newForecast.resolution_date}
              onChange={(e) => setNewForecast(p => ({ ...p, resolution_date: e.target.value }))}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Tags (comma-separated)</label>
          <input
            type="text"
            value={newForecast.tags}
            onChange={(e) => setNewForecast(p => ({ ...p, tags: e.target.value }))}
            placeholder="gold, central banks, 2025"
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={draftPublishGovernance.status === 'blocked' ? handleFixBlockers : handleCreateForecast}
            disabled={
              creatingForecast ||
              Boolean(linkedAnalysisReview.loading && newForecast.analysis_run_id) ||
              (draftPublishGovernance.status !== 'blocked' && !draftPublishGovernance.canPublish)
            }
            className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium"
          >
            {creatingForecast
              ? 'Creating Forecast…'
              : linkedAnalysisReview.loading && newForecast.analysis_run_id
              ? 'Checking linked analysis…'
              : draftPublishGovernance.status === 'review_required'
                ? 'Review required before publish'
                : draftPublishGovernance.status === 'blocked'
                  ? 'Fix blockers to publish'
                  : 'Create Forecast'}
          </button>
          <button
            onClick={() => {
              setView('list');
              sessionStorage.removeItem('forecast-registry-draft');
            }}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-6 rounded-xl text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Target className="w-10 h-10" />
            <div>
              <h2 className="text-2xl font-bold">Forecast Registry</h2>
              <p className="text-cyan-200">Public predictions powered by game theory</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView(prev => prev === 'leaderboard' ? 'list' : 'leaderboard')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                view === 'leaderboard' ? 'bg-white/20' : 'bg-white/10 hover:bg-white/15'
              }`}
            >
              <Award className="w-4 h-4" />
              Leaderboard
            </button>
            {userId && (
              <button
                onClick={() => setView('create')}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Forecast
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      {view === 'list' && (
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search forecasts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
            />
          </div>

          <div className="flex gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1 ${
                  selectedCategory === cat.id
                    ? 'bg-cyan-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <cat.icon className="w-4 h-4" />
                {cat.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              className="rounded bg-slate-700 border-slate-600"
            />
            Show Resolved
          </label>
        </div>
      )}

      {/* Content */}
      {view === 'list' && loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
        </div>
      ) : forecastLoadError && view === 'list' ? (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-6 py-10 text-center text-rose-200">
          <div className="text-lg font-medium">Failed to load forecasts</div>
          <div className="text-sm mt-2 text-rose-100/80">{forecastLoadError}</div>
          <button
            onClick={() => fetchForecasts()}
            className="mt-4 px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg text-sm"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {view === 'list' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {forecasts.map(renderForecastCard)}
              {forecasts.length === 0 && (
                <div className="col-span-full rounded-xl border border-slate-700 bg-slate-800/60 px-6 py-12 text-center text-slate-500">
                  <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium text-slate-200">No live forecasts are published yet.</p>
                  <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                    This beta stays truthful: the public registry only shows real forecasts after they have been created and published.
                    Use templates or the strategy console to explore the workflow while the first live forecasts are still being prepared.
                  </p>
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={() => navigate('/templates')}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
                    >
                      Browse Templates
                    </button>
                    <button
                      onClick={() => navigate('/console')}
                      className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-500/20"
                    >
                      Open Strategy Console
                    </button>
                    {userId && (
                      <button
                        onClick={() => setView('create')}
                        className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
                      >
                        <Plus className="w-4 h-4" />
                        Create Forecast
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          {view === 'detail' && renderForecastDetail()}
          {view === 'create' && renderCreateForm()}
          {view === 'leaderboard' && renderLeaderboard()}
        </>
      )}
    </div>
  );
};

export default ForecastRegistry;
