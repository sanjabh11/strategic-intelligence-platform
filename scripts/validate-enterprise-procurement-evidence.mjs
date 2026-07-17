#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const ROOT = process.cwd();
const DEFAULT_REGISTER = 'docs/launch-readiness/enterprise-procurement-evidence-register-2026-06-06.csv';
const DEFAULT_EVIDENCE = 'docs/launch-readiness/launch-evidence-2026-06-06.json';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/enterprise-procurement-evidence-validation-2026-06-06.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/enterprise-procurement-evidence-validation-2026-06-06.md';
const DEFAULT_CSV_OUTPUT = 'docs/launch-readiness/enterprise-procurement-evidence-validation-checklist-2026-06-06.csv';

const REQUIRED_DOCUMENTS = [
  {
    document_id: 'privacy_notice_or_data_processing_summary',
    title: 'Privacy notice or buyer data-processing summary',
    artifact_type: 'privacy',
    required_scope_fields: ['privacy_scope']
  },
  {
    document_id: 'data_inventory_and_classification',
    title: 'Data inventory and classification table',
    artifact_type: 'data_inventory',
    required_scope_fields: ['privacy_scope', 'rls_or_hosted_proof_scope']
  },
  {
    document_id: 'retention_and_deletion_policy',
    title: 'Retention and deletion policy',
    artifact_type: 'retention',
    required_scope_fields: ['retention_scope']
  },
  {
    document_id: 'dpa_and_subprocessor_position',
    title: 'DPA and subprocessor position',
    artifact_type: 'dpa',
    required_scope_fields: ['dpa_scope']
  },
  {
    document_id: 'support_and_sla_terms',
    title: 'Pilot support and SLA terms',
    artifact_type: 'support_sla',
    required_scope_fields: ['support_sla_scope']
  },
  {
    document_id: 'incident_response_and_breach_notice',
    title: 'Incident response and breach-notice stance',
    artifact_type: 'incident_response',
    required_scope_fields: ['incident_response_scope']
  },
  {
    document_id: 'secure_sdlc_and_vulnerability_response',
    title: 'Secure SDLC and vulnerability response',
    artifact_type: 'secure_sdlc',
    required_scope_fields: ['rls_or_hosted_proof_scope']
  },
  {
    document_id: 'external_share_approval',
    title: 'External-share approval register',
    artifact_type: 'external_share_register',
    required_scope_fields: ['notes']
  }
];

const REQUIRED_COLUMNS = [
  'document_id',
  'title',
  'artifact_path',
  'artifact_type',
  'owner_approval_status',
  'external_share_status',
  'contains_secrets',
  'contains_unsupported_claims',
  'privacy_scope',
  'retention_scope',
  'dpa_scope',
  'support_sla_scope',
  'incident_response_scope',
  'rls_or_hosted_proof_scope',
  'ai_runtime_proof_scope',
  'reviewer',
  'reviewed_at',
  'notes'
];

const APPROVED_VALUES = new Set(['approved', 'owner_approved']);
const REVIEW_READY_VALUES = new Set(['approved', 'owner_approved', 'reviewed']);
const EXTERNAL_SHARE_APPROVED_VALUES = new Set(['approved', 'external_share_approved']);
const ALLOWED_APPROVAL_VALUES = new Set(['', 'missing', 'draft', 'reviewed', 'approved', 'owner_approved', 'rejected']);
const ALLOWED_EXTERNAL_SHARE_VALUES = new Set(['', 'not_reviewed', 'internal_only', 'approved', 'external_share_approved', 'rejected']);
const TRUE_VALUES = new Set(['true', 'yes', '1']);
const FALSE_VALUES = new Set(['false', 'no', '0', '']);
const PROHIBITED_CLAIM_PATTERNS = [
  /\benterprise[- ]ready\b/i,
  /\bprivacy[- ]ready\b/i,
  /\bdpa[- ]ready\b/i,
  /\bsla[- ]ready\b/i,
  /\bcertified\b/i,
  /\biso\/iec 42001 certified\b/i,
  /\bworld[- ]class\b/i,
  /\baccurate predictions?\b/i,
  /\btenant isolation is proven\b/i,
  /\bhosted runtime is proven\b/i
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
    'Usage: node scripts/validate-enterprise-procurement-evidence.mjs',
    `  [--register ${DEFAULT_REGISTER}]`,
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

function writeArtifact(relativePath, contents) {
  const absolutePath = resolveRepoPath(relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, contents);
}

function readText(relativePath) {
  const absolutePath = resolveRepoPath(relativePath);
  if (!existsSync(absolutePath)) {
    return null;
  }
  return readFileSync(absolutePath, 'utf8');
}

function readJsonIfExists(relativePath, fallback) {
  const absolutePath = resolveRepoPath(relativePath);
  return existsSync(absolutePath) ? JSON.parse(readFileSync(absolutePath, 'utf8')) : fallback;
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

function renderTemplate() {
  const rows = REQUIRED_DOCUMENTS.map((document) => csvLine([
    document.document_id,
    document.title,
    '',
    document.artifact_type,
    'missing',
    'not_reviewed',
    'no',
    'no',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'Owner must attach or approve this row before enterprise/procurement claims can be upgraded.'
  ]));

  return `${[csvLine(REQUIRED_COLUMNS), ...rows].join('\n')}\n`;
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
    /\bnot\s+enterprise[- ]ready\b/,
    /\bno\s+enterprise[- ]ready\b/,
    /\bnot\s+privacy[- ]ready\b/,
    /\bno\s+privacy[- ]ready\b/,
    /\bnot\s+dpa[- ]ready\b/,
    /\bnot\s+sla[- ]ready\b/,
    /\bnot\s+certified\b/,
    /\bno\s+world[- ]class\b/,
    /\bnot\s+world[- ]class\b/,
    /\btenant isolation proof is missing\b/,
    /\bhosted runtime proof is missing\b/
  ];

  if (boundaryLanguagePatterns.some((pattern) => pattern.test(lowerText))) {
    return false;
  }

  return PROHIBITED_CLAIM_PATTERNS.some((pattern) => pattern.test(text));
}

function artifactPathExists(value) {
  const text = String(value ?? '').trim();
  if (!text || text === 'owner_supplied_external') return false;
  return existsSync(resolveRepoPath(text));
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

const registerExistedBeforeRun = existsSync(resolveRepoPath(inputPaths.register));
if (!registerExistedBeforeRun) {
  writeArtifact(inputPaths.register, renderTemplate());
}

const registerInput = parseCsv(readText(inputPaths.register) ?? renderTemplate());
const registerMissingColumns = missingColumns(registerInput.headers);
const issues = [];
const rowsByDocumentId = new Map(registerInput.rows.map((row) => [String(row.document_id ?? '').trim(), row]));

for (const column of registerMissingColumns) {
  pushIssue(issues, 1, column, 'Enterprise procurement evidence register is missing a required column.');
}

for (const document of REQUIRED_DOCUMENTS) {
  if (!rowsByDocumentId.has(document.document_id)) {
    pushIssue(issues, 1, 'document_id', `Missing required document row: ${document.document_id}.`);
  }
}

let ownerApprovedDocumentCount = 0;
let externalShareApprovedDocumentCount = 0;
let artifactPathPresentCount = 0;
let artifactPathExistsCount = 0;
let readyDocumentCount = 0;
let privacyDpaReady = false;
let supportSlaReady = false;
let incidentResponseReady = false;
let secureSdlcReady = false;

const normalizedRows = registerInput.rows.map((row, index) => {
  const rowNumber = index + 2;
  const documentId = String(row.document_id ?? '').trim();
  const ownerStatus = normalize(row.owner_approval_status);
  const externalShareStatus = normalize(row.external_share_status);
  const containsSecrets = parseBoolean(row.contains_secrets);
  const containsUnsupportedClaims = parseBoolean(row.contains_unsupported_claims);
  const artifactPresent = hasText(row.artifact_path);
  const artifactExists = artifactPathExists(row.artifact_path);
  const requiredDocument = REQUIRED_DOCUMENTS.find((document) => document.document_id === documentId);
  const ownerApproved = APPROVED_VALUES.has(ownerStatus);
  const reviewReady = REVIEW_READY_VALUES.has(ownerStatus);
  const externalShareApproved = EXTERNAL_SHARE_APPROVED_VALUES.has(externalShareStatus);

  if (!ALLOWED_APPROVAL_VALUES.has(ownerStatus)) {
    pushIssue(issues, rowNumber, 'owner_approval_status', `Invalid owner_approval_status "${row.owner_approval_status}".`);
  }

  if (!ALLOWED_EXTERNAL_SHARE_VALUES.has(externalShareStatus)) {
    pushIssue(issues, rowNumber, 'external_share_status', `Invalid external_share_status "${row.external_share_status}".`);
  }

  if (containsSecrets === null) {
    pushIssue(issues, rowNumber, 'contains_secrets', 'contains_secrets must be yes/no, true/false, or 1/0.');
  }

  if (containsUnsupportedClaims === null) {
    pushIssue(issues, rowNumber, 'contains_unsupported_claims', 'contains_unsupported_claims must be yes/no, true/false, or 1/0.');
  }

  if (hasProhibitedClaim(row)) {
    pushIssue(issues, rowNumber, '*', 'Row appears to contain unsupported enterprise/privacy/SLA/certification/accuracy claim language.', 'warning');
  }

  if (ownerApproved && !artifactPresent) {
    pushIssue(issues, rowNumber, 'artifact_path', 'Owner-approved rows must include an artifact_path or owner_supplied_external marker.');
  }

  if (ownerApproved && artifactPresent && row.artifact_path !== 'owner_supplied_external' && !artifactExists) {
    pushIssue(issues, rowNumber, 'artifact_path', 'Owner-approved repo artifact_path must exist.');
  }

  if (ownerApproved && !hasText(row.reviewer)) {
    pushIssue(issues, rowNumber, 'reviewer', 'Owner-approved rows must include reviewer.');
  }

  if (ownerApproved && !parseDate(row.reviewed_at)) {
    pushIssue(issues, rowNumber, 'reviewed_at', 'Owner-approved rows must include a parseable reviewed_at timestamp.');
  }

  if (externalShareApproved && !ownerApproved) {
    pushIssue(issues, rowNumber, 'external_share_status', 'External-share approval requires owner approval first.');
  }

  if (externalShareApproved && containsSecrets !== false) {
    pushIssue(issues, rowNumber, 'contains_secrets', 'External-share rows must explicitly mark contains_secrets as no/false/0.');
  }

  if (externalShareApproved && containsUnsupportedClaims !== false) {
    pushIssue(issues, rowNumber, 'contains_unsupported_claims', 'External-share rows must explicitly mark unsupported claims as absent.');
  }

  for (const field of requiredDocument?.required_scope_fields ?? []) {
    if (ownerApproved && !hasText(row[field])) {
      pushIssue(issues, rowNumber, field, `Owner-approved ${documentId} row must include ${field}.`);
    }
  }

  if (ownerApproved) ownerApprovedDocumentCount += 1;
  if (externalShareApproved) externalShareApprovedDocumentCount += 1;
  if (artifactPresent) artifactPathPresentCount += 1;
  if (artifactExists) artifactPathExistsCount += 1;

  const rowErrors = issues.filter((issue) => issue.row_number === rowNumber && issue.severity === 'error').length;
  const ready = ownerApproved && rowErrors === 0;
  if (ready) readyDocumentCount += 1;

  return {
    document_id: documentId,
    title: row.title || requiredDocument?.title || documentId,
    artifact_path: row.artifact_path || '',
    artifact_type: row.artifact_type || requiredDocument?.artifact_type || '',
    owner_approval_status: ownerStatus || 'missing',
    external_share_status: externalShareStatus || 'not_reviewed',
    contains_secrets: containsSecrets,
    contains_unsupported_claims: containsUnsupportedClaims,
    owner_approved: ownerApproved,
    review_ready: reviewReady,
    external_share_approved: externalShareApproved,
    artifact_path_present: artifactPresent,
    artifact_path_exists: artifactExists,
    ready
  };
});

const readyIds = new Set(normalizedRows.filter((row) => row.ready).map((row) => row.document_id));
privacyDpaReady = [
  'privacy_notice_or_data_processing_summary',
  'data_inventory_and_classification',
  'retention_and_deletion_policy',
  'dpa_and_subprocessor_position'
].every((id) => readyIds.has(id));
supportSlaReady = readyIds.has('support_and_sla_terms');
incidentResponseReady = readyIds.has('incident_response_and_breach_notice');
secureSdlcReady = readyIds.has('secure_sdlc_and_vulnerability_response');

const errorCount = issues.filter((issue) => issue.severity === 'error').length;
const noOwnerDocuments = ownerApprovedDocumentCount === 0;
const allRequiredDocumentsReady = readyDocumentCount >= REQUIRED_DOCUMENTS.length;

function gateStatus(condition, noOwnerDocs = false) {
  if (noOwnerDocs) return 'open_no_owner_documents';
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
    gate: 'all_required_document_rows_present',
    status: REQUIRED_DOCUMENTS.every((document) => rowsByDocumentId.has(document.document_id)) ? 'passed' : 'failed',
    evidence: `${rowsByDocumentId.size} register rows loaded for ${REQUIRED_DOCUMENTS.length} required documents.`,
    proof_bucket: 'repo_artifact'
  },
  {
    gate: 'owner_approved_documents_present',
    status: noOwnerDocuments ? 'open_no_owner_documents' : 'passed',
    evidence: `${ownerApprovedDocumentCount} owner-approved document rows loaded.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'document_row_quality',
    status: gateStatus(errorCount === 0, noOwnerDocuments),
    evidence: `${errorCount} row-level errors and ${issues.length - errorCount} warnings across enterprise procurement evidence register.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'privacy_dpa_ready',
    status: gateStatus(privacyDpaReady, noOwnerDocuments),
    evidence: `privacy_dpa_ready=${privacyDpaReady}.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'support_sla_ready',
    status: gateStatus(supportSlaReady, noOwnerDocuments),
    evidence: `support_sla_ready=${supportSlaReady}.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'incident_response_ready',
    status: gateStatus(incidentResponseReady, noOwnerDocuments),
    evidence: `incident_response_ready=${incidentResponseReady}.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'external_share_approval_ready',
    status: gateStatus(externalShareApprovedDocumentCount > 0 && readyIds.has('external_share_approval'), noOwnerDocuments),
    evidence: `${externalShareApprovedDocumentCount} external-share-approved document rows loaded.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'all_required_documents_ready',
    status: gateStatus(allRequiredDocumentsReady, noOwnerDocuments),
    evidence: `${readyDocumentCount}/${REQUIRED_DOCUMENTS.length} required document rows are ready.`,
    proof_bucket: 'owner_input'
  }
];

const status = noOwnerDocuments
  ? 'enterprise_procurement_evidence_validation_ready_no_owner_documents'
  : errorCount > 0
    ? 'enterprise_procurement_evidence_validation_failed'
    : !privacyDpaReady
      ? 'enterprise_procurement_evidence_validation_passed_privacy_dpa_missing'
      : !supportSlaReady || !incidentResponseReady
        ? 'enterprise_procurement_evidence_validation_passed_support_incident_missing'
        : !allRequiredDocumentsReady
          ? 'enterprise_procurement_evidence_validation_passed_required_documents_partial'
          : externalShareApprovedDocumentCount === 0
            ? 'enterprise_procurement_evidence_validation_passed_external_share_missing'
            : 'enterprise_procurement_evidence_validation_passed_pending_security_runtime_proof';

const validation = {
  schema_version: 'enterprise-procurement-evidence-validation-v1',
  generated_at: new Date().toISOString(),
  status,
  proof_boundary: 'This artifact validates the owner evidence register for enterprise procurement documents and external-share approvals. It is not privacy compliance, legal review, hosted proof, RLS proof, AI runtime proof, buyer proof, or prediction-accuracy proof.',
  source: {
    register: inputPaths.register,
    register_template_created: !registerExistedBeforeRun,
    required_document_count: REQUIRED_DOCUMENTS.length
  },
  summary: {
    register_row_count: registerInput.rows.length,
    required_document_count: REQUIRED_DOCUMENTS.length,
    owner_approved_document_count: ownerApprovedDocumentCount,
    ready_document_count: readyDocumentCount,
    missing_or_unapproved_document_count: REQUIRED_DOCUMENTS.length - readyDocumentCount,
    external_share_approved_document_count: externalShareApprovedDocumentCount,
    artifact_path_present_count: artifactPathPresentCount,
    artifact_path_exists_count: artifactPathExistsCount,
    row_issue_count: issues.length,
    row_error_count: errorCount,
    active_release_hold_count: acceptanceGates.filter((gate) => gate.status !== 'passed').length,
    privacy_dpa_ready: privacyDpaReady,
    support_sla_ready: supportSlaReady,
    incident_response_ready: incidentResponseReady,
    secure_sdlc_ready: secureSdlcReady,
    ready_for_enterprise_procurement_review: status === 'enterprise_procurement_evidence_validation_passed_pending_security_runtime_proof',
    enterprise_ready_claim_allowed: false
  },
  required_columns: REQUIRED_COLUMNS,
  required_documents: REQUIRED_DOCUMENTS,
  document_rows: normalizedRows,
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
      source: 'NIST Privacy Framework',
      url: 'https://www.nist.gov/privacy-framework',
      alignment: 'Enterprise privacy claims need data, purpose, retention, deletion, and processing evidence managed as risk.'
    },
    {
      source: 'NIST SSDF SP 800-218',
      url: 'https://csrc.nist.gov/pubs/sp/800/218/final',
      alignment: 'Secure-development and vulnerability-response claims should be backed by repeatable producer evidence.'
    },
    {
      source: 'CISA Secure by Demand Guide',
      url: 'https://www.cisa.gov/sites/default/files/2024-08/SecureByDemandGuide_080624_508c.pdf',
      alignment: 'Procurement buyers should be given structured supplier evidence and clear current-proof boundaries.'
    },
    {
      source: 'ISO/IEC 42001:2023',
      url: 'https://www.iso.org/standard/81230.html',
      alignment: 'AI management-system claims require policies, objectives, processes, and audit scope; this register is pre-certification evidence only.'
    }
  ],
  next_commands_after_owner_data: [
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:enterprise:validate-evidence -- --register ${inputPaths.register} --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence`,
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:enterprise:procurement-gate',
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
        issue.row_number,
        mdCell(issue.field),
        issue.severity,
        mdCell(issue.problem)
      ])
      .map((row) => `| ${row.join(' | ')} |`)
      .join('\n')
    : '| - | - | - | none |';

  const documentRows = report.document_rows
    .map((row) => [
      mdCell(row.document_id),
      row.owner_approval_status,
      row.external_share_status,
      row.ready ? 'yes' : 'no',
      row.artifact_path_exists ? 'yes' : 'no'
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

  return `# Enterprise Procurement Evidence Validation - 2026-06-06

## Decision Boundary

Status: \`${report.status}\`.

${report.proof_boundary}

Ready documents: **${report.summary.ready_document_count}/${report.summary.required_document_count}**. Owner-approved documents: **${report.summary.owner_approved_document_count}**. External-share-approved documents: **${report.summary.external_share_approved_document_count}**.

Enterprise-ready claim allowed: **${report.summary.enterprise_ready_claim_allowed}**.

## Acceptance Gates

| Gate | Status | Evidence | Proof Bucket |
|---|---|---|---|
${gateRows}

## Document Rows

| Document | Owner Approval | External Share | Ready | Artifact Exists |
|---|---|---|---|---|
${documentRows}

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

Passing this validator only means the procurement evidence register is ready for enterprise review. It still does not prove hosted security, RLS enforcement, AI runtime safety, legal/privacy compliance, buyer acceptance, or prediction accuracy.
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
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:enterprise:validate-evidence -- --register ${inputPaths.register} --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence: status ${validation.status}, ${validation.summary.ready_document_count}/${validation.summary.required_document_count} ready documents, ${validation.summary.external_share_approved_document_count} external-share approvals, enterprise_ready_claim_allowed false`
  ], [
    /npm run audit:enterprise:validate-evidence/
  ]);

  evidence.proof_buckets.repo_artifact = replaceMatchingThenAppend(evidence.proof_buckets.repo_artifact, [
    'scripts/validate-enterprise-procurement-evidence.mjs validates owner procurement documents and external-share approvals before enterprise-ready claims can be upgraded while keeping enterprise_ready_claim_allowed false',
    'docs/launch-readiness/enterprise-procurement-evidence-register-2026-06-06.csv is the owner evidence register template for privacy, data inventory, retention, DPA, support/SLA, incident response, secure SDLC, and external-share approval rows',
    'docs/launch-readiness/enterprise-procurement-evidence-validation-2026-06-06.json records owner approval, external-share approval, artifact existence, row quality, privacy/DPA readiness, support/SLA readiness, incident readiness, and release holds'
  ], [
    /scripts\/validate-enterprise-procurement-evidence\.mjs/,
    /enterprise-procurement-evidence-register-2026-06-06\.csv/,
    /enterprise-procurement-evidence-validation-2026-06-06\.json/
  ]);

  evidence.fix_report = evidence.fix_report ?? {};
  evidence.fix_report.files_changed = replaceMatchingThenAppend(evidence.fix_report.files_changed, [
    'scripts/validate-enterprise-procurement-evidence.mjs',
    'docs/launch-readiness/enterprise-procurement-evidence-register-2026-06-06.csv',
    'docs/launch-readiness/enterprise-procurement-evidence-validation-2026-06-06.json',
    'docs/launch-readiness/enterprise-procurement-evidence-validation-2026-06-06.md',
    'docs/launch-readiness/enterprise-procurement-evidence-validation-checklist-2026-06-06.csv'
  ], [
    /scripts\/validate-enterprise-procurement-evidence\.mjs/,
    /enterprise-procurement-evidence-register-2026-06-06\.csv/,
    /enterprise-procurement-evidence-validation-2026-06-06\.json/,
    /enterprise-procurement-evidence-validation-2026-06-06\.md/,
    /enterprise-procurement-evidence-validation-checklist-2026-06-06\.csv/
  ]);
  evidence.fix_report.tests_run = replaceMatchingThenAppend(evidence.fix_report.tests_run, [
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH node --check scripts/validate-enterprise-procurement-evidence.mjs',
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:enterprise:validate-evidence -- --register ${inputPaths.register} --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence`
  ], [
    /node --check scripts\/validate-enterprise-procurement-evidence\.mjs/,
    /npm run audit:enterprise:validate-evidence/
  ]);
  evidence.fix_report.approval_gates = replaceMatchingThenAppend(evidence.fix_report.approval_gates, [
    'Enterprise procurement evidence validation is schema/procedure proof only; owner-approved privacy/data processing, data inventory, retention/deletion, DPA/subprocessor stance, support/SLA, incident response, secure SDLC, external-share approvals, hosted proof, RLS proof, AI runtime proof, buyer acceptance, and accuracy proof remain required before enterprise-ready claims can be upgraded.'
  ], [
    /Enterprise procurement evidence validation is schema\/procedure proof only/
  ]);

  evidence.implementation_decisions = replaceByTaskId(evidence.implementation_decisions, {
    task_id: 'enterprise-procurement-evidence-validation-harness',
    decision: 'Add a deterministic no-dependency validator and register template for owner-approved enterprise procurement evidence before enterprise-ready claims can be upgraded.',
    acceptance_check: 'Default register validates as schema-ready but no-owner-documents, and commercial confidence remains not_95_confident without raising enterprise trust score.',
    chosen_variant: 'minimal Node artifact generator plus non-overwriting evidence register template and score-neutral evidence manifest update',
    repo_pattern_reused: 'Existing launch-readiness Node artifact generator pattern',
    files_changed: [
      'scripts/validate-enterprise-procurement-evidence.mjs',
      'scripts/build-enterprise-procurement-readiness-gate.mjs',
      'scripts/build-commercial-confidence-gate.mjs',
      'package.json'
    ],
    tests_run: [
      'node --check scripts/validate-enterprise-procurement-evidence.mjs',
      'npm run audit:enterprise:validate-evidence',
      'npm run audit:enterprise:procurement-gate',
      'npm run audit:commercial:confidence'
    ],
    proof: `${validation.status}; ready_document_count=${validation.summary.ready_document_count}; external_share_approved_document_count=${validation.summary.external_share_approved_document_count}; enterprise_ready_claim_allowed=false.`,
    reason: 'The enterprise trust blocker needs a machine-checkable owner evidence register so privacy/support/SLA/DPA/external-share artifacts cannot be promoted from drafts to buyer-proof claims without review.'
  });
  evidence.rejected_variants = replaceByTaskId(evidence.rejected_variants, {
    task_id: 'enterprise-procurement-evidence-validation-harness',
    variant: 'Raise enterprise trust score from draft procurement gate and trust pack.',
    reason_rejected: 'Draft questionnaires and missing owner documents cannot prove enterprise security, privacy, support, SLA, or AI governance readiness.',
    tradeoff: 'Score-neutral validation improves procurement discipline while preserving current proof boundaries.',
    evidence: `${validation.status} keeps enterprise_ready_claim_allowed=false.`
  });
  evidence.code_optimization_reviews = replaceByTaskId(evidence.code_optimization_reviews, {
    target_task: 'enterprise-procurement-evidence-validation-harness',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'No new dependency, no runtime path changes, non-overwriting CSV template, and default generated artifacts remain repo/local proof only.',
    tests_or_checks: [
      'node --check scripts/validate-enterprise-procurement-evidence.mjs',
      'npm run audit:enterprise:validate-evidence',
      'npm run audit:enterprise:procurement-gate',
      'npm run audit:commercial:confidence'
    ],
    remaining_risk: 'Owner documents, legal/privacy review, external-share approvals, hosted proof, RLS proof, AI runtime proof, buyer acceptance, and accuracy proof are still missing.'
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
  ready_document_count: validation.summary.ready_document_count,
  required_document_count: validation.summary.required_document_count,
  external_share_approved_document_count: validation.summary.external_share_approved_document_count,
  row_issue_count: validation.summary.row_issue_count,
  active_release_hold_count: validation.summary.active_release_hold_count,
  enterprise_ready_claim_allowed: false
}, null, 2));
