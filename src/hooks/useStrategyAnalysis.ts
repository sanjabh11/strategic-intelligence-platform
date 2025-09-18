// Strategic analysis custom hook
import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { ENDPOINTS, getAuthHeaders, isLocalMode } from '../lib/supabase';
import { analyzeLocally } from '../lib/localEngine';
import type {
  AnalysisRequest,
  AnalysisResult,
  AnalysisStatus
} from '../types/strategic-analysis';

// Zod schemas for safe parsing of backend responses
const PlayerSchema = z.union([
  z.string(), // Allow simple string players
  z.object({
    id: z.string(),
    name: z.string().optional(),
    actions: z.array(z.string())
  })
]);

const EquilibriumProfileValueSchema = z.union([
  z.number(),
  z.object({
    value: z.number(),
    confidence: z.number(),
    sources: z.array(z.object({
      id: z.string(),
      retrieval_id: z.string(),
      url: z.string(),
      passage_excerpt: z.string(),
      anchor_score: z.number()
    }))
  })
]);

const EquilibriumSchema = z.object({
  profile: z.record(z.record(EquilibriumProfileValueSchema)),
  stability: z.number(),
  method: z.string(),
  convergenceIteration: z.number().optional(),
  confidence: z
    .object({ lower: z.number(), upper: z.number() })
    .optional()
});

const QuantumSchema = z
  .object({
    collapsed: z
      .array(
        z.object({ action: z.string(), probability: z.number().min(0).max(1) })
      )
      .optional(),
    influence: z.array(z.array(z.number())).optional()
  })
  .optional();

const RetrievalSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  url: z.string().optional(),
  snippet: z.string().optional()
});

const ProcessingStatsSchema = z
  .object({
    processing_time_ms: z.number().optional(),
    stability_score: z.number().optional()
  })
  .optional();

const ProvenanceSchema = z
  .object({
    evidence_backed: z.boolean().optional(),
    retrieval_count: z.number().optional(),
    model: z.string().optional(),
    warning: z.string().optional()
  })
  .optional();

const ForecastPointSchema = z.object({
  t: z.union([z.number(), z.string()]),
  probability: z.number()
});

const AnalysisResultSchema = z.object({
  scenario_text: z.string().optional(),
  players: z.array(PlayerSchema).optional(),
  equilibrium: EquilibriumSchema.optional(),
  quantum: QuantumSchema,
  pattern_matches: z
    .array(z.object({ id: z.string(), score: z.number() }))
    .optional(),
  retrievals: z.array(RetrievalSchema).optional(),
  retrieval_count: z.number().optional(),
  processing_stats: ProcessingStatsSchema,
  provenance: ProvenanceSchema,
  forecast: z.array(ForecastPointSchema).optional()
}).and(z.object({
  voi: z.object({
    ev_prior: z.number(),
    evpi: z.number(),
    evppi: z.record(z.number())
  }).optional()
}))

const AnalyzeResponseSchema = z.object({
  ok: z.boolean(),
  request_id: z.string().optional(),
  analysis_run_id: z.string().optional(),
  analysis: AnalysisResultSchema.optional(),
  mode: z.string().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
  reason: z.string().optional(),
  action: z.string().optional()
});

const StatusResponseSchema = z.object({
  ok: z.boolean(),
  status: z.enum(['processing', 'completed']),
  analysis: AnalysisResultSchema.optional(),
  message: z.string().optional()
});

export interface UseStrategyAnalysisReturn {
  // State
  analysis: AnalysisResult | null;
  loading: boolean;
  error: string | null;
  status: AnalysisStatus;
  requestId: string | null;
  analysisRunId: string | null;

  // Actions
  runAnalysis: (request: AnalysisRequest) => Promise<void>;
  clearResults: () => void;

  // Utilities
  isProcessing: boolean;
  canRunAnalysis: boolean;
  setAudience: (audience: 'student' | 'learner' | 'researcher' | 'teacher') => void;
}

// Helper: build a schema-compliant minimal AnalysisResult
function buildMinimalAnalysis(scenario: string): AnalysisResult {
  const playersObj = [{ id: 'P1', name: 'Player 1', actions: ['wait'] }]
  const profile: Record<string, Record<string, { value: number; confidence: number; sources: any[] }>> = {
    P1: { wait: { value: 0, confidence: 0, sources: [] } }
  }
  return {
    scenario_text: scenario,
    players: playersObj,
    equilibrium: { profile, stability: 0, method: 'heuristic' },
    quantum: undefined,
    processing_stats: { processing_time_ms: 0, stability_score: 0 },
    provenance: { evidence_backed: false, retrieval_count: 0, model: 'n/a' },
    retrievals: [],
    pattern_matches: [],
    forecast: []
  }
}

export function useStrategyAnalysis(): UseStrategyAnalysisReturn {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [analysisRunId, setAnalysisRunId] = useState<string | null>(null);
  const [audience, setAudience] = useState<'student' | 'learner' | 'researcher' | 'teacher'>('learner');

  const [statusCheckInterval, setStatusCheckInterval] = useState<NodeJS.Timeout | null>(null);
  const [pollAttempts, setPollAttempts] = useState(0);
  
  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [statusCheckInterval]);
  
  // Clear results
  const clearResults = useCallback(() => {
    setAnalysis(null);
    setError(null);
    setStatus('idle');
    setRequestId(null);
    setAnalysisRunId(null);
    setPollAttempts(0);
    
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
      setStatusCheckInterval(null);
    }
  }, [statusCheckInterval]);
  
  // Helper function to normalize player data
  const normalizeAnalysisData = useCallback((data: any): any => {
    if (!data) return data;
    
    // Normalize players array
    if (Array.isArray(data.players)) {
      data.players = data.players.map((player: any, index: number) => {
        if (typeof player === 'string') {
          return {
            id: player.replace(/\s+/g, '_') || `P${index + 1}`,
            name: player,
            actions: ['cooperate', 'defect']
          };
        }
        return player;
      });
    }
    
    // Ensure scenario_text is present
    if (!data.scenario_text && data.title) {
      data.scenario_text = data.title;
    }
    
    // Normalize equilibrium profile if needed
    if (data.equilibrium && data.equilibrium.profile) {
      const profile = data.equilibrium.profile;
      Object.keys(profile).forEach(playerId => {
        Object.keys(profile[playerId]).forEach(action => {
          const value = profile[playerId][action];
          if (typeof value === 'number') {
            profile[playerId][action] = {
              value: value,
              confidence: 0.5,
              sources: []
            };
          }
        });
      });
    }
    
    return data;
  }, []);

  // Check analysis status
  const checkAnalysisStatus = useCallback(async (reqId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${ENDPOINTS.STATUS}?request_id=${reqId}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      const raw = await response.text();
      const json = (() => {
        try { return JSON.parse(raw); } catch { return null; }
      })();

      if (!response.ok) {
        const msg = json && typeof json === 'object' && 'message' in (json as any)
          ? (json as any).message
          : raw || response.statusText;
        throw new Error(`Status HTTP ${response.status}: ${msg}`);
      }

      const parsed = StatusResponseSchema.safeParse(json);
      if (!parsed.success) {
        throw new Error(`Invalid status response: ${parsed.error.message}`);
      }
      const result = parsed.data;

      if (result.status === 'completed' && result.analysis) {
        const normalizedAnalysis = normalizeAnalysisData(result.analysis);
        // Enrich with advanced strategic engines once the analysis run completes
        try {
          const enhanced = await enhanceAnalysisWithStrategicEngines(
            reqId || analysisRunId || crypto.randomUUID(),
            normalizedAnalysis.scenario_text || '',
            (normalizedAnalysis as any).players
          );
          setAnalysis({
            ...(normalizedAnalysis as unknown as AnalysisResult),
            ...enhanced
          });
        } catch (e) {
          // Fall back to base analysis if enhancement calls fail
          setAnalysis(normalizedAnalysis as unknown as AnalysisResult);
        }
        setStatus('completed');
        setLoading(false);
        return true;
      }
      if (result.status === 'processing') {
        setStatus('processing');
        return false;
      }
      throw new Error(`Unexpected status: ${result.status}`);
      
    } catch (err) {
      console.error('Status check error:', err);
      setError(err instanceof Error ? err.message : 'Status check failed');
      setStatus('failed');
      setLoading(false);
      return true; // Stop polling on error
    }
  }, []);
  
  // Start status polling
  const startStatusPolling = useCallback((reqId: string) => {
    setPollAttempts(0);
    
    const poll = async () => {
      const shouldStop = await checkAnalysisStatus(reqId);
      
      if (shouldStop) {
        if (statusCheckInterval) {
          clearInterval(statusCheckInterval);
          setStatusCheckInterval(null);
        }
        return;
      }
      
      setPollAttempts(prev => prev + 1);
    };
    
    // Initial check
    poll();
    
    // Set up polling interval
    const interval = setInterval(poll, 2500); // Poll every 2.5 seconds
    setStatusCheckInterval(interval);
    
    // Timeout after 2 minutes
    setTimeout(() => {
      if (status === 'processing') {
        clearInterval(interval);
        setStatusCheckInterval(null);
        setError('Analysis timed out - computation is taking longer than expected');
        setStatus('failed');
        setLoading(false);
      }
    }, 120000); // 2 minutes timeout
    
  }, [checkAnalysisStatus, status, statusCheckInterval]);
  
  // Run analysis
  const runAnalysis = useCallback(async (request: AnalysisRequest) => {
    // Reset state
    clearResults();
    setLoading(true);
    setStatus('queued');

    try {
      console.log('Submitting analysis request:', request);

      // Check if local mode is enabled; block in production builds
      if (isLocalMode) {
        // Vite exposes PROD flag at build time
        const isProdBuild = typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.PROD;
        if (isProdBuild) {
          throw new Error('Local demo engine is disabled in production builds. Please configure Supabase endpoints.');
        }
        console.log('Using local analysis engine');
        const localResult = await analyzeLocally(request);
        const enhancedAnalysis = await enhanceAnalysisWithStrategicEngines(
          crypto.randomUUID(), request.scenario_text, localResult.players
        );
        setAnalysis({
          ...localResult,
          ...enhancedAnalysis
        });
        setStatus('completed');
        setLoading(false);
        return;
      }

      // Use API for production flow
      const response = await fetch(ENDPOINTS.ANALYZE, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...request, audience })
      });
      const raw = await response.text();
      const json = (() => {
        try { return JSON.parse(raw); } catch { return null; }
      })();

      if (!response.ok) {
        const msg = json && typeof json === 'object' && 'message' in (json as any)
          ? (json as any).message
          : raw || response.statusText;
        throw new Error(`Analyze HTTP ${response.status}: ${msg}`);
      }

      const parsed = AnalyzeResponseSchema.safeParse(json);
      if (!parsed.success) {
        throw new Error(`Invalid analyze response: ${parsed.error.message}`);
      }
      const result = parsed.data;

      if (!result.ok) {
        // Handle RAG failure for high-risk scenarios
        if (result.reason === 'no_external_sources' || result.reason === 'rag_system_error') {
          setError(result.message || 'Unable to retrieve external evidence for this scenario. Analysis has been queued for human review.');
          setStatus('failed');
          setLoading(false);
          return;
        }
        throw new Error(result.message || result.error || 'Analysis submission failed');
      }

      if (result.request_id) setRequestId(result.request_id);
      if (result.analysis_run_id) setAnalysisRunId(result.analysis_run_id);

      if (result.mode === 'fallback') {
        const base = result.analysis ?? (result.ok ? buildMinimalAnalysis(request.scenario_text) : null)
        if (base) {
          const enhancedAnalysis = await enhanceAnalysisWithStrategicEngines(
            result.analysis_run_id || result.request_id || '', request.scenario_text, (base as any).players
          );
          setAnalysis({
            ...(base as AnalysisResult),
            ...enhancedAnalysis
          });
        }
        setStatus('completed');
        setLoading(false);
      } else if (result.request_id) {
        setStatus('processing');
        startStatusPolling(result.request_id);
      } else if (result.analysis) {
        // Fallback: if analysis provided but no request id
        const normalizedAnalysis = normalizeAnalysisData(result.analysis);
        const enhancedAnalysis = await enhanceAnalysisWithStrategicEngines(
          result.analysis_run_id || crypto.randomUUID(), request.scenario_text, normalizedAnalysis.players
        );
        setAnalysis({
          ...normalizedAnalysis,
          ...enhancedAnalysis
        });
        setStatus('completed');
        setLoading(false);
      } else {
        // Last resort client-side minimal synthesis to prevent UX breakage
        const base = buildMinimalAnalysis(request.scenario_text)
        const enhancedAnalysis = await enhanceAnalysisWithStrategicEngines(
          result.analysis_run_id || crypto.randomUUID(), request.scenario_text, (base as any).players
        );
        setAnalysis({
          ...(base as AnalysisResult),
          ...enhancedAnalysis
        });
        setStatus('completed');
        setLoading(false);
      }
      
    } catch (err) {
      console.error('Analysis submission error:', err);
      
      // Enhanced error message extraction
      let errorMessage = 'Analysis service unavailable';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        errorMessage = (err as any).message || (err as any).error || JSON.stringify(err);
      }
      
      const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED');
      if (isNetworkError) {
        try {
          // Fallback to local engine to keep UX unblocked
          const localResult = await analyzeLocally(request);
          const enhancedAnalysis = await enhanceAnalysisWithStrategicEngines(
            crypto.randomUUID(), request.scenario_text, localResult.players
          );
          setAnalysis({
            ...localResult,
            ...enhancedAnalysis
          });
          setStatus('completed');
          setLoading(false);
          return;
        } catch (localErr) {
          console.warn('Local analysis fallback failed:', localErr);
          errorMessage = 'Cannot connect to analysis service. Please ensure Supabase is running: `supabase start`';
        }
      }
      
      setError(errorMessage);
      setStatus('failed');
      setLoading(false);
    }
  }, [clearResults, startStatusPolling]);
  
  // Computed properties
  const isProcessing = loading && (status === 'queued' || status === 'processing');
  const canRunAnalysis = !loading && status !== 'processing';
  
  return {
    // State
    analysis,
    loading,
    error,
    status,
    requestId,
    analysisRunId,

    // Actions
    runAnalysis,
    clearResults,

    // Utilities
    isProcessing,
    canRunAnalysis,
    setAudience
  };
}

async function enhanceAnalysisWithStrategicEngines(
  analysisRunId: string,
  scenario: string,
  players: any[] | undefined
): Promise<any> {

  const enhancements = {
    recursiveEquilibrium: null,
    symmetryAnalysis: null,
    crossDomainInsights: null,
    quantumAnalysis: null,
    informationValue: null,
    temporalOptimization: null,
    outcomeForecasting: null,
    strategySuccess: null
  };

  try {
    // Call Recursive Equilibrium Engine
    const recursiveResponse = await fetch(ENDPOINTS.RECURSIVE_EQ, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        runId: analysisRunId,
        scenario: {
          players: players?.map(p => ({
            id: p.id,
            name: p.name,
            actions: p.actions
          })) || []
        },
        analysisConfig: {
          beliefDepth: 3,
          adaptationRate: 0.2,
          iterations: 500,
          convergenceThreshold: 1e-6,
          quantumEnabled: true
        }
      })
    });

    if (recursiveResponse.ok) {
      const recursiveData = await recursiveResponse.json();
      if (recursiveData.ok && recursiveData.response) {
        enhancements.recursiveEquilibrium = recursiveData.response;
      }
    }

    // Call Enhanced Symmetry Mining Engine
    const symmetryResponse = await fetch(ENDPOINTS.SYMMETRY_MINING, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        runId: analysisRunId,
        currentScenario: {
          title: "Strategic Analysis Scenario",
          description: scenario,
          domain: extractDomainFromScenario(scenario),
          stakeholders: extractStakeholdersFromScenario(scenario),
          strategicElements: {
            players: players?.length || 0,
            actions: players?.flatMap(p => p.actions) || [],
            information: 'complete',
            payoffStructure: 'competitive'
          }
        },
        analysisConfig: {
          abstractionLevel: 7,
          maxAnalogies: 5,
          similarityThreshold: 0.6,
          domainsToSearch: ['military', 'business', 'politics', 'evolution', 'sports'],
          returnStructuredResults: true
        }
      })
    });

    if (symmetryResponse.ok) {
      const symmetryData = await symmetryResponse.json();
      if (symmetryData.ok && symmetryData.response) {
        enhancements.symmetryAnalysis = symmetryData.response;
        enhancements.crossDomainInsights = symmetryData.response.strategicRecommendations;
      }
    }

    // Call Quantum Strategy Service
    const quantumResponse = await fetch(ENDPOINTS.QUANTUM_STRATEGY, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        runId: analysisRunId,
        scenario: {
          players: players?.map(p => ({
            id: p.id,
            name: p.name,
            actions: p.actions
          })) || [],
          interactions: generatePlayerInteractions(players || [])
        },
        config: {
          quantumCoherence: 0.8,
          environmentalNoise: 0.3,
          observationLevel: 0.5,
          timeHorizon: 24
        }
      })
    });

    if (quantumResponse.ok) {
      const quantumData = await quantumResponse.json();
      if (quantumData.ok && quantumData.response) {
        enhancements.quantumAnalysis = quantumData.response;
      }
    }

    // Call Information Value Assessment
    const infoValueResponse = await fetch(ENDPOINTS.INFO_VALUE, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        runId: analysisRunId,
        scenario: {
          title: scenario,
          timeHorizon: 48,
          urgencyLevel: 0.6,
          stakeholders: extractStakeholdersFromScenario(scenario)
        },
        decisionAlternatives: generateDecisionAlternatives(players || []),
        informationNodes: generateInformationNodes(scenario),
        currentBeliefs: generateCurrentBeliefs(scenario),
        analysisConfig: {
          riskTolerance: 0.5,
          discountRate: 0.05,
          maxInformationBudget: 1000,
          prioritizeSpeed: false
        }
      })
    });

    if (infoValueResponse.ok) {
      const infoValueData = await infoValueResponse.json();
      if (infoValueData.ok && infoValueData.response) {
        enhancements.informationValue = infoValueData.response;
        // Derive a compact VOI summary when possible
        try {
          const summary = infoValueData.response.summary || infoValueData.response.metrics || {};
          const ev_prior = typeof summary.ev_prior === 'number' ? summary.ev_prior : (summary.expectedValuePrior ?? 0);
          const evpi = typeof summary.evpi === 'number' ? summary.evpi : (summary.expectedValueOfPerfectInformation ?? 0);
          const evppi = summary.evppi || summary.signal_evppi || {};
          (enhancements as any).voi = { ev_prior: Number(ev_prior) || 0, evpi: Number(evpi) || 0, evppi };
        } catch {}
      }
    }

    // Call Outcome Forecasting
    const forecastResponse = await fetch(ENDPOINTS.OUTCOME_FORECAST, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        runId: analysisRunId,
        scenario: {
          title: scenario,
          timeHorizon: 168, // 1 week
          granularity: 4 // 4-hour intervals
        },
        outcomes: generateOutcomeScenarios(scenario, players || []),
        decayModels: generateDecayModels(),
        externalFactors: generateExternalFactors(scenario),
        uncertaintyConfig: {
          epistemicUncertainty: 0.2,
          aleatoricUncertainty: 0.15,
          confidenceLevel: 0.95
        }
      })
    });

    if (forecastResponse.ok) {
      const forecastData = await forecastResponse.json();
      if (forecastData.ok && forecastData.response) {
        enhancements.outcomeForecasting = forecastData.response;
      }
    }

  } catch (error) {
    console.warn('Strategic engine enhancements failed:', error);
  }

  return enhancements;
}

// Extract domain from scenario text
function extractDomainFromScenario(scenario: string): string {
  const lowerText = scenario.toLowerCase();

  const domainMappings = {
    'business': ['company', 'market', 'corporate', 'industry', 'competitor'],
    'political': ['government', 'policy', 'political', 'diplomatic'],
    'military': ['military', 'defense', 'strategic power', 'security'],
    'economics': ['economic', 'trade', 'currency', 'financial'],
    'technology': ['technology', 'ai', 'innovation', 'digital']
  };

  for (const [domain, keywords] of Object.entries(domainMappings)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return domain;
    }
  }

  return 'universal'; // Default
}

// Extract stakeholders from scenario
function extractStakeholdersFromScenario(scenario: string): string[] {
  // Simple stakeholder extraction - can be enhanced
  return ['stakeholder_1', 'stakeholder_2'];
}

// Generate player interactions for quantum analysis
function generatePlayerInteractions(players: any[]): Array<{ player1: string; player2: string; strength: number }> {
  const interactions = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      interactions.push({
        player1: players[i].id,
        player2: players[j].id,
        strength: 0.5 + Math.random() * 0.5 // Random interaction strength
      });
    }
  }
  return interactions;
}

// Generate decision alternatives for information value assessment
function generateDecisionAlternatives(players: any[]): any[] {
  return players.flatMap(player => 
    player.actions.map((action: string, index: number) => ({
      id: `${player.id}_${action}`,
      name: `${player.name} - ${action}`,
      expectedPayoff: 0.3 + Math.random() * 0.4,
      payoffVariance: 0.1 + Math.random() * 0.2,
      informationSensitivity: {
        market_conditions: Math.random() * 0.5,
        competitor_actions: Math.random() * 0.5,
        regulatory_changes: Math.random() * 0.3
      }
    }))
  );
}

// Generate information nodes for EVPI calculation
function generateInformationNodes(scenario: string): any[] {
  const baseNodes = [
    {
      id: 'market_conditions',
      name: 'Market Conditions',
      currentUncertainty: 0.4,
      informationType: 'market' as const,
      acquisitionCost: 500,
      acquisitionTime: 2,
      reliability: 0.8,
      dependencies: []
    },
    {
      id: 'competitor_actions',
      name: 'Competitor Actions',
      currentUncertainty: 0.6,
      informationType: 'competitor' as const,
      acquisitionCost: 800,
      acquisitionTime: 4,
      reliability: 0.7,
      dependencies: ['market_conditions']
    },
    {
      id: 'regulatory_changes',
      name: 'Regulatory Changes',
      currentUncertainty: 0.3,
      informationType: 'regulatory' as const,
      acquisitionCost: 300,
      acquisitionTime: 1,
      reliability: 0.9,
      dependencies: []
    }
  ];
  
  return baseNodes;
}

// Generate current beliefs for Bayesian updating
function generateCurrentBeliefs(scenario: string): Record<string, number> {
  return {
    market_conditions: 0.4,
    competitor_actions: 0.6,
    regulatory_changes: 0.3,
    economic_stability: 0.5,
    technological_disruption: 0.35
  };
}

// Generate outcome scenarios for forecasting
function generateOutcomeScenarios(scenario: string, players: any[]): any[] {
  const scenarios = [
    {
      id: 'success_scenario',
      name: 'Strategic Success',
      description: 'Primary strategic objectives achieved',
      baselineProbability: 0.6,
      impactMagnitude: 0.8,
      dependencies: []
    },
    {
      id: 'partial_success',
      name: 'Partial Success',
      description: 'Some objectives achieved with complications',
      baselineProbability: 0.3,
      impactMagnitude: 0.5,
      dependencies: [{
        scenarioId: 'success_scenario',
        correlationType: 'negative' as const,
        strength: 0.7
      }]
    },
    {
      id: 'failure_scenario',
      name: 'Strategic Failure',
      description: 'Major strategic objectives not achieved',
      baselineProbability: 0.1,
      impactMagnitude: 0.9,
      dependencies: [{
        scenarioId: 'success_scenario',
        correlationType: 'negative' as const,
        strength: 0.9
      }]
    }
  ];
  
  return scenarios;
}

// Generate decay models for forecasting
function generateDecayModels(): Record<string, any> {
  return {
    success_scenario: {
      type: 'exponential',
      parameters: { decayRate: 0.05 },
      halfLife: Math.log(2) / 0.05
    },
    partial_success: {
      type: 'power_law',
      parameters: { exponent: 1.2 },
      halfLife: 10
    },
    failure_scenario: {
      type: 'logistic',
      parameters: { growthRate: 0.1, carryingCapacity: 0.8 },
      halfLife: 7
    }
  };
}

// Generate external factors for forecasting
function generateExternalFactors(scenario: string): any[] {
  return [
    {
      name: 'Economic Conditions',
      influence: 0.3,
      timeProfile: 'cyclical' as const,
      cyclePeriod: 168 // Weekly cycle
    },
    {
      name: 'Competitive Pressure',
      influence: -0.2,
      timeProfile: 'increasing' as const
    },
    {
      name: 'Regulatory Support',
      influence: 0.15,
      timeProfile: 'constant' as const
    },
    {
      name: 'Market Volatility',
      influence: -0.25,
      timeProfile: 'decreasing' as const
    }
  ];
}

// Utility function to create example scenarios
export function getExampleScenarios() {
  return [
    {
      title: "Tech Giants AI Safety Coordination",
      scenario: "Three major technology companies (Apple, Google, Microsoft) must decide on AI safety standards. Each can choose to 'lead with strict standards', 'follow industry consensus', or 'maintain competitive advantage'. Their decisions affect regulatory oversight, public trust, innovation pace, and market positioning. The outcome influences global AI governance and technological development trajectories."
    },
    {
      title: "Semiconductor Supply Chain Strategy", 
      scenario: "US, EU, and China are deciding on semiconductor supply chain policies amid geopolitical tensions. Each region can choose 'aggressive domestic production', 'selective partnerships', or 'maintain global integration'. The decisions affect technological sovereignty, economic efficiency, innovation networks, and international trade relationships."
    },
    {
      title: "Climate Policy Coordination",
      scenario: "Major economies must coordinate carbon emission reduction strategies. Each can choose to 'lead with aggressive cuts', 'follow others commitments', or 'maintain status quo'. Their decisions affect global climate goals, economic competitiveness, industrial transformation, and international cooperation frameworks."
    },
    {
      title: "Cryptocurrency Regulation Framework",
      scenario: "Major financial jurisdictions are establishing cryptocurrency regulations. Options include 'comprehensive regulation', 'light-touch approach', or 'wait and observe'. Each choice affects financial innovation, market stability, regulatory arbitrage, consumer protection, and international coordination on digital assets."
    },
    {
      title: "Trade War De-escalation",
      scenario: "Two major trading partners face escalating tariff tensions. Each side can 'impose retaliatory measures', 'seek negotiated settlement', or 'unilaterally reduce barriers'. The outcomes affect bilateral trade volumes, economic growth, political relationships, and global trade architecture."
    },
    {
      title: "Corporate Crisis Management",
      scenario: "Two competing companies in the same industry face a shared reputational crisis. Each can choose to 'collaborate on industry response', 'compete for differentiation', or 'remain silent'. Their strategies affect market recovery, regulatory intervention, consumer trust, and long-term competitive dynamics."
    }
  ];
}

export default useStrategyAnalysis;
