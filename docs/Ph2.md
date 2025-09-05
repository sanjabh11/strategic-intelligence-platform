Four ready-to-paste LLM prompt templates (student / learner / researcher / teacher) that force JSON-only outputs with structured fields and provenance. Use these with Gemini 2.5 Pro (or your LLM of choice).

A compact AJV JSON Schema snippet that defines the { value, confidence, sources } numeric shape and the top-level analysis response structure.

A short TypeScript AJV validator handler you can drop into your Edge function (validates LLM output and logs failures).

A pre-PRD addendum: top 10 user stories (details, acceptance criteria, priority), with exact API endpoints used, required DB tables (with SQL migration snippets), and the implementation step-by-step plan to ship these features.

I planned every line carefully so you can implement this immediately. Copy/paste is safe; adapt names if your current code uses different conventions.

1) LLM prompt templates — paste into your analyze-engine prompt layer

These prompts intentionally:

Force JSON-only responses (no extraneous prose)

Provide exact output schema to produce per mode

Require source-citation mapping (retrieval_ids + snippets)

Provide audience-specific deliverables (e.g., quizzes for Students, notebook+data for Researchers)

Include confidence intervals and sensitivity results

Ask for minimal-length answers and for validation checks

Use as the system + user prompt corpus in the API call.

1.A Student mode (concise, actionable, learning)
SYSTEM PROMPT:
You are a Strategic Intelligence Teaching Assistant. For any geopolitical or strategic scenario provided, produce a JSON-only response that is short, simple, and teaches a student. Output must validate against the provided JSON schema (see "student_output_schema"). Never include prose outside the JSON — only produce the JSON object.

STUDENT PROMPT:
Scenario: {scenario_text}
Retrievals: {retrievals}  // array of {id,title,url,snippet}
Constraints: produce a student-level deliverable.

Produce the following JSON exactly:

student_output_schema:
{
  "analysis_id": "<string>",
  "audience": "student",
  "one_paragraph_summary": {"text":"<plain english 2-4 sentences>"},
  "top_2_actions": [
    {"action":"<string>", "rationale":"<1-2 sentences>", "expected_outcome":{"value":<number>,"confidence":<0-1>,"sources":[{id,score,excerpt}]}}
  ],
  "key_terms": [{"term":"<string>","definition":"<one-sentence>"}],
  "two_quiz_questions": [
    {"q":"<text>","answer":"<text>","difficulty":"easy|medium"}
  ],
  "provenance": {
    "retrieval_count": <integer>,
    "retrieval_ids": ["id1","id2"],
    "evidence_backed": true|false
  }
}

Always include numeric confidences as floats 0.0–1.0 and attach sources (retrieval ids). If retrieval_count == 0 set evidence_backed:false and add a one-line disclaimer in "one_paragraph_summary".

1.B Learner mode (intermediate, guided practice + EV calc)
SYSTEM PROMPT:
You are a Strategic Intelligence Tutor. For the scenario produce a JSON-only 'learner' report that includes an EV-style decision table and a short guided solution the learner can follow. Validate against the learner_output_schema.

LEARNER PROMPT:
Scenario: {scenario_text}
Retrievals: {retrievals}
Assumptions: {assumptions} // optional numeric seeds
Produce JSON:

learner_output_schema:
{
  "analysis_id": "<string>",
  "audience": "learner",
  "summary": {"text":"<3-6 sentences>"},
  "decision_table": [
    {
      "actor":"<string>",
      "action":"<string>",
      "payoff_estimate": {"value":<number>,"confidence":<0-1>,"sources":[{id,score,excerpt}]},
      "risk_notes":"<text>"
    }
  ],
  "expected_value_ranking":[
    {"action":"<string>","ev":<number>,"ev_confidence":<0-1>}
  ],
  "sensitivity_advice": {
    "most_sensitive_parameters": [{"param":"<string>","impact_score":<0-1>}],
    "tipping_points": [{"param":"<string>","threshold":<number>}]
  },
  "exercise": {
    "task":"<text>",
    "hints":["hint1","hint2"]
  },
  "provenance": {"retrieval_count":<int>,"retrieval_ids":[...],"evidence_backed":true|false}
}

If no retrievals, set evidence_backed:false and provide suggested search queries to validate the EV numbers.

1.C Researcher mode (deep, reproducible)
SYSTEM PROMPT:
You are a Strategic Research Assistant. Produce a JSON-only research package with reproducible artifacts: exact payoff matrices, solver seeds, simulation parameters, sensitivity distributions, and a suggested Colab/Jupyter snippet. Validate against researcher_output_schema.

RESEARCHER PROMPT:
Scenario: {scenario_text}
Retrievals: {retrievals}
Model parameters: {params}

researcher_output_schema:
{
  "analysis_id":"<string>",
  "audience":"researcher",
  "long_summary":{"text":"<up to 400 words>"},
  "assumptions":[{"name":"<string>","value":<number>,"justification":"<source excerpt>"}],
  "payoff_matrix": {
    "players": ["p1","p2",...],
    "actions_by_player": [["a1","a2"],["b1","b2"]],
    "matrix_values": [[[ <num> , <num> ],[...]], ...]  // nested numeric structure
  },
  "solver_config": {"seed":<int>,"method":"recursive_nash|replicator|best_response","iterations":<int>},
  "simulation_results": {
    "equilibria":[
      {"type":"pure|mixed","profile":[{"player":"p1","action_probabilities":[0.6,0.4]}],"stability":<0-1>,"confidence":<0-1>}
    ],
    "sensitivity": {"param_samples": [{"param":"p","range":[min,max],"effect_on_outcome":<number>}]}
  },
  "notebook_snippet":"<base64 or raw code block to seed a Colab notebook>",
  "data_exports": {"payoff_csv_url":"<url>","simulations_json_url":"<url>"},
  "provenance":{"retrieval_count":<int>,"retrieval_ids":[...],"evidence_backed":true|false}
}

Require exact numeric arrays and random seed. Include at least 3 retrievals for evidence_backed:true.

1.D Teacher mode (lesson plan + class simulation)
SYSTEM PROMPT:
You are a Strategic Education Designer. Produce a JSON-only teacher packet: lesson plan, simulation rules, grading rubric, and slides outline. Validate against teacher_output_schema.

TEACHER PROMPT:
Scenario: {scenario_text}
Retrievals: {retrievals}

teacher_output_schema:
{
  "analysis_id":"<string>",
  "audience":"teacher",
  "lesson_outline": {"duration_minutes":<int>,"learning_objectives":["<obj1>","<obj2>"],"summary":"<text>"},
  "simulation_setup": {
    "roles":[{"role":"p1","instructions":"...","payoff_card_url":"<url>"}],
    "rounds":<int>,
    "timing_minutes_per_round":<int>
  },
  "grading_rubric": [{"criteria":"<text>","max_points":<int>,"description":"<text>"}],
  "student_handouts":["<url1>"],
  "sample_solutions":["<url or short text>"],
  "provenance":{"retrieval_count":<int>,"retrieval_ids":[...],"evidence_backed":true|false}
}

If evidence_backed:false mark all factual claims in the lesson with [[UNVERIFIED]] and include discussion prompts to evaluate sources in class.

2) JSON schema + AJV rules for {value,confidence,sources}

Below is the JSON Schema snippet for the common numeric object shape and a larger analysis object skeleton. Use this in AJV to validate LLM outputs. I also provide the AJV TypeScript validator snippet below.

2.A JSON Schema snippet (Draft-07 compatible)
{
  "$id": "https://example.com/schemas/analysis.schema.json",
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Strategic Analysis Output",
  "type": "object",
  "required": ["analysis_id","audience","summary","provenance"],
  "properties": {
    "analysis_id": { "type": "string", "minLength": 1 },
    "audience": { "type": "string", "enum": ["student","learner","researcher","teacher"] },
    "summary": { "type": "object", "required":["text"], "properties": { "text": { "type": "string" } } },
    "provenance": {
      "type": "object",
      "required": ["retrieval_count","retrieval_ids","evidence_backed"],
      "properties": {
        "retrieval_count": { "type": "integer", "minimum": 0 },
        "retrieval_ids": {
          "type": "array",
          "items": { "type": "string" },
          "uniqueItems": true
        },
        "evidence_backed": { "type": "boolean" }
      }
    },
    "numeric_object": {
      "type": "object",
      "additionalProperties": false,
      "required": ["value","confidence","sources"],
      "properties": {
        "value": { "type": "number", "minimum": -1e12, "maximum": 1e12 },
        "confidence": { "type": "number", "minimum": 0.0, "maximum": 1.0 },
        "sources": {
          "type": "array",
          "minItems": 1,
          "items": {
            "type": "object",
            "required": ["id","score"],
            "properties": {
              "id": { "type": "string" },
              "score": { "type": "number", "minimum": 0.0, "maximum": 1.0 },
              "excerpt": { "type": "string" }
            },
            "additionalProperties": false
          }
        }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": true
}


Notes / enforcement rules

value accepts negative or positive numbers (range chosen wide — adjust to domain-specific).

confidence must be in [0,1].

sources must be non-empty array with at least one {id,score}.

Use numeric_object as schema for any numeric claims (payoffs, EVs, probabilities).

2.B AJV validator — TypeScript handler

Drop this into your Edge Function to validate LLM JSON output and log failures.

// validateLLMOutput.ts
import Ajv from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv({ allErrors: true, removeAdditional: false });
addFormats(ajv);

// Load schema (inline or require JSON)
const schema = /* paste the JSON schema object above */;
const validate = ajv.compile(schema);

export function validateLLMOutput(obj: any) {
  const valid = validate(obj);
  if (!valid) {
    return { ok: false, errors: validate.errors };
  }
  return { ok: true };
}


Edge function usage (async handler)

import { validateLLMOutput } from "./validateLLMOutput";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function handleLLMResponse(requestId: string, llmJson: any) {
  const res = validateLLMOutput(llmJson);
  if (!res.ok) {
    // Log into schema_failures table
    await supabaseAdmin.from("schema_failures").insert({
      request_id: requestId,
      raw_response: JSON.stringify(llmJson).slice(0, 10000),
      validation_errors: JSON.stringify(res.errors),
      created_at: new Date().toISOString()
    });
    // Return actionable error (or proceed to fallback)
    return { ok: false, reason: "schema_validation_failed", errors: res.errors };
  }
  // OK — continue processing, persist analysis
  return { ok: true };
}


Logging table (schema_failures) SQL provided below in DB migrations.

3) Pre-PRD addendum: top 10 user stories + endpoints + tables + acceptance criteria

Below are the top 10 implementation user stories (prioritized). Each story includes: description, acceptance criteria, endpoints touched, DB tables used, and dev tasks. Use this as a pre-PRD addendum to track implementation.

Note: I assume your primary analyze endpoint is POST /functions/v1/analyze-engine and there is worker POST /worker/jobs and retrieval table retrieval_cache.

User Story 1 — Audience-Specific Output Modes (student/learner/researcher/teacher)

As a product owner
I want the analyze API to accept audience and produce tailored JSON output (student/learner/researcher/teacher)
So that each user type receives relevant deliverables.

Acceptance Criteria

POST /analyze-engine accepts audience param (default learner).

LLM prompt used matches templates above.

Response validates against JSON schema and provenance included.

UI displays correct components per audience.

Endpoints

POST /functions/v1/analyze-engine

Tables

analysis_runs (store analysis_json, audience, status)

Dev tasks

Add audience param in frontend call and EdgeFn

Integrate corresponding prompt template

Validate with AJV and persist to DB

User Story 2 — Evidence-Provenance Mapping

As an analyst
I want every numeric claim to link to retrieval ids and snippets
So that I can audit claims and teach evidence assessment.

Acceptance Criteria

Every numeric field includes {value,confidence,sources} per schema.

retrieval_cache contains up-to-date hits and is referenced by retrieval_ids.

UI allows clicking a source and viewing snippet.

Endpoints

POST /functions/v1/analyze-with-rag

GET /functions/v1/retrieval/{id}

Tables

retrieval_cache, analysis_runs

Dev tasks

Change prompt to require sources

Store retrievals and link to analysis_runs

User Story 3 — EV Decision Table Builder

As a learner/researcher
I want an expected-value table for candidate actions
So that decisions are ranked quantitatively.

Acceptance Criteria

decision_table object returned with payoff_estimate fields.

UI shows EV ranking.

Ability to override payoff inputs.

Endpoints

POST /functions/v1/analyze-engine (with ev_overrides optional)

Tables

analysis_runs, user_overrides (optional)

Dev tasks

Implement EV calc server-side or worker

UI form for overrides

User Story 4 — Sensitivity Analysis Module

As a researcher
I want automated sensitivity runs that perturb key params and return impact scores
So that I can see robustness of recommendations.

Acceptance Criteria

simulation_results.sensitivity present with param samples and effect sizes

UI displays tornado plot / table

Endpoints

POST /worker/jobs (job type sensitivity)

GET /functions/v1/analysis/{id}

Tables

simulation_runs, analysis_equilibria

Dev tasks

Worker ability to run N perturbs, compute delta metrics

Store results and visualize

User Story 5 — Reproducible Notebook & Data Export

As a researcher/teacher
I want a downloadable notebook that replays analysis
So that the analysis is reproducible and teachable.

Acceptance Criteria

Notebook includes retrievals, payoff matrix, solver seed, and plotting code.

data_exports URLs (CSV/JSON) included in response.

Endpoints

GET /functions/v1/analysis/{id}/export_notebook

Tables

analysis_runs, retrieval_cache, simulation_runs

Dev tasks

Notebook template generator (server-side)

Host generated notebook on a signed URL

User Story 6 — Human Review & Publishing Workflow

As an ops/admin
I want analyses flagged for human review if high-stakes or evidence_backed:false
So that we prevent unvetted geopolitical claims going public.

Acceptance Criteria

analysis_runs.status supports queued, under_review, approved, rejected.

Reviewer UI with note and approval button.

Public UI only shows approved analyses for public learners.

Endpoints

POST /functions/v1/analysis/{id}/review

GET /functions/v1/review_queue

Tables

analysis_runs, human_reviews, users

Dev tasks

Admin UI + API

RLS policies on Supabase for reviewer roles

User Story 7 — Education Packets (auto-generated lesson + quiz)

As a teacher
I want auto-generated lesson plan and quiz per analysis
So that I can immediately use the result in class.

Acceptance Criteria

Teacher JSON includes lesson_outline, simulation_setup, gr rubrics.

Downloadable slides or handouts (PDF/HTML).

Endpoints

GET /functions/v1/analysis/{id}/teacher_packet

Tables

analysis_runs, asset_storage (links to handouts)

Dev tasks

LLM prompt template for teacher outputs

Asset generator (PDF/HTML)

User Story 8 — Strategic Playbooks (tactical checklists)

As a policy advisor
I want short tactical checklists for top recommended actions
So that teams can execute quickly.

Acceptance Criteria

playbook array present in response with steps, KPIs, trigger_conditions.

Each step maps to a recommended owner role.

Endpoints

POST /functions/v1/analyze-engine (playbook flag)

GET /functions/v1/analysis/{id}

Tables

analysis_runs

Dev tasks

LLM prompt for playbook generation

UI component for display and tracking

User Story 9 — Collective Aggregation & Privacy

As a platform owner
I want to collect anonymous strategic outcomes for aggregate insights while preserving privacy
So that we can publish meta-findings without exposing users.

Acceptance Criteria

collective_aggregates only written when minUsers threshold met

DP noise applied and dpEpsilon recorded

Endpoints

POST /functions/v1/aggregate_result

GET /functions/v1/aggregates/{metric}

Tables

collective_aggregates

Dev tasks

DP aggregation function (worker)

RLS and privacy compliance checks

User Story 10 — Monitoring & CI for Canonical Games

As QA lead
I want automated unit and integration tests for canonical games (PD, SH, MP) run on CI
So that core algorithms remain correct.

Acceptance Criteria

Unit tests in CI pass and are deterministic (seeded RNG)

Degraded behavior triggers alerting and blocks deployment

Endpoints

CI hooks; no new endpoint

Tables

tests artifacts (stored logs) optionally

Dev tasks

Implement deterministic test suite and integrate into pipeline

DB table migrations (essential ones) — run on Supabase SQL console

Below are the minimal SQL migrations for tables referenced above. Adjust types/constraints to your conventions.

analysis_runs
CREATE TABLE IF NOT EXISTS analysis_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT,
  user_id UUID REFERENCES users(id),
  audience TEXT CHECK (audience IN ('student','learner','researcher','teacher')) DEFAULT 'learner',
  status TEXT DEFAULT 'queued',
  analysis_json JSONB,
  retrieval_ids TEXT[] DEFAULT '{}',
  evidence_backed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_analysis_runs_request_id ON analysis_runs(request_id);

retrieval_cache
CREATE TABLE IF NOT EXISTS retrieval_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  hits JSONB NOT NULL, -- array of {id,title,url,snippet}
  url_list TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  unique(query)
);
CREATE INDEX IF NOT EXISTS idx_retrieval_cache_query ON retrieval_cache USING gin (to_tsvector('english', query));

schema_failures
CREATE TABLE IF NOT EXISTS schema_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT,
  raw_response TEXT,
  validation_errors JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

rpc_errors
CREATE TABLE IF NOT EXISTS rpc_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT,
  error_id TEXT,
  error_message TEXT,
  payload TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

simulation_runs (store simulation details)
CREATE TABLE IF NOT EXISTS simulation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_run_id UUID REFERENCES analysis_runs(id) ON DELETE CASCADE,
  job_id TEXT,
  solver_config JSONB,
  result_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

collective_aggregates
CREATE TABLE IF NOT EXISTS collective_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key TEXT NOT NULL,
  bucket_key TEXT NOT NULL,
  noisy_value NUMERIC,
  dp_epsilon NUMERIC,
  user_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

4) End-to-end step-by-step implementation plan (developer checklist)

Follow these steps in order. Each step maps to stories above.

Sprint 0 (prep / infra)

 Add AJV schema and validateLLMOutput util to codebase.

 Run DB migrations above on staging.

 Add CI job for canonical game tests (seeded).

Sprint 1 (audience & provenance)

 Implement audience param in frontend and EdgeFn (use templates above).

 Add retrieval caching: ensure worker/EdgeFn writes retrieval_cache.

 Enforce AJV validation on LLM outputs and log schema_failures.

Sprint 2 (decisionization & sensitivity)

 Implement EV table builder (server-side or worker) and UI override.

 Add worker job type sensitivity to run perturbations and store result.

Sprint 3 (education & reproducibility)

 Implement notebook export generator.

 Add teacher tools (lesson packet generator, handouts).

 Add playbook generation.

Sprint 4 (ops & privacy)

 Implement human review UI + reviewer role RLS.

 Implement collective aggregation with DP and enforce minUsers.

 Add system-status and health checks for worker and Perplexity.

Sprint 5 (polish & measurement)

 Run end-to-end tests for canonical scenarios and run pilot with students/teachers.

 Collect metrics and iterate. Ensure evidence_backed > 90% for geopolitics (with Perplexity operational).

5) Quick integrator snippets — sample request/response and endpoint definitions
API: POST /functions/v1/analyze-engine

Request body

{
  "request_id": "string",
  "user_id": "uuid",
  "audience": "student|learner|researcher|teacher",
  "scenario_text": "string",
  "mode": "standard|education_quick",
  "ev_overrides": { /* optional */ }
}


Response (success)

{
  "ok": true,
  "analysis_id": "uuid",
  "audience": "learner",
  "analysis": { /* validated JSON per templates above */ }
}

API: POST /functions/v1/analyze-with-rag (internal)

performs retrieval via Perplexity, returns retrievals array to EdgeFn.

API: POST /worker/jobs

Enqueues heavy compute (sensitivity, simulation, notebooks).

Final notes & next immediate actions I recommend you run now

Paste the LLM prompt templates into your analyze-engine prompt manager. Start with student and learner modes to get quick wins.

Add the AJV schema and validator into the EdgeFn and enable strict validation in staging; log failures to schema_failures.

Run the DB migrations on staging.

Implement one full end-to-end test: POST /analyze-engine with audience=student for India-US tariffs; check that your response contains provenance.retrieval_ids and the JSON validates.

After staging tests pass, roll out to production, then implement the remaining stories in order (EV & sensitivity next).
Save this as supabase/functions/analyze-engine/index.ts (or your Edge Function entry file).

Note: adjust import paths and runtime target if your environment differs (Supabase Edge Functions, Deno/Node). This code is Node/TS-flavored for typical Supabase Edge with @supabase/supabase-js support.

// analyze-engine/index.ts
// Edge Function: analyze-engine
// Requirements: node >= 18, supabase/functions runtime
//
// ENV (required):
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// PERPLEXITY_KEY
// GEMINI_API_KEY
// OPENAI_KEY (fallback)
// WORKER_URL (optional) - e.g. http://worker-host:3001/jobs
//
// Tables assumed: analysis_runs, retrieval_cache, schema_failures, rpc_errors

import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import crypto from "crypto";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PERPLEXITY_KEY = process.env.PERPLEXITY_KEY ?? "";
const GEMINI_KEY = process.env.GEMINI_API_KEY ?? "";
const OPENAI_KEY = process.env.OPENAI_KEY ?? "";
const WORKER_URL = process.env.WORKER_URL ?? "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase environment variables");
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// --- AJV Schema (simplified / core) ---
const schema = {
  type: "object",
  required: ["analysis_id", "audience", "summary", "provenance"],
  properties: {
    analysis_id: { type: "string" },
    audience: { type: "string", enum: ["student", "learner", "researcher", "teacher"] },
    summary: { type: "object", required: ["text"], properties: { text: { type: "string" } } },
    provenance: {
      type: "object",
      required: ["retrieval_count", "retrieval_ids", "evidence_backed"],
      properties: {
        retrieval_count: { type: "integer", minimum: 0 },
        retrieval_ids: { type: "array", items: { type: "string" } },
        evidence_backed: { type: "boolean" }
      }
    }
  },
  additionalProperties: true
};

const ajv = new Ajv({ allErrors: true, removeAdditional: false });
addFormats(ajv);
const validate = ajv.compile(schema);

// --- Utility helpers ---
function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
}

async function safeJsonParse(text: string) {
  try {
    return { ok: true, json: JSON.parse(text) };
  } catch (e) {
    // Try to extract first JSON substring
    const first = text.indexOf("{");
    if (first >= 0) {
      try {
        return { ok: true, json: JSON.parse(text.slice(first)) };
      } catch (err) {
        return { ok: false, error: "json_parse_failed", raw: text.slice(0, 2000) };
      }
    }
    return { ok: false, error: "json_parse_failed", raw: text.slice(0, 2000) };
  }
}

// --- Perplexity wrapper with retry and caching ---
async function perplexitySearch(query: string, top_k = 5, attempts = 3) {
  if (!PERPLEXITY_KEY) return { ok: false, error: "no_perplexity_key" };
  const url = "https://api.perplexity.ai/search"; // if different, set PERPLEXITY endpoint
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${PERPLEXITY_KEY}`
        },
        body: JSON.stringify({ query, top_k })
      });
      const text = await res.text();
      const parsed = await safeJsonParse(text);
      if (!parsed.ok) throw new Error(parsed.error || "perplexity_json_parse_failed");
      // Normalize hits (best-effort)
      const raw = parsed.json;
      const results = raw.results ?? raw.data ?? raw.hits ?? [];
      const hits = (Array.isArray(results) ? results : []).map((r: any, idx: number) => ({
        id: r.id ?? `perp-${Date.now()}-${idx}`,
        title: r.title ?? r.name ?? null,
        url: r.url ?? r.source?.url ?? null,
        snippet: r.snippet ?? r.summary ?? r.excerpt ?? null
      }));
      return { ok: true, hits };
    } catch (err: any) {
      console.warn("Perplexity attempt failed:", err?.message ?? err);
      if (i === attempts - 1) return { ok: false, error: String(err?.message ?? err) };
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
  return { ok: false, error: "perplexity_failed" };
}

// --- LLM callers ---
// Primary: Gemini (Google) — hypothetical endpoint; replace with real endpoint if needed.
// Fallback: OpenAI
async function callGemini(prompt: string) {
  if (!GEMINI_KEY) return { ok: false, error: "no_gemini_key" };
  // This is a placeholder URL — replace with your Gemini endpoint wrapper if different
  try {
    const res = await fetch("https://api.generativeai.example/v1/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GEMINI_KEY}`
      },
      body: JSON.stringify({
        model: "gemini-2.5-pro",
        input: prompt,
        max_output_tokens: 1600,
        temperature: 0.0
      })
    });
    const text = await res.text();
    return { ok: true, text };
  } catch (err: any) {
    return { ok: false, error: String(err?.message ?? err) };
  }
}

async function callOpenAIFallback(prompt: string) {
  if (!OPENAI_KEY) return { ok: false, error: "no_openai_key" };
  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: prompt,
        max_tokens: 1200,
        temperature: 0.0
      })
    });
    const rText = await res.text();
    return { ok: true, text: rText };
  } catch (err: any) {
    return { ok: false, error: String(err?.message ?? err) };
  }
}

// --- Audience prompt templates (student/learner/researcher/teacher) ---
// Keep them short and inject retrievals where available
function buildPrompt(audience: string, scenario: string, retrievals: any[]) {
  const retrievalBlock = (retrievals && retrievals.length)
    ? `Retrievals:\n${retrievals.map((r:any,i:number)=>`${i+1}. ${r.title || r.url || "source"} — ${r.url || ""}\nSnippet: ${r.snippet || ""}`).join("\n")}`
    : `Retrievals: NONE`;

  if (audience === "student") {
    return `You are a teaching assistant. Produce JSON-only output per the student_output_schema. Scenario: ${scenario}\n${retrievalBlock}\nBe concise. Provide summary, top_2_actions with {value,confidence,sources}, two_quiz_questions, and provenance.`;
  } else if (audience === "learner") {
    return `You are a tutor. Produce JSON-only output per learner_output_schema. Scenario: ${scenario}\n${retrievalBlock}\nInclude a decision_table, expected_value_ranking, sensitivity_advice, an exercise, and provenance.`;
  } else if (audience === "researcher") {
    return `You are a research assistant. Produce JSON-only output per researcher_output_schema. Scenario: ${scenario}\n${retrievalBlock}\nInclude payoff_matrix, solver_config (seeded), simulation_results, sensitivity, notebook_snippet (short) and provenance.`;
  } else {
    // teacher
    return `You are an education designer. Produce JSON-only output per teacher_output_schema. Scenario: ${scenario}\n${retrievalBlock}\nInclude lesson_outline, simulation_setup, grading_rubric, student_handouts, and provenance.`;
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
    });
  } catch (e) {
    console.error("Failed to write rpc_errors:", e);
  }
}

async function logSchemaFailure(request_id: string | null, rawResponse: string, validationErrors: any) {
  try {
    await supabaseAdmin.from("schema_failures").insert({
      request_id,
      raw_response: rawResponse.slice(0, 10000),
      validation_errors: JSON.stringify(validationErrors).slice(0, 10000),
      created_at: new Date().toISOString()
    });
  } catch (e) {
    console.error("Failed to write schema_failures:", e);
  }
}

// --- Main handler ---
export default async function handler(request: Request) {
  const start = Date.now();
  const requestBody = await request.json().catch(() => ({}));
  const request_id = requestBody.request_id ?? uuid();
  const user_id = requestBody.user_id ?? null;
  const audience = requestBody.audience ?? "learner";
  const mode = requestBody.mode ?? "standard"; // standard|education_quick
  const scenario_text = String(requestBody.scenario_text ?? "").trim();

  // Basic validation
  if (!scenario_text) {
    return new Response(JSON.stringify({ ok: false, error: "missing_scenario_text" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  // Stage: RAG retrievals (unless education_quick)
  let retrievals: any[] = [];
  let evidence_backed = false;
  if (mode === "standard") {
    const perp = await perplexitySearch(scenario_text, 5, 3);
    if (perp.ok) {
      retrievals = perp.hits;
      evidence_backed = Array.isArray(retrievals) && retrievals.length > 0;
      // Upsert retrieval_cache (best-effort)
      try {
        await supabaseAdmin.from("retrieval_cache").upsert({
          query: scenario_text,
          hits: retrievals,
          url_list: retrievals.map((r:any) => r.url).filter(Boolean)
        }, { onConflict: ["query"] });
      } catch (e) {
        console.warn("retrieval_cache upsert failed:", e);
      }
    } else {
      // Perplexity failed; if education_quick is allowed, we can continue but mark not evidence-backed
      console.warn("Perplexity failed:", perp.error);
      retrievals = [];
      evidence_backed = false;
    }
  } else {
    // education_quick mode — no retrievals
    retrievals = [];
    evidence_backed = false;
  }

  // Build LLM prompt
  const prompt = buildPrompt(audience, scenario_text, retrievals);

  // Try Gemini primary
  let llmText: string | null = null;
  let modelUsed = "";
  let fallbackUsed = false;
  let llmDurationMs = 0;

  try {
    const t0 = Date.now();
    const gem = await callGemini(prompt);
    llmDurationMs = Date.now() - t0;
    if (gem.ok && gem.text) {
      llmText = gem.text;
      modelUsed = "gemini-2.5-pro";
    } else {
      // fallback to OpenAI
      fallbackUsed = true;
      const t1 = Date.now();
      const openai = await callOpenAIFallback(prompt);
      llmDurationMs = Date.now() - t1;
      if (openai.ok && openai.text) {
        llmText = openai.text;
        modelUsed = "gpt-4o-mini";
      } else {
        // Totally failed
        const errorId = uuid();
        await logRpcError(request_id, errorId, `LLM both failed: gemErr=${gem.error} openaiErr=${openai.error}`, { gemErr: gem.error, openaiErr: openai.error });
        return new Response(JSON.stringify({ ok: false, error: "llm_failed", message: "No available LLM results", error_id: errorId }), { status: 502, headers: { "Content-Type": "application/json" } });
      }
    }
  } catch (err: any) {
    const errorId = uuid();
    await logRpcError(request_id, errorId, `llm_exception: ${String(err?.message ?? err)}`, { prompt: prompt.slice(0, 2000) });
    return new Response(JSON.stringify({ ok: false, error: "llm_exception", message: "LLM exception occurred", error_id: errorId }), { status: 502, headers: { "Content-Type": "application/json" } });
  }

  // Parse LLM text as JSON-only expected output; try safe parse
  const parsed = await safeJsonParse(llmText ?? "");
  if (!parsed.ok) {
    // If LLM returned non-JSON, log and optionally try to extract JSON via regex
    const errorId = uuid();
    await logSchemaFailure(request_id, llmText ?? "", [{ message: "llm_output_not_json" }]);
    // For education_quick we may synthesize a minimal JSON fallback
    if (mode === "education_quick") {
      const minimal = {
        analysis_id: uuid(),
        audience,
        summary: { text: "UNVERIFIED analysis (education_quick) — LLM output not JSON" },
        provenance: { retrieval_count: retrievals.length, retrieval_ids: retrievals.map(r=>r.id), evidence_backed: false }
      };
      // persist
      const insert = await supabaseAdmin.from("analysis_runs").insert({
        request_id,
        user_id,
        audience,
        status: "completed",
        analysis_json: minimal,
        retrieval_ids: retrievals.map((r:any)=>r.id),
        evidence_backed: false,
        created_at: new Date().toISOString()
      });
      return new Response(JSON.stringify({ ok: true, analysis_id: minimal.analysis_id, analysis: minimal, provenance: { model: modelUsed, fallback_used: fallbackUsed, llm_duration_ms: llmDurationMs } }), { status: 200, headers: { "Content-Type": "application/json" } });
    } else {
      const errorId = uuid();
      await logRpcError(request_id, errorId, "LLM output not parseable as JSON", { raw: (llmText ?? "").slice(0, 2000) });
      return new Response(JSON.stringify({ ok: false, error: "llm_output_not_json", message: "LLM did not return valid JSON", error_id: errorId }), { status: 502, headers: { "Content-Type": "application/json" } });
    }
  }

  const llmJson = parsed.json;

  // Validate against AJV schema (top-level)
  const valid = validate(llmJson);
  if (!valid) {
    // Log failure and persist for review
    await logSchemaFailure(request_id, JSON.stringify(llmJson).slice(0,10000), validate.errors);
    // Try a relaxed path: if evidence_backed false allowed, or if audience=student and mode education_quick, proceed with best-effort
    if (mode === "education_quick") {
      // persist minimal again
      const minimal = {
        analysis_id: llmJson.analysis_id ?? uuid(),
        audience,
        summary: { text: llmJson.summary?.text ?? "UNVERIFIED education_quick fallback" },
        provenance: { retrieval_count: retrievals.length, retrieval_ids: retrievals.map(r=>r.id), evidence_backed: false }
      };
      await supabaseAdmin.from("analysis_runs").insert({
        request_id,
        user_id,
        audience,
        status: "completed",
        analysis_json: minimal,
        retrieval_ids: retrievals.map((r:any)=>r.id),
        evidence_backed: false,
        created_at: new Date().toISOString()
      });
      return new Response(JSON.stringify({ ok: true, analysis_id: minimal.analysis_id, analysis: minimal, provenance: { model: modelUsed, fallback_used: fallbackUsed, llm_duration_ms: llmDurationMs } }), { status: 200, headers: { "Content-Type": "application/json" } });
    } else {
      const errorId = uuid();
      await logRpcError(request_id, errorId, "schema_validation_failed: " + JSON.stringify(validate.errors).slice(0,2000), { llmJson: JSON.stringify(llmJson).slice(0,10000) });
      return new Response(JSON.stringify({ ok: false, error: "schema_validation_failed", message: "LLM response failed schema validation", error_id: errorId, details: validate.errors }), { status: 422, headers: { "Content-Type": "application/json" } });
    }
  }

  // OK validated — persist analysis_runs
  const analysis_id = llmJson.analysis_id ?? uuid();
  const analysisRow = {
    request_id,
    user_id,
    audience,
    status: "completed",
    analysis_json: llmJson,
    retrieval_ids: retrievals.map((r:any)=>r.id),
    evidence_backed,
    created_at: new Date().toISOString()
  };

  try {
    await supabaseAdmin.from("analysis_runs").insert(analysisRow);
  } catch (e:any) {
    const errorId = uuid();
    await logRpcError(request_id, errorId, `db_insert_failed: ${String(e?.message ?? e)}`, { analysisRow });
    return new Response(JSON.stringify({ ok: false, error: "db_insert_failed", message: "Failed to persist analysis", error_id: errorId }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  // Optionally enqueue worker for post-processing (not required)
  if (WORKER_URL) {
    try {
      await fetch(`${WORKER_URL}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_type: "post_process", analysis_id, request_id })
      });
    } catch (e) {
      console.warn("Worker enqueue failed:", e);
    }
  }

  const totalDuration = Date.now() - start;
  const resp = {
    ok: true,
    analysis_id,
    analysis: llmJson,
    provenance: { model: modelUsed, fallback_used: fallbackUsed, llm_duration_ms: llmDurationMs, total_duration_ms: totalDuration }
  };

  return new Response(JSON.stringify(resp), { status: 200, headers: { "Content-Type": "application/json" } });
}

Deployment & required DB migrations (quick)

Run these SQL migrations in Supabase (SQL editor) before deploying:

-- Ensure pgcrypto extension exists for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- analysis_runs
CREATE TABLE IF NOT EXISTS analysis_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT,
  user_id UUID,
  audience TEXT CHECK (audience IN ('student','learner','researcher','teacher')) DEFAULT 'learner',
  status TEXT DEFAULT 'queued',
  analysis_json JSONB,
  retrieval_ids TEXT[] DEFAULT '{}',
  evidence_backed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- retrieval_cache
CREATE TABLE IF NOT EXISTS retrieval_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT UNIQUE,
  hits JSONB,
  url_list TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- schema_failures
CREATE TABLE IF NOT EXISTS schema_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT,
  raw_response TEXT,
  validation_errors JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- rpc_errors
CREATE TABLE IF NOT EXISTS rpc_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT,
  error_id TEXT,
  error_message TEXT,
  payload TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

Environment variables to set (Supabase -> Function Secrets)

SUPABASE_URL (already present)

SUPABASE_SERVICE_ROLE_KEY (service role)

PERPLEXITY_KEY (server-side)

GEMINI_API_KEY (server-side)

OPENAI_KEY (server-side fallback)

WORKER_URL (optional; e.g., http://worker-host:3001/jobs
)

Quick test (curl)

After deploying the Edge Function, test with:

curl -s -X POST "https://<YOUR-PROJECT>.supabase.co/functions/v1/analyze-engine" \
 -H "Content-Type: application/json" \
 -d '{
   "request_id":"test-001",
   "user_id": null,
   "audience":"student",
   "mode":"standard",
   "scenario_text":"India-US tariff escalation: what are likely outcomes and recommended actions for a mid-level policy analyst?"
 }' | jq


Expect a JSON reply. If ok:false with error_id, check rpc_errors or function logs.

Notes, tweaks & next steps

Gemini endpoint: the Gemini call in callGemini is a placeholder: replace with your actual Google API wrapper endpoint or use your existing Gemini client library. If you have a direct Google AI client, swap that block.

Prompt tuning: the buildPrompt function uses simplified prompts — you should paste the longer prompt templates I provided earlier for each audience (student/learner/researcher/teacher) if you want richer outputs.

Schema: the AJV schema here is intentionally compact for top-level validation. When you paste the full audience-specific schemas (from earlier), swap schema with the full schema for stronger validation.

Worker: we only enqueue post_process job optionally; worker should fetch the analysis row and run heavy computations (sensitivity, plotting) to avoid long Edge Fn runs.

Logging & monitoring: supabase function logs + rpc_errors + schema_failures table should give visibility. Add alerts for high schema_failures rates.

Education quick: in education_quick mode we accept looser validation and synthesize minimal outputs — keep that for teaching/demo but gate public workflows.