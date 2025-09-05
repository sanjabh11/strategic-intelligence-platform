// Supabase client configuration using Vite environment variables
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
export const isLocalMode = String(import.meta.env.VITE_LOCAL_ANALYZE ?? '').toLowerCase() === 'true'

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
  ANALYZE_STREAM: `${API_BASE}/analyze-stream`,
  SYMMETRY_MINING: `${API_BASE}/symmetry-mining`,
  RECURSIVE_EQ: `${API_BASE}/recursive-equilibrium`,
  SHARE_STRATEGY: `${API_BASE}/share-strategy`,
  COLLECTIVE_STATS: `${API_BASE}/collective-stats`,
  FIRECRAWL_RESEARCH: `${API_BASE}/firecrawl-research`,
  EVIDENCE_RETRIEVAL: `${API_BASE}/evidence-retrieval`,
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
