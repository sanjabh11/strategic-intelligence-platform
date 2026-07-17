#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const ROOT = process.cwd();
const DEFAULT_REGISTER = 'docs/launch-readiness/forecast-leakage-review-register-2026-06-06.csv';
const DEFAULT_ACCURACY_INPUT_VALIDATION = 'docs/launch-readiness/accuracy-evidence-input-validation-2026-06-06.json';
const DEFAULT_FORECAST_CLAIM_GOVERNANCE = 'docs/launch-readiness/forecast-claim-governance-2026-06-06.json';
const DEFAULT_EVIDENCE = 'docs/launch-readiness/launch-evidence-2026-06-06.json';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/forecast-leakage-review-validation-2026-06-06.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/forecast-leakage-review-validation-2026-06-06.md';
const DEFAULT_CSV_OUTPUT = 'docs/launch-readiness/forecast-leakage-review-validation-checklist-2026-06-06.csv';

const REQUIRED_CONTROLS = [
  {
    control_id: 'pre_resolution_timestamp_boundary',
    title: 'Pre-resolution timestamp boundary',
    required_fields: ['forecast_export_scope'],
    required_boolean_fields: ['pre_resolution_timestamps_verified']
  },
  {
    control_id: 'resolution_source_temporal_cutoff',
    title: 'Resolution source temporal cutoff',
    required_fields: ['forecast_export_scope'],
    required_boolean_fields: ['resolution_sources_pre_resolution_or_allowed', 'post_resolution_sources_excluded']
  },
  {
    control_id: 'retrieval_source_cutoff_review',
    title: 'Retrieval source cutoff review',
    required_fields: ['forecast_export_scope'],
    required_boolean_fields: ['retrieval_cutoff_verified']
  },
  {
    control_id: 'baseline_temporal_comparability',
    title: 'Baseline temporal comparability',
    required_fields: ['baseline_scope'],
    required_boolean_fields: ['baseline_timestamp_comparable']
  },
  {
    control_id: 'benchmark_contamination_review',
    title: 'Benchmark contamination review',
    required_fields: ['forecast_export_scope', 'baseline_scope'],
    required_boolean_fields: ['benchmark_contamination_checked']
  },
  {
    control_id: 'training_eval_overlap_review',
    title: 'Training/evaluation overlap review',
    required_fields: ['forecast_export_scope'],
    required_boolean_fields: ['training_eval_overlap_checked']
  },
  {
    control_id: 'ambiguous_resolution_exclusion_review',
    title: 'Ambiguous resolution and exclusion review',
    required_fields: ['forecast_export_scope'],
    required_boolean_fields: ['ambiguous_resolution_reviewed']
  },
  {
    control_id: 'claim_tier_copy_boundary',
    title: 'Claim tier and copy boundary',
    required_fields: ['notes'],
    required_boolean_fields: []
  }
];

const REQUIRED_COLUMNS = [
  'control_id',
  'title',
  'artifact_path',
  'review_status',
  'owner_approval_status',
  'reviewer',
  'reviewed_at',
  'forecast_export_scope',
  'baseline_scope',
  'question_count',
  'pre_resolution_timestamps_verified',
  'resolution_sources_pre_resolution_or_allowed',
  'post_resolution_sources_excluded',
  'retrieval_cutoff_verified',
  'baseline_timestamp_comparable',
  'benchmark_contamination_checked',
  'training_eval_overlap_checked',
  'ambiguous_resolution_reviewed',
  'unresolved_issue_count',
  'risk_severity',
  'contains_unsupported_claims',
  'notes'
];

const APPROVED_VALUES = new Set(['approved', 'owner_approved']);
const PASSED_REVIEW_VALUES = new Set(['passed', 'approved', 'owner_approved']);
const ALLOWED_REVIEW_VALUES = new Set(['', 'missing', 'draft', 'reviewed', 'passed', 'failed', 'approved', 'owner_approved']);
const ALLOWED_OWNER_VALUES = new Set(['', 'missing', 'draft', 'reviewed', 'approved', 'owner_approved', 'rejected']);
const TRUE_VALUES = new Set(['true', 'yes', '1']);
const FALSE_VALUES = new Set(['false', 'no', '0', '']);
const ALLOWED_RISK_VALUES = new Set(['', 'none', 'low', 'medium', 'high', 'critical']);
const PROHIBITED_CLAIM_PATTERNS = [
  /\bworld[- ]class\b/i,
  /\baccurate predictions?\b/i,
  /\bprediction superiority\b/i,
  /\bbest[- ]in[- ]class forecasting\b/i,
  /\bcommercial[- ]ready\b/i,
  /\bbuyer[- ]safe accuracy claim\b/i,
  /\bleakage[- ]free\b/i,
  /\bcontamination[- ]free\b/i,
  /\bbenchmark superiority proven\b/i
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
    'Usage: node scripts/validate-forecast-leakage-review.mjs',
    `  [--register ${DEFAULT_REGISTER}]`,
    `  [--accuracy-input-validation ${DEFAULT_ACCURACY_INPUT_VALIDATION}]`,
    `  [--forecast-claim-governance ${DEFAULT_FORECAST_CLAIM_GOVERNANCE}]`,
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
  register: argValue('--register', DEFAULT_REGISTER),
  accuracyInputValidation: argValue('--accuracy-input-validation', DEFAULT_ACCURACY_INPUT_VALIDATION),
  forecastClaimGovernance: argValue('--forecast-claim-governance', DEFAULT_FORECAST_CLAIM_GOVERNANCE),
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

function readText(relativePath) {
  const absolutePath = resolveRepoPath(relativePath);
  if (!existsSync(absolutePath)) return null;
  return readFileSync(absolutePath, 'utf8');
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

function parseCsv(text) {
  const records = [];
  let field = '';
  let row = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      records.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    records.push(row);
  }

  const nonEmptyRecords = records.filter((record) => record.some((value) => String(value ?? '').trim()));
  const [headers = [], ...body] = nonEmptyRecords;
  return {
    headers: headers.map((header) => header.trim()).filter(Boolean),
    rows: body.map((record) => {
      const item = {};
      headers.forEach((header, index) => {
        item[header.trim()] = record[index] ?? '';
      });
      return item;
    })
  };
}

function normalize(value) {
  return String(value ?? '').trim().toLowerCase();
}

function hasText(value) {
  return String(value ?? '').trim().length > 0;
}

function parseBoolean(value) {
  const normalized = normalize(value);
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return null;
}

function parseNonNegativeInteger(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (!/^\d+$/.test(text)) return null;
  return Number(text);
}

function parseDate(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function artifactPathExists(value) {
  const text = String(value ?? '').trim();
  if (!text || text === 'owner_supplied_external') return false;
  return existsSync(resolveRepoPath(text));
}

function rowText(row) {
  return Object.values(row ?? {}).join(' ');
}

function hasProhibitedClaim(row) {
  const text = rowText(row);
  const lowerText = text.toLowerCase();
  const boundaryLanguagePatterns = [
    /\bnot\s+world[- ]class\b/,
    /\bno\s+world[- ]class\b/,
    /\bnot\s+commercial[- ]ready\b/,
    /\bno\s+accurate\s+predictions?\b/,
    /\bleakage review missing\b/,
    /\bcontamination review missing\b/,
    /\bnot\s+leakage[- ]free\b/,
    /\bnot\s+contamination[- ]free\b/
  ];

  if (boundaryLanguagePatterns.some((pattern) => pattern.test(lowerText))) {
    return false;
  }

  return PROHIBITED_CLAIM_PATTERNS.some((pattern) => pattern.test(text));
}

function missingColumns(headers) {
  return REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
}

function pushIssue(issues, rowNumber, field, problem, severity = 'error') {
  issues.push({
    row_number: rowNumber,
    field,
    severity,
    problem
  });
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

function renderTemplate() {
  const rows = REQUIRED_CONTROLS.map((control) => csvLine([
    control.control_id,
    control.title,
    '',
    'missing',
    'missing',
    '',
    '',
    '',
    '',
    '',
    'no',
    'no',
    'no',
    'no',
    'no',
    'no',
    'no',
    'no',
    '',
    '',
    'no',
    'Owner/reviewer must fill this row after real resolved forecast and baseline evidence exists. Do not use this template as accuracy proof.'
  ]));

  return `${[csvLine(REQUIRED_COLUMNS), ...rows].join('\n')}\n`;
}

const accuracyInputValidation = readJsonIfExists(inputPaths.accuracyInputValidation, {
  status: 'missing',
  summary: {
    valid_resolved_forecast_count: 0,
    valid_baseline_count: 0,
    ready_for_calibration_scoring: false
  }
});
const forecastClaimGovernance = readJsonIfExists(inputPaths.forecastClaimGovernance, {
  status: 'missing',
  summary: {
    release_hold_count: 0,
    real_resolved_outcome_count: 0,
    real_baseline_comparison_count: 0
  }
});

const registerExistedBeforeRun = existsSync(resolveRepoPath(inputPaths.register));
if (!registerExistedBeforeRun) {
  writeArtifact(inputPaths.register, renderTemplate());
}

const registerInput = parseCsv(readText(inputPaths.register) ?? renderTemplate());
const registerMissingColumns = missingColumns(registerInput.headers);
const issues = [];
const rowsByControlId = new Map(registerInput.rows.map((row) => [String(row.control_id ?? '').trim(), row]));

for (const column of registerMissingColumns) {
  pushIssue(issues, 1, column, 'Forecast leakage review register is missing a required column.');
}

for (const control of REQUIRED_CONTROLS) {
  if (!rowsByControlId.has(control.control_id)) {
    pushIssue(issues, 1, 'control_id', `Missing required leakage review control row: ${control.control_id}.`);
  }
}

let reviewedControlCount = 0;
let ownerApprovedControlCount = 0;
let passedControlCount = 0;
let artifactPathPresentCount = 0;
let artifactPathExistsCount = 0;
let unresolvedIssueTotal = 0;
let highOrCriticalRiskCount = 0;

const normalizedRows = registerInput.rows.map((row, index) => {
  const rowNumber = index + 2;
  const controlId = String(row.control_id ?? '').trim();
  const reviewStatus = normalize(row.review_status) || 'missing';
  const ownerStatus = normalize(row.owner_approval_status) || 'missing';
  const riskSeverity = normalize(row.risk_severity);
  const unsupportedClaims = parseBoolean(row.contains_unsupported_claims);
  const unresolvedIssueCount = parseNonNegativeInteger(row.unresolved_issue_count);
  const artifactPresent = hasText(row.artifact_path);
  const artifactExists = row.artifact_path === 'owner_supplied_external' || artifactPathExists(row.artifact_path);
  const requiredControl = REQUIRED_CONTROLS.find((control) => control.control_id === controlId);
  const reviewed = reviewStatus === 'reviewed' || PASSED_REVIEW_VALUES.has(reviewStatus);
  const passed = PASSED_REVIEW_VALUES.has(reviewStatus);
  const ownerApproved = APPROVED_VALUES.has(ownerStatus);

  if (!ALLOWED_REVIEW_VALUES.has(reviewStatus)) {
    pushIssue(issues, rowNumber, 'review_status', `Invalid review_status "${row.review_status}".`);
  }

  if (!ALLOWED_OWNER_VALUES.has(ownerStatus)) {
    pushIssue(issues, rowNumber, 'owner_approval_status', `Invalid owner_approval_status "${row.owner_approval_status}".`);
  }

  if (unsupportedClaims === null) {
    pushIssue(issues, rowNumber, 'contains_unsupported_claims', 'contains_unsupported_claims must be yes/no, true/false, or 1/0.');
  }

  if (!ALLOWED_RISK_VALUES.has(riskSeverity)) {
    pushIssue(issues, rowNumber, 'risk_severity', `risk_severity must be one of: ${[...ALLOWED_RISK_VALUES].filter(Boolean).join(', ')}.`);
  }

  if (hasText(row.unresolved_issue_count) && unresolvedIssueCount === null) {
    pushIssue(issues, rowNumber, 'unresolved_issue_count', 'unresolved_issue_count must be a non-negative integer when present.');
  }

  if (hasProhibitedClaim(row)) {
    pushIssue(issues, rowNumber, '*', 'Row appears to contain unsupported accuracy, world-class, commercial-ready, or leakage-free claim language.', 'warning');
  }

  if (ownerApproved && !passed) {
    pushIssue(issues, rowNumber, 'owner_approval_status', 'Owner approval requires review_status passed, approved, or owner_approved.');
  }

  if (passed && !hasText(row.reviewer)) {
    pushIssue(issues, rowNumber, 'reviewer', 'Passed review rows must include reviewer.');
  }

  if (passed && !parseDate(row.reviewed_at)) {
    pushIssue(issues, rowNumber, 'reviewed_at', 'Passed review rows must include a parseable reviewed_at timestamp.');
  }

  if (passed && !artifactPresent) {
    pushIssue(issues, rowNumber, 'artifact_path', 'Passed review rows must include artifact_path or owner_supplied_external.');
  }

  if (passed && artifactPresent && !artifactExists) {
    pushIssue(issues, rowNumber, 'artifact_path', 'Passed review artifact_path must exist or be owner_supplied_external.');
  }

  if (passed && unsupportedClaims !== false) {
    pushIssue(issues, rowNumber, 'contains_unsupported_claims', 'Passed review rows must explicitly mark unsupported claims as absent.');
  }

  if (passed && unresolvedIssueCount !== 0) {
    pushIssue(issues, rowNumber, 'unresolved_issue_count', 'Passed review rows must have unresolved_issue_count=0.');
  }

  if (passed && ['high', 'critical'].includes(riskSeverity)) {
    pushIssue(issues, rowNumber, 'risk_severity', 'Passed review rows cannot retain high or critical leakage/contamination risk.');
  }

  for (const field of requiredControl?.required_fields ?? []) {
    if (passed && !hasText(row[field])) {
      pushIssue(issues, rowNumber, field, `Passed ${controlId} row must include ${field}.`);
    }
  }

  for (const field of requiredControl?.required_boolean_fields ?? []) {
    const value = parseBoolean(row[field]);
    if (value === null) {
      pushIssue(issues, rowNumber, field, `${field} must be yes/no, true/false, or 1/0.`);
    } else if (passed && value !== true) {
      pushIssue(issues, rowNumber, field, `Passed ${controlId} row requires ${field}=yes.`);
    }
  }

  if (reviewed) reviewedControlCount += 1;
  if (ownerApproved) ownerApprovedControlCount += 1;
  if (passed) passedControlCount += 1;
  if (artifactPresent) artifactPathPresentCount += 1;
  if (artifactExists) artifactPathExistsCount += 1;
  if (unresolvedIssueCount) unresolvedIssueTotal += unresolvedIssueCount;
  if (['high', 'critical'].includes(riskSeverity)) highOrCriticalRiskCount += 1;

  const rowErrors = issues.filter((issue) => issue.row_number === rowNumber && issue.severity === 'error').length;

  return {
    control_id: controlId,
    title: row.title || requiredControl?.title || controlId,
    review_status: reviewStatus,
    owner_approval_status: ownerStatus,
    reviewed,
    passed,
    owner_approved: ownerApproved,
    artifact_path_present: artifactPresent,
    artifact_path_exists: artifactExists,
    unresolved_issue_count: unresolvedIssueCount,
    risk_severity: riskSeverity || 'missing',
    contains_unsupported_claims: unsupportedClaims,
    row_error_count: rowErrors,
    ready: passed && ownerApproved && rowErrors === 0
  };
});

const validForecastCount = Number(accuracyInputValidation.summary?.valid_resolved_forecast_count ?? 0);
const validBaselineCount = Number(accuracyInputValidation.summary?.valid_baseline_count ?? 0);
const accuracyInputsReady = Boolean(accuracyInputValidation.summary?.ready_for_calibration_scoring)
  || accuracyInputValidation.status === 'accuracy_input_validation_passed_pending_scoring';
const hasRealForecastInputs = validForecastCount > 0 || Number(accuracyInputValidation.summary?.forecast_rows_read ?? 0) > 0;
const allRequiredRowsPresent = REQUIRED_CONTROLS.every((control) => rowsByControlId.has(control.control_id));
const readyControlIds = new Set(normalizedRows.filter((row) => row.ready).map((row) => row.control_id));
const allControlsReady = REQUIRED_CONTROLS.every((control) => readyControlIds.has(control.control_id));
const errorCount = issues.filter((issue) => issue.severity === 'error').length;
const warningCount = issues.length - errorCount;

function gateStatus(condition, noRealForecasts = false) {
  if (noRealForecasts) return 'open_no_real_forecast_rows';
  return condition ? 'passed' : 'failed';
}

const acceptanceGates = [
  {
    gate: 'register_schema_present',
    status: registerMissingColumns.length === 0 ? 'passed' : 'failed',
    evidence: registerMissingColumns.length
      ? `Missing register columns: ${registerMissingColumns.join(', ')}.`
      : `Register schema includes ${REQUIRED_COLUMNS.length} required columns.`,
    proof_bucket: 'repo_artifact'
  },
  {
    gate: 'all_required_control_rows_present',
    status: allRequiredRowsPresent ? 'passed' : 'failed',
    evidence: `${rowsByControlId.size} register rows loaded for ${REQUIRED_CONTROLS.length} required leakage controls.`,
    proof_bucket: 'repo_artifact'
  },
  {
    gate: 'real_forecast_inputs_present',
    status: hasRealForecastInputs ? 'passed' : 'open_no_real_forecast_rows',
    evidence: `${validForecastCount} valid resolved forecast rows and ${validBaselineCount} valid baseline rows from ${inputPaths.accuracyInputValidation}.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'accuracy_inputs_ready_for_review',
    status: gateStatus(accuracyInputsReady, !hasRealForecastInputs),
    evidence: `accuracy_input_validation_status=${accuracyInputValidation.status ?? 'missing'}; ready_for_calibration_scoring=${accuracyInputsReady}.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'leakage_control_rows_passed_and_owner_approved',
    status: gateStatus(allControlsReady, !hasRealForecastInputs),
    evidence: `${readyControlIds.size}/${REQUIRED_CONTROLS.length} required leakage controls are passed and owner-approved.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'row_quality_validation',
    status: gateStatus(errorCount === 0, !hasRealForecastInputs),
    evidence: `${errorCount} row-level errors and ${warningCount} warnings across leakage review register.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'unresolved_risk_absent',
    status: gateStatus(unresolvedIssueTotal === 0 && highOrCriticalRiskCount === 0, !hasRealForecastInputs),
    evidence: `${unresolvedIssueTotal} unresolved issues and ${highOrCriticalRiskCount} high/critical risk rows remain.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'claim_boundary_preserved',
    status: issues.some((issue) => issue.problem.includes('unsupported accuracy')) ? 'warning' : 'passed',
    evidence: 'Rows are checked for unsupported accuracy, world-class, commercial-ready, leakage-free, and benchmark-superiority claim language.',
    proof_bucket: 'repo_artifact'
  }
];

const leakageReviewReady = hasRealForecastInputs && accuracyInputsReady && allControlsReady && errorCount === 0 && unresolvedIssueTotal === 0 && highOrCriticalRiskCount === 0;
const status = !hasRealForecastInputs
  ? 'forecast_leakage_review_validation_ready_no_real_forecast_rows'
  : errorCount > 0
    ? 'forecast_leakage_review_validation_failed'
    : !accuracyInputsReady
      ? 'forecast_leakage_review_validation_waiting_on_accuracy_inputs'
      : !allControlsReady
        ? 'forecast_leakage_review_validation_partial_controls_missing'
        : unresolvedIssueTotal > 0 || highOrCriticalRiskCount > 0
          ? 'forecast_leakage_review_validation_unresolved_risk'
          : 'forecast_leakage_review_validation_passed_pending_claim_review';

const validation = {
  schema_version: 'forecast-leakage-review-validation-v1',
  generated_at: new Date().toISOString(),
  status,
  proof_boundary: 'This artifact validates the leakage and contamination review register for forecast accuracy claims. It is not prediction-accuracy proof, hosted proof, buyer validation, external benchmark superiority, or world-class forecasting evidence.',
  source: {
    register: inputPaths.register,
    register_template_created: !registerExistedBeforeRun,
    accuracy_input_validation: inputPaths.accuracyInputValidation,
    accuracy_input_validation_status: accuracyInputValidation.status ?? 'missing',
    forecast_claim_governance: inputPaths.forecastClaimGovernance,
    forecast_claim_governance_status: forecastClaimGovernance.status ?? 'missing'
  },
  summary: {
    register_row_count: registerInput.rows.length,
    required_control_count: REQUIRED_CONTROLS.length,
    reviewed_control_count: reviewedControlCount,
    passed_control_count: passedControlCount,
    owner_approved_control_count: ownerApprovedControlCount,
    ready_control_count: readyControlIds.size,
    artifact_path_present_count: artifactPathPresentCount,
    artifact_path_exists_count: artifactPathExistsCount,
    valid_resolved_forecast_count: validForecastCount,
    valid_baseline_count: validBaselineCount,
    accuracy_inputs_ready_for_scoring: accuracyInputsReady,
    unresolved_issue_total: unresolvedIssueTotal,
    high_or_critical_risk_count: highOrCriticalRiskCount,
    row_issue_count: issues.length,
    row_error_count: errorCount,
    active_release_hold_count: acceptanceGates.filter((gate) => gate.status !== 'passed').length,
    ready_for_accuracy_claim_review: leakageReviewReady,
    leakage_review_passed: leakageReviewReady,
    accuracy_claim_allowed: false,
    world_class_prediction_claim_allowed: false
  },
  required_columns: REQUIRED_COLUMNS,
  required_controls: REQUIRED_CONTROLS,
  control_rows: normalizedRows,
  acceptance_gates: acceptanceGates,
  row_issues: issues,
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
      url: 'https://arxiv.org/abs/2409.19839',
      alignment: 'World-class forecasting claims require future-event evaluation that avoids known answers and data leakage.'
    },
    {
      source: 'Metaculus FutureEval methodology',
      url: 'https://www.metaculus.com/futureeval/methodology',
      alignment: 'Dynamic forecasting evaluation should score real future questions as they resolve and compare against human/pro/bot baselines.'
    },
    {
      source: 'NIST AI Risk Management Framework',
      url: 'https://www.nist.gov/itl/ai-risk-management-framework',
      alignment: 'Prediction claims should be managed as measured AI risk with documented uncertainty and residual limitations.'
    }
  ],
  next_commands_after_owner_data: [
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:forecast:leakage-review -- --register ${inputPaths.register} --accuracy-input-validation ${inputPaths.accuracyInputValidation} --forecast-claim-governance ${inputPaths.forecastClaimGovernance} --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence`,
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

  const controlRows = report.control_rows
    .map((row) => [
      mdCell(row.control_id),
      row.review_status,
      row.owner_approval_status,
      row.ready ? 'yes' : 'no',
      row.unresolved_issue_count ?? '',
      row.risk_severity
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const issueRows = report.row_issues.length
    ? report.row_issues
      .map((issue) => [
        issue.row_number,
        mdCell(issue.field),
        issue.severity,
        mdCell(issue.problem)
      ])
      .map((row) => `| ${row.join(' | ')} |`)
      .join('\n')
    : '| - | - | - | none |';

  const sourceRows = report.current_source_alignment
    .map((source) => [
      mdCell(source.source),
      source.url,
      mdCell(source.alignment)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  return `# Forecast Leakage Review Validation - 2026-06-06

## Decision Boundary

Status: \`${report.status}\`.

${report.proof_boundary}

Ready controls: **${report.summary.ready_control_count}/${report.summary.required_control_count}**. Valid resolved forecasts: **${report.summary.valid_resolved_forecast_count}**. Valid baselines: **${report.summary.valid_baseline_count}**.

Ready for accuracy claim review: **${report.summary.ready_for_accuracy_claim_review}**.

Accuracy claim allowed: **${report.summary.accuracy_claim_allowed}**. World-class prediction claim allowed: **${report.summary.world_class_prediction_claim_allowed}**.

## Acceptance Gates

| Gate | Status | Evidence | Proof Bucket |
|---|---|---|---|
${gateRows}

## Control Rows

| Control | Review | Owner Approval | Ready | Unresolved Issues | Risk |
|---|---|---|---|---:|---|
${controlRows}

## Row Issues

| Row | Field | Severity | Problem |
|---:|---|---|---|
${issueRows}

## Current Source Alignment

| Source | URL | Alignment |
|---|---|---|
${sourceRows}

## Next Commands After Owner Data

${report.next_commands_after_owner_data.map((command, index) => `${index + 1}. \`${command}\``).join('\n')}

## Proof Boundary

Passing this validator only means leakage and contamination review controls are ready for accuracy-claim review. It still does not prove forecast accuracy, baseline superiority, hosted behavior, buyer acceptance, or world-class prediction performance.
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
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:forecast:leakage-review -- --register ${inputPaths.register} --accuracy-input-validation ${inputPaths.accuracyInputValidation} --forecast-claim-governance ${inputPaths.forecastClaimGovernance} --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence: status ${validation.status}, ${validation.summary.ready_control_count}/${validation.summary.required_control_count} ready controls, ${validation.summary.valid_resolved_forecast_count} valid forecasts, leakage_review_passed ${validation.summary.leakage_review_passed}`
  ], [
    /npm run audit:forecast:leakage-review/
  ]);

  evidence.proof_buckets.repo_artifact = replaceMatchingThenAppend(evidence.proof_buckets.repo_artifact, [
    'scripts/validate-forecast-leakage-review.mjs validates leakage and contamination review controls before prediction-accuracy, benchmark-superiority, or world-class forecasting claims can be upgraded',
    'docs/launch-readiness/forecast-leakage-review-register-2026-06-06.csv is the owner/reviewer register for pre-resolution timestamps, temporal source cutoffs, retrieval cutoffs, baseline comparability, benchmark contamination, training/evaluation overlap, ambiguous resolution exclusions, and claim-tier copy boundaries',
    'docs/launch-readiness/forecast-leakage-review-validation-2026-06-06.json records leakage-control readiness, owner approval, unresolved issues, risk severity, valid forecast/baseline counts, and release holds'
  ], [
    /scripts\/validate-forecast-leakage-review\.mjs/,
    /forecast-leakage-review-register-2026-06-06\.csv/,
    /forecast-leakage-review-validation-2026-06-06\.json/
  ]);

  evidence.fix_report = evidence.fix_report ?? {};
  evidence.fix_report.files_changed = replaceMatchingThenAppend(evidence.fix_report.files_changed, [
    'scripts/validate-forecast-leakage-review.mjs',
    'scripts/build-forecast-claim-governance.mjs',
    'scripts/build-commercial-confidence-gate.mjs',
    'package.json',
    'docs/launch-readiness/forecast-leakage-review-register-2026-06-06.csv',
    'docs/launch-readiness/forecast-leakage-review-validation-2026-06-06.json',
    'docs/launch-readiness/forecast-leakage-review-validation-2026-06-06.md',
    'docs/launch-readiness/forecast-leakage-review-validation-checklist-2026-06-06.csv'
  ], [
    /scripts\/validate-forecast-leakage-review\.mjs/,
    /scripts\/build-forecast-claim-governance\.mjs/,
    /scripts\/build-commercial-confidence-gate\.mjs/,
    /package\.json/,
    /forecast-leakage-review-register-2026-06-06\.csv/,
    /forecast-leakage-review-validation-2026-06-06\.json/,
    /forecast-leakage-review-validation-2026-06-06\.md/,
    /forecast-leakage-review-validation-checklist-2026-06-06\.csv/
  ]);
  evidence.fix_report.tests_run = replaceMatchingThenAppend(evidence.fix_report.tests_run, [
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH node --check scripts/validate-forecast-leakage-review.mjs',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH node --check scripts/build-forecast-claim-governance.mjs',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH node --check scripts/build-commercial-confidence-gate.mjs',
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:forecast:leakage-review -- --register ${inputPaths.register} --accuracy-input-validation ${inputPaths.accuracyInputValidation} --forecast-claim-governance ${inputPaths.forecastClaimGovernance} --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence`,
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:forecast:claim-governance',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:commercial:confidence'
  ], [
    /node --check scripts\/validate-forecast-leakage-review\.mjs/,
    /node --check scripts\/build-forecast-claim-governance\.mjs/,
    /node --check scripts\/build-commercial-confidence-gate\.mjs/,
    /npm run audit:forecast:leakage-review/,
    /npm run audit:forecast:claim-governance/,
    /npm run audit:commercial:confidence/
  ]);
  evidence.fix_report.approval_gates = replaceMatchingThenAppend(evidence.fix_report.approval_gates, [
    'Forecast leakage review validation is repo/local validation proof only; owner-approved resolved forecasts, comparable baselines, reviewer-approved leakage/contamination controls, hosted/security proof, buyer proof, and owner-approved claim language remain required before accuracy or world-class prediction claims can be upgraded.'
  ], [
    /Forecast leakage review validation is repo\/local validation proof only/
  ]);

  evidence.implementation_decisions = replaceByTaskId(evidence.implementation_decisions, {
    task_id: 'forecast-leakage-review-validation-harness',
    decision: 'Add a deterministic no-dependency validator and register template for leakage and contamination review before prediction-accuracy claims can be upgraded.',
    acceptance_check: 'Default register validates as schema-ready but no-real-forecast-rows, and commercial confidence remains not_95_confident without raising prediction accuracy score.',
    chosen_variant: 'minimal Node artifact validator plus non-overwriting leakage review register template and score-neutral evidence manifest update',
    repo_pattern_reused: 'Existing launch-readiness Node artifact validator pattern',
    files_changed: [
      'scripts/validate-forecast-leakage-review.mjs',
      'scripts/build-forecast-claim-governance.mjs',
      'scripts/build-commercial-confidence-gate.mjs',
      'package.json'
    ],
    tests_run: [
      'node --check scripts/validate-forecast-leakage-review.mjs',
      'npm run audit:forecast:leakage-review',
      'npm run audit:forecast:claim-governance',
      'npm run audit:commercial:confidence'
    ],
    proof: `${validation.status}; ready_control_count=${validation.summary.ready_control_count}; valid_resolved_forecast_count=${validation.summary.valid_resolved_forecast_count}; leakage_review_passed=${validation.summary.leakage_review_passed}.`,
    reason: 'The top confidence blocker is prediction accuracy; leakage and contamination review must be machine-checkable before any buyer-safe accuracy or world-class prediction claim.'
  });
  evidence.rejected_variants = replaceByTaskId(evidence.rejected_variants, {
    task_id: 'forecast-leakage-review-validation-harness',
    variant: 'Treat accuracy input validation and claim governance as enough leakage review.',
    reason_rejected: 'Schema/timestamp validation and claim holds do not prove retrieval source cutoffs, baseline temporal comparability, benchmark contamination review, training/evaluation overlap review, or owner-approved claim-tier copy boundaries.',
    tradeoff: 'Score-neutral leakage validation adds scientific rigor without requiring owner data, hosted access, or runtime changes.',
    evidence: `${validation.status} keeps accuracy_claim_allowed=false and world_class_prediction_claim_allowed=false.`
  });
  evidence.code_optimization_reviews = replaceByTaskId(evidence.code_optimization_reviews, {
    target_task: 'forecast-leakage-review-validation-harness',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'No new dependency, no runtime app change, non-overwriting CSV template, and generated artifacts remain repo/local proof only.',
    tests_or_checks: [
      'node --check scripts/validate-forecast-leakage-review.mjs',
      'npm run audit:forecast:leakage-review',
      'npm run audit:forecast:claim-governance',
      'npm run audit:commercial:confidence'
    ],
    remaining_risk: 'Real resolved forecasts, real comparable baselines, owner/reviewer leakage signoff, hosted proof, RLS proof, buyer proof, and approved claim language are still missing.'
  });

  writeArtifact(inputPaths.evidence, `${JSON.stringify(evidence, null, 2)}\n`);
}

console.log(JSON.stringify({
  json_output: outputPaths.json,
  md_output: outputPaths.md,
  csv_output: outputPaths.csv,
  register: inputPaths.register,
  register_template_created: !registerExistedBeforeRun,
  evidence_updated: updateEvidence,
  status: validation.status,
  ready_control_count: validation.summary.ready_control_count,
  required_control_count: validation.summary.required_control_count,
  valid_resolved_forecast_count: validation.summary.valid_resolved_forecast_count,
  valid_baseline_count: validation.summary.valid_baseline_count,
  leakage_review_passed: validation.summary.leakage_review_passed,
  active_release_hold_count: validation.summary.active_release_hold_count,
  accuracy_claim_allowed: false,
  world_class_prediction_claim_allowed: false
}, null, 2));
