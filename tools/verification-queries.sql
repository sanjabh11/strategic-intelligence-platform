-- VERIFICATION QUERIES FOR STRATEGIC INTELLIGENCE PLATFORM
-- Run these queries in Supabase SQL Editor to validate system health

-- =====================================================================================
-- 1. PROVENANCE VALIDATION - Check last 20 runs for key provenance fields
-- =====================================================================================

SELECT
  id,
  created_at,
  audience,
  (provenance->>'llm_model') AS llm_model,
  (provenance->>'fallback_used')::boolean AS fallback_used,
  (provenance->>'cache_hit')::boolean AS cache_hit,
  (provenance->>'evidence_backed')::boolean AS evidence_backed,
  jsonb_array_length(provenance->'used_retrieval_ids') AS used_retrieval_count,
  jsonb_array_length(provenance->'solver_invocations') AS solver_count
FROM analysis_runs
ORDER BY created_at DESC
LIMIT 20;

-- =====================================================================================
-- 2. CACHE BEHAVIOR VALIDATION - Check TTL and forceFresh behavior
-- =====================================================================================

-- Check cache hits for forceFresh queries (should be false)
SELECT
  id,
  run_id,
  scenario_text,
  (provenance->>'cache_hit')::boolean AS cache_hit,
  (provenance->>'retrieval_count')::int AS retrieval_count,
  provenance->>'retrieval_sources' AS retrieval_sources,
  created_at
FROM analysis_runs
WHERE provenance->>'cache_hit' = 'false'
ORDER BY created_at DESC
LIMIT 10;

-- Check cache hits for regular queries (should vary)
SELECT
  id,
  run_id,
  scenario_text,
  (provenance->>'cache_hit')::boolean AS cache_hit,
  (provenance->>'retrieval_count')::int AS retrieval_count,
  created_at
FROM analysis_runs
WHERE provenance->>'cache_hit' = 'true'
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================================================
-- 3. SOLVER INTEGRATION VALIDATION - Check canonical game solver calls
-- =====================================================================================

-- Check runs with solver invocations
SELECT
  id,
  scenario_text,
  audience,
  solver_invocations,
  analysis->'simulation_results' AS simulation_results,
  created_at
FROM analysis_runs
WHERE solver_invocations IS NOT NULL
  AND jsonb_array_length(solver_invocations) > 0
ORDER BY created_at DESC
LIMIT 10;

-- Check Prisoner’s Dilemma specific results
SELECT
  id,
  scenario_text,
  solver_invocations,
  analysis->'simulation_results'->'equilibria' AS equilibria,
  created_at
FROM analysis_runs
WHERE scenario_text ILIKE '%prisoner%'
  AND solver_invocations IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- =====================================================================================
-- 4. RETRIEVAL VALIDATION - Check retrieval usage and sources
-- =====================================================================================

-- Check retrieval sources distribution
SELECT
  source,
  COUNT(*) as count,
  AVG(score) as avg_score,
  MAX(created_at) as latest_retrieval
FROM retrieval_cache
GROUP BY source
ORDER BY count DESC;

-- Check used retrieval IDs in recent runs
SELECT
  ar.id,
  ar.scenario_text,
  ar.provenance->'used_retrieval_ids' AS used_ids,
  ar.provenance->'retrieval_sources' AS sources,
  ar.created_at
FROM analysis_runs ar
WHERE jsonb_array_length(ar.provenance->'used_retrieval_ids') > 0
ORDER BY ar.created_at DESC
LIMIT 10;

-- =====================================================================================
-- 5. EVIDENCE-BACKED VALIDATION - Check evidence quality metrics
-- =====================================================================================

-- Evidence-backed rate over time
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_runs,
  COUNT(*) FILTER (WHERE (provenance->>'evidence_backed')::boolean = true) as evidence_backed_runs,
  ROUND(
    COUNT(*) FILTER (WHERE (provenance->>'evidence_backed')::boolean = true)::decimal /
    COUNT(*)::decimal * 100, 2
  ) as evidence_backed_percentage
FROM analysis_runs
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Check runs with low evidence quality
SELECT
  id,
  scenario_text,
  audience,
  (provenance->>'evidence_backed')::boolean AS evidence_backed,
  (provenance->>'retrieval_count')::int AS retrieval_count,
  jsonb_array_length(provenance->'used_retrieval_ids') AS used_retrievals,
  created_at
FROM analysis_runs
WHERE (provenance->>'evidence_backed')::boolean = false
  OR (provenance->>'retrieval_count')::int < 3
ORDER BY created_at DESC
LIMIT 20;

-- =====================================================================================
-- 6. LLM MODEL & PERFORMANCE VALIDATION
-- =====================================================================================

-- LLM model usage distribution
SELECT
  provenance->>'llm_model' AS llm_model,
  COUNT(*) as usage_count,
  AVG((provenance->>'llm_duration_ms')::int) as avg_duration_ms,
  MIN((provenance->>'llm_duration_ms')::int) as min_duration_ms,
  MAX((provenance->>'llm_duration_ms')::int) as max_duration_ms
FROM analysis_runs
WHERE provenance->>'llm_model' IS NOT NULL
GROUP BY provenance->>'llm_model'
ORDER BY usage_count DESC;

-- Fallback usage analysis
SELECT
  (provenance->>'fallback_used')::boolean AS fallback_used,
  COUNT(*) as count,
  AVG((provenance->>'llm_duration_ms')::int) as avg_duration_ms
FROM analysis_runs
WHERE provenance->>'fallback_used' IS NOT NULL
GROUP BY (provenance->>'fallback_used')::boolean;

-- =====================================================================================
-- 7. SCHEMA VALIDATION HEALTH - Check for schema failures
-- =====================================================================================

-- Recent schema failures
SELECT
  request_id,
  validation_errors,
  created_at
FROM schema_failures
WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
ORDER BY created_at DESC
LIMIT 10;

-- Schema failure rate
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_runs,
  COUNT(*) FILTER (WHERE status = 'schema_failed') as schema_failures,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'schema_failed')::decimal /
    COUNT(*)::decimal * 100, 2
  ) as failure_percentage
FROM analysis_runs
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- =====================================================================================
-- 8. AUDIENCE-SPECIFIC VALIDATION - Check audience handling
-- =====================================================================================

-- Audience distribution and validation
SELECT
  audience,
  COUNT(*) as total_runs,
  COUNT(*) FILTER (WHERE (provenance->>'evidence_backed')::boolean = true) as evidence_backed,
  AVG((provenance->>'retrieval_count')::int) as avg_retrievals,
  AVG((provenance->>'llm_duration_ms')::int) as avg_duration_ms
FROM analysis_runs
WHERE audience IS NOT NULL
GROUP BY audience
ORDER BY total_runs DESC;

-- Check for audience-specific field presence
SELECT
  audience,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE analysis ? 'numeric_claims') as has_numeric_claims,
  COUNT(*) FILTER (WHERE analysis ? 'decision_table') as has_decision_table,
  COUNT(*) FILTER (WHERE analysis ? 'simulation_results') as has_simulation_results,
  COUNT(*) FILTER (WHERE analysis ? 'lesson_outline') as has_lesson_outline
FROM analysis_runs
WHERE audience IS NOT NULL
GROUP BY audience
ORDER BY total DESC;

-- =====================================================================================
-- 9. SYSTEM HEALTH DASHBOARD - Overall metrics
-- =====================================================================================

-- Comprehensive health check
SELECT
  'System Health Overview' as metric,
  COUNT(*) as total_runs_last_24h,
  COUNT(*) FILTER (WHERE (provenance->>'cache_hit')::boolean = false) as fresh_runs,
  COUNT(*) FILTER (WHERE solver_invocations IS NOT NULL) as solver_runs,
  COUNT(*) FILTER (WHERE (provenance->>'evidence_backed')::boolean = true) as evidence_backed_runs,
  ROUND(AVG((provenance->>'llm_duration_ms')::float), 2) as avg_response_time_ms,
  COUNT(DISTINCT audience) as active_audiences,
  ROUND(
    COUNT(*) FILTER (WHERE (provenance->>'evidence_backed')::boolean = true)::decimal /
    NULLIF(COUNT(*), 0)::decimal * 100, 2
  ) as evidence_backed_rate_pct
FROM analysis_runs
WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours';

-- Performance by audience
SELECT
  audience,
  COUNT(*) as runs,
  ROUND(AVG((provenance->>'llm_duration_ms')::float), 2) as avg_duration_ms,
  ROUND(AVG((provenance->>'retrieval_count')::float), 2) as avg_retrievals,
  COUNT(*) FILTER (WHERE (provenance->>'cache_hit')::boolean = true) as cache_hits,
  COUNT(*) FILTER (WHERE solver_invocations IS NOT NULL) as solver_calls,
  ROUND(
    COUNT(*) FILTER (WHERE (provenance->>'evidence_backed')::boolean = true)::decimal /
    NULLIF(COUNT(*), 0)::decimal * 100, 2
  ) as evidence_backed_rate
FROM analysis_runs
WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
  AND audience IS NOT NULL
GROUP BY audience
ORDER BY runs DESC;

-- =====================================================================================
-- 10. DEBUG QUERIES - For troubleshooting specific issues
-- =====================================================================================

-- Find runs with missing provenance fields
SELECT
  id,
  audience,
  created_at,
  CASE WHEN provenance->>'llm_model' IS NULL THEN 'missing_llm_model' ELSE 'ok' END as llm_model_status,
  CASE WHEN provenance->>'cache_hit' IS NULL THEN 'missing_cache_hit' ELSE 'ok' END as cache_hit_status,
  CASE WHEN provenance->>'evidence_backed' IS NULL THEN 'missing_evidence_backed' ELSE 'ok' END as evidence_backed_status,
  CASE WHEN NOT (provenance ? 'used_retrieval_ids') THEN 'missing_used_retrieval_ids' ELSE 'ok' END as used_retrieval_ids_status
FROM analysis_runs
WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
  AND (
    provenance->>'llm_model' IS NULL
    OR provenance->>'cache_hit' IS NULL
    OR provenance->>'evidence_backed' IS NULL
    OR NOT (provenance ? 'used_retrieval_ids')
  )
ORDER BY created_at DESC;

-- Check for runs with numeric claims but no sources
SELECT
  id,
  audience,
  jsonb_array_length(analysis->'numeric_claims') as numeric_claims_count,
  jsonb_array_length(provenance->'used_retrieval_ids') as used_retrieval_ids_count,
  created_at
FROM analysis_runs
WHERE jsonb_array_length(analysis->'numeric_claims') > 0
  AND (
    provenance->'used_retrieval_ids' IS NULL
    OR jsonb_array_length(provenance->'used_retrieval_ids') = 0
  )
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================================================
-- QUICK HEALTH CHECK - Run this first for immediate status
-- =====================================================================================

-- One-query health check
WITH recent_runs AS (
  SELECT * FROM analysis_runs
  WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
)
SELECT
  COUNT(*) as runs_last_hour,
  COUNT(*) FILTER (WHERE (provenance->>'cache_hit')::boolean = false) as fresh_runs,
  COUNT(*) FILTER (WHERE (provenance->>'evidence_backed')::boolean = true) as evidence_backed,
  COUNT(*) FILTER (WHERE solver_invocations IS NOT NULL) as solver_runs,
  ROUND(AVG((provenance->>'llm_duration_ms')::float), 0) as avg_response_ms,
  COUNT(*) FILTER (WHERE provenance->>'llm_model' IS NULL) as missing_llm_model,
  COUNT(*) FILTER (WHERE provenance->>'cache_hit' IS NULL) as missing_cache_hit,
  COUNT(*) FILTER (WHERE provenance->>'evidence_backed' IS NULL) as missing_evidence_backed
FROM recent_runs;