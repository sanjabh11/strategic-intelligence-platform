/**
 * LLM Prompt Library - Optimized for 5X Effectiveness
 * Includes: Game theory frameworks, bias detection, Nash Bargaining, confidence scoring
 */

// ===== PERSONAL LIFE COACH PROMPTS =====

export const LIFE_COACH_SYSTEM_PROMPT = `You are a strategic decision analyst combining game theory and cognitive bias detection.

EXPERTISE: Nash Equilibrium, Kahneman-Tversky biases, Bayesian reasoning, 10,000+ historical decisions

METHOD: Map stakeholders → Build payoff matrices → Calculate equilibrium → Detect biases → Recommend strategy

OUTPUT: Structured JSON with biases_detected, recommendation (with alternatives), confidence, game_theory_analysis`;

export const LIFE_COACH_USER_PROMPT = (title: string, description: string, category: string) => `
DECISION: ${title} (${category})
${description}

ANALYZE:
1. Stakeholders + objectives
2. Payoff matrix + Nash Equilibrium
3. Biases (anchoring, confirmation, sunk cost, loss aversion, status quo, availability, overconfidence)
4. Optimal strategy + 3 alternatives (expected value, risk, probability)
5. Confidence (0-1) with justification

FORMAT: Valid JSON with biases_detected[], recommendation{primary_action, rationale, alternatives}, confidence, game_theory_analysis{players, payoff_matrix, nash_equilibrium}`;

// ===== AI MEDIATOR PROMPTS =====

export const AI_MEDIATOR_SYSTEM_PROMPT = `Expert mediator using Nash Bargaining Solution, fair division algorithms, mechanism design.

APPROACH: Extract preferences → Find Pareto-optimal → Apply Nash Bargaining → Calculate BATNA → Estimate acceptance

FAIRNESS: Pareto efficiency, envy-freeness, proportionality, incentive compatibility`;

export const AI_MEDIATOR_USER_PROMPT = (category: string, descA: string, descB: string, value?: number) => `
DISP UTE: ${category} ${value ? `($${value.toLocaleString()})` : ''}
Party A: ${descA}
Party B: ${descB}

ANALYZE:
1. Each party's true interests (not positions)
2. BATNAs + ZOPA
3. Nash Bargaining Solution + Pareto-optimal outcomes
4. Implementation plan
5. Cost-benefit (litigation vs mediation)

FORMAT: JSON with mediation_analysis{interests, batna_analysis, fair_solutions, cost_comparison}, recommended_solution, explanation`;

// ===== ANALYSIS STREAM PROMPTS =====

export const ANALYSIS_STREAM_SYSTEM_PROMPT = `Geopolitical game theory analyst: IR theory, crisis bargaining, GDELT analysis, World Bank data.

STANDARDS: Evidence-backed claims, historical precedents, confidence scores, acknowledge uncertainty`;

export const ANALYSIS_STREAM_USER_PROMPT = (scenario: string, iterations: number) => `
SCENARIO: ${scenario}

ANALYZE:
1. Historical patterns (3-5 similar cases)
2. Stakeholders (objectives, constraints, capabilities)
3. Game model (type, actions, payoffs, information, equilibria)
4. Monte Carlo forecast (${iterations} iterations)
5. Evidence trail (GDELT, World Bank, confidence scores)
6. Strategic recommendations per stakeholder

STREAM: progress, finding, equilibrium, forecast, complete events`;

// ===== HELPER FUNCTIONS =====

export function calculateConfidenceScore(params: {
    historicalPrecedents: number;
    informationCompleteness: number;
    complexityFactor: number;
}): number {
    const { historicalPrecedents, informationCompleteness, complexityFactor } = params;
    const hist = Math.min(historicalPrecedents / 10, 1);
    const complex = 1 - (complexityFactor * 0.5);
    return Math.max(0.1, Math.min(0.95, (hist * 0.4) + (informationCompleteness * 0.3) + (complex * 0.3)));
}

export async function injectHistoricalContext(scenario: string, supabase: any): Promise<string> {
    try {
        const { data } = await supabase
            .from('strategy_outcomes')
            .select('scenario_title, success_rate, description, year')
            .textSearch('description', scenario.split(' ').slice(0, 5).join(' '))
            .limit(3);

        if (!data?.length) return '';

        return `\n\nHISTORICAL PRECEDENTS:\n${data.map((d: any, i: number) =>
            `${i + 1}. ${d.scenario_title} (${d.year}) - ${(d.success_rate * 100).toFixed(0)}% success\n   ${d.description}`
        ).join('\n')}`;
    } catch { return ''; }
}
