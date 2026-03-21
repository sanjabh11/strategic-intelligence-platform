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
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
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

function buildQuestionPackage(description: string, horizonDays: number, retrievals: RetrievalInput[]) {
  const firstSentence = description.split(/[.?!]/).map(part => part.trim()).find(Boolean) || description.trim()
  const keywords = scenarioKeywords(description)
  const evidenceCoverage = clamp((retrievals.length / 6), 0, 1)
  const clarity = clamp(firstSentence.length > 30 ? 0.84 : 0.7, 0, 1)
  const resolvability = clamp((keywords.directional ? 0.8 : 0.74) + evidenceCoverage * 0.15, 0, 0.96)
  const issues: string[] = []

  if (retrievals.length < 3) {
    issues.push('Evidence bundle is thin; specialist probabilities should be treated as provisional.')
  }
  if (firstSentence.length < 24) {
    issues.push('Scenario prompt is short; the forecast target may need refinement.')
  }
  if (!keywords.directional) {
    issues.push('Question is phrased as an event-style forecast; later phases should tighten explicit numerical resolution where possible.')
  }

  const overall = clamp((clarity * 0.35) + (resolvability * 0.35) + (evidenceCoverage * 0.3), 0, 1)
  const title = firstSentence.slice(0, 100)
  const questionType = keywords.directional ? 'directional' : 'binary'

  return {
    title,
    question: questionType === 'directional'
      ? `Will the focal strategic variable move materially in the forecast direction within ${horizonDays} days?`
      : `Will the focal strategic outcome described in the scenario occur within ${horizonDays} days?`,
    questionType,
    horizonDays,
    closeTime: new Date(Date.now() + horizonDays * 24 * 60 * 60 * 1000).toISOString(),
    resolutionSource: questionType === 'directional'
      ? 'Authoritative public market/economic data series cited by the platform'
      : 'Authoritative official releases and public reporting cited by the platform',
    fallbackResolution: 'If the primary source becomes unavailable, use the first consistent official or archived public source covering the same event definition.',
    resolutionCriteria: questionType === 'directional'
      ? `Resolve according to the authoritative price or macro series referenced by the platform after ${horizonDays} days, using the same instrument or index definition throughout the forecast lifecycle.`
      : `Resolve yes if the event definition in the scenario is satisfied by the stated horizon using the cited authoritative public source; otherwise resolve no unless the event becomes ambiguous or canceled.`,
    quality: {
      clarity,
      resolvability,
      evidenceCoverage,
      overall,
      issues,
      requiresHumanRefinement: overall < 0.72
    }
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

Deno.serve(async (req: Request) => {
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
    const freshEvidenceCount = retrievals.filter(retrieval => /202[4-9]|today|latest|recent/i.test(`${retrieval.title || ''} ${retrieval.snippet || ''}`)).length || Math.min(evidenceCount, 2)
    const baseForecast = Array.isArray(body.baseForecast) ? body.baseForecast : []
    const baseForecastProbability = baseForecast.length > 0 ? clamp(Number(baseForecast[baseForecast.length - 1]?.probability ?? 0.5), 0, 1) : null
    const horizonDays = Math.max(7, Math.min(Number(body.scenario?.horizonDays || 14), 30))
    const question = buildQuestionPackage(description, horizonDays, retrievals)
    const roles = [
      { id: 'geopolitics', label: 'Geopolitics Agent', weight: 0.32 },
      { id: 'commodities', label: 'Commodities Agent', weight: 0.23 },
      { id: 'macro', label: 'Macro Agent', weight: 0.25 },
      { id: 'risk', label: 'Risk Agent', weight: 0.2 }
    ]

    const agentProbabilities = roles.map(role => {
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
        objections: buildRoleObjections(role.id)
      }
    })

    const disagreementIndex = clamp(standardDeviation(agentProbabilities.map(agent => agent.probability)) * 3.5, 0, 1)
    const normalizedWeightSum = agentProbabilities.reduce((sum, agent) => sum + agent.weight, 0) || 1
    const championProbability = clamp(agentProbabilities.reduce((sum, agent) => sum + agent.probability * agent.weight, 0) / normalizedWeightSum, 0, 1)
    const championConfidence = clamp(average(agentProbabilities.map(agent => agent.confidence)) - disagreementIndex * 0.15, 0.25, 0.92)
    const sortedProbabilities = agentProbabilities.map(agent => agent.probability).sort((a, b) => a - b)
    const equalWeightProbability = average(agentProbabilities.map(agent => agent.probability))
    const trimmedProbability = sortedProbabilities.length > 2 ? average(sortedProbabilities.slice(1, sortedProbabilities.length - 1)) : equalWeightProbability
    const skepticAdjustedProbability = clamp(championProbability - disagreementIndex * 0.12 - (question.quality.overall < 0.72 ? 0.04 : 0), 0.03, 0.97)
    const challengerSpread = Math.max(
      Math.abs(equalWeightProbability - championProbability),
      Math.abs(trimmedProbability - championProbability),
      Math.abs(skepticAdjustedProbability - championProbability)
    )
    const lower = clamp(championProbability - (0.06 + disagreementIndex * 0.18), 0, 1)
    const upper = clamp(championProbability + (0.06 + disagreementIndex * 0.18), 0, 1)
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

    const missingEvidence = [] as string[]
    if (evidenceCount < 3) missingEvidence.push('More external sources are needed before public testing.')
    if (uniqueSourceCount < 2 && evidenceCount > 0) missingEvidence.push('Source diversity is limited; correlated reporting risk remains.')
    if (baseForecastProbability === null) missingEvidence.push('No baseline temporal forecast curve was available for anchoring.')

    const response = {
      question,
      panel: {
        agents: agentProbabilities,
        disagreementIndex
      },
      adversarialReview: {
        skepticProbability: clamp(skepticAdjustedProbability - 0.03, 0.02, 0.95),
        contradictionPoints,
        missingEvidence,
        overconfidenceRisk: clamp(disagreementIndex * 0.65 + (1 - question.quality.evidenceCoverage) * 0.35, 0, 1),
        recommendation: question.quality.overall >= 0.72 && evidenceCount >= 3
          ? 'Use the champion consensus with the challenger deltas visible and keep the skeptic review attached.'
          : 'Treat this as an analyst-assist forecast only until the question wording or evidence bundle is strengthened.'
      },
      consensus: {
        champion: {
          probability: championProbability,
          confidence: championConfidence,
          method: 'role-weighted consensus',
          rationale: 'Weighted specialist panel with skeptic-aware challenger comparison.'
        },
        challengers: [
          {
            id: 'equal_weight',
            label: 'Equal-Weight Challenger',
            probability: equalWeightProbability,
            confidence: clamp(championConfidence - 0.03, 0.2, 0.9),
            method: 'simple mean',
            deltaFromChampion: equalWeightProbability - championProbability
          },
          {
            id: 'trimmed_mean',
            label: 'Trimmed-Mean Challenger',
            probability: trimmedProbability,
            confidence: clamp(championConfidence - 0.01, 0.2, 0.9),
            method: 'drop extreme agent view',
            deltaFromChampion: trimmedProbability - championProbability
          },
          {
            id: 'skeptic_adjusted',
            label: 'Skeptic-Adjusted Challenger',
            probability: skepticAdjustedProbability,
            confidence: clamp(championConfidence - 0.05, 0.2, 0.88),
            method: 'champion minus disagreement penalty',
            deltaFromChampion: skepticAdjustedProbability - championProbability
          }
        ],
        confidenceBand: {
          lower,
          upper
        },
        executionCheckpoints: buildConsensusCheckpoints(question.quality.overall, evidenceCount, disagreementIndex, challengerSpread)
      },
      metadata: {
        evidenceCount,
        uniqueSourceCount,
        freshEvidenceCount,
        baseForecastProbability,
        disagreementIndex
      }
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
