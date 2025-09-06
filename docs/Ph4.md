
1) Goals (what we must achieve)

Real-time, evidence-backed analyses (no regurgitated mock content).

Audience-tailored outputs (Student / Learner / Researcher / Teacher / Public).

Streaming-first data retrieval (call external APIs at analysis time; ephemeral caching only).

Strict provenance + schema validation (every analysis must include retrieval_ids and {value,confidence,sources} for numeric claims).

Human review gates for high-stakes/geopolitical cases (auto-flag when needed).

Restored Perplexity dashboard + robust worker service + NaN protection in UI charts.

2) Top 4 public datasets + APIs to stream (why each, what to fetch, how)

These cover trade, macro, timely events, and media/evidence. We will stream them live at analysis time (RAG), cache retrieval metadata only.

UN Comtrade — trade flows, bilateral tariffs, HS-level volumes/values
Why: authoritative trade flows (imports/exports) — essential for trade/tariff scenarios.
What to fetch: bilateral trade time series (country A → country B), HS chapters of interest, latest tariff lines if available.
API: UN Comtrade REST API. Use country pair + HS filter + last 5 years.
Usage: compute % change in trade volume, identify exposure to tariffs.

World Bank — World Development Indicators (WDI) — GDP, trade % GDP, CPI, unemployment
Why: macro context and trend indicators for economic models.
What to fetch: GDP (current/PPP), trade as % of GDP, inflation, unemployment — last 10 years + latest quarter.
API: World Bank REST API / WDI endpoints.
Usage: normalize impacts, produce confidence intervals for EV computations.

IMF — WEO & Direction of Trade (optional IMF APIs)
Why: macro forecasts and cross-country comparisons for scenario projections.
What to fetch: short-term growth forecasts, current account, headline macro projections.
API: IMF JSON/WEO dataset endpoints.
Usage: scenario projections for "final outcome" numeric ranges.

GDELT (Global Database of Events, Language, and Tone) — global media & event stream
Why: near real-time media / event evidence, helpful for sentiment & triggers (e.g., tariff announcements, protests, alliance statements).
What to fetch: recent event counts and tone for entities (India, US, tariffs, BRICS) over last 30/90 days.
API: GDELT Event API / 2.0.
Usage: detect escalation triggers, corroborate timing assumptions, generate retrieval_ids.

Supplementary (for sanctions/official lists and legal/energy data):

US Treasury OFAC sanctions lists + EU consolidated sanctions list (for sanction-related geopolitical analysis).

US Census / national trade portals — if you need customs tariff schedules.

Optionally: public energy data (IEA/US EIA) for energy-sensitive scenarios.

3) Streaming architecture — short recipe

RAG at request time: analyze request → extract entities → call streaming APIs (Comtrade, WorldBank, IMF, GDELT) in parallel (with timeouts) → collect top-N retrievals (keep URLs + snippet) → pass retrievals to LLM prompt + store retrieval metadata into retrieval_cache (id, source, timestamp, query_hash) — do not persist full content beyond ephemeral cache retention (e.g., 24–72h).

Fallback & education mode: If RAG fails OR retrieval_count < 3 → allow analysis only in Education Mode with evidence_backed: false and UNVERIFIED banner — but still record retrieval attempt(s).

Provenance: response must include retrieval_ids and provenance block (model, durations, retrieval counts, fallback flags).

Validation: AJV schema validates output JSON (see later section you requested for schema shape {value,confidence,sources}).

Cache: cache analysis outputs by scenario_text hash with TTL (e.g., 5–30 minutes), unless user requests fresh (checkbox). Provide shouldBypassCache logic (explained next).

4) System prompt changes — what to change and where to insert them

From your uploaded strategist prompt (the PDF), we keep the “Game Theory Strategist” role and phases, but add strict constraints for evidence and format. Replace/augment old prompts in 4 locations:

Insert location A — Edge Function main system prompt (primary LLM invocation)

This is the canonical system message fed to Gemini/OpenAI. Always required.

What to add:

Role: Game Theory Strategist (shortened from your PDF).

Must extract entities & timeframes.

MUST list retrieval_ids used (>=3 for evidence-backed).

MUST produce precise JSON output with fields: archetype, players, equilibria, recommendations, and for every numeric claim include {value, confidence, sources}.

If retrievals < 3, reply only in Education Mode and include evidence_backed:false and reason: "no_external_sources".

Output only JSON (no explanatory text outside JSON block).

Example (pasteable) system prompt snippet:

SYSTEM: You are a Game Theory Strategist (see PHASES: Deconstruct → Incentives → Strategy Space → Equilibrium → Recommendation).
RULES:
1) First extract entities (players, countries, companies) and timeframe; return as "entities": [...], "timeframe": "YYYY-MM-DD to YYYY-MM-DD".
2) Call out required retrieval_ids: include at least 3 valid retrievals; if retrieval_count < 3 produce evidence_backed:false and "action":"human_review".
3) For every numeric claim, use the shape: {"value": <number>, "confidence": <0-1>, "sources": ["url1","url2"]}.
4) Output only valid JSON that exactly matches the AJV schema. No extra prose. 
5) If high-stakes keywords detected (nuclear,military,sanctions), set "human_review_required":true.
6) Minimize hallucination: every factual assertion must be linked to a source in "sources".
7) Keep reasoning steps concise and include an "explain_brief" string field limited to 250 chars.
Adopt the Game Theory Strategist framework in the provided file for structure. :contentReference[oaicite:1]{index=1}

Insert location B — RAG retrieval prompt (when calling Perplexity/GDELT/unified retrieval)

Used to form search queries and instruct retrieval API what we need.

Example:

RAG_PROMPT: For entity list [X,Y], fetch the latest authoritative evidence about tariffs/trade flows/news announcements. Return top 5 URLs with short snippet (<= 250 chars), publication date, and confidence score. Prioritize official sources (UN, IMF, WorldBank, government statements) and mainstream outlets for corroboration.

Insert location C — Education Mode / Fallback prompt

When retrievals are insufficient — the LLM can still produce a learning-focused analysis but must be labelled.

Example:

FALLBACK_PROMPT: You may produce an educational heuristic analysis (non-evidence-backed). Start JSON with "evidence_backed": false and "disclaimer": "UNVERIFIED — human review recommended". Provide high-level game-theory steps only; include no specific numeric predictions without sources.

Insert location D — Human Review Assistant prompt (for reviewers in the UI)

Used to present flagged analyses for human auditors, including checklist.

Example:

HUMAN_REVIEW_PROMPT: Present flagged analysis with: entities, retrieval snippets, numeric claims (with sources), and the model's confidence. Provide a 5-point checklist: (1) evidence sufficiency, (2) numeric sanity, (3) bias check, (4) missing data, (5) approve/reject. Include recommended re-runs with specific missing sources if reject.

5) Implementation steps — prioritized, actionable (exact sequence)

I assume you have Supabase edge functions, worker service, Perplexity wrapper, and frontend.

Phase A — Immediate (0–2 days)

Define AJV schema for final output (include {value,confidence,sources} object). (I’ll add schema snippet below.)

EdgeFn: Add system prompt A as canonical system message; enforce JSON-only responses and AJV validation before returning to frontend. If validation fails, return 422 and log to schema_failures.

RAG: implement parallel retrieval for the 4 streaming APIs (UN Comtrade, WorldBank, IMF, GDELT) with timeouts (2.5s each) and 3 total retrievals minimum. Store retrieval metadata into retrieval_cache table.

Perplexity wrapper: robust retry/backoff (3 tries), and return retrieval_ids. If Perplexity itself is down, fallback to GDELT/WDI/UNComtrade where possible.

Human review gating: detect high-stakes keywords list and set human_review_required before allowing evidence_backed:true.

Phase B — Short term (2–5 days)

Cache TTL & shouldBypassCache: implement shouldBypassCache logic (if scenario_text contains "real-time" or "today"/"now" or user checks “fresh data”, bypass cache; otherwise use short TTL). Add cache_hits metrics.

Perplexity Dashboard UI: restore a Perplexity detail panel to show retrievals, snippets, and links. Add “Refresh Evidence” button to force re-fetch.

NaN protection: add frontend guards before plotting (replace NaN with 0 or hide chart and show "insufficient numeric data").

Phase C — Medium term (1–3 weeks)

Worker service restart & healthchecks: fix or redeploy worker (the 111 connection refused), add retry with backoff, and add health endpoint for system-status to reflect per-component status.

Acceptance tests: canonical games (PD, Stag Hunt, Matching Pennies) automated; evidence-backed geopolitical tests (should produce retrievals >=3).

Monitoring & alerts: schema failure rate, evidence_backed_rate, external_api_latency, retrieval_failure_rate.

Phase D — Optional / Later (2–6 weeks)

Advanced engines: implement numerical EV engine / Nash solver (nashpy wrapper or TypeScript port), integrate with analyze-engine. (You already indicated this in your PRD.)

Human reviewer UI & workflow: queue, approve/reject, audit log.

Production hardening: quota handling, cost control, model selection logic (Gemini primary, OpenAI fallback automatically), circuit-breaker metrics.

6) Tables / SQL migrations (minimal set to support streaming and provenance)

You asked earlier for migrations — here’s the minimal set:

1. retrieval_cache

CREATE TABLE retrieval_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash text NOT NULL,
  source text NOT NULL,
  url text,
  snippet text,
  score numeric,
  retrieved_at timestamptz DEFAULT now(),
  ttl timestamptz DEFAULT now() + INTERVAL '1 day'
);
CREATE INDEX ON retrieval_cache (query_hash);


2. analysis_runs

CREATE TABLE analysis_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  scenario_hash text NOT NULL,
  analysis_json jsonb,
  evidence_backed boolean,
  retrieval_ids uuid[],
  provenance jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX ON analysis_runs (scenario_hash);


3. schema_failures

CREATE TABLE schema_failures (
  id serial PRIMARY KEY,
  run_id uuid,
  error text,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);


4. circuit_breaker

CREATE TABLE circuit_breaker (
  id serial PRIMARY KEY,
  service_name text UNIQUE,
  state text, -- "closed","open","half"
  fail_count int DEFAULT 0,
  last_failure timestamptz
);


(These are minimal; you can extend with RLS policies later.)

7) AJV JSON snippet — {value,confidence,sources} shape & rules

Add to your AJV schema as a reusable definition.

{
  "$id": "https://yourdomain.com/schemas/analysis-output.json",
  "type": "object",
  "required": ["request_id","archetype","players","equilibria","provenance"],
  "properties": {
    "request_id": {"type":"string"},
    "archetype": {"type":"string"},
    "players": {
      "type":"array",
      "minItems":1,
      "items": {
        "type":"object",
        "required":["name","actions"],
        "properties": {
          "name":{"type":"string"},
          "actions":{"type":"array","minItems":2,"items":{"type":"string"}}
        }
      }
    },
    "equilibria": {
      "type":"array",
      "items": {
        "type":"object",
        "required":["type","confidence","profile"],
        "properties":{
          "type":{"type":"string","enum":["pure","mixed","none"]},
          "confidence":{"type":"number","minimum":0,"maximum":1},
          "profile":{"type":"object"}
        }
      }
    },
    "numeric_claims": {
      "type":"array",
      "items": {
        "type":"object",
        "required":["key","value_obj"],
        "properties":{
          "key":{"type":"string"},
          "value_obj":{
            "type":"object",
            "required":["value","confidence","sources"],
            "properties":{
              "value":{"type":"number"},
              "confidence":{"type":"number","minimum":0,"maximum":1},
              "sources":{"type":"array","minItems":1,"items":{"type":"string","format":"uri"}}
            }
          }
        }
      }
    },
    "provenance": {
      "type":"object",
      "required":["model","duration_ms","retrieval_ids","fallback_used"],
      "properties":{
        "model":{"type":"string"},
        "duration_ms":{"type":"integer"},
        "retrieval_ids":{"type":"array","items":{"type":"string"}},
        "fallback_used":{"type":"boolean"}
      }
    }
  }
}


(You can extend numeric_claims to be embedded inline where needed.)

8) Small sample system prompt addition to enforce numeric shape

Add this as a post-instruction in the EdgeFn right after calling LLM:

POST-PROMPT: Validate that every numeric statement uses the value_obj shape: {"value": <number>, "confidence": <0-1>, "sources":["url"]}. Fail fast if missing. Return only JSON. If validation fails, return error_code=422 and log schema_failures.

9) UI changes (Perplexity dashboard + NaN guards)

Perplexity Panel: show retrieval_ids, snippet (truncate), source domain, date. Add Open in source links and a “Force Refresh (Re-query sources)” button.

Evidence badge: green “Evidence-backed (n sources)” or amber “UNVERIFIED — human review required”.

Charts: data validator wrapper before plotting; if any numeric is NaN or missing, render an inline message explaining the missing inputs and a button to "Fetch Evidence" or "Switch to Education Mode".

10) Quick QA checklist before rollout

 EdgeFn returns JSON validated by AJV for 100% of successful analyses.

 Retrievals >=3 for evidence_backed analyses; otherwise evidence_backed:false.

 Perplexity retrievals shown in UI and retrieval_ids saved in DB.

 Circuit breaker prevents repeated calls to a failing API and uses OpenAI fallback if Gemini fails.

 Schema failures logged into schema_failures and alerting on >2% rate.

 Human review queue works and blocks publication of flagged analyses.

 NaN protection on charts.

11) Minimal acceptance test plan (what to run)

Submit canonical PD scenario → must return archetype prisoners_dilemma, equilibria, and numeric EV claims with sources.

Submit geopolitical tariff scenario → must call UN Comtrade + GDELT + World Bank; evidence_backed true and retrieval_ids >=3.

Simulate Perplexity down → system should still call GDELT/WDI & set fallback flags, or Education Mode with UNVERIFIED banner.

Trigger high-stakes keyword → human_review_required = true; analysis not published.

12) Final notes & recommended next actions (what I’d execute if I were at your terminal)

Merge the EdgeFn system prompt and AJV validation immediately (this fixes JSON format & removes mock content exposure).

Add streaming connectors for UN Comtrade, World Bank, GDELT with per-call timeouts and the Perplexity wrapper retry. Keep retrieval metadata only.

Restore the Perplexity dashboard component and wire it to retrieval_cache. Add “force refresh” to bypass cache when needed.

Implement the human review queue UI and blocking behavior for flagged analyses.

Run acceptance tests (PD/Stag/Matching Pennies + 3 geopolitical queries). Iterate until evidence_backed_rate >= 85% and schema_failure_rate < 2%.

Edge Function (analyze-engine/index.ts) — full TypeScript file that: computes scenario hash, decides shouldBypassCache, performs retrievals by calling the retrieval microservice, injects the system + micro prompts, calls the LLM (Gemini primary, OpenAI fallback), enforces AJV validation, logs schema failures, writes analysis_runs and retrieval_cache, and returns a strict JSON response with provenance.

Retrieval microservice / Perplexity wrapper (retrievalClient.ts) — TypeScript module suitable for a Supabase Edge Function or small Node service that streams / retrieves top evidence from Perplexity + UN Comtrade + World Bank + GDELT via parallel calls, with retry/backoff, timeouts, and a fetchAllRetrievals() orchestrator. (This is what analyze-engine calls.)

Perplexity Dashboard React component (PerplexityDashboard.tsx) — React UI that lists retrievals, shows snippets/sources, supports Force Refresh (re-run retrievals for an analysis), and Request Human Review (pushes to reviewer queue endpoint).

I included:

All required environment variable names (you must set them in Supabase / edge function runtime).

Minimal SQL table schema references (retrieval_cache & analysis_runs) and where the code writes them.

AJV schema snippet (embedded in the edge function) for validation of the LLM output, including {value, confidence, sources} numeric shape.

Clear notes on where to change the system prompt text if you want stricter/softer behavior.

Read the plan summary first (very short), then paste the files into your repo. I purposely kept the code dependency-light and used fetch + standard libraries so you can run them as Supabase Edge Functions or small Node services.

Quick plan & flow (step-by-step)

Frontend Run Analysis → calls Edge Function analyze-engine.

analyze-engine:

computes scenario_hash and checks cache (unless shouldBypassCache).

calls retrieval microservice (/functions/v1/retrieve) to get retrievals (Perplexity + UN Comtrade + WorldBank + GDELT).

builds systemPrompt + micro-prompt and calls LLM (Gemini primary, fallback to OpenAI).

AJV validates LLM JSON output (numeric claims shaped {value,confidence,sources}).

On success stores analysis_runs and retrieval_cache records, returns JSON to frontend (with provenance).

On validation failure, logs to schema_failures and returns 422 with debug info.

Frontend Perplexity Dashboard fetches retrievals and allows Force Refresh (calls POST /functions/v1/refresh-retrievals), and Request Human Review (calls POST /functions/v1/request-review).

Required environment variables

Set these in Supabase Edge Functions / your environment:

SUPABASE_URL

SUPABASE_SERVICE_ROLE_KEY (server role key — keep secret)

GEMINI_API_URL (or LLM endpoint)

GEMINI_API_KEY

OPENAI_API_KEY (fallback)

PERPLEXITY_API_KEY

UNCOMTRADE_BASE (e.g. https://comtrade.un.org/api/get? — or left as default)

WORLD_BANK_BASE (e.g. https://api.worldbank.org/v2)

GDELT_BASE (e.g. https://api.gdeltproject.org/api/v2/doc/doc or event endpoints)

RETRIEVAL_SERVICE_BASE (if you deploy retrievalClient as separate function)

1) Edge Function: analyze-engine/index.ts

Drop this into supabase/functions/analyze-engine/index.ts (replace existing).

// analyze-engine/index.ts
import { createClient } from "@supabase/supabase-js";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import fetch from "node-fetch"; // for Node; in Supabase Edge use global fetch
import crypto from "crypto";
import { fetchAllRetrievals } from "./retrievalClient"; // see file below

/* Environment */
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SUPABASE = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const GEMINI_API_URL = process.env.GEMINI_API_URL!;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

/* AJV Schema: minimal, extend as needed */
const ajv = new Ajv({ allErrors: true, removeAdditional: true });
addFormats(ajv);

const analysisSchema = {
  type: "object",
  required: ["request_id", "archetype", "players", "equilibria", "provenance"],
  properties: {
    request_id: { type: "string" },
    archetype: { type: "string" },
    players: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "actions"],
        properties: {
          name: { type: "string" },
          actions: { type: "array", minItems: 2, items: { type: "string" } }
        }
      }
    },
    equilibria: {
      type: "array",
      items: {
        type: "object",
        required: ["type", "confidence", "profile"],
        properties: {
          type: { type: "string", enum: ["pure", "mixed", "none"] },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          profile: { type: "object" }
        }
      }
    },
    numeric_claims: {
      type: "array",
      items: {
        type: "object",
        required: ["key", "value_obj"],
        properties: {
          key: { type: "string" },
          value_obj: {
            type: "object",
            required: ["value", "confidence", "sources"],
            properties: {
              value: { type: "number" },
              confidence: { type: "number", minimum: 0, maximum: 1 },
              sources: { type: "array", minItems: 1, items: { type: "string", format: "uri" } }
            }
          }
        }
      }
    },
    provenance: {
      type: "object",
      required: ["model", "duration_ms", "retrieval_ids", "fallback_used"],
      properties: {
        model: { type: "string" },
        duration_ms: { type: "integer" },
        retrieval_ids: { type: "array", items: { type: "string" } },
        fallback_used: { type: "boolean" }
      }
    }
  }
};

const validateAnalysis = ajv.compile(analysisSchema);

/* Utilities */
function sha256Hex(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function shouldBypassCache(body: any) {
  // Bypass for explicit freshness requests or "personal" audience or keywords
  if (body.options?.forceFresh) return true;
  const audience = (body.audience || "").toLowerCase();
  if (["student", "learner", "personal"].includes(audience)) return true;
  const q = (body.scenario_text || "").toLowerCase();
  const realTimeKeywords = ["today", "now", "current", "real-time", "price", "tariff", "just announced"];
  if (realTimeKeywords.some(k => q.includes(k))) return true;
  return false;
}

function generateSystemPrompt(entities: string[], audience: string) {
  const base = `You are the Quantum Game Theory Strategic Intelligence AI. Use the PHASES: decompose -> information -> strategies -> equilibrium -> recommendations.`;
  const rules = `
Rules:
1) Extract entities and timeframe. Return as "entities" and "timeframe".
2) Provide numeric claims as objects: {"value":<number>,"confidence":<0-1>,"sources":["url"]}.
3) Include "retrieval_ids":[...], and "provenance" with model/duration/fallback.
4) If retrieval_count < 3, set "evidence_backed": false and "action":"human_review".
5) Output STRICT JSON only. No extra prose outside JSON.
`;
  const audienceHint = `Audience: ${audience}. If audience == 'student', produce short actionable steps; if 'researcher', include detailed numeric tables and sources.`;
  return [base, rules, audienceHint].join("\n");
}

async function callLLM(payload: { prompt: string, systemPrompt: string, maxTokens?: number }) {
  // Try Gemini (primary) then OpenAI fallback
  const start = Date.now();
  try {
    const res = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ input: `${payload.systemPrompt}\n${payload.prompt}`, max_tokens: payload.maxTokens || 1200 })
    });
    const text = await res.text();
    // If the API returns non-JSON (like streaming), try to parse safe JSON - here we assume full JSON
    try {
      const parsed = JSON.parse(text);
      return { model: "gemini", duration_ms: Date.now() - start, response: parsed, raw: text };
    } catch (e) {
      // If not JSON, still return raw; we will validate below and possibly fallback
      return { model: "gemini", duration_ms: Date.now() - start, response: text, raw: text };
    }
  } catch (gErr) {
    // fallback to OpenAI
    const start2 = Date.now();
    const fallback = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: payload.systemPrompt }, { role: "user", content: payload.prompt }],
        max_tokens: payload.maxTokens || 1200
      })
    });
    const fallbackJson = await fallback.json();
    return { model: "openai", duration_ms: Date.now() - start2, response: fallbackJson, raw: JSON.stringify(fallbackJson) };
  }
}

/* Handler - export default for Supabase Edge Functions */
export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const body = await req.json();
    const { scenario_text, audience = "public", options = {} } = body;
    if (!scenario_text) return res.status(400).json({ error: "scenario_text required" });

    const scenario_hash = sha256Hex(scenario_text);
    const bypassCache = shouldBypassCache({ scenario_text, audience, options });

    // 1) Check cached analysis_runs if not bypassing
    if (!bypassCache) {
      const { data: cached, error: cErr } = await SUPABASE
        .from("analysis_runs")
        .select("*")
        .eq("scenario_hash", scenario_hash)
        .order("created_at", { ascending: false })
        .limit(1);
      if (cErr) console.error("cache check error", cErr);
      if (cached && cached.length > 0) {
        // Return cached result
        return res.status(200).json({ cached: true, analysis: cached[0].analysis_json });
      }
    }

    // 2) Extraction: quick entity detection (simple heuristic) - you may replace with NLP
    const entities = Array.from(new Set((scenario_text.match(/\b[A-Z][a-zA-Z]{2,}\b/g) || []).slice(0, 10)));

    // 3) Call retrieval service (Perplexity + datasets) in parallel
    const retrievalTimeoutMs = options.retrieval_timeout_ms || 7000;
    const retrievals = await fetchAllRetrievals({
      query: scenario_text,
      entities,
      timeoutMs: retrievalTimeoutMs,
      requiredSources: ["perplexity", "uncomtrade", "worldbank", "gdelt"]
    });

    // store retrieval metadata into retrieval_cache (only metadata)
    const retrievalIds: string[] = [];
    for (const r of retrievals) {
      const insert = await SUPABASE.from("retrieval_cache").insert({
        query_hash: scenario_hash,
        source: r.source,
        url: r.url,
        snippet: r.snippet,
        score: r.score
      }).select();
      if (insert.error) console.error("cache insert error", insert.error);
      if (insert.data && insert.data[0]) retrievalIds.push(insert.data[0].id || r.id || "");
    }

    // 4) Build prompts and call LLM
    const systemPrompt = generateSystemPrompt(entities, audience);
    const microPrompt = `
INPUT_SCENARIO:
${scenario_text}

RETRIEVALS: ${JSON.stringify(retrievals.slice(0, 10).map(r => ({ source: r.source, url: r.url, snippet: r.snippet })))}

OUTPUT_CONSTRAINTS:
- Return STRICT JSON only.
- Required fields: request_id, archetype, players, equilibria, numeric_claims, provenance.
- Numeric claim format: {"value": <number>, "confidence": 0-1, "sources": ["url"]}.
- If retrieval_count < 3 => evidence_backed=false and "action":"human_review".
- Provide "top_2_actions": array with two objects {action, rationale, when_to_execute, confidence, evidence[]}.
`;

    const prompt = `${microPrompt}\n\nANALYZE AND RETURN JSON`;
    const llmResp = await callLLM({ prompt, systemPrompt, maxTokens: 1500 });

    // 5) Try to parse LLM response body as JSON
    let llmJson: any = llmResp.response;
    if (typeof llmJson === "string") {
      try { llmJson = JSON.parse(llmJson); } catch (e) { /* leave as string */ }
    }

    // 6) If retrievals < 3 -> force education/fallback behavior
    const evidence_backed = (retrievals?.length || 0) >= 3 && !!llmJson;
    if ((retrievals?.length || 0) < 3) {
      // respond with UNVERIFIED if education mode not allowed
      const fallbackResp = {
        request_id: crypto.randomUUID(),
        evidence_backed: false,
        action: "human_review",
        reason: "no_external_sources",
        retrievals: retrievals
      };
      // store run with provenance
      await SUPABASE.from("analysis_runs").insert({
        scenario_hash: scenario_hash,
        analysis_json: fallbackResp,
        evidence_backed: false,
        retrieval_ids: retrievalIds,
        provenance: {
          model: llmResp.model,
          duration_ms: llmResp.duration_ms,
          gemini_raw: llmResp.raw
        }
      });
      return res.status(200).json(fallbackResp);
    }

    // 7) Validate against AJV
    const candidate = (llmJson && typeof llmJson === "object") ? llmJson : { raw: llmJson };
    // ensure provenance present
    candidate.provenance = candidate.provenance || {};
    candidate.provenance.model = candidate.provenance.model || llmResp.model;
    candidate.provenance.duration_ms = candidate.provenance.duration_ms || llmResp.duration_ms;
    candidate.provenance.retrieval_ids = retrievalIds;
    candidate.provenance.fallback_used = candidate.provenance.fallback_used || false;

    const valid = validateAnalysis(candidate);
    if (!valid) {
      // log schema failure
      await SUPABASE.from("schema_failures").insert({
        run_id: null,
        error: JSON.stringify(validateAnalysis.errors),
        payload: candidate
      });
      return res.status(422).json({ ok: false, error: "schema_validation_failed", details: validateAnalysis.errors });
    }

    // 8) Persist analysis
    const insert = await SUPABASE.from("analysis_runs").insert({
      scenario_hash: scenario_hash,
      analysis_json: candidate,
      evidence_backed: true,
      retrieval_ids: retrievalIds,
      provenance: candidate.provenance
    }).select();

    if (insert.error) console.error("analysis insert error", insert.error);

    // 9) Return success
    return res.status(200).json({ ok: true, analysis: candidate });

  } catch (err: any) {
    console.error("analyze-engine error", err);
    return res.status(500).json({ ok: false, error: "internal_server_error", message: err?.message || "" });
  }
}


Notes about this file

It expects retrievalClient.ts (provided next) exposing fetchAllRetrievals.

It writes to analysis_runs and retrieval_cache tables (see earlier SQL).

It validates with AJV and logs schema failures into schema_failures.

You can tune shouldBypassCache() logic and microPrompt.

2) Retrieval microservice & Perplexity wrapper: retrievalClient.ts

Place in same functions folder, e.g., supabase/functions/analyze-engine/retrievalClient.ts (or as its own Edge Function retrieve).

// retrievalClient.ts
import fetch from "node-fetch";
const PERPLEXITY_KEY = process.env.PERPLEXITY_API_KEY!;
const UNCOMTRADE_BASE = process.env.UNCOMTRADE_BASE || "https://comtrade.un.org/api/get";
const WORLD_BANK_BASE = process.env.WORLD_BANK_BASE || "https://api.worldbank.org/v2";
const GDELT_BASE = process.env.GDELT_BASE || "https://api.gdeltproject.org/api/v2/doc/doc";

/* helper retry/backoff */
async function retry<T>(fn: () => Promise<T>, tries = 3, baseDelay = 300) {
  let i = 0;
  while (i < tries) {
    try { return await fn(); } catch (e) {
      i++;
      if (i >= tries) throw e;
      await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, i)));
    }
  }
  throw new Error("retry exhausted");
}

/* Perplexity fetch: returns array of { source,url,snippet,score, retrieved_at } */
export async function fetchPerplexity(query: string, timeoutMs = 4000) {
  return retry(async () => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch("https://api.perplexity.ai/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": PERPLEXITY_KEY },
      signal: controller.signal,
      body: JSON.stringify({ q: query, top_k: 5 })
    });
    clearTimeout(id);
    if (!res.ok) throw new Error("perplexity error");
    const j = await res.json();
    // adapt to expected shape
    return (j.results || []).map((r: any) => ({
      source: "perplexity",
      url: r.url,
      snippet: r.snippet || r.excerpt || "",
      score: r.score || 0.5,
      raw: r
    }));
  });
}

/* UN Comtrade fetch — example: fetch bilateral trade for last 5 years */
export async function fetchUNComtrade(country1ISO: string, country2ISO: string, years = 5) {
  // Query example: https://comtrade.un.org/api/get?max=100&type=C&freq=A&px=HS&ps=2019,2020&rg=2&p=840&rg=1&r=356
  const nowYear = new Date().getFullYear();
  const yearsList = Array.from({ length: years }, (_, i) => nowYear - i).join(",");
  const url = `${UNCOMTRADE_BASE}?max=25&type=C&freq=A&px=HS&ps=${yearsList}&r=${country1ISO}&p=${country2ISO}&fmt=json`;
  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) throw new Error("uncomtrade error");
    const j = await res.json();
    // Create a single snippet summarizing exports/imports
    const tot = (j.dataset || []).reduce((acc: number, row: any) => acc + (row.TradeValue || 0), 0);
    return [{
      source: "uncomtrade",
      url,
      snippet: `Bilateral trade (last ${years}) years total: ${tot}`,
      score: 0.9,
      raw: j
    }];
  } catch (e) {
    console.warn("UNComtrade failed", e);
    return [];
  }
}

/* World Bank fetch — indicator per country (example: NY.GDP.MKTP.CD) */
export async function fetchWorldBankIndicator(indicator: string, countryCode: string, years = 5) {
  const url = `${WORLD_BANK_BASE}/country/${countryCode}/indicator/${indicator}?format=json&per_page=${years}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("worldbank error");
    const j = await res.json();
    const values = (j?.[1] || []).slice(0, years).map((x: any) => ({ date: x.date, value: x.value }));
    return [{
      source: "worldbank",
      url,
      snippet: `${indicator} for ${countryCode}: ${values.map((v: any) => `${v.date}:${v.value}`).slice(0,3).join(", ")}`,
      score: 0.85,
      raw: values
    }];
  } catch (e) {
    console.warn("worldbank failed", e);
    return [];
  }
}

/* GDELT event fetch for entity (returns top 3 event snippets) */
export async function fetchGDELT(entity: string) {
  const q = encodeURIComponent(entity);
  const url = `${GDELT_BASE}?query=${q}&mode=artlist&format=json`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("gdelt error");
    const j = await res.json();
    // j is list of articles; map top 3
    const articles = (j.articles || []).slice(0, 3).map((a: any) => ({
      source: "gdelt",
      url: a.url || a.document_url,
      snippet: (a.summary || a.segments || "").slice(0, 300),
      score: 0.7,
      raw: a
    }));
    return articles;
  } catch (e) {
    console.warn("gdelt failed", e);
    return [];
  }
}

/* Orchestrator — call all retrieval endpoints in parallel and return top N results */
export async function fetchAllRetrievals(opts: { query: string, entities: string[], timeoutMs?: number, requiredSources?: string[] }) {
  const { query, entities, timeoutMs = 7000, requiredSources = [] } = opts;
  const tasks: Promise<any[]>[] = [];

  // Perplexity
  tasks.push(fetchPerplexity(query, Math.min(4000, timeoutMs)).catch(() => []));

  // If entity pairs detected, call UNComtrade for top pair
  const pair = entities.slice(0, 2);
  if (pair.length >= 2) {
    tasks.push(fetchUNComtrade(pair[0], pair[1]).catch(() => []));
  } else {
    tasks.push(Promise.resolve([]));
  }

  // worldbank: for first entity interpreted as country code (ISO alpha-3 likely)
  if (entities.length >= 1) {
    tasks.push(fetchWorldBankIndicator("NY.GDP.MKTP.CD", entities[0]).catch(() => []));
  } else {
    tasks.push(Promise.resolve([]));
  }

  // GDELT
  tasks.push(fetchGDELT(query).catch(() => []));

  // Wait for all with overall timeout
  const results = await Promise.all(tasks);
  const flattened = results.flat().filter(Boolean);

  // Score and pick top 6
  const scored = flattened.map((r: any) => ({ ...r, score: (r.score || 0.5) }));
  scored.sort((a: any, b: any) => b.score - a.score);

  // Ensure required sources present if possible
  const presentSources = new Set(scored.map(s => s.source));
  for (const req of requiredSources) {
    if (!presentSources.has(req)) {
      // try to fetch it synchronously (best-effort)
      try {
        if (req === "perplexity") {
          const p = await fetchPerplexity(query, 3000);
          scored.push(...p);
        }
        if (req === "uncomtrade" && entities.length >= 2) {
          const uc = await fetchUNComtrade(entities[0], entities[1]);
          scored.push(...uc);
        }
      } catch (e) { /* ignore */ }
    }
  }

  // Trim to top 8
  return scored.slice(0, 8);
}


Notes

The functions return a standardized retrieval object: {source,url,snippet,score,raw}.

fetchAllRetrievals() orchestrates Perplexity + UN Comtrade + World Bank + GDELT in parallel, with best-effort additional fetches for required sources.

3) React Perplexity Dashboard Component: PerplexityDashboard.tsx

Place in your front-end components/PerplexityDashboard.tsx. This expects you have a Supabase auth client or can call Supabase Edge Functions.

// PerplexityDashboard.tsx
import React, { useEffect, useState } from "react";

type Retrieval = {
  id?: string;
  source: string;
  url?: string;
  snippet?: string;
  score?: number;
  retrieved_at?: string;
}

type Props = {
  analysisId?: string; // optional: if provided, loads retrievals for this analysis
  retrievals?: Retrieval[]; // or pass retrievals directly
  onRefresh?: () => void;
}

export default function PerplexityDashboard({ analysisId, retrievals: initialRetrievals, onRefresh }: Props) {
  const [retrievals, setRetrievals] = useState<Retrieval[] | null>(initialRetrievals || null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    if (!retrievals && analysisId) {
      setLoading(true);
      fetch(`/functions/v1/get-retrievals?analysis_id=${encodeURIComponent(analysisId)}`)
        .then(r => r.json())
        .then(j => {
          setRetrievals(j.retrievals || []);
        })
        .catch(e => console.error(e))
        .finally(() => setLoading(false));
    }
  }, [analysisId]);

  async function forceRefresh() {
    if (!analysisId) {
      console.warn("No analysisId for refresh");
      return;
    }
    setRefreshing(true);
    try {
      const resp = await fetch(`/functions/v1/refresh-retrievals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis_id: analysisId })
      });
      const j = await resp.json();
      setRetrievals(j.retrievals || []);
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error("refresh failed", e);
    } finally {
      setRefreshing(false);
    }
  }

  async function requestHumanReview() {
    if (!analysisId) return;
    setReviewing(true);
    try {
      const resp = await fetch(`/functions/v1/request-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis_id: analysisId, reason: "user_requested_review_from_ui" })
      });
      const j = await resp.json();
      alert(j.ok ? "Review requested" : "Failed to request review");
    } catch (e) {
      console.error(e);
    } finally {
      setReviewing(false);
    }
  }

  if (loading) return <div>Loading retrievals...</div>;
  if (!retrievals || retrievals.length === 0) return <div>No external retrievals found.</div>;

  return (
    <div className="perplexity-dashboard p-4 border rounded-md">
      <div className="header flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold">Evidence & Retrievals</h3>
        <div className="flex gap-2">
          <button onClick={forceRefresh} disabled={refreshing} className="btn">
            {refreshing ? "Refreshing..." : "Force Refresh"}
          </button>
          <button onClick={requestHumanReview} disabled={reviewing} className="btn-ghost">
            {reviewing ? "Requesting..." : "Request Human Review"}
          </button>
        </div>
      </div>

      <ul className="space-y-3">
        {retrievals.map((r, i) => (
          <li key={r.url || i} className="p-3 border rounded">
            <div className="flex justify-between">
              <div>
                <div className="text-sm text-gray-600">{r.source.toUpperCase()}</div>
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 break-all">
                  {r.url}
                </a>
              </div>
              <div className="text-sm text-right">
                <div>score: {typeof r.score === "number" ? r.score.toFixed(2) : "n/a"}</div>
                <div>{r.retrieved_at ? new Date(r.retrieved_at).toLocaleString() : ""}</div>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-800">{r.snippet?.slice(0, 600)}{r.snippet && r.snippet.length > 600 ? "…" : ""}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}


Notes

get-retrievals, refresh-retrievals, and request-review are Edge Function endpoints you need to add (I’ll give minimal handlers below).

This component provides UI for evidence and a Force Refresh / Request Review flow.

Minimal Edge Function endpoints for Dashboard (handlers)

Add these minimal function handlers:

GET /functions/v1/get-retrievals?analysis_id=

Query analysis_runs to get retrieval_ids, then query retrieval_cache to return an array.

POST /functions/v1/refresh-retrievals

Accept JSON {analysis_id}; re-run retrieval service for the scenario (load scenario_text from analysis_runs), call fetchAllRetrievals, push new retrieval_cache entries, update analysis_runs.retrieval_ids, return new retrievals.

POST /functions/v1/request-review

Insert row into reviewer_queue with analysis_id, status pending.

(If you want I can paste exact handlers — tell me and I’ll provide the code.)

Endpoint & Query examples for the four datasets (how to call)
UN Comtrade (REST)

Endpoint example:

GET https://comtrade.un.org/api/get?max=100&type=C&freq=A&px=HS&ps=2021,2022,2023&r=840&p=356&fmt=json


params:

r exporter country code (numeric or iso)

p importer country code

ps list of years

px=HS for HS classification

fmt=json

World Bank (WDI)

Endpoint:

GET https://api.worldbank.org/v2/country/US/indicator/NY.GDP.MKTP.CD?format=json&per_page=5


Replace US and NY.GDP.MKTP.CD as needed.

IMF (WEO) (example)

IMF offers JSON endpoints; the wrapper will likely need a subscription or fetch from their data portal; use https://www.imf.org/external/datamapper/api/v1/ (example — check current IMF API docs).

GDELT (Event / Article)

Example:

GET https://api.gdeltproject.org/api/v2/doc/doc?query=India+tariff&mode=artlist&format=json


returns article list; convert to snippet.

Next small handlers for dashboard (optional paste)

/functions/v1/get-retrievals (example)

// get-retrievals.ts (Edge Fn)
import { createClient } from "@supabase/supabase-js";
const SUPABASE = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async (req: any, res: any) => {
  const analysis_id = req.query.analysis_id;
  if (!analysis_id) return res.status(400).json({ error: "analysis_id required" });
  const { data: run } = await SUPABASE.from("analysis_runs").select("retrieval_ids,scenario_hash").eq("id", analysis_id).single();
  if (!run) return res.status(404).json({ error: "not found" });
  const retrieval_ids = run.retrieval_ids || [];
  if (retrieval_ids.length === 0) return res.json({ retrievals: [] });
  const { data: items } = await SUPABASE.from("retrieval_cache").select("*").in("id", retrieval_ids);
  return res.json({ retrievals: items || [] });
};


/functions/v1/refresh-retrievals handler (sketch) will:

read analysis_runs by id,

re-run fetchAllRetrievals using scenario text and entities,

insert new retrieval_cache records,

update analysis_runs.retrieval_ids,

return new retrievals.

Testing checklist (what to run immediately)

Deploy retrievalClient.ts functions code (as a module or separate Edge Function).

Deploy analyze-engine/index.ts (ensure imports path to retrievalClient).

Set env vars.

Create SQL tables retrieval_cache, analysis_runs, schema_failures, reviewer_queue.

Run sample query: scenario_text: "India-US tariffs: how much could tariffs increase from 50%? timeframe: next 12 months" and inspect logs:

confirm retrievals returned (Perplexity + UNComtrade + WorldBank + GDELT)

LLM call executed, candidate JSON returned and validated

analysis_runs row created with retrieval_ids pointing to retrieval_cache rows

Frontend Perplexity Dashboard shows retrievals

Try Force Refresh in dashboard -> new retrievals, updated DB rows.

Final operational notes & hardening suggestions

Timeouts: Perplexity & external datasets must have per-call timeouts. Use abort controllers and fail-fast behavior.

Circuit breaker: implement circuit_breaker DB table (I provided earlier) and enforce in retrievalClient to prevent repeated failing calls.

Security: Never expose SUPABASE_SERVICE_ROLE_KEY to frontend; only keep server-side.

Logging: log external API timings to monitoring; track evidence_backed_rate.

Costs: Perplexity/LLM calls cost money — consider sampling and caching.