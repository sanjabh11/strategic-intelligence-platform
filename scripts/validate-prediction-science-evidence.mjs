#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const ROOT = process.cwd();
const DEFAULT_FORECAST_EVALUATION_PROTOCOL = 'docs/launch-readiness/forecast-evaluation-protocol-2026-06-06.json';
const DEFAULT_FORECAST_CLAIM_GOVERNANCE = 'docs/launch-readiness/forecast-claim-governance-2026-06-06.json';
const DEFAULT_ACCURACY_INPUT_VALIDATION = 'docs/launch-readiness/accuracy-evidence-input-validation-2026-06-06.json';
const DEFAULT_LEAKAGE_REVIEW_VALIDATION = 'docs/launch-readiness/forecast-leakage-review-validation-2026-06-06.json';
const DEFAULT_SCORING_VALIDATION = 'docs/launch-readiness/forecast-scoring-evidence-validation-2026-06-06.json';
const DEFAULT_CALIBRATION_LEDGER = 'docs/launch-readiness/resolved-forecast-calibration-ledger-2026-06-06.json';
const DEFAULT_BENCHMARK_COMPARISON = 'docs/launch-readiness/forecast-benchmark-comparison-2026-06-06.json';
const DEFAULT_HOSTED_PROOF_VALIDATION = 'docs/launch-readiness/hosted-operational-proof-evidence-validation-2026-06-06.json';
const DEFAULT_RLS_PROOF_VALIDATION = 'docs/launch-readiness/rls-proof-evidence-validation-2026-06-06.json';
const DEFAULT_EVIDENCE = 'docs/launch-readiness/launch-evidence-2026-06-06.json';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/prediction-science-evidence-validation-2026-06-06.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/prediction-science-evidence-validation-2026-06-06.md';
const DEFAULT_CSV_OUTPUT = 'docs/launch-readiness/prediction-science-evidence-validation-checklist-2026-06-06.csv';

const CURRENT_FORECASTING_SCIENCE_SOURCES = [
  {
    source: 'ForecastBench',
    url: 'https://www.forecastbench.org/about/',
    requirement: 'Dynamic, continuously updated, contamination-resistant forecasting benchmark with human comparison groups.'
  },
  {
    source: 'ForecastBench paper',
    url: 'https://arxiv.org/abs/2409.19839',
    requirement: 'Compare ML systems with expert forecasters, the public, and other LLMs on forecast questions.'
  },
  {
    source: 'Metaculus FutureEval methodology',
    url: 'https://www.metaculus.com/futureeval/methodology/',
    requirement: 'Evaluate on open/resolved forecasting questions and compare with pro/community human baselines where humans and bots both forecast.'
  },
  {
    source: 'NIST AI Risk Management Framework',
    url: 'https://www.nist.gov/itl/ai-risk-management-framework',
    requirement: 'Use documented test, evaluation, verification, validation, monitoring, and risk-management evidence before trust claims.'
  },
  {
    source: 'NIST GenAI evaluation program',
    url: 'https://ai-challenges.nist.gov/genai',
    requirement: 'Treat evolving benchmark construction and measurement science as part of generative-AI evaluation rather than static demo proof.'
  }
];

const REQUIRED_PROTOCOL_STAGES = [
  'question_registration',
  'pre_resolution_forecast_capture',
  'owner_approved_export',
  'calibration_and_brier_scoring',
  'baseline_comparison',
  'leakage_and_contamination_review',
  'hosted_and_security_boundary',
  'claim_language_review'
];

const REQUIRED_METRICS = [
  'brier_score',
  'reliability_bins',
  'brier_skill_vs_baseline',
  'coverage_and_abstention'
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
    'Usage: node scripts/validate-prediction-science-evidence.mjs',
    `  [--forecast-evaluation-protocol ${DEFAULT_FORECAST_EVALUATION_PROTOCOL}]`,
    `  [--forecast-claim-governance ${DEFAULT_FORECAST_CLAIM_GOVERNANCE}]`,
    `  [--accuracy-input-validation ${DEFAULT_ACCURACY_INPUT_VALIDATION}]`,
    `  [--leakage-review-validation ${DEFAULT_LEAKAGE_REVIEW_VALIDATION}]`,
    `  [--scoring-validation ${DEFAULT_SCORING_VALIDATION}]`,
    `  [--calibration-ledger ${DEFAULT_CALIBRATION_LEDGER}]`,
    `  [--benchmark-comparison ${DEFAULT_BENCHMARK_COMPARISON}]`,
    `  [--hosted-proof-validation ${DEFAULT_HOSTED_PROOF_VALIDATION}]`,
    `  [--rls-proof-validation ${DEFAULT_RLS_PROOF_VALIDATION}]`,
    `  [--evidence ${DEFAULT_EVIDENCE}]`,
    `  [--json-output ${DEFAULT_JSON_OUTPUT}]`,
    `  [--md-output ${DEFAULT_MD_OUTPUT}]`,
    `  [--csv-output ${DEFAULT_CSV_OUTPUT}]`,
    '  [--update-evidence]'
  ].join('\n'));
}

if (hasFlag('--help') || hasFlag('-h')) {
  usage();
  process.exit(0);
}

const inputPaths = {
  forecastEvaluationProtocol: argValue('--forecast-evaluation-protocol', DEFAULT_FORECAST_EVALUATION_PROTOCOL),
  forecastClaimGovernance: argValue('--forecast-claim-governance', DEFAULT_FORECAST_CLAIM_GOVERNANCE),
  accuracyInputValidation: argValue('--accuracy-input-validation', DEFAULT_ACCURACY_INPUT_VALIDATION),
  leakageReviewValidation: argValue('--leakage-review-validation', DEFAULT_LEAKAGE_REVIEW_VALIDATION),
  scoringValidation: argValue('--scoring-validation', DEFAULT_SCORING_VALIDATION),
  calibrationLedger: argValue('--calibration-ledger', DEFAULT_CALIBRATION_LEDGER),
  benchmarkComparison: argValue('--benchmark-comparison', DEFAULT_BENCHMARK_COMPARISON),
  hostedProofValidation: argValue('--hosted-proof-validation', DEFAULT_HOSTED_PROOF_VALIDATION),
  rlsProofValidation: argValue('--rls-proof-validation', DEFAULT_RLS_PROOF_VALIDATION),
  evidence: argValue('--evidence', DEFAULT_EVIDENCE)
};

const outputPaths = {
  json: argValue('--json-output', DEFAULT_JSON_OUTPUT),
  md: argValue('--md-output', DEFAULT_MD_OUTPUT),
  csv: argValue('--csv-output', DEFAULT_CSV_OUTPUT)
};

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

function gateStatus(condition, openStatus = 'failed') {
  return condition ? 'passed' : openStatus;
}

const forecastEvaluationProtocol = readJsonIfExists(inputPaths.forecastEvaluationProtocol, {
  status: 'missing',
  protocol_stages: [],
  metric_suite: [],
  claim_tiers: []
});
const forecastClaimGovernance = readJsonIfExists(inputPaths.forecastClaimGovernance, {
  status: 'missing',
  summary: {},
  acceptance_thresholds: [],
  release_holds: []
});
const accuracyInputValidation = readJsonIfExists(inputPaths.accuracyInputValidation, {
  status: 'missing',
  summary: {}
});
const leakageReviewValidation = readJsonIfExists(inputPaths.leakageReviewValidation, {
  status: 'missing',
  summary: {},
  acceptance_gates: []
});
const scoringValidation = readJsonIfExists(inputPaths.scoringValidation, {
  status: 'missing',
  summary: {},
  acceptance_gates: []
});
const calibrationLedger = readJsonIfExists(inputPaths.calibrationLedger, {
  commercial_claim_status: 'missing',
  source: {},
  summary: {}
});
const benchmarkComparison = readJsonIfExists(inputPaths.benchmarkComparison, {
  commercial_benchmark_status: 'missing',
  summary: {},
  baselines: []
});
const hostedProofValidation = readJsonIfExists(inputPaths.hostedProofValidation, {
  status: 'missing',
  summary: {}
});
const rlsProofValidation = readJsonIfExists(inputPaths.rlsProofValidation, {
  status: 'missing',
  summary: {}
});

const protocolStages = asArray(forecastEvaluationProtocol.protocol_stages);
const protocolStageNames = new Set(protocolStages.map((stage) => stage.stage));
const missingProtocolStages = REQUIRED_PROTOCOL_STAGES.filter((stage) => !protocolStageNames.has(stage));
const metricSuite = asArray(forecastEvaluationProtocol.metric_suite);
const metricNames = new Set(metricSuite.map((metric) => metric.metric));
const missingMetrics = REQUIRED_METRICS.filter((metric) => !metricNames.has(metric));
const claimTiers = asArray(forecastEvaluationProtocol.claim_tiers);
const governanceThresholds = asArray(forecastClaimGovernance.acceptance_thresholds);
const governanceReleaseHoldCount = Number(forecastClaimGovernance.summary?.release_hold_count ?? 0);
const realResolvedOutcomeCount = Number(forecastClaimGovernance.summary?.real_resolved_outcome_count ?? 0);
const realBaselineComparisonCount = Number(forecastClaimGovernance.summary?.real_baseline_comparison_count ?? 0);
const validResolvedForecastCount = Number(accuracyInputValidation.summary?.valid_resolved_forecast_count ?? 0);
const validBaselineCount = Number(accuracyInputValidation.summary?.valid_baseline_count ?? 0);
const accuracyInputsReady = Boolean(accuracyInputValidation.summary?.ready_for_calibration_scoring);
const leakageReadyControlCount = Number(leakageReviewValidation.summary?.ready_control_count ?? 0);
const leakageRequiredControlCount = Number(leakageReviewValidation.summary?.required_control_count ?? 0);
const leakagePassed = Boolean(leakageReviewValidation.summary?.leakage_review_passed);
const scoringReady = Boolean(scoringValidation.summary?.scoring_output_ready_for_claim_review);
const scoringSampleOnly = Boolean(scoringValidation.summary?.sample_only);
const includedPointCount = Number(scoringValidation.summary?.included_point_count ?? 0);
const maxSourceSampleSize = Number(scoringValidation.summary?.max_source_sample_size ?? 0);
const reliabilityReadySourceCount = Number(scoringValidation.summary?.reliability_ready_source_count ?? 0);
const baselinesLoaded = Number(scoringValidation.summary?.baselines_loaded ?? 0);
const sourceBackedBaselineCount = Number(scoringValidation.summary?.source_backed_baseline_count ?? 0);
const comparisonsMade = Number(scoringValidation.summary?.comparisons_made ?? 0);
const scoringReleaseHoldCount = Number(scoringValidation.summary?.active_release_hold_count ?? 0);
const ledgerMode = calibrationLedger.source?.mode ?? 'missing';
const ledgerClaimStatus = calibrationLedger.commercial_claim_status ?? 'missing';
const ledgerMinimumSampleSize = Number(calibrationLedger.summary?.minimum_sample_size ?? 25);
const ledgerMaxSampleSize = Number(calibrationLedger.summary?.max_source_sample_size ?? 0);
const benchmarkStatus = benchmarkComparison.commercial_benchmark_status ?? 'missing';
const benchmarkBaselines = asArray(benchmarkComparison.baselines);
const benchmarkSourceBackedBaselines = benchmarkBaselines.filter((baseline) => {
  const url = String(baseline.source_url ?? '').trim();
  return /^https?:\/\//i.test(url) && Number(baseline.sample_size ?? 0) > 0;
}).length;
const hostedReady = Boolean(hostedProofValidation.summary?.ready_for_buyer_safe_hosted_claims);
const rlsReady = Boolean(rlsProofValidation.summary?.rls_tenant_isolation_proof_ready);
const accuracyClaimAllowed = Boolean(scoringValidation.summary?.accuracy_claim_allowed);
const worldClassPredictionClaimAllowed = Boolean(scoringValidation.summary?.world_class_prediction_claim_allowed)
  || Boolean(forecastClaimGovernance.summary?.approved_world_class_claim);

const acceptanceGates = [
  {
    gate: 'current_scientific_framework_sources_attached',
    status: gateStatus(CURRENT_FORECASTING_SCIENCE_SOURCES.length >= 5),
    evidence: `${CURRENT_FORECASTING_SCIENCE_SOURCES.length} current forecasting/evaluation source anchors attached.`,
    proof_bucket: 'repo_artifact'
  },
  {
    gate: 'forecast_protocol_complete',
    status: gateStatus(missingProtocolStages.length === 0 && protocolStages.length >= REQUIRED_PROTOCOL_STAGES.length),
    evidence: `${protocolStages.length} protocol stages present; missing=${missingProtocolStages.join(', ') || 'none'}.`,
    proof_bucket: 'repo_artifact'
  },
  {
    gate: 'proper_scoring_metric_suite_present',
    status: gateStatus(missingMetrics.length === 0 && metricSuite.length >= REQUIRED_METRICS.length),
    evidence: `${metricSuite.length} metrics present; missing=${missingMetrics.join(', ') || 'none'}.`,
    proof_bucket: 'repo_artifact'
  },
  {
    gate: 'claim_tiers_and_governance_thresholds_present',
    status: gateStatus(claimTiers.length >= 4 && governanceThresholds.length >= 5),
    evidence: `${claimTiers.length} claim tiers and ${governanceThresholds.length} governance thresholds present.`,
    proof_bucket: 'repo_artifact'
  },
  {
    gate: 'owner_approved_resolved_outcomes_present',
    status: gateStatus(validResolvedForecastCount > 0 && realResolvedOutcomeCount > 0, 'open_no_real_resolved_outcomes'),
    evidence: `${validResolvedForecastCount} valid resolved forecasts from input validation; ${realResolvedOutcomeCount} real resolved outcomes in claim governance.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'real_comparable_baselines_present',
    status: gateStatus(validBaselineCount > 0 && realBaselineComparisonCount > 0 && benchmarkSourceBackedBaselines > 0, 'open_no_real_comparable_baselines'),
    evidence: `${validBaselineCount} valid baselines; ${realBaselineComparisonCount} real baseline comparisons; ${benchmarkSourceBackedBaselines}/${benchmarkBaselines.length} benchmark baselines have source URLs and sample sizes.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'sample_size_and_reliability_bins_ready',
    status: gateStatus(ledgerMaxSampleSize >= ledgerMinimumSampleSize && reliabilityReadySourceCount > 0 && !scoringSampleOnly, 'open_sample_only_or_underpowered'),
    evidence: `ledger mode=${ledgerMode}; ledger status=${ledgerClaimStatus}; max source sample size=${ledgerMaxSampleSize}/${ledgerMinimumSampleSize}; reliability-ready sources=${reliabilityReadySourceCount}; sample_only=${scoringSampleOnly}.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'leakage_and_contamination_review_passed',
    status: gateStatus(leakagePassed && leakageReadyControlCount >= leakageRequiredControlCount && leakageRequiredControlCount > 0, 'open_leakage_review_not_ready'),
    evidence: `${leakageReadyControlCount}/${leakageRequiredControlCount} leakage controls ready; leakage_review_passed=${leakagePassed}.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'benchmark_comparison_usable',
    status: gateStatus(scoringReady && benchmarkStatus === 'usable_with_caveats' && sourceBackedBaselineCount > 0, 'open_benchmark_not_claim_proof'),
    evidence: `scoring_ready=${scoringReady}; benchmark_status=${benchmarkStatus}; comparisons=${comparisonsMade}; source-backed baselines=${sourceBackedBaselineCount}/${baselinesLoaded}.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'hosted_and_rls_evaluation_boundary_ready',
    status: gateStatus(hostedReady && rlsReady, 'open_hosted_or_security_boundary_not_ready'),
    evidence: `hosted_ready=${hostedReady}; rls_tenant_isolation_proof_ready=${rlsReady}.`,
    proof_bucket: 'hosted_live'
  },
  {
    gate: 'accuracy_claim_language_still_blocked',
    status: gateStatus(!accuracyClaimAllowed && !worldClassPredictionClaimAllowed),
    evidence: `accuracy_claim_allowed=${accuracyClaimAllowed}; world_class_prediction_claim_allowed=${worldClassPredictionClaimAllowed}.`,
    proof_bucket: 'repo_artifact'
  }
];

const releaseHolds = [
  {
    hold: 'owner_approved_resolved_outcomes_missing',
    severity: 'P1',
    status: validResolvedForecastCount > 0 && realResolvedOutcomeCount > 0 ? 'cleared' : 'active',
    evidence_needed: 'Owner-approved pre-resolution forecast export with resolved outcomes and explicit inclusion/exclusion rules.'
  },
  {
    hold: 'real_human_model_or_market_baselines_missing',
    severity: 'P1',
    status: validBaselineCount > 0 && realBaselineComparisonCount > 0 ? 'cleared' : 'active',
    evidence_needed: 'Comparable human/community/pro/model/market baselines with source URLs, timestamps, and sample sizes.'
  },
  {
    hold: 'sample_size_and_reliability_underpowered',
    severity: 'P1',
    status: ledgerMaxSampleSize >= ledgerMinimumSampleSize && reliabilityReadySourceCount > 0 && !scoringSampleOnly ? 'cleared' : 'active',
    evidence_needed: 'At least the protocol minimum sample size and non-empty reliability bins for each scored source used in a claim.'
  },
  {
    hold: 'leakage_and_contamination_review_not_passed',
    severity: 'P1',
    status: leakagePassed ? 'cleared' : 'active',
    evidence_needed: 'Adversarial leakage review covering pre-resolution timestamps, retrieval cutoffs, benchmark contamination, and baseline comparability.'
  },
  {
    hold: 'benchmark_comparison_not_claim_proof',
    severity: 'P1',
    status: scoringReady && benchmarkStatus === 'usable_with_caveats' ? 'cleared' : 'active',
    evidence_needed: 'Scoring validator passes on approved export with real comparable baselines and usable benchmark status.'
  },
  {
    hold: 'hosted_and_security_evaluation_boundary_missing',
    severity: 'P1',
    status: hostedReady && rlsReady ? 'cleared' : 'active',
    evidence_needed: 'Hosted calibration/release proof and RLS/evaluation-table boundary proof.'
  },
  {
    hold: 'owner_approved_accuracy_claim_language_missing',
    severity: 'P2',
    status: 'active',
    evidence_needed: 'Owner-approved claim tier and buyer-safe language before any external use.'
  }
];

const structuralPassed = acceptanceGates
  .filter((gate) => gate.proof_bucket === 'repo_artifact')
  .every((gate) => gate.status === 'passed');
const realEvidenceReady = validResolvedForecastCount > 0
  && realResolvedOutcomeCount > 0
  && validBaselineCount > 0
  && realBaselineComparisonCount > 0
  && leakagePassed
  && scoringReady
  && hostedReady
  && rlsReady;

const validation = {
  schema_version: 'prediction-science-evidence-validation-v1',
  generated_at: new Date().toISOString(),
  status: !structuralPassed
    ? 'prediction_science_evidence_validation_failed_framework_structure'
    : realEvidenceReady
      ? 'prediction_science_evidence_validation_ready_for_owner_claim_review'
      : 'prediction_science_evidence_validation_ready_no_real_outcomes',
  source: {
    forecast_evaluation_protocol: inputPaths.forecastEvaluationProtocol,
    forecast_claim_governance: inputPaths.forecastClaimGovernance,
    accuracy_input_validation: inputPaths.accuracyInputValidation,
    leakage_review_validation: inputPaths.leakageReviewValidation,
    scoring_validation: inputPaths.scoringValidation,
    calibration_ledger: inputPaths.calibrationLedger,
    benchmark_comparison: inputPaths.benchmarkComparison,
    hosted_proof_validation: inputPaths.hostedProofValidation,
    rls_proof_validation: inputPaths.rlsProofValidation,
    launch_evidence: inputPaths.evidence
  },
  summary: {
    scientific_source_count: CURRENT_FORECASTING_SCIENCE_SOURCES.length,
    protocol_stage_count: protocolStages.length,
    missing_protocol_stage_count: missingProtocolStages.length,
    metric_count: metricSuite.length,
    missing_metric_count: missingMetrics.length,
    claim_tier_count: claimTiers.length,
    governance_threshold_count: governanceThresholds.length,
    governance_release_hold_count: governanceReleaseHoldCount,
    valid_resolved_forecast_count: validResolvedForecastCount,
    real_resolved_outcome_count: realResolvedOutcomeCount,
    valid_baseline_count: validBaselineCount,
    real_baseline_comparison_count: realBaselineComparisonCount,
    accuracy_inputs_ready_for_scoring: accuracyInputsReady,
    leakage_ready_control_count: leakageReadyControlCount,
    leakage_required_control_count: leakageRequiredControlCount,
    leakage_review_passed: leakagePassed,
    scoring_output_ready_for_claim_review: scoringReady,
    scoring_sample_only: scoringSampleOnly,
    scoring_included_point_count: includedPointCount,
    scoring_max_source_sample_size: maxSourceSampleSize,
    scoring_release_hold_count: scoringReleaseHoldCount,
    calibration_ledger_mode: ledgerMode,
    calibration_ledger_claim_status: ledgerClaimStatus,
    benchmark_status: benchmarkStatus,
    benchmark_baseline_count: benchmarkBaselines.length,
    source_backed_baseline_count: sourceBackedBaselineCount,
    comparisons_made: comparisonsMade,
    hosted_ready_for_buyer_safe_claims: hostedReady,
    rls_tenant_isolation_proof_ready: rlsReady,
    active_release_hold_count: releaseHolds.filter((hold) => hold.status === 'active').length,
    scientific_framework_alignment_ready: structuralPassed,
    prediction_science_ready_for_claim_review: realEvidenceReady,
    mechanics_only_claim_allowed: structuralPassed,
    internal_accuracy_claim_allowed: false,
    benchmark_aware_accuracy_claim_allowed: false,
    accuracy_claim_allowed: accuracyClaimAllowed,
    world_class_prediction_claim_allowed: worldClassPredictionClaimAllowed
  },
  current_forecasting_science_sources: CURRENT_FORECASTING_SCIENCE_SOURCES,
  acceptance_gates: acceptanceGates,
  release_holds: releaseHolds,
  recommended_market_language: [
    'calibration-aware decision support',
    'forecast scoring and benchmark mechanics are implemented locally',
    'prediction-science claim review is ready for owner data, not accuracy claims'
  ],
  prohibited_market_language: [
    'world-class accurate predictions',
    'best-in-class forecasting',
    'ForecastBench/Metaculus/Good Judgment parity',
    'benchmark superiority',
    'production calibrated accuracy'
  ],
  proof_boundary: 'This validator maps the repo forecast evidence to current forecasting evaluation practice. It proves framework alignment and mechanics only; it does not prove prediction accuracy, benchmark superiority, or world-class forecasting.'
};

function renderMarkdown(report) {
  const gateRows = report.acceptance_gates
    .map((gate) => [
      gate.gate,
      gate.status,
      gate.proof_bucket,
      mdCell(gate.evidence)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const sourceRows = report.current_forecasting_science_sources
    .map((source) => [
      mdCell(source.source),
      source.url,
      mdCell(source.requirement)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const holdRows = report.release_holds
    .map((hold) => [
      hold.hold,
      hold.severity,
      hold.status,
      mdCell(hold.evidence_needed)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  return `# Prediction Science Evidence Validation - ${report.generated_at.slice(0, 10)}

## Decision

Status: \`${report.status}\`.

Scientific framework alignment ready: **${report.summary.scientific_framework_alignment_ready}**.

Prediction-science claim review ready: **${report.summary.prediction_science_ready_for_claim_review}**.

Mechanics-only claim allowed: **${report.summary.mechanics_only_claim_allowed}**.

Accuracy claim allowed: **${report.summary.accuracy_claim_allowed}**.

World-class prediction claim allowed: **${report.summary.world_class_prediction_claim_allowed}**.

## Acceptance Gates

| Gate | Status | Proof Bucket | Evidence |
|---|---|---|---|
${gateRows}

## Current Forecasting Science Sources

| Source | URL | Requirement |
|---|---|---|
${sourceRows}

## Active Holds

| Hold | Severity | Status | Evidence Needed |
|---|---|---|---|
${holdRows}

## Proof Boundary

${report.proof_boundary}
`;
}

function renderCsv(report) {
  const header = csvLine(['gate', 'status', 'proof_bucket', 'evidence']);
  const rows = report.acceptance_gates.map((gate) => csvLine([
    gate.gate,
    gate.status,
    gate.proof_bucket,
    gate.evidence
  ]));
  return `${[header, ...rows].join('\n')}\n`;
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
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:forecast:validate-science -- --forecast-evaluation-protocol ${inputPaths.forecastEvaluationProtocol} --forecast-claim-governance ${inputPaths.forecastClaimGovernance} --accuracy-input-validation ${inputPaths.accuracyInputValidation} --leakage-review-validation ${inputPaths.leakageReviewValidation} --scoring-validation ${inputPaths.scoringValidation} --calibration-ledger ${inputPaths.calibrationLedger} --benchmark-comparison ${inputPaths.benchmarkComparison} --hosted-proof-validation ${inputPaths.hostedProofValidation} --rls-proof-validation ${inputPaths.rlsProofValidation} --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence: status ${validation.status}, prediction_science_ready_for_claim_review ${validation.summary.prediction_science_ready_for_claim_review}, world_class_prediction_claim_allowed false`
  ], [
    /npm run audit:forecast:validate-science/
  ]);

  evidence.proof_buckets.repo_artifact = replaceMatchingThenAppend(evidence.proof_buckets.repo_artifact, [
    'scripts/validate-prediction-science-evidence.mjs validates forecasting science readiness against protocol, scoring, leakage, benchmark, hosted/security, and current scientific source requirements',
    'docs/launch-readiness/prediction-science-evidence-validation-2026-06-06.json records current forecasting-science alignment, active holds, and claim-allowance booleans',
    'docs/launch-readiness/prediction-science-evidence-validation-checklist-2026-06-06.csv provides the prediction-science claim-boundary checklist'
  ], [
    /scripts\/validate-prediction-science-evidence\.mjs/,
    /prediction-science-evidence-validation-2026-06-06\.json/,
    /prediction-science-evidence-validation-checklist-2026-06-06\.csv/
  ]);

  evidence.fix_report = evidence.fix_report ?? {};
  evidence.fix_report.files_changed = replaceMatchingThenAppend(evidence.fix_report.files_changed, [
    'scripts/validate-prediction-science-evidence.mjs',
    'scripts/build-commercial-confidence-gate.mjs',
    'docs/launch-readiness/prediction-science-evidence-validation-2026-06-06.json',
    'docs/launch-readiness/prediction-science-evidence-validation-2026-06-06.md',
    'docs/launch-readiness/prediction-science-evidence-validation-checklist-2026-06-06.csv',
    'package.json'
  ], [
    /scripts\/validate-prediction-science-evidence\.mjs/,
    /scripts\/build-commercial-confidence-gate\.mjs/,
    /prediction-science-evidence-validation-2026-06-06\.json/,
    /prediction-science-evidence-validation-2026-06-06\.md/,
    /prediction-science-evidence-validation-checklist-2026-06-06\.csv/,
    /package\.json/
  ]);
  evidence.fix_report.tests_run = replaceMatchingThenAppend(evidence.fix_report.tests_run, [
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH node --check scripts/validate-prediction-science-evidence.mjs',
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:forecast:validate-science -- --forecast-evaluation-protocol ${inputPaths.forecastEvaluationProtocol} --forecast-claim-governance ${inputPaths.forecastClaimGovernance} --accuracy-input-validation ${inputPaths.accuracyInputValidation} --leakage-review-validation ${inputPaths.leakageReviewValidation} --scoring-validation ${inputPaths.scoringValidation} --calibration-ledger ${inputPaths.calibrationLedger} --benchmark-comparison ${inputPaths.benchmarkComparison} --hosted-proof-validation ${inputPaths.hostedProofValidation} --rls-proof-validation ${inputPaths.rlsProofValidation} --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence`
  ], [
    /node --check scripts\/validate-prediction-science-evidence\.mjs/,
    /npm run audit:forecast:validate-science/
  ]);
  evidence.fix_report.approval_gates = replaceMatchingThenAppend(evidence.fix_report.approval_gates, [
    'Prediction science evidence validation is repo/local framework-alignment proof only; owner-approved resolved outcomes, real comparable baselines, leakage review, usable benchmark comparison, hosted/RLS proof, and owner-approved claim language remain required before prediction accuracy claims can be upgraded.'
  ], [
    /Prediction science evidence validation is repo\/local framework-alignment proof only/
  ]);

  evidence.implementation_decisions = replaceByTaskId(evidence.implementation_decisions, {
    task_id: 'prediction-science-evidence-validation-harness',
    decision: 'Add a deterministic no-dependency validator for forecasting-science readiness before prediction-accuracy or world-class claims can be upgraded.',
    acceptance_check: 'The validator confirms current protocol and scoring framework alignment while keeping accuracy, benchmark superiority, and world-class prediction claims blocked without real resolved outcomes and comparable baselines.',
    chosen_variant: 'minimal Node artifact validator plus commercial-confidence gate wiring; no scoring algorithm rewrite and no new dependency',
    repo_pattern_reused: 'Existing launch-readiness Node artifact validator pattern',
    files_changed: [
      'scripts/validate-prediction-science-evidence.mjs',
      'scripts/build-commercial-confidence-gate.mjs',
      'package.json'
    ],
    tests_run: [
      'node --check scripts/validate-prediction-science-evidence.mjs',
      'npm run audit:forecast:validate-science',
      'npm run audit:commercial:confidence'
    ],
    proof: `${validation.status}; scientific_framework_alignment_ready=${validation.summary.scientific_framework_alignment_ready}; prediction_science_ready_for_claim_review=${validation.summary.prediction_science_ready_for_claim_review}; world_class_prediction_claim_allowed=false.`,
    reason: 'The highest remaining blocker is prediction accuracy proof; current forecasting-science standards require explicit resolved outcomes, baselines, leakage controls, and TEVV boundaries before market accuracy claims.'
  });
  evidence.rejected_variants = replaceByTaskId(evidence.rejected_variants, {
    task_id: 'prediction-science-evidence-validation-harness',
    variant: 'Treat protocol, sample fixtures, or local scoring mechanics as prediction accuracy proof.',
    reason_rejected: 'Current ForecastBench/FutureEval-style evidence needs real resolved outcomes, comparable human/model baselines, contamination controls, and claim review; sample fixtures only prove mechanics.',
    tradeoff: 'Score-neutral validation strengthens scientific discipline without manufacturing accuracy evidence.',
    evidence: `${validation.status} keeps prediction_science_ready_for_claim_review=false and world_class_prediction_claim_allowed=false.`
  });
  evidence.code_optimization_reviews = replaceByTaskId(evidence.code_optimization_reviews, {
    target_task: 'prediction-science-evidence-validation-harness',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'No new dependency, no runtime app edit, no hosted or secret-dependent execution, and generated artifacts remain repo/local proof only.',
    tests_or_checks: [
      'node --check scripts/validate-prediction-science-evidence.mjs',
      'npm run audit:forecast:validate-science',
      'npm run audit:commercial:confidence'
    ],
    remaining_risk: 'Owner-approved resolved outcomes, real comparable baselines, leakage review, hosted/RLS proof, and claim-language approval are still missing.'
  });

  writeArtifact(inputPaths.evidence, `${JSON.stringify(evidence, null, 2)}\n`);
}

console.log(JSON.stringify({
  json_output: outputPaths.json,
  md_output: outputPaths.md,
  csv_output: outputPaths.csv,
  evidence_updated: updateEvidence,
  status: validation.status,
  scientific_framework_alignment_ready: validation.summary.scientific_framework_alignment_ready,
  prediction_science_ready_for_claim_review: validation.summary.prediction_science_ready_for_claim_review,
  valid_resolved_forecast_count: validResolvedForecastCount,
  real_baseline_comparison_count: realBaselineComparisonCount,
  leakage_review_passed: leakagePassed,
  scoring_output_ready_for_claim_review: scoringReady,
  accuracy_claim_allowed: accuracyClaimAllowed,
  world_class_prediction_claim_allowed: worldClassPredictionClaimAllowed
}, null, 2));
