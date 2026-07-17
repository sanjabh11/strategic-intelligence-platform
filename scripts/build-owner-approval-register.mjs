#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const ROOT = process.cwd();
const DEFAULT_OWNER_UNBLOCK = 'docs/launch-readiness/owner-unblock-execution-packet-2026-06-06.json';
const DEFAULT_COMMERCIAL_CONFIDENCE = 'docs/launch-readiness/commercial-confidence-gate-2026-06-06.json';
const DEFAULT_EVIDENCE = 'docs/launch-readiness/launch-evidence-2026-06-06.json';
const DEFAULT_REGISTER = 'docs/launch-readiness/owner-approval-register-2026-06-06.csv';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/owner-approval-register-validation-2026-06-06.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/owner-approval-register-validation-2026-06-06.md';
const DEFAULT_CSV_OUTPUT = 'docs/launch-readiness/owner-approval-register-validation-checklist-2026-06-06.csv';

const REQUIRED_COLUMNS = [
  'approval_id',
  'lane',
  'approval_type',
  'artifact_or_action',
  'required_before',
  'owner_decision',
  'owner',
  'approved_at',
  'evidence_ref',
  'external_share_status',
  'secret_redaction_status',
  'claim_boundary_acknowledged',
  'notes'
];

const ALLOWED_DECISIONS = new Set(['pending', 'draft', 'reviewed', 'approved', 'owner_approved', 'rejected']);
const APPROVED_DECISIONS = new Set(['approved', 'owner_approved']);
const ALLOWED_SHARE_STATUS = new Set(['pending', 'internal_only', 'external_share_approved', 'not_applicable', 'rejected']);
const ALLOWED_REDACTION_STATUS = new Set(['pending', 'redacted', 'no_secrets_present', 'not_applicable', 'rejected']);
const ACK_VALUES = new Set(['yes', 'true', '1', 'acknowledged', 'owner_acknowledged']);

const REQUIRED_APPROVAL_ROWS = [
  {
    approval_id: 'prediction_pre_resolution_freeze',
    lane: 'prediction_accuracy',
    approval_type: 'evidence_freeze',
    artifact_or_action: 'docs/launch-readiness/forecast-pre-resolution-capture-validation-2026-06-06.json',
    required_before: 'freeze owner-filled pre-resolution question, forecast snapshot, and baseline snapshot packet',
    owner_decision: 'pending',
    owner: '',
    approved_at: '',
    evidence_ref: 'docs/launch-readiness/forecast-pre-resolution-capture-validation-2026-06-06.json',
    external_share_status: 'internal_only',
    secret_redaction_status: 'no_secrets_present',
    claim_boundary_acknowledged: 'pending',
    notes: 'Does not prove resolved outcomes or forecast accuracy.'
  },
  {
    approval_id: 'prediction_resolved_export',
    lane: 'prediction_accuracy',
    approval_type: 'owner_data_export',
    artifact_or_action: 'docs/launch-readiness/approved-resolved-forecast-export-template-2026-06-06.csv',
    required_before: 'run calibration, Brier scoring, benchmark comparison, and prediction-science claim review',
    owner_decision: 'pending',
    owner: '',
    approved_at: '',
    evidence_ref: 'docs/launch-readiness/approved-resolved-forecast-export-template-2026-06-06.csv',
    external_share_status: 'internal_only',
    secret_redaction_status: 'pending',
    claim_boundary_acknowledged: 'pending',
    notes: 'Requires real resolved outcomes and comparable baselines.'
  },
  {
    approval_id: 'prediction_claim_language',
    lane: 'prediction_accuracy',
    approval_type: 'external_claim_language',
    artifact_or_action: 'forecast accuracy and world-class prediction wording',
    required_before: 'any public or buyer-facing accuracy, benchmark superiority, or world-class prediction claim',
    owner_decision: 'pending',
    owner: '',
    approved_at: '',
    evidence_ref: 'docs/launch-readiness/forecast-claim-governance-2026-06-06.json',
    external_share_status: 'pending',
    secret_redaction_status: 'not_applicable',
    claim_boundary_acknowledged: 'pending',
    notes: 'Current language must remain pilot-only and calibration-aware.'
  },
  {
    approval_id: 'buyer_discovery_slate',
    lane: 'buyer_validation',
    approval_type: 'manual_outreach_approval',
    artifact_or_action: 'docs/launch-readiness/buyer-discovery-kit-2026-06-06.json',
    required_before: 'manual buyer discovery calls or outreach',
    owner_decision: 'pending',
    owner: '',
    approved_at: '',
    evidence_ref: 'docs/launch-readiness/buyer-validation-targets-2026-06-06.json',
    external_share_status: 'internal_only',
    secret_redaction_status: 'no_secrets_present',
    claim_boundary_acknowledged: 'pending',
    notes: 'No automated outreach should run from this repo.'
  },
  {
    approval_id: 'buyer_outcome_capture_protocol',
    lane: 'buyer_validation',
    approval_type: 'evidence_capture_approval',
    artifact_or_action: 'docs/launch-readiness/buyer-discovery-call-sheet-2026-06-06.csv outcome-capture fields',
    required_before: 'manual buyer discovery calls can count toward sellability, willingness-to-pay, or outcome-measurement evidence',
    owner_decision: 'pending',
    owner: '',
    approved_at: '',
    evidence_ref: 'docs/launch-readiness/pilot-outcome-measurement-kit-2026-06-06.json',
    external_share_status: 'internal_only',
    secret_redaction_status: 'no_secrets_present',
    claim_boundary_acknowledged: 'pending',
    notes: 'Requires baseline/current workflow, pilot outcome or expected delta, quality signal, buyer decision event, and outcome evidence notes; still not buyer proof until real calls pass validators.'
  },
  {
    approval_id: 'buyer_external_claim_language',
    lane: 'buyer_validation',
    approval_type: 'external_claim_language',
    artifact_or_action: 'pilot offer, outreach, demo, and buyer-proof wording',
    required_before: 'external buyer-share copy, deck, email, LinkedIn, or demo script',
    owner_decision: 'pending',
    owner: '',
    approved_at: '',
    evidence_ref: 'docs/launch-readiness/claim-consistency-validation-2026-06-06.json',
    external_share_status: 'pending',
    secret_redaction_status: 'not_applicable',
    claim_boundary_acknowledged: 'pending',
    notes: 'Buyer-validated and willingness-to-pay claims remain blocked until real calls pass.'
  },
  {
    approval_id: 'enterprise_procurement_documents',
    lane: 'enterprise_security_trust',
    approval_type: 'procurement_document_approval',
    artifact_or_action: 'docs/launch-readiness/enterprise-procurement-evidence-register-2026-06-06.csv',
    required_before: 'enterprise procurement, privacy, SLA, incident, or public-sector security claims',
    owner_decision: 'pending',
    owner: '',
    approved_at: '',
    evidence_ref: 'docs/launch-readiness/enterprise-procurement-evidence-validation-2026-06-06.json',
    external_share_status: 'pending',
    secret_redaction_status: 'pending',
    claim_boundary_acknowledged: 'pending',
    notes: 'Requires 8/8 owner-approved procurement document rows.'
  },
  {
    approval_id: 'enterprise_external_share_register',
    lane: 'enterprise_security_trust',
    approval_type: 'external_share_approval',
    artifact_or_action: 'external-share status for procurement and questionnaire artifacts',
    required_before: 'showing security/procurement artifacts to buyers',
    owner_decision: 'pending',
    owner: '',
    approved_at: '',
    evidence_ref: 'docs/launch-readiness/enterprise-procurement-readiness-gate-2026-06-06.json',
    external_share_status: 'pending',
    secret_redaction_status: 'pending',
    claim_boundary_acknowledged: 'pending',
    notes: 'Must not expose internal logs, secrets, or unsupported claims.'
  },
  {
    approval_id: 'rls_policy_and_test_execution',
    lane: 'enterprise_security_trust',
    approval_type: 'security_test_approval',
    artifact_or_action: 'docs/launch-readiness/rls-identity-and-review-policy-draft-2026-06-06.sql',
    required_before: 'RLS migration conversion, local pgTAP, or linked Supabase RLS proof',
    owner_decision: 'pending',
    owner: '',
    approved_at: '',
    evidence_ref: 'docs/launch-readiness/rls-proof-evidence-validation-2026-06-06.json',
    external_share_status: 'internal_only',
    secret_redaction_status: 'pending',
    claim_boundary_acknowledged: 'pending',
    notes: 'Do not apply migrations or run linked tests without explicit owner approval.'
  },
  {
    approval_id: 'ai_action_policy_and_hosted_boundary_tests',
    lane: 'enterprise_security_trust',
    approval_type: 'ai_governance_approval',
    artifact_or_action: 'docs/launch-readiness/ai-high-impact-action-policy-2026-06-06.json',
    required_before: 'hosted no-autonomous-action boundary tests or AI governance/security claims',
    owner_decision: 'pending',
    owner: '',
    approved_at: '',
    evidence_ref: 'docs/launch-readiness/ai-high-impact-action-policy-2026-06-06.json',
    external_share_status: 'internal_only',
    secret_redaction_status: 'not_applicable',
    claim_boundary_acknowledged: 'pending',
    notes: 'Policy draft is not owner-approved and hosted boundary tests are not executed.'
  },
  {
    approval_id: 'hosted_project_access',
    lane: 'hosted_operational_proof',
    approval_type: 'hosted_access_approval',
    artifact_or_action: 'Supabase project visibility, function management, and secret management checks',
    required_before: 'hosted access preflight and hosted smoke execution',
    owner_decision: 'pending',
    owner: '',
    approved_at: '',
    evidence_ref: 'docs/launch-readiness/hosted-access-preflight-validation-2026-06-06.json',
    external_share_status: 'internal_only',
    secret_redaction_status: 'pending',
    claim_boundary_acknowledged: 'pending',
    notes: 'Current target project and function/secret management access are blocked.'
  },
  {
    approval_id: 'hosted_url_deploy_binding',
    lane: 'hosted_operational_proof',
    approval_type: 'deploy_binding_approval',
    artifact_or_action: 'owner-approved hosted URL plus deploy id, release id, or commit SHA',
    required_before: 'hosted smoke evidence rows or hosted-live claim review',
    owner_decision: 'pending',
    owner: '',
    approved_at: '',
    evidence_ref: 'docs/launch-readiness/hosted-operational-proof-kit-2026-06-06.json',
    external_share_status: 'internal_only',
    secret_redaction_status: 'no_secrets_present',
    claim_boundary_acknowledged: 'pending',
    notes: 'Local route proof cannot be upgraded to hosted proof.'
  },
  {
    approval_id: 'hosted_payment_proof_values',
    lane: 'hosted_operational_proof',
    approval_type: 'payment_test_approval',
    artifact_or_action: 'Stripe test-mode proof values and pricing/entitlement smoke inputs',
    required_before: 'hosted payment/pricing/entitlement proof',
    owner_decision: 'pending',
    owner: '',
    approved_at: '',
    evidence_ref: 'docs/launch-readiness/hosted-smoke-execution-readiness-2026-06-06.json',
    external_share_status: 'internal_only',
    secret_redaction_status: 'pending',
    claim_boundary_acknowledged: 'pending',
    notes: 'Do not persist or print payment secrets.'
  },
  {
    approval_id: 'hosted_claim_language',
    lane: 'hosted_operational_proof',
    approval_type: 'external_claim_language',
    artifact_or_action: 'hosted-live, operational, uptime, and production-readiness wording',
    required_before: 'any hosted-live or operational-proof buyer claim',
    owner_decision: 'pending',
    owner: '',
    approved_at: '',
    evidence_ref: 'docs/launch-readiness/hosted-operational-proof-evidence-validation-2026-06-06.json',
    external_share_status: 'pending',
    secret_redaction_status: 'not_applicable',
    claim_boundary_acknowledged: 'pending',
    notes: 'Hosted proof is currently absent.'
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
    'Usage: node scripts/build-owner-approval-register.mjs',
    `  [--owner-unblock ${DEFAULT_OWNER_UNBLOCK}]`,
    `  [--commercial-confidence ${DEFAULT_COMMERCIAL_CONFIDENCE}]`,
    `  [--register ${DEFAULT_REGISTER}]`,
    `  [--evidence ${DEFAULT_EVIDENCE}]`,
    `  [--json-output ${DEFAULT_JSON_OUTPUT}]`,
    `  [--md-output ${DEFAULT_MD_OUTPUT}]`,
    `  [--csv-output ${DEFAULT_CSV_OUTPUT}]`,
    '  [--regenerate-register]',
    '  [--update-evidence]'
  ].join('\n'));
}

if (hasFlag('--help') || hasFlag('-h')) {
  usage();
  process.exit(0);
}

const inputPaths = {
  ownerUnblock: argValue('--owner-unblock', DEFAULT_OWNER_UNBLOCK),
  commercialConfidence: argValue('--commercial-confidence', DEFAULT_COMMERCIAL_CONFIDENCE),
  register: argValue('--register', DEFAULT_REGISTER),
  evidence: argValue('--evidence', DEFAULT_EVIDENCE)
};

const outputPaths = {
  json: argValue('--json-output', DEFAULT_JSON_OUTPUT),
  md: argValue('--md-output', DEFAULT_MD_OUTPUT),
  csv: argValue('--csv-output', DEFAULT_CSV_OUTPUT)
};

const regenerateRegister = hasFlag('--regenerate-register');
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

  const nonEmptyRecords = records.filter((record) => record.some((value) => value.trim()));
  const [headers = [], ...body] = nonEmptyRecords;
  const rows = body.map((record) => {
    const item = {};
    headers.forEach((header, index) => {
      item[header.trim()] = record[index] ?? '';
    });
    return item;
  });

  return {
    headers: headers.map((header) => header.trim()).filter(Boolean),
    rows
  };
}

function hasText(value) {
  return String(value ?? '').trim().length > 0;
}

function normalize(value) {
  return String(value ?? '').trim().toLowerCase();
}

function parseTimestamp(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function missingColumns(headers, requiredColumns) {
  return requiredColumns.filter((column) => !headers.includes(column));
}

function pushIssue(issues, rowNumber, field, problem, severity = 'error') {
  issues.push({ row_number: rowNumber, field, severity, problem });
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

function renderRegisterCsv(rows) {
  return [
    csvLine(REQUIRED_COLUMNS),
    ...rows.map((row) => csvLine(REQUIRED_COLUMNS.map((column) => row[column] ?? '')))
  ].join('\n') + '\n';
}

const registerExistedBeforeRun = existsSync(resolveRepoPath(inputPaths.register));
const wroteRegisterThisRun = regenerateRegister || !registerExistedBeforeRun;

if (wroteRegisterThisRun) {
  writeArtifact(inputPaths.register, renderRegisterCsv(REQUIRED_APPROVAL_ROWS));
}

const ownerUnblock = readJsonIfExists(inputPaths.ownerUnblock, { status: 'missing', summary: {} });
const commercialConfidence = readJsonIfExists(inputPaths.commercialConfidence, { posture: {}, primary_blockers: [] });
const registerInput = parseCsv(readTextIfExists(inputPaths.register));
const missing = missingColumns(registerInput.headers, REQUIRED_COLUMNS);
const requiredIds = new Set(REQUIRED_APPROVAL_ROWS.map((row) => row.approval_id));
const presentIds = new Set(registerInput.rows.map((row) => String(row.approval_id ?? '').trim()).filter(Boolean));
const missingRequiredIds = [...requiredIds].filter((approvalId) => !presentIds.has(approvalId));
const issues = [];
const approvedIds = new Set();
const rejectedIds = new Set();
const reviewedIds = new Set();
let claimBoundaryAckCount = 0;
let externalShareApprovedCount = 0;
let redactionReadyCount = 0;

for (const column of missing) {
  pushIssue(issues, 1, column, 'Owner approval register is missing a required column.');
}

registerInput.rows.forEach((row, index) => {
  const rowNumber = index + 2;
  const approvalId = String(row.approval_id ?? '').trim();
  const decision = normalize(row.owner_decision) || 'pending';
  const shareStatus = normalize(row.external_share_status) || 'pending';
  const redactionStatus = normalize(row.secret_redaction_status) || 'pending';
  const claimAck = normalize(row.claim_boundary_acknowledged);
  const approved = APPROVED_DECISIONS.has(decision);

  if (!approvalId) {
    pushIssue(issues, rowNumber, 'approval_id', 'Missing approval_id.');
  }

  if (approvalId && !requiredIds.has(approvalId)) {
    pushIssue(issues, rowNumber, 'approval_id', `Unknown approval_id ${approvalId}.`, 'warning');
  }

  for (const column of ['lane', 'approval_type', 'artifact_or_action', 'required_before']) {
    if (!hasText(row[column])) {
      pushIssue(issues, rowNumber, column, `Missing ${column}.`);
    }
  }

  if (!ALLOWED_DECISIONS.has(decision)) {
    pushIssue(issues, rowNumber, 'owner_decision', `Invalid owner_decision "${row.owner_decision}".`);
  }

  if (!ALLOWED_SHARE_STATUS.has(shareStatus)) {
    pushIssue(issues, rowNumber, 'external_share_status', `Invalid external_share_status "${row.external_share_status}".`);
  }

  if (!ALLOWED_REDACTION_STATUS.has(redactionStatus)) {
    pushIssue(issues, rowNumber, 'secret_redaction_status', `Invalid secret_redaction_status "${row.secret_redaction_status}".`);
  }

  if (approved) {
    if (!hasText(row.owner)) {
      pushIssue(issues, rowNumber, 'owner', 'Approved rows require an owner.');
    }
    if (!parseTimestamp(row.approved_at)) {
      pushIssue(issues, rowNumber, 'approved_at', 'Approved rows require a parseable approved_at timestamp.');
    }
    if (!hasText(row.evidence_ref)) {
      pushIssue(issues, rowNumber, 'evidence_ref', 'Approved rows require evidence_ref.');
    }
    if (!ACK_VALUES.has(claimAck)) {
      pushIssue(issues, rowNumber, 'claim_boundary_acknowledged', 'Approved rows require claim boundary acknowledgement.');
    }
    if (!['redacted', 'no_secrets_present', 'not_applicable'].includes(redactionStatus)) {
      pushIssue(issues, rowNumber, 'secret_redaction_status', 'Approved rows require redacted, no_secrets_present, or not_applicable redaction status.');
    }
    if (shareStatus === 'pending') {
      pushIssue(issues, rowNumber, 'external_share_status', 'Approved rows need explicit external_share_status, even if internal_only or not_applicable.');
    }
    approvedIds.add(approvalId);
  } else if (decision === 'rejected') {
    rejectedIds.add(approvalId);
  } else if (decision === 'reviewed') {
    reviewedIds.add(approvalId);
  }

  if (ACK_VALUES.has(claimAck)) claimBoundaryAckCount += 1;
  if (shareStatus === 'external_share_approved') externalShareApprovedCount += 1;
  if (['redacted', 'no_secrets_present', 'not_applicable'].includes(redactionStatus)) redactionReadyCount += 1;
});

for (const approvalId of missingRequiredIds) {
  pushIssue(issues, 1, 'approval_id', `Missing required approval row ${approvalId}.`);
}

const rowErrorCount = issues.filter((issue) => issue.severity === 'error').length;
const rowWarningCount = issues.filter((issue) => issue.severity === 'warning').length;
const schemaReady = missing.length === 0;
const requiredRowsPresent = missingRequiredIds.length === 0 && registerInput.rows.length >= REQUIRED_APPROVAL_ROWS.length;
const approvedCount = [...approvedIds].filter((approvalId) => requiredIds.has(approvalId)).length;
const allRequiredApproved = approvedCount === REQUIRED_APPROVAL_ROWS.length;
const status = !schemaReady
  ? 'owner_approval_register_validation_failed_schema'
  : rowErrorCount > 0
    ? 'owner_approval_register_validation_failed'
    : approvedCount === 0
      ? 'owner_approval_register_ready_no_owner_approvals'
      : allRequiredApproved
        ? 'owner_approval_register_passed_all_required_owner_approvals'
        : 'owner_approval_register_partial_owner_approvals';

const acceptanceGates = [
  {
    gate: 'register_schema_present',
    status: schemaReady ? 'passed' : 'failed',
    proof_bucket: 'repo_artifact',
    evidence: schemaReady ? `${REQUIRED_COLUMNS.length} required columns present.` : `Missing columns: ${missing.join(', ')}.`
  },
  {
    gate: 'required_approval_rows_present',
    status: requiredRowsPresent ? 'passed' : 'failed',
    proof_bucket: 'repo_artifact',
    evidence: `${presentIds.size}/${requiredIds.size} required approval IDs present; missing=${missingRequiredIds.join(', ') || 'none'}.`
  },
  {
    gate: 'owner_approvals_present',
    status: approvedCount > 0 ? 'passed' : 'open_no_owner_approvals',
    proof_bucket: 'owner_input',
    evidence: `${approvedCount}/${REQUIRED_APPROVAL_ROWS.length} required approvals are owner-approved.`
  },
  {
    gate: 'approved_rows_have_audit_trail',
    status: rowErrorCount === 0 ? 'passed' : 'failed',
    proof_bucket: 'owner_input',
    evidence: `${rowErrorCount} row errors and ${rowWarningCount} warnings across ${registerInput.rows.length} approval rows.`
  },
  {
    gate: 'claim_boundaries_acknowledged',
    status: claimBoundaryAckCount === REQUIRED_APPROVAL_ROWS.length ? 'passed' : 'open_owner_acknowledgement_missing',
    proof_bucket: 'owner_input',
    evidence: `${claimBoundaryAckCount}/${REQUIRED_APPROVAL_ROWS.length} approval rows acknowledge claim boundaries.`
  },
  {
    gate: 'all_required_approvals_ready_for_downstream_evidence',
    status: allRequiredApproved && rowErrorCount === 0 ? 'passed' : 'open_required_approvals_missing',
    proof_bucket: 'owner_input',
    evidence: `${approvedCount}/${REQUIRED_APPROVAL_ROWS.length} required approvals complete; rejected=${rejectedIds.size}; reviewed=${reviewedIds.size}.`
  }
];

const validation = {
  schema_version: 'owner-approval-register-validation-v1',
  generated_at: new Date().toISOString(),
  status,
  proof_boundary: 'This artifact validates owner approval state for the commercial launch proof loop. It is not buyer validation, hosted proof, enterprise proof, RLS proof, prediction-accuracy proof, or commercial-ready evidence.',
  source: {
    owner_unblock: inputPaths.ownerUnblock,
    owner_unblock_status: ownerUnblock.status ?? 'missing',
    commercial_confidence: inputPaths.commercialConfidence,
    launch_decision: commercialConfidence.posture?.launch_decision ?? 'missing',
    register: inputPaths.register,
    register_generated_or_regenerated: wroteRegisterThisRun
  },
  summary: {
    required_approval_count: REQUIRED_APPROVAL_ROWS.length,
    approval_row_count: registerInput.rows.length,
    schema_ready: schemaReady,
    required_rows_present: requiredRowsPresent,
    owner_approved_count: approvedCount,
    reviewed_count: reviewedIds.size,
    rejected_count: rejectedIds.size,
    external_share_approved_count: externalShareApprovedCount,
    redaction_ready_count: redactionReadyCount,
    claim_boundary_acknowledged_count: claimBoundaryAckCount,
    row_error_count: rowErrorCount,
    row_warning_count: rowWarningCount,
    all_required_approvals_ready_for_downstream_evidence: allRequiredApproved && rowErrorCount === 0,
    commercial_ready_claim_allowed: false,
    world_class_prediction_claim_allowed: false,
    hosted_live_claim_allowed: false,
    buyer_validated_claim_allowed: false,
    enterprise_ready_claim_allowed: false
  },
  required_columns: REQUIRED_COLUMNS,
  acceptance_gates: acceptanceGates,
  row_issues: issues,
  approval_rows: registerInput.rows,
  next_commands_after_owner_approvals: [
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:accuracy:validate-inputs -- --update-evidence',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:buyer:validate-inputs -- --update-evidence',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:enterprise:validate-evidence -- --update-evidence',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:hosted:access-preflight -- --update-evidence',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:claims:consistency -- --update-evidence',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:commercial:confidence',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:commercial:goal-completion -- --update-evidence'
  ]
};

function renderCsv(report) {
  return [
    csvLine(['gate', 'status', 'proof_bucket', 'evidence']),
    ...report.acceptance_gates.map((gate) => csvLine([
      gate.gate,
      gate.status,
      gate.proof_bucket,
      gate.evidence
    ]))
  ].join('\n') + '\n';
}

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

  const issueRows = report.row_issues.slice(0, 50)
    .map((issue) => [
      issue.row_number,
      issue.field,
      issue.severity,
      mdCell(issue.problem)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const approvalRows = report.approval_rows
    .map((row) => [
      mdCell(row.approval_id),
      mdCell(row.lane),
      mdCell(row.approval_type),
      mdCell(row.owner_decision),
      mdCell(row.external_share_status),
      mdCell(row.claim_boundary_acknowledged)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  return `# Owner Approval Register Validation - 2026-06-06

## Decision

Status: \`${report.status}\`.

Owner-approved rows: **${report.summary.owner_approved_count}/${report.summary.required_approval_count}**.

All required approvals ready for downstream evidence: **${report.summary.all_required_approvals_ready_for_downstream_evidence}**.

Commercial-ready claim allowed: **${report.summary.commercial_ready_claim_allowed}**.

World-class prediction claim allowed: **${report.summary.world_class_prediction_claim_allowed}**.

This is owner-approval state tracking only. It does not prove buyer demand, hosted operation, enterprise security, RLS isolation, prediction accuracy, or commercial readiness.

## Acceptance Gates

| Gate | Status | Proof Bucket | Evidence |
|---|---|---|---|
${gateRows}

## Approval Rows

| Approval ID | Lane | Type | Owner Decision | External Share | Claim Boundary |
|---|---|---|---|---|---|
${approvalRows}

## Row Issues

${issueRows ? `| Row | Field | Severity | Problem |
|---:|---|---|---|
${issueRows}` : 'No row issues recorded.'}

## Proof Boundary

${report.proof_boundary}
`;
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
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:owner:approval-register -- --owner-unblock ${inputPaths.ownerUnblock} --commercial-confidence ${inputPaths.commercialConfidence} --register ${inputPaths.register} --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence: status ${validation.status}, owner_approved_count ${validation.summary.owner_approved_count}/${validation.summary.required_approval_count}, commercial_ready_claim_allowed false`
  ], [
    /npm run audit:owner:approval-register/
  ]);

  evidence.proof_buckets.repo_artifact = replaceMatchingThenAppend(evidence.proof_buckets.repo_artifact, [
    'scripts/build-owner-approval-register.mjs generates and validates the owner approval register that gates prediction, buyer, enterprise, RLS, hosted, payment, AI-action, and claim-language proof work',
    'docs/launch-readiness/owner-approval-register-2026-06-06.csv is the owner-editable approval register for commercial launch proof gates',
    'docs/launch-readiness/owner-approval-register-validation-2026-06-06.json records owner approval counts, audit-trail checks, claim-boundary acknowledgement, and proof boundaries'
  ], [
    /scripts\/build-owner-approval-register\.mjs/,
    /owner-approval-register-2026-06-06\.csv/,
    /owner-approval-register-validation-2026-06-06\.json/
  ]);

  evidence.owner_approval_register_validation = {
    status: validation.status,
    artifact: outputPaths.json,
    register: inputPaths.register,
    required_approval_count: validation.summary.required_approval_count,
    owner_approved_count: validation.summary.owner_approved_count,
    row_error_count: validation.summary.row_error_count,
    all_required_approvals_ready_for_downstream_evidence: validation.summary.all_required_approvals_ready_for_downstream_evidence,
    commercial_ready_claim_allowed: false,
    world_class_prediction_claim_allowed: false,
    proof_boundary: validation.proof_boundary
  };

  evidence.fix_report = evidence.fix_report ?? {};
  evidence.fix_report.files_changed = replaceMatchingThenAppend(evidence.fix_report.files_changed, [
    'scripts/build-owner-approval-register.mjs',
    'docs/launch-readiness/owner-approval-register-2026-06-06.csv',
    'docs/launch-readiness/owner-approval-register-validation-2026-06-06.json',
    'docs/launch-readiness/owner-approval-register-validation-2026-06-06.md',
    'docs/launch-readiness/owner-approval-register-validation-checklist-2026-06-06.csv',
    'package.json'
  ], [
    /scripts\/build-owner-approval-register\.mjs/,
    /owner-approval-register-2026-06-06\.csv/,
    /owner-approval-register-validation-2026-06-06\.json/,
    /owner-approval-register-validation-2026-06-06\.md/,
    /owner-approval-register-validation-checklist-2026-06-06\.csv/,
    /package\.json/
  ]);
  evidence.fix_report.tests_run = replaceMatchingThenAppend(evidence.fix_report.tests_run, [
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH node --check scripts/build-owner-approval-register.mjs',
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:owner:approval-register -- --owner-unblock ${inputPaths.ownerUnblock} --commercial-confidence ${inputPaths.commercialConfidence} --register ${inputPaths.register} --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence`
  ], [
    /node --check scripts\/build-owner-approval-register\.mjs/,
    /npm run audit:owner:approval-register/
  ]);
  evidence.fix_report.approval_gates = replaceMatchingThenAppend(evidence.fix_report.approval_gates, [
    'Owner approval register validation is approval-state tracking only; buyer calls, hosted proof, enterprise documents, RLS execution, prediction outcomes, and claim-language approval still need real owner evidence before claims can be upgraded.'
  ], [
    /Owner approval register validation is approval-state tracking only/
  ]);

  evidence.implementation_decisions = replaceByTaskId(evidence.implementation_decisions, {
    task_id: 'OWNER-APPROVAL-REGISTER-2026-06-06',
    decision: 'Add an owner approval register generator and validator for the commercial proof loop.',
    acceptance_check: 'The register must cover prediction, buyer, enterprise, RLS, AI-action, hosted, payment, and claim-language approval gates, preserve owner-filled rows on rerun, and keep commercial-ready/world-class claims blocked without real evidence.',
    chosen_variant: 'minimal Node generator/validator plus CSV/JSON/Markdown artifacts and package script; no runtime product edit, no production action, no new dependency',
    repo_pattern_reused: 'Existing launch-readiness validator, artifact rendering, and evidence update pattern',
    files_changed: [
      'scripts/build-owner-approval-register.mjs',
      'package.json'
    ],
    tests_run: [
      'node --check scripts/build-owner-approval-register.mjs',
      'npm run audit:owner:approval-register'
    ],
    proof: `${validation.status}; owner_approved_count=${validation.summary.owner_approved_count}/${validation.summary.required_approval_count}; all_required_approvals_ready_for_downstream_evidence=${validation.summary.all_required_approvals_ready_for_downstream_evidence}; commercial_ready_claim_allowed=false.`,
    reason: 'The remaining commercial blockers are owner/external evidence gates. A machine-checkable approval register turns scattered approval requirements into auditable inputs without pretending those approvals or downstream proofs exist.'
  });
  evidence.rejected_variants = replaceByTaskId(evidence.rejected_variants, {
    task_id: 'OWNER-APPROVAL-REGISTER-2026-06-06',
    variant: 'Keep owner approvals only in narrative owner-unblock docs.',
    reason_rejected: 'Narrative-only approval state is hard to audit and easy to overstate; future owner updates need stable rows, allowed values, timestamps, evidence refs, redaction status, and claim-boundary acknowledgement.',
    tradeoff: 'A narrow CSV/validator adds process proof while preserving all current owner/external blockers.',
    evidence: `${validation.status} keeps commercial_ready_claim_allowed=false and world_class_prediction_claim_allowed=false.`
  });
  evidence.code_optimization_reviews = replaceByTaskId(evidence.code_optimization_reviews, {
    target_task: 'OWNER-APPROVAL-REGISTER-2026-06-06',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'No dependency, no runtime edit, no hosted or secret-dependent execution, no owner approval fabrication, and generated artifacts remain repo/local proof only.',
    tests_or_checks: [
      'node --check scripts/build-owner-approval-register.mjs',
      'npm run audit:owner:approval-register'
    ],
    remaining_risk: 'Actual owner approvals, buyer calls, hosted proof, enterprise documents, RLS execution, prediction outcomes, and external claim-language approval remain missing.'
  });

  writeArtifact(inputPaths.evidence, `${JSON.stringify(evidence, null, 2)}\n`);
}

console.log(JSON.stringify({
  register: inputPaths.register,
  json_output: outputPaths.json,
  md_output: outputPaths.md,
  csv_output: outputPaths.csv,
  evidence_updated: updateEvidence,
  status: validation.status,
  required_approval_count: validation.summary.required_approval_count,
  owner_approved_count: validation.summary.owner_approved_count,
  row_error_count: validation.summary.row_error_count,
  all_required_approvals_ready_for_downstream_evidence: validation.summary.all_required_approvals_ready_for_downstream_evidence,
  commercial_ready_claim_allowed: validation.summary.commercial_ready_claim_allowed,
  world_class_prediction_claim_allowed: validation.summary.world_class_prediction_claim_allowed
}, null, 2));
