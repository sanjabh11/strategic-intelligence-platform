import {
  getDoctrineCardById,
  getScenarioTemplateById,
  type PromptPack,
  type ScenarioClassification
} from '../../../shared/gameTheoryKnowledge.ts'
import {
  sanitizeAdvancedGameInputs,
  type AdvancedGameInputs,
} from './advanced-frameworks.ts'

export interface StrategistProviderInput {
  title: string
  description: string
  category?: string
  evidenceContext?: Array<{
    id?: string
    label: string
    detail: string
    sourceType: 'user_input' | 'market_reference' | 'behavioral_heuristic' | 'llm_inference'
  }>
  fallback: unknown
  systemPrompt: string
  scenarioClassification?: ScenarioClassification
  promptPack?: PromptPack
}

export interface StructuredStrategistPayload {
  executive_summary: string
  summary: string
  game_classification: {
    game_family: string
    domain: string
    actor_count: number
    move_structure: 'simultaneous' | 'sequential' | 'repeated'
    information_structure: 'complete' | 'incomplete' | 'signaling-heavy' | 'asymmetric_bayesian' | 'public_choreographed'
    decision_objective: string
    confidence: number
    why_fit: string
    doctrine_ids: string[]
    template_id: string | null
  }
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
      sourceType: 'user_input' | 'market_reference' | 'behavioral_heuristic' | 'llm_inference'
      support: 'direct' | 'partial' | 'inferred'
    }>
    confidence: number
  }>
  provenance_status: 'evidence_backed' | 'llm_unverified' | 'heuristic_fallback'
  recommendation: {
    primary_action: string
    rationale: string
    expected_outcome: string
    confidence_interval: number[]
    key_insights: string[]
    alternatives: Array<{ action: string; expected_value: number; risk_level: 'low' | 'medium' | 'high' }>
  }
  dynamic_adjustments: Array<{ trigger: string; adjustment: string; reason: string }>
  biases: Array<{ type: string; confidence: number; description: string; intervention: string }>
  evidence: Array<{ id: string; label: string; detail: string; sourceType: 'user_input' | 'market_reference' | 'behavioral_heuristic' | 'llm_inference' }>
  diagnostics?: {
    evidence_claims_stripped?: boolean
    evidence_claims_original_count?: number
    evidence_claims_kept_count?: number
    evidence_refs_stripped_count?: number
    claim_to_evidence_rejection_reason?: string
    llm_security_text_redacted?: boolean
    llm_security_text_redacted_count?: number
    provider_attempts?: Array<StrategistProviderAttempt>
    final_provider?: StrategistProviderName
    final_model?: string
    retry_round?: number
    terminal_reason?: string
    final_error_class?: StrategistProviderErrorClass
  }
  advanced_game_inputs?: AdvancedGameInputs
  confidence: number
}

export type StrategistProviderName = 'openai' | 'xai' | 'gemini' | 'openrouter'

export type StrategistProviderErrorClass =
  | 'http_error'
  | 'timeout'
  | 'parse_error'
  | 'no_structured_text'
  | 'sanitizer_rejection'
  | 'empty_structured_payload'
  | 'provider_exception'
  | 'no_provider_configured'

export interface StrategistProviderAttempt {
  provider: StrategistProviderName
  model: string
  ok: boolean
  error?: string
  error_class?: StrategistProviderErrorClass
  http_status?: number
  response_body_snippet?: string
}

export interface StrategistProviderSuccess {
  ok: true
  payload: StructuredStrategistPayload
  provider: StrategistProviderName
  model: string
  attempts: StrategistProviderAttempt[]
}

export interface StrategistProviderFailure {
  ok: false
  attempts: StrategistProviderAttempt[]
  terminal_reason: string
  final_error_class: StrategistProviderErrorClass
  provider?: StrategistProviderName
  model?: string
}

export type StrategistProviderResult = StrategistProviderSuccess | StrategistProviderFailure

interface GeneratedPayload {
  payload: StructuredStrategistPayload
  model: string
}

interface StrategistProvider {
  name: StrategistProviderName
  defaultModel: string
  generate: (input: StrategistProviderInput) => Promise<GeneratedPayload | null>
}

class StrategistProviderError extends Error {
  provider: StrategistProviderName
  model: string
  errorClass: StrategistProviderErrorClass
  httpStatus?: number
  responseBodySnippet?: string

  constructor(params: {
    provider: StrategistProviderName
    model: string
    message: string
    errorClass: StrategistProviderErrorClass
    httpStatus?: number
    responseBodySnippet?: string
  }) {
    super(params.message)
    this.name = 'StrategistProviderError'
    this.provider = params.provider
    this.model = params.model
    this.errorClass = params.errorClass
    this.httpStatus = params.httpStatus
    this.responseBodySnippet = params.responseBodySnippet
  }
}

const OPENROUTER_DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1'
const OPENROUTER_DEFAULT_MODEL = 'openrouter/free'
const OPENROUTER_AUTO_MODEL = 'openrouter/auto'
const STRATEGIST_PROVIDER_TIMEOUT_MS = Number(Deno.env.get('STRATEGIST_PROVIDER_TIMEOUT_MS') || '70000')
const OPENROUTER_ALLOWED_MODELS = [
  'anthropic/*',
  'openai/*',
  'deepseek/*',
  'meta-llama/*',
  'mistralai/*',
  'qwen/*',
]

function isPremiumOpenRouterModel(model: string | null | undefined) {
  const normalized = model?.trim() || ''
  return normalized.length > 0 && normalized !== OPENROUTER_DEFAULT_MODEL
}

const probabilityRecordSchema = {
  type: 'object',
  additionalProperties: { type: 'number' },
}

const nestedPayoffSchema = {
  type: 'object',
  additionalProperties: {
    type: 'object',
    additionalProperties: {
      type: 'object',
      additionalProperties: { type: 'number' },
    },
  },
}

const STRATEGIST_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    executive_summary: { type: 'string' },
    summary: { type: 'string' },
    game_classification: {
      type: 'object',
      additionalProperties: false,
      properties: {
        game_family: { type: 'string' },
        domain: { type: 'string' },
        actor_count: { type: 'number' },
        move_structure: { type: 'string', enum: ['simultaneous', 'sequential', 'repeated'] },
        information_structure: { type: 'string', enum: ['complete', 'incomplete', 'signaling-heavy', 'asymmetric_bayesian', 'public_choreographed'] },
        decision_objective: { type: 'string' },
        confidence: { type: 'number' },
        why_fit: { type: 'string' },
        doctrine_ids: { type: 'array', items: { type: 'string' } },
        template_id: { anyOf: [{ type: 'string' }, { type: 'null' }] }
      },
      required: [
        'game_family',
        'domain',
        'actor_count',
        'move_structure',
        'information_structure',
        'decision_objective',
        'confidence',
        'why_fit',
        'doctrine_ids',
        'template_id'
      ]
    },
    actors: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          role: { type: 'string' },
          objectives: { type: 'array', items: { type: 'string' } }
        },
        required: ['id', 'name', 'role', 'objectives']
      }
    },
    actor_map: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          actorId: { type: 'string' },
          name: { type: 'string' },
          role: { type: 'string' },
          objective: { type: 'string' },
          leverage: { type: 'array', items: { type: 'string' } },
          constraint: { type: 'array', items: { type: 'string' } },
          likelyMove: { type: 'string' }
        },
        required: ['actorId', 'name', 'role', 'objective', 'leverage', 'constraint', 'likelyMove']
      }
    },
    outside_options: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          actorId: { type: 'string' },
          batna: { type: 'string' },
          reservationValue: { type: 'string' },
          leverageNotes: { type: 'array', items: { type: 'string' } }
        },
        required: ['actorId', 'batna', 'reservationValue', 'leverageNotes']
      }
    },
    incentives: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          actorId: { type: 'string' },
          incentives: { type: 'array', items: { type: 'string' } },
          leverage: { type: 'array', items: { type: 'string' } },
          constraints: { type: 'array', items: { type: 'string' } }
        },
        required: ['actorId', 'incentives', 'leverage', 'constraints']
      }
    },
    strategy_space: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          actorId: { type: 'string' },
          options: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                action: { type: 'string' },
                expectedValue: { type: 'number' },
                rationale: { type: 'string' },
                riskLevel: { type: 'string', enum: ['low', 'medium', 'high'] }
              },
              required: ['action', 'expectedValue', 'rationale', 'riskLevel']
            }
          }
        },
        required: ['actorId', 'options']
      }
    },
    equilibria: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          profile: {
            type: 'object',
            additionalProperties: { type: 'string' },
            properties: {}
          },
          whyItHolds: { type: 'string' },
          stability: { type: 'number' }
        },
        required: ['name', 'profile', 'whyItHolds', 'stability']
      }
    },
    opponent_types: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          label: { type: 'string' },
          probability: { type: 'number' },
          tell: { type: 'string' },
          recommendedAdjustment: { type: 'string' }
        },
        required: ['label', 'probability', 'tell', 'recommendedAdjustment']
      }
    },
    countermoves: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          actorId: { type: 'string' },
          countermove: { type: 'string' },
          whyLikely: { type: 'string' },
          warningLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
          recommendedResponse: { type: 'string' }
        },
        required: ['actorId', 'countermove', 'whyLikely', 'warningLevel', 'recommendedResponse']
      }
    },
    key_uncertainties: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          uncertainty: { type: 'string' },
          whyItMatters: { type: 'string' },
          signpost: { type: 'string' },
          mitigation: { type: 'string' }
        },
        required: ['uncertainty', 'whyItMatters', 'signpost', 'mitigation']
      }
    },
    claim_to_evidence: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          claim_id: { type: 'string' },
          claim_text: { type: 'string' },
          evidence_refs: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                evidence_id: { type: 'string' },
                label: { type: 'string' },
                sourceType: { type: 'string', enum: ['user_input', 'market_reference', 'behavioral_heuristic', 'llm_inference'] },
                support: { type: 'string', enum: ['direct', 'partial', 'inferred'] }
              },
              required: ['evidence_id', 'label', 'sourceType', 'support']
            }
          },
          confidence: { type: 'number' }
        },
        required: ['claim_id', 'claim_text', 'evidence_refs', 'confidence']
      }
    },
    provenance_status: { type: 'string', enum: ['evidence_backed', 'llm_unverified', 'heuristic_fallback'] },
    recommendation: {
      type: 'object',
      additionalProperties: false,
      properties: {
        primary_action: { type: 'string' },
        rationale: { type: 'string' },
        expected_outcome: { type: 'string' },
        confidence_interval: { type: 'array', items: { type: 'number' } },
        key_insights: { type: 'array', items: { type: 'string' } },
        alternatives: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              action: { type: 'string' },
              expected_value: { type: 'number' },
              risk_level: { type: 'string', enum: ['low', 'medium', 'high'] }
            },
            required: ['action', 'expected_value', 'risk_level']
          }
        }
      },
      required: ['primary_action', 'rationale', 'expected_outcome', 'confidence_interval', 'key_insights', 'alternatives']
    },
    dynamic_adjustments: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          trigger: { type: 'string' },
          adjustment: { type: 'string' },
          reason: { type: 'string' }
        },
        required: ['trigger', 'adjustment', 'reason']
      }
    },
    biases: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          type: { type: 'string' },
          confidence: { type: 'number' },
          description: { type: 'string' },
          intervention: { type: 'string' }
        },
        required: ['type', 'confidence', 'description', 'intervention']
      }
    },
    evidence: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
          detail: { type: 'string' },
          sourceType: { type: 'string', enum: ['user_input', 'market_reference', 'behavioral_heuristic', 'llm_inference'] }
        },
        required: ['id', 'label', 'detail', 'sourceType']
      }
    },
    advanced_game_inputs: {
      type: 'object',
      additionalProperties: false,
      properties: {
        coalitional: {
          type: 'object',
          additionalProperties: false,
          properties: {
            players: { type: 'array', items: { type: 'string' } },
            coalition_values: { type: 'object', additionalProperties: { type: 'number' } },
          },
          required: ['players', 'coalition_values'],
        },
        signaling: {
          type: 'object',
          additionalProperties: false,
          properties: {
            sender_types: { type: 'array', items: { type: 'string' } },
            prior_probs: probabilityRecordSchema,
            messages: { type: 'array', items: { type: 'string' } },
            receiver_actions: { type: 'array', items: { type: 'string' } },
            sender_strategies: {
              type: 'object',
              additionalProperties: probabilityRecordSchema,
            },
            observed_message: { type: 'string' },
            sender_payoffs: nestedPayoffSchema,
            receiver_payoffs: nestedPayoffSchema,
          },
          required: ['sender_types', 'prior_probs', 'messages', 'receiver_actions', 'sender_payoffs', 'receiver_payoffs'],
        },
        correlated: {
          type: 'object',
          additionalProperties: false,
          properties: {
            players: { type: 'array', items: { type: 'string' } },
            actions_by_player: { type: 'array', items: { type: 'array', items: { type: 'string' } } },
            payoff_matrix: { type: 'array', items: { type: 'array', items: { type: 'array', items: { type: 'number' } } } },
            objective: { type: 'string', enum: ['welfare_maximizing', 'validation_only'] },
          },
          required: ['players', 'actions_by_player', 'payoff_matrix'],
        },
        evolutionary: {
          type: 'object',
          additionalProperties: false,
          properties: {
            strategies: { type: 'array', items: { type: 'string' } },
            payoff_matrix: { type: 'array', items: { type: 'array', items: { type: 'number' } } },
            initial_shares: { type: 'array', items: { type: 'number' } },
            steps: { type: 'number' },
            dt: { type: 'number' },
          },
          required: ['strategies', 'payoff_matrix', 'initial_shares'],
        },
        bounded_rationality: {
          type: 'object',
          additionalProperties: false,
          properties: {
            players: { type: 'array', items: { type: 'string' } },
            actions_by_player: { type: 'array', items: { type: 'array', items: { type: 'string' } } },
            payoff_matrix: { type: 'array', items: { type: 'array', items: { type: 'array', items: { type: 'number' } } } },
            lambda: { type: 'number' },
          },
          required: ['players', 'actions_by_player', 'payoff_matrix'],
        },
      },
    },
    confidence: { type: 'number' }
  },
  required: [
    'executive_summary',
    'summary',
    'game_classification',
    'actors',
    'actor_map',
    'outside_options',
    'incentives',
    'strategy_space',
    'equilibria',
    'opponent_types',
    'countermoves',
    'key_uncertainties',
    'claim_to_evidence',
    'provenance_status',
    'recommendation',
    'dynamic_adjustments',
    'biases',
    'evidence',
    'confidence'
  ]
}

function extractResponseText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === 'string' && payload.output_text.trim().length > 0) {
    return payload.output_text
  }

  const output = Array.isArray(payload.output) ? payload.output as Array<Record<string, unknown>> : []
  const message = output.find((item) => item.type === 'message')
  const content = Array.isArray(message?.content) ? message.content as Array<Record<string, unknown>> : []
  const textEntry = content.find((entry) => entry.type === 'output_text')
  return typeof textEntry?.text === 'string' ? textEntry.text : null
}

export function parseStructuredPayload(rawText: string) {
  const candidates = new Set<string>()
  const trimmed = rawText.trim()
  if (trimmed.length > 0) {
    candidates.add(trimmed.replace(/^```json\s*/i, '').replace(/```$/i, '').trim())
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fencedMatch?.[1]) {
    candidates.add(fencedMatch[1].trim())
  }

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.add(trimmed.slice(firstBrace, lastBrace + 1).trim())
  }

  for (const candidate of candidates) {
    if (!candidate) continue
    try {
      const parsed = JSON.parse(candidate) as unknown
      if (typeof parsed === 'string') {
        return JSON.parse(parsed) as StructuredStrategistPayload
      }
      return parsed as StructuredStrategistPayload
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error('structured_json_parse_failed')
}

function isProvenanceStatus(value: unknown): value is StructuredStrategistPayload['provenance_status'] {
  return value === 'evidence_backed' || value === 'llm_unverified' || value === 'heuristic_fallback'
}

function buildCanonicalEvidenceContext(input: StrategistProviderInput): StructuredStrategistPayload['evidence'] {
  return (input.evidenceContext ?? []).map((entry, index) => ({
    id: typeof entry.id === 'string' && entry.id.trim().length > 0 ? entry.id.trim() : `evidence_${index + 1}`,
    label: entry.label,
    detail: entry.detail,
    sourceType: entry.sourceType
  }))
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function sanitizeProviderResponseSnippet(rawText: string | null | undefined) {
  if (typeof rawText !== 'string') return undefined
  const trimmed = rawText.replace(/\s+/g, ' ').trim()
  if (trimmed.length === 0) return undefined
  return trimmed.slice(0, 320)
}

const UNSAFE_GENERATED_TEXT_REDACTION = 'Model-generated text requested hidden/internal material or unsupported accuracy claims and was redacted pending human review.'
const UNSAFE_GENERATED_TEXT_PATTERNS = [
  /CANARY_SUPABASE_SERVICE_ROLE_KEY_SHOULD_NOT_LEAK/i,
  /\b(?:hidden|system|developer)\s+prompt\b/i,
  /\bchain[-\s]?of[-\s]?thought\b/i,
  /\bprovider\s+(?:key|keys|routing|rules)\b/i,
  /\benvironment\s+variables?\b/i,
  /\b(?:api|service[-_\s]?role|supabase[-_\s]?service[-_\s]?role)\s*(?:key|keys|token|tokens|secret|secrets)?\b/i,
  /\b99\.9%\s+(?:certainty|accur(?:acy|ate))\b/i,
  /\bworld[-\s]?class\s+(?:forecasting|prediction|predictions|accuracy|accurate)\b/i,
  /\bguaranteed\s+(?:forecast|prediction|outcome|accuracy)\b/i,
]
const GENERATED_TEXT_SKIP_KEYS = new Set(['diagnostics', 'evidence', 'advanced_game_inputs'])

function shouldRedactGeneratedText(value: string) {
  const trimmed = value.replace(/\s+/g, ' ').trim()
  return trimmed.length > 0 && UNSAFE_GENERATED_TEXT_PATTERNS.some((pattern) => pattern.test(trimmed))
}

function sanitizeGeneratedTextTree(value: unknown, path: string[] = []): { value: unknown; redactionCount: number } {
  const currentKey = path[path.length - 1]
  if (currentKey && GENERATED_TEXT_SKIP_KEYS.has(currentKey)) {
    return { value, redactionCount: 0 }
  }

  if (typeof value === 'string') {
    return shouldRedactGeneratedText(value)
      ? { value: UNSAFE_GENERATED_TEXT_REDACTION, redactionCount: 1 }
      : { value, redactionCount: 0 }
  }

  if (Array.isArray(value)) {
    let redactionCount = 0
    const nextValue = value.map((entry, index) => {
      const sanitized = sanitizeGeneratedTextTree(entry, [...path, String(index)])
      redactionCount += sanitized.redactionCount
      return sanitized.value
    })
    return { value: nextValue, redactionCount }
  }

  if (isPlainObject(value)) {
    let redactionCount = 0
    const nextValue: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(value)) {
      const sanitized = sanitizeGeneratedTextTree(entry, [...path, key])
      redactionCount += sanitized.redactionCount
      nextValue[key] = sanitized.value
    }
    return { value: nextValue, redactionCount }
  }

  return { value, redactionCount: 0 }
}

function wrapProviderError(
  provider: StrategistProviderName,
  model: string,
  error: unknown,
  fallbackMessage: string
): StrategistProviderError {
  if (error instanceof StrategistProviderError) {
    return error
  }

  if (error instanceof Error && error.name === 'TimeoutError') {
    return new StrategistProviderError({
      provider,
      model,
      message: `${fallbackMessage} timed out after ${STRATEGIST_PROVIDER_TIMEOUT_MS}ms`,
      errorClass: 'timeout',
    })
  }

  return new StrategistProviderError({
    provider,
    model,
    message: error instanceof Error ? error.message : fallbackMessage,
    errorClass: 'provider_exception',
  })
}

function buildFailedAttempt(
  provider: StrategistProviderName,
  model: string,
  error: unknown
): StrategistProviderAttempt {
  const wrapped = wrapProviderError(provider, model, error, `${provider} strategist request failed`)
  return {
    provider: wrapped.provider,
    model: wrapped.model,
    ok: false,
    error: wrapped.message,
    error_class: wrapped.errorClass,
    ...(typeof wrapped.httpStatus === 'number' ? { http_status: wrapped.httpStatus } : {}),
    ...(wrapped.responseBodySnippet ? { response_body_snippet: wrapped.responseBodySnippet } : {}),
  }
}

function coerceClassification(
  payload: StructuredStrategistPayload,
  input: StrategistProviderInput
): { classification: StructuredStrategistPayload['game_classification']; modified: boolean } {
  const fallback = input.scenarioClassification ?? input.promptPack?.classifier ?? null
  const candidate = payload.game_classification
  const validDoctrineIds = Array.isArray(candidate?.doctrine_ids)
    ? candidate.doctrine_ids.filter((id) => typeof id === 'string' && Boolean(getDoctrineCardById(id)))
    : []
  const template = typeof candidate?.template_id === 'string' ? getScenarioTemplateById(candidate.template_id) : null

  if (!fallback) {
    return {
      classification: {
        ...candidate,
        doctrine_ids: validDoctrineIds,
        template_id: template?.id ?? null
      },
      modified: validDoctrineIds.length !== (candidate?.doctrine_ids?.length ?? 0) || (candidate?.template_id ?? null) !== (template?.id ?? null)
    }
  }

  const templateCompatible = !template || (template.game_family === fallback.game_family && template.domain === fallback.domain)
  const candidateCompatible =
    candidate?.game_family === fallback.game_family &&
    candidate?.domain === fallback.domain &&
    candidate?.move_structure === fallback.move_structure &&
    candidate?.information_structure === fallback.information_structure &&
    templateCompatible &&
    validDoctrineIds.length > 0

  if (!candidateCompatible) {
    return {
      classification: { ...fallback },
      modified: true
    }
  }

  const nextClassification: StructuredStrategistPayload['game_classification'] = {
    ...fallback,
    confidence: typeof candidate.confidence === 'number' ? candidate.confidence : fallback.confidence,
    why_fit: typeof candidate.why_fit === 'string' && candidate.why_fit.trim().length > 0 ? candidate.why_fit : fallback.why_fit,
    decision_objective:
      typeof candidate.decision_objective === 'string' && candidate.decision_objective.trim().length > 0
        ? candidate.decision_objective
        : fallback.decision_objective,
    actor_count: typeof candidate.actor_count === 'number' ? candidate.actor_count : fallback.actor_count,
    doctrine_ids: validDoctrineIds,
    template_id: template?.id ?? fallback.template_id
  }

  return {
    classification: nextClassification,
    modified:
      validDoctrineIds.length !== (candidate?.doctrine_ids?.length ?? 0) ||
      nextClassification.template_id !== (candidate?.template_id ?? null)
  }
}

export function sanitizeStructuredPayload(
  payload: StructuredStrategistPayload,
  input: StrategistProviderInput
): StructuredStrategistPayload | null {
  const canonicalEvidence = buildCanonicalEvidenceContext(input)
  const allowedEvidenceMap = new Map(canonicalEvidence.map((entry) => [entry.id, entry]))
  let modified = false

  const sanitizedEvidence = canonicalEvidence.length > 0
    ? canonicalEvidence
    : Array.isArray(payload.evidence)
      ? payload.evidence.filter((entry) => typeof entry?.id === 'string' && entry.id.trim().length > 0)
      : []

  const originalClaims = Array.isArray(payload.claim_to_evidence) ? payload.claim_to_evidence : []
  const evidenceClaimsOriginalCount = originalClaims.length
  let evidenceRefsStrippedCount = 0
  const sanitizedClaims = originalClaims
    .map((claim) => {
      const originalRefs = Array.isArray(claim?.evidence_refs) ? claim.evidence_refs : []
      const filteredRefs = originalRefs.filter((ref) => allowedEvidenceMap.has(ref?.evidence_id))
      evidenceRefsStrippedCount += Math.max(0, originalRefs.length - filteredRefs.length)
      if (filteredRefs.length !== originalRefs.length) {
        modified = true
      }

      return {
        ...claim,
        evidence_refs: filteredRefs.map((ref) => {
          const canonical = allowedEvidenceMap.get(ref.evidence_id)
          return canonical
            ? {
                evidence_id: canonical.id,
                label: canonical.label,
                sourceType: canonical.sourceType,
                support: ref.support
              }
            : ref
        })
      }
    })
    .filter((claim) => {
      const keep = typeof claim.claim_text === 'string' && claim.claim_text.trim().length > 0 && claim.evidence_refs.length > 0
      if (!keep) {
        modified = true
      }
      return keep
    })

  const evidenceClaimsKeptCount = sanitizedClaims.length
  const evidenceClaimsStripped = allowedEvidenceMap.size > 0 && originalClaims.length > 0 && sanitizedClaims.length === 0
  modified = modified || evidenceClaimsStripped
  const claimToEvidenceRejectionReason = evidenceClaimsStripped
    ? 'all_claims_filtered_after_evidence_validation'
    : (evidenceClaimsKeptCount !== evidenceClaimsOriginalCount || evidenceRefsStrippedCount > 0)
      ? 'claims_filtered_during_evidence_sanitization'
      : undefined

  const { classification, modified: classificationModified } = coerceClassification(payload, input)
  modified = modified || classificationModified
  const actorIds = Array.isArray(payload.actors)
    ? payload.actors
      .map((actor) => typeof actor?.id === 'string' ? actor.id.trim() : '')
      .filter(Boolean)
    : []
  const { value: advancedGameInputs, modified: advancedInputsModified } = sanitizeAdvancedGameInputs(payload.advanced_game_inputs, {
    allowedPlayers: actorIds,
  })
  modified = modified || advancedInputsModified

  const provenanceStatus = modified
    ? 'llm_unverified'
    : isProvenanceStatus(payload.provenance_status)
      ? payload.provenance_status
      : sanitizedClaims.length > 0 && sanitizedEvidence.length > 0
        ? 'evidence_backed'
        : 'llm_unverified'

  const outputPayload: StructuredStrategistPayload = {
    ...payload,
    game_classification: classification,
    evidence: sanitizedEvidence,
    claim_to_evidence: sanitizedClaims,
    diagnostics: {
      ...(isPlainObject(payload.diagnostics) ? payload.diagnostics : {}),
      ...(evidenceClaimsOriginalCount > 0 ? {
        evidence_claims_original_count: evidenceClaimsOriginalCount,
        evidence_claims_kept_count: evidenceClaimsKeptCount,
      } : {}),
      ...(evidenceRefsStrippedCount > 0 ? { evidence_refs_stripped_count: evidenceRefsStrippedCount } : {}),
      ...(evidenceClaimsStripped ? { evidence_claims_stripped: true } : {}),
      ...(claimToEvidenceRejectionReason ? { claim_to_evidence_rejection_reason: claimToEvidenceRejectionReason } : {}),
    },
    advanced_game_inputs: advancedGameInputs,
    provenance_status: provenanceStatus
  }

  const generatedTextGuard = sanitizeGeneratedTextTree(outputPayload) as {
    value: StructuredStrategistPayload
    redactionCount: number
  }

  if (generatedTextGuard.redactionCount === 0) {
    return outputPayload
  }

  return {
    ...generatedTextGuard.value,
    diagnostics: {
      ...(isPlainObject(generatedTextGuard.value.diagnostics) ? generatedTextGuard.value.diagnostics : {}),
      llm_security_text_redacted: true,
      llm_security_text_redacted_count: generatedTextGuard.redactionCount,
    },
    provenance_status: 'llm_unverified'
  }
}

async function callResponsesApi(
  provider: StrategistProviderName,
  baseUrl: string,
  apiKey: string,
  model: string,
  input: StrategistProviderInput
): Promise<GeneratedPayload | null> {
  let response: Response
  try {
    response = await fetch(`${baseUrl}/responses`, {
      method: 'POST',
      signal: AbortSignal.timeout(STRATEGIST_PROVIDER_TIMEOUT_MS),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        input: [
          { role: 'system', content: input.systemPrompt },
          {
            role: 'user',
            content: JSON.stringify({
              title: input.title,
              description: input.description,
              category: input.category,
              evidenceContext: input.evidenceContext ?? [],
              fallback: input.fallback,
              scenarioClassification: input.scenarioClassification,
              promptPack: input.promptPack
            })
          }
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'strategist_response',
            schema: STRATEGIST_JSON_SCHEMA,
            strict: true
          }
        }
      })
    })
  } catch (error) {
    throw wrapProviderError(provider, model, error, `${provider} responses API request failed`)
  }

  if (!response.ok) {
    const responseBodySnippet = sanitizeProviderResponseSnippet(await response.text().catch(() => ''))
    throw new StrategistProviderError({
      provider,
      model,
      message: `${provider} responses API failed with HTTP ${response.status}`,
      errorClass: 'http_error',
      httpStatus: response.status,
      responseBodySnippet,
    })
  }

  const responsePayload = await response.json() as Record<string, unknown>
  const text = extractResponseText(responsePayload)
  if (!text) {
    throw new StrategistProviderError({
      provider,
      model,
      message: `${provider} responses API returned no structured text`,
      errorClass: 'no_structured_text',
    })
  }

  let parsed: StructuredStrategistPayload
  try {
    parsed = parseStructuredPayload(text)
  } catch (error) {
    throw new StrategistProviderError({
      provider,
      model,
      message: `${provider} responses API returned invalid structured JSON`,
      errorClass: 'parse_error',
      responseBodySnippet: sanitizeProviderResponseSnippet(text),
    })
  }

  const sanitized = sanitizeStructuredPayload(parsed, input)
  if (!sanitized) {
    throw new StrategistProviderError({
      provider,
      model,
      message: `${provider} responses API produced no valid structured payload after sanitization`,
      errorClass: 'sanitizer_rejection',
      responseBodySnippet: sanitizeProviderResponseSnippet(text),
    })
  }

  return { payload: sanitized, model }
}

function extractChatCompletionText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === 'string' && payload.output_text.trim().length > 0) {
    return payload.output_text
  }

  const choices = Array.isArray(payload.choices) ? payload.choices as Array<Record<string, unknown>> : []
  const firstChoice = choices[0]
  if (typeof firstChoice?.text === 'string' && firstChoice.text.trim().length > 0) {
    return firstChoice.text
  }

  const message = choices[0] && typeof choices[0].message === 'object' ? choices[0].message as Record<string, unknown> : null
  if (typeof message?.content === 'string' && message.content.trim().length > 0) {
    return message.content
  }

  const content = Array.isArray(message?.content) ? message.content as Array<Record<string, unknown>> : []
  const textEntry = content.find((entry) => typeof entry?.text === 'string')
  if (typeof textEntry?.text === 'string' && textEntry.text.trim().length > 0) {
    return textEntry.text
  }

  const toolCalls = Array.isArray(message?.tool_calls) ? message.tool_calls as Array<Record<string, unknown>> : []
  const argumentsEntry = toolCalls.find((entry) => {
    if (!entry || typeof entry !== 'object') return false
    const fn = typeof entry.function === 'object' ? entry.function as Record<string, unknown> : null
    return typeof fn?.arguments === 'string' && fn.arguments.trim().length > 0
  })
  if (argumentsEntry && typeof argumentsEntry.function === 'object') {
    const fn = argumentsEntry.function as Record<string, unknown>
    if (typeof fn.arguments === 'string' && fn.arguments.trim().length > 0) {
      return fn.arguments
    }
  }

  return null
}

function buildOpenRouterPlugins(model: string) {
  const plugins: Array<Record<string, unknown>> = [{ id: 'response-healing' }]

  if (model === OPENROUTER_AUTO_MODEL) {
    plugins.push({
      id: 'auto-router',
      allowed_models: OPENROUTER_ALLOWED_MODELS,
    })
  }

  return plugins
}

function extractOpenRouterChoiceError(payload: Record<string, unknown>) {
  const choices = Array.isArray(payload.choices) ? payload.choices as Array<Record<string, unknown>> : []
  const firstChoice = choices[0]
  if (!firstChoice || typeof firstChoice !== 'object') return null
  const error = typeof firstChoice.error === 'object' ? firstChoice.error as Record<string, unknown> : null
  if (!error) return null
  return {
    code: typeof error.code === 'number' ? error.code : null,
    message: typeof error.message === 'string' ? error.message : null,
  }
}

function isRetryableOpenRouterChoiceError(error: { code: number | null; message: string | null } | null) {
  if (!error) return false
  if (error.code === 502 || error.code === 503 || error.code === 504) return true
  return typeof error.message === 'string' && /upstream error/i.test(error.message)
}

async function callOpenRouterStructuredApi(apiKey: string, model: string, input: StrategistProviderInput): Promise<GeneratedPayload | null> {
  const baseUrl = Deno.env.get('OPENROUTER_BASE_URL') || OPENROUTER_DEFAULT_BASE_URL
  const referer = Deno.env.get('OPENROUTER_HTTP_REFERER') || Deno.env.get('APP_URL') || ''
  const title = Deno.env.get('OPENROUTER_X_TITLE') || 'Strategic Intelligence Platform'
  const plugins = buildOpenRouterPlugins(model)
  const maxAttempts = 3

  if (!referer) {
    throw new StrategistProviderError({
      provider: 'openrouter',
      model,
      message: 'OpenRouter provider requires OPENROUTER_HTTP_REFERER or APP_URL',
      errorClass: 'provider_exception',
    })
  }

  let lastError: StrategistProviderError | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let response: Response
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        signal: AbortSignal.timeout(STRATEGIST_PROVIDER_TIMEOUT_MS),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': referer,
          'X-OpenRouter-Title': title,
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          stream: false,
          messages: [
            { role: 'system', content: input.systemPrompt },
            {
              role: 'user',
              content: JSON.stringify({
                title: input.title,
                description: input.description,
                category: input.category,
                evidenceContext: input.evidenceContext ?? [],
                fallback: input.fallback,
                scenarioClassification: input.scenarioClassification,
                promptPack: input.promptPack,
              }),
            },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'strategist_response',
              strict: true,
              schema: STRATEGIST_JSON_SCHEMA,
            },
          },
          provider: {
            require_parameters: true,
          },
          ...(plugins ? { plugins } : {}),
        }),
      })
    } catch (error) {
      lastError = wrapProviderError('openrouter', model, error, 'OpenRouter strategist request failed')
      if (attempt < maxAttempts && lastError.errorClass === 'timeout') {
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt))
        continue
      }
      throw lastError
    }

    if (!response.ok) {
      const responseBodySnippet = sanitizeProviderResponseSnippet(await response.text().catch(() => ''))
      lastError = new StrategistProviderError({
        provider: 'openrouter',
        model,
        message: `OpenRouter API failed with HTTP ${response.status}`,
        errorClass: 'http_error',
        httpStatus: response.status,
        responseBodySnippet,
      })
      if (attempt < maxAttempts && response.status >= 500) {
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt))
        continue
      }
      throw lastError
    }

    const payload = await response.json() as Record<string, unknown>
    const upstreamChoiceError = extractOpenRouterChoiceError(payload)
    if (upstreamChoiceError) {
      const responseBodySnippet = sanitizeProviderResponseSnippet(JSON.stringify(payload))
      lastError = new StrategistProviderError({
        provider: 'openrouter',
        model,
        message: upstreamChoiceError.message
          ? `OpenRouter upstream provider error: ${upstreamChoiceError.message}`
          : `OpenRouter upstream provider error for ${model}`,
        errorClass: 'provider_exception',
        responseBodySnippet,
      })
      if (attempt < maxAttempts && isRetryableOpenRouterChoiceError(upstreamChoiceError)) {
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt))
        continue
      }
      throw lastError
    }

    const text = extractChatCompletionText(payload)
    if (!text) {
      const responseBodySnippet = sanitizeProviderResponseSnippet(JSON.stringify(payload))
      throw new StrategistProviderError({
        provider: 'openrouter',
        model,
        message: `OpenRouter model ${model} returned no structured text`,
        errorClass: 'no_structured_text',
        responseBodySnippet,
      })
    }

    let parsed: StructuredStrategistPayload
    try {
      parsed = parseStructuredPayload(text)
    } catch (error) {
      throw new StrategistProviderError({
        provider: 'openrouter',
        model,
        message: `OpenRouter model ${model} returned invalid structured JSON`,
        errorClass: 'parse_error',
        responseBodySnippet: sanitizeProviderResponseSnippet(text),
      })
    }

    const sanitized = sanitizeStructuredPayload(parsed, input)
    if (!sanitized) {
      throw new StrategistProviderError({
        provider: 'openrouter',
        model,
        message: `OpenRouter model ${model} produced no valid structured payload after sanitization`,
        errorClass: 'sanitizer_rejection',
        responseBodySnippet: sanitizeProviderResponseSnippet(text),
      })
    }

    return {
      payload: sanitized,
      model,
    }
  }

  if (lastError) {
    throw lastError
  }

  return null
}

function extractGeminiText(payload: Record<string, unknown>) {
  const candidates = Array.isArray(payload.candidates) ? payload.candidates as Array<Record<string, unknown>> : []
  const firstCandidate = candidates[0]
  const content = firstCandidate && typeof firstCandidate.content === 'object' ? firstCandidate.content as Record<string, unknown> : null
  const parts = Array.isArray(content?.parts) ? content.parts as Array<Record<string, unknown>> : []
  const textPart = parts.find((part) => typeof part?.text === 'string')
  return typeof textPart?.text === 'string' ? textPart.text : null
}

async function callGeminiStructuredApiSingle(apiKey: string, model: string, input: StrategistProviderInput): Promise<GeneratedPayload | null> {
  let response: Response
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      signal: AbortSignal.timeout(STRATEGIST_PROVIDER_TIMEOUT_MS),
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{
            text: `${input.systemPrompt}\n\nReturn only structured strategist JSON for this scenario payload:\n${JSON.stringify({
              title: input.title,
              description: input.description,
              category: input.category,
              evidenceContext: input.evidenceContext ?? [],
              fallback: input.fallback,
              scenarioClassification: input.scenarioClassification,
              promptPack: input.promptPack
            })}`
          }]
        }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseJsonSchema: STRATEGIST_JSON_SCHEMA
        }
      })
    })
  } catch (error) {
    throw wrapProviderError('gemini', model, error, 'Gemini strategist request failed')
  }

  if (!response.ok) {
    const responseBodySnippet = sanitizeProviderResponseSnippet(await response.text().catch(() => ''))
    throw new StrategistProviderError({
      provider: 'gemini',
      model,
      message: `Gemini API failed with HTTP ${response.status}`,
      errorClass: 'http_error',
      httpStatus: response.status,
      responseBodySnippet,
    })
  }

  const payload = await response.json() as Record<string, unknown>
  const text = extractGeminiText(payload)
  if (!text) {
    throw new StrategistProviderError({
      provider: 'gemini',
      model,
      message: `Gemini model ${model} returned no structured text`,
      errorClass: 'no_structured_text',
    })
  }

  let parsed: StructuredStrategistPayload
  try {
    parsed = parseStructuredPayload(text)
  } catch (error) {
    throw new StrategistProviderError({
      provider: 'gemini',
      model,
      message: `Gemini model ${model} returned invalid structured JSON`,
      errorClass: 'parse_error',
      responseBodySnippet: sanitizeProviderResponseSnippet(text),
    })
  }

  const sanitized = sanitizeStructuredPayload(parsed, input)
  if (!sanitized) {
    throw new StrategistProviderError({
      provider: 'gemini',
      model,
      message: `Gemini model ${model} produced no valid structured payload after sanitization`,
      errorClass: 'sanitizer_rejection',
      responseBodySnippet: sanitizeProviderResponseSnippet(text),
    })
  }

  return {
    payload: sanitized,
    model,
  }
}

async function callGeminiStructuredApi(apiKey: string, primaryModel: string, input: StrategistProviderInput): Promise<GeneratedPayload | null> {
  const fallbackModel = Deno.env.get('GEMINI_FALLBACK_STRATEGIST_MODEL') || 'gemini-2.5-flash'
  const attemptedModels = primaryModel === fallbackModel ? [primaryModel] : [primaryModel, fallbackModel]
  let lastError: StrategistProviderError | null = null

  for (const model of attemptedModels) {
    try {
      return await callGeminiStructuredApiSingle(apiKey, model, input)
    } catch (error) {
      lastError = wrapProviderError('gemini', model, error, 'Gemini strategist request failed')
      console.warn(`gemini strategist attempt failed for ${model}:`, JSON.stringify({
        provider: lastError.provider,
        model: lastError.model,
        error_class: lastError.errorClass,
        http_status: lastError.httpStatus,
        response_body_snippet: lastError.responseBodySnippet,
        message: lastError.message,
      }))
    }
  }

  if (lastError) {
    throw lastError
  }

  return null
}

function buildProviders(): StrategistProvider[] {
  const providers: StrategistProvider[] = []

  const openRouterKey = Deno.env.get('OPENROUTER_API_KEY')
  const configuredOpenRouterModel = Deno.env.get('OPENROUTER_MODEL')?.trim() || ''
  const openRouterPrimaryEnabled = Boolean(openRouterKey) && isPremiumOpenRouterModel(configuredOpenRouterModel)
  const openRouterModel = configuredOpenRouterModel || OPENROUTER_DEFAULT_MODEL
  const pushOpenRouter = () => {
    providers.push({
      name: 'openrouter',
      defaultModel: openRouterModel,
      generate: (input) => callOpenRouterStructuredApi(openRouterKey!, openRouterModel, input)
    })
  }

  if (openRouterPrimaryEnabled) {
    pushOpenRouter()
  }

  const geminiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_AI_API_KEY')
  if (geminiKey) {
    const model = Deno.env.get('GEMINI_STRATEGIST_MODEL') || 'gemini-3-flash-preview'
    providers.push({
      name: 'gemini',
      defaultModel: model,
      generate: (input) => callGeminiStructuredApi(geminiKey, model, input)
    })
  }

  if (openRouterKey && !openRouterPrimaryEnabled) {
    pushOpenRouter()
  }

  const openAiKey = Deno.env.get('OPENAI_API_KEY')
  if (openAiKey) {
    const model = Deno.env.get('OPENAI_STRATEGIST_MODEL') || 'gpt-4o-mini'
    providers.push({
      name: 'openai',
      defaultModel: model,
      generate: (input) => callResponsesApi('openai', 'https://api.openai.com/v1', openAiKey, model, input)
    })
  }

  const xaiKey = Deno.env.get('XAI_API_KEY') || Deno.env.get('GROK_API_KEY')
  if (xaiKey) {
    const model = Deno.env.get('XAI_STRATEGIST_MODEL') || 'grok-4.20-reasoning'
    providers.push({
      name: 'xai',
      defaultModel: model,
      generate: (input) => callResponsesApi('xai', 'https://api.x.ai/v1', xaiKey, model, input)
    })
  }

  return providers
}

export async function generateStrategistPayload(input: StrategistProviderInput): Promise<StrategistProviderResult> {
  const providers = buildProviders()
  const attempts: StrategistProviderAttempt[] = []
  if (providers.length === 0) {
    return {
      ok: false,
      attempts,
      terminal_reason: 'No strategist providers are configured',
      final_error_class: 'no_provider_configured',
    }
  }
  const maxRounds = providers.length > 1 ? 1 : 2

  for (let round = 1; round <= maxRounds; round += 1) {
    for (const provider of providers) {
      try {
        const result = await provider.generate(input)
        if (result) {
          const resolvedModel = result.model || provider.defaultModel
          attempts.push({
            provider: provider.name,
            model: resolvedModel,
            ok: true,
          })
          return {
            ok: true,
            payload: {
              ...result.payload,
              diagnostics: {
                ...(isPlainObject(result.payload.diagnostics) ? result.payload.diagnostics : {}),
                provider_attempts: attempts,
                final_provider: provider.name,
                final_model: resolvedModel,
                retry_round: round,
              },
            },
            provider: provider.name,
            model: resolvedModel,
            attempts,
          }
        }
        attempts.push({
          provider: provider.name,
          model: provider.defaultModel,
          ok: false,
          error: 'empty_structured_payload',
          error_class: 'empty_structured_payload',
        })
      } catch (error) {
        const failedAttempt = buildFailedAttempt(provider.name, provider.defaultModel, error)
        attempts.push(failedAttempt)
        console.warn(`strategist provider ${provider.name} failed:`, JSON.stringify(failedAttempt))
      }
    }

    if (round < maxRounds) {
      await new Promise((resolve) => setTimeout(resolve, 750))
    }
  }

  const lastAttempt = [...attempts].reverse().find((attempt) => !attempt.ok)
  return {
    ok: false,
    attempts,
    terminal_reason: lastAttempt?.error || 'All strategist providers returned empty structured payload',
    final_error_class: lastAttempt?.error_class || 'empty_structured_payload',
    provider: lastAttempt?.provider,
    model: lastAttempt?.model,
  }
}
