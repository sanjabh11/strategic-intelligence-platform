// Supabase client configuration using Vite environment variables
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
export const isLocalMode = String(import.meta.env.VITE_LOCAL_ANALYZE ?? '').toLowerCase() === 'true'
export const isLocalPreviewOrigin = typeof window !== 'undefined'
  && ['127.0.0.1', 'localhost'].includes(window.location.hostname)

if ((!supabaseUrl || !supabaseAnonKey) && !isLocalMode) {
  throw new Error(
    'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file. See README for details.'
  )
}

export const supabase = (!isLocalMode && supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as any)

// API endpoints for edge functions
export const API_BASE = supabaseUrl ? `${supabaseUrl}/functions/v1` : ''

export const ENDPOINTS = {
  ANALYZE: `${API_BASE}/analyze-engine`,
  STATUS: `${API_BASE}/get-analysis-status`,
  SYSTEM_STATUS: `${API_BASE}/system-status`,
  HEALTH: `${API_BASE}/health`,
  MARKET_STREAM: `${API_BASE}/market-stream`,
  ANALYZE_STREAM: `${API_BASE}/analyze-stream`,
  PERSONAL_LIFE_COACH: `${API_BASE}/personal-life-coach`,
  QUESTION_INTAKE: `${API_BASE}/question-intake`,
  MULTI_AGENT_FORECAST: `${API_BASE}/multi-agent-forecast`,
  FORECAST_CREATE: `${API_BASE}/forecast-create`,
  BRIER_WEIGHTED_CONSENSUS: `${API_BASE}/brier-weighted-consensus`,
  SYMMETRY_MINING: `${API_BASE}/symmetry-mining`,
  RECURSIVE_EQ: `${API_BASE}/recursive-equilibrium`,
  QUANTUM_STRATEGY: `${API_BASE}/quantum-strategy-service`,
  INFO_VALUE: `${API_BASE}/information-value-assessment`,
  STRATEGY_SUCCESS: `${API_BASE}/strategy-success-analysis`,
  SCALE_INVARIANT: `${API_BASE}/scale-invariant-templates`,
  TEMPORAL_OPTIMIZATION: `${API_BASE}/temporal-strategy-optimization`,
  OUTCOME_FORECAST: `${API_BASE}/outcome-forecasting`,
  DYNAMIC_RECALIBRATION: `${API_BASE}/dynamic-recalibration`,
  CROSS_DOMAIN_TRANSFER: `${API_BASE}/cross-domain-transfer`,
  SHARE_STRATEGY: `${API_BASE}/share-strategy`,
  COLLECTIVE_STATS: `${API_BASE}/collective-stats`,
  FIRECRAWL_RESEARCH: `${API_BASE}/firecrawl-research`,
  EVIDENCE_RETRIEVAL: `${API_BASE}/evidence-retrieval-exa`,
  HYDRATE_ANALYSIS: `${API_BASE}/analysis-hydrator`,
  HUMAN_REVIEW_QUEUE: `${API_BASE}/human-review/review_queue`,
  HUMAN_REVIEW_POST: `${API_BASE}/human-review/analysis`,
  CALIBRATION_REFRESH: `${API_BASE}/calibration-refresh`,
  DRIFT_EVALUATE: `${API_BASE}/drift-evaluate`,
  SHADOW_MODEL_REFRESH: `${API_BASE}/shadow-model-refresh`,
  ONTOLOGY_SYNC: `${API_BASE}/ontology-sync`,
  MARKET_PRIOR: `${API_BASE}/market-prior`,
  LEARNINGS_QUERY: `${API_BASE}/learnings-query`,
}

// Authentication headers for direct API calls
export const getAuthHeaders = () => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (supabaseAnonKey) {
    headers['apikey'] = supabaseAnonKey
    headers['Authorization'] = `Bearer ${supabaseAnonKey}`
  }
  return headers
}

export const getUserAuthHeaders = async () => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (supabaseAnonKey) {
    headers['apikey'] = supabaseAnonKey
  }

  const { data } = supabase
    ? await supabase.auth.getSession()
    : { data: { session: null } }
  const accessToken = data.session?.access_token

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  } else if (supabaseAnonKey) {
    headers['Authorization'] = `Bearer ${supabaseAnonKey}`
  }

  return headers
}
