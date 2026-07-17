// Strategist Contract
// Normalizes strategist API responses into a consistent type

export interface AdvancedFrameworkOutput {
  framework: string;
  status: 'deterministic' | 'heuristic' | 'incomplete_inputs' | 'rejected' | string;
  summary: string;
  warnings: string[];
  normalized_inputs?: Record<string, unknown> | null;
  results?: Record<string, unknown> | null;
  diagnostics?: { solver_version?: string; errors?: string[]; [k: string]: unknown };
  data?: Record<string, unknown>;
}

export type AdvancedGameOutputs = Record<string, AdvancedFrameworkOutput>;

export interface StrategistClaimEvidenceRef {
  evidence_id: string;
  relevance?: string;
  label?: string;
  sourceType?: string;
  support?: string;
}

export interface StrategistEvidenceEntry {
  id: string;
  source?: string;
  quote?: string;
  url?: string;
  label?: string;
  detail?: string;
  sourceType?: string;
}

export interface StrategistCountermove {
  actorId: string;
  countermove: string;
  rationale?: string;
  whyLikely?: string;
  warningLevel?: string;
  recommendedResponse?: string;
}

export interface StrategistClaimEvidence {
  claim_id: string;
  claim_text: string;
  evidence_refs: StrategistClaimEvidenceRef[];
  confidence?: number;
}

export interface StrategistAnalysis {
  briefId?: string;
  scenarioSummary?: string;
  executive_summary?: string;
  summary?: string;
  keyPlayers?: Array<{ name: string; role: string; priorities: string[] }>;
  strategicOptions?: Array<{
    name: string;
    rationale: string;
    risks: string[];
    expectedOutcome: string;
  }>;
  recommendations?: string[];
  assumptions?: string[];
  confidenceLevel?: 'low' | 'medium' | 'high';
  generatedAt?: string;
  provenance_status?: string;
  advanced_game_outputs?: AdvancedGameOutputs;
  countermoves: StrategistCountermove[];
  claim_to_evidence: StrategistClaimEvidence[];
  evidence: StrategistEvidenceEntry[];
  // Extended fields from full contract
  game_classification: { game_family?: string; domain?: string; actor_count?: number; move_structure?: string; information_structure?: string; decision_objective?: string; confidence?: number; why_fit?: string; doctrine_ids?: string[]; template_id?: string; [k: string]: unknown };
  actors: Array<{ id: string; name: string; role: string; objectives?: string[] }>;
  actor_map: Array<{ actorId: string; name?: string; role?: string; objective?: string; leverage?: string[]; constraint?: string[]; likelyMove?: string; [k: string]: unknown }>;
  outside_options: Array<{ actorId: string; batna?: string; reservationValue?: string; leverageNotes?: string[]; [k: string]: unknown }>;
  incentives: Array<{ actorId: string; incentives?: string[]; leverage?: string[]; constraints?: string[]; [k: string]: unknown }>;
  strategy_space: Array<{ actorId: string; options?: Array<{ action: string; expectedValue?: number; rationale?: string; riskLevel?: string; [k: string]: unknown }>; [k: string]: unknown }>;
  equilibria: Array<{ name: string; profile?: Record<string, unknown>; whyItHolds?: string; stability?: number; [k: string]: unknown }>;
  opponent_types: Array<{ label: string; probability?: number; tell?: string; recommendedAdjustment?: string; [k: string]: unknown }>;
  key_uncertainties: Array<{ uncertainty: string; whyItMatters?: string; signpost?: string; mitigation?: string; [k: string]: unknown }>;
  recommendation: { primary_action?: string; rationale?: string; expected_outcome?: string; confidence_interval?: [number, number]; key_insights?: string[]; alternatives?: Array<{ action: string; expected_value?: number; risk_level?: string; [k: string]: unknown }>; [k: string]: unknown };
  dynamic_adjustments: Array<{ trigger: string; adjustment: string; reason?: string; [k: string]: unknown }>;
  biases: Array<{ type: string; confidence?: number; description?: string; intervention?: string; [k: string]: unknown }>;
  confidence?: number;
  source?: string;
  [k: string]: unknown;
}

export interface StrategistResponse {
  success?: boolean;
  decision_id?: string;
  strategist: StrategistAnalysis;
  error?: string;
  [k: string]: unknown;
}

interface StrategistApiResponse {
  success?: boolean;
  decision_id?: string;
  strategist?: Record<string, unknown>;
  brief?: Record<string, unknown>;
  analysis?: Record<string, unknown>;
  error?: string;
  biases_detected?: Array<{ type: string; confidence: number; description: string }>;
  recommendation?: { confidence?: number; recommendation?: Record<string, unknown> } & Record<string, unknown>;
  debiasing_advice?: string[];
  [k: string]: unknown;
}

function defaultStrategist(): StrategistAnalysis {
  return {
    executive_summary: '',
    summary: '',
    game_classification: { game_family: 'unknown' },
    actors: [],
    actor_map: [],
    outside_options: [],
    incentives: [],
    strategy_space: [],
    equilibria: [],
    opponent_types: [],
    countermoves: [],
    key_uncertainties: [],
    claim_to_evidence: [],
    evidence: [],
    biases: [],
    dynamic_adjustments: [],
    recommendation: {},
    provenance_status: 'none',
    source: 'unknown',
  };
}

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function sanitizeStrategist(strategist: StrategistAnalysis): StrategistAnalysis {
  // Guard malformed arrays — ensure they are arrays before any .map/.filter/.every
  strategist.actors = safeArray(strategist.actors);
  strategist.actor_map = safeArray(strategist.actor_map);
  strategist.outside_options = safeArray(strategist.outside_options);
  strategist.incentives = safeArray(strategist.incentives);
  strategist.strategy_space = safeArray(strategist.strategy_space);
  strategist.equilibria = safeArray(strategist.equilibria);
  strategist.opponent_types = safeArray(strategist.opponent_types);
  strategist.countermoves = safeArray(strategist.countermoves);
  strategist.key_uncertainties = safeArray(strategist.key_uncertainties);
  strategist.biases = safeArray(strategist.biases);
  strategist.dynamic_adjustments = safeArray(strategist.dynamic_adjustments);
  strategist.evidence = safeArray(strategist.evidence);
  strategist.claim_to_evidence = safeArray(strategist.claim_to_evidence);

  const evidence = strategist.evidence as StrategistEvidenceEntry[] | undefined;
  const evidenceIds = new Set(evidence?.map(e => e?.id).filter(Boolean) ?? []);

  // Strip forged evidence refs and remove claims with no valid evidence
  const claims = strategist.claim_to_evidence as StrategistClaimEvidence[] | undefined;
  if (claims && claims.length > 0) {
    const validClaims = claims
      .filter(c => c && c.claim_id) // Guard null/malformed claim entries
      .map(c => {
        const refs = safeArray<StrategistClaimEvidenceRef>(c.evidence_refs);
        const seenRefIds = new Set<string>(); // Per-claim dedup
        return {
          ...c,
          evidence_refs: refs
            .filter(ref => ref && ref.evidence_id && evidenceIds.has(ref.evidence_id))
            .filter(ref => {
              if (seenRefIds.has(ref.evidence_id)) return false;
              seenRefIds.add(ref.evidence_id);
              return true;
            }),
        };
      })
      .filter(c => c.evidence_refs.length > 0); // Remove claims with no valid evidence
    strategist.claim_to_evidence = validClaims;
  } else if (claims && claims.length === 0) {
    strategist.claim_to_evidence = [];
  } else {
    strategist.claim_to_evidence = [];
  }

  // Downgrade provenance when evidence is weak or missing
  const currentStatus = strategist.provenance_status;
  const hasEvidence = (evidence?.length ?? 0) > 0;
  const hasValidClaims = (strategist.claim_to_evidence?.length ?? 0) > 0;

  if (currentStatus === 'evidence_backed') {
    if (!hasEvidence || !hasValidClaims) {
      strategist.provenance_status = 'llm_unverified';
    } else {
      // Check if all evidence is llm_inference — downgrade if so
      const allLlmInference = evidence!.every(e => e?.sourceType === 'llm_inference');
      const hasUserEvidence = evidence!.some(e => e?.sourceType === 'user_input' || e?.sourceType === 'verified');
      if (allLlmInference && !hasUserEvidence) {
        strategist.provenance_status = 'llm_unverified';
      }
    }
  }

  if (currentStatus === undefined || currentStatus === null || currentStatus === 'none') {
    const hasUserEvidence = evidence?.some(e => e?.sourceType === 'user_input' || e?.sourceType === 'verified');
    const allLlmInference = (evidence?.length ?? 0) > 0 && evidence!.every(e => e?.sourceType === 'llm_inference');
    const isLlmSource = strategist.source === 'llm';
    if ((allLlmInference && !hasUserEvidence) || (isLlmSource && !hasUserEvidence && (evidence?.length ?? 0) === 0)) {
      strategist.provenance_status = 'llm_unverified';
    }
  }

  // Force llm_unverified when no valid claims remain (unless heuristic_fallback)
  if (strategist.provenance_status !== 'heuristic_fallback') {
    if (!hasEvidence && !hasValidClaims && strategist.provenance_status === 'evidence_backed') {
      strategist.provenance_status = 'llm_unverified';
    }
  }

  // Normalize advanced_game_outputs
  if (strategist.advanced_game_outputs) {
    strategist.advanced_game_outputs = normalizeAdvancedGameOutputs(strategist.advanced_game_outputs);
  }

  return strategist;
}

export function normalizeStrategistResponse(json: unknown): StrategistResponse {
  if (!json || typeof json !== 'object') {
    return { success: false, strategist: defaultStrategist() };
  }

  const response = json as StrategistApiResponse;

  if (response.error) {
    return { success: false, strategist: defaultStrategist(), error: response.error };
  }

  // Direct strategist path
  if (response.strategist && typeof response.strategist === 'object') {
    const s = response.strategist as Record<string, unknown>;
    const strategist: StrategistAnalysis = { ...defaultStrategist(), ...s } as StrategistAnalysis;
    const sanitized = sanitizeStrategist(strategist);

    return {
      success: response.success ?? true,
      decision_id: response.decision_id,
      strategist: sanitized,
      debiasing_advice: response.debiasing_advice,
    } as StrategistResponse;
  }

  // Legacy coach backfill path
  if (response.biases_detected || (response.recommendation && response.recommendation.recommendation)) {
    const rec = response.recommendation?.recommendation as Record<string, unknown> | undefined;
    const biases = (response.biases_detected || []).map((b: { type: string; confidence: number; description: string }) => ({
      type: b.type,
      confidence: b.confidence,
      description: b.description,
    }));

    const strategist: StrategistAnalysis = {
      executive_summary: (rec?.rationale as string) || '',
      summary: (rec?.rationale as string) || '',
      game_classification: { game_family: 'unknown' },
      actors: [],
      actor_map: [],
      outside_options: [{ actorId: 'you', batna: 'Not specified' }],
      incentives: [],
      strategy_space: [],
      equilibria: [],
      opponent_types: [],
      countermoves: [],
      key_uncertainties: [],
      claim_to_evidence: [],
      evidence: [],
      biases,
      recommendation: rec as StrategistAnalysis['recommendation'],
      dynamic_adjustments: [],
      provenance_status: 'heuristic_fallback',
      confidence: response.recommendation?.confidence,
      source: 'heuristic',
    };

    return {
      success: response.success ?? true,
      decision_id: response.decision_id,
      strategist: sanitizeStrategist(strategist),
      debiasing_advice: response.debiasing_advice,
    } as StrategistResponse;
  }

  // Fallback: brief or analysis
  const fallback = response.brief ?? response.analysis ?? null;
  if (fallback && typeof fallback === 'object') {
    const fallbackStrategist = { ...defaultStrategist(), ...fallback } as StrategistAnalysis;
    return {
      success: response.success ?? true,
      decision_id: response.decision_id,
      strategist: sanitizeStrategist(fallbackStrategist),
    };
  }

  return { success: false, strategist: defaultStrategist() };
}

export function normalizeAdvancedGameOutputs(raw: unknown): AdvancedGameOutputs | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }

  const result: AdvancedGameOutputs = {};
  const entries = raw as Record<string, unknown>;

  for (const [key, value] of Object.entries(entries)) {
    if (!value || typeof value !== 'object') {
      // Malformed envelope — mark as rejected
      result[key] = {
        framework: key,
        status: 'rejected',
        summary: '',
        warnings: [],
        diagnostics: { errors: ['invalid_framework_envelope'] },
      };
      continue;
    }

    const entry = value as Record<string, unknown>;
    const errors: string[] = [];

    // Check for required normalized_inputs
    if (entry.normalized_inputs === null || entry.normalized_inputs === undefined) {
      errors.push('missing_normalized_inputs');
    }

    const status = errors.length > 0
      ? 'incomplete_inputs'
      : (entry.status as string) || 'incomplete_inputs';

    result[key] = {
      framework: (entry.framework as string) || key,
      status,
      summary: (entry.summary as string) || '',
      warnings: Array.isArray(entry.warnings) ? (entry.warnings as string[]) : [],
      normalized_inputs: (entry.normalized_inputs as Record<string, unknown>) ?? null,
      results: (entry.results as Record<string, unknown>) ?? null,
      diagnostics: {
        ...(entry.diagnostics as Record<string, unknown>),
        ...(errors.length > 0 ? { errors } : {}),
      },
    };
  }

  return Object.keys(result).length > 0 ? result : undefined;
}
