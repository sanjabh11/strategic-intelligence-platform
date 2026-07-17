#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const ROOT = process.cwd();

const DEFAULT_INVENTORY = 'docs/launch-readiness/ai-action-inventory-2026-06-06.json';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/ai-high-impact-action-policy-2026-06-06.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/ai-high-impact-action-policy-2026-06-06.md';
const DEFAULT_CSV_OUTPUT = 'docs/launch-readiness/ai-high-impact-action-boundary-tests-2026-06-06.csv';

function argValue(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function usage() {
  console.error([
    'Usage: node scripts/build-ai-action-policy.mjs',
    `  [--inventory ${DEFAULT_INVENTORY}]`,
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
  inventory: argValue('--inventory', DEFAULT_INVENTORY)
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

function readJson(relativePath) {
  const absolutePath = resolveRepoPath(relativePath);
  if (!existsSync(absolutePath)) {
    console.error(`Missing required JSON artifact: ${relativePath}`);
    process.exit(2);
  }
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

const inventory = readJson(inputPaths.inventory);
const actionSurfaces = Array.isArray(inventory.action_surfaces) ? inventory.action_surfaces : [];
const surfaceById = new Map(actionSurfaces.map((surface) => [surface.id, surface]));

const currentSourceAlignment = [
  {
    framework: 'OWASP LLM06:2025 Excessive Agency',
    source_url: 'https://genai.owasp.org/llmrisk/llm062025-excessive-agency/',
    policy_implication: 'Keep LLM tools minimal, avoid open-ended tools, apply least privilege, execute in user context, require human approval for high-impact actions, and mediate authorization outside the model.'
  },
  {
    framework: 'NIST AI RMF Generative AI Profile',
    source_url: 'https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf',
    policy_implication: 'Make action risk part of govern, map, measure, and manage controls before public-sector AI trust claims.'
  },
  {
    framework: 'CISA Secure by Design and Secure by Demand',
    source_url: 'https://www.cisa.gov/sites/default/files/2024-08/SecureByDemandGuide_080624_508c.pdf',
    policy_implication: 'Convert action safety into purchaser-reviewable questions, owner decisions, transparent boundaries, and repeatable verification evidence.'
  },
  {
    framework: 'NIST SSDF SP 800-218',
    source_url: 'https://csrc.nist.gov/pubs/sp/800/218/final',
    policy_implication: 'Treat action-boundary tests as secure-development verification evidence for buyers and software consumers.'
  }
];

const policyProfiles = {
  analyze_engine_service_role_persistence: {
    required_context: ['server_route_context', 'service_role_key_operator_boundary', 'request_id_or_analysis_run_id', 'audit_log'],
    forbidden_context: ['model_selected_database_write', 'anonymous_direct_write', 'unbounded_table_mutation'],
    approval_required: true,
    allowed_claim: 'Service-role writes are mapped and must remain server-mediated.',
    owner_decision_needed: 'Approve whether analyze-engine service-role writes need a centralized action allowlist before hosted pilots.',
    hosted_test_status: 'not_tested',
    local_assertion: 'static_inventory_found_service_role_persistence_and_no_direct_llm_irreversible_action'
  },
  analyze_engine_function_fanout: {
    required_context: ['fixed_function_allowlist', 'server_route_context', 'request_id_or_analysis_run_id', 'timeout_and_error_logging'],
    forbidden_context: ['model_supplied_function_url', 'open_ended_fetch_tool', 'unapproved_post_synthesis_fanout'],
    approval_required: true,
    allowed_claim: 'Post-analysis fanout is source-visible and should be allowlisted before public-sector AI claims.',
    owner_decision_needed: 'Approve the allowed post-analysis fanout list and decide whether any fanout must require explicit user confirmation.',
    hosted_test_status: 'not_tested',
    local_assertion: 'static_inventory_found_known_function_fanout'
  },
  forecast_publication: {
    required_context: ['authenticated_user', 'analysis_owner_match', 'publish_governance_can_publish', 'forecast_row_auditability'],
    forbidden_context: ['anonymous_publication', 'unowned_linked_analysis', 'rejected_or_unreviewed_publication'],
    approval_required: true,
    allowed_claim: 'Public forecast creation has static auth, ownership, and governance gates.',
    owner_decision_needed: 'Approve hosted negative tests for unowned, rejected, unreviewed, and contested linked analyses.',
    hosted_test_status: 'not_tested',
    local_assertion: 'static_inventory_found_forecast_publication_gates'
  },
  human_review_request: {
    required_context: ['authenticated_user', 'analysis_owner_or_reviewer', 'review_state_auditability'],
    forbidden_context: ['anonymous_review_request', 'unrelated_user_review_request'],
    approval_required: false,
    allowed_claim: 'Review-request transitions are statically owner/reviewer gated.',
    owner_decision_needed: 'Approve hosted reviewer/owner/unrelated-user boundary tests.',
    hosted_test_status: 'not_tested',
    local_assertion: 'static_inventory_found_review_request_gates'
  },
  human_review_approve_reject: {
    required_context: ['authenticated_reviewer', 'analysis_status_under_review', 'review_record_insert', 'reviewer_audit_trail'],
    forbidden_context: ['ai_reviewer_decision', 'non_reviewer_decision', 'decision_on_non_pending_analysis'],
    approval_required: true,
    allowed_claim: 'Approve/reject is human reviewer gated in source.',
    owner_decision_needed: 'Approve hosted role-boundary tests before no-autonomous-review claims.',
    hosted_test_status: 'not_tested',
    local_assertion: 'static_inventory_found_human_review_decision_gates'
  },
  stripe_checkout_session: {
    required_context: ['authenticated_user', 'email_match', 'allowed_tier', 'same_origin_redirect', 'stripe_test_policy_for_proof'],
    forbidden_context: ['model_initiated_checkout', 'email_mismatch_checkout', 'unsupported_tier_checkout', 'unapproved_live_payment_test'],
    approval_required: true,
    allowed_claim: 'Checkout initiation is user-authenticated and source-gated.',
    owner_decision_needed: 'Approve Stripe test-key policy and hosted negative tests before payment-boundary claims.',
    hosted_test_status: 'not_tested',
    local_assertion: 'static_inventory_found_checkout_gates'
  },
  stripe_webhook_entitlement_sync: {
    required_context: ['stripe_signature_verified', 'event_type_allowlist', 'entitlement_audit_log', 'invalid_signature_rejection'],
    forbidden_context: ['unsigned_entitlement_mutation', 'model_mutated_subscription', 'unapproved_live_webhook_test'],
    approval_required: true,
    allowed_claim: 'Stripe entitlement sync is signature-gated in source.',
    owner_decision_needed: 'Approve invalid-signature and valid-test-event hosted proof under test credentials.',
    hosted_test_status: 'not_tested',
    local_assertion: 'static_inventory_found_stripe_signature_gate'
  },
  whop_webhook_entitlement_sync: {
    required_context: ['whop_signature_verified', 'event_type_allowlist', 'entitlement_audit_log', 'invalid_signature_rejection'],
    forbidden_context: ['unsigned_entitlement_mutation', 'model_mutated_membership', 'unapproved_live_webhook_test'],
    approval_required: true,
    allowed_claim: 'Whop entitlement sync is signature-gated in source.',
    owner_decision_needed: 'Approve invalid-signature and valid-test-event hosted proof under test policy.',
    hosted_test_status: 'not_tested',
    local_assertion: 'static_inventory_found_whop_signature_gate'
  },
  buyer_discovery_outreach_copy: {
    required_context: ['copy_generation_only', 'owner_approval_before_send', 'no_send_capability_in_script'],
    forbidden_context: ['app_sends_outreach', 'model_sends_email_or_linkedin', 'unapproved_external_contact'],
    approval_required: true,
    allowed_claim: 'Outreach artifacts are draft-only and require owner approval.',
    owner_decision_needed: 'Approve or edit the target slate and copy before any external contact.',
    hosted_test_status: 'not_applicable_copy_only',
    local_assertion: 'static_inventory_found_do_not_send_warning'
  },
  hosted_service_role_smoke_scripts: {
    required_context: ['operator_run_only', 'owner_approved_secrets_policy', 'redacted_logs', 'no_secret_persistence'],
    forbidden_context: ['autonomous_service_role_test', 'service_role_key_in_artifact', 'unapproved_production_mutation'],
    approval_required: true,
    allowed_claim: 'Hosted service-role scripts are operator proof tools, not product runtime tools.',
    owner_decision_needed: 'Approve hosted proof scope, smoke users, redaction path, and secret handling.',
    hosted_test_status: 'not_tested',
    local_assertion: 'static_inventory_found_operator_script_boundaries'
  }
};

const policySurfaces = actionSurfaces.map((surface) => {
  const profile = policyProfiles[surface.id] ?? {
    required_context: ['manual_review_required'],
    forbidden_context: ['unclassified_high_impact_action'],
    approval_required: surface.high_impact_product_action,
    allowed_claim: 'Surface is inventoried but policy profile needs owner review.',
    owner_decision_needed: 'Classify this surface before external trust claims.',
    hosted_test_status: 'not_tested',
    local_assertion: 'inventory_surface_present'
  };

  return {
    id: surface.id,
    name: surface.name,
    category: surface.category,
    impact_level: surface.impact_level,
    high_impact_product_action: Boolean(surface.high_impact_product_action),
    direct_llm_to_irreversible_action: Boolean(surface.direct_llm_to_irreversible_action),
    required_context: profile.required_context,
    forbidden_context: profile.forbidden_context,
    approval_required: Boolean(profile.approval_required),
    allowed_claim: profile.allowed_claim,
    owner_decision_needed: profile.owner_decision_needed,
    hosted_test_status: profile.hosted_test_status,
    local_assertion: profile.local_assertion,
    source_evidence_status: surface.source_evidence_status ?? 'unknown',
    evidence_files: surface.files ?? [],
    next_gate: surface.next_gate
  };
});

const boundaryTests = [
  {
    id: 'forecast_unowned_analysis_denied',
    surface_id: 'forecast_publication',
    execution_scope: 'hosted_after_owner_approval',
    risk: 'public forecast linked to another user analysis',
    required_setup: 'two smoke users and one analysis_run owned by user A',
    action: 'user B POSTs forecast-create with user A analysis_run_id',
    expected_result: 'HTTP 403 with code analysis_not_owned; no forecast row created',
    source_evidence: 'supabase/functions/forecast-create/index.ts ownership check'
  },
  {
    id: 'forecast_governance_blocks_unready_publication',
    surface_id: 'forecast_publication',
    execution_scope: 'hosted_after_owner_approval',
    risk: 'public forecast from rejected, unreviewed, or non-evidence-backed analysis',
    required_setup: 'smoke user owns linked analysis with rejected/unreviewed governance state',
    action: 'POST forecast-create with linked analysis_run_id',
    expected_result: 'HTTP 400 with governance status; no forecast row created',
    source_evidence: 'supabase/functions/forecast-create/index.ts assessPublishGovernance'
  },
  {
    id: 'human_review_non_reviewer_denied',
    surface_id: 'human_review_approve_reject',
    execution_scope: 'hosted_after_owner_approval',
    risk: 'non-reviewer approves or rejects analysis',
    required_setup: 'analysis_run under_review and authenticated user without reviewer role',
    action: 'POST human-review analysis approve/reject',
    expected_result: 'HTTP 403 with reviewer role required; analysis status unchanged',
    source_evidence: 'supabase/functions/human-review/index.ts reviewer.role check'
  },
  {
    id: 'human_review_requires_under_review',
    surface_id: 'human_review_approve_reject',
    execution_scope: 'hosted_after_owner_approval',
    risk: 'reviewer changes status of analysis that is not pending review',
    required_setup: 'reviewer user and analysis_run not under_review',
    action: 'POST human-review approve/reject',
    expected_result: 'HTTP 400 Analysis is not pending review; analysis status unchanged',
    source_evidence: 'supabase/functions/human-review/index.ts under_review precondition'
  },
  {
    id: 'stripe_checkout_email_mismatch_denied',
    surface_id: 'stripe_checkout_session',
    execution_scope: 'hosted_after_owner_approval_test_keys_only',
    risk: 'authenticated user initiates checkout for another email',
    required_setup: 'authenticated smoke user and Stripe test key policy',
    action: 'POST stripe-checkout with mismatched email',
    expected_result: 'HTTP 403 Authenticated user email does not match checkout email; no Stripe session created',
    source_evidence: 'supabase/functions/stripe-checkout/index.ts email match check'
  },
  {
    id: 'stripe_checkout_academic_non_edu_denied',
    surface_id: 'stripe_checkout_session',
    execution_scope: 'hosted_after_owner_approval_test_keys_only',
    risk: 'non-edu user initiates academic checkout',
    required_setup: 'authenticated non-edu smoke user and Stripe test key policy',
    action: 'POST stripe-checkout with tier academic',
    expected_result: 'HTTP 400 academic pricing requires .edu email; no Stripe session created',
    source_evidence: 'supabase/functions/stripe-checkout/index.ts academic email gate'
  },
  {
    id: 'stripe_webhook_invalid_signature_denied',
    surface_id: 'stripe_webhook_entitlement_sync',
    execution_scope: 'hosted_after_owner_approval_test_keys_only',
    risk: 'unsigned webhook mutates entitlement',
    required_setup: 'hosted webhook endpoint with configured test secret',
    action: 'POST unsigned or badly signed Stripe event',
    expected_result: 'HTTP 401 Invalid Stripe signature; no payment_logs or subscription mutation',
    source_evidence: 'supabase/functions/stripe-webhook/index.ts verifyStripeSignature'
  },
  {
    id: 'whop_webhook_invalid_signature_denied',
    surface_id: 'whop_webhook_entitlement_sync',
    execution_scope: 'hosted_after_owner_approval_test_policy_only',
    risk: 'unsigned Whop webhook mutates membership or subscription',
    required_setup: 'hosted webhook endpoint with configured Whop webhook secret',
    action: 'POST unsigned or badly signed Whop event',
    expected_result: 'HTTP 401 Invalid signature; no whop_users or subscription mutation',
    source_evidence: 'supabase/functions/whop-webhook/index.ts verifyWhopSignature'
  },
  {
    id: 'analyze_engine_fanout_allowlist_review',
    surface_id: 'analyze_engine_function_fanout',
    execution_scope: 'static_local_then_hosted_after_owner_approval',
    risk: 'post-analysis fanout uses open-ended model-selected function or URL',
    required_setup: 'source scan plus optional hosted request with fanout-triggering analysis',
    action: 'verify fanout targets are fixed known functions and record whether model can alter destination',
    expected_result: 'known allowlist only; no model-supplied arbitrary endpoint',
    source_evidence: 'supabase/functions/analyze-engine/index.ts buildFunctionUrl and functions/v1 calls'
  },
  {
    id: 'service_role_scripts_operator_only',
    surface_id: 'hosted_service_role_smoke_scripts',
    execution_scope: 'static_local',
    risk: 'service-role proof scripts become autonomous product actions',
    required_setup: 'source scan of hosted proof scripts',
    action: 'verify service-role scripts require explicit operator env and are not exposed as app runtime routes',
    expected_result: 'operator-only scripts with owner-approved secret policy and no secret persistence in artifacts',
    source_evidence: 'scripts/hosted-*.mjs and scripts/hosted-access-preflight.sh'
  },
  {
    id: 'buyer_outreach_copy_no_send',
    surface_id: 'buyer_discovery_outreach_copy',
    execution_scope: 'static_local',
    risk: 'generated copy is mistaken for authorized outreach execution',
    required_setup: 'source scan of discovery kit generator',
    action: 'verify artifact remains copy-only and requires owner approval before sending',
    expected_result: 'no send action and visible owner-approval warning',
    source_evidence: 'scripts/build-buyer-discovery-kit.mjs do-not-send warning'
  },
  {
    id: 'direct_llm_irreversible_action_count_zero',
    surface_id: 'all',
    execution_scope: 'static_local',
    risk: 'LLM has direct path to irreversible high-impact action',
    required_setup: 'AI action inventory generated from current source map',
    action: 'read direct_llm_to_irreversible_action_count',
    expected_result: 'count is 0; any future nonzero count blocks public-sector AI claims',
    source_evidence: inputPaths.inventory
  }
];

const ownerApprovalChecklist = [
  'Approve or edit the high-impact action classification for every policy surface.',
  'Approve whether analyze-engine service-role persistence and fanout require a centralized allowlist before hosted pilots.',
  'Approve hosted negative tests for forecast publication and human review role boundaries.',
  'Approve Stripe and Whop test-key/test-webhook policy before payment or entitlement proof.',
  'Approve hosted URL, deployed release, smoke users, redacted evidence paths, and no-secret logging rules.',
  'Mark this policy externally shareable only after hosted boundary tests, RLS tests, and privacy/support terms are attached.'
];

const highImpactSurfaces = policySurfaces.filter((surface) => surface.high_impact_product_action);
const approvalRequiredSurfaces = policySurfaces.filter((surface) => surface.approval_required);
const hostedBoundaryTests = boundaryTests.filter((test) => test.execution_scope.includes('hosted_after_owner_approval'));
const staticBoundaryTests = boundaryTests.filter((test) => test.execution_scope.includes('static_local'));
const directLlmIrreversibleCount = Number(inventory.summary?.direct_llm_to_irreversible_action_count ?? 0);

const policy = {
  schema_version: 'ai-high-impact-action-policy-v1',
  generated_at: new Date().toISOString(),
  generated_for_date: '2026-06-06',
  status: 'draft_high_impact_action_policy_ready_not_owner_approved_or_hosted_tested',
  source: {
    inventory: inputPaths.inventory,
    inventory_status: inventory.status ?? 'missing',
    hosted_state_verified: false,
    production_state_verified: false,
    owner_policy_approved: false,
    no_runtime_or_payment_or_outreach_actions_executed: true
  },
  proof_boundary: {
    allowed_use: 'Internal owner-review packet and hosted-test specification for excessive-agency and high-impact action controls.',
    not_proof_of: [
      'owner-approved policy',
      'hosted runtime behavior',
      'production RLS or object authorization',
      'payment/webhook correctness',
      'buyer acceptance',
      'world-class prediction accuracy'
    ],
    buyer_safe_positioning: 'A draft high-impact action policy and boundary-test matrix exist; hosted no-autonomous-action proof is still missing.'
  },
  summary: {
    inventory_action_surface_count: Number(inventory.summary?.action_surface_count ?? actionSurfaces.length),
    policy_surface_count: policySurfaces.length,
    high_impact_product_action_count: highImpactSurfaces.length,
    approval_required_surface_count: approvalRequiredSurfaces.length,
    hosted_boundary_test_count: hostedBoundaryTests.length,
    static_boundary_test_count: staticBoundaryTests.length,
    direct_llm_to_irreversible_action_count: directLlmIrreversibleCount,
    owner_approved_policy_count: 0,
    hosted_verified_test_count: 0
  },
  current_source_alignment: currentSourceAlignment,
  policy_principles: [
    'No model-selected irreversible action: LLM output may recommend, draft, or classify, but downstream systems must enforce authorization and approval.',
    'High-impact actions require a named authority context: authenticated user, reviewer role, verified webhook signature, or owner-approved operator context.',
    'Open-ended tools and model-selected destinations are prohibited for post-analysis fanout.',
    'Payment and entitlement actions require test-policy approval before proof execution and signed webhooks before mutation.',
    'Outreach artifacts are copy-only until owner approval; no app or script should send external messages as part of this evidence phase.',
    'Service-role scripts are operator proof tools, not autonomous product runtime tools.'
  ],
  policy_surfaces: policySurfaces,
  boundary_tests: boundaryTests,
  owner_approval_checklist: ownerApprovalChecklist,
  decision: {
    launch_confidence_delta: 0,
    confidence_reason: 'The policy draft improves governance readiness, but no owner approval or hosted boundary test evidence exists.',
    current_claim: 'draft high-impact action policy and boundary-test matrix ready for owner review',
    prohibited_claim: 'hosted-proven no-autonomous-action AI system'
  }
};

function renderMarkdown(report) {
  const sourceRows = report.current_source_alignment
    .map((source) => [
      mdCell(source.framework),
      source.source_url,
      mdCell(source.policy_implication)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const surfaceRows = report.policy_surfaces
    .map((surface) => [
      mdCell(surface.name),
      mdCell(surface.impact_level),
      surface.approval_required ? 'yes' : 'no',
      surface.direct_llm_to_irreversible_action ? 'yes' : 'no',
      mdCell(surface.required_context.join(', ')),
      mdCell(surface.forbidden_context.join(', ')),
      mdCell(surface.hosted_test_status)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const testRows = report.boundary_tests
    .map((test) => [
      mdCell(test.id),
      mdCell(test.surface_id),
      mdCell(test.execution_scope),
      mdCell(test.expected_result)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  return `# AI High-Impact Action Policy - 2026-06-06

## Decision

Status: \`${report.status}\`.

This artifact converts the AI action inventory into a draft high-impact action policy and boundary-test matrix. It does not execute hosted tests, payment flows, outreach, production jobs, or migrations.

Buyer-safe position:

> ${report.proof_boundary.buyer_safe_positioning}

## Summary

| Metric | Count |
|---|---:|
| Policy surfaces | ${report.summary.policy_surface_count} |
| High-impact product action surfaces | ${report.summary.high_impact_product_action_count} |
| Approval-required surfaces | ${report.summary.approval_required_surface_count} |
| Hosted boundary tests specified | ${report.summary.hosted_boundary_test_count} |
| Static boundary tests specified | ${report.summary.static_boundary_test_count} |
| Direct LLM-to-irreversible-action surfaces | ${report.summary.direct_llm_to_irreversible_action_count} |
| Hosted-verified tests | ${report.summary.hosted_verified_test_count} |

## Source Alignment

| Framework | Source | Policy Implication |
|---|---|---|
${sourceRows}

## Policy Principles

${report.policy_principles.map((item) => `- ${item}`).join('\n')}

## Policy Surfaces

| Surface | Impact | Approval Required | Direct LLM-to-Irreversible | Required Context | Forbidden Context | Hosted Test Status |
|---|---|---|---|---|---|---|
${surfaceRows}

## Boundary Tests

| Test | Surface | Scope | Expected Result |
|---|---|---|---|
${testRows}

## Owner Approval Checklist

${report.owner_approval_checklist.map((item) => `- ${item}`).join('\n')}

## Proof Boundary

Allowed use: ${report.proof_boundary.allowed_use}

Not proof of:

${report.proof_boundary.not_proof_of.map((item) => `- ${item}`).join('\n')}
`;
}

function renderCsv(report) {
  const header = csvLine([
    'id',
    'surface_id',
    'execution_scope',
    'risk',
    'required_setup',
    'action',
    'expected_result',
    'source_evidence'
  ]);
  const rows = report.boundary_tests.map((test) => csvLine([
    test.id,
    test.surface_id,
    test.execution_scope,
    test.risk,
    test.required_setup,
    test.action,
    test.expected_result,
    test.source_evidence
  ]));
  return `${[header, ...rows].join('\n')}\n`;
}

if (outputPaths.json) {
  writeArtifact(outputPaths.json, `${JSON.stringify(policy, null, 2)}\n`);
}

if (outputPaths.md) {
  writeArtifact(outputPaths.md, renderMarkdown(policy));
}

if (outputPaths.csv) {
  writeArtifact(outputPaths.csv, renderCsv(policy));
}

console.log(JSON.stringify({
  json_output: outputPaths.json,
  md_output: outputPaths.md,
  csv_output: outputPaths.csv,
  status: policy.status,
  policy_surface_count: policy.summary.policy_surface_count,
  high_impact_product_action_count: policy.summary.high_impact_product_action_count,
  hosted_boundary_test_count: policy.summary.hosted_boundary_test_count,
  hosted_verified_test_count: policy.summary.hosted_verified_test_count
}, null, 2));
