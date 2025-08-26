// Local analysis fallback engine for education/demo mode
// Generates deterministic AnalysisResult using a seeded RNG

import type { AnalysisRequest, AnalysisResult, Player } from '../types/strategic-analysis';

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pickDefaultPlayers(): Player[] {
  return [
    { id: 'P1', name: 'Alpha', actions: ['Cooperate', 'Defect'] },
    { id: 'P2', name: 'Beta', actions: ['Cooperate', 'Defect'] },
    { id: 'P3', name: 'Gamma', actions: ['Cooperate', 'Defect'] }
  ];
}

function normalize(weights: number[]): number[] {
  const s = weights.reduce((a, b) => a + b, 0) || 1;
  return weights.map(w => (w < 0 ? 0 : w) / s);
}

export async function analyzeLocally(request: AnalysisRequest): Promise<AnalysisResult> {
  const seed = request.options?.deterministicSeed ?? 1337;
  const rnd = mulberry32(seed);

  const players: Player[] = (request.players_def && request.players_def.length > 0)
    ? request.players_def
    : pickDefaultPlayers();

  // Equilibrium profile: per-player distribution over actions
  const profile: Record<string, Record<string, number>> = {};
  players.forEach((p, idx) => {
    const raw = p.actions.map((_a, ai) => 0.5 + rnd() + (idx === ai ? 0.2 : 0));
    const probs = normalize(raw);
    profile[p.id] = p.actions.reduce((acc, a, i) => {
      acc[a] = Number(probs[i].toFixed(3));
      return acc;
    }, {} as Record<string, number>);
  });

  const stability = Number((0.6 + rnd() * 0.35).toFixed(3));
  const convergenceIteration = Math.floor(5 + rnd() * 12);

  // Quantum collapsed: simple mix of most common actions
  const actionSet = Array.from(new Set(players.flatMap(p => p.actions)));
  const collapsedBase = actionSet.map(a => 0.5 + rnd());
  const collapsedNorm = normalize(collapsedBase).slice(0, Math.min(3, actionSet.length));
  const collapsed = collapsedNorm.map((p, i) => ({ action: actionSet[i], probability: Number(p.toFixed(3)) }));

  // Influence matrix: NxN in [0,1], with stronger self-influence
  const n = players.length;
  const influence: number[][] = Array.from({ length: n }, (_, i) => (
    Array.from({ length: n }, (_, j) => {
      const base = 0.1 + rnd() * 0.9;
      const selfBias = i === j ? 0.4 : 0;
      const v = Math.min(1, Math.max(0, base + selfBias));
      return Number(v.toFixed(3));
    })
  ));

  // Simple forecast curve
  const start = 0.45 + rnd() * 0.1;
  const slope = (stability - 0.5) * 0.1;
  const forecast = Array.from({ length: 6 }, (_, t) => ({
    t,
    probability: Number(Math.min(1, Math.max(0, start + slope * t + (rnd() - 0.5) * 0.02)).toFixed(3))
  }));

  const analysis: AnalysisResult = {
    scenario_text: request.scenario_text,
    players,
    equilibrium: {
      profile,
      stability,
      method: 'local_demo',
      convergenceIteration,
      confidence: { lower: Number(Math.max(0, stability - 0.1).toFixed(3)), upper: Number(Math.min(1, stability + 0.1).toFixed(3)) }
    },
    quantum: {
      collapsed,
      influence
    },
    pattern_matches: [
      { id: 'demo-1', score: Number((0.7 + rnd() * 0.2).toFixed(3)) },
      { id: 'demo-2', score: Number((0.5 + rnd() * 0.2).toFixed(3)) }
    ],
    retrievals: [],
    retrieval_count: 0,
    processing_stats: {
      processing_time_ms: Math.floor(50 + rnd() * 100),
      stability_score: stability
    },
    provenance: {
      evidence_backed: false,
      retrieval_count: 0,
      model: 'local-demo-1.0'
    },
    forecast
  };

  return Promise.resolve(analysis);
}
