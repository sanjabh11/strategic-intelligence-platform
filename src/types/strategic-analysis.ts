// TypeScript types for strategic analysis

export interface Player {
  id: string;
  name?: string;
  actions: string[];
}

export interface QuantumStrategyState {
  coherentStrategies: Array<{action: string; amplitude: number}>;
  entanglementMatrix: number[][];
  decoherenceRate: number;
}

export interface AnalysisOptions {
  beliefDepth?: number;
  adaptationRate?: number;
  iterations?: number;
  decoherenceRate?: number;
  deterministicSeed?: number;
}

export interface AnalysisRequest {
  scenario_text: string;
  players_def?: Player[];
  quantum_states?: Record<string, QuantumStrategyState>;
  options?: AnalysisOptions;
  mode?: 'standard' | 'education_quick';
  audience?: 'student' | 'learner' | 'researcher' | 'teacher';
}

export interface Retrieval {
  id: string;
  title: string;
  url: string;
  snippet: string;
  source?: string;
  score?: number;
}

export interface MultiAgentForecastQuestionQuality {
  clarity: number;
  resolvability: number;
  evidenceCoverage: number;
  overall: number;
  issues: string[];
  requiresHumanRefinement?: boolean;
}

export interface MultiAgentForecastQuestion {
  title: string;
  question: string;
  questionType: 'binary' | 'directional';
  horizonDays: number;
  closeTime: string;
  resolutionSource: string;
  fallbackResolution: string;
  resolutionCriteria: string;
  quality: MultiAgentForecastQuestionQuality;
}

export interface MultiAgentForecastAgent {
  id: string;
  label: string;
  probability: number;
  confidence: number;
  weight: number;
  thesis: string;
  drivers: string[];
  evidence_ids: string[];
  objections: string[];
}

export interface MultiAgentForecastCheckpoint {
  id: string;
  title: string;
  status: 'pass' | 'warn';
  detail: string;
}

export interface MultiAgentForecastConsensusVariant {
  id: string;
  label: string;
  probability: number;
  confidence?: number;
  method: string;
  deltaFromChampion: number;
}

export interface MultiAgentForecastConsensus {
  champion: {
    probability: number;
    confidence: number;
    method: string;
    rationale: string;
  };
  challengers: MultiAgentForecastConsensusVariant[];
  confidenceBand: {
    lower: number;
    upper: number;
  };
  executionCheckpoints: MultiAgentForecastCheckpoint[];
}

export interface MultiAgentForecastAdversarialReview {
  skepticProbability: number;
  contradictionPoints: string[];
  missingEvidence: string[];
  overconfidenceRisk: number;
  recommendation: string;
}

export interface MultiAgentForecastMetadata {
  evidenceCount: number;
  uniqueSourceCount: number;
  freshEvidenceCount: number;
  baseForecastProbability: number | null;
  disagreementIndex: number;
}

export interface MultiAgentForecast {
  question: MultiAgentForecastQuestion;
  panel: {
    agents: MultiAgentForecastAgent[];
    disagreementIndex: number;
  };
  adversarialReview: MultiAgentForecastAdversarialReview;
  consensus: MultiAgentForecastConsensus;
  metadata: MultiAgentForecastMetadata;
}

export interface AnalysisResult {
  // Optional to match runtime schema; some flows synthesize minimal base
  scenario_text?: string;
  players?: Player[];
  equilibrium?: {
    profile: Record<string, Record<string, number>> | Record<string, Record<string, {
      value: number;
      confidence: number;
      sources: Array<{
        id: string;
        retrieval_id: string;
        url: string;
        passage_excerpt: string;
        anchor_score: number;
      }>;
    }>>;
    stability: number;
    method: string;
    convergenceIteration?: number;
    confidence?: { lower: number; upper: number };
  };
  quantum?: {
    collapsed?: Array<{action: string; probability: number}>;
    influence?: number[][];
  };
  pattern_matches?: Array<{id: string; score: number}>;
  retrievals?: Retrieval[];
  retrieval_count?: number;
  processing_stats?: {
    processing_time_ms: number;
    stability_score: number;
  };
  provenance?: {
    evidence_backed: boolean;
    retrieval_count: number;
    retrieval_ids?: string[];
    model: string;
    warning?: string;
  };
  // Optional temporal forecast of outcome probability (0..1) over time t
  forecast?: Array<{ t: number | string; probability: number }>;

  // Enhancement fields appended client-side after base analysis completes
  // These are intentionally broad to support evolving engine outputs.
  recursiveEquilibrium?: any;
  symmetryAnalysis?: any;
  crossDomainInsights?: any;
  informationValue?: any;
  temporalOptimization?: any;
  outcomeForecasting?: any;
  multiAgentForecast?: MultiAgentForecast;
  strategySuccess?: any;
  evpi_analysis?: any;
  outcome_forecasts?: any;
  sources?: any[];

  // Value of Information (VOI) summary
  voi?: {
    ev_prior: number;
    evpi: number;
    evppi: Record<string, number>;
  };
}

export type AnalysisStatus = 'idle' | 'queued' | 'processing' | 'completed' | 'failed';

export interface HealthCheck {
  name: string;
  status: 'ok' | 'warn' | 'fail';
  detail?: string;
}

export interface SystemStatus {
  healthy: boolean;
  timestamp: string;
  services: {
    database: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    edge_functions: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    worker_service: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    external_apis: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  };
  metrics: {
    active_analyses: number;
    queue_depth: number;
    avg_processing_time_ms: number;
    success_rate: number;
  };
  version: string;
  health?: {
    schema_ok?: boolean;
    checks?: HealthCheck[];
    version?: string;
  };
}
