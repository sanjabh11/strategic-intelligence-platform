import React from 'react'
import {
  AlertCircle,
  ArrowRight,
  Brain,
  Copy,
  FileText,
  GitBranch,
  Loader2,
  MapPinned,
  Shield,
  Sparkles,
  Target,
  Users
} from 'lucide-react'
import type { StrategistAnalysis, StrategistClaimEvidenceRef } from '../lib/strategistContract'
import CoalitionalGraph from './game-theory/CoalitionalGraph'
import BayesianTree from './game-theory/BayesianTree'
import CorrelatedEquilibriumPanel from './game-theory/CorrelatedEquilibriumPanel'
import EvolutionaryChart from './game-theory/EvolutionaryChart'
import QreSensitivityPanel from './game-theory/QreSensitivityPanel'

interface StrategistBriefPanelProps {
  strategist: StrategistAnalysis | null
  loading?: boolean
  error?: string | null
  requiresSignIn?: boolean
  privateBetaMode?: boolean
  onCopyBrief?: () => void
  onSaveToWarRoom?: () => void
  onRequestHumanReview?: () => void
  onOpenForecastDraft?: () => void
  onSignIn?: () => void
  onContinueWithoutSignIn?: () => void
  reviewActionDisabled?: boolean
}

const PROVENANCE_VIEW = {
  evidence_backed: {
    label: 'Evidence-backed',
    badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    banner: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-100',
    detail: 'Claims in this brief are anchored to explicit evidence references.'
  },
  llm_unverified: {
    label: 'LLM-generated, limited evidence',
    badge: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
    banner: 'border-amber-500/20 bg-amber-500/5 text-amber-100',
    detail: 'Use this as an analyst-assist draft. Claims need stronger evidence before premium deployment.'
  },
  heuristic_fallback: {
    label: 'Heuristic fallback',
    badge: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
    banner: 'border-rose-500/20 bg-rose-500/5 text-rose-100',
    detail: 'The premium strategist provider was not available. This brief stays usable, but it is not premium-ready.'
  }
} as const

function lookupEvidence(
  strategist: StrategistAnalysis,
  reference: StrategistClaimEvidenceRef
) {
  return strategist.evidence.find((entry) => entry.id === reference.evidence_id)
}

export function StrategistBriefPanel({
  strategist,
  loading = false,
  error = null,
  requiresSignIn = false,
  privateBetaMode = false,
  onCopyBrief,
  onSaveToWarRoom,
  onRequestHumanReview,
  onOpenForecastDraft,
  onSignIn,
  onContinueWithoutSignIn,
  reviewActionDisabled = false
}: StrategistBriefPanelProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
        <div className="flex items-center gap-3 text-slate-200">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
          <div>
            <div className="font-medium">Strategist Brief</div>
            <div className="text-sm text-slate-400">Building the enterprise brief and evidence map…</div>
          </div>
        </div>
      </div>
    )
  }

  if (requiresSignIn) {
    return (
      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 text-cyan-300" />
          <div className="flex-1">
            <div className="font-medium text-white">
              {privateBetaMode ? 'Strategist brief is private during this beta' : 'Strategist brief available after sign-in'}
            </div>
            <div className="mt-1 text-sm text-cyan-100/90">
              {privateBetaMode
                ? 'Doctrine-backed brief generation, persistence, war-room handoff, and governed collaboration are reserved for analyst accounts during the first public beta.'
                : 'Doctrine-backed brief generation, persistence, war-room handoff, and governed collaboration require account context.'}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {!privateBetaMode && (
                <button
                  onClick={onSignIn}
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-400"
                >
                  Sign in to unlock strategist brief
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={onContinueWithoutSignIn}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 transition-colors hover:bg-slate-950"
              >
                {privateBetaMode ? 'Continue with evidence-backed analysis' : 'Continue with analysis only'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 text-rose-300" />
          <div>
            <div className="font-medium text-white">Strategist Brief unavailable</div>
            <div className="mt-1 text-sm text-rose-100/90">{error}</div>
          </div>
        </div>
      </div>
    )
  }

  if (!strategist) {
    return null
  }

  const provenanceStatus = strategist.provenance_status ?? 'heuristic_fallback'
  const provenance = PROVENANCE_VIEW[provenanceStatus as keyof typeof PROVENANCE_VIEW] ?? PROVENANCE_VIEW.heuristic_fallback
  const premiumReady = strategist.provenance_status === 'evidence_backed' && strategist.claim_to_evidence.length > 0
  const advancedOutputs = strategist.advanced_game_outputs

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold text-white">
            <Brain className="h-5 w-5 text-cyan-400" />
            Strategist Brief
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Enterprise-ready summary, countermoves, uncertainty, and claim-level evidence.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${provenance.badge}`}>
            {provenance.label}
          </span>
          {!premiumReady && (
            <span className="rounded-full border border-slate-600 bg-slate-900 px-3 py-1 text-xs font-medium text-slate-300">
              Review-visible
            </span>
          )}
        </div>
      </div>

      <div className={`mb-6 rounded-xl border px-4 py-3 ${provenance.banner}`}>
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5" />
          <div>
            <div className="font-medium">Trust status</div>
            <div className="mt-1 text-sm opacity-90">{provenance.detail}</div>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={onCopyBrief}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-400"
        >
          <Copy className="h-4 w-4" />
          Copy brief
        </button>
        <button
          onClick={onSaveToWarRoom}
          className="inline-flex items-center gap-2 rounded-lg bg-fuchsia-500/90 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-fuchsia-400"
        >
          <Users className="h-4 w-4" />
          Save to war room
        </button>
        <button
          onClick={onRequestHumanReview}
          disabled={reviewActionDisabled}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500/90 px-4 py-2 text-sm font-medium text-slate-950 transition-colors hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-400"
        >
          <Shield className="h-4 w-4" />
          Request review
        </button>
        <button
          onClick={onOpenForecastDraft}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 transition-colors hover:bg-slate-950"
        >
          <FileText className="h-4 w-4" />
          Open forecast draft
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr,0.9fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
            <div className="mb-2 flex items-center gap-2 text-white">
              <Sparkles className="h-4 w-4 text-cyan-300" />
              <span className="font-medium">Executive Summary</span>
            </div>
            <p className="text-sm leading-6 text-slate-200">{strategist.executive_summary}</p>
            <p className="mt-3 text-sm leading-6 text-slate-400">{strategist.summary}</p>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
            <div className="mb-3 flex items-center gap-2 text-white">
              <GitBranch className="h-4 w-4 text-fuchsia-300" />
              <span className="font-medium">Doctrine Selection</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-slate-700 bg-slate-800/80 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">Game family</div>
                <div className="mt-1 text-sm font-medium capitalize text-slate-100">
                  {strategist.game_classification.game_family?.replace(/_/g, ' ') ?? 'unknown'}
                </div>
                <div className="mt-2 text-xs text-slate-400">
                  {strategist.game_classification.move_structure} · {strategist.game_classification.information_structure}
                </div>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-800/80 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">Decision objective</div>
                <div className="mt-1 text-sm text-slate-100">{strategist.game_classification.decision_objective}</div>
                <div className="mt-2 text-xs text-cyan-200">
                  Confidence {Math.round((strategist.game_classification.confidence ?? 0) * 100)}%
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-300">{strategist.game_classification.why_fit}</p>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
            <div className="mb-3 flex items-center gap-2 text-white">
              <Target className="h-4 w-4 text-emerald-300" />
              <span className="font-medium">Recommended Move</span>
            </div>
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="font-medium capitalize text-slate-100">{strategist.recommendation.primary_action?.replace(/_/g, ' ') ?? 'pending'}</p>
              <p className="mt-2 text-sm text-slate-300">{strategist.recommendation.rationale}</p>
              <p className="mt-2 text-sm text-slate-200">Expected outcome: {strategist.recommendation.expected_outcome}</p>
            </div>
          </div>

          {advancedOutputs && (
            <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
              <div className="mb-3 flex items-center gap-2 text-white">
                <Brain className="h-4 w-4 text-cyan-300" />
                <span className="font-medium">Advanced Deterministic Layers</span>
              </div>
              <div className="space-y-4">
                {advancedOutputs.coalitional && <CoalitionalGraph output={advancedOutputs.coalitional} />}
                {advancedOutputs.signaling && <BayesianTree output={advancedOutputs.signaling} />}
                {advancedOutputs.correlated && <CorrelatedEquilibriumPanel output={advancedOutputs.correlated} />}
                {advancedOutputs.evolutionary && <EvolutionaryChart output={advancedOutputs.evolutionary} />}
                {advancedOutputs.bounded_rationality && <QreSensitivityPanel output={advancedOutputs.bounded_rationality} />}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
            <div className="mb-3 flex items-center gap-2 text-white">
              <Users className="h-4 w-4 text-indigo-300" />
              <span className="font-medium">Actor Map</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {strategist.actor_map.map((actor) => (
                <div key={actor.actorId} className="rounded-lg border border-slate-700 bg-slate-800/80 p-3">
                  <div className="font-medium text-slate-100">{actor.name}</div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">{actor.role}</div>
                  <div className="mt-2 text-sm text-slate-300">Objective: {actor.objective}</div>
                  {(actor.leverage ?? []).length > 0 && (
                    <div className="mt-2 text-xs text-slate-400">Leverage: {(actor.leverage ?? []).join(', ')}</div>
                  )}
                  {(actor.constraint ?? []).length > 0 && (
                    <div className="mt-1 text-xs text-slate-400">Constraints: {(actor.constraint ?? []).join(', ')}</div>
                  )}
                  <div className="mt-2 text-xs text-cyan-200">Likely next move: {actor.likelyMove}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
            <div className="mb-3 flex items-center gap-2 text-white">
              <MapPinned className="h-4 w-4 text-cyan-300" />
              <span className="font-medium">Outside Options and Leverage</span>
            </div>
            <div className="space-y-3">
              {strategist.outside_options.map((option, index) => (
                <div key={`${option.actorId}-${index}`} className="rounded-lg border border-slate-700 bg-slate-800/80 p-3">
                  <div className="font-medium text-slate-100">{option.actorId === 'you' ? 'Focal actor' : option.actorId}</div>
                  <div className="mt-2 text-sm text-slate-300">{option.batna}</div>
                  <div className="mt-2 text-xs text-slate-400">Reservation logic: {option.reservationValue}</div>
                  {(option.leverageNotes ?? []).length > 0 && (
                    <div className="mt-2 text-xs text-cyan-200">Leverage notes: {(option.leverageNotes ?? []).join(', ')}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
            <div className="mb-3 flex items-center gap-2 text-white">
              <ArrowRight className="h-4 w-4 text-amber-300" />
              <span className="font-medium">Countermoves</span>
            </div>
            <div className="space-y-3">
              {strategist.countermoves.map((entry, index) => (
                <div key={`${entry.actorId}-${index}`} className="rounded-lg border border-slate-700 bg-slate-800/80 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-slate-100">{entry.countermove}</div>
                    <span className="rounded-full bg-slate-700 px-2 py-1 text-xs uppercase tracking-wide text-slate-300">
                      {entry.warningLevel}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-slate-300">{entry.whyLikely}</div>
                  <div className="mt-2 text-xs text-cyan-200">Recommended response: {entry.recommendedResponse}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
            <div className="mb-3 flex items-center gap-2 text-white">
              <AlertCircle className="h-4 w-4 text-rose-300" />
              <span className="font-medium">Key Uncertainties</span>
            </div>
            <div className="space-y-3">
              {strategist.key_uncertainties.map((entry, index) => (
                <div key={`${entry.uncertainty}-${index}`} className="rounded-lg border border-slate-700 bg-slate-800/80 p-3">
                  <div className="font-medium text-slate-100">{entry.uncertainty}</div>
                  <div className="mt-2 text-sm text-slate-300">{entry.whyItMatters}</div>
                  <div className="mt-2 text-xs text-slate-400">Signpost: {entry.signpost}</div>
                  <div className="mt-1 text-xs text-cyan-200">Mitigation: {entry.mitigation}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/70 p-4">
        <div className="mb-3 flex items-center gap-2 text-white">
          <FileText className="h-4 w-4 text-cyan-300" />
          <span className="font-medium">Claim-to-Evidence Map</span>
        </div>
        {strategist.claim_to_evidence.length === 0 ? (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-3 text-sm text-amber-100">
            No claim-level evidence map is available for this brief yet. Treat it as review-visible, not premium-ready.
          </div>
        ) : (
          <div className="space-y-3">
            {strategist.claim_to_evidence.map((claim) => (
              <div key={claim.claim_id} className="rounded-lg border border-slate-700 bg-slate-800/80 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-slate-100">{claim.claim_text}</div>
                  <div className="text-xs text-slate-400">Confidence {Math.round((claim.confidence ?? 0) * 100)}%</div>
                </div>
                <div className="mt-3 space-y-2">
                  {claim.evidence_refs.map((reference, index) => {
                    const evidence = lookupEvidence(strategist, reference)
                    return (
                      <div key={`${claim.claim_id}-${reference.evidence_id}-${index}`} className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="text-sm text-slate-100">{reference.label}</div>
                          <div className="text-xs text-slate-400">
                            {(reference.sourceType ?? 'unknown').replace(/_/g, ' ')} · {reference.support}
                          </div>
                        </div>
                        {evidence && (
                          <div className="mt-2 text-xs text-slate-400">{evidence.detail}</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
