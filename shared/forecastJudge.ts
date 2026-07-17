/**
 * Forecast Judge — AgentHarness-inspired LLM-as-judge verification.
 *
 * After the multi-agent panel reaches consensus, an independent LLM judge
 * verifies whether the champion probability is justified given the evidence,
 * agent theses, and question context. This mirrors AgentHarness's per-family
 * judge pattern (browsecomp, hle, deepsearchqa) adapted for forecast verification.
 *
 * Source: https://github.com/ApodexAI/AgentHarness
 * Pattern: Family-specific LLM judges with structured verification criteria
 */

export type ForecastJudgeFamily =
  | 'geopolitical'
  | 'economic'
  | 'conflict'
  | 'trade'
  | 'technology'
  | 'general'

export interface JudgeConfig {
  family: ForecastJudgeFamily
  label: string
  systemPrompt: string
  verificationCriteria: string[]
  maxDisagreement: number
  weight: number
}

export interface JudgeInput {
  question: string
  championProbability: number
  championThesis: string
  agentTheses: Array<{ label: string; probability: number; thesis: string }>
  evidenceSummary: string
  evidenceCount: number
  distinctProviderCount: number
  disagreementIndex: number
  skepticProbability: number
  marketPriorProbability: number | null
  family: ForecastJudgeFamily
}

export interface JudgeResult {
  verifiedProbability: number
  judgeConfidence: number
  disagreementWithChampion: number
  judgeReasoning: string
  verdict: 'confirmed' | 'adjusted_up' | 'adjusted_down' | 'rejected'
  concerns: string[]
  family: ForecastJudgeFamily
}

const JUDGE_CONFIGS: Record<ForecastJudgeFamily, JudgeConfig> = {
  geopolitical: {
    family: 'geopolitical',
    label: 'Geopolitical Judge',
    systemPrompt: `You are an independent geopolitical forecast judge. Your role is to verify whether the champion probability from a multi-agent panel is justified.

Verification criteria:
1. Does the champion probability align with the weight of evidence?
2. Are there systematic biases (recency bias, availability bias, base-rate neglect)?
3. Is the disagreement among agents adequately reflected in the confidence?
4. Does the probability account for known geopolitical tail risks?

Return a JSON object with: verified_probability (0-1), judge_confidence (0-1), disagreement_with_champion (absolute difference), judge_reasoning (string), verdict (confirmed/adjusted_up/adjusted_down/rejected), concerns (array of strings).`,
    verificationCriteria: [
      'Evidence-probability alignment',
      'Geopolitical tail risk accounting',
      'Base-rate adherence',
      'Recency bias detection',
    ],
    maxDisagreement: 0.15,
    weight: 0.20,
  },
  economic: {
    family: 'economic',
    label: 'Economic Judge',
    systemPrompt: `You are an independent economic forecast judge. Your role is to verify whether the champion probability from a multi-agent panel is justified.

Verification criteria:
1. Does the probability reflect macroeconomic fundamentals and leading indicators?
2. Is the forecast anchored to market-implied probabilities when available?
3. Are correlation and contagion risks adequately priced?
4. Does the confidence band account for economic regime uncertainty?

Return a JSON object with: verified_probability (0-1), judge_confidence (0-1), disagreement_with_champion (absolute difference), judge_reasoning (string), verdict (confirmed/adjusted_up/adjusted_down/rejected), concerns (array of strings).`,
    verificationCriteria: [
      'Macroeconomic fundamental alignment',
      'Market prior anchoring',
      'Correlation risk pricing',
      'Regime uncertainty accounting',
    ],
    maxDisagreement: 0.12,
    weight: 0.18,
  },
  conflict: {
    family: 'conflict',
    label: 'Conflict Judge',
    systemPrompt: `You are an independent conflict forecast judge. Your role is to verify whether the champion probability from a multi-agent panel is justified.

Verification criteria:
1. Does the probability account for escalation ladders and de-escalation off-ramps?
2. Is the evidence base sufficient for conflict-specific tail risks?
3. Are information operations and deception adequately discounted?
4. Does the forecast avoid false precision in inherently uncertain conflict scenarios?

Return a JSON object with: verified_probability (0-1), judge_confidence (0-1), disagreement_with_champion (absolute difference), judge_reasoning (string), verdict (confirmed/adjusted_up/adjusted_down/rejected), concerns (array of strings).`,
    verificationCriteria: [
      'Escalation ladder analysis',
      'Deception discount',
      'Tail risk sufficiency',
      'False precision avoidance',
    ],
    maxDisagreement: 0.20,
    weight: 0.22,
  },
  trade: {
    family: 'trade',
    label: 'Trade Judge',
    systemPrompt: `You are an independent trade policy forecast judge. Your role is to verify whether the champion probability from a multi-agent panel is justified.

Verification criteria:
1. Does the probability reflect WTO rules and bilateral agreement constraints?
2. Is the timeline consistent with trade negotiation cycles?
3. Are retaliatory and second-order effects adequately modeled?
4. Does the forecast account for domestic political constraints on trade policy?

Return a JSON object with: verified_probability (0-1), judge_confidence (0-1), disagreement_with_champion (absolute difference), judge_reasoning (string), verdict (confirmed/adjusted_up/adjusted_down/rejected), concerns (array of strings).`,
    verificationCriteria: [
      'WTO/bilateral framework adherence',
      'Negotiation timeline realism',
      'Retaliatory effect modeling',
      'Domestic political constraint',
    ],
    maxDisagreement: 0.12,
    weight: 0.18,
  },
  technology: {
    family: 'technology',
    label: 'Technology Judge',
    systemPrompt: `You are an independent technology forecast judge. Your role is to verify whether the champion probability from a multi-agent panel is justified.

Verification criteria:
1. Does the probability account for technological development timelines and S-curves?
2. Is the evidence base from technical sources (not just media reporting)?
3. Are regulatory and standards-body timelines adequately reflected?
4. Does the forecast avoid hype-cycle overestimation?

Return a JSON object with: verified_probability (0-1), judge_confidence (0-1), disagreement_with_champion (absolute difference), judge_reasoning (string), verdict (confirmed/adjusted_up/adjusted_down/rejected), concerns (array of strings).`,
    verificationCriteria: [
      'S-curve timeline alignment',
      'Technical source sufficiency',
      'Regulatory timeline reflection',
      'Hype-cycle avoidance',
    ],
    maxDisagreement: 0.15,
    weight: 0.18,
  },
  general: {
    family: 'general',
    label: 'General Judge',
    systemPrompt: `You are an independent forecast judge. Your role is to verify whether the champion probability from a multi-agent panel is justified.

Verification criteria:
1. Does the champion probability align with the weight of evidence?
2. Are there systematic biases (recency, availability, base-rate neglect)?
3. Is the disagreement among agents adequately reflected?
4. Is the confidence level appropriate for the evidence quality?

Return a JSON object with: verified_probability (0-1), judge_confidence (0-1), disagreement_with_champion (absolute difference), judge_reasoning (string), verdict (confirmed/adjusted_up/adjusted_down/rejected), concerns (array of strings).`,
    verificationCriteria: [
      'Evidence-probability alignment',
      'Bias detection',
      'Disagreement reflection',
      'Confidence calibration',
    ],
    maxDisagreement: 0.15,
    weight: 0.15,
  },
}

export function getJudgeConfig(family: ForecastJudgeFamily): JudgeConfig {
  return JUDGE_CONFIGS[family] || JUDGE_CONFIGS.general
}

export function mapIntentToJudgeFamily(intent: string): ForecastJudgeFamily {
  const lower = intent.toLowerCase().trim()
  if (lower.includes('geopolit') || lower.includes('sanction') || lower.includes('alliance')) return 'geopolitical'
  if (lower.includes('conflict') || lower.includes('war') || lower.includes('military') || lower.includes('ceasefire')) return 'conflict'
  if (lower.includes('trade') || lower.includes('tariff') || lower.includes('export') || lower.includes('wto')) return 'trade'
  if (lower.includes('economic') || lower.includes('market') || lower.includes('recession') || lower.includes('gdp')) return 'economic'
  if (lower.includes('tech') || lower.includes('ai') || lower.includes('regulate') || lower.includes('standard')) return 'technology'
  return 'general'
}

export function buildJudgePrompt(input: JudgeInput): string {
  const agentThesesFormatted = input.agentTheses
    .map(a => `  - ${a.label}: ${(a.probability * 100).toFixed(1)}% — ${a.thesis}`)
    .join('\n')

  const marketPriorLine = input.marketPriorProbability !== null
    ? `Market prior: ${(input.marketPriorProbability * 100).toFixed(1)}%`
    : 'Market prior: N/A'

  return `Verify the following forecast:

QUESTION: ${input.question}

CHAMPION PROBABILITY: ${(input.championProbability * 100).toFixed(1)}%
CHAMPION THESIS: ${input.championThesis}

AGENT PANEL:
${agentThesesFormatted}

EVIDENCE SUMMARY: ${input.evidenceSummary}
EVIDENCE COUNT: ${input.evidenceCount} from ${input.distinctProviderCount} provider(s)
DISAGREEMENT INDEX: ${(input.disagreementIndex * 100).toFixed(1)}%
SKEPTIC PROBABILITY: ${(input.skepticProbability * 100).toFixed(1)}%
${marketPriorLine}

Assess whether the champion probability is justified. Return your verdict as JSON.`
}

export function parseJudgeResponse(raw: string): JudgeResult | null {
  try {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
    const parsed = JSON.parse(cleaned)

    const verifiedProbability = typeof parsed.verified_probability === 'number'
      ? Math.min(0.99, Math.max(0.01, parsed.verified_probability))
      : null
    if (verifiedProbability === null) return null

    const judgeConfidence = typeof parsed.judge_confidence === 'number'
      ? Math.min(0.95, Math.max(0.1, parsed.judge_confidence))
      : 0.6

    const championProb = typeof parsed.champion_probability === 'number'
      ? parsed.champion_probability
      : null

    const disagreement = championProb !== null
      ? Math.abs(verifiedProbability - championProb)
      : typeof parsed.disagreement_with_champion === 'number'
        ? Math.min(0.5, Math.max(0, parsed.disagreement_with_champion))
        : 0

    const verdictRaw = typeof parsed.verdict === 'string' ? parsed.verdict : 'confirmed'
    const verdict = ['confirmed', 'adjusted_up', 'adjusted_down', 'rejected'].includes(verdictRaw)
      ? verdictRaw as JudgeResult['verdict']
      : 'confirmed'

    const concerns = Array.isArray(parsed.concerns)
      ? parsed.concerns.filter((c: unknown) => typeof c === 'string').slice(0, 5)
      : []

    return {
      verifiedProbability,
      judgeConfidence,
      disagreementWithChampion: Math.round(disagreement * 10000) / 10000,
      judgeReasoning: typeof parsed.judge_reasoning === 'string' ? parsed.judge_reasoning : '',
      verdict,
      concerns,
      family: 'general',
    }
  } catch {
    return null
  }
}

export function applyJudgeAdjustment(
  championProbability: number,
  judgeResult: JudgeResult,
  judgeWeight: number = 0.15,
): { adjustedProbability: number; judgeDelta: number } {
  const adjusted = championProbability * (1 - judgeWeight) + judgeResult.verifiedProbability * judgeWeight
  const clamped = Math.min(0.99, Math.max(0.01, adjusted))
  return {
    adjustedProbability: Math.round(clamped * 10000) / 10000,
    judgeDelta: Math.round((clamped - championProbability) * 10000) / 10000,
  }
}

export function assessJudgeVerdict(
  judgeResult: JudgeResult,
  config: JudgeConfig,
): { shouldAdjust: boolean; severity: 'none' | 'minor' | 'major' | 'critical' } {
  if (judgeResult.verdict === 'rejected') {
    return { shouldAdjust: true, severity: 'critical' }
  }

  if (judgeResult.disagreementWithChampion > config.maxDisagreement) {
    return {
      shouldAdjust: true,
      severity: judgeResult.disagreementWithChampion > config.maxDisagreement * 2 ? 'critical' : 'major',
    }
  }

  if (judgeResult.verdict === 'adjusted_up' || judgeResult.verdict === 'adjusted_down') {
    return {
      shouldAdjust: true,
      severity: judgeResult.disagreementWithChampion > 0 ? 'minor' : 'none',
    }
  }

  return { shouldAdjust: false, severity: 'none' }
}
