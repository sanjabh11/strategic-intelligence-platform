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
const DEFAULT_PILOT_OFFER_PACK = 'docs/launch-readiness/pilot-offer-pack-2026-06-06.json';
const DEFAULT_ENTERPRISE_TRUST_PACK = 'docs/launch-readiness/enterprise-trust-pack-2026-06-06.json';
const DEFAULT_FORECAST_CLAIM_GOVERNANCE = 'docs/launch-readiness/forecast-claim-governance-2026-06-06.json';
const DEFAULT_CONFIDENCE_GATE = 'docs/launch-readiness/commercial-confidence-gate-2026-06-06.json';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/buyer-proof-gate-2026-06-06.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/buyer-proof-gate-2026-06-06.md';
const DEFAULT_CSV_OUTPUT = 'docs/launch-readiness/buyer-proof-gate-checklist-2026-06-06.csv';

const REAL_STATUS_VALUES = new Set(['contacted', 'replied', 'scheduled', 'completed', 'rejected']);
const COMPLETED_STATUS_VALUES = new Set(['completed']);
const QUALIFIED_SIGNAL_VALUES = new Set(['qualified_followup', 'paid_pilot_discussion', 'loi_discussion', 'procurement_path']);
const PAID_OR_COMMITMENT_SIGNAL_VALUES = new Set(['paid_pilot_discussion', 'loi_discussion', 'procurement_path']);
const RESEARCH_STATUS_VALUES = new Set(['', 'research', 'template', 'hypothesis', 'not_contacted', 'research_target_not_contacted']);

function argValue(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function usage() {
  console.error([
    'Usage: node scripts/build-buyer-proof-gate.mjs',
    `  [--buyer-targets ${DEFAULT_BUYER_TARGETS}]`,
    `  [--buyer-discovery-kit ${DEFAULT_BUYER_DISCOVERY_KIT}]`,
    `  [--buyer-crm ${DEFAULT_BUYER_CRM}]`,
    `  [--buyer-call-sheet ${DEFAULT_BUYER_CALL_SHEET}]`,
    `  [--buyer-evidence-validation ${DEFAULT_BUYER_EVIDENCE_VALIDATION}]`,
    `  [--pilot-offer-pack ${DEFAULT_PILOT_OFFER_PACK}]`,
    `  [--enterprise-trust-pack ${DEFAULT_ENTERPRISE_TRUST_PACK}]`,
    `  [--forecast-claim-governance ${DEFAULT_FORECAST_CLAIM_GOVERNANCE}]`,
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
  buyerTargets: argValue('--buyer-targets', DEFAULT_BUYER_TARGETS),
  buyerDiscoveryKit: argValue('--buyer-discovery-kit', DEFAULT_BUYER_DISCOVERY_KIT),
  buyerCrm: argValue('--buyer-crm', DEFAULT_BUYER_CRM),
  buyerCallSheet: argValue('--buyer-call-sheet', DEFAULT_BUYER_CALL_SHEET),
  buyerEvidenceValidation: argValue('--buyer-evidence-validation', DEFAULT_BUYER_EVIDENCE_VALIDATION),
  pilotOfferPack: argValue('--pilot-offer-pack', DEFAULT_PILOT_OFFER_PACK),
  enterpriseTrustPack: argValue('--enterprise-trust-pack', DEFAULT_ENTERPRISE_TRUST_PACK),
  forecastClaimGovernance: argValue('--forecast-claim-governance', DEFAULT_FORECAST_CLAIM_GOVERNANCE),
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

function readTextIfExists(relativePath) {
  const absolutePath = resolveRepoPath(relativePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, 'utf8') : '';
}

function writeArtifact(relativePath, contents) {
  const absolutePath = resolveRepoPath(relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, contents);
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

  if (field || row.length) row.push(field);
  if (field || row.length) records.push(row);

  const nonEmptyRecords = records.filter((record) => record.some((value) => String(value ?? '').trim()));
  const [headers = [], ...body] = nonEmptyRecords;
  return body.map((record) => {
    const item = {};
    headers.forEach((header, index) => {
      item[header.trim()] = record[index] ?? '';
    });
    return item;
  });
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

function normalize(value) {
  return String(value ?? '').trim().toLowerCase();
}

function joinedText(row) {
  return Object.values(row).join(' ').toLowerCase();
}

function hasRequiredCompletedFields(row) {
  return [
    'buyer_role',
    'proof_shown',
    'objection',
    'next_action',
    'willingness_to_pay_signal',
    'baseline_value_or_current_workflow',
    'pilot_outcome_value_or_expected_delta',
    'quality_signal',
    'buyer_decision_event',
    'outcome_evidence_notes'
  ].every((field) => String(row[field] ?? '').trim());
}

const buyerTargets = readJsonIfExists(inputPaths.buyerTargets, { status: 'missing', target_count: 0, targets: [] });
const buyerDiscoveryKit = readJsonIfExists(inputPaths.buyerDiscoveryKit, {
  status: 'missing',
  source: {},
  selected_targets: [],
  success_gate_for_confidence_upgrade: {}
});
const pilotOfferPack = readJsonIfExists(inputPaths.pilotOfferPack, { status: 'missing', pilot_offer: {} });
const buyerEvidenceValidation = readJsonIfExists(inputPaths.buyerEvidenceValidation, {
  status: 'missing',
  summary: {
    real_interaction_count: 0,
    valid_completed_call_count: 0,
    valid_qualified_followup_count: 0,
    valid_commitment_signal_count: 0,
    active_release_hold_count: 0,
    ready_for_buyer_proof_gate: false
  },
  acceptance_gates: [],
  release_holds: []
});
const enterpriseTrustPack = readJsonIfExists(inputPaths.enterpriseTrustPack, { status: 'missing', source: {} });
const forecastClaimGovernance = readJsonIfExists(inputPaths.forecastClaimGovernance, { status: 'missing', summary: {} });
const confidenceGate = readJsonIfExists(inputPaths.confidenceGate, { dimensions: [], posture: {} });
const crmRows = parseCsv(readTextIfExists(inputPaths.buyerCrm));
const callSheetRows = parseCsv(readTextIfExists(inputPaths.buyerCallSheet));

const allEvidenceRows = [
  ...crmRows.map((row) => ({ ...row, evidence_source: 'crm_template' })),
  ...callSheetRows.map((row) => ({ ...row, evidence_source: 'call_sheet' }))
];

const contactedRows = allEvidenceRows.filter((row) => REAL_STATUS_VALUES.has(normalize(row.call_status ?? row.status)));
const completedRows = allEvidenceRows.filter((row) => COMPLETED_STATUS_VALUES.has(normalize(row.call_status ?? row.status)));
const completedRowsWithRequiredFields = completedRows.filter(hasRequiredCompletedFields);
const researchOnlyRows = allEvidenceRows.filter((row) => RESEARCH_STATUS_VALUES.has(normalize(row.call_status ?? row.status)));
const realInteractionRows = allEvidenceRows.filter((row) => REAL_STATUS_VALUES.has(normalize(row.call_status ?? row.status)));
const qualifiedFollowupRows = realInteractionRows.filter((row) => QUALIFIED_SIGNAL_VALUES.has(normalize(row.willingness_to_pay_signal)));
const paidOrCommitmentRows = realInteractionRows.filter((row) => PAID_OR_COMMITMENT_SIGNAL_VALUES.has(normalize(row.willingness_to_pay_signal)));
const rejectedRows = realInteractionRows.filter((row) => normalize(row.call_status ?? row.status) === 'rejected' || /no fit|rejected|disqualified/.test(joinedText(row)));
const securityBlockerRows = allEvidenceRows.filter((row) => /security|procurement|dpa|rls|sso|soc2|hosted/.test(String(row.security_or_procurement_blocker ?? '').toLowerCase()));
const accuracyBlockerRows = allEvidenceRows.filter((row) => /accuracy|benchmark|calibration|resolved|baseline/.test(String(row.accuracy_or_benchmark_blocker ?? '').toLowerCase()));

const selectedTargetCount = Number(buyerDiscoveryKit.source?.selected_count ?? buyerDiscoveryKit.selected_targets?.length ?? 0);
const namedTargetCount = Number(buyerTargets.target_count ?? buyerTargets.targets?.length ?? 0);
const successGate = buyerDiscoveryKit.success_gate_for_confidence_upgrade ?? {};
const minimumCompletedCalls = Number(successGate.minimum_calls ?? 10);
const minimumQualifiedFollowups = Number(successGate.qualified_followups ?? 3);
const minimumPaidOrLoi = Number(successGate.paid_pilot_or_loi_discussions ?? 1);
const buyerDimension = (confidenceGate.dimensions ?? []).find((dimension) => dimension.id === 'buyer_validation') ?? {};
const buyerEvidenceValidationStatus = buyerEvidenceValidation.status ?? 'missing';
const buyerEvidenceValidationReady = Boolean(buyerEvidenceValidation.summary?.ready_for_buyer_proof_gate)
  || buyerEvidenceValidationStatus === 'buyer_evidence_input_validation_passed_pending_owner_review';
const buyerEvidenceValidCompletedCallCount = Number(buyerEvidenceValidation.summary?.valid_completed_call_count ?? 0);
const buyerEvidenceValidOutcomeCaptureCount = Number(buyerEvidenceValidation.summary?.valid_outcome_capture_count ?? 0);
const buyerEvidenceValidQualifiedFollowupCount = Number(buyerEvidenceValidation.summary?.valid_qualified_followup_count ?? 0);
const buyerEvidenceValidCommitmentSignalCount = Number(buyerEvidenceValidation.summary?.valid_commitment_signal_count ?? 0);
const buyerEvidenceReleaseHoldCount = Number(
  buyerEvidenceValidation.summary?.active_release_hold_count
  ?? buyerEvidenceValidation.release_holds?.length
  ?? 0
);

const currentSourceAlignment = [
  {
    source: 'Y Combinator Essential Startup Advice',
    url: 'https://www.ycombinator.com/blog/ycs-essential-startup-advice/',
    alignment: 'First customers require direct customer understanding, manual work, and real usage signals before scaling.'
  },
  {
    source: 'Gartner GenAI for Procurement, 2025',
    url: 'https://www.gartner.com/en/newsroom/press-releases/2025-07-30-gartner-says-generative-ai-for-procurement-has-entered-the-trough-of-disillusionment',
    alignment: 'Enterprise AI pilots must address desired business outcomes, data quality, skepticism, and adoption resistance.'
  },
  {
    source: 'Gartner AI-enabled machine buyers, 2025',
    url: 'https://www.gartner.com/en/documents/7022998',
    alignment: 'Procurement-facing AI claims need explicit security, accuracy, and ethics evidence before broader automation or buying-system trust.'
  },
  {
    source: 'Tradeweb ICD Portal Client Survey 2026',
    url: 'https://www.tradeweb.com/newsroom/media-center/news-releases/geopolitical-risk-concerns-surge-for-corporate-treasurers-according-to-2026-tradeweb-icd-portal-client-survey/',
    alignment: 'Geopolitical risk is a live buyer concern, but concern must be converted into named workflow pain and willingness-to-pay proof.'
  },
  {
    source: 'McKinsey CFO geopolitical uncertainty survey, 2026',
    url: 'https://www.mckinsey.com.br/en/capabilities/strategy-and-corporate-finance/our-insights/cfos-have-been-concerned-about-geopolitical-impacts-for-months',
    alignment: 'CFO concern supports the wedge around monitoring and scenario planning, but does not replace buyer discovery.'
  }
];

const acceptanceGates = [
  {
    gate: 'target_slate_defined',
    required_evidence: 'At least 10 source-backed targets and one buyer-safe pilot offer packet.',
    current_status: selectedTargetCount >= 10 && pilotOfferPack.status === 'pilot_offer_pack_ready_not_buyer_proof'
      ? 'pass_readiness_only'
      : 'partial',
    allowed_claim: 'A source-backed target slate and pilot offer are ready for owner-approved discovery.',
    prohibited_claim: 'Buyer validation or willingness to pay has been proven.'
  },
  {
    gate: 'capture_schema_ready',
    required_evidence: 'CRM/call-sheet fields include role, proof shown, objection, next action, willingness-to-pay signal, pilot outcome capture, security/procurement blocker, accuracy blocker, and evidence quality.',
    current_status: callSheetRows.length > 0 && crmRows.length > 0 ? 'pass_readiness_only' : 'partial',
    allowed_claim: 'Buyer evidence capture is operationally ready.',
    prohibited_claim: 'Research rows, templates, or not-contacted rows are buyer evidence.'
  },
  {
    gate: 'buyer_evidence_input_validation',
    required_evidence: 'CRM and call-sheet rows pass schema, status, signal, completed-call, evidence-quality, and claim-boundary validation.',
    current_status: buyerEvidenceValidationReady ? 'ready_for_review' : 'blocked_input_validation_not_ready',
    allowed_claim: 'Buyer evidence input rows are ready for buyer proof-gate review.',
    prohibited_claim: 'Unvalidated buyer rows prove market pull.'
  },
  {
    gate: 'completed_discovery_loop',
    required_evidence: `${minimumCompletedCalls} completed discovery calls with required fields filled.`,
    current_status: completedRowsWithRequiredFields.length >= minimumCompletedCalls ? 'ready_for_review' : 'blocked_completed_calls_missing',
    allowed_claim: 'The completed call loop has been run on the named sample.',
    prohibited_claim: 'Desk research is enough to validate market pull.'
  },
  {
    gate: 'qualified_followup_signal',
    required_evidence: `${minimumQualifiedFollowups} qualified follow-ups with buyer role, proof shown, objection, and next action.`,
    current_status: qualifiedFollowupRows.length >= minimumQualifiedFollowups ? 'ready_for_review' : 'blocked_followups_missing',
    allowed_claim: 'Multiple prospects requested credible next steps.',
    prohibited_claim: 'Generic interest or curiosity-only replies prove demand.'
  },
  {
    gate: 'paid_pilot_loi_or_procurement_signal',
    required_evidence: `${minimumPaidOrLoi} paid-pilot, LOI, or procurement-path conversation.`,
    current_status: paidOrCommitmentRows.length >= minimumPaidOrLoi ? 'ready_for_review' : 'blocked_commitment_signal_missing',
    allowed_claim: 'At least one commitment path exists and can be reviewed.',
    prohibited_claim: 'Willingness to pay is proven without a commitment-path signal.'
  },
  {
    gate: 'objection_pattern_and_offer_decision',
    required_evidence: 'Completed calls produce repeated objection patterns and a decision to keep, narrow, or change the top niche offer.',
    current_status: completedRowsWithRequiredFields.length >= minimumCompletedCalls ? 'needs_synthesis' : 'blocked_real_objections_missing',
    allowed_claim: 'Buyer feedback has informed the next positioning decision.',
    prohibited_claim: 'A static offer packet is buyer-informed without recorded objections.'
  },
  {
    gate: 'public_claim_and_reference_boundary',
    required_evidence: 'Owner-approved external-shareable references, redacted buyer evidence, and buyer-safe claim language.',
    current_status: 'blocked_owner_approval_and_references_missing',
    allowed_claim: 'No external buyer reference claim is currently allowed.',
    prohibited_claim: 'Named buyer traction, referenceability, or public-sector validation.'
  }
];

const releaseHolds = [
  {
    hold: 'buyer_evidence_input_validation_not_passed',
    severity: 'P1',
    status: buyerEvidenceValidationReady ? 'ready_for_review' : 'active',
    evidence_needed: 'Buyer CRM/call-sheet input validation passes with completed calls, qualified follow-ups, commitment-path signals, and claim-boundary checks.'
  },
  {
    hold: 'completed_discovery_calls_missing',
    severity: 'P1',
    status: completedRowsWithRequiredFields.length >= minimumCompletedCalls ? 'ready_for_review' : 'active',
    evidence_needed: `${minimumCompletedCalls} completed calls with required buyer-evidence fields.`
  },
  {
    hold: 'pilot_outcome_capture_missing',
    severity: 'P1',
    status: buyerEvidenceValidOutcomeCaptureCount >= minimumCompletedCalls ? 'ready_for_review' : 'active',
    evidence_needed: `${minimumCompletedCalls} completed calls with baseline/current-workflow value, pilot outcome or expected delta, quality signal, buyer decision event, and outcome evidence notes.`
  },
  {
    hold: 'qualified_followups_missing',
    severity: 'P1',
    status: qualifiedFollowupRows.length >= minimumQualifiedFollowups ? 'ready_for_review' : 'active',
    evidence_needed: `${minimumQualifiedFollowups} qualified follow-ups beyond curiosity-only interest.`
  },
  {
    hold: 'paid_pilot_loi_or_procurement_signal_missing',
    severity: 'P1',
    status: paidOrCommitmentRows.length >= minimumPaidOrLoi ? 'ready_for_review' : 'active',
    evidence_needed: `${minimumPaidOrLoi} paid-pilot, LOI, or procurement-path signal.`
  },
  {
    hold: 'buyer_objection_pattern_missing',
    severity: 'P2',
    status: completedRowsWithRequiredFields.length >= minimumCompletedCalls ? 'ready_for_synthesis' : 'active',
    evidence_needed: 'Recorded objections and no-fit reasons from completed calls.'
  },
  {
    hold: 'buyer_reference_and_claim_language_not_approved',
    severity: 'P2',
    status: 'active',
    evidence_needed: 'Owner-approved redacted buyer evidence and external-shareable claim language.'
  }
];

const nextCommandsAfterBuyerData = [
  'Fill docs/launch-readiness/buyer-discovery-call-sheet-2026-06-06.csv after owner-approved calls.',
  'Fill docs/launch-readiness/buyer-validation-crm-template-2026-06-06.csv with completed buyer outcomes or redacted identifiers.',
  'npm run audit:buyer:validate-inputs -- --json-output docs/launch-readiness/buyer-evidence-input-validation-2026-06-06.json --md-output docs/launch-readiness/buyer-evidence-input-validation-2026-06-06.md --csv-output docs/launch-readiness/buyer-evidence-input-validation-checklist-2026-06-06.csv',
  'npm run audit:buyer:proof-gate -- --json-output docs/launch-readiness/buyer-proof-gate-2026-06-06.json --md-output docs/launch-readiness/buyer-proof-gate-2026-06-06.md --csv-output docs/launch-readiness/buyer-proof-gate-checklist-2026-06-06.csv',
  'npm run audit:commercial:confidence -- --json-output docs/launch-readiness/commercial-confidence-gate-2026-06-06.json --md-output docs/launch-readiness/commercial-confidence-gate-2026-06-06.md'
];

const proofGate = {
  schema_version: 'buyer-proof-gate-v1',
  generated_at: new Date().toISOString(),
  status: 'buyer_proof_gate_ready_not_buyer_validation',
  source: {
    buyer_validation_targets: inputPaths.buyerTargets,
    buyer_discovery_kit: inputPaths.buyerDiscoveryKit,
    buyer_validation_crm: inputPaths.buyerCrm,
    buyer_discovery_call_sheet: inputPaths.buyerCallSheet,
    buyer_evidence_validation: inputPaths.buyerEvidenceValidation,
    buyer_evidence_validation_status: buyerEvidenceValidationStatus,
    pilot_offer_pack: inputPaths.pilotOfferPack,
    enterprise_trust_pack: inputPaths.enterpriseTrustPack,
    forecast_claim_governance: inputPaths.forecastClaimGovernance,
    commercial_confidence_gate: inputPaths.confidenceGate,
    buyer_dimension_status: buyerDimension.status ?? 'unknown',
    buyer_dimension_score_percent: Number(buyerDimension.current_score_percent ?? 0)
  },
  proof_boundary: {
    proves: [
      'Buyer-validation acceptance thresholds and release holds are explicit.',
      'Target slate, discovery scripts, and capture fields are ready for owner-approved outreach.',
      'Research/template/not-contacted rows are excluded from buyer proof.'
    ],
    does_not_prove: [
      'Completed buyer discovery.',
      'Willingness to pay.',
      'LOI, paid-pilot, procurement-path, or referenceable buyer evidence.',
      'Hosted operational proof, enterprise-security proof, or prediction-accuracy proof.'
    ]
  },
  summary: {
    named_target_count: namedTargetCount,
    selected_target_count: selectedTargetCount,
    crm_row_count: crmRows.length,
    call_sheet_row_count: callSheetRows.length,
    research_or_template_row_count: researchOnlyRows.length,
    contacted_or_replied_row_count: contactedRows.length,
    completed_call_count: completedRows.length,
    completed_call_with_required_fields_count: completedRowsWithRequiredFields.length,
    valid_completed_call_count_after_input_validation: buyerEvidenceValidCompletedCallCount,
    valid_outcome_capture_count_after_input_validation: buyerEvidenceValidOutcomeCaptureCount,
    qualified_followup_count: qualifiedFollowupRows.length,
    valid_qualified_followup_count_after_input_validation: buyerEvidenceValidQualifiedFollowupCount,
    paid_pilot_loi_or_procurement_signal_count: paidOrCommitmentRows.length,
    valid_commitment_signal_count_after_input_validation: buyerEvidenceValidCommitmentSignalCount,
    rejected_or_disqualified_count: rejectedRows.length,
    security_or_procurement_blocker_count: securityBlockerRows.length,
    accuracy_or_benchmark_blocker_count: accuracyBlockerRows.length,
    buyer_evidence_validation_release_hold_count: buyerEvidenceReleaseHoldCount,
    buyer_evidence_ready_for_proof_gate: buyerEvidenceValidationReady,
    release_hold_count: releaseHolds.filter((hold) => hold.status === 'active').length,
    buyer_validation_score_percent: Number(buyerDimension.current_score_percent ?? 0),
    buyer_validation_verified: false
  },
  current_source_alignment: currentSourceAlignment,
  acceptance_gates: acceptanceGates,
  release_holds: releaseHolds,
  required_owner_inputs: [
    'Approve or edit the 10-target discovery slate before any outreach.',
    'Approve the pilot offer language and no-world-class-prediction boundary.',
    'Run or authorize discovery calls; store real outcomes or redacted identifiers.',
    'Mark each buyer signal as none, curiosity-only, qualified follow-up, paid-pilot discussion, LOI discussion, or procurement path.',
    'Approve what buyer evidence can be shared externally.'
  ],
  next_commands_after_buyer_data: nextCommandsAfterBuyerData,
  checklist: acceptanceGates.map((gate) => ({
    gate: gate.gate,
    required_evidence: gate.required_evidence,
    current_status: gate.current_status,
    allowed_claim: gate.allowed_claim,
    prohibited_claim: gate.prohibited_claim
  }))
};

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

function renderMarkdown(report) {
  const gateRows = report.acceptance_gates
    .map((gate) => [
      mdCell(gate.gate),
      mdCell(gate.current_status),
      mdCell(gate.allowed_claim),
      mdCell(gate.prohibited_claim)
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

  return `# Buyer Proof Gate - 2026-06-06

## Decision

Status: \`${report.status}\`.

This artifact makes buyer-validation proof rules explicit. It does not prove completed discovery, willingness to pay, LOI, paid-pilot, procurement-path, or referenceable buyer evidence.

Current buyer-validation proof score remains **${report.summary.buyer_validation_score_percent}%**. Completed calls with required fields: **${report.summary.completed_call_with_required_fields_count}**. Valid outcome-capture rows: **${report.summary.valid_outcome_capture_count_after_input_validation}**. Qualified follow-ups: **${report.summary.qualified_followup_count}**. Paid-pilot/LOI/procurement signals: **${report.summary.paid_pilot_loi_or_procurement_signal_count}**.

Buyer evidence validation status: **${report.source.buyer_evidence_validation_status}** with **${report.summary.valid_completed_call_count_after_input_validation}** valid completed calls, **${report.summary.valid_outcome_capture_count_after_input_validation}** valid outcome-capture rows, **${report.summary.valid_qualified_followup_count_after_input_validation}** valid qualified follow-ups, **${report.summary.valid_commitment_signal_count_after_input_validation}** valid commitment-path signals, and ready-for-proof-gate **${report.summary.buyer_evidence_ready_for_proof_gate}**.

Allowed current claim: **A source-backed target slate, discovery kit, and buyer-evidence capture gate are ready for owner-approved discovery.**

Prohibited current claim: **Buyer-validated willingness to pay.**

## Acceptance Gates

| Gate | Current Status | Allowed Claim | Prohibited Claim |
|---|---|---|---|
${gateRows}

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

## Next Commands After Buyer Data

${report.next_commands_after_buyer_data.map((command, index) => `${index + 1}. \`${command}\``).join('\n')}

## Proof Boundary

This is an internal buyer-validation gate and release-hold artifact. It is useful for first-sale discipline, but it is not buyer proof until real completed interactions, objections, follow-ups, and commitment-path signals are attached.
`;
}

if (outputPaths.json) {
  writeArtifact(outputPaths.json, `${JSON.stringify(proofGate, null, 2)}\n`);
}

if (outputPaths.md) {
  writeArtifact(outputPaths.md, renderMarkdown(proofGate));
}

if (outputPaths.csv) {
  writeArtifact(outputPaths.csv, renderCsv(proofGate));
}

console.log(JSON.stringify({
  json_output: outputPaths.json,
  md_output: outputPaths.md,
  csv_output: outputPaths.csv,
  status: proofGate.status,
  completed_call_with_required_fields_count: proofGate.summary.completed_call_with_required_fields_count,
  qualified_followup_count: proofGate.summary.qualified_followup_count,
  paid_pilot_loi_or_procurement_signal_count: proofGate.summary.paid_pilot_loi_or_procurement_signal_count,
  release_hold_count: proofGate.summary.release_hold_count
}, null, 2));
