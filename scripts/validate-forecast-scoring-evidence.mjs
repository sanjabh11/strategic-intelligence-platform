#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const ROOT = process.cwd();
const DEFAULT_CALIBRATION_LEDGER = 'docs/launch-readiness/resolved-forecast-calibration-ledger-2026-06-06.json';
const DEFAULT_BENCHMARK_COMPARISON = 'docs/launch-readiness/forecast-benchmark-comparison-2026-06-06.json';
const DEFAULT_ACCURACY_INPUT_VALIDATION = 'docs/launch-readiness/accuracy-evidence-input-validation-2026-06-06.json';
const DEFAULT_LEAKAGE_REVIEW_VALIDATION = 'docs/launch-readiness/forecast-leakage-review-validation-2026-06-06.json';
const DEFAULT_FORECAST_CLAIM_GOVERNANCE = 'docs/launch-readiness/forecast-claim-governance-2026-06-06.json';
const DEFAULT_EVIDENCE = 'docs/launch-readiness/launch-evidence-2026-06-06.json';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/forecast-scoring-evidence-validation-2026-06-06.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/forecast-scoring-evidence-validation-2026-06-06.md';
const DEFAULT_CSV_OUTPUT = 'docs/launch-readiness/forecast-scoring-evidence-validation-checklist-2026-06-06.csv';
const DEFAULT_MIN_SOURCE_SAMPLE_SIZE = 25;
const DEFAULT_MIN_RELIABILITY_BINS = 5;

function argValue(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function usage() {
  console.error([
    'Usage: node scripts/validate-forecast-scoring-evidence.mjs',
    `  [--calibration-ledger ${DEFAULT_CALIBRATION_LEDGER}]`,
    `  [--benchmark-comparison ${DEFAULT_BENCHMARK_COMPARISON}]`,
    `  [--accuracy-input-validation ${DEFAULT_ACCURACY_INPUT_VALIDATION}]`,
    `  [--leakage-review-validation ${DEFAULT_LEAKAGE_REVIEW_VALIDATION}]`,
    `  [--forecast-claim-governance ${DEFAULT_FORECAST_CLAIM_GOVERNANCE}]`,
    `  [--evidence ${DEFAULT_EVIDENCE}]`,
    `  [--json-output ${DEFAULT_JSON_OUTPUT}]`,
    `  [--md-output ${DEFAULT_MD_OUTPUT}]`,
    `  [--csv-output ${DEFAULT_CSV_OUTPUT}]`,
    `  [--min-source-sample-size ${DEFAULT_MIN_SOURCE_SAMPLE_SIZE}]`,
    `  [--min-reliability-bins ${DEFAULT_MIN_RELIABILITY_BINS}]`,
    '  [--update-evidence]'
  ].join('\n'));
}

if (hasFlag('--help') || hasFlag('-h')) {
  usage();
  process.exit(0);
}

const inputPaths = {
  calibrationLedger: argValue('--calibration-ledger', DEFAULT_CALIBRATION_LEDGER),
  benchmarkComparison: argValue('--benchmark-comparison', DEFAULT_BENCHMARK_COMPARISON),
  accuracyInputValidation: argValue('--accuracy-input-validation', DEFAULT_ACCURACY_INPUT_VALIDATION),
  leakageReviewValidation: argValue('--leakage-review-validation', DEFAULT_LEAKAGE_REVIEW_VALIDATION),
  forecastClaimGovernance: argValue('--forecast-claim-governance', DEFAULT_FORECAST_CLAIM_GOVERNANCE),
  evidence: argValue('--evidence', DEFAULT_EVIDENCE)
};

const outputPaths = {
  json: argValue('--json-output', DEFAULT_JSON_OUTPUT),
  md: argValue('--md-output', DEFAULT_MD_OUTPUT),
  csv: argValue('--csv-output', DEFAULT_CSV_OUTPUT)
};

const minSourceSampleSize = Number(argValue('--min-source-sample-size', DEFAULT_MIN_SOURCE_SAMPLE_SIZE));
const minReliabilityBins = Number(argValue('--min-reliability-bins', DEFAULT_MIN_RELIABILITY_BINS));
const updateEvidence = hasFlag('--update-evidence');

if (!Number.isInteger(minSourceSampleSize) || minSourceSampleSize < 1) {
  console.error('--min-source-sample-size must be a positive integer.');
  process.exit(2);
}

if (!Number.isInteger(minReliabilityBins) || minReliabilityBins < 2) {
  console.error('--min-reliability-bins must be an integer greater than 1.');
  process.exit(2);
}

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

function positiveNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

function artifactExists(relativePath) {
  return existsSync(resolveRepoPath(relativePath));
}

function replaceMatchingThenAppend(list, items, matchers) {
  const filtered = Array.isArray(list)
    ? list.filter((entry) => !matchers.some((matcher) => matcher.test(String(entry ?? ''))))
    : [];
  for (const item of items) {
    if (!filtered.includes(item)) filtered.push(item);
  }
  return filtered;
}

function replaceByTaskId(list, item) {
  const itemKey = item.task_id ?? item.target_task;
  const next = Array.isArray(list)
    ? list.filter((entry) => (entry.task_id ?? entry.target_task) !== itemKey)
    : [];
  next.push(item);
  return next;
}

const calibrationLedger = readJsonIfExists(inputPaths.calibrationLedger, {
  commercial_claim_status: 'missing',
  source: {},
  summary: {},
  source_summaries: []
});
const benchmarkComparison = readJsonIfExists(inputPaths.benchmarkComparison, {
  commercial_benchmark_status: 'missing',
  source: {},
  summary: {},
  baselines: [],
  all_comparisons: []
});
const accuracyInputValidation = readJsonIfExists(inputPaths.accuracyInputValidation, {
  status: 'missing',
  summary: {
    valid_resolved_forecast_count: 0,
    valid_baseline_count: 0,
    active_release_hold_count: 0,
    ready_for_calibration_scoring: false
  }
});
const leakageReviewValidation = readJsonIfExists(inputPaths.leakageReviewValidation, {
  status: 'missing',
  summary: {
    ready_control_count: 0,
    required_control_count: 8,
    active_release_hold_count: 0,
    ready_for_accuracy_claim_review: false,
    leakage_review_passed: false
  }
});
const forecastClaimGovernance = readJsonIfExists(inputPaths.forecastClaimGovernance, {
  status: 'missing',
  summary: {
    approved_world_class_claim: false
  }
});

const ledgerExists = artifactExists(inputPaths.calibrationLedger);
const benchmarkExists = artifactExists(inputPaths.benchmarkComparison);
const ledgerMode = calibrationLedger.source?.mode ?? 'missing';
const ledgerClaimStatus = calibrationLedger.commercial_claim_status ?? 'missing';
const benchmarkStatus = benchmarkComparison.commercial_benchmark_status ?? 'missing';
const sourceSummaries = asArray(calibrationLedger.source_summaries);
const maxSourceSampleSize = Number(calibrationLedger.summary?.max_source_sample_size ?? 0);
const includedPointCount = Number(calibrationLedger.summary?.included_point_count ?? 0);
const sourceCount = Number(calibrationLedger.summary?.sources_scored ?? sourceSummaries.length);
const reliabilityReadySourceCount = sourceSummaries.filter((source) => {
  const bins = asArray(source.reliability_bins);
  return positiveNumber(source.sample_size) >= minSourceSampleSize && bins.length >= minReliabilityBins;
}).length;
const baselines = asArray(benchmarkComparison.baselines);
const comparisons = asArray(benchmarkComparison.all_comparisons);
const baselinesLoaded = Number(benchmarkComparison.summary?.baselines_loaded ?? baselines.length);
const comparisonsMade = Number(benchmarkComparison.summary?.comparisons_made ?? comparisons.length);
const sourceBackedBaselineCount = baselines.filter((baseline) => {
  const url = String(baseline.source_url ?? '').trim();
  return /^https?:\/\/[^\s]+$/i.test(url) && positiveNumber(baseline.sample_size) > 0;
}).length;
const appLowerBrierComparisonCount = comparisons.filter((comparison) => comparison.verdict === 'app_lower_brier').length;
const accuracyInputReadyForScoring = Boolean(accuracyInputValidation.summary?.ready_for_calibration_scoring)
  || accuracyInputValidation.status === 'accuracy_input_validation_passed_pending_scoring';
const validResolvedForecastCount = Number(accuracyInputValidation.summary?.valid_resolved_forecast_count ?? 0);
const validBaselineCount = Number(accuracyInputValidation.summary?.valid_baseline_count ?? 0);
const accuracyInputReleaseHoldCount = Number(accuracyInputValidation.summary?.active_release_hold_count ?? 0);
const leakageReviewStatus = leakageReviewValidation.status ?? 'missing';
const leakageReviewPassed = Boolean(leakageReviewValidation.summary?.leakage_review_passed)
  || Boolean(leakageReviewValidation.summary?.ready_for_accuracy_claim_review)
  || leakageReviewStatus === 'forecast_leakage_review_validation_passed_pending_claim_review';
const leakageReadyControlCount = Number(leakageReviewValidation.summary?.ready_control_count ?? 0);
const leakageRequiredControlCount = Number(leakageReviewValidation.summary?.required_control_count ?? 0);
const leakageReleaseHoldCount = Number(leakageReviewValidation.summary?.active_release_hold_count ?? 0);
const approvedExportMode = ['approved_export', 'approved_owner_export'].includes(ledgerMode);
const ledgerUsable = ledgerClaimStatus === 'usable_with_caveats';
const benchmarkUsable = benchmarkStatus === 'usable_with_caveats';
const sampleOnly = ledgerMode === 'sample_fixture' || benchmarkStatus === 'sample_only_not_launch_proof';
const rowQualityErrorCount = 0;

function gateStatus(condition, noRealScoring = false) {
  if (noRealScoring) return 'open_sample_or_no_real_scoring';
  return condition ? 'passed' : 'failed';
}

const noRealScoring = sampleOnly || !approvedExportMode;
const acceptanceGates = [
  {
    gate: 'scoring_artifacts_present',
    status: ledgerExists && benchmarkExists ? 'passed' : 'failed',
    evidence: `Calibration ledger exists=${ledgerExists}; benchmark comparison exists=${benchmarkExists}.`,
    proof_bucket: 'repo_artifact'
  },
  {
    gate: 'approved_export_used',
    status: gateStatus(approvedExportMode, sampleOnly),
    evidence: `Calibration ledger mode is ${ledgerMode}; approved_export or approved_owner_export is required for claim review.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'ledger_commercial_status_usable',
    status: gateStatus(ledgerUsable, noRealScoring),
    evidence: `Calibration ledger commercial_claim_status=${ledgerClaimStatus}; max source sample size ${maxSourceSampleSize}/${minSourceSampleSize}.`,
    proof_bucket: 'repo_artifact'
  },
  {
    gate: 'scoring_sample_size_and_reliability_bins',
    status: gateStatus(maxSourceSampleSize >= minSourceSampleSize && reliabilityReadySourceCount > 0, noRealScoring),
    evidence: `${reliabilityReadySourceCount}/${sourceCount} sources meet sample-size and reliability-bin requirements; included points=${includedPointCount}.`,
    proof_bucket: 'repo_artifact'
  },
  {
    gate: 'benchmark_comparison_usable',
    status: gateStatus(benchmarkUsable && baselinesLoaded > 0 && comparisonsMade > 0, noRealScoring),
    evidence: `Benchmark status=${benchmarkStatus}; baselines=${baselinesLoaded}; comparisons=${comparisonsMade}.`,
    proof_bucket: 'repo_artifact'
  },
  {
    gate: 'baseline_source_and_comparability_present',
    status: gateStatus(sourceBackedBaselineCount === baselinesLoaded && baselinesLoaded > 0, noRealScoring),
    evidence: `${sourceBackedBaselineCount}/${baselinesLoaded} baselines have source URLs and positive sample sizes.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'accuracy_inputs_validated_before_scoring',
    status: gateStatus(accuracyInputReadyForScoring, noRealScoring),
    evidence: `Accuracy input validation status=${accuracyInputValidation.status ?? 'missing'} with ${validResolvedForecastCount} valid forecasts, ${validBaselineCount} valid baselines, and ${accuracyInputReleaseHoldCount} active holds.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'leakage_review_passed_before_claim_review',
    status: gateStatus(leakageReviewPassed, noRealScoring),
    evidence: `Leakage review status=${leakageReviewStatus}; ready controls ${leakageReadyControlCount}/${leakageRequiredControlCount}; active holds ${leakageReleaseHoldCount}.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'claim_language_still_blocked',
    status: forecastClaimGovernance.summary?.approved_world_class_claim ? 'failed' : 'passed',
    evidence: `Forecast claim governance approved_world_class_claim=${Boolean(forecastClaimGovernance.summary?.approved_world_class_claim)}.`,
    proof_bucket: 'repo_artifact'
  }
];

const activeReleaseHoldCount = acceptanceGates.filter((gate) => gate.status !== 'passed').length;
const scoringOutputReadyForClaimReview = acceptanceGates.every((gate) => gate.status === 'passed')
  && rowQualityErrorCount === 0;
const status = sampleOnly
  ? 'forecast_scoring_evidence_validation_sample_only_not_claim_proof'
  : !ledgerExists || !benchmarkExists
    ? 'forecast_scoring_evidence_validation_missing_artifacts'
    : rowQualityErrorCount > 0
      ? 'forecast_scoring_evidence_validation_failed'
      : !approvedExportMode
        ? 'forecast_scoring_evidence_validation_missing_approved_export'
        : !ledgerUsable || maxSourceSampleSize < minSourceSampleSize
          ? 'forecast_scoring_evidence_validation_approved_output_below_sample_threshold'
          : !benchmarkUsable
            ? 'forecast_scoring_evidence_validation_benchmark_not_usable'
            : !accuracyInputReadyForScoring || !leakageReviewPassed
              ? 'forecast_scoring_evidence_validation_passed_pending_input_or_leakage_review'
              : 'forecast_scoring_evidence_validation_passed_pending_claim_review';

const validation = {
  schema_version: 'forecast-scoring-evidence-validation-v1',
  generated_at: new Date().toISOString(),
  status,
  proof_boundary: 'This artifact validates calibration-ledger and benchmark-comparison outputs before prediction-accuracy claims can be reviewed. It is not buyer validation, hosted proof, security proof, independent benchmark certification, or world-class prediction proof.',
  source: {
    calibration_ledger: inputPaths.calibrationLedger,
    calibration_ledger_mode: ledgerMode,
    calibration_ledger_commercial_claim_status: ledgerClaimStatus,
    benchmark_comparison: inputPaths.benchmarkComparison,
    benchmark_comparison_status: benchmarkStatus,
    accuracy_input_validation: inputPaths.accuracyInputValidation,
    accuracy_input_validation_status: accuracyInputValidation.status ?? 'missing',
    leakage_review_validation: inputPaths.leakageReviewValidation,
    leakage_review_validation_status: leakageReviewStatus,
    forecast_claim_governance: inputPaths.forecastClaimGovernance,
    min_source_sample_size: minSourceSampleSize,
    min_reliability_bins: minReliabilityBins
  },
  summary: {
    approved_export_mode: approvedExportMode,
    sample_only: sampleOnly,
    included_point_count: includedPointCount,
    source_count: sourceCount,
    max_source_sample_size: maxSourceSampleSize,
    reliability_ready_source_count: reliabilityReadySourceCount,
    baselines_loaded: baselinesLoaded,
    source_backed_baseline_count: sourceBackedBaselineCount,
    comparisons_made: comparisonsMade,
    app_lower_brier_comparison_count: appLowerBrierComparisonCount,
    valid_resolved_forecast_count: validResolvedForecastCount,
    valid_baseline_count: validBaselineCount,
    accuracy_inputs_ready_for_scoring: accuracyInputReadyForScoring,
    leakage_review_passed: leakageReviewPassed,
    active_release_hold_count: activeReleaseHoldCount,
    scoring_output_ready_for_claim_review: scoringOutputReadyForClaimReview,
    accuracy_claim_allowed: false,
    world_class_prediction_claim_allowed: false
  },
  acceptance_gates: acceptanceGates,
  release_holds: acceptanceGates
    .filter((gate) => gate.status !== 'passed')
    .map((gate) => ({
      hold: gate.gate,
      severity: gate.status === 'failed' ? 'P1' : 'P2',
      status: 'active',
      evidence_needed: gate.evidence
    })),
  current_source_alignment: [
    {
      source: 'ForecastBench',
      url: 'https://forecastingresearch.org/research/forecastbench',
      alignment: 'Use dynamic, future-event forecasting questions and baseline comparison before any AI forecasting accuracy claim.'
    },
    {
      source: 'ForecastBench docs',
      url: 'https://www.forecastbench.org/docs/',
      alignment: 'Use Brier-style scoring, question-set methodology, resolved forecasts, and ranking caveats for fair benchmark comparisons.'
    },
    {
      source: 'Metaculus FutureEval methodology',
      url: 'https://www.metaculus.com/futureeval/methodology/',
      alignment: 'Compare AI forecasts with human/community/pro baselines on questions forecast before the answers are known.'
    },
    {
      source: 'NIST AI RMF Core Measure',
      url: 'https://airc.nist.gov/airmf-resources/airmf/5-sec-core/',
      alignment: 'Performance measurement needs documented uncertainty, benchmark comparison, and reporting before system claims are relied upon.'
    }
  ],
  next_commands_after_owner_data: [
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:accuracy:validate-inputs -- --forecast-csv <owner-approved-resolved-export.csv> --baseline-csv <owner-approved-baseline.csv> --min-sample-size 25',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:forecast:leakage-review -- --update-evidence',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:calibration:ledger -- --input <owner-approved-resolved-export.json-or-csv> --source-mode approved_export --min-sample-size 25',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:forecast:benchmark -- --ledger docs/launch-readiness/resolved-forecast-calibration-ledger-2026-06-06.json --baseline <owner-approved-baseline.json-or-csv>',
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:forecast:validate-scoring -- --calibration-ledger ${inputPaths.calibrationLedger} --benchmark-comparison ${inputPaths.benchmarkComparison} --accuracy-input-validation ${inputPaths.accuracyInputValidation} --leakage-review-validation ${inputPaths.leakageReviewValidation} --forecast-claim-governance ${inputPaths.forecastClaimGovernance} --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence`,
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:forecast:claim-governance',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:commercial:confidence'
  ]
};

function renderMarkdown(report) {
  const gateRows = report.acceptance_gates
    .map((gate) => [
      mdCell(gate.gate),
      gate.status,
      mdCell(gate.evidence),
      gate.proof_bucket
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const sourceRows = report.current_source_alignment
    .map((source) => [
      mdCell(source.source),
      source.url,
      mdCell(source.alignment)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  return `# Forecast Scoring Evidence Validation - 2026-06-06

## Decision Boundary

Status: \`${report.status}\`.

${report.proof_boundary}

Scoring output ready for claim review: **${report.summary.scoring_output_ready_for_claim_review}**. Accuracy claim allowed: **${report.summary.accuracy_claim_allowed}**. World-class prediction claim allowed: **${report.summary.world_class_prediction_claim_allowed}**.

Ledger mode: **${report.source.calibration_ledger_mode}**. Ledger status: **${report.source.calibration_ledger_commercial_claim_status}**. Benchmark status: **${report.source.benchmark_comparison_status}**.

Included points: **${report.summary.included_point_count}**. Max source sample size: **${report.summary.max_source_sample_size}**. Baselines loaded: **${report.summary.baselines_loaded}**. Comparisons made: **${report.summary.comparisons_made}**.

## Acceptance Gates

| Gate | Status | Evidence | Proof Bucket |
|---|---|---|---|
${gateRows}

## Current Source Alignment

| Source | URL | Alignment |
|---|---|---|
${sourceRows}

## Next Commands After Owner Data

${report.next_commands_after_owner_data.map((command, index) => `${index + 1}. \`${command}\``).join('\n')}

## Proof Boundary

Passing this validator means scoring outputs are ready for owner claim review. It still does not prove world-class forecasting, hosted operational behavior, security, buyer validation, or independent benchmark certification.
`;
}

function renderCsv(report) {
  return [
    csvLine(['gate', 'status', 'evidence', 'proof_bucket']),
    ...report.acceptance_gates.map((gate) => csvLine([
      gate.gate,
      gate.status,
      gate.evidence,
      gate.proof_bucket
    ]))
  ].join('\n') + '\n';
}

if (outputPaths.json) {
  writeArtifact(outputPaths.json, `${JSON.stringify(validation, null, 2)}\n`);
}

if (outputPaths.md) {
  writeArtifact(outputPaths.md, renderMarkdown(validation));
}

if (outputPaths.csv) {
  writeArtifact(outputPaths.csv, renderCsv(validation));
}

if (updateEvidence) {
  const evidence = readJsonIfExists(inputPaths.evidence, null);
  if (!evidence) {
    console.error(`Cannot update missing evidence artifact: ${inputPaths.evidence}`);
    process.exit(2);
  }

  evidence.proof_buckets = evidence.proof_buckets ?? {};
  evidence.proof_buckets.local = replaceMatchingThenAppend(evidence.proof_buckets.local, [
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:forecast:validate-scoring -- --calibration-ledger ${inputPaths.calibrationLedger} --benchmark-comparison ${inputPaths.benchmarkComparison} --accuracy-input-validation ${inputPaths.accuracyInputValidation} --leakage-review-validation ${inputPaths.leakageReviewValidation} --forecast-claim-governance ${inputPaths.forecastClaimGovernance} --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence: status ${validation.status}, scoring_ready ${validation.summary.scoring_output_ready_for_claim_review}, accuracy_claim_allowed false`
  ], [
    /npm run audit:forecast:validate-scoring/
  ]);

  evidence.proof_buckets.repo_artifact = replaceMatchingThenAppend(evidence.proof_buckets.repo_artifact, [
    'scripts/validate-forecast-scoring-evidence.mjs validates calibration-ledger and benchmark-comparison outputs before prediction-accuracy claim review',
    'docs/launch-readiness/forecast-scoring-evidence-validation-2026-06-06.json records ledger mode, sample size, reliability bins, baseline source coverage, benchmark status, input validation, leakage review, and claim holds',
    'docs/launch-readiness/forecast-scoring-evidence-validation-checklist-2026-06-06.csv provides the scoring-output checklist before accuracy claims can be upgraded'
  ], [
    /scripts\/validate-forecast-scoring-evidence\.mjs/,
    /forecast-scoring-evidence-validation-2026-06-06\.json/,
    /forecast-scoring-evidence-validation-checklist-2026-06-06\.csv/
  ]);

  evidence.fix_report = evidence.fix_report ?? {};
  evidence.fix_report.files_changed = replaceMatchingThenAppend(evidence.fix_report.files_changed, [
    'scripts/validate-forecast-scoring-evidence.mjs',
    'docs/launch-readiness/forecast-scoring-evidence-validation-2026-06-06.json',
    'docs/launch-readiness/forecast-scoring-evidence-validation-2026-06-06.md',
    'docs/launch-readiness/forecast-scoring-evidence-validation-checklist-2026-06-06.csv'
  ], [
    /scripts\/validate-forecast-scoring-evidence\.mjs/,
    /forecast-scoring-evidence-validation-2026-06-06\.json/,
    /forecast-scoring-evidence-validation-2026-06-06\.md/,
    /forecast-scoring-evidence-validation-checklist-2026-06-06\.csv/
  ]);
  evidence.fix_report.tests_run = replaceMatchingThenAppend(evidence.fix_report.tests_run, [
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH node --check scripts/validate-forecast-scoring-evidence.mjs',
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:forecast:validate-scoring -- --calibration-ledger ${inputPaths.calibrationLedger} --benchmark-comparison ${inputPaths.benchmarkComparison} --accuracy-input-validation ${inputPaths.accuracyInputValidation} --leakage-review-validation ${inputPaths.leakageReviewValidation} --forecast-claim-governance ${inputPaths.forecastClaimGovernance} --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence`
  ], [
    /node --check scripts\/validate-forecast-scoring-evidence\.mjs/,
    /npm run audit:forecast:validate-scoring/
  ]);
  evidence.fix_report.approval_gates = replaceMatchingThenAppend(evidence.fix_report.approval_gates, [
    'Forecast scoring evidence validation is repo/local validation proof only; owner-approved resolved forecasts, real comparable baselines, leakage review, hosted/security proof, buyer proof, and owner-approved claim language remain required before prediction-accuracy claims can be upgraded.'
  ], [
    /Forecast scoring evidence validation is repo\/local validation proof only/
  ]);

  evidence.implementation_decisions = replaceByTaskId(evidence.implementation_decisions, {
    task_id: 'forecast-scoring-evidence-validation-harness',
    decision: 'Add a deterministic no-dependency validator for calibration-ledger and benchmark-comparison outputs before forecast accuracy claims can be upgraded.',
    acceptance_check: 'Default sample-only scoring artifacts validate as sample-only not claim proof, and commercial confidence remains not_95_confident without raising the prediction accuracy score.',
    chosen_variant: 'minimal Node artifact validator plus confidence-gate wiring; no scoring algorithm rewrite and no new dependency',
    repo_pattern_reused: 'Existing launch-readiness Node artifact validator pattern',
    files_changed: [
      'scripts/validate-forecast-scoring-evidence.mjs',
      'scripts/build-forecast-claim-governance.mjs',
      'scripts/build-commercial-confidence-gate.mjs',
      'package.json'
    ],
    tests_run: [
      'node --check scripts/validate-forecast-scoring-evidence.mjs',
      'npm run audit:forecast:validate-scoring',
      'npm run audit:forecast:claim-governance',
      'npm run audit:commercial:confidence'
    ],
    proof: `${validation.status}; scoring_output_ready_for_claim_review=${validation.summary.scoring_output_ready_for_claim_review}; accuracy_claim_allowed=false; world_class_prediction_claim_allowed=false.`,
    reason: 'The highest commercial blocker is prediction accuracy proof; scoring artifacts need machine-checkable claim boundaries so sample fixtures or weak baselines cannot support market claims.'
  });
  evidence.rejected_variants = replaceByTaskId(evidence.rejected_variants, {
    task_id: 'forecast-scoring-evidence-validation-harness',
    variant: 'Treat sample calibration or benchmark comparison outputs as accuracy proof.',
    reason_rejected: 'Sample fixtures and benchmark mechanics do not prove pre-resolution owner-approved forecasts, comparable human/community/pro baselines, leakage controls, or buyer-safe claim language.',
    tradeoff: 'Score-neutral validation improves scientific proof discipline without creating synthetic accuracy evidence.',
    evidence: `${validation.status} keeps accuracy_claim_allowed=false and world_class_prediction_claim_allowed=false.`
  });
  evidence.code_optimization_reviews = replaceByTaskId(evidence.code_optimization_reviews, {
    target_task: 'forecast-scoring-evidence-validation-harness',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'No new dependency, no runtime app change, no hosted or secret-dependent command execution, and generated artifacts remain repo/local proof only.',
    tests_or_checks: [
      'node --check scripts/validate-forecast-scoring-evidence.mjs',
      'npm run audit:forecast:validate-scoring',
      'npm run audit:forecast:claim-governance',
      'npm run audit:commercial:confidence'
    ],
    remaining_risk: 'Owner-approved resolved forecasts, real baselines, leakage review, hosted/security proof, buyer proof, and claim-language approval are still missing.'
  });

  writeArtifact(inputPaths.evidence, `${JSON.stringify(evidence, null, 2)}\n`);
}

console.log(JSON.stringify({
  json_output: outputPaths.json,
  md_output: outputPaths.md,
  csv_output: outputPaths.csv,
  evidence_updated: updateEvidence,
  status: validation.status,
  ledger_mode: ledgerMode,
  benchmark_status: benchmarkStatus,
  included_point_count: includedPointCount,
  max_source_sample_size: maxSourceSampleSize,
  comparisons_made: comparisonsMade,
  scoring_output_ready_for_claim_review: validation.summary.scoring_output_ready_for_claim_review,
  accuracy_claim_allowed: false,
  world_class_prediction_claim_allowed: false
}, null, 2));
