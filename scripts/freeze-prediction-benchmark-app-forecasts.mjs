#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  buildAppForecastFreezeArtifacts,
  buildBenchmarkScenarioDescription,
  buildLocalRoleWeightedForecast,
  renderAppForecastFreezeMarkdown,
  validateAppForecastFreeze,
} from './prediction-benchmark-suite-lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const DEFAULT_DATE_SUFFIX = '2026-06-07';

function argValue(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function usage() {
  console.error([
    'Usage: node scripts/freeze-prediction-benchmark-app-forecasts.mjs',
    `  [--date-suffix ${DEFAULT_DATE_SUFFIX}]`,
    '  [--generated-at <iso timestamp>]',
    '  [--suite docs/launch-readiness/prediction-benchmark-suite-<date>.json]',
    '  [--json-output docs/launch-readiness/prediction-benchmark-app-forecast-freeze-<date>.json]',
    '  [--md-output docs/launch-readiness/prediction-benchmark-app-forecast-freeze-<date>.md]',
    '  [--app-snapshot-csv-output docs/launch-readiness/prediction-benchmark-app-snapshots-frozen-<date>.csv]',
    '  [--scorecard-csv-output docs/launch-readiness/prediction-benchmark-scorecard-frozen-<date>.csv]',
    '  [--offline-only]',
    '  [--hosted-timeout-ms 120000]',
  ].join('\n'));
}

function resolveRepoPath(relativePath) {
  return path.isAbsolute(relativePath) ? relativePath : path.join(ROOT, relativePath);
}

function writeArtifact(relativePath, contents) {
  const absolutePath = resolveRepoPath(relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, contents);
}

function loadEnvFile(filepath) {
  if (!existsSync(filepath)) return {};
  const entries = {};
  const content = readFileSync(filepath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key) entries[key] = value;
  }
  return entries;
}

function loadBenchmarkEnv() {
  return {
    ...loadEnvFile(path.join(ROOT, '.env')),
    ...loadEnvFile(path.join(ROOT, '.env.local')),
    ...process.env,
  };
}

function redactSensitive(text, env) {
  let redacted = String(text ?? '');
  for (const [key, value] of Object.entries(env)) {
    if (!/(KEY|TOKEN|SECRET|PASSWORD|SUPABASE_URL|API)/i.test(key)) continue;
    if (typeof value === 'string' && value.length > 8) {
      redacted = redacted.replaceAll(value, `[redacted:${key}]`);
    }
  }
  redacted = redacted
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/"apikey"\s*:\s*"[^"]+"/gi, '"apikey":"[redacted]"')
    .replace(/"Authorization"\s*:\s*"[^"]+"/gi, '"Authorization":"[redacted]"');
  return redacted.slice(0, 1200);
}

function errorDigest(message) {
  return createHash('sha256').update(String(message ?? '')).digest('hex').slice(0, 16);
}

async function callHostedFunction({
  supabaseUrl,
  serviceRoleKey,
  functionName,
  body,
  timeoutMs,
  method = 'POST',
}) {
  const url = new URL(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/${functionName}`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const init = {
      method,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
    };
    if (method === 'GET') {
      for (const [key, value] of Object.entries(body || {})) {
        url.searchParams.set(key, String(value));
      }
    } else {
      init.body = JSON.stringify(body || {});
    }
    const response = await fetch(url, init);
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(`${functionName}_http_${response.status}`);
      error.payload = payload;
      throw error;
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

function evidenceGateForAnalysis(analysis) {
  const retrievalCount = Number(analysis?.provenance?.retrieval_count || analysis?.retrieval_count || analysis?.retrievals?.length || 0);
  const evidenceBacked = analysis?.provenance?.evidence_backed === true;
  const distinctProviderCount = Number(analysis?.provenance?.retrieval_provider_summary?.distinctProviderCount || 0);
  if (evidenceBacked && retrievalCount >= 3 && distinctProviderCount >= 2) return 'hosted_evidence_gate_passed';
  return `hosted_evidence_thin:evidence_backed=${evidenceBacked}:retrievals=${retrievalCount}:providers=${distinctProviderCount}`;
}

function summarizeHostedForecast({ question, generatedAt, analysisRunId, analysis, multiAgentForecast, hydratedOk }) {
  const champion = multiAgentForecast?.consensus?.champion || {};
  const probability = Number(champion.calibratedProbability ?? champion.probability);
  if (!Number.isFinite(probability)) {
    throw new Error('hosted_forecast_missing_champion_probability');
  }

  return {
    question_id: question.question_id,
    title: question.title,
    question_text: question.question_text,
    prediction_timestamp: generatedAt,
    source_type: 'hosted',
    source_label: 'hosted_analyze_engine_multi_agent_forecast',
    probability: Number(probability.toFixed(6)),
    confidence: Number((champion.confidence ?? 0).toFixed(6)),
    evidence_gate: evidenceGateForAnalysis(analysis),
    analysis_run_id: analysisRunId,
    hydrated_ok: hydratedOk,
    retrieval_count: Number(analysis?.provenance?.retrieval_count || analysis?.retrieval_count || analysis?.retrievals?.length || 0),
    retrieval_provider_summary: analysis?.provenance?.retrieval_provider_summary ?? null,
    consensus: {
      champion: {
        probability: Number((champion.probability ?? probability).toFixed(6)),
        calibrated_probability: Number(probability.toFixed(6)),
        confidence: Number((champion.confidence ?? 0).toFixed(6)),
      },
      challengers: multiAgentForecast?.consensus?.challengers ?? null,
    },
    agents: Array.isArray(multiAgentForecast?.agents)
      ? multiAgentForecast.agents.map((agent) => ({
        id: agent.id,
        probability: Number(Number(agent.probability).toFixed(6)),
        confidence: Number(Number(agent.confidence).toFixed(6)),
        weight: agent.weight,
      }))
      : [],
    claim_boundary: 'pre_resolution_hosted_app_flow_freeze_not_accuracy_proof',
  };
}

function buildLocalForecast({ question, generatedAt, dateSuffix, hostedFailure = null }) {
  const description = buildBenchmarkScenarioDescription(question);
  const runId = `prediction-benchmark-freeze-${dateSuffix}-${question.question_id}`;
  const localForecast = buildLocalRoleWeightedForecast({
    description,
    runId,
    retrievals: [],
    baseForecast: [],
  });
  return {
    question_id: question.question_id,
    title: question.title,
    question_text: question.question_text,
    prediction_timestamp: generatedAt,
    source_type: 'local_mirror',
    source_label: 'local_multi_agent_role_weighted_mirror',
    probability: localForecast.probability,
    confidence: localForecast.confidence,
    evidence_gate: hostedFailure ? 'hosted_failed_local_mirror_used' : 'offline_local_mirror_used',
    analysis_run_id: runId,
    retrieval_count: 0,
    retrieval_provider_summary: null,
    consensus: {
      champion: {
        probability: localForecast.probability,
        calibrated_probability: localForecast.calibrated_probability,
        confidence: localForecast.confidence,
      },
      challengers: localForecast.challengers,
    },
    agents: localForecast.agents,
    local_mirror_details: {
      base_forecast_probability: localForecast.base_forecast_probability,
      calibration_status: localForecast.calibration_status,
      disagreement_index: localForecast.disagreement_index,
      question_quality: localForecast.question_quality,
    },
    hosted_failure: hostedFailure,
    claim_boundary: 'pre_resolution_local_app_lane_mirror_freeze_not_hosted_or_accuracy_proof',
  };
}

async function buildHostedForecast({ question, generatedAt, dateSuffix, env, timeoutMs }) {
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.EDGE_SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('hosted_flow_missing_supabase_url_or_service_role_key');
  }

  const description = buildBenchmarkScenarioDescription(question);
  const requestId = `prediction-benchmark-freeze-${dateSuffix}-${question.question_id}-${randomUUID().slice(0, 8)}`;
  const analyzePayload = await callHostedFunction({
    supabaseUrl,
    serviceRoleKey,
    functionName: 'analyze-engine',
    timeoutMs,
    body: {
      request_id: requestId,
      runId: requestId,
      scenario_text: description,
      audience: 'researcher',
      mode: 'standard',
    },
  });

  if (!analyzePayload?.ok || !analyzePayload?.analysis) {
    throw new Error('hosted_analyze_engine_missing_analysis');
  }

  const analysis = analyzePayload.analysis;
  const analysisRunId = analyzePayload.analysis_run_id || analyzePayload.analysis_id || analyzePayload.request_id || requestId;
  let hydratedOk = false;
  try {
    const hydrated = await callHostedFunction({
      supabaseUrl,
      serviceRoleKey,
      functionName: 'analysis-hydrator',
      method: 'GET',
      timeoutMs: Math.min(timeoutMs, 30000),
      body: { analysis_run_id: analysisRunId },
    });
    hydratedOk = Boolean(hydrated?.ok && hydrated?.analysis);
  } catch {
    hydratedOk = false;
  }

  const multiAgentPayload = await callHostedFunction({
    supabaseUrl,
    serviceRoleKey,
    functionName: 'multi-agent-forecast',
    timeoutMs,
    body: {
      runId: analysisRunId,
      scenario: {
        description: analysis?.scenario_text || description,
      },
      retrievals: Array.isArray(analysis?.retrievals) ? analysis.retrievals : [],
      baseForecast: Array.isArray(analysis?.forecast) ? analysis.forecast : [],
      provenance: analysis?.provenance ?? null,
      audience: 'researcher',
      mode: 'benchmark_freeze',
    },
  });

  if (!multiAgentPayload?.ok || !multiAgentPayload?.response) {
    throw new Error('hosted_multi_agent_forecast_missing_response');
  }

  return summarizeHostedForecast({
    question,
    generatedAt,
    analysisRunId,
    analysis,
    multiAgentForecast: multiAgentPayload.response,
    hydratedOk,
  });
}

async function main() {
  if (hasFlag('--help') || hasFlag('-h')) {
    usage();
    process.exit(0);
  }

  const dateSuffix = argValue('--date-suffix', DEFAULT_DATE_SUFFIX);
  const generatedAt = argValue('--generated-at', new Date().toISOString());
  const timeoutMs = Number(argValue('--hosted-timeout-ms', '120000'));
  const suitePath = argValue('--suite', `docs/launch-readiness/prediction-benchmark-suite-${dateSuffix}.json`);
  const outputPaths = {
    json: argValue('--json-output', `docs/launch-readiness/prediction-benchmark-app-forecast-freeze-${dateSuffix}.json`),
    md: argValue('--md-output', `docs/launch-readiness/prediction-benchmark-app-forecast-freeze-${dateSuffix}.md`),
    appSnapshotCsv: argValue('--app-snapshot-csv-output', `docs/launch-readiness/prediction-benchmark-app-snapshots-frozen-${dateSuffix}.csv`),
    scorecardCsv: argValue('--scorecard-csv-output', `docs/launch-readiness/prediction-benchmark-scorecard-frozen-${dateSuffix}.csv`),
  };

  const suiteAbsolutePath = resolveRepoPath(suitePath);
  if (!existsSync(suiteAbsolutePath)) {
    throw new Error(`Missing suite JSON: ${suitePath}`);
  }

  const suite = JSON.parse(readFileSync(suiteAbsolutePath, 'utf8'));
  const questions = Array.isArray(suite.forecast_benchmark_questions) ? suite.forecast_benchmark_questions : [];
  const env = loadBenchmarkEnv();
  const offlineOnly = hasFlag('--offline-only');
  const forecasts = [];

  for (const question of questions) {
    if (!offlineOnly) {
      try {
        const forecast = await buildHostedForecast({ question, generatedAt, dateSuffix, env, timeoutMs });
        forecasts.push(forecast);
        console.error(`[freeze] ${question.question_id} hosted probability=${forecast.probability.toFixed(6)} gate=${forecast.evidence_gate}`);
        continue;
      } catch (error) {
        const message = redactSensitive(`${error?.message || error} ${JSON.stringify(error?.payload ?? '')}`, env);
        const hostedFailure = {
          status: 'failed',
          digest: errorDigest(message),
          message,
        };
        const fallback = buildLocalForecast({ question, generatedAt, dateSuffix, hostedFailure });
        forecasts.push(fallback);
        console.error(`[freeze] ${question.question_id} hosted failed digest=${hostedFailure.digest}; local probability=${fallback.probability.toFixed(6)}`);
        continue;
      }
    }

    const forecast = buildLocalForecast({ question, generatedAt, dateSuffix });
    forecasts.push(forecast);
    console.error(`[freeze] ${question.question_id} offline local probability=${forecast.probability.toFixed(6)}`);
  }

  const { freeze, csvs } = buildAppForecastFreezeArtifacts({
    suite,
    forecasts,
    generatedAt,
    dateSuffix,
  });
  const validation = validateAppForecastFreeze(freeze);
  if (validation.status !== 'passed') {
    console.error(JSON.stringify(validation, null, 2));
    process.exit(1);
  }

  writeArtifact(outputPaths.json, `${JSON.stringify(freeze, null, 2)}\n`);
  writeArtifact(outputPaths.md, renderAppForecastFreezeMarkdown(freeze));
  writeArtifact(outputPaths.appSnapshotCsv, csvs.forecastSnapshots);
  writeArtifact(outputPaths.scorecardCsv, csvs.scorecard);

  console.log(JSON.stringify({
    status: freeze.status,
    proof_boundary: freeze.proof_boundary,
    outputs: outputPaths,
    validation_status: validation.status,
    app_probability_rows_captured: freeze.summary.app_probability_rows_captured,
    hosted_rows: freeze.summary.hosted_rows,
    local_mirror_rows: freeze.summary.local_mirror_rows,
    accuracy_claim_allowed: freeze.summary.accuracy_claim_allowed,
    top_three_claim_allowed: freeze.summary.top_three_claim_allowed,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
