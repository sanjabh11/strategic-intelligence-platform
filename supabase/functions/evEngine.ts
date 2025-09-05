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