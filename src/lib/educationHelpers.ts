// Education Helpers
// Mode-aware generators for education-specific analysis enrichment
// In education mode, students determine values themselves; helpers return scaffolds

export type AnalysisMode = 'analysis' | 'education_quick' | 'education';

interface EduHelperOptions {
  mode?: AnalysisMode;
}

interface WithProvenance {
  provenance?: { source: string; mode: AnalysisMode };
}

function isEducationMode(mode?: AnalysisMode): boolean {
  return mode === 'education' || mode === 'education_quick';
}

export function generatePlayerInteractions(
  players: Array<{ id: string; name?: string; actions: string[] }>,
  options?: EduHelperOptions
): Array<{ player1: string; player2: string; strength: number } & WithProvenance> {
  if (isEducationMode(options?.mode)) {
    return [];
  }
  const interactions: Array<{ player1: string; player2: string; strength: number } & WithProvenance> = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      interactions.push({
        player1: players[i].id,
        player2: players[j].id,
        strength: 0.5,
        provenance: { source: 'heuristic', mode: options?.mode ?? 'analysis' },
      });
    }
  }
  return interactions;
}

export function generateDecisionAlternatives(
  players: Array<{ id: string; actions: string[] }>,
  options?: EduHelperOptions
): Array<{ playerId: string; action: string; expectedUtility: number } & WithProvenance> {
  if (isEducationMode(options?.mode)) {
    return [];
  }
  const alternatives: Array<{ playerId: string; action: string; expectedUtility: number } & WithProvenance> = [];
  for (const player of players) {
    for (const action of player.actions) {
      alternatives.push({
        playerId: player.id,
        action,
        expectedUtility: 0.5,
        provenance: { source: 'heuristic', mode: options?.mode ?? 'analysis' },
      });
    }
  }
  return alternatives;
}

export function generateInformationNodes(
  _scenario: string,
  options?: EduHelperOptions
): Array<{ id: string; label: string; value: number } & WithProvenance> {
  if (isEducationMode(options?.mode)) {
    return [];
  }
  return [
    { id: 'info-1', label: 'Market conditions', value: 0.5, provenance: { source: 'heuristic', mode: options?.mode ?? 'analysis' } },
    { id: 'info-2', label: 'Regulatory environment', value: 0.3, provenance: { source: 'heuristic', mode: options?.mode ?? 'analysis' } },
  ];
}

export function generateCurrentBeliefs(
  _scenario: string,
  options?: EduHelperOptions
): { beliefs: Record<string, number>; provenance?: { source: string; mode: AnalysisMode } } {
  if (isEducationMode(options?.mode)) {
    return { beliefs: {} };
  }
  return {
    beliefs: { 'default': 0.5 },
    provenance: { source: 'heuristic', mode: options?.mode ?? 'analysis' },
  };
}

export function generateOutcomeScenarios(
  _scenario: string,
  players: Array<{ id: string; actions: string[] }>,
  options?: EduHelperOptions
): Array<{ id: string; label: string; probability: number } & WithProvenance> {
  if (isEducationMode(options?.mode)) {
    return [];
  }
  const scenarios: Array<{ id: string; label: string; probability: number } & WithProvenance> = [];
  const count = Math.min(players.length, 3);
  for (let i = 0; i < count; i++) {
    scenarios.push({
      id: `outcome-${i}`,
      label: `Scenario ${i + 1}`,
      probability: 1 / count,
      provenance: { source: 'heuristic', mode: options?.mode ?? 'analysis' },
    });
  }
  return scenarios;
}

export function generateDecayModels(
  options?: EduHelperOptions
): Record<string, { halfLifeDays: number; decayRate: number } & WithProvenance> {
  if (isEducationMode(options?.mode)) {
    return {};
  }
  return {
    short: { halfLifeDays: 7, decayRate: 0.1, provenance: { source: 'heuristic', mode: options?.mode ?? 'analysis' } },
    medium: { halfLifeDays: 30, decayRate: 0.023, provenance: { source: 'heuristic', mode: options?.mode ?? 'analysis' } },
    long: { halfLifeDays: 90, decayRate: 0.008, provenance: { source: 'heuristic', mode: options?.mode ?? 'analysis' } },
  };
}

export function generateExternalFactors(
  _scenario: string,
  options?: EduHelperOptions
): Array<{ id: string; label: string; impact: number } & WithProvenance> {
  if (isEducationMode(options?.mode)) {
    return [];
  }
  return [
    { id: 'ext-1', label: 'Economic conditions', impact: 0.3, provenance: { source: 'heuristic', mode: options?.mode ?? 'analysis' } },
    { id: 'ext-2', label: 'Regulatory changes', impact: 0.2, provenance: { source: 'heuristic', mode: options?.mode ?? 'analysis' } },
    { id: 'ext-3', label: 'Technological disruption', impact: 0.15, provenance: { source: 'heuristic', mode: options?.mode ?? 'analysis' } },
  ];
}
