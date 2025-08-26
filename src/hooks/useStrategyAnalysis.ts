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
});

const AnalyzeResponseSchema = z.object({
  ok: z.boolean(),
  request_id: z.string().optional(),
  analysis_run_id: z.string().optional(),
  analysis: AnalysisResultSchema.optional(),
  mode: z.string().optional(),
  message: z.string().optional(),
  error: z.string().optional()
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
}

export function useStrategyAnalysis(): UseStrategyAnalysisReturn {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [analysisRunId, setAnalysisRunId] = useState<string | null>(null);
  
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
      // Local fallback: education_quick or forced local mode
      if (isLocalMode || request.mode === 'education_quick') {
        const local = await analyzeLocally(request);
        const parsedLocal = AnalysisResultSchema.safeParse(local);
        if (!parsedLocal.success) {
          throw new Error(`Invalid local analysis result: ${parsedLocal.error.message}`);
        }
        setAnalysis(parsedLocal.data as AnalysisResult);
        setAnalysisRunId('local');
        setStatus('completed');
        setLoading(false);
        return;
      }
      
      const response = await fetch(ENDPOINTS.ANALYZE, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(request)
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
        throw new Error(result.message || result.error || 'Analysis submission failed');
      }

      if (result.request_id) setRequestId(result.request_id);
      if (result.analysis_run_id) setAnalysisRunId(result.analysis_run_id);

      if (result.mode === 'fallback') {
        if (result.analysis) {
          setAnalysis(result.analysis as AnalysisResult);
        }
        setStatus('completed');
        setLoading(false);
      } else if (result.request_id) {
        setStatus('processing');
        startStatusPolling(result.request_id);
      } else if (result.analysis) {
        // Fallback: if analysis provided but no request id
        setAnalysis(result.analysis as AnalysisResult);
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
    canRunAnalysis
  };
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
