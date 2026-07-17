#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const ROOT = process.cwd();
const DEFAULT_CALIBRATION_LEDGER = 'docs/launch-readiness/resolved-forecast-calibration-ledger-2026-06-06.json';
const DEFAULT_BENCHMARK_COMPARISON = 'docs/launch-readiness/forecast-benchmark-comparison-2026-06-06.json';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/accuracy-evidence-intake-kit-2026-06-06.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/accuracy-evidence-intake-kit-2026-06-06.md';
const DEFAULT_FORECAST_CSV_OUTPUT = 'docs/launch-readiness/approved-resolved-forecast-export-template-2026-06-06.csv';
const DEFAULT_BASELINE_CSV_OUTPUT = 'docs/launch-readiness/forecast-baseline-template-2026-06-06.csv';
const DEFAULT_MIN_SAMPLE_SIZE = 25;
const DEFAULT_BINS = 5;

function argValue(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function usage() {
  console.error([
    'Usage: node scripts/build-accuracy-evidence-intake-kit.mjs',
    `  [--calibration-ledger ${DEFAULT_CALIBRATION_LEDGER}]`,
    `  [--benchmark-comparison ${DEFAULT_BENCHMARK_COMPARISON}]`,
    `  [--json-output ${DEFAULT_JSON_OUTPUT}]`,
    `  [--md-output ${DEFAULT_MD_OUTPUT}]`,
    `  [--forecast-csv-output ${DEFAULT_FORECAST_CSV_OUTPUT}]`,
    `  [--baseline-csv-output ${DEFAULT_BASELINE_CSV_OUTPUT}]`,
    `  [--min-sample-size ${DEFAULT_MIN_SAMPLE_SIZE}]`,
    `  [--bins ${DEFAULT_BINS}]`
  ].join('\n'));
}

if (hasFlag('--help') || hasFlag('-h')) {
  usage();
  process.exit(0);
}

const inputPaths = {
  calibrationLedger: argValue('--calibration-ledger', DEFAULT_CALIBRATION_LEDGER),
  benchmarkComparison: argValue('--benchmark-comparison', DEFAULT_BENCHMARK_COMPARISON)
};

const outputPaths = {
  json: argValue('--json-output', DEFAULT_JSON_OUTPUT),
  md: argValue('--md-output', DEFAULT_MD_OUTPUT),
  forecastCsv: argValue('--forecast-csv-output', DEFAULT_FORECAST_CSV_OUTPUT),
  baselineCsv: argValue('--baseline-csv-output', DEFAULT_BASELINE_CSV_OUTPUT)
};

const minSampleSize = Number(argValue('--min-sample-size', DEFAULT_MIN_SAMPLE_SIZE));
const bins = Number(argValue('--bins', DEFAULT_BINS));

if (!Number.isInteger(minSampleSize) || minSampleSize < 1) {
  console.error('--min-sample-size must be a positive integer.');
  process.exit(2);
}

if (!Number.isInteger(bins) || bins < 2) {
  console.error('--bins must be an integer greater than 1.');
  process.exit(2);
}

if (!outputPaths.json && !outputPaths.md && !outputPaths.forecastCsv && !outputPaths.baselineCsv) {
  console.error('At least one output path is required.');
  process.exit(2);
}

function resolveRepoPath(relativePath) {
  return path.isAbsolute(relativePath) ? relativePath : path.join(ROOT, relativePath);
}

function readJsonIfExists(relativePath, fallback) {
  const absolutePath = resolveRepoPath(relativePath);
  if (!existsSync(absolutePath)) return fallback;
  return JSON.parse(readFileSync(absolutePath, 'utf8'));
}

function writeArtifact(relativePath, contents) {
  const absolutePath = resolveRepoPath(relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, contents);
}

function csvLine(columns) {
  return columns.map((value) => {
    const text = String(value ?? '');
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }).join(',');
}

function mdCell(value) {
  return String(value ?? '').replaceAll('|', '/').replace(/\s+/g, ' ').trim();
}

const forecastColumns = [
  'id',
  'title',
  'question',
  'current_probability',
  'prediction_timestamp',
  'is_resolved',
  'resolution_outcome',
  'resolved_at',
  'resolution_source_url',
  'resolution_notes',
  'resolution_criteria',
  'exclusion_review',
  'game_theory_model'
];

const baselineColumns = [
  'baseline_id',
  'label',
  'baseline_type',
  'avg_brier',
  'sample_size',
  'source_url',
  'question_set_scope',
  'timestamp_policy',
  'comparability_notes',
  'notes'
];

const forecastPredictionColumns = [
  'forecast_id',
  'probability',
  'prediction_source',
  'prediction_timestamp',
  'forecaster_type',
  'notes'
];

const perForecastBaselineColumns = [
  'baseline_id',
  'label',
  'forecast_id',
  'probability',
  'outcome',
  'source_url',
  'notes'
];

const calibrationLedger = readJsonIfExists(inputPaths.calibrationLedger, {
  commercial_claim_status: 'missing',
  source: {},
  summary: {}
});

const benchmarkComparison = readJsonIfExists(inputPaths.benchmarkComparison, {
  commercial_benchmark_status: 'missing',
  source: {},
  summary: {}
});

const intakeReport = {
  schema_version: 'accuracy-evidence-intake-kit-v1',
  generated_at: new Date().toISOString(),
  status: 'accuracy_intake_ready_not_accuracy_proof',
  proof_boundary: 'This kit defines owner-approved resolved-forecast and baseline inputs. It is not prediction-accuracy proof, benchmark proof, or world-class forecasting evidence until real resolved data is supplied and scored.',
  source: {
    calibration_ledger: inputPaths.calibrationLedger,
    calibration_claim_status: calibrationLedger.commercial_claim_status ?? 'unknown',
    calibration_mode: calibrationLedger.source?.mode ?? 'unknown',
    benchmark_comparison: inputPaths.benchmarkComparison,
    benchmark_status: benchmarkComparison.commercial_benchmark_status ?? 'unknown',
    benchmark_ledger_mode: benchmarkComparison.source?.ledger_mode ?? 'unknown'
  },
  required_owner_inputs: [
    {
      artifact: outputPaths.forecastCsv,
      purpose: 'Owner-approved resolved forecast export for audit:calibration:ledger.',
      minimum_rows: minSampleSize,
      required_columns: forecastColumns,
      notes: [
        'Use only binary resolved forecasts with yes/no, true/false, 1/0, occurred/not_occurred, or equivalent outcomes.',
        'Attach prediction_timestamp before resolved_at for every row; current_probability without a pre-resolution timestamp is not sufficient for an accuracy claim.',
        'Attach resolution_criteria and exclusion_review so leakage, ambiguity, and post-hoc selection can be audited.',
        'Exclude unresolved, ambiguous, canceled, non-binary, or probability-missing questions.',
        'Provide resolution source URL or notes for each included row.',
        'Do not include confidential buyer, user, or credential data.'
      ]
    },
    {
      artifact: 'forecast_predictions sidecar or embedded forecast_predictions array',
      purpose: 'Optional community/user prediction rows for community_prediction_mean scoring.',
      required_columns: forecastPredictionColumns,
      notes: [
        'Use only probabilities made before resolution.',
        'Keep forecaster identity redacted unless explicit permission exists.'
      ]
    },
    {
      artifact: outputPaths.baselineCsv,
      purpose: 'Real human/community/pro/external baseline for audit:forecast:benchmark.',
      minimum_rows: 1,
      required_columns: baselineColumns,
      notes: [
        'Aggregate baselines must be comparable to the evaluated question set.',
        'Per-forecast baselines can be supplied separately with forecast_id, probability, and optional outcome.',
        'Source URLs, sample sizes, question-set scope, timestamp policy, and comparability notes must be attached to every baseline claim.'
      ]
    }
  ],
  acceptance_gates: [
    {
      gate: 'input_validation',
      required: true,
      pass_condition: 'audit:accuracy:validate-inputs passes against the owner-approved forecast export and real comparable baseline before scoring commands run.'
    },
    {
      gate: 'approved_export',
      required: true,
      pass_condition: 'audit:calibration:ledger is run with --source-mode approved_export against owner-approved resolved forecasts.'
    },
    {
      gate: 'minimum_sample_size',
      required: true,
      pass_condition: `At least one scored source has sample_size >= ${minSampleSize}.`
    },
    {
      gate: 'reliability_bins',
      required: true,
      pass_condition: `Reliability bins are generated with --bins ${bins} and non-empty bins are reported with observed_frequency and calibration_error.`
    },
    {
      gate: 'comparable_baseline',
      required: true,
      pass_condition: 'audit:forecast:benchmark compares the approved ledger against a real human/community/pro/external baseline on same or explicitly comparable questions.'
    },
    {
      gate: 'claim_language',
      required: true,
      pass_condition: 'Market copy remains calibration-aware decision support unless approved export, sample size, reliability, and comparable baseline gates all pass.'
    }
  ],
  commands_after_owner_export: [
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:accuracy:validate-inputs -- --forecast-csv <owner-approved-resolved-forecast-export.csv> --baseline-csv <real-human-community-pro-baseline.csv> --json-output docs/launch-readiness/accuracy-evidence-input-validation-approved-<date>.json --md-output docs/launch-readiness/accuracy-evidence-input-validation-approved-<date>.md --csv-output docs/launch-readiness/accuracy-evidence-input-validation-checklist-approved-<date>.csv --min-sample-size ${minSampleSize}`,
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:calibration:ledger -- --input <owner-approved-resolved-forecast-export.json-or-csv> --source-mode approved_export --output docs/launch-readiness/resolved-forecast-calibration-ledger-approved-<date>.json --min-sample-size ${minSampleSize} --bins ${bins}`,
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:forecast:benchmark -- --ledger docs/launch-readiness/resolved-forecast-calibration-ledger-approved-<date>.json --baseline <real-human-community-pro-baseline.json-or-csv> --output docs/launch-readiness/forecast-benchmark-comparison-approved-<date>.json',
    'Re-run audit:commercial:confidence only after the approved ledger and real baseline artifacts are attached.'
  ],
  current_blockers: [
    `Current calibration ledger status is ${calibrationLedger.commercial_claim_status ?? 'unknown'} with mode ${calibrationLedger.source?.mode ?? 'unknown'}.`,
    `Current benchmark status is ${benchmarkComparison.commercial_benchmark_status ?? 'unknown'} with ledger mode ${benchmarkComparison.source?.ledger_mode ?? 'unknown'}.`,
    'No owner-approved resolved export or real comparable baseline is attached in this evidence set.'
  ],
  external_methodology_alignment: [
    {
      framework: 'Metaculus FutureEval',
      source_url: 'https://www.metaculus.com/futureeval/methodology/',
      requirement: 'Evaluate AI forecasting on unresolved-when-forecast questions and compare against human/community baselines on shared resolved questions.'
    },
    {
      framework: 'ForecastBench',
      source_url: 'https://www.forecastbench.org/about/',
      requirement: 'Use a dynamic contamination-resistant forecasting benchmark with human comparison groups where possible.'
    },
    {
      framework: 'NIST AI RMF Measure',
      source_url: 'https://www.nist.gov/itl/ai-risk-management-framework',
      requirement: 'Measure and monitor performance in deployment-relevant conditions before relying on system claims.'
    }
  ]
};

function renderForecastCsv() {
  return `${csvLine(forecastColumns)}\n`;
}

function renderBaselineCsv() {
  return `${csvLine(baselineColumns)}\n`;
}

function renderMarkdown(report) {
  const inputRows = report.required_owner_inputs
    .map((input) => [
      mdCell(input.artifact),
      mdCell(input.purpose),
      mdCell(input.required_columns.join(', ')),
      mdCell(input.notes.join(' '))
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const gateRows = report.acceptance_gates
    .map((gate) => [
      mdCell(gate.gate),
      gate.required ? 'yes' : 'no',
      mdCell(gate.pass_condition)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const frameworkRows = report.external_methodology_alignment
    .map((item) => [
      mdCell(item.framework),
      item.source_url,
      mdCell(item.requirement)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  return `# Accuracy Evidence Intake Kit - 2026-06-06

## Proof Boundary

Status: \`${report.status}\`.

${report.proof_boundary}

## Current State

- Calibration ledger: \`${report.source.calibration_claim_status}\` from mode \`${report.source.calibration_mode}\`.
- Benchmark comparison: \`${report.source.benchmark_status}\` from ledger mode \`${report.source.benchmark_ledger_mode}\`.
- Commercial confidence must not increase until owner-approved resolved forecasts and real comparable baselines are scored.

## Required Owner Inputs

| Artifact | Purpose | Required Columns | Notes |
|---|---|---|---|
${inputRows}

## Acceptance Gates

| Gate | Required | Pass Condition |
|---|---|---|
${gateRows}

## Commands After Owner Export

${report.commands_after_owner_export.map((command) => `- \`${command}\``).join('\n')}

## Methodology Alignment

| Framework | Source | Requirement |
|---|---|---|
${frameworkRows}

## Current Blockers

${report.current_blockers.map((blocker) => `- ${blocker}`).join('\n')}
`;
}

if (outputPaths.json) {
  writeArtifact(outputPaths.json, `${JSON.stringify(intakeReport, null, 2)}\n`);
}

if (outputPaths.md) {
  writeArtifact(outputPaths.md, renderMarkdown(intakeReport));
}

if (outputPaths.forecastCsv) {
  writeArtifact(outputPaths.forecastCsv, renderForecastCsv());
}

if (outputPaths.baselineCsv) {
  writeArtifact(outputPaths.baselineCsv, renderBaselineCsv());
}

console.log(JSON.stringify({
  json_output: outputPaths.json,
  md_output: outputPaths.md,
  forecast_csv_output: outputPaths.forecastCsv,
  baseline_csv_output: outputPaths.baselineCsv,
  status: intakeReport.status,
  calibration_claim_status: intakeReport.source.calibration_claim_status,
  benchmark_status: intakeReport.source.benchmark_status
}, null, 2));
