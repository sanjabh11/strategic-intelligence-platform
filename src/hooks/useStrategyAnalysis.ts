// Strategic analysis custom hook
import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { ENDPOINTS, getAuthHeaders, isLocalMode, isLocalPreviewOrigin } from '../lib/supabase';
import { analyzeLocally } from '../lib/localEngine';
import type {
  AnalysisRequest,
  AnalysisResult,
  AnalysisStatus,
  MultiAgentForecast
} from '../types/strategic-analysis';
import type { EducationMode } from '../types/education';
import {
  generatePlayerInteractions as generateEduPlayerInteractions,
  generateDecisionAlternatives as generateEduDecisionAlternatives,
  generateInformationNodes as generateEduInformationNodes,
  generateCurrentBeliefs as generateEduCurrentBeliefs,
  generateOutcomeScenarios as generateEduOutcomeScenarios,
  generateDecayModels as generateEduDecayModels,
  generateExternalFactors as generateEduExternalFactors,
  type AnalysisMode as EduAnalysisMode
} from '../lib/educationHelpers';
import {
  assessContextAlignment,
  buildPublicAnswer,
  buildQuestionPackageFromRoute,
  routeCitizenQuestion,
} from '../../shared/publicForecasting';

const CalibrationStatusSchema = z.enum(['empirical', 'prior_smoothed', 'uncalibrated', 'missing_model', 'calibrated']);

// Zod schemas for safe parsing of backend responses
const PlayerSchema = z.union([
  z.string(), // Allow simple string players
  z.object({
    id: z.string(),
    name: z.string().optional(),
    actions: z.array(z.string())
  })
]);

const EquilibriumProfileValueSchema = z.union([
  z.number(),
  z.object({
    value: z.number(),
    confidence: z.number(),
    sources: z.array(z.object({
      id: z.string(),
      retrieval_id: z.string(),
      url: z.string(),
      passage_excerpt: z.string(),
      anchor_score: z.number()
    }))
  })
]);

const EquilibriumSchema = z.object({
  profile: z.record(z.record(EquilibriumProfileValueSchema)),
  stability: z.number(),
  method: z.string(),
  convergenceIteration: z.number().optional(),
  confidence: z
    .object({ lower: z.number(), upper: z.number() })
    .optional()
});

const QuantumSchema = z
  .object({
    collapsed: z
      .array(
        z.object({ action: z.string(), probability: z.number().min(0).max(1) })
      )
      .optional(),
    influence: z.array(z.array(z.number())).optional()
  })
  .optional();

const RetrievalSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  url: z.string().optional(),
  snippet: z.string().optional(),
  grounded_entities: z.array(z.object({
    entity_key: z.string(),
    entity_type: z.string(),
    domain: z.string(),
    label: z.string(),
    confidence: z.number(),
    matched_text: z.string()
  })).optional()
});

const ProcessingStatsSchema = z
  .object({
    processing_time_ms: z.number().optional(),
    stability_score: z.number().optional()
  })
  .optional();

const ProviderAttemptSchema = z.object({
  provider: z.string(),
  model: z.string(),
  ok: z.boolean(),
  duration_ms: z.number().optional(),
  failure_stage: z.string().optional(),
  failure_class: z.string().optional(),
  http_status: z.number().nullable().optional(),
  error: z.string().optional(),
});

const ProvenanceSchema = z
  .object({
    evidence_backed: z.boolean().optional(),
    retrieval_count: z.number().optional(),
    model: z.string().optional(),
    provider: z.string().optional(),
    warning: z.string().optional(),
    llm_provider: z.string().optional(),
    failure_stage: z.string().optional(),
    failure_class: z.string().optional(),
    failure_detail: z.string().optional(),
    provider_attempts: z.array(ProviderAttemptSchema).optional(),
    grounded_entities: z.array(z.object({
      entity_key: z.string(),
      entity_type: z.string(),
      domain: z.string(),
      label: z.string(),
      confidence: z.number(),
      matched_text: z.string()
    })).optional(),
    retrieval_policy_id: z.string().optional(),
    prompt_policy_id: z.string().optional(),
    calibration_status: CalibrationStatusSchema.optional(),
    retrieval_provider_summary: z.object({
      normalizedEvidenceCount: z.number(),
      distinctProviderCount: z.number(),
      statuses: z.array(z.object({
        provider: z.string(),
        status: z.enum(['success', 'empty', 'degraded', 'auth_error', 'rate_limited', 'config_error']),
        source_count: z.number(),
        http_status: z.number().nullable().optional(),
        query_variant: z.string()
      }))
    }).optional()
  })
  .optional();

const ConstraintCheckSummarySchema = z.object({
  score: z.number(),
  checks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    status: z.enum(['pass', 'warn', 'fail']),
    detail: z.string(),
    penalty: z.number()
  }))
}).optional()

const DriftSignalSchema = z.object({
  surface: z.string(),
  scope_key: z.string(),
  detector: z.string(),
  score: z.number(),
  threshold: z.number(),
  state: z.enum(['stable', 'watch', 'triggered']),
  metadata: z.record(z.unknown()).optional(),
  triggered_at: z.string().optional()
}).nullable().optional()

const AttributionSummarySchema = z.object({
  subjectType: z.string(),
  drivers: z.array(z.object({
    label: z.string(),
    contribution: z.number(),
    direction: z.enum(['positive', 'negative'])
  })),
  series: z.array(z.object({
    label: z.string(),
    value: z.number()
  })).optional()
}).nullable().optional()

const QuestionContextSchema = z.object({
  intent: z.string(),
  decision_use: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  time_horizon: z.string().nullable().optional(),
  risk_tolerance: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  answers: z.record(z.string()).optional(),
  completeness_score: z.number().optional(),
  clarification_status: z.enum(['ready', 'needs_input', 'blocked', 'out_of_scope']).optional(),
  asked_question_ids: z.array(z.string()).optional(),
  confidence: z.number().optional(),
  normalized_prompt: z.string().optional(),
  context_locked_fields: z.array(z.string()).optional(),
  unresolved_dimensions: z.array(z.string()).optional(),
  question_cluster: z.string().optional(),
  required_inputs: z.array(z.object({
    id: z.string(),
    label: z.string(),
    prompt: z.string(),
    kind: z.enum(['text', 'select']),
    options: z.array(z.string()).optional(),
    required: z.boolean(),
    blocking: z.boolean(),
    reason: z.string(),
    dimension: z.string(),
    priority: z.number(),
  })).optional(),
}).optional()

const ForecastPointSchema = z.object({
  t: z.union([z.number(), z.string()]),
  probability: z.number()
});

const AnalysisResultSchema = z.object({
  scenario_text: z.string().optional(),
  players: z.array(PlayerSchema).optional(),
  equilibrium: EquilibriumSchema.optional(),
  quantum: QuantumSchema,
  pattern_matches: z
    .array(z.object({ id: z.string(), score: z.number() }))
    .optional(),
  retrievals: z.array(RetrievalSchema).optional(),
  retrieval_count: z.number().optional(),
  processing_stats: ProcessingStatsSchema,
  provenance: ProvenanceSchema,
  question_context: QuestionContextSchema,
  forecast: z.array(ForecastPointSchema).optional(),
  constraint_checks: ConstraintCheckSummarySchema,
  drift_signal: DriftSignalSchema,
  attribution: AttributionSummarySchema,
}).and(z.object({
  voi: z.object({
    ev_prior: z.number(),
    evpi: z.number(),
    evppi: z.record(z.number())
  }).optional()
}))

const AnalyzeResponseSchema = z.object({
  ok: z.boolean(),
  request_id: z.string().optional(),
  analysis_run_id: z.string().nullable().optional(),
  analysis: AnalysisResultSchema.optional(),
  provenance: ProvenanceSchema.optional(),
  mode: z.string().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
  reason: z.string().optional(),
  action: z.string().optional(),
  failure_stage: z.string().optional(),
  failure_class: z.string().optional(),
  provider_attempts: z.array(ProviderAttemptSchema).optional(),
});

const StatusResponseSchema = z.object({
  ok: z.boolean(),
  status: z.enum(['processing', 'completed', 'failed']),
  analysis: AnalysisResultSchema.optional(),
  message: z.string().optional()
});

export interface UseStrategyAnalysisReturn {
  // State
  analysis: AnalysisResult | null;
  loading: boolean;
  error: string | null;
  status: AnalysisStatus;
  requestId: string | null;
  analysisRunId: string | null;

  // Actions
  runAnalysis: (request: AnalysisRequest) => Promise<void>;
  clearResults: () => void;

  // Utilities
  isProcessing: boolean;
  canRunAnalysis: boolean;
  setAudience: (audience: 'student' | 'learner' | 'researcher' | 'teacher') => void;
}

function clampValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function buildLocalMultiAgentForecast(analysis: AnalysisResult): MultiAgentForecast {
  const scenario = analysis.scenario_text?.trim() || 'Strategic scenario';
  const lowerScenario = scenario.toLowerCase();
  const directional = /(price|rise|fall|increase|decrease|surge|drop|move|gain|loss)/.test(lowerScenario);
  const retrievals = Array.isArray(analysis.retrievals) ? analysis.retrievals : [];
  const evidenceCount = retrievals.length;
  const uniqueSourceCount = new Set(retrievals.map(retrieval => retrieval.source || retrieval.url || retrieval.id || 'unknown')).size;
  const freshEvidenceCount = retrievals.filter(retrieval => /202[4-9]|today|latest|recent/i.test(`${retrieval.title || ''} ${retrieval.snippet || ''}`)).length;
  const baseForecast = Array.isArray(analysis.forecast) ? analysis.forecast : [];
  const lastForecastProbability = typeof baseForecast[baseForecast.length - 1]?.probability === 'number'
    ? Number(baseForecast[baseForecast.length - 1]?.probability)
    : null;
  const stabilityAnchor = typeof analysis.equilibrium?.stability === 'number' ? analysis.equilibrium.stability : 0.5;
  const baseProbability = clampValue(lastForecastProbability ?? (0.42 + stabilityAnchor * 0.18), 0.05, 0.95);
  const evidenceCoverage = clampValue(evidenceCount / 3, 0, 1);
  const firstSentence = scenario.split(/[.?!]/).map(part => part.trim()).find(Boolean) || scenario;
  const questionContext = analysis.question_context;
  const route = routeCitizenQuestion(scenario, questionContext);
  const clarity = clampValue(firstSentence.length > 30 ? 0.82 : 0.7, 0.6, 0.9);
  const resolvability = clampValue((directional ? 0.82 : 0.74) + (baseForecast.length > 0 ? 0.08 : 0) + (analysis.provenance?.evidence_backed ? 0.05 : 0), 0.58, 0.95);
  const overall = clampValue((clarity * 0.35) + (resolvability * 0.35) + (evidenceCoverage * 0.3), 0, 1);
  const disagreementIndex = clampValue(0.2 - (evidenceCoverage * 0.08) + (analysis.provenance?.evidence_backed ? -0.03 : 0.04), 0.05, 0.32);
  const horizonDays = route.horizonDays;
  const alignment = assessContextAlignment({
    route,
    questionContext,
    evidenceBacked: analysis.provenance?.evidence_backed === true,
    retrievalCount: analysis.provenance?.retrieval_count || evidenceCount,
    distinctProviderCount: analysis.provenance?.retrieval_provider_summary?.distinctProviderCount || uniqueSourceCount,
  });
  const question = {
    ...buildQuestionPackageFromRoute(route, {
      title: firstSentence.slice(0, 100),
      horizonDays,
    }),
    intent: route.intent,
    requiredInputs: route.requiredInputs,
    horizonLabel: route.horizonLabel,
    contextAlignment: alignment,
    quality: {
      clarity,
      resolvability,
      evidenceCoverage,
      overall,
      issues: [
        ...(route.requiredInputs.length > 0
          ? [`This question still needs ${route.requiredInputs.map((entry) => entry.label.toLowerCase()).join(', ')} before it should be treated as a personal or local forecast.`]
          : []),
        ...(evidenceCount < 3 ? ['Evidence bundle is thin; specialist probabilities should be treated as provisional.'] : []),
        ...(baseForecast.length === 0 ? ['No baseline temporal forecast curve was available for anchoring.'] : [])
      ],
      requiresHumanRefinement: overall < 0.72 || route.requiredInputs.length > 0
    }
  };
  const agentProbabilities = [
    { id: 'geopolitics', label: 'Geopolitics Agent', weight: 0.32, offset: 0.04, thesis: 'The forecast depends primarily on state incentives, alliance posture, and escalation management.' },
    { id: 'commodities', label: 'Commodities Agent', weight: 0.23, offset: 0.01, thesis: 'The forecast is transmitted through safe-haven demand, supply constraints, and commodity repricing.' },
    { id: 'macro', label: 'Macro Agent', weight: 0.25, offset: -0.01, thesis: 'The forecast is governed by macro spillovers, liquidity conditions, and policy expectations.' },
    { id: 'risk', label: 'Risk Agent', weight: 0.2, offset: -0.05, thesis: 'The forecast should be discounted for ambiguity, weak evidence, and nonlinear downside scenarios.' }
  ].map(agent => ({
    id: agent.id,
    label: agent.label,
    probability: clampValue(baseProbability + agent.offset - disagreementIndex * (agent.id === 'risk' ? 0.18 : 0.06), 0.05, 0.95),
    confidence: clampValue(0.52 + evidenceCoverage * 0.18 - disagreementIndex * 0.15, 0.35, 0.88),
    weight: agent.weight,
    thesis: agent.thesis,
    drivers: [
      evidenceCount > 0 ? 'Shared evidence bundle contains cited external reporting.' : 'No retrieval bundle was available; lower confidence is required.',
      directional ? 'The scenario implies a directional move that can be tracked over time.' : 'The scenario is event-oriented and requires explicit public resolution criteria.',
      analysis.provenance?.evidence_backed ? 'Underlying analysis reports evidence-backed provenance.' : 'Underlying analysis is fallback-derived and should stay review-visible.'
    ],
    evidence_ids: retrievals.slice(0, agent.id === 'macro' ? 3 : 2).map(retrieval => retrieval.id),
    objections: agent.id === 'risk'
      ? ['Consensus may be overconfident relative to evidence density.', 'A single unmodeled shock could dominate the base case.']
      : ['Evidence density may still be insufficient for public deployment.', 'The scenario framing may compress alternative paths.']
  }));
  const championProbability = clampValue(agentProbabilities.reduce((sum, agent) => sum + agent.probability * agent.weight, 0), 0.05, 0.95);
  const championConfidence = clampValue(agentProbabilities.reduce((sum, agent) => sum + agent.confidence, 0) / agentProbabilities.length - disagreementIndex * 0.12, 0.3, 0.9);
  const sortedProbabilities = agentProbabilities.map(agent => agent.probability).sort((a, b) => a - b);
  const equalWeightProbability = agentProbabilities.reduce((sum, agent) => sum + agent.probability, 0) / agentProbabilities.length;
  const trimmedProbability = sortedProbabilities.length > 2 ? (sortedProbabilities[1] + sortedProbabilities[2]) / 2 : equalWeightProbability;
  const skepticAdjustedProbability = clampValue(championProbability - disagreementIndex * 0.15 - (overall < 0.72 ? 0.04 : 0), 0.03, 0.97);
  const contradictionPoints = [
    ...(disagreementIndex > 0.18 ? ['Specialist agents disagree materially on immediate impact magnitude.'] : []),
    ...(evidenceCount < 3 ? ['Evidence density is low relative to a production-grade forecast question.'] : []),
    ...(question.questionType === 'binary' ? ['The question is scoreable, but later phases should tighten directional measurement where possible.'] : [])
  ];
  const missingEvidence = [
    ...(evidenceCount < 3 ? ['More external sources are needed before public testing.'] : []),
    ...(uniqueSourceCount < 2 && evidenceCount > 0 ? ['Source diversity is limited; correlated reporting risk remains.'] : []),
    ...(lastForecastProbability === null ? ['No baseline temporal forecast curve was available for anchoring.'] : [])
  ];

  return {
    question,
    panel: {
      agents: agentProbabilities,
      disagreementIndex
    },
    adversarialReview: {
      skepticProbability: clampValue(skepticAdjustedProbability - 0.03, 0.02, 0.95),
      contradictionPoints,
      missingEvidence,
      overconfidenceRisk: clampValue(disagreementIndex * 0.65 + (1 - evidenceCoverage) * 0.35, 0, 1),
      recommendation: overall >= 0.72 && evidenceCount >= 3
        ? 'Use the champion consensus with challenger deltas visible and keep skeptic review attached.'
        : 'Treat this as an analyst-assist forecast until live evidence or human review strengthens provenance.'
    },
    consensus: {
      champion: {
        probability: championProbability,
        rawProbability: championProbability,
        calibratedProbability: championProbability,
        calibrationStatus: 'uncalibrated',
        calibrationVersion: null,
        calibrationSampleSize: 0,
        confidence: championConfidence,
        method: 'local fallback consensus',
        rationale: 'Deterministic local specialist synthesis used because remote forecast packaging was unavailable.'
      },
      challengers: [
        {
          id: 'equal_weight',
          label: 'Equal-Weight Challenger',
          probability: equalWeightProbability,
          confidence: clampValue(championConfidence - 0.03, 0.2, 0.9),
          method: 'simple mean',
          deltaFromChampion: equalWeightProbability - championProbability
        },
        {
          id: 'trimmed_mean',
          label: 'Trimmed-Mean Challenger',
          probability: trimmedProbability,
          confidence: clampValue(championConfidence - 0.02, 0.2, 0.88),
          method: 'drop extreme agent view',
          deltaFromChampion: trimmedProbability - championProbability
        },
        {
          id: 'skeptic_adjusted',
          label: 'Skeptic-Adjusted Challenger',
          probability: skepticAdjustedProbability,
          confidence: clampValue(championConfidence - 0.05, 0.2, 0.85),
          method: 'champion minus disagreement penalty',
          deltaFromChampion: skepticAdjustedProbability - championProbability
        }
      ],
      confidenceBand: {
        lower: clampValue(championProbability - (0.06 + disagreementIndex * 0.18), 0, 1),
        upper: clampValue(championProbability + (0.06 + disagreementIndex * 0.18), 0, 1)
      },
      executionCheckpoints: [
        {
          id: 'question-quality',
          title: 'Question quality gate',
          status: overall >= 0.72 ? 'pass' : 'warn',
          detail: overall >= 0.72 ? 'Forecast question is explicit enough to score later.' : 'Question wording should be refined before operational use.'
        },
        {
          id: 'evidence-density',
          title: 'Evidence sufficiency gate',
          status: evidenceCount >= 3 ? 'pass' : 'warn',
          detail: evidenceCount >= 3 ? `Shared evidence bundle contains ${evidenceCount} retrievals.` : 'Evidence bundle is sparse and should lower deployment confidence.'
        },
        {
          id: 'disagreement-review',
          title: 'Panel disagreement review',
          status: disagreementIndex <= 0.18 ? 'pass' : 'warn',
          detail: disagreementIndex <= 0.18 ? 'Specialist panel is directionally aligned.' : 'Panel disagreement is material and should remain visible in the UI.'
        },
        {
          id: 'champion-challenger',
          title: 'Champion vs challenger comparison',
          status: Math.abs(skepticAdjustedProbability - championProbability) <= 0.08 ? 'pass' : 'warn',
          detail: Math.abs(skepticAdjustedProbability - championProbability) <= 0.08 ? 'Shadow challengers are close to the champion consensus.' : 'Alternative aggregation rules differ materially; treat this as unstable.'
        }
      ]
    },
    metadata: {
      evidenceCount,
      uniqueSourceCount,
      freshEvidenceCount,
      baseForecastProbability: lastForecastProbability,
      disagreementIndex
    },
    publicAnswer: buildPublicAnswer({
      prompt: scenario,
      summary: analysis.summary?.text || scenario,
      route,
      probability: championProbability,
      confidence: championConfidence,
      evidenceBacked: analysis.provenance?.evidence_backed === true,
      retrievalCount: analysis.provenance?.retrieval_count || evidenceCount,
      distinctProviderCount: analysis.provenance?.retrieval_provider_summary?.distinctProviderCount || uniqueSourceCount,
      disagreementIndex,
      contradictionPoints,
      missingEvidence,
      questionContext,
      alignment,
    }),
  };
}

function finalizeAnalysisResult(baseAnalysis: AnalysisResult, enhancedAnalysis?: Partial<AnalysisResult> | null): AnalysisResult {
  const merged = {
    ...baseAnalysis,
    ...(enhancedAnalysis || {})
  } as AnalysisResult;

  if (!merged.multiAgentForecast) {
    merged.multiAgentForecast = buildLocalMultiAgentForecast(merged);
  }

  return merged;
}

export function useStrategyAnalysis(): UseStrategyAnalysisReturn {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [analysisRunId, setAnalysisRunId] = useState<string | null>(null);
  const [audience, setAudience] = useState<'student' | 'learner' | 'researcher' | 'teacher'>('learner');

  const [statusCheckInterval, setStatusCheckInterval] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [pollAttempts, setPollAttempts] = useState(0);
  
  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (statusCheckInterval) {
        clearTimeout(statusCheckInterval);
      }
    };
  }, [statusCheckInterval]);
  
  // Clear results
  const clearResults = useCallback(() => {
    setAnalysis(null);
    setError(null);
    setStatus('idle');
    setRequestId(null);
    setAnalysisRunId(null);
    setPollAttempts(0);
    
    if (statusCheckInterval) {
      clearTimeout(statusCheckInterval);
      setStatusCheckInterval(null);
    }
  }, [statusCheckInterval]);
  
  // Helper function to normalize player data
  const normalizeAnalysisData = useCallback((data: any): any => {
    if (!data) return data;
    
    // Normalize players array
    if (Array.isArray(data.players)) {
      data.players = data.players.map((player: any, index: number) => {
        if (typeof player === 'string') {
          return {
            id: player.replace(/\s+/g, '_') || `P${index + 1}`,
            name: player,
            actions: ['cooperate', 'defect']
          };
        }
        return player;
      });
    }
    
    // Ensure scenario_text is present
    if (!data.scenario_text && data.title) {
      data.scenario_text = data.title;
    }
    
    // Normalize equilibrium profile if needed
    if (data.equilibrium && data.equilibrium.profile) {
      const profile = data.equilibrium.profile;
      Object.keys(profile).forEach(playerId => {
        Object.keys(profile[playerId]).forEach(action => {
          const value = profile[playerId][action];
          if (typeof value === 'number') {
            profile[playerId][action] = {
              value: value,
              confidence: 0.5,
              sources: []
            };
          }
        });
      });
    }
    
    return data;
  }, []);

  // Check analysis status
  const checkAnalysisStatus = useCallback(async (reqId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${ENDPOINTS.STATUS}?request_id=${reqId}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      const raw = await response.text();
      const json = (() => {
        try { return JSON.parse(raw); } catch { return null; }
      })();

      if (!response.ok) {
        const msg = json && typeof json === 'object' && 'message' in (json as any)
          ? (json as any).message
          : raw || response.statusText;
        throw new Error(`Status HTTP ${response.status}: ${msg}`);
      }

      const parsed = StatusResponseSchema.safeParse(json);
      if (!parsed.success) {
        throw new Error(`Invalid status response: ${parsed.error.message}`);
      }
      const result = parsed.data;

      if (result.status === 'completed' && result.analysis) {
        const normalizedAnalysis = normalizeAnalysisData(result.analysis);
        // Enrich with advanced strategic engines once the analysis run completes
        try {
          const enhanced = await enhanceAnalysisWithStrategicEngines(
            reqId || analysisRunId || crypto.randomUUID(),
            normalizedAnalysis.scenario_text || '',
            (normalizedAnalysis as any).players,
            normalizedAnalysis
          );
          setAnalysis(finalizeAnalysisResult(normalizedAnalysis as unknown as AnalysisResult, enhanced));
        } catch (e) {
          setAnalysis(finalizeAnalysisResult(normalizedAnalysis as unknown as AnalysisResult));
        }
        setStatus('completed');
        setLoading(false);
        return true;
      }
      if (result.status === 'processing') {
        setStatus('processing');
        return false;
      }
      throw new Error(`Unexpected status: ${result.status}`);
      
    } catch (err) {
      console.error('Status check error:', err);
      setError(err instanceof Error ? err.message : 'Status check failed');
      setStatus('failed');
      setLoading(false);
      return true; // Stop polling on error
    }
  }, []);
  
  // Start status polling
  const startStatusPolling = useCallback((reqId: string) => {
    setPollAttempts(0);
    let attempts = 0;
    let stopped = false;
    let activeTimeout: ReturnType<typeof setTimeout> | null = null;

    const clearActiveTimeout = () => {
      if (activeTimeout) {
        clearTimeout(activeTimeout);
        activeTimeout = null;
      }
      setStatusCheckInterval(null);
    };
    
    const poll = async () => {
      const shouldStop = await checkAnalysisStatus(reqId);
      
      if (shouldStop || stopped) {
        clearActiveTimeout();
        return;
      }
      
      attempts += 1;
      setPollAttempts(attempts);
      const nextDelay = Math.min(8000, 2500 + attempts * 750);
      activeTimeout = setTimeout(poll, nextDelay);
      setStatusCheckInterval(activeTimeout);
    };
    
    // Initial check
    poll();

    // Timeout after 2 minutes
    const timeoutGuard = setTimeout(() => {
      if (!stopped) {
        stopped = true;
        clearActiveTimeout();
        setError('Analysis timed out - computation is taking longer than expected');
        setStatus('failed');
        setLoading(false);
      }
    }, 120000); // 2 minutes timeout

    return () => {
      stopped = true;
      clearTimeout(timeoutGuard);
      clearActiveTimeout();
    };
    
  }, [checkAnalysisStatus]);
  
  // Run analysis
  const runAnalysis = useCallback(async (request: AnalysisRequest) => {
    // Reset state
    clearResults();
    setLoading(true);
    setStatus('queued');

    try {
      // Analysis request submitted;

      // Prefer the deterministic local path during localhost preview QA.
      if (isLocalPreviewOrigin) {
        console.log('Using local preview analysis engine');
        const localRunId = crypto.randomUUID();
        setAnalysisRunId(localRunId);
        const localResult = await analyzeLocally(request);
        (localResult as AnalysisResult).question_context = request.question_context;
        const enhancedAnalysis = await enhanceAnalysisWithStrategicEngines(
          localRunId, request.scenario_text, localResult.players, localResult, request.question_context
        );
        setAnalysis(finalizeAnalysisResult(localResult, enhancedAnalysis));
        setError(null);
        setStatus('completed');
        setLoading(false);
        return;
      }

      // Check if local mode is enabled; block in production builds
      if (isLocalMode) {
        // Vite exposes PROD flag at build time
        const isProdBuild = typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.PROD;
        if (isProdBuild) {
          throw new Error('Local demo engine is disabled in production builds. Please configure Supabase endpoints.');
        }
        console.log('Using local analysis engine');
        const localRunId = crypto.randomUUID();
        setAnalysisRunId(localRunId);
        const localResult = await analyzeLocally(request);
        (localResult as AnalysisResult).question_context = request.question_context;
        const enhancedAnalysis = await enhanceAnalysisWithStrategicEngines(
          localRunId, request.scenario_text, localResult.players, localResult, request.question_context
        );
        setAnalysis(finalizeAnalysisResult(localResult, enhancedAnalysis));
        setStatus('completed');
        setLoading(false);
        return;
      }

      // Use API for production flow
      const controller = new AbortController();
      // Hosted public analysis can legitimately run longer than the local demo path.
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const response = await fetch(ENDPOINTS.ANALYZE, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...request, audience }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const raw = await response.text();
      const json = (() => {
        try { return JSON.parse(raw); } catch { return null; }
      })();

      if (!response.ok) {
        const msg = json && typeof json === 'object' && 'message' in (json as any)
          ? (json as any).message
          : raw || response.statusText;

        if (
          response.status === 502 &&
          json &&
          typeof json === 'object' &&
          ((((json as any).error === 'llm_failed') || ((json as any).error === 'llm_exception')))
        ) {
          throw new Error(`Hosted analysis backend degraded before producing a verified result: ${msg}`);
        }

        throw new Error(`Analyze HTTP ${response.status}: ${msg}`);
      }

      const parsed = AnalyzeResponseSchema.safeParse(json);
      if (!parsed.success) {
        throw new Error(`Invalid analyze response: ${parsed.error.message}`);
      }
      const result = parsed.data;

      if (!result.ok) {
        // Handle RAG failure for high-risk scenarios
        if (result.reason === 'no_external_sources' || result.reason === 'rag_system_error') {
          setError(result.message || 'Unable to retrieve external evidence for this scenario. Analysis has been queued for human review.');
          setStatus('failed');
          setLoading(false);
          return;
        }
        throw new Error(result.message || result.error || 'Analysis submission failed');
      }

      if (result.request_id) setRequestId(result.request_id);
      if (result.analysis_run_id) setAnalysisRunId(result.analysis_run_id);

      if (result.mode === 'fallback') {
        if (result.analysis) {
          const fallbackRunId = result.analysis_run_id || result.request_id || crypto.randomUUID();
          setAnalysisRunId(fallbackRunId);
          const normalizedBase = normalizeAnalysisData(result.analysis) as AnalysisResult;
          normalizedBase.question_context = normalizedBase.question_context || request.question_context;
          const enhancedAnalysis = await enhanceAnalysisWithStrategicEngines(
            fallbackRunId, request.scenario_text, normalizedBase.players, normalizedBase, normalizedBase.question_context
          );
          setAnalysis(finalizeAnalysisResult(normalizedBase, enhancedAnalysis));
          const failureClass = result.provenance?.failure_class || normalizedBase.provenance?.failure_class;
          const fallbackMessage = failureClass === 'quota_exceeded'
            ? `${result.message || 'Hosted synthesis hit a provider quota limit.'} Public answers remain withheld until a working fallback provider succeeds.`
            : failureClass === 'config_missing'
              ? `${result.message || 'Hosted synthesis has no configured fallback provider.'} Public answers remain withheld until a secondary provider key is configured.`
              : failureClass === 'provider_failure'
                ? `${result.message || 'Hosted synthesis is temporarily unavailable.'} Public answers remain withheld until a verified provider completes the run.`
              : result.message || 'Hosted analysis returned a degraded fallback package. Keep the result review-visible.';
          setError(fallbackMessage);
          setStatus('completed');
          setLoading(false);
          return;
        }

        throw new Error('Hosted analysis returned fallback mode without a usable analysis payload.');
      } else if (result.request_id) {
        setStatus('processing');
        startStatusPolling(result.request_id);
      } else if (result.analysis) {
        // Fallback: if analysis provided but no request id
        const normalizedAnalysis = normalizeAnalysisData(result.analysis);
        normalizedAnalysis.question_context = normalizedAnalysis.question_context || request.question_context;
        const directRunId = result.analysis_run_id || crypto.randomUUID();
        setAnalysisRunId(directRunId);
        const enhancedAnalysis = await enhanceAnalysisWithStrategicEngines(
          directRunId, request.scenario_text, normalizedAnalysis.players, normalizedAnalysis, normalizedAnalysis.question_context
        );
        setAnalysis(finalizeAnalysisResult(normalizedAnalysis, enhancedAnalysis));
        setStatus('completed');
        setLoading(false);
      } else {
        throw new Error('Hosted analysis completed without a request id or analysis payload.');
      }
      
    } catch (err) {
      console.error('Analysis submission error:', err);
      
      // Enhanced error message extraction
      let errorMessage = 'Analysis service unavailable';
      let errorName = '';
      if (err instanceof Error) {
        errorMessage = err.message;
        errorName = err.name;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        errorMessage = (err as any).message || (err as any).error || JSON.stringify(err);
        errorName = (err as any).name || '';
      }
      
      const isNetworkError = errorName === 'AbortError' || errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('timeout');
      if (isNetworkError) {
        errorMessage = isLocalPreviewOrigin || isLocalMode
          ? 'Cannot connect to analysis service. Please ensure Supabase is running: `supabase start`'
          : 'Hosted analysis timed out or became unreachable before producing a verified result. Please retry.';
      }
      
      setError(errorMessage);
      setStatus('failed');
      setLoading(false);
    }
  }, [clearResults, startStatusPolling]);
  
  // Computed properties
  const isProcessing = loading && (status === 'queued' || status === 'processing');
  const canRunAnalysis = !loading && status !== 'processing';
  
  return {
    // State
    analysis,
    loading,
    error,
    status,
    requestId,
    analysisRunId,

    // Actions
    runAnalysis,
    clearResults,

    // Utilities
    isProcessing,
    canRunAnalysis,
    setAudience
  };
}

async function enhanceAnalysisWithStrategicEngines(
  analysisRunId: string,
  scenario: string,
  players: any[] | undefined,
  analysisContext?: Partial<AnalysisResult>,
  questionContext?: AnalysisRequest['question_context']
): Promise<any> {
  if (isLocalPreviewOrigin) {
    return {}
  }

  const enhancements = {
    recursiveEquilibrium: null,
    symmetryAnalysis: null,
    crossDomainInsights: null,
    quantumAnalysis: null,
    informationValue: null,
    temporalOptimization: null,
    outcomeForecasting: null,
    multiAgentForecast: null,
    strategySuccess: null,
    scaleInvariant: null,
    dynamicRecalibration: null
  };

  const logEnhancementFailure = (engine: string, detail: {
    status?: number
    reason?: string
  }) => {
    const status = typeof detail.status === 'number' ? detail.status : 'network'
    const reason = detail.reason || 'request_failed'
    console.warn(`[strategy-analysis] enhancement_failed engine=${engine} status=${status} reason=${reason}`)
  }

  const parseEnhancementResponse = async (engine: string, response: Response) => {
    if (!response.ok) {
      const raw = await response.text().catch(() => '')
      logEnhancementFailure(engine, {
        status: response.status,
        reason: raw.slice(0, 160) || response.statusText || 'http_error',
      })
      return null
    }

    let json: any = null
    try {
      json = await response.json()
    } catch {
      logEnhancementFailure(engine, {
        status: response.status,
        reason: 'invalid_json',
      })
      return null
    }

    if (!json?.ok || !json?.response) {
      logEnhancementFailure(engine, {
        status: response.status,
        reason: json?.message || json?.error || 'empty_response',
      })
      return null
    }

    return json.response
  }

  const postEnhancement = async (engine: string, url: string, body: unknown) => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      })
      return await parseEnhancementResponse(engine, response)
    } catch (error) {
      logEnhancementFailure(engine, {
        reason: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }

  try {
    // Call Recursive Equilibrium Engine
    const recursiveData = await postEnhancement('recursive-equilibrium', ENDPOINTS.RECURSIVE_EQ, {
        runId: analysisRunId,
        scenario: {
          players: players?.map(p => ({
            id: p.id,
            name: p.name,
            actions: p.actions
          })) || []
        },
        analysisConfig: {
          beliefDepth: 3,
          adaptationRate: 0.2,
          iterations: 500,
          convergenceThreshold: 1e-6,
          quantumEnabled: true
        }
      })
    if (recursiveData) {
      enhancements.recursiveEquilibrium = recursiveData;
    }

    // Call Enhanced Symmetry Mining Engine
    const symmetryData = await postEnhancement('symmetry-mining', ENDPOINTS.SYMMETRY_MINING, {
        runId: analysisRunId,
        currentScenario: {
          title: "Strategic Analysis Scenario",
          description: scenario,
          domain: extractDomainFromScenario(scenario),
          stakeholders: extractStakeholdersFromScenario(scenario),
          strategicElements: {
            players: players?.length || 0,
            actions: players?.flatMap(p => p.actions) || [],
            information: 'complete',
            payoffStructure: 'competitive'
          }
        },
        analysisConfig: {
          abstractionLevel: 7,
          maxAnalogies: 5,
          similarityThreshold: 0.6,
          domainsToSearch: ['military', 'business', 'politics', 'evolution', 'sports'],
          returnStructuredResults: true
        }
      })
    if (symmetryData) {
      enhancements.symmetryAnalysis = symmetryData;
      enhancements.crossDomainInsights = symmetryData.strategicRecommendations;

      // Map to analysis.pattern_matches expected by UI
      try {
        const analogies = symmetryData.strategicAnalogies || [];
        const patternMatches = analogies.slice(0, 5).map((a: any, idx: number) => ({
          id: String(a.sourceScenario || `pattern_${idx + 1}`),
          score: Number(a.structuralSimilarity ?? a.successProbability ?? 0)
        }));
        (enhancements as any).pattern_matches = patternMatches;
      } catch {}
    }

    // Call Quantum Strategy Service
    const quantumData = await postEnhancement('quantum-strategy-service', ENDPOINTS.QUANTUM_STRATEGY, {
        runId: analysisRunId,
        scenario: {
          players: players?.map(p => ({
            id: p.id,
            name: p.name,
            actions: p.actions
          })) || [],
          interactions: generatePlayerInteractions(players || [])
        },
        config: {
          quantumCoherence: 0.8,
          environmentalNoise: 0.3,
          observationLevel: 0.5,
          timeHorizon: 24
        }
      })
    if (quantumData) {
      enhancements.quantumAnalysis = quantumData;
      // Map to analysis.quantum expected by UI (collapsed + influence)
      try {
        const q = quantumData;
        const states: any[] = q.quantumStates || [];
        const actionProb: Record<string, number> = {};
        let count = 0;
        for (const st of states) {
          for (const s of st.coherentStrategies || []) {
            actionProb[s.action] = (actionProb[s.action] || 0) + (typeof s.probability === 'number' ? s.probability : 0);
          }
          count++;
        }
        const collapsed = Object.entries(actionProb).map(([action, p]) => ({ action, probability: count ? (p as number) / count : 0 }));
        const influence = (q.entanglementMatrix?.correlationMatrix && Array.isArray(q.entanglementMatrix.correlationMatrix))
          ? q.entanglementMatrix.correlationMatrix
          : undefined;
        (enhancements as any).quantum = { collapsed, influence };
      } catch {}
    }

    // Call Information Value Assessment
    const infoValueData = await postEnhancement('information-value-assessment', ENDPOINTS.INFO_VALUE, {
        runId: analysisRunId,
        scenario: {
          title: scenario,
          timeHorizon: 48,
          urgencyLevel: 0.6,
          stakeholders: extractStakeholdersFromScenario(scenario)
        },
        decisionAlternatives: generateDecisionAlternatives(players || []),
        informationNodes: generateInformationNodes(scenario),
        currentBeliefs: generateCurrentBeliefs(scenario),
        analysisConfig: {
          riskTolerance: 0.5,
          discountRate: 0.05,
          maxInformationBudget: 1000,
          prioritizeSpeed: false
        }
      })
    if (infoValueData) {
      enhancements.informationValue = infoValueData;
      // Derive a compact VOI summary when possible
      try {
        const summary = infoValueData.summary || infoValueData.metrics || {};
        const ev_prior = typeof summary.ev_prior === 'number' ? summary.ev_prior : (summary.expectedValuePrior ?? 0);
        const evpi = typeof summary.evpi === 'number' ? summary.evpi : (summary.expectedValueOfPerfectInformation ?? 0);
        const evppi = summary.evppi || summary.signal_evppi || {};
        (enhancements as any).voi = { ev_prior: Number(ev_prior) || 0, evpi: Number(evpi) || 0, evppi };
      } catch {}
    }

    // Call Outcome Forecasting
    const forecastData = await postEnhancement('outcome-forecasting', ENDPOINTS.OUTCOME_FORECAST, {
        runId: analysisRunId,
        scenario: {
          title: scenario,
          timeHorizon: 168, // 1 week
          granularity: 4 // 4-hour intervals
        },
        outcomes: generateOutcomeScenarios(scenario, players || []),
        decayModels: generateDecayModels(),
        externalFactors: generateExternalFactors(scenario),
        uncertaintyConfig: {
          epistemicUncertainty: 0.2,
          aleatoricUncertainty: 0.15,
          confidenceLevel: 0.95
        }
      })
    if (forecastData) {
      enhancements.outcomeForecasting = forecastData;
      // Map to analysis.forecast expected by UI (pick primary outcome if present)
      try {
        const f = forecastData;
        const forecasts = f.forecasts || {};
        const outcomeKeys = Object.keys(forecasts);
        const primaryKey = outcomeKeys.find(k => k.includes('success')) || outcomeKeys[0];
        const points = Array.isArray(forecasts[primaryKey]) ? forecasts[primaryKey] : [];
        const forecastArr = points.map((p: any) => ({ t: Number(p.t ?? 0), probability: Number(p.probability ?? 0) }));
        (enhancements as any).forecast = forecastArr;
      } catch {}
    }

    const multiAgentForecastData = await postEnhancement('multi-agent-forecast', ENDPOINTS.MULTI_AGENT_FORECAST, {
          runId: analysisRunId,
          scenario: {
            description: scenario,
          },
          retrievals: Array.isArray(analysisContext?.retrievals) ? analysisContext.retrievals : [],
          baseForecast: Array.isArray((enhancements as any).forecast)
            ? (enhancements as any).forecast
            : (Array.isArray(analysisContext?.forecast) ? analysisContext?.forecast : []),
          provenance: analysisContext?.provenance,
          questionContext: questionContext || analysisContext?.question_context || null,
          mode: questionContext?.decision_use?.includes('public') ? 'public' : 'internal',
        })
    if (multiAgentForecastData) {
      enhancements.multiAgentForecast = multiAgentForecastData;
    }

    // Additional engines to close PRD gaps
    // Strategy Success Analysis (historical effectiveness)
    const topPattern = (enhancements.symmetryAnalysis?.strategicAnalogies?.[0]?.sourceScenario) || 'Flanking Maneuver';
    const strategySuccessData = await postEnhancement('strategy-success-analysis', ENDPOINTS.STRATEGY_SUCCESS, {
      runId: analysisRunId,
      strategyPattern: topPattern,
      contextFilters: { minSampleSize: 10 },
      analysisType: 'comprehensive'
    })
    if (strategySuccessData) {
      enhancements.strategySuccess = strategySuccessData
    }

    // Scale-Invariant Templates (cross-scale adaptation)
    const scaleInvariantData = await postEnhancement('scale-invariant-templates', ENDPOINTS.SCALE_INVARIANT, {
          runId: analysisRunId,
          sourceTemplate: 'coordination_equilibrium',
          sourceScale: 5,
          targetScale: 3,
          sourceDomain: extractDomainFromScenario(scenario),
          targetDomain: extractDomainFromScenario(scenario),
          scenarioContext: { description: scenario, stakeholders: extractStakeholdersFromScenario(scenario), timeframe: 'medium', resources: [] }
        })
    if (scaleInvariantData) {
      enhancements.scaleInvariant = scaleInvariantData
    }

    // Dynamic Strategy Recalibration (continuous optimization)
    const dynamicRecalibrationData = await postEnhancement('dynamic-recalibration', ENDPOINTS.DYNAMIC_RECALIBRATION, {
          runId: analysisRunId,
          currentStrategy: {
            actions: (players || []).flatMap((p: any) => (p.actions || []).map((a: string, i: number) => ({ id: `${p.id}_${a}`, name: a, currentPriority: 0.5, performance: 1.0 }))),
            beliefs: [
              { parameter: 'market_conditions', priorDistribution: { mean: 0.5, variance: 0.2, confidence: 0.6 }, posteriorDistribution: { mean: 0.5, variance: 0.2, confidence: 0.6 }, updateHistory: [] }
            ],
            lastUpdate: Date.now() - 3600_000
          },
          newInformation: [],
          recalibrationConfig: {
            triggers: [
              { type: 'time_decay', threshold: 0.5, sensitivity: 0.5, cooldownPeriod: 3600_000 }
            ],
            adaptationRate: 0.2,
            conservatismBias: 0.2,
            lookAheadHorizon: 24
          },
          constraints: { maxStrategyChanges: 3, minConfidenceThreshold: 0.3, resourceLimitations: {} }
        })
    if (dynamicRecalibrationData) {
      enhancements.dynamicRecalibration = dynamicRecalibrationData
    }

  } catch (error) {
    console.warn('Strategic engine enhancements failed:', error);
  }

  return enhancements;
}

// Extract domain from scenario text
function extractDomainFromScenario(scenario: string): string {
  const lowerText = scenario.toLowerCase();

  const domainMappings = {
    'business': ['company', 'market', 'corporate', 'industry', 'competitor'],
    'political': ['government', 'policy', 'political', 'diplomatic'],
    'military': ['military', 'defense', 'strategic power', 'security'],
    'economics': ['economic', 'trade', 'currency', 'financial'],
    'technology': ['technology', 'ai', 'innovation', 'digital']
  };

  for (const [domain, keywords] of Object.entries(domainMappings)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return domain;
    }
  }

  return 'universal'; // Default
}

// Extract stakeholders from scenario
function extractStakeholdersFromScenario(scenario: string): string[] {
  // Simple stakeholder extraction - can be enhanced
  return ['stakeholder_1', 'stakeholder_2'];
}

// Generate player interactions for quantum analysis - mode-aware with provenance
function generatePlayerInteractions(players: any[], mode: EduAnalysisMode = 'analysis'): Array<{ player1: string; player2: string; strength: number }> {
  const interactions = generateEduPlayerInteractions(players, { mode });
  // Strip provenance for backward compatibility, but it's available in the helper
  return interactions.map(({ provenance, ...rest }) => rest);
}

// Generate decision alternatives for information value assessment - mode-aware
function generateDecisionAlternatives(players: any[], mode: EduAnalysisMode = 'analysis'): any[] {
  if (mode === 'education' || mode === 'classroom') {
    // Return empty for education - students should determine these
    return [];
  }
  const alternatives = generateEduDecisionAlternatives(players, { mode });
  // Strip provenance for backward compatibility
  return alternatives.map(({ provenance, ...rest }) => rest);
}

// Generate information nodes for EVPI calculation - mode-aware
function generateInformationNodes(scenario: string, mode: EduAnalysisMode = 'analysis'): any[] {
  const nodes = generateEduInformationNodes(scenario, { mode });
  // Strip provenance for backward compatibility
  return nodes.map(({ provenance, ...rest }) => rest);
}

// Generate current beliefs for Bayesian updating - mode-aware
function generateCurrentBeliefs(scenario: string, mode: EduAnalysisMode = 'analysis'): Record<string, number> {
  const result = generateEduCurrentBeliefs(scenario, { mode });
  return result.beliefs;
}

// Generate outcome scenarios for forecasting - mode-aware
function generateOutcomeScenarios(scenario: string, players: any[], mode: EduAnalysisMode = 'analysis'): any[] {
  const scenarios = generateEduOutcomeScenarios(scenario, players, { mode });
  // Strip provenance for backward compatibility
  return scenarios.map(({ provenance, ...rest }) => rest);
}

// Generate decay models for forecasting - mode-aware
function generateDecayModels(mode: EduAnalysisMode = 'analysis'): Record<string, any> {
  const models = generateEduDecayModels({ mode });
  // Strip provenance for backward compatibility
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(models)) {
    const { provenance, ...rest } = value;
    result[key] = rest;
  }
  return result;
}

// Generate external factors for forecasting - mode-aware
function generateExternalFactors(scenario: string, mode: EduAnalysisMode = 'analysis'): any[] {
  const factors = generateEduExternalFactors(scenario, { mode });
  // Strip provenance for backward compatibility
  return factors.map(({ provenance, ...rest }) => rest);
}

// Utility function to create example scenarios
export function getExampleScenarios() {
  return [
    {
      title: "Tech Giants AI Safety Coordination",
      scenario: "Three major technology companies (Apple, Google, Microsoft) must decide on AI safety standards. Each can choose to 'lead with strict standards', 'follow industry consensus', or 'maintain competitive advantage'. Their decisions affect regulatory oversight, public trust, innovation pace, and market positioning. The outcome influences global AI governance and technological development trajectories."
    },
    {
      title: "Semiconductor Supply Chain Strategy", 
      scenario: "US, EU, and China are deciding on semiconductor supply chain policies amid geopolitical tensions. Each region can choose 'aggressive domestic production', 'selective partnerships', or 'maintain global integration'. The decisions affect technological sovereignty, economic efficiency, innovation networks, and international trade relationships."
    },
    {
      title: "Climate Policy Coordination",
      scenario: "Major economies must coordinate carbon emission reduction strategies. Each can choose to 'lead with aggressive cuts', 'follow others commitments', or 'maintain status quo'. Their decisions affect global climate goals, economic competitiveness, industrial transformation, and international cooperation frameworks."
    },
    {
      title: "Cryptocurrency Regulation Framework",
      scenario: "Major financial jurisdictions are establishing cryptocurrency regulations. Options include 'comprehensive regulation', 'light-touch approach', or 'wait and observe'. Each choice affects financial innovation, market stability, regulatory arbitrage, consumer protection, and international coordination on digital assets."
    },
    {
      title: "Trade War De-escalation",
      scenario: "Two major trading partners face escalating tariff tensions. Each side can 'impose retaliatory measures', 'seek negotiated settlement', or 'unilaterally reduce barriers'. The outcomes affect bilateral trade volumes, economic growth, political relationships, and global trade architecture."
    },
    {
      title: "Corporate Crisis Management",
      scenario: "Two competing companies in the same industry face a shared reputational crisis. Each can choose to 'collaborate on industry response', 'compete for differentiation', or 'remain silent'. Their strategies affect market recovery, regulatory intervention, consumer trust, and long-term competitive dynamics."
    }
  ];
}

export default useStrategyAnalysis;
