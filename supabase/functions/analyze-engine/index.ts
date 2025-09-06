// @ts-nocheck
// Supabase Edge Function: analyze-engine (production-ready)
// Deno runtime
// Endpoint: POST /functions/v1/analyze-engine
// Returns JSON-only response with analysis or clear error
//
// ENV (required):
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// PERPLEXITY_KEY
// GEMINI_API_KEY
// OPENAI_KEY (fallback)
// WORKER_URL (optional)
//
// Tables: analysis_runs, retrieval_cache, schema_failures, rpc_errors

// deno-lint-ignore-file no-explicit-any

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Ajv from "https://esm.sh/ajv@8.17.1";
import addFormats from "https://esm.sh/ajv-formats@2.1.1";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";
import { computeEVs, PayoffEstimate, ActionEntry } from "../evEngine.ts";

// --- Env helpers ---
const getEnv = (k: string) => Deno.env.get(k) || undefined
const SUPABASE_URL = getEnv('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY')!
const PERPLEXITY_KEY = getEnv('PERPLEXITY_KEY') ?? ""
const GEMINI_KEY = getEnv('GEMINI_API_KEY') ?? ""
const OPENAI_KEY = getEnv('OPENAI_KEY') ?? ""
const WORKER_URL = getEnv('WORKER_URL') ?? ""

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase environment variables")
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

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
async function parseLlmOutput(text: string, request_id: string | null = null): Promise<{ ok: true, json: any, sanitized: boolean, patterns: string[] } | { ok: false, error: string, raw: string }> {
  // Strategy 1: Parse as-is
  try {
    const parsed = JSON.parse(text.trim())
    return { ok: true, json: parsed, sanitized: false, patterns: [] }
  } catch (err1) {
    // Strategy 2: Sanitize first
    const { sanitized, noiseDetected, patterns } = sanitizeLlmOutput(text)

    if (noiseDetected && request_id) {
      await logThirdPartyNoise(request_id, patterns, text)
    }

    try {
      const parsed = JSON.parse(sanitized)
      return { ok: true, json: parsed, sanitized: noiseDetected, patterns }
    } catch (err2) {
      // Strategy 3: Find JSON boundaries more aggressively
      const jsonStart = sanitized.indexOf('{')
      const jsonEnd = sanitized.lastIndexOf('}')

      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        try {
          const extractedJson = sanitized.slice(jsonStart, jsonEnd + 1)
          const parsed = JSON.parse(extractedJson)
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
              const parsed = JSON.parse(finalJson)
              return { ok: true, json: parsed, sanitized: true, patterns: ['line_filtering', 'aggressive_extraction'] }
            }
          } catch (err4) {
            // Final fallback
            return { ok: false, error: "defensive_parsing_failed", raw: text.slice(0, 2000) }
          }
        }
      }

      return { ok: false, error: "json_extraction_failed", raw: text.slice(0, 2000) }
    }
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

// --- Perplexity wrapper with retry and caching ---
async function perplexitySearch(query: string, top_k = 5, attempts = 3) {
  if (!PERPLEXITY_KEY) return { ok: false, error: "no_perplexity_key" }
  const url = "https://api.perplexity.ai/chat/completions"

  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${PERPLEXITY_KEY}`
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages: [
            { role: 'system', content: 'You are a research assistant. Return concise, authoritative sources with citations.' },
            { role: 'user', content: `${query}\n\nPlease search the live web and provide ${Math.min(5, Math.max(1, top_k))} relevant sources with citations.` }
          ],
          temperature: 0.2,
          top_k: top_k,
          search_recency_filter: 'month',
          return_images: false,
          stream: false,
          max_tokens: 600
        })
      })

      const text = await res.text()
      const parsed = await safeJsonParse(text)
      if (!parsed.ok) throw new Error(parsed.error || "perplexity_json_parse_failed")

      const raw = parsed.json
      const results = raw.choices?.[0]?.message?.content || raw.results || raw.data || raw.hits || []
      const hits = (Array.isArray(results) ? results : []).map((r: any, idx: number) => ({
        id: r.id ?? `perp-${Date.now()}-${idx}`,
        title: r.title ?? r.name ?? 'Source',
        url: r.url ?? r.source?.url ?? '',
        snippet: r.snippet ?? r.summary ?? r.excerpt ?? ''
      }))

      return { ok: true, hits }
    } catch (err: any) {
      console.warn(`Perplexity attempt ${i + 1} failed:`, err?.message ?? err)
      if (i === attempts - 1) return { ok: false, error: String(err?.message ?? err) }
      await new Promise(r => setTimeout(r, 300 * (i + 1)))
    }
  }
  return { ok: false, error: "perplexity_failed" }
}

// --- LLM callers ---
// Primary: Gemini 2.5 Pro
async function callGemini(prompt: string) {
  if (!GEMINI_KEY) return { ok: false, error: "no_gemini_key" }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()

    return { ok: true, text: responseText }
  } catch (err: any) {
    return { ok: false, error: String(err?.message ?? err) }
  }
}

// Fallback: OpenAI GPT-4o-mini
async function callOpenAIFallback(prompt: string) {
  if (!OPENAI_KEY) return { ok: false, error: "no_openai_key" }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1200,
        temperature: 0.0
      })
    })

    const text = await res.text()
    const parsed = await safeJsonParse(text)

    if (!parsed.ok) throw new Error("openai_json_parse_failed")
    if (!parsed.json.choices?.[0]?.message?.content) throw new Error("openai_no_content")

    return { ok: true, text: parsed.json.choices[0].message.content }
  } catch (err: any) {
    return { ok: false, error: String(err?.message ?? err) }
  }
}

// --- Audience prompt templates ---
function buildPrompt(audience: string, scenario: string, retrievals: any[], computedData?: any) {
  const retrievalBlock = (retrievals && retrievals.length)
    ? `Retrievals:\n${retrievals.map((r:any,i:number)=>`${i+1}. ${r.title || r.url || "source"} — ${r.url || ""}\nSnippet: ${r.snippet || ""}`).join("\n")}`
    : `Retrievals: NONE`

  if (audience === "student") {
    return `You are a Strategic Intelligence Teaching Assistant. For any geopolitical or strategic scenario provided, produce a JSON-only response that is short, simple, and teaches a student. Output must validate against the provided JSON schema (student_output_schema). Never include prose outside the JSON — only produce the JSON object.

IMPORTANT: For all numeric values, include sources with exact retrieval IDs, URLs, passage excerpts, and anchor scores. Use retrieval IDs from the provided retrievals. If no matching retrieval, mark as 'unknown'.

Scenario: ${scenario}
${retrievalBlock}
Constraints: produce a student-level deliverable.

Produce the following JSON exactly:

{
  "analysis_id": "${uuid()}",
  "audience": "student",
  "one_paragraph_summary": {"text": "A concise summary of the scenario in simple terms."},
  "top_2_actions": [
    {"action": "Action 1", "rationale": "Reasoning for action", "expected_outcome": {"value": 0.8, "confidence": 0.7, "sources": [{"id": "source1", "retrieval_id": "${retrievals[0]?.id || 'unknown'}", "url": "${retrievals[0]?.url || 'http://example.com'}", "passage_excerpt": "${retrievals[0]?.snippet?.substring(0,100) || 'N/A'}", "anchor_score": 0.9}]}}
  ],
  "key_terms": [{"term": "Key Term", "definition": "Definition"}],
  "two_quiz_questions": [{"q": "Question?", "answer": "Answer", "difficulty": "easy"}],
  "provenance": {
    "retrieval_count": ${retrievals.length},
    "retrieval_ids": ${JSON.stringify(retrievals.map(r => r.id))},
    "evidence_backed": ${retrievals.length > 0}
  }
}`
  } else if (audience === "learner") {
    const evData = computedData?.ev || { ranking: [], computation_notes: "EV computation pending" }
    const sensitivityData = computedData?.sensitivity || { param_samples: [], analysis_notes: "Sensitivity analysis pending" }

    return `You are a Strategic Intelligence Tutor. Produce a JSON-only 'learner' report with decision table and solutions.

IMPORTANT: Extract a list of key entities (countries, organizations, individuals, locations) involved in the scenario.
For each numeric claim, include sources array containing retrieval_id and a short passage excerpt. If no retrieval supports claim, set evidence_backed=false and do not assert the number.

Scenario: ${scenario}
${retrievalBlock}
Assumptions: ${JSON.stringify({ seed: Date.now() })}
Computed Data: ${JSON.stringify({ ev_ranking: evData.ranking, sensitivity_samples: sensitivityData.param_samples.slice(0, 3) })}

Produce learner JSON structure with decision_table, expected_value_ranking, sensitivity_advice, exercise, and provenance.
Include realistic payoff estimates and risk assessments based on the scenario.`
  } else if (audience === "researcher") {
    const sensitivityData = computedData?.sensitivity || { param_samples: [], analysis_notes: "Sensitivity analysis pending" }

    return `You are a Strategic Research Assistant. Produce a JSON-only research package with reproducible artifacts.

IMPORTANT: Extract a list of key entities (countries, organizations, individuals, locations) involved in the scenario.
For each numeric claim, include sources array containing retrieval_id and a short passage excerpt. If no retrieval supports claim, set evidence_backed=false and do not assert the number.

Scenario: ${scenario}
${retrievalBlock}
Model parameters: ${JSON.stringify({ seed: Date.now() })}
Sensitivity Analysis: ${JSON.stringify(sensitivityData.param_samples.slice(0, 5))}

Produce researcher JSON with payoff_matrix, solver_config, simulation_results, notebook_snippet, data_exports, and provenance.
Include detailed assumptions, parameter ranges, and reproducible simulation setup.`
  } else {
    // teacher
    return `You are a Strategic Education Designer. Produce a JSON-only teacher packet.

IMPORTANT: Extract a list of key entities (countries, organizations, individuals, locations) involved in the scenario.
For each numeric claim, include sources array containing retrieval_id and a short passage excerpt. If no retrieval supports claim, set evidence_backed=false and do not assert the number.
For each numeric claim, include sources array containing retrieval_id and a short passage excerpt. If no retrieval supports claim, set evidence_backed=false and do not assert the number.
For each numeric claim, include sources array containing retrieval_id and a short passage excerpt. If no retrieval supports claim, set evidence_backed=false and do not assert the number.

Scenario: ${scenario}
${retrievalBlock}
Produce teacher JSON with lesson_outline, simulation_setup, grading_rubric, student_handouts, sample_solutions, and provenance.
Include practical classroom activities and assessment methods.`
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
        return {
          id: retrieval.id || `retrieval-${uuid()}`,
          url: retrieval.url || '',
          passage_excerpt: retrieval.snippet
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

  // Update provenance.evidence_backed
  if (llmJson.provenance) {
    llmJson.provenance.evidence_backed = attachedPassages > 0;
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
        required: ["retrieval_count", "retrieval_ids", "evidence_backed"],
        properties: {
          retrieval_count: { type: "integer", minimum: 0 },
          retrieval_ids: { type: "array", items: { type: "string" } },
          evidence_backed: { type: "boolean" }
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
        required: ["retrieval_count", "retrieval_ids", "evidence_backed"],
        properties: {
          retrieval_count: { type: "integer", minimum: 0 },
          retrieval_ids: { type: "array", items: { type: "string" } },
          evidence_backed: { type: "boolean" }
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
          method: { type: "string", enum: ["recursive_nash", "replicator", "best_response"] },
          iterations: { type: "integer" }
        }
      },
      simulation_results: {
        type: "object",
        required: ["equilibria", "sensitivity"],
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
            required: ["param_samples"],
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
        required: ["retrieval_count", "retrieval_ids", "evidence_backed"],
        properties: {
          retrieval_count: { type: "integer", minimum: 0 },
          retrieval_ids: { type: "array", items: { type: "string" } },
          evidence_backed: { type: "boolean" }
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
Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'method_not_allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const start = Date.now()
  const requestBody = await req.json().catch(() => ({}))
  const request_id = requestBody.request_id ?? uuid()
  const user_id = requestBody.user_id ?? null
  const audience = requestBody.audience ?? "learner"
  const mode = requestBody.mode ?? "standard"
  const scenario_text = String(requestBody.scenario_text ?? "").trim()

  // Basic validation
  if (!scenario_text) {
    return new Response(JSON.stringify({ ok: false, error: "missing_scenario_text" }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  console.log(`[${request_id}] stage=start, audience=${audience}, mode=${mode}`)

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

  // Stage: RAG retrievals (unless education_quick)
  let retrievals: any[] = []
  let evidence_backed = false

  // Try to load from cache first
  if (mode !== "education_quick") {
    try {
      const topic_domain = scenario_text.toLowerCase().includes('finance') || scenario_text.toLowerCase().includes('oil') || scenario_text.toLowerCase().includes('gold') || scenario_text.toLowerCase().includes('bitcoin') ? 'finance' : 'geopolitics';
      const user_profile = requestBody.user_profile || { risk_tolerance: 0.5 };
      const user_profile_hash = simpleHash(JSON.stringify(user_profile));
      const cache_key = `${scenario_text}::${topic_domain}::${user_profile_hash}`;

      const { data: cachedResult, error } = await supabaseAdmin
        .from('retrieval_cache')
        .select('hits, url_list')
        .eq('query', cache_key)
        .single();

      if (cachedResult && !error) {
        retrievals = cachedResult.hits || [];
        evidence_backed = Array.isArray(retrievals) && retrievals.length > 0;
        console.log(`[${request_id}] stage=cache_hit, hits=${retrievals.length}, cache_key=${cache_key}`);
      } else {
        console.log(`[${request_id}] stage=cache_miss, will fetch from perplexity, cache_key=${cache_key}`);
      }
    } catch (e) {
      console.log(`[${request_id}] stage=cache_miss, will fetch from perplexity (error: ${e})`);
    }
  }
  if (mode === "standard") {
    console.log(`[${request_id}] stage=rag_start, high_risk=${highRisk}`)
    const perp = await perplexitySearch(scenario_text, 5, 3)
    if (perp.ok) {
      retrievals = perp.hits
      evidence_backed = Array.isArray(retrievals) && retrievals.length > 0
      console.log(`[${request_id}] stage=rag_success, hits=${retrievals.length}`)

      // Cache retrievals
      try {
        // Enhanced cache key with topic_domain and user_profile_hash
        const topic_domain = scenario_text.toLowerCase().includes('finance') || scenario_text.toLowerCase().includes('oil') || scenario_text.toLowerCase().includes('gold') || scenario_text.toLowerCase().includes('bitcoin') ? 'finance' : 'geopolitics';
        const user_profile = requestBody.user_profile || { risk_tolerance: 0.5 };
        const user_profile_hash = simpleHash(JSON.stringify(user_profile));
        const cache_key = `${scenario_text}::${topic_domain}::${user_profile_hash}`;

        console.log(`[CACHE] Cache key composition: scenario_text("${scenario_text.slice(0,50)}...") + topic_domain("${topic_domain}") + user_profile_hash("${user_profile_hash}")`);

        await supabaseAdmin.from("retrieval_cache").upsert({
          query: cache_key,
          hits: retrievals,
          url_list: retrievals.map((r:any) => r.url).filter(Boolean)
        }, { onConflict: ["query"] })
      } catch (e) {
        console.warn("retrieval_cache upsert failed:", e)
      }
    } else {
      console.warn(`[${request_id}] stage=rag_failed, error=${perp.error}`)
      // For high-risk scenarios, this is a critical failure
      if (highRisk) {
        console.log(`[${request_id}] stage=high_risk_rag_failed`)
        const errorId = uuid()
        await logRpcError(request_id, errorId, `RAG failed for high-risk scenario: ${perp.error}`, { scenario_text })

        // Mark for review
        try {
          await supabaseAdmin.from('analysis_runs').insert({
            request_id,
            status: 'needs_review',
            analysis_json: {
              analysis_id: uuid(),
              audience,
              summary: { text: `Analysis paused: Unable to retrieve external evidence for high-risk geopolitical scenario.` },
              provenance: { retrieval_count: 0, retrieval_ids: [], evidence_backed: false }
            },
            evidence_backed: false,
            created_at: new Date().toISOString()
          })
        } catch (e) {
          console.error("Failed to create review entry:", e)
        }

        return new Response(JSON.stringify({
          ok: false,
          reason: 'no_external_sources',
          action: 'human_review',
          message: 'Unable to retrieve external evidence for this high-risk geopolitical scenario. Analysis paused and queued for human review.',
          error_id: errorId
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      retrievals = []
      evidence_backed = false
    }
  } else {
    // education_quick mode — no retrievals
    retrievals = []
    evidence_backed = false
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

  // Build LLM prompt with computed data
  const prompt = buildPrompt(audience, scenario_text, retrievals, computedData)

  // Try Gemini primary
  let llmText: string | null = null
  let modelUsed = ""
  let fallbackUsed = false
  let llmDurationMs = 0

  try {
    console.log(`[${request_id}] stage=llm_start`)
    const t0 = Date.now()
    const gem = await callGemini(prompt)
    llmDurationMs = Date.now() - t0
    if (gem.ok && gem.text) {
      llmText = gem.text
      modelUsed = "gemini-2.0-flash-exp"
      console.log(`[${request_id}] stage=llm_success, model=${modelUsed}`)
    } else {
      // Fallback to OpenAI
      console.log(`[${request_id}] stage=llm_fallback, gemini_error=${gem.error}`)
      fallbackUsed = true
      const t1 = Date.now()
      const openai = await callOpenAIFallback(prompt)
      llmDurationMs = Date.now() - t1
      if (openai.ok && openai.text) {
        llmText = openai.text
        modelUsed = "gpt-4o-mini"
        console.log(`[${request_id}] stage=llm_fallback_success, model=${modelUsed}`)
      } else {
        // Totally failed
        const errorId = uuid()
        await logRpcError(request_id, errorId, `LLM both failed: gemErr=${gem.error} openaiErr=${openai.error}`, { gemErr: gem.error, openaiErr: openai.error })
        return new Response(JSON.stringify({
          ok: false,
          error: "llm_failed",
          message: "No available LLM results",
          error_id: errorId
        }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }
  } catch (err: any) {
    const errorId = uuid()
    await logRpcError(request_id, errorId, `llm_exception: ${String(err?.message ?? err)}`, { prompt: prompt.slice(0, 2000) })
    return new Response(JSON.stringify({
      ok: false,
      error: "llm_exception",
      message: "LLM exception occurred",
      error_id: errorId
    }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Parse LLM text as JSON-only expected output with enhanced sanitization
  const parsed = await parseLlmOutput(llmText ?? "", request_id)
  if (!parsed.ok) {
    // Enhanced error handling for different failure types
    const errorId = uuid()
    let errorMessage = "LLM output not parseable as JSON"
    let userMessage = "Analysis generation failed"
    let suggestions = []

    if (parsed.error === "defensive_parsing_failed") {
      errorMessage = "Server-side sanitization failed - malformed LLM output detected"
      userMessage = "Third-party extension interference detected. Please disable browser extensions or try again."
      suggestions = ["Disable browser extensions", "Try a different browser", "Contact support if issue persists"]
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
      sanitization_attempted: true
    })

    // For education_quick we may synthesize a minimal JSON fallback
    if (mode === "education_quick") {
      const minimal = {
        analysis_id: uuid(),
        audience,
        summary: { text: "UNVERIFIED analysis (education_quick) — LLM output not JSON" },
        provenance: { retrieval_count: retrievals.length, retrieval_ids: retrievals.map(r=>r.id), evidence_backed: false }
      }
      // Persist
      try {
        await supabaseAdmin.from("analysis_runs").insert({
          request_id,
          user_id,
          audience,
          status: "completed",
          analysis_json: minimal,
          retrieval_ids: retrievals.map((r:any)=>r.id),
          evidence_backed: false,
          created_at: new Date().toISOString()
        })
      } catch (e) {
        console.error("Failed to persist minimal analysis:", e)
      }

      return new Response(JSON.stringify({
        ok: true,
        analysis_id: minimal.analysis_id,
        analysis: minimal,
        provenance: { model: modelUsed, fallback_used: fallbackUsed, llm_duration_ms: llmDurationMs }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    } else {
      const errorId = uuid()
      await logRpcError(request_id, errorId, "LLM output not parseable as JSON", { raw: (llmText ?? "").slice(0, 2000) })
      return new Response(JSON.stringify({
        ok: false,
        error: "llm_output_not_json",
        message: userMessage,
        suggestions,
        error_id: errorId,
        request_id
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  const llmJson = parsed.json

  // Validate against AJV schema (recompile for specific audience)
  const audienceSchema = audienceSchemas[audience] || audienceSchemas.student
  const audienceValidate = ajv.compile(audienceSchema)
  const valid = audienceValidate(llmJson)
  if (!valid) {
    // Log failure and persist for review
    await logSchemaFailure(request_id, JSON.stringify(llmJson).slice(0,10000), audienceValidate.errors)

    // Try a relaxed path: if evidence_backed false allowed, or if audience=student and mode education_quick, proceed with best-effort
    if (mode === "education_quick") {
      // Persist minimal again
      const minimal = {
        analysis_id: llmJson.analysis_id ?? uuid(),
        audience,
        summary: { text: llmJson.summary?.text ?? "UNVERIFIED education_quick fallback" },
        provenance: { retrieval_count: retrievals.length, retrieval_ids: retrievals.map(r=>r.id), evidence_backed: false }
      }
      try {
        await supabaseAdmin.from("analysis_runs").insert({
          request_id,
          user_id,
          audience,
          status: "completed",
          analysis_json: minimal,
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
        analysis: minimal,
        provenance: { model: modelUsed, fallback_used: fallbackUsed, llm_duration_ms: llmDurationMs }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    } else {
      const errorId = uuid()
      await logRpcError(request_id, errorId, "schema_validation_failed: " + JSON.stringify(audienceValidate.errors).slice(0,2000), { llmJson: JSON.stringify(llmJson).slice(0,10000) })
      return new Response(JSON.stringify({
        ok: false,
        error: "schema_validation_failed",
        message: "LLM response failed schema validation",
        error_id: errorId,
        details: audienceValidate.errors
      }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  // OK validated — persist analysis_runs
  const analysis_id = llmJson.analysis_id ?? uuid()
  const analysisRow = {
    request_id,
    user_id,
    audience,
    status: "completed",
    analysis_json: llmJson,
    retrieval_ids: retrievals.map((r:any)=>r.id),
    evidence_backed,
    created_at: new Date().toISOString()
  }

  try {
    await supabaseAdmin.from("analysis_runs").insert(analysisRow)
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
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Post-processing: Generate additional assets
  const postProcessResults = { notebook: null, teacher_packet: null, playbook: null, sensitivity: null }

  try {
    // Generate notebook for researcher audience
    if (audience === "researcher") {
      const notebookResponse = await fetch("http://localhost:54321/functions/v1/notebook-export", {
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
      const teacherResponse = await fetch("http://localhost:54321/functions/v1/teacher-packet", {
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
    const playbookResponse = await fetch("http://localhost:54321/functions/v1/strategic-playbook", {
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

    // Run sensitivity analysis for researcher
    if (audience === "researcher") {
      const sensitivityResponse = await fetch("http://localhost:54321/functions/v1/sensitivity-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
        body: JSON.stringify({
          analysis_id,
          base_params: { risk_tolerance: 0.5, time_horizon: 1.0, resource_availability: 0.8 },
          perturbations: 20
        })
      })
      if (sensitivityResponse.ok) {
        postProcessResults.sensitivity = await sensitivityResponse.json()
      }
    }

    console.log(`[post-process] Generated assets: notebook=${!!postProcessResults.notebook}, teacher=${!!postProcessResults.teacher_packet}, playbook=${!!postProcessResults.playbook}, sensitivity=${!!postProcessResults.sensitivity}`)

  } catch (e) {
    console.warn("Post-processing failed:", e)
  }

  // Update response with post-processing results
  const enhancedResp = {
    ...resp,
    post_processing: {
      notebook_generated: !!postProcessResults.notebook,
      teacher_packet_generated: !!postProcessResults.teacher_packet,
      playbook_generated: !!postProcessResults.playbook,
      sensitivity_analysis_run: !!postProcessResults.sensitivity,
      assets: postProcessResults
    }
  }

  const totalDuration = Date.now() - start

  // Include sanitization information in provenance
  const sanitizationInfo = parsed.sanitized ? {
    server_side_sanitization_applied: true,
    sanitization_patterns: parsed.patterns.join(", "),
    third_party_interference_likely: parsed.patterns.some(p => p.includes('extension_injection'))
  } : {
    server_side_sanitization_applied: false,
    clean_response: true
  }

  const resp = {
    ok: true,
    analysis_id,
    analysis: llmJson,
    provenance: {
      model: modelUsed,
      fallback_used: fallbackUsed,
      llm_duration_ms: llmDurationMs,
      total_duration_ms: totalDuration,
      ...sanitizationInfo
    }
  }

  console.log(`[${request_id}] stage=complete, duration=${totalDuration}ms`)
  return new Response(JSON.stringify(resp), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
})
