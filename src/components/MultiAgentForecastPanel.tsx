import React from 'react'
import { AlertCircle, Brain, FileText, Shield, Target, TrendingUp, Zap, Lock } from 'lucide-react'
import { getAnalysisFreshness, type ForecastLinkedAnalysisState, type ForecastReadinessAssessment, type PublishGovernanceAssessment } from '../lib/forecastGovernance'
import type { MultiAgentForecast } from '../types/strategic-analysis'
import { labelCalibrationStatus, normalizeCalibrationStatus } from '../../shared/mlAdvisory'

interface MultiAgentForecastPanelProps {
  multiAgentForecast: MultiAgentForecast
  analysisRunId: string | null
  analysisReviewState: ForecastLinkedAnalysisState & {
    requesting: boolean
    message: string | null
  }
  draftReadiness: ForecastReadinessAssessment | null
  draftGovernance: PublishGovernanceAssessment | null
  onRequestHumanReview: () => Promise<void> | void
  onCreateForecastDraft: () => void
  privateBetaMode?: boolean
}

export default function MultiAgentForecastPanel({
  multiAgentForecast,
  analysisRunId,
  analysisReviewState,
  draftReadiness,
  draftGovernance,
  onRequestHumanReview,
  onCreateForecastDraft,
  privateBetaMode = false
}: MultiAgentForecastPanelProps) {
  const champion = multiAgentForecast.consensus.champion
  const quality = multiAgentForecast.question.quality
  const disagreementPct = (multiAgentForecast.panel.disagreementIndex * 100).toFixed(0)
  const normalizedCalibrationStatus = normalizeCalibrationStatus(champion.calibrationStatus)
  const calibrationHeadline = normalizedCalibrationStatus === 'empirical'
    ? 'empirically calibrated consensus'
    : normalizedCalibrationStatus === 'prior_smoothed'
      ? 'prior-smoothed consensus'
      : normalizedCalibrationStatus === 'uncalibrated'
        ? 'advisory consensus'
        : 'model unavailable'
  const reviewStatus = analysisReviewState.status
  const analysisFreshness = getAnalysisFreshness(analysisReviewState.createdAt)
  const reviewTone = reviewStatus === 'approved'
    ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-200'
    : reviewStatus === 'under_review' || reviewStatus === 'needs_review'
      ? 'border-rose-500/20 bg-rose-500/5 text-rose-200'
      : reviewStatus === 'rejected'
        ? 'border-rose-500/20 bg-rose-500/5 text-rose-200'
        : 'border-slate-700 bg-slate-900/60 text-slate-300'

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
          {Math.round(champion.calibratedProbability * 100)}% {calibrationHeadline}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-4 py-3">
        <div>
          <div className="text-sm font-medium text-cyan-200">Ready for the Forecast Registry lifecycle</div>
          <div className="text-xs text-slate-400">
            {privateBetaMode
              ? 'Forecast publication is curated during the first broad beta. Public users can inspect the package, but analyst accounts control review and publication.'
              : 'Carry this structured forecast into a public draft with the same governance checks the registry will enforce.'}
          </div>
        </div>
        {privateBetaMode ? (
          <div className="rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
            Analyst access is private during this beta.
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onRequestHumanReview}
              disabled={!analysisRunId || analysisReviewState.requesting || reviewStatus === 'under_review'}
              className="px-4 py-2 bg-amber-500/90 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 rounded-lg font-medium"
            >
              {analysisReviewState.requesting ? 'Requesting review…' : reviewStatus === 'under_review' ? 'Review Pending' : 'Request Human Review'}
            </button>
            <button
              onClick={onCreateForecastDraft}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg font-medium"
            >
              Open governed forecast draft
            </button>
          </div>
        )}
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
              {draftGovernance.blockers.map((issue) => (
                <div key={issue}>{issue}</div>
              ))}
            </div>
          )}
          {draftGovernance.reviewRequired.length > 0 && (
            <div className="mt-3 space-y-1 text-xs text-amber-200">
              {draftGovernance.reviewRequired.map((item) => (
                <div key={item}>{item}</div>
              ))}
            </div>
          )}
          {draftGovernance.warnings.length > 0 && (
            <div className="mt-3 space-y-1 text-xs text-slate-300">
              {draftGovernance.warnings.map((item) => (
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
          <div className="text-3xl font-bold text-emerald-400">{(champion.calibratedProbability * 100).toFixed(1)}%</div>
          <div className="text-sm text-slate-400 mt-1">
            Raw {(champion.rawProbability * 100).toFixed(1)}% · confidence {(champion.confidence * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-slate-500 mt-2">
            {labelCalibrationStatus(champion.calibrationStatus)}
            {champion.calibrationSampleSize ? ` · ${champion.calibrationSampleSize} resolved cases` : ''}
          </div>
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

      {(multiAgentForecast.evidenceGate || multiAgentForecast.noMoveReason) && (
        <div className={`mb-6 rounded-lg border px-4 py-3 ${
          multiAgentForecast.evidenceGate?.decision === 'no_move'
            ? 'border-amber-500/20 bg-amber-500/5'
            : 'border-emerald-500/20 bg-emerald-500/5'
        }`}>
          <div className="flex items-start gap-3">
            {multiAgentForecast.evidenceGate?.decision === 'no_move' ? (
              <Lock className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            ) : (
              <Shield className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <div className="text-sm font-medium text-white">
                Evidence Gate: {multiAgentForecast.evidenceGate?.decision === 'no_move'
                  ? 'No adjustment — prior preserved'
                  : 'Adjustment justified'}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {multiAgentForecast.evidenceGate?.summary || multiAgentForecast.noMoveReason}
              </div>
              {multiAgentForecast.evidenceGate?.reason && (
                <div className="text-xs text-slate-500 mt-1">
                  {multiAgentForecast.evidenceGate.reason}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
            {multiAgentForecast.adversarialReview.worstCaseCounterfactual && (
              <div className="bg-rose-500/10 rounded-lg p-3 border border-rose-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-rose-400" />
                  <div className="text-rose-300 text-xs uppercase tracking-wide font-medium">Worst-Case Counterfactual</div>
                </div>
                <div className="text-rose-200 text-lg font-semibold mb-2">
                  {(multiAgentForecast.adversarialReview.worstCaseCounterfactual.probability * 100).toFixed(1)}%
                </div>
                <div className="text-slate-300 text-sm mb-3">
                  {multiAgentForecast.adversarialReview.worstCaseCounterfactual.scenario}
                </div>
                <div className="text-slate-500 text-xs mb-1">Guarding Triggers</div>
                <div className="space-y-1">
                  {multiAgentForecast.adversarialReview.worstCaseCounterfactual.guardingTriggers.map((trigger) => (
                    <div key={trigger} className="text-slate-300 bg-slate-800 rounded px-3 py-2 border border-slate-700 text-xs">{trigger}</div>
                  ))}
                </div>
              </div>
            )}
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
  )
}
