// Enterprise Workflow
// Builds evidence bundles and workflow status for enterprise review

import type { StrategistAnalysis } from './strategistContract';

interface AnalysisData {
  scenario_text?: string;
  summary?: { text?: string };
  retrievals?: Array<{ id: string; title?: string; url?: string }>;
  provenance?: {
    evidence_backed?: boolean;
    grounded_entities?: unknown[];
    calibration_status?: string;
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

export interface EvidenceBundle {
  scenarioText: string;
  summary: string | null;
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
  return {
    scenarioText,
    summary: analysis?.summary?.text ?? null,
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
  status: string;
  reviewReason?: string;
  evidenceBacked?: boolean;
  createdAt?: string;
  loading?: boolean;
}

interface BuildWorkflowStatusParams {
  strategist: StrategistAnalysis | null;
  reviewState: ReviewState;
  draftReadiness: unknown;
  draftGovernance: unknown;
}

export interface WorkflowStatus {
  strategistReady: boolean;
  reviewStatus: string;
  reviewReason?: string;
  evidenceBacked: boolean;
  draftReadinessReady: boolean;
  draftGovernanceReady: boolean;
  overallReady: boolean;
  steps: Array<{ label: string; complete: boolean }>;
}

export function buildEnterpriseWorkflowStatus({
  strategist,
  reviewState,
  draftReadiness,
  draftGovernance,
}: BuildWorkflowStatusParams): WorkflowStatus {
  const strategistReady = strategist !== null;
  const reviewComplete = reviewState.status === 'completed' || reviewState.status === 'approved';
  const draftReadinessReady = draftReadiness != null && typeof draftReadiness === 'object' && 'ready' in (draftReadiness as Record<string, unknown>) ? (draftReadiness as Record<string, boolean>).ready : draftReadiness != null;
  const draftGovernanceReady = draftGovernance != null && typeof draftGovernance === 'object' && 'ready' in (draftGovernance as Record<string, unknown>) ? (draftGovernance as Record<string, boolean>).ready : draftGovernance != null;

  const steps = [
    { label: 'Analysis', complete: true },
    { label: 'Strategist Brief', complete: strategistReady },
    { label: 'Human Review', complete: reviewComplete },
    { label: 'Draft Readiness', complete: draftReadinessReady },
    { label: 'Draft Governance', complete: draftGovernanceReady },
  ];

  return {
    strategistReady,
    reviewStatus: reviewState.status,
    reviewReason: reviewState.reviewReason,
    evidenceBacked: reviewState.evidenceBacked ?? false,
    draftReadinessReady,
    draftGovernanceReady,
    overallReady: strategistReady && reviewComplete && draftReadinessReady && draftGovernanceReady,
    steps,
  };
}
