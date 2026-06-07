#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  buildPredictionBenchmarkSuite,
  renderPredictionBenchmarkMarkdown,
  validatePredictionBenchmarkSuite,
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

function outputPath(name, fallback) {
  return argValue(name, fallback);
}

function usage() {
  console.error([
    'Usage: node scripts/build-prediction-benchmark-suite.mjs',
    `  [--date-suffix ${DEFAULT_DATE_SUFFIX}]`,
    '  [--generated-at <iso timestamp>]',
    '  [--owner <owner label>]',
    '  [--json-output docs/launch-readiness/prediction-benchmark-suite-<date>.json]',
    '  [--md-output docs/launch-readiness/prediction-benchmark-suite-<date>.md]',
    '  [--question-csv-output docs/launch-readiness/prediction-benchmark-questions-<date>.csv]',
    '  [--app-snapshot-csv-output docs/launch-readiness/prediction-benchmark-app-snapshots-<date>.csv]',
    '  [--baseline-snapshot-csv-output docs/launch-readiness/prediction-benchmark-baseline-snapshots-<date>.csv]',
    '  [--scorecard-csv-output docs/launch-readiness/prediction-benchmark-scorecard-<date>.csv]',
    '  [--provider-map-csv-output docs/launch-readiness/prediction-benchmark-provider-map-<date>.csv]',
    '  [--validate-only]',
    '  [--suite docs/launch-readiness/prediction-benchmark-suite-<date>.json]',
  ].join('\n'));
}

if (hasFlag('--help') || hasFlag('-h')) {
  usage();
  process.exit(0);
}

const dateSuffix = argValue('--date-suffix', DEFAULT_DATE_SUFFIX);
const defaults = {
  json: `docs/launch-readiness/prediction-benchmark-suite-${dateSuffix}.json`,
  md: `docs/launch-readiness/prediction-benchmark-suite-${dateSuffix}.md`,
  questionCsv: `docs/launch-readiness/prediction-benchmark-questions-${dateSuffix}.csv`,
  appSnapshotCsv: `docs/launch-readiness/prediction-benchmark-app-snapshots-${dateSuffix}.csv`,
  baselineSnapshotCsv: `docs/launch-readiness/prediction-benchmark-baseline-snapshots-${dateSuffix}.csv`,
  scorecardCsv: `docs/launch-readiness/prediction-benchmark-scorecard-${dateSuffix}.csv`,
  providerMapCsv: `docs/launch-readiness/prediction-benchmark-provider-map-${dateSuffix}.csv`,
};

function resolveRepoPath(relativePath) {
  return path.isAbsolute(relativePath) ? relativePath : path.join(ROOT, relativePath);
}

function writeArtifact(relativePath, contents) {
  const absolutePath = resolveRepoPath(relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, contents);
}

function validateSuiteFile(suitePath) {
  const absolutePath = resolveRepoPath(suitePath);
  if (!existsSync(absolutePath)) {
    console.error(`Missing suite JSON: ${suitePath}`);
    process.exit(2);
  }
  const suite = JSON.parse(readFileSync(absolutePath, 'utf8'));
  const validation = validatePredictionBenchmarkSuite(suite);
  console.log(JSON.stringify({
    suite: suitePath,
    status: validation.status,
    issue_count: validation.issue_count,
    issues: validation.issues,
  }, null, 2));
  process.exit(validation.status === 'passed' ? 0 : 1);
}

if (hasFlag('--validate-only')) {
  validateSuiteFile(argValue('--suite', defaults.json));
}

const generatedAt = argValue('--generated-at', new Date().toISOString());
const owner = argValue('--owner', 'forecast-evaluation-reviewer');
const outputPaths = {
  json: outputPath('--json-output', defaults.json),
  md: outputPath('--md-output', defaults.md),
  questionCsv: outputPath('--question-csv-output', defaults.questionCsv),
  appSnapshotCsv: outputPath('--app-snapshot-csv-output', defaults.appSnapshotCsv),
  baselineSnapshotCsv: outputPath('--baseline-snapshot-csv-output', defaults.baselineSnapshotCsv),
  scorecardCsv: outputPath('--scorecard-csv-output', defaults.scorecardCsv),
  providerMapCsv: outputPath('--provider-map-csv-output', defaults.providerMapCsv),
};

const { suite, csvs } = buildPredictionBenchmarkSuite({
  generatedAt,
  owner,
  dateSuffix,
});
const validation = validatePredictionBenchmarkSuite(suite);

if (validation.status !== 'passed') {
  console.error(JSON.stringify(validation, null, 2));
  process.exit(1);
}

writeArtifact(outputPaths.json, `${JSON.stringify(suite, null, 2)}\n`);
writeArtifact(outputPaths.md, renderPredictionBenchmarkMarkdown(suite));
writeArtifact(outputPaths.questionCsv, csvs.questionRegister);
writeArtifact(outputPaths.appSnapshotCsv, csvs.forecastSnapshots);
writeArtifact(outputPaths.baselineSnapshotCsv, csvs.baselineSnapshots);
writeArtifact(outputPaths.scorecardCsv, csvs.scorecard);
writeArtifact(outputPaths.providerMapCsv, csvs.providerMap);

console.log(JSON.stringify({
  status: suite.status,
  proof_boundary: suite.proof_boundary,
  outputs: outputPaths,
  validation_status: validation.status,
  top_10_question_count: suite.summary.top_10_question_count,
  public_baseline_provider_count: suite.summary.public_baseline_provider_count,
  app_probability_rows_captured: suite.summary.app_probability_rows_captured,
  accuracy_claim_allowed: suite.summary.accuracy_claim_allowed,
  top_three_claim_allowed: suite.summary.top_three_claim_allowed,
}, null, 2));
