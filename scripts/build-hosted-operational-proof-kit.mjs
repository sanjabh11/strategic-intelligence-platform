#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const ROOT = process.cwd();
const DEFAULT_EVIDENCE = 'docs/launch-readiness/launch-evidence-2026-06-06.json';
const DEFAULT_CONFIDENCE_GATE = 'docs/launch-readiness/commercial-confidence-gate-2026-06-06.json';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/hosted-operational-proof-kit-2026-06-06.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/hosted-operational-proof-kit-2026-06-06.md';
const DEFAULT_CSV_OUTPUT = 'docs/launch-readiness/hosted-operational-proof-evidence-template-2026-06-06.csv';

function argValue(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function usage() {
  console.error([
    'Usage: node scripts/build-hosted-operational-proof-kit.mjs',
    `  [--evidence ${DEFAULT_EVIDENCE}]`,
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
  evidence: argValue('--evidence', DEFAULT_EVIDENCE),
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

const evidence = readJsonIfExists(inputPaths.evidence, {
  proof_buckets: { hosted_live: [], local: [], repo_artifact: [] },
  launch_decision: 'unknown'
});
const confidenceGate = readJsonIfExists(inputPaths.confidenceGate, {
  posture: {},
  dimensions: []
});

const hostedProofCount = Array.isArray(evidence.proof_buckets?.hosted_live)
  ? evidence.proof_buckets.hosted_live.length
  : 0;

const commonRequiredInputs = [
  'owner_approved_hosted_url',
  'deployed_commit_or_release_id',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'redacted_smoke_account_or_generated_test_user_policy'
];

const smokePlan = [
  {
    id: 'hosted_access_preflight',
    market_claim_unlocked: 'Hosted Supabase and function-management access is observable for proof capture.',
    npm_script: 'diag:hosted:access',
    command: 'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run diag:hosted:access',
    script_path: 'scripts/hosted-access-preflight.sh',
    required_inputs: [
      ...commonRequiredInputs,
      'supabase_cli_logged_in_or_SUPABASE_USE_ENV_TOKEN_true'
    ],
    evidence_fields: [
      'project_ref',
      'function_list_visible',
      'secrets_list_visible_or_blocked_reason',
      'missing_env_keys_redacted',
      'log_path'
    ],
    acceptance_criteria: [
      'Core hosted diagnostic environment values are present.',
      'Supabase CLI can list the intended project functions or records a clear access blocker.',
      'No secret value is copied into the artifact.'
    ],
    failure_means: 'Hosted proof cannot be claimed until project access and redacted env state are fixed.'
  },
  {
    id: 'hosted_function_drift',
    market_claim_unlocked: 'Hosted edge-function surface matches the repo-backed launch surface.',
    npm_script: 'diag:functions:hosted',
    command: 'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run diag:functions:hosted',
    script_path: 'scripts/hosted-function-drift.mjs',
    required_inputs: [
      ...commonRequiredInputs,
      'Supabase CLI JSON output access'
    ],
    evidence_fields: [
      'local_functions',
      'remote_functions',
      'remote_only_legacy',
      'local_only',
      'quarantine_candidates',
      'log_path'
    ],
    acceptance_criteria: [
      'Report captures repo-backed, remote-only, and local-only function counts.',
      'Any remote-only legacy function is either quarantined after approval or explicitly accepted with owner rationale.'
    ],
    failure_means: 'Buyer-facing runtime claims remain unsafe if hosted functions drift from the repo-backed surface.'
  },
  {
    id: 'hosted_auth_and_entitlements',
    market_claim_unlocked: 'Hosted auth, entitlement tables, and webhook rejection behavior are proof-captured.',
    npm_script: 'diag:auth:hosted',
    command: 'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run diag:auth:hosted',
    script_path: 'scripts/hosted-auth-diagnostics.mjs',
    required_inputs: commonRequiredInputs,
    evidence_fields: [
      'admin_create_user_status',
      'user_subscriptions_access',
      'whop_users_access',
      'stripe_webhook_invalid_signature_status',
      'log_path'
    ],
    acceptance_criteria: [
      'A smoke user can be created or a documented owner-approved alternative test account is used.',
      'Entitlement tables are reachable through service-role proof only.',
      'Invalid webhook signatures are rejected.'
    ],
    failure_means: 'Pricing, account, and gated-access claims cannot be used in buyer demos.'
  },
  {
    id: 'hosted_schema_preflight',
    market_claim_unlocked: 'Hosted database schema contains the tables required by the premium workflow.',
    npm_script: 'smoke:schema:hosted',
    command: 'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run smoke:schema:hosted',
    script_path: 'scripts/hosted-schema-preflight.mjs',
    required_inputs: commonRequiredInputs,
    evidence_fields: [
      'checked_tables',
      'missing_count',
      'missing_tables',
      'log_path'
    ],
    acceptance_criteria: [
      'All required tables return successful PostgREST responses.',
      'No missing table is hidden behind broad public claims.'
    ],
    failure_means: 'Hosted demo readiness is blocked until schema drift is corrected.'
  },
  {
    id: 'hosted_strategist_console',
    market_claim_unlocked: 'Hosted strategist route can produce governed, evidence-aware analysis with provider diagnostics.',
    npm_script: 'smoke:strategist:hosted',
    command: 'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run smoke:strategist:hosted',
    script_path: 'scripts/hosted-strategist-smoke.mjs',
    required_inputs: [
      ...commonRequiredInputs,
      'GEMINI_API_KEY_or_OPENAI_API_KEY_or_OPENROUTER_API_KEY',
      'HOSTED_STRATEGIST_PROOF_EMAIL optional',
      'HOSTED_STRATEGIST_PROOF_PASSWORD optional'
    ],
    evidence_fields: [
      'provider_order',
      'fallback_configured',
      'strategy_response_ok',
      'provenance_status',
      'evidence_or_review_gate',
      'duration_ms',
      'log_path'
    ],
    acceptance_criteria: [
      'Provider diagnostics show expected order and fallback state.',
      'Strategist response succeeds without falling back to unsupported generic copy.',
      'Output preserves provenance, uncertainty, and review boundaries.'
    ],
    failure_means: 'The first market wedge cannot be shown as hosted proof.'
  },
  {
    id: 'hosted_researcher_advanced',
    market_claim_unlocked: 'Hosted researcher workflow can run advanced frameworks with hydrator/export/notebook proof.',
    npm_script: 'smoke:researcher:advanced:hosted',
    command: 'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run smoke:researcher:advanced:hosted',
    script_path: 'scripts/hosted-researcher-advanced-smoke.mjs',
    required_inputs: [
      ...commonRequiredInputs,
      'analyze-engine deployed',
      'analysis-hydrator deployed',
      'export-analysis deployed',
      'notebook-export deployed'
    ],
    evidence_fields: [
      'frameworks_checked',
      'analysis_run_ids_redacted_or_internal',
      'hydrator_ok',
      'export_ok',
      'notebook_export_ok',
      'log_path'
    ],
    acceptance_criteria: [
      'Each selected framework returns an analysis envelope that passes the smoke assertions.',
      'Hydrator, export, and notebook paths return successful responses.'
    ],
    failure_means: 'Advanced framework depth remains repo/local proof only, not hosted proof.'
  },
  {
    id: 'hosted_insights_gdelt',
    market_claim_unlocked: 'Hosted geopolitical radar can use non-simulated GDELT/provider diagnostics.',
    npm_script: 'smoke:insights:hosted',
    command: 'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run smoke:insights:hosted',
    script_path: 'scripts/hosted-insights-smoke.mjs',
    required_inputs: commonRequiredInputs,
    evidence_fields: [
      'provider_mode',
      'warnings_count',
      'detail_modes',
      'scenario_count',
      'first_event_id',
      'log_path'
    ],
    acceptance_criteria: [
      'Provider mode is not simulated.',
      'Degraded mode, if present, includes explicit warnings.',
      'Scenarios include stable event identifiers.'
    ],
    failure_means: 'Geopolitical radar can be demoed only with feed caveats, not as hosted operational proof.'
  },
  {
    id: 'hosted_warroom_collaboration',
    market_claim_unlocked: 'Hosted war-room collaboration can create and verify decision, assumption, scenario, and comment rows.',
    npm_script: 'smoke:warroom:hosted',
    command: 'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run smoke:warroom:hosted',
    script_path: 'scripts/hosted-warroom-smoke.mjs',
    required_inputs: commonRequiredInputs,
    evidence_fields: [
      'session_created',
      'decision_log_count',
      'assumption_count',
      'scenario_version_count',
      'comment_count',
      'log_path'
    ],
    acceptance_criteria: [
      'Smoke creates a war-room session under an authenticated hosted user.',
      'Service-role verification sees the expected related rows.',
      'Any cleanup or retention decision is owner-approved before live data deletion.'
    ],
    failure_means: 'Team workflow claims remain candidate/shadow until hosted collaboration proof exists.'
  },
  {
    id: 'hosted_classroom_training',
    market_claim_unlocked: 'Hosted classroom/training lane can create instructor/student flow and assignment evidence.',
    npm_script: 'smoke:classroom:hosted',
    command: 'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run smoke:classroom:hosted',
    script_path: 'scripts/hosted-classroom-smoke.mjs',
    required_inputs: commonRequiredInputs,
    evidence_fields: [
      'classroom_created',
      'join_code_used',
      'assignment_created',
      'student_joined',
      'submission_or_activity_verified',
      'log_path'
    ],
    acceptance_criteria: [
      'Instructor and student smoke users can complete the hosted classroom path.',
      'Assignment and membership rows are verified without exposing credentials.'
    ],
    failure_means: 'Training revenue lane remains adjacent/local proof, not hosted buyer proof.'
  },
  {
    id: 'hosted_payment_and_pricing',
    market_claim_unlocked: 'Hosted pricing, Stripe webhook, and entitlement proof are captured without live payment mutation.',
    npm_script: 'proof:stripe:hosted',
    command: 'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run proof:stripe:hosted',
    script_path: 'scripts/hosted-stripe-proof.mjs',
    required_inputs: [
      ...commonRequiredInputs,
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'STRIPE_ACADEMIC_PRICE_ID',
      'APP_URL'
    ],
    evidence_fields: [
      'invalid_signature_rejected',
      'checkout_session_created_or_blocked_reason',
      'entitlement_rows_before_after',
      'payment_mode_test_or_live_redacted',
      'log_path'
    ],
    acceptance_criteria: [
      'Invalid signatures fail closed.',
      'Checkout proof uses owner-approved test/smoke mode and does not mutate live payments without approval.',
      'Entitlement evidence remains redacted.'
    ],
    failure_means: 'Paid-pilot readiness cannot be claimed.'
  },
  {
    id: 'hosted_retrieval_and_evidence',
    market_claim_unlocked: 'Hosted evidence retrieval grows retrieval artifacts and avoids low-source fallback.',
    npm_script: 'smoke:retrieval:hosted',
    command: 'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run smoke:retrieval:hosted',
    script_path: 'scripts/retrieval-provider-smoke.mjs',
    required_inputs: [
      ...commonRequiredInputs,
      'SUPABASE_DB_URL',
      'retrieval provider keys approved for smoke'
    ],
    evidence_fields: [
      'before_retrievals',
      'after_retrievals',
      'before_cache',
      'after_cache',
      'provider_status_counts',
      'log_path'
    ],
    acceptance_criteria: [
      'At least three normalized sources are returned for each canary.',
      'Retrieval rows grow and cache state is observable.',
      'Provider diagnostics are captured.'
    ],
    failure_means: 'Evidence-backed analysis claim remains unproven in hosted state.'
  },
  {
    id: 'hosted_analyze_evidence_canaries',
    market_claim_unlocked: 'Hosted analyze-engine produces evidence-backed analysis across geopolitical and commodity canaries.',
    npm_script: 'smoke:analyze:evidence:hosted',
    command: 'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run smoke:analyze:evidence:hosted',
    script_path: 'scripts/analyze-engine-evidence-smoke.mjs',
    required_inputs: [
      ...commonRequiredInputs,
      'provider keys approved for analyze-engine smoke'
    ],
    evidence_fields: [
      'scenario_count',
      'retrieval_count_per_scenario',
      'distinct_provider_count',
      'fallback_reason',
      'failure_class',
      'log_path'
    ],
    acceptance_criteria: [
      'Each canary returns at least three retrieved sources.',
      'Each canary is evidence-backed.',
      'Provider chain does not degrade before verified analysis.'
    ],
    failure_means: 'Strategic-intelligence uniqueness remains local/repo proof only.'
  }
].map((item) => ({
  ...item,
  proof_bucket: 'hosted_live_when_executed',
  current_status: hostedProofCount > 0 ? 'needs_current_run_review' : 'not_run_in_this_evidence_set',
  script_exists: existsSync(resolveRepoPath(item.script_path)),
  approval_gate: 'Run only after owner-approved hosted URL, secrets, smoke-user policy, deploy state, and log/screenshot capture location are available.'
}));

const missingScripts = smokePlan.filter((item) => !item.script_exists);
const confidenceHostedDimension = (confidenceGate.dimensions ?? []).find((dimension) => dimension.id === 'hosted_operational_proof');

const report = {
  schema_version: 'hosted-operational-proof-kit-v1',
  generated_at: new Date().toISOString(),
  status: 'hosted_proof_kit_ready_not_hosted_proof',
  proof_boundary: 'This kit defines hosted smoke commands, owner inputs, acceptance criteria, and evidence fields. It is not hosted/live proof until the commands are run after owner-approved deploy state and secrets, with redacted logs/screenshots attached.',
  source: {
    launch_evidence: inputPaths.evidence,
    confidence_gate: inputPaths.confidenceGate,
    launch_decision: evidence.launch_decision ?? 'unknown',
    current_hosted_live_entries: hostedProofCount,
    confidence_gate_hosted_status: confidenceHostedDimension?.status ?? 'unknown',
    confidence_gate_hosted_score_percent: confidenceHostedDimension?.current_score_percent ?? null,
    production_state_verified: false,
    hosted_state_verified: hostedProofCount > 0,
    scripts_checked: smokePlan.length,
    scripts_present: smokePlan.length - missingScripts.length,
    scripts_missing: missingScripts.map((item) => item.script_path)
  },
  required_owner_inputs: [
    {
      input: 'owner_approved_hosted_url',
      reason: 'Proves which deployed web surface is in scope for screenshots and browser smoke.'
    },
    {
      input: 'deployed_commit_or_release_id',
      reason: 'Binds hosted proof to a repo commit or release rather than an unknown live state.'
    },
    {
      input: 'redacted_env_manifest',
      reason: 'Shows required variables are present without exposing secret values.'
    },
    {
      input: 'smoke_user_policy',
      reason: 'Defines whether scripts can create disposable users or must use owner-provided test accounts.'
    },
    {
      input: 'log_and_screenshot_paths',
      reason: 'Ensures evidence is attachable without credentials or private data.'
    }
  ],
  smoke_plan: smokePlan,
  acceptance_gates: [
    {
      gate: 'deploy_binding',
      required: true,
      pass_condition: 'Each evidence row records hosted URL, deploy id or commit, timestamp, command, and operator.'
    },
    {
      gate: 'secret_redaction',
      required: true,
      pass_condition: 'Logs and screenshots contain no API keys, bearer tokens, session cookies, passwords, or direct personal contact/payment identifiers.'
    },
    {
      gate: 'route_and_api_coverage',
      required: true,
      pass_condition: 'At least access, auth, schema, strategist, insights, retrieval/analyze, and pricing/entitlement checks are attached before buyer-safe hosted claims.'
    },
    {
      gate: 'failure_classification',
      required: true,
      pass_condition: 'Every failed smoke row records whether the blocker is secret/config, deploy drift, schema/RLS, provider reliability, payment, or product behavior.'
    },
    {
      gate: 'claim_boundary',
      required: true,
      pass_condition: 'Hosted proof upgrades only the specific checked workflow; it does not upgrade prediction-accuracy or commercial-ready claims by itself.'
    }
  ],
  commands_after_owner_approval: smokePlan.map((item) => item.command),
  current_blockers: [
    `${hostedProofCount} hosted/live proof entries are attached in ${inputPaths.evidence}.`,
    'No hosted command was run by this kit generator.',
    'Owner-approved deploy state, secrets, smoke-user policy, and redacted evidence paths are required before hosted proof can be captured.'
  ],
  external_framework_alignment: [
    {
      framework: 'NIST SSDF SP 800-218',
      source_url: 'https://csrc.nist.gov/pubs/sp/800/218/final',
      requirement: 'Verify software behavior and security outcomes with evidence before release claims.'
    },
    {
      framework: 'CISA Secure by Design',
      source_url: 'https://www.cisa.gov/resources-tools/resources/secure-by-design',
      requirement: 'Treat secure deployment, least privilege, and observable failure modes as product responsibilities.'
    },
    {
      framework: 'NIST AI RMF Measure and Manage',
      source_url: 'https://www.nist.gov/itl/ai-risk-management-framework',
      requirement: 'Measure AI-system behavior in deployment-relevant conditions and manage residual risk before external claims.'
    }
  ]
};

function renderCsv() {
  const headers = [
    'smoke_id',
    'claim_checked',
    'npm_script',
    'command',
    'script_path',
    'script_exists',
    'run_status',
    'hosted_url',
    'deploy_id_or_commit',
    'run_timestamp',
    'operator',
    'log_path',
    'screenshot_path',
    'console_errors',
    'network_errors',
    'failure_class',
    'redaction_verified',
    'buyer_claim_allowed',
    'notes'
  ];

  const rows = smokePlan.map((item) => [
    item.id,
    item.market_claim_unlocked,
    item.npm_script,
    item.command,
    item.script_path,
    item.script_exists ? 'yes' : 'no',
    'not_run',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'no',
    'no',
    'Fill after owner-approved hosted smoke. Do not paste secrets.'
  ]);

  return [headers, ...rows].map(csvLine).join('\n') + '\n';
}

function renderMarkdown() {
  const smokeRows = smokePlan
    .map((item) => [
      mdCell(item.id),
      mdCell(item.npm_script),
      item.script_exists ? 'yes' : 'no',
      mdCell(item.current_status),
      mdCell(item.market_claim_unlocked)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const inputRows = report.required_owner_inputs
    .map((item) => `| ${mdCell(item.input)} | ${mdCell(item.reason)} |`)
    .join('\n');

  const gateRows = report.acceptance_gates
    .map((item) => `| ${mdCell(item.gate)} | ${item.required ? 'yes' : 'no'} | ${mdCell(item.pass_condition)} |`)
    .join('\n');

  return `# Hosted Operational Proof Kit - 2026-06-06

## Status

Status: \`${report.status}\`.

This kit is not hosted/live proof. It defines the smoke plan, owner inputs, acceptance criteria, and evidence template needed before hosted claims can be made.

Current hosted/live entries in \`${inputPaths.evidence}\`: **${hostedProofCount}**.

## Required Owner Inputs

| Input | Reason |
|---|---|
${inputRows}

## Smoke Plan

| Smoke ID | NPM Script | Script Exists | Current Status | Claim Checked |
|---|---|---|---|---|
${smokeRows}

## Acceptance Gates

| Gate | Required | Pass Condition |
|---|---|---|
${gateRows}

## Evidence Template

Use \`${outputPaths.csv}\` to capture command output, deploy binding, logs, screenshots, failure class, and redaction status. Rows stay \`buyer_claim_allowed=no\` until the command passes and evidence is attached.

## Proof Boundary

Passing this kit can support only the specific hosted workflow checked. It does not prove commercial-ready status, enterprise RLS safety, buyer willingness to pay, or world-class prediction accuracy.
`;
}

if (outputPaths.json) {
  writeArtifact(outputPaths.json, `${JSON.stringify(report, null, 2)}\n`);
}

if (outputPaths.md) {
  writeArtifact(outputPaths.md, renderMarkdown());
}

if (outputPaths.csv) {
  writeArtifact(outputPaths.csv, renderCsv());
}

console.log(JSON.stringify({
  json_output: outputPaths.json,
  md_output: outputPaths.md,
  csv_output: outputPaths.csv,
  status: report.status,
  current_hosted_live_entries: hostedProofCount,
  smoke_plan_count: smokePlan.length,
  scripts_missing: missingScripts.length
}, null, 2));
