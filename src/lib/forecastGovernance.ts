export interface ForecastGovernanceDraft {
  title: string;
  question: string;
  resolution_criteria: string;
  resolution_date: string;
  tags: string;
  analysis_run_id?: string;
  game_theory_model?: Record<string, unknown> | null;
}

export interface ForecastLinkedAnalysisState {
  status: string | null;
  reviewReason: string | null;
  evidenceBacked: boolean | null;
  createdAt: string | null;
  loading: boolean;
}

export interface ForecastReadinessAssessment {
  issues: string[];
  warnings: string[];
  score: number;
  status: 'needs_work' | 'review' | 'strong';
}

export interface FreshnessAssessment {
  label: string;
  tone: string;
  description: string;
  ageInDays: number | null;
}

export interface PublishGovernanceAssessment {
  canPublish: boolean;
  status: 'blocked' | 'review_required' | 'caution' | 'ready';
  blockers: string[];
  reviewRequired: string[];
  warnings: string[];
  freshness: FreshnessAssessment | null;
}

export interface GovernanceSummaryField {
  label: string;
  tone: string;
  detail: string;
}

export interface GovernanceSummary {
  review_state: GovernanceSummaryField;
  evidence_backed_state: GovernanceSummaryField;
  freshness: FreshnessAssessment | null;
  consensus_reliability: GovernanceSummaryField | null;
  publish_blockers: string[];
}

interface GovernanceSummaryInput {
  readiness?: ForecastReadinessAssessment | null;
  governance?: PublishGovernanceAssessment | null;
  reviewState: ForecastLinkedAnalysisState;
  provenanceEvidenceBacked?: boolean | null;
  consensus?: {
    reliability?: { score?: number };
    participantCount?: number;
  } | null;
  disagreementIndex?: number | null;
  evidenceCount?: number | null;
}

export const assessForecastReadiness = (draft: ForecastGovernanceDraft): ForecastReadinessAssessment => {
  const issues: string[] = [];
  const warnings: string[] = [];
  let score = 0;
  const question = draft.question.trim();
  const resolutionCriteria = draft.resolution_criteria.trim();
  const hasResolutionDate = Boolean(draft.resolution_date);
  const hasTimeSignal = /\b(by|before|after|during|on|q[1-4]|20\d{2})\b/i.test(question) || hasResolutionDate;
  const hasPrimarySource = /primary source:/i.test(resolutionCriteria);
  const hasFallback = /fallback:/i.test(resolutionCriteria);

  if (!question) issues.push('Forecast question is required.');
  else {
    score += 1;
    if (!question.endsWith('?')) warnings.push('Question should be phrased as a resolvable yes/no or directional question.');
  }
  if (resolutionCriteria.length < 40) issues.push('Resolution criteria should be explicit enough to resolve without interpretation.');
  else score += 1;
  if (!hasTimeSignal) issues.push('Add a resolution date or explicit time boundary so the forecast is scoreable.');
  else score += 1;
  if (!hasPrimarySource) warnings.push('Add a primary resolution source to strengthen trust and future scoring discipline.');
  else score += 1;
  if (!hasFallback) warnings.push('Add a fallback resolution source in case the primary source is unavailable.');
  else score += 1;
  if (!draft.title.trim()) issues.push('Forecast title is required.');
  if (!draft.tags.trim()) warnings.push('Tags improve discovery and later leaderboard segmentation.');
  if (!draft.analysis_run_id) warnings.push('This draft is not linked to an analysis run, so provenance will be weaker.');

  return { issues, warnings, score, status: issues.length > 0 ? 'needs_work' : score >= 5 ? 'strong' : 'review' };
};

export const getAnalysisFreshness = (createdAt: string | null): FreshnessAssessment | null => {
  if (!createdAt) return null;
  const createdAtMs = new Date(createdAt).getTime();
  if (Number.isNaN(createdAtMs)) return null;
  const ageInDays = (Date.now() - createdAtMs) / 86400000;
  if (ageInDays <= 1) return { label: 'Fresh analysis', tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300', description: 'Linked analysis was generated within the last 24 hours.', ageInDays };
  if (ageInDays <= 7) return { label: 'Recent analysis', tone: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300', description: 'Linked analysis was generated within the last week.', ageInDays };
  if (ageInDays <= 30) return { label: 'Aging analysis', tone: 'border-amber-500/30 bg-amber-500/10 text-amber-300', description: 'Linked analysis is more than a week old, so verify whether the evidence window is still current.', ageInDays };
  return { label: 'Potentially stale analysis', tone: 'border-rose-500/30 bg-rose-500/10 text-rose-300', description: 'Linked analysis is more than 30 days old and may no longer reflect the latest information environment.', ageInDays };
};

export const assessPublishGovernance = (
  draft: ForecastGovernanceDraft,
  readiness: ForecastReadinessAssessment,
  reviewState: ForecastLinkedAnalysisState
): PublishGovernanceAssessment => {
  const blockers = [...readiness.issues];
  const reviewRequired: string[] = [];
  const warnings = [...readiness.warnings];
  const multiAgentForecast = (draft.game_theory_model as Record<string, any> | null)?.multi_agent_forecast;
  const contradictionCount = Array.isArray(multiAgentForecast?.contradictionPoints) ? multiAgentForecast.contradictionPoints.length : 0;
  const disagreementIndex = typeof multiAgentForecast?.disagreementIndex === 'number' ? multiAgentForecast.disagreementIndex : 0;
  const evidenceCount = typeof multiAgentForecast?.evidenceCount === 'number' ? multiAgentForecast.evidenceCount : null;
  const freshness = getAnalysisFreshness(reviewState.createdAt);

  if (draft.analysis_run_id) {
    if (reviewState.loading) blockers.push('Checking linked analysis review state before publication.');
    else if (reviewState.status === 'rejected') blockers.push('Linked analysis was rejected during human review.');
    else if (reviewState.status === 'under_review' || reviewState.status === 'needs_review') reviewRequired.push('Linked analysis must complete human review before this public forecast is created.');
    else {
      if (reviewState.status !== 'approved' && reviewState.evidenceBacked === false) reviewRequired.push('Linked analysis is not evidence-backed. Human review should complete before public publication.');
      if (reviewState.status !== 'approved' && (disagreementIndex >= 0.2 || contradictionCount > 0)) reviewRequired.push('Linked analysis remains contested, so reviewer confirmation is required before publish.');
      if (reviewState.status === null && reviewState.evidenceBacked === null) warnings.push('Linked analysis governance metadata could not be fully verified. Review provenance before publishing.');
      else if (reviewState.status === null && reviewState.evidenceBacked === true) warnings.push('No human review is recorded for this linked analysis yet.');
      if (reviewState.status === 'approved' && (disagreementIndex >= 0.2 || contradictionCount > 0)) warnings.push('This linked analysis was approved despite meaningful disagreement, so keep challenger reasoning visible.');
    }
    if (evidenceCount !== null && evidenceCount < 3) warnings.push(`Linked analysis references only ${evidenceCount} evidence item${evidenceCount === 1 ? '' : 's'}, so trust may be limited.`);
    if (freshness && freshness.ageInDays !== null && freshness.ageInDays > 7) warnings.push(freshness.description);
  }

  if (!draft.analysis_run_id && draft.game_theory_model) warnings.push('This draft carries engine metadata but is not linked to an analysis run, so provenance is weaker than the payload suggests.');

  return {
    canPublish: blockers.length === 0 && reviewRequired.length === 0,
    status: blockers.length > 0 ? 'blocked' : reviewRequired.length > 0 ? 'review_required' : warnings.length > 0 ? 'caution' : 'ready',
    blockers,
    reviewRequired,
    warnings,
    freshness
  };
};

export const buildGovernanceSummary = ({
  readiness,
  governance,
  reviewState,
  provenanceEvidenceBacked,
  consensus,
  disagreementIndex,
  evidenceCount
}: GovernanceSummaryInput): GovernanceSummary => {
  const publishBlockers = Array.from(new Set([
    ...(governance?.blockers || []),
    ...(governance?.reviewRequired || [])
  ]));

  const reviewStateField: GovernanceSummaryField = reviewState.loading
    ? {
        label: 'Checking review state',
        tone: 'border-slate-600 bg-slate-800 text-slate-300',
        detail: 'Linked analysis governance is still loading.'
      }
    : reviewState.status === 'approved'
      ? {
          label: 'Human-reviewed',
          tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
          detail: 'The linked analysis has passed human review.'
        }
      : reviewState.status === 'under_review' || reviewState.status === 'needs_review'
        ? {
            label: 'Review pending',
            tone: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
            detail: 'The linked analysis is still in the review queue.'
          }
        : reviewState.status === 'rejected'
          ? {
              label: 'Review rejected',
              tone: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
              detail: 'A reviewer rejected the linked analysis and public publication should stop here.'
            }
          : {
              label: 'Review not requested',
              tone: 'border-slate-600 bg-slate-800 text-slate-300',
              detail: 'No completed human review is recorded for the linked analysis.'
            };

  const evidenceBacked = reviewState.evidenceBacked === true || reviewState.status === 'approved' || provenanceEvidenceBacked === true;

  const evidenceBackedField: GovernanceSummaryField = evidenceBacked
    ? {
        label: 'Evidence-backed',
        tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
        detail: evidenceCount && evidenceCount < 3
          ? `Analysis is evidence-backed, but only ${evidenceCount} evidence item${evidenceCount === 1 ? '' : 's'} are attached.`
          : 'Evidence-backed provenance is present for the linked analysis.'
      }
    : evidenceCount && evidenceCount > 0
      ? {
          label: 'Limited evidence',
          tone: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
          detail: `The linked analysis carries ${evidenceCount} evidence item${evidenceCount === 1 ? '' : 's'}, so trust should stay review-visible.`
        }
      : {
          label: 'Evidence not verified',
          tone: 'border-slate-600 bg-slate-800 text-slate-300',
          detail: 'No strong evidence-backed signal is attached to the linked analysis yet.'
        };

  let consensusField: GovernanceSummaryField | null = null;
  const reliabilityScore = typeof consensus?.reliability?.score === 'number' ? consensus.reliability.score : null;
  const participantCount = typeof consensus?.participantCount === 'number' ? consensus.participantCount : null;

  if (reliabilityScore !== null) {
    consensusField = reliabilityScore >= 0.7
      ? {
          label: 'High consensus reliability',
          tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
          detail: participantCount
            ? `Weighted consensus reliability is ${(reliabilityScore * 100).toFixed(0)}% across ${participantCount} participants.`
            : `Weighted consensus reliability is ${(reliabilityScore * 100).toFixed(0)}%.`
        }
      : reliabilityScore >= 0.45
        ? {
            label: 'Developing consensus',
            tone: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
            detail: participantCount
              ? `Weighted consensus is still maturing across ${participantCount} participants.`
              : 'Consensus quality is still developing.'
          }
        : {
            label: 'Low consensus reliability',
            tone: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
            detail: participantCount
              ? `Weighted consensus is thin or unstable across ${participantCount} participants.`
              : 'Consensus quality is too thin to lean on heavily.'
          };
  } else if (typeof disagreementIndex === 'number') {
    consensusField = disagreementIndex >= 0.2
      ? {
          label: 'Contested engine view',
          tone: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
          detail: 'Specialist or challenger disagreement is high, so reviewer confirmation is important.'
        }
      : disagreementIndex >= 0.1
        ? {
            label: 'Moderate disagreement',
            tone: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
            detail: 'Consensus is directionally useful, but challenger reasoning should stay visible.'
          }
        : {
            label: 'Stable engine consensus',
            tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
            detail: 'Engine disagreement is low enough for a stable working draft.'
          };
  }

  if (!governance && readiness && readiness.warnings.length > 0) {
    publishBlockers.push(...readiness.issues);
  }

  return {
    review_state: reviewStateField,
    evidence_backed_state: evidenceBackedField,
    freshness: governance?.freshness || getAnalysisFreshness(reviewState.createdAt),
    consensus_reliability: consensusField,
    publish_blockers: Array.from(new Set(publishBlockers))
  };
};
