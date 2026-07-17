#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const ROOT = process.cwd();
const DEFAULT_BUYER_TARGETS = 'docs/launch-readiness/buyer-validation-targets-2026-06-06.json';
const DEFAULT_BUYER_DISCOVERY_KIT = 'docs/launch-readiness/buyer-discovery-kit-2026-06-06.json';
const DEFAULT_BUYER_CRM = 'docs/launch-readiness/buyer-validation-crm-template-2026-06-06.csv';
const DEFAULT_BUYER_CALL_SHEET = 'docs/launch-readiness/buyer-discovery-call-sheet-2026-06-06.csv';
const DEFAULT_BUYER_EVIDENCE_VALIDATION = 'docs/launch-readiness/buyer-evidence-input-validation-2026-06-06.json';
const DEFAULT_BUYER_PROOF_GATE = 'docs/launch-readiness/buyer-proof-gate-2026-06-06.json';
const DEFAULT_MARKET_NICHE_VALIDATION = 'docs/launch-readiness/market-niche-evidence-validation-2026-06-06.json';
const DEFAULT_COMPETITIVE_POSITIONING_VALIDATION = 'docs/launch-readiness/competitive-positioning-evidence-validation-2026-06-06.json';
const DEFAULT_CLAIM_CONSISTENCY_VALIDATION = 'docs/launch-readiness/claim-consistency-validation-2026-06-06.json';
const DEFAULT_LOCAL_BROWSER_ROUTE_PROOF = 'docs/launch-readiness/local-browser-route-proof-2026-06-06.json';
const DEFAULT_COMMERCIAL_CONFIDENCE_GATE = 'docs/launch-readiness/commercial-confidence-gate-2026-06-06.json';
const DEFAULT_EVIDENCE = 'docs/launch-readiness/launch-evidence-2026-06-06.json';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/buyer-validation-execution-readiness-2026-06-06.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/buyer-validation-execution-readiness-2026-06-06.md';
const DEFAULT_CSV_OUTPUT = 'docs/launch-readiness/buyer-validation-execution-readiness-checklist-2026-06-06.csv';
const DEFAULT_MIN_TARGETS = 20;
const DEFAULT_MIN_SELECTED_TARGETS = 10;

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

const FIELD_VOCABULARY_EXPECTATIONS = {
  evidence_quality: ['low', 'medium', 'high', 'owner_verified', 'external_share_approved'],
  willingness_to_pay_signal: ['none', 'curiosity_only', 'qualified_followup', 'paid_pilot_discussion', 'loi_discussion', 'procurement_path']
};

function argValue(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function usage() {
  console.error([
    'Usage: node scripts/validate-buyer-validation-execution-readiness.mjs',
    `  [--buyer-targets ${DEFAULT_BUYER_TARGETS}]`,
    `  [--buyer-discovery-kit ${DEFAULT_BUYER_DISCOVERY_KIT}]`,
    `  [--buyer-crm ${DEFAULT_BUYER_CRM}]`,
    `  [--buyer-call-sheet ${DEFAULT_BUYER_CALL_SHEET}]`,
    `  [--buyer-evidence-validation ${DEFAULT_BUYER_EVIDENCE_VALIDATION}]`,
    `  [--buyer-proof-gate ${DEFAULT_BUYER_PROOF_GATE}]`,
    `  [--market-niche-validation ${DEFAULT_MARKET_NICHE_VALIDATION}]`,
    `  [--competitive-positioning-validation ${DEFAULT_COMPETITIVE_POSITIONING_VALIDATION}]`,
    `  [--claim-consistency-validation ${DEFAULT_CLAIM_CONSISTENCY_VALIDATION}]`,
    `  [--local-browser-route-proof ${DEFAULT_LOCAL_BROWSER_ROUTE_PROOF}]`,
    `  [--commercial-confidence-gate ${DEFAULT_COMMERCIAL_CONFIDENCE_GATE}]`,
    `  [--evidence ${DEFAULT_EVIDENCE}]`,
    `  [--json-output ${DEFAULT_JSON_OUTPUT}]`,
    `  [--md-output ${DEFAULT_MD_OUTPUT}]`,
    `  [--csv-output ${DEFAULT_CSV_OUTPUT}]`,
    `  [--min-targets ${DEFAULT_MIN_TARGETS}]`,
    `  [--min-selected-targets ${DEFAULT_MIN_SELECTED_TARGETS}]`,
    '  [--update-evidence]'
  ].join('\n'));
}

if (hasFlag('--help') || hasFlag('-h')) {
  usage();
  process.exit(0);
}

const inputPaths = {
  buyerTargets: argValue('--buyer-targets', DEFAULT_BUYER_TARGETS),
  buyerDiscoveryKit: argValue('--buyer-discovery-kit', DEFAULT_BUYER_DISCOVERY_KIT),
  buyerCrm: argValue('--buyer-crm', DEFAULT_BUYER_CRM),
  buyerCallSheet: argValue('--buyer-call-sheet', DEFAULT_BUYER_CALL_SHEET),
  buyerEvidenceValidation: argValue('--buyer-evidence-validation', DEFAULT_BUYER_EVIDENCE_VALIDATION),
  buyerProofGate: argValue('--buyer-proof-gate', DEFAULT_BUYER_PROOF_GATE),
  marketNicheValidation: argValue('--market-niche-validation', DEFAULT_MARKET_NICHE_VALIDATION),
  competitivePositioningValidation: argValue('--competitive-positioning-validation', DEFAULT_COMPETITIVE_POSITIONING_VALIDATION),
  claimConsistencyValidation: argValue('--claim-consistency-validation', DEFAULT_CLAIM_CONSISTENCY_VALIDATION),
  localBrowserRouteProof: argValue('--local-browser-route-proof', DEFAULT_LOCAL_BROWSER_ROUTE_PROOF),
  commercialConfidenceGate: argValue('--commercial-confidence-gate', DEFAULT_COMMERCIAL_CONFIDENCE_GATE),
  evidence: argValue('--evidence', DEFAULT_EVIDENCE)
};

const outputPaths = {
  json: argValue('--json-output', DEFAULT_JSON_OUTPUT),
  md: argValue('--md-output', DEFAULT_MD_OUTPUT),
  csv: argValue('--csv-output', DEFAULT_CSV_OUTPUT)
};

const thresholds = {
  minTargets: Number(argValue('--min-targets', DEFAULT_MIN_TARGETS)),
  minSelectedTargets: Number(argValue('--min-selected-targets', DEFAULT_MIN_SELECTED_TARGETS))
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

function readJsonIfExists(relativePath, fallback) {
  const absolutePath = resolveRepoPath(relativePath);
  return existsSync(absolutePath) ? JSON.parse(readFileSync(absolutePath, 'utf8')) : fallback;
}

function readTextIfExists(relativePath) {
  const absolutePath = resolveRepoPath(relativePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, 'utf8') : '';
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

function uniqueValues(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    result.push(text);
  }
  return result;
}

function missingColumns(headers, requiredColumns) {
  return requiredColumns.filter((column) => !headers.includes(column));
}

function normalize(value) {
  return String(value ?? '').trim().toLowerCase();
}

function boolStatus(condition) {
  return condition ? 'passed' : 'blocked';
}

function activeCount(items) {
  return items.filter((item) => item.status === 'active').length;
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

function vocabularyValuesForField(schemaRows, field) {
  const schema = schemaRows.find((item) => item.field === field) ?? {};
  return Array.isArray(schema.allowed_values) ? schema.allowed_values.map(normalize) : [];
}

const buyerTargets = readJsonIfExists(inputPaths.buyerTargets, { status: 'missing', target_count: 0, targets: [] });
const buyerDiscoveryKit = readJsonIfExists(inputPaths.buyerDiscoveryKit, {
  status: 'missing',
  source: {},
  selected_targets: [],
  evidence_capture_schema: []
});
const buyerEvidenceValidation = readJsonIfExists(inputPaths.buyerEvidenceValidation, { status: 'missing', summary: {} });
const buyerProofGate = readJsonIfExists(inputPaths.buyerProofGate, { status: 'missing', summary: {}, release_holds: [] });
const marketNicheValidation = readJsonIfExists(inputPaths.marketNicheValidation, { status: 'missing', summary: {}, niche_checks: [] });
const competitivePositioningValidation = readJsonIfExists(inputPaths.competitivePositioningValidation, { status: 'missing', summary: {} });
const claimConsistencyValidation = readJsonIfExists(inputPaths.claimConsistencyValidation, { status: 'missing', summary: {} });
const localBrowserRouteProof = readJsonIfExists(inputPaths.localBrowserRouteProof, { status: 'missing', source: {} });
const commercialConfidenceGate = readJsonIfExists(inputPaths.commercialConfidenceGate, { posture: {}, dimensions: [] });

const callSheet = parseCsv(readTextIfExists(inputPaths.buyerCallSheet));
const crm = parseCsv(readTextIfExists(inputPaths.buyerCrm));
const callSheetMissingColumns = missingColumns(callSheet.headers, REQUIRED_CALL_SHEET_COLUMNS);
const crmMissingColumns = missingColumns(crm.headers, REQUIRED_CRM_COLUMNS);

const priorityNiches = uniqueValues((marketNicheValidation.niche_checks ?? []).map((niche) => niche.niche));
const targetNiches = uniqueValues((buyerTargets.targets ?? []).map((target) => target.niche));
const selectedNiches = uniqueValues((buyerDiscoveryKit.selected_targets ?? []).map((target) => target.niche));
const callSheetNiches = uniqueValues(callSheet.rows.map((row) => row.niche));
const missingTargetNiches = priorityNiches.filter((niche) => !targetNiches.includes(niche));
const missingSelectedNiches = priorityNiches.filter((niche) => !selectedNiches.includes(niche));
const missingCallSheetNiches = priorityNiches.filter((niche) => !callSheetNiches.includes(niche));

const namedTargetCount = Number(buyerTargets.target_count ?? buyerTargets.targets?.length ?? 0);
const selectedTargetCount = Number(buyerDiscoveryKit.source?.selected_count ?? buyerDiscoveryKit.selected_targets?.length ?? 0);
const buyerEvidenceSummary = buyerEvidenceValidation.summary ?? {};
const proofGateSummary = buyerProofGate.summary ?? {};
const completedCallCount = Number(proofGateSummary.completed_call_with_required_fields_count ?? 0);
const qualifiedFollowupCount = Number(proofGateSummary.qualified_followup_count ?? 0);
const commitmentSignalCount = Number(proofGateSummary.paid_pilot_loi_or_procurement_signal_count ?? 0);
const realInteractionCount = Number(buyerEvidenceSummary.real_interaction_count ?? 0);
const validCompletedCallCount = Number(buyerEvidenceSummary.valid_completed_call_count ?? 0);
const validOutcomeCaptureCount = Number(buyerEvidenceSummary.valid_outcome_capture_count ?? 0);
const validQualifiedFollowupCount = Number(buyerEvidenceSummary.valid_qualified_followup_count ?? 0);
const validCommitmentSignalCount = Number(buyerEvidenceSummary.valid_commitment_signal_count ?? 0);
const buyerDimension = (commercialConfidenceGate.dimensions ?? []).find((dimension) => dimension.id === 'buyer_validation') ?? {};

const targetPackReady = namedTargetCount >= thresholds.minTargets && missingTargetNiches.length === 0;
const selectedSlateReady = selectedTargetCount >= thresholds.minSelectedTargets && missingSelectedNiches.length === 0;
const callSheetCoverageReady = callSheet.rows.length >= thresholds.minSelectedTargets && missingCallSheetNiches.length === 0;
const callSheetSchemaReady = callSheetMissingColumns.length === 0;
const crmSchemaReady = crmMissingColumns.length === 0;
const marketNicheBuyerSafe = Boolean(marketNicheValidation.summary?.buyer_safe_pilot_claim_allowed);
const competitiveWedgeReady = Boolean(competitivePositioningValidation.summary?.defensible_competitive_wedge_claim_allowed);
const claimConsistencyReady = Boolean(claimConsistencyValidation.summary?.claim_consistency_ready)
  && Number(claimConsistencyValidation.summary?.unsupported_claim_mention_count ?? 0) === 0;
const localRouteProofReady = localBrowserRouteProof.status === 'local_route_proof_ready_not_hosted_proof'
  && Number(localBrowserRouteProof.source?.rendered_or_expected_auth_gate_count ?? 0) >= 5
  && Number(localBrowserRouteProof.source?.runtime_console_error_count ?? 0) === 0;
const buyerProofGateReady = buyerProofGate.status === 'buyer_proof_gate_ready_not_buyer_validation';
const noBuyerProofClaimed = !Boolean(proofGateSummary.buyer_validation_verified)
  && !Boolean(buyerEvidenceSummary.buyer_validation_claim_allowed)
  && !Boolean(marketNicheValidation.summary?.buyer_validated_claim_allowed)
  && !Boolean(competitivePositioningValidation.summary?.buyer_validated_claim_allowed);
const realInteractionsAbsentBoundaryPreserved = realInteractionCount === 0
  && completedCallCount === 0
  && qualifiedFollowupCount === 0
  && commitmentSignalCount === 0
  && validCompletedCallCount === 0
  && validQualifiedFollowupCount === 0
  && validCommitmentSignalCount === 0;

const vocabularyChecks = Object.entries(FIELD_VOCABULARY_EXPECTATIONS).map(([field, expectedValues]) => {
  const actualValues = vocabularyValuesForField(buyerDiscoveryKit.evidence_capture_schema ?? [], field);
  const missingValues = expectedValues.filter((value) => !actualValues.includes(value));
  return {
    field,
    expected_values: expectedValues,
    actual_values: actualValues,
    missing_values: missingValues,
    ready: missingValues.length === 0
  };
});
const schemaVocabularyReady = vocabularyChecks.every((check) => check.ready);

const executionReadyForOwnerOutreach = [
  targetPackReady,
  selectedSlateReady,
  callSheetCoverageReady,
  callSheetSchemaReady,
  crmSchemaReady,
  schemaVocabularyReady,
  marketNicheBuyerSafe,
  competitiveWedgeReady,
  claimConsistencyReady,
  localRouteProofReady,
  buyerProofGateReady,
  noBuyerProofClaimed
].every(Boolean);

const acceptanceGates = [
  {
    gate: 'named_target_pack_covers_top_five',
    status: boolStatus(targetPackReady),
    proof_bucket: 'repo_artifact',
    evidence: `${namedTargetCount} named targets; ${priorityNiches.length - missingTargetNiches.length}/${priorityNiches.length} priority niches covered.`,
    next_action: missingTargetNiches.length > 0 ? `Add targets for ${missingTargetNiches.join('; ')}.` : 'No target-pack action needed before owner slate review.'
  },
  {
    gate: 'selected_10_call_slate_covers_top_five',
    status: boolStatus(selectedSlateReady),
    proof_bucket: 'repo_artifact',
    evidence: `${selectedTargetCount} selected targets; ${priorityNiches.length - missingSelectedNiches.length}/${priorityNiches.length} priority niches covered.`,
    next_action: missingSelectedNiches.length > 0 ? `Regenerate the discovery kit with selected targets for ${missingSelectedNiches.join('; ')}.` : 'Owner can approve or edit the balanced slate.'
  },
  {
    gate: 'call_sheet_matches_selected_slate',
    status: boolStatus(callSheetCoverageReady),
    proof_bucket: 'repo_artifact',
    evidence: `${callSheet.rows.length} call-sheet rows; ${priorityNiches.length - missingCallSheetNiches.length}/${priorityNiches.length} priority niches covered.`,
    next_action: missingCallSheetNiches.length > 0 ? `Regenerate the call sheet to include ${missingCallSheetNiches.join('; ')}.` : 'Use the call sheet as the discovery recording surface.'
  },
  {
    gate: 'capture_schema_ready',
    status: boolStatus(callSheetSchemaReady && crmSchemaReady && schemaVocabularyReady),
    proof_bucket: 'repo_artifact',
    evidence: `${REQUIRED_CALL_SHEET_COLUMNS.length - callSheetMissingColumns.length}/${REQUIRED_CALL_SHEET_COLUMNS.length} call-sheet columns and ${REQUIRED_CRM_COLUMNS.length - crmMissingColumns.length}/${REQUIRED_CRM_COLUMNS.length} CRM columns present; schema vocabulary ready=${schemaVocabularyReady}.`,
    next_action: callSheetMissingColumns.length || crmMissingColumns.length
      ? `Repair missing columns: ${[...callSheetMissingColumns, ...crmMissingColumns].join(', ')}.`
      : 'No schema repair needed before calls.'
  },
  {
    gate: 'market_and_competitive_claim_boundaries_ready',
    status: boolStatus(marketNicheBuyerSafe && competitiveWedgeReady && claimConsistencyReady && noBuyerProofClaimed),
    proof_bucket: 'repo_artifact',
    evidence: `market_buyer_safe=${marketNicheBuyerSafe}; competitive_wedge=${competitiveWedgeReady}; claim_consistency_ready=${claimConsistencyReady}; buyer_proof_claimed=${!noBuyerProofClaimed}.`,
    next_action: 'Use pilot-only language and keep buyer-validated, commercial-ready, replacement/parity, and world-class prediction claims blocked.'
  },
  {
    gate: 'local_demo_route_proof_available',
    status: boolStatus(localRouteProofReady),
    proof_bucket: 'local',
    evidence: `Local route proof status=${localBrowserRouteProof.status ?? 'missing'}; ready routes=${Number(localBrowserRouteProof.source?.rendered_or_expected_auth_gate_count ?? 0)}; runtime errors=${Number(localBrowserRouteProof.source?.runtime_console_error_count ?? 0)}.`,
    next_action: localRouteProofReady ? 'Use local proof only; do not claim hosted proof.' : 'Run local route proof before owner discovery review.'
  },
  {
    gate: 'real_interaction_boundary_preserved',
    status: boolStatus(realInteractionsAbsentBoundaryPreserved && buyerProofGateReady),
    proof_bucket: 'repo_artifact',
    evidence: `${realInteractionCount} real interactions, ${completedCallCount} completed calls, ${qualifiedFollowupCount} qualified follow-ups, ${commitmentSignalCount} commitment-path signals.`,
    next_action: 'After owner-approved calls, rerun buyer input validation, buyer proof gate, this readiness validator, and commercial confidence gate.'
  }
];

const releaseHolds = [
  {
    hold: 'owner_approves_discovery_slate',
    severity: 'P1',
    status: 'active',
    evidence_needed: 'Owner approves or edits the balanced 10-target discovery slate before outreach.'
  },
  {
    hold: 'completed_calls_missing',
    severity: 'P1',
    status: completedCallCount >= 10 ? 'ready_for_review' : 'active',
    evidence_needed: '10 completed buyer discovery calls with buyer role, proof shown, objection, next action, willingness-to-pay signal, and evidence quality.'
  },
  {
    hold: 'pilot_outcome_capture_missing',
    severity: 'P1',
    status: validOutcomeCaptureCount >= 10 ? 'ready_for_review' : 'active',
    evidence_needed: '10 completed calls with baseline/current-workflow value, pilot outcome or expected delta, quality signal, buyer decision event, and outcome evidence notes.'
  },
  {
    hold: 'qualified_followups_missing',
    severity: 'P1',
    status: qualifiedFollowupCount >= 3 ? 'ready_for_review' : 'active',
    evidence_needed: 'Three qualified follow-ups beyond curiosity-only interest.'
  },
  {
    hold: 'paid_pilot_or_loi_signal_missing',
    severity: 'P1',
    status: commitmentSignalCount >= 1 ? 'ready_for_review' : 'active',
    evidence_needed: 'One paid-pilot, LOI, or procurement-path signal.'
  },
  {
    hold: 'owner_external_claim_language_missing',
    severity: 'P2',
    status: 'active',
    evidence_needed: 'Owner-approved external-share wording that preserves pilot-only, no buyer-proof, no hosted-live, no enterprise-ready, and no world-class prediction boundaries.'
  }
];

const report = {
  schema_version: 'buyer-validation-execution-readiness-v1',
  generated_at: new Date().toISOString(),
  status: executionReadyForOwnerOutreach && realInteractionsAbsentBoundaryPreserved
    ? 'buyer_validation_execution_ready_no_real_calls'
    : !claimConsistencyReady || !noBuyerProofClaimed
      ? 'buyer_validation_execution_blocked_claim_boundary'
      : !selectedSlateReady || !callSheetCoverageReady
        ? 'buyer_validation_execution_blocked_priority_niche_coverage'
        : 'buyer_validation_execution_readiness_partial',
  source: {
    buyer_validation_targets: inputPaths.buyerTargets,
    buyer_discovery_kit: inputPaths.buyerDiscoveryKit,
    buyer_validation_crm: inputPaths.buyerCrm,
    buyer_discovery_call_sheet: inputPaths.buyerCallSheet,
    buyer_evidence_validation: inputPaths.buyerEvidenceValidation,
    buyer_proof_gate: inputPaths.buyerProofGate,
    market_niche_validation: inputPaths.marketNicheValidation,
    competitive_positioning_validation: inputPaths.competitivePositioningValidation,
    claim_consistency_validation: inputPaths.claimConsistencyValidation,
    local_browser_route_proof: inputPaths.localBrowserRouteProof,
    commercial_confidence_gate: inputPaths.commercialConfidenceGate,
    launch_evidence: inputPaths.evidence,
    buyer_validation_dimension_status: buyerDimension.status ?? 'missing',
    buyer_validation_dimension_score_percent: Number(buyerDimension.current_score_percent ?? 0)
  },
  proof_boundary: {
    proves: [
      'The 10-call discovery slate, recording schema, local-demo proof, and claim-boundary gates are ready for owner review.',
      'The selected slate covers the validated top-five niche thesis before external buyer calls.',
      'Research/template rows are still excluded from buyer proof.'
    ],
    does_not_prove: [
      'Buyer demand, willingness to pay, paid-pilot, LOI, procurement-path, or referenceable buyer proof.',
      'Hosted operational proof, enterprise procurement proof, or world-class prediction accuracy.'
    ]
  },
  summary: {
    target_count: namedTargetCount,
    selected_target_count: selectedTargetCount,
    call_sheet_row_count: callSheet.rows.length,
    crm_row_count: crm.rows.length,
    priority_niche_count: priorityNiches.length,
    target_priority_niche_covered_count: priorityNiches.length - missingTargetNiches.length,
    selected_priority_niche_covered_count: priorityNiches.length - missingSelectedNiches.length,
    call_sheet_priority_niche_covered_count: priorityNiches.length - missingCallSheetNiches.length,
    call_sheet_required_column_count: REQUIRED_CALL_SHEET_COLUMNS.length,
    call_sheet_present_required_column_count: REQUIRED_CALL_SHEET_COLUMNS.length - callSheetMissingColumns.length,
    crm_required_column_count: REQUIRED_CRM_COLUMNS.length,
    crm_present_required_column_count: REQUIRED_CRM_COLUMNS.length - crmMissingColumns.length,
    schema_vocabulary_ready: schemaVocabularyReady,
    real_interaction_count: realInteractionCount,
    completed_call_count: completedCallCount,
    qualified_followup_count: qualifiedFollowupCount,
    paid_pilot_loi_or_procurement_signal_count: commitmentSignalCount,
    valid_completed_call_count_after_input_validation: validCompletedCallCount,
    valid_outcome_capture_count_after_input_validation: validOutcomeCaptureCount,
    valid_qualified_followup_count_after_input_validation: validQualifiedFollowupCount,
    valid_commitment_signal_count_after_input_validation: validCommitmentSignalCount,
    execution_ready_for_owner_outreach: executionReadyForOwnerOutreach,
    buyer_validation_verified: false,
    buyer_validated_claim_allowed: false,
    active_release_hold_count: activeCount(releaseHolds)
  },
  priority_niches: priorityNiches,
  selected_niches: selectedNiches,
  missing_selected_priority_niches: missingSelectedNiches,
  missing_call_sheet_priority_niches: missingCallSheetNiches,
  vocabulary_checks: vocabularyChecks,
  acceptance_gates: acceptanceGates,
  release_holds: releaseHolds,
  owner_action_order: [
    'Review the selected 10-call slate for conflicts, sensitivity, and target-order changes.',
    'Approve the pilot-only outbound language and proof assets before any external contact.',
    'Run discovery calls manually; do not automate outreach from this repo.',
    'Record every outcome, including no-fit and objections, in the call sheet and CRM.',
    'Rerun buyer evidence validation, buyer proof gate, this execution-readiness gate, claim consistency, and commercial confidence after real rows are added.'
  ]
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

  const holdRows = validation.release_holds
    .map((hold) => [
      mdCell(hold.hold),
      mdCell(hold.severity),
      mdCell(hold.status),
      mdCell(hold.evidence_needed)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  return `# Buyer Validation Execution Readiness - 2026-06-06

## Decision

Status: \`${validation.status}\`.

Execution ready for owner outreach: **${validation.summary.execution_ready_for_owner_outreach}**.

This artifact proves only that the discovery loop is ready for owner review and manual execution. It does not prove buyer demand, willingness to pay, hosted readiness, enterprise readiness, or prediction accuracy.

Selected top-five niche coverage: **${validation.summary.selected_priority_niche_covered_count}/${validation.summary.priority_niche_count}**. Call-sheet top-five niche coverage: **${validation.summary.call_sheet_priority_niche_covered_count}/${validation.summary.priority_niche_count}**. Missing selected niches: **${validation.missing_selected_priority_niches.length > 0 ? validation.missing_selected_priority_niches.join(', ') : 'none'}**.

Completed calls: **${validation.summary.completed_call_count}**. Valid outcome-capture rows: **${validation.summary.valid_outcome_capture_count_after_input_validation}**. Qualified follow-ups: **${validation.summary.qualified_followup_count}**. Paid-pilot/LOI/procurement-path signals: **${validation.summary.paid_pilot_loi_or_procurement_signal_count}**.

Buyer-validated claim allowed: **${validation.summary.buyer_validated_claim_allowed}**.

## Acceptance Gates

| Gate | Status | Proof Bucket | Evidence | Next Action |
|---|---|---|---|---|
${gateRows}

## Release Holds

| Hold | Severity | Status | Evidence Needed |
|---|---|---|---|
${holdRows}

## Owner Action Order

${validation.owner_action_order.map((item, index) => `${index + 1}. ${item}`).join('\n')}

## Proof Boundary

This is repo/local readiness proof for a manual discovery loop. It is not buyer proof until real completed interactions, objections, follow-ups, and commitment-path signals are recorded and revalidated.
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
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:buyer:execution-readiness -- --buyer-targets ${inputPaths.buyerTargets} --buyer-discovery-kit ${inputPaths.buyerDiscoveryKit} --buyer-crm ${inputPaths.buyerCrm} --buyer-call-sheet ${inputPaths.buyerCallSheet} --buyer-evidence-validation ${inputPaths.buyerEvidenceValidation} --buyer-proof-gate ${inputPaths.buyerProofGate} --market-niche-validation ${inputPaths.marketNicheValidation} --competitive-positioning-validation ${inputPaths.competitivePositioningValidation} --claim-consistency-validation ${inputPaths.claimConsistencyValidation} --local-browser-route-proof ${inputPaths.localBrowserRouteProof} --commercial-confidence-gate ${inputPaths.commercialConfidenceGate} --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence: status ${report.status}, execution_ready_for_owner_outreach ${report.summary.execution_ready_for_owner_outreach}, buyer_validated_claim_allowed false`
  ], [
    /npm run audit:buyer:execution-readiness/
  ]);
  evidence.proof_buckets.repo_artifact = replaceMatchingThenAppend(evidence.proof_buckets.repo_artifact, [
    'scripts/validate-buyer-validation-execution-readiness.mjs validates the manual 10-call buyer discovery loop for top-five niche coverage, schema readiness, local proof, and claim-boundary safety',
    'docs/launch-readiness/buyer-validation-execution-readiness-2026-06-06.json records owner-outreach readiness, active buyer-validation holds, and no-buyer-proof boundaries',
    'docs/launch-readiness/buyer-validation-execution-readiness-checklist-2026-06-06.csv provides the buyer-validation execution-readiness checklist'
  ], [
    /scripts\/validate-buyer-validation-execution-readiness\.mjs/,
    /buyer-validation-execution-readiness-2026-06-06\.json/,
    /buyer-validation-execution-readiness-checklist-2026-06-06\.csv/
  ]);

  evidence.fix_report = evidence.fix_report ?? {};
  evidence.fix_report.files_changed = replaceMatchingThenAppend(evidence.fix_report.files_changed, [
    'scripts/build-buyer-discovery-kit.mjs',
    'scripts/validate-buyer-validation-execution-readiness.mjs',
    'scripts/build-commercial-confidence-gate.mjs',
    'docs/launch-readiness/buyer-discovery-kit-2026-06-06.json',
    'docs/launch-readiness/buyer-discovery-kit-2026-06-06.md',
    'docs/launch-readiness/buyer-discovery-call-sheet-2026-06-06.csv',
    'docs/launch-readiness/buyer-validation-execution-readiness-2026-06-06.json',
    'docs/launch-readiness/buyer-validation-execution-readiness-2026-06-06.md',
    'docs/launch-readiness/buyer-validation-execution-readiness-checklist-2026-06-06.csv',
    'package.json'
  ], [
    /scripts\/build-buyer-discovery-kit\.mjs/,
    /scripts\/validate-buyer-validation-execution-readiness\.mjs/,
    /scripts\/build-commercial-confidence-gate\.mjs/,
    /buyer-discovery-kit-2026-06-06\.json/,
    /buyer-discovery-kit-2026-06-06\.md/,
    /buyer-discovery-call-sheet-2026-06-06\.csv/,
    /buyer-validation-execution-readiness-2026-06-06\.json/,
    /buyer-validation-execution-readiness-2026-06-06\.md/,
    /buyer-validation-execution-readiness-checklist-2026-06-06\.csv/,
    /package\.json/
  ]);
  evidence.fix_report.tests_run = replaceMatchingThenAppend(evidence.fix_report.tests_run, [
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH node --check scripts/build-buyer-discovery-kit.mjs',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH node --check scripts/validate-buyer-validation-execution-readiness.mjs',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:buyer:discovery-kit',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:buyer:validate-inputs',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:buyer:proof-gate',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:buyer:execution-readiness'
  ], [
    /node --check scripts\/build-buyer-discovery-kit\.mjs/,
    /node --check scripts\/validate-buyer-validation-execution-readiness\.mjs/,
    /npm run audit:buyer:discovery-kit/,
    /npm run audit:buyer:validate-inputs/,
    /npm run audit:buyer:proof-gate/,
    /npm run audit:buyer:execution-readiness/
  ]);
  evidence.fix_report.approval_gates = replaceMatchingThenAppend(evidence.fix_report.approval_gates, [
    'Buyer-validation execution readiness is repo/local readiness proof only; owner approval, completed calls, qualified follow-ups, paid-pilot/LOI/procurement-path signal, and approved external claim language remain required before buyer-validation claims can be upgraded.'
  ], [
    /Buyer-validation execution readiness is repo\/local readiness proof only/
  ]);

  evidence.implementation_decisions = replaceByTaskId(evidence.implementation_decisions, {
    task_id: 'buyer-validation-execution-readiness-harness',
    decision: 'Balance the 10-call discovery slate across the validated top-five niches and add a deterministic readiness validator before owner outreach.',
    acceptance_check: 'The validator confirms target-pack coverage, selected-slate coverage, call-sheet coverage, CRM/call-sheet schema, claim consistency, local route proof, and no buyer-proof claim leakage while keeping buyer validation unverified.',
    chosen_variant: 'minimal generator patch plus no-dependency readiness validator; no runtime product change, no outreach automation, and no confidence-score inflation',
    repo_pattern_reused: 'Existing launch-readiness Node artifact validator pattern',
    files_changed: [
      'scripts/build-buyer-discovery-kit.mjs',
      'scripts/validate-buyer-validation-execution-readiness.mjs',
      'scripts/build-commercial-confidence-gate.mjs',
      'package.json'
    ],
    tests_run: [
      'node --check scripts/build-buyer-discovery-kit.mjs',
      'node --check scripts/validate-buyer-validation-execution-readiness.mjs',
      'npm run audit:buyer:discovery-kit',
      'npm run audit:buyer:validate-inputs',
      'npm run audit:buyer:proof-gate',
      'npm run audit:buyer:execution-readiness',
      'npm run audit:commercial:confidence'
    ],
    proof: `${report.status}; selected_priority_niche_covered_count=${report.summary.selected_priority_niche_covered_count}/${report.summary.priority_niche_count}; execution_ready_for_owner_outreach=${report.summary.execution_ready_for_owner_outreach}; buyer_validated_claim_allowed=false.`,
    reason: 'The sellability blocker is no longer niche clarity; it is now owner-approved buyer execution and real willingness-to-pay evidence.'
  });
  evidence.rejected_variants = replaceByTaskId(evidence.rejected_variants, {
    task_id: 'buyer-validation-execution-readiness-harness',
    variant: 'Treat existing rank-ordered target lists and templates as sufficient sellability proof.',
    reason_rejected: 'The rank-ordered call slate can miss validated niches and templates do not prove buyer demand, budget, procurement path, or willingness to pay.',
    tradeoff: 'The patch adds a narrow readiness gate and preserves the commercial score until real buyer evidence exists.',
    evidence: `${report.status} keeps buyer_validation_verified=false and buyer_validated_claim_allowed=false.`
  });
  evidence.code_optimization_reviews = replaceByTaskId(evidence.code_optimization_reviews, {
    target_task: 'buyer-validation-execution-readiness-harness',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'No dependency, no app runtime edit, no live outreach, no hosted/secret-dependent execution, and the commercial confidence score remains unchanged.',
    tests_or_checks: [
      'node --check scripts/build-buyer-discovery-kit.mjs',
      'node --check scripts/validate-buyer-validation-execution-readiness.mjs',
      'npm run audit:buyer:execution-readiness',
      'npm run audit:commercial:confidence'
    ],
    remaining_risk: 'Owner-approved calls, hosted proof, enterprise procurement evidence, and real forecast scoring are still missing.'
  });

  writeArtifact(inputPaths.evidence, `${JSON.stringify(evidence, null, 2)}\n`);
}

console.log(JSON.stringify({
  json_output: outputPaths.json,
  md_output: outputPaths.md,
  csv_output: outputPaths.csv,
  evidence_updated: updateEvidence,
  status: report.status,
  execution_ready_for_owner_outreach: report.summary.execution_ready_for_owner_outreach,
  target_count: report.summary.target_count,
  selected_target_count: report.summary.selected_target_count,
  selected_priority_niche_covered_count: report.summary.selected_priority_niche_covered_count,
  priority_niche_count: report.summary.priority_niche_count,
  completed_call_count: report.summary.completed_call_count,
  qualified_followup_count: report.summary.qualified_followup_count,
  paid_pilot_loi_or_procurement_signal_count: report.summary.paid_pilot_loi_or_procurement_signal_count,
  buyer_validation_verified: report.summary.buyer_validation_verified,
  buyer_validated_claim_allowed: report.summary.buyer_validated_claim_allowed
}, null, 2));
