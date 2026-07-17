#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const ROOT = process.cwd();
const DEFAULT_CALIBRATION_READINESS = 'docs/launch-readiness/calibration-readiness-audit-2026-06-06.json';
const DEFAULT_CALIBRATION_LEDGER = 'docs/launch-readiness/resolved-forecast-calibration-ledger-2026-06-06.json';
const DEFAULT_BENCHMARK_COMPARISON = 'docs/launch-readiness/forecast-benchmark-comparison-2026-06-06.json';
const DEFAULT_SCORING_VALIDATION = 'docs/launch-readiness/forecast-scoring-evidence-validation-2026-06-06.json';
const DEFAULT_ACCURACY_INTAKE_KIT = 'docs/launch-readiness/accuracy-evidence-intake-kit-2026-06-06.json';
const DEFAULT_ACCURACY_INPUT_VALIDATION = 'docs/launch-readiness/accuracy-evidence-input-validation-2026-06-06.json';
const DEFAULT_FORECAST_EVALUATION_PROTOCOL = 'docs/launch-readiness/forecast-evaluation-protocol-2026-06-06.json';
const DEFAULT_LEAKAGE_REVIEW_VALIDATION = 'docs/launch-readiness/forecast-leakage-review-validation-2026-06-06.json';
const DEFAULT_CONFIDENCE_GATE = 'docs/launch-readiness/commercial-confidence-gate-2026-06-06.json';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/forecast-claim-governance-2026-06-06.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/forecast-claim-governance-2026-06-06.md';
const DEFAULT_CSV_OUTPUT = 'docs/launch-readiness/forecast-claim-governance-checklist-2026-06-06.csv';

function argValue(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function usage() {
  console.error([
    'Usage: node scripts/build-forecast-claim-governance.mjs',
    `  [--calibration-readiness ${DEFAULT_CALIBRATION_READINESS}]`,
    `  [--calibration-ledger ${DEFAULT_CALIBRATION_LEDGER}]`,
    `  [--benchmark-comparison ${DEFAULT_BENCHMARK_COMPARISON}]`,
    `  [--scoring-validation ${DEFAULT_SCORING_VALIDATION}]`,
  `  [--accuracy-intake-kit ${DEFAULT_ACCURACY_INTAKE_KIT}]`,
  `  [--accuracy-input-validation ${DEFAULT_ACCURACY_INPUT_VALIDATION}]`,
  `  [--forecast-evaluation-protocol ${DEFAULT_FORECAST_EVALUATION_PROTOCOL}]`,
  `  [--leakage-review-validation ${DEFAULT_LEAKAGE_REVIEW_VALIDATION}]`,
  `  [--confidence-gate ${DEFAULT_CONFIDENCE_GATE}]`,
    `  [--json-output ${DEFAULT_JSON_OUTPUT}]`,
    `  [--md-output ${DEFAULT_MD_OUTPUT}]`,
    `  [--csv-output ${DEFAULT_CSV_OUTPUT}]`
  ].join('\n'));
}

if (hasFlag('--help') || hasFlag('-h')) {
  usage();
  process.exit(0);
}

const inputPaths = {
  calibrationReadiness: argValue('--calibration-readiness', DEFAULT_CALIBRATION_READINESS),
  calibrationLedger: argValue('--calibration-ledger', DEFAULT_CALIBRATION_LEDGER),
  benchmarkComparison: argValue('--benchmark-comparison', DEFAULT_BENCHMARK_COMPARISON),
  scoringValidation: argValue('--scoring-validation', DEFAULT_SCORING_VALIDATION),
  accuracyIntakeKit: argValue('--accuracy-intake-kit', DEFAULT_ACCURACY_INTAKE_KIT),
  accuracyInputValidation: argValue('--accuracy-input-validation', DEFAULT_ACCURACY_INPUT_VALIDATION),
  forecastEvaluationProtocol: argValue('--forecast-evaluation-protocol', DEFAULT_FORECAST_EVALUATION_PROTOCOL),
  leakageReviewValidation: argValue('--leakage-review-validation', DEFAULT_LEAKAGE_REVIEW_VALIDATION),
  confidenceGate: argValue('--confidence-gate', DEFAULT_CONFIDENCE_GATE)
};

const outputPaths = {
  json: argValue('--json-output', DEFAULT_JSON_OUTPUT),
  md: argValue('--md-output', DEFAULT_MD_OUTPUT),
  csv: argValue('--csv-output', DEFAULT_CSV_OUTPUT)
};

if (!outputPaths.json && !outputPaths.md && !outputPaths.csv) {
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

const calibrationReadiness = readJsonIfExists(inputPaths.calibrationReadiness, {
  status: 'missing',
  summary: {},
  evidence_gates: []
});
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
const scoringValidation = readJsonIfExists(inputPaths.scoringValidation, {
  status: 'missing',
  summary: {
    included_point_count: 0,
    max_source_sample_size: 0,
    baselines_loaded: 0,
    comparisons_made: 0,
    active_release_hold_count: 0,
    scoring_output_ready_for_claim_review: false,
    accuracy_claim_allowed: false,
    world_class_prediction_claim_allowed: false
  }
});
const accuracyIntakeKit = readJsonIfExists(inputPaths.accuracyIntakeKit, {
  status: 'missing',
  acceptance_gates: [],
  required_owner_inputs: []
});
const accuracyInputValidation = readJsonIfExists(inputPaths.accuracyInputValidation, {
  status: 'missing',
  summary: {
    valid_resolved_forecast_count: 0,
    valid_baseline_count: 0,
    ready_for_calibration_scoring: false,
    active_release_hold_count: 0
  },
  acceptance_gates: [],
  release_holds: []
});
const forecastEvaluationProtocol = readJsonIfExists(inputPaths.forecastEvaluationProtocol, {
  status: 'missing',
  protocol_stages: [],
  metric_suite: [],
  claim_tiers: [],
  baseline_policy: []
});
const leakageReviewValidation = readJsonIfExists(inputPaths.leakageReviewValidation, {
  status: 'missing',
  summary: {
    ready_control_count: 0,
    required_control_count: 8,
    valid_resolved_forecast_count: 0,
    valid_baseline_count: 0,
    unresolved_issue_total: 0,
    high_or_critical_risk_count: 0,
    active_release_hold_count: 0,
    ready_for_accuracy_claim_review: false,
    leakage_review_passed: false
  },
  acceptance_gates: [],
  release_holds: []
});
const confidenceGate = readJsonIfExists(inputPaths.confidenceGate, {
  dimensions: [],
  posture: {}
});

const accuracyDimension = (confidenceGate.dimensions ?? []).find((dimension) => dimension.id === 'prediction_accuracy_proof') ?? {};
const sampleLedgerPointCount = Number(calibrationLedger.summary?.included_point_count ?? 0);
const sampleBenchmarkComparisonCount = Number(benchmarkComparison.summary?.comparisons_made ?? 0);
const scoringValidationStatus = scoringValidation.status ?? 'missing';
const scoringOutputReadyForClaimReview = Boolean(scoringValidation.summary?.scoring_output_ready_for_claim_review);
const scoringValidationIncludedPointCount = Number(scoringValidation.summary?.included_point_count ?? 0);
const scoringValidationMaxSourceSampleSize = Number(scoringValidation.summary?.max_source_sample_size ?? 0);
const scoringValidationBaselineCount = Number(scoringValidation.summary?.baselines_loaded ?? 0);
const scoringValidationComparisonCount = Number(scoringValidation.summary?.comparisons_made ?? 0);
const scoringValidationReleaseHoldCount = Number(scoringValidation.summary?.active_release_hold_count ?? 0);
const metricCount = Number((forecastEvaluationProtocol.metric_suite ?? []).length);
const claimTierCount = Number((forecastEvaluationProtocol.claim_tiers ?? []).length);
const protocolStageCount = Number((forecastEvaluationProtocol.protocol_stages ?? []).length);
const acceptanceGateCount = Number((accuracyIntakeKit.acceptance_gates ?? []).length);
const inputValidationValidForecastCount = Number(accuracyInputValidation.summary?.valid_resolved_forecast_count ?? 0);
const inputValidationValidBaselineCount = Number(accuracyInputValidation.summary?.valid_baseline_count ?? 0);
const inputValidationReleaseHoldCount = Number(
  accuracyInputValidation.summary?.active_release_hold_count
  ?? accuracyInputValidation.release_holds?.length
  ?? 0
);
const inputValidationReadyForScoring = Boolean(accuracyInputValidation.summary?.ready_for_calibration_scoring)
  || accuracyInputValidation.status === 'accuracy_input_validation_passed_pending_scoring';
const leakageReviewStatus = leakageReviewValidation.status ?? 'missing';
const leakageReadyControlCount = Number(leakageReviewValidation.summary?.ready_control_count ?? 0);
const leakageRequiredControlCount = Number(leakageReviewValidation.summary?.required_control_count ?? 0);
const leakageValidForecastCount = Number(leakageReviewValidation.summary?.valid_resolved_forecast_count ?? 0);
const leakageValidBaselineCount = Number(leakageReviewValidation.summary?.valid_baseline_count ?? 0);
const leakageUnresolvedIssueTotal = Number(leakageReviewValidation.summary?.unresolved_issue_total ?? 0);
const leakageHighRiskCount = Number(leakageReviewValidation.summary?.high_or_critical_risk_count ?? 0);
const leakageReleaseHoldCount = Number(leakageReviewValidation.summary?.active_release_hold_count ?? 0);
const leakageReadyForAccuracyClaimReview = Boolean(leakageReviewValidation.summary?.ready_for_accuracy_claim_review)
  || leakageReviewStatus === 'forecast_leakage_review_validation_passed_pending_claim_review';
const leakageReviewPassed = Boolean(leakageReviewValidation.summary?.leakage_review_passed) || leakageReadyForAccuracyClaimReview;
const realResolvedOutcomeCount = scoringOutputReadyForClaimReview
  ? scoringValidationIncludedPointCount
  : 0;
const realBaselineComparisonCount = scoringOutputReadyForClaimReview
  ? scoringValidationComparisonCount
  : 0;

const currentSourceAlignment = [
  {
    source: 'ForecastBench',
    url: 'https://www.forecastbench.org/about/',
    alignment: 'Use future-event, contamination-resistant forecast capture and human comparison groups before any world-class AI forecasting claim.'
  },
  {
    source: 'ForecastBench research paper',
    url: 'https://arxiv.org/abs/2409.19839',
    alignment: 'Treat leakage avoidance and expert/human benchmark comparison as scientific evaluation requirements.'
  },
  {
    source: 'Metaculus FutureEval',
    url: 'https://www.metaculus.com/futureeval/',
    alignment: 'Continuously updated AI forecasting benchmarks compare AI forecasts with human and bot baselines over resolved real-world questions.'
  },
  {
    source: 'Metaculus FutureEval methodology',
    url: 'https://www.metaculus.com/futureeval/methodology/',
    alignment: 'Use high-quality decision-relevant questions, scoring rules, and temporal controls before market-facing AI accuracy claims.'
  },
  {
    source: 'NIST AI Risk Management Framework',
    url: 'https://www.nist.gov/itl/ai-risk-management-framework',
    alignment: 'Map forecast claims to governed measurement and managed-risk evidence, not unqualified promotional language.'
  }
];

const claimGovernanceRules = [
  {
    rule: 'world_class_hold',
    requirement: 'Do not use world-class accurate predictions language unless every world-class acceptance gate passes with real resolved outcomes, real baselines, hosted proof, and owner approval.',
    current_status: 'active_hold'
  },
  {
    rule: 'sample_fixture_boundary',
    requirement: 'Sample fixtures prove mechanics only and cannot support buyer-facing accuracy, superiority, or reliability claims.',
    current_status: sampleLedgerPointCount > 0 || sampleBenchmarkComparisonCount > 0 ? 'mechanics_present_claim_blocked' : 'missing_fixture_mechanics'
  },
  {
    rule: 'input_validation_before_scoring',
    requirement: 'Resolved forecast and baseline inputs must pass schema, timestamp, source, sample-size, placeholder, and comparability checks before calibration or benchmark scoring can support any market claim.',
    current_status: inputValidationReadyForScoring ? 'ready_for_scoring_not_claim_proof' : 'blocked_input_validation_not_ready'
  },
  {
    rule: 'scoring_output_validation',
    requirement: 'Calibration ledger and benchmark comparison outputs must pass sample-size, reliability-bin, baseline-source, input-validation, and leakage-review gates before accuracy claim review.',
    current_status: scoringOutputReadyForClaimReview ? 'ready_for_claim_review_not_world_class_proof' : 'blocked_scoring_validation_not_ready'
  },
  {
    rule: 'pre_resolution_registration',
    requirement: 'Every scored forecast must be timestamped before resolution with pre-registered outcome criteria, exclusion rules, source_id, and workflow version.',
    current_status: realResolvedOutcomeCount > 0 ? 'needs_owner_review' : 'blocked_real_data_missing'
  },
  {
    rule: 'baseline_comparability',
    requirement: 'Baseline comparisons must use the same questions and timestamps, or a documented comparable mapping with source URLs and leakage review.',
    current_status: realBaselineComparisonCount > 0 ? 'needs_owner_review' : 'blocked_real_baselines_missing'
  },
  {
    rule: 'calibration_reporting',
    requirement: 'Report Brier score, Brier skill versus baseline, reliability bins, sample size, coverage/exclusions, and caveats together.',
    current_status: protocolStageCount > 0 && metricCount > 0 ? 'protocol_ready_not_executed' : 'protocol_missing'
  },
  {
    rule: 'slice_and_failure_reporting',
    requirement: 'Report domain slices, weak slices, exclusions, leakage flags, and representative misses before broad market claims.',
    current_status: leakageReviewPassed ? 'leakage_review_ready_for_claim_review' : 'blocked_leakage_review_missing'
  },
  {
    rule: 'hosted_security_boundary',
    requirement: 'Hosted calibration and evaluation-table security proof must exist before operational buyer claims.',
    current_status: 'blocked_hosted_security_proof_missing'
  }
];

const acceptanceThresholds = [
  {
    gate: 'engineering_fixture_mechanics',
    required_evidence: 'Sample ledger, sample benchmark comparison, forecast evaluation protocol, and accuracy intake kit are generated and JSON-valid.',
    current_status: sampleLedgerPointCount > 0 && sampleBenchmarkComparisonCount > 0 && protocolStageCount > 0
      ? 'pass_mechanics_only'
      : 'partial',
    allowed_claim: 'Forecast scoring and benchmark-comparison mechanics exist locally.',
    prohibited_claim: 'The app is accurate, superior, calibrated in production, or world-class.'
  },
  {
    gate: 'scoring_output_validation',
    required_evidence: 'Forecast scoring validator passes against approved calibration ledger, benchmark comparison, input validation, and leakage review artifacts.',
    current_status: scoringOutputReadyForClaimReview ? 'ready_for_owner_claim_review' : 'blocked_scoring_validation_not_ready',
    allowed_claim: 'Scoring outputs are ready for owner claim review.',
    prohibited_claim: 'Sample scoring outputs prove prediction accuracy or benchmark superiority.'
  },
  {
    gate: 'pilot_internal_accuracy_claim',
    required_evidence: 'At least 50 owner-approved pre-resolution resolved outcomes or an owner-approved smaller pilot sample with explicit caveat; Brier score, reliability bins, coverage/exclusion report, leakage review, and comparison with trivial/internal baselines.',
    current_status: realResolvedOutcomeCount >= 50 && realBaselineComparisonCount > 0
      ? 'ready_for_owner_review'
      : 'blocked_real_data_missing',
    allowed_claim: 'Internal pilot accuracy has been measured on the named sample.',
    prohibited_claim: 'External superiority or world-class prediction accuracy.'
  },
  {
    gate: 'external_benchmark_aware_claim',
    required_evidence: 'At least 100 owner-approved resolved outcomes or a reviewer-approved benchmark sample; real human/community/pro/external baseline mapping; leakage/contamination review; confidence intervals or bootstrap caveats.',
    current_status: realResolvedOutcomeCount >= 100 && realBaselineComparisonCount > 0
      ? 'ready_for_adversarial_review'
      : 'blocked_real_benchmark_missing',
    allowed_claim: 'Compares against named external baselines on the documented sample.',
    prohibited_claim: 'Generalized best-in-world prediction claims.'
  },
  {
    gate: 'world_class_prediction_claim',
    required_evidence: 'Repeated benchmark superiority across decision-relevant domains, independent review, real comparable human/community/pro baselines, calibration reliability, hosted/RLS/security proof, and approved buyer-safe claim language.',
    current_status: 'blocked_multiple_independent_proofs_missing',
    allowed_claim: 'No world-class claim is currently allowed.',
    prohibited_claim: 'World-class accurate predictions.'
  }
];

const releaseHolds = [
  {
    hold: 'accuracy_input_validation_not_passed',
    severity: 'P1',
    status: inputValidationReadyForScoring ? 'needs_owner_review' : 'active',
    evidence_needed: 'Validated owner-approved forecast and baseline inputs with pre-resolution timestamps, resolution criteria, exclusion review, source URLs, and comparable baseline metadata.'
  },
  {
    hold: 'real_resolved_outcomes_missing',
    severity: 'P1',
    status: realResolvedOutcomeCount > 0 ? 'needs_owner_review' : 'active',
    evidence_needed: 'Owner-approved export of pre-resolution forecasts and resolved outcomes.'
  },
  {
    hold: 'real_baselines_missing',
    severity: 'P1',
    status: realBaselineComparisonCount > 0 ? 'needs_owner_review' : 'active',
    evidence_needed: 'Comparable human/community/pro/market or external baselines with source URLs and timestamps.'
  },
  {
    hold: 'leakage_review_missing',
    severity: 'P1',
    status: leakageReviewPassed ? 'needs_owner_review' : 'active',
    evidence_needed: leakageReviewPassed
      ? `${inputPaths.leakageReviewValidation} reports ${leakageReadyControlCount}/${leakageRequiredControlCount} controls ready with ${leakageUnresolvedIssueTotal} unresolved issues and ${leakageHighRiskCount} high/critical risk rows.`
      : `Adversarial leakage/contamination review for scored forecasts and baseline mapping is not ready; ${inputPaths.leakageReviewValidation} status is ${leakageReviewStatus} with ${leakageReadyControlCount}/${leakageRequiredControlCount} controls ready and ${leakageReleaseHoldCount} active validation holds.`
  },
  {
    hold: 'forecast_scoring_validation_not_passed',
    severity: 'P1',
    status: scoringOutputReadyForClaimReview ? 'needs_owner_review' : 'active',
    evidence_needed: scoringOutputReadyForClaimReview
      ? `${inputPaths.scoringValidation} reports scoring outputs ready for claim review with ${scoringValidationIncludedPointCount} included points, ${scoringValidationBaselineCount} baselines, and ${scoringValidationComparisonCount} comparisons.`
      : `Forecast scoring evidence validation is not ready; ${inputPaths.scoringValidation} status is ${scoringValidationStatus} with ${scoringValidationReleaseHoldCount} active holds.`
  },
  {
    hold: 'hosted_calibration_and_security_missing',
    severity: 'P1',
    status: 'active',
    evidence_needed: 'Hosted calibration smoke, RLS/evaluation-table proof, and redacted hosted evidence.'
  },
  {
    hold: 'claim_language_not_owner_approved',
    severity: 'P2',
    status: 'active',
    evidence_needed: 'Owner-approved claim tier and copy review before external use.'
  }
];

const requiredOwnerInputs = [
  'Approve or edit the minimum sample size and pilot caveat threshold.',
  'Provide an owner-approved resolved forecast export made before resolution.',
  'Provide real comparable baseline rows or approve a documented comparable mapping.',
  'Run accuracy input validation and clear row-level schema, timestamp, source, sample-size, placeholder, and comparability issues before scoring.',
  'Fill and pass the leakage/contamination review register for pre-resolution timestamps, source cutoffs, retrieval cutoffs, baseline comparability, benchmark contamination, training/evaluation overlap, ambiguous outcomes, and claim-tier copy boundaries.',
  'Run forecast scoring evidence validation after calibration ledger and benchmark comparison outputs are generated.',
  'Identify resolution-source URLs and exclusion rules for every scored question.',
  'Approve hosted calibration/security smoke scope before operational buyer claims.',
  'Approve the exact market language tier before outreach or buyer decks.'
];

const nextCommandsAfterOwnerData = [
  'npm run audit:accuracy:validate-inputs -- --forecast-csv <owner-approved-resolved-export.csv> --baseline-csv <owner-approved-baseline.csv> --json-output docs/launch-readiness/accuracy-evidence-input-validation-approved-<date>.json --md-output docs/launch-readiness/accuracy-evidence-input-validation-approved-<date>.md --csv-output docs/launch-readiness/accuracy-evidence-input-validation-checklist-approved-<date>.csv --min-sample-size 50',
  'npm run audit:forecast:leakage-review -- --register docs/launch-readiness/forecast-leakage-review-register-2026-06-06.csv --accuracy-input-validation docs/launch-readiness/accuracy-evidence-input-validation-2026-06-06.json --forecast-claim-governance docs/launch-readiness/forecast-claim-governance-2026-06-06.json --json-output docs/launch-readiness/forecast-leakage-review-validation-2026-06-06.json --md-output docs/launch-readiness/forecast-leakage-review-validation-2026-06-06.md --csv-output docs/launch-readiness/forecast-leakage-review-validation-checklist-2026-06-06.csv --update-evidence',
  'npm run audit:calibration:ledger -- --input <owner-approved-resolved-export.json-or-csv> --source-mode approved_export --output docs/launch-readiness/resolved-forecast-calibration-ledger-2026-06-06.json --min-sample-size 50 --bins 5',
  'npm run audit:forecast:benchmark -- --ledger docs/launch-readiness/resolved-forecast-calibration-ledger-2026-06-06.json --baseline <owner-approved-baseline.json> --output docs/launch-readiness/forecast-benchmark-comparison-2026-06-06.json',
  'npm run audit:forecast:validate-scoring -- --calibration-ledger docs/launch-readiness/resolved-forecast-calibration-ledger-2026-06-06.json --benchmark-comparison docs/launch-readiness/forecast-benchmark-comparison-2026-06-06.json --accuracy-input-validation docs/launch-readiness/accuracy-evidence-input-validation-2026-06-06.json --leakage-review-validation docs/launch-readiness/forecast-leakage-review-validation-2026-06-06.json --forecast-claim-governance docs/launch-readiness/forecast-claim-governance-2026-06-06.json --json-output docs/launch-readiness/forecast-scoring-evidence-validation-2026-06-06.json --md-output docs/launch-readiness/forecast-scoring-evidence-validation-2026-06-06.md --csv-output docs/launch-readiness/forecast-scoring-evidence-validation-checklist-2026-06-06.csv --update-evidence',
  'npm run audit:forecast:claim-governance -- --json-output docs/launch-readiness/forecast-claim-governance-2026-06-06.json --md-output docs/launch-readiness/forecast-claim-governance-2026-06-06.md --csv-output docs/launch-readiness/forecast-claim-governance-checklist-2026-06-06.csv',
  'npm run audit:commercial:confidence -- --json-output docs/launch-readiness/commercial-confidence-gate-2026-06-06.json --md-output docs/launch-readiness/commercial-confidence-gate-2026-06-06.md'
];

const checklist = acceptanceThresholds.map((threshold) => ({
  gate: threshold.gate,
  required_evidence: threshold.required_evidence,
  current_status: threshold.current_status,
  allowed_claim: threshold.allowed_claim,
  prohibited_claim: threshold.prohibited_claim
}));

const governance = {
  schema_version: 'forecast-claim-governance-v1',
  generated_at: new Date().toISOString(),
  status: 'forecast_claim_governance_ready_not_accuracy_proof',
  source: {
    calibration_readiness: inputPaths.calibrationReadiness,
    calibration_ledger: inputPaths.calibrationLedger,
    benchmark_comparison: inputPaths.benchmarkComparison,
    scoring_validation: inputPaths.scoringValidation,
    scoring_validation_status: scoringValidationStatus,
    accuracy_intake_kit: inputPaths.accuracyIntakeKit,
    accuracy_input_validation: inputPaths.accuracyInputValidation,
    accuracy_input_validation_status: accuracyInputValidation.status ?? 'missing',
    forecast_evaluation_protocol: inputPaths.forecastEvaluationProtocol,
    leakage_review_validation: inputPaths.leakageReviewValidation,
    leakage_review_validation_status: leakageReviewStatus,
    commercial_confidence_gate: inputPaths.confidenceGate,
    accuracy_dimension_status: accuracyDimension.status ?? 'unknown',
    accuracy_dimension_score_percent: Number(accuracyDimension.current_score_percent ?? 0)
  },
  proof_boundary: {
    proves: [
      'Internal claim-governance rules and acceptance thresholds are explicit.',
      'Current sample fixtures are kept separate from buyer-facing accuracy proof.',
      'World-class prediction language has active release holds until real evidence exists.'
    ],
    does_not_prove: [
      'Prediction accuracy on real buyer or production outcomes.',
      'Resolved-outcome calibration on an owner-approved export.',
      'Hosted calibration or hosted evaluation-table security.',
      'External benchmark superiority over human, community, pro, or AI baselines.',
      'Buyer acceptance, willingness to pay, or world-class prediction performance.'
    ]
  },
  summary: {
    protocol_stage_count: protocolStageCount,
    metric_count: metricCount,
    claim_tier_count: claimTierCount,
    acceptance_gate_count: acceptanceGateCount,
    input_validation_valid_forecast_count: inputValidationValidForecastCount,
    input_validation_valid_baseline_count: inputValidationValidBaselineCount,
    input_validation_release_hold_count: inputValidationReleaseHoldCount,
    input_validation_ready_for_scoring: inputValidationReadyForScoring,
    leakage_review_ready_control_count: leakageReadyControlCount,
    leakage_review_required_control_count: leakageRequiredControlCount,
    leakage_review_valid_forecast_count: leakageValidForecastCount,
    leakage_review_valid_baseline_count: leakageValidBaselineCount,
    leakage_review_unresolved_issue_total: leakageUnresolvedIssueTotal,
    leakage_review_high_or_critical_risk_count: leakageHighRiskCount,
    leakage_review_release_hold_count: leakageReleaseHoldCount,
    leakage_review_ready_for_accuracy_claim_review: leakageReadyForAccuracyClaimReview,
    leakage_review_passed: leakageReviewPassed,
    scoring_validation_included_point_count: scoringValidationIncludedPointCount,
    scoring_validation_max_source_sample_size: scoringValidationMaxSourceSampleSize,
    scoring_validation_baseline_count: scoringValidationBaselineCount,
    scoring_validation_comparison_count: scoringValidationComparisonCount,
    scoring_validation_release_hold_count: scoringValidationReleaseHoldCount,
    scoring_output_ready_for_claim_review: scoringOutputReadyForClaimReview,
    governance_acceptance_threshold_count: acceptanceThresholds.length,
    current_accuracy_score_percent: Number(accuracyDimension.current_score_percent ?? 0),
    real_resolved_outcome_count: realResolvedOutcomeCount,
    real_baseline_comparison_count: realBaselineComparisonCount,
    sample_ledger_point_count: sampleLedgerPointCount,
    sample_benchmark_comparison_count: sampleBenchmarkComparisonCount,
    release_hold_count: releaseHolds.filter((hold) => hold.status === 'active').length,
    approved_world_class_claim: false
  },
  current_source_alignment: currentSourceAlignment,
  claim_governance_rules: claimGovernanceRules,
  acceptance_thresholds: acceptanceThresholds,
  release_holds: releaseHolds,
  required_owner_inputs: requiredOwnerInputs,
  next_commands_after_owner_data: nextCommandsAfterOwnerData,
  checklist
};

function renderMarkdown(report) {
  const thresholdRows = report.acceptance_thresholds
    .map((threshold) => [
      mdCell(threshold.gate),
      mdCell(threshold.current_status),
      mdCell(threshold.allowed_claim),
      mdCell(threshold.prohibited_claim)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const holdRows = report.release_holds
    .map((hold) => [
      mdCell(hold.hold),
      mdCell(hold.severity),
      mdCell(hold.status),
      mdCell(hold.evidence_needed)
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

  return `# Forecast Claim Governance - 2026-06-06

## Decision

Status: \`${report.status}\`.

This artifact makes prediction-accuracy claim rules explicit. It does not prove prediction accuracy, hosted calibration, external benchmark superiority, buyer acceptance, or world-class forecasting performance.

Current accuracy proof score remains **${report.summary.current_accuracy_score_percent}%**. Real resolved outcomes attached here: **${report.summary.real_resolved_outcome_count}**. Real baseline comparisons attached here: **${report.summary.real_baseline_comparison_count}**.

Input validation status: **${report.source.accuracy_input_validation_status}** with **${report.summary.input_validation_valid_forecast_count}** valid resolved forecast rows, **${report.summary.input_validation_valid_baseline_count}** valid baseline rows, and ready-for-scoring **${report.summary.input_validation_ready_for_scoring}**.

Leakage review status: **${report.source.leakage_review_validation_status}** with **${report.summary.leakage_review_ready_control_count}/${report.summary.leakage_review_required_control_count}** controls ready, **${report.summary.leakage_review_unresolved_issue_total}** unresolved issues, **${report.summary.leakage_review_high_or_critical_risk_count}** high/critical risk rows, and ready-for-accuracy-claim-review **${report.summary.leakage_review_ready_for_accuracy_claim_review}**.

Allowed current claim: **Forecast scoring and benchmark-comparison mechanics exist locally, with sample fixtures only.**

Prohibited current claim: **World-class accurate predictions.**

## Acceptance Thresholds

| Gate | Current Status | Allowed Claim | Prohibited Claim |
|---|---|---|---|
${thresholdRows}

## Release Holds

| Hold | Severity | Status | Evidence Needed |
|---|---|---|---|
${holdRows}

## Current Source Alignment

| Source | URL | Alignment |
|---|---|---|
${sourceRows}

## Required Owner Inputs

${report.required_owner_inputs.map((input, index) => `${index + 1}. ${input}`).join('\n')}

## Next Commands After Owner Data

${report.next_commands_after_owner_data.map((command, index) => `${index + 1}. \`${command}\``).join('\n')}

## Proof Boundary

This is an internal governance and release-hold artifact. It is buyer-useful for showing discipline, but it is not buyer-facing proof of accuracy until real resolved outcomes, real baselines, leakage review, hosted proof, and owner-approved claim language are attached.
`;
}

function renderCsv(report) {
  return [
    csvLine(['gate', 'required_evidence', 'current_status', 'allowed_claim', 'prohibited_claim']),
    ...report.checklist.map((row) => csvLine([
      row.gate,
      row.required_evidence,
      row.current_status,
      row.allowed_claim,
      row.prohibited_claim
    ]))
  ].join('\n') + '\n';
}

if (outputPaths.json) {
  writeArtifact(outputPaths.json, `${JSON.stringify(governance, null, 2)}\n`);
}

if (outputPaths.md) {
  writeArtifact(outputPaths.md, renderMarkdown(governance));
}

if (outputPaths.csv) {
  writeArtifact(outputPaths.csv, renderCsv(governance));
}

console.log(JSON.stringify({
  json_output: outputPaths.json,
  md_output: outputPaths.md,
  csv_output: outputPaths.csv,
  status: governance.status,
  current_accuracy_score_percent: governance.summary.current_accuracy_score_percent,
  real_resolved_outcome_count: governance.summary.real_resolved_outcome_count,
  real_baseline_comparison_count: governance.summary.real_baseline_comparison_count,
  release_hold_count: governance.summary.release_hold_count
}, null, 2));
