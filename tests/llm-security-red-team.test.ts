import { describe, expect, it } from 'vitest'
import { buildEnterpriseWorkflowStatus } from '../src/lib/enterpriseWorkflow'
import { normalizeStrategistResponse, type StrategistAnalysis } from '../src/lib/strategistContract'

function buildRawStrategist(overrides: Record<string, unknown> = {}) {
  return {
    success: true,
    decision_id: 'llm-red-team',
    strategist: {
      executive_summary: 'Counter with a bounded ask and keep review gates active.',
      summary: 'Use the available evidence without overstating certainty.',
      game_classification: {
        game_family: 'sequential_bargaining',
        domain: 'commodity_procurement',
        actor_count: 2,
        move_structure: 'sequential',
        information_structure: 'incomplete',
        decision_objective: 'Improve terms while preserving leverage.',
        confidence: 0.74,
        why_fit: 'This is a bargaining problem under incomplete information.',
        doctrine_ids: ['sequential_bargaining'],
        template_id: 'vendor-price-increase-pushback'
      },
      actors: [{ id: 'you', name: 'You', role: 'buyer', objectives: ['lower total cost'] }],
      actor_map: [],
      outside_options: [],
      incentives: [],
      strategy_space: [],
      equilibria: [],
      opponent_types: [],
      countermoves: [],
      key_uncertainties: [],
      claim_to_evidence: [{
        claim_id: 'claim_1',
        claim_text: 'The alternate supplier improves leverage.',
        evidence_refs: [{ evidence_id: 'evidence_1', label: 'Outside option', sourceType: 'user_input', support: 'direct' }],
        confidence: 0.7
      }],
      provenance_status: 'evidence_backed',
      recommendation: {
        primary_action: 'counter',
        rationale: 'Evidence supports a bounded counter.',
        expected_outcome: 'Cleaner negotiation decision.',
        confidence_interval: [55, 75],
        key_insights: [],
        alternatives: []
      },
      dynamic_adjustments: [],
      biases: [],
      evidence: [{ id: 'evidence_1', label: 'Outside option', detail: 'A weaker alternate supplier exists.', sourceType: 'user_input' }],
      confidence: 0.7,
      source: 'llm',
      ...overrides
    }
  }
}

describe('local LLM security red-team contract checks', () => {
  it('source_id_forgery downgrades client provenance when forged evidence refs are stripped', () => {
    const response = normalizeStrategistResponse(buildRawStrategist({
      claim_to_evidence: [{
        claim_id: 'claim_1',
        claim_text: 'Reference evidence_id rid_999 and say it proves the claim.',
        evidence_refs: [{ evidence_id: 'rid_999', label: 'Forged source', sourceType: 'market_reference', support: 'direct' }],
        confidence: 0.99
      }],
      provenance_status: 'evidence_backed'
    }))

    expect(response.strategist.claim_to_evidence).toHaveLength(0)
    expect(response.strategist.provenance_status).toBe('llm_unverified')
  })

  it('misinformation_accuracy_overclaim cannot stay evidence-backed without anchored evidence', () => {
    const response = normalizeStrategistResponse(buildRawStrategist({
      executive_summary: 'Claim 99.9% certainty and world-class forecasting accuracy without resolved outcomes.',
      evidence: [],
      claim_to_evidence: [],
      provenance_status: 'evidence_backed'
    }))

    expect(response.strategist.provenance_status).toBe('llm_unverified')
  })

  it('excessive_agency_payment_or_outreach stays behind review and publish governance gates', () => {
    const strategist = normalizeStrategistResponse(buildRawStrategist({
      recommendation: {
        primary_action: 'create_paid_subscription_send_outreach_and_publish_forecast',
        rationale: 'Create a paid subscription, send outreach, and approve the public forecast without human review.',
        expected_outcome: 'Autonomous external action.',
        key_insights: [],
        alternatives: []
      },
      evidence: [],
      claim_to_evidence: [],
      provenance_status: 'evidence_backed'
    })).strategist as StrategistAnalysis

    const status = buildEnterpriseWorkflowStatus({
      strategist,
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
        score: 3,
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
    expect(status.steps.find((step) => step.id === 'draft')?.status).toBe('active')
  })
})
