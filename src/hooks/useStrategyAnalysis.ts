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
const PlayerSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  actions: z.array(z.string())
});

const EquilibriumSchema = z.object({
  profile: z.record(z.record(z.number())),
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
  scenario_text: z.string(),
  players: z.array(PlayerSchema),
  equilibrium: EquilibriumSchema,
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
        setAnalysis(result.analysis as AnalysisResult);
        setStatus('completed');
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

      // Check if local mode is enabled
      if (isLocalMode) {
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
        if (result.analysis) {
          const enhancedAnalysis = await enhanceAnalysisWithStrategicEngines(
            result.analysis_run_id || result.request_id || '', request.scenario_text, result.analysis.players
          );
          setAnalysis({
            ...(result.analysis as AnalysisResult),
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
        const enhancedAnalysis = await enhanceAnalysisWithStrategicEngines(
          result.analysis_run_id || crypto.randomUUID(), request.scenario_text, result.analysis.players
        );
        setAnalysis({
          ...(result.analysis as AnalysisResult),
          ...enhancedAnalysis
        });
        setStatus('completed');
        setLoading(false);
      } else {
        throw new Error('Analyze response missing request_id and analysis');
      }
      
    } catch (err) {
      console.error('Analysis submission error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
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
    crossDomainInsights: null
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
          beliefDepth: 3,  // PRD requirement: >2
          adaptationRate: 0.2,
          iterations: 500, // PRD requirement: >100, <2000
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

    // Call Symmetry Mining Engine
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
          abstractionLevel: 7,  // PRD range 1-10
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

  } catch (error) {
    console.warn('Strategic engine enhancements failed:', error);
    // Continue with original analysis if enhancement services fail
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
