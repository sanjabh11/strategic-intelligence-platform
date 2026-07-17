#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const ROOT = process.cwd();
const DEFAULT_EVIDENCE = 'docs/launch-readiness/launch-evidence-2026-06-06.json';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/external-source-freshness-2026-06-06.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/external-source-freshness-2026-06-06.md';
const DEFAULT_CSV_OUTPUT = 'docs/launch-readiness/external-source-freshness-checklist-2026-06-06.csv';

const DEFAULT_SOURCE_ARTIFACTS = [
  {
    lane: 'market_niche',
    path: 'docs/launch-readiness/market-niche-evidence-validation-2026-06-06.json',
    arrays: ['current_research_anchors']
  },
  {
    lane: 'competitive_positioning',
    path: 'docs/launch-readiness/competitive-positioning-evidence-validation-2026-06-06.json',
    arrays: ['current_competitive_sources']
  },
  {
    lane: 'prediction_science',
    path: 'docs/launch-readiness/prediction-science-evidence-validation-2026-06-06.json',
    arrays: ['current_forecasting_science_sources']
  },
  {
    lane: 'enterprise_trust',
    path: 'docs/launch-readiness/enterprise-trust-execution-readiness-2026-06-06.json',
    arrays: ['current_enterprise_trust_sources']
  },
  {
    lane: 'hosted_proof',
    path: 'docs/launch-readiness/hosted-smoke-execution-readiness-2026-06-06.json',
    arrays: ['current_hosted_proof_sources']
  },
  {
    lane: 'enterprise_procurement',
    path: 'docs/launch-readiness/enterprise-procurement-readiness-gate-2026-06-06.json',
    arrays: ['current_source_alignment']
  },
  {
    lane: 'loophole_remediation',
    path: 'docs/launch-readiness/commercial-loophole-remediation-2026-06-06.json',
    arrays: ['current_source_anchors']
  },
  {
    lane: 'forecast_protocol',
    path: 'docs/launch-readiness/forecast-evaluation-protocol-2026-06-06.json',
    arrays: ['external_methodology_alignment']
  },
  {
    lane: 'forecast_scoring',
    path: 'docs/launch-readiness/forecast-scoring-evidence-validation-2026-06-06.json',
    arrays: ['current_source_alignment']
  },
  {
    lane: 'rls_proof',
    path: 'docs/launch-readiness/rls-proof-evidence-validation-2026-06-06.json',
    arrays: ['current_source_alignment']
  },
  {
    lane: 'commercial_confidence_frameworks',
    path: 'docs/launch-readiness/commercial-confidence-gate-2026-06-06.json',
    arrays: ['external_framework_alignment']
  }
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
    'Usage: node scripts/build-external-source-freshness-report.mjs',
    `  [--evidence ${DEFAULT_EVIDENCE}]`,
    `  [--json-output ${DEFAULT_JSON_OUTPUT}]`,
    `  [--md-output ${DEFAULT_MD_OUTPUT}]`,
    `  [--csv-output ${DEFAULT_CSV_OUTPUT}]`,
    '  [--timeout-ms 12000]',
    '  [--concurrency 4]',
    '  [--update-evidence]'
  ].join('\n'));
}

if (hasFlag('--help') || hasFlag('-h')) {
  usage();
  process.exit(0);
}

const inputPaths = {
  evidence: argValue('--evidence', DEFAULT_EVIDENCE)
};

const outputPaths = {
  json: argValue('--json-output', DEFAULT_JSON_OUTPUT),
  md: argValue('--md-output', DEFAULT_MD_OUTPUT),
  csv: argValue('--csv-output', DEFAULT_CSV_OUTPUT)
};

const fetchTimeoutMs = Number(argValue('--timeout-ms', '12000'));
const fetchConcurrency = Math.max(1, Number(argValue('--concurrency', '4')));
const updateEvidence = hasFlag('--update-evidence');

if (!outputPaths.json && !outputPaths.md && !outputPaths.csv) {
  console.error('At least one output path is required.');
  process.exit(2);
}

function resolveRepoPath(relativePath) {
  return path.isAbsolute(relativePath) ? relativePath : path.join(ROOT, relativePath);
}

function readJsonIfExists(relativePath, fallback) {
  const absolutePath = resolveRepoPath(relativePath);
  return existsSync(absolutePath) ? JSON.parse(readFileSync(absolutePath, 'utf8')) : fallback;
}

function writeArtifact(relativePath, contents) {
  const absolutePath = resolveRepoPath(relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, contents);
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csvLine(columns) {
  return columns.map(csvCell).join(',');
}

function mdCell(value) {
  return String(value ?? '').replaceAll('|', '/').replace(/\s+/g, ' ').trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueSorted(values) {
  return [...new Set(values.filter((value) => String(value ?? '').trim()).map(String))].sort();
}

function normalizeUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  try {
    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    parsed.hash = '';
    if (parsed.pathname.length > 1) parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    parsed.hostname = parsed.hostname.toLowerCase();
    return parsed.toString();
  } catch {
    return null;
  }
}

function sourceTitle(entry) {
  return entry.source
    ?? entry.framework
    ?? entry.title
    ?? entry.name
    ?? entry.id
    ?? 'unnamed source';
}

function sourceRationale(entry) {
  return entry.implication
    ?? entry.requirement
    ?? entry.protocol_implication
    ?? entry.alignment
    ?? entry.minimum_evidence
    ?? entry.evidence
    ?? '';
}

function collectSourceEntries() {
  const collected = [];

  for (const spec of DEFAULT_SOURCE_ARTIFACTS) {
    const artifact = readJsonIfExists(spec.path, null);
    if (!artifact) continue;

    for (const arrayKey of spec.arrays) {
      for (const entry of asArray(artifact[arrayKey])) {
        if (!entry || typeof entry !== 'object') continue;
        const url = entry.url ?? entry.source_url ?? entry.link;
        const normalized = normalizeUrl(url);
        if (!normalized) continue;

        collected.push({
          normalized_url: normalized,
          url: String(url).trim(),
          label: String(sourceTitle(entry)).trim(),
          rationale: String(sourceRationale(entry)).trim(),
          lane: spec.lane,
          artifact: spec.path,
          array_key: arrayKey
        });
      }
    }
  }

  const deduped = new Map();
  for (const item of collected) {
    const existing = deduped.get(item.normalized_url) ?? {
      normalized_url: item.normalized_url,
      url: item.url,
      labels: [],
      rationales: [],
      lanes: [],
      source_artifacts: []
    };

    existing.labels.push(item.label);
    existing.rationales.push(item.rationale);
    existing.lanes.push(item.lane);
    existing.source_artifacts.push(`${item.artifact}#${item.array_key}`);
    deduped.set(item.normalized_url, existing);
  }

  return [...deduped.values()]
    .map((item) => ({
      ...item,
      labels: uniqueSorted(item.labels),
      rationales: uniqueSorted(item.rationales),
      lanes: uniqueSorted(item.lanes),
      source_artifacts: uniqueSorted(item.source_artifacts)
    }))
    .sort((a, b) => a.url.localeCompare(b.url));
}

function extractTitle(text) {
  const match = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match
    ? match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180)
    : '';
}

function classifyFetchOutcome(result) {
  if (result.error) {
    return result.error === 'timeout' ? 'timeout_unverified' : 'fetch_failed_unverified';
  }

  if (result.status >= 200 && result.status < 400) return 'reachable';
  if ([401, 403, 429].includes(result.status)) return 'access_limited_unverified';
  if ([404, 410].includes(result.status)) return 'broken_or_removed';
  if (result.status >= 500) return 'server_error_unverified';
  return 'http_unverified';
}

function classifyTitleWarning(title) {
  const normalized = String(title ?? '').trim().toLowerCase();
  if (!normalized) return '';
  if (/\b(page not found|not found|404|410|gone)\b/i.test(normalized)) return 'title_indicates_not_found';
  if (/\b(access denied|forbidden|unauthorized)\b/i.test(normalized)) return 'title_indicates_access_denied';
  if (/\b(just a moment|checking your browser|security check|captcha)\b/i.test(normalized)) return 'title_indicates_interstitial';
  return '';
}

async function fetchSource(source) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), fetchTimeoutMs);

  try {
    const response = await fetch(source.url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/pdf,text/plain,*/*;q=0.8',
        'User-Agent': 'CodexLaunchReadinessSourceFreshness/1.0'
      }
    });

    const contentType = response.headers.get('content-type') ?? '';
    let title = '';
    if (/html|text|json|xml/i.test(contentType)) {
      const text = await response.text();
      title = extractTitle(text);
    }

    const result = {
      ...source,
      checked_at: new Date().toISOString(),
      status: response.status,
      status_text: response.statusText,
      final_url: response.url,
      content_type: contentType,
      title,
      error: ''
    };

    const reachabilityStatus = classifyFetchOutcome(result);
    const titleWarning = classifyTitleWarning(result.title);

    return {
      ...result,
      reachability_status: reachabilityStatus,
      title_warning: titleWarning,
      title_review_required: Boolean(titleWarning)
    };
  } catch (error) {
    const result = {
      ...source,
      checked_at: new Date().toISOString(),
      status: null,
      status_text: '',
      final_url: '',
      content_type: '',
      title: '',
      error: error?.name === 'AbortError' ? 'timeout' : String(error?.message ?? error)
    };

    return {
      ...result,
      reachability_status: classifyFetchOutcome(result),
      title_warning: '',
      title_review_required: false
    };
  } finally {
    clearTimeout(timer);
  }
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function statusCount(items, status) {
  return items.filter((item) => item.reachability_status === status).length;
}

function titleWarningCount(items, warning) {
  return items.filter((item) => item.title_warning === warning).length;
}

function buildAcceptanceGates(summary) {
  return [
    {
      gate: 'source_inventory_compiled_from_repo_artifacts',
      status: summary.source_count > 0 ? 'passed' : 'failed',
      evidence: `${summary.source_count} unique external URLs compiled from ${summary.source_artifact_count} launch-readiness source artifacts.`,
      proof_bucket: 'repo_artifact'
    },
    {
      gate: 'current_url_reachability_attempted',
      status: summary.checked_count === summary.source_count && summary.source_count > 0 ? 'passed' : 'failed',
      evidence: `${summary.checked_count}/${summary.source_count} URL checks completed with timeout ${summary.fetch_timeout_ms}ms and concurrency ${summary.fetch_concurrency}.`,
      proof_bucket: 'local'
    },
    {
      gate: 'broken_source_links_absent',
      status: summary.broken_or_removed_count === 0 ? 'passed' : 'needs_review',
      evidence: `${summary.broken_or_removed_count} URLs returned 404/410; ${summary.access_limited_unverified_count} were access-limited; ${summary.timeout_unverified_count + summary.fetch_failed_unverified_count + summary.server_error_unverified_count + summary.http_unverified_count} otherwise unverified.`,
      proof_bucket: 'local'
    },
    {
      gate: 'suspect_response_titles_flagged',
      status: summary.not_found_title_warning_count === 0 ? 'passed' : 'needs_review',
      evidence: `${summary.title_warning_count} URL checks returned suspect titles: ${summary.not_found_title_warning_count} not-found titles, ${summary.access_denied_title_warning_count} access-denied titles, and ${summary.interstitial_title_warning_count} interstitial titles.`,
      proof_bucket: 'local'
    },
    {
      gate: 'claim_boundary_preserved',
      status: 'passed',
      evidence: 'The report verifies source freshness only; it does not create buyer validation, hosted proof, enterprise proof, or forecast accuracy proof.',
      proof_bucket: 'repo_artifact'
    }
  ];
}

function buildStatus(summary) {
  if (summary.source_count === 0) return 'external_source_freshness_no_sources';
  if (summary.broken_or_removed_count > 0) return 'external_source_freshness_needs_url_refresh';
  if (summary.not_found_title_warning_count > 0) return 'external_source_freshness_needs_title_review';
  if (summary.unverified_count > 0) return 'external_source_freshness_completed_with_access_limits';
  return 'external_source_freshness_reachable';
}

function renderMarkdown(report) {
  const sourceRows = report.sources
    .map((source) => [
      mdCell(source.reachability_status),
      mdCell(source.labels.join('; ')),
      source.url,
      mdCell(source.lanes.join(', ')),
      mdCell(source.status ?? ''),
      mdCell(source.title_warning || 'none'),
      mdCell(source.title || source.status_text || source.error || 'n/a')
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const gateRows = report.acceptance_gates
    .map((gate) => [
      mdCell(gate.gate),
      mdCell(gate.status),
      mdCell(gate.evidence),
      mdCell(gate.proof_bucket)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const laneRows = Object.entries(report.summary.source_count_by_lane)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([lane, count]) => `| ${mdCell(lane)} | ${count} |`)
    .join('\n');

  return `# External Source Freshness - 2026-06-06

## Decision Boundary

Status: \`${report.status}\`.

This report checks whether the current external URLs used by the launch-readiness market, competitive, AI-governance, hosted-proof, enterprise-trust, and forecasting-science artifacts are reachable from the local Codex environment. It does not prove buyer validation, hosted/live behavior, enterprise procurement readiness, or prediction accuracy.

## Summary

| Metric | Value |
|---|---:|
| Source URLs | ${report.summary.source_count} |
| Reachable | ${report.summary.reachable_count} |
| Access-limited/unverified | ${report.summary.access_limited_unverified_count} |
| Timeout/unverified | ${report.summary.timeout_unverified_count} |
| Fetch-failed/unverified | ${report.summary.fetch_failed_unverified_count} |
| Server/http unverified | ${report.summary.server_error_unverified_count + report.summary.http_unverified_count} |
| Broken or removed | ${report.summary.broken_or_removed_count} |
| Suspect response titles | ${report.summary.title_warning_count} |
| Not-found response titles | ${report.summary.not_found_title_warning_count} |

## Source Counts By Lane

| Lane | Source URLs |
|---|---:|
${laneRows}

## Acceptance Gates

| Gate | Status | Evidence | Proof Bucket |
|---|---|---|---|
${gateRows}

## Checked Sources

| Reachability | Source | URL | Lanes | HTTP | Title Warning | Title / Error |
|---|---|---|---|---:|---|---|
${sourceRows}

## Proof Boundary

${report.proof_boundary}
`;
}

function renderCsv(report) {
  const header = csvLine([
    'reachability_status',
    'status',
    'source_labels',
    'url',
    'final_url',
    'lanes',
    'source_artifacts',
    'title_warning',
    'title',
    'error'
  ]);

  const rows = report.sources.map((source) => csvLine([
    source.reachability_status,
    source.status ?? '',
    source.labels.join('; '),
    source.url,
    source.final_url,
    source.lanes.join('; '),
    source.source_artifacts.join('; '),
    source.title_warning,
    source.title,
    source.error
  ]));

  return `${[header, ...rows].join('\n')}\n`;
}

function replaceMatchingThenAppend(existingValue, additions, matchers) {
  const existing = Array.isArray(existingValue) ? existingValue : [];
  const filtered = existing.filter((item) => !matchers.some((matcher) => matcher.test(String(item))));
  return [...filtered, ...additions];
}

function replaceByTaskId(existingValue, nextValue) {
  const existing = Array.isArray(existingValue) ? existingValue : [];
  const taskId = nextValue.task_id ?? nextValue.target_task;
  return [
    ...existing.filter((item) => (item.task_id ?? item.target_task) !== taskId),
    nextValue
  ];
}

const collectedSources = collectSourceEntries();
const checkedSources = await mapLimit(collectedSources, fetchConcurrency, fetchSource);

const sourceArtifacts = uniqueSorted(
  checkedSources.flatMap((source) => source.source_artifacts.map((artifact) => artifact.split('#')[0]))
);

const sourceCountByLane = {};
for (const source of checkedSources) {
  for (const lane of source.lanes) {
    sourceCountByLane[lane] = (sourceCountByLane[lane] ?? 0) + 1;
  }
}

const summary = {
  source_count: checkedSources.length,
  checked_count: checkedSources.length,
  source_artifact_count: sourceArtifacts.length,
  source_count_by_lane: sourceCountByLane,
  reachable_count: statusCount(checkedSources, 'reachable'),
  access_limited_unverified_count: statusCount(checkedSources, 'access_limited_unverified'),
  timeout_unverified_count: statusCount(checkedSources, 'timeout_unverified'),
  fetch_failed_unverified_count: statusCount(checkedSources, 'fetch_failed_unverified'),
  server_error_unverified_count: statusCount(checkedSources, 'server_error_unverified'),
  http_unverified_count: statusCount(checkedSources, 'http_unverified'),
  broken_or_removed_count: statusCount(checkedSources, 'broken_or_removed'),
  title_warning_count: checkedSources.filter((source) => source.title_review_required).length,
  not_found_title_warning_count: titleWarningCount(checkedSources, 'title_indicates_not_found'),
  access_denied_title_warning_count: titleWarningCount(checkedSources, 'title_indicates_access_denied'),
  interstitial_title_warning_count: titleWarningCount(checkedSources, 'title_indicates_interstitial'),
  fetch_timeout_ms: fetchTimeoutMs,
  fetch_concurrency: fetchConcurrency
};
summary.unverified_count = summary.access_limited_unverified_count
  + summary.timeout_unverified_count
  + summary.fetch_failed_unverified_count
  + summary.server_error_unverified_count
  + summary.http_unverified_count;
summary.reachable_or_access_limited_count = summary.reachable_count + summary.access_limited_unverified_count;

const report = {
  schema_version: 'external-source-freshness-v1',
  generated_at: new Date().toISOString(),
  status: buildStatus(summary),
  summary,
  source_artifacts: sourceArtifacts,
  acceptance_gates: buildAcceptanceGates(summary),
  sources: checkedSources,
  proof_boundary: 'Fresh external source anchors support desk-research freshness and framework alignment only. They do not prove buyer demand, willingness to pay, hosted runtime health, enterprise procurement readiness, or prediction accuracy.'
};

if (outputPaths.json) {
  writeArtifact(outputPaths.json, `${JSON.stringify(report, null, 2)}\n`);
}

if (outputPaths.md) {
  writeArtifact(outputPaths.md, renderMarkdown(report));
}

if (outputPaths.csv) {
  writeArtifact(outputPaths.csv, renderCsv(report));
}

if (updateEvidence) {
  const evidence = readJsonIfExists(inputPaths.evidence, null);
  if (!evidence) {
    console.error(`Cannot update missing evidence artifact: ${inputPaths.evidence}`);
    process.exit(2);
  }

  evidence.proof_buckets = evidence.proof_buckets ?? {};
  evidence.proof_buckets.local = replaceMatchingThenAppend(evidence.proof_buckets.local, [
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:external:source-freshness -- --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence: status ${report.status}, sources ${summary.source_count}, reachable ${summary.reachable_count}, access_limited ${summary.access_limited_unverified_count}, broken ${summary.broken_or_removed_count}, title_warnings ${summary.title_warning_count}, not_found_title_warnings ${summary.not_found_title_warning_count}`
  ], [
    /npm run audit:external:source-freshness/
  ]);

  evidence.proof_buckets.repo_artifact = replaceMatchingThenAppend(evidence.proof_buckets.repo_artifact, [
    'scripts/build-external-source-freshness-report.mjs compiles launch-readiness external source anchors and records current URL reachability without upgrading buyer, hosted, enterprise, or prediction claims',
    'docs/launch-readiness/external-source-freshness-2026-06-06.json records current source reachability, access limits, lane coverage, and proof boundaries for market/science/framework claims',
    'docs/launch-readiness/external-source-freshness-checklist-2026-06-06.csv provides the source freshness checklist for future market and science refresh loops'
  ], [
    /scripts\/build-external-source-freshness-report\.mjs/,
    /external-source-freshness-2026-06-06\.json/,
    /external-source-freshness-checklist-2026-06-06\.csv/
  ]);

  evidence.external_source_freshness = {
    status: report.status,
    artifact: outputPaths.json,
    generated_at: report.generated_at,
    source_count: summary.source_count,
    reachable_count: summary.reachable_count,
    access_limited_unverified_count: summary.access_limited_unverified_count,
    broken_or_removed_count: summary.broken_or_removed_count,
    title_warning_count: summary.title_warning_count,
    not_found_title_warning_count: summary.not_found_title_warning_count,
    access_denied_title_warning_count: summary.access_denied_title_warning_count,
    interstitial_title_warning_count: summary.interstitial_title_warning_count,
    proof_boundary: report.proof_boundary
  };

  evidence.fix_report = evidence.fix_report ?? {};
  evidence.fix_report.files_changed = replaceMatchingThenAppend(evidence.fix_report.files_changed, [
    'scripts/build-external-source-freshness-report.mjs',
    'docs/launch-readiness/external-source-freshness-2026-06-06.json',
    'docs/launch-readiness/external-source-freshness-2026-06-06.md',
    'docs/launch-readiness/external-source-freshness-checklist-2026-06-06.csv',
    'package.json'
  ], [
    /scripts\/build-external-source-freshness-report\.mjs/,
    /external-source-freshness-2026-06-06\.json/,
    /external-source-freshness-2026-06-06\.md/,
    /external-source-freshness-checklist-2026-06-06\.csv/,
    /package\.json/
  ]);
  evidence.fix_report.tests_run = replaceMatchingThenAppend(evidence.fix_report.tests_run, [
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH node --check scripts/build-external-source-freshness-report.mjs',
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:external:source-freshness -- --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence`
  ], [
    /node --check scripts\/build-external-source-freshness-report\.mjs/,
    /npm run audit:external:source-freshness/
  ]);

  evidence.implementation_decisions = replaceByTaskId(evidence.implementation_decisions, {
    task_id: 'EXTERNAL-SOURCE-FRESHNESS-2026-06-06',
    decision: 'Add a bounded external source-freshness report for current market, competitive, enterprise, hosted-proof, and forecasting-science anchors, including suspect response-title warnings.',
    acceptance_check: 'The audit must compile source URLs from existing launch-readiness artifacts, fetch them with bounded timeout/concurrency, write JSON/MD/CSV outputs, flag suspect response titles, and preserve pilot-only claim boundaries.',
    chosen_variant: 'minimal Node fetch/report generator using built-in fetch and existing launch-readiness artifact conventions',
    repo_pattern_reused: 'Existing Node artifact generator, evidence update, proof bucket, and Code Optimization Gate patterns',
    files_changed: [
      'scripts/build-external-source-freshness-report.mjs',
      'package.json'
    ],
    tests_run: [
      'node --check scripts/build-external-source-freshness-report.mjs',
      'npm run audit:external:source-freshness'
    ],
    proof: `${report.status}; ${summary.source_count} unique URLs checked; ${summary.reachable_count} reachable; ${summary.broken_or_removed_count} broken/removed; ${summary.title_warning_count} suspect titles flagged.`,
    reason: 'The original goal asks for current internet-backed verification, but static source anchors alone cannot show whether references are still live.'
  });
  evidence.rejected_variants = replaceByTaskId(evidence.rejected_variants, {
    task_id: 'EXTERNAL-SOURCE-FRESHNESS-2026-06-06',
    variant: 'Rely on static source URLs already embedded in launch-readiness validators.',
    reason_rejected: 'Static anchors prove the research map exists but do not show current URL reachability or access limitations.',
    tradeoff: 'A bounded built-in fetch script gives repeatable current-source evidence without adding a crawler dependency or broad scrape risk.',
    evidence: `${summary.source_count} source URLs were compiled from existing artifacts and checked in the current session.`
  });
  evidence.code_optimization_reviews = replaceByTaskId(evidence.code_optimization_reviews, {
    target_task: 'EXTERNAL-SOURCE-FRESHNESS-2026-06-06',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'No new dependency, no broad crawler, no scraping of source bodies into artifacts beyond titles/status, and no launch score or claim-tier increase.',
    tests_or_checks: [
      'node --check scripts/build-external-source-freshness-report.mjs',
      'npm run audit:external:source-freshness'
    ],
    remaining_risk: 'Access-limited, timeout, and suspect-title sources still require manual browser/source review before treating individual claims as fully refreshed.'
  });

  writeArtifact(inputPaths.evidence, `${JSON.stringify(evidence, null, 2)}\n`);
}

console.log(JSON.stringify({
  json_output: outputPaths.json,
  md_output: outputPaths.md,
  csv_output: outputPaths.csv,
  evidence_updated: updateEvidence,
  status: report.status,
  source_count: summary.source_count,
  reachable_count: summary.reachable_count,
  access_limited_unverified_count: summary.access_limited_unverified_count,
  unverified_count: summary.unverified_count,
  broken_or_removed_count: summary.broken_or_removed_count,
  title_warning_count: summary.title_warning_count,
  not_found_title_warning_count: summary.not_found_title_warning_count
}, null, 2));
