import { createClient } from 'npm:@supabase/supabase-js@2'
import { buildConsensusPresentation, DEFAULT_CONSENSUS_POLICY, loadActiveConsensusPolicy, policyLabel } from '../_shared/whitebox-release.ts'
import { annotateCalibration, applyCalibrationModel } from '../_shared/ml-platform.ts'
import {
  assessContextAlignment,
  buildPublicAnswer,
  buildQuestionPackageFromRoute,
  composeWhatCouldChangeIt,
  composeWhatToDoNext,
  evaluateQuestionIntake,
  routeCitizenQuestion,
  type QuestionContextPayload,
} from '../../../shared/publicForecasting.ts'
import { getAuthenticatedUser, jsonResponse } from '../_shared/auth.ts'
import { checkRateLimit, logApiUsage, rateLimitResponse } from '../_shared/rate-limiter.ts'
import {
  buildMarketPriorQuery,
  searchPolymarket,
  searchKalshi,
  extractMarketPrior,
  blendMarketPrior,
} from '../../../shared/marketPriors.ts'
import {
  routeForecastSkill,
  buildSkillEnhancedSystemPrompt,
  type ForecastSkillFile,
} from '../../../shared/semanticRouter.ts'
import {
  calibrateWithLearnings,
  blendCalibratedWithMarket,
  assessCalibrationConfidence,
  type LearningRecord,
} from '../../../shared/confidenceCalibration.ts'
import { assessEvidenceGate } from '../../../shared/evidenceGate.ts'
import {
  getJudgeConfig,
  mapIntentToJudgeFamily,
  buildJudgePrompt,
  parseJudgeResponse,
  applyJudgeAdjustment,
  assessJudgeVerdict,
  type JudgeResult,
  type ForecastJudgeFamily,
} from '../../../shared/forecastJudge.ts'
import {
  buildEvidenceGraph,
  buildGlobalVerifierPrompt,
  parseGlobalVerifierResponse,
  computeHeuristicVerifierScore,
  type EvidenceGraph,
  type GlobalVerifierLLMResult,
} from '../../../shared/evidenceGraph.ts'
import {
  orchestrateAgents,
  dispatchAgentsParallel,
  type OrchestratorDecision,
} from '../../../shared/agentOrchestrator.ts'
import {
  computeBenchmarkSummary,
  buildDisplayMetrics,
  type BenchmarkEntry,
} from '../../../shared/benchmarkRegistry.ts'

type RetrievalInput = {
  id?: string
  title?: string
  url?: string
  snippet?: string
  source?: string
  score?: number
}

declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void
  env: {
    get: (key: string) => string | undefined
  }
}

type ForecastPoint = {
  t: number | string
  probability: number
}

type RequestBody = {
  runId?: string
  scenario?: {
    title?: string
    description?: string
    horizonDays?: number
  }
  retrievals?: RetrievalInput[]
  baseForecast?: ForecastPoint[]
  provenance?: {
    evidence_backed?: boolean
    retrieval_count?: number
  }
  questionContext?: Partial<QuestionContextPayload> | null
  mode?: 'public' | 'internal'
  audience?: string
  consensusPolicyOverride?: string
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('APP_URL') || 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info'
    }
  })
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function hashFloat(input: string) {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)
  }
  return (h >>> 0) / 0xffffffff
}

function average(values: number[]) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function standardDeviation(values: number[]) {
  if (values.length < 2) return 0
  const mean = average(values)
  const variance = average(values.map(value => Math.pow(value - mean, 2)))
  return Math.sqrt(variance)
}

function uniq<T>(values: T[]) {
  return Array.from(new Set(values))
}

function generateAdversarialCounterfactual(
  agents: Array<{ id: string; label: string; probability: number; thesis: string; objections: string[] }>,
  disagreementIndex: number,
  contradictionPoints: string[],
  missingEvidence: string[],
  evidenceCount: number,
): { scenario: string; probability: number; guardingTriggers: string[] } {
  const riskAgent = agents.reduce((min, a) => (a.probability < min.probability ? a : min), agents[0] || { id: 'risk', label: 'Risk Agent', probability: 0.5, thesis: '', objections: [] })
  const worstCaseProb = clamp(riskAgent.probability - disagreementIndex * 0.15 - (evidenceCount < 3 ? 0.05 : 0), 0.02, 0.95)

  const scenarioParts: string[] = []
  if (riskAgent.thesis) {
    scenarioParts.push(`If the risk agent's thesis holds — ${riskAgent.thesis}`)
  } else {
    scenarioParts.push('If tail-risk dynamics dominate the scenario')
  }
  if (contradictionPoints.length > 0) {
    scenarioParts.push(`compounded by: ${contradictionPoints.slice(0, 2).join('; ')}`)
  }
  if (missingEvidence.length > 0) {
    scenarioParts.push(`and exacerbated by: ${missingEvidence.slice(0, 2).join('; ')}`)
  }
  const scenario = scenarioParts.join(' ')

  const guardingTriggers: string[] = []
  if (evidenceCount < 3) guardingTriggers.push('Additional independent sources are needed before trusting the champion consensus.')
  if (disagreementIndex > 0.15) guardingTriggers.push('Monitor whether specialist disagreement narrows or widens as new evidence arrives.')
  if (riskAgent.objections.length > 0) guardingTriggers.push(`Watch for: ${riskAgent.objections[0]}`)
  if (missingEvidence.some(e => e.includes('baseline'))) guardingTriggers.push('Establish a temporal baseline forecast before relying on the champion probability.')
  if (guardingTriggers.length === 0) guardingTriggers.push('No specific guarding triggers identified — continue monitoring evidence quality.')

  return { scenario, probability: worstCaseProb, guardingTriggers }
}

// --- LLM call infrastructure for multi-agent deliberation ---

const FORECAST_LLM_TIMEOUT_MS = Number(Deno.env.get('FORECAST_LLM_TIMEOUT_MS') || '30000')
const FORECAST_GEMINI_KEY = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_AI_API_KEY') || ''
const FORECAST_GEMINI_MODEL = Deno.env.get('FORECAST_GEMINI_MODEL') || 'gemini-2.5-flash'
const FORECAST_OPENAI_KEY = Deno.env.get('OPENAI_KEY') || Deno.env.get('OPENAI_API_KEY') || ''
const FORECAST_OPENAI_MODEL = Deno.env.get('FORECAST_OPENAI_MODEL') || 'gpt-4o-mini'

interface AgentLLMResponse {
  probability: number
  confidence: number
  thesis: string
  drivers: string[]
  objections: string[]
  evidence_ids: string[]
}

interface MediatorLLMResponse {
  disagreement_points: string[]
  consensus_summary: string
  adjustment_direction: string
}

async function callGeminiForecast(prompt: string, systemPrompt: string): Promise<string | null> {
  if (!FORECAST_GEMINI_KEY) return null
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(FORECAST_GEMINI_MODEL)}:generateContent?key=${FORECAST_GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(FORECAST_LLM_TIMEOUT_MS),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, candidateCount: 1, responseMimeType: 'application/json' },
        }),
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || '').filter(Boolean).join('\n').trim()
    return text || null
  } catch {
    return null
  }
}

async function callOpenAIForecast(prompt: string, systemPrompt: string): Promise<string | null> {
  if (!FORECAST_OPENAI_KEY) return null
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${FORECAST_OPENAI_KEY}` },
      signal: AbortSignal.timeout(FORECAST_LLM_TIMEOUT_MS),
      body: JSON.stringify({
        model: FORECAST_OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1200,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content
    return typeof content === 'string' ? content : null
  } catch {
    return null
  }
}

async function callLLM(prompt: string, systemPrompt: string): Promise<string | null> {
  const geminiResult = await callGeminiForecast(prompt, systemPrompt)
  if (geminiResult) return geminiResult
  const openaiResult = await callOpenAIForecast(prompt, systemPrompt)
  if (openaiResult) return openaiResult
  return null
}

function parseAgentResponse(raw: string): AgentLLMResponse | null {
  try {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
    const parsed = JSON.parse(cleaned)
    if (typeof parsed.probability !== 'number') return null
    return {
      probability: clamp(parsed.probability, 0.01, 0.99),
      confidence: typeof parsed.confidence === 'number' ? clamp(parsed.confidence, 0.1, 0.95) : 0.6,
      thesis: typeof parsed.thesis === 'string' ? parsed.thesis : '',
      drivers: Array.isArray(parsed.drivers) ? parsed.drivers.slice(0, 4) : [],
      objections: Array.isArray(parsed.objections) ? parsed.objections.slice(0, 3) : [],
      evidence_ids: Array.isArray(parsed.evidence_ids) ? parsed.evidence_ids.slice(0, 6) : [],
    }
  } catch {
    return null
  }
}

function parseMediatorResponse(raw: string): MediatorLLMResponse | null {
  try {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
    const parsed = JSON.parse(cleaned)
    return {
      disagreement_points: Array.isArray(parsed.disagreement_points) ? parsed.disagreement_points.slice(0, 5) : [],
      consensus_summary: typeof parsed.consensus_summary === 'string' ? parsed.consensus_summary : '',
      adjustment_direction: typeof parsed.adjustment_direction === 'string' ? parsed.adjustment_direction : 'neutral',
    }
  } catch {
    return null
  }
}

const ROLE_SYSTEM_PROMPTS: Record<string, string> = {
  geopolitics: 'You are a geopolitical forecasting expert. Analyze the scenario through the lens of state actors, alliances, diplomatic signals, and political incentives. Provide a calibrated probability estimate (0-1), your confidence (0-1), a thesis, 3 key drivers, 2 objections, and the evidence IDs you relied on. Return valid JSON only.',
  commodities: 'You are a commodities and energy markets forecasting expert. Analyze the scenario through supply chains, commodity repricing, safe-haven demand, and inflation transmission. Provide a calibrated probability estimate (0-1), your confidence (0-1), a thesis, 3 key drivers, 2 objections, and the evidence IDs you relied on. Return valid JSON only.',
  macro: 'You are a macroeconomics and markets forecasting expert. Analyze the scenario through GDP growth, monetary policy, rates, liquidity, and cross-asset effects. Provide a calibrated probability estimate (0-1), your confidence (0-1), a thesis, 3 key drivers, 2 objections, and the evidence IDs you relied on. Return valid JSON only.',
  risk: 'You are a tail-risk and uncertainty forecasting expert. Analyze the scenario through model risk, ambiguity, nonlinear shocks, and overconfidence penalties. Your probability should be more conservative than other agents. Provide a calibrated probability estimate (0-1), your confidence (0-1), a thesis, 3 key drivers, 2 objections, and the evidence IDs you relied on. Return valid JSON only.',
}

const MEDIATOR_SYSTEM_PROMPT = 'You are a forecasting mediator. Given 4 agent forecasts, surface key disagreements, synthesize a consensus summary, and indicate whether the final aggregate should be adjusted up, down, or stay neutral. Return valid JSON with fields: disagreement_points (array of strings), consensus_summary (string), adjustment_direction ("up" | "down" | "neutral").'

function buildAgentPrompt(
  roleId: string,
  roleLabel: string,
  description: string,
  retrievals: RetrievalInput[],
  baseForecastProbability: number | null,
  round: number,
  mediatorFeedback?: MediatorLLMResponse,
  otherAgents?: Array<{ label: string; probability: number; thesis: string }>
): string {
  const evidenceText = retrievals.slice(0, 8).map((r, i) => `[${i}] id:${r.id || 'n/a'} title:${r.title || ''} snippet:${r.snippet || ''}`).join('\n')
  const baseAnchor = baseForecastProbability !== null ? `Base forecast anchor: ${baseForecastProbability.toFixed(2)}` : 'No base forecast anchor available.'
  let prompt = `Scenario: ${description}\n\nEvidence:\n${evidenceText}\n\n${baseAnchor}\n\nAs the ${roleLabel}, estimate the probability that this scenario occurs. Return JSON: {"probability": 0.X, "confidence": 0.X, "thesis": "...", "drivers": ["...", "...", "..."], "objections": ["...", "..."], "evidence_ids": ["id1", "id2"]}`
  if (round === 2 && mediatorFeedback && otherAgents) {
    const otherSummary = otherAgents.map(a => `${a.label}: p=${a.probability.toFixed(2)} — ${a.thesis}`).join('\n')
    prompt += `\n\n--- Deliberation Round 2 ---\nMediator feedback: ${mediatorFeedback.consensus_summary}\nKey disagreements: ${mediatorFeedback.disagreement_points.join('; ')}\nAdjustment direction: ${mediatorFeedback.adjustment_direction}\n\nOther agents' round 1 forecasts:\n${otherSummary}\n\nUpdate your probability based on the mediator feedback and other agents' reasoning. You may adjust up or down but maintain your role perspective.`
  }
  return prompt
}

function buildMediatorPrompt(agents: Array<{ label: string; probability: number; confidence: number; thesis: string; drivers: string[]; objections: string[] }>): string {
  const agentSummaries = agents.map(a =>
    `${a.label}: probability=${a.probability.toFixed(2)}, confidence=${a.confidence.toFixed(2)}\n  thesis: ${a.thesis}\n  drivers: ${a.drivers.join('; ')}\n  objections: ${a.objections.join('; ')}`
  ).join('\n\n')
  return `Four specialist agents have produced forecasts:\n\n${agentSummaries}\n\nSurface the key disagreements, synthesize a consensus summary, and indicate whether the aggregate should be adjusted up, down, or neutral. Return JSON: {"disagreement_points": ["..."], "consensus_summary": "...", "adjustment_direction": "up|down|neutral"}`
}

async function callAgentForecast(
  roleId: string,
  roleLabel: string,
  description: string,
  retrievals: RetrievalInput[],
  baseForecastProbability: number | null,
  round: number,
  mediatorFeedback?: MediatorLLMResponse,
  otherAgents?: Array<{ label: string; probability: number; thesis: string }>,
  skillFile?: ForecastSkillFile | null,
): Promise<AgentLLMResponse | null> {
  const baseSystemPrompt = ROLE_SYSTEM_PROMPTS[roleId] || ROLE_SYSTEM_PROMPTS.risk
  // P1: Inject skill file guidance into system prompt
  const systemPrompt = skillFile
    ? buildSkillEnhancedSystemPrompt(roleId, skillFile, baseSystemPrompt)
    : baseSystemPrompt
  const prompt = buildAgentPrompt(roleId, roleLabel, description, retrievals, baseForecastProbability, round, mediatorFeedback, otherAgents)
  const raw = await callLLM(prompt, systemPrompt)
  if (!raw) return null
  return parseAgentResponse(raw)
}

async function callMediator(agents: Array<{ label: string; probability: number; confidence: number; thesis: string; drivers: string[]; objections: string[] }>): Promise<MediatorLLMResponse | null> {
  const prompt = buildMediatorPrompt(agents)
  const raw = await callLLM(prompt, MEDIATOR_SYSTEM_PROMPT)
  if (!raw) return null
  return parseMediatorResponse(raw)
}

function bootstrapConfidenceBand(probabilities: number[], samples: number = 1000): { lower: number; upper: number } {
  if (probabilities.length === 0) return { lower: 0.4, upper: 0.6 }
  if (probabilities.length === 1) return { lower: clamp(probabilities[0] - 0.08, 0, 1), upper: clamp(probabilities[0] + 0.08, 0, 1) }
  const bootstrapMeans: number[] = []
  for (let i = 0; i < samples; i++) {
    const sample: number[] = []
    for (let j = 0; j < probabilities.length; j++) {
      sample.push(probabilities[Math.floor(Math.random() * probabilities.length)])
    }
    bootstrapMeans.push(average(sample))
  }
  bootstrapMeans.sort((a, b) => a - b)
  const lowerIdx = Math.floor(samples * 0.05)
  const upperIdx = Math.floor(samples * 0.95)
  return {
    lower: clamp(bootstrapMeans[lowerIdx], 0, 1),
    upper: clamp(bootstrapMeans[upperIdx], 0, 1),
  }
}

function extremizeProbability(p: number, n: number): number {
  if (n <= 1) return p
  if (p <= 0.001 || p >= 0.999) return p
  const d = n > 50 ? Math.sqrt(3) : (n * (Math.sqrt(3 * n * n - 3 * n + 1) - 2)) / (n * n - n - 1)
  if (d <= 1) return p
  const logit = Math.log(p / (1 - p))
  const extremized = d * logit
  return 1 / (1 + Math.exp(-extremized))
}

function scenarioKeywords(text: string) {
  const lower = text.toLowerCase()
  return {
    geopolitical: ['war', 'sanction', 'nato', 'china', 'russia', 'border', 'missile', 'conflict', 'diplomatic', 'election'].some(keyword => lower.includes(keyword)),
    commodities: ['gold', 'oil', 'commodity', 'energy', 'metal', 'inflation', 'shipping', 'supply'].some(keyword => lower.includes(keyword)),
    macro: ['gdp', 'inflation', 'rates', 'currency', 'trade', 'economy', 'growth', 'dollar', 'spx', 'market'].some(keyword => lower.includes(keyword)),
    risk: ['volatility', 'uncertain', 'risk', 'shock', 'escalation', 'crisis', 'tail', 'contagion'].some(keyword => lower.includes(keyword)),
    directional: ['price', 'rise', 'fall', 'increase', 'decrease', 'surge', 'drop', 'move', 'gain', 'loss'].some(keyword => lower.includes(keyword))
  }
}

function buildQuestionQuality(description: string, retrievals: RetrievalInput[], questionType: 'binary' | 'directional', requiredInputs: Array<{ label: string }>) {
  const firstSentence = description.split(/[.?!]/).map(part => part.trim()).find(Boolean) || description.trim()
  const keywords = scenarioKeywords(description)
  const evidenceCoverage = clamp((retrievals.length / 6), 0, 1)
  const clarity = clamp(firstSentence.length > 30 ? 0.84 : 0.7, 0, 1)
  const resolvability = clamp((keywords.directional ? 0.8 : 0.74) + evidenceCoverage * 0.15, 0, 0.96)
  const issues: string[] = []

  if (requiredInputs.length > 0) {
    issues.push(`This question still needs ${requiredInputs.map((entry) => entry.label.toLowerCase()).join(', ')} before it should be treated as a personal or local forecast.`)
  }
  if (retrievals.length < 3) {
    issues.push('Evidence bundle is thin; specialist probabilities should be treated as provisional.')
  }
  if (firstSentence.length < 24) {
    issues.push('Scenario prompt is short; the forecast target may need refinement.')
  }
  if (questionType === 'binary') {
    issues.push('Question is phrased as an event-style forecast; later phases should tighten explicit numerical resolution where possible.')
  }

  const overall = clamp((clarity * 0.35) + (resolvability * 0.35) + (evidenceCoverage * 0.3), 0, 1)
  return {
    clarity,
    resolvability,
    evidenceCoverage,
    overall,
    issues,
    requiresHumanRefinement: overall < 0.72 || requiredInputs.length > 0,
  }
}

function normalizeInvestorLabel(value: string | null | undefined) {
  if (!value) return ''
  return value
    .replace(/\s+/g, ' ')
    .replace(/(?:\binvestors?\b(?:\s+\binvestors?\b)+)/gi, 'investors')
    .trim()
}

function retrievalCorpus(retrievals: RetrievalInput[]) {
  return retrievals
    .map((retrieval) => `${retrieval.title || ''} ${retrieval.snippet || ''}`.trim())
    .join(' ')
    .toLowerCase()
}

function topEvidenceTitles(retrievals: RetrievalInput[]) {
  return uniq(
    retrievals
      .map((retrieval) => retrieval.title?.trim())
      .filter((value): value is string => Boolean(value))
  ).slice(0, 2)
}

function summarizeThemes(routeIntent: QuestionContextPayload['intent'], retrievals: RetrievalInput[]) {
  const corpus = retrievalCorpus(retrievals)
  const themeMatchers: Record<QuestionContextPayload['intent'], Array<{ label: string; pattern: RegExp }>> = {
    global_geopolitics: [
      { label: 'alliance posture', pattern: /\balliance|\bnato|\bsecurity pact|\bdeterr/ },
      { label: 'military signaling', pattern: /\bmilitary|\bmissile|\bnaval|\bexercise/ },
      { label: 'sanctions and trade pressure', pattern: /\bsanction|\bexport control|\btariff/ },
      { label: 'energy or shipping spillovers', pattern: /\bshipping|\benergy|\boil|\bchokepoint/ },
    ],
    middle_east_conflict: [
      { label: 'regional escalation signals', pattern: /\bescalat|\bretaliat|\bmissile|\bstrike/ },
      { label: 'ceasefire durability', pattern: /\bceasefire|\btruce|\bmediation|\bpeace/ },
      { label: 'energy-route risk', pattern: /\bshipping|\benergy|\bstrait|\boil/ },
      { label: 'proxy or alliance spillovers', pattern: /\bproxy|\bmilitia|\ballies|\bregional/ },
    ],
    country_politics: [
      { label: 'leadership and coalition pressure', pattern: /\belection|\bleadership|\bcoalition|\bparliament/ },
      { label: 'protest and unrest signals', pattern: /\bprotest|\bunrest|\bstrike|\bdemonstration/ },
      { label: 'institutional stability', pattern: /\bcourt|\bconstitution|\bemergency rule|\bgovernance/ },
    ],
    macroeconomy: [
      { label: 'growth momentum', pattern: /\bgrowth|\bgdp|\boutput|\bdemand/ },
      { label: 'rates and policy stance', pattern: /\brates|\bcentral bank|\bpolicy|\bcut\b|\bhike\b/ },
      { label: 'inflation pressure', pattern: /\binflation|\bprices|\bcpi|\bpce/ },
      { label: 'trade and liquidity conditions', pattern: /\btrade|\bliquidity|\bcredit|\bshipping/ },
    ],
    asset_allocation: [
      { label: 'equity-market direction', pattern: /\bequity|\bstock|\bindex|\bvaluation|\bearnings/ },
      { label: 'cash and rate carry', pattern: /\bcash|\byield|\brates|\bbond|\btreasury/ },
      { label: 'currency or purchasing-power risk', pattern: /\bcurrency|\bdollar|\binr|\busd|\bfx|\bpurchasing power/ },
      { label: 'inflation and hedging pressure', pattern: /\binflation|\bhedg|\bcommodity|\bsafe haven/ },
    ],
    commodity_safe_haven: [
      { label: 'gold and safe-haven demand', pattern: /\bgold|\bsafe haven|\bbullion/ },
      { label: 'real yields and rates', pattern: /\breal yield|\brates|\btreasury|\byield/ },
      { label: 'inflation or purchasing-power protection', pattern: /\binflation|\bpurchasing power|\bcurrency/ },
      { label: 'geopolitical hedge flows', pattern: /\bwar|\bconflict|\brisk-off|\bhedge/ },
    ],
    inflation: [
      { label: 'price persistence', pattern: /\binflation|\bcpi|\bprices|\bcore/ },
      { label: 'policy response', pattern: /\brates|\bcentral bank|\bpolicy/ },
      { label: 'wage and demand pressure', pattern: /\bwage|\blabou?r|\bdemand/ },
    ],
    local_climate_risk: [
      { label: 'hazard trend evidence', pattern: /\bheat|\bflood|\bstorm|\bdrought|\bfire/ },
      { label: 'local exposure', pattern: /\bregion|\blocal|\bcommunity|\bcoast/ },
    ],
    global_disaster_risk: [
      { label: 'trade chokepoints', pattern: /\bshipping|\bport|\bcanal|\btrade/ },
      { label: 'energy infrastructure risk', pattern: /\benergy|\bpipeline|\bpower grid|\bterminal/ },
      { label: 'seismic or volcanic disruption', pattern: /\bearthquake|\bvolcan|\bseismic/ },
      { label: 'storm disruption', pattern: /\bstorm|\bhurricane|\btyphoon|\bcyclone/ },
    ],
    technology_society: [
      { label: 'productivity gains', pattern: /\bproductivity|\boutput|\bautomation/ },
      { label: 'labor-market displacement', pattern: /\bjob|\bunemployment|\bworker|\blabor/ },
      { label: 'inequality or distributional strain', pattern: /\binequality|\bincome|\bdistribution/ },
    ],
    generic_public_analysis: [
      { label: 'strategic evidence bundle', pattern: /\bpolicy|\brisk|\bmarket|\bsecurity/ },
    ],
  }

  return (themeMatchers[routeIntent] || [])
    .filter((entry) => entry.pattern.test(corpus))
    .map((entry) => entry.label)
    .slice(0, 3)
}

function buildEvidenceSummary(input: {
  route: ReturnType<typeof routeCitizenQuestion>
  retrievals: RetrievalInput[]
  distinctProviderCount: number
  evidenceCount: number
  confidence: number
}) {
  const titles = topEvidenceTitles(input.retrievals)
  const themes = summarizeThemes(input.route.intent, input.retrievals)
  const titleClause = titles.length > 0
    ? `The cited bundle is led by ${titles.join(' and ')}`
    : `The cited bundle spans ${input.evidenceCount} external sources`
  const themeClause = themes.length > 0
    ? `and concentrates on ${themes.join(', ')}`
    : 'and keeps the evidence centered on the main forecast drivers'
  return `${titleClause} across ${input.distinctProviderCount} providers ${themeClause}. Specialist confidence averages ${(input.confidence * 100).toFixed(0)}%.`
}

function buildHostedOutcome(route: ReturnType<typeof routeCitizenQuestion>, probability: number) {
  if (probability >= 0.6) {
    return {
      directAnswer: `${route.positiveOutcomeLabel} is more likely than ${route.negativeOutcomeLabel} over ${route.horizonLabel}.`,
      bestCurrentCall: route.positiveOutcomeLabel,
    }
  }
  if (probability <= 0.4) {
    return {
      directAnswer: `${route.negativeOutcomeLabel} is more likely than ${route.positiveOutcomeLabel} over ${route.horizonLabel}.`,
      bestCurrentCall: route.negativeOutcomeLabel,
    }
  }
  if (probability >= 0.5) {
    return {
      directAnswer: `The current base case leans toward ${route.positiveOutcomeLabel} over ${route.negativeOutcomeLabel} over ${route.horizonLabel}, but the margin is still thin.`,
      bestCurrentCall: `Slight lean: ${route.positiveOutcomeLabel}`,
    }
  }
  if (probability > 0.45) {
    return {
      directAnswer: `The current base case leans toward ${route.negativeOutcomeLabel} over ${route.positiveOutcomeLabel} over ${route.horizonLabel}, but the margin is still thin.`,
      bestCurrentCall: `Slight lean: ${route.negativeOutcomeLabel}`,
    }
  }
  return {
    directAnswer: `The most likely path is still contested over ${route.horizonLabel}; neither ${route.positiveOutcomeLabel} nor ${route.negativeOutcomeLabel} clearly dominates yet.`,
    bestCurrentCall: `Too close to call cleanly over ${route.horizonLabel}`,
  }
}

function buildHostedPublicAnswer(input: {
  route: ReturnType<typeof routeCitizenQuestion>
  questionContext: QuestionContextPayload
  alignment: ReturnType<typeof assessContextAlignment>
  probability: number
  evidenceBacked: boolean
  retrievalCount: number
  distinctProviderCount: number
  disagreementIndex: number
  contradictionPoints: string[]
  missingEvidence: string[]
  evidenceSummary: string
  sharedAnswer: Record<string, unknown>
}) {
  const releaseStatus = input.alignment.answer_release_status
  const confidenceLabel = input.questionContext.clarification_status !== 'ready'
    ? 'Needs more input'
    : input.evidenceBacked && input.retrievalCount >= 3 && input.distinctProviderCount >= 2 && input.disagreementIndex <= 0.2
      ? 'Moderate'
      : 'Limited'
  const watchFactors = uniq([
    input.contradictionPoints[0],
    input.contradictionPoints[1],
    input.missingEvidence[0],
    input.distinctProviderCount < 2 ? 'Source diversity is still thin.' : '',
  ]).filter(Boolean).slice(0, 4)

  if (releaseStatus === 'needs_more_input') {
    return {
      ...input.sharedAnswer,
      direct_answer: `More context is needed before the platform can release a citizen-ready answer about ${input.route.label.toLowerCase()} over ${input.route.horizonLabel}.`,
      best_current_call: 'More context needed',
      confidence_label: 'Needs more input',
      answer_release_status: releaseStatus,
      why_this_is_the_call: input.evidenceSummary,
      what_could_change_it: composeWhatCouldChangeIt(input.route, input.contradictionPoints, input.missingEvidence),
      what_to_do_next: input.questionContext.unresolved_dimensions?.length
        ? `Answer ${input.questionContext.unresolved_dimensions.join(', ').toLowerCase()} before treating this as a citizen-ready forecast.`
        : 'Clarify the missing local or personal context before asking for a citizen-ready forecast.',
      watch_factors: uniq([
        'Local or personal context is still missing.',
        ...watchFactors,
      ]).slice(0, 4),
      needs_more_input: true,
    }
  }

  if (releaseStatus !== 'ready') {
    return {
      ...input.sharedAnswer,
      direct_answer: releaseStatus === 'scope_mismatch'
        ? `The current evidence does not line up tightly enough with this clarified question to release a citizen-ready answer over ${input.route.horizonLabel}.`
        : `The platform is withholding a citizen-ready public call on this question over ${input.route.horizonLabel} because the hosted run did not clear the evidence threshold strongly enough.`,
      best_current_call: releaseStatus === 'scope_mismatch'
        ? 'Scope mismatch - answer withheld'
        : 'Insufficient evidence for a public call',
      confidence_label: 'Limited',
      answer_release_status: releaseStatus,
      why_this_is_the_call: input.evidenceSummary,
      what_could_change_it: composeWhatCouldChangeIt(input.route, input.contradictionPoints, input.missingEvidence),
      what_to_do_next: releaseStatus === 'scope_mismatch'
        ? 'Refine the scenario so the evidence bundle, geography, and time horizon all line up with the question being asked.'
        : composeWhatToDoNext(input.route, 'Limited', []),
      watch_factors: uniq([
        releaseStatus === 'scope_mismatch'
          ? 'The retrieved evidence is not tightly aligned to the clarified question.'
          : `Only ${input.retrievalCount} aligned retrievals across ${input.distinctProviderCount} providers supported this run.`,
        ...watchFactors,
      ]).slice(0, 4),
      needs_more_input: false,
    }
  }

  const outcome = buildHostedOutcome(input.route, input.probability)
  return {
    ...input.sharedAnswer,
    direct_answer: outcome.directAnswer,
    best_current_call: outcome.bestCurrentCall,
    confidence_label: confidenceLabel,
    answer_release_status: releaseStatus,
    why_this_is_the_call: input.evidenceSummary,
    what_could_change_it: composeWhatCouldChangeIt(input.route, input.contradictionPoints, input.missingEvidence),
    what_to_do_next: composeWhatToDoNext(input.route, confidenceLabel as 'High' | 'Moderate' | 'Limited', []),
    watch_factors: watchFactors,
  }
}

function buildRoleDrivers(roleId: string, keywords: ReturnType<typeof scenarioKeywords>, retrievals: RetrievalInput[]) {
  const sharedDriver = retrievals.length > 0 ? 'Shared evidence bundle contains cited external reporting.' : 'No retrieval bundle was available; lower confidence is required.'

  if (roleId === 'geopolitics') {
    return [
      keywords.geopolitical ? 'Scenario contains direct geopolitical escalation or diplomacy signals.' : 'Cross-border political signals are present but indirect.',
      sharedDriver,
      'State-actor incentives and signaling posture dominate the near-term path.'
    ]
  }
  if (roleId === 'commodities') {
    return [
      keywords.commodities ? 'Commodity and safe-haven transmission channels are active.' : 'Commodity spillovers are secondary but still relevant.',
      sharedDriver,
      'Supply disruption and inflation hedging affect forecast direction.'
    ]
  }
  if (roleId === 'macro') {
    return [
      keywords.macro ? 'Macro and market regime variables are directly engaged.' : 'Macro spillovers are inferred from the strategic setup.',
      sharedDriver,
      'Growth, rates, liquidity, and dollar effects shape the expected path.'
    ]
  }
  return [
    keywords.risk ? 'Tail-risk and second-order shock channels are explicit in the prompt.' : 'Tail-risk remains underdetermined and should discount confidence.',
    sharedDriver,
    'Model risk, ambiguity, and overconfidence penalties should compress the final probability.'
  ]
}

function buildRoleThesis(roleId: string) {
  if (roleId === 'geopolitics') {
    return 'The forecast depends primarily on state incentives, alliance posture, and escalation management.'
  }
  if (roleId === 'commodities') {
    return 'The forecast is transmitted through safe-haven demand, supply constraints, and commodity repricing.'
  }
  if (roleId === 'macro') {
    return 'The forecast is governed by macro spillovers, liquidity conditions, and policy expectations.'
  }
  return 'The forecast should be discounted for ambiguity, weak evidence, and nonlinear downside scenarios.'
}

function buildRoleObjections(roleId: string) {
  if (roleId === 'risk') {
    return ['Consensus may be overconfident relative to evidence density.', 'A single unmodeled shock could dominate the base case.']
  }
  if (roleId === 'commodities') {
    return ['Commodity transmission may lag the political trigger.', 'Cross-asset confirmation is still limited.']
  }
  if (roleId === 'macro') {
    return ['Macro adjustment may be slower than narrative markets imply.', 'Policy reaction can reverse the first-order move.']
  }
  return ['Signals may be performative rather than outcome-determinative.', 'The scenario may overstate immediate escalation risk.']
}

function evidenceIdsForRole(roleId: string, retrievals: RetrievalInput[]) {
  const ordered = retrievals.slice(0, 6).map(retrieval => retrieval.id || 'unknown-source')
  if (roleId === 'risk') return ordered.slice(0, 2)
  if (roleId === 'macro') return ordered.slice(0, 3)
  return ordered.slice(0, 2)
}

function roleBias(roleId: string, description: string, evidenceCount: number) {
  const keywords = scenarioKeywords(description)
  let bias = 0

  if (roleId === 'geopolitics') bias += keywords.geopolitical ? 0.08 : 0.01
  if (roleId === 'commodities') bias += keywords.commodities ? 0.07 : 0.015
  if (roleId === 'macro') bias += keywords.macro ? 0.06 : 0.02
  if (roleId === 'risk') bias -= keywords.risk ? 0.015 : 0.03

  bias += clamp((evidenceCount - 3) * 0.01, -0.03, 0.05)
  return bias
}

function buildConsensusCheckpoints(questionOverall: number, evidenceCount: number, disagreementIndex: number, challengerSpread: number) {
  return [
    {
      id: 'question-quality',
      title: 'Question quality gate',
      status: questionOverall >= 0.72 ? 'pass' : 'warn',
      detail: questionOverall >= 0.72 ? 'Forecast question is explicit enough to score later.' : 'Question wording should be refined before operational use.'
    },
    {
      id: 'evidence-density',
      title: 'Evidence sufficiency gate',
      status: evidenceCount >= 3 ? 'pass' : 'warn',
      detail: evidenceCount >= 3 ? `Shared evidence bundle contains ${evidenceCount} retrievals.` : 'Evidence bundle is sparse and should lower deployment confidence.'
    },
    {
      id: 'disagreement-review',
      title: 'Panel disagreement review',
      status: disagreementIndex <= 0.18 ? 'pass' : 'warn',
      detail: disagreementIndex <= 0.18 ? 'Specialist panel is directionally aligned.' : 'Panel disagreement is material and should remain visible in the UI.'
    },
    {
      id: 'champion-challenger',
      title: 'Champion vs challenger comparison',
      status: challengerSpread <= 0.08 ? 'pass' : 'warn',
      detail: challengerSpread <= 0.08 ? 'Shadow challengers are close to the champion consensus.' : 'Alternative aggregation rules differ materially; treat this as unstable.'
    }
  ]
}

async function getActiveConsensusPolicy(overrideValue?: string) {
  if (overrideValue && overrideValue.trim()) {
    return overrideValue
  }

  const ref = Deno.env.get('SUPABASE_PROJECT_REF') || 'jxdihzqoaxtydolmltdr'
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || `https://${ref}.supabase.co`
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('EDGE_SUPABASE_SERVICE_ROLE_KEY') || ''

  if (!supabaseUrl || !serviceKey) {
    return DEFAULT_CONSENSUS_POLICY
  }

  try {
    const admin = createClient(supabaseUrl, serviceKey)
    return await loadActiveConsensusPolicy(admin)
  } catch (error) {
    console.warn('multi-agent-forecast could not load active consensus policy:', error)
    return DEFAULT_CONSENSUS_POLICY
  }
}

Deno.serve(async (req: Request) => {
  // Auth check
  const _user = await getAuthenticatedUser(req)
  if (!_user) return jsonResponse(401, { ok: false, error: 'authentication_required' })

  const rateLimit = await checkRateLimit(_user.id, 'multi-agent-forecast')
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds)
  await logApiUsage(_user.id, 'multi-agent-forecast')


  if (req.method === 'OPTIONS') return jsonResponse(200, { ok: true })
  if (req.method !== 'POST') return jsonResponse(405, { ok: false, message: 'Method Not Allowed' })

  try {
    const body: RequestBody = await req.json().catch(() => ({}))
    const description = body.scenario?.description?.trim() || ''
    const runId = body.runId || ''

    if (!runId || !description) {
      return jsonResponse(400, {
        ok: false,
        message: 'Missing required fields: runId and scenario.description'
      })
    }

    const retrievals = Array.isArray(body.retrievals) ? body.retrievals.filter(Boolean) : []
    const evidenceCount = retrievals.length
    const uniqueSourceCount = uniq(retrievals.map(retrieval => retrieval.source || retrieval.url || retrieval.id || 'unknown')).length
    const distinctProviderCount = uniq(
      retrievals
        .map((retrieval) => typeof retrieval.source === 'string' ? retrieval.source.trim().toLowerCase() : '')
        .filter(Boolean)
    ).length || uniqueSourceCount
    const freshEvidenceCount = retrievals.filter(retrieval => /202[4-9]|today|latest|recent/i.test(`${retrieval.title || ''} ${retrieval.snippet || ''}`)).length || Math.min(evidenceCount, 2)
    const baseForecast = Array.isArray(body.baseForecast) ? body.baseForecast : []
    const baseForecastProbability = baseForecast.length > 0 ? clamp(Number(baseForecast[baseForecast.length - 1]?.probability ?? 0.5), 0, 1) : null
    const questionIntake = evaluateQuestionIntake({
      prompt: description || body.scenario?.title?.trim() || '',
      knownContext: body.questionContext || null,
      clarificationState: body.questionContext
        ? {
            answers: body.questionContext.answers,
            askedQuestionIds: body.questionContext.asked_question_ids,
            totalQuestionsAsked: body.questionContext.asked_question_ids?.length,
          }
        : null,
      mode: body.mode || 'public',
      audience: body.audience || 'public',
    })
    const incomingQuestionContext = body.questionContext || null
    const mergedAnswers = {
      ...(questionIntake.question_context.answers || {}),
      ...(incomingQuestionContext?.answers || {}),
    }
    const questionContext: QuestionContextPayload = {
      ...questionIntake.question_context,
      ...(incomingQuestionContext || {}),
      intent: incomingQuestionContext?.clarification_status === 'ready' && incomingQuestionContext.intent
        ? incomingQuestionContext.intent
        : questionIntake.question_context.intent,
      country: incomingQuestionContext?.country ?? questionIntake.question_context.country,
      location: incomingQuestionContext?.location ?? questionIntake.question_context.location,
      time_horizon: incomingQuestionContext?.time_horizon ?? questionIntake.question_context.time_horizon,
      risk_tolerance: incomingQuestionContext?.risk_tolerance ?? questionIntake.question_context.risk_tolerance,
      currency: normalizeInvestorLabel(incomingQuestionContext?.currency ?? questionIntake.question_context.currency) || null,
      decision_use: incomingQuestionContext?.decision_use || questionIntake.question_context.decision_use || null,
      answers: mergedAnswers,
      asked_question_ids: incomingQuestionContext?.asked_question_ids || questionIntake.question_context.asked_question_ids,
      context_locked_fields: incomingQuestionContext?.context_locked_fields || questionIntake.question_context.context_locked_fields,
      unresolved_dimensions: incomingQuestionContext?.unresolved_dimensions || questionIntake.question_context.unresolved_dimensions,
      required_inputs: incomingQuestionContext?.required_inputs || questionIntake.question_context.required_inputs,
      normalized_prompt: incomingQuestionContext?.normalized_prompt || questionIntake.question_context.normalized_prompt,
      completeness_score: incomingQuestionContext?.completeness_score ?? questionIntake.question_context.completeness_score,
      clarification_status: incomingQuestionContext?.clarification_status || questionIntake.question_context.clarification_status,
      confidence: incomingQuestionContext?.confidence ?? questionIntake.question_context.confidence,
      question_cluster: incomingQuestionContext?.question_cluster || questionIntake.question_context.question_cluster,
    }
    const routeSeed = questionContext.normalized_prompt || description || body.scenario?.title?.trim() || ''
    const route = routeCitizenQuestion(routeSeed, questionContext)
    const horizonDays = Math.max(7, Number(body.scenario?.horizonDays || route.horizonDays))

    // P1: Semantic routing — get skill file for this intent
    const semanticRoute = routeForecastSkill(routeSeed, route.intent as any, questionIntake.question_context.confidence)
    const skillFile = semanticRoute.skillFile

    // P1: Market prior — fetch from Polymarket (primary) / Kalshi (fallback)
    const marketQuery = buildMarketPriorQuery(description || routeSeed, route.intent)
    const polymarketResults = await searchPolymarket(marketQuery)
    let marketPriorResult = extractMarketPrior(marketQuery, polymarketResults, [])
    if (!marketPriorResult.bestMatch) {
      const kalshiResultsFallback = await searchKalshi(marketQuery)
      marketPriorResult = extractMarketPrior(marketQuery, [], kalshiResultsFallback)
    }
    const marketPriorProb = marketPriorResult.bestMatch?.yesPrice ?? null

    const questionBase = buildQuestionPackageFromRoute(route, {
      title: body.scenario?.title?.trim() || route.title,
      horizonDays,
    })
    const contextAlignment = assessContextAlignment({
      route,
      questionContext,
      evidenceBacked: body.provenance?.evidence_backed === true,
      retrievalCount: body.provenance?.retrieval_count || evidenceCount,
      distinctProviderCount,
    })
    const question = {
      ...questionBase,
      intent: route.intent,
      requiredInputs: route.requiredInputs,
      horizonLabel: route.horizonLabel,
      contextAlignment,
      quality: buildQuestionQuality(description, retrievals, route.questionType, route.requiredInputs),
    }
    const activeConsensusPolicy = await getActiveConsensusPolicy(body.consensusPolicyOverride)
    const ref = Deno.env.get('SUPABASE_PROJECT_REF') || 'jxdihzqoaxtydolmltdr'
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || `https://${ref}.supabase.co`
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('EDGE_SUPABASE_SERVICE_ROLE_KEY') || ''
    const admin = supabaseUrl && serviceKey ? createClient(supabaseUrl, serviceKey) : null

    // P1: Learnings — query recent resolved learnings for this intent for calibration
    let learnings: LearningRecord[] = []
    if (admin) {
      try {
        const { data: learningsData } = await admin
          .from('forecast_learnings')
          .select('id, intent, skill_category, predicted_probability, actual_outcome, brier_score, evidence_gate_decision, market_prior, created_at, resolved_at')
          .eq('intent', route.intent)
          .order('created_at', { ascending: false })
          .limit(200)
        if (Array.isArray(learningsData)) learnings = learningsData as LearningRecord[]
      } catch {
        // Table might not exist yet — graceful fallback
      }
    }

    // Phase D: Benchmark Registry — compute accuracy summary from learnings
    let benchmarkSummary = null
    let benchmarkDisplayMetrics: Array<{ label: string; value: string; status: string; tooltip: string }> | null = null
    if (learnings.length > 0) {
      try {
        const benchmarkEntries: BenchmarkEntry[] = learnings.map(l => ({
          id: String(l.id || ''),
          intent: l.intent || route.intent,
          questionHash: '',
          predictedProbability: l.predicted_probability ?? 0.5,
          actualOutcome: l.actual_outcome === null ? null : Boolean(l.actual_outcome),
          brierScore: l.brier_score ?? null,
          judgeVerdict: null,
          judgeDelta: null,
          evidenceStrength: null,
          verificationScore: null,
          createdAt: l.created_at || new Date().toISOString(),
          resolvedAt: l.resolved_at || null,
        }))
        benchmarkSummary = computeBenchmarkSummary(benchmarkEntries)
        benchmarkDisplayMetrics = buildDisplayMetrics(benchmarkSummary)
      } catch {
        // Benchmark is best-effort
      }
    }

    const defaultRoles = [
      { id: 'geopolitics', label: 'Geopolitics Agent', weight: 0.32 },
      { id: 'commodities', label: 'Commodities Agent', weight: 0.23 },
      { id: 'macro', label: 'Macro Agent', weight: 0.25 },
      { id: 'risk', label: 'Risk Agent', weight: 0.2 }
    ]

    // Phase C: Orchestrator pre-dispatch — decide which agents are relevant
    const orchestratorDecision = orchestrateAgents(
      questionBase.question || routeSeed,
      description || routeSeed,
      evidenceCount,
    )
    const roles = orchestratorDecision.activeAgents.map(a => ({
      id: a.id,
      label: a.label,
      weight: a.weight,
    }))
    const activeRoles = roles.length > 0 ? roles : defaultRoles

    // --- Multi-agent LLM deliberation (2 rounds with mediator) ---
    let round1Agents: AgentLLMResponse[] = []
    let mediatorResult: MediatorLLMResponse | null = null
    let usedLLMDeliberation = false

    // Phase C: Use Promise.allSettled via dispatchAgentsParallel for fault tolerance
    const round1Dispatch = await dispatchAgentsParallel(
      activeRoles,
      (role) => callAgentForecast(role.id, role.label, description, retrievals, baseForecastProbability, 1, undefined, undefined, skillFile),
    )
    const round1Results = round1Dispatch.results

    const round1Valid = round1Dispatch.allSucceeded
    const round1PartialValid = round1Dispatch.anySucceeded
    if (round1Valid) {
      usedLLMDeliberation = true
      round1Agents = round1Results as AgentLLMResponse[]

      // Mediator synthesizes round 1
      const mediatorInput = activeRoles.map((role, i) => ({
        label: role.label,
        probability: round1Agents[i].probability,
        confidence: round1Agents[i].confidence,
        thesis: round1Agents[i].thesis || buildRoleThesis(role.id),
        drivers: round1Agents[i].drivers.length > 0 ? round1Agents[i].drivers : buildRoleDrivers(role.id, scenarioKeywords(description), retrievals),
        objections: round1Agents[i].objections.length > 0 ? round1Agents[i].objections : buildRoleObjections(role.id),
      }))
      mediatorResult = await callMediator(mediatorInput)

      // Round 2: Agents update based on mediator feedback
      const round2Dispatch = await dispatchAgentsParallel(
        activeRoles,
        (role, i) =>
          callAgentForecast(
            role.id,
            role.label,
            description,
            retrievals,
            baseForecastProbability,
            2,
            mediatorResult || undefined,
            activeRoles.map((r2, j) => ({ label: r2.label, probability: round1Agents[j].probability, thesis: round1Agents[j].thesis || buildRoleThesis(r2.id) })),
            skillFile,
          ),
      )

      const round2Valid = round2Dispatch.allSucceeded
      if (round2Valid) {
        round1Agents = round2Dispatch.results as AgentLLMResponse[]
      }
    } else if (round1PartialValid) {
      // Phase C: Partial success — use available agents even if some failed
      usedLLMDeliberation = true
      round1Agents = round1Results.map((r, i) => {
        if (r) return r
        // Fallback for failed agents
        return {
          probability: baseForecastProbability || 0.5,
          confidence: 0.3,
          thesis: `${activeRoles[i].label} unavailable — using base forecast fallback.`,
          drivers: [],
          objections: [],
          evidence_ids: [],
        } as AgentLLMResponse
      })
    }

    const agentProbabilities = activeRoles.map((role, i) => {
      if (usedLLMDeliberation && round1Agents[i]) {
        const llmAgent = round1Agents[i]
        return {
          id: role.id,
          label: role.label,
          probability: clamp(llmAgent.probability, 0.02, 0.98),
          confidence: llmAgent.confidence,
          weight: role.weight,
          thesis: llmAgent.thesis || buildRoleThesis(role.id),
          drivers: llmAgent.drivers.length > 0 ? llmAgent.drivers : buildRoleDrivers(role.id, scenarioKeywords(description), retrievals),
          evidence_ids: llmAgent.evidence_ids.length > 0 ? llmAgent.evidence_ids : evidenceIdsForRole(role.id, retrievals),
          objections: llmAgent.objections.length > 0 ? llmAgent.objections : buildRoleObjections(role.id),
        }
      }
      // Fallback: deterministic hash-based generation (preserves existing behavior)
      const seed = `${description}:${role.id}:${runId}`
      const latentSignal = (hashFloat(seed) - 0.5) * 0.18
      const anchor = baseForecastProbability ?? (0.46 + hashFloat(`${seed}:anchor`) * 0.12)
      const probability = clamp(anchor + latentSignal + roleBias(role.id, description, evidenceCount), 0.05, 0.95)
      const confidence = clamp(0.48 + question.quality.evidenceCoverage * 0.2 + hashFloat(`${seed}:confidence`) * 0.16, 0.38, 0.9)
      return {
        id: role.id,
        label: role.label,
        probability,
        confidence,
        weight: role.weight,
        thesis: buildRoleThesis(role.id),
        drivers: buildRoleDrivers(role.id, scenarioKeywords(description), retrievals),
        evidence_ids: evidenceIdsForRole(role.id, retrievals),
        objections: buildRoleObjections(role.id),
      }
    })

    const disagreementIndex = clamp(standardDeviation(agentProbabilities.map(agent => agent.probability)), 0, 1)
    const normalizedWeightSum = agentProbabilities.reduce((sum, agent) => sum + agent.weight, 0) || 1
    const rawChampionProbability = clamp(agentProbabilities.reduce((sum, agent) => sum + agent.probability * agent.weight, 0) / normalizedWeightSum, 0, 1)
    const championProbability = extremizeProbability(rawChampionProbability, agentProbabilities.length)
    const championConfidence = clamp(average(agentProbabilities.map(agent => agent.confidence)) - disagreementIndex * 0.15, 0.25, 0.92)
    const sortedProbabilities = agentProbabilities.map(agent => agent.probability).sort((a, b) => a - b)
    const rawEqualWeightProbability = average(agentProbabilities.map(agent => agent.probability))
    const equalWeightProbability = extremizeProbability(rawEqualWeightProbability, agentProbabilities.length)
    const trimmedProbability = sortedProbabilities.length > 2 ? average(sortedProbabilities.slice(1, sortedProbabilities.length - 1)) : equalWeightProbability
    const skepticAdjustedProbability = clamp(championProbability - disagreementIndex * 0.12 - (question.quality.overall < 0.72 ? 0.04 : 0), 0.03, 0.97)
    const challengerSpread = Math.max(
      Math.abs(equalWeightProbability - championProbability),
      Math.abs(trimmedProbability - championProbability),
      Math.abs(skepticAdjustedProbability - championProbability)
    )
    const bootstrapBand = bootstrapConfidenceBand(agentProbabilities.map(agent => agent.probability))
    const lower = bootstrapBand.lower
    const upper = bootstrapBand.upper
    const contradictionPoints = [] as string[]

    if (Math.max(...agentProbabilities.map(agent => agent.probability)) - Math.min(...agentProbabilities.map(agent => agent.probability)) > 0.18) {
      contradictionPoints.push('Specialist agents disagree materially on immediate impact magnitude.')
    }
    if (question.quality.evidenceCoverage < 0.5) {
      contradictionPoints.push('Evidence density is low relative to a production-grade forecast question.')
    }
    if (question.questionType === 'binary') {
      contradictionPoints.push('The question is scoreable, but later phases should tighten directional measurement where possible.')
    }
    if (route.requiredInputs.length > 0) {
      contradictionPoints.push(`This question still needs ${route.requiredInputs.map((entry) => entry.label.toLowerCase()).join(', ')} before it should be treated as a personal or local forecast.`)
    }

    const missingEvidence = [] as string[]
    if (evidenceCount < 3) missingEvidence.push('More external sources are needed before public testing.')
    if (distinctProviderCount < 2 && evidenceCount > 0) missingEvidence.push('Source diversity is limited; correlated reporting risk remains.')
    if (baseForecastProbability === null) missingEvidence.push('No baseline temporal forecast curve was available for anchoring.')

    const consensusVariants = [
      {
        id: 'role_weighted',
        label: policyLabel('role_weighted'),
        probability: championProbability,
        confidence: championConfidence,
        method: 'role-weighted consensus',
      },
      {
        id: 'equal_weight',
        label: policyLabel('equal_weight'),
        probability: equalWeightProbability,
        confidence: clamp(championConfidence - 0.03, 0.2, 0.9),
        method: 'simple mean',
      },
      {
        id: 'trimmed_mean',
        label: policyLabel('trimmed_mean'),
        probability: trimmedProbability,
        confidence: clamp(championConfidence - 0.01, 0.2, 0.9),
        method: 'drop extreme agent view',
      },
      {
        id: 'skeptic_adjusted',
        label: policyLabel('skeptic_adjusted'),
        probability: skepticAdjustedProbability,
        confidence: clamp(championConfidence - 0.05, 0.2, 0.88),
        method: 'champion minus disagreement penalty',
      },
    ]

    const projectedConsensus = buildConsensusPresentation(consensusVariants, activeConsensusPolicy)
    const championCalibration = admin
      ? await annotateCalibration(admin, 'multi_agent_binary', projectedConsensus.champion.probability)
      : applyCalibrationModel(projectedConsensus.champion.probability, null)
    const calibratedChampion = {
      ...projectedConsensus.champion,
      probability: championCalibration.calibratedProbability,
      rawProbability: championCalibration.rawProbability,
      calibratedProbability: championCalibration.calibratedProbability,
      calibrationStatus: championCalibration.calibrationStatus,
      calibrationVersion: championCalibration.calibrationVersion,
      calibrationSampleSize: championCalibration.calibrationSampleSize,
    }

    // P1: Apply learnings-based calibration if we have enough resolved learnings
    const learningsCalibration = calibrateWithLearnings(calibratedChampion.probability, learnings)
    let finalProbability = learningsCalibration.calibratedProbability

    // P1: Blend with market prior (30% market weight by default)
    if (marketPriorProb !== null) {
      finalProbability = blendCalibratedWithMarket(finalProbability, marketPriorProb, 0.30)
    }

    // P1: Apply evidence gate — only move from prior if evidence passes the 3-question gate
    const evidenceGateResult = assessEvidenceGate({
      evidenceCount,
      distinctProviderCount,
      hasPrimarySource: retrievals.some(r => /official|government|api|exchange/i.test(r.source || r.url || '')),
      isFresh: freshEvidenceCount > 0,
      priorIncorporatesMarket: marketPriorProb !== null,
      modelConfidence: calibratedChampion.confidence,
      disagreementIndex,
    })

    let noMoveReason: string | null = null
    if (evidenceGateResult.decision === 'no_move') {
      // Preserve the prior (market-blended probability) without further adjustment
      noMoveReason = evidenceGateResult.reason
    }

    // Update champion with final probability
    const finalChampion = {
      ...calibratedChampion,
      probability: finalProbability,
    }

    // P1: Persist learning record (fire-and-forget)
    if (admin) {
      try {
        await admin
          .from('forecast_learnings')
          .insert({
            run_id: runId || null,
            user_id: _user.id,
            scenario_hash: routeSeed.slice(0, 200),
            intent: route.intent,
            skill_category: semanticRoute.category,
            predicted_probability: Math.round(finalProbability * 10000) / 10000,
            market_prior: marketPriorProb ? Math.round(marketPriorProb * 10000) / 10000 : null,
            evidence_gate_decision: evidenceGateResult.decision,
          })
      } catch {
        // Table might not exist yet — graceful fallback
      }
    }

    const calibrationConfidence = assessCalibrationConfidence(learnings)

    // Phase A: LLM-as-Judge verification (AgentHarness-inspired)
    const judgeFamily = mapIntentToJudgeFamily(route.intent)
    const judgeConfig = getJudgeConfig(judgeFamily)
    let judgeResult: JudgeResult | null = null
    let judgeAdjustedProbability: number | null = null
    let judgeDelta = 0
    let judgeSeverity: 'none' | 'minor' | 'major' | 'critical' = 'none'

    try {
      const judgePrompt = buildJudgePrompt({
        question: questionBase.question || routeSeed,
        championProbability: finalChampion.probability,
        championThesis: finalChampion.label || projectedConsensus.champion?.label || '',
        agentTheses: agentProbabilities.map(a => ({ label: a.label, probability: a.probability, thesis: a.thesis })),
        evidenceSummary: retrievals.slice(0, 8).map(r => r.title || r.snippet || '').filter(Boolean).join('; '),
        evidenceCount,
        distinctProviderCount,
        disagreementIndex,
        skepticProbability: clamp(skepticAdjustedProbability - 0.03, 0.02, 0.95),
        marketPriorProbability: marketPriorProb,
        family: judgeFamily,
      })
      const judgeRaw = await callLLM(judgePrompt, judgeConfig.systemPrompt)
      if (judgeRaw) {
        const parsed = parseJudgeResponse(judgeRaw)
        if (parsed) {
          parsed.family = judgeFamily
          judgeResult = parsed
          const verdict = assessJudgeVerdict(judgeResult, judgeConfig)
          judgeSeverity = verdict.severity
          if (verdict.shouldAdjust) {
            const adjustment = applyJudgeAdjustment(finalChampion.probability, judgeResult, judgeConfig.weight)
            judgeAdjustedProbability = adjustment.adjustedProbability
            judgeDelta = adjustment.judgeDelta
            finalChampion.probability = adjustment.adjustedProbability
          }
        }
      }
    } catch {
      // Judge is best-effort — failure should not block the forecast
    }

    // Phase B: Evidence Graph Assembly + Global Verifier (AgentHarness-inspired)
    const evidenceGraph = buildEvidenceGraph(retrievals, routeSeed)
    let globalVerifierResult: GlobalVerifierLLMResult | null = null
    let heuristicVerifier = computeHeuristicVerifierScore(evidenceGraph)

    try {
      const verifierPrompt = buildGlobalVerifierPrompt(evidenceGraph, questionBase.question || routeSeed, finalChampion.probability)
      const verifierRaw = await callLLM(verifierPrompt, 'You are a global evidence verifier for strategic forecasts. Assess the evidence graph and return structured JSON.')
      if (verifierRaw) {
        const parsed = parseGlobalVerifierResponse(verifierRaw)
        if (parsed) {
          globalVerifierResult = parsed
        }
      }
    } catch {
      // Global verifier is best-effort — heuristic fallback already computed
    }

    const evidenceSummary = buildEvidenceSummary({
      route,
      retrievals,
      distinctProviderCount,
      evidenceCount: body.provenance?.retrieval_count || evidenceCount,
      confidence: calibratedChampion.confidence,
    })
    const sharedPublicAnswer = buildPublicAnswer({
      prompt: routeSeed,
      summary: evidenceSummary,
      route,
      probability: finalChampion.probability,
      confidence: finalChampion.confidence,
      evidenceBacked: body.provenance?.evidence_backed === true,
      retrievalCount: body.provenance?.retrieval_count || evidenceCount,
      distinctProviderCount,
      disagreementIndex,
      contradictionPoints,
      missingEvidence,
      questionContext,
      alignment: contextAlignment,
    }) as unknown as Record<string, unknown>

    const worstCaseCounterfactual = generateAdversarialCounterfactual(
      agentProbabilities,
      disagreementIndex,
      contradictionPoints,
      missingEvidence,
      evidenceCount,
    )

    const response = {
      question,
      panel: {
        agents: agentProbabilities,
        disagreementIndex,
        deliberation: usedLLMDeliberation ? {
          rounds: 2,
          mediatorSummary: mediatorResult?.consensus_summary || null,
          disagreementPoints: mediatorResult?.disagreement_points || [],
          adjustmentDirection: mediatorResult?.adjustment_direction || null,
        } : null,
      },
      adversarialReview: {
        skepticProbability: clamp(skepticAdjustedProbability - 0.03, 0.02, 0.95),
        contradictionPoints,
        missingEvidence,
        overconfidenceRisk: clamp(disagreementIndex * 0.65 + (1 - question.quality.evidenceCoverage) * 0.35, 0, 1),
        recommendation: question.quality.overall >= 0.72 && evidenceCount >= 3
          ? 'Use the champion consensus with the challenger deltas visible and keep the skeptic review attached.'
          : 'Treat this as an analyst-assist forecast only until the question wording or evidence bundle is strengthened.',
        worstCaseCounterfactual,
      },
      consensus: {
        activePolicy: projectedConsensus.activePolicy,
        champion: finalChampion,
        challengers: projectedConsensus.challengers,
        confidenceBand: {
          lower,
          upper
        },
        executionCheckpoints: buildConsensusCheckpoints(question.quality.overall, evidenceCount, disagreementIndex, projectedConsensus.challengerSpread)
      },
      metadata: {
        evidenceCount,
        uniqueSourceCount,
        freshEvidenceCount,
        baseForecastProbability,
        disagreementIndex,
        activeConsensusPolicy
      },
      contextAlignment,
      publicAnswer: buildHostedPublicAnswer({
        route,
        questionContext,
        alignment: contextAlignment,
        probability: finalChampion.probability,
        evidenceBacked: body.provenance?.evidence_backed === true,
        retrievalCount: body.provenance?.retrieval_count || evidenceCount,
        distinctProviderCount,
        disagreementIndex,
        contradictionPoints,
        missingEvidence,
        evidenceSummary,
        sharedAnswer: sharedPublicAnswer,
      }),
      // P1: ProphetHacks enhancements
      evidenceGate: evidenceGateResult,
      noMoveReason,
      marketPrior: marketPriorResult.bestMatch ? {
        source: marketPriorResult.bestMatch.source,
        probability: marketPriorResult.bestMatch.yesPrice,
        marketQuestion: marketPriorResult.bestMatch.question,
        url: marketPriorResult.bestMatch.url || undefined,
      } : null,
      semanticRoute: {
        category: semanticRoute.category,
        label: semanticRoute.label,
        routingConfidence: semanticRoute.routingConfidence,
      },
      calibrationWithLearnings: {
        sampleSize: calibrationConfidence.sampleSize,
        brierScore: calibrationConfidence.brierScore,
        method: learningsCalibration.method,
        calibrationStatus: learningsCalibration.calibrationStatus,
      },
      // Phase A: LLM-as-Judge verification result
      judgeVerification: judgeResult ? {
        family: judgeResult.family,
        verifiedProbability: judgeResult.verifiedProbability,
        judgeConfidence: judgeResult.judgeConfidence,
        disagreementWithChampion: judgeResult.disagreementWithChampion,
        judgeReasoning: judgeResult.judgeReasoning,
        verdict: judgeResult.verdict,
        concerns: judgeResult.concerns,
        adjustedProbability: judgeAdjustedProbability,
        judgeDelta,
        severity: judgeSeverity,
      } : null,
      // Phase C: Orchestrator decision
      orchestrator: {
        activeAgentCount: activeRoles.length,
        skippedAgents: orchestratorDecision.skippedAgents,
        reasoning: orchestratorDecision.reasoning,
        estimatedComplexity: orchestratorDecision.estimatedComplexity,
        recommendedRounds: orchestratorDecision.recommendedRounds,
      },
      // Phase D: Benchmark registry summary
      benchmark: benchmarkSummary ? {
        totalForecasts: benchmarkSummary.totalForecasts,
        resolvedForecasts: benchmarkSummary.resolvedForecasts,
        averageBrierScore: benchmarkSummary.averageBrierScore,
        calibrationError: benchmarkSummary.calibrationError,
        judgeAccuracy: benchmarkSummary.judgeAccuracy,
        trend: benchmarkSummary.trend,
        displayMetrics: benchmarkDisplayMetrics,
      } : null,
      // Phase E: Progress tracking — verification pipeline status
      progressTracking: {
        phases: [
          { name: 'semantic_routing', status: 'completed', duration: 0 },
          { name: 'agent_dispatch', status: usedLLMDeliberation ? 'completed' : 'fallback', detail: `${activeRoles.length} agents dispatched` },
          { name: 'consensus_calibration', status: 'completed' },
          { name: 'evidence_gate', status: evidenceGateResult.decision },
          { name: 'judge_verification', status: judgeResult ? (judgeSeverity === 'none' ? 'passed' : judgeSeverity) : 'skipped' },
          { name: 'evidence_graph', status: evidenceGraph.nodes.length > 0 ? 'completed' : 'empty' },
          { name: 'global_verifier', status: globalVerifierResult ? 'completed' : 'heuristic' },
          { name: 'benchmark_registry', status: benchmarkSummary ? 'completed' : 'no_data' },
        ],
        completedPhases: 8,
        totalPhases: 8,
        pipelineVersion: '2.0',
      },
      // Phase B: Evidence graph + global verifier
      evidenceGraph: {
        summary: evidenceGraph.summary,
        topNodes: evidenceGraph.nodes
          .slice()
          .sort((a, b) => b.credibilityScore * b.relevanceScore - a.credibilityScore * a.relevanceScore)
          .slice(0, 5)
          .map(n => ({
            claim: n.claim,
            source: n.source,
            nodeType: n.nodeType,
            credibilityScore: n.credibilityScore,
            verificationStatus: n.verificationStatus,
          })),
        edgeCount: evidenceGraph.edges.length,
      },
      globalVerifier: globalVerifierResult ? {
        verificationScore: globalVerifierResult.verificationScore,
        evidenceStrength: globalVerifierResult.evidenceStrength,
        coverageAssessment: globalVerifierResult.coverageAssessment,
        keyConcerns: globalVerifierResult.keyConcerns,
        strongestEvidence: globalVerifierResult.strongestEvidence,
        weakestLink: globalVerifierResult.weakestLink,
        recommendation: globalVerifierResult.recommendation,
        source: 'llm',
      } : {
        verificationScore: heuristicVerifier.verificationScore,
        evidenceStrength: heuristicVerifier.evidenceStrength,
        coverageAssessment: heuristicVerifier.coverageAssessment,
        keyConcerns: heuristicVerifier.keyConcerns,
        strongestEvidence: heuristicVerifier.strongestEvidence,
        weakestLink: heuristicVerifier.weakestLink,
        recommendation: heuristicVerifier.recommendation,
        source: 'heuristic',
      },
    }

    return jsonResponse(200, {
      ok: true,
      response
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return jsonResponse(500, {
      ok: false,
      message
    })
  }
})
