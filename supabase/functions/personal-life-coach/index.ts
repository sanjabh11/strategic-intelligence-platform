import { createClient } from 'npm:@supabase/supabase-js@2'
import { getAuthenticatedUser, jsonResponse } from '../_shared/auth.ts'
import { checkRateLimit, logApiUsage, rateLimitResponse } from '../_shared/rate-limiter.ts'
import { LIFE_COACH_PROMPT } from '../_shared/life-coach-prompt.ts'
import { maybeCallMlService } from '../_shared/ml-platform.ts'
import { generateStrategistPayload } from '../_shared/strategist-provider.ts'
import { sanitizeAdvancedGameInputs, type AdvancedGameInputs } from '../_shared/advanced-frameworks.ts'
import { buildDoctrinePromptPack, buildDoctrinePromptText, type PromptPack, type ScenarioClassification, type ScenarioDomain } from '../../../shared/gameTheoryKnowledge.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const BIAS_PATTERNS = {
  anchoring: {
    keywords: ['first offer', 'initial price', 'starting point', 'opening bid'],
    warning: 'You may be anchoring on the first number mentioned. Rebuild your walkaway point from your BATNA, not their opener.'
  },
  sunk_cost: {
    keywords: ['already invested', 'spent so much', 'wasted', 'too far in'],
    warning: 'Past investments should not control the next move. Re-evaluate from today forward.'
  },
  confirmation: {
    keywords: ['confirms what i thought', 'as expected', 'proves my point'],
    warning: 'You may be searching for confirming evidence instead of disconfirming signals.'
  },
  overconfidence: {
    keywords: ['definitely', 'certainly', '100%', 'no doubt', 'guaranteed'],
    warning: 'Your confidence language is stronger than the evidence set. Keep optionality.'
  },
  loss_aversion: {
    keywords: ['afraid to lose', 'scared of losing', 'risk averse', 'cant afford to'],
    warning: 'Loss aversion is pulling attention toward downside rather than expected value.'
  },
  status_quo: {
    keywords: ['keep things as they are', 'dont change', 'stay put', 'stick with current'],
    warning: 'Status-quo preference is visible. Verify that inaction is really dominant.'
  }
}

interface LifeDecisionRequest {
  title: string
  description: string
  category?: string
  persist?: boolean
  evidenceContext?: StrategistEvidence[]
  advanced_game_inputs?: Record<string, unknown>
  advancedGameInputs?: Record<string, unknown>
}

const LIFE_DECISION_CATEGORIES = new Set([
  'career',
  'financial',
  'relationship',
  'health',
  'purchase',
  'conflict',
  'business',
  'other'
])

interface StrategistAnalysis {
  executive_summary: string
  summary: string
  game_classification: ScenarioClassification
  actors: Array<{ id: string; name: string; role: string; objectives: string[] }>
  actor_map: Array<{
    actorId: string
    name: string
    role: string
    objective: string
    leverage: string[]
    constraint: string[]
    likelyMove: string
  }>
  outside_options: Array<{
    actorId: string
    batna: string
    reservationValue: string
    leverageNotes: string[]
  }>
  incentives: Array<{ actorId: string; incentives: string[]; leverage: string[]; constraints: string[] }>
  strategy_space: Array<{
    actorId: string
    options: Array<{ action: string; expectedValue: number; rationale: string; riskLevel: 'low' | 'medium' | 'high' }>
  }>
  equilibria: Array<{ name: string; profile: Record<string, string>; whyItHolds: string; stability: number }>
  opponent_types: Array<{ label: string; probability: number; tell: string; recommendedAdjustment: string }>
  countermoves: Array<{
    actorId: string
    countermove: string
    whyLikely: string
    warningLevel: 'low' | 'medium' | 'high'
    recommendedResponse: string
  }>
  key_uncertainties: Array<{
    uncertainty: string
    whyItMatters: string
    signpost: string
    mitigation: string
  }>
  claim_to_evidence: Array<{
    claim_id: string
    claim_text: string
    evidence_refs: Array<{
      evidence_id: string
      label: string
      sourceType: StrategistEvidence['sourceType']
      support: 'direct' | 'partial' | 'inferred'
    }>
    confidence: number
  }>
  provenance_status: 'evidence_backed' | 'llm_unverified' | 'heuristic_fallback'
  recommendation: {
    primary_action: string
    rationale: string
    expected_outcome: string
    confidence_interval: [number, number]
    key_insights: string[]
    alternatives: Array<{ action: string; expected_value: number; risk_level: 'low' | 'medium' | 'high' }>
  }
  dynamic_adjustments: Array<{ trigger: string; adjustment: string; reason: string }>
  biases: Array<{ type: string; confidence: number; description: string; intervention?: string }>
  evidence: Array<{
    id: string
    label: string
    detail: string
    sourceType: 'user_input' | 'market_reference' | 'behavioral_heuristic' | 'llm_inference'
  }>
  diagnostics?: {
    evidence_claims_stripped?: boolean
    evidence_claims_original_count?: number
    evidence_claims_kept_count?: number
    evidence_refs_stripped_count?: number
    claim_to_evidence_rejection_reason?: string
    provider_attempts?: Array<{
      provider: 'openai' | 'xai' | 'gemini' | 'openrouter'
      model: string
      ok: boolean
      error?: string
      error_class?: 'http_error' | 'timeout' | 'parse_error' | 'no_structured_text' | 'sanitizer_rejection' | 'empty_structured_payload' | 'provider_exception' | 'no_provider_configured'
      http_status?: number
      response_body_snippet?: string
    }>
    final_provider?: 'openai' | 'xai' | 'gemini' | 'openrouter'
    final_model?: string
    terminal_reason?: string
    final_error_class?: 'http_error' | 'timeout' | 'parse_error' | 'no_structured_text' | 'sanitizer_rejection' | 'empty_structured_payload' | 'provider_exception' | 'no_provider_configured'
  }
  advanced_game_outputs?: Record<string, unknown>
  confidence: number
  source: 'llm' | 'heuristic'
}

type StrategistEvidence = StrategistAnalysis['evidence'][number]

function formatUnexpectedError(error: unknown) {
  if (error instanceof Error) return error.message

  if (error && typeof error === 'object') {
    const candidate = error as Record<string, unknown>
    return JSON.stringify({
      message: candidate.message ?? null,
      details: candidate.details ?? null,
      hint: candidate.hint ?? null,
      code: candidate.code ?? null
    })
  }

  return 'Unexpected error'
}

function detectBiases(description: string) {
  const descLower = description.toLowerCase()

  return Object.entries(BIAS_PATTERNS).flatMap(([biasType, pattern]) => {
    const matched = pattern.keywords.some((keyword) => descLower.includes(keyword))
    if (!matched) return []

    return [{
      type: biasType,
      confidence: 0.72,
      description: pattern.warning,
      intervention: `Ask what you would advise a third party facing the same tradeoff without this ${biasType.replace('_', ' ')} signal.`
    }]
  })
}

function extractActors(title: string, description: string) {
  const capitalized = Array.from(new Set(description.match(/\b[A-Z][a-zA-Z]+\b/g) || []))
    .filter((token) => !['I', 'My', 'The', 'This', 'That'].includes(token))
    .slice(0, 3)

  const names = capitalized.length > 0 ? capitalized : ['You', 'Counterparty']
  if (!names.includes('You')) {
    names.unshift('You')
  }

  return names.slice(0, 3).map((name, index) => ({
    id: index === 0 ? 'you' : `actor_${index}`,
    name,
    role: index === 0 ? 'decision maker' : 'counterparty',
    objectives: index === 0
      ? [`Resolve ${title.toLowerCase()} on favorable terms`, 'Protect downside while preserving leverage']
      : ['Maximize own payoff', 'Preserve optionality and bargaining position']
  }))
}

function buildActorMap(
  actors: StrategistAnalysis['actors'],
  incentives: StrategistAnalysis['incentives'],
  strategySpace: StrategistAnalysis['strategy_space']
): StrategistAnalysis['actor_map'] {
  return actors.map((actor) => {
    const actorIncentive = incentives.find((entry) => entry.actorId === actor.id)
    const actorOptions = strategySpace.find((entry) => entry.actorId === actor.id)?.options || []
    return {
      actorId: actor.id,
      name: actor.name,
      role: actor.role,
      objective: actor.objectives[0] || 'Protect bargaining position',
      leverage: actorIncentive?.leverage || [],
      constraint: actorIncentive?.constraints || [],
      likelyMove: actorOptions[0]?.action || 'Hold current posture'
    }
  })
}

function withEvidenceIds(evidence: Array<Omit<StrategistEvidence, 'id'> | StrategistEvidence>) {
  return evidence.map((entry, index) => ({
    id: typeof (entry as StrategistEvidence).id === 'string' && (entry as StrategistEvidence).id.trim().length > 0
      ? (entry as StrategistEvidence).id
      : `evidence_${index + 1}`,
    label: entry.label,
    detail: entry.detail,
    sourceType: entry.sourceType
  }))
}

function buildHeuristicStrategist(
  title: string,
  description: string,
  category: string,
  biases: StrategistAnalysis['biases'],
  evidenceContext: StrategistEvidence[],
  promptPack: PromptPack
): StrategistAnalysis {
  const actors = extractActors(title, description)
  const actorOptions = [
    {
      action: 'commit_now',
      expectedValue: 58,
      rationale: 'Fast resolution reduces uncertainty but sacrifices information value.',
      riskLevel: 'medium' as const
    },
    {
      action: 'negotiate_for_better_terms',
      expectedValue: 76,
      rationale: 'Preserves upside while testing counterparty flexibility.',
      riskLevel: 'medium' as const
    },
    {
      action: 'delay_and_collect_information',
      expectedValue: 67,
      rationale: 'Creates time to test alternatives, but weakens momentum if the counterparty has other options.',
      riskLevel: 'low' as const
    }
  ]
  const incentives = actors.map((actor, index) => ({
    actorId: actor.id,
    incentives: index === 0
      ? ['Improve payoff without losing the deal', 'Maintain optionality']
      : ['Close on terms favorable to them', 'Protect precedent and negotiating leverage'],
    leverage: index === 0
      ? ['Ability to wait', 'Alternative options', 'Information you can still gather']
      : ['Deadline pressure', 'Control of the current offer', 'Asymmetric information'],
    constraints: index === 0
      ? ['Limited visibility into counterparty reservation point']
      : ['Need to maintain credibility and internal consistency']
  }))
  const strategySpace = [{
    actorId: 'you',
    options: actorOptions
  }]
  const normalizedEvidence = withEvidenceIds([
    ...evidenceContext,
    {
      label: 'User-provided scenario',
      detail: description,
      sourceType: 'user_input' as const
    },
    {
      label: 'Bargaining heuristic',
      detail: 'Incomplete-information negotiations generally reward calibrated counters over immediate acceptance or impulsive rejection.',
      sourceType: 'behavioral_heuristic' as const
    }
  ])
  const actorMap = buildActorMap(actors, incentives, strategySpace)
  const outsideOptions = [
    {
      actorId: 'you',
      batna: promptPack.classifier.domain === 'commodity_procurement'
        ? 'Use alternate suppliers, inventory cover, or timing flexibility to reset the negotiation if the supplier will not justify pass-through.'
        : 'Pause commitment, strengthen your alternative path, and return only if the package improves materially.',
      reservationValue: 'Do not accept terms that are worse than your best credible no-deal or reset path.',
      leverageNotes: ['Alternative path credibility', 'Timing flexibility', 'Ability to trade non-price terms selectively']
    },
    {
      actorId: 'actor_1',
      batna: 'Maintain the current offer, wait for time pressure to increase, or repackage the ask with narrower concessions.',
      reservationValue: 'Do not concede below the minimum package that preserves precedent or acceptable margin.',
      leverageNotes: ['Deadline pressure', 'Information asymmetry', 'Control of the current proposal']
    }
  ]

  return {
    executive_summary: 'Counter with one concrete improvement request, keep your BATNA active, and use the next response to test how constrained the other side really is.',
    summary: `This ${category} decision is best treated as ${promptPack.classifier.game_family.replace(/_/g, ' ')}. The highest-value move is usually to improve terms while preserving a credible fallback.`,
    game_classification: promptPack.classifier,
    actors,
    actor_map: actorMap,
    outside_options: outsideOptions,
    incentives,
    strategy_space: strategySpace,
    equilibria: [{
      name: 'Guarded compromise',
      profile: {
        you: 'negotiate_for_better_terms',
        actor_1: 'limited_concession'
      },
      whyItHolds: 'Both sides improve on the immediate accept/reject baseline without exposing themselves to a large downside.',
      stability: 0.73
    }],
    opponent_types: [
      {
        label: 'Flexible counterparty',
        probability: 0.45,
        tell: 'They ask exploratory questions and signal room within policy bounds.',
        recommendedAdjustment: 'Push for a package improvement rather than a single-price concession.'
      },
      {
        label: 'Policy-bound counterparty',
        probability: 0.35,
        tell: 'They reference internal constraints and fixed bands repeatedly.',
        recommendedAdjustment: 'Trade scope, timing, or non-cash terms instead of forcing a direct price move.'
      },
      {
        label: 'Time-pressured counterparty',
        probability: 0.2,
        tell: 'They keep the discussion moving toward fast closure.',
        recommendedAdjustment: 'Use time sensitivity carefully; ask for one targeted improvement and be ready to close.'
      }
    ],
    countermoves: [
      {
        actorId: 'actor_1',
        countermove: 'Offer a small concession while narrowing scope elsewhere.',
        whyLikely: 'That protects their precedent while preserving momentum toward closure.',
        warningLevel: 'medium',
        recommendedResponse: 'Ask for one concrete concession tied to timing, scope, or downside protection.'
      },
      {
        actorId: 'actor_1',
        countermove: 'Invoke internal policy limits to resist a direct price move.',
        whyLikely: 'Policy-bound counterparties often trade non-cash terms instead of headline numbers.',
        warningLevel: 'medium',
        recommendedResponse: 'Shift the negotiation toward structure, timing, or implementation support.'
      }
    ],
    key_uncertainties: [
      {
        uncertainty: 'The true flexibility of the other side',
        whyItMatters: 'It determines whether a calibrated counter is productive or just burns goodwill.',
        signpost: 'Whether they explore options or immediately restate fixed constraints.',
        mitigation: 'Use one bounded counterproposal that reveals type quickly.'
      },
      {
        uncertainty: 'The strength of your BATNA',
        whyItMatters: 'Your fallback directly sets the credibility of any harder ask.',
        signpost: 'Whether outside options remain live over the next decision window.',
        mitigation: 'Refresh alternatives before making an irreversible commitment.'
      }
    ],
    claim_to_evidence: [],
    provenance_status: 'heuristic_fallback',
    recommendation: {
      primary_action: 'negotiate_for_better_terms',
      rationale: 'That path captures the most upside without relying on a bluff-heavy posture. It also reveals the counterparty type quickly.',
      expected_outcome: 'A modestly improved agreement or a cleaner read on whether to walk away.',
      confidence_interval: [64, 82],
      key_insights: [
        'The decision is not just whether to accept. It is how much information you can buy before committing.',
        'Counterparty type matters more than the exact opening number.',
        'A credible fallback is your main source of leverage.'
      ],
      alternatives: actorOptions.map((option) => ({
        action: option.action,
        expected_value: option.expectedValue,
        risk_level: option.riskLevel
      }))
    },
    dynamic_adjustments: [
      {
        trigger: 'Counterparty signals a hard deadline or final offer',
        adjustment: 'Compress the negotiation to one concrete counterproposal and prepare your walkaway decision.',
        reason: 'Time pressure reduces the value of further probing.'
      },
      {
        trigger: 'You discover a strong outside option',
        adjustment: 'Raise your ask and shorten your decision window.',
        reason: 'Your BATNA improves, shifting the bargaining frontier.'
      }
    ],
    biases,
    evidence: normalizedEvidence,
    confidence: 0.71,
    source: 'heuristic'
  }
}

function mergeStrategistPayload(candidate: any, fallback: StrategistAnalysis, biases: StrategistAnalysis['biases']): StrategistAnalysis {
  if (!candidate || typeof candidate !== 'object') {
    return fallback
  }

  const mergedEvidence = withEvidenceIds(
    Array.isArray(candidate.evidence) && candidate.evidence.length > 0
      ? candidate.evidence
      : fallback.evidence
  )
  const validEvidenceIds = new Set(mergedEvidence.map((entry) => entry.id))
  const claimToEvidence = Array.isArray(candidate.claim_to_evidence)
    ? candidate.claim_to_evidence.map((entry: any, index: number) => ({
        claim_id: typeof entry?.claim_id === 'string' && entry.claim_id.trim().length > 0 ? entry.claim_id : `claim_${index + 1}`,
        claim_text: typeof entry?.claim_text === 'string' ? entry.claim_text : '',
        evidence_refs: Array.isArray(entry?.evidence_refs)
          ? entry.evidence_refs.filter((ref: any) => validEvidenceIds.has(String(ref?.evidence_id || '')))
          : [],
        confidence: typeof entry?.confidence === 'number' ? entry.confidence : 0.5
      })).filter((entry: any) => entry.claim_text)
    : fallback.claim_to_evidence
  const inferredStatus =
    candidate.provenance_status === 'evidence_backed' || candidate.provenance_status === 'llm_unverified' || candidate.provenance_status === 'heuristic_fallback'
      ? candidate.provenance_status
      : claimToEvidence.some((entry: any) => entry.evidence_refs.some((ref: any) => {
          const evidenceEntry = mergedEvidence.find((evidence) => evidence.id === ref.evidence_id)
          return evidenceEntry && evidenceEntry.sourceType !== 'llm_inference'
        }))
        ? 'evidence_backed'
        : 'llm_unverified'

  return {
    ...fallback,
    ...candidate,
    game_classification: candidate.game_classification || fallback.game_classification,
    actor_map: Array.isArray(candidate.actor_map) && candidate.actor_map.length > 0 ? candidate.actor_map : fallback.actor_map,
    outside_options: Array.isArray(candidate.outside_options) && candidate.outside_options.length > 0 ? candidate.outside_options : fallback.outside_options,
    countermoves: Array.isArray(candidate.countermoves) && candidate.countermoves.length > 0 ? candidate.countermoves : fallback.countermoves,
    key_uncertainties: Array.isArray(candidate.key_uncertainties) && candidate.key_uncertainties.length > 0 ? candidate.key_uncertainties : fallback.key_uncertainties,
    claim_to_evidence: claimToEvidence,
    recommendation: {
      ...fallback.recommendation,
      ...(candidate.recommendation || {})
    },
    biases: Array.isArray(candidate.biases) && candidate.biases.length > 0 ? candidate.biases : biases,
    evidence: mergedEvidence,
    diagnostics: candidate.diagnostics && typeof candidate.diagnostics === 'object' ? candidate.diagnostics : undefined,
    provenance_status: inferredStatus,
    source: 'llm'
  }
}

function mergeExplicitAdvancedGameInputs(strategist: any, explicitInputs?: AdvancedGameInputs) {
  if (!explicitInputs) return strategist
  const existingInputs =
    strategist?.advanced_game_inputs && typeof strategist.advanced_game_inputs === 'object'
      ? strategist.advanced_game_inputs
      : {}

  return {
    ...strategist,
    advanced_game_inputs: {
      ...existingInputs,
      ...explicitInputs,
    },
  }
}

async function attachAdvancedGameOutputs(strategist: any) {
  if (!strategist?.advanced_game_inputs || typeof strategist.advanced_game_inputs !== 'object') {
    return strategist
  }

  const frameworkMap = {
    coalitional: strategist.advanced_game_inputs.coalitional,
    signaling: strategist.advanced_game_inputs.signaling,
    correlated: strategist.advanced_game_inputs.correlated,
    evolutionary: strategist.advanced_game_inputs.evolutionary,
    bounded_rationality: strategist.advanced_game_inputs.bounded_rationality,
  } as const

  const advancedOutputs: Record<string, unknown> = {}
  for (const [framework, normalizedInputs] of Object.entries(frameworkMap)) {
    if (!normalizedInputs || typeof normalizedInputs !== 'object') continue
    try {
      const result = await maybeCallMlService('/game-theory/solve', {
        framework,
        payload: normalizedInputs as Record<string, unknown>,
      })
      advancedOutputs[framework] = result
        ? { ...result, framework, status: 'deterministic' }
        : {
            framework,
            status: 'heuristic',
            summary: `${framework.replace(/_/g, ' ')} inputs captured, but the deterministic solver is unavailable.`,
            normalized_inputs: normalizedInputs,
            results: null,
            diagnostics: {},
            warnings: ['ML service unavailable; retaining heuristic strategist envelope.'],
          }
    } catch (error) {
      advancedOutputs[framework] = {
        framework,
        status: 'rejected',
        summary: `${framework.replace(/_/g, ' ')} inputs were rejected by the deterministic solver.`,
        normalized_inputs: normalizedInputs,
        results: null,
        diagnostics: { errors: [error instanceof Error ? error.message : String(error)] },
        warnings: ['Deterministic solver rejected the strategist payload.'],
      }
    }
  }

  const { advanced_game_inputs: _advancedGameInputs, ...rest } = strategist
  return {
    ...rest,
    advanced_game_outputs: Object.keys(advancedOutputs).length > 0 ? advancedOutputs : undefined,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return jsonResponse(200, { ok: true })
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { ok: false, message: 'Method not allowed' })
  }

  const user = await getAuthenticatedUser(req)
  if (!user) {
    return jsonResponse(401, { ok: false, message: 'Unauthorized' })
  }

  const rateLimit = await checkRateLimit(user.id, 'personal-life-coach')
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds)
  await logApiUsage(user.id, 'personal-life-coach')

  try {
    const body = await req.json() as LifeDecisionRequest
    const title = String(body?.title || '').trim()
    const description = String(body?.description || '').trim()
    const rawCategory = String(body?.category || 'other').trim().toLowerCase()
    const category = LIFE_DECISION_CATEGORIES.has(rawCategory) ? rawCategory : 'other'
    const persist = body?.persist !== false
    const evidenceContext = withEvidenceIds(
      Array.isArray(body?.evidenceContext)
        ? body.evidenceContext.filter((entry): entry is StrategistEvidence => Boolean(entry?.label) && Boolean(entry?.detail))
        : []
    )

    if (!title || !description) {
      return jsonResponse(400, { ok: false, message: 'title and description are required' })
    }

    const detectedBiases = detectBiases(description)
    const domainHint: ScenarioDomain | undefined =
      category === 'financial'
        ? 'commodity_procurement'
        : category === 'business'
          ? 'enterprise_negotiation'
          : category === 'conflict'
            ? 'geopolitical'
            : undefined
    const doctrinePromptPack = buildDoctrinePromptPack({
      scenarioText: `${title}\n${description}`,
      evidenceIds: evidenceContext.map((entry) => entry.id),
      domainHint
    })
    const heuristicStrategist = buildHeuristicStrategist(title, description, category, detectedBiases, evidenceContext, doctrinePromptPack)
    const rawAdvancedGameInputs = body?.advanced_game_inputs ?? body?.advancedGameInputs
    const advancedGameInputsProvided = rawAdvancedGameInputs !== undefined
    const sanitizedAdvancedGameInputs = sanitizeAdvancedGameInputs(rawAdvancedGameInputs, {
      allowedPlayers: heuristicStrategist.actors.map((actor) => actor.id),
    })
    if (advancedGameInputsProvided && Object.keys(sanitizedAdvancedGameInputs.rejections).length > 0) {
      return jsonResponse(400, {
        ok: false,
        message: 'advanced_game_inputs failed validation',
        rejections: sanitizedAdvancedGameInputs.rejections,
      })
    }

    let strategist = heuristicStrategist
    let persistedStrategistDiagnostics: StrategistAnalysis['diagnostics'] | undefined
    const llmResult = await generateStrategistPayload({
      title,
      description,
      category,
      evidenceContext,
      fallback: heuristicStrategist,
      systemPrompt: `${LIFE_COACH_PROMPT}\n\n${buildDoctrinePromptText(doctrinePromptPack)}`,
      scenarioClassification: doctrinePromptPack.classifier,
      promptPack: doctrinePromptPack
    })
    if (llmResult.ok === true) {
      persistedStrategistDiagnostics = llmResult.payload.diagnostics && typeof llmResult.payload.diagnostics === 'object'
        ? llmResult.payload.diagnostics
        : undefined
      strategist = mergeStrategistPayload(llmResult.payload, heuristicStrategist, detectedBiases)
    } else {
      const failure = llmResult
      persistedStrategistDiagnostics = {
        provider_attempts: failure.attempts,
        ...(failure.provider ? { final_provider: failure.provider } : {}),
        ...(failure.model ? { final_model: failure.model } : {}),
        terminal_reason: failure.terminal_reason,
        final_error_class: failure.final_error_class,
      }
      console.warn('personal-life-coach llm fallback engaged', JSON.stringify({
        terminal_reason: failure.terminal_reason,
        final_error_class: failure.final_error_class,
        provider: failure.provider ?? null,
        model: failure.model ?? null,
        attempts: failure.attempts,
      }))
    }
    strategist = mergeExplicitAdvancedGameInputs(strategist, sanitizedAdvancedGameInputs.value)
    strategist = await attachAdvancedGameOutputs(strategist)

    const debiasingAdvice = strategist.biases
      .map((bias) => bias.intervention || bias.description)
      .filter(Boolean)

    let decisionId = `ephemeral:${crypto.randomUUID()}`
    if (persist) {
      const { data: decision, error } = await supabaseAdmin
        .from('life_decisions')
        .insert({
          user_id: user.id,
          title,
          description,
          category,
          players: strategist.actors,
          strategies: strategist.strategy_space,
          payoffs: strategist.recommendation.alternatives,
          information_structure: strategist.opponent_types.length > 0 ? 'incomplete_information' : 'complete_information',
          detected_biases: strategist.biases,
          debiasing_interventions: strategist.dynamic_adjustments,
          recommended_strategy: strategist.recommendation,
          equilibria: strategist.equilibria,
          expected_outcomes: {
            summary: strategist.summary,
            executive_summary: strategist.executive_summary,
            game_classification: strategist.game_classification,
            outside_options: strategist.outside_options,
            countermoves: strategist.countermoves,
            key_uncertainties: strategist.key_uncertainties,
            claim_to_evidence: strategist.claim_to_evidence,
            provenance_status: strategist.provenance_status,
            dynamic_adjustments: strategist.dynamic_adjustments,
            evidence: strategist.evidence,
            opponent_types: strategist.opponent_types,
            advanced_game_outputs: strategist.advanced_game_outputs,
            diagnostics: persistedStrategistDiagnostics,
          },
          confidence_score: strategist.confidence,
          anonymized: true,
          shared_for_research: false
        })
        .select('id')
        .single()

      if (error) throw error
      decisionId = decision.id
    }

    return jsonResponse(200, {
      success: true,
      decision_id: decisionId,
      strategist,
      debiasing_advice: debiasingAdvice
    })
  } catch (error) {
    const message = formatUnexpectedError(error)
    console.error('Life coach error:', message)
    return jsonResponse(500, { ok: false, message })
  }
})
