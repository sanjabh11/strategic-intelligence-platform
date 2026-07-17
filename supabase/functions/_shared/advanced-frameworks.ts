export type AdvancedFrameworkStatus =
  | 'deterministic'
  | 'heuristic'
  | 'incomplete_inputs'
  | 'rejected'

export type AdvancedFrameworkKey =
  | 'coalitional'
  | 'signaling'
  | 'correlated'
  | 'evolutionary'
  | 'bounded_rationality'

export interface CoalitionalGameInput {
  players: string[]
  coalition_values: Record<string, number>
}

export interface PerfectBayesianInput {
  sender_types: string[]
  prior_probs: Record<string, number>
  messages: string[]
  receiver_actions: string[]
  sender_strategies: Record<string, Record<string, number>>
  observed_message?: string
  sender_payoffs: Record<string, Record<string, Record<string, number>>>
  receiver_payoffs: Record<string, Record<string, Record<string, number>>>
}

export interface CorrelatedEquilibriumInput {
  players: string[]
  actions_by_player: string[][]
  payoff_matrix: number[][][]
  objective?: 'welfare_maximizing' | 'validation_only'
}

export interface EvolutionaryInput {
  strategies: string[]
  payoff_matrix: number[][]
  initial_shares: number[]
  steps?: number
  dt?: number
}

export interface BoundedRationalityInput {
  players: string[]
  actions_by_player: string[][]
  payoff_matrix: number[][][]
  lambda?: number
}

export interface AdvancedGameInputs {
  coalitional?: CoalitionalGameInput
  signaling?: PerfectBayesianInput
  correlated?: CorrelatedEquilibriumInput
  evolutionary?: EvolutionaryInput
  bounded_rationality?: BoundedRationalityInput
}

export interface AdvancedFrameworkEnvelope {
  framework: AdvancedFrameworkKey
  status: AdvancedFrameworkStatus
  summary: string
  normalized_inputs: Record<string, unknown>
  results: Record<string, unknown> | null
  diagnostics: Record<string, unknown>
  warnings: string[]
}

export const MAX_COALITION_PLAYERS = 12
export const MAX_NORMAL_FORM_PROFILES = 4096
export const MAX_SIGNAL_TYPES = 6
export const MAX_MESSAGES = 8
export const MAX_RECEIVER_ACTIONS = 8
export const MAX_EVOLUTIONARY_STEPS = 2000

type SanitizedFrameworkValue = AdvancedGameInputs[AdvancedFrameworkKey]

export interface FrameworkSanitizationResult {
  value?: SanitizedFrameworkValue
  modified: boolean
  errors: string[]
  warnings: string[]
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function uniqueStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return []
  return Array.from(
    new Set(
      values
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map((value) => value.trim()),
    ),
  )
}

export function approxEqual(value: number, expected: number, tolerance = 1e-6) {
  return Math.abs(value - expected) <= tolerance
}

function normalizeProbabilityRecord(
  value: unknown,
  expectedKeys?: string[],
): { value?: Record<string, number>; modified: boolean; errors: string[] } {
  if (!isPlainObject(value)) {
    return { modified: false, errors: ['probability_record_missing_or_invalid'] }
  }

  const allowedKeys = expectedKeys ? new Set(expectedKeys) : null
  const errors: string[] = []
  let modified = false
  const record: Record<string, number> = {}

  for (const [rawKey, rawProbability] of Object.entries(value)) {
    const key = rawKey.trim()
    if (!key) {
      modified = true
      errors.push('probability_record_contains_blank_key')
      continue
    }
    if (allowedKeys && !allowedKeys.has(key)) {
      modified = true
      errors.push(`probability_record_contains_unknown_key:${key}`)
      continue
    }
    if (typeof rawProbability !== 'number' || !Number.isFinite(rawProbability) || rawProbability < 0) {
      errors.push(`probability_record_contains_invalid_value:${key}`)
      continue
    }
    record[key] = rawProbability
  }

  if (Object.keys(record).length === 0) {
    errors.push('probability_record_empty_after_sanitization')
    return { modified, errors }
  }

  if (allowedKeys) {
    const missing = expectedKeys!.filter((key) => !(key in record))
    if (missing.length > 0) {
      errors.push(`probability_record_missing_keys:${missing.join(',')}`)
    }
  }

  const total = Object.values(record).reduce((sum, probability) => sum + probability, 0)
  if (!approxEqual(total, 1, 1e-3)) {
    errors.push('probability_record_sum_not_one')
  }

  return errors.length > 0
    ? { modified, errors }
    : { value: record, modified, errors: [] }
}

function normalizeCoalitionKey(rawKey: string, allowedPlayers: Set<string>) {
  if (rawKey === '__empty__') return '__empty__'
  const members = rawKey
    .split('|')
    .map((entry) => entry.trim())
    .filter(Boolean)
  if (members.length === 0) return null
  if (members.some((member) => !allowedPlayers.has(member))) return null
  return Array.from(new Set(members)).sort().join('|')
}

function validateTwoPlayerTensor(
  players: string[],
  actionsByPlayer: string[][],
  payoffMatrix: unknown,
): { ok: boolean; errors: string[] } {
  const errors: string[] = []
  if (players.length !== 2) {
    errors.push('two_player_solver_requires_exactly_two_players')
  }
  if (actionsByPlayer.length !== players.length) {
    errors.push('actions_by_player_length_mismatch')
  }

  const actionCounts = actionsByPlayer.map((actions) => actions.length)
  const profileCount = actionCounts.reduce((product, count) => product * Math.max(1, count), 1)
  if (profileCount > MAX_NORMAL_FORM_PROFILES) {
    errors.push(`normal_form_profile_count_exceeds_ceiling:${MAX_NORMAL_FORM_PROFILES}`)
  }

  if (!Array.isArray(payoffMatrix)) {
    errors.push('payoff_matrix_missing_or_invalid')
    return { ok: false, errors }
  }

  const outerLength = actionCounts[0] || 0
  const innerLength = actionCounts[1] || 0
  if (payoffMatrix.length !== outerLength) {
    errors.push('payoff_matrix_outer_dimension_mismatch')
  }

  for (let i = 0; i < payoffMatrix.length; i += 1) {
    const row = payoffMatrix[i]
    if (!Array.isArray(row) || row.length !== innerLength) {
      errors.push('payoff_matrix_inner_dimension_mismatch')
      continue
    }
    for (let j = 0; j < row.length; j += 1) {
      const cell = row[j]
      if (!Array.isArray(cell) || cell.length !== players.length) {
        errors.push('payoff_matrix_terminal_dimension_mismatch')
        continue
      }
      if (cell.some((value) => typeof value !== 'number' || !Number.isFinite(value))) {
        errors.push('payoff_matrix_contains_non_finite_values')
      }
    }
  }

  return { ok: errors.length === 0, errors }
}

function sanitizeCoalitionalInput(
  rawValue: unknown,
  options: { allowedPlayers?: Set<string> },
): FrameworkSanitizationResult {
  if (!isPlainObject(rawValue)) {
    return { modified: false, errors: ['coalitional_input_missing_or_invalid'], warnings: [] }
  }

  const allowedPlayers = options.allowedPlayers
  const rawPlayers = uniqueStrings(rawValue.players)
  const players = allowedPlayers
    ? rawPlayers.filter((player) => allowedPlayers.has(player))
    : rawPlayers
  const modified = players.length !== rawPlayers.length
  const errors: string[] = []

  if (players.length < 3) {
    errors.push('coalitional_players_below_minimum')
  }
  if (players.length > MAX_COALITION_PLAYERS) {
    errors.push(`coalitional_players_exceed_ceiling:${MAX_COALITION_PLAYERS}`)
  }

  const coalitionValuesRaw = isPlainObject(rawValue.coalition_values) ? rawValue.coalition_values : {}
  const coalitionValues: Record<string, number> = {}
  const playerSet = new Set(players)
  let nextModified = modified

  for (const [rawKey, rawCoalitionValue] of Object.entries(coalitionValuesRaw)) {
    if (typeof rawCoalitionValue !== 'number' || !Number.isFinite(rawCoalitionValue)) {
      errors.push(`coalitional_worth_non_finite:${rawKey}`)
      continue
    }
    const normalizedKey = normalizeCoalitionKey(rawKey, playerSet)
    if (!normalizedKey) {
      errors.push(`coalitional_invalid_key:${rawKey}`)
      continue
    }
    if (normalizedKey !== rawKey) {
      nextModified = true
    }
    coalitionValues[normalizedKey] = rawCoalitionValue
  }

  const grandCoalitionKey = players.slice().sort().join('|')
  if (players.length >= 3 && !(grandCoalitionKey in coalitionValues)) {
    errors.push('coalitional_missing_grand_coalition_worth')
  }

  return errors.length > 0
    ? { modified: nextModified, errors, warnings: [] }
    : {
        value: {
          players,
          coalition_values: coalitionValues,
        },
        modified: nextModified,
        errors: [],
        warnings: [],
      }
}

function sanitizeSignalingInput(rawValue: unknown): FrameworkSanitizationResult {
  if (!isPlainObject(rawValue)) {
    return { modified: false, errors: ['signaling_input_missing_or_invalid'], warnings: [] }
  }

  const senderTypes = uniqueStrings(rawValue.sender_types)
  const messages = uniqueStrings(rawValue.messages)
  const receiverActions = uniqueStrings(rawValue.receiver_actions)
  const errors: string[] = []
  const warnings: string[] = []
  let modified = false

  if (senderTypes.length === 0) errors.push('signaling_missing_sender_types')
  if (messages.length === 0) errors.push('signaling_missing_messages')
  if (receiverActions.length === 0) errors.push('signaling_missing_receiver_actions')
  if (senderTypes.length > MAX_SIGNAL_TYPES) errors.push(`signaling_sender_types_exceed_ceiling:${MAX_SIGNAL_TYPES}`)
  if (messages.length > MAX_MESSAGES) errors.push(`signaling_messages_exceed_ceiling:${MAX_MESSAGES}`)
  if (receiverActions.length > MAX_RECEIVER_ACTIONS) errors.push(`signaling_receiver_actions_exceed_ceiling:${MAX_RECEIVER_ACTIONS}`)

  const prior = normalizeProbabilityRecord(rawValue.prior_probs, senderTypes)
  if (!prior.value) {
    errors.push(...prior.errors)
  }

  const senderStrategiesRaw = isPlainObject(rawValue.sender_strategies) ? rawValue.sender_strategies : {}
  const senderStrategies: Record<string, Record<string, number>> = {}
  for (const senderType of senderTypes) {
    const row = normalizeProbabilityRecord(senderStrategiesRaw[senderType], messages)
    if (!row.value) {
      errors.push(...row.errors.map((error) => `sender_strategies:${senderType}:${error}`))
      continue
    }
    senderStrategies[senderType] = row.value
    modified = modified || row.modified
  }

  const senderPayoffs = isPlainObject(rawValue.sender_payoffs) ? rawValue.sender_payoffs : null
  const receiverPayoffs = isPlainObject(rawValue.receiver_payoffs) ? rawValue.receiver_payoffs : null
  if (!senderPayoffs) errors.push('signaling_missing_sender_payoffs')
  if (!receiverPayoffs) errors.push('signaling_missing_receiver_payoffs')

  if (senderPayoffs && receiverPayoffs) {
    for (const senderType of senderTypes) {
      if (!isPlainObject(senderPayoffs[senderType]) || !isPlainObject(receiverPayoffs[senderType])) {
        errors.push(`signaling_missing_payoff_table:${senderType}`)
        continue
      }
      for (const message of messages) {
        const senderRow = senderPayoffs[senderType]?.[message]
        const receiverRow = receiverPayoffs[senderType]?.[message]
        if (!isPlainObject(senderRow) || !isPlainObject(receiverRow)) {
          errors.push(`signaling_missing_payoff_row:${senderType}:${message}`)
          continue
        }
        for (const action of receiverActions) {
          const senderValue = senderRow[action]
          const receiverValue = receiverRow[action]
          if (typeof senderValue !== 'number' || !Number.isFinite(senderValue)) {
            errors.push(`signaling_invalid_sender_payoff:${senderType}:${message}:${action}`)
          }
          if (typeof receiverValue !== 'number' || !Number.isFinite(receiverValue)) {
            errors.push(`signaling_invalid_receiver_payoff:${senderType}:${message}:${action}`)
          }
        }
      }
    }
  }

  let observedMessage: string | undefined
  if (typeof rawValue.observed_message === 'string' && rawValue.observed_message.trim().length > 0) {
    if (messages.includes(rawValue.observed_message.trim())) {
      observedMessage = rawValue.observed_message.trim()
    } else {
      modified = true
      warnings.push('signaling_observed_message_removed')
    }
  }

  return errors.length > 0 || !prior.value || !senderPayoffs || !receiverPayoffs || Object.keys(senderStrategies).length !== senderTypes.length
    ? { modified: modified || prior.modified, errors, warnings }
    : {
        value: {
          sender_types: senderTypes,
          prior_probs: prior.value,
          messages,
          receiver_actions: receiverActions,
          sender_strategies: senderStrategies,
          observed_message: observedMessage,
          sender_payoffs: senderPayoffs as PerfectBayesianInput['sender_payoffs'],
          receiver_payoffs: receiverPayoffs as PerfectBayesianInput['receiver_payoffs'],
        },
        modified: modified || prior.modified,
        errors: [],
        warnings,
      }
}

function sanitizeNormalFormInput(
  framework: 'correlated' | 'bounded_rationality',
  rawValue: unknown,
  options: { allowedPlayers?: Set<string> },
): FrameworkSanitizationResult {
  if (!isPlainObject(rawValue)) {
    return { modified: false, errors: [`${framework}_input_missing_or_invalid`], warnings: [] }
  }

  const allowedPlayers = options.allowedPlayers
  const rawPlayers = uniqueStrings(rawValue.players)
  const players = allowedPlayers ? rawPlayers.filter((player) => allowedPlayers.has(player)) : rawPlayers
  let modified = players.length !== rawPlayers.length
  const actionsByPlayer = Array.isArray(rawValue.actions_by_player)
    ? rawValue.actions_by_player.map((entry) => uniqueStrings(entry))
    : []
  const payoffMatrix = rawValue.payoff_matrix
  const tensorValidation = validateTwoPlayerTensor(players, actionsByPlayer, payoffMatrix)
  if (!tensorValidation.ok) {
    return { modified, errors: tensorValidation.errors, warnings: [] }
  }

  if (framework === 'correlated') {
    const objective = rawValue.objective === 'validation_only' ? 'validation_only' : 'welfare_maximizing'
    if (objective !== rawValue.objective && rawValue.objective !== undefined) {
      modified = true
    }
    return {
      value: {
        players,
        actions_by_player: actionsByPlayer,
        payoff_matrix: payoffMatrix as number[][][],
        objective,
      },
      modified,
      errors: [],
      warnings: [],
    }
  }

  let lambda: number | undefined
  if (rawValue.lambda !== undefined) {
    if (typeof rawValue.lambda === 'number' && Number.isFinite(rawValue.lambda) && rawValue.lambda >= 0) {
      lambda = rawValue.lambda
    } else {
      return { modified, errors: ['bounded_rationality_invalid_lambda'], warnings: [] }
    }
  }

  return {
    value: {
      players,
      actions_by_player: actionsByPlayer,
      payoff_matrix: payoffMatrix as number[][][],
      ...(lambda !== undefined ? { lambda } : {}),
    },
    modified,
    errors: [],
    warnings: [],
  }
}

function sanitizeEvolutionaryInput(rawValue: unknown): FrameworkSanitizationResult {
  if (!isPlainObject(rawValue)) {
    return { modified: false, errors: ['evolutionary_input_missing_or_invalid'], warnings: [] }
  }

  const strategies = uniqueStrings(rawValue.strategies)
  const payoffMatrix = Array.isArray(rawValue.payoff_matrix) ? rawValue.payoff_matrix : []
  const initialShares = Array.isArray(rawValue.initial_shares)
    ? rawValue.initial_shares.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    : []
  const errors: string[] = []
  const warnings: string[] = []
  let modified = false

  if (strategies.length < 2) errors.push('evolutionary_missing_or_small_strategy_set')
  if (payoffMatrix.length !== strategies.length) errors.push('evolutionary_payoff_matrix_dimension_mismatch')
  if (initialShares.length !== strategies.length) errors.push('evolutionary_initial_shares_dimension_mismatch')

  for (const row of payoffMatrix) {
    if (!Array.isArray(row) || row.length !== strategies.length || row.some((value) => typeof value !== 'number' || !Number.isFinite(value))) {
      errors.push('evolutionary_payoff_matrix_invalid')
      break
    }
  }

  const shareTotal = initialShares.reduce((sum, value) => sum + value, 0)
  if (!approxEqual(shareTotal, 1, 1e-3)) {
    errors.push('evolutionary_initial_shares_not_normalized')
  }

  let steps: number | undefined
  if (rawValue.steps !== undefined) {
    if (typeof rawValue.steps !== 'number' || !Number.isFinite(rawValue.steps) || rawValue.steps <= 0) {
      errors.push('evolutionary_invalid_steps')
    } else {
      steps = Math.min(MAX_EVOLUTIONARY_STEPS, Math.max(1, Math.trunc(rawValue.steps)))
      if (steps !== rawValue.steps) {
        modified = true
        warnings.push(`evolutionary_steps_clamped:${MAX_EVOLUTIONARY_STEPS}`)
      }
    }
  }

  let dt: number | undefined
  if (rawValue.dt !== undefined) {
    if (typeof rawValue.dt !== 'number' || !Number.isFinite(rawValue.dt) || rawValue.dt <= 0) {
      errors.push('evolutionary_invalid_dt')
    } else {
      dt = rawValue.dt
    }
  }

  return errors.length > 0
    ? { modified, errors, warnings }
    : {
        value: {
          strategies,
          payoff_matrix: payoffMatrix as number[][],
          initial_shares: initialShares,
          ...(steps !== undefined ? { steps } : {}),
          ...(dt !== undefined ? { dt } : {}),
        },
        modified,
        errors: [],
        warnings,
      }
}

export function sanitizeAdvancedFrameworkInput(
  framework: AdvancedFrameworkKey,
  rawValue: unknown,
  options: { allowedPlayers?: Iterable<string> } = {},
): FrameworkSanitizationResult {
  const allowedPlayers = options.allowedPlayers ? new Set(options.allowedPlayers) : undefined

  switch (framework) {
    case 'coalitional':
      return sanitizeCoalitionalInput(rawValue, { allowedPlayers })
    case 'signaling':
      return sanitizeSignalingInput(rawValue)
    case 'correlated':
      return sanitizeNormalFormInput('correlated', rawValue, { allowedPlayers })
    case 'evolutionary':
      return sanitizeEvolutionaryInput(rawValue)
    case 'bounded_rationality':
      return sanitizeNormalFormInput('bounded_rationality', rawValue, { allowedPlayers })
  }
}

export function sanitizeAdvancedGameInputs(
  rawInputs: unknown,
  options: { allowedPlayers?: Iterable<string> } = {},
): { value?: AdvancedGameInputs; modified: boolean; rejections: Partial<Record<AdvancedFrameworkKey, string[]>> } {
  if (!isPlainObject(rawInputs)) {
    return { value: undefined, modified: false, rejections: {} }
  }

  const outputs: AdvancedGameInputs = {}
  const rejections: Partial<Record<AdvancedFrameworkKey, string[]>> = {}
  let modified = false

  for (const framework of ['coalitional', 'signaling', 'correlated', 'evolutionary', 'bounded_rationality'] as const) {
    if (!(framework in rawInputs)) continue
    const result = sanitizeAdvancedFrameworkInput(framework, rawInputs[framework], options)
    modified = modified || result.modified
    if (result.value) {
      outputs[framework] = result.value as never
      continue
    }
    rejections[framework] = result.errors
  }

  return {
    value: Object.keys(outputs).length > 0 ? outputs : undefined,
    modified,
    rejections,
  }
}

function normalizeStatus(value: unknown, fallback: AdvancedFrameworkStatus): AdvancedFrameworkStatus {
  return ['deterministic', 'heuristic', 'incomplete_inputs', 'rejected'].includes(String(value))
    ? (value as AdvancedFrameworkStatus)
    : fallback
}

function normalizeWarnings(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0) : []
}

export function buildFrameworkEnvelope(
  framework: AdvancedFrameworkKey,
  partial: Partial<AdvancedFrameworkEnvelope>,
): AdvancedFrameworkEnvelope {
  return {
    framework,
    status: partial.status || 'heuristic',
    summary: typeof partial.summary === 'string' && partial.summary.trim().length > 0
      ? partial.summary
      : `${framework.replace(/_/g, ' ')} data is present but incomplete.`,
    normalized_inputs: isPlainObject(partial.normalized_inputs) ? partial.normalized_inputs : {},
    results: isPlainObject(partial.results) ? partial.results : null,
    diagnostics: isPlainObject(partial.diagnostics) ? partial.diagnostics : {},
    warnings: normalizeWarnings(partial.warnings),
  }
}

export function coerceAdvancedFrameworkEnvelope(
  framework: AdvancedFrameworkKey,
  rawValue: unknown,
  options: { allowedPlayers?: Iterable<string> } = {},
): AdvancedFrameworkEnvelope | undefined {
  if (rawValue === undefined) return undefined
  if (!isPlainObject(rawValue)) {
    return buildFrameworkEnvelope(framework, {
      status: 'rejected',
      summary: `${framework.replace(/_/g, ' ')} payload was malformed and has been masked.`,
      diagnostics: { errors: ['invalid_framework_envelope'] },
      warnings: ['Framework payload was not an object and could not be trusted.'],
    })
  }

  const baseWarnings = normalizeWarnings(rawValue.warnings)
  const baseDiagnostics = isPlainObject(rawValue.diagnostics) ? rawValue.diagnostics : {}
  const summary = typeof rawValue.summary === 'string' && rawValue.summary.trim().length > 0
    ? rawValue.summary
    : `${framework.replace(/_/g, ' ')} deterministic inputs captured for validation.`

  if (!isPlainObject(rawValue.normalized_inputs)) {
    return buildFrameworkEnvelope(framework, {
      framework,
      status: 'incomplete_inputs',
      summary,
      diagnostics: {
        ...baseDiagnostics,
        errors: Array.from(new Set([...(Array.isArray(baseDiagnostics.errors) ? baseDiagnostics.errors : []), 'missing_normalized_inputs'])),
      },
      warnings: Array.from(new Set([...baseWarnings, 'Framework data is unavailable until normalized inputs are supplied.'])),
    })
  }

  const sanitized = sanitizeAdvancedFrameworkInput(framework, rawValue.normalized_inputs, options)
  if (!sanitized.value) {
    return buildFrameworkEnvelope(framework, {
      framework,
      status: 'rejected',
      summary,
      diagnostics: {
        ...baseDiagnostics,
        errors: Array.from(new Set([...(Array.isArray(baseDiagnostics.errors) ? baseDiagnostics.errors : []), ...sanitized.errors])),
      },
      warnings: Array.from(new Set([...baseWarnings, ...sanitized.warnings, 'Framework payload failed validation and was masked.'])),
    })
  }

  return buildFrameworkEnvelope(framework, {
    framework,
    status: normalizeStatus(rawValue.status, sanitized.modified ? 'heuristic' : 'heuristic'),
    summary,
    normalized_inputs: sanitized.value as unknown as Record<string, unknown>,
    results: isPlainObject(rawValue.results) ? rawValue.results : null,
    diagnostics: {
      ...baseDiagnostics,
      ...(sanitized.modified ? { normalized_by_validator: true } : {}),
    },
    warnings: Array.from(new Set([...baseWarnings, ...sanitized.warnings])),
  })
}
