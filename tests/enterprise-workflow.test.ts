import { describe, expect, it } from 'vitest'
import { buildGovernanceSummary } from '../src/lib/forecastGovernance'
import { buildEnterpriseEvidenceBundle, buildEnterpriseWorkflowStatus } from '../src/lib/enterpriseWorkflow'
import type { StrategistAnalysis } from '../src/lib/strategistContract'

const strategist: StrategistAnalysis = {
  executive_summary: 'Counter with one concrete improvement request and keep the fallback option active.',
  summary: 'A supplier is constrained but still exposed to timing pressure.',
  game_classification: {
    game_family: 'sequential_bargaining',
    domain: 'commodity_procurement',
    actor_count: 2,
    move_structure: 'sequential',
    information_structure: 'incomplete',
    decision_objective: 'Improve negotiated terms while preserving continuity and leverage.',
    confidence: 0.86,
    why_fit: 'The scenario is a supplier negotiation with incomplete information about flexibility and timing pressure.',
    doctrine_ids: ['sequential_bargaining'],
    template_id: 'vendor-price-increase-pushback'
  },
  actors: [],
  actor_map: [
    {
      actorId: 'supplier',
      name: 'Supplier',
      role: 'counterparty',
      objective: 'Protect margin and preserve timeline control.',
      leverage: ['delivery window'],
      constraint: ['quarter-end close'],
      likelyMove: 'Ask for scope relief before lowering price.'
    }
  ],
  outside_options: [
    {
      actorId: 'you',
      batna: 'Move a portion of volume to the secondary supplier if timing pressure proves real.',
      reservationValue: 'Do not accept a worse package than the alternate supply path plus timing buffer.',
      leverageNotes: ['secondary supply path', 'quarter-end timing pressure']
    }
  ],
  incentives: [],
  strategy_space: [],
  equilibria: [],
  opponent_types: [],
  countermoves: [
    {
      actorId: 'supplier',
      countermove: 'Offer a smaller discount tied to slower delivery',
      whyLikely: 'It preserves margin while looking cooperative.',
      warningLevel: 'medium',
      recommendedResponse: 'Trade speed for price only if the savings exceed the delivery risk.'
    }
  ],
  key_uncertainties: [
    {
      uncertainty: 'True delivery slack is unclear',
      whyItMatters: 'If the supplier has more slack than stated, the buyer can press harder.',
      signpost: 'Timeline flexibility in the next response',
      mitigation: 'Ask for a phased delivery alternative.'
    }
  ],
  claim_to_evidence: [
    {
      claim_id: 'claim_1',
      claim_text: 'The supplier is under time pressure.',
      evidence_refs: [
        {
          evidence_id: 'retrieval_1',
          label: 'Quarter-end earnings commentary',
          sourceType: 'market_reference',
          support: 'direct'
        }
      ],
      confidence: 0.78
    }
  ],
  provenance_status: 'evidence_backed',
  recommendation: {
    primary_action: 'counter_with_scope_guardrails',
    rationale: 'The buyer has leverage if delivery flexibility is real.',
    expected_outcome: 'A better price without materially higher execution risk.',
    key_insights: [],
    alternatives: []
  },
  dynamic_adjustments: [],
  biases: [],
  evidence: [
    {
      id: 'retrieval_1',
      label: 'Quarter-end earnings commentary',
      detail: 'Management guided tightly on shipment timing.',
      sourceType: 'market_reference'
    }
  ],
  confidence: 0.76,
  source: 'llm'
}

describe('enterprise workflow helpers', () => {
  it('summarizes governance using review, evidence, and consensus signals', () => {
    const summary = buildGovernanceSummary({
      governance: {
        canPublish: true,
        status: 'ready',
        blockers: [],
        reviewRequired: [],
        warnings: [],
        freshness: null
      },
      reviewState: {
        status: 'approved',
        reviewReason: null,
        evidenceBacked: true,
        createdAt: new Date().toISOString(),
        loading: false
      },
      consensus: {
        reliability: { score: 0.82 },
        participantCount: 11
      },
      evidenceCount: 4
    })

    expect(summary.review_state.label).toBe('Human-reviewed')
    expect(summary.evidence_backed_state.label).toBe('Evidence-backed')
    expect(summary.consensus_reliability?.label).toBe('High consensus reliability')
    expect(summary.publish_blockers).toHaveLength(0)
  })

  it('builds an evidence bundle that carries scenario and source context forward', () => {
    const bundle = buildEnterpriseEvidenceBundle({
      scenarioText: 'A supplier renegotiation is approaching quarter-end.',
      strategist,
      analysis: {
        scenario_text: 'A supplier renegotiation is approaching quarter-end.',
        retrievals: [
          {
            id: 'retrieval_1',
            title: 'Quarter-end earnings commentary',
            url: 'https://example.com/source',
            snippet: 'Management guided tightly on shipment timing.'
          }
        ],
        provenance: {
          evidence_backed: true,
          retrieval_count: 1,
          model: 'gemini'
        }
      }
    })

    expect(bundle.source_count).toBeGreaterThanOrEqual(2)
    expect(bundle.claim_count).toBe(1)
    expect(bundle.items[0].id).toBe('scenario_input')
  })

  it('asks for review when provenance or governance still needs clearance', () => {
    const status = buildEnterpriseWorkflowStatus({
      strategist: {
        ...strategist,
        provenance_status: 'llm_unverified'
      },
      reviewState: {
        status: null,
        reviewReason: null,
        evidenceBacked: false,
        createdAt: null,
        loading: false
      },
      draftReadiness: {
        issues: [],
        warnings: [],
        score: 4,
        status: 'review'
      },
      draftGovernance: {
        canPublish: false,
        status: 'review_required',
        blockers: [],
        reviewRequired: ['Linked analysis must complete human review before this public forecast is created.'],
        warnings: [],
        freshness: null
      }
    })

    expect(status.nextAction.action).toBe('request_review')
  })

  it('opens the governed draft once review and publish checks are clear', () => {
    const status = buildEnterpriseWorkflowStatus({
      strategist,
      reviewState: {
        status: 'approved',
        reviewReason: null,
        evidenceBacked: true,
        createdAt: new Date().toISOString(),
        loading: false
      },
      draftReadiness: {
        issues: [],
        warnings: [],
        score: 5,
        status: 'strong'
      },
      draftGovernance: {
        canPublish: true,
        status: 'ready',
        blockers: [],
        reviewRequired: [],
        warnings: [],
        freshness: null
      }
    })

    expect(status.nextAction.action).toBe('open_forecast_draft')
    expect(status.steps.find((step) => step.id === 'draft')?.status).toBe('complete')
  })
})
