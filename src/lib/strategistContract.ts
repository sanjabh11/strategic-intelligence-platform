// Strategist Contract
// Normalizes strategist API responses into a consistent type

export interface StrategistAnalysis {
  briefId?: string;
  scenarioSummary?: string;
  keyPlayers?: Array<{ name: string; role: string; priorities: string[] }>;
  strategicOptions?: Array<{
    name: string;
    rationale: string;
    risks: string[];
    expectedOutcome: string;
  }>;
  recommendations?: string[];
  assumptions?: string[];
  confidenceLevel?: 'low' | 'medium' | 'high';
  generatedAt?: string;
}

interface StrategistApiResponse {
  strategist?: StrategistAnalysis;
  brief?: StrategistAnalysis;
  analysis?: StrategistAnalysis;
  error?: string;
}

export function normalizeStrategistResponse(json: unknown): {
  strategist: StrategistAnalysis | null;
} {
  if (!json || typeof json !== 'object') {
    return { strategist: null };
  }

  const response = json as StrategistApiResponse;

  if (response.error) {
    return { strategist: null };
  }

  const strategist =
    response.strategist ?? response.brief ?? response.analysis ?? null;

  if (!strategist || typeof strategist !== 'object') {
    return { strategist: null };
  }

  return { strategist };
}
