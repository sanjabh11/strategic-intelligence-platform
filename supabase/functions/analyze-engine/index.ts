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

Scenario: ${scenario}
${retrievalBlock}
Constraints: produce a student-level deliverable.

Produce the following JSON exactly:

{
  "analysis_id": "${uuid()}",
  "audience": "student",
  "one_paragraph_summary": {"text": "A concise summary of the scenario in simple terms."},
  "top_2_actions": [
    {"action": "Action 1", "rationale": "Reasoning for action", "expected_outcome": {"value": 0.8, "confidence": 0.7, "sources": [{"id": "source1", "score": 0.9, "excerpt": "Excerpt"}]}}
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

Scenario: ${scenario}
${retrievalBlock}
Assumptions: ${JSON.stringify({ seed: Date.now() })}
Computed Data: ${JSON.stringify({ ev_ranking: evData.ranking, sensitivity_samples: sensitivityData.param_samples.slice(0, 3) })}

Produce learner JSON structure with decision_table, expected_value_ranking, sensitivity_advice, exercise, and provenance.
Include realistic payoff estimates and risk assessments based on the scenario.`
  } else if (audience === "researcher") {
    const sensitivityData = computedData?.sensitivity || { param_samples: [], analysis_notes: "Sensitivity analysis pending" }

    return `You are a Strategic Research Assistant. Produce a JSON-only research package with reproducible artifacts.

Scenario: ${scenario}
${retrievalBlock}
Model parameters: ${JSON.stringify({ seed: Date.now() })}
Sensitivity Analysis: ${JSON.stringify(sensitivityData.param_samples.slice(0, 5))}

Produce researcher JSON with payoff_matrix, solver_config, simulation_results, notebook_snippet, data_exports, and provenance.
Include detailed assumptions, parameter ranges, and reproducible simulation setup.`
  } else {
    // teacher
    return `You are a Strategic Education Designer. Produce a JSON-only teacher packet.

Scenario: ${scenario}
${retrievalBlock}
Produce teacher JSON with lesson_outline, simulation_setup, grading_rubric, student_handouts, sample_solutions, and provenance.
Include practical classroom activities and assessment methods.`
  }
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

// Simplified schemas for audience outputs (based on Ph2.md specs)
const numericObjectSchema = {
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
        required: ["id", "score"],
        properties: {
          id: { type: "string" },
          score: { type: "number", minimum: 0, maximum: 1 },
          excerpt: { type: "string" }
        }
      }
    }
  }
};

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
          properties: {
            action: { type: "string" },
            rationale: { type: "string" },
            expected_outcome: numericObjectSchema
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
          properties: {
            actor: { type: "string" },
            action: { type: "string" },
            payoff_estimate: numericObjectSchema,
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
  if (mode === "standard") {
    console.log(`[${request_id}] stage=rag_start, high_risk=${highRisk}`)
    const perp = await perplexitySearch(scenario_text, 5, 3)
    if (perp.ok) {
      retrievals = perp.hits
      evidence_backed = Array.isArray(retrievals) && retrievals.length > 0
      console.log(`[${request_id}] stage=rag_success, hits=${retrievals.length}`)

      // Cache retrievals
      try {
        await supabaseAdmin.from("retrieval_cache").upsert({
          query: scenario_text,
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

  // Parse LLM text as JSON-only expected output
  const parsed = await safeJsonParse(llmText ?? "")
  if (!parsed.ok) {
    // If LLM returned non-JSON, log and optionally try to extract JSON via regex
    const errorId = uuid()
    await logSchemaFailure(request_id, llmText ?? "", [{ message: "llm_output_not_json" }])

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
        message: "LLM did not return valid JSON",
        error_id: errorId
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
  const resp = {
    ok: true,
    analysis_id,
    analysis: llmJson,
    provenance: {
      model: modelUsed,
      fallback_used: fallbackUsed,
      llm_duration_ms: llmDurationMs,
      total_duration_ms: totalDuration
    }
  }

  console.log(`[${request_id}] stage=complete, duration=${totalDuration}ms`)
  return new Response(JSON.stringify(resp), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
})
