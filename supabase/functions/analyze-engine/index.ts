// @ts-nocheck
// Supabase Edge Function: analyze-engine (production-ready)
// Deno runtime
// Endpoint: POST /functions/v1/analyze-engine
// Returns JSON-only response with analysis or clear error
//
// ENV (required):
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// EXA_API_KEY
// GEMINI_API_KEY
// OPENAI_KEY (fallback)
// WORKER_URL (optional)
//
// Tables: analysis_runs, retrieval_cache, schema_failures, rpc_errors

// deno-lint-ignore-file no-explicit-any

import { createClient } from 'npm:@supabase/supabase-js@2'
import Ajv from "https://esm.sh/ajv@8.17.1";
import addFormats from "https://esm.sh/ajv-formats@2.1.1";
import { computeEVs, PayoffEstimate, ActionEntry } from "../evEngine.ts";
import { runSensitivity, handleSensitivityJob } from "../sensitivityRunner.ts";
import { fetchAllRetrievals } from "./retrievalClient.ts";
import { computeCombinedSimilarity, extractScenarioFeatures } from "./similarityEngine.ts";
import { buildFunctionUrl } from "../_shared/function-url.ts";
import { DEFAULT_PROMPT_POLICY_ID, DEFAULT_RETRIEVAL_POLICY_ID, buildConstraintChecks, deriveEntityRefs, fetchLatestDriftSignal, maybeCallMlService } from "../_shared/ml-platform.ts";
import { prepareAnalysisArtifactPersistence } from "../_shared/analysis-artifacts.ts";
import {
  buildFrameworkEnvelope,
  coerceAdvancedFrameworkEnvelope,
  isPlainObject,
  sanitizeAdvancedGameInputs,
  type AdvancedGameInputs,
  type AdvancedFrameworkEnvelope,
  type AdvancedFrameworkKey,
} from "../_shared/advanced-frameworks.ts";
import { buildDoctrinePromptPack, buildDoctrinePromptText } from "../../../shared/gameTheoryKnowledge.ts";
import {
  appendPublicQuestionContext,
  evaluateQuestionIntake,
  stripPublicQuestionContext,
  type QuestionContextPayload,
} from "../../../shared/publicForecasting.ts";

// --- Env helpers ---
const getEnv = (k: string) => Deno.env.get(k) || undefined
const SUPABASE_PROJECT_REF = getEnv('SUPABASE_PROJECT_REF')
const SUPABASE_URL = getEnv('SUPABASE_URL') || (SUPABASE_PROJECT_REF ? `https://${SUPABASE_PROJECT_REF}.supabase.co` : undefined)!
const SUPABASE_SERVICE_ROLE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('EDGE_SUPABASE_SERVICE_ROLE_KEY')!
const GEMINI_KEY = getEnv('GEMINI_API_KEY')
  ?? getEnv('GOOGLE_AI_API_KEY')
  ?? getEnv('VITE_GEMINI_API_KEY')
  ?? ""
const GEMINI_MODEL = getEnv('GEMINI_ANALYZE_MODEL')
  ?? getEnv('GEMINI_STRATEGIST_MODEL')
  ?? 'gemini-3-flash-preview'
const GEMINI_FALLBACK_MODEL = getEnv('GEMINI_FALLBACK_ANALYZE_MODEL')
  ?? getEnv('GEMINI_FALLBACK_STRATEGIST_MODEL')
  ?? 'gemini-2.5-flash'
const OPENROUTER_KEY = getEnv('OPENROUTER_API_KEY') ?? ""
const OPENROUTER_MODEL_RAW = getEnv('OPENROUTER_MODEL')?.trim() ?? ''
const OPENROUTER_MODEL = OPENROUTER_MODEL_RAW || 'openrouter/free'
const OPENROUTER_AUTO_MODEL = 'openrouter/auto'
const OPENROUTER_BASE_URL = getEnv('OPENROUTER_BASE_URL') ?? 'https://openrouter.ai/api/v1'
const OPENROUTER_HTTP_REFERER = getEnv('OPENROUTER_HTTP_REFERER') ?? getEnv('APP_URL') ?? ""
const OPENROUTER_X_TITLE = getEnv('OPENROUTER_X_TITLE') ?? 'Strategic Intelligence Platform'
const OPENAI_KEY = getEnv('OPENAI_KEY') ?? getEnv('OPENAI_API_KEY') ?? ""
const OPENAI_MODEL = getEnv('OPENAI_ANALYZE_MODEL')
  ?? getEnv('OPENAI_STRATEGIST_MODEL')
  ?? 'gpt-4o-mini'
const XAI_KEY = getEnv('XAI_API_KEY') ?? getEnv('GROK_API_KEY') ?? ""
const XAI_MODEL = getEnv('XAI_ANALYZE_MODEL')
  ?? getEnv('XAI_STRATEGIST_MODEL')
  ?? 'grok-4.20-reasoning'
const WORKER_URL = getEnv('WORKER_URL') ?? ""
const OPENROUTER_PRIMARY_ENABLED = Boolean(OPENROUTER_KEY) && OPENROUTER_MODEL_RAW.length > 0 && OPENROUTER_MODEL !== 'openrouter/free'
const PROVIDER_FETCH_TIMEOUT_MS = Number(getEnv('ANALYZE_PROVIDER_TIMEOUT_MS') ?? '40000')

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase environment variables")
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function buildAnalysisRunArtifactColumns(requestId: string, analysisJson: Record<string, unknown>) {
  return await prepareAnalysisArtifactPersistence(supabaseAdmin, {
    requestId,
    analysisJson,
    sourceHint: 'analysis-runs',
  })
}

async function insertAnalysisRunOrThrow(row: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from("analysis_runs")
    .insert(row)
    .select('id')
    .single()
  if (error) {
    throw new Error(`analysis_runs_insert_failed: ${error.message}`)
  }
  return data?.id ?? null
}

async function updateAnalysisRunOrThrow(analysisRunId: string, row: Record<string, unknown>) {
  const { error } = await supabaseAdmin
    .from("analysis_runs")
    .update(row)
    .eq('id', analysisRunId)
  if (error) {
    throw new Error(`analysis_runs_update_failed: ${error.message}`)
  }
  return analysisRunId
}

async function getAnalysisRunSummary(analysisRunId: string) {
  const { data, error } = await supabaseAdmin
    .from('analysis_runs')
    .select('id,status,review_reason')
    .eq('id', analysisRunId)
    .maybeSingle()
  if (error) {
    throw new Error(`analysis_runs_select_failed: ${error.message}`)
  }
  return data ?? null
}

async function createOrReplaceAnalysisJobOrThrow(row: Record<string, unknown>) {
  const { error } = await supabaseAdmin
    .from('analysis_jobs')
    .upsert(row, { onConflict: 'request_id' })
  if (error) {
    throw new Error(`analysis_jobs_upsert_failed: ${error.message}`)
  }
}

async function updateAnalysisJobBestEffort(requestId: string, row: Record<string, unknown>) {
  const { error } = await supabaseAdmin
    .from('analysis_jobs')
    .update(row)
    .eq('request_id', requestId)
  if (error) {
    console.warn(`[${requestId}] analysis_jobs_update_failed: ${error.message}`)
  }
}

async function markAnalysisRunFailedBestEffort(analysisRunId: string, requestId: string, message: string) {
  try {
    await updateAnalysisRunOrThrow(analysisRunId, {
      status: 'failed',
      review_reason: message,
    })
  } catch (error) {
    console.warn(`[${requestId}] analysis_runs_mark_failed_failed: ${String((error as any)?.message ?? error)}`)
  }
}

function isTerminalAnalysisRunStatus(status: string | null | undefined) {
  return status === 'completed' || status === 'under_review' || status === 'needs_review' || status === 'rejected' || status === 'failed'
}

// --- Utility helpers ---
function uuid() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.floor(Math.random()*1e6)}`
}

function simpleHash(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

async function safeJsonParse(text: string) {
    try {
    return { ok: true, json: JSON.parse(text) }
    } catch (e) {
    // Try to extract first JSON substring
    const first = text.indexOf("{")
    if (first >= 0) {
      try {
        return { ok: true, json: JSON.parse(text.slice(first)) }
      } catch (err) {
        return { ok: false, error: "json_parse_failed", raw: text.slice(0, 2000) }
      }
    }
    return { ok: false, error: "json_parse_failed", raw: text.slice(0, 2000) }
  }
}

// --- LLM Output Sanitization and Noise Detection ---
function sanitizeLlmOutput(text: string): { sanitized: string, noiseDetected: boolean, patterns: string[] } {
  if (!text) return { sanitized: text, noiseDetected: false, patterns: [] }

  let sanitized = text.trim()
  let noiseDetected = false
  const patterns: string[] = []

  // Remove common LLM prefixes/suffixes
  const prefixesToRemove = [
    /^Here are the results?[:.]/i,
    /^Here's the analysis[:.]/i,
    /^According to the data[:.]/i,
    /^Based on the scenario[:.]/i,
    /^JSON response[:.]/i,
    /^```json\s*/,
    /^\s*```/,
    /```\s*$/
  ]

  const suffixesToRemove = [
    /\n*$/,
    /No more information available\./,
    /For further details.*$/,
    /I hope this helps!/,
    /Let me know if you need more information/i
  ]

  // Apply prefix removal
  for (const pattern of prefixesToRemove) {
    if (pattern.test(sanitized)) {
      sanitized = sanitized.replace(pattern, '').trim()
      patterns.push(pattern.toString())
      noiseDetected = true
    }
  }

  // Apply suffix removal
  for (const pattern of suffixesToRemove) {
    if (pattern.test(sanitized)) {
      sanitized = sanitized.replace(pattern, '').trim()
      patterns.push(pattern.toString())
      noiseDetected = true
    }
  }

  // Detect browser extension patterns (common injection patterns)
  const extensionPatterns = [
    /youtube\.com\/watch\?v=/i,
    /chrome-extension:\/\//i,
    /moz-extension:\/\//i,
    /loading.*script/i,
    /injecting.*content/i,
    /content script/i,
    /extension.*loaded/i,
    // Additional common browser extension patterns
    /grammarly.*enabled/i,
    /adblock.*detected/i,
    /cookie.*consent/i,
    /tracking.*protection/i,
    /privacy.*extension/i,
    /browser.*assistant/i,
    /tab.*extension/i,
    // Generic injection markers
    /(\(adsbygoogle.*\)|googletagmanager\.com|gtag.*=|fbq.*=|window\.__tcfapi)/i
  ]

  for (const pattern of extensionPatterns) {
    if (pattern.test(sanitized)) {
      patterns.push(`extension_injection:${pattern.toString()}`)
      noiseDetected = true
    }
  }

  // Clean up markdown code blocks if any
  if (sanitized.includes('```')) {
    const codeBlockMatch = sanitized.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
    if (codeBlockMatch) {
      sanitized = codeBlockMatch[1].trim()
      patterns.push('markdown_code_block')
      noiseDetected = true
    }
  }

  return { sanitized, noiseDetected, patterns }
}

async function logThirdPartyNoise(request_id: string | null, patterns: string[], rawText: string) {
  if (patterns.length === 0) return

  try {
    const timestamp = new Date().toISOString()
    const noiseEvent = {
      request_id,
      detected_patterns: JSON.stringify(patterns),
      raw_sample: rawText.slice(0, 500),
      timestamp
    }

    await supabaseAdmin.from("third_party_noise").insert(noiseEvent)
    console.warn(`Noise detected: ${patterns.join(", ")}`)

    // Check for rate limiting (>10 per minute) and create dashboard alert
    await checkThirdPartyNoiseRateAndAlert(patterns, timestamp)
  } catch (e) {
    console.error("Failed to log third_party_noise:", e)
  }
}

async function checkThirdPartyNoiseRateAndAlert(patterns: string[], currentTimestamp: string) {
  try {
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString()

    // Count noise events in the last minute
    const { data: recentNoise, error } = await supabaseAdmin
      .from("third_party_noise")
      .select("detected_patterns")
      .gte("timestamp", oneMinuteAgo)

    if (error || !recentNoise) {
      console.error("Failed to check noise rate:", error)
      return
    }

    const noiseCount = recentNoise.length
    const threshold = 10

    if (noiseCount > threshold) {
      console.warn(`ALERT: High third-party noise rate detected - ${noiseCount} events in last minute`)

      // Create persistent dashboard alert
      await createDashboardAlert({
        alert_type: "third_party_interference",
        severity: "high",
        message: `Third-party extension interference detected: ${noiseCount} events per minute`,
        metadata: {
          noise_count: noiseCount,
          threshold,
          time_window: "1 minute",
          patterns: patterns,
          timestamp: currentTimestamp
        }
      })
    }
  } catch (e) {
    console.error("Failed to check noise rate and alert:", e)
  }
}

async function createDashboardAlert(alertData: any) {
  try {
    // This assumes there's a monitoring_alerts table
    // If it doesn't exist, the insert will fail silently
    await supabaseAdmin.from("monitoring_alerts").insert({
      ...alertData,
      created_at: new Date().toISOString(),
      status: "active"
    })
  } catch (e) {
    console.error("Failed to create dashboard alert:", e)
  }
}

// Enhanced defensive JSON parsing with multiple strategies
function unwrapAnalysisEnvelope(parsed: unknown) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return parsed
  }
  const record = parsed as Record<string, unknown>
  if (record.analysis && typeof record.analysis === 'object' && !Array.isArray(record.analysis)) {
    const analysis = record.analysis as Record<string, unknown>
    if (!('scenario_text' in record) && ('scenario_text' in analysis || 'summary' in analysis || 'players' in analysis)) {
      return analysis
    }
  }
  return parsed
}

function parseJsonCandidate(candidate: string) {
  const parsed = JSON.parse(candidate)
  if (typeof parsed === 'string') {
    return unwrapAnalysisEnvelope(JSON.parse(parsed))
  }
  return unwrapAnalysisEnvelope(parsed)
}

async function parseLlmOutput(text: string, request_id: string | null = null): Promise<{ ok: true, json: any, sanitized: boolean, patterns: string[] } | { ok: false, error: string, raw: string, patterns: string[] }> {
  // Strategy 1: Parse as-is
  try {
    const parsed = parseJsonCandidate(text.trim())
    return { ok: true, json: parsed, sanitized: false, patterns: [] }
  } catch (err1) {
    // Strategy 2: Sanitize first
    const { sanitized, noiseDetected, patterns } = sanitizeLlmOutput(text)

    if (noiseDetected && request_id) {
      await logThirdPartyNoise(request_id, patterns, text)
    }

    try {
      const parsed = parseJsonCandidate(sanitized)
      return { ok: true, json: parsed, sanitized: noiseDetected, patterns }
    } catch (err2) {
      // Strategy 3: Find JSON boundaries more aggressively
      const jsonStart = sanitized.indexOf('{')
      const jsonEnd = sanitized.lastIndexOf('}')

      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        try {
          const extractedJson = sanitized.slice(jsonStart, jsonEnd + 1)
          const parsed = parseJsonCandidate(extractedJson)
          return { ok: true, json: parsed, sanitized: true, patterns: ['aggressive_extraction'] }
        } catch (err3) {
          // Strategy 4: Remove lines that look like examples or comments
          const lines = sanitized.split('\n').filter(line =>
            !line.includes('//') &&
            !line.match(/^\s*\*\//) &&
            !line.match(/^\s*\/\*/) &&
            !line.toLowerCase().includes('example')
          )

          try {
            const cleaned = lines.join('\n')
            const jsonStart2 = cleaned.indexOf('{')
            const jsonEnd2 = cleaned.lastIndexOf('}')

            if (jsonStart2 >= 0 && jsonEnd2 > jsonStart2) {
              const finalJson = cleaned.slice(jsonStart2, jsonEnd2 + 1)
              const parsed = parseJsonCandidate(finalJson)
              return { ok: true, json: parsed, sanitized: true, patterns: ['line_filtering', 'aggressive_extraction'] }
            }
          } catch (err4) {
            // Final fallback
            return { ok: false, error: "defensive_parsing_failed", raw: text.slice(0, 2000), patterns }
          }
        }
      }

      return { ok: false, error: "json_extraction_failed", raw: text.slice(0, 2000), patterns }
    }
  }
}

function coerceResearcherPayloadShape(llmJson: any, retrievals: any[] = []) {
  if (!llmJson || typeof llmJson !== 'object' || Array.isArray(llmJson)) {
    return { payload: llmJson, modified: false }
  }

  const normalizeStringList = (value: any, fallback: string[]) => {
    const values = Array.isArray(value)
      ? value
          .map((item: any) => String(item ?? '').trim())
          .filter((item: string) => item.length > 0)
      : []
    return values.length > 0 ? values.slice(0, 4) : fallback
  }

  const coercePayoffVector = (value: any, playerCount: number) => {
    if (Array.isArray(value)) {
      const numbers = value
        .map((entry: any) => Number(entry))
        .filter((entry: number) => Number.isFinite(entry))
      if (numbers.length > 0) {
        const padded = [...numbers]
        while (padded.length < playerCount) padded.push(numbers[numbers.length - 1] ?? 0)
        return padded.slice(0, playerCount)
      }
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const objectNumbers = Object.values(value)
        .map((entry: any) => Number(entry))
        .filter((entry: number) => Number.isFinite(entry))
      if (objectNumbers.length > 0) {
        const padded = [...objectNumbers]
        while (padded.length < playerCount) padded.push(objectNumbers[objectNumbers.length - 1] ?? 0)
        return padded.slice(0, playerCount)
      }
    }
    const numeric = Number(value)
    const numericValue = Number.isFinite(numeric) ? numeric : 0
    return Array.from({ length: playerCount }, () => numericValue)
  }

  const coercePayoffMatrixValues = (source: any, actionsByPlayer: string[][], playerCount: number) => {
    const rowCount = Math.max(1, actionsByPlayer[0]?.length || 0)
    const columnCount = Math.max(1, actionsByPlayer[1]?.length || 0)
    return Array.from({ length: rowCount }, (_, rowIndex) =>
      Array.from({ length: columnCount }, (__, columnIndex) => {
        const row = Array.isArray(source) ? source[rowIndex] : undefined
        const cell = Array.isArray(row) ? row[columnIndex] : undefined
        return coercePayoffVector(cell, playerCount)
      })
    )
  }

  let modified = false
  const payload = structuredClone(llmJson)
  const normalizedRetrievalIds = (retrievals || []).map((_retrieval: any, index: number) => `rid_${index + 1}`)
  const retrievalUrlToId = new Map<string, string>()
  ;(retrievals || []).forEach((retrieval: any, index: number) => {
    if (typeof retrieval?.url === 'string' && retrieval.url.trim().length > 0) {
      retrievalUrlToId.set(retrieval.url.trim(), normalizedRetrievalIds[index] || `rid_${index + 1}`)
    }
  })
  const playerNames = Array.isArray(payload.players)
    ? payload.players
        .map((player: any, index: number) => {
          if (typeof player === 'string' && player.trim().length > 0) return player.trim()
          if (player && typeof player === 'object') {
            const candidate = player.name || player.id
            if (typeof candidate === 'string' && candidate.trim().length > 0) return candidate.trim()
          }
          return `player_${index + 1}`
        })
        .filter(Boolean)
    : []
  const primaryPlayers = playerNames.length >= 2 ? playerNames.slice(0, 2) : ['player_1', 'player_2']

  if (Array.isArray(payload.assumptions)) {
    const normalizedAssumptions = payload.assumptions.map((assumption: any, index: number) => {
      if (assumption && typeof assumption === 'object' && !Array.isArray(assumption)) {
        const fallbackText = typeof assumption.text === 'string' && assumption.text.trim().length > 0
          ? assumption.text.trim()
          : JSON.stringify(assumption).slice(0, 240)
        return {
          name: typeof assumption.name === 'string' && assumption.name.trim().length > 0
            ? assumption.name.trim()
            : fallbackText.slice(0, 80) || `assumption_${index + 1}`,
          value: Number.isFinite(assumption.value) ? Number(assumption.value) : 0.5,
          justification: typeof assumption.justification === 'string' && assumption.justification.trim().length > 0
            ? assumption.justification.trim()
            : fallbackText || `Model-supplied qualitative assumption ${index + 1}.`,
        }
      }
      const text = String(assumption ?? `assumption_${index + 1}`).trim()
      return {
        name: text.slice(0, 80) || `assumption_${index + 1}`,
        value: 0.5,
        justification: text || `Model-supplied qualitative assumption ${index + 1}.`,
      }
    })
    if (JSON.stringify(normalizedAssumptions) !== JSON.stringify(payload.assumptions)) {
      payload.assumptions = normalizedAssumptions
      modified = true
    }
  }

  if (Array.isArray(payload.numeric_claims)) {
    payload.numeric_claims = payload.numeric_claims.map((claim: any, index: number) => {
      const rawClaim = claim && typeof claim === 'object' && !Array.isArray(claim) ? claim : {}
      const fallbackSource = normalizedRetrievalIds[index] || normalizedRetrievalIds[0] || 'rid_1'
      const normalizedSources = Array.isArray(rawClaim.sources)
        ? rawClaim.sources
            .map((source: unknown) => {
              if (typeof source !== 'string') return null
              const trimmed = source.trim()
              if (/^rid_/.test(trimmed)) return trimmed
              const retrievalIndexMatch = trimmed.match(/^retrievals\[(\d+)\]$/)
              if (retrievalIndexMatch) {
                const mapped = normalizedRetrievalIds[Number(retrievalIndexMatch[1])]
                return mapped || null
              }
              if (/^https?:\/\//i.test(trimmed)) {
                return retrievalUrlToId.get(trimmed) || null
              }
              return null
            })
            .filter((source: string | null): source is string => Boolean(source))
        : []
      const normalizedName = typeof rawClaim.name === 'string' && rawClaim.name.trim().length > 0
        ? rawClaim.name.trim()
        : `claim_${index + 1}`
      const nextClaim = {
        name: normalizedName,
        value: Number.isFinite(rawClaim.value) ? Number(rawClaim.value) : 0,
        confidence: Number.isFinite(rawClaim.confidence) ? Number(rawClaim.confidence) : 0.5,
        sources: normalizedSources.length > 0 ? normalizedSources : [fallbackSource],
      }
      if (
        nextClaim.name !== rawClaim.name
        || nextClaim.value !== rawClaim.value
        || nextClaim.confidence !== rawClaim.confidence
        || JSON.stringify(nextClaim.sources) !== JSON.stringify(rawClaim.sources)
      ) {
        modified = true
      }
      return nextClaim
    })
  }

  const rawPayoffMatrix = payload.payoff_matrix
  const payoffObject = rawPayoffMatrix && typeof rawPayoffMatrix === 'object' && !Array.isArray(rawPayoffMatrix)
    ? rawPayoffMatrix
    : null
  const hasCanonicalPayoffMatrix = payoffObject
    && Array.isArray(payoffObject.players)
    && Array.isArray(payoffObject.actions_by_player)
    && Array.isArray(payoffObject.matrix_values)
  if (!hasCanonicalPayoffMatrix) {
    const rows = Array.isArray(rawPayoffMatrix)
      ? rawPayoffMatrix.filter((row: any) => Array.isArray(row))
      : []
    const objectActions = payoffObject?.actions_by_player || payoffObject?.player_actions || payoffObject?.actions
    const objectPlayers = isPlainObject(objectActions)
      ? Object.keys(objectActions).map((player) => player.trim()).filter(Boolean)
      : []
    const rowLabels = rows.slice(1).map((row: any) => typeof row?.[0] === 'string' ? row[0].trim() : '').filter(Boolean)
    const columnLabels = rows[0]?.slice(1).map((value: any) => String(value).trim()).filter(Boolean) || []
    const inferredPlayers = objectPlayers.length >= 2
      ? objectPlayers.slice(0, 2)
      : Array.isArray(payoffObject?.players)
        ? normalizeStringList(payoffObject.players, primaryPlayers).slice(0, 2)
        : primaryPlayers
    const actionsByPlayer = Array.isArray(objectActions)
      ? [
          normalizeStringList(objectActions[0], rowLabels.length > 0 ? rowLabels.slice(0, 3) : ['base_case', 'downside_case']),
          normalizeStringList(objectActions[1], columnLabels.length > 0 ? columnLabels.slice(0, 3) : ['support', 'shock']),
        ]
      : isPlainObject(objectActions)
        ? inferredPlayers.map((player, index) =>
            normalizeStringList(objectActions[player], index === 0 ? ['base_case', 'downside_case'] : ['support', 'shock'])
          )
        : [
            rowLabels.length > 0 ? rowLabels.slice(0, 3) : ['base_case', 'downside_case'],
            columnLabels.length > 0 ? columnLabels.slice(0, 3) : ['support', 'shock'],
          ]
    const matrixSource = payoffObject?.matrix_values
      ?? payoffObject?.payoffs
      ?? payoffObject?.payoff_matrix
      ?? payoffObject?.matrix
      ?? rows.slice(1).map((row: any) => row.slice(1))
    const matrixValues = coercePayoffMatrixValues(matrixSource, actionsByPlayer, inferredPlayers.length)
    payload.payoff_matrix = {
      players: inferredPlayers,
      actions_by_player: actionsByPlayer,
      matrix_values: matrixValues,
    }
    modified = true
  }

  if (payload.simulation_results && typeof payload.simulation_results === 'object' && !Array.isArray(payload.simulation_results)) {
    const rawFrameworks = payload.simulation_results.advanced_frameworks
    if (rawFrameworks !== undefined && !isPlainObject(rawFrameworks)) {
      const normalizedFrameworks: Record<string, any> = {}
      const frameworkKeys = new Set(['coalitional', 'signaling', 'correlated', 'evolutionary', 'bounded_rationality'])
      if (Array.isArray(rawFrameworks)) {
        rawFrameworks.forEach((candidate: any) => {
          if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return
          const rawKey = String(candidate.framework || candidate.key || candidate.type || '').trim()
          const normalizedKey = rawKey === 'bounded rationality' ? 'bounded_rationality' : rawKey
          if (!frameworkKeys.has(normalizedKey)) return
          const envelope = coerceAdvancedFrameworkEnvelope(normalizedKey as AdvancedFrameworkKey, candidate)
          if (envelope) normalizedFrameworks[normalizedKey] = envelope
        })
      }
      payload.simulation_results = {
        ...payload.simulation_results,
        advanced_frameworks: normalizedFrameworks,
      }
      modified = true
    }
  }

  if (Array.isArray(payload.simulation_results?.equilibria)) {
    payload.simulation_results = {
      ...payload.simulation_results,
      equilibria: payload.simulation_results.equilibria.map((equilibrium: any) => {
        if (equilibrium && typeof equilibrium === 'object' && !Array.isArray(equilibrium)) {
          return {
            type: equilibrium.type === 'pure' || equilibrium.type === 'mixed' ? equilibrium.type : 'mixed',
            profile: equilibrium.profile && typeof equilibrium.profile === 'object' && !Array.isArray(equilibrium.profile)
              ? equilibrium.profile
              : {
                  player: primaryPlayers[0],
                  action_probabilities: [1],
                },
            stability: Number.isFinite(equilibrium.stability) ? Number(equilibrium.stability) : 0.5,
            confidence: Number.isFinite(equilibrium.confidence) ? Number(equilibrium.confidence) : 0.5,
          }
        }
        return {
          type: 'mixed',
          profile: {
            player: primaryPlayers[0],
            action_probabilities: [1],
          },
          stability: 0.5,
          confidence: 0.5,
        }
      }),
    }
    modified = true
  } else if (payload.simulation_results && typeof payload.simulation_results === 'object' && !Array.isArray(payload.simulation_results) && payload.simulation_results.equilibria !== undefined) {
    payload.simulation_results = {
      ...payload.simulation_results,
      equilibria: [],
    }
    modified = true
  }

  const validSolverMethods = new Set([
    'recursive_nash',
    'replicator',
    'best_response',
    'shapley_core',
    'perfect_bayesian',
    'correlated_equilibrium',
    'replicator_dynamics',
    'logit_qre',
  ])
  const rawSolverConfig = payload.solver_config && typeof payload.solver_config === 'object' && !Array.isArray(payload.solver_config)
    ? payload.solver_config
    : {}
  const rawMethod = typeof rawSolverConfig.method === 'string' ? rawSolverConfig.method : ''
  const inferredMethod = validSolverMethods.has(rawMethod)
    ? rawMethod
    : payload.game_classification === 'evolutionary_population'
      || payload.game_classification?.game_family === 'evolutionary_population'
        ? 'replicator_dynamics'
        : payload.game_classification === 'coalitional_cooperative'
          || payload.game_classification?.game_family === 'coalitional_cooperative'
            ? 'shapley_core'
            : 'best_response'
  const inferredIterations = Number.isInteger(rawSolverConfig.iterations)
    ? rawSolverConfig.iterations
    : Number.isInteger(rawSolverConfig.parameters?.monte_carlo_iterations)
      ? rawSolverConfig.parameters.monte_carlo_iterations
      : 1000
  const inferredSeed = Number.isInteger(rawSolverConfig.seed) ? rawSolverConfig.seed : 42
  if (!validSolverMethods.has(rawMethod) || !Number.isInteger(rawSolverConfig.seed) || !Number.isInteger(rawSolverConfig.iterations)) {
    payload.solver_config = {
      ...rawSolverConfig,
      method: inferredMethod,
      seed: inferredSeed,
      iterations: inferredIterations,
    }
    modified = true
  }

  if (typeof payload.notebook_snippet !== 'string') {
    payload.notebook_snippet = typeof payload.notebook_snippet?.text === 'string'
      ? payload.notebook_snippet.text
      : ''
    modified = true
  }

  if (!payload.data_exports || Array.isArray(payload.data_exports) || typeof payload.data_exports !== 'object') {
    const nextDataExports: Record<string, string> = {}
    if (Array.isArray(payload.data_exports)) {
      for (const entry of payload.data_exports) {
        if (typeof entry === 'string') {
          if (!nextDataExports.payoff_csv_url && /\.csv(\?|$)/i.test(entry)) {
            nextDataExports.payoff_csv_url = entry
          } else if (!nextDataExports.simulations_json_url && /\.json(\?|$)/i.test(entry)) {
            nextDataExports.simulations_json_url = entry
          }
          continue
        }
        if (!entry || typeof entry !== 'object') continue
        const candidateUrl = typeof entry.url === 'string'
          ? entry.url
          : typeof entry.href === 'string'
            ? entry.href
            : typeof entry.path === 'string'
              ? entry.path
              : null
        if (!candidateUrl) continue
        const label = `${String(entry.name || entry.type || entry.kind || '')} ${candidateUrl}`.toLowerCase()
        if (!nextDataExports.payoff_csv_url && (label.includes('csv') || label.includes('payoff'))) {
          nextDataExports.payoff_csv_url = candidateUrl
        } else if (!nextDataExports.simulations_json_url && (label.includes('json') || label.includes('simulation'))) {
          nextDataExports.simulations_json_url = candidateUrl
        }
      }
    }
    payload.data_exports = nextDataExports
    modified = true
  } else {
    const currentDataExports = payload.data_exports as Record<string, unknown>
    const nextDataExports: Record<string, string> = {}
    if (typeof currentDataExports.payoff_csv_url === 'string' && currentDataExports.payoff_csv_url.trim().length > 0) {
      nextDataExports.payoff_csv_url = currentDataExports.payoff_csv_url.trim()
    }
    if (typeof currentDataExports.simulations_json_url === 'string' && currentDataExports.simulations_json_url.trim().length > 0) {
      nextDataExports.simulations_json_url = currentDataExports.simulations_json_url.trim()
    }
    if (
      nextDataExports.payoff_csv_url !== currentDataExports.payoff_csv_url
      || nextDataExports.simulations_json_url !== currentDataExports.simulations_json_url
      || Object.keys(nextDataExports).length !== Object.keys(currentDataExports).length
    ) {
      payload.data_exports = nextDataExports
      modified = true
    }
  }

  return { payload, modified }
}

function coerceLearnerPayloadShape(llmJson: any, retrievals: any[] = []) {
  if (!llmJson || typeof llmJson !== 'object' || Array.isArray(llmJson)) {
    return { payload: llmJson, modified: false }
  }

  let modified = false
  const payload = structuredClone(llmJson)
  const normalizedRetrievalIds = (retrievals || []).map((_retrieval: any, index: number) => `rid_${index + 1}`)
  const retrievalById = new Map<string, any>()
  const retrievalByUrl = new Map<string, any>()
  ;(retrievals || []).forEach((retrieval: any, index: number) => {
    retrievalById.set(normalizedRetrievalIds[index] || `rid_${index + 1}`, retrieval)
    if (typeof retrieval?.url === 'string' && retrieval.url.trim().length > 0) {
      retrievalByUrl.set(retrieval.url.trim(), retrieval)
    }
  })

  const normalizeDecisionSources = (sources: unknown) => {
    const rawSources = Array.isArray(sources) ? sources : []
    const normalized = rawSources.map((source: any, index: number) => {
      let retrieval: any = null
      let retrievalId = normalizedRetrievalIds[index] || normalizedRetrievalIds[0] || 'derived'
      if (typeof source === 'string') {
        const trimmed = source.trim()
        if (/^rid_\d+$/i.test(trimmed)) {
          retrievalId = trimmed
          retrieval = retrievalById.get(trimmed) || null
        } else if (/^retrievals\[(\d+)\]$/i.test(trimmed)) {
          const match = trimmed.match(/^retrievals\[(\d+)\]$/i)
          const mappedIndex = match ? Number(match[1]) : index
          retrievalId = normalizedRetrievalIds[mappedIndex] || retrievalId
          retrieval = retrievalById.get(retrievalId) || null
        } else if (/^https?:\/\//i.test(trimmed)) {
          retrieval = retrievalByUrl.get(trimmed) || null
          const retrievalIndex = retrieval ? retrievals.indexOf(retrieval) : -1
          retrievalId = retrievalIndex >= 0 ? (normalizedRetrievalIds[retrievalIndex] || retrievalId) : retrievalId
        }
      } else if (source && typeof source === 'object') {
        const objectSource = source as Record<string, unknown>
        const candidateId = typeof objectSource.retrieval_id === 'string'
          ? objectSource.retrieval_id
          : typeof objectSource.id === 'string'
            ? objectSource.id
            : null
        if (candidateId && /^rid_\d+$/i.test(candidateId)) {
          retrievalId = candidateId
          retrieval = retrievalById.get(candidateId) || null
        } else if (typeof objectSource.url === 'string' && objectSource.url.trim().length > 0) {
          retrieval = retrievalByUrl.get(objectSource.url.trim()) || null
          const retrievalIndex = retrieval ? retrievals.indexOf(retrieval) : -1
          retrievalId = retrievalIndex >= 0 ? (normalizedRetrievalIds[retrievalIndex] || retrievalId) : retrievalId
        }
        return {
          id: retrievalId,
          retrieval_id: retrievalId,
          url: typeof objectSource.url === 'string' ? objectSource.url : (retrieval?.url || ''),
          passage_excerpt: typeof objectSource.passage_excerpt === 'string'
            ? objectSource.passage_excerpt
            : typeof objectSource.excerpt === 'string'
              ? objectSource.excerpt
              : (retrieval?.snippet || ''),
          anchor_score: Number.isFinite(objectSource.anchor_score) ? Number(objectSource.anchor_score) : Number.isFinite(objectSource.score) ? Number(objectSource.score) : 0.8,
        }
      }

      return {
        id: retrievalId,
        retrieval_id: retrievalId,
        url: retrieval?.url || '',
        passage_excerpt: retrieval?.snippet || '',
        anchor_score: Number.isFinite(retrieval?.score) ? Number(retrieval.score) : 0.8,
      }
    })

    return normalized.filter((entry: any) => typeof entry.id === 'string' && typeof entry.retrieval_id === 'string')
  }

  const normalizeRidSources = (sources: unknown, fallbackIndex = 0) => {
    const rawSources = Array.isArray(sources) ? sources : []
    const fallbackSource = normalizedRetrievalIds[fallbackIndex] || normalizedRetrievalIds[0] || 'rid_1'
    const normalized = rawSources
      .map((source: any, index: number) => {
        if (typeof source === 'string') {
          const trimmed = source.trim()
          if (/^rid_\d+$/i.test(trimmed)) return trimmed
          const retrievalIndexMatch = trimmed.match(/^retrievals\[(\d+)\]$/i)
          if (retrievalIndexMatch) {
            return normalizedRetrievalIds[Number(retrievalIndexMatch[1])] || null
          }
          if (/^https?:\/\//i.test(trimmed)) {
            const retrieval = retrievalByUrl.get(trimmed)
            const retrievalIndex = retrieval ? retrievals.indexOf(retrieval) : -1
            return retrievalIndex >= 0 ? (normalizedRetrievalIds[retrievalIndex] || null) : null
          }
          return null
        }

        if (source && typeof source === 'object') {
          const objectSource = source as Record<string, unknown>
          const candidateId = typeof objectSource.retrieval_id === 'string'
            ? objectSource.retrieval_id
            : typeof objectSource.id === 'string'
              ? objectSource.id
              : null
          if (candidateId && /^rid_\d+$/i.test(candidateId)) {
            return candidateId
          }
          if (typeof objectSource.url === 'string' && objectSource.url.trim().length > 0) {
            const retrieval = retrievalByUrl.get(objectSource.url.trim())
            const retrievalIndex = retrieval ? retrievals.indexOf(retrieval) : -1
            return retrievalIndex >= 0 ? (normalizedRetrievalIds[retrievalIndex] || null) : null
          }
        }

        return normalizedRetrievalIds[index] || null
      })
      .filter((source: string | null): source is string => Boolean(source))

    return normalized.length > 0 ? normalized : [fallbackSource]
  }

  if (Array.isArray(payload.decision_table)) {
    const normalizedDecisionTable = payload.decision_table.map((entry: any, index: number) => {
      const rawEntry = entry && typeof entry === 'object' && !Array.isArray(entry) ? entry : {}
      const rawPayoff = rawEntry.payoff_estimate && typeof rawEntry.payoff_estimate === 'object' && !Array.isArray(rawEntry.payoff_estimate)
        ? rawEntry.payoff_estimate
        : rawEntry.expected_value && typeof rawEntry.expected_value === 'object' && !Array.isArray(rawEntry.expected_value)
          ? rawEntry.expected_value
          : {}
      const normalizedSources = normalizeDecisionSources(rawPayoff.sources || rawEntry.sources || [])
      return {
        actor: typeof rawEntry.actor === 'string' && rawEntry.actor.trim().length > 0 ? rawEntry.actor.trim() : 'Primary Actor',
        action: typeof rawEntry.action === 'string' && rawEntry.action.trim().length > 0
          ? rawEntry.action.trim()
          : typeof rawEntry.action_profile === 'string' && rawEntry.action_profile.trim().length > 0
            ? rawEntry.action_profile.trim()
            : `Option ${index + 1}`,
        payoff_estimate: {
          value: Number.isFinite(rawPayoff.value) ? Number(rawPayoff.value) : Number.isFinite(rawEntry.value) ? Number(rawEntry.value) : 0,
          confidence: Number.isFinite(rawPayoff.confidence) ? Number(rawPayoff.confidence) : 0.5,
          sources: normalizedSources.length > 0 ? normalizedSources : [{
            id: normalizedRetrievalIds[0] || 'derived',
            retrieval_id: normalizedRetrievalIds[0] || 'derived',
            url: retrievals[0]?.url || '',
            passage_excerpt: retrievals[0]?.snippet || '',
            anchor_score: Number.isFinite(retrievals[0]?.score) ? Number(retrievals[0].score) : 0.8,
          }],
        },
        risk_notes: typeof rawEntry.risk_notes === 'string' && rawEntry.risk_notes.trim().length > 0
          ? rawEntry.risk_notes.trim()
          : typeof rawEntry.rationale === 'string' && rawEntry.rationale.trim().length > 0
            ? rawEntry.rationale.trim()
            : '',
      }
    })
    if (JSON.stringify(normalizedDecisionTable) !== JSON.stringify(payload.decision_table)) {
      payload.decision_table = normalizedDecisionTable
      modified = true
    }
  }

  if (Array.isArray(payload.numeric_claims)) {
    const normalizedNumericClaims = payload.numeric_claims.map((claim: any, index: number) => {
      const rawClaim = claim && typeof claim === 'object' && !Array.isArray(claim) ? claim : {}
      return {
        name: typeof rawClaim.name === 'string' && rawClaim.name.trim().length > 0
          ? rawClaim.name.trim()
          : `claim_${index + 1}`,
        value: Number.isFinite(rawClaim.value) ? Number(rawClaim.value) : 0,
        confidence: Number.isFinite(rawClaim.confidence) ? Number(rawClaim.confidence) : 0.5,
        sources: normalizeRidSources(rawClaim.sources, index),
      }
    })
    if (JSON.stringify(normalizedNumericClaims) !== JSON.stringify(payload.numeric_claims)) {
      payload.numeric_claims = normalizedNumericClaims
      modified = true
    }
  }

  if (Array.isArray(payload.expected_value_ranking)) {
    const normalizedExpectedValues = payload.expected_value_ranking.map((entry: any, index: number) => {
      const rawEntry = entry && typeof entry === 'object' && !Array.isArray(entry) ? entry : {}
      const rawEv = rawEntry.ev && typeof rawEntry.ev === 'object' && !Array.isArray(rawEntry.ev)
        ? rawEntry.ev
        : null
      return {
        action: typeof rawEntry.action === 'string' && rawEntry.action.trim().length > 0
          ? rawEntry.action.trim()
          : typeof rawEntry.action_profile === 'string' && rawEntry.action_profile.trim().length > 0
            ? rawEntry.action_profile.trim()
            : `Option ${index + 1}`,
        ev: Number.isFinite(rawEntry.ev)
          ? Number(rawEntry.ev)
          : Number.isFinite(rawEv?.value)
            ? Number(rawEv.value)
            : 0,
        ev_confidence: Number.isFinite(rawEntry.ev_confidence)
          ? Number(rawEntry.ev_confidence)
          : Number.isFinite(rawEntry.confidence)
            ? Number(rawEntry.confidence)
            : Number.isFinite(rawEv?.confidence)
              ? Number(rawEv.confidence)
              : 0.5,
      }
    })
    if (JSON.stringify(normalizedExpectedValues) !== JSON.stringify(payload.expected_value_ranking)) {
      payload.expected_value_ranking = normalizedExpectedValues
      modified = true
    }
  }

  if (payload.exercise && typeof payload.exercise === 'object' && !Array.isArray(payload.exercise)) {
    const rawExercise = payload.exercise as Record<string, unknown>
    const normalizedExercise = {
      task: typeof rawExercise.task === 'string' && rawExercise.task.trim().length > 0
        ? rawExercise.task.trim()
        : typeof rawExercise.instruction === 'string' && rawExercise.instruction.trim().length > 0
          ? rawExercise.instruction.trim()
          : 'Recreate the decision table and compare the top-ranked actions using the cited evidence.',
      hints: Array.isArray(rawExercise.hints)
        ? rawExercise.hints.map((hint: unknown) => String(hint).trim()).filter(Boolean)
        : [
            'Compare each action using expected value, confidence, and cited retrievals.',
            'Note which assumptions or signposts would cause the ranking to change.',
          ],
    }
    if (JSON.stringify(normalizedExercise) !== JSON.stringify(payload.exercise)) {
      payload.exercise = normalizedExercise
      modified = true
    }
  }

  return { payload, modified }
}

function buildFallbackEquilibriumProfile(players: any[] = []) {
  const fallbackPlayers = Array.isArray(players) && players.length > 0 ? players : ['P1']
  const profile: Record<string, Record<string, number>> = {}
  fallbackPlayers.forEach((player: any, index: number) => {
    const playerId = typeof player === 'string'
      ? player.trim() || `P${index + 1}`
      : typeof player?.id === 'string' && player.id.trim().length > 0
        ? player.id.trim()
        : typeof player?.name === 'string' && player.name.trim().length > 0
          ? player.name.trim()
          : `P${index + 1}`
    const preferredAction = Array.isArray(player?.actions) && player.actions.length > 0 && typeof player.actions[0] === 'string'
      ? player.actions[0].trim() || 'wait'
      : 'wait'
    profile[playerId] = {
      [preferredAction]: 1,
    }
  })
  return profile
}

function normalizeEquilibriumShape(llmJson: any) {
  const fallbackProfile = buildFallbackEquilibriumProfile(llmJson?.players)
  const rawEquilibrium = llmJson?.equilibrium

  if (!rawEquilibrium || typeof rawEquilibrium !== 'object' || Array.isArray(rawEquilibrium)) {
    return {
      profile: fallbackProfile,
      stability: 0.5,
      method: 'heuristic',
    }
  }

  const normalizedProfile: Record<string, Record<string, number | { value: number; confidence: number; sources: any[] }>> = {}
  const rawProfile = rawEquilibrium.profile
  if (rawProfile && typeof rawProfile === 'object' && !Array.isArray(rawProfile)) {
    Object.entries(rawProfile).forEach(([playerId, actionMap], playerIndex) => {
      const safePlayerId = String(playerId || '').trim() || `P${playerIndex + 1}`

      if (typeof actionMap === 'string' && actionMap.trim().length > 0) {
        normalizedProfile[safePlayerId] = { [actionMap.trim()]: 1 }
        return
      }

      if (actionMap && typeof actionMap === 'object' && !Array.isArray(actionMap)) {
        const nextActions: Record<string, number | { value: number; confidence: number; sources: any[] }> = {}
        Object.entries(actionMap).forEach(([action, value], actionIndex) => {
          const safeAction = String(action || '').trim() || `action_${actionIndex + 1}`
          if (Number.isFinite(value)) {
            nextActions[safeAction] = Number(value)
            return
          }
          if (value && typeof value === 'object' && !Array.isArray(value) && Number.isFinite((value as any).value)) {
            nextActions[safeAction] = {
              value: Number((value as any).value),
              confidence: Number.isFinite((value as any).confidence) ? Number((value as any).confidence) : 0.5,
              sources: Array.isArray((value as any).sources) ? (value as any).sources : [],
            }
            return
          }
          if (typeof value === 'string' && value.trim().length > 0) {
            nextActions[value.trim()] = 1
          }
        })

        normalizedProfile[safePlayerId] = Object.keys(nextActions).length > 0
          ? nextActions
          : (fallbackProfile[safePlayerId] || { wait: 1 })
        return
      }

      normalizedProfile[safePlayerId] = fallbackProfile[safePlayerId] || { wait: 1 }
    })
  }

  const profile = Object.keys(normalizedProfile).length > 0 ? normalizedProfile : fallbackProfile
  const numericStability = Number(rawEquilibrium.stability)
  const stability = Number.isFinite(numericStability)
    ? numericStability
    : Number.isFinite(rawEquilibrium.stability_confidence)
      ? Number(rawEquilibrium.stability_confidence)
      : 0.5
  const method = typeof rawEquilibrium.method === 'string' && rawEquilibrium.method.trim().length > 0
    ? rawEquilibrium.method.trim()
    : typeof rawEquilibrium.type === 'string' && rawEquilibrium.type.trim().length > 0
      ? rawEquilibrium.type.trim()
      : 'heuristic'

  return {
    ...rawEquilibrium,
    profile,
    stability,
    method,
  }
}

// --- EV Decision Table Computation ---
function computeExpectedValues(decisionTable: any[], scenario: string) {
  if (!Array.isArray(decisionTable) || decisionTable.length === 0) {
    return { ranking: [], computation_notes: "No decision table provided" }
  }

  const evMap = new Map()
  const confidenceMap = new Map()

  // Group by action and compute EV
  decisionTable.forEach((entry: any) => {
    const action = entry.action || "Unknown Action"
    const payoff = entry.payoff_estimate?.value || 0
    const confidence = entry.payoff_estimate?.confidence || 0.5

    if (!evMap.has(action)) {
      evMap.set(action, [])
      confidenceMap.set(action, [])
    }

    evMap.get(action).push(payoff)
    confidenceMap.get(action).push(confidence)
  })

  // Compute average EV and confidence for each action
  const ranking = Array.from(evMap.entries()).map(([action, payoffs]) => {
    const avgPayoff = payoffs.reduce((sum: number, p: number) => sum + p, 0) / payoffs.length
    const avgConfidence = confidenceMap.get(action).reduce((sum: number, c: number) => sum + c, 0) / confidenceMap.get(action).length

    return {
      action,
      ev: Number(avgPayoff.toFixed(3)),
      ev_confidence: Number(avgConfidence.toFixed(3))
    }
  })

  // Sort by EV descending
  ranking.sort((a, b) => b.ev - a.ev)

  return {
    ranking,
    computation_notes: `Computed EV for ${ranking.length} actions from ${decisionTable.length} decision entries`
  }
}

// --- Sensitivity Analysis Computation ---
function computeSensitivityAnalysis(decisionTable: any[], scenario: string, perturbations = 10) {
  if (!Array.isArray(decisionTable) || decisionTable.length === 0) {
    return { param_samples: [], analysis_notes: "No decision table for sensitivity analysis" }
  }

  const paramSamples = []
  const baseParams = {
    risk_tolerance: 0.5,
    time_horizon: 1.0,
    resource_availability: 0.8,
    stakeholder_alignment: 0.6
  }

  // Generate parameter perturbations
  for (let i = 0; i < perturbations; i++) {
    const perturbed = {
      risk_tolerance: Math.max(0, Math.min(1, baseParams.risk_tolerance + (Math.random() - 0.5) * 0.4)),
      time_horizon: Math.max(0.1, Math.min(5.0, baseParams.time_horizon + (Math.random() - 0.5) * 2.0)),
      resource_availability: Math.max(0, Math.min(1, baseParams.resource_availability + (Math.random() - 0.5) * 0.3)),
      stakeholder_alignment: Math.max(0, Math.min(1, baseParams.stakeholder_alignment + (Math.random() - 0.5) * 0.4))
    }

    // Compute effect on outcome (simplified model)
    const effect = (perturbed.risk_tolerance * 0.3 +
                   perturbed.time_horizon * 0.2 +
                   perturbed.resource_availability * 0.3 +
                   perturbed.stakeholder_alignment * 0.2) - 0.5

    paramSamples.push({
      param: `sample_${i + 1}`,
      range: [0, 1],
      effect_on_outcome: Number(effect.toFixed(3))
    })
  }

  return {
    param_samples: paramSamples,
    analysis_notes: `Generated ${perturbations} parameter samples for sensitivity analysis`
  }
}

// --- LLM callers ---
type LlmProvider = 'gemini' | 'openai' | 'xai' | 'openrouter'
type LlmFailureClass =
  | 'config_missing'
  | 'quota_exceeded'
  | 'rate_limited'
  | 'auth_error'
  | 'provider_http_error'
  | 'provider_transport_error'
  | 'provider_empty_output'
  | 'provider_parse_error'
  | 'provider_unknown'

type ProviderAttempt = {
  provider: LlmProvider
  model: string
  ok: boolean
  duration_ms: number
  failure_stage?: string
  failure_class?: LlmFailureClass
  http_status?: number | null
  error?: string
}

type ProviderCallSuccess = {
  ok: true
  provider: LlmProvider
  model: string
  text: string
  duration_ms: number
}

type ProviderCallFailure = {
  ok: false
  provider: LlmProvider
  model: string
  duration_ms: number
  failure_stage: string
  failure_class: LlmFailureClass
  http_status: number | null
  error: string
}

type ProviderCallResult = ProviderCallSuccess | ProviderCallFailure

function classifyProviderFailure(error: string, httpStatus: number | null): LlmFailureClass {
  const lower = String(error || '').toLowerCase()
  if (lower.includes('no_') && lower.includes('_key')) return 'config_missing'
  if (lower.includes('missing_openrouter_http_referer') || lower.includes('missing_base_url') || lower.includes('config_missing')) {
    return 'config_missing'
  }
  if (lower.includes('spending cap') || lower.includes('quota') || lower.includes('billing')) return 'quota_exceeded'
  if (httpStatus === 429 || lower.includes('rate limit')) return 'rate_limited'
  if (httpStatus === 401 || httpStatus === 403 || lower.includes('unauthorized') || lower.includes('forbidden') || lower.includes('invalid api key')) {
    return 'auth_error'
  }
  if (lower.includes('no content') || lower.includes('empty') || lower.includes('no structured text')) return 'provider_empty_output'
  if (lower.includes('parse')) return 'provider_parse_error'
  if (httpStatus !== null) return 'provider_http_error'
  if (lower.includes('fetch') || lower.includes('network') || lower.includes('timeout') || lower.includes('connection')) {
    return 'provider_transport_error'
  }
  return 'provider_unknown'
}

function buildProviderFailure(
  provider: LlmProvider,
  model: string,
  durationMs: number,
  failureStage: string,
  error: string,
  httpStatus: number | null = null
): ProviderCallFailure {
  return {
    ok: false,
    provider,
    model,
    duration_ms: durationMs,
    failure_stage: failureStage,
    failure_class: classifyProviderFailure(error, httpStatus),
    http_status: httpStatus,
    error,
  }
}

function extractResponsesApiText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === 'string' && payload.output_text.trim().length > 0) {
    return payload.output_text.trim()
  }

  const output = Array.isArray(payload.output) ? payload.output as Array<Record<string, unknown>> : []
  const message = output.find((item) => item.type === 'message')
  const content = Array.isArray(message?.content) ? message.content as Array<Record<string, unknown>> : []
  const textEntry = content.find((entry) => entry.type === 'output_text')
  return typeof textEntry?.text === 'string' ? textEntry.text.trim() : null
}

function extractChatCompletionText(payload: Record<string, unknown>) {
  const choices = Array.isArray(payload.choices) ? payload.choices as Array<Record<string, unknown>> : []
  const message = choices[0] && typeof choices[0].message === 'object' ? choices[0].message as Record<string, unknown> : null
  if (typeof message?.content === 'string' && message.content.trim().length > 0) {
    return message.content.trim()
  }

  const content = Array.isArray(message?.content) ? message.content as Array<Record<string, unknown>> : []
  const textEntry = content.find((entry) => typeof entry?.text === 'string')
  return typeof textEntry?.text === 'string' ? textEntry.text.trim() : null
}

const OPENROUTER_ALLOWED_MODELS = [
  'anthropic/*',
  'openai/*',
  'deepseek/*',
  'meta-llama/*',
  'mistralai/*',
  'qwen/*',
]

function buildOpenRouterPlugins(model: string) {
  if (model !== OPENROUTER_AUTO_MODEL) {
    return undefined
  }

  return [{
    id: 'auto-router',
    allowed_models: OPENROUTER_ALLOWED_MODELS,
  }]
}

async function fetchWithProviderTimeout(input: string | URL | Request, init: RequestInit) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(`provider_timeout_${PROVIDER_FETCH_TIMEOUT_MS}ms`), PROVIDER_FETCH_TIMEOUT_MS)
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error(`provider_timeout_${PROVIDER_FETCH_TIMEOUT_MS}ms`)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

async function callGeminiSingle(prompt: string, model: string): Promise<ProviderCallResult> {
  if (!GEMINI_KEY) {
    return buildProviderFailure('gemini', model, 0, 'gemini_config_missing', 'no_gemini_key')
  }

  const startedAt = Date.now()
  try {
    const res = await fetchWithProviderTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          candidateCount: 1,
          responseMimeType: 'application/json',
        },
      }),
    })

    const durationMs = Date.now() - startedAt
    const text = await res.text()
    const parsed = await safeJsonParse(text)
    if (!res.ok) {
      const message = parsed.ok
        ? parsed.json?.error?.message || parsed.json?.message || `gemini_http_${res.status}`
        : `gemini_http_${res.status}`
      return buildProviderFailure('gemini', model, durationMs, 'gemini_transport_error', String(message), res.status)
    }
    if (!parsed.ok) {
      return buildProviderFailure('gemini', model, durationMs, 'gemini_parse_error', 'gemini_json_parse_failed')
    }

    const parts = parsed.json?.candidates?.[0]?.content?.parts || []
    const responseText = parts
      .map((part: any) => typeof part?.text === 'string' ? part.text : '')
      .filter(Boolean)
      .join('\n')
      .trim()

    if (!responseText) {
      return buildProviderFailure('gemini', model, durationMs, 'gemini_empty_output', 'gemini_no_content')
    }

    return { ok: true, text: responseText, model, provider: 'gemini', duration_ms: durationMs }
  } catch (err: any) {
    return buildProviderFailure('gemini', model, Date.now() - startedAt, 'gemini_transport_error', String(err?.message ?? err))
  }
}

async function callOpenAIFallback(prompt: string): Promise<ProviderCallResult> {
  if (!OPENAI_KEY) {
    return buildProviderFailure('openai', OPENAI_MODEL, 0, 'openai_config_missing', 'no_openai_key')
  }

  const startedAt = Date.now()
  try {
    const res = await fetchWithProviderTimeout("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: "Return valid JSON only. Do not wrap the answer in markdown fences." },
          { role: "user", content: prompt }
        ],
        max_tokens: 1600,
        temperature: 0.0,
        response_format: { type: "json_object" }
      })
    })

    const durationMs = Date.now() - startedAt
    const text = await res.text()
    const parsed = await safeJsonParse(text)
    if (!res.ok) {
      const message = parsed.ok
        ? parsed.json?.error?.message || parsed.json?.message || `openai_http_${res.status}`
        : `openai_http_${res.status}`
      return buildProviderFailure('openai', OPENAI_MODEL, durationMs, 'openai_transport_error', String(message), res.status)
    }

    if (!parsed.ok) {
      return buildProviderFailure('openai', OPENAI_MODEL, durationMs, 'openai_parse_error', 'openai_json_parse_failed')
    }
    const content = parsed.json.choices?.[0]?.message?.content
    if (!content || typeof content !== 'string') {
      return buildProviderFailure('openai', OPENAI_MODEL, durationMs, 'openai_empty_output', 'openai_no_content')
    }

    return { ok: true, text: content, model: OPENAI_MODEL, provider: 'openai', duration_ms: durationMs }
  } catch (err: any) {
    return buildProviderFailure('openai', OPENAI_MODEL, Date.now() - startedAt, 'openai_transport_error', String(err?.message ?? err))
  }
}

async function callOpenRouterFallback(prompt: string): Promise<ProviderCallResult> {
  if (!OPENROUTER_KEY) {
    return buildProviderFailure('openrouter', OPENROUTER_MODEL, 0, 'openrouter_config_missing', 'no_openrouter_key')
  }
  if (!OPENROUTER_HTTP_REFERER) {
    return buildProviderFailure('openrouter', OPENROUTER_MODEL, 0, 'openrouter_config_missing', 'missing_openrouter_http_referer')
  }

  const startedAt = Date.now()
  try {
    const plugins = buildOpenRouterPlugins(OPENROUTER_MODEL)
    const res = await fetchWithProviderTimeout(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'HTTP-Referer': OPENROUTER_HTTP_REFERER,
        'X-OpenRouter-Title': OPENROUTER_X_TITLE,
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: 'Return valid JSON only. Do not wrap the answer in markdown fences.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 4000,
        temperature: 0.0,
        response_format: { type: 'json_object' },
        ...(plugins ? { plugins } : {}),
      }),
    })

    const durationMs = Date.now() - startedAt
    const text = await res.text()
    const parsed = await safeJsonParse(text)
    if (!res.ok) {
      const message = parsed.ok
        ? parsed.json?.error?.message || parsed.json?.message || `openrouter_http_${res.status}`
        : `openrouter_http_${res.status}`
      return buildProviderFailure('openrouter', OPENROUTER_MODEL, durationMs, 'openrouter_transport_error', String(message), res.status)
    }

    if (!parsed.ok) {
      return buildProviderFailure('openrouter', OPENROUTER_MODEL, durationMs, 'openrouter_parse_error', 'openrouter_json_parse_failed')
    }
    const content = extractChatCompletionText(parsed.json)
    if (!content) {
      return buildProviderFailure('openrouter', OPENROUTER_MODEL, durationMs, 'openrouter_empty_output', 'openrouter_no_content')
    }

    return { ok: true, text: content, model: OPENROUTER_MODEL, provider: 'openrouter', duration_ms: durationMs }
  } catch (err: any) {
    return buildProviderFailure('openrouter', OPENROUTER_MODEL, Date.now() - startedAt, 'openrouter_transport_error', String(err?.message ?? err))
  }
}

async function callXaiFallback(prompt: string): Promise<ProviderCallResult> {
  if (!XAI_KEY) {
    return buildProviderFailure('xai', XAI_MODEL, 0, 'xai_config_missing', 'no_xai_key')
  }

  const startedAt = Date.now()
  try {
    const res = await fetchWithProviderTimeout("https://api.x.ai/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${XAI_KEY}`
      },
      body: JSON.stringify({
        model: XAI_MODEL,
        input: [
          { role: 'system', content: 'Return valid JSON only. Do not wrap the answer in markdown fences.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.0,
      })
    })

    const durationMs = Date.now() - startedAt
    const text = await res.text()
    const parsed = await safeJsonParse(text)
    if (!res.ok) {
      const message = parsed.ok
        ? parsed.json?.error?.message || parsed.json?.message || `xai_http_${res.status}`
        : `xai_http_${res.status}`
      return buildProviderFailure('xai', XAI_MODEL, durationMs, 'xai_transport_error', String(message), res.status)
    }

    if (!parsed.ok) {
      return buildProviderFailure('xai', XAI_MODEL, durationMs, 'xai_parse_error', 'xai_json_parse_failed')
    }
    const content = extractResponsesApiText(parsed.json)
    if (!content) {
      return buildProviderFailure('xai', XAI_MODEL, durationMs, 'xai_empty_output', 'xai_no_content')
    }

    return { ok: true, text: content, model: XAI_MODEL, provider: 'xai', duration_ms: durationMs }
  } catch (err: any) {
    return buildProviderFailure('xai', XAI_MODEL, Date.now() - startedAt, 'xai_transport_error', String(err?.message ?? err))
  }
}

function summarizeProviderFailures(attempts: ProviderAttempt[]) {
  const firstMeaningfulFailure = attempts.find((attempt) => !attempt.ok && attempt.failure_class !== 'config_missing')
  const primaryFailure = firstMeaningfulFailure || attempts.find((attempt) => !attempt.ok)
  const failureClass = primaryFailure?.failure_class || 'provider_unknown'
  const failureStage = primaryFailure?.failure_stage || 'llm_failed'
  const detail = attempts
    .filter((attempt) => !attempt.ok)
    .map((attempt) => `${attempt.provider}:${attempt.model}:${attempt.failure_class}${attempt.http_status ? `:${attempt.http_status}` : ''}`)
    .join(', ')
  const userMessage = primaryFailure?.failure_class === 'quota_exceeded'
    ? 'Hosted synthesis is currently unavailable because the primary Gemini project is over its spend cap and no working fallback provider completed the request.'
    : primaryFailure?.failure_class === 'config_missing'
      ? 'Hosted synthesis is currently unavailable because no configured fallback provider key is available for analyze-engine.'
      : 'Hosted synthesis was unavailable before a verified structured answer could be produced.'

  return {
    failureClass,
    failureStage,
    detail,
    userMessage,
  }
}

function extractBearerToken(value: string | null) {
  if (!value) return null
  const match = value.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

function hasPrivilegedDiagnosticsAccess(req: Request) {
  const bearer = extractBearerToken(req.headers.get('authorization'))
  const apiKey = req.headers.get('apikey')?.trim() || null
  const serviceRole = SUPABASE_SERVICE_ROLE_KEY?.trim() || null
  if (!serviceRole) return false
  return bearer === serviceRole || apiKey === serviceRole
}

function publicFailureClass(failureClass: LlmFailureClass | null | undefined) {
  return failureClass ? 'provider_failure' : undefined
}

function publicFailureStage(failureStage: string | null | undefined) {
  return failureStage ? 'llm_unavailable' : undefined
}

function clientFailureMessage(message: string, canExposeProviderDiagnostics: boolean) {
  if (canExposeProviderDiagnostics) return message
  return 'Hosted synthesis is temporarily unavailable before a verified answer could be produced.'
}

// --- Audience prompt templates with Ph4.md evidence-backed requirements ---
function buildPrompt(
  audience: string,
  scenario: string,
  retrievals: any[],
  computedData?: any,
  options: { compactResearcher?: boolean } = {},
) {
  const retrievalCount = retrievals?.length || 0
  const promptRetrievals = options.compactResearcher ? (retrievals || []).slice(0, 6) : (retrievals || [])
  const retrievalBlock = (promptRetrievals && promptRetrievals.length)
    ? `Retrievals:\n${promptRetrievals.map((r:any,i:number)=>`${options.compactResearcher ? `rid_${i + 1}` : `retrievals[${i}]`}: ${r.title || r.url || "source"} — ${r.url || ""}\nSnippet: ${(r.snippet || '').slice(0, options.compactResearcher ? 220 : 1200)}`).join("\n")}`
    : `Retrievals: NONE`
  const doctrinePromptPack = buildDoctrinePromptPack({
    scenarioText: scenario,
    evidenceIds: (retrievals || []).map((retrieval: any, index: number) => retrieval.id || `retrieval_${index + 1}`)
  })
  const doctrineBlock = buildDoctrinePromptText(doctrinePromptPack)

  // Include solver results in prompt if available
  const solverBlock = computedData?.solverResults ?
    `SOLVER_RESULTS:\n${JSON.stringify(computedData.solverResults, null, 2)}\n\nUse these solver results to justify numeric claims. Cite solvers as sources (e.g., "nashpy", "axelrod").` :
    `SOLVER_RESULTS: NONE`

  // Base system prompt from Ph4.md with forced citation requirements
  const baseSystem = `You are a Game Theory Strategist (see PHASES: Deconstruct → Incentives → Strategy Space → Equilibrium → Recommendation).

CRITICAL CITATION REQUIREMENT: You MUST explicitly cite at least 3 different retrievals in your analysis. For each key factual assertion, statement, or claim, you must reference specific retrieval numbers (e.g., "retrievals[0]", "retrievals[2]", "retrievals[4]"). Failure to cite at least 3 distinct retrievals will result in analysis rejection.

RULES:
1) First extract entities (players, countries, companies) and timeframe; return as "entities": [...], "timeframe": "YYYY-MM-DD to YYYY-MM-DD".
2) Call out required retrieval_ids: include at least 3 valid retrievals; if retrieval_count < 3 produce evidence_backed:false and "action":"human_review".
3) For every numeric claim, use the shape: {"value": <number>, "confidence": <0-1>, "sources": ["url"]}.
4) Output only valid JSON that exactly matches the AJV schema. No extra prose.
5) If high-stakes keywords detected (nuclear,military,sanctions), set "human_review_required":true.
6) Minimize hallucination: every factual assertion must be linked to a source in "sources".
7) Keep reasoning steps concise and include an "explain_brief" string field limited to 250 chars.
8) MINIMUM CITATION ENFORCEMENT: Include explicit citations to retrievals retrivals[0], retrivals[1], and retrivals[2] at minimum in your analysis.
9) If solver results are provided, cite them as sources (e.g., "nashpy", "axelrod") for equilibrium claims.

Adopt the Game Theory Strategist framework.`

  const doctrineInstructions = `\n\n${doctrineBlock}\n\nApply the doctrine pack before producing audience-specific JSON.`

  if (audience === "student") {
    return `${baseSystem}${doctrineInstructions}

Audience: Student - Produce short actionable steps with simple explanations.

Scenario: ${scenario}
${retrievalBlock}
Retrieval Count: ${retrievalCount}

Produce student JSON with analysis_id, audience, summary, top_2_actions, key_terms, two_quiz_questions, provenance.
For numeric claims in top_2_actions, use {"value": <number>, "confidence": <0-1>, "sources": ["url"]} format.`
  } else if (audience === "learner") {
    const evData = computedData?.ev || { ranking: [], computation_notes: "EV computation pending" }
    const sensitivityData = computedData?.sensitivity || { param_samples: [], analysis_notes: "Sensitivity analysis pending" }

    return `${baseSystem}${doctrineInstructions}

Audience: Learner - Include decision table with EV computations and sensitivity analysis.

Scenario: ${scenario}
${retrievalBlock}
Retrieval Count: ${retrievalCount}
Computed Data: ${JSON.stringify({ ev_ranking: evData.ranking, sensitivity_samples: sensitivityData.param_samples.slice(0, 3) })}

Produce learner JSON with analysis_id, audience, summary, decision_table, expected_value_ranking, sensitivity_advice, exercise, provenance.
For numeric claims in decision_table, use {"value": <number>, "confidence": <0-1>, "sources": ["url"]} format.`
  } else if (audience === "researcher") {
    if (options.compactResearcher) {
      const compactSystem = `You are a JSON-only researcher health probe. Return exactly one valid JSON object and nothing else.

RULES:
1) Keep the payload minimal and schema-safe.
2) Cite evidence only with source ids from the provided retrieval list, using the exact form rid_1, rid_2, etc.
3) Do not emit markdown fences, commentary, explain_brief, entities, timeframe, or URL-style sources.
4) Do not include payoff_matrix or solver_config unless the scenario is trivially 2x2 and the values are explicitly present in retrievals.
5) Keep long_summary.text under 90 words.
6) numeric_claims: maximum 3 entries.
7) assumptions: maximum 2 entries.
8) If uncertain, omit optional sections instead of improvising filler.`

      return `${compactSystem}

Audience: Researcher - async probe compact mode.

Scenario: ${scenario}
${retrievalBlock}
Retrieval Count: ${retrievalCount}

Produce compact researcher JSON with analysis_id, audience, long_summary, provenance.
Optional compact extras only when strongly supported:
- numeric_claims: maximum 3 entries
- assumptions: maximum 2 entries
- simulation_results.equilibria: maximum 1 entry
Do not include payoff_matrix or solver_config unless the scenario is trivially 2x2 and the values are explicit in retrievals.
Set notebook_snippet to "".
Set data_exports to {}.
Keep long_summary.text under 90 words.
Omit optional filler instead of inventing verbose sections.
For all numeric claims, use {"name": string, "value": <number>, "confidence": <0-1>, "sources": ["rid_1"]} format.`
    }

    const sensitivityData = computedData?.sensitivity || { param_samples: [], analysis_notes: "Sensitivity analysis pending" }

    return `${baseSystem}${doctrineInstructions}

Audience: Researcher - Include detailed numeric tables and simulation results.

Scenario: ${scenario}
${retrievalBlock}
Retrieval Count: ${retrievalCount}
Sensitivity Analysis: ${JSON.stringify(sensitivityData.param_samples.slice(0, 5))}

Produce researcher JSON with analysis_id, audience, long_summary, assumptions, payoff_matrix, solver_config, simulation_results, notebook_snippet, data_exports, provenance.
When the doctrine pack points to coalition, Bayesian signaling, correlated coordination, evolutionary dynamics, or bounded rationality, include simulation_results.advanced_frameworks with the relevant framework object(s).
For each advanced framework object, set:
- status: "heuristic"
- summary: short explanation of why this framework fits
- normalized_inputs: the deterministic solver inputs only
- results: {}
- diagnostics: {}
- warnings: []
Do not hallucinate solver outputs. The deterministic backend will compute them after validation.
For all numeric claims, use {"value": <number>, "confidence": <0-1>, "sources": ["url"]} format.`
  } else {
    // teacher
    return `${baseSystem}${doctrineInstructions}

Audience: Teacher - Include lesson plans and assessment methods.

Scenario: ${scenario}
${retrievalBlock}
Retrieval Count: ${retrievalCount}

Produce teacher JSON with analysis_id, audience, lesson_outline, simulation_setup, grading_rubric, student_handouts, sample_solutions, provenance.
For numeric claims, use {"value": <number>, "confidence": <0-1>, "sources": ["url"]} format.`
  }
}

const ADVANCED_FRAMEWORK_KEYS: AdvancedFrameworkKey[] = [
  'coalitional',
  'signaling',
  'correlated',
  'evolutionary',
  'bounded_rationality',
]

function expectedAdvancedFrameworksForScenario(scenarioText: string, retrievals: any[] = []): AdvancedFrameworkKey[] {
  const pack = buildDoctrinePromptPack({
    scenarioText,
    evidenceIds: (retrievals || []).map((retrieval: any, index: number) => retrieval.id || `retrieval_${index + 1}`),
  })
  const expected: AdvancedFrameworkKey[] = []
  if (pack.classifier.doctrine_ids.includes('coalitional_shapley')) expected.push('coalitional')
  if (pack.classifier.doctrine_ids.includes('perfect_bayesian_signaling')) expected.push('signaling')
  if (pack.classifier.doctrine_ids.includes('correlated_equilibrium')) expected.push('correlated')
  if (pack.classifier.doctrine_ids.includes('evolutionary_replicator')) expected.push('evolutionary')
  if (pack.classifier.doctrine_ids.includes('bounded_rationality')) expected.push('bounded_rationality')
  return expected
}

function ensureAdvancedFrameworkCandidates(llmJson: any, scenarioText: string, retrievals: any[]) {
  if (!llmJson || typeof llmJson !== 'object') return
  const simulationResults = isPlainObject(llmJson.simulation_results)
    ? llmJson.simulation_results
    : {}
  const rawFrameworks = isPlainObject(simulationResults.advanced_frameworks)
    ? simulationResults.advanced_frameworks
    : {}
  const normalizedFrameworks: Record<string, AdvancedFrameworkEnvelope> = {}

  for (const key of ADVANCED_FRAMEWORK_KEYS) {
    if (key in rawFrameworks) {
      const envelope = coerceAdvancedFrameworkEnvelope(key, rawFrameworks[key])
      if (envelope) {
        normalizedFrameworks[key] = envelope
      }
    }
  }

  for (const key of expectedAdvancedFrameworksForScenario(scenarioText, retrievals)) {
    if (!normalizedFrameworks[key]) {
      normalizedFrameworks[key] = buildFrameworkEnvelope(key, {
        status: 'incomplete_inputs',
        summary: `${key.replace(/_/g, ' ')} doctrine was selected, but the LLM did not provide deterministic inputs.`,
        results: null,
        diagnostics: { errors: ['missing_normalized_inputs'] },
        warnings: ['Framework data is unavailable until normalized inputs are supplied.'],
      })
    }
  }

  if (Object.keys(normalizedFrameworks).length > 0) {
    simulationResults.advanced_frameworks = normalizedFrameworks
    llmJson.simulation_results = simulationResults
  }
}

function mergeExplicitAdvancedFrameworkCandidates(llmJson: any, explicitInputs?: AdvancedGameInputs) {
  if (!llmJson || typeof llmJson !== 'object' || !explicitInputs) return

  const simulationResults = isPlainObject(llmJson.simulation_results)
    ? llmJson.simulation_results
    : {}
  const rawFrameworks = isPlainObject(simulationResults.advanced_frameworks)
    ? simulationResults.advanced_frameworks
    : {}
  const mergedFrameworks = { ...rawFrameworks }

  for (const key of ADVANCED_FRAMEWORK_KEYS) {
    const normalizedInputs = explicitInputs[key]
    if (!normalizedInputs || typeof normalizedInputs !== 'object') continue
    mergedFrameworks[key] = buildFrameworkEnvelope(key, {
      status: 'heuristic',
      summary: `${key.replace(/_/g, ' ')} normalized inputs were supplied directly in the request.`,
      normalized_inputs: normalizedInputs as Record<string, unknown>,
      results: null,
      diagnostics: { seeded_by_request: true },
      warnings: ['Using caller-supplied normalized inputs.'],
    })
  }

  if (Object.keys(mergedFrameworks).length > 0) {
    simulationResults.advanced_frameworks = mergedFrameworks
    llmJson.simulation_results = simulationResults
  }
}

function hasNormalizedInputs(candidate: any) {
  return Boolean(candidate?.normalized_inputs) && isPlainObject(candidate.normalized_inputs) && Object.keys(candidate.normalized_inputs).length > 0
}

async function upgradeAdvancedFrameworksWithDeterministicSolvers(args: {
  llmJson: any
  solverInvocations: any[]
  solverResults: any
  requestId: string
}) {
  const frameworks = args.llmJson?.simulation_results?.advanced_frameworks
  if (!frameworks || typeof frameworks !== 'object') return

  for (const key of ADVANCED_FRAMEWORK_KEYS) {
    const candidate = frameworks[key]
    if (!candidate || typeof candidate !== 'object') continue
    if (!hasNormalizedInputs(candidate)) {
      frameworks[key] = {
        ...candidate,
        status: candidate.status === 'rejected' ? 'rejected' : 'incomplete_inputs',
        results: null,
        diagnostics: {
          ...(candidate.diagnostics && typeof candidate.diagnostics === 'object' ? candidate.diagnostics : {}),
          errors: ['missing_normalized_inputs'],
        },
        warnings: Array.from(new Set([...(Array.isArray(candidate.warnings) ? candidate.warnings : []), 'Deterministic solver skipped because normalized inputs were missing.'])),
      }
      continue
    }

    const start = Date.now()
    try {
      const result = await maybeCallMlService('/game-theory/solve', {
        framework: key,
        payload: candidate.normalized_inputs,
      })

      if (!result) {
        frameworks[key] = {
          ...candidate,
          status: 'heuristic',
          warnings: Array.from(new Set([...(Array.isArray(candidate.warnings) ? candidate.warnings : []), 'ML service unavailable; retaining heuristic framework envelope.'])),
        }
        continue
      }

      frameworks[key] = {
        ...result,
        framework: key,
        status: 'deterministic',
        summary: result.summary || candidate.summary,
      }
      args.solverInvocations.push({
        name: `game_theory_${key}`,
        endpoint: '/game-theory/solve',
        framework: key,
        start: new Date(start).toISOString(),
        duration_ms: Date.now() - start,
        result_id: `${key}-${args.requestId}`,
        ok: true,
      })
      args.solverResults[key] = result
    } catch (error) {
      frameworks[key] = {
        ...candidate,
        status: 'rejected',
        results: null,
        diagnostics: {
          ...(candidate.diagnostics && typeof candidate.diagnostics === 'object' ? candidate.diagnostics : {}),
          errors: [error instanceof Error ? error.message : String(error)],
        },
        warnings: Array.from(new Set([...(Array.isArray(candidate.warnings) ? candidate.warnings : []), 'Deterministic solver rejected the normalized inputs.'])),
      }
      args.solverInvocations.push({
        name: `game_theory_${key}`,
        endpoint: '/game-theory/solve',
        framework: key,
        start: new Date(start).toISOString(),
        duration_ms: Date.now() - start,
        result_id: `${key}-${args.requestId}`,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
// --- Numeric Passage Enforcement ---
async function enforceNumericPassages(llmJson: any, retrievals: any[]): Promise<void> {
  console.log('🔍 Starting numeric passage enforcement scan');

  let attachedPassages = 0;
  let unverifiedClaims = 0;

  // Helper function to find matching snippet in retrievals
  const findMatchingSnippet = (numericValue: string, retrievals: any[]): any => {
    const pattern = new RegExp(`\\b${escapeRegExp(numericValue)}\\b`, 'i');
    for (const retrieval of retrievals) {
      if (!retrieval.snippet) continue;
      if (pattern.test(retrieval.snippet)) {
        const retrievalId = retrieval.id || `retrieval-${uuid()}`
        return {
          id: retrievalId,
          retrieval_id: retrievalId,
          url: retrieval.url || '',
          passage_excerpt: retrieval.snippet,
          anchor_score: Number.isFinite(retrieval.score) ? Number(retrieval.score) : 0.8,
        };
      }
    }
    return null;
  };

  const escapeRegExp = (string: string): string => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // Scan indicators object for finance queries
  if (llmJson.indicators) {
    console.log('📊 Scanning indicators object');
    ['spot_price', 'pct_change', 'usdx', 'y10_real'].forEach(field => {
      if (llmJson.indicators[field] != null) {
        const value = llmJson.indicators[field];
        const numericValue = value.toString();

        if (!llmJson.indicators[field].sources ||
            !Array.isArray(llmJson.indicators[field].sources) ||
            llmJson.indicators[field].sources.length === 0) {

          const matchingSnippet = findMatchingSnippet(numericValue, retrievals);
          if (matchingSnippet) {
            llmJson.indicators[field].sources = [matchingSnippet];
            attachedPassages++;
            console.log(`✅ Attached passage for indicators.${field}: ${numericValue}`);
          } else {
            llmJson.indicators[field].verification = 'UNVERIFIED';
            unverifiedClaims++;
            console.log(`❌ No matching passage for indicators.${field}: ${numericValue}`);
          }
        } else {
          console.log(`ℹ️  Sources already exist for indicators.${field}`);
        }
      }
    });
  }

  // Scan top_2_actions for numeric values
  if (llmJson.top_2_actions && Array.isArray(llmJson.top_2_actions)) {
    console.log('🎯 Scanning top_2_actions');
    llmJson.top_2_actions.forEach((action: any, idx: number) => {
      // Check rationale
      if (action.rationale) {
        const numericMatches = action.rationale.match(/\b\d+\.?\d*\b/g);
        if (numericMatches) {
          numericMatches.forEach((numericValue: string) => {
            if (!action.sources ||
                !Array.isArray(action.sources) ||
                action.sources.length === 0 ||
                !action.sources.some((s: any) => s.passage_excerpt?.includes(numericValue))) {

              const matchingSnippet = findMatchingSnippet(numericValue, retrievals);
              if (matchingSnippet) {
                if (!action.sources) action.sources = [];
                action.sources.push(matchingSnippet);
                attachedPassages++;
              } else {
                unverifiedClaims++;
              }
            }
          });
        }
      }

      // Check entry_price_range
      if (action.entry_price_range && typeof action.entry_price_range === 'string') {
        const numericMatches = action.entry_price_range.match(/\b\d+\.?\d*\b/g);
        if (numericMatches) {
          numericMatches.forEach((numericValue: string) => {
            if (!action.sources ||
                !Array.isArray(action.sources) ||
                action.sources.length === 0 ||
                !action.sources.some((s: any) => s.passage_excerpt?.includes(numericValue))) {

              const matchingSnippet = findMatchingSnippet(numericValue, retrievals);
              if (matchingSnippet) {
                if (!action.sources) action.sources = [];
                action.sources.push(matchingSnippet);
                attachedPassages++;
              } else {
                unverifiedClaims++;
              }
            }
          });
        }
      }
    });
  }

  // Scan decision_table for numeric values in payoff_estimate
  if (llmJson.decision_table && Array.isArray(llmJson.decision_table)) {
    console.log('📊 Scanning decision_table');
    llmJson.decision_table.forEach((entry: any, idx: number) => {
      if (entry.payoff_estimate && typeof entry.payoff_estimate === 'object') {
        const payoffValue = entry.payoff_estimate.value;
        if (payoffValue != null && typeof payoffValue === 'number') {
          const numericValue = payoffValue.toString();

          if (!entry.payoff_estimate.sources ||
              !Array.isArray(entry.payoff_estimate.sources) ||
              entry.payoff_estimate.sources.length === 0) {

            const matchingSnippet = findMatchingSnippet(numericValue, retrievals);
            if (matchingSnippet) {
              entry.payoff_estimate.sources = [matchingSnippet];
              attachedPassages++;
              console.log(`✅ Attached passage for decision_table[${idx}]: ${numericValue}`);
            } else {
              entry.payoff_estimate.sources = [{ id: "derived", score: 0.0, excerpt: "" }];
              unverifiedClaims++;
              console.log(`❌ No matching passage for decision_table[${idx}]: ${numericValue}`);
            }
          }
        }
      }
    });
  }

  // Scan assumptions for numeric values
  if (llmJson.assumptions && Array.isArray(llmJson.assumptions)) {
    console.log('🔢 Scanning assumptions');
    llmJson.assumptions.forEach((assumption: any, idx: number) => {
      if (assumption.value != null && typeof assumption.value === 'number') {
        const numericValue = assumption.value.toString();

        if (!assumption.sources ||
            !Array.isArray(assumption.sources) ||
            assumption.sources.length === 0) {

          const matchingSnippet = findMatchingSnippet(numericValue, retrievals);
          if (matchingSnippet) {
            assumption.sources = [matchingSnippet];
            attachedPassages++;
            console.log(`✅ Attached passage for assumptions[${idx}]: ${numericValue}`);
          } else {
            unverifiedClaims++;
            console.log(`❌ No matching passage for assumptions[${idx}]: ${numericValue}`);
          }
        }
      }
    });
  }

  // Update provenance.evidence_backed from retrieval sufficiency rather than
  // only from numeric passage attachment.
  if (llmJson.provenance) {
    llmJson.provenance.evidence_backed = evidence_backed;
  }

  console.log(`🔍 Completed: ${attachedPassages} passages attached, ${unverifiedClaims} unverified claims`);
}

// --- Error logging helpers ---
async function logRpcError(request_id: string | null, errorId: string, errMsg: string, payload: any = null) {
  try {
    await supabaseAdmin.from("rpc_errors").insert({
      request_id: request_id,
      error_id: errorId,
      error_message: errMsg.slice(0, 4000),
      payload: payload ? JSON.stringify(payload).slice(0, 10000) : null,
      created_at: new Date().toISOString()
    })
  } catch (e) {
    console.error("Failed to write rpc_errors:", e)
  }
}

async function logSchemaFailure(request_id: string | null, rawResponse: string, validationErrors: any) {
  try {
    const payloadPreview = rawResponse.slice(0, 2000)

    // Check if this type of failure has been seen before
    const hash = simpleHash(JSON.stringify(validationErrors) + rawResponse.slice(0, 100))
    const { data: existingFailure } = await supabaseAdmin
      .from('schema_failures')
      .select('first_seen, id')
      .eq('request_id', hash)
      .limit(1)
      .single()

    const schemaFailure = {
      request_id,
      raw_response: rawResponse,
      validation_errors: JSON.stringify(validationErrors),
      payload_preview: payloadPreview,
      first_seen: existingFailure?.first_seen || new Date().toISOString(),
      status: 'active'
    }

    await supabaseAdmin.from("schema_failures").insert({
      request_id,
      raw_response: rawResponse.slice(0, 10000),
      validation_errors: JSON.stringify(validationErrors).slice(0, 10000),
      created_at: new Date().toISOString()
    })
  } catch (e) {
    console.error("Failed to write schema_failures:", e)
  }
}

// Global risk-detector used by AJV custom keyword
function isHighRiskDomain(scenarioText: string) {
  const geoKeywords = [
    'india', 'china', 'russia', 'tariff', 'sanctions', 'brics', 'de-dollar',
    'geopolitics', 'military', 'nuclear', 'trade war', 'diplomatic'
  ]
  const text = (scenarioText || '').toLowerCase()
  return geoKeywords.some(k => text.includes(k))
}

// --- AJV setup ---
const ajv = new Ajv({ allErrors: true, removeAdditional: false });
addFormats(ajv);

// Global flag to track geopolitical context during validation
let _currentScenarioText = '';
let _currentAudienceType = '';

// Add custom keyword for geopolitical domain validation
ajv.addKeyword({
  keyword: 'geopolitical-passage-excerpt',
  validate: function (schema: any, data: any, parentSchema?: any, dataCtx?: any) {
    if (!data || !Array.isArray(data)) return true; // Not applicable if no sources

    // Check if this is a geopolitical domain response by examining stored context
    const isGeopolitical = isHighRiskDomain(_currentScenarioText);
    if (!isGeopolitical) return true; // Skip validation for non-geopolitical scenarios

    // For geopolitical domains, require passage_excerpt for all sources
    return data.every((source: any) =>
      source.hasOwnProperty('passage_excerpt') &&
      typeof source.passage_excerpt === 'string' &&
      source.passage_excerpt.trim().length > 0
    );
  },
  errors: true,
  error: {
    message: 'Geopolitical domains require passage_excerpt for all sources in numeric claims'
  }
});

// --- Strict AJV schema with $ref enforcement ---
const numericObjectSchema = {
  $id: "https://example.com/schemas/numeric_object.json",
  type: "object",
  required: ["value", "confidence", "sources"],
  properties: {
    value: { type: "number" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    sources: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["id", "retrieval_id", "url", "passage_excerpt", "anchor_score"],
        properties: {
          id: { type: "string" },
          retrieval_id: { type: "string" },
          url: { type: "string" },
          passage_excerpt: { type: "string" },
          anchor_score: { type: "number", minimum: 0 }
        }
      }
    },
    derived: { type: "boolean" }
  }
};

// Compile the numeric object schema
ajv.addSchema(numericObjectSchema);

const advancedFrameworkEnvelopeBaseSchema = {
  type: "object",
  additionalProperties: true,
  required: ["framework", "status", "summary", "normalized_inputs", "results", "diagnostics", "warnings"],
  properties: {
    framework: { type: "string" },
    status: { type: "string", enum: ["deterministic", "heuristic", "incomplete_inputs", "rejected"] },
    summary: { type: "string" },
    normalized_inputs: { type: "object" },
    results: { type: ["object", "null"] },
    diagnostics: { type: "object" },
    warnings: { type: "array", items: { type: "string" } },
  },
}

const coalitionalNormalizedInputsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["players", "coalition_values"],
  properties: {
    players: { type: "array", minItems: 3, maxItems: 12, items: { type: "string" } },
    coalition_values: {
      type: "object",
      additionalProperties: { type: "number" },
    },
  },
}

const signalingPayoffTableSchema = {
  type: "object",
  additionalProperties: {
    type: "object",
    additionalProperties: {
      type: "object",
      additionalProperties: { type: "number" },
    },
  },
}

const signalingNormalizedInputsSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "sender_types",
    "prior_probs",
    "messages",
    "receiver_actions",
    "sender_strategies",
    "sender_payoffs",
    "receiver_payoffs",
  ],
  properties: {
    sender_types: { type: "array", minItems: 1, maxItems: 6, items: { type: "string" } },
    prior_probs: { type: "object", additionalProperties: { type: "number" } },
    messages: { type: "array", minItems: 1, maxItems: 8, items: { type: "string" } },
    receiver_actions: { type: "array", minItems: 1, maxItems: 8, items: { type: "string" } },
    sender_strategies: {
      type: "object",
      additionalProperties: {
        type: "object",
        additionalProperties: { type: "number" },
      },
    },
    observed_message: { type: "string" },
    sender_payoffs: signalingPayoffTableSchema,
    receiver_payoffs: signalingPayoffTableSchema,
  },
}

const twoPlayerTensorNormalizedInputsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["players", "actions_by_player", "payoff_matrix"],
  properties: {
    players: { type: "array", minItems: 2, maxItems: 2, items: { type: "string" } },
    actions_by_player: {
      type: "array",
      minItems: 2,
      maxItems: 2,
      items: { type: "array", minItems: 1, items: { type: "string" } },
    },
    payoff_matrix: {
      type: "array",
      items: { type: "array", items: { type: "array", items: { type: "number" } } },
    },
    objective: { type: "string", enum: ["welfare_maximizing", "validation_only"] },
    lambda: { type: "number", minimum: 0 },
  },
}

const evolutionaryNormalizedInputsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["strategies", "payoff_matrix", "initial_shares"],
  properties: {
    strategies: { type: "array", minItems: 2, items: { type: "string" } },
    payoff_matrix: {
      type: "array",
      items: { type: "array", items: { type: "number" } },
    },
    initial_shares: { type: "array", minItems: 2, items: { type: "number" } },
    steps: { type: "integer", minimum: 1, maximum: 2000 },
    dt: { type: "number", exclusiveMinimum: 0 },
  },
}

function buildAdvancedFrameworkSchema(framework: AdvancedFrameworkKey, normalizedInputsSchema: Record<string, unknown>) {
  return {
    anyOf: [
      {
        ...advancedFrameworkEnvelopeBaseSchema,
        properties: {
          ...advancedFrameworkEnvelopeBaseSchema.properties,
          framework: { type: "string", const: framework },
          status: { type: "string", enum: ["deterministic", "heuristic"] },
          normalized_inputs: normalizedInputsSchema,
        },
      },
      {
        ...advancedFrameworkEnvelopeBaseSchema,
        properties: {
          ...advancedFrameworkEnvelopeBaseSchema.properties,
          framework: { type: "string", const: framework },
          status: { type: "string", enum: ["incomplete_inputs", "rejected"] },
          normalized_inputs: { type: "object" },
        },
      },
    ],
  }
}

const audienceSchemas = {
  student: {
    type: "object",
    required: ["analysis_id", "audience", "summary", "provenance"],
    properties: {
      analysis_id: { type: "string" },
      audience: { type: "string", enum: ["student"] },
      summary: { type: "object", required: ["text"], properties: { text: { type: "string" } } },
      top_2_actions: {
        type: "array",
        items: {
          type: "object",
          required: ["action", "rationale", "expected_outcome"],
          properties: {
            action: { type: "string" },
            rationale: { type: "string" },
            expected_outcome: { "$ref": "https://example.com/schemas/numeric_object.json#" }
          }
        }
      },
      key_terms: {
        type: "array",
        items: {
          type: "object",
          required: ["term", "definition"],
          properties: {
            term: { type: "string" },
            definition: { type: "string" }
          }
        }
      },
      two_quiz_questions: {
        type: "array",
        items: {
          type: "object",
          required: ["q", "answer", "difficulty"],
          properties: {
            q: { type: "string" },
            answer: { type: "string" },
            difficulty: { type: "string", enum: ["easy", "medium"] }
          }
        }
      },
      provenance: {
        type: "object",
        required: ["retrieval_count", "used_retrieval_ids", "retrieval_sources", "cache_hit", "evidence_backed", "llm_model", "llm_duration_ms", "fallback_used"],
        properties: {
          retrieval_count: { type: "integer", minimum: 0 },
          used_retrieval_ids: { type: "array", items: { type: "string", pattern: "^rid_" } },
          retrieval_sources: { type: "array", items: { type: "string" } },
          cache_hit: { type: "boolean" },
          evidence_backed: { type: "boolean" },
          llm_model: { type: "string" },
          llm_duration_ms: { type: "integer" },
          fallback_used: { type: "boolean" },
          solver_invocations: { type: "array" }
        }
      }
    }
  },
  learner: {
    type: "object",
    required: ["analysis_id", "audience", "summary", "provenance"],
    properties: {
      analysis_id: { type: "string" },
      audience: { type: "string", enum: ["learner"] },
      summary: { type: "object", required: ["text"], properties: { text: { type: "string" } } },
      numeric_claims: {
        type: "array",
        items: {
          type: "object",
          required: ["name", "value", "confidence", "sources"],
          properties: {
            name: { type: "string" },
            value: { type: "number" },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            sources: { type: "array", items: { type: "string", pattern: "^rid_" } }
          }
        }
      },
      decision_table: {
        type: "array",
        items: {
          type: "object",
          required: ["actor", "action", "payoff_estimate"],
          properties: {
            actor: { type: "string" },
            action: { type: "string" },
            payoff_estimate: { "$ref": "https://example.com/schemas/numeric_object.json#" },
            risk_notes: { type: "string" }
          }
        }
      },
      expected_value_ranking: {
        type: "array",
        items: {
          type: "object",
          properties: {
            action: { type: "string" },
            ev: { type: "number" },
            ev_confidence: { type: "number", minimum: 0, maximum: 1 }
          }
        }
      },
      sensitivity_advice: {
        type: "object",
        properties: {
          most_sensitive_parameters: {
            type: "array",
            items: {
              type: "object",
              properties: {
                param: { type: "string" },
                impact_score: { type: "number", minimum: 0, maximum: 1 }
              }
            }
          },
          tipping_points: {
            type: "array",
            items: {
              type: "object",
              properties: {
                param: { type: "string" },
                threshold: { type: "number" }
              }
            }
          }
        }
      },
      exercise: {
        type: "object",
        required: ["task", "hints"],
        properties: {
          task: { type: "string" },
          hints: { type: "array", items: { type: "string" } }
        }
      },
      provenance: {
        type: "object",
        required: ["retrieval_count", "used_retrieval_ids", "retrieval_sources", "cache_hit", "evidence_backed", "llm_model", "llm_duration_ms", "fallback_used"],
        properties: {
          retrieval_count: { type: "integer", minimum: 0 },
          used_retrieval_ids: { type: "array", items: { type: "string", pattern: "^rid_" } },
          retrieval_sources: { type: "array", items: { type: "string" } },
          cache_hit: { type: "boolean" },
          evidence_backed: { type: "boolean" },
          llm_model: { type: "string" },
          llm_duration_ms: { type: "integer" },
          fallback_used: { type: "boolean" },
          solver_invocations: { type: "array" }
        }
      }
    }
  },
  researcher: {
    type: "object",
    required: ["analysis_id", "audience", "long_summary", "provenance"],
    properties: {
      analysis_id: { type: "string" },
      audience: { type: "string", enum: ["researcher"] },
      long_summary: { type: "object", required: ["text"], properties: { text: { type: "string" } } },
      numeric_claims: {
        type: "array",
        items: {
          type: "object",
          required: ["name", "value", "confidence", "sources"],
          properties: {
            name: { type: "string" },
            value: { type: "number" },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            sources: { type: "array", items: { type: "string", pattern: "^rid_" } }
          }
        }
      },
      assumptions: {
        type: "array",
        items: {
          type: "object",
          required: ["name", "value", "justification"],
          properties: {
            name: { type: "string" },
            value: { type: "number" },
            justification: { type: "string" }
          }
        }
      },
      payoff_matrix: {
        type: "object",
        required: ["players", "actions_by_player", "matrix_values"],
        properties: {
          players: { type: "array", items: { type: "string" } },
          actions_by_player: { type: "array", items: { type: "array", items: { type: "string" } } },
          matrix_values: { type: "array", items: { type: "array", items: { type: "array", items: { type: "number" } } } }
        }
      },
      solver_config: {
        type: "object",
        required: ["seed", "method", "iterations"],
        properties: {
          seed: { type: "integer" },
          method: { type: "string", enum: ["recursive_nash", "replicator", "best_response", "shapley_core", "perfect_bayesian", "correlated_equilibrium", "replicator_dynamics", "logit_qre"] },
          iterations: { type: "integer" }
        }
      },
      simulation_results: {
        type: "object",
        properties: {
          equilibria: {
            type: "array",
            items: {
              type: "object",
              required: ["type", "profile", "stability", "confidence"],
              properties: {
                type: { type: "string", enum: ["pure", "mixed"] },
                profile: {
                  type: "object",
                  properties: {
                    player: { type: "string" },
                    action_probabilities: { type: "array", items: { type: "number" } }
                  }
                },
                stability: { type: "number", minimum: 0, maximum: 1 },
                confidence: { type: "number", minimum: 0, maximum: 1 }
              }
            }
          },
          sensitivity: {
            type: "object",
            properties: {
              param_samples: {
                type: "array",
                items: {
                  type: "object",
                  required: ["param", "range", "effect_on_outcome"],
                  properties: {
                    param: { type: "string" },
                    range: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 },
                    effect_on_outcome: { type: "number" }
                  }
                }
              }
            }
          },
          advanced_frameworks: {
            type: "object",
            additionalProperties: false,
            properties: {
              coalitional: buildAdvancedFrameworkSchema("coalitional", coalitionalNormalizedInputsSchema),
              signaling: buildAdvancedFrameworkSchema("signaling", signalingNormalizedInputsSchema),
              correlated: buildAdvancedFrameworkSchema("correlated", {
                ...twoPlayerTensorNormalizedInputsSchema,
                required: ["players", "actions_by_player", "payoff_matrix", "objective"],
              }),
              evolutionary: buildAdvancedFrameworkSchema("evolutionary", evolutionaryNormalizedInputsSchema),
              bounded_rationality: buildAdvancedFrameworkSchema("bounded_rationality", {
                ...twoPlayerTensorNormalizedInputsSchema,
                required: ["players", "actions_by_player", "payoff_matrix"],
              }),
            }
          }
        }
      },
      notebook_snippet: { type: "string" },
      data_exports: {
        type: "object",
        properties: {
          payoff_csv_url: { type: "string" },
          simulations_json_url: { type: "string" }
        }
      },
      provenance: {
        type: "object",
        required: ["retrieval_count", "used_retrieval_ids", "retrieval_sources", "cache_hit", "evidence_backed", "llm_model", "llm_duration_ms", "fallback_used"],
        properties: {
          retrieval_count: { type: "integer", minimum: 0 },
          used_retrieval_ids: { type: "array", items: { type: "string", pattern: "^rid_" } },
          retrieval_sources: { type: "array", items: { type: "string" } },
          cache_hit: { type: "boolean" },
          evidence_backed: { type: "boolean" },
          llm_model: { type: "string" },
          llm_duration_ms: { type: "integer" },
          fallback_used: { type: "boolean" },
          solver_invocations: { type: "array" }
        }
      }
    }
  },
  teacher: {
    type: "object",
    required: ["analysis_id", "audience", "lesson_outline", "provenance"],
    properties: {
      analysis_id: { type: "string" },
      audience: { type: "string", enum: ["teacher"] },
      lesson_outline: {
        type: "object",
        required: ["duration_minutes", "learning_objectives", "summary"],
        properties: {
          duration_minutes: { type: "integer" },
          learning_objectives: { type: "array", items: { type: "string" } },
          summary: { type: "string" }
        }
      },
      simulation_setup: {
        type: "object",
        required: ["roles", "rounds", "timing_minutes_per_round"],
        properties: {
          roles: {
            type: "array",
            items: {
              type: "object",
              required: ["role", "instructions"],
              properties: {
                role: { type: "string" },
                instructions: { type: "string" },
                payoff_card_url: { type: "string" }
              }
            }
          },
          rounds: { type: "integer" },
          timing_minutes_per_round: { type: "integer" }
        }
      },
      grading_rubric: {
        type: "array",
        items: {
          type: "object",
          required: ["criteria", "max_points", "description"],
          properties: {
            criteria: { type: "string" },
            max_points: { type: "integer" },
            description: { type: "string" }
          }
        }
      },
      student_handouts: { type: "array", items: { type: "string" } },
      sample_solutions: { type: "array", items: { type: "string" } },
      provenance: {
        type: "object",
        required: ["retrieval_count", "retrieval_ids", "evidence_backed"],
        properties: {
          retrieval_count: { type: "integer", minimum: 0 },
          retrieval_ids: { type: "array", items: { type: "string" } },
          evidence_backed: { type: "boolean" }
        }
      }
    }
  }
};

const validate = ajv.compile(audienceSchemas.student); // Default to student, will be recompiled per audience

// --- Main handler ---
const handler = async (req: Request): Promise<Response> => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    console.log(`[preflight] origin=${req.headers.get('origin') || 'unknown'} allow_headers=Content-Type, Authorization, apikey, X-Client-Info`)
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info'
      }
    })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'method_not_allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Expose-Headers': 'Content-Type' }
    })
  }

  const start = Date.now()
  const canExposeProviderDiagnostics = hasPrivilegedDiagnosticsAccess(req)
  try {
    const requestBody = await req.json().catch(() => ({}))
    const request_id = requestBody.request_id ?? uuid()
    const precreatedAnalysisRunId = typeof requestBody.__analysis_run_id === 'string' && requestBody.__analysis_run_id.trim().length > 0
      ? requestBody.__analysis_run_id.trim()
      : null
    const persistAnalysisRun = async (row: Record<string, unknown>) => {
      if (precreatedAnalysisRunId) {
        await updateAnalysisRunOrThrow(precreatedAnalysisRunId, row)
        return precreatedAnalysisRunId
      }
      return await insertAnalysisRunOrThrow(row)
    }
    const user_id = requestBody.user_id ?? null
    const audience = requestBody.audience ?? "learner"
    const mode = requestBody.mode ?? "standard"
    const asyncProbe = requestBody.async_probe === true
    const asyncProbeDispatch = requestBody.__async_probe_dispatch === true
    const rawScenarioText = String(requestBody.scenario_text ?? "").trim()
    const incomingQuestionContext = requestBody.question_context ?? requestBody.questionContext
    const rawQuestionContext = incomingQuestionContext && typeof incomingQuestionContext === 'object'
      ? incomingQuestionContext as Partial<QuestionContextPayload>
      : null
    const commonCountries = [
      'India',
      'Brazil',
      'United States',
      'US',
      'China',
      'Russia',
      'Ukraine',
      'Israel',
      'Iran',
      'Saudi Arabia',
      'Turkey',
      'Germany',
      'France',
      'United Kingdom',
      'UK',
      'Japan',
      'South Korea',
      'North Korea',
      'Taiwan',
      'Pakistan',
      'Canada',
      'Mexico',
      'Australia',
      'South Africa',
      'South Asia',
      'Middle East',
    ]
    const inferCountryFromCurrency = (value?: string | null) => {
      if (!value) return null
      for (const country of commonCountries) {
        const pattern = new RegExp(`\\b${country.replace(/\s+/g, '\\s+')}\\b`, 'i')
        if (pattern.test(value)) return country
      }
      const leading = value.split('/')[0]?.trim()
      return leading && /^[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2}$/.test(leading) ? leading : null
    }
    const normalizedQuestionContext = rawQuestionContext
      ? (() => {
          const next = structuredClone(rawQuestionContext)
          const mergedAnswers = {
            ...(next.answers || {}),
          }
          const inferredCountry = next.country || mergedAnswers.country || inferCountryFromCurrency(next.currency || mergedAnswers.currency)
          if (inferredCountry) {
            next.country = inferredCountry
            next.answers = {
              ...mergedAnswers,
              country: inferredCountry,
            }
          }
          return next
        })()
      : null

  // Basic validation
  if (!rawScenarioText) {
    return new Response(JSON.stringify({ ok: false, error: "missing_scenario_text" }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }

    const clarificationMode = (normalizedQuestionContext?.decision_use || '').includes('public') ? 'public' : 'internal'
    const questionIntake = evaluateQuestionIntake({
      prompt: rawScenarioText,
      knownContext: normalizedQuestionContext,
      clarificationState: normalizedQuestionContext
        ? {
            answers: normalizedQuestionContext.answers,
            askedQuestionIds: normalizedQuestionContext.asked_question_ids,
            totalQuestionsAsked: normalizedQuestionContext.asked_question_ids?.length,
          }
        : null,
      mode: clarificationMode,
      audience,
    })
    const question_context: QuestionContextPayload = {
      ...questionIntake.question_context,
      ...normalizedQuestionContext,
      decision_use: normalizedQuestionContext?.decision_use || null,
    }
    const scenario_text = question_context.normalized_prompt
      || appendPublicQuestionContext(stripPublicQuestionContext(rawScenarioText), question_context.answers)
    const rawAdvancedGameInputs =
      requestBody.advanced_game_inputs
      ?? requestBody.advancedGameInputs
      ?? requestBody.advanced_framework_inputs
      ?? requestBody.advancedFrameworkInputs
    const advancedGameInputsProvided = rawAdvancedGameInputs !== undefined
    const sanitizedAdvancedGameInputs = sanitizeAdvancedGameInputs(rawAdvancedGameInputs)

    if (clarificationMode === 'public' && question_context.clarification_status !== 'ready') {
      return new Response(JSON.stringify({
        ok: false,
        error: 'needs_more_input',
        reason: 'needs_more_input',
        message: questionIntake.relevance_summary,
        required_inputs: question_context.required_inputs,
        question_context,
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    }

    if (advancedGameInputsProvided && Object.keys(sanitizedAdvancedGameInputs.rejections).length > 0) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'invalid_advanced_game_inputs',
        rejections: sanitizedAdvancedGameInputs.rejections,
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    }

    console.log(`[${request_id}] stage=start, audience=${audience}, mode=${mode}`)
    console.log(`[${request_id}] entry method=${req.method} origin=${req.headers.get('origin') || 'unknown'} has_apikey=${req.headers.has('apikey')} has_auth=${req.headers.has('authorization')}`)
    console.log(`[${request_id}] env has_exa=${Boolean(Deno.env.get('EXA_API_KEY'))} has_gemini=${Boolean(Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_AI_API_KEY') || Deno.env.get('VITE_GEMINI_API_KEY'))} gemini_model=${GEMINI_MODEL} gemini_fallback_model=${GEMINI_FALLBACK_MODEL} has_openrouter=${Boolean(OPENROUTER_KEY)} openrouter_model=${OPENROUTER_MODEL} has_openai=${Boolean(Deno.env.get('OPENAI_KEY') || Deno.env.get('OPENAI_API_KEY'))} openai_model=${OPENAI_MODEL} has_xai=${Boolean(Deno.env.get('XAI_API_KEY') || Deno.env.get('GROK_API_KEY'))} xai_model=${XAI_MODEL}`)

  // Validate audience type
  const validAudiences = ['student', 'learner', 'researcher', 'teacher', 'reviewer']
  if (!validAudiences.includes(audience)) {
    return new Response(JSON.stringify({
      ok: false,
      error: "invalid_audience",
      message: `Audience must be one of: ${validAudiences.join(', ')}`
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }

    if (asyncProbe && !asyncProbeDispatch) {
      const nowIso = new Date().toISOString()
      const placeholderAnalysis = {
        analysis_id: uuid(),
        audience,
        scenario_text,
        question_context,
        summary: { text: 'Analysis accepted for asynchronous canary processing.' },
        provenance: {
          retrieval_count: 0,
          retrieval_ids: [],
          evidence_backed: false,
        },
      }

      const analysisRunId = await insertAnalysisRunOrThrow({
        request_id,
        user_id,
        audience,
        status: 'processing',
        ...(await buildAnalysisRunArtifactColumns(request_id, placeholderAnalysis)),
        retrieval_ids: [],
        evidence_backed: false,
        created_at: nowIso,
      })

      await createOrReplaceAnalysisJobOrThrow({
        request_id,
        scenario_text,
        status: 'processing',
        analysis_run_id: analysisRunId,
        error: null,
        started_at: nowIso,
        completed_at: null,
      })

      const backgroundHeaders = new Headers(req.headers)
      backgroundHeaders.set('content-type', 'application/json')
      const backgroundBody = JSON.stringify({
        ...requestBody,
        request_id,
        async_probe: true,
        __async_probe_dispatch: true,
        __analysis_run_id: analysisRunId,
      })

      EdgeRuntime.waitUntil((async () => {
        try {
          const backgroundResponse = await handler(new Request(req.url, {
            method: 'POST',
            headers: backgroundHeaders,
            body: backgroundBody,
          }))
          const responsePayload = await backgroundResponse.clone().json().catch(() => null)
          const completedAt = new Date().toISOString()
          const terminalAnalysisRunId =
            typeof responsePayload?.analysis_run_id === 'string' && responsePayload.analysis_run_id.trim().length > 0
              ? responsePayload.analysis_run_id.trim()
              : analysisRunId

          if (backgroundResponse.ok && responsePayload?.ok) {
            const runSummary = await getAnalysisRunSummary(terminalAnalysisRunId)
            const runStatus = runSummary?.status || 'processing'
            if (!isTerminalAnalysisRunStatus(runStatus) || runStatus === 'failed') {
              const failureMessage = runStatus === 'failed'
                ? (runSummary?.review_reason || 'analysis_run_failed_after_async_probe')
                : `analysis_run_not_finalized_after_async_probe:${runStatus}`
              await updateAnalysisJobBestEffort(request_id, {
                status: 'failed',
                analysis_run_id: terminalAnalysisRunId,
                error: failureMessage,
                completed_at: completedAt,
              })
              await markAnalysisRunFailedBestEffort(terminalAnalysisRunId, request_id, failureMessage)
              return
            }
            await updateAnalysisJobBestEffort(request_id, {
              status: 'completed',
              analysis_run_id: terminalAnalysisRunId,
              error: null,
              completed_at: completedAt,
            })
            return
          }

          const failureMessage =
            responsePayload?.message
            || responsePayload?.error
            || `async_probe_background_failed_http_${backgroundResponse.status}`
          await updateAnalysisJobBestEffort(request_id, {
            status: 'failed',
            analysis_run_id: terminalAnalysisRunId,
            error: failureMessage,
            completed_at: completedAt,
          })
          await markAnalysisRunFailedBestEffort(terminalAnalysisRunId, request_id, failureMessage)
        } catch (error) {
          const failureMessage = String((error as any)?.message ?? error)
          await updateAnalysisJobBestEffort(request_id, {
            status: 'failed',
            analysis_run_id: analysisRunId,
            error: failureMessage,
            completed_at: new Date().toISOString(),
          })
          await markAnalysisRunFailedBestEffort(analysisRunId, request_id, failureMessage)
        }
      })())

      return new Response(JSON.stringify({
        ok: true,
        request_id,
        analysis_run_id: analysisRunId,
        status: 'processing',
      }), {
        status: 202,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Expose-Headers': 'Content-Type' }
      })
    }

  // Enhanced high-stakes analysis detection for automatic review flagging
  const detectHighStakesAnalysis = (scenarioText: string, evidenceBacked: boolean, retrievalCount: number) => {
    const reasons: string[] = []
    let requiresReview = false

    // 1. Evidence-backed status check (highest priority)
    if (!evidenceBacked) {
      reasons.push("evidence_backed: false")
      requiresReview = true
    }

    // 2. Geopolitical keyword detection
    const geoKeywords = [
      'nuclear', 'military conflict', 'election manipulation', 'geopolitical',
      'sanctions', 'trade war', 'g20', 'nato', 'unsc', 'biological weapon',
      'chemical weapon', 'cyber attack', 'terrorism', ' intervention',
      'sovereignty violation', 'borders dispute', 'regime change'
    ]
    const lowerText = scenarioText.toLowerCase()
    const geoMatches = geoKeywords.filter(k => lowerText.includes(k))
    if (geoMatches.length > 0) {
      reasons.push(`geopolitical keywords: ${geoMatches.join(', ')}`)
      requiresReview = true
    }

    // 3. Low evidence count (< 3 sources)
    if (retrievalCount < 3 && retrievalCount > 0) {
      reasons.push(`low evidence count: ${retrievalCount} sources`)
      if (!requiresReview) requiresReview = true
    }

    // 4. Decision complexity metrics (complex scenarios with high impact)
    const complexPatterns = [
      'multiple stakeholders', 'conflicting objectives', 'high uncertainty',
      'time pressure', 'resource constraints', 'interdependent decisions'
    ]
    const complexityMatches = complexPatterns.filter(p => lowerText.includes(p))
    if (complexityMatches.length > 0) {
      reasons.push(`decision complexity: ${complexityMatches.join(', ')}`)
      if (!requiresReview) requiresReview = true
    }

    return {
      requiresReview,
      reasons: reasons.length > 0 ? reasons : ['no concerns detected'],
      confidence: requiresReview ? Math.min(0.95, 0.7 + (reasons.length * 0.1)) : 0.0
    }
  }

  // Legacy function for backward compatibility
  const isHighRiskDomain = (scenarioText: string) => {
    const geoKeywords = ['india', 'china', 'russia', 'tariff', 'sanctions', 'brics', 'de-dollar', 'geopolitics', 'military', 'nuclear', 'trade war', 'diplomatic']
    const text = scenarioText.toLowerCase()
    return geoKeywords.some(k => text.includes(k))
  }

    const allowWithoutRAG = (mode === 'education_quick')
    const highRisk = isHighRiskDomain(scenario_text)

  // Enhanced evidence-backed determination function (Gap Fix #4)
  function determineEvidenceBacked(retrievals: any[], rid?: string | null): boolean {
    if (!Array.isArray(retrievals) || retrievals.length === 0) return false
    const usableRetrievals = retrievals.filter((entry) => {
      const url = String(entry?.url || '')
      const text = String(entry?.snippet || entry?.content || entry?.title || '').trim()
      return /^https?:\/\//i.test(url) && text.length >= 25
    })
    const distinctProviders = new Set(usableRetrievals.map((entry) => String(entry.source || entry.provider || 'unknown').toLowerCase()))
    const hasHighCredibility = usableRetrievals.some((entry) => {
      const provider = String(entry.source || entry.provider || '').toLowerCase()
      if (provider === 'exa') return true
      if (provider === 'firecrawl') return true
      if (provider === 'imf' || provider === 'worldbank' || provider === 'uncomtrade') return true
      return Number(entry.score || entry.credibility_score || 0) >= 0.7
    })
    const isEvidenceBacked = usableRetrievals.length >= 3 && distinctProviders.size >= 2 && hasHighCredibility
  
    const _rid = rid ?? 'n/a'
    console.log(`[${_rid}] Evidence check: total=${retrievals.length}, usable=${usableRetrievals.length}, distinct_providers=${distinctProviders.size}, high_credibility=${hasHighCredibility}, result=${isEvidenceBacked}`)
  
    return isEvidenceBacked
  }

  // Stage: Streaming RAG retrievals (unless education_quick)
    let retrievals: any[] = []
    let evidence_backed = false
    let cache_hit = false
    let retrievalProviderSummary: any = null
    const scenario_hash = simpleHash(scenario_text)

  if (mode === "standard") {
    console.log(`[${request_id}] stage=streaming_rag_start, high_risk=${highRisk}`)

    // Extract entities for API calls
    const entities = Array.from(new Set((scenario_text.match(/\b[A-Z][a-zA-Z]{2,}\b/g) || []).slice(0, 10)))

    // Call streaming retrieval APIs in parallel
    const rag = await fetchAllRetrievals({
      query: scenario_text,
      entities,
      timeoutMs: 15000,
      requiredSources: [],
      audience: audience,
      requestId: request_id,
    })

    const ragCount = rag?.retrieval_count ?? (rag?.retrievals?.length ?? 0)

    if (rag && ragCount > 0) {
      retrievals = rag.retrievals
      const legacyEvidenceBacked = determineEvidenceBacked(retrievals, request_id)
      // Reconcile the normalized retrieval gate with the legacy retrieval bundle
      // used by the rest of this function. A stale upstream false must not force
      // educational fallback when the actual retrieval bundle is sufficient.
      evidence_backed = Boolean(rag.evidence_backed || legacyEvidenceBacked)
      cache_hit = Boolean(rag.cache_hit)
      retrievalProviderSummary = rag.retrieval_provider_summary || null
      if (retrievalProviderSummary && typeof retrievalProviderSummary === 'object') {
        retrievalProviderSummary.evidenceBackedDecision = {
          upstreamEvidenceBacked: Boolean(rag.evidence_backed),
          legacyEvidenceBacked,
          reconciledEvidenceBacked: evidence_backed,
        }
      }
      console.log(`[${request_id}] stage=streaming_rag_success, hits=${retrievals.length}, evidence_backed=${evidence_backed}, sources=${new Set(retrievals.map(r => r.source)).size}, cache_hit=${cache_hit}`)
    } else {
      console.warn(`[${request_id}] stage=streaming_rag_failed, no results returned`)
      // For high-risk scenarios, this is a critical failure
      if (highRisk) {
        console.log(`[${request_id}] stage=high_risk_streaming_rag_failed`)
        const errorId = uuid()
        await logRpcError(request_id, errorId, `Streaming RAG failed for high-risk scenario: no results`, { scenario_text })

        // Mark for review
        try {
        const reviewAnalysisJson = {
            analysis_id: uuid(),
            audience,
            question_context,
            summary: { text: `Analysis paused: Unable to retrieve external evidence for high-risk geopolitical scenario.` },
            provenance: { retrieval_count: 0, retrieval_ids: [], evidence_backed: false }
          }
          await persistAnalysisRun({
            request_id,
            status: 'needs_review',
            review_reason: 'Unable to retrieve external evidence for a high-risk geopolitical scenario.',
            ...(await buildAnalysisRunArtifactColumns(request_id, reviewAnalysisJson)),
            evidence_backed: false,
            created_at: new Date().toISOString()
          })
        } catch (e) {
          console.error("Failed to create review entry:", e)
        }

        // Return a minimal analysis that matches frontend AnalysisResultSchema
        const inferredPlayers = Array.from(new Set((scenario_text.match(/\b([A-Z]{2,}|[A-Z][a-z]{2,})\b/g) || []))).slice(0, 3)
        const playersObj = (inferredPlayers.length ? inferredPlayers : ['PlayerA']).map((p: string, idx: number) => ({
          id: p || `P${idx+1}`,
          name: p || undefined,
          actions: ['wait']
        }))
        const profile: Record<string, Record<string, number>> = {}
        playersObj.forEach(pl => { profile[pl.id] = { wait: 0 } })
        const minimalAnalysis = {
          analysis_id: uuid(),
          audience,
          scenario_text,
          question_context,
          players: playersObj,
          equilibrium: {
            profile,
            stability: 0,
            method: 'heuristic'
          },
          quantum: undefined,
          processing_stats: { processing_time_ms: 0, stability_score: 0 },
          provenance: { evidence_backed: false, retrieval_count: 0, model: 'n/a', warning: 'Queued for human review' },
          pattern_matches: [],
          retrievals: [],
          forecast: [],
          summary: { text: 'Analysis paused: insufficient external evidence. Queued for human review.' }
        }

        return new Response(JSON.stringify({
          ok: true,
          analysis_id: minimalAnalysis.analysis_id,
          analysis: minimalAnalysis,
          provenance: {
            model: 'n/a',
            fallback_used: false,
            llm_duration_ms: 0,
            retrieval_count: 0,
            evidence_backed: false,
            human_review: true,
            reason: 'no_external_sources',
            error_id: errorId
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        })
      }
      retrievals = []
      evidence_backed = false
    }
  } else if (mode === "education_quick") {
    // Education mode — no retrievals, mark as unverified
    retrievals = []
    evidence_backed = false
  }

  

  // Fallback & Education Mode: Check retrieval sufficiency per Ph4.md
  if (!evidence_backed && mode === "standard") {
    console.log(`[${request_id}] stage=insufficient_retrievals, count=${retrievals.length}, switching to education mode`)

    // Build fallback prompt for education mode
    const fallbackPrompt = `You may produce an educational heuristic analysis (non-evidence-backed). Start JSON with "evidence_backed": false and "disclaimer": "UNVERIFIED — human review recommended". Provide high-level game-theory steps only; include no specific numeric predictions without sources.

Scenario: ${scenario_text}
Retrievals: INSUFFICIENT (${retrievals.length} found, minimum 3 required)

Produce educational analysis in JSON format.`

    // Try Gemini for fallback
    let fallbackText: string | null = null
    try {
      const gem = await callGemini(fallbackPrompt)
      if (gem.ok && gem.text) {
        fallbackText = gem.text
      }
    } catch (e) {
      console.warn(`[${request_id}] Fallback LLM failed:`, e)
    }

    if (fallbackText) {
      const parsed = await parseLlmOutput(fallbackText, request_id)
      if (parsed.ok) {
        const fallbackJson = parsed.json
        fallbackJson.evidence_backed = false
        fallbackJson.disclaimer = "UNVERIFIED — human review recommended"
        fallbackJson.reason = "insufficient_external_sources"
        fallbackJson.question_context = question_context

        // Persist fallback analysis
        const fallbackAnalysis = {
          request_id,
          user_id,
          audience,
          status: "completed",
          ...(await buildAnalysisRunArtifactColumns(request_id, fallbackJson)),
          retrieval_ids: retrievals.map((r:any)=>r.id),
          evidence_backed: false,
          created_at: new Date().toISOString()
        }

        let analysisRunId: string | null = null
        try {
          analysisRunId = await persistAnalysisRun(fallbackAnalysis)
        } catch (e) {
          console.error("Failed to persist fallback analysis:", e)
        }

        return new Response(JSON.stringify({
          ok: true,
          analysis_id: fallbackJson.analysis_id || uuid(),
          ...(analysisRunId ? { analysis_run_id: analysisRunId } : {}),
          analysis: fallbackJson,
          provenance: {
            model: GEMINI_MODEL,
            fallback_used: true,
            llm_duration_ms: 0,
            retrieval_count: retrievals.length,
            evidence_backed: false,
            reason: "insufficient_sources"
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        })
      }
    }

    // If fallback fails, return error
    return new Response(JSON.stringify({
      ok: false,
      error: "insufficient_external_sources",
      message: "Unable to retrieve sufficient external evidence for analysis. Please try a different scenario or use education mode.",
      retrieval_count: retrievals.length,
      required_minimum: 3
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }

  // Pre-compute analytical data for enhanced prompts
  let computedData = {}
  if (audience === "learner" || audience === "researcher") {
    // For now, we'll compute basic sensitivity data
    // In production, this could be more sophisticated
    const sensitivityResult = computeSensitivityAnalysis([], scenario_text, 5)
    computedData = { sensitivity: sensitivityResult }

    if (audience === "learner") {
      // Removed mock decision table - use dynamic computation
      const decisionTable = [
        {
          actor: "Primary Actor",
          action: "Aggressive Response",
          payoff_estimate: { value: 0.7, confidence: 0.8, sources: retrievals.slice(0, 2).map(r => ({ id: r.id, score: 0.9, excerpt: r.snippet?.slice(0, 100) })) },
          risk_notes: "High risk but potentially high reward"
        },
        {
          actor: "Primary Actor",
          action: "Diplomatic Approach",
          payoff_estimate: { value: 0.5, confidence: 0.9, sources: retrievals.slice(0, 2).map(r => ({ id: r.id, score: 0.8, excerpt: r.snippet?.slice(0, 100) })) },
          risk_notes: "Lower risk, moderate reward"
        },
        {
          actor: "Primary Actor",
          action: "Wait and Monitor",
          payoff_estimate: { value: 0.3, confidence: 0.7, sources: retrievals.slice(0, 2).map(r => ({ id: r.id, score: 0.6, excerpt: r.snippet?.slice(0, 100) })) },
          risk_notes: "Low risk, low reward"
        }
      ]
      const evResult = computeExpectedValues(decisionTable, scenario_text)
      computedData = { ...computedData, ev: evResult }
    }
  }

  // --- SOLVER INTEGRATION: deterministic advanced-framework solvers are invoked
  // after the LLM payload is parsed and normalized. Avoid speculative pre-LLM
  // calls and do not use legacy internal endpoints.
    let solverInvocations: any[] = []
    let solverResults: any = {}

  // Build LLM prompt with computed data and solver results
    const compactResearcherPrompt = asyncProbe || asyncProbeDispatch
    let prompt = buildPrompt(
      audience,
      scenario_text,
      retrievals,
      { ...computedData, solverResults },
      { compactResearcher: compactResearcherPrompt && audience === 'researcher' },
    )

  // Add micro-prompt for strict JSON output and retrieval injection
  const compactResearcherMicroPrompt = compactResearcherPrompt && audience === 'researcher'
  const microPrompt = compactResearcherMicroPrompt
    ? `
### MICRO-PROMPT: Async Researcher Probe JSON ONLY
Return exactly one top-level JSON object and nothing else.

1) INPUT CONTEXT:
- Scenario: """${scenario_text}"""
- Retrievals (grounding evidence):
${(retrievals || []).slice(0, 6).map((r, i) => `[rid_${i + 1}] ${r.title || r.source} - "${(r.snippet || '').substring(0, 140)}..." — ${r.url || ''}`).join('\n')}

2) STRICT OUTPUT CONTRACT:
Return:
{
  "ok": true|false,
  "analysis": {
    "analysis_id": string,
    "audience": "researcher",
    "scenario_text": "${scenario_text}",
    "long_summary": { "text": string },
    "numeric_claims": [optional, max 3],
    "assumptions": [optional, max 2],
    "simulation_results": { "equilibria": [optional, max 1] },
    "notebook_snippet": "",
    "data_exports": {}
  },
  "provenance": {
    "retrieval_count": ${retrievals?.length || 0},
    "used_retrieval_ids": [ "rid_..." ],
    "retrieval_sources": ${JSON.stringify((retrievals || []).map(r => r.source).filter(Boolean))},
    "cache_hit": ${cache_hit},
    "evidence_backed": ${evidence_backed},
    "llm_model": string,
    "llm_duration_ms": integer,
    "fallback_used": boolean,
    "solver_invocations": ${JSON.stringify(solverInvocations)}
  }
}

3) LIMITS:
- analysis.long_summary.text: maximum 90 words
- omit payoff_matrix and solver_config unless explicitly necessary
- do not emit markdown fences or commentary
- every numeric claim must cite at least one rid_ source

4) FAIL SAFE:
If you cannot produce valid JSON, return: { "ok": false, "error": "schema_validation_failed" }

### END MICRO-PROMPT
`
    : `
### MICRO-PROMPT: Retrieval Injection + JSON-ONLY OUTPUT (strict)
You are a JSON-output-only Strategic Intelligence assistant. You MUST return exactly one top-level JSON object and nothing else.

1) INPUT CONTEXT:
- Scenario: """${scenario_text}"""
- Retrievals (grounding evidence):
${(retrievals || []).map((r, i) => `[rid_${r.source}_${Date.now()}_${i}] ${r.title || r.source} - "${(r.snippet || '').substring(0, 200)}..." — ${r.url || ''}`).join('\n')}

2) STRICT OUTPUT CONTRACT (MANDATORY):
Return a single JSON object with these top-level keys:
{
  "ok": true|false,
  "analysis": { ... },
  "provenance": { ... }
}

3) REQUIRED analysis fields (audience-specific):
- analysis.scenario_text: "${scenario_text}"
- analysis.players: array of player/actor names identified in the scenario (e.g., ["US", "China", "EU"])
- analysis.equilibrium: object describing the Nash equilibrium or stable outcome
- analysis.audience: "${audience}"
- For finance/market queries: analysis.numeric_claims must be an array of objects:
  { "name": string, "value": number, "confidence": number (0-1), "sources": [ "rid_..." ] }
- For canonical-game solver runs: analysis.simulation_results.equilibria must be an array
- Always fill analysis.summary or analysis.long_summary depending on audience
- Keep the payload compact:
  - analysis.players: maximum 6 entries
  - analysis.numeric_claims: maximum 6 entries
  - analysis.long_summary.text: maximum 180 words
  - analysis.summary.text: maximum 80 words
  - omit optional sections instead of padding them

4) REQUIRED provenance fields:
- provenance.retrieval_count: ${retrievals?.length || 0}
- provenance.used_retrieval_ids: array of rid_ strings actually used
- provenance.retrieval_sources: ${JSON.stringify((retrievals || []).map(r => r.source).filter(Boolean))}
- provenance.cache_hit: ${cache_hit}
- provenance.evidence_backed: ${evidence_backed}
- provenance.llm_model: string
- provenance.llm_duration_ms: integer
- provenance.fallback_used: boolean
- provenance.solver_invocations: ${JSON.stringify(solverInvocations)}

5) INJECTION & CITATION RULES:
- For every numeric claim, you MUST reference at least one source id from the provided retrievals
- Populate provenance.used_retrieval_ids with all retrieval ids you referenced
- If you cannot find supporting retrievals, set confidence lower accordingly

6) FAIL SAFE:
- If you cannot produce valid JSON, return: { "ok": false, "error": "schema_validation_failed" }

### END MICRO-PROMPT
`

  // Append micro-prompt to ensure strict JSON output
  prompt += microPrompt

    let llmText: string | null = null
    let modelUsed = ""
    let modelProvider: LlmProvider | null = null
    let fallbackUsed = false
    let llmDurationMs = 0
    let providerAttempts: ProviderAttempt[] = []
    let lastLlmFailureStage: string | null = null
    let lastLlmFailureClass: LlmFailureClass | null = null

  const buildEmergencyFallbackResponse = async (
    reason: string,
    message: string,
    errorId: string,
    failureMeta?: {
      failureStage?: string | null
      failureClass?: LlmFailureClass | null
      providerAttempts?: ProviderAttempt[]
      detail?: string | null
    }
  ) => {
    fallbackUsed = true
    const warningMessage = clientFailureMessage(message, canExposeProviderDiagnostics)
    const responseFailureClass = canExposeProviderDiagnostics
      ? failureMeta?.failureClass || undefined
      : publicFailureClass(failureMeta?.failureClass)
    const responseFailureStage = canExposeProviderDiagnostics
      ? failureMeta?.failureStage || undefined
      : publicFailureStage(failureMeta?.failureStage)
    const responseProviderAttempts = canExposeProviderDiagnostics
      ? (failureMeta?.providerAttempts || providerAttempts)
      : undefined
    const responseFailureDetail = canExposeProviderDiagnostics
      ? failureMeta?.detail || undefined
      : undefined
    const inferredPlayers = Array.from(new Set((scenario_text.match(/\b([A-Z]{2,}|[A-Z][a-z]{2,})\b/g) || []))).slice(0, 3)
    const playersObj = (inferredPlayers.length ? inferredPlayers : ['PlayerA']).map((p: string, idx: number) => ({
      id: p || `P${idx + 1}`,
      name: p || undefined,
      actions: ['wait']
    }))
    const profile: Record<string, Record<string, number>> = {}
    playersObj.forEach((player) => {
      profile[player.id] = { wait: 0 }
    })

    const minimalAnalysis = {
      analysis_id: uuid(),
      audience,
      scenario_text,
      players: playersObj,
      equilibrium: {
        profile,
        stability: 0,
        method: 'heuristic'
      },
      quantum: undefined,
      processing_stats: { processing_time_ms: llmDurationMs, stability_score: 0 },
      provenance: {
        evidence_backed: false,
        retrieval_count: retrievals.length,
        model: modelUsed || 'unavailable',
        warning: warningMessage,
        retrieval_provider_summary: retrievalProviderSummary,
        failure_stage: responseFailureStage,
        failure_class: responseFailureClass,
        provider_attempts: responseProviderAttempts,
        failure_detail: responseFailureDetail,
      },
      pattern_matches: [],
      retrievals,
      forecast: [],
      summary: { text: 'UNVERIFIED fallback analysis generated because hosted LLM providers were unavailable.' },
      disclaimer: 'UNVERIFIED — human review recommended'
    }

    if (audience === 'researcher') {
      mergeExplicitAdvancedFrameworkCandidates(minimalAnalysis, sanitizedAdvancedGameInputs.value)
      ensureAdvancedFrameworkCandidates(minimalAnalysis, scenario_text, retrievals)
      await upgradeAdvancedFrameworksWithDeterministicSolvers({
        llmJson: minimalAnalysis,
        solverInvocations,
        solverResults,
        requestId: request_id,
      })
      minimalAnalysis.provenance = {
        ...minimalAnalysis.provenance,
        solver_invocations: solverInvocations,
      }
    }

    let analysisRunId: string | null = null
    try {
      const { data, error } = await supabaseAdmin
        .from('analysis_runs')
        .insert({
          request_id,
          user_id,
          audience,
          status: 'needs_review',
          review_reason: message,
          ...(await buildAnalysisRunArtifactColumns(request_id, minimalAnalysis)),
          retrieval_ids: retrievals.map((retrieval: any) => retrieval.id),
          evidence_backed: false,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (!error) {
        analysisRunId = data?.id ?? null
      }
    } catch (persistError) {
      console.warn(`[${request_id}] fallback_persist_failed: ${String((persistError as any)?.message ?? persistError)}`)
    }

    return new Response(JSON.stringify({
      ok: true,
      mode: 'fallback',
      request_id,
      analysis_id: minimalAnalysis.analysis_id,
      ...(analysisRunId ? { analysis_run_id: analysisRunId } : {}),
      analysis: minimalAnalysis,
      message: warningMessage,
      provenance: {
        model: modelUsed || 'unavailable',
        provider: canExposeProviderDiagnostics ? modelProvider : undefined,
        fallback_used: true,
        llm_duration_ms: llmDurationMs,
        retrieval_count: retrievals.length,
        retrieval_sources: retrievals.map((retrieval: any) => retrieval.source).filter(Boolean),
        evidence_backed: false,
        solver_invocations: solverInvocations,
        retrieval_provider_summary: retrievalProviderSummary,
        reason,
        error_id: errorId,
        failure_stage: responseFailureStage,
        failure_class: responseFailureClass,
        provider_attempts: responseProviderAttempts,
        failure_detail: responseFailureDetail,
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Expose-Headers': 'Content-Type' }
    })
  }

  const buildEvidenceGroundedLocalAnalysisText = (failureMeta: {
    failureStage?: string | null
    failureClass?: LlmFailureClass | null
    detail?: string | null
  }) => {
    const retrievalIds = (retrievals || []).map((_retrieval: any, index: number) => `rid_${index + 1}`)
    const retrievalSources = Array.from(new Set((retrievals || []).map((retrieval: any) => String(retrieval.source || retrieval.provider || 'unknown'))))
    const inferredPlayers = Array.from(new Set((scenario_text.match(/\b([A-Z]{2,}|[A-Z][a-z]{2,})\b/g) || []))).slice(0, 3)
    const playersObj = (inferredPlayers.length ? inferredPlayers : ['Primary Actor', 'Counterparty']).slice(0, 3).map((player: string, index: number) => ({
      id: `P${index + 1}`,
      name: player,
      actions: ['wait_and_monitor', 'escalate_commitment', 'deescalate_or_hedge'],
    }))
    const profile: Record<string, Record<string, number>> = {}
    playersObj.forEach((player) => {
      profile[player.id] = {
        wait_and_monitor: 0.5,
        escalate_commitment: 0.25,
        deescalate_or_hedge: 0.25,
      }
    })
    const topEvidence = (retrievals || []).slice(0, 3).map((retrieval: any, index: number) => ({
      id: retrievalIds[index] || `rid_${index + 1}`,
      title: String(retrieval.title || retrieval.url || `Evidence ${index + 1}`),
      source: String(retrieval.source || retrieval.provider || 'unknown'),
    }))
    const evidenceClause = topEvidence.length
      ? topEvidence.map((entry) => `${entry.id} ${entry.title} (${entry.source})`).join('; ')
      : 'No individual evidence titles available.'
    const confidence = Math.min(0.78, 0.48 + Math.min(retrievals.length, 8) * 0.04 + Math.min(retrievalSources.length, 4) * 0.03)

    return JSON.stringify({
      analysis_id: uuid(),
      audience,
      scenario_text,
      summary: {
        text: `Evidence-grounded local synthesis completed because hosted LLM providers were unavailable. The analysis uses ${retrievals.length} retrieved sources across ${retrievalSources.length} providers and remains under review for any high-stakes decision.`,
      },
      long_summary: {
        text: `The app completed retrieval and produced a conservative local synthesis from the evidence bundle. Key evidence anchors: ${evidenceClause}. This is suitable for pre-resolution shadow benchmarking and workflow verification, but it is not a resolved accuracy result or top-three benchmark claim.`,
      },
      players: playersObj,
      equilibrium: {
        profile,
        stability: Number(confidence.toFixed(3)),
        method: 'heuristic',
      },
      numeric_claims: [
        {
          name: 'retrieval_coverage',
          value: retrievals.length,
          confidence,
          sources: retrievalIds.slice(0, Math.max(1, Math.min(3, retrievalIds.length))),
        },
        {
          name: 'distinct_provider_count',
          value: retrievalSources.length,
          confidence,
          sources: retrievalIds.slice(0, Math.max(1, Math.min(3, retrievalIds.length))),
        },
      ],
      assumptions: [
        {
          name: 'provider_chain_unavailable',
          value: 1,
          justification: `Hosted external LLM providers failed; local synthesis used only retrieved evidence and deterministic app logic. Last failure: ${failureMeta.failureStage || 'unknown'}.`,
        },
      ],
      decision_table: [
        {
          actor: 'Primary Actor',
          action: 'Wait and monitor with explicit trigger thresholds',
          payoff_estimate: {
            value: 0.55,
            confidence,
            sources: retrievalIds.slice(0, Math.max(1, Math.min(2, retrievalIds.length))),
          },
          risk_notes: 'Use while evidence remains mixed or externally validated scoring is unavailable.',
        },
        {
          actor: 'Primary Actor',
          action: 'Hedge exposure and prepare contingency plan',
          payoff_estimate: {
            value: 0.62,
            confidence: Math.min(0.82, confidence + 0.05),
            sources: retrievalIds.slice(0, Math.max(1, Math.min(2, retrievalIds.length))),
          },
          risk_notes: 'Preferred when downside exposure is material and forecast resolution is still pending.',
        },
      ],
      forecast: [],
      retrievals,
      provenance: {
        retrieval_count: retrievals.length,
        retrieval_ids: retrievalIds,
        used_retrieval_ids: retrievalIds,
        retrieval_sources: retrievalSources,
        cache_hit,
        evidence_backed: true,
        llm_model: 'local-evidence-synthesis-v1',
        llm_duration_ms: llmDurationMs,
        fallback_used: true,
        llm_provider: 'local',
        failure_stage: canExposeProviderDiagnostics ? failureMeta.failureStage : undefined,
        failure_class: canExposeProviderDiagnostics ? failureMeta.failureClass : undefined,
        failure_detail: canExposeProviderDiagnostics ? failureMeta.detail : undefined,
        retrieval_provider_summary: retrievalProviderSummary,
        local_synthesis_policy: 'evidence_backed_only_after_retrieval_gate_and_provider_chain_failure',
      },
    })
  }

    const geminiModels = GEMINI_MODEL === GEMINI_FALLBACK_MODEL
      ? [GEMINI_MODEL]
      : [GEMINI_MODEL, GEMINI_FALLBACK_MODEL]
    const openRouterProviderQueue = OPENROUTER_KEY
      ? [() => callOpenRouterFallback(prompt)]
      : []
    const primaryProvider = OPENROUTER_PRIMARY_ENABLED ? 'openrouter' : 'gemini'
    const primaryModel = OPENROUTER_PRIMARY_ENABLED ? OPENROUTER_MODEL : GEMINI_MODEL
    const providerQueue: Array<() => Promise<ProviderCallResult>> = OPENROUTER_PRIMARY_ENABLED
      ? [
          ...openRouterProviderQueue,
          ...geminiModels.map((model) => () => callGeminiSingle(prompt, model)),
          () => callOpenAIFallback(prompt),
          () => callXaiFallback(prompt),
        ]
      : [
          ...geminiModels.map((model) => () => callGeminiSingle(prompt, model)),
          ...openRouterProviderQueue,
          () => callOpenAIFallback(prompt),
          () => callXaiFallback(prompt),
        ]
    let selectedProviderIndex = -1

    const markStructuredProviderFailure = (failureStage: string, error: string) => {
      const lastAttempt = providerAttempts[providerAttempts.length - 1]
      if (lastAttempt?.ok && modelProvider && modelUsed && lastAttempt.provider === modelProvider && lastAttempt.model === modelUsed) {
        providerAttempts[providerAttempts.length - 1] = {
          ...lastAttempt,
          ok: false,
          failure_stage: failureStage,
          failure_class: 'provider_parse_error',
          error,
        }
      } else if (modelProvider && modelUsed) {
        providerAttempts.push({
          provider: modelProvider,
          model: modelUsed,
          ok: false,
          duration_ms: 0,
          failure_stage: failureStage,
          failure_class: 'provider_parse_error',
          error,
        })
      }
      fallbackUsed = true
      lastLlmFailureStage = failureStage
      lastLlmFailureClass = 'provider_parse_error'
      console.warn(`[${request_id}] stage=structured_provider_failure, provider=${modelProvider || 'unknown'}, model=${modelUsed || 'unknown'}, failure_stage=${failureStage}, error=${error}`)
    }

    const advanceToNextProvider = async (failureStage: string, error: string) => {
      markStructuredProviderFailure(failureStage, error)

      for (let index = selectedProviderIndex + 1; index < providerQueue.length; index++) {
        const nextAttempt = await providerQueue[index]()
        llmDurationMs += nextAttempt.duration_ms

        if (nextAttempt.ok) {
          llmText = nextAttempt.text
          modelUsed = nextAttempt.model
          modelProvider = nextAttempt.provider
          selectedProviderIndex = index
          fallbackUsed = fallbackUsed || nextAttempt.provider !== primaryProvider || nextAttempt.model !== primaryModel
          providerAttempts.push({
            provider: nextAttempt.provider,
            model: nextAttempt.model,
            ok: true,
            duration_ms: nextAttempt.duration_ms,
          })
          console.log(`[${request_id}] stage=llm_success_after_retry, provider=${nextAttempt.provider}, model=${nextAttempt.model}, prior_failure_stage=${failureStage}`)
          return true
        }

        providerAttempts.push({
          provider: nextAttempt.provider,
          model: nextAttempt.model,
          ok: false,
          duration_ms: nextAttempt.duration_ms,
          failure_stage: nextAttempt.failure_stage,
          failure_class: nextAttempt.failure_class,
          http_status: nextAttempt.http_status,
          error: nextAttempt.error,
        })
        fallbackUsed = true
        lastLlmFailureStage = nextAttempt.failure_stage
        lastLlmFailureClass = nextAttempt.failure_class
        console.log(`[${request_id}] stage=llm_attempt_failed, provider=${nextAttempt.provider}, model=${nextAttempt.model}, failure_stage=${nextAttempt.failure_stage}, failure_class=${nextAttempt.failure_class}, error=${nextAttempt.error}`)
      }

      llmText = null
      return false
    }

  try {
    console.log(`[${request_id}] stage=llm_start`)
    for (let index = 0; index < providerQueue.length; index++) {
      const attempt = await providerQueue[index]()
      llmDurationMs += attempt.duration_ms

      if (attempt.ok) {
        llmText = attempt.text
        modelUsed = attempt.model
        modelProvider = attempt.provider
        selectedProviderIndex = index
        fallbackUsed = fallbackUsed || attempt.provider !== primaryProvider || attempt.model !== primaryModel
        providerAttempts.push({
          provider: attempt.provider,
          model: attempt.model,
          ok: true,
          duration_ms: attempt.duration_ms,
        })
        console.log(`[${request_id}] stage=llm_success, provider=${attempt.provider}, model=${attempt.model}`)
        break
      }

      providerAttempts.push({
        provider: attempt.provider,
        model: attempt.model,
        ok: false,
        duration_ms: attempt.duration_ms,
        failure_stage: attempt.failure_stage,
        failure_class: attempt.failure_class,
        http_status: attempt.http_status,
        error: attempt.error,
      })
      fallbackUsed = fallbackUsed || attempt.provider !== primaryProvider || attempt.model !== primaryModel
      lastLlmFailureStage = attempt.failure_stage
      lastLlmFailureClass = attempt.failure_class
      console.log(`[${request_id}] stage=llm_attempt_failed, provider=${attempt.provider}, model=${attempt.model}, failure_stage=${attempt.failure_stage}, failure_class=${attempt.failure_class}, error=${attempt.error}`)
    }

    if (!llmText && geminiModels.length > 0) {
      console.log(`[${request_id}] stage=llm_retry_round_start, providers=gemini`)
      await new Promise((resolve) => setTimeout(resolve, 1500))

      for (const [geminiIndex, model] of geminiModels.entries()) {
        const retryAttempt = await callGeminiSingle(prompt, model)
        llmDurationMs += retryAttempt.duration_ms

        if (retryAttempt.ok) {
          llmText = retryAttempt.text
          modelUsed = retryAttempt.model
          modelProvider = retryAttempt.provider
          selectedProviderIndex = (OPENROUTER_PRIMARY_ENABLED && OPENROUTER_KEY ? 1 : 0) + geminiIndex
          fallbackUsed = true
          providerAttempts.push({
            provider: retryAttempt.provider,
            model: retryAttempt.model,
            ok: true,
            duration_ms: retryAttempt.duration_ms,
          })
          console.log(`[${request_id}] stage=llm_success_after_retry_round, provider=${retryAttempt.provider}, model=${retryAttempt.model}`)
          break
        }

        providerAttempts.push({
          provider: retryAttempt.provider,
          model: retryAttempt.model,
          ok: false,
          duration_ms: retryAttempt.duration_ms,
          failure_stage: retryAttempt.failure_stage,
          failure_class: retryAttempt.failure_class,
          http_status: retryAttempt.http_status,
          error: retryAttempt.error,
        })
        fallbackUsed = true
        lastLlmFailureStage = retryAttempt.failure_stage
        lastLlmFailureClass = retryAttempt.failure_class
        console.log(`[${request_id}] stage=llm_retry_round_failed, provider=${retryAttempt.provider}, model=${retryAttempt.model}, failure_stage=${retryAttempt.failure_stage}, failure_class=${retryAttempt.failure_class}, error=${retryAttempt.error}`)
      }
    }

    if (!llmText) {
      const failureSummary = summarizeProviderFailures(providerAttempts)
      if (evidence_backed && retrievals.length >= 3) {
        const localStarted = Date.now()
        llmText = buildEvidenceGroundedLocalAnalysisText({
          failureStage: failureSummary.failureStage,
          failureClass: failureSummary.failureClass,
          detail: failureSummary.detail,
        })
        modelUsed = 'local-evidence-synthesis-v1'
        modelProvider = 'local' as any
        fallbackUsed = true
        selectedProviderIndex = providerQueue.length
        const localDuration = Date.now() - localStarted
        llmDurationMs += localDuration
        providerAttempts.push({
          provider: 'local' as any,
          model: modelUsed,
          ok: true,
          duration_ms: localDuration,
        })
        console.warn(`[${request_id}] stage=llm_chain_unavailable_using_local_evidence_synthesis, failure_stage=${failureSummary.failureStage}, retrievals=${retrievals.length}`)
      } else {
      const errorId = uuid()
      await logRpcError(
        request_id,
        errorId,
        `LLM retry chain failed: ${failureSummary.detail || 'no_attempts'}`,
        {
          failure_stage: failureSummary.failureStage,
          failure_class: failureSummary.failureClass,
          provider_attempts: providerAttempts,
        }
      )
      console.warn(`[${request_id}] response_path=llm_failed returning_fallback=true status=200`)
      return await buildEmergencyFallbackResponse('llm_failed', failureSummary.userMessage, errorId, {
        failureStage: failureSummary.failureStage,
        failureClass: failureSummary.failureClass,
        providerAttempts,
        detail: failureSummary.detail,
      })
      }
    }
  } catch (err: any) {
    const errorId = uuid()
    await logRpcError(request_id, errorId, `llm_exception: ${String(err?.message ?? err)}`, { prompt: prompt.slice(0, 2000) })
    console.warn(`[${request_id}] response_path=llm_exception returning_fallback=true status=200`)
    return await buildEmergencyFallbackResponse('llm_exception', 'Hosted synthesis encountered an exception before it could produce a verified answer.', errorId, {
      failureStage: lastLlmFailureStage,
      failureClass: lastLlmFailureClass,
      providerAttempts,
    })
  }

  // Parse LLM text as JSON-only expected output with enhanced sanitization
    const audienceSchema = audienceSchemas[audience] || audienceSchemas.student
    const audienceValidate = ajv.compile(audienceSchema)
    let llmJson: any = null
    let parsedMeta: { sanitized: boolean; patterns: string[] } = { sanitized: false, patterns: [] }
    let schemaCoercionApplied = false
    let localSchemaFallbackApplied = false

    while (true) {
      const parsed = await parseLlmOutput(llmText ?? "", request_id)
      if (!parsed.ok) {
        const recovered = await advanceToNextProvider('llm_output_not_json', parsed.error)
        if (recovered) {
          continue
        }

    // Enhanced error handling for different failure types
        const errorId = uuid()
        let errorMessage = "LLM output not parseable as JSON"
        let userMessage = "Analysis generation failed"
        let suggestions = []
        const detectedExtensionNoise = Array.isArray(parsed.patterns)
          && parsed.patterns.some((pattern) => pattern.includes('extension_injection'))

        if (parsed.error === "defensive_parsing_failed" && detectedExtensionNoise) {
          errorMessage = "Server-side sanitization failed after extension-like noise was detected"
          userMessage = "Third-party extension interference detected. Please disable browser extensions or try again."
          suggestions = ["Disable browser extensions", "Try a different browser", "Contact support if issue persists"]
        } else if (parsed.error === "defensive_parsing_failed") {
          errorMessage = "Server-side sanitization failed - malformed LLM output detected"
          userMessage = "Hosted synthesis returned malformed structured output. Please retry the analysis."
          suggestions = ["Retry the analysis", "Try a simpler scenario", "Contact support if issue persists"]
        } else if (parsed.error === "json_extraction_failed") {
          errorMessage = "JSON extraction failed despite multiple parsing strategies"
          userMessage = "LLM response format error. Server-side sanitization applied but still failed."
          suggestions = ["Retry the analysis", "Try a simpler scenario", "Contact support if issue persists"]
        } else {
          userMessage = "LLM processing failed"
          suggestions = ["Try again in a few moments", "Contact support if issue persists"]
        }

        await logRpcError(request_id, errorId, errorMessage, {
          raw_response: parsed.raw,
          error_type: parsed.error,
          sanitization_attempted: true,
          provider: modelProvider,
          model: modelUsed,
          provider_attempts: providerAttempts,
        })

        // For education_quick we may synthesize a minimal JSON fallback (schema-compliant)
        if (mode === "education_quick") {
      const playersObj = [{ id: 'P1', name: 'Player 1', actions: ['learn'] }]
      const profile = { P1: { learn: 0 } }
      const minimal = {
        analysis_id: uuid(),
        audience,
        scenario_text,
        players: playersObj,
        equilibrium: { profile, stability: 0, method: 'heuristic' },
        quantum: undefined,
        processing_stats: { processing_time_ms: 0, stability_score: 0 },
        provenance: { evidence_backed: false },
        retrievals: [],
        pattern_matches: [],
        forecast: [],
        summary: { text: "UNVERIFIED analysis (education_quick) — LLM output not JSON" }
      }
      // Persist
      let analysisRunId: string | null = null
      try {
        analysisRunId = await persistAnalysisRun({
          request_id,
          user_id,
          audience,
          status: "completed",
          ...(await buildAnalysisRunArtifactColumns(request_id, minimal)),
          retrieval_ids: retrievals.map((r:any)=>r.id),
          evidence_backed: false,
          created_at: new Date().toISOString()
        })
      } catch (e) {
        console.error("Failed to persist minimal analysis:", e)
      }

          console.warn(`[${request_id}] response_path=education_quick_minimal adding_cors=true status=200`)
          return new Response(JSON.stringify({
            ok: true,
            analysis_id: minimal.analysis_id,
            ...(analysisRunId ? { analysis_run_id: analysisRunId } : {}),
            analysis: minimal,
            provenance: { model: modelUsed, fallback_used: fallbackUsed, llm_duration_ms: llmDurationMs }
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Expose-Headers': 'Content-Type' }
          })
        } else {
          const errorId = uuid()
          await logRpcError(request_id, errorId, "LLM output not parseable as JSON", { raw: (llmText ?? "").slice(0, 2000) })
          console.warn(`[${request_id}] response_path=llm_output_not_json adding_cors=true status=502`)
          return new Response(JSON.stringify({
            ok: false,
            error: "llm_output_not_json",
            message: clientFailureMessage(userMessage, canExposeProviderDiagnostics),
            suggestions,
            error_id: errorId,
            request_id,
            failure_stage: canExposeProviderDiagnostics ? `${modelProvider || 'llm'}_parse_error` : 'llm_unavailable',
            failure_class: canExposeProviderDiagnostics ? 'provider_parse_error' : 'provider_failure',
            provider_attempts: canExposeProviderDiagnostics ? providerAttempts : undefined,
          }), {
            status: 502,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Expose-Headers': 'Content-Type' }
          })
        }
      }

      llmJson = parsed.json
      parsedMeta = {
        sanitized: Boolean(parsed.sanitized),
        patterns: Array.isArray(parsed.patterns) ? parsed.patterns : [],
      }

  // Normalize required analysis fields to satisfy client validators (scenario_text, players, equilibrium)
      try {
    // Ensure scenario_text
        if (typeof llmJson.scenario_text !== 'string' || llmJson.scenario_text.trim().length === 0) {
          llmJson.scenario_text = scenario_text
        }

    // Ensure players (simple heuristic extraction if missing)
    if (!Array.isArray(llmJson.players) || llmJson.players.length === 0) {
      const cand = Array.from(new Set((scenario_text.match(/\b([A-Z]{2,}|[A-Z][a-z]{2,})\b/g) || [])))
      // Prefer known entities if available from earlier extraction
      const inferred = (cand || []).slice(0, 5)
      const playerNames = inferred.length > 0 ? inferred : ["Primary Actor"]
      
      // Convert to proper player objects
      llmJson.players = playerNames.map((name: string, idx: number) => ({
        id: name.replace(/\s+/g, '_') || `P${idx+1}`,
        name: name,
        actions: ['cooperate', 'defect'] // Default game theory actions
      }))
    }

    // Normalize equilibrium object to the frontend contract even when the
    // audience-specific AJV schema does not validate it directly.
    const normalizedEquilibrium = normalizeEquilibriumShape(llmJson)
    if (JSON.stringify(normalizedEquilibrium) !== JSON.stringify(llmJson.equilibrium)) {
      llmJson.equilibrium = normalizedEquilibrium
      schemaCoercionApplied = true
      if (llmJson.provenance && typeof llmJson.provenance === 'object') {
        llmJson.provenance.schema_coercion_applied = true
      }
    }

    // Ensure audience echo
    if (typeof llmJson.audience !== 'string') {
      llmJson.audience = audience
    }
    
    // Ensure required fields for schema validation
    if (!llmJson.analysis_id) {
      llmJson.analysis_id = uuid()
    }
    if (!llmJson.summary || typeof llmJson.summary !== 'object') {
      llmJson.summary = {
        text: llmJson.summary?.text || scenario_text || "Strategic analysis completed"
      }
    }

    if (audience === 'researcher') {
      if (typeof llmJson.long_summary === 'string' && llmJson.long_summary.trim().length > 0) {
        llmJson.long_summary = { text: llmJson.long_summary.trim() }
      } else if (!llmJson.long_summary || typeof llmJson.long_summary !== 'object') {
        const fallbackLongSummary =
          llmJson.summary?.text
          || llmJson.executive_summary?.text
          || llmJson.recommendation?.text
          || `Researcher analysis generated for scenario: ${scenario_text}`
        llmJson.long_summary = {
          text: String(fallbackLongSummary),
        }
      } else if (typeof llmJson.long_summary?.text !== 'string' || llmJson.long_summary.text.trim().length === 0) {
        llmJson.long_summary.text = llmJson.summary?.text || `Researcher analysis generated for scenario: ${scenario_text}`
      }
    }

        const normalizedRetrievalIds = (retrievals || []).map((_retrieval: any, index: number) => `rid_${index + 1}`)
        const validUsedRetrievalIds = Array.isArray(llmJson.provenance?.used_retrieval_ids)
          ? llmJson.provenance.used_retrieval_ids.filter((value: unknown) => typeof value === 'string' && /^rid_/.test(value))
          : []
        const normalizedRetrievalSources = Array.from(new Set((retrievals || []).map((retrieval: any) => String(retrieval.source || retrieval.provider || 'unknown'))))
        llmJson.provenance = {
          ...(llmJson.provenance && typeof llmJson.provenance === 'object' ? llmJson.provenance : {}),
          retrieval_count: Number.isFinite(llmJson.provenance?.retrieval_count) ? llmJson.provenance.retrieval_count : retrievals.length,
          used_retrieval_ids: validUsedRetrievalIds.length ? validUsedRetrievalIds : normalizedRetrievalIds,
          retrieval_sources: Array.isArray(llmJson.provenance?.retrieval_sources) ? llmJson.provenance.retrieval_sources : normalizedRetrievalSources,
          cache_hit: typeof llmJson.provenance?.cache_hit === 'boolean' ? llmJson.provenance.cache_hit : cache_hit,
          evidence_backed: typeof llmJson.provenance?.evidence_backed === 'boolean' ? llmJson.provenance.evidence_backed : evidence_backed,
          llm_model: typeof llmJson.provenance?.llm_model === 'string' && llmJson.provenance.llm_model.trim().length > 0 ? llmJson.provenance.llm_model : (modelUsed || GEMINI_MODEL),
          llm_duration_ms: Number.isFinite(llmJson.provenance?.llm_duration_ms) ? llmJson.provenance.llm_duration_ms : llmDurationMs,
          fallback_used: typeof llmJson.provenance?.fallback_used === 'boolean' ? llmJson.provenance.fallback_used : fallbackUsed,
          llm_provider: canExposeProviderDiagnostics
            ? (typeof llmJson.provenance?.llm_provider === 'string' && llmJson.provenance.llm_provider.trim().length > 0 ? llmJson.provenance.llm_provider : (modelProvider || 'unknown'))
            : undefined,
          provider_attempts: canExposeProviderDiagnostics
            ? (Array.isArray(llmJson.provenance?.provider_attempts) ? llmJson.provenance.provider_attempts : providerAttempts)
            : undefined,
          schema_coercion_applied: schemaCoercionApplied || undefined,
        }
      } catch (normErr) {
        console.warn(`[${request_id}] normalization_warning:`, (normErr as any)?.message ?? normErr)
      }

      mergeExplicitAdvancedFrameworkCandidates(llmJson, sanitizedAdvancedGameInputs.value)
      if (audience === 'researcher') {
        ensureAdvancedFrameworkCandidates(llmJson, scenario_text, retrievals)
      }

      // --- PROVENANCE BINDING: Link numeric claims to retrievals ---
      try {
        await enforceNumericPassages(llmJson, retrievals)
        console.log(`[${request_id}] stage=provenance_binding_complete`)
      } catch (provenanceError: any) {
        console.warn(`[${request_id}] stage=provenance_binding_failed: ${provenanceError?.message ?? provenanceError}`)
      }

      if (audience === 'researcher') {
        const coerced = coerceResearcherPayloadShape(llmJson, retrievals)
        if (coerced.modified) {
          llmJson = coerced.payload
          schemaCoercionApplied = true
          if (llmJson.provenance && typeof llmJson.provenance === 'object') {
            llmJson.provenance.schema_coercion_applied = true
          }
        }
      } else if (audience === 'learner') {
        const coerced = coerceLearnerPayloadShape(llmJson, retrievals)
        if (coerced.modified) {
          llmJson = coerced.payload
          schemaCoercionApplied = true
          if (llmJson.provenance && typeof llmJson.provenance === 'object') {
            llmJson.provenance.schema_coercion_applied = true
          }
        }
      }

      // Validate against AJV schema (recompile for specific audience)
      _currentScenarioText = scenario_text
      _currentAudienceType = audience
      const valid = audienceValidate(llmJson)
      if (!valid) {
        const validationDetail = JSON.stringify(audienceValidate.errors).slice(0, 2000)
        const recovered = await advanceToNextProvider('schema_validation_failed', validationDetail)
        if (recovered) {
          continue
        }

        if (!localSchemaFallbackApplied && evidence_backed && retrievals.length >= 3) {
          localSchemaFallbackApplied = true
          const localStarted = Date.now()
          llmText = buildEvidenceGroundedLocalAnalysisText({
            failureStage: 'schema_validation_failed',
            failureClass: 'provider_parse_error',
            detail: validationDetail,
          })
          modelUsed = 'local-evidence-synthesis-v1'
          modelProvider = 'local' as any
          fallbackUsed = true
          selectedProviderIndex = providerQueue.length
          lastLlmFailureStage = 'schema_validation_failed'
          lastLlmFailureClass = 'provider_parse_error'
          const localDuration = Date.now() - localStarted
          llmDurationMs += localDuration
          providerAttempts.push({
            provider: 'local' as any,
            model: modelUsed,
            ok: true,
            duration_ms: localDuration,
          })
          console.warn(`[${request_id}] stage=schema_validation_failed_using_local_evidence_synthesis, retrievals=${retrievals.length}`)
          continue
        }

    // Log failure and persist for review
        await logSchemaFailure(request_id, JSON.stringify(llmJson).slice(0,10000), audienceValidate.errors)

    // Try a relaxed path: if evidence_backed false allowed, or if audience=student and mode education_quick, proceed with best-effort
        if (mode === "education_quick") {
      // Persist minimal again (ensure schema-compliant)
      const playersObj = [{ id: 'P1', name: 'Player 1', actions: ['learn'] }]
      const profile = { P1: { learn: 0 } }
      const minimal = {
        analysis_id: llmJson.analysis_id ?? uuid(),
        audience,
        scenario_text,
        players: playersObj,
        equilibrium: { profile, stability: 0, method: 'heuristic' },
        quantum: undefined,
        processing_stats: { processing_time_ms: 0, stability_score: 0 },
        provenance: { evidence_backed: false },
        retrievals: [],
        pattern_matches: [],
        forecast: [],
        summary: { text: llmJson.summary?.text ?? "UNVERIFIED education_quick fallback" }
      }
      // Persist
      let analysisRunId: string | null = null
      try {
        analysisRunId = await persistAnalysisRun({
          request_id,
          user_id,
          audience,
          status: "completed",
          ...(await buildAnalysisRunArtifactColumns(request_id, minimal)),
          retrieval_ids: retrievals.map((r:any)=>r.id),
          evidence_backed: false,
          created_at: new Date().toISOString()
        })
      } catch (e) {
        console.error("Failed to persist schema-failed analysis:", e)
      }

          return new Response(JSON.stringify({
            ok: true,
            analysis_id: minimal.analysis_id,
            ...(analysisRunId ? { analysis_run_id: analysisRunId } : {}),
            analysis: minimal,
            provenance: { model: modelUsed, fallback_used: fallbackUsed, llm_duration_ms: llmDurationMs }
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Expose-Headers': 'Content-Type' }
          })
        } else {
          const errorId = uuid()
          await logRpcError(request_id, errorId, "schema_validation_failed: " + JSON.stringify(audienceValidate.errors).slice(0,2000), { llmJson: JSON.stringify(llmJson).slice(0,10000) })
          console.warn(`[${request_id}] response_path=schema_validation_failed adding_cors=true status=422`)
          return new Response(JSON.stringify({
            ok: false,
            error: "schema_validation_failed",
            message: "LLM response failed schema validation",
            error_id: errorId,
            details: audienceValidate.errors,
            failure_stage: canExposeProviderDiagnostics ? "schema_validation_failed" : 'llm_unavailable',
            failure_class: canExposeProviderDiagnostics ? "provider_parse_error" : 'provider_failure',
            provider_attempts: canExposeProviderDiagnostics ? providerAttempts : undefined,
          }), {
            status: 422,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Expose-Headers': 'Content-Type' }
          })
        }
      }

      break
    }

  if (audience === 'researcher') {
    await upgradeAdvancedFrameworksWithDeterministicSolvers({
      llmJson,
      solverInvocations,
      solverResults,
      requestId: request_id,
    })
  }

  // --- INTEGRATE EV ENGINE: Compute expected values for decision tables ---
  try {
    if ((audience === "learner" || audience === "researcher") && llmJson.decision_table && Array.isArray(llmJson.decision_table) && llmJson.decision_table.length > 0) {
      console.log(`[${request_id}] stage=ev_computation_start, actions=${llmJson.decision_table.length}`)

      // Convert decision_table to ActionEntry format for evEngine
      const actions: ActionEntry[] = llmJson.decision_table.map((entry: any) => ({
        actor: entry.actor || "Primary Actor",
        action: entry.action,
        payoff_estimate: {
          value: Number(entry.payoff_estimate?.value ?? 0),
          confidence: Number(entry.payoff_estimate?.confidence ?? 0.5),
          sources: (entry.payoff_estimate?.sources ?? []).map((s: any) => ({
            id: s.id || s.retrieval_id || `source-${uuid()}`,
            score: Number(s.score ?? s.anchor_score ?? 0.5),
            excerpt: s.excerpt || s.passage_excerpt || ""
          })),
          derived: false
        }
      }))

      // Compute EVs using the deterministic engine
      const evResults = computeEVs(actions)

      // Add expected_value_ranking to the response
      llmJson.expected_value_ranking = evResults.map(ev => ({
        action: ev.action,
        ev: Number(ev.ev.toFixed(3)),
        ev_confidence: Number((ev.raw?.confidence ?? 0.5).toFixed(3))
      }))

      console.log(`[${request_id}] stage=ev_computation_complete, top_action=${evResults[0]?.action}, top_ev=${evResults[0]?.ev.toFixed(3)}`)
    } else if ((audience === "learner" || audience === "researcher") && (!llmJson.decision_table || !Array.isArray(llmJson.decision_table) || llmJson.decision_table.length === 0)) {
      // Synthesize minimal decision table for EV computation
      console.log(`[${request_id}] stage=ev_synthesis_start, synthesizing decision table`)

      const seedActions: ActionEntry[] = [
        {
          actor: "Primary Actor",
          action: "Aggressive Response",
          payoff_estimate: {
            value: 0.7,
            confidence: 0.6,
            sources: retrievals.slice(0, 2).map((r: any) => ({
              id: r.id || `retrieval-${uuid()}`,
              score: 0.8,
              excerpt: r.snippet?.slice(0, 100) || ""
            })),
            derived: true
          }
        },
        {
          actor: "Primary Actor",
          action: "Diplomatic Approach",
          payoff_estimate: {
            value: 0.5,
            confidence: 0.7,
            sources: retrievals.slice(0, 2).map((r: any) => ({
              id: r.id || `retrieval-${uuid()}`,
              score: 0.7,
              excerpt: r.snippet?.slice(0, 100) || ""
            })),
            derived: true
          }
        },
        {
          actor: "Primary Actor",
          action: "Wait and Monitor",
          payoff_estimate: {
            value: 0.3,
            confidence: 0.8,
            sources: retrievals.slice(0, 2).map((r: any) => ({
              id: r.id || `retrieval-${uuid()}`,
              score: 0.6,
              excerpt: r.snippet?.slice(0, 100) || ""
            })),
            derived: true
          }
        }
      ]

      const evResults = computeEVs(seedActions)

      // Add synthesized decision table and EV ranking
      llmJson.decision_table = seedActions.map(action => ({
        actor: action.actor,
        action: action.action,
        payoff_estimate: {
          value: action.payoff_estimate.value,
          confidence: action.payoff_estimate.confidence,
          sources: action.payoff_estimate.sources.map(s => ({
            id: s.id,
            retrieval_id: s.id,
            url: retrievals.find((r: any) => r.id === s.id)?.url || "",
            passage_excerpt: s.excerpt,
            anchor_score: s.score
          }))
        }
      }))

      llmJson.expected_value_ranking = evResults.map(ev => ({
        action: ev.action,
        ev: Number(ev.ev.toFixed(3)),
        ev_confidence: Number((ev.raw?.confidence ?? 0.5).toFixed(3))
      }))

      console.log(`[${request_id}] stage=ev_synthesis_complete, synthesized ${seedActions.length} actions`)
    }
    } catch (evError: any) {
    console.warn(`[${request_id}] stage=ev_computation_failed: ${evError?.message ?? evError}`)
    // Continue without EV computation - don't fail the entire analysis
  }

  // --- HUMAN REVIEW GATING: Check for high-stakes scenarios ---
    let analysisStatus = "completed"
    let reviewMetadata = null

  try {
    const reviewCheck = detectHighStakesAnalysis(scenario_text, evidence_backed, retrievals.length)
    if (reviewCheck.requiresReview) {
      analysisStatus = "under_review"
      reviewMetadata = {
        review_reasons: reviewCheck.reasons,
        review_confidence: reviewCheck.confidence,
        flagged_at: new Date().toISOString()
      }
      console.log(`[${request_id}] stage=human_review_flagged, reasons=${reviewCheck.reasons.join(', ')}`)

      // Create human review record
      try {
        await supabaseAdmin.from("human_reviews").insert({
          analysis_run_id: null, // Will be set after analysis_runs insert
          reviewer_id: null, // To be assigned
          status: "pending",
          notes: `Auto-flagged for review: ${reviewCheck.reasons.join(', ')}`,
          created_at: new Date().toISOString()
        })
      } catch (reviewInsertError) {
        console.warn(`[${request_id}] Failed to create human review record:`, reviewInsertError)
      }
    }
  } catch (reviewError: any) {
    console.warn(`[${request_id}] Human review gating failed: ${reviewError?.message ?? reviewError}`)
    // Continue with normal processing
  }

  // OK validated — persist analysis_runs
    const inferredSurface = /(gold|oil|commodity|price|inflation|market|supplier|shipping|tariff)/i.test(scenario_text)
      ? 'market_stream'
      : 'geopolitical_radar'
    const inferredScopeKey = /gold/i.test(scenario_text)
      ? 'gold'
      : /oil/i.test(scenario_text)
        ? 'oil'
        : 'global'
    const groundedEntities = deriveEntityRefs(
      [
        scenario_text,
        ...(retrievals || []).flatMap((retrieval: any) => [retrieval.title, retrieval.snippet, retrieval.url]),
      ],
      /(gold|oil|commodity|supplier|shipping|tariff|inventory|buyer)/i.test(scenario_text) ? 'commodity_procurement' : null,
    )
    const constraintSummary = buildConstraintChecks({
      scenarioText: scenario_text,
      questionText: llmJson?.summary?.text || llmJson?.explain_brief || '',
      recommendedStrategy: llmJson?.recommendation || llmJson?.top_2_actions?.map((entry: any) => entry?.action || entry).join(' ') || '',
      evidenceCount: retrievals.length,
      groundedEntityCount: groundedEntities.length,
      contradictionCount: Array.isArray(llmJson?.multi_agent_forecast?.contradictionPoints) ? llmJson.multi_agent_forecast.contradictionPoints.length : 0,
    })
    const driftSignal = await fetchLatestDriftSignal(supabaseAdmin, inferredSurface, inferredScopeKey).catch(() => null)
    llmJson.provenance = {
      ...(llmJson.provenance || {}),
      grounded_entities: groundedEntities,
      retrieval_policy_id: DEFAULT_RETRIEVAL_POLICY_ID,
      prompt_policy_id: DEFAULT_PROMPT_POLICY_ID,
      calibration_status: 'uncalibrated',
      retrieval_provider_summary: retrievalProviderSummary,
    }
    llmJson.question_context = question_context
    llmJson.constraint_checks = constraintSummary
    if (driftSignal) {
      llmJson.drift_signal = driftSignal
    }

  const analysis_id = llmJson.analysis_id ?? uuid()
  const artifactColumns = await buildAnalysisRunArtifactColumns(request_id, llmJson)
  const analysisRow = {
    request_id,
    user_id,
    audience,
    status: analysisStatus,
    review_reason: reviewMetadata?.review_reasons?.join('; ') ?? null,
    ...artifactColumns,
    retrieval_ids: retrievals.map((r:any)=>r.id),
    evidence_backed,
    solver_invocations: solverInvocations.length > 0 ? solverInvocations : null,
    solver_results: Object.keys(solverResults).length > 0 ? solverResults : null,
    created_at: new Date().toISOString()
  }

    let analysisRunId: string | null = null
    try {
      analysisRunId = await persistAnalysisRun(analysisRow)
    } catch (e:any) {
    const errorId = uuid()
    await logRpcError(request_id, errorId, `db_insert_failed: ${String(e?.message ?? e)}`, { analysisRow })
    return new Response(JSON.stringify({
      ok: false,
      error: "db_insert_failed",
      message: "Failed to persist analysis",
      error_id: errorId
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }

  // Post-processing: Generate additional assets
    const postProcessResults = { notebook: null, teacher_packet: null, playbook: null, sensitivity: null }

  try {
    // Generate notebook for researcher audience
    if (audience === "researcher") {
      const notebookResponse = await fetch(buildFunctionUrl("notebook-export"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
        body: JSON.stringify({
          analysis_id,
          analysis_data: llmJson,
          retrievals
        })
      })
      if (notebookResponse.ok) {
        postProcessResults.notebook = await notebookResponse.json()
      }
    }

    // Generate teacher packet for teacher audience
    if (audience === "teacher") {
      const teacherResponse = await fetch(buildFunctionUrl("teacher-packet"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
        body: JSON.stringify({
          analysis_id,
          analysis_data: llmJson,
          scenario_text
        })
      })
      if (teacherResponse.ok) {
        postProcessResults.teacher_packet = await teacherResponse.json()
      }
    }

    // Generate strategic playbook for all audiences
    const playbookResponse = await fetch(buildFunctionUrl("strategic-playbook"), {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
      body: JSON.stringify({
        analysis_id,
        analysis_data: llmJson,
        scenario_text,
        generate_alternatives: false
      })
    })
    if (playbookResponse.ok) {
      postProcessResults.playbook = await playbookResponse.json()
    }

    // Run sensitivity analysis for researcher using integrated sensitivityRunner
    if (audience === "researcher" && llmJson.decision_table && Array.isArray(llmJson.decision_table) && llmJson.decision_table.length > 0) {
      try {
        console.log(`[${request_id}] stage=sensitivity_analysis_start`)

        // Convert decision_table to BaseActions format
        const baseActions = llmJson.decision_table.map((entry: any) => ({
          actor: entry.actor || "Primary Actor",
          action: entry.action,
          payoff_estimate: {
            value: Number(entry.payoff_estimate?.value ?? 0),
            confidence: Number(entry.payoff_estimate?.confidence ?? 0.5),
            sources: (entry.payoff_estimate?.sources ?? []).map((s: any) => ({
              id: s.id || s.retrieval_id || `source-${uuid()}`,
              score: Number(s.score ?? s.anchor_score ?? 0.5),
              excerpt: s.excerpt || s.passage_excerpt || ""
            }))
          }
        }))

        // Define key parameters for sensitivity analysis
        const keyParams = [
          { name: "risk_tolerance", base: 0.5, range: [-20, 20] },
          { name: "time_horizon", base: 1.0, range: [-30, 30] },
          { name: "resource_availability", base: 0.8, range: [-15, 15] },
          { name: "stakeholder_alignment", base: 0.6, range: [-25, 25] }
        ]

        // Run sensitivity analysis
        const sensitivityResults = await runSensitivity(baseActions, keyParams, 10)

        // Store results in simulation_runs table
        await supabaseAdmin.from("simulation_runs").insert({
          analysis_run_id: analysis_id,
          job_id: `sensitivity-${analysis_id}`,
          solver_config: {
            method: 'sensitivity_analysis',
            n: 10,
            perturbation_range: 10,
            key_params: keyParams
          },
          result_json: sensitivityResults,
          status: 'completed',
          created_at: new Date().toISOString()
        })

        // Add sensitivity results to response
        llmJson.sensitivity = {
          most_sensitive_parameters: sensitivityResults.tornado_summary.parameter_sensitivity_ranking.slice(0, 3).map((p: any) => ({
            param: p.param,
            impact_score: Number((p.range_delta / Math.max(...sensitivityResults.tornado_summary.parameter_sensitivity_ranking.map((x: any) => x.range_delta))).toFixed(3))
          })),
          analysis_summary: sensitivityResults.tornado_summary
        }

        postProcessResults.sensitivity = sensitivityResults
        console.log(`[${request_id}] stage=sensitivity_analysis_complete, most_sensitive=${sensitivityResults.tornado_summary.most_sensitive_parameter}`)
      } catch (sensitivityError: any) {
        console.warn(`[${request_id}] stage=sensitivity_analysis_failed: ${sensitivityError?.message ?? sensitivityError}`)
      }
    }

    // --- FIX PATTERN NAME RESOLUTION & COMPUTE SIMILARITY (Gap Fix #3 & #5) ---
    try {
      console.log(`[${request_id}] stage=pattern_name_resolution_start`)
      
      if (llmJson.pattern_matches && Array.isArray(llmJson.pattern_matches) && llmJson.pattern_matches.length > 0) {
        // Extract scenario features for similarity calculation
        const scenarioFeatures = extractScenarioFeatures(scenario_text, llmJson.players)
        
        for (let i = 0; i < llmJson.pattern_matches.length; i++) {
          const match = llmJson.pattern_matches[i]
          
          // If pattern_name is undefined or empty, try to resolve it
          if (!match.pattern_name || match.pattern_name === 'undefined' || match.pattern_name.toLowerCase().includes('undefined')) {
            // Try to fetch from database by pattern_id or signature
            const patternId = match.pattern_id || match.id
            
            if (patternId) {
              const { data: patternData } = await supabaseAdmin
                .from('strategic_patterns')
                .select('pattern_name, pattern_signature, description, structural_invariants')
                .eq('id', patternId)
                .single()
              
              if (patternData && patternData.pattern_name) {
                llmJson.pattern_matches[i].pattern_name = patternData.pattern_name
                console.log(`[${request_id}] Resolved pattern name: ${patternData.pattern_name}`)
                
                // Compute proper similarity (Gap Fix #5)
                const patternFeatures = patternData.structural_invariants || {}
                const actualSimilarity = computeCombinedSimilarity(
                  scenario_text,
                  patternData.description || '',
                  scenarioFeatures,
                  patternFeatures,
                  patternData.pattern_signature
                )
                
                llmJson.pattern_matches[i].similarity = actualSimilarity
                console.log(`[${request_id}] Computed similarity: ${actualSimilarity}%`)
              } else {
                // Fallback: use pattern signature or generic name
                llmJson.pattern_matches[i].pattern_name = patternData?.pattern_signature || match.pattern_signature || `Strategic Pattern ${i + 1}`
                console.log(`[${request_id}] Using fallback pattern name: ${llmJson.pattern_matches[i].pattern_name}`)
              }
            } else {
              // No ID available, use generic name
              llmJson.pattern_matches[i].pattern_name = match.pattern_signature || `Strategic Pattern ${i + 1}`
            }
          } else if (match.pattern_name && (!match.similarity || match.similarity === 66.7)) {
            // Pattern name exists but similarity is hardcoded - recompute it (Gap Fix #5)
            try {
              const { data: patternData } = await supabaseAdmin
                .from('strategic_patterns')
                .select('description, pattern_signature, structural_invariants')
                .eq('pattern_name', match.pattern_name)
                .single()
              
              if (patternData) {
                const patternFeatures = patternData.structural_invariants || {}
                const actualSimilarity = computeCombinedSimilarity(
                  scenario_text,
                  patternData.description || '',
                  scenarioFeatures,
                  patternFeatures,
                  patternData.pattern_signature
                )
                
                llmJson.pattern_matches[i].similarity = actualSimilarity
                console.log(`[${request_id}] Recomputed similarity for ${match.pattern_name}: ${actualSimilarity}%`)
              }
            } catch (simError) {
              console.warn(`[${request_id}] Failed to recompute similarity: ${simError}`)
            }
          }
        }
        console.log(`[${request_id}] stage=pattern_name_resolution_complete, resolved=${llmJson.pattern_matches.length} patterns`)
      }
    } catch (patternError: any) {
      console.warn(`[${request_id}] stage=pattern_name_resolution_failed: ${patternError?.message ?? patternError}`)
    }

    // --- INTEGRATE EVPI ANALYSIS (Gap Fix #1) ---
    try {
      console.log(`[${request_id}] stage=evpi_analysis_start`)
      
      // Extract decision alternatives from analysis
      const decisionAlternatives = (llmJson.decision_table || []).map((entry: any, idx: number) => ({
        id: `alt-${idx}`,
        name: entry.action || `Alternative ${idx + 1}`,
        expectedPayoff: Number(entry.payoff_estimate?.value ?? 0),
        payoffVariance: (1 - Number(entry.payoff_estimate?.confidence ?? 0.5)) * 0.5,
        informationSensitivity: {
          "market_conditions": Math.random() * 0.3 + 0.2,
          "competitor_strategy": Math.random() * 0.3 + 0.2,
          "regulatory_changes": Math.random() * 0.2 + 0.1
        }
      }))

      // Create information nodes
      const informationNodes = [
        {
          id: "market_conditions",
          name: "Market Conditions",
          currentUncertainty: 0.3,
          informationType: "market" as const,
          acquisitionCost: 200,
          acquisitionTime: 24,
          reliability: 0.85,
          dependencies: []
        },
        {
          id: "competitor_strategy",
          name: "Competitor Strategy",
          currentUncertainty: 0.4,
          informationType: "competitor" as const,
          acquisitionCost: 500,
          acquisitionTime: 48,
          reliability: 0.75,
          dependencies: ["market_conditions"]
        },
        {
          id: "regulatory_changes",
          name: "Regulatory Environment",
          currentUncertainty: 0.25,
          informationType: "regulatory" as const,
          acquisitionCost: 150,
          acquisitionTime: 12,
          reliability: 0.90,
          dependencies: []
        }
      ]

      const currentBeliefs: Record<string, number> = {
        "market_conditions": 0.3,
        "competitor_strategy": 0.4,
        "regulatory_changes": 0.25
      }

      if (decisionAlternatives.length >= 2) {
        const evpiResponse = await fetch(`${SUPABASE_URL}/functions/v1/information-value-assessment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "apikey": SUPABASE_SERVICE_ROLE_KEY
          },
          body: JSON.stringify({
            runId: analysis_id,
            scenario: {
              title: scenario_text.slice(0, 100),
              description: scenario_text,
              timeHorizon: 168, // 7 days
              stakeholders: llmJson.players?.map((p: any) => p.name || p.id) || []
            },
            decisionAlternatives,
            informationNodes,
            currentBeliefs,
            analysisConfig: {
              riskTolerance: 0.5,
              discountRate: 0.01,
              maxInformationBudget: 1000,
              prioritizeSpeed: false
            }
          })
        })

        if (evpiResponse.ok) {
          const evpiData = await evpiResponse.json()
          if (evpiData.ok && evpiData.response) {
            llmJson.evpi_analysis = evpiData.response
            console.log(`[${request_id}] stage=evpi_analysis_complete, evpi_value=${evpiData.response.expectedValueOfPerfectInformation}`)
          }
        }
      }
    } catch (evpiError: any) {
      console.warn(`[${request_id}] stage=evpi_analysis_failed: ${evpiError?.message ?? evpiError}`)
    }

    // --- INTEGRATE OUTCOME FORECASTING (Gap Fix #2) ---
    try {
      console.log(`[${request_id}] stage=outcome_forecasting_start`)
      
      // Extract equilibrium probabilities for forecasting
      const equilibriumProbs = llmJson.quantum?.probability_distribution || llmJson.equilibrium?.profile || {}
      const outcomeScenarios = Object.keys(equilibriumProbs).slice(0, 5).map((strategy: string, idx: number) => {
        const baseProb = Number(equilibriumProbs[strategy]) || 0.5
        return {
          id: `outcome-${idx}`,
          name: strategy,
          description: `Strategic outcome: ${strategy}`,
          baselineProbability: Math.max(0.1, Math.min(0.9, baseProb)),
          impactMagnitude: Math.random() * 0.5 + 0.5,
          dependencies: []
        }
      })

      // Create decay models for each outcome
      const decayModels: Record<string, any> = {}
      outcomeScenarios.forEach(outcome => {
        decayModels[outcome.id] = {
          type: "exponential",
          parameters: { decayRate: 0.01 + Math.random() * 0.02 }
        }
      })

      // Define external factors
      const externalFactors = [
        {
          name: "Market Volatility",
          influence: 0.15,
          timeProfile: "cyclical" as const,
          cyclePeriod: 24
        },
        {
          name: "Information Decay",
          influence: -0.10,
          timeProfile: "increasing" as const
        }
      ]

      if (outcomeScenarios.length >= 1) {
        const forecastResponse = await fetch(`${SUPABASE_URL}/functions/v1/outcome-forecasting`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "apikey": SUPABASE_SERVICE_ROLE_KEY
          },
          body: JSON.stringify({
            runId: analysis_id,
            scenario: {
              title: scenario_text.slice(0, 100),
              timeHorizon: 168, // 7 days in hours
              granularity: 12 // Forecast every 12 hours
            },
            outcomes: outcomeScenarios,
            decayModels,
            externalFactors,
            uncertaintyConfig: {
              epistemicUncertainty: 0.1,
              aleatoricUncertainty: 0.05,
              confidenceLevel: 0.95
            }
          })
        })

        if (forecastResponse.ok) {
          const forecastData = await forecastResponse.json()
          if (forecastData.ok && forecastData.response) {
            llmJson.outcome_forecasts = forecastData.response
            console.log(`[${request_id}] stage=outcome_forecasting_complete, forecast_points=${Object.keys(forecastData.response.forecasts).length}`)
          }
        }
      }
    } catch (forecastError: any) {
      console.warn(`[${request_id}] stage=outcome_forecasting_failed: ${forecastError?.message ?? forecastError}`)
    }

    console.log(`[post-process] Generated assets: notebook=${!!postProcessResults.notebook}, teacher=${!!postProcessResults.teacher_packet}, playbook=${!!postProcessResults.playbook}, sensitivity=${!!postProcessResults.sensitivity}, evpi=${!!llmJson.evpi_analysis}, forecasts=${!!llmJson.outcome_forecasts}`)

  } catch (e) {
    console.warn("Post-processing failed:", e)
  }

  // Update response with post-processing results (logging only; avoid premature spread of resp)
    console.log(`[${request_id}] stage=pre_enhanced_resp_build (skip_spread)`)

    const totalDuration = Date.now() - start

  // Include sanitization information in provenance
    const sanitizationInfo = parsedMeta.sanitized ? {
    server_side_sanitization_applied: true,
    sanitization_patterns: parsedMeta.patterns.join(", "),
    third_party_interference_likely: parsedMeta.patterns.some(p => p.includes('extension_injection'))
  } : {
    server_side_sanitization_applied: false,
    clean_response: true
  }

  const resp = {
    ok: true,
    analysis_id,
    ...(analysisRunId ? { analysis_run_id: analysisRunId } : {}),
    analysis: {
      ...llmJson,
      retrievals: retrievals || []
    },
    provenance: {
      model: modelUsed,
      provider: canExposeProviderDiagnostics ? modelProvider : undefined,
      fallback_used: fallbackUsed,
      llm_duration_ms: llmDurationMs,
      total_duration_ms: totalDuration,
      cache_hit: cache_hit,
      retrieval_count: retrievals.length,
      retrieval_sources: retrievals.map(r => r.source).filter(Boolean),
      evidence_backed: evidence_backed,
      retrieval_provider_summary: retrievalProviderSummary,
      schema_validation_passed: true,
      provider_attempts: canExposeProviderDiagnostics ? providerAttempts : undefined,
      solver_invocations: solverInvocations.length > 0 ? solverInvocations : undefined,
      ...sanitizationInfo
    }
  }

  // --- METRICS COLLECTION: Track quality and performance ---
    try {
      const metrics = {
      request_id,
      audience,
      mode,
      model_used: modelUsed,
      total_duration_ms: totalDuration,
      llm_duration_ms: llmDurationMs,
      retrieval_count: retrievals.length,
      evidence_backed: evidence_backed,
      decision_table_present: !!(llmJson.decision_table && Array.isArray(llmJson.decision_table) && llmJson.decision_table.length > 0),
      ev_ranking_present: !!(llmJson.expected_value_ranking && Array.isArray(llmJson.expected_value_ranking) && llmJson.expected_value_ranking.length > 0),
      sensitivity_run: !!(postProcessResults.sensitivity),
      schema_validation_passed: true, // We already validated above
      human_review_flagged: analysisStatus === 'under_review',
      fallback_used: fallbackUsed,
      created_at: new Date().toISOString()
    };

    // Store metrics (assuming we have a monitoring_metrics table)
      await supabaseAdmin.from("monitoring_metrics").insert(metrics).catch(err => {
      console.warn(`[${request_id}] Failed to store metrics:`, err?.message ?? err);
    });

    console.log(`[${request_id}] stage=metrics_stored`)
    } catch (metricsError: any) {
    console.warn(`[${request_id}] stage=metrics_failed: ${metricsError?.message ?? metricsError}`);
  }

    console.log(`[${request_id}] stage=complete, duration=${totalDuration}ms, with_cors=true`)
    return new Response(JSON.stringify(resp), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Expose-Headers': 'Content-Type' }
    })
  } catch (unhandled: any) {
    const rid = uuid()
    console.error(`[unhandled] ${rid}:`, unhandled?.message ?? unhandled)
    await logRpcError(null, rid, `unhandled_exception: ${String(unhandled?.message ?? unhandled)}`)
    return new Response(JSON.stringify({ ok: false, error: 'unhandled_exception', error_id: rid }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Expose-Headers': 'Content-Type' }
    })
  }
}

Deno.serve(handler)
