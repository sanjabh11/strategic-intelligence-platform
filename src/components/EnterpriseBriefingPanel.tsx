import React, { useMemo, useState } from 'react'
import {
  Activity,
  Briefcase,
  Building2,
  FileText,
  Shield,
  Target,
  Users
} from 'lucide-react'
import type { GovernanceSummary } from '../lib/forecastGovernance'
import type { StrategistAnalysis } from '../lib/strategistContract'
import type { AnalysisResult, MultiAgentForecast } from '../types/strategic-analysis'

type EnterpriseAudiencePreset = 'executive' | 'analyst' | 'operator' | 'policy'

interface EnterpriseBriefingPanelProps {
  strategist: StrategistAnalysis | null
  analysis: AnalysisResult | null
  multiAgentForecast?: MultiAgentForecast | null
  governanceSummary: GovernanceSummary
}

const PRESETS: Array<{
  id: EnterpriseAudiencePreset
  label: string
  description: string
  icon: React.ElementType
}> = [
  {
    id: 'executive',
    label: 'Executive',
    description: 'Decision ask, top risk, and why it matters now',
    icon: Briefcase
  },
  {
    id: 'analyst',
    label: 'Analyst',
    description: 'Evidence, counters, and uncertainty discipline',
    icon: FileText
  },
  {
    id: 'operator',
    label: 'Operator',
    description: 'Watchpoints, triggers, and response posture',
    icon: Activity
  },
  {
    id: 'policy',
    label: 'Policy',
    description: 'Stakeholders, second-order effects, and governance implications',
    icon: Building2
  }
]

export function EnterpriseBriefingPanel({
  strategist,
  analysis,
  multiAgentForecast,
  governanceSummary
}: EnterpriseBriefingPanelProps) {
  const [preset, setPreset] = useState<EnterpriseAudiencePreset>('executive')

  const cards = useMemo(() => {
    if (!strategist) return []

    const topUncertainties = strategist.key_uncertainties.slice(0, 3)
    const topCountermoves = strategist.countermoves.slice(0, 3)
    const topActors = strategist.actor_map.slice(0, 4)

    switch (preset) {
      case 'executive':
        return [
          {
            title: 'Decision ask',
            body: (strategist.recommendation.primary_action || 'pending').replace(/_/g, ' '),
            detail: strategist.recommendation.expected_outcome
          },
          {
            title: 'Why now',
            body: strategist.executive_summary,
            detail: analysis?.summary?.text || 'Use the strategist brief as the lead artifact for the decision meeting.'
          },
          {
            title: 'Top risk',
            body: topUncertainties[0]?.uncertainty || 'No major uncertainty flagged',
            detail: topUncertainties[0]?.whyItMatters || governanceSummary.review_state.detail
          }
        ]
      case 'analyst':
        return [
          {
            title: 'Evidence posture',
            body: governanceSummary.evidence_backed_state.label,
            detail: governanceSummary.evidence_backed_state.detail
          },
          {
            title: 'Claim coverage',
            body: `${strategist.claim_to_evidence.length} mapped claims`,
            detail: strategist.claim_to_evidence.length > 0
              ? strategist.claim_to_evidence.map((claim) => claim.claim_text).slice(0, 2).join(' | ')
              : 'No claim-level evidence map is available yet.'
          },
          {
            title: 'Counter-pressure',
            body: topCountermoves[0]?.countermove || 'No primary countermove recorded',
            detail: topCountermoves[0]?.whyLikely || 'Use challenger reasoning to test the current recommendation.'
          }
        ]
      case 'operator':
        return [
          {
            title: 'Immediate move',
            body: (strategist.recommendation.primary_action || 'pending').replace(/_/g, ' '),
            detail: strategist.recommendation.rationale
          },
          {
            title: 'Watchpoints',
            body: topUncertainties.map((entry) => entry.signpost).filter(Boolean).slice(0, 2).join(' | ') || 'No watchpoints captured',
            detail: 'Use these signposts to decide whether the current plan still holds.'
          },
          {
            title: 'Response play',
            body: topCountermoves[0]?.recommendedResponse || 'No response play recorded',
            detail: topCountermoves[0]?.countermove || 'Response posture is derived from the current brief.'
          }
        ]
      case 'policy':
        return [
          {
            title: 'Stakeholder field',
            body: `${topActors.length} primary actors mapped`,
            detail: topActors.map((actor) => actor.name).join(', ') || 'No stakeholder map recorded'
          },
          {
            title: 'Second-order effects',
            body: topUncertainties[0]?.whyItMatters || 'No second-order effect noted',
            detail: topUncertainties[1]?.whyItMatters || governanceSummary.consensus_reliability?.detail || governanceSummary.review_state.detail
          },
          {
            title: 'Governance posture',
            body: governanceSummary.review_state.label,
            detail: governanceSummary.publish_blockers[0] || governanceSummary.review_state.detail
          }
        ]
      default:
        return []
    }
  }, [analysis, governanceSummary, multiAgentForecast, preset, strategist])

  if (!strategist) return null

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold text-white">
            <Users className="h-5 w-5 text-cyan-400" />
            Enterprise Briefing Layer
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Reframe the same analysis for executive, analyst, operator, or policy stakeholders without recomputation.
          </p>
        </div>
        {multiAgentForecast && (
          <div className="rounded-full border border-slate-600 bg-slate-900 px-3 py-1 text-xs text-slate-300">
            Champion {(multiAgentForecast.consensus.champion.probability * 100).toFixed(1)}% · {(multiAgentForecast.consensus.champion.confidence * 100).toFixed(0)}% confidence
          </div>
        )}
      </div>

      <div className="mb-5 grid gap-2 md:grid-cols-4">
        {PRESETS.map((option) => {
          const Icon = option.icon
          const active = option.id === preset
          return (
            <button
              key={option.id}
              onClick={() => setPreset(option.id)}
              className={`rounded-xl border p-4 text-left transition-colors ${
                active
                  ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'
                  : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-2 font-medium">
                <Icon className="h-4 w-4" />
                {option.label}
              </div>
              <div className="mt-1 text-xs opacity-80">{option.description}</div>
            </button>
          )
        })}
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <div className={`rounded-xl border px-4 py-3 ${governanceSummary.review_state.tone}`}>
          <div className="text-xs uppercase tracking-wide opacity-80">Review state</div>
          <div className="mt-1 font-medium">{governanceSummary.review_state.label}</div>
          <div className="mt-1 text-xs opacity-90">{governanceSummary.review_state.detail}</div>
        </div>
        <div className={`rounded-xl border px-4 py-3 ${governanceSummary.evidence_backed_state.tone}`}>
          <div className="text-xs uppercase tracking-wide opacity-80">Evidence status</div>
          <div className="mt-1 font-medium">{governanceSummary.evidence_backed_state.label}</div>
          <div className="mt-1 text-xs opacity-90">{governanceSummary.evidence_backed_state.detail}</div>
        </div>
        <div className={`rounded-xl border px-4 py-3 ${(governanceSummary.consensus_reliability || governanceSummary.review_state).tone}`}>
          <div className="text-xs uppercase tracking-wide opacity-80">Consensus quality</div>
          <div className="mt-1 font-medium">{governanceSummary.consensus_reliability?.label || 'Consensus still forming'}</div>
          <div className="mt-1 text-xs opacity-90">{governanceSummary.consensus_reliability?.detail || 'Consensus reliability becomes more precise as crowd or challenger signal matures.'}</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <div key={card.title} className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Target className="h-4 w-4 text-cyan-300" />
              {card.title}
            </div>
            <div className="mt-3 text-sm leading-6 text-slate-200">{card.body}</div>
            <div className="mt-3 text-xs leading-5 text-slate-400">{card.detail}</div>
          </div>
        ))}
      </div>

      {preset === 'analyst' && strategist.claim_to_evidence.length > 0 && (
        <div className="mt-5 rounded-xl border border-slate-700 bg-slate-900/70 p-4">
          <div className="mb-3 flex items-center gap-2 text-white">
            <Shield className="h-4 w-4 text-emerald-300" />
            <span className="font-medium">Analyst evidence view</span>
          </div>
          <div className="space-y-3">
            {strategist.claim_to_evidence.slice(0, 3).map((claim) => (
              <div key={claim.claim_id} className="rounded-lg border border-slate-700 bg-slate-800/80 p-3">
                <div className="text-sm font-medium text-slate-100">{claim.claim_text}</div>
                <div className="mt-2 text-xs text-slate-400">
                  {claim.evidence_refs.length > 0
                    ? claim.evidence_refs.map((ref) => `${ref.label} (${ref.support})`).join(' | ')
                    : 'No direct evidence mapping is available.'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
