import React from 'react'
import { AlertCircle, Brain, FileText, Shield, Target, TrendingUp, Zap, Lock, Scale, Network, Cpu, BarChart3 } from 'lucide-react'
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

      {(multiAgentForecast.marketPrior || multiAgentForecast.semanticRoute || multiAgentForecast.calibrationWithLearnings) && (
        <div className="mb-6 flex flex-wrap gap-3">
          {multiAgentForecast.marketPrior && (
            <div className="bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <div>
                <div className="text-xs text-slate-500">Market Prior</div>
                <div className="text-sm text-cyan-300">
                  {(multiAgentForecast.marketPrior.probability * 100).toFixed(0)}% — {multiAgentForecast.marketPrior.source}
                </div>
                <div className="text-xs text-slate-500 truncate max-w-[200px]">
                  {multiAgentForecast.marketPrior.marketQuestion}
                </div>
              </div>
            </div>
          )}
          {multiAgentForecast.semanticRoute && (
            <div className="bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-700 flex items-center gap-2">
              <FileText className="w-4 h-4 text-violet-400 flex-shrink-0" />
              <div>
                <div className="text-xs text-slate-500">Skill File</div>
                <div className="text-sm text-violet-300">{multiAgentForecast.semanticRoute.label}</div>
                <div className="text-xs text-slate-500">
                  {multiAgentForecast.semanticRoute.category} · {(multiAgentForecast.semanticRoute.routingConfidence * 100).toFixed(0)}% confidence
                </div>
              </div>
            </div>
          )}
          {multiAgentForecast.calibrationWithLearnings && (
            <div className="bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-700 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <div>
                <div className="text-xs text-slate-500">Calibration</div>
                <div className="text-sm text-emerald-300">
                  {multiAgentForecast.calibrationWithLearnings.method}
                </div>
                <div className="text-xs text-slate-500">
                  n={multiAgentForecast.calibrationWithLearnings.sampleSize}
                  {multiAgentForecast.calibrationWithLearnings.brierScore !== null && (
                    <> · Brier={multiAgentForecast.calibrationWithLearnings.brierScore.toFixed(3)}</>
                  )}
                </div>
              </div>
            </div>
          )}
          {multiAgentForecast.orchestrator && (
            <div className="bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-700 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div>
                <div className="text-xs text-slate-500">Orchestrator</div>
                <div className="text-sm text-amber-300">
                  {multiAgentForecast.orchestrator.activeAgentCount} agents · {multiAgentForecast.orchestrator.estimatedComplexity}
                </div>
                <div className="text-xs text-slate-500">
                  {multiAgentForecast.orchestrator.skippedAgents.length > 0
                    ? `Skipped: ${multiAgentForecast.orchestrator.skippedAgents.join(', ')}`
                    : 'All agents active'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {multiAgentForecast.benchmark && multiAgentForecast.benchmark.displayMetrics && (
        <div className="mb-6 rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-medium text-white">Benchmark Registry</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              multiAgentForecast.benchmark.trend === 'improving'
                ? 'bg-emerald-500/15 text-emerald-300'
                : multiAgentForecast.benchmark.trend === 'degrading'
                  ? 'bg-rose-500/15 text-rose-300'
                  : 'bg-slate-500/15 text-slate-300'
            }`}>
              {multiAgentForecast.benchmark.trend.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {multiAgentForecast.benchmark.displayMetrics.map((metric, i) => (
              <div key={i} title={metric.tooltip}>
                <div className="text-xs text-slate-500">{metric.label}</div>
                <div className={`text-sm font-semibold ${
                  metric.status === 'good' ? 'text-emerald-400'
                    : metric.status === 'warning' ? 'text-amber-400'
                    : metric.status === 'bad' ? 'text-rose-400'
                    : 'text-slate-300'
                }`}>
                  {metric.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {multiAgentForecast.judgeVerification && (
        <div className={`mb-6 rounded-lg border px-4 py-3 ${
          multiAgentForecast.judgeVerification.severity === 'critical'
            ? 'border-rose-500/30 bg-rose-500/5'
            : multiAgentForecast.judgeVerification.severity === 'major'
              ? 'border-amber-500/20 bg-amber-500/5'
              : multiAgentForecast.judgeVerification.severity === 'minor'
                ? 'border-cyan-500/20 bg-cyan-500/5'
                : 'border-emerald-500/20 bg-emerald-500/5'
        }`}>
          <div className="flex items-start gap-3">
            <Scale className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
              multiAgentForecast.judgeVerification.severity === 'critical'
                ? 'text-rose-400'
                : multiAgentForecast.judgeVerification.severity === 'major'
                  ? 'text-amber-400'
                  : multiAgentForecast.judgeVerification.severity === 'minor'
                    ? 'text-cyan-400'
                    : 'text-emerald-400'
            }`} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-white">
                  LLM Judge: {multiAgentForecast.judgeVerification.family}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  multiAgentForecast.judgeVerification.verdict === 'confirmed'
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : multiAgentForecast.judgeVerification.verdict === 'rejected'
                      ? 'bg-rose-500/15 text-rose-300'
                      : 'bg-cyan-500/15 text-cyan-300'
                }`}>
                  {multiAgentForecast.judgeVerification.verdict.replace('_', ' ')}
                </span>
                {multiAgentForecast.judgeVerification.severity !== 'none' && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    multiAgentForecast.judgeVerification.severity === 'critical'
                      ? 'bg-rose-500/15 text-rose-300'
                      : multiAgentForecast.judgeVerification.severity === 'major'
                        ? 'bg-amber-500/15 text-amber-300'
                        : 'bg-cyan-500/15 text-cyan-300'
                  }`}>
                    {multiAgentForecast.judgeVerification.severity}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
                <div>
                  <div className="text-xs text-slate-500">Verified Prob</div>
                  <div className="text-sm text-white font-semibold">
                    {(multiAgentForecast.judgeVerification.verifiedProbability * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Judge Confidence</div>
                  <div className="text-sm text-white font-semibold">
                    {(multiAgentForecast.judgeVerification.judgeConfidence * 100).toFixed(0)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Disagreement</div>
                  <div className={`text-sm font-semibold ${
                    multiAgentForecast.judgeVerification.disagreementWithChampion > 0.15
                      ? 'text-rose-400'
                      : multiAgentForecast.judgeVerification.disagreementWithChampion > 0.05
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                  }`}>
                    ±{(multiAgentForecast.judgeVerification.disagreementWithChampion * 100).toFixed(1)}pp
                  </div>
                </div>
                {multiAgentForecast.judgeVerification.adjustedProbability !== null && (
                  <div>
                    <div className="text-xs text-slate-500">Adjustment</div>
                    <div className={`text-sm font-semibold ${
                      multiAgentForecast.judgeVerification.judgeDelta > 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}>
                      {multiAgentForecast.judgeVerification.judgeDelta > 0 ? '+' : ''}
                      {(multiAgentForecast.judgeVerification.judgeDelta * 100).toFixed(1)}pp
                    </div>
                  </div>
                )}
              </div>
              {multiAgentForecast.judgeVerification.judgeReasoning && (
                <div className="text-xs text-slate-400 mt-1">
                  {multiAgentForecast.judgeVerification.judgeReasoning}
                </div>
              )}
              {multiAgentForecast.judgeVerification.concerns.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs text-slate-500 mb-1">Judge Concerns</div>
                  <div className="space-y-1">
                    {multiAgentForecast.judgeVerification.concerns.map((concern, i) => (
                      <div key={i} className="text-xs text-slate-300 bg-slate-800 rounded px-2 py-1 border border-slate-700">
                        {concern}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {multiAgentForecast.evidenceGraph && (
        <div className="mb-6 rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3">
          <div className="flex items-start gap-3 mb-3">
            <Network className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium text-white mb-2">Evidence Graph</div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div>
                  <div className="text-xs text-slate-500">Nodes</div>
                  <div className="text-sm text-white font-semibold">{multiAgentForecast.evidenceGraph.summary.totalNodes}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Edges</div>
                  <div className="text-sm text-white font-semibold">{multiAgentForecast.evidenceGraph.edgeCount}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Verified</div>
                  <div className="text-sm text-emerald-400 font-semibold">
                    {multiAgentForecast.evidenceGraph.summary.verifiedCount}/{multiAgentForecast.evidenceGraph.summary.totalNodes}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Avg Credibility</div>
                  <div className="text-sm text-white font-semibold">
                    {(multiAgentForecast.evidenceGraph.summary.averageCredibility * 100).toFixed(0)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Strength</div>
                  <div className={`text-sm font-semibold ${
                    multiAgentForecast.evidenceGraph.summary.evidenceStrength >= 0.7
                      ? 'text-emerald-400'
                      : multiAgentForecast.evidenceGraph.summary.evidenceStrength >= 0.5
                        ? 'text-amber-400'
                        : 'text-rose-400'
                  }`}>
                    {(multiAgentForecast.evidenceGraph.summary.evidenceStrength * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
              {multiAgentForecast.evidenceGraph.topNodes.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-slate-500 mb-1">Top Evidence Pieces</div>
                  <div className="space-y-1">
                    {multiAgentForecast.evidenceGraph.topNodes.map((node, i) => (
                      <div key={i} className="text-xs text-slate-300 bg-slate-800 rounded px-2 py-1 border border-slate-700">
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                          node.verificationStatus === 'verified'
                            ? 'bg-emerald-400'
                            : node.verificationStatus === 'partially_verified'
                              ? 'bg-amber-400'
                              : 'bg-slate-500'
                        }`} />
                        {node.claim}
                        <span className="text-slate-500 ml-2">— {node.source} ({node.nodeType})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {multiAgentForecast.globalVerifier && (
        <div className={`mb-6 rounded-lg border px-4 py-3 ${
          multiAgentForecast.globalVerifier.recommendation === 'high_confidence'
            ? 'border-emerald-500/20 bg-emerald-500/5'
            : multiAgentForecast.globalVerifier.recommendation === 'moderate_confidence'
              ? 'border-cyan-500/20 bg-cyan-500/5'
              : multiAgentForecast.globalVerifier.recommendation === 'low_confidence'
                ? 'border-amber-500/20 bg-amber-500/5'
                : 'border-rose-500/20 bg-rose-500/5'
        }`}>
          <div className="flex items-start gap-3">
            <Shield className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
              multiAgentForecast.globalVerifier.recommendation === 'high_confidence'
                ? 'text-emerald-400'
                : multiAgentForecast.globalVerifier.recommendation === 'moderate_confidence'
                  ? 'text-cyan-400'
                  : multiAgentForecast.globalVerifier.recommendation === 'low_confidence'
                    ? 'text-amber-400'
                    : 'text-rose-400'
            }`} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-white">Global Verifier</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  multiAgentForecast.globalVerifier.recommendation === 'high_confidence'
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : multiAgentForecast.globalVerifier.recommendation === 'moderate_confidence'
                      ? 'bg-cyan-500/15 text-cyan-300'
                      : multiAgentForecast.globalVerifier.recommendation === 'low_confidence'
                        ? 'bg-amber-500/15 text-amber-300'
                        : 'bg-rose-500/15 text-rose-300'
                }`}>
                  {multiAgentForecast.globalVerifier.recommendation.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-slate-500">
                  ({multiAgentForecast.globalVerifier.source})
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-2">
                <div>
                  <div className="text-xs text-slate-500">Verification Score</div>
                  <div className="text-sm text-white font-semibold">
                    {(multiAgentForecast.globalVerifier.verificationScore * 100).toFixed(0)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Evidence Strength</div>
                  <div className="text-sm text-white font-semibold">
                    {(multiAgentForecast.globalVerifier.evidenceStrength * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
              {multiAgentForecast.globalVerifier.coverageAssessment && (
                <div className="text-xs text-slate-400 mt-1">
                  {multiAgentForecast.globalVerifier.coverageAssessment}
                </div>
              )}
              {multiAgentForecast.globalVerifier.strongestEvidence && (
                <div className="text-xs text-emerald-300 mt-1">
                  <span className="text-slate-500">Strongest: </span>
                  {multiAgentForecast.globalVerifier.strongestEvidence}
                </div>
              )}
              {multiAgentForecast.globalVerifier.weakestLink && (
                <div className="text-xs text-amber-300 mt-1">
                  <span className="text-slate-500">Weakest: </span>
                  {multiAgentForecast.globalVerifier.weakestLink}
                </div>
              )}
              {multiAgentForecast.globalVerifier.keyConcerns.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs text-slate-500 mb-1">Verifier Concerns</div>
                  <div className="space-y-1">
                    {multiAgentForecast.globalVerifier.keyConcerns.map((concern, i) => (
                      <div key={i} className="text-xs text-slate-300 bg-slate-800 rounded px-2 py-1 border border-slate-700">
                        {concern}
                      </div>
                    ))}
                  </div>
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

      {multiAgentForecast.progressTracking && (
        <div className="mt-6 rounded-lg border border-slate-700 bg-slate-900/40 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">
              Verification Pipeline v{multiAgentForecast.progressTracking.pipelineVersion}
            </span>
            <span className="text-xs text-slate-500">
              {multiAgentForecast.progressTracking.completedPhases}/{multiAgentForecast.progressTracking.totalPhases} phases
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {multiAgentForecast.progressTracking.phases.map((phase, i) => (
              <div
                key={i}
                title={phase.detail || phase.status}
                className={`text-xs px-2 py-1 rounded border ${
                  phase.status === 'completed' || phase.status === 'passed'
                    ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300'
                    : phase.status === 'skipped' || phase.status === 'no_data' || phase.status === 'empty'
                      ? 'border-slate-600 bg-slate-800/50 text-slate-500'
                      : phase.status === 'heuristic' || phase.status === 'fallback'
                        ? 'border-amber-500/20 bg-amber-500/5 text-amber-300'
                        : phase.status === 'major' || phase.status === 'critical' || phase.status === 'rejected'
                          ? 'border-rose-500/20 bg-rose-500/5 text-rose-300'
                          : 'border-cyan-500/20 bg-cyan-500/5 text-cyan-300'
                }`}
              >
                {phase.name.replace(/_/g, ' ')}
                <span className="text-slate-500 ml-1">· {phase.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
