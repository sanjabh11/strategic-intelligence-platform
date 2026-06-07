#!/usr/bin/env node

import https from 'node:https';
import { Resolver } from 'node:dns/promises';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  BASELINE_SNAPSHOT_COLUMNS,
  TOP_10_SCENARIOS,
  benchmarkMappingTier,
  marketPriceToProbability,
  normalizeProbability,
  rowsToCsv,
  scoreBenchmarkCandidate,
} from './prediction-benchmark-suite-lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const DEFAULT_DATE_SUFFIX = '2026-06-07';
const DEFAULT_FORECASTBENCH_QUESTION_SET_URL =
  'https://raw.githubusercontent.com/forecastingresearch/forecastbench-datasets/main/datasets/question_sets/2026-06-07-llm.json';
const DEFAULT_FORECASTBENCH_LEADERBOARD_URL =
  'https://raw.githubusercontent.com/forecastingresearch/forecastbench-datasets/main/leaderboards/csv/leaderboard_tournament.csv';
const POLYMARKET_PUBLIC_DNS_SERVERS = (process.env.POLYMARKET_PUBLIC_DNS_SERVERS || '1.1.1.1,8.8.8.8')
  .split(',')
  .map((server) => server.trim())
  .filter(Boolean);
const DNS_FALLBACK_HOSTS = new Set([
  'gamma-api.polymarket.com',
  'clob.polymarket.com',
  'data-api.polymarket.com',
]);

const CANDIDATE_COLUMNS = [
  'question_id',
  'provider_id',
  'candidate_id',
  'candidate_title',
  'candidate_url',
  'probability',
  'probability_method',
  'close_time',
  'volume',
  'liquidity',
  'mapping_score',
  'mapping_tier',
  'benchmark_use_status',
  'app_probability',
  'app_gap_vs_candidate',
  'notes',
];

const KALSHI_SERIES_HINTS = [
  'FED',
  'FEDDECISION',
  'KXFED',
  'KXFEDDECISION',
  'KXINXY',
  'INXAB',
  'KXINXAB',
  'KXGOLDEOY',
  'KXBRENTMON',
  'KXBRENTW',
  'KXUSDM',
  'HURCTOTMAJ',
  'HURCMAJ',
  'KXEFFTARIFF',
  'KXTARIFFLENGTHPRC',
  'KXWTO',
];

function argValue(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function usage() {
  console.error([
    'Usage: node scripts/fetch-prediction-benchmark-public-baselines.mjs',
    `  [--date-suffix ${DEFAULT_DATE_SUFFIX}]`,
    '  [--generated-at <iso timestamp>]',
    '  [--suite docs/launch-readiness/prediction-benchmark-suite-<date>.json]',
    '  [--app-freeze docs/launch-readiness/prediction-benchmark-app-forecast-freeze-<date>.json]',
    '  [--json-output docs/launch-readiness/prediction-benchmark-public-baseline-mapping-<date>.json]',
    '  [--md-output docs/launch-readiness/prediction-benchmark-public-baseline-mapping-<date>.md]',
    '  [--candidate-csv-output docs/launch-readiness/prediction-benchmark-public-baseline-candidates-<date>.csv]',
    '  [--baseline-snapshot-csv-output docs/launch-readiness/prediction-benchmark-public-baseline-snapshots-<date>.csv]',
    '  [--skip-polymarket]',
    '  [--skip-manifold]',
    '  [--skip-kalshi]',
    '  [--skip-forecastbench]',
    `  [--forecastbench-question-set-url ${DEFAULT_FORECASTBENCH_QUESTION_SET_URL}]`,
    `  [--forecastbench-leaderboard-url ${DEFAULT_FORECASTBENCH_LEADERBOARD_URL}]`,
  ].join('\n'));
}

function resolveRepoPath(relativePath) {
  return path.isAbsolute(relativePath) ? relativePath : path.join(ROOT, relativePath);
}

function readJsonIfExists(relativePath, fallback = null) {
  const absolutePath = resolveRepoPath(relativePath);
  if (!existsSync(absolutePath)) return fallback;
  return JSON.parse(readFileSync(absolutePath, 'utf8'));
}

function writeArtifact(relativePath, contents) {
  const absolutePath = resolveRepoPath(relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, contents);
}

function round(value, digits = 6) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Number(numeric.toFixed(digits));
}

function providerErrorMessage(error) {
  return error?.cause?.code
    ? `${error.message}:${error.cause.code}:${error.cause.hostname || ''}`
    : error?.message || String(error);
}

function parseMaybeJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function fetchJson(url, { timeoutMs = 12000, attempts = 2 } = {}) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const error = new Error(`http_${response.status}`);
        error.payload = payload;
        throw error;
      }
      return payload;
    } catch (error) {
      lastError = error;
      if (shouldRetryWithPublicDns(url, error)) {
        return fetchJsonWithPublicDns(url, { timeoutMs });
      }
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

function shouldRetryWithPublicDns(url, error) {
  try {
    const parsed = new URL(url);
    const dnsCode = error?.cause?.code || error?.code;
    return parsed.protocol === 'https:' && DNS_FALLBACK_HOSTS.has(parsed.hostname) && dnsCode === 'ENOTFOUND';
  } catch {
    return false;
  }
}

async function resolvePublicDns(hostname) {
  if (!POLYMARKET_PUBLIC_DNS_SERVERS.length) {
    throw new Error('polymarket_public_dns_servers_not_configured');
  }
  const resolver = new Resolver();
  resolver.setServers(POLYMARKET_PUBLIC_DNS_SERVERS);
  return resolver.resolve4(hostname);
}

async function fetchJsonWithPublicDns(url, { timeoutMs = 12000 } = {}) {
  const target = new URL(url);
  const addresses = await resolvePublicDns(target.hostname);
  if (!addresses.length) {
    throw new Error(`public_dns_no_a_records:${target.hostname}`);
  }

  return new Promise((resolve, reject) => {
    const request = https.request({
      protocol: target.protocol,
      hostname: target.hostname,
      servername: target.hostname,
      path: `${target.pathname}${target.search}`,
      method: 'GET',
      headers: { Accept: 'application/json' },
      timeout: timeoutMs,
      lookup: (_hostname, options, callback) => {
        if (options?.all) {
          callback(null, addresses.map((address) => ({ address, family: 4 })));
          return;
        }
        callback(null, addresses[0], 4);
      },
    }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        let payload = null;
        try {
          payload = body ? JSON.parse(body) : null;
        } catch (error) {
          reject(error);
          return;
        }
        if (response.statusCode < 200 || response.statusCode >= 300) {
          const error = new Error(`http_${response.statusCode}`);
          error.payload = payload;
          reject(error);
          return;
        }
        if (payload && typeof payload === 'object') {
          payload.__dnsFallback = {
            host: target.hostname,
            servers: POLYMARKET_PUBLIC_DNS_SERVERS,
            resolved_address_count: addresses.length,
          };
        }
        resolve(payload);
      });
    });

    request.on('timeout', () => {
      request.destroy(new Error(`timeout_${timeoutMs}ms`));
    });
    request.on('error', reject);
    request.end();
  });
}

async function fetchText(url, { timeoutMs = 12000, attempts = 2 } = {}) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      const text = await response.text();
      if (!response.ok) {
        const error = new Error(`http_${response.status}`);
        error.payload = text.slice(0, 500);
        throw error;
      }
      return text;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  values.push(current);
  return values;
}

function parseCsvRows(csv) {
  const lines = String(csv || '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

function scenarioQueries(question) {
  const scenario = TOP_10_SCENARIOS.find((entry) => entry.id === question.question_id);
  return [
    question.title,
    question.question_text,
    ...(scenario?.baselineQueries || []),
  ]
    .filter(Boolean)
    .map((query) => String(query).slice(0, 180));
}

function candidateKey(candidate) {
  return `${candidate.provider_id}:${candidate.candidate_id || candidate.candidate_url || candidate.candidate_title}`;
}

function enrichCandidate(question, appProbability, candidate) {
  const probability = normalizeProbability(candidate.probability);
  const mappingScore = scoreBenchmarkCandidate({
    benchmarkQuestion: question.question_text,
    resolutionCriteria: question.resolution_criteria,
    candidateTitle: candidate.candidate_title,
    candidateDescription: candidate.candidate_description || '',
  });
  const mappingTier = benchmarkMappingTier(mappingScore);
  const appGap = probability === null || appProbability === null ? null : round(appProbability - probability);
  return {
    question_id: question.question_id,
    ...candidate,
    probability,
    mapping_score: mappingScore,
    mapping_tier: mappingTier,
    benchmark_use_status: mappingTier === 'same_question_candidate'
      ? 'usable_if_resolution_mapping_review_passes'
      : 'diagnostic_only_not_same_question',
    app_probability: appProbability,
    app_gap_vs_candidate: appGap,
  };
}

async function fetchPolymarketCandidates(question, appProbability, providerStatus) {
  const candidates = new Map();
  let localQueryErrorCount = 0;
  let localLastQueryError = null;
  for (const query of scenarioQueries(question).slice(0, 3)) {
    const url = new URL('https://gamma-api.polymarket.com/public-search');
    url.searchParams.set('q', query);
    url.searchParams.set('limit_per_type', '5');
    url.searchParams.set('search_profiles', 'false');
    url.searchParams.set('keep_closed_markets', '1');
    providerStatus.polymarket.query_count += 1;
    let payload = null;
    try {
      payload = await fetchJson(url.toString());
    } catch (error) {
      localQueryErrorCount += 1;
      localLastQueryError = providerErrorMessage(error);
      providerStatus.polymarket.query_error_count = (providerStatus.polymarket.query_error_count || 0) + 1;
      providerStatus.polymarket.last_query_error = localLastQueryError;
      continue;
    }
    if (payload?.__dnsFallback) {
      providerStatus.polymarket.dns_fallback_count = (providerStatus.polymarket.dns_fallback_count || 0) + 1;
      providerStatus.polymarket.dns_fallback = payload.__dnsFallback;
      delete payload.__dnsFallback;
    }
    const eventMarkets = (payload?.events || []).flatMap((event) => {
      const markets = Array.isArray(event.markets) ? event.markets : [];
      return markets.map((market) => ({ event, market }));
    });
    for (const { event, market } of eventMarkets) {
      const outcomes = parseMaybeJsonArray(market.outcomes);
      const prices = parseMaybeJsonArray(market.outcomePrices);
      const yesIndex = outcomes.findIndex((outcome) => /^yes$/i.test(String(outcome)));
      const probability = yesIndex >= 0 ? normalizeProbability(prices[yesIndex]) : null;
      if (probability === null) continue;
      const candidate = enrichCandidate(question, appProbability, {
        provider_id: 'polymarket',
        candidate_id: String(market.id || market.conditionId || market.slug || event.id || ''),
        candidate_title: market.question || event.title || '',
        candidate_description: `${event.title || ''} ${market.description || ''}`,
        candidate_url: market.slug ? `https://polymarket.com/event/${event.slug || market.slug}` : 'https://polymarket.com',
        probability,
        probability_method: 'gamma_outcomePrices_yes',
        close_time: market.endDate || event.endDate || '',
        volume: market.volume || event.volume || '',
        liquidity: market.liquidity || event.liquidity || '',
        notes: `Public-search query="${query}".`,
      });
      candidates.set(candidateKey(candidate), candidate);
    }
  }
  if (localQueryErrorCount > 0 && candidates.size === 0) {
    throw new Error(localLastQueryError || 'polymarket_all_queries_failed');
  }
  return [...candidates.values()];
}

async function fetchManifoldCandidates(question, appProbability, providerStatus) {
  const candidates = new Map();
  for (const query of scenarioQueries(question).slice(0, 4)) {
    const url = new URL('https://api.manifold.markets/v0/search-markets');
    url.searchParams.set('term', query);
    url.searchParams.set('limit', '8');
    providerStatus.manifold.query_count += 1;
    const payload = await fetchJson(url.toString());
    for (const market of Array.isArray(payload) ? payload : []) {
      if (market.outcomeType !== 'BINARY') continue;
      const probability = normalizeProbability(market.probability);
      if (probability === null) continue;
      const creator = market.creatorUsername || 'market';
      const candidate = enrichCandidate(question, appProbability, {
        provider_id: 'manifold',
        candidate_id: market.id || market.slug || '',
        candidate_title: market.question || '',
        candidate_description: market.description || '',
        candidate_url: market.slug ? `https://manifold.markets/${creator}/${market.slug}` : 'https://manifold.markets',
        probability,
        probability_method: 'public_market_probability',
        close_time: market.closeTime ? new Date(Number(market.closeTime)).toISOString() : '',
        volume: round(market.volume, 3) ?? '',
        liquidity: round(market.totalLiquidity, 3) ?? '',
        notes: `Search query="${query}".`,
      });
      candidates.set(candidateKey(candidate), candidate);
    }
  }
  return [...candidates.values()];
}

async function loadKalshiSeries(providerStatus) {
  const rows = [];
  for (const ticker of KALSHI_SERIES_HINTS) {
    const url = `https://api.elections.kalshi.com/trade-api/v2/series/${encodeURIComponent(ticker)}`;
    providerStatus.kalshi.query_count += 1;
    try {
      const payload = await fetchJson(url, { timeoutMs: 12000, attempts: 2 });
      if (payload?.series) rows.push(payload.series);
    } catch {
      // Individual hint misses are expected as Kalshi retires or renames series.
    }
  }
  return rows;
}

async function fetchKalshiMarketsForSeries(seriesTicker, providerStatus) {
  const url = new URL('https://api.elections.kalshi.com/trade-api/v2/markets');
  url.searchParams.set('series_ticker', seriesTicker);
  url.searchParams.set('status', 'open');
  url.searchParams.set('limit', '100');
  providerStatus.kalshi.query_count += 1;
  const payload = await fetchJson(url.toString());
  return Array.isArray(payload?.markets) ? payload.markets : [];
}

async function fetchKalshiCandidates(question, appProbability, seriesRows, providerStatus) {
  const seriesCandidates = [];
  for (const series of seriesRows) {
    const score = scoreBenchmarkCandidate({
      benchmarkQuestion: question.question_text,
      resolutionCriteria: question.resolution_criteria,
      candidateTitle: series.title || series.ticker || '',
      candidateDescription: `${series.category || ''} ${(series.tags || []).join(' ')}`,
    });
    if (score >= 0.18) {
      seriesCandidates.push({ series, score });
    }
  }

  const candidates = new Map();
  for (const { series } of seriesCandidates.sort((left, right) => right.score - left.score).slice(0, 5)) {
    const markets = await fetchKalshiMarketsForSeries(series.ticker, providerStatus).catch(() => []);
    for (const market of markets.slice(0, 20)) {
      const price = marketPriceToProbability({
        bestBid: market.yes_bid,
        bestAsk: market.yes_ask,
        lastTrade: market.last_price,
      });
      if (price.probability === null) continue;
      const candidate = enrichCandidate(question, appProbability, {
        provider_id: 'kalshi',
        candidate_id: market.ticker || '',
        candidate_title: market.title || series.title || market.ticker || '',
        candidate_description: `${series.title || ''} ${market.subtitle || ''} ${market.rules_primary || ''}`,
        candidate_url: market.ticker ? `https://kalshi.com/markets/${market.ticker}` : 'https://kalshi.com/markets',
        probability: price.probability,
        probability_method: price.method,
        close_time: market.close_time || '',
        volume: market.volume || '',
        liquidity: market.liquidity || '',
        notes: `Matched Kalshi series=${series.ticker}; spread=${price.spread ?? 'n/a'}.`,
      });
      candidates.set(candidateKey(candidate), candidate);
    }
  }
  return [...candidates.values()];
}

async function loadForecastBenchQuestionSet(questionSetUrl, providerStatus) {
  providerStatus.forecastbench.query_count += 1;
  const payload = await fetchJson(questionSetUrl, { timeoutMs: 15000, attempts: 2 });
  const questions = Array.isArray(payload?.questions) ? payload.questions : [];
  if (questions.length === 0) {
    throw new Error('forecastbench_question_set_missing_questions');
  }
  return {
    question_set: payload.question_set || questionSetUrl.split('/').pop() || 'forecastbench-question-set',
    forecast_due_date: payload.forecast_due_date || '',
    question_set_url: questionSetUrl,
    questions,
  };
}

async function loadForecastBenchLeaderboard(leaderboardUrl, providerStatus) {
  providerStatus.forecastbench.query_count += 1;
  const csv = await fetchText(leaderboardUrl, { timeoutMs: 15000, attempts: 2 });
  return parseCsvRows(csv).slice(0, 10).map((row) => ({
    rank: row.Rank || '',
    team: row.Team || '',
    model_organization: row['Model Organization'] || '',
    model: row.Model || '',
    overall: row.Overall || row.Dataset || '',
    n: row.N || row['N dataset'] || '',
    brier_overall: row['Brier Overall'] || row['Brier Dataset'] || '',
    bss: row.BSS || '',
    peer: row.Peer || '',
  }));
}

function fetchForecastBenchCandidates(question, appProbability, forecastBenchSet) {
  const scored = [];
  for (const forecastBenchQuestion of forecastBenchSet?.questions || []) {
    const probability = normalizeProbability(forecastBenchQuestion.freeze_datetime_value);
    if (probability === null) continue;
    const candidate = enrichCandidate(question, appProbability, {
      provider_id: 'forecastbench',
      candidate_id: forecastBenchQuestion.id || '',
      candidate_title: forecastBenchQuestion.question || '',
      candidate_description: [
        forecastBenchQuestion.background || '',
        forecastBenchQuestion.resolution_criteria || '',
        forecastBenchQuestion.market_info_resolution_criteria || '',
      ].join(' '),
      candidate_url: forecastBenchQuestion.url || forecastBenchSet.question_set_url,
      probability,
      probability_method: 'forecastbench_freeze_datetime_value',
      close_time: forecastBenchQuestion.market_info_close_datetime || '',
      volume: '',
      liquidity: '',
      notes: [
        `ForecastBench question_set=${forecastBenchSet.question_set}.`,
        `source=${forecastBenchQuestion.source || 'unknown'}.`,
        `freeze_datetime=${forecastBenchQuestion.freeze_datetime || forecastBenchSet.forecast_due_date || ''}.`,
      ].join(' '),
    });
    scored.push(candidate);
  }

  return scored
    .filter((candidate) => candidate.mapping_score >= 0.16)
    .sort((left, right) => right.mapping_score - left.mapping_score)
    .slice(0, 8);
}

function selectBestCandidate(candidates) {
  return [...candidates]
    .filter((candidate) => candidate.probability !== null)
    .sort((left, right) => {
      if (right.mapping_score !== left.mapping_score) return right.mapping_score - left.mapping_score;
      return Number(right.liquidity || 0) - Number(left.liquidity || 0);
    })[0] || null;
}

function buildBaselineSnapshotRows({ questions, bestByQuestion, generatedAt }) {
  return questions.map((question) => {
    const best = bestByQuestion.get(question.question_id);
    if (best?.mapping_tier === 'same_question_candidate') {
      return {
        baseline_snapshot_id: `${question.question_id}-${best.provider_id}-public-baseline-v1`,
        question_id: question.question_id,
        baseline_type: best.provider_id,
        label: best.candidate_title,
        probability: round(best.probability),
        prediction_timestamp: generatedAt,
        source_url: best.candidate_url,
        sample_size: '1',
        timestamp_policy: 'Public API snapshot captured before benchmark question resolution.',
        comparability_notes: `Candidate mapping tier=${best.mapping_tier}; reviewer must verify exact resolution criteria before scoring.`,
        notes: `Probability method=${best.probability_method}; app_gap_vs_candidate=${best.app_gap_vs_candidate ?? ''}.`,
      };
    }
    return {
      baseline_snapshot_id: `${question.question_id}-trivial-prior-v1`,
      question_id: question.question_id,
      baseline_type: 'trivial_prior',
      label: 'Trivial 50 percent binary prior',
      probability: '0.5',
      prediction_timestamp: generatedAt,
      source_url: question.expected_resolution_source_url,
      sample_size: '1',
      timestamp_policy: 'Captured at public baseline scan before resolution.',
      comparability_notes: best
        ? `No same-question public baseline accepted. Closest candidate=${best.provider_id}:${best.candidate_title}; tier=${best.mapping_tier}; score=${best.mapping_score}.`
        : 'No public baseline candidate returned above diagnostic threshold.',
      notes: 'Use as minimum control until same-question public baseline is verified.',
    };
  });
}

function renderMarkdown(report) {
  const rows = report.question_results.map((row, index) => {
    const best = row.best_public_candidate;
    return `| ${index + 1} | ${row.question_id} | ${row.app_probability ?? ''} | ${best?.provider_id || 'none'} | ${best?.probability ?? ''} | ${best?.mapping_tier || 'no_candidate'} | ${best?.app_gap_vs_candidate ?? ''} | ${row.claim_status} |`;
  }).join('\n');

  const providerRows = Object.values(report.provider_status)
    .map((provider) => `| ${provider.provider_id} | ${provider.status} | ${provider.query_count} | ${provider.candidate_count} | ${provider.error || ''} |`)
    .join('\n');
  const forecastBenchRows = (report.forecastbench_leaderboard_reference || [])
    .map((row) => `| ${row.rank} | ${row.model_organization} | ${row.model} | ${row.overall} | ${row.n} | ${row.brier_overall} |`)
    .join('\n') || '| n/a | n/a | n/a | n/a | n/a | n/a |';

  return `# Prediction Benchmark Public Baseline Mapping - ${report.generated_at.slice(0, 10)}

Status: \`${report.status}\`

${report.proof_boundary}

## Summary

| Metric | Value |
|---|---:|
| Questions checked | ${report.summary.questions_checked} |
| Public candidate rows | ${report.summary.public_candidate_rows} |
| Same-question candidates | ${report.summary.same_question_candidate_rows} |
| Close public proxies | ${report.summary.close_public_proxy_rows} |
| Diagnostic-only rows | ${report.summary.diagnostic_only_rows} |
| Accuracy claim allowed | ${report.summary.accuracy_claim_allowed} |
| Top-three claim allowed | ${report.summary.top_three_claim_allowed} |

## App Vs Public Candidate Snapshot

| # | Question ID | App Probability | Best Public Candidate | Candidate Probability | Mapping Tier | App Gap | Claim Status |
|---:|---|---:|---|---:|---|---:|---|
${rows}

## Provider Status

| Provider | Status | Queries | Candidates | Error |
|---|---:|---:|---:|---|
${providerRows}

## ForecastBench Leaderboard Reference

These rows are method-level benchmark standings, not same-question results for this app's top-10 questions.

| Rank | Organization | Model | Overall | N | Brier Overall |
|---:|---|---|---:|---:|---:|
${forecastBenchRows}

## Claim Boundary

Diagnostic probability gaps are not Brier scores and not accuracy evidence. Same-question scoring still requires resolved outcomes, leakage review, and verified baseline comparability.
`;
}

async function main() {
  if (hasFlag('--help') || hasFlag('-h')) {
    usage();
    process.exit(0);
  }

  const dateSuffix = argValue('--date-suffix', DEFAULT_DATE_SUFFIX);
  const generatedAt = argValue('--generated-at', new Date().toISOString());
  const forecastBenchQuestionSetUrl = argValue('--forecastbench-question-set-url', DEFAULT_FORECASTBENCH_QUESTION_SET_URL);
  const forecastBenchLeaderboardUrl = argValue('--forecastbench-leaderboard-url', DEFAULT_FORECASTBENCH_LEADERBOARD_URL);
  const suitePath = argValue('--suite', `docs/launch-readiness/prediction-benchmark-suite-${dateSuffix}.json`);
  const appFreezePath = argValue('--app-freeze', `docs/launch-readiness/prediction-benchmark-app-forecast-freeze-${dateSuffix}.json`);
  const outputPaths = {
    json: argValue('--json-output', `docs/launch-readiness/prediction-benchmark-public-baseline-mapping-${dateSuffix}.json`),
    md: argValue('--md-output', `docs/launch-readiness/prediction-benchmark-public-baseline-mapping-${dateSuffix}.md`),
    candidateCsv: argValue('--candidate-csv-output', `docs/launch-readiness/prediction-benchmark-public-baseline-candidates-${dateSuffix}.csv`),
    baselineSnapshotCsv: argValue('--baseline-snapshot-csv-output', `docs/launch-readiness/prediction-benchmark-public-baseline-snapshots-${dateSuffix}.csv`),
  };

  const suite = readJsonIfExists(suitePath);
  if (!suite) throw new Error(`Missing suite JSON: ${suitePath}`);
  const appFreeze = readJsonIfExists(appFreezePath, { forecasts: [] });
  const appProbabilityByQuestion = new Map(
    (appFreeze.forecasts || []).map((forecast) => [forecast.question_id, normalizeProbability(forecast.probability)]),
  );
  const questions = Array.isArray(suite.forecast_benchmark_questions) ? suite.forecast_benchmark_questions : [];
  const providerStatus = {
    polymarket: { provider_id: 'polymarket', status: 'not_queried', query_count: 0, candidate_count: 0, error: null },
    manifold: { provider_id: 'manifold', status: 'not_queried', query_count: 0, candidate_count: 0, error: null },
    kalshi: { provider_id: 'kalshi', status: 'not_queried', query_count: 0, candidate_count: 0, error: null },
    forecastbench: { provider_id: 'forecastbench', status: 'not_queried', query_count: 0, candidate_count: 0, error: null },
  };

  let forecastBenchSet = null;
  let forecastBenchLeaderboard = [];
  if (!hasFlag('--skip-forecastbench')) {
    try {
      forecastBenchSet = await loadForecastBenchQuestionSet(forecastBenchQuestionSetUrl, providerStatus);
      forecastBenchLeaderboard = await loadForecastBenchLeaderboard(forecastBenchLeaderboardUrl, providerStatus);
      providerStatus.forecastbench.status = 'queried';
    } catch (error) {
      providerStatus.forecastbench.status = 'failed';
      providerStatus.forecastbench.error = error?.message || String(error);
    }
  }

  let kalshiSeries = [];
  if (!hasFlag('--skip-kalshi')) {
    try {
      kalshiSeries = await loadKalshiSeries(providerStatus);
      providerStatus.kalshi.status = 'queried';
    } catch (error) {
      providerStatus.kalshi.status = 'failed';
      providerStatus.kalshi.error = error?.message || String(error);
    }
  }

  const candidateRows = [];
  for (const question of questions) {
    const appProbability = appProbabilityByQuestion.get(question.question_id) ?? null;
    if (!hasFlag('--skip-polymarket')) {
      try {
        const rows = await fetchPolymarketCandidates(question, appProbability, providerStatus);
        providerStatus.polymarket.status = 'queried';
        providerStatus.polymarket.candidate_count += rows.length;
        candidateRows.push(...rows);
      } catch (error) {
        providerStatus.polymarket.status = 'failed';
        providerStatus.polymarket.error = providerErrorMessage(error);
      }
    }

    if (!hasFlag('--skip-manifold')) {
      try {
        const rows = await fetchManifoldCandidates(question, appProbability, providerStatus);
        providerStatus.manifold.status = 'queried';
        providerStatus.manifold.candidate_count += rows.length;
        candidateRows.push(...rows);
      } catch (error) {
        providerStatus.manifold.status = 'failed';
        providerStatus.manifold.error = error?.message || String(error);
      }
    }

    if (!hasFlag('--skip-kalshi') && providerStatus.kalshi.status === 'queried') {
      const rows = await fetchKalshiCandidates(question, appProbability, kalshiSeries, providerStatus);
      providerStatus.kalshi.candidate_count += rows.length;
      candidateRows.push(...rows);
    }

    if (!hasFlag('--skip-forecastbench') && providerStatus.forecastbench.status === 'queried' && forecastBenchSet) {
      const rows = fetchForecastBenchCandidates(question, appProbability, forecastBenchSet);
      providerStatus.forecastbench.candidate_count += rows.length;
      candidateRows.push(...rows);
    }
  }

  const byQuestion = new Map();
  for (const candidate of candidateRows) {
    const current = byQuestion.get(candidate.question_id) || [];
    current.push(candidate);
    byQuestion.set(candidate.question_id, current);
  }
  const bestByQuestion = new Map();
  const questionResults = questions.map((question) => {
    const candidates = (byQuestion.get(question.question_id) || [])
      .sort((left, right) => right.mapping_score - left.mapping_score);
    const best = selectBestCandidate(candidates);
    if (best) bestByQuestion.set(question.question_id, best);
    return {
      question_id: question.question_id,
      title: question.title,
      app_probability: appProbabilityByQuestion.get(question.question_id) ?? null,
      candidate_count: candidates.length,
      best_public_candidate: best,
      claim_status: best?.mapping_tier === 'same_question_candidate'
        ? 'review_mapping_before_scoring'
        : 'no_same_question_public_baseline_found',
      top_candidates: candidates.slice(0, 5),
    };
  });

  const sameQuestionRows = candidateRows.filter((candidate) => candidate.mapping_tier === 'same_question_candidate').length;
  const closeProxyRows = candidateRows.filter((candidate) => candidate.mapping_tier === 'close_public_proxy').length;
  const report = {
    schema_version: 'prediction-benchmark-public-baseline-mapping-v1',
    generated_at: generatedAt,
    status: 'public_baseline_mapping_completed_not_accuracy_proof',
    proof_boundary: 'This read-only scan compares app probabilities with public prediction-market candidates where available. It does not prove accuracy, benchmark superiority, top-three status, or hosted app behavior.',
    source_artifacts: {
      suite: suitePath,
      app_freeze: appFreezePath,
      forecastbench_question_set: !hasFlag('--skip-forecastbench') ? forecastBenchQuestionSetUrl : null,
      forecastbench_leaderboard: !hasFlag('--skip-forecastbench') ? forecastBenchLeaderboardUrl : null,
    },
    summary: {
      questions_checked: questions.length,
      public_candidate_rows: candidateRows.length,
      same_question_candidate_rows: sameQuestionRows,
      close_public_proxy_rows: closeProxyRows,
      diagnostic_only_rows: candidateRows.length - sameQuestionRows,
      accuracy_claim_allowed: false,
      top_three_claim_allowed: false,
    },
    provider_status: providerStatus,
    forecastbench_leaderboard_reference: forecastBenchLeaderboard,
    question_results: questionResults,
    public_baseline_candidates: candidateRows,
    forecast_baseline_snapshots: buildBaselineSnapshotRows({ questions, bestByQuestion, generatedAt }),
  };

  writeArtifact(outputPaths.json, `${JSON.stringify(report, null, 2)}\n`);
  writeArtifact(outputPaths.md, renderMarkdown(report));
  writeArtifact(outputPaths.candidateCsv, rowsToCsv(CANDIDATE_COLUMNS, candidateRows));
  writeArtifact(outputPaths.baselineSnapshotCsv, rowsToCsv(BASELINE_SNAPSHOT_COLUMNS, report.forecast_baseline_snapshots));

  console.log(JSON.stringify({
    status: report.status,
    outputs: outputPaths,
    public_candidate_rows: report.summary.public_candidate_rows,
    same_question_candidate_rows: report.summary.same_question_candidate_rows,
    close_public_proxy_rows: report.summary.close_public_proxy_rows,
    provider_status: report.provider_status,
    accuracy_claim_allowed: report.summary.accuracy_claim_allowed,
    top_three_claim_allowed: report.summary.top_three_claim_allowed,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
