#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const ROOT = process.cwd();

const DEFAULT_CONFIDENCE_GATE = 'docs/launch-readiness/commercial-confidence-gate-2026-06-06.json';
const DEFAULT_COMPLETION_AUDIT = 'docs/launch-readiness/commercial-goal-completion-audit-2026-06-06.json';
const DEFAULT_LOOPHOLE_AUDIT = 'docs/launch-readiness/commercial-loophole-remediation-2026-06-06.json';
const DEFAULT_BUYER_EXECUTION = 'docs/launch-readiness/buyer-validation-execution-readiness-2026-06-06.json';
const DEFAULT_BUYER_SUBSTITUTION = 'docs/launch-readiness/buyer-substitution-evidence-validation-2026-06-06.json';
const DEFAULT_FORECAST_EXECUTION = 'docs/launch-readiness/forecast-evaluation-execution-readiness-2026-06-06.json';
const DEFAULT_ENTERPRISE_EXECUTION = 'docs/launch-readiness/enterprise-trust-execution-readiness-2026-06-06.json';
const DEFAULT_HOSTED_EXECUTION = 'docs/launch-readiness/hosted-smoke-execution-readiness-2026-06-06.json';
const DEFAULT_OWNER_APPROVAL_VALIDATION = 'docs/launch-readiness/owner-approval-register-validation-2026-06-06.json';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/owner-unblock-execution-packet-2026-06-06.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/owner-unblock-execution-packet-2026-06-06.md';
const DEFAULT_CSV_OUTPUT = 'docs/launch-readiness/owner-unblock-execution-checklist-2026-06-06.csv';

function argValue(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function usage() {
  console.error([
    'Usage: node scripts/build-owner-unblock-execution-packet.mjs',
    `  [--confidence-gate ${DEFAULT_CONFIDENCE_GATE}]`,
    `  [--completion-audit ${DEFAULT_COMPLETION_AUDIT}]`,
    `  [--loophole-audit ${DEFAULT_LOOPHOLE_AUDIT}]`,
    `  [--owner-approval-validation ${DEFAULT_OWNER_APPROVAL_VALIDATION}]`,
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
  confidenceGate: argValue('--confidence-gate', DEFAULT_CONFIDENCE_GATE),
  completionAudit: argValue('--completion-audit', DEFAULT_COMPLETION_AUDIT),
  loopholeAudit: argValue('--loophole-audit', DEFAULT_LOOPHOLE_AUDIT),
  buyerExecution: argValue('--buyer-execution', DEFAULT_BUYER_EXECUTION),
  buyerSubstitution: argValue('--buyer-substitution', DEFAULT_BUYER_SUBSTITUTION),
  forecastExecution: argValue('--forecast-execution', DEFAULT_FORECAST_EXECUTION),
  enterpriseExecution: argValue('--enterprise-execution', DEFAULT_ENTERPRISE_EXECUTION),
  hostedExecution: argValue('--hosted-execution', DEFAULT_HOSTED_EXECUTION),
  ownerApprovalValidation: argValue('--owner-approval-validation', DEFAULT_OWNER_APPROVAL_VALIDATION)
};

const outputPaths = {
  json: argValue('--json-output', DEFAULT_JSON_OUTPUT),
  md: argValue('--md-output', DEFAULT_MD_OUTPUT),
  csv: argValue('--csv-output', DEFAULT_CSV_OUTPUT)
};

function resolveRepoPath(relativePath) {
  return path.isAbsolute(relativePath) ? relativePath : path.join(ROOT, relativePath);
}

function readJsonIfExists(relativePath, fallback = {}) {
  const absolutePath = resolveRepoPath(relativePath);
  return existsSync(absolutePath) ? JSON.parse(readFileSync(absolutePath, 'utf8')) : fallback;
}

function writeArtifact(relativePath, contents) {
  if (!relativePath) return;
  const absolutePath = resolveRepoPath(relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, contents);
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csvLine(values) {
  return values.map(csvCell).join(',');
}

function mdCell(value) {
  return String(value ?? '').replaceAll('|', '/').replace(/\s+/g, ' ').trim();
}

function primaryBlocker(confidenceGate, id) {
  return (confidenceGate.primary_blockers ?? []).find((blocker) => blocker.id === id) ?? {};
}

function command(command) {
  return `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH ${command}`;
}

const confidenceGate = readJsonIfExists(inputPaths.confidenceGate, { posture: {}, primary_blockers: [] });
const completionAudit = readJsonIfExists(inputPaths.completionAudit, { summary: {}, requirement_audit: [] });
const loopholeAudit = readJsonIfExists(inputPaths.loopholeAudit, { summary: {}, remediation_loop: [] });
const buyerExecution = readJsonIfExists(inputPaths.buyerExecution, { status: 'missing', summary: {} });
const buyerSubstitution = readJsonIfExists(inputPaths.buyerSubstitution, { status: 'missing', summary: {} });
const forecastExecution = readJsonIfExists(inputPaths.forecastExecution, { status: 'missing', summary: {} });
const enterpriseExecution = readJsonIfExists(inputPaths.enterpriseExecution, { status: 'missing', summary: {}, release_holds: [] });
const hostedExecution = readJsonIfExists(inputPaths.hostedExecution, { status: 'missing', summary: {}, release_holds: [] });
const ownerApprovalValidation = readJsonIfExists(inputPaths.ownerApprovalValidation, {
  status: 'missing',
  summary: {},
  acceptance_gates: []
});

const posture = confidenceGate.posture ?? {};
const completionSummary = completionAudit.summary ?? {};
const loopholeSummary = loopholeAudit.summary ?? {};
const ownerApprovalSummary = ownerApprovalValidation.summary ?? {};
const ownerApprovalGate = {
  status: ownerApprovalValidation.status ?? 'missing',
  required_approval_count: Number(ownerApprovalSummary.required_approval_count ?? 0),
  owner_approved_count: Number(ownerApprovalSummary.owner_approved_count ?? 0),
  reviewed_count: Number(ownerApprovalSummary.reviewed_count ?? 0),
  row_error_count: Number(ownerApprovalSummary.row_error_count ?? 0),
  row_warning_count: Number(ownerApprovalSummary.row_warning_count ?? 0),
  claim_boundary_acknowledged_count: Number(ownerApprovalSummary.claim_boundary_acknowledged_count ?? 0),
  ready_for_downstream_evidence: Boolean(ownerApprovalSummary.all_required_approvals_ready_for_downstream_evidence),
  commercial_ready_claim_allowed: Boolean(ownerApprovalSummary.commercial_ready_claim_allowed),
  world_class_prediction_claim_allowed: Boolean(ownerApprovalSummary.world_class_prediction_claim_allowed),
  hosted_live_claim_allowed: Boolean(ownerApprovalSummary.hosted_live_claim_allowed),
  buyer_validated_claim_allowed: Boolean(ownerApprovalSummary.buyer_validated_claim_allowed),
  enterprise_ready_claim_allowed: Boolean(ownerApprovalSummary.enterprise_ready_claim_allowed)
};

const lanes = [
  {
    rank: 1,
    lane: 'prediction_accuracy',
    blocker_id: 'prediction_accuracy_proof',
    proof_bucket: 'owner_input',
    current_status: forecastExecution.status ?? 'missing',
    current_score_percent: primaryBlocker(confidenceGate, 'prediction_accuracy_proof').current_score_percent ?? 0,
    target_unlock: 'Validated resolved forecasts, comparable baselines, leakage review, scoring, and claim wording before any accuracy or world-class prediction claim.',
    owner_inputs_required: [
      'Fill docs/launch-readiness/approved-resolved-forecast-export-template-2026-06-06.csv with owner-approved resolved forecasts.',
      'Fill docs/launch-readiness/forecast-baseline-template-2026-06-06.csv with comparable human/community/pro/external baselines.',
      'Complete forecast leakage register fields for timestamps, source cutoffs, training/evaluation overlap, and ambiguous outcomes.',
      'Approve claim tier and external wording after scoring output is reviewed.'
    ],
    minimum_threshold: 'At least one valid resolved forecast and one valid comparable baseline are needed to move from no-real-outcomes; stronger commercial claims need enough rows for calibration reliability.',
    current_evidence: `valid_resolved_forecasts=${forecastExecution.summary?.valid_resolved_forecast_count ?? 0}; valid_baselines=${forecastExecution.summary?.valid_baseline_count ?? 0}; scoring_chain_ready=${Boolean(forecastExecution.summary?.scoring_chain_ready_for_owner_claim_review)}.`,
    after_owner_input_commands: [
      command('npm run audit:accuracy:validate-inputs -- --update-evidence'),
      command('npm run audit:forecast:leakage-review -- --update-evidence'),
      command('npm run audit:calibration:ledger'),
      command('npm run audit:forecast:benchmark'),
      command('npm run audit:forecast:validate-scoring -- --update-evidence'),
      command('npm run audit:forecast:validate-science -- --update-evidence'),
      command('npm run audit:forecast:execution-readiness -- --update-evidence')
    ],
    claim_boundary: 'Until these commands pass on real owner-approved rows, only calibration-aware mechanics and evaluation-readiness claims are allowed.'
  },
  {
    rank: 2,
    lane: 'buyer_validation',
    blocker_id: 'buyer_validation',
    proof_bucket: 'owner_input',
    current_status: buyerExecution.status ?? 'missing',
    current_score_percent: primaryBlocker(confidenceGate, 'buyer_validation').current_score_percent ?? 0,
    target_unlock: 'Real buyer demand, willingness-to-pay, substitution pressure, and procurement path evidence.',
    owner_inputs_required: [
      'Run the 10-call discovery slate from docs/launch-readiness/buyer-discovery-kit-2026-06-06.json.',
      'Approve the buyer outcome-capture protocol from docs/launch-readiness/pilot-outcome-measurement-kit-2026-06-06.json before counting any call as sellability evidence.',
      'Record every interaction in docs/launch-readiness/buyer-discovery-call-sheet-2026-06-06.csv and docs/launch-readiness/buyer-validation-crm-template-2026-06-06.csv.',
      'Fill baseline/current workflow, pilot outcome or expected delta, quality signal, buyer decision event, and outcome evidence notes for completed calls.',
      'Fill docs/launch-readiness/buyer-substitution-test-sheet-2026-06-06.csv with current-tool, switching-barrier, must-have-proof, and commitment outcome fields.',
      'Mark any paid-pilot, LOI, or procurement-path signal explicitly and keep external-share wording pilot-only until proof gates pass.'
    ],
    minimum_threshold: '10 completed calls with outcome-capture rows, at least three qualified follow-ups, and at least one paid-pilot, LOI, or procurement-path signal.',
    current_evidence: `completed_calls=${buyerExecution.summary?.completed_call_count ?? 0}; valid_outcome_capture_rows=${buyerExecution.summary?.valid_outcome_capture_count_after_input_validation ?? 0}; qualified_followups=${buyerExecution.summary?.qualified_followup_count ?? 0}; commitment_signals=${buyerExecution.summary?.paid_pilot_loi_or_procurement_signal_count ?? 0}; substitution_calls=${buyerSubstitution.summary?.valid_completed_substitution_call_count ?? 0}.`,
    after_owner_input_commands: [
      command('npm run audit:buyer:validate-inputs -- --update-evidence'),
      command('npm run audit:buyer:validate-substitution-evidence -- --update-evidence'),
      command('npm run audit:buyer:proof-gate'),
      command('npm run audit:buyer:execution-readiness -- --update-evidence')
    ],
    claim_boundary: 'Target lists and call templates remain non-proof; buyer-validated and replacement/parity claims stay blocked until real rows pass.'
  },
  {
    rank: 3,
    lane: 'enterprise_security_trust',
    blocker_id: 'enterprise_security_trust',
    proof_bucket: 'owner_input_and_hosted_live',
    current_status: enterpriseExecution.status ?? 'missing',
    current_score_percent: primaryBlocker(confidenceGate, 'enterprise_security_trust').current_score_percent ?? 0,
    target_unlock: 'Owner-approved procurement documents, RLS proof, hosted LLM/security proof, and approved AI action boundaries.',
    owner_inputs_required: [
      'Fill and owner-approve all rows in docs/launch-readiness/enterprise-procurement-evidence-register-2026-06-06.csv.',
      'Approve RLS classifications and docs/launch-readiness/rls-identity-and-review-policy-draft-2026-06-06.sql before any migration work.',
      'Execute local and linked RLS proof rows in docs/launch-readiness/rls-proof-evidence-register-2026-06-06.csv with redacted logs.',
      'Approve docs/launch-readiness/ai-high-impact-action-policy-2026-06-06.json and run hosted no-autonomous-action boundary tests.',
      'Run hosted LLM red-team smoke only after hosted access and deploy binding are approved.'
    ],
    minimum_threshold: '8/8 procurement documents ready, 54/54 RLS proof rows executed and passed across local/linked environments, owner-approved AI action policy, and hosted runtime proof.',
    current_evidence: `procurement_docs=${enterpriseExecution.summary?.procurement_ready_document_count ?? 0}/${enterpriseExecution.summary?.procurement_required_document_count ?? 8}; rls_rows=${enterpriseExecution.summary?.rls_executed_row_count ?? 0}/${enterpriseExecution.summary?.rls_expected_case_environment_row_count ?? 0}; local_llm_red_team=${Boolean(enterpriseExecution.summary?.local_llm_red_team_passed)}; hosted_access=${Boolean(enterpriseExecution.summary?.hosted_access_ready_for_smoke)}.`,
    after_owner_input_commands: [
      command('npm run audit:enterprise:validate-evidence -- --update-evidence'),
      command('npm run audit:rls:validate-proof -- --update-evidence'),
      command('npm run audit:llm:security'),
      command('npm run audit:enterprise:procurement-gate'),
      command('npm run audit:enterprise:execution-readiness -- --update-evidence')
    ],
    claim_boundary: 'Enterprise-ready, tenant-isolation, certified, and public-sector security claims remain blocked until proof validators pass.'
  },
  {
    rank: 4,
    lane: 'hosted_operational_proof',
    blocker_id: 'hosted_operational_proof',
    proof_bucket: 'hosted_live',
    current_status: hostedExecution.status ?? 'missing',
    current_score_percent: primaryBlocker(confidenceGate, 'hosted_operational_proof').current_score_percent ?? 0,
    target_unlock: 'Hosted deploy binding, management access, payment proof values, executed smoke rows, redacted logs, and screenshots where relevant.',
    owner_inputs_required: [
      'Grant or switch to an account where the intended Supabase project ref is visible.',
      'Make project-scoped functions and secrets list commands succeed without printing secret values.',
      'Provide owner-approved hosted URL plus deploy id, release id, or commit SHA.',
      'Provide Stripe proof key names/values for test-mode proof without exposing secrets in artifacts.',
      'Run the 12 hosted smoke commands from docs/launch-readiness/hosted-operational-proof-kit-2026-06-06.json and fill docs/launch-readiness/hosted-operational-proof-evidence-template-2026-06-06.csv.'
    ],
    minimum_threshold: '12/12 expected hosted smoke rows executed, core coverage 7/7, redaction verified, logs/screenshots attached where relevant, and hosted validator passes.',
    current_evidence: `owner_unblock_ready=${Boolean(hostedExecution.summary?.owner_unblock_ready)}; target_project_visible=${Boolean(hostedExecution.summary?.target_project_visible)}; management_access_ready=${Boolean(hostedExecution.summary?.management_access_ready)}; executed_smokes=${hostedExecution.summary?.executed_smoke_count ?? 0}/${hostedExecution.summary?.expected_smoke_count ?? 12}; core_coverage=${hostedExecution.summary?.core_coverage_ready_count ?? 0}/${hostedExecution.summary?.core_coverage_group_count ?? 7}.`,
    after_owner_input_commands: [
      command('npm run audit:hosted:access-preflight -- --update-evidence'),
      command('npm run audit:hosted:validate-evidence -- --update-evidence'),
      command('npm run audit:hosted:smoke-execution-readiness -- --update-evidence')
    ],
    claim_boundary: 'Local route proof and smoke scripts cannot be upgraded to hosted-live proof without executed hosted evidence rows.'
  }
];

const crossLaneCommands = [
  command('npm run audit:owner:approval-register -- --update-evidence'),
  command('npm run audit:commercial:confidence'),
  command('npm run audit:commercial:goal-completion -- --update-evidence'),
  command('npm run audit:commercial:loopholes'),
  command('npm run audit:claims:consistency'),
  'python3 /Users/sanjayb/.codex/skills/commercial-launch-readiness-orchestrator/scripts/validate_launch_evidence.py docs/launch-readiness/launch-evidence-2026-06-06.json'
];

const report = {
  schema_version: 'owner-unblock-execution-packet-v1',
  generated_at: new Date().toISOString(),
  status: 'owner_unblock_execution_packet_ready_not_proof',
  proof_boundary: 'This packet consolidates owner/external actions needed to move the commercial readiness gates. It is not buyer validation, hosted proof, enterprise approval, RLS proof, prediction-accuracy proof, or commercial-ready evidence.',
  source: {
    confidence_gate: inputPaths.confidenceGate,
    completion_audit: inputPaths.completionAudit,
    loophole_audit: inputPaths.loopholeAudit,
    buyer_execution: inputPaths.buyerExecution,
    buyer_substitution: inputPaths.buyerSubstitution,
    forecast_execution: inputPaths.forecastExecution,
    enterprise_execution: inputPaths.enterpriseExecution,
    hosted_execution: inputPaths.hostedExecution,
    owner_approval_validation: inputPaths.ownerApprovalValidation
  },
  summary: {
    launch_decision: posture.launch_decision ?? 'unknown',
    pilot_strategy_confidence_percent: Number(posture.pilot_strategy_confidence_percent ?? 0),
    commercial_world_class_confidence_percent: Number(posture.commercial_world_class_confidence_percent ?? 0),
    target_confidence_percent: Number(posture.target_confidence_percent ?? 95),
    confidence_gap_percent: Number(posture.confidence_gap_percent ?? 0),
    completion_ready: Boolean(completionSummary.completion_ready),
    open_loophole_count: Number(loopholeSummary.open_loophole_count ?? 0),
    p0_open_count: Number(loopholeSummary.p0_open_count ?? 0),
    owner_gated_open_count: Number(loopholeSummary.owner_gated_open_count ?? 0),
    repo_actionable_open_count: Number(loopholeSummary.repo_actionable_open_count ?? 0),
    lane_count: lanes.length,
    hosted_proof_count: Number(completionSummary.hosted_proof_count ?? 0),
    owner_approval_validation_status: ownerApprovalGate.status,
    owner_approval_required_count: ownerApprovalGate.required_approval_count,
    owner_approval_approved_count: ownerApprovalGate.owner_approved_count,
    owner_approval_ready_for_downstream_evidence: ownerApprovalGate.ready_for_downstream_evidence,
    current_allowed_market_language: posture.recommended_market_language ?? 'governed strategic-intelligence pilot with calibration-aware decision support',
    prohibited_market_language: posture.prohibited_market_language ?? 'world-class accurate predictions'
  },
  owner_approval_gate: ownerApprovalGate,
  execution_order: lanes.map((lane) => lane.lane),
  unblock_lanes: lanes,
  cross_lane_commands_after_any_owner_update: crossLaneCommands,
  stop_rules: [
    'Do not run production deploys, credential rotation, payment changes, outreach, destructive migrations, or secret-dependent tests without explicit owner approval.',
    'Do not upgrade beyond pilot-only until the relevant validator artifacts pass on real owner/buyer/hosted evidence.',
    'Do not use world-class, commercial-ready, buyer-validated, enterprise-ready, hosted-live, or proven-accuracy language unless the commercial completion audit proves it.'
  ]
};

function renderMarkdown(packet) {
  const laneRows = packet.unblock_lanes
    .map((lane) => `| ${[
      lane.rank,
      lane.lane,
      lane.current_score_percent,
      lane.current_status,
      lane.minimum_threshold,
      lane.current_evidence
    ].map(mdCell).join(' | ')} |`)
    .join('\n');

  const laneSections = packet.unblock_lanes.map((lane) => {
    const inputs = lane.owner_inputs_required.map((item) => `- ${item}`).join('\n');
    const commands = lane.after_owner_input_commands.map((item) => `- \`${item}\``).join('\n');
    return `## ${lane.rank}. ${lane.lane}

Target unlock: ${lane.target_unlock}

Current evidence: ${lane.current_evidence}

Minimum threshold: ${lane.minimum_threshold}

Owner inputs required:
${inputs}

Commands after owner input:
${commands}

Claim boundary: ${lane.claim_boundary}`;
  }).join('\n\n');

  const crossLane = packet.cross_lane_commands_after_any_owner_update.map((item) => `- \`${item}\``).join('\n');
  const stopRules = packet.stop_rules.map((item) => `- ${item}`).join('\n');

  return `# Owner Unblock Execution Packet - 2026-06-06

Status: \`${packet.status}\`.

This packet is an execution contract for missing owner/external evidence. It is not proof that the missing evidence exists.

## Current Decision

| Metric | Value |
|---|---:|
| Launch decision | ${packet.summary.launch_decision} |
| Pilot confidence | ${packet.summary.pilot_strategy_confidence_percent}% |
| World-class confidence | ${packet.summary.commercial_world_class_confidence_percent}% |
| Target confidence | ${packet.summary.target_confidence_percent}% |
| Confidence gap | ${packet.summary.confidence_gap_percent}% |
| P0 open loopholes | ${packet.summary.p0_open_count} |
| Owner-gated open loopholes | ${packet.summary.owner_gated_open_count} |

Allowed market language: ${packet.summary.current_allowed_market_language}

Prohibited market language: ${packet.summary.prohibited_market_language}

## Consolidated Owner Approval Gate

Status: \`${packet.owner_approval_gate.status}\`.

Owner-approved rows: **${packet.owner_approval_gate.owner_approved_count}/${packet.owner_approval_gate.required_approval_count}**.

Reviewed rows: **${packet.owner_approval_gate.reviewed_count}/${packet.owner_approval_gate.required_approval_count}**.

Claim-boundary acknowledgements: **${packet.owner_approval_gate.claim_boundary_acknowledged_count}/${packet.owner_approval_gate.required_approval_count}**.

Ready for downstream evidence: **${packet.owner_approval_gate.ready_for_downstream_evidence}**.

Allowed claim upgrades: commercial-ready=${packet.owner_approval_gate.commercial_ready_claim_allowed}, world-class prediction=${packet.owner_approval_gate.world_class_prediction_claim_allowed}, hosted-live=${packet.owner_approval_gate.hosted_live_claim_allowed}, buyer-validated=${packet.owner_approval_gate.buyer_validated_claim_allowed}, enterprise-ready=${packet.owner_approval_gate.enterprise_ready_claim_allowed}.

## Lane Order

| Rank | Lane | Current Score | Current Status | Minimum Threshold | Current Evidence |
|---:|---|---:|---|---|---|
${laneRows}

${laneSections}

## Cross-Lane Commands

Run these after any owner evidence update:

${crossLane}

## Stop Rules

${stopRules}
`;
}

function renderCsv(packet) {
  return [
    csvLine(['rank', 'lane', 'blocker_id', 'proof_bucket', 'current_score_percent', 'current_status', 'minimum_threshold', 'current_evidence', 'claim_boundary']),
    ...packet.unblock_lanes.map((lane) => csvLine([
      lane.rank,
      lane.lane,
      lane.blocker_id,
      lane.proof_bucket,
      lane.current_score_percent,
      lane.current_status,
      lane.minimum_threshold,
      lane.current_evidence,
      lane.claim_boundary
    ]))
  ].join('\n') + '\n';
}

writeArtifact(outputPaths.json, JSON.stringify(report, null, 2) + '\n');
writeArtifact(outputPaths.md, renderMarkdown(report));
writeArtifact(outputPaths.csv, renderCsv(report));

console.log(JSON.stringify({
  json_output: outputPaths.json,
  md_output: outputPaths.md,
  csv_output: outputPaths.csv,
  status: report.status,
  launch_decision: report.summary.launch_decision,
  commercial_world_class_confidence_percent: report.summary.commercial_world_class_confidence_percent,
  confidence_gap_percent: report.summary.confidence_gap_percent,
  lane_count: report.summary.lane_count,
  owner_gated_open_count: report.summary.owner_gated_open_count,
  repo_actionable_open_count: report.summary.repo_actionable_open_count
}, null, 2));
