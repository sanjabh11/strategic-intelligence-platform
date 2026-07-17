import {
  parseStructuredPayload,
  sanitizeStructuredPayload,
  type StrategistProviderInput,
  type StructuredStrategistPayload
} from './strategist-provider.ts'
import { coerceAdvancedFrameworkEnvelope } from './advanced-frameworks.ts'
import { buildDoctrinePromptPack } from '../../../shared/gameTheoryKnowledge.ts'

function buildInput(): StrategistProviderInput {
  const promptPack = buildDoctrinePromptPack({
    scenarioText: 'The supplier opened with a 14% increase. I have one weaker alternate supplier and can trade term length for price relief.',
    domainHint: 'commodity_procurement',
    evidenceIds: ['evidence_1', 'evidence_2']
  })

  return {
    title: 'Negotiate supplier renewal',
    description: 'The supplier opened with a 14% increase. I have one weaker alternate supplier and can trade term length for price relief.',
    category: 'business',
    fallback: {},
    systemPrompt: 'Return structured strategist JSON.',
    scenarioClassification: promptPack.classifier,
    promptPack,
    evidenceContext: [
      { id: 'evidence_1', label: 'Supplier increase', detail: 'Supplier opened at +14%', sourceType: 'user_input' },
      { id: 'evidence_2', label: 'Outside option', detail: 'Alternate supplier exists but is weaker', sourceType: 'user_input' }
    ]
  }
}

function buildPayload(overrides: Partial<StructuredStrategistPayload> = {}): StructuredStrategistPayload {
  return {
    executive_summary: 'Counter with a bounded ask and keep the BATNA visible.',
    summary: 'Use a calibrated counter instead of accepting the first increase.',
    game_classification: {
      game_family: 'sequential_bargaining',
      domain: 'commodity_procurement',
      actor_count: 2,
      move_structure: 'sequential',
      information_structure: 'incomplete',
      decision_objective: 'Improve terms while preserving leverage.',
      confidence: 0.8,
      why_fit: 'This is a multi-round bargaining problem.',
      doctrine_ids: ['sequential_bargaining'],
      template_id: 'vendor-price-increase-pushback'
    },
    actors: [
      { id: 'you', name: 'You', role: 'buyer', objectives: ['lower total cost'] },
      { id: 'actor_1', name: 'Supplier', role: 'counterparty', objectives: ['protect margin'] }
    ],
    actor_map: [{
      actorId: 'you',
      name: 'You',
      role: 'buyer',
      objective: 'Lower total cost',
      leverage: ['alternate supplier'],
      constraint: ['continuity'],
      likelyMove: 'counter'
    }],
    outside_options: [{
      actorId: 'you',
      batna: 'Shift some volume.',
      reservationValue: 'Do not accept worse than the alternate path.',
      leverageNotes: ['alternate supplier']
    }],
    incentives: [{ actorId: 'you', incentives: ['better price'], leverage: ['alternate supplier'], constraints: ['continuity'] }],
    strategy_space: [{ actorId: 'you', options: [{ action: 'counter', expectedValue: 82, rationale: 'best EV', riskLevel: 'medium' }] }],
    equilibria: [{ name: 'Guarded compromise', profile: { you: 'counter' }, whyItHolds: 'Both sides preserve value.', stability: 0.72 }],
    opponent_types: [{ label: 'Flexible', probability: 0.5, tell: 'asks exploratory questions', recommendedAdjustment: 'trade terms' }],
    countermoves: [{ actorId: 'actor_1', countermove: 'Narrow scope elsewhere.', whyLikely: 'Protects precedent.', warningLevel: 'medium', recommendedResponse: 'Ask for reciprocal movement.' }],
    key_uncertainties: [{ uncertainty: 'True deadline pressure', whyItMatters: 'Changes leverage.', signpost: 'Whether they ask for fast closure', mitigation: 'Prepare a fast-close and walkaway-ready response.' }],
    claim_to_evidence: [{
      claim_id: 'claim_1',
      claim_text: 'The alternate supplier improves your bargaining leverage.',
      evidence_refs: [{ evidence_id: 'evidence_2', label: 'Outside option', sourceType: 'user_input', support: 'direct' }],
      confidence: 0.73
    }],
    provenance_status: 'evidence_backed',
    recommendation: {
      primary_action: 'counter',
      rationale: 'Preserve leverage and extract one concrete improvement.',
      expected_outcome: 'Improved pricing or a cleaner walkaway decision.',
      confidence_interval: [68, 84],
      key_insights: ['keep BATNA visible'],
      alternatives: [{ action: 'accept', expected_value: 60, risk_level: 'low' }]
    },
    dynamic_adjustments: [{ trigger: 'supplier signals hard deadline', adjustment: 'Compress to one concrete counterproposal.', reason: 'Time pressure lowers probing value.' }],
    biases: [{ type: 'anchoring', confidence: 0.65, description: 'The opening increase can distort judgment.', intervention: 'Reset to total package value.' }],
    evidence: [
      { id: 'evidence_1', label: 'Supplier increase', detail: 'Supplier opened at +14%', sourceType: 'user_input' },
      { id: 'evidence_2', label: 'Outside option', detail: 'Alternate supplier exists but is weaker', sourceType: 'user_input' }
    ],
    advanced_game_inputs: {
      bounded_rationality: {
        players: ['you', 'actor_1'],
        actions_by_player: [['counter', 'accept'], ['hold', 'concede']],
        payoff_matrix: [
          [[3, 2], [1, 4]],
          [[2, 1], [0, 3]]
        ],
        lambda: 0.2
      }
    },
    confidence: 0.77,
    ...overrides
  }
}

Deno.test('sanitizeStructuredPayload keeps valid evidence-backed claims intact', () => {
  const sanitized = sanitizeStructuredPayload(buildPayload(), buildInput())

  if (!sanitized) {
    throw new Error('expected sanitized payload')
  }

  if (sanitized.claim_to_evidence[0]?.evidence_refs[0]?.evidence_id !== 'evidence_2') {
    throw new Error('expected valid evidence id to survive')
  }
  if (sanitized.provenance_status !== 'evidence_backed') {
    throw new Error('expected provenance to remain evidence_backed')
  }
  if (sanitized.advanced_game_inputs?.bounded_rationality?.lambda !== 0.2) {
    throw new Error('expected valid advanced game inputs to survive')
  }
})

Deno.test('sanitizeStructuredPayload filters invented evidence ids and downgrades provenance', () => {
  const sanitized = sanitizeStructuredPayload(
    buildPayload({
      claim_to_evidence: [{
        claim_id: 'claim_1',
        claim_text: 'The supplier is using continuity pressure to force a concession.',
        evidence_refs: [
          { evidence_id: 'evidence_1', label: 'Supplier increase', sourceType: 'user_input', support: 'partial' },
          { evidence_id: 'user_input_continuity', label: 'Invented evidence', sourceType: 'user_input', support: 'inferred' }
        ],
        confidence: 0.64
      }]
    }),
    buildInput()
  )

  if (!sanitized) {
    throw new Error('expected sanitized payload')
  }

  if (sanitized.claim_to_evidence[0]?.evidence_refs.length !== 1) {
    throw new Error('expected invented evidence ref to be filtered')
  }
  if (sanitized.provenance_status !== 'llm_unverified') {
    throw new Error('expected provenance downgrade after filtering')
  }
})

Deno.test('sanitizeStructuredPayload downgrades provenance and records diagnostics when no valid evidence refs remain', () => {
  const sanitized = sanitizeStructuredPayload(
    buildPayload({
      claim_to_evidence: [{
        claim_id: 'claim_1',
        claim_text: 'This claim references only invented evidence.',
        evidence_refs: [{ evidence_id: 'user_input_term_length', label: 'Invented', sourceType: 'user_input', support: 'inferred' }],
        confidence: 0.4
      }]
    }),
    buildInput()
  )

  if (!sanitized) {
    throw new Error('expected sanitized payload')
  }
  if (sanitized.provenance_status !== 'llm_unverified') {
    throw new Error('expected provenance downgrade when all evidence refs are filtered')
  }
  if (sanitized.claim_to_evidence.length !== 0) {
    throw new Error('expected claim_to_evidence to be emptied when no valid refs remain')
  }
  if (sanitized.diagnostics?.evidence_claims_stripped !== true) {
    throw new Error('expected evidence_claims_stripped diagnostic')
  }
  if (sanitized.diagnostics?.evidence_claims_original_count !== 1 || sanitized.diagnostics?.evidence_claims_kept_count !== 0) {
    throw new Error('expected claim count diagnostics to reflect total stripping')
  }
  if (sanitized.diagnostics?.claim_to_evidence_rejection_reason !== 'all_claims_filtered_after_evidence_validation') {
    throw new Error('expected explicit claim rejection reason')
  }
})

Deno.test('parseStructuredPayload recovers fenced JSON with trailing commentary', () => {
  const payload = buildPayload()
  const rawText = `Here is the strategist payload:\n\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\`\n\nUse the coalition view as the primary lens.`
  const parsed = parseStructuredPayload(rawText)

  if (parsed.executive_summary !== payload.executive_summary) {
    throw new Error('expected fenced JSON payload to parse correctly')
  }
  if (parsed.game_classification.game_family !== payload.game_classification.game_family) {
    throw new Error('expected structured classification to survive defensive parsing')
  }
})

Deno.test('sanitizeStructuredPayload falls back to deterministic classification when the model returns an incompatible one', () => {
  const sanitized = sanitizeStructuredPayload(
    buildPayload({
      game_classification: {
        game_family: 'extensive_form',
        domain: 'competitive_strategy',
        actor_count: 2,
        move_structure: 'sequential',
        information_structure: 'complete',
        decision_objective: 'Test entry deterrence.',
        confidence: 0.88,
        why_fit: 'Move order dominates.',
        doctrine_ids: ['extensive_form_spe'],
        template_id: 'entry-deterrence-retaliatory-sequence'
      }
    }),
    buildInput()
  )

  if (!sanitized) {
    throw new Error('expected sanitized payload')
  }

  if (sanitized.game_classification.game_family !== 'sequential_bargaining') {
    throw new Error('expected fallback classification to restore bargaining family')
  }
  if (sanitized.game_classification.template_id === 'entry-deterrence-retaliatory-sequence') {
    throw new Error('expected incompatible template to be replaced')
  }
  if (sanitized.provenance_status !== 'llm_unverified') {
    throw new Error('expected classification correction to downgrade provenance')
  }
})

Deno.test('sanitizeStructuredPayload rejects malformed coalition keys inside advanced inputs', () => {
  const sanitized = sanitizeStructuredPayload(
    buildPayload({
      actors: [
        { id: 'P1', name: 'P1', role: 'bloc', objectives: ['win'] },
        { id: 'P2', name: 'P2', role: 'bloc', objectives: ['win'] },
        { id: 'P3', name: 'P3', role: 'bloc', objectives: ['win'] }
      ],
      advanced_game_inputs: {
        coalitional: {
          players: ['P1', 'P2', 'P3'],
          coalition_values: {
            'P1|P4': 1
          }
        }
      }
    }),
    buildInput()
  )

  if (!sanitized) {
    throw new Error('expected sanitized payload')
  }

  if (sanitized.advanced_game_inputs?.coalitional) {
    throw new Error('expected malformed coalition payload to be removed')
  }
})

Deno.test('coerceAdvancedFrameworkEnvelope downgrades malformed researcher payloads without dropping the whole response', () => {
  const incomplete = coerceAdvancedFrameworkEnvelope('signaling', {
    framework: 'signaling',
    status: 'heuristic',
    summary: 'Potential signaling fit.',
    diagnostics: {},
    warnings: [],
  })

  if (!incomplete) {
    throw new Error('expected incomplete envelope')
  }
  if (incomplete.status !== 'incomplete_inputs') {
    throw new Error(`expected incomplete_inputs status, got ${incomplete.status}`)
  }

  const rejected = coerceAdvancedFrameworkEnvelope('coalitional', {
    framework: 'coalitional',
    status: 'heuristic',
    summary: 'Malformed coalition example.',
    normalized_inputs: {
      players: ['P1', 'P2', 'P3'],
      coalition_values: { 'P1|P4': 1 },
    },
    diagnostics: {},
    warnings: [],
  })

  if (!rejected) {
    throw new Error('expected rejected envelope')
  }
  if (rejected.status !== 'rejected') {
    throw new Error(`expected rejected status, got ${rejected.status}`)
  }
  if (!Array.isArray(rejected.diagnostics?.errors) || rejected.diagnostics.errors.length === 0) {
    throw new Error('expected diagnostics errors for rejected framework')
  }
})
