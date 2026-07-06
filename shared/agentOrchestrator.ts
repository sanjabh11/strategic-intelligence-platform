/**
 * Agent Orchestrator — AgentHarness-inspired pre-dispatch pattern.
 *
 * Before dispatching specialist agents, the orchestrator analyzes the question
 * and decides which agents are relevant, what priority they have, and whether
 * any should be skipped. This mirrors Apodex-1.0-H's orchestrator that dispatches
 * specialized sub-agents based on the question type.
 *
 * Source: https://github.com/ApodexAI/AgentHarness
 * Pattern: Orchestrator pre-dispatch from Apodex-1.0-H heavy-duty mode
 */

export type AgentRole =
  | 'geopolitics'
  | 'commodities'
  | 'macro'
  | 'risk'
  | 'technology'
  | 'trade'
  | 'conflict'
  | 'opportunity'
  | 'temporal'
  | 'game_theory'

export interface AgentRoleConfig {
  id: AgentRole
  label: string
  weight: number
  priority: 'critical' | 'high' | 'medium' | 'low'
  relevanceThreshold: number
}

export interface OrchestratorDecision {
  activeAgents: AgentRoleConfig[]
  skippedAgents: AgentRole[]
  reasoning: string
  estimatedComplexity: 'low' | 'medium' | 'high'
  recommendedRounds: number
}

const ALL_ROLES: AgentRoleConfig[] = [
  { id: 'geopolitics', label: 'Geopolitics Agent', weight: 0.32, priority: 'high', relevanceThreshold: 0.3 },
  { id: 'commodities', label: 'Commodities Agent', weight: 0.23, priority: 'medium', relevanceThreshold: 0.3 },
  { id: 'macro', label: 'Macro Agent', weight: 0.25, priority: 'high', relevanceThreshold: 0.3 },
  { id: 'risk', label: 'Risk Agent', weight: 0.20, priority: 'high', relevanceThreshold: 0.2 },
]

const KEYWORD_MAP: Record<AgentRole, string[]> = {
  geopolitics: ['sanction', 'alliance', 'treaty', 'diplomat', 'nation', 'sovereign', 'border', 'territory', 'nato', 'un.', 'eu ', 'asean', 'g7', 'g20', 'opec'],
  commodities: ['oil', 'gas', 'gold', 'copper', 'wheat', 'corn', 'energy', 'commodity', 'supply chain', 'mining', 'agricultural', 'rare earth', 'lithium'],
  macro: ['gdp', 'inflation', 'recession', 'interest rate', 'fed ', 'ecb', 'central bank', 'fiscal', 'monetary', 'currency', 'bond', 'treasury', 'economic'],
  risk: ['risk', 'volatility', 'crisis', 'collapse', 'default', 'contagion', 'systemic', 'black swan', 'tail risk', 'stress test'],
  technology: ['ai', 'tech', 'semiconductor', 'chip', 'software', 'platform', 'regulate', 'standard', 'cyber', 'data'],
  trade: ['tariff', 'trade', 'export', 'import', 'wto', 'quota', 'embargo', 'trade war', 'free trade'],
  conflict: ['war', 'military', 'conflict', 'invasion', 'ceasefire', 'armed', 'defense', 'nuclear', 'missile'],
  opportunity: ['opportunity', 'growth', 'investment', 'emerging', 'frontier', 'innovation', 'disruption'],
  temporal: ['timeline', 'by q1', 'by q2', 'by q3', 'by q4', 'by 2025', 'by 2026', 'before', 'after', 'within'],
  game_theory: ['strategy', 'equilibrium', 'nash', 'game theory', 'prisoner', 'dilemma', 'payoff', 'incentive'],
}

function scoreRoleRelevance(role: AgentRole, text: string): number {
  const lower = text.toLowerCase()
  const keywords = KEYWORD_MAP[role] || []
  let matches = 0
  for (const kw of keywords) {
    if (lower.includes(kw)) matches++
  }
  return Math.min(1, matches / Math.max(3, keywords.length * 0.3))
}

export function orchestrateAgents(
  question: string,
  description: string,
  evidenceCount: number,
): OrchestratorDecision {
  const combinedText = `${question} ${description}`
  const scored = ALL_ROLES.map(role => ({
    config: role,
    relevance: scoreRoleRelevance(role.id, combinedText),
  }))

  const active = scored.filter(s => s.relevance >= s.config.relevanceThreshold)
  const skipped = scored.filter(s => s.relevance < s.config.relevanceThreshold).map(s => s.config.id)

  const activeAgents = active.map(s => s.config)

  if (activeAgents.length === 0) {
    return {
      activeAgents: ALL_ROLES,
      skippedAgents: [],
      reasoning: 'No strong role-specific signals detected — dispatching all agents with default weights.',
      estimatedComplexity: 'medium',
      recommendedRounds: 2,
    }
  }

  const complexity: 'low' | 'medium' | 'high' =
    activeAgents.length >= 4 && evidenceCount >= 5 ? 'high' :
    activeAgents.length >= 3 ? 'medium' : 'low'

  const recommendedRounds = complexity === 'high' ? 2 : complexity === 'medium' ? 2 : 1

  const reasoning = `Activated ${activeAgents.length}/${ALL_ROLES.length} agents based on keyword relevance. ` +
    `Skipped: ${skipped.length > 0 ? skipped.join(', ') : 'none'}. ` +
    `Complexity: ${complexity} (${activeAgents.length} active agents, ${evidenceCount} evidence pieces). ` +
    `Recommended rounds: ${recommendedRounds}.`

  return {
    activeAgents,
    skippedAgents: skipped,
    reasoning,
    estimatedComplexity: complexity,
    recommendedRounds,
  }
}

export interface ParallelDispatchResult<T> {
  results: Array<T | null>
  successCount: number
  failureCount: number
  allSucceeded: boolean
  anySucceeded: boolean
}

export async function dispatchAgentsParallel<T, A extends { id: string } = { id: string }>(
  agents: A[],
  fn: (agent: A, index: number) => Promise<T | null>,
): Promise<ParallelDispatchResult<T>> {
  const settled = await Promise.allSettled(
    agents.map((agent, index) => fn(agent, index)),
  )

  const results = settled.map(s => {
    if (s.status === 'fulfilled') return s.value
    return null
  })

  const successCount = results.filter(r => r !== null).length
  const failureCount = results.length - successCount

  return {
    results,
    successCount,
    failureCount,
    allSucceeded: successCount === results.length,
    anySucceeded: successCount > 0,
  }
}
