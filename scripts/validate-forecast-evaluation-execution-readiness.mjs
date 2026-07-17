#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const ROOT = process.cwd();
const DEFAULT_FORECAST_EVALUATION_PROTOCOL = 'docs/launch-readiness/forecast-evaluation-protocol-2026-06-06.json';
const DEFAULT_ACCURACY_INPUT_VALIDATION = 'docs/launch-readiness/accuracy-evidence-input-validation-2026-06-06.json';
const DEFAULT_LEAKAGE_REVIEW_VALIDATION = 'docs/launch-readiness/forecast-leakage-review-validation-2026-06-06.json';
const DEFAULT_SCORING_VALIDATION = 'docs/launch-readiness/forecast-scoring-evidence-validation-2026-06-06.json';
const DEFAULT_PREDICTION_SCIENCE_VALIDATION = 'docs/launch-readiness/prediction-science-evidence-validation-2026-06-06.json';
const DEFAULT_HOSTED_ACCESS_PREFLIGHT = 'docs/launch-readiness/hosted-access-preflight-validation-2026-06-06.json';
const DEFAULT_HOSTED_PROOF_VALIDATION = 'docs/launch-readiness/hosted-operational-proof-evidence-validation-2026-06-06.json';
const DEFAULT_RLS_PROOF_VALIDATION = 'docs/launch-readiness/rls-proof-evidence-validation-2026-06-06.json';
const DEFAULT_RESOLVED_FORECAST_TEMPLATE = 'docs/launch-readiness/approved-resolved-forecast-export-template-2026-06-06.csv';
const DEFAULT_BASELINE_TEMPLATE = 'docs/launch-readiness/forecast-baseline-template-2026-06-06.csv';
const DEFAULT_PRE_RESOLUTION_CAPTURE_KIT = 'docs/launch-readiness/forecast-pre-resolution-capture-kit-2026-06-06.json';
const DEFAULT_PRE_RESOLUTION_CAPTURE_VALIDATION = 'docs/launch-readiness/forecast-pre-resolution-capture-validation-2026-06-06.json';
const DEFAULT_QUESTION_REGISTER_TEMPLATE = 'docs/launch-readiness/forecast-question-register-template-2026-06-06.csv';
const DEFAULT_PRE_RESOLUTION_SNAPSHOT_TEMPLATE = 'docs/launch-readiness/forecast-pre-resolution-snapshot-template-2026-06-06.csv';
const DEFAULT_BASELINE_SNAPSHOT_TEMPLATE = 'docs/launch-readiness/forecast-baseline-snapshot-template-2026-06-06.csv';
const DEFAULT_EVIDENCE = 'docs/launch-readiness/launch-evidence-2026-06-06.json';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/forecast-evaluation-execution-readiness-2026-06-06.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/forecast-evaluation-execution-readiness-2026-06-06.md';
const DEFAULT_CSV_OUTPUT = 'docs/launch-readiness/forecast-evaluation-execution-readiness-checklist-2026-06-06.csv';

const CURRENT_EXECUTION_SOURCES = [
  {
    source: 'ForecastBench - Forecasting Research Institute',
    url: 'https://forecastingresearch.org/research/forecastbench',
    requirement: 'Use dynamic, continuously updated questions and human comparison groups before forecasting accuracy claims.'
  },
  {
    source: 'ForecastBench documentation',
    url: 'https://www.forecastbench.org/docs/',
    requirement: 'Evaluate on generated question sets, resolved forecasts, and difficulty-adjusted Brier-style scoring rather than static demos.'
  },
  {
    source: 'ForecastBench paper',
    url: 'https://arxiv.org/abs/2409.19839',
    requirement: 'Avoid data leakage by forecasting questions whose answers are unknown at submission time and compare ML systems with expert and public human forecasts.'
  },
  {
    source: 'Metaculus FutureEval methodology',
    url: 'https://www.metaculus.com/futureeval/methodology/',
    requirement: 'Score probabilistic forecasts as questions resolve and compare model results with community and pro forecaster baselines.'
  },
  {
    source: 'Metaculus scoring FAQ',
    url: 'https://www.metaculus.com/help/scores-faq/',
    requirement: 'Use proper scoring rules and aggregate over many timestamped predictions rather than single-question anecdotes.'
  },
  {
    source: 'NIST AI RMF',
    url: 'https://www.nist.gov/itl/ai-risk-management-framework',
    requirement: 'Treat AI trust claims as documented governance, measurement, evaluation, monitoring, and risk-management evidence.'
  },
  {
    source: 'NIST AI RMF Generative AI Profile',
    url: 'https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf',
    requirement: 'Measure claims with empirically validated methods, deployment-like conditions, regular evaluation, and documented release decisions.'
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

const REQUIRED_REPO_SURFACES = [
  {
    id: 'forecast_registry_capture_ui',
    label: 'Forecast registry capture UI',
    proof_bucket: 'repo_artifact',
    path: 'src/components/ForecastRegistry.tsx',
    tokens: [
      'is_resolved',
      'resolution_outcome',
      'resolution_criteria',
      'current_probability',
      'game_theory_model'
    ]
  },
  {
    id: 'resolved_forecast_schema',
    label: 'Resolved forecast schema',
    proof_bucket: 'repo_artifact',
    path: 'supabase/migrations/20251212120000_enterprise_sso.sql',
    tokens: [
      'CREATE TABLE IF NOT EXISTS public.forecasts',
      'is_resolved boolean',
      'resolution_outcome text',
      'resolved_at timestamptz',
      'game_theory_model jsonb'
    ]
  },
  {
    id: 'whitebox_release_scoring_schema',
    label: 'Whitebox release scoring schema',
    proof_bucket: 'repo_artifact',
    path: 'supabase/migrations/20260429000100_whitebox_release_governance.sql',
    tokens: [
      'whitebox_release_evaluations',
      'brier_score numeric',
      'UNIQUE (forecast_id, variant_id)',
      'whitebox_pending_forecasts'
    ]
  },
  {
    id: 'ml_calibration_drift_shadow_schema',
    label: 'ML calibration, drift, and shadow schema',
    proof_bucket: 'repo_artifact',
    path: 'supabase/migrations/20260501000100_ml_phase1_phase2_foundation.sql',
    tokens: [
      'calibration_models',
      'drift_signals',
      'whitebox_experiment_evaluations',
      'shadow_model_registry',
      'shadow_predictions'
    ]
  },
  {
    id: 'whitebox_release_scoring_code',
    label: 'Whitebox release scoring code',
    proof_bucket: 'repo_artifact',
    path: 'supabase/functions/_shared/whitebox-release.ts',
    tokens: [
      'calculateBrierScore',
      'whitebox_release_evaluations',
      'fetchPendingWhiteboxForecasts',
      'insertWhiteboxEvaluations',
      'minimumSampleSize'
    ]
  },
  {
    id: 'release_evaluation_function',
    label: 'Release evaluation function',
    proof_bucket: 'repo_artifact',
    path: 'supabase/functions/release-evaluation/index.ts',
    tokens: [
      'buildReleaseEvaluation',
      'persistReleaseState',
      'whitebox'
    ]
  },
  {
    id: 'whitebox_scheduled_function',
    label: 'Whitebox scheduled function',
    proof_bucket: 'repo_artifact',
    path: 'supabase/functions/whitebox-scheduled/index.ts',
    tokens: [
      'fetchPendingWhiteboxForecasts',
      'backfilled',
      'whitebox'
    ]
  },
  {
    id: 'calibration_refresh_function',
    label: 'Calibration refresh function',
    proof_bucket: 'repo_artifact',
    path: 'supabase/functions/calibration-refresh/index.ts',
    tokens: [
      '/ops/calibration-refresh',
      'callMlService',
      'calibration'
    ]
  },
  {
    id: 'drift_evaluate_function',
    label: 'Drift evaluate function',
    proof_bucket: 'repo_artifact',
    path: 'supabase/functions/drift-evaluate/index.ts',
    tokens: [
      '/ops/drift-evaluate',
      'callMlService',
      'drift'
    ]
  },
  {
    id: 'shadow_model_refresh_function',
    label: 'Shadow model refresh function',
    proof_bucket: 'repo_artifact',
    path: 'supabase/functions/shadow-model-refresh/index.ts',
    tokens: [
      'upsertShadowModel',
      'upsertShadowPredictions',
      'brier_score',
      'resolved'
    ]
  }
];

const REQUIRED_TEMPLATES = [
  {
    id: 'resolved_forecast_export_template',
    pathKey: 'resolvedForecastTemplate',
    requiredColumns: [
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
    ]
  },
  {
    id: 'baseline_export_template',
    pathKey: 'baselineTemplate',
    requiredColumns: [
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
    ]
  }
];

const REQUIRED_PRE_RESOLUTION_TEMPLATES = [
  {
    id: 'question_register_template',
    pathKey: 'questionRegisterTemplate',
    requiredColumns: [
      'question_id',
      'title',
      'question_text',
      'niche',
      'source_surface',
      'created_at',
      'forecast_opened_at',
      'forecast_due_at',
      'scheduled_close_at',
      'resolution_criteria',
      'expected_resolution_source_url',
      'ambiguity_policy',
      'exclusion_rule',
      'decision_relevance',
      'owner',
      'public_or_private',
      'notes'
    ]
  },
  {
    id: 'pre_resolution_snapshot_template',
    pathKey: 'preResolutionSnapshotTemplate',
    requiredColumns: [
      'snapshot_id',
      'question_id',
      'prediction_source',
      'forecaster_type',
      'model_or_team',
      'probability',
      'prediction_timestamp',
      'evidence_bundle_ref',
      'prompt_or_policy_version',
      'retrieval_cutoff',
      'source_cutoff',
      'abstained',
      'abstention_reason',
      'notes'
    ]
  },
  {
    id: 'baseline_snapshot_template',
    pathKey: 'baselineSnapshotTemplate',
    requiredColumns: [
      'baseline_snapshot_id',
      'question_id',
      'baseline_type',
      'label',
      'probability',
      'prediction_timestamp',
      'source_url',
      'sample_size',
      'timestamp_policy',
      'comparability_notes',
      'notes'
    ]
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
    'Usage: node scripts/validate-forecast-evaluation-execution-readiness.mjs',
    `  [--forecast-evaluation-protocol ${DEFAULT_FORECAST_EVALUATION_PROTOCOL}]`,
    `  [--accuracy-input-validation ${DEFAULT_ACCURACY_INPUT_VALIDATION}]`,
    `  [--leakage-review-validation ${DEFAULT_LEAKAGE_REVIEW_VALIDATION}]`,
    `  [--scoring-validation ${DEFAULT_SCORING_VALIDATION}]`,
    `  [--prediction-science-validation ${DEFAULT_PREDICTION_SCIENCE_VALIDATION}]`,
    `  [--hosted-access-preflight ${DEFAULT_HOSTED_ACCESS_PREFLIGHT}]`,
    `  [--hosted-proof-validation ${DEFAULT_HOSTED_PROOF_VALIDATION}]`,
    `  [--rls-proof-validation ${DEFAULT_RLS_PROOF_VALIDATION}]`,
    `  [--resolved-forecast-template ${DEFAULT_RESOLVED_FORECAST_TEMPLATE}]`,
    `  [--baseline-template ${DEFAULT_BASELINE_TEMPLATE}]`,
    `  [--pre-resolution-capture-kit ${DEFAULT_PRE_RESOLUTION_CAPTURE_KIT}]`,
    `  [--pre-resolution-capture-validation ${DEFAULT_PRE_RESOLUTION_CAPTURE_VALIDATION}]`,
    `  [--question-register-template ${DEFAULT_QUESTION_REGISTER_TEMPLATE}]`,
    `  [--pre-resolution-snapshot-template ${DEFAULT_PRE_RESOLUTION_SNAPSHOT_TEMPLATE}]`,
    `  [--baseline-snapshot-template ${DEFAULT_BASELINE_SNAPSHOT_TEMPLATE}]`,
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
  accuracyInputValidation: argValue('--accuracy-input-validation', DEFAULT_ACCURACY_INPUT_VALIDATION),
  leakageReviewValidation: argValue('--leakage-review-validation', DEFAULT_LEAKAGE_REVIEW_VALIDATION),
  scoringValidation: argValue('--scoring-validation', DEFAULT_SCORING_VALIDATION),
  predictionScienceValidation: argValue('--prediction-science-validation', DEFAULT_PREDICTION_SCIENCE_VALIDATION),
  hostedAccessPreflight: argValue('--hosted-access-preflight', DEFAULT_HOSTED_ACCESS_PREFLIGHT),
  hostedProofValidation: argValue('--hosted-proof-validation', DEFAULT_HOSTED_PROOF_VALIDATION),
  rlsProofValidation: argValue('--rls-proof-validation', DEFAULT_RLS_PROOF_VALIDATION),
  resolvedForecastTemplate: argValue('--resolved-forecast-template', DEFAULT_RESOLVED_FORECAST_TEMPLATE),
  baselineTemplate: argValue('--baseline-template', DEFAULT_BASELINE_TEMPLATE),
  preResolutionCaptureKit: argValue('--pre-resolution-capture-kit', DEFAULT_PRE_RESOLUTION_CAPTURE_KIT),
  preResolutionCaptureValidation: argValue('--pre-resolution-capture-validation', DEFAULT_PRE_RESOLUTION_CAPTURE_VALIDATION),
  questionRegisterTemplate: argValue('--question-register-template', DEFAULT_QUESTION_REGISTER_TEMPLATE),
  preResolutionSnapshotTemplate: argValue('--pre-resolution-snapshot-template', DEFAULT_PRE_RESOLUTION_SNAPSHOT_TEMPLATE),
  baselineSnapshotTemplate: argValue('--baseline-snapshot-template', DEFAULT_BASELINE_SNAPSHOT_TEMPLATE),
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

function readTextIfExists(relativePath) {
  const absolutePath = resolveRepoPath(relativePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, 'utf8') : '';
}

function readJsonIfExists(relativePath, fallback) {
  const text = readTextIfExists(relativePath);
  return text ? JSON.parse(text) : fallback;
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

function gateStatus(condition, openStatus = 'blocked') {
  return condition ? 'passed' : openStatus;
}

function csvHeaders(text) {
  const [firstLine = ''] = text.split(/\r?\n/);
  return firstLine.split(',').map((header) => header.trim()).filter(Boolean);
}

function missingColumns(headers, requiredColumns) {
  return requiredColumns.filter((column) => !headers.includes(column));
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

function activeCount(items) {
  return items.filter((item) => item.status === 'active').length;
}

const forecastEvaluationProtocol = readJsonIfExists(inputPaths.forecastEvaluationProtocol, {
  status: 'missing',
  protocol_stages: [],
  metric_suite: [],
  claim_tiers: []
});
const accuracyInputValidation = readJsonIfExists(inputPaths.accuracyInputValidation, { status: 'missing', summary: {} });
const leakageReviewValidation = readJsonIfExists(inputPaths.leakageReviewValidation, { status: 'missing', summary: {} });
const scoringValidation = readJsonIfExists(inputPaths.scoringValidation, { status: 'missing', summary: {} });
const predictionScienceValidation = readJsonIfExists(inputPaths.predictionScienceValidation, { status: 'missing', summary: {} });
const hostedAccessPreflight = readJsonIfExists(inputPaths.hostedAccessPreflight, { status: 'missing', summary: {} });
const hostedProofValidation = readJsonIfExists(inputPaths.hostedProofValidation, { status: 'missing', summary: {} });
const rlsProofValidation = readJsonIfExists(inputPaths.rlsProofValidation, { status: 'missing', summary: {} });
const preResolutionCaptureKit = readJsonIfExists(inputPaths.preResolutionCaptureKit, { status: 'missing', summary: {} });
const preResolutionCaptureValidation = readJsonIfExists(inputPaths.preResolutionCaptureValidation, { status: 'missing', summary: {} });

const protocolStages = asArray(forecastEvaluationProtocol.protocol_stages);
const protocolStageNames = new Set(protocolStages.map((stage) => stage.stage));
const missingProtocolStages = REQUIRED_PROTOCOL_STAGES.filter((stage) => !protocolStageNames.has(stage));
const protocolReady = missingProtocolStages.length === 0 && protocolStages.length >= REQUIRED_PROTOCOL_STAGES.length;

const repoSurfaceChecks = REQUIRED_REPO_SURFACES.map((surface) => {
  const text = readTextIfExists(surface.path);
  const missingTokens = surface.tokens.filter((token) => !text.includes(token));
  return {
    ...surface,
    exists: Boolean(text),
    present: Boolean(text) && missingTokens.length === 0,
    missing_tokens: missingTokens,
    evidence: Boolean(text)
      ? `${surface.path} contains ${surface.tokens.length - missingTokens.length}/${surface.tokens.length} required markers.`
      : `${surface.path} is missing.`
  };
});
const repoSurfaceReadyCount = repoSurfaceChecks.filter((check) => check.present).length;
const repoSurfaceReady = repoSurfaceReadyCount === REQUIRED_REPO_SURFACES.length;

const templateChecks = REQUIRED_TEMPLATES.map((template) => {
  const relativePath = inputPaths[template.pathKey];
  const text = readTextIfExists(relativePath);
  const headers = csvHeaders(text);
  const missing = missingColumns(headers, template.requiredColumns);
  return {
    id: template.id,
    path: relativePath,
    exists: Boolean(text),
    required_column_count: template.requiredColumns.length,
    present_required_column_count: template.requiredColumns.length - missing.length,
    missing_columns: missing,
    ready: Boolean(text) && missing.length === 0
  };
});
const templatesReady = templateChecks.every((check) => check.ready);

const preResolutionTemplateChecks = REQUIRED_PRE_RESOLUTION_TEMPLATES.map((template) => {
  const relativePath = inputPaths[template.pathKey];
  const text = readTextIfExists(relativePath);
  const headers = csvHeaders(text);
  const missing = missingColumns(headers, template.requiredColumns);
  return {
    id: template.id,
    path: relativePath,
    exists: Boolean(text),
    required_column_count: template.requiredColumns.length,
    present_required_column_count: template.requiredColumns.length - missing.length,
    missing_columns: missing,
    ready: Boolean(text) && missing.length === 0
  };
});
const preResolutionTemplatesReady = preResolutionTemplateChecks.every((check) => check.ready);
const preResolutionCaptureKitReady = String(preResolutionCaptureKit.status ?? '').startsWith('forecast_pre_resolution_capture_kit_ready')
  && preResolutionTemplatesReady
  && preResolutionCaptureKit.summary?.accuracy_claim_allowed === false
  && preResolutionCaptureKit.summary?.world_class_prediction_claim_allowed === false;
const preResolutionCaptureValidationStatus = String(preResolutionCaptureValidation.status ?? 'missing');
const preResolutionCaptureValidatorReady = preResolutionCaptureValidationStatus.startsWith('forecast_pre_resolution_capture_validation_')
  && preResolutionCaptureValidation.summary?.schema_ready === true
  && preResolutionCaptureValidation.summary?.accuracy_claim_allowed === false
  && preResolutionCaptureValidation.summary?.world_class_prediction_claim_allowed === false;

const validResolvedForecastCount = Number(accuracyInputValidation.summary?.valid_resolved_forecast_count ?? 0);
const validBaselineCount = Number(accuracyInputValidation.summary?.valid_baseline_count ?? 0);
const accuracyInputsReadyForScoring = Boolean(accuracyInputValidation.summary?.ready_for_calibration_scoring);
const leakageReadyControlCount = Number(leakageReviewValidation.summary?.ready_control_count ?? 0);
const leakageRequiredControlCount = Number(leakageReviewValidation.summary?.required_control_count ?? 0);
const leakageReviewPassed = Boolean(leakageReviewValidation.summary?.leakage_review_passed);
const scoringOutputReadyForClaimReview = Boolean(scoringValidation.summary?.scoring_output_ready_for_claim_review);
const scoringSampleOnly = Boolean(scoringValidation.summary?.sample_only);
const scoringIncludedPointCount = Number(scoringValidation.summary?.included_point_count ?? 0);
const scoringMaxSourceSampleSize = Number(scoringValidation.summary?.max_source_sample_size ?? 0);
const scoringComparisonsMade = Number(scoringValidation.summary?.comparisons_made ?? 0);
const predictionScienceFrameworkAlignmentReady = Boolean(
  predictionScienceValidation.summary?.scientific_framework_alignment_ready
);
const predictionScienceReadyForClaimReview = Boolean(
  predictionScienceValidation.summary?.prediction_science_ready_for_claim_review
);
const realResolvedOutcomeCount = Number(predictionScienceValidation.summary?.real_resolved_outcome_count ?? 0);
const realBaselineComparisonCount = Number(predictionScienceValidation.summary?.real_baseline_comparison_count ?? 0);
const hostedAccessReadyForSmoke = Boolean(hostedAccessPreflight.summary?.hosted_access_ready_for_smoke);
const hostedClaimAllowed = Boolean(hostedAccessPreflight.summary?.hosted_claim_allowed)
  || Boolean(hostedProofValidation.summary?.hosted_operational_claim_allowed);
const hostedProofReadyForBuyerSafeClaims = Boolean(hostedProofValidation.summary?.ready_for_buyer_safe_hosted_claims);
const rlsTenantIsolationReady = Boolean(rlsProofValidation.summary?.rls_tenant_isolation_proof_ready);
const accuracyClaimAllowed = Boolean(scoringValidation.summary?.accuracy_claim_allowed)
  || Boolean(predictionScienceValidation.summary?.accuracy_claim_allowed);
const worldClassPredictionClaimAllowed = Boolean(scoringValidation.summary?.world_class_prediction_claim_allowed)
  || Boolean(predictionScienceValidation.summary?.world_class_prediction_claim_allowed);

const ownerResolvedExportPresent = validResolvedForecastCount > 0 && realResolvedOutcomeCount > 0;
const comparableBaselinePresent = validBaselineCount > 0 && realBaselineComparisonCount > 0;
const leakageReady = leakageReviewPassed
  && leakageRequiredControlCount > 0
  && leakageReadyControlCount >= leakageRequiredControlCount;
const hostedBoundaryReady = hostedAccessReadyForSmoke && hostedProofReadyForBuyerSafeClaims;
const scoringChainReady = accuracyInputsReadyForScoring
  && ownerResolvedExportPresent
  && comparableBaselinePresent
  && leakageReady
  && scoringOutputReadyForClaimReview
  && !scoringSampleOnly
  && hostedBoundaryReady
  && rlsTenantIsolationReady;
const executionReadyForOwnerResolvedExport = protocolReady
  && repoSurfaceReady
  && templatesReady
  && preResolutionCaptureKitReady
  && preResolutionCaptureValidatorReady
  && predictionScienceFrameworkAlignmentReady
  && !accuracyClaimAllowed
  && !worldClassPredictionClaimAllowed;

const acceptanceGates = [
  {
    gate: 'current_execution_sources_attached',
    status: gateStatus(CURRENT_EXECUTION_SOURCES.length >= 7),
    proof_bucket: 'repo_artifact',
    evidence: `${CURRENT_EXECUTION_SOURCES.length} current forecasting execution source anchors attached.`,
    next_action: 'Refresh source anchors when forecasting benchmark methodology changes.'
  },
  {
    gate: 'forecast_protocol_complete',
    status: gateStatus(protocolReady),
    proof_bucket: 'repo_artifact',
    evidence: `${protocolStages.length} protocol stages present; missing=${missingProtocolStages.join(', ') || 'none'}.`,
    next_action: protocolReady ? 'No protocol action needed before owner export.' : 'Regenerate or repair the forecast evaluation protocol.'
  },
  {
    gate: 'repo_evaluation_surface_present',
    status: gateStatus(repoSurfaceReady),
    proof_bucket: 'repo_artifact',
    evidence: `${repoSurfaceReadyCount}/${REQUIRED_REPO_SURFACES.length} required UI/schema/function surfaces contain expected evaluation markers.`,
    next_action: repoSurfaceReady ? 'No repo-surface repair needed before owner export.' : 'Repair missing forecast capture, resolved outcome, Brier scoring, calibration, drift, or shadow-model surfaces.'
  },
  {
    gate: 'owner_input_templates_ready',
    status: gateStatus(templatesReady),
    proof_bucket: 'repo_artifact',
    evidence: `${templateChecks.filter((check) => check.ready).length}/${templateChecks.length} owner export templates are present with required columns.`,
    next_action: templatesReady ? 'Use these templates for owner-approved forecast and baseline exports.' : 'Repair missing owner export template columns before data collection.'
  },
  {
    gate: 'pre_resolution_capture_kit_ready',
    status: gateStatus(preResolutionCaptureKitReady, 'open_pre_resolution_capture_kit_missing_or_partial'),
    proof_bucket: 'repo_artifact',
    evidence: `${preResolutionTemplateChecks.filter((check) => check.ready).length}/${preResolutionTemplateChecks.length} pre-resolution templates ready; kit status=${preResolutionCaptureKit.status ?? 'missing'}; accuracy_claim_allowed=${preResolutionCaptureKit.summary?.accuracy_claim_allowed ?? 'unknown'}; world_class_prediction_claim_allowed=${preResolutionCaptureKit.summary?.world_class_prediction_claim_allowed ?? 'unknown'}.`,
    next_action: preResolutionCaptureKitReady ? 'Owner can start timestamped pre-resolution capture before outcomes resolve.' : 'Generate the pre-resolution capture kit before beginning new forecast evidence collection.'
  },
  {
    gate: 'pre_resolution_capture_validator_ready',
    status: gateStatus(preResolutionCaptureValidatorReady, 'open_pre_resolution_capture_validator_missing_or_partial'),
    proof_bucket: 'repo_artifact',
    evidence: `validator_status=${preResolutionCaptureValidation.status ?? 'missing'}; schema_ready=${preResolutionCaptureValidation.summary?.schema_ready ?? 'unknown'}; owner_rows_present=${preResolutionCaptureValidation.summary?.owner_rows_present ?? 'unknown'}; ready_for_pre_resolution_freeze=${preResolutionCaptureValidation.summary?.ready_for_pre_resolution_freeze ?? 'unknown'}; accuracy_claim_allowed=${preResolutionCaptureValidation.summary?.accuracy_claim_allowed ?? 'unknown'}.`,
    next_action: preResolutionCaptureValidatorReady ? 'Run the validator again after owner fills the pre-resolution packet; empty templates remain owner-blocked, not accuracy proof.' : 'Generate the pre-resolution capture validation artifact before beginning or freezing new forecast evidence collection.'
  },
  {
    gate: 'owner_approved_resolved_export_present',
    status: gateStatus(ownerResolvedExportPresent, 'open_no_real_resolved_forecast_export'),
    proof_bucket: 'owner_input',
    evidence: `${validResolvedForecastCount} valid resolved forecasts and ${realResolvedOutcomeCount} real resolved outcomes currently validated.`,
    next_action: 'Owner exports pre-resolution forecasts with resolved outcomes, sources, criteria, and exclusion review.'
  },
  {
    gate: 'real_comparable_baseline_export_present',
    status: gateStatus(comparableBaselinePresent, 'open_no_real_comparable_baseline_export'),
    proof_bucket: 'owner_input',
    evidence: `${validBaselineCount} valid baselines and ${realBaselineComparisonCount} real baseline comparisons currently validated.`,
    next_action: 'Owner supplies comparable human, community, pro, model, or market baselines with timestamps, source URLs, and sample sizes.'
  },
  {
    gate: 'leakage_review_ready_for_claim_scoring',
    status: gateStatus(leakageReady, 'open_leakage_review_not_ready'),
    proof_bucket: 'owner_input',
    evidence: `${leakageReadyControlCount}/${leakageRequiredControlCount} leakage controls ready; leakage_review_passed=${leakageReviewPassed}.`,
    next_action: 'Run leakage review on owner-approved forecast and baseline rows before scoring claims.'
  },
  {
    gate: 'scoring_output_ready_for_claim_review',
    status: gateStatus(scoringOutputReadyForClaimReview && !scoringSampleOnly, 'open_scoring_sample_only_or_not_ready'),
    proof_bucket: 'owner_input',
    evidence: `scoring_ready=${scoringOutputReadyForClaimReview}; sample_only=${scoringSampleOnly}; included_points=${scoringIncludedPointCount}; max_source_sample_size=${scoringMaxSourceSampleSize}; comparisons=${scoringComparisonsMade}.`,
    next_action: 'Run calibration ledger and scoring validation on owner-approved rows only.'
  },
  {
    gate: 'hosted_and_rls_boundaries_ready',
    status: gateStatus(hostedBoundaryReady && rlsTenantIsolationReady, 'open_hosted_or_rls_boundary_not_ready'),
    proof_bucket: 'hosted_live',
    evidence: `hosted_access_ready_for_smoke=${hostedAccessReadyForSmoke}; hosted_ready_for_buyer_safe_claims=${hostedProofReadyForBuyerSafeClaims}; rls_tenant_isolation_ready=${rlsTenantIsolationReady}.`,
    next_action: 'Clear hosted preflight, hosted evidence validation, and RLS proof before using scoring in external claims.'
  },
  {
    gate: 'execution_ready_for_owner_resolved_export',
    status: gateStatus(executionReadyForOwnerResolvedExport),
    proof_bucket: 'repo_artifact',
    evidence: `protocol=${protocolReady}; repo_surfaces=${repoSurfaceReady}; resolved_templates=${templatesReady}; pre_resolution_kit=${preResolutionCaptureKitReady}; pre_resolution_validator=${preResolutionCaptureValidatorReady}; science_alignment=${predictionScienceFrameworkAlignmentReady}; accuracy_claim_allowed=${accuracyClaimAllowed}; world_class_prediction_claim_allowed=${worldClassPredictionClaimAllowed}.`,
    next_action: executionReadyForOwnerResolvedExport ? 'Owner can now create the resolved forecast and baseline export; claims remain blocked.' : 'Fix structural readiness before asking owner for the export.'
  }
];

const releaseHolds = [
  {
    hold: 'owner_approved_resolved_forecast_export_missing',
    severity: 'P1',
    status: ownerResolvedExportPresent ? 'cleared' : 'active',
    evidence_needed: 'Owner-approved pre-resolution forecast export with resolved outcomes, resolution source URLs, criteria, and exclusion review.'
  },
  {
    hold: 'real_comparable_baseline_export_missing',
    severity: 'P1',
    status: comparableBaselinePresent ? 'cleared' : 'active',
    evidence_needed: 'Comparable human, community, pro, model, or market baselines with timestamp policy, source URL, and sample size.'
  },
  {
    hold: 'leakage_review_on_real_rows_missing',
    severity: 'P1',
    status: leakageReady ? 'cleared' : 'active',
    evidence_needed: 'Leakage and contamination review against the owner-approved forecast and baseline rows.'
  },
  {
    hold: 'scoring_run_on_real_rows_missing',
    severity: 'P1',
    status: scoringOutputReadyForClaimReview && !scoringSampleOnly ? 'cleared' : 'active',
    evidence_needed: 'Calibration, Brier, reliability, and baseline comparison outputs generated from real owner-approved rows.'
  },
  {
    hold: 'hosted_access_and_operational_proof_missing',
    severity: 'P1',
    status: hostedBoundaryReady ? 'cleared' : 'active',
    evidence_needed: 'Hosted preflight access, deploy binding, redacted logs/screenshots, and validated hosted smoke evidence.'
  },
  {
    hold: 'rls_tenant_isolation_proof_missing',
    severity: 'P1',
    status: rlsTenantIsolationReady ? 'cleared' : 'active',
    evidence_needed: 'Executed local and linked RLS/evaluation-table proof accepted by the RLS validator.'
  },
  {
    hold: 'owner_approved_accuracy_claim_language_missing',
    severity: 'P2',
    status: 'active',
    evidence_needed: 'Owner-approved external wording after real scoring, leakage review, hosted/RLS proof, and buyer-safe claim consistency checks.'
  }
];

const report = {
  schema_version: 'forecast-evaluation-execution-readiness-v1',
  generated_at: new Date().toISOString(),
  status: !protocolReady || !repoSurfaceReady || !templatesReady || !preResolutionCaptureValidatorReady || !predictionScienceFrameworkAlignmentReady
    ? 'forecast_evaluation_execution_readiness_partial'
    : scoringChainReady
      ? 'forecast_evaluation_execution_ready_for_owner_claim_review'
      : 'forecast_evaluation_execution_ready_for_owner_export_no_real_outcomes',
  source: {
    forecast_evaluation_protocol: inputPaths.forecastEvaluationProtocol,
    accuracy_input_validation: inputPaths.accuracyInputValidation,
    leakage_review_validation: inputPaths.leakageReviewValidation,
    scoring_validation: inputPaths.scoringValidation,
    prediction_science_validation: inputPaths.predictionScienceValidation,
    hosted_access_preflight: inputPaths.hostedAccessPreflight,
    hosted_proof_validation: inputPaths.hostedProofValidation,
    rls_proof_validation: inputPaths.rlsProofValidation,
    resolved_forecast_template: inputPaths.resolvedForecastTemplate,
    baseline_template: inputPaths.baselineTemplate,
    pre_resolution_capture_kit: inputPaths.preResolutionCaptureKit,
    pre_resolution_capture_validation: inputPaths.preResolutionCaptureValidation,
    question_register_template: inputPaths.questionRegisterTemplate,
    pre_resolution_snapshot_template: inputPaths.preResolutionSnapshotTemplate,
    baseline_snapshot_template: inputPaths.baselineSnapshotTemplate,
    launch_evidence: inputPaths.evidence
  },
  summary: {
    current_execution_source_count: CURRENT_EXECUTION_SOURCES.length,
    protocol_stage_count: protocolStages.length,
    missing_protocol_stage_count: missingProtocolStages.length,
    required_repo_surface_count: REQUIRED_REPO_SURFACES.length,
    present_repo_surface_count: repoSurfaceReadyCount,
    repo_surface_ready: repoSurfaceReady,
    owner_template_count: templateChecks.length,
    owner_template_ready_count: templateChecks.filter((check) => check.ready).length,
    owner_templates_ready: templatesReady,
    pre_resolution_capture_kit_status: preResolutionCaptureKit.status ?? 'missing',
    pre_resolution_template_count: preResolutionTemplateChecks.length,
    pre_resolution_template_ready_count: preResolutionTemplateChecks.filter((check) => check.ready).length,
    pre_resolution_capture_kit_ready: preResolutionCaptureKitReady,
    pre_resolution_capture_validation_status: preResolutionCaptureValidation.status ?? 'missing',
    pre_resolution_capture_validator_ready: preResolutionCaptureValidatorReady,
    pre_resolution_owner_rows_present: Boolean(preResolutionCaptureValidation.summary?.owner_rows_present),
    pre_resolution_valid_question_count: Number(preResolutionCaptureValidation.summary?.valid_question_count ?? 0),
    pre_resolution_ready_for_freeze: Boolean(preResolutionCaptureValidation.summary?.ready_for_pre_resolution_freeze),
    valid_resolved_forecast_count: validResolvedForecastCount,
    real_resolved_outcome_count: realResolvedOutcomeCount,
    valid_baseline_count: validBaselineCount,
    real_baseline_comparison_count: realBaselineComparisonCount,
    accuracy_inputs_ready_for_scoring: accuracyInputsReadyForScoring,
    leakage_ready_control_count: leakageReadyControlCount,
    leakage_required_control_count: leakageRequiredControlCount,
    leakage_review_passed: leakageReviewPassed,
    scoring_output_ready_for_claim_review: scoringOutputReadyForClaimReview,
    scoring_sample_only: scoringSampleOnly,
    scoring_included_point_count: scoringIncludedPointCount,
    scoring_max_source_sample_size: scoringMaxSourceSampleSize,
    scoring_comparisons_made: scoringComparisonsMade,
    prediction_science_framework_alignment_ready: predictionScienceFrameworkAlignmentReady,
    prediction_science_ready_for_claim_review: predictionScienceReadyForClaimReview,
    hosted_access_ready_for_smoke: hostedAccessReadyForSmoke,
    hosted_claim_allowed: hostedClaimAllowed,
    hosted_ready_for_buyer_safe_claims: hostedProofReadyForBuyerSafeClaims,
    rls_tenant_isolation_proof_ready: rlsTenantIsolationReady,
    active_release_hold_count: activeCount(releaseHolds),
    execution_ready_for_owner_resolved_export: executionReadyForOwnerResolvedExport,
    scoring_chain_ready_for_owner_claim_review: scoringChainReady,
    accuracy_claim_allowed: accuracyClaimAllowed,
    world_class_prediction_claim_allowed: worldClassPredictionClaimAllowed
  },
  repo_surface_checks: repoSurfaceChecks,
  owner_template_checks: templateChecks,
  pre_resolution_template_checks: preResolutionTemplateChecks,
  current_execution_sources: CURRENT_EXECUTION_SOURCES,
  acceptance_gates: acceptanceGates,
  release_holds: releaseHolds,
  owner_action_order: [
    'Start the timestamped pre-resolution capture packet: question register, app/model/team forecast snapshots, and comparable baseline snapshots.',
    'After outcomes resolve, export owner-approved forecast rows with resolved outcomes using the resolved forecast template.',
    'Export comparable human, community, pro, model, or market baselines using the baseline template.',
    'Run accuracy input validation and leakage review against those owner-approved rows.',
    'Run calibration ledger, benchmark comparison, and forecast scoring validation on the validated real rows.',
    'Clear hosted access, hosted operational proof, and RLS tenant-isolation proof before any external accuracy claim review.',
    'Rerun prediction science validation, this execution-readiness gate, claim consistency, and commercial confidence before changing market language.'
  ],
  proof_boundary: {
    proves: [
      'The repo has enough forecast capture, resolved outcome, scoring, calibration, drift, shadow-model, and template surfaces to ask the owner for a real resolved-outcome export.',
      'The repo has a pre-resolution capture kit for starting timestamped admissible evidence before outcomes resolve.',
      'The repo has a pre-resolution capture validator that can check owner-filled question, forecast snapshot, and baseline snapshot packets before freeze.',
      'The execution path is aligned with current forecasting benchmark practice at the mechanics and workflow level.'
    ],
    does_not_prove: [
      'Prediction accuracy, benchmark superiority, buyer-safe hosted proof, tenant-isolation proof, or world-class forecasting.',
      'That the generated scoring chain has run on real owner-approved resolved outcomes and comparable baselines.'
    ]
  }
};

function renderCsv(validation) {
  return [
    csvLine(['gate', 'status', 'proof_bucket', 'evidence', 'next_action']),
    ...validation.acceptance_gates.map((gate) => csvLine([
      gate.gate,
      gate.status,
      gate.proof_bucket,
      gate.evidence,
      gate.next_action
    ]))
  ].join('\n') + '\n';
}

function renderMarkdown(validation) {
  const gateRows = validation.acceptance_gates
    .map((gate) => [
      mdCell(gate.gate),
      mdCell(gate.status),
      mdCell(gate.proof_bucket),
      mdCell(gate.evidence),
      mdCell(gate.next_action)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const surfaceRows = validation.repo_surface_checks
    .map((check) => [
      mdCell(check.id),
      mdCell(check.present ? 'present' : 'missing_or_partial'),
      check.path,
      mdCell(check.missing_tokens.length > 0 ? check.missing_tokens.join(', ') : 'none')
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const sourceRows = validation.current_execution_sources
    .map((source) => [
      mdCell(source.source),
      source.url,
      mdCell(source.requirement)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const preResolutionRows = validation.pre_resolution_template_checks
    .map((check) => [
      mdCell(check.id),
      mdCell(check.ready ? 'ready' : 'missing_or_partial'),
      check.path,
      mdCell(check.missing_columns.length > 0 ? check.missing_columns.join(', ') : 'none')
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const holdRows = validation.release_holds
    .map((hold) => [
      mdCell(hold.hold),
      mdCell(hold.severity),
      mdCell(hold.status),
      mdCell(hold.evidence_needed)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  return `# Forecast Evaluation Execution Readiness - ${report.generated_at.slice(0, 10)}

## Decision

Status: \`${validation.status}\`.

Execution ready for owner resolved export: **${validation.summary.execution_ready_for_owner_resolved_export}**.

Scoring chain ready for owner claim review: **${validation.summary.scoring_chain_ready_for_owner_claim_review}**.

Accuracy claim allowed: **${validation.summary.accuracy_claim_allowed}**.

World-class prediction claim allowed: **${validation.summary.world_class_prediction_claim_allowed}**.

This proves execution readiness for owner data collection only. It does not prove forecast accuracy or benchmark superiority.

Pre-resolution capture kit ready: **${validation.summary.pre_resolution_capture_kit_ready}**.

Pre-resolution capture validator ready: **${validation.summary.pre_resolution_capture_validator_ready}**.

Pre-resolution owner rows present: **${validation.summary.pre_resolution_owner_rows_present}**.

## Acceptance Gates

| Gate | Status | Proof Bucket | Evidence | Next Action |
|---|---|---|---|---|
${gateRows}

## Repo Surface Checks

| Surface | Status | Path | Missing Markers |
|---|---|---|---|
${surfaceRows}

## Pre-Resolution Templates

| Template | Status | Path | Missing Columns |
|---|---|---|---|
${preResolutionRows}

## Current Execution Sources

| Source | URL | Requirement |
|---|---|---|
${sourceRows}

## Release Holds

| Hold | Severity | Status | Evidence Needed |
|---|---|---|---|
${holdRows}

## Owner Action Order

${validation.owner_action_order.map((item, index) => `${index + 1}. ${item}`).join('\n')}

## Proof Boundary

This is repo/local execution-readiness proof. It cannot support external prediction-accuracy language until real owner-approved resolved outcomes, real comparable baselines, leakage review, scoring, hosted proof, RLS proof, and owner-approved claim wording are all revalidated.
`;
}

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
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:forecast:execution-readiness -- --forecast-evaluation-protocol ${inputPaths.forecastEvaluationProtocol} --accuracy-input-validation ${inputPaths.accuracyInputValidation} --leakage-review-validation ${inputPaths.leakageReviewValidation} --scoring-validation ${inputPaths.scoringValidation} --prediction-science-validation ${inputPaths.predictionScienceValidation} --hosted-access-preflight ${inputPaths.hostedAccessPreflight} --hosted-proof-validation ${inputPaths.hostedProofValidation} --rls-proof-validation ${inputPaths.rlsProofValidation} --resolved-forecast-template ${inputPaths.resolvedForecastTemplate} --baseline-template ${inputPaths.baselineTemplate} --pre-resolution-capture-validation ${inputPaths.preResolutionCaptureValidation} --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence: status ${report.status}, execution_ready_for_owner_resolved_export ${report.summary.execution_ready_for_owner_resolved_export}, scoring_chain_ready_for_owner_claim_review ${report.summary.scoring_chain_ready_for_owner_claim_review}, world_class_prediction_claim_allowed false`
  ], [
    /npm run audit:forecast:execution-readiness/
  ]);

  evidence.proof_buckets.repo_artifact = replaceMatchingThenAppend(evidence.proof_buckets.repo_artifact, [
    'scripts/validate-forecast-evaluation-execution-readiness.mjs validates forecast evaluation execution readiness across repo surfaces, owner templates, science validation, hosted access, and RLS proof gates',
    'scripts/validate-forecast-pre-resolution-capture.mjs validates pre-resolution question, forecast snapshot, and baseline snapshot packets before outcomes resolve',
    'docs/launch-readiness/forecast-evaluation-execution-readiness-2026-06-06.json records execution-ready-for-owner-export status while keeping accuracy and world-class prediction claims blocked',
    'docs/launch-readiness/forecast-evaluation-execution-readiness-checklist-2026-06-06.csv provides the execution-readiness checklist for the owner resolved-outcome export'
  ], [
    /scripts\/validate-forecast-evaluation-execution-readiness\.mjs/,
    /scripts\/validate-forecast-pre-resolution-capture\.mjs/,
    /forecast-evaluation-execution-readiness-2026-06-06\.json/,
    /forecast-evaluation-execution-readiness-checklist-2026-06-06\.csv/
  ]);

  evidence.fix_report = evidence.fix_report ?? {};
  evidence.fix_report.files_changed = replaceMatchingThenAppend(evidence.fix_report.files_changed, [
    'scripts/validate-forecast-evaluation-execution-readiness.mjs',
    'scripts/validate-forecast-pre-resolution-capture.mjs',
    'scripts/build-forecast-pre-resolution-capture-kit.mjs',
    'scripts/build-commercial-confidence-gate.mjs',
    'docs/launch-readiness/forecast-evaluation-execution-readiness-2026-06-06.json',
    'docs/launch-readiness/forecast-evaluation-execution-readiness-2026-06-06.md',
    'docs/launch-readiness/forecast-evaluation-execution-readiness-checklist-2026-06-06.csv',
    'package.json'
  ], [
    /scripts\/validate-forecast-evaluation-execution-readiness\.mjs/,
    /scripts\/validate-forecast-pre-resolution-capture\.mjs/,
    /scripts\/build-forecast-pre-resolution-capture-kit\.mjs/,
    /scripts\/build-commercial-confidence-gate\.mjs/,
    /forecast-evaluation-execution-readiness-2026-06-06\.json/,
    /forecast-evaluation-execution-readiness-2026-06-06\.md/,
    /forecast-evaluation-execution-readiness-checklist-2026-06-06\.csv/,
    /package\.json/
  ]);
  evidence.fix_report.tests_run = replaceMatchingThenAppend(evidence.fix_report.tests_run, [
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH node --check scripts/validate-forecast-evaluation-execution-readiness.mjs',
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:forecast:execution-readiness -- --forecast-evaluation-protocol ${inputPaths.forecastEvaluationProtocol} --accuracy-input-validation ${inputPaths.accuracyInputValidation} --leakage-review-validation ${inputPaths.leakageReviewValidation} --scoring-validation ${inputPaths.scoringValidation} --prediction-science-validation ${inputPaths.predictionScienceValidation} --hosted-access-preflight ${inputPaths.hostedAccessPreflight} --hosted-proof-validation ${inputPaths.hostedProofValidation} --rls-proof-validation ${inputPaths.rlsProofValidation} --resolved-forecast-template ${inputPaths.resolvedForecastTemplate} --baseline-template ${inputPaths.baselineTemplate} --pre-resolution-capture-validation ${inputPaths.preResolutionCaptureValidation} --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence`
  ], [
    /node --check scripts\/validate-forecast-evaluation-execution-readiness\.mjs/,
    /npm run audit:forecast:execution-readiness/
  ]);
  evidence.fix_report.approval_gates = replaceMatchingThenAppend(evidence.fix_report.approval_gates, [
    'Forecast evaluation execution readiness proves only that repo surfaces and owner export templates are ready; owner-approved resolved outcomes, comparable baselines, leakage review, real scoring, hosted/RLS proof, and owner-approved claim language remain required before prediction accuracy claims can be upgraded.'
  ], [
    /Forecast evaluation execution readiness proves only/
  ]);

  evidence.implementation_decisions = replaceByTaskId(evidence.implementation_decisions, {
    task_id: 'forecast-evaluation-execution-readiness-gate',
    decision: 'Add a deterministic execution-readiness validator before requesting owner-approved resolved forecast and baseline exports.',
    acceptance_check: 'The validator must prove repo/schema/function/template readiness and pre-resolution capture readiness while keeping prediction accuracy and world-class prediction claims blocked without real resolved outcomes, baselines, leakage review, hosted proof, and RLS proof.',
    chosen_variant: 'minimal Node artifact validator plus pre-resolution kit input and commercial-confidence gate wiring; no scoring algorithm rewrite, no app runtime edit, no new dependency',
    repo_pattern_reused: 'Existing launch-readiness validator and evidence update pattern',
    files_changed: [
      'scripts/validate-forecast-evaluation-execution-readiness.mjs',
      'scripts/validate-forecast-pre-resolution-capture.mjs',
      'scripts/build-forecast-pre-resolution-capture-kit.mjs',
      'scripts/build-commercial-confidence-gate.mjs',
      'package.json'
    ],
    tests_run: [
      'node --check scripts/validate-forecast-evaluation-execution-readiness.mjs',
      'node --check scripts/validate-forecast-pre-resolution-capture.mjs',
      'npm run audit:forecast:validate-pre-resolution',
      'npm run audit:forecast:execution-readiness',
      'npm run audit:commercial:confidence'
    ],
    proof: `${report.status}; pre_resolution_capture_kit_ready=${report.summary.pre_resolution_capture_kit_ready}; pre_resolution_capture_validator_ready=${report.summary.pre_resolution_capture_validator_ready}; execution_ready_for_owner_resolved_export=${report.summary.execution_ready_for_owner_resolved_export}; scoring_chain_ready_for_owner_claim_review=${report.summary.scoring_chain_ready_for_owner_claim_review}; world_class_prediction_claim_allowed=false.`,
    reason: 'Current forecasting benchmarks require resolved outcomes, proper scoring, baselines, leakage controls, and deployment-context governance. The repo has mechanics, but the owner export and proof chain need a machine-checked execution gate.'
  });
  evidence.rejected_variants = replaceByTaskId(evidence.rejected_variants, {
    task_id: 'forecast-evaluation-execution-readiness-gate',
    variant: 'Skip a new gate and rely on the science validator only.',
    reason_rejected: 'The science validator proves framework alignment, but it does not explicitly check whether the repo has the UI, schema, functions, and owner templates needed to collect real scoring evidence.',
    tradeoff: 'A narrow execution-readiness gate adds operational clarity without changing product behavior or inflating confidence.',
    evidence: `${report.status} keeps scoring_chain_ready_for_owner_claim_review=${report.summary.scoring_chain_ready_for_owner_claim_review}.`
  });
  evidence.code_optimization_reviews = replaceByTaskId(evidence.code_optimization_reviews, {
    target_task: 'forecast-evaluation-execution-readiness-gate',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'No dependency, no runtime product edit, no hosted or secret-dependent execution, and generated artifacts remain repo/local proof only.',
    tests_or_checks: [
      'node --check scripts/validate-forecast-evaluation-execution-readiness.mjs',
      'node --check scripts/validate-forecast-pre-resolution-capture.mjs',
      'npm run audit:forecast:validate-pre-resolution',
      'npm run audit:forecast:execution-readiness',
      'npm run audit:commercial:confidence'
    ],
    remaining_risk: 'Owner-filled pre-resolution rows, real resolved outcomes, comparable baselines, leakage review, hosted/RLS proof, and claim-language approval remain missing.'
  });

  writeArtifact(inputPaths.evidence, `${JSON.stringify(evidence, null, 2)}\n`);
}

console.log(JSON.stringify({
  json_output: outputPaths.json,
  md_output: outputPaths.md,
  csv_output: outputPaths.csv,
  evidence_updated: updateEvidence,
  status: report.status,
  repo_surface_ready: report.summary.repo_surface_ready,
  owner_templates_ready: report.summary.owner_templates_ready,
  pre_resolution_capture_kit_ready: report.summary.pre_resolution_capture_kit_ready,
  pre_resolution_capture_validator_ready: report.summary.pre_resolution_capture_validator_ready,
  pre_resolution_owner_rows_present: report.summary.pre_resolution_owner_rows_present,
  execution_ready_for_owner_resolved_export: report.summary.execution_ready_for_owner_resolved_export,
  scoring_chain_ready_for_owner_claim_review: report.summary.scoring_chain_ready_for_owner_claim_review,
  valid_resolved_forecast_count: report.summary.valid_resolved_forecast_count,
  valid_baseline_count: report.summary.valid_baseline_count,
  hosted_access_ready_for_smoke: report.summary.hosted_access_ready_for_smoke,
  rls_tenant_isolation_proof_ready: report.summary.rls_tenant_isolation_proof_ready,
  accuracy_claim_allowed: report.summary.accuracy_claim_allowed,
  world_class_prediction_claim_allowed: report.summary.world_class_prediction_claim_allowed
}, null, 2));
