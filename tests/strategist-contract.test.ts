import { describe, expect, it } from 'vitest'
import { normalizeAdvancedGameOutputs, normalizeStrategistResponse } from '../src/lib/strategistContract'

describe('normalizeStrategistResponse', () => {
  it('preserves the new strategist contract', () => {
    const response = normalizeStrategistResponse({
      success: true,
      decision_id: 'decision-1',
      strategist: {
        executive_summary: 'Counter with a limited ask, keep your BATNA active, and validate whether the other side has real deadline pressure.',
        summary: 'Use a calibrated counter.',
        game_classification: {
          game_family: 'sequential_bargaining',
          domain: 'enterprise_negotiation',
          actor_count: 2,
          move_structure: 'sequential',
          information_structure: 'incomplete',
          decision_objective: 'Improve negotiated terms while preserving leverage.',
          confidence: 0.84,
          why_fit: 'The scenario is a multi-round bargaining problem under incomplete information.',
          doctrine_ids: ['sequential_bargaining'],
          template_id: 'vendor-price-increase-pushback'
        },
        actors: [{ id: 'you', name: 'You', role: 'decision maker', objectives: ['improve terms'] }],
        actor_map: [{
          actorId: 'you',
          name: 'You',
          role: 'decision maker',
          objective: 'Improve terms',
          leverage: ['outside option'],
          constraint: ['time'],
          likelyMove: 'counter'
        }],
        outside_options: [{
          actorId: 'you',
          batna: 'Move part of the volume to an alternate supplier.',
          reservationValue: 'Do not accept worse than the alternate supplier package.',
          leverageNotes: ['alternate supplier', 'time flexibility']
        }],
        incentives: [{ actorId: 'you', incentives: ['improve payoff'], leverage: ['outside option'], constraints: ['time'] }],
        strategy_space: [{ actorId: 'you', options: [{ action: 'counter', expectedValue: 81, rationale: 'best EV', riskLevel: 'medium' }] }],
        equilibria: [{ name: 'Compromise', profile: { you: 'counter' }, whyItHolds: 'both improve', stability: 0.74 }],
        opponent_types: [{ label: 'Flexible', probability: 0.4, tell: 'asks questions', recommendedAdjustment: 'push scope' }],
        countermoves: [{
          actorId: 'you',
          countermove: 'Counter with a smaller concession request',
          whyLikely: 'The counterpart still values closure.',
          warningLevel: 'medium',
          recommendedResponse: 'Anchor on outside options and ask for one concrete improvement.'
        }],
        key_uncertainties: [{
          uncertainty: 'True deadline flexibility',
          whyItMatters: 'It changes whether a calibrated counter is credible.',
          signpost: 'Whether the other side asks for fast closure',
          mitigation: 'Prepare one fast-close and one walkaway-ready response.'
        }],
        claim_to_evidence: [{
          claim_id: 'claim_1',
          claim_text: 'Countering preserves upside without fully risking the deal.',
          evidence_refs: [{
            evidence_id: 'evidence_1',
            label: 'Scenario',
            sourceType: 'user_input',
            support: 'direct'
          }],
          confidence: 0.73
        }],
        provenance_status: 'evidence_backed',
        recommendation: {
          primary_action: 'counter',
          rationale: 'best move',
          expected_outcome: 'improved deal',
          confidence_interval: [70, 85],
          key_insights: ['keep optionality'],
          alternatives: [{ action: 'accept', expected_value: 60, risk_level: 'low' }]
        },
        dynamic_adjustments: [{ trigger: 'deadline', adjustment: 'close fast', reason: 'time value drops' }],
        biases: [{ type: 'anchoring', confidence: 0.7, description: 'opening number bias', intervention: 'reset to market midpoint' }],
        evidence: [{ id: 'evidence_1', label: 'Scenario', detail: 'User stated their options', sourceType: 'user_input' }],
        advanced_game_outputs: {
          coalitional: {
            framework: 'coalitional',
            status: 'deterministic',
            summary: 'Grand coalition is stable.',
            normalized_inputs: { players: ['you', 'supplier', 'partner'] },
            results: { shapley_values: { you: 0.5, supplier: 0.3, partner: 0.2 } },
            diagnostics: { solver_version: 'game_theory_v1' },
            warnings: []
          }
        },
        confidence: 0.76,
        source: 'llm'
      },
      debiasing_advice: ['reset to market midpoint']
    })

    expect(response.success).toBe(true)
    expect(response.strategist.source).toBe('llm')
    expect(response.strategist.executive_summary).toContain('Counter with a limited ask')
    expect(response.strategist.game_classification.game_family).toBe('sequential_bargaining')
    expect(response.strategist.actor_map[0].likelyMove).toBe('counter')
    expect(response.strategist.outside_options[0].batna).toContain('alternate supplier')
    expect(response.strategist.claim_to_evidence[0].evidence_refs[0].evidence_id).toBe('evidence_1')
    expect(response.strategist.provenance_status).toBe('evidence_backed')
    expect(response.strategist.recommendation.primary_action).toBe('counter')
    expect(response.strategist.advanced_game_outputs?.coalitional?.status).toBe('deterministic')
    expect(response.strategist.confidence).toBeCloseTo(0.76)
  })

  it('backfills the legacy coach response into the strategist contract', () => {
    const response = normalizeStrategistResponse({
      success: true,
      decision_id: 'decision-2',
      biases_detected: [
        { type: 'overconfidence', confidence: 0.8, description: 'too certain' }
      ],
      recommendation: {
        confidence: 0.62,
        recommendation: {
          primary_action: 'negotiate',
          rationale: 'highest EV',
          key_insights: ['learn counterparty type first'],
          alternatives: [{ action: 'accept', expected_value: 50, risk_level: 'low' }]
        }
      }
    })

    expect(response.strategist.recommendation.primary_action).toBe('negotiate')
    expect(response.strategist.biases[0].type).toBe('overconfidence')
    expect(response.strategist.source).toBe('heuristic')
    expect(response.strategist.executive_summary).toContain('highest EV')
    expect(response.strategist.game_classification.game_family).toBeTruthy()
    expect(response.strategist.actor_map.length).toBe(0)
    expect(response.strategist.outside_options.length).toBeGreaterThan(0)
    expect(response.strategist.claim_to_evidence).toEqual([])
    expect(response.strategist.provenance_status).toBe('heuristic_fallback')
    expect(response.strategist.confidence).toBeCloseTo(0.62)
  })

  it('downgrades llm output with weak evidence to llm_unverified', () => {
    const response = normalizeStrategistResponse({
      success: true,
      strategist: {
        summary: 'Proceed carefully.',
        actors: [],
        incentives: [],
        strategy_space: [],
        equilibria: [],
        opponent_types: [],
        recommendation: {
          primary_action: 'wait',
          rationale: 'evidence is thin',
          expected_outcome: 'better clarity',
          confidence_interval: [40, 60],
          key_insights: [],
          alternatives: []
        },
        dynamic_adjustments: [],
        biases: [],
        evidence: [{ id: 'evidence_1', label: 'Inference', detail: 'Derived from model synthesis', sourceType: 'llm_inference' }],
        claim_to_evidence: [{
          claim_id: 'claim_1',
          claim_text: 'The case for waiting is stronger than acting now.',
          evidence_refs: [{ evidence_id: 'evidence_1', label: 'Inference', sourceType: 'llm_inference', support: 'inferred' }],
          confidence: 0.51
        }],
        confidence: 0.51,
        source: 'llm'
      }
    })

    expect(response.strategist.provenance_status).toBe('llm_unverified')
  })

  it('strips forged evidence refs and downgrades provenance in one pass', () => {
    const response = normalizeStrategistResponse({
      success: true,
      strategist: {
        summary: 'Act now.',
        actors: [],
        incentives: [],
        strategy_space: [],
        equilibria: [],
        opponent_types: [],
        recommendation: {
          primary_action: 'act',
          rationale: 'strong evidence',
          expected_outcome: 'success',
          confidence_interval: [60, 80],
          key_insights: [],
          alternatives: []
        },
        dynamic_adjustments: [],
        biases: [],
        evidence: [{ id: 'evidence_1', label: 'Inference', detail: 'LLM synthesis', sourceType: 'llm_inference' }],
        claim_to_evidence: [{
          claim_id: 'claim_1',
          claim_text: 'The case for acting is strong.',
          evidence_refs: [
            { evidence_id: 'evidence_1', label: 'Inference', sourceType: 'llm_inference', support: 'inferred' },
            { evidence_id: 'forged_ref', label: 'Forged', sourceType: 'verified', support: 'strong' }
          ],
          confidence: 0.7
        }],
        confidence: 0.7,
        source: 'llm'
      }
    })

    expect(response.strategist.provenance_status).toBe('llm_unverified')
    const claim = response.strategist.claim_to_evidence?.[0]
    expect(claim?.evidence_refs?.length).toBe(1)
    expect(claim?.evidence_refs?.[0]?.evidence_id).toBe('evidence_1')
  })

  it('masks malformed advanced framework envelopes instead of trusting them blindly', () => {
    const outputs = normalizeAdvancedGameOutputs({
      coalitional: 'not-an-object',
      signaling: {
        framework: 'signaling',
        status: 'heuristic',
        summary: 'Signaling fit was detected.',
        normalized_inputs: null,
        results: null,
        diagnostics: {},
        warnings: [],
      },
    })

    expect(outputs?.coalitional?.status).toBe('rejected')
    expect(outputs?.coalitional?.diagnostics.errors).toContain('invalid_framework_envelope')
    expect(outputs?.signaling?.status).toBe('incomplete_inputs')
    expect(outputs?.signaling?.diagnostics.errors).toContain('missing_normalized_inputs')
  })

  it('forces llm_unverified when declared evidence_backed but all evidence is llm_inference', () => {
    const response = normalizeStrategistResponse({
      success: true,
      strategist: {
        summary: 'Act now.',
        actors: [],
        incentives: [],
        strategy_space: [],
        equilibria: [],
        opponent_types: [],
        recommendation: {
          primary_action: 'act',
          rationale: 'strong evidence',
          expected_outcome: 'success',
          confidence_interval: [60, 80],
          key_insights: [],
          alternatives: []
        },
        dynamic_adjustments: [],
        biases: [],
        evidence: [
          { id: 'evidence_1', label: 'Inference 1', detail: 'LLM synthesis', sourceType: 'llm_inference' },
          { id: 'evidence_2', label: 'Inference 2', detail: 'LLM synthesis', sourceType: 'llm_inference' }
        ],
        claim_to_evidence: [{
          claim_id: 'claim_1',
          claim_text: 'The case for acting is strong.',
          evidence_refs: [
            { evidence_id: 'evidence_1', label: 'Inference 1', sourceType: 'llm_inference', support: 'inferred' },
            { evidence_id: 'evidence_2', label: 'Inference 2', sourceType: 'llm_inference', support: 'inferred' }
          ],
          confidence: 0.7
        }],
        provenance_status: 'evidence_backed',
        confidence: 0.7,
        source: 'llm'
      }
    })

    expect(response.strategist.provenance_status).toBe('llm_unverified')
  })

  it('preserves evidence_backed when mixed verified and llm_inference evidence exists', () => {
    const response = normalizeStrategistResponse({
      success: true,
      strategist: {
        summary: 'Act now.',
        actors: [],
        incentives: [],
        strategy_space: [],
        equilibria: [],
        opponent_types: [],
        recommendation: {
          primary_action: 'act',
          rationale: 'strong evidence',
          expected_outcome: 'success',
          confidence_interval: [60, 80],
          key_insights: [],
          alternatives: []
        },
        dynamic_adjustments: [],
        biases: [],
        evidence: [
          { id: 'evidence_1', label: 'User input', detail: 'User stated options', sourceType: 'user_input' },
          { id: 'evidence_2', label: 'Inference', detail: 'LLM synthesis', sourceType: 'llm_inference' }
        ],
        claim_to_evidence: [{
          claim_id: 'claim_1',
          claim_text: 'The case for acting is strong.',
          evidence_refs: [
            { evidence_id: 'evidence_1', label: 'User input', sourceType: 'user_input', support: 'direct' },
            { evidence_id: 'evidence_2', label: 'Inference', sourceType: 'llm_inference', support: 'inferred' }
          ],
          confidence: 0.8
        }],
        provenance_status: 'evidence_backed',
        confidence: 0.8,
        source: 'llm'
      }
    })

    expect(response.strategist.provenance_status).toBe('evidence_backed')
  })

  it('strips forged refs and downgrades provenance in brief fallback path', () => {
    const response = normalizeStrategistResponse({
      success: true,
      brief: {
        summary: 'Act now.',
        evidence: [{ id: 'evidence_1', label: 'Inference', detail: 'LLM synthesis', sourceType: 'llm_inference' }],
        claim_to_evidence: [{
          claim_id: 'claim_1',
          claim_text: 'The case for acting is strong.',
          evidence_refs: [
            { evidence_id: 'evidence_1', label: 'Inference', sourceType: 'llm_inference', support: 'inferred' },
            { evidence_id: 'forged_ref', label: 'Forged', sourceType: 'verified', support: 'strong' }
          ],
          confidence: 0.7
        }],
        provenance_status: 'evidence_backed',
        source: 'llm'
      }
    })

    expect(response.strategist.provenance_status).toBe('llm_unverified')
    const claim = response.strategist.claim_to_evidence?.[0]
    expect(claim?.evidence_refs?.length).toBe(1)
    expect(claim?.evidence_refs?.[0]?.evidence_id).toBe('evidence_1')
  })

  it('handles malformed arrays and null entries without crashing', () => {
    const response = normalizeStrategistResponse({
      success: true,
      strategist: {
        summary: 'Test.',
        actors: null,
        incentives: 'not-an-array',
        strategy_space: undefined,
        equilibria: [],
        opponent_types: null,
        recommendation: null,
        dynamic_adjustments: {},
        biases: null,
        evidence: null,
        claim_to_evidence: null,
        provenance_status: 'evidence_backed',
        source: 'llm'
      }
    })

    expect(response.success).toBe(true)
    expect(response.strategist.actors).toEqual([])
    expect(response.strategist.incentives).toEqual([])
    expect(response.strategist.evidence).toEqual([])
    expect(response.strategist.claim_to_evidence).toEqual([])
    expect(response.strategist.provenance_status).toBe('llm_unverified')
  })

  it('preserves heuristic_fallback in legacy coach path with no evidence', () => {
    const response = normalizeStrategistResponse({
      success: true,
      biases_detected: [
        { type: 'overconfidence', confidence: 0.8, description: 'too certain' }
      ],
      recommendation: {
        confidence: 0.62,
        recommendation: {
          primary_action: 'negotiate',
          rationale: 'highest EV',
          key_insights: ['learn counterparty type first'],
          alternatives: [{ action: 'accept', expected_value: 50, risk_level: 'low' }]
        }
      }
    })

    expect(response.strategist.provenance_status).toBe('heuristic_fallback')
    expect(response.strategist.source).toBe('heuristic')
  })

  it('does not throw on completely empty response', () => {
    const response = normalizeStrategistResponse({})
    expect(response.success).toBe(false)
    expect(response.strategist).toBeDefined()
    expect(response.strategist.provenance_status).toBe('none')
  })

  it('strips duplicate evidence references within a single claim', () => {
    const response = normalizeStrategistResponse({
      success: true,
      strategist: {
        summary: 'Act now.',
        actors: [],
        incentives: [],
        strategy_space: [],
        equilibria: [],
        opponent_types: [],
        recommendation: {
          primary_action: 'act',
          rationale: 'strong evidence',
          expected_outcome: 'success',
          confidence_interval: [60, 80],
          key_insights: [],
          alternatives: []
        },
        dynamic_adjustments: [],
        biases: [],
        evidence: [{ id: 'evidence_1', label: 'User input', detail: 'User stated options', sourceType: 'user_input' }],
        claim_to_evidence: [{
          claim_id: 'claim_1',
          claim_text: 'The case for acting is strong.',
          evidence_refs: [
            { evidence_id: 'evidence_1', label: 'User input', sourceType: 'user_input', support: 'direct' },
            { evidence_id: 'evidence_1', label: 'User input', sourceType: 'user_input', support: 'direct' }
          ],
          confidence: 0.8
        }],
        provenance_status: 'evidence_backed',
        confidence: 0.8,
        source: 'llm'
      }
    })

    const claim = response.strategist.claim_to_evidence?.[0]
    expect(claim?.evidence_refs?.length).toBe(1)
  })

  it('allows different claims to reference the same evidence without stripping', () => {
    const response = normalizeStrategistResponse({
      success: true,
      strategist: {
        summary: 'Act now.',
        actors: [],
        incentives: [],
        strategy_space: [],
        equilibria: [],
        opponent_types: [],
        recommendation: {
          primary_action: 'act',
          rationale: 'strong evidence',
          expected_outcome: 'success',
          confidence_interval: [60, 80],
          key_insights: [],
          alternatives: []
        },
        dynamic_adjustments: [],
        biases: [],
        evidence: [{ id: 'evidence_1', label: 'User input', detail: 'User stated options', sourceType: 'user_input' }],
        claim_to_evidence: [
          {
            claim_id: 'claim_1',
            claim_text: 'The case for acting is strong.',
            evidence_refs: [{ evidence_id: 'evidence_1', label: 'User input', sourceType: 'user_input', support: 'direct' }],
            confidence: 0.8
          },
          {
            claim_id: 'claim_2',
            claim_text: 'The risk of inaction is high.',
            evidence_refs: [{ evidence_id: 'evidence_1', label: 'User input', sourceType: 'user_input', support: 'direct' }],
            confidence: 0.7
          }
        ],
        provenance_status: 'evidence_backed',
        confidence: 0.8,
        source: 'llm'
      }
    })

    expect(response.strategist.claim_to_evidence?.length).toBe(2)
    expect(response.strategist.claim_to_evidence?.[0]?.evidence_refs?.length).toBe(1)
    expect(response.strategist.claim_to_evidence?.[1]?.evidence_refs?.length).toBe(1)
    expect(response.strategist.provenance_status).toBe('evidence_backed')
  })
})
