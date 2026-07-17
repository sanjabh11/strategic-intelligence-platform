#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const ROOT = process.cwd();
const DEFAULT_SUBSTITUTION_KIT = 'docs/launch-readiness/buyer-substitution-proof-kit-2026-06-06.json';
const DEFAULT_SUBSTITUTION_SHEET = 'docs/launch-readiness/buyer-substitution-test-sheet-2026-06-06.csv';
const DEFAULT_EVIDENCE = 'docs/launch-readiness/launch-evidence-2026-06-06.json';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/buyer-substitution-evidence-validation-2026-06-06.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/buyer-substitution-evidence-validation-2026-06-06.md';
const DEFAULT_CSV_OUTPUT = 'docs/launch-readiness/buyer-substitution-evidence-validation-checklist-2026-06-06.csv';
const DEFAULT_MIN_COMPLETED_CALLS = 10;
const DEFAULT_MIN_COMPLETED_NICHES = 5;
const DEFAULT_MIN_QUALIFIED_OUTCOMES = 3;
const DEFAULT_MIN_COMMITMENT_SIGNALS = 1;

const REQUIRED_COLUMNS = [
  'rank',
  'account_name',
  'website',
  'buyer_role',
  'niche',
  'substitute_priority',
  'substitute_category',
  'substitute_examples',
  'substitute_source_url',
  'strongest_substitute_strength',
  'app_wedge_to_test',
  'must_not_claim',
  'close_question',
  'proof_to_show',
  'call_status',
  'call_date',
  'buyer_name_or_redacted_id',
  'current_tool_or_workflow',
  'current_budget_owner',
  'switching_barrier',
  'must_have_proof',
  'proof_shown',
  'buyer_reaction',
  'next_action',
  'willingness_to_pay_signal',
  'substitution_outcome',
  'evidence_quality',
  'validation_status'
];

const RESEARCH_STATUS_VALUES = new Set(['', 'not_contacted', 'not_contacted_not_buyer_proof', 'research', 'template', 'hypothesis']);
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
const ALLOWED_SUBSTITUTION_OUTCOMES = new Set(['', 'no_fit', 'complement_only', 'pilot_candidate', 'replacement_candidate', 'procurement_path']);
const POSITIVE_SUBSTITUTION_OUTCOMES = new Set(['pilot_candidate', 'replacement_candidate', 'procurement_path']);
const ALLOWED_EVIDENCE_QUALITY_VALUES = new Set(['', 'low', 'medium', 'high', 'owner_verified', 'external_share_approved']);
const PROHIBITED_CLAIM_PATTERNS = [
  /\bworld[- ]class\b/i,
  /\bcommercial[- ]ready\b/i,
  /\baccurate predictions?\b/i,
  /\bprediction superiority\b/i,
  /\bbuyer[- ]validated\b/i,
  /\breplacement for\b/i,
  /\bparity\b/i,
  /\benterprise[- ]ready\b/i
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
    'Usage: node scripts/validate-buyer-substitution-evidence.mjs',
    `  [--substitution-kit ${DEFAULT_SUBSTITUTION_KIT}]`,
    `  [--substitution-sheet ${DEFAULT_SUBSTITUTION_SHEET}]`,
    `  [--evidence ${DEFAULT_EVIDENCE}]`,
    `  [--json-output ${DEFAULT_JSON_OUTPUT}]`,
    `  [--md-output ${DEFAULT_MD_OUTPUT}]`,
    `  [--csv-output ${DEFAULT_CSV_OUTPUT}]`,
    `  [--min-completed-calls ${DEFAULT_MIN_COMPLETED_CALLS}]`,
    `  [--min-completed-niches ${DEFAULT_MIN_COMPLETED_NICHES}]`,
    `  [--min-qualified-outcomes ${DEFAULT_MIN_QUALIFIED_OUTCOMES}]`,
    `  [--min-commitment-signals ${DEFAULT_MIN_COMMITMENT_SIGNALS}]`,
    '  [--update-evidence]'
  ].join('\n'));
}

if (hasFlag('--help') || hasFlag('-h')) {
  usage();
  process.exit(0);
}

const inputPaths = {
  substitutionKit: argValue('--substitution-kit', DEFAULT_SUBSTITUTION_KIT),
  substitutionSheet: argValue('--substitution-sheet', DEFAULT_SUBSTITUTION_SHEET),
  evidence: argValue('--evidence', DEFAULT_EVIDENCE)
};

const outputPaths = {
  json: argValue('--json-output', DEFAULT_JSON_OUTPUT),
  md: argValue('--md-output', DEFAULT_MD_OUTPUT),
  csv: argValue('--csv-output', DEFAULT_CSV_OUTPUT)
};

const thresholds = {
  completedCalls: Number(argValue('--min-completed-calls', DEFAULT_MIN_COMPLETED_CALLS)),
  completedNiches: Number(argValue('--min-completed-niches', DEFAULT_MIN_COMPLETED_NICHES)),
  qualifiedOutcomes: Number(argValue('--min-qualified-outcomes', DEFAULT_MIN_QUALIFIED_OUTCOMES)),
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
  const cleanHeaders = headers.map((header) => header.trim()).filter(Boolean);
  return {
    headers: cleanHeaders,
    rows: body.map((record) => {
      const item = {};
      cleanHeaders.forEach((header, index) => {
        item[header] = record[index] ?? '';
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

function parseDate(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function missingColumns(headers, requiredColumns) {
  return requiredColumns.filter((column) => !headers.includes(column));
}

function uniqueValues(values) {
  return [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))];
}

function ownerEvidenceText(row) {
  return [
    row.current_tool_or_workflow,
    row.current_budget_owner,
    row.switching_barrier,
    row.must_have_proof,
    row.proof_shown,
    row.buyer_reaction,
    row.next_action,
    row.willingness_to_pay_signal,
    row.substitution_outcome,
    row.validation_status
  ].join(' ');
}

function hasProhibitedClaim(row) {
  const text = ownerEvidenceText(row);
  const lowerText = text.toLowerCase();
  const boundaryPatterns = [
    /\bmust\s+not\s+claim\b/,
    /\bdo\s+not\s+claim\b/,
    /\bnot\s+buyer[- ]validated\b/,
    /\breplacement claim allowed:\s*false\b/,
    /\bparity claim allowed:\s*false\b/,
    /\bworld[- ]class[^.]{0,80}\bblocked\b/,
    /\baccuracy remains gated\b/
  ];

  if (boundaryPatterns.some((pattern) => pattern.test(lowerText))) return false;
  return PROHIBITED_CLAIM_PATTERNS.some((pattern) => pattern.test(text));
}

function pushIssue(issues, rowNumber, field, problem, severity = 'error') {
  issues.push({
    source: 'substitution_sheet',
    row_number: rowNumber,
    field,
    severity,
    problem
  });
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

const substitutionKit = readJsonIfExists(inputPaths.substitutionKit, { status: 'missing', summary: {} });
const sheetInput = parseCsv(readText(inputPaths.substitutionSheet));
const missingSheetColumns = missingColumns(sheetInput.headers, REQUIRED_COLUMNS);
const rowIssues = [];
const validCompletedRows = [];
const validQualifiedRows = [];
const validCommitmentRows = [];
let realInteractionCount = 0;
let researchOnlyCount = 0;

for (const [index, row] of sheetInput.rows.entries()) {
  const rowNumber = index + 2;
  const callStatus = normalize(row.call_status);
  const validationStatus = normalize(row.validation_status);
  const signal = normalize(row.willingness_to_pay_signal);
  const substitutionOutcome = normalize(row.substitution_outcome);
  const evidenceQuality = normalize(row.evidence_quality);
  const completed = COMPLETED_STATUS_VALUES.has(callStatus);
  const realInteraction = REAL_STATUS_VALUES.has(callStatus);
  const qualified = QUALIFIED_SIGNAL_VALUES.has(signal) || POSITIVE_SUBSTITUTION_OUTCOMES.has(substitutionOutcome);
  const commitment = COMMITMENT_SIGNAL_VALUES.has(signal) || substitutionOutcome === 'procurement_path';

  if (RESEARCH_STATUS_VALUES.has(callStatus) || RESEARCH_STATUS_VALUES.has(validationStatus)) researchOnlyCount += 1;
  if (realInteraction) realInteractionCount += 1;

  if (!ALLOWED_STATUS_VALUES.has(callStatus)) {
    pushIssue(rowIssues, rowNumber, 'call_status', `Invalid call_status "${row.call_status}".`);
  }

  if (!ALLOWED_SIGNAL_VALUES.has(signal)) {
    pushIssue(rowIssues, rowNumber, 'willingness_to_pay_signal', `Invalid willingness_to_pay_signal "${row.willingness_to_pay_signal}".`);
  }

  if (!ALLOWED_SUBSTITUTION_OUTCOMES.has(substitutionOutcome)) {
    pushIssue(rowIssues, rowNumber, 'substitution_outcome', `Invalid substitution_outcome "${row.substitution_outcome}".`);
  }

  if (!ALLOWED_EVIDENCE_QUALITY_VALUES.has(evidenceQuality)) {
    pushIssue(rowIssues, rowNumber, 'evidence_quality', `Invalid evidence_quality "${row.evidence_quality}".`);
  }

  if (hasProhibitedClaim(row)) {
    pushIssue(rowIssues, rowNumber, '*', 'Row contains prohibited market language such as world-class, commercial-ready, buyer-validated, replacement, parity, or enterprise-ready.', 'warning');
  }

  if (realInteraction) {
    for (const field of ['account_name', 'buyer_role', 'niche', 'substitute_category', 'call_date', 'buyer_name_or_redacted_id', 'proof_shown', 'buyer_reaction', 'next_action']) {
      if (!hasText(row[field])) {
        pushIssue(rowIssues, rowNumber, field, `Real substitution rows must include ${field}.`);
      }
    }
    if (!parseDate(row.call_date)) {
      pushIssue(rowIssues, rowNumber, 'call_date', 'Real substitution rows must include a parseable call_date.');
    }
  }

  if (completed) {
    for (const field of ['current_tool_or_workflow', 'current_budget_owner', 'switching_barrier', 'must_have_proof', 'proof_shown', 'buyer_reaction', 'next_action', 'willingness_to_pay_signal', 'substitution_outcome', 'evidence_quality']) {
      if (!hasText(row[field])) {
        pushIssue(rowIssues, rowNumber, field, `Completed substitution calls must include ${field}.`);
      }
    }
    if (evidenceQuality && !['medium', 'high', 'owner_verified', 'external_share_approved'].includes(evidenceQuality)) {
      pushIssue(rowIssues, rowNumber, 'evidence_quality', 'Completed substitution calls must have medium, high, owner_verified, or external_share_approved evidence quality.');
    }
  }

  if (qualified && !completed) {
    pushIssue(rowIssues, rowNumber, 'substitution_outcome', 'Qualified substitution outcomes must come from completed calls.');
  }

  if (commitment && !hasText(row.next_action)) {
    pushIssue(rowIssues, rowNumber, 'next_action', 'Commitment-path substitution outcomes must include a concrete next action.');
  }

  const rowErrorCount = rowIssues.filter((issue) => issue.row_number === rowNumber && issue.severity === 'error').length;
  if (rowErrorCount === 0 && completed) {
    validCompletedRows.push(row);
    if (qualified) validQualifiedRows.push(row);
    if (commitment) validCommitmentRows.push(row);
  }
}

if (missingSheetColumns.length) {
  pushIssue(rowIssues, 1, missingSheetColumns.join(', '), 'Buyer substitution sheet is missing required columns.');
}

const rowErrorCount = rowIssues.filter((issue) => issue.severity === 'error').length;
const completedNicheCount = uniqueValues(validCompletedRows.map((row) => row.niche)).length;
const completedSubstituteCategoryCount = uniqueValues(validCompletedRows.map((row) => row.substitute_category)).length;
const noRealInteractions = realInteractionCount === 0;
const protocolReady = Boolean(substitutionKit.summary?.substitution_protocol_ready);
const validCompletedCallCount = validCompletedRows.length;
const validQualifiedOutcomeCount = validQualifiedRows.length;
const validCommitmentSignalCount = validCommitmentRows.length;

function gateStatus(condition, noRealRows = false) {
  if (noRealRows) return 'open_no_real_substitution_calls';
  return condition ? 'passed' : 'failed';
}

const acceptanceGates = [
  {
    gate: 'substitution_protocol_ready',
    status: protocolReady ? 'passed' : 'failed',
    evidence: `Kit status=${substitutionKit.status ?? 'missing'}; substitution_protocol_ready=${protocolReady}.`,
    proof_bucket: 'repo_artifact'
  },
  {
    gate: 'substitution_sheet_schema_present',
    status: missingSheetColumns.length === 0 ? 'passed' : 'failed',
    evidence: missingSheetColumns.length
      ? `Missing substitution sheet columns: ${missingSheetColumns.join(', ')}.`
      : `Substitution sheet includes ${REQUIRED_COLUMNS.length} required columns.`,
    proof_bucket: 'repo_artifact'
  },
  {
    gate: 'real_substitution_calls_present',
    status: noRealInteractions ? 'open_no_real_substitution_calls' : 'passed',
    evidence: `${realInteractionCount} real substitution rows loaded; ${researchOnlyCount} research/template rows ignored as proof.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'row_quality_validation',
    status: gateStatus(rowErrorCount === 0 && missingSheetColumns.length === 0, noRealInteractions),
    evidence: `${rowErrorCount} row-level errors and ${rowIssues.length - rowErrorCount} warnings in substitution sheet.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'completed_substitution_calls',
    status: gateStatus(validCompletedCallCount >= thresholds.completedCalls, noRealInteractions),
    evidence: `${validCompletedCallCount} valid completed substitution calls; required ${thresholds.completedCalls}.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'completed_niche_coverage',
    status: gateStatus(completedNicheCount >= thresholds.completedNiches, noRealInteractions),
    evidence: `${completedNicheCount} niches with valid completed substitution calls; required ${thresholds.completedNiches}.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'qualified_substitution_outcomes',
    status: gateStatus(validQualifiedOutcomeCount >= thresholds.qualifiedOutcomes, noRealInteractions),
    evidence: `${validQualifiedOutcomeCount} valid qualified substitution outcomes; required ${thresholds.qualifiedOutcomes}.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'commitment_path_signal',
    status: gateStatus(validCommitmentSignalCount >= thresholds.commitmentSignals, noRealInteractions),
    evidence: `${validCommitmentSignalCount} paid-pilot, LOI, procurement-path, or equivalent commitment rows; required ${thresholds.commitmentSignals}.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'claim_boundary_preserved',
    status: rowIssues.some((issue) => issue.problem.includes('prohibited market language')) ? 'warning' : 'passed',
    evidence: 'Rows are checked for prohibited claims such as world-class, commercial-ready, buyer-validated, replacement, parity, or enterprise-ready.',
    proof_bucket: 'repo_artifact'
  }
];

const readyForBuyerProofGate = acceptanceGates.every((gate) => gate.status === 'passed')
  && validCommitmentSignalCount >= thresholds.commitmentSignals;
const status = noRealInteractions
  ? 'buyer_substitution_evidence_validation_ready_no_real_calls'
  : rowErrorCount > 0 || missingSheetColumns.length > 0
    ? 'buyer_substitution_evidence_validation_failed'
    : validCompletedCallCount < thresholds.completedCalls
      ? 'buyer_substitution_evidence_validation_passed_below_completed_call_threshold'
      : completedNicheCount < thresholds.completedNiches
        ? 'buyer_substitution_evidence_validation_passed_below_niche_threshold'
        : validQualifiedOutcomeCount < thresholds.qualifiedOutcomes
          ? 'buyer_substitution_evidence_validation_passed_below_qualified_outcome_threshold'
          : validCommitmentSignalCount < thresholds.commitmentSignals
            ? 'buyer_substitution_evidence_validation_passed_below_commitment_threshold'
            : 'buyer_substitution_evidence_validation_passed_pending_owner_review';

const validation = {
  schema_version: 'buyer-substitution-evidence-validation-v1',
  generated_at: new Date().toISOString(),
  status,
  proof_boundary: 'This artifact validates owner-filled buyer substitution evidence. It does not create buyer validation, replacement proof, parity proof, paid-pilot proof, hosted proof, enterprise proof, or prediction-accuracy proof.',
  source: {
    substitution_kit: inputPaths.substitutionKit,
    substitution_sheet: inputPaths.substitutionSheet,
    minimum_completed_calls: thresholds.completedCalls,
    minimum_completed_niches: thresholds.completedNiches,
    minimum_qualified_outcomes: thresholds.qualifiedOutcomes,
    minimum_commitment_signals: thresholds.commitmentSignals
  },
  summary: {
    substitution_sheet_rows_read: sheetInput.rows.length,
    real_substitution_interaction_count: realInteractionCount,
    valid_completed_substitution_call_count: validCompletedCallCount,
    completed_substitution_niche_count: completedNicheCount,
    completed_substitute_category_count: completedSubstituteCategoryCount,
    valid_qualified_substitution_outcome_count: validQualifiedOutcomeCount,
    valid_commitment_signal_count: validCommitmentSignalCount,
    missing_column_count: missingSheetColumns.length,
    row_issue_count: rowIssues.length,
    row_error_count: rowErrorCount,
    active_release_hold_count: acceptanceGates.filter((gate) => gate.status !== 'passed').length,
    ready_for_buyer_proof_gate: readyForBuyerProofGate,
    substitution_protocol_ready: protocolReady,
    buyer_substitution_evidence_claim_allowed: readyForBuyerProofGate,
    buyer_validated_claim_allowed: false,
    replacement_claim_allowed: false,
    parity_claim_allowed: false
  },
  required_columns: REQUIRED_COLUMNS,
  allowed_values: {
    call_status: [...ALLOWED_STATUS_VALUES].sort(),
    willingness_to_pay_signal: [...ALLOWED_SIGNAL_VALUES].sort(),
    substitution_outcome: [...ALLOWED_SUBSTITUTION_OUTCOMES].sort(),
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
  next_commands_after_owner_data: [
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:buyer:validate-substitution-evidence -- --substitution-sheet ${inputPaths.substitutionSheet} --update-evidence`,
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:buyer:validate-inputs -- --update-evidence',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:buyer:proof-gate',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:commercial:confidence'
  ]
};

function renderMarkdown(report) {
  const gateRows = report.acceptance_gates
    .map((gate) => `| ${mdCell(gate.gate)} | ${mdCell(gate.status)} | ${mdCell(gate.proof_bucket)} | ${mdCell(gate.evidence)} |`)
    .join('\n');

  const issueRows = report.row_issues.length
    ? report.row_issues
      .map((issue) => `| ${mdCell(issue.source)} | ${issue.row_number} | ${mdCell(issue.field)} | ${mdCell(issue.severity)} | ${mdCell(issue.problem)} |`)
      .join('\n')
    : '| none | - | - | - | - |';

  return `# Buyer Substitution Evidence Validation - 2026-06-06

## Decision

Status: \`${report.status}\`.

Ready for buyer proof gate: **${report.summary.ready_for_buyer_proof_gate}**.

Real substitution interactions: **${report.summary.real_substitution_interaction_count}**.

Valid completed substitution calls: **${report.summary.valid_completed_substitution_call_count}**.

Completed niche coverage: **${report.summary.completed_substitution_niche_count}**.

Valid qualified substitution outcomes: **${report.summary.valid_qualified_substitution_outcome_count}**.

Valid commitment signals: **${report.summary.valid_commitment_signal_count}**.

Buyer-validated claim allowed: **${report.summary.buyer_validated_claim_allowed}**.

Replacement claim allowed: **${report.summary.replacement_claim_allowed}**.

Parity claim allowed: **${report.summary.parity_claim_allowed}**.

## Acceptance Gates

| Gate | Status | Proof Bucket | Evidence |
|---|---|---|---|
${gateRows}

## Row Issues

| Source | Row | Field | Severity | Problem |
|---|---:|---|---|---|
${issueRows}

## Next Commands After Owner Data

${report.next_commands_after_owner_data.map((command, index) => `${index + 1}. \`${command}\``).join('\n')}

## Proof Boundary

${report.proof_boundary}
`;
}

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
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:buyer:validate-substitution-evidence -- --update-evidence: status ${validation.status}, ${validation.summary.real_substitution_interaction_count} real substitution interactions, ${validation.summary.valid_completed_substitution_call_count} valid completed calls, ready_for_buyer_proof_gate ${validation.summary.ready_for_buyer_proof_gate}`
  ], [
    /npm run audit:buyer:validate-substitution-evidence/
  ]);

  evidence.proof_buckets.repo_artifact = replaceMatchingThenAppend(evidence.proof_buckets.repo_artifact, [
    'scripts/validate-buyer-substitution-evidence.mjs validates owner-filled buyer substitution outcomes before replacement, parity, or buyer proof can be upgraded',
    'docs/launch-readiness/buyer-substitution-evidence-validation-2026-06-06.json records substitution sheet schema quality, real substitution calls, niche coverage, qualified outcomes, commitment signals, and release holds',
    'docs/launch-readiness/buyer-substitution-evidence-validation-checklist-2026-06-06.csv provides the substitution evidence validation checklist'
  ], [
    /scripts\/validate-buyer-substitution-evidence\.mjs/,
    /buyer-substitution-evidence-validation-2026-06-06\.json/,
    /buyer-substitution-evidence-validation-checklist-2026-06-06\.csv/
  ]);

  evidence.fix_report = evidence.fix_report ?? {};
  evidence.fix_report.files_changed = replaceMatchingThenAppend(evidence.fix_report.files_changed, [
    'scripts/build-buyer-substitution-proof-kit.mjs',
    'scripts/validate-buyer-substitution-evidence.mjs',
    'docs/launch-readiness/buyer-substitution-test-sheet-2026-06-06.csv',
    'docs/launch-readiness/buyer-substitution-evidence-validation-2026-06-06.json',
    'docs/launch-readiness/buyer-substitution-evidence-validation-2026-06-06.md',
    'docs/launch-readiness/buyer-substitution-evidence-validation-checklist-2026-06-06.csv',
    'package.json'
  ], [
    /scripts\/build-buyer-substitution-proof-kit\.mjs/,
    /scripts\/validate-buyer-substitution-evidence\.mjs/,
    /buyer-substitution-test-sheet-2026-06-06\.csv/,
    /buyer-substitution-evidence-validation-2026-06-06\.json/,
    /buyer-substitution-evidence-validation-2026-06-06\.md/,
    /buyer-substitution-evidence-validation-checklist-2026-06-06\.csv/,
    /package\.json/
  ]);

  evidence.fix_report.tests_run = replaceMatchingThenAppend(evidence.fix_report.tests_run, [
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH node --check scripts/validate-buyer-substitution-evidence.mjs',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:buyer:validate-substitution-evidence -- --update-evidence'
  ], [
    /node --check scripts\/validate-buyer-substitution-evidence\.mjs/,
    /npm run audit:buyer:validate-substitution-evidence/
  ]);

  evidence.fix_report.approval_gates = replaceMatchingThenAppend(evidence.fix_report.approval_gates, [
    'Buyer substitution evidence validator keeps replacement, parity, and buyer-validated claims blocked until owner-filled substitution calls satisfy completed-call, niche, qualified-outcome, commitment-signal, and owner-review gates.'
  ], [
    /Buyer substitution evidence validator keeps/
  ]);

  evidence.implementation_decisions = replaceByTaskId(evidence.implementation_decisions, {
    task_id: 'buyer-substitution-evidence-validator',
    decision: 'Add a validator for owner-filled buyer substitution outcomes so the sellability/uniqueness wedge can be upgraded only from real calls.',
    acceptance_check: 'The validator must reject empty generated sheets as proof, count only valid completed substitution calls, require five-niche coverage, qualified outcomes, and commitment signals, and keep buyer/replacement/parity claims blocked until thresholds pass.',
    chosen_variant: 'minimal CSV validator and package script; no product-code change and no confidence increase',
    rejected_variants: [
      'No-code/defer: rejected because owner-filled substitution outcomes would remain raw, unauditable CSV.',
      'Fold into generic buyer validator only: rejected because substitution proof needs current-tool, budget-owner, switching-barrier, proof, and outcome fields.',
      'Upgrade commercial confidence: rejected because generated templates are not real buyer evidence.'
    ],
    repo_pattern_reused: 'Existing launch-readiness CSV validator and evidence update pattern',
    files_changed: [
      'scripts/build-buyer-substitution-proof-kit.mjs',
      'scripts/validate-buyer-substitution-evidence.mjs',
      'package.json'
    ],
    tests_run: [
      'node --check scripts/validate-buyer-substitution-evidence.mjs',
      'npm run audit:buyer:validate-substitution-evidence'
    ],
    proof: `${validation.status}; ready_for_buyer_proof_gate=${validation.summary.ready_for_buyer_proof_gate}; real_substitution_interactions=${validation.summary.real_substitution_interaction_count}.`,
    reason: 'The original goal asks whether the app is marketable and sellable versus substitutes; that cannot be claimed until buyer substitution outcomes are validated.'
  });

  writeArtifact(inputPaths.evidence, `${JSON.stringify(evidence, null, 2)}\n`);
}

console.log(JSON.stringify({
  json_output: outputPaths.json,
  md_output: outputPaths.md,
  csv_output: outputPaths.csv,
  evidence_updated: updateEvidence,
  status: validation.status,
  real_substitution_interaction_count: validation.summary.real_substitution_interaction_count,
  valid_completed_substitution_call_count: validation.summary.valid_completed_substitution_call_count,
  completed_substitution_niche_count: validation.summary.completed_substitution_niche_count,
  valid_qualified_substitution_outcome_count: validation.summary.valid_qualified_substitution_outcome_count,
  valid_commitment_signal_count: validation.summary.valid_commitment_signal_count,
  ready_for_buyer_proof_gate: validation.summary.ready_for_buyer_proof_gate,
  buyer_validated_claim_allowed: validation.summary.buyer_validated_claim_allowed,
  replacement_claim_allowed: validation.summary.replacement_claim_allowed,
  parity_claim_allowed: validation.summary.parity_claim_allowed
}, null, 2));
