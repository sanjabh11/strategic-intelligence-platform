// Enterprise Workflow
// Builds evidence bundles and workflow status for enterprise review

import type { StrategistAnalysis } from './strategistContract';

interface AnalysisData {
  scenario_text?: string;
  summary?: { text?: string };
  retrievals?: Array<{ id: string; title?: string; url?: string; snippet?: string }>;
  provenance?: {
    evidence_backed?: boolean;
    retrieval_count?: number;
    grounded_entities?: unknown[];
    calibration_status?: string;
    model?: string;
  };
  multiAgentForecast?: {
    question?: { title?: string; question?: string };
    consensus?: {
      champion?: { probability?: number; confidence?: number };
    };
  };
}

interface BuildEvidenceBundleParams {
  analysis: AnalysisData | null;
  scenarioText: string;
  strategist: StrategistAnalysis | null;
}

export interface EvidenceBundleItem {
  id: string;
  title?: string;
  url?: string;
  snippet?: string;
  type: string;
}

export interface EvidenceBundle {
  scenarioText: string;
  summary: string | null;
  source_count: number;
  claim_count: number;
  items: EvidenceBundleItem[];
  evidenceCount: number;
  evidenceItems: Array<{ id: string; title?: string; url?: string }>;
  strategistBrief: StrategistAnalysis | null;
  evidenceBacked: boolean;
  generatedAt: string;
}

export function buildEnterpriseEvidenceBundle({
  analysis,
  scenarioText,
  strategist,
}: BuildEvidenceBundleParams): EvidenceBundle {
  const retrievals = analysis?.retrievals ?? [];
  const claims = strategist?.claim_to_evidence ?? [];

  const items: EvidenceBundleItem[] = [
    { id: 'scenario_input', title: 'Scenario Input', type: 'scenario', snippet: scenarioText },
    ...retrievals.map((r) => ({
      id: r.id,
      title: r.title,
      url: r.url,
      snippet: r.snippet,
      type: 'retrieval',
    })),
  ];

  return {
    scenarioText,
    summary: analysis?.summary?.text ?? null,
    source_count: items.length,
    claim_count: claims.length,
    items,
    evidenceCount: retrievals.length,
    evidenceItems: retrievals.map((r) => ({
      id: r.id,
      title: r.title,
      url: r.url,
    })),
    strategistBrief: strategist,
    evidenceBacked: analysis?.provenance?.evidence_backed ?? false,
    generatedAt: new Date().toISOString(),
  };
}

interface ReviewState {
  status: string | null;
  reviewReason?: string | null;
  evidenceBacked?: boolean;
  createdAt?: string | null;
  loading?: boolean;
}

interface DraftReadiness {
  issues?: string[];
  warnings?: string[];
  score?: number;
  status?: string;
}

interface DraftGovernance {
  canPublish?: boolean;
  status?: string;
  blockers?: string[];
  reviewRequired?: string[];
  warnings?: string[];
  freshness?: unknown;
}

interface BuildWorkflowStatusParams {
  strategist: StrategistAnalysis | null;
  reviewState: ReviewState;
  draftReadiness: DraftReadiness | null;
  draftGovernance: DraftGovernance | null;
}

export interface WorkflowStep {
  id: string;
  label: string;
  status: string;
  complete: boolean;
  detail?: string;
}

export interface WorkflowNextAction {
  action: string;
  label?: string;
  detail?: string;
}

export interface WorkflowStatus {
  strategistReady: boolean;
  reviewStatus: string | null;
  reviewReason?: string | null;
  evidenceBacked: boolean;
  draftReadinessReady: boolean;
  draftGovernanceReady: boolean;
  overallReady: boolean;
  steps: WorkflowStep[];
  nextAction: WorkflowNextAction;
}

export function buildEnterpriseWorkflowStatus({
  strategist,
  reviewState,
  draftReadiness,
  draftGovernance,
}: BuildWorkflowStatusParams): WorkflowStatus {
  const strategistReady = strategist !== null;
  const reviewComplete = reviewState.status === 'completed' || reviewState.status === 'approved';
  const draftReadinessReady = draftReadiness != null && (draftReadiness.status === 'strong' || draftReadiness.status === 'ready');
  const draftGovernanceReady = draftGovernance != null && draftGovernance.canPublish === true;

  const draftStepStatus = draftGovernanceReady ? 'complete' : 'active';

  const steps: WorkflowStep[] = [
    { id: 'analysis', label: 'Analysis', status: 'complete', complete: true },
    { id: 'strategist', label: 'Strategist Brief', status: strategistReady ? 'complete' : 'pending', complete: strategistReady },
    { id: 'review', label: 'Human Review', status: reviewComplete ? 'complete' : 'pending', complete: reviewComplete },
    { id: 'readiness', label: 'Draft Readiness', status: draftReadinessReady ? 'complete' : 'pending', complete: draftReadinessReady },
    { id: 'draft', label: 'Forecast Draft', status: draftStepStatus, complete: draftGovernanceReady },
  ];

  let nextAction: WorkflowNextAction;
  if (!strategistReady) {
    nextAction = { action: 'run_analysis', label: 'Run analysis first' };
  } else if (!reviewComplete) {
    nextAction = { action: 'request_review', label: 'Request human review' };
  } else if (!draftReadinessReady) {
    nextAction = { action: 'improve_readiness', label: 'Improve draft readiness' };
  } else if (!draftGovernanceReady) {
    nextAction = { action: 'resolve_governance', label: 'Resolve governance blockers' };
  } else {
    nextAction = { action: 'open_forecast_draft', label: 'Open forecast draft' };
  }

  return {
    strategistReady,
    reviewStatus: reviewState.status,
    reviewReason: reviewState.reviewReason,
    evidenceBacked: reviewState.evidenceBacked ?? false,
    draftReadinessReady,
    draftGovernanceReady,
    overallReady: strategistReady && reviewComplete && draftReadinessReady && draftGovernanceReady,
    steps,
    nextAction,
  };
}
