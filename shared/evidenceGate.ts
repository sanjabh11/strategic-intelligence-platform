/**
 * Evidence Gate — ProphetHacks-inspired 3-question gate for forecast adjustments.
 *
 * Before nudging a forecast probability away from its prior, the gate asks:
 *   1. Is the evidence relevant and directionally useful?
 *   2. Is the evidence credible?
 *   3. Is the evidence probably NOT already reflected in the prior?
 *
 * If any answer is "no", the gate returns "no_move" — which is a valid output,
 * not a failure. This conservatism is exactly what let the ProphetHacks runner-up
 * edge ahead of the market: it rarely gave anything back.
 *
 * Source: https://www.prophetarena.co/research/prophethacks
 */

export type EvidenceGateDecision = 'move' | 'no_move'

export interface EvidenceGateInput {
  /** Number of evidence retrievals backing the adjustment. */
  evidenceCount: number
  /** Number of distinct providers among the retrievals (e.g. Exa, Firecrawl, GDELT). */
  distinctProviderCount: number
  /** Whether at least one source is an official/primary source (API, government feed, exchange). */
  hasPrimarySource: boolean
  /** Whether the evidence was retrieved within the freshness window (e.g. 7 days). */
  isFresh: boolean
  /** Whether the prior already incorporates market signal or recent evidence. */
  priorIncorporatesMarket: boolean
  /** Confidence of the champion model (0-1). */
  modelConfidence: number
  /** Disagreement index among panel agents (0-1). Higher = more disagreement. */
  disagreementIndex: number
}

export interface EvidenceGateResult {
  decision: EvidenceGateDecision
  reason: string
  /** Which of the 3 gate questions failed, if any. */
  failedGate: 'relevance' | 'credibility' | 'not_priced_in' | null
  /** Human-readable summary of the gate assessment. */
  summary: string
}

/**
 * Assess whether evidence is strong enough to justify moving away from the prior.
 *
 * The three gates map to the ProphetHacks runner-up's design:
 *   - Relevance: Is the evidence directionally useful for this specific question?
 *   - Credibility: Is the evidence from a credible source?
 *   - Not priced in: Is the evidence likely NOT already reflected in the prior?
 */
export function assessEvidenceGate(input: EvidenceGateInput): EvidenceGateResult {
  // Gate 1: Relevance — enough evidence from enough providers
  const relevant = input.evidenceCount >= 2 && input.distinctProviderCount >= 1
  if (!relevant) {
    return {
      decision: 'no_move',
      reason: 'Insufficient evidence volume or provider diversity to justify adjustment.',
      failedGate: 'relevance',
      summary: `Evidence gate: BLOCKED on relevance. ${input.evidenceCount} sources from ${input.distinctProviderCount} provider(s). Need ≥2 sources from ≥1 provider.`,
    }
  }

  // Gate 2: Credibility — at least one primary source or fresh evidence
  const credible = input.hasPrimarySource || input.isFresh
  if (!credible) {
    return {
      decision: 'no_move',
      reason: 'No primary source or fresh evidence — credibility insufficient for adjustment.',
      failedGate: 'credibility',
      summary: `Evidence gate: BLOCKED on credibility. No primary source detected and evidence is not fresh. Need at least one official source or evidence within the freshness window.`,
    }
  }

  // Gate 3: Not priced in — prior doesn't already incorporate this evidence
  // If the prior already incorporates market signal AND model confidence is high
  // AND disagreement is low, the evidence is likely already reflected.
  const likelyPricedIn =
    input.priorIncorporatesMarket &&
    input.modelConfidence >= 0.8 &&
    input.disagreementIndex <= 0.1
  if (likelyPricedIn) {
    return {
      decision: 'no_move',
      reason: 'Evidence likely already reflected in the prior — high model confidence, low disagreement, and prior incorporates market signal.',
      failedGate: 'not_priced_in',
      summary: `Evidence gate: BLOCKED on not-priced-in. Prior incorporates market signal, model confidence ${(input.modelConfidence * 100).toFixed(0)}%, disagreement ${(input.disagreementIndex * 100).toFixed(0)}%. Evidence is likely already priced in.`,
    }
  }

  // All gates passed — move is justified
  return {
    decision: 'move',
    reason: 'Evidence is relevant, credible, and likely not fully reflected in the prior.',
    failedGate: null,
    summary: `Evidence gate: PASSED. ${input.evidenceCount} sources from ${input.distinctProviderCount} provider(s). ${input.hasPrimarySource ? 'Primary source detected. ' : ''}${input.isFresh ? 'Fresh evidence. ' : ''}Adjustment justified.`,
  }
}

/**
 * Apply a bounded nudge to a prior probability.
 *
 * Inspired by CodexProphet's "small disciplined wins" approach and the
 * runner-up's capped residual model. The nudge is capped at ±maxNudge
 * percentage points to prevent overcorrection.
 */
export function applyBoundedNudge(
  prior: number,
  rawAdjustment: number,
  maxNudge: number = 0.10,
): { adjustedProbability: number; nudgeDelta: number } {
  const cappedNudge = Math.max(-maxNudge, Math.min(maxNudge, rawAdjustment))
  const adjusted = Math.max(0.01, Math.min(0.99, prior + cappedNudge))
  return {
    adjustedProbability: adjusted,
    nudgeDelta: adjusted - prior,
  }
}
