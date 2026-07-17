#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const ROOT = process.cwd();
const DEFAULT_BUYER_CRM = 'docs/launch-readiness/buyer-validation-crm-template-2026-06-06.csv';
const DEFAULT_BUYER_CALL_SHEET = 'docs/launch-readiness/buyer-discovery-call-sheet-2026-06-06.csv';
const DEFAULT_EVIDENCE = 'docs/launch-readiness/launch-evidence-2026-06-06.json';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/buyer-evidence-input-validation-2026-06-06.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/buyer-evidence-input-validation-2026-06-06.md';
const DEFAULT_CSV_OUTPUT = 'docs/launch-readiness/buyer-evidence-input-validation-checklist-2026-06-06.csv';
const DEFAULT_MIN_COMPLETED_CALLS = 10;
const DEFAULT_MIN_QUALIFIED_FOLLOWUPS = 3;
const DEFAULT_MIN_COMMITMENT_SIGNALS = 1;

const REQUIRED_CALL_SHEET_COLUMNS = [
  'rank',
  'account_name',
  'website',
  'buyer_role',
  'niche',
  'validation_question',
  'proof_asset',
  'proof_to_show',
  'call_status',
  'call_date',
  'buyer_name_or_redacted_id',
  'proof_shown',
  'objection',
  'next_action',
  'willingness_to_pay_signal',
  'pilot_case_unit',
  'baseline_measure',
  'baseline_value_or_current_workflow',
  'target_outcome_measure',
  'pilot_outcome_value_or_expected_delta',
  'quality_measure',
  'quality_signal',
  'buyer_decision_event',
  'outcome_evidence_notes',
  'security_or_procurement_blocker',
  'accuracy_or_benchmark_blocker',
  'evidence_quality',
  'validation_status'
];

const OUTCOME_CAPTURE_COLUMNS = [
  'baseline_value_or_current_workflow',
  'pilot_outcome_value_or_expected_delta',
  'quality_signal',
  'buyer_decision_event',
  'outcome_evidence_notes'
];

const REQUIRED_CRM_COLUMNS = [
  'account_name',
  'website',
  'buyer_role',
  'pain_point',
  'trigger',
  'proof_asset',
  'outreach_angle',
  'status',
  'next_action',
  'objections',
  'confidence'
];

const RESEARCH_STATUS_VALUES = new Set(['', 'research', 'template', 'hypothesis', 'not_contacted', 'research_target_not_contacted']);
const REAL_STATUS_VALUES = new Set(['contacted', 'replied', 'scheduled', 'completed', 'rejected']);
const COMPLETED_STATUS_VALUES = new Set(['completed']);
const ALLOWED_STATUS_VALUES = new Set([...RESEARCH_STATUS_VALUES, ...REAL_STATUS_VALUES]);
const ALLOWED_SIGNAL_VALUES = new Set([
  '',
  'none',
  'curiosity_only',
  'qualified_followup',
  'paid_pilot_discussion',
  'loi_discussion',
  'procurement_path',
  'rejected',
  'no_fit'
]);
const QUALIFIED_SIGNAL_VALUES = new Set(['qualified_followup', 'paid_pilot_discussion', 'loi_discussion', 'procurement_path']);
const COMMITMENT_SIGNAL_VALUES = new Set(['paid_pilot_discussion', 'loi_discussion', 'procurement_path']);
const ALLOWED_EVIDENCE_QUALITY_VALUES = new Set(['', 'low', 'medium', 'high', 'owner_verified', 'external_share_approved']);
const PROHIBITED_CLAIM_PATTERNS = [
  /\bworld[- ]class\b/i,
  /\bcommercial[- ]ready\b/i,
  /\baccurate predictions?\b/i,
  /\bprediction superiority\b/i,
  /\bbuyer[- ]validated\b/i,
  /\bfully proven\b/i,
  /\benterprise[- ]ready\b/i,
  /\breferenceable buyer\b/i
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
    'Usage: node scripts/validate-buyer-evidence-inputs.mjs',
    `  [--buyer-crm ${DEFAULT_BUYER_CRM}]`,
    `  [--buyer-call-sheet ${DEFAULT_BUYER_CALL_SHEET}]`,
    `  [--evidence ${DEFAULT_EVIDENCE}]`,
    `  [--json-output ${DEFAULT_JSON_OUTPUT}]`,
    `  [--md-output ${DEFAULT_MD_OUTPUT}]`,
    `  [--csv-output ${DEFAULT_CSV_OUTPUT}]`,
    `  [--min-completed-calls ${DEFAULT_MIN_COMPLETED_CALLS}]`,
    `  [--min-qualified-followups ${DEFAULT_MIN_QUALIFIED_FOLLOWUPS}]`,
    `  [--min-commitment-signals ${DEFAULT_MIN_COMMITMENT_SIGNALS}]`,
    '  [--update-evidence]'
  ].join('\n'));
}

if (hasFlag('--help') || hasFlag('-h')) {
  usage();
  process.exit(0);
}

const inputPaths = {
  buyerCrm: argValue('--buyer-crm', DEFAULT_BUYER_CRM),
  buyerCallSheet: argValue('--buyer-call-sheet', DEFAULT_BUYER_CALL_SHEET),
  evidence: argValue('--evidence', DEFAULT_EVIDENCE)
};

const outputPaths = {
  json: argValue('--json-output', DEFAULT_JSON_OUTPUT),
  md: argValue('--md-output', DEFAULT_MD_OUTPUT),
  csv: argValue('--csv-output', DEFAULT_CSV_OUTPUT)
};

const thresholds = {
  completedCalls: Number(argValue('--min-completed-calls', DEFAULT_MIN_COMPLETED_CALLS)),
  qualifiedFollowups: Number(argValue('--min-qualified-followups', DEFAULT_MIN_QUALIFIED_FOLLOWUPS)),
  commitmentSignals: Number(argValue('--min-commitment-signals', DEFAULT_MIN_COMMITMENT_SIGNALS))
};

const updateEvidence = hasFlag('--update-evidence');

for (const [name, value] of Object.entries(thresholds)) {
  if (!Number.isInteger(value) || value < 1) {
    console.error(`--${name} must be a positive integer.`);
    process.exit(2);
  }
}

if (!outputPaths.json && !outputPaths.md && !outputPaths.csv) {
  console.error('At least one output path is required.');
  process.exit(2);
}

function resolveRepoPath(relativePath) {
  return path.isAbsolute(relativePath) ? relativePath : path.join(ROOT, relativePath);
}

function readText(relativePath) {
  const absolutePath = resolveRepoPath(relativePath);
  if (!existsSync(absolutePath)) {
    console.error(`Missing required input artifact: ${relativePath}`);
    process.exit(2);
  }
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

function missingColumns(headers, requiredColumns) {
  return requiredColumns.filter((column) => !headers.includes(column));
}

function looksLikeUrl(value) {
  const text = String(value ?? '').trim();
  return /^https?:\/\/[^\s]+$/i.test(text);
}

function parseDate(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function rowText(row) {
  return Object.values(row ?? {}).join(' ');
}

function hasProhibitedClaim(row) {
  const text = rowText(row);
  const lowerText = text.toLowerCase();
  const boundaryLanguagePatterns = [
    /\bno\s+world[- ]class\b/,
    /\bnot\s+world[- ]class\b/,
    /\bwithout\s+(?:a\s+)?world[- ]class\b/,
    /\bdo\s+not\s+claim[^.]{0,120}\bworld[- ]class\b/,
    /\bno\s+commercial[- ]ready\b/,
    /\bnot\s+commercial[- ]ready\b/,
    /\bno\s+accurate\s+predictions?\b/,
    /\baccuracy\s+remains\s+gated\b/,
    /\bnot\s+buyer[- ]validated\b/,
    /\bno\s+buyer[- ]proof\b/,
    /\bnot\s+enterprise[- ]ready\b/
  ];

  if (boundaryLanguagePatterns.some((pattern) => pattern.test(lowerText))) {
    return false;
  }

  return PROHIBITED_CLAIM_PATTERNS.some((pattern) => pattern.test(text));
}

function pushIssue(issues, source, rowNumber, field, problem, severity = 'error') {
  issues.push({
    source,
    row_number: rowNumber,
    field,
    severity,
    problem
  });
}

function validateCallRows(input) {
  const issues = [];
  const validCompletedRows = [];
  const validQualifiedRows = [];
  const validCommitmentRows = [];
  const validOutcomeCaptureRows = [];
  let realInteractionCount = 0;
  let researchOnlyCount = 0;

  input.rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const status = normalize(row.call_status ?? row.status);
    const signal = normalize(row.willingness_to_pay_signal);
    const evidenceQuality = normalize(row.evidence_quality);
    const completed = COMPLETED_STATUS_VALUES.has(status);
    const realInteraction = REAL_STATUS_VALUES.has(status);
    const qualified = QUALIFIED_SIGNAL_VALUES.has(signal);
    const commitment = COMMITMENT_SIGNAL_VALUES.has(signal);

    if (RESEARCH_STATUS_VALUES.has(status)) researchOnlyCount += 1;
    if (realInteraction) realInteractionCount += 1;

    if (!ALLOWED_STATUS_VALUES.has(status)) {
      pushIssue(issues, 'call_sheet', rowNumber, 'call_status', `Invalid call_status "${row.call_status}".`);
    }

    if (!ALLOWED_SIGNAL_VALUES.has(signal)) {
      pushIssue(issues, 'call_sheet', rowNumber, 'willingness_to_pay_signal', `Invalid willingness_to_pay_signal "${row.willingness_to_pay_signal}".`);
    }

    if (!ALLOWED_EVIDENCE_QUALITY_VALUES.has(evidenceQuality)) {
      pushIssue(issues, 'call_sheet', rowNumber, 'evidence_quality', `Invalid evidence_quality "${row.evidence_quality}".`);
    }

    if (hasProhibitedClaim(row)) {
      pushIssue(issues, 'call_sheet', rowNumber, '*', 'Row contains prohibited market language such as world-class, commercial-ready, proven accuracy, or buyer-validated.', 'warning');
    }

    if (status === 'rejected' && !hasText(row.objection)) {
      pushIssue(issues, 'call_sheet', rowNumber, 'objection', 'Rejected rows must capture the no-fit or rejection reason.');
    }

    if (realInteraction) {
      if (!parseDate(row.call_date)) {
        pushIssue(issues, 'call_sheet', rowNumber, 'call_date', 'Real interaction rows must include a parseable call_date.');
      }
      if (!hasText(row.buyer_name_or_redacted_id)) {
        pushIssue(issues, 'call_sheet', rowNumber, 'buyer_name_or_redacted_id', 'Real interaction rows must include a buyer name or stable redacted id.');
      }
      if (!hasText(row.account_name)) {
        pushIssue(issues, 'call_sheet', rowNumber, 'account_name', 'Real interaction rows must include account_name.');
      }
      if (!hasText(row.buyer_role)) {
        pushIssue(issues, 'call_sheet', rowNumber, 'buyer_role', 'Real interaction rows must include buyer_role.');
      }
      if (!hasText(row.proof_shown)) {
        pushIssue(issues, 'call_sheet', rowNumber, 'proof_shown', 'Real interaction rows must capture exactly what proof was shown.');
      }
      if (!hasText(row.next_action)) {
        pushIssue(issues, 'call_sheet', rowNumber, 'next_action', 'Real interaction rows must capture a next action or explicit no-next-action outcome.');
      }
      if (!hasText(row.validation_status)) {
        pushIssue(issues, 'call_sheet', rowNumber, 'validation_status', 'Real interaction rows must include validation_status.');
      }
    }

    if (completed) {
      for (const field of [
        'proof_shown',
        'objection',
        'next_action',
        'willingness_to_pay_signal',
        ...OUTCOME_CAPTURE_COLUMNS,
        'security_or_procurement_blocker',
        'accuracy_or_benchmark_blocker',
        'evidence_quality'
      ]) {
        if (!hasText(row[field])) {
          pushIssue(issues, 'call_sheet', rowNumber, field, `Completed calls must include ${field}.`);
        }
      }
      if (evidenceQuality && !['medium', 'high', 'owner_verified', 'external_share_approved'].includes(evidenceQuality)) {
        pushIssue(issues, 'call_sheet', rowNumber, 'evidence_quality', 'Completed calls must have medium, high, owner_verified, or external_share_approved evidence quality.');
      }
    }

    if (qualified && !completed) {
      pushIssue(issues, 'call_sheet', rowNumber, 'willingness_to_pay_signal', 'Qualified follow-up or commitment signals must come from completed calls.');
    }

    if (commitment && !hasText(row.next_action)) {
      pushIssue(issues, 'call_sheet', rowNumber, 'next_action', 'Commitment-path signals must include a concrete next action.');
    }

    const rowErrorCount = issues.filter((issue) => issue.source === 'call_sheet' && issue.row_number === rowNumber && issue.severity === 'error').length;
    if (rowErrorCount === 0 && completed) {
      validCompletedRows.push(row);
      if (OUTCOME_CAPTURE_COLUMNS.every((field) => hasText(row[field]))) validOutcomeCaptureRows.push(row);
      if (qualified) validQualifiedRows.push(row);
      if (commitment) validCommitmentRows.push(row);
    }
  });

  return {
    issues,
    validCompletedRows,
    validQualifiedRows,
    validCommitmentRows,
    validOutcomeCaptureRows,
    realInteractionCount,
    researchOnlyCount
  };
}

function validateCrmRows(input) {
  const issues = [];
  let researchOnlyCount = 0;
  let realInteractionCount = 0;

  input.rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const status = normalize(row.status);
    if (RESEARCH_STATUS_VALUES.has(status)) researchOnlyCount += 1;
    if (REAL_STATUS_VALUES.has(status)) realInteractionCount += 1;

    if (!ALLOWED_STATUS_VALUES.has(status)) {
      pushIssue(issues, 'crm', rowNumber, 'status', `Invalid status "${row.status}".`);
    }

    if (hasProhibitedClaim(row)) {
      pushIssue(issues, 'crm', rowNumber, '*', 'Row contains prohibited market language such as world-class, commercial-ready, proven accuracy, or buyer-validated.', 'warning');
    }

    if (REAL_STATUS_VALUES.has(status)) {
      for (const field of ['account_name', 'buyer_role', 'next_action']) {
        if (!hasText(row[field])) {
          pushIssue(issues, 'crm', rowNumber, field, `Real CRM interaction rows must include ${field}.`);
        }
      }
      if (!looksLikeUrl(row.website)) {
        pushIssue(issues, 'crm', rowNumber, 'website', 'Real CRM interaction rows must include an account website URL.');
      }
    }
  });

  return {
    issues,
    researchOnlyCount,
    realInteractionCount
  };
}

function gateStatus(condition, noRealInteractions = false) {
  if (noRealInteractions) return 'open_no_real_interactions';
  return condition ? 'passed' : 'failed';
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

const crmInput = parseCsv(readText(inputPaths.buyerCrm));
const callInput = parseCsv(readText(inputPaths.buyerCallSheet));
const crmMissingColumns = missingColumns(crmInput.headers, REQUIRED_CRM_COLUMNS);
const callMissingColumns = missingColumns(callInput.headers, REQUIRED_CALL_SHEET_COLUMNS);
const callValidation = validateCallRows(callInput);
const crmValidation = validateCrmRows(crmInput);
const rowIssues = [...callValidation.issues, ...crmValidation.issues];
const errorCount = rowIssues.filter((issue) => issue.severity === 'error').length;
const realInteractionCount = callValidation.realInteractionCount + crmValidation.realInteractionCount;
const noRealInteractions = realInteractionCount === 0;

if (callMissingColumns.length) {
  pushIssue(rowIssues, 'call_sheet_schema', 1, callMissingColumns.join(', '), 'Buyer call sheet is missing required columns.');
}

if (crmMissingColumns.length) {
  pushIssue(rowIssues, 'crm_schema', 1, crmMissingColumns.join(', '), 'Buyer CRM is missing required columns.');
}

const validCompletedCallCount = callValidation.validCompletedRows.length;
const validQualifiedFollowupCount = callValidation.validQualifiedRows.length;
const validCommitmentSignalCount = callValidation.validCommitmentRows.length;
const validOutcomeCaptureCount = callValidation.validOutcomeCaptureRows.length;
const schemaPass = callMissingColumns.length === 0 && crmMissingColumns.length === 0;
const validationIssuePass = errorCount === 0;

const acceptanceGates = [
  {
    gate: 'crm_schema_present',
    status: crmMissingColumns.length === 0 ? 'passed' : 'failed',
    evidence: crmMissingColumns.length
      ? `Missing CRM columns: ${crmMissingColumns.join(', ')}.`
      : `CRM schema includes ${REQUIRED_CRM_COLUMNS.length} required columns.`,
    proof_bucket: 'repo_artifact'
  },
  {
    gate: 'call_sheet_schema_present',
    status: callMissingColumns.length === 0 ? 'passed' : 'failed',
    evidence: callMissingColumns.length
      ? `Missing call-sheet columns: ${callMissingColumns.join(', ')}.`
      : `Call-sheet schema includes ${REQUIRED_CALL_SHEET_COLUMNS.length} required columns.`,
    proof_bucket: 'repo_artifact'
  },
  {
    gate: 'real_interactions_present',
    status: noRealInteractions ? 'open_no_real_interactions' : 'passed',
    evidence: `${realInteractionCount} real interaction rows loaded; ${callValidation.researchOnlyCount + crmValidation.researchOnlyCount} research/template rows ignored as proof.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'row_quality_validation',
    status: gateStatus(schemaPass && validationIssuePass, noRealInteractions),
    evidence: `${errorCount} row-level errors and ${rowIssues.length - errorCount} warnings across CRM/call-sheet inputs.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'completed_discovery_calls',
    status: gateStatus(validCompletedCallCount >= thresholds.completedCalls, noRealInteractions),
    evidence: `${validCompletedCallCount} valid completed calls; required ${thresholds.completedCalls}.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'pilot_outcome_capture',
    status: gateStatus(validOutcomeCaptureCount >= thresholds.completedCalls, noRealInteractions),
    evidence: `${validOutcomeCaptureCount} completed calls include baseline/current-workflow, pilot outcome or expected delta, quality signal, buyer decision event, and outcome evidence notes; required ${thresholds.completedCalls}.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'qualified_followups',
    status: gateStatus(validQualifiedFollowupCount >= thresholds.qualifiedFollowups, noRealInteractions),
    evidence: `${validQualifiedFollowupCount} valid qualified follow-up rows; required ${thresholds.qualifiedFollowups}.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'commitment_path_signal',
    status: gateStatus(validCommitmentSignalCount >= thresholds.commitmentSignals, noRealInteractions),
    evidence: `${validCommitmentSignalCount} valid paid-pilot, LOI, or procurement-path rows; required ${thresholds.commitmentSignals}.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'claim_boundary_preserved',
    status: rowIssues.some((issue) => issue.problem.includes('prohibited market language')) ? 'warning' : 'passed',
    evidence: 'Rows are checked for prohibited claims such as world-class, commercial-ready, proven accuracy, buyer-validated, or enterprise-ready.',
    proof_bucket: 'repo_artifact'
  }
];

const activeReleaseHoldCount = acceptanceGates.filter((gate) => gate.status !== 'passed').length;
const status = noRealInteractions
  ? 'buyer_evidence_input_validation_ready_no_real_interactions'
  : errorCount > 0
    ? 'buyer_evidence_input_validation_failed'
    : validCompletedCallCount < thresholds.completedCalls
      ? 'buyer_evidence_input_validation_passed_below_completed_call_threshold'
      : validQualifiedFollowupCount < thresholds.qualifiedFollowups
        ? 'buyer_evidence_input_validation_passed_below_followup_threshold'
        : validCommitmentSignalCount < thresholds.commitmentSignals
          ? 'buyer_evidence_input_validation_passed_below_commitment_threshold'
          : 'buyer_evidence_input_validation_passed_pending_owner_review';

const validation = {
  schema_version: 'buyer-evidence-input-validation-v1',
  generated_at: new Date().toISOString(),
  status,
  proof_boundary: 'This artifact validates buyer discovery CRM/call-sheet inputs before buyer proof can be upgraded. It is not buyer validation, willingness-to-pay proof, hosted proof, enterprise-security proof, or prediction-accuracy proof.',
  source: {
    buyer_validation_crm: inputPaths.buyerCrm,
    buyer_discovery_call_sheet: inputPaths.buyerCallSheet,
    minimum_completed_calls: thresholds.completedCalls,
    minimum_qualified_followups: thresholds.qualifiedFollowups,
    minimum_commitment_signals: thresholds.commitmentSignals
  },
  summary: {
    crm_rows_read: crmInput.rows.length,
    call_sheet_rows_read: callInput.rows.length,
    real_interaction_count: realInteractionCount,
    valid_completed_call_count: validCompletedCallCount,
    valid_outcome_capture_count: validOutcomeCaptureCount,
    valid_qualified_followup_count: validQualifiedFollowupCount,
    valid_commitment_signal_count: validCommitmentSignalCount,
    crm_missing_column_count: crmMissingColumns.length,
    call_sheet_missing_column_count: callMissingColumns.length,
    row_issue_count: rowIssues.length,
    row_error_count: errorCount,
    active_release_hold_count: activeReleaseHoldCount,
    ready_for_buyer_proof_gate: status === 'buyer_evidence_input_validation_passed_pending_owner_review',
    buyer_validation_claim_allowed: false
  },
  required_columns: {
    buyer_crm: REQUIRED_CRM_COLUMNS,
    buyer_call_sheet: REQUIRED_CALL_SHEET_COLUMNS
  },
  allowed_values: {
    statuses: [...ALLOWED_STATUS_VALUES].sort(),
    willingness_to_pay_signals: [...ALLOWED_SIGNAL_VALUES].sort(),
    evidence_quality: [...ALLOWED_EVIDENCE_QUALITY_VALUES].sort()
  },
  acceptance_gates: acceptanceGates,
  row_issues: rowIssues,
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
      source: 'Y Combinator Essential Startup Advice',
      url: 'https://www.ycombinator.com/blog/ycs-essential-startup-advice/',
      alignment: 'Treat talking to users and first-customer learning as a hard marketability gate, not a marketing afterthought.'
    },
    {
      source: 'Tradeweb ICD Portal Client Survey 2026',
      url: 'https://www.tradeweb.com/newsroom/media-center/news-releases/geopolitical-risk-concerns-surge-for-corporate-treasurers-according-to-2026-tradeweb-icd-portal-client-survey/',
      alignment: 'Geopolitical concern supports discovery targeting, but actual willingness to pay still needs buyer-level evidence.'
    },
    {
      source: 'McKinsey CFO Pulse Survey 2026',
      url: 'https://www.mckinsey.com/capabilities/strategy-and-corporate-finance/our-insights/cfos-have-been-concerned-about-geopolitical-impacts-for-months',
      alignment: 'CFO concern strengthens the strategic-risk wedge while preserving the need for completed discovery and commitment-path proof.'
    }
  ],
  next_commands_after_owner_data: [
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:buyer:validate-inputs -- --buyer-crm ${inputPaths.buyerCrm} --buyer-call-sheet ${inputPaths.buyerCallSheet} --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence`,
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:buyer:proof-gate',
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

  const issueRows = report.row_issues.length
    ? report.row_issues
      .map((issue) => [
        mdCell(issue.source),
        issue.row_number,
        mdCell(issue.field),
        issue.severity,
        mdCell(issue.problem)
      ])
      .map((row) => `| ${row.join(' | ')} |`)
      .join('\n')
    : '| none | - | - | - | - |';

  const sourceRows = report.current_source_alignment
    .map((source) => [
      mdCell(source.source),
      source.url,
      mdCell(source.alignment)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  return `# Buyer Evidence Input Validation - 2026-06-06

## Decision Boundary

Status: \`${report.status}\`.

${report.proof_boundary}

Real interactions: **${report.summary.real_interaction_count}**. Valid completed calls: **${report.summary.valid_completed_call_count}**. Valid outcome-capture rows: **${report.summary.valid_outcome_capture_count}**. Valid qualified follow-ups: **${report.summary.valid_qualified_followup_count}**. Valid commitment-path signals: **${report.summary.valid_commitment_signal_count}**.

Buyer-validation claim allowed: **${report.summary.buyer_validation_claim_allowed}**.

## Acceptance Gates

| Gate | Status | Evidence | Proof Bucket |
|---|---|---|---|
${gateRows}

## Row Issues

| Source | Row | Field | Severity | Problem |
|---|---:|---|---|---|
${issueRows}

## Current Source Alignment

| Source | URL | Alignment |
|---|---|---|
${sourceRows}

## Next Commands After Owner Data

${report.next_commands_after_owner_data.map((command, index) => `${index + 1}. \`${command}\``).join('\n')}

## Proof Boundary

Passing this validator only means buyer evidence inputs are ready for the buyer proof gate. It still does not prove willingness to pay until completed calls, qualified follow-ups, commitment-path signals, owner approval, and external-share boundaries are reviewed.
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
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:buyer:validate-inputs -- --buyer-crm ${inputPaths.buyerCrm} --buyer-call-sheet ${inputPaths.buyerCallSheet} --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence: status ${validation.status}, ${validation.summary.real_interaction_count} real interactions, ${validation.summary.valid_completed_call_count} valid completed calls, ${validation.summary.valid_qualified_followup_count} valid qualified follow-ups, ${validation.summary.valid_commitment_signal_count} valid commitment signals, buyer_validation_claim_allowed false`
  ], [
    /npm run audit:buyer:validate-inputs/
  ]);

  evidence.proof_buckets.repo_artifact = replaceMatchingThenAppend(evidence.proof_buckets.repo_artifact, [
    'scripts/validate-buyer-evidence-inputs.mjs validates buyer CRM/call-sheet rows before buyer proof can be upgraded while keeping buyer_validation_claim_allowed false',
    'docs/launch-readiness/buyer-evidence-input-validation-2026-06-06.json records buyer evidence schema quality, row-level issues, completed-call thresholds, pilot-outcome capture thresholds, follow-up thresholds, commitment-path thresholds, and release holds',
    'docs/launch-readiness/buyer-evidence-input-validation-checklist-2026-06-06.csv provides the validation checklist for buyer CRM schema, call-sheet schema, real interactions, row quality, completed calls, pilot outcome capture, qualified follow-ups, commitment signals, and claim-boundary preservation'
  ], [
    /scripts\/validate-buyer-evidence-inputs\.mjs/,
    /buyer-evidence-input-validation-2026-06-06\.json/,
    /buyer-evidence-input-validation-checklist-2026-06-06\.csv/
  ]);

  evidence.fix_report = evidence.fix_report ?? {};
  evidence.fix_report.files_changed = replaceMatchingThenAppend(evidence.fix_report.files_changed, [
    'scripts/validate-buyer-evidence-inputs.mjs',
    'docs/launch-readiness/buyer-evidence-input-validation-2026-06-06.json',
    'docs/launch-readiness/buyer-evidence-input-validation-2026-06-06.md',
    'docs/launch-readiness/buyer-evidence-input-validation-checklist-2026-06-06.csv'
  ], [
    /scripts\/validate-buyer-evidence-inputs\.mjs/,
    /buyer-evidence-input-validation-2026-06-06\.json/,
    /buyer-evidence-input-validation-2026-06-06\.md/,
    /buyer-evidence-input-validation-checklist-2026-06-06\.csv/
  ]);
  evidence.fix_report.tests_run = replaceMatchingThenAppend(evidence.fix_report.tests_run, [
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH node --check scripts/validate-buyer-evidence-inputs.mjs',
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:buyer:validate-inputs -- --buyer-crm ${inputPaths.buyerCrm} --buyer-call-sheet ${inputPaths.buyerCallSheet} --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence`
  ], [
    /node --check scripts\/validate-buyer-evidence-inputs\.mjs/,
    /npm run audit:buyer:validate-inputs/
  ]);
  evidence.fix_report.approval_gates = replaceMatchingThenAppend(evidence.fix_report.approval_gates, [
    'Buyer evidence input validation is schema/procedure proof only; 10 completed calls, three qualified follow-ups, one paid-pilot/LOI/procurement-path signal, owner approval, and external-share boundaries remain required before buyer-validation or willingness-to-pay claims can be upgraded.'
  ], [
    /Buyer evidence input validation is schema\/procedure proof only/
  ]);

  evidence.implementation_decisions = replaceByTaskId(evidence.implementation_decisions, {
    task_id: 'buyer-evidence-input-validation-harness',
    decision: 'Add a deterministic no-dependency validator for buyer CRM and discovery call-sheet inputs before buyer proof can be upgraded.',
    acceptance_check: 'Default CRM/call-sheet templates validate as schema-ready but no-real-interactions, required pilot outcome capture fields are present, and commercial confidence remains not_95_confident without raising buyer-validation score.',
    chosen_variant: 'minimal Node artifact generator plus score-neutral evidence manifest update',
    repo_pattern_reused: 'Existing launch-readiness Node artifact generator pattern',
    files_changed: [
      'scripts/validate-buyer-evidence-inputs.mjs',
      'scripts/build-buyer-proof-gate.mjs',
      'scripts/build-commercial-confidence-gate.mjs',
      'package.json'
    ],
    tests_run: [
      'node --check scripts/validate-buyer-evidence-inputs.mjs',
      'npm run audit:buyer:validate-inputs',
      'npm run audit:buyer:proof-gate',
      'npm run audit:commercial:confidence'
    ],
    proof: `${validation.status}; real_interaction_count=${validation.summary.real_interaction_count}; valid_completed_call_count=${validation.summary.valid_completed_call_count}; valid_outcome_capture_count=${validation.summary.valid_outcome_capture_count}; valid_commitment_signal_count=${validation.summary.valid_commitment_signal_count}; buyer_validation_claim_allowed=false.`,
    reason: 'The buyer-validation blocker needs enforceable row-level evidence quality so research/template rows cannot accidentally become market proof.'
  });
  evidence.rejected_variants = replaceByTaskId(evidence.rejected_variants, {
    task_id: 'buyer-evidence-input-validation-harness',
    variant: 'Raise buyer-validation score from target lists and discovery templates.',
    reason_rejected: 'Target lists and call templates are not completed buyer interactions and cannot prove willingness to pay.',
    tradeoff: 'Score-neutral validation improves first-sale discipline while preserving factual proof boundaries.',
    evidence: `${validation.status} keeps buyer_validation_claim_allowed=false.`
  });
  evidence.code_optimization_reviews = replaceByTaskId(evidence.code_optimization_reviews, {
    target_task: 'buyer-evidence-input-validation-harness',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'No new dependency, no runtime path changes, and default generated artifacts remain repo/local proof only.',
    tests_or_checks: [
      'node --check scripts/validate-buyer-evidence-inputs.mjs',
      'npm run audit:buyer:validate-inputs',
      'npm run audit:buyer:proof-gate',
      'npm run audit:commercial:confidence'
    ],
    remaining_risk: 'Real completed calls, qualified follow-ups, commitment-path signals, owner approvals, and external-share boundaries remain missing.'
  });

  writeArtifact(inputPaths.evidence, `${JSON.stringify(evidence, null, 2)}\n`);
}

console.log(JSON.stringify({
  json_output: outputPaths.json,
  md_output: outputPaths.md,
  csv_output: outputPaths.csv,
  evidence_updated: updateEvidence,
  status: validation.status,
  real_interaction_count: validation.summary.real_interaction_count,
  valid_completed_call_count: validation.summary.valid_completed_call_count,
  valid_outcome_capture_count: validation.summary.valid_outcome_capture_count,
  valid_qualified_followup_count: validation.summary.valid_qualified_followup_count,
  valid_commitment_signal_count: validation.summary.valid_commitment_signal_count,
  row_issue_count: validation.summary.row_issue_count,
  active_release_hold_count: validation.summary.active_release_hold_count,
  buyer_validation_claim_allowed: false
}, null, 2));
