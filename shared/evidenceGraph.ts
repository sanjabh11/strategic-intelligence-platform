/**
 * Evidence Graph — AgentHarness-inspired structured evidence assembly.
 *
 * Transforms flat retrieval lists into a structured evidence graph where
 * nodes are claims/evidence pieces and edges capture support/contradict/refine
 * relationships. A global verifier reasons over the graph to produce a
 * verification score, mirroring Apodex-1.0-H's global verifier pattern.
 *
 * Source: https://github.com/ApodexAI/AgentHarness
 * Pattern: Evidence graph assembly + global verifier from Apodex-1.0-H
 */

export type EvidenceNodeType =
  | 'claim'
  | 'data'
  | 'official_source'
  | 'media_report'
  | 'expert_opinion'
  | 'market_signal'

export type EvidenceEdgeType =
  | 'supports'
  | 'contradicts'
  | 'refines'
  | 'contextualizes'

export type VerificationStatus =
  | 'verified'
  | 'partially_verified'
  | 'unverified'
  | 'contradicted'

export interface EvidenceNode {
  id: string
  claim: string
  source: string
  url?: string
  nodeType: EvidenceNodeType
  credibilityScore: number
  freshnessScore: number
  relevanceScore: number
  verificationStatus: VerificationStatus
  provider: string
  snippet?: string
}

export interface EvidenceEdge {
  fromId: string
  toId: string
  edgeType: EvidenceEdgeType
  weight: number
}

export interface EvidenceGraph {
  nodes: EvidenceNode[]
  edges: EvidenceEdge[]
  summary: EvidenceGraphSummary
}

export interface EvidenceGraphSummary {
  totalNodes: number
  totalEdges: number
  verifiedCount: number
  contradictedCount: number
  unverifiedCount: number
  averageCredibility: number
  averageRelevance: number
  supportRatio: number
  contradictionRatio: number
  evidenceStrength: number
  coverageScore: number
}

export interface GlobalVerifierResult {
  verificationScore: number
  evidenceStrength: number
  coverageAssessment: string
  keyConcerns: string[]
  strongestEvidence: string | null
  weakestLink: string | null
  recommendation: 'high_confidence' | 'moderate_confidence' | 'low_confidence' | 'insufficient_evidence'
}

interface RetrievalItem {
  id?: string
  title?: string
  url?: string
  snippet?: string
  source?: string
  score?: number
}

const PRIMARY_SOURCE_PATTERNS = /official|government|api|exchange|treasury|state\.dept|defense|ministry|central\.bank|wto|imf|world\.bank|un\.org|nato/i
const MEDIA_SOURCE_PATTERNS = /reuters|bloomberg|ap\.news|ft\.com|wsj|nytimes|washingtonpost|bbc|guardian|aljazeera|economist/i
const MARKET_SOURCE_PATTERNS = /polymarket|kalshi|predictit|betfair|metaculus/i

function classifyNodeType(source: string, url: string): EvidenceNodeType {
  const combined = `${source} ${url}`.toLowerCase()
  if (MARKET_SOURCE_PATTERNS.test(combined)) return 'market_signal'
  if (PRIMARY_SOURCE_PATTERNS.test(combined)) return 'official_source'
  if (MEDIA_SOURCE_PATTERNS.test(combined)) return 'media_report'
  if (/expert|analyst|research|think.?tank|university|journal/i.test(combined)) return 'expert_opinion'
  if (/data|statistic|report|index|census|survey/i.test(combined)) return 'data'
  return 'claim'
}

function assessCredibility(nodeType: EvidenceNodeType, source: string): number {
  const baseScore: Record<EvidenceNodeType, number> = {
    official_source: 0.90,
    data: 0.85,
    market_signal: 0.80,
    expert_opinion: 0.70,
    media_report: 0.65,
    claim: 0.50,
  }
  return baseScore[nodeType] || 0.50
}

function assessFreshness(snippet: string): number {
  const now = Date.now()
  const dayInMs = 86400000
  const recentPatterns = [
    /(\d+)\s*days?\s*ago/i,
    /(\d+)\s*hours?\s*ago/i,
    /(\d+)\s*weeks?\s*ago/i,
    /today/i,
    /yesterday/i,
    /this\s*week/i,
    /recent/i,
    /latest/i,
    /just\s*released/i,
  ]
  for (const pattern of recentPatterns) {
    const match = snippet.match(pattern)
    if (match) {
      if (/today|yesterday|this\s*week|recent|latest|just\s*released/i.test(match[0])) return 0.95
      const num = parseInt(match[1] || '1', 10)
      if (/hours?/i.test(match[0])) return Math.max(0.5, 1 - num / 72)
      if (/days?/i.test(match[0])) return Math.max(0.3, 1 - num / 30)
      if (/weeks?/i.test(match[0])) return Math.max(0.1, 1 - num / 12)
    }
  }
  return 0.40
}

function assessRelevance(score: number | undefined, snippet: string): number {
  if (typeof score === 'number' && score > 0) {
    return Math.min(1, Math.max(0.1, score))
  }
  return snippet.length > 100 ? 0.60 : 0.40
}

function assessVerificationStatus(
  nodeType: EvidenceNodeType,
  credibility: number,
  freshness: number,
): VerificationStatus {
  if (nodeType === 'official_source' && credibility >= 0.85) return 'verified'
  if (credibility >= 0.75 && freshness >= 0.5) return 'verified'
  if (credibility >= 0.60) return 'partially_verified'
  if (credibility < 0.45) return 'unverified'
  return 'partially_verified'
}

function extractProvider(source: string, url: string): string {
  if (source) return source.trim().toLowerCase()
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '')
    return hostname.split('.')[0] || 'unknown'
  } catch {
    return 'unknown'
  }
}

function detectEdgeType(
  snippetA: string,
  snippetB: string,
): EvidenceEdgeType {
  const combined = `${snippetA} ${snippetB}`.toLowerCase()
  if (/however|but|contradict|dispute|deny|reject|oppose|counter/i.test(combined)) return 'contradicts'
  if (/also|further|additionally|moreover|support|confirm|corroborate|agree/i.test(combined)) return 'supports'
  if (/specifically|detail|refine|clarify|elaborate|nuance/i.test(combined)) return 'refines'
  return 'contextualizes'
}

export function buildEvidenceGraph(
  retrievals: RetrievalItem[],
  questionContext: string,
): EvidenceGraph {
  const nodes: EvidenceNode[] = []
  const seenClaims = new Set<string>()

  for (let i = 0; i < retrievals.length; i++) {
    const r = retrievals[i]
    const claim = (r.title || r.snippet || '').trim().slice(0, 300)
    if (!claim || seenClaims.has(claim)) continue
    seenClaims.add(claim)

    const source = (r.source || '').trim()
    const url = (r.url || '').trim()
    const nodeType = classifyNodeType(source, url)
    const credibility = assessCredibility(nodeType, source)
    const freshness = assessFreshness(r.snippet || '')
    const relevance = assessRelevance(r.score, r.snippet || '')
    const verificationStatus = assessVerificationStatus(nodeType, credibility, freshness)
    const provider = extractProvider(source, url)

    nodes.push({
      id: r.id || `ev_${i}`,
      claim,
      source: source || provider,
      url: url || undefined,
      nodeType,
      credibilityScore: Math.round(credibility * 100) / 100,
      freshnessScore: Math.round(freshness * 100) / 100,
      relevanceScore: Math.round(relevance * 100) / 100,
      verificationStatus,
      provider,
      snippet: (r.snippet || '').trim().slice(0, 500) || undefined,
    })
  }

  const edges: EvidenceEdge[] = []
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i]
      const b = nodes[j]
      if (a.provider === b.provider) continue
      const edgeType = detectEdgeType(a.snippet || a.claim, b.snippet || b.claim)
      const weight = Math.round(
        ((a.credibilityScore + b.credibilityScore) / 2) * (a.relevanceScore + b.relevanceScore) / 2 * 100,
      ) / 100
      if (weight > 0.15) {
        edges.push({
          fromId: a.id,
          toId: b.id,
          edgeType,
          weight,
        })
      }
    }
  }

  const summary = computeGraphSummary(nodes, edges)
  return { nodes, edges, summary }
}

export function computeGraphSummary(
  nodes: EvidenceNode[],
  edges: EvidenceEdge[],
): EvidenceGraphSummary {
  const totalNodes = nodes.length
  const totalEdges = edges.length
  const verifiedCount = nodes.filter(n => n.verificationStatus === 'verified').length
  const contradictedCount = nodes.filter(n => n.verificationStatus === 'contradicted').length
  const unverifiedCount = nodes.filter(n => n.verificationStatus === 'unverified').length

  const averageCredibility = totalNodes > 0
    ? Math.round((nodes.reduce((sum, n) => sum + n.credibilityScore, 0) / totalNodes) * 100) / 100
    : 0
  const averageRelevance = totalNodes > 0
    ? Math.round((nodes.reduce((sum, n) => sum + n.relevanceScore, 0) / totalNodes) * 100) / 100
    : 0

  const supportEdges = edges.filter(e => e.edgeType === 'supports').length
  const contradictEdges = edges.filter(e => e.edgeType === 'contradicts').length
  const supportRatio = totalEdges > 0 ? Math.round((supportEdges / totalEdges) * 100) / 100 : 0
  const contradictionRatio = totalEdges > 0 ? Math.round((contradictEdges / totalEdges) * 100) / 100 : 0

  const evidenceStrength = Math.round(
    (averageCredibility * 0.4 + averageRelevance * 0.3 + (verifiedCount / Math.max(1, totalNodes)) * 0.3) * 100,
  ) / 100

  const coverageScore = Math.round(
    Math.min(1, totalNodes / 10) * (1 - contradictionRatio * 0.5) * 100,
  ) / 100

  return {
    totalNodes,
    totalEdges,
    verifiedCount,
    contradictedCount,
    unverifiedCount,
    averageCredibility,
    averageRelevance,
    supportRatio,
    contradictionRatio,
    evidenceStrength,
    coverageScore,
  }
}

export function buildGlobalVerifierPrompt(
  graph: EvidenceGraph,
  question: string,
  championProbability: number,
): string {
  const nodesFormatted = graph.nodes.slice(0, 10).map((n, i) => {
    return `  [${i + 1}] (${n.nodeType}, cred=${n.credibilityScore}, ${n.verificationStatus})
    Claim: ${n.claim}
    Source: ${n.source}`
  }).join('\n')

  const edgesFormatted = graph.edges.slice(0, 8).map(e => {
    const fromNode = graph.nodes.find(n => n.id === e.fromId)
    const toNode = graph.nodes.find(n => n.id === e.toId)
    return `  ${fromNode?.source || e.fromId} --${e.edgeType}--> ${toNode?.source || e.toId} (w=${e.weight})`
  }).join('\n')

  return `You are a global evidence verifier. Assess the evidence graph for this forecast.

QUESTION: ${question}
CHAMPION PROBABILITY: ${(championProbability * 100).toFixed(1)}%

EVIDENCE GRAPH (${graph.summary.totalNodes} nodes, ${graph.summary.totalEdges} edges):
Nodes:
${nodesFormatted}

Edges:
${edgesFormatted}

Summary:
- Verified: ${graph.summary.verifiedCount}/${graph.summary.totalNodes}
- Average credibility: ${graph.summary.averageCredibility}
- Support ratio: ${graph.summary.supportRatio}
- Contradiction ratio: ${graph.summary.contradictionRatio}
- Evidence strength: ${graph.summary.evidenceStrength}
- Coverage score: ${graph.summary.coverageScore}

Assess the evidence quality and return JSON with:
- verification_score (0-1): How well does the evidence support the champion probability?
- evidence_strength (0-1): How strong is the evidence base overall?
- coverage_assessment (string): What does the evidence cover well or poorly?
- key_concerns (array of strings): What are the main evidence gaps or risks?
- strongest_evidence (string or null): Which evidence piece is most compelling?
- weakest_link (string or null): Which evidence piece is most vulnerable?
- recommendation: high_confidence | moderate_confidence | low_confidence | insufficient_evidence`
}

export interface GlobalVerifierLLMResult {
  verificationScore: number
  evidenceStrength: number
  coverageAssessment: string
  keyConcerns: string[]
  strongestEvidence: string | null
  weakestLink: string | null
  recommendation: GlobalVerifierResult['recommendation']
}

export function parseGlobalVerifierResponse(raw: string): GlobalVerifierLLMResult | null {
  try {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
    const parsed = JSON.parse(cleaned)

    const verificationScore = typeof parsed.verification_score === 'number'
      ? Math.min(1, Math.max(0, parsed.verification_score))
      : null
    if (verificationScore === null) return null

    const evidenceStrength = typeof parsed.evidence_strength === 'number'
      ? Math.min(1, Math.max(0, parsed.evidence_strength))
      : 0.5

    const recommendationRaw = typeof parsed.recommendation === 'string' ? parsed.recommendation : 'moderate_confidence'
    const validRecommendations = ['high_confidence', 'moderate_confidence', 'low_confidence', 'insufficient_evidence']
    const recommendation = validRecommendations.includes(recommendationRaw)
      ? recommendationRaw as GlobalVerifierResult['recommendation']
      : 'moderate_confidence'

    const keyConcerns = Array.isArray(parsed.key_concerns)
      ? parsed.key_concerns.filter((c: unknown) => typeof c === 'string').slice(0, 5)
      : []

    return {
      verificationScore,
      evidenceStrength,
      coverageAssessment: typeof parsed.coverage_assessment === 'string' ? parsed.coverage_assessment : '',
      keyConcerns,
      strongestEvidence: typeof parsed.strongest_evidence === 'string' ? parsed.strongest_evidence : null,
      weakestLink: typeof parsed.weakest_link === 'string' ? parsed.weakest_link : null,
      recommendation,
    }
  } catch {
    return null
  }
}

export function computeHeuristicVerifierScore(graph: EvidenceGraph): GlobalVerifierResult {
  const { evidenceStrength, coverageScore, verifiedCount, totalNodes, contradictionRatio, averageCredibility } = graph.summary

  const verificationScore = Math.round(
    (evidenceStrength * 0.4 + coverageScore * 0.3 + (verifiedCount / Math.max(1, totalNodes)) * 0.3) * 100,
  ) / 100

  let recommendation: GlobalVerifierResult['recommendation'] = 'insufficient_evidence'
  if (verificationScore >= 0.7 && contradictionRatio < 0.2) {
    recommendation = 'high_confidence'
  } else if (verificationScore >= 0.5) {
    recommendation = 'moderate_confidence'
  } else if (verificationScore >= 0.3) {
    recommendation = 'low_confidence'
  }

  const strongestNode = graph.nodes
    .slice()
    .sort((a, b) => b.credibilityScore * b.relevanceScore - a.credibilityScore * a.relevanceScore)[0]

  const weakestNode = graph.nodes
    .slice()
    .sort((a, b) => a.credibilityScore * a.relevanceScore - b.credibilityScore * b.relevanceScore)[0]

  const keyConcerns: string[] = []
  if (contradictionRatio > 0.3) keyConcerns.push('High contradiction ratio in evidence graph')
  if (averageCredibility < 0.55) keyConcerns.push('Low average source credibility')
  if (totalNodes < 3) keyConcerns.push('Insufficient evidence volume')
  if (graph.summary.unverifiedCount > totalNodes * 0.5) keyConcerns.push('Majority of evidence is unverified')

  return {
    verificationScore,
    evidenceStrength,
    coverageAssessment: `${verifiedCount}/${totalNodes} sources verified. Coverage: ${(coverageScore * 100).toFixed(0)}%.`,
    keyConcerns,
    strongestEvidence: strongestNode?.claim || null,
    weakestLink: weakestNode?.claim || null,
    recommendation,
  }
}
