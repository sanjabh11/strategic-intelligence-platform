// evEngine.ts
export type PayoffEstimate = { value: number, confidence: number, sources: Array<{id:string,score:number,excerpt?:string}>, derived?: boolean };
export type ActionEntry = { actor: string, action: string, payoff_estimate: PayoffEstimate };

export function computeEVs(actions: ActionEntry[], probabilities?: Record<string, number>) {
  // actions: list of candidate actions for a single decision context (actor/action pairs)
  // probabilities: optional scenario probabilities (e.g. scenarioA:0.6, scenarioB:0.4)
  // For simple: EV = payoff.value * payoff.confidence
  const evs = actions.map(a => {
    const value = Number(a.payoff_estimate?.value ?? 0);
    const conf = Number(a.payoff_estimate?.confidence ?? 0.5);
    const ev = value * conf;
    // Link sources to retrieval_id + score + excerpt for provenance
    const sources = (a.payoff_estimate.sources ?? []).map(s => ({
      retrieval_id: s.id,
      score: s.score,
      excerpt: s.excerpt
    }));
    // Auto-mark derived if sources absent
    const derived = !sources || sources.length === 0;
    return {
      actor: a.actor,
      action: a.action,
      ev,
      sources,
      derived,
      raw: { ...a.payoff_estimate, derived }
    };
  });
  // Rank descending
  evs.sort((x,y) => y.ev - x.ev);
  return evs;
}

// Finance scenario definitions and multi-scenario EV computation
export const FINANCE_SCENARIOS = {
  bull: {
    name: 'Bull Market',
    description: 'Optimistic scenario with +5% to +15% market growth',
    multiplierRange: [1.05, 1.15]
  },
  neutral: {
    name: 'Neutral Market',
    description: 'Balanced scenario with -5% to +5% market variation',
    multiplierRange: [0.95, 1.05]
  },
  bear: {
    name: 'Bear Market',
    description: 'Pessimistic scenario with -15% to -5% market decline',
    multiplierRange: [0.85, 0.95]
  }
};

export type RiskTolerance = 'low' | 'medium' | 'high';

export function computeFinanceEVs(
  actions: ActionEntry[],
  userProfile: { risk_tolerance?: RiskTolerance },
  indicators: Array<{ metric: string, value: number }>
): any[] {
  const riskTolerance = userProfile?.risk_tolerance || 'medium';

  // Risk tolerance weights (bull, neutral, bear)
  const weights = {
    low: [0.6, 0.3, 0.1],    // More conservative
    medium: [0.33, 0.34, 0.33], // Balanced
    high: [0.1, 0.3, 0.6]    // More aggressive
  };

  const [bullWeight, neutralWeight, bearWeight] = weights[riskTolerance];

  // Compute average indicator impacts
  const avgIndicators = indicators.reduce((acc, ind) => {
    acc[ind.metric] = (acc[ind.metric] || 0) + ind.value / indicators.length;
    return acc;
  }, {} as Record<string, number>);

  const computeScenarioEV = (
    baseActions: ActionEntry[],
    scenarioMultiplier: (value: number, confidence: number) => number
  ): any[] => {
    return baseActions.map(action => {
      const value = Number(action.payoff_estimate?.value ?? 0);
      const conf = Number(action.payoff_estimate?.confidence ?? 0.5);
      const adjustedValue = scenarioMultiplier(value, conf);
      const ev = adjustedValue * conf;

      return {
        action: action.action,
        scenario_value: adjustedValue,
        scenario_ev: ev,
        confidence: conf
      };
    });
  };

  const bullScenario = computeScenarioEV(actions, (value, conf) => {
    // Use positive indicators to boost payoffs in bull scenario
    const indicatorBoost = (avgIndicators.pct_change || 0) * 0.1;
    return value * (0.08 + (Math.random() * 0.07) + indicatorBoost);
  });

  const neutralScenario = computeScenarioEV(actions, (value, conf) => {
    // Use current/mixed indicators in neutral scenario
    const volatilityBoost = Math.abs(avgIndicators.volatility || 0) * (-0.05);
    return value * volatilityBoost;
  });

  const bearScenario = computeScenarioEV(actions, (value, conf) => {
    // Use negative indicators to reduce payoffs in bear scenario
    const indicatorReduction = Math.max(0, -(avgIndicators.pct_change || 0)) * 0.15;
    return value * (-0.02 - (Math.random() * 0.08) - indicatorReduction);
  });

  // Compute weighted EV for each action
  const weightedEVs = actions.map((action, idx) => {
    const bullEV = bullScenario[idx].scenario_ev * bullWeight;
    const neutralEV = neutralScenario[idx].scenario_ev * neutralWeight;
    const bearEV = bearScenario[idx].scenario_ev * bearWeight;

    const totalWeightedEV = bullEV + neutralEV + bearEV;
    const sources = (action.payoff_estimate.sources ?? []).map(s => ({
      retrieval_id: s.id,
      score: s.score,
      excerpt: s.excerpt
    }));

    return {
      actor: action.actor,
      action: action.action,
      ev: Number(totalWeightedEV.toFixed(3)),
      scenario_breakdown: {
        bull: Number(bullEV.toFixed(3)),
        neutral: Number(neutralEV.toFixed(3)),
        bear: Number(bearEV.toFixed(3))
      },
      sources,
      derived: sources.length === 0,
      raw: { ...action.payoff_estimate, derived: sources.length === 0 }
    };
  });

  // Sort by weighted EV descending
  weightedEVs.sort((x, y) => y.ev - x.ev);

  return weightedEVs;
}