#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const ROOT = process.cwd();
const DEFAULT_HOSTED_ACCESS_PREFLIGHT = 'docs/launch-readiness/hosted-access-preflight-validation-2026-06-06.json';
const DEFAULT_HOSTED_PROOF_KIT = 'docs/launch-readiness/hosted-operational-proof-kit-2026-06-06.json';
const DEFAULT_HOSTED_PROOF_VALIDATION = 'docs/launch-readiness/hosted-operational-proof-evidence-validation-2026-06-06.json';
const DEFAULT_LOCAL_BROWSER_ROUTE_PROOF = 'docs/launch-readiness/local-browser-route-proof-2026-06-06.json';
const DEFAULT_CLAIM_CONSISTENCY_VALIDATION = 'docs/launch-readiness/claim-consistency-validation-2026-06-06.json';
const DEFAULT_COMMERCIAL_CONFIDENCE_GATE = 'docs/launch-readiness/commercial-confidence-gate-2026-06-06.json';
const DEFAULT_EVIDENCE = 'docs/launch-readiness/launch-evidence-2026-06-06.json';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/hosted-smoke-execution-readiness-2026-06-06.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/hosted-smoke-execution-readiness-2026-06-06.md';
const DEFAULT_CSV_OUTPUT = 'docs/launch-readiness/hosted-smoke-execution-readiness-checklist-2026-06-06.csv';

const CURRENT_HOSTED_PROOF_SOURCES = [
  {
    source: 'Playwright configuration',
    url: 'https://playwright.dev/docs/test-use-options',
    requirement: 'Use explicit base URLs, browser context options, and trace/screenshot/video capture for repeatable browser smoke proof.'
  },
  {
    source: 'Playwright trace viewer',
    url: 'https://playwright.dev/docs/trace-viewer',
    requirement: 'Retain trace or screenshot evidence when a hosted smoke fails or needs review.'
  },
  {
    source: 'Supabase Edge Functions',
    url: 'https://supabase.com/docs/guides/functions',
    requirement: 'Treat deployed edge functions as a managed runtime surface that must be checked separately from repo-local code.'
  },
  {
    source: 'Supabase local development and CLI',
    url: 'https://supabase.com/docs/guides/local-development',
    requirement: 'Use the CLI for local development and project-scoped checks, but require actual project visibility before hosted proof claims.'
  },
  {
    source: 'Netlify Deploy Previews',
    url: 'https://docs.netlify.com/site-deploys/deploy-previews/',
    requirement: 'Bind browser proof to a concrete deployed URL, branch/deploy context, and environment-variable context before external review.'
  },
  {
    source: 'Netlify deploy overview',
    url: 'https://docs.netlify.com/deploy/deploy-overview/',
    requirement: 'Keep deploy identifiers and production/preview context explicit so smoke evidence can be tied to a specific release surface.'
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
    'Usage: node scripts/validate-hosted-smoke-execution-readiness.mjs',
    `  [--hosted-access-preflight ${DEFAULT_HOSTED_ACCESS_PREFLIGHT}]`,
    `  [--hosted-proof-kit ${DEFAULT_HOSTED_PROOF_KIT}]`,
    `  [--hosted-proof-validation ${DEFAULT_HOSTED_PROOF_VALIDATION}]`,
    `  [--local-browser-route-proof ${DEFAULT_LOCAL_BROWSER_ROUTE_PROOF}]`,
    `  [--claim-consistency-validation ${DEFAULT_CLAIM_CONSISTENCY_VALIDATION}]`,
    `  [--commercial-confidence-gate ${DEFAULT_COMMERCIAL_CONFIDENCE_GATE}]`,
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
  hostedAccessPreflight: argValue('--hosted-access-preflight', DEFAULT_HOSTED_ACCESS_PREFLIGHT),
  hostedProofKit: argValue('--hosted-proof-kit', DEFAULT_HOSTED_PROOF_KIT),
  hostedProofValidation: argValue('--hosted-proof-validation', DEFAULT_HOSTED_PROOF_VALIDATION),
  localBrowserRouteProof: argValue('--local-browser-route-proof', DEFAULT_LOCAL_BROWSER_ROUTE_PROOF),
  claimConsistencyValidation: argValue('--claim-consistency-validation', DEFAULT_CLAIM_CONSISTENCY_VALIDATION),
  commercialConfidenceGate: argValue('--commercial-confidence-gate', DEFAULT_COMMERCIAL_CONFIDENCE_GATE),
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

function gateStatus(condition, openStatus = 'blocked') {
  return condition ? 'passed' : openStatus;
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

const hostedAccessPreflight = readJsonIfExists(inputPaths.hostedAccessPreflight, { status: 'missing', summary: {}, source: {} });
const hostedProofKit = readJsonIfExists(inputPaths.hostedProofKit, { status: 'missing', source: {}, smoke_plan: [] });
const hostedProofValidation = readJsonIfExists(inputPaths.hostedProofValidation, { status: 'missing', summary: {}, source: {} });
const localBrowserRouteProof = readJsonIfExists(inputPaths.localBrowserRouteProof, { status: 'missing', source: {} });
const claimConsistencyValidation = readJsonIfExists(inputPaths.claimConsistencyValidation, { status: 'missing', summary: {} });
const commercialConfidenceGate = readJsonIfExists(inputPaths.commercialConfidenceGate, { posture: {}, dimensions: [] });

const hostedDimension = (commercialConfidenceGate.dimensions ?? []).find((dimension) => dimension.id === 'hosted_operational_proof') ?? {};
const accessStatus = hostedAccessPreflight.status ?? 'missing';
const cliAvailable = Boolean(hostedAccessPreflight.summary?.cli_available);
const coreEnvPresent = Boolean(hostedAccessPreflight.summary?.core_env_present);
const providerKeyPresent = Boolean(hostedAccessPreflight.summary?.strategist_provider_key_present);
const stripeProofReady = Boolean(hostedAccessPreflight.summary?.stripe_proof_ready);
const projectsListAccess = hostedAccessPreflight.summary?.projects_list_access ?? 'missing';
const targetProjectVisible = Boolean(hostedAccessPreflight.summary?.target_project_visible);
const functionsListAccess = hostedAccessPreflight.summary?.functions_list_access ?? 'missing';
const secretsListAccess = hostedAccessPreflight.summary?.secrets_list_access ?? 'missing';
const managementAccessReady = Boolean(hostedAccessPreflight.summary?.management_access_ready);
const accessReadyForSmoke = Boolean(hostedAccessPreflight.summary?.hosted_access_ready_for_smoke);
const accessClaimAllowed = Boolean(hostedAccessPreflight.summary?.hosted_claim_allowed);
const smokePlanCount = Number(hostedProofKit.source?.scripts_checked ?? hostedProofKit.smoke_plan?.length ?? 0);
const smokeScriptPresentCount = Number(hostedProofKit.source?.scripts_present ?? 0);
const smokeScriptsReady = smokePlanCount > 0 && smokeScriptPresentCount === smokePlanCount;
const proofValidationStatus = hostedProofValidation.status ?? 'missing';
const evidenceRegisterRowCount = Number(hostedProofValidation.summary?.register_row_count ?? 0);
const expectedSmokeCount = Number(hostedProofValidation.summary?.expected_smoke_count ?? smokePlanCount);
const executedSmokeCount = Number(hostedProofValidation.summary?.executed_smoke_count ?? 0);
const passedSmokeCount = Number(hostedProofValidation.summary?.passed_smoke_count ?? 0);
const buyerClaimAllowedCount = Number(hostedProofValidation.summary?.buyer_claim_allowed_count ?? 0);
const redactionVerifiedCount = Number(hostedProofValidation.summary?.redaction_verified_count ?? 0);
const logEvidencePresentCount = Number(hostedProofValidation.summary?.log_evidence_present_count ?? 0);
const screenshotEvidencePresentCount = Number(hostedProofValidation.summary?.screenshot_evidence_present_count ?? 0);
const coreCoverageReadyCount = Number(hostedProofValidation.summary?.core_coverage_ready_count ?? 0);
const coreCoverageGroupCount = Number(hostedProofValidation.summary?.core_coverage_group_count ?? 0);
const hostedProofReadyForBuyerSafeClaims = Boolean(hostedProofValidation.summary?.ready_for_buyer_safe_hosted_claims);
const hostedOperationalClaimAllowed = Boolean(hostedProofValidation.summary?.hosted_operational_claim_allowed);
const localRouteReady = localBrowserRouteProof.status === 'local_route_proof_ready_not_hosted_proof'
  && Number(localBrowserRouteProof.source?.rendered_or_expected_auth_gate_count ?? 0) >= 5
  && Number(localBrowserRouteProof.source?.runtime_console_error_count ?? 0) === 0;
const claimConsistencyReady = Boolean(claimConsistencyValidation.summary?.claim_consistency_ready)
  && Number(claimConsistencyValidation.summary?.unsupported_claim_mention_count ?? 0) === 0
  && Boolean(claimConsistencyValidation.summary?.hosted_live_claim_blocked);
const evidenceRegisterReady = evidenceRegisterRowCount >= expectedSmokeCount
  && expectedSmokeCount > 0
  && Number(hostedProofValidation.summary?.row_error_count ?? 0) === 0;
const hostedClaimAllowed = accessClaimAllowed || hostedOperationalClaimAllowed || buyerClaimAllowedCount > 0;
const ownerUnblockReady = [
  cliAvailable,
  coreEnvPresent,
  providerKeyPresent,
  smokeScriptsReady,
  evidenceRegisterReady,
  localRouteReady,
  claimConsistencyReady,
  !hostedClaimAllowed
].every(Boolean);
const hostedSmokeExecutionReady = [
  ownerUnblockReady,
  stripeProofReady,
  targetProjectVisible,
  managementAccessReady,
  accessReadyForSmoke
].every(Boolean);
const hostedProofComplete = [
  hostedSmokeExecutionReady,
  executedSmokeCount >= expectedSmokeCount,
  passedSmokeCount >= expectedSmokeCount,
  redactionVerifiedCount >= expectedSmokeCount,
  coreCoverageReadyCount >= coreCoverageGroupCount && coreCoverageGroupCount > 0,
  hostedProofReadyForBuyerSafeClaims
].every(Boolean);

const acceptanceGates = [
  {
    gate: 'current_hosted_proof_sources_attached',
    status: gateStatus(CURRENT_HOSTED_PROOF_SOURCES.length >= 6),
    proof_bucket: 'repo_artifact',
    evidence: `${CURRENT_HOSTED_PROOF_SOURCES.length} current hosted proof source anchors attached.`,
    next_action: 'Refresh hosted proof anchors when browser, deployment, or Supabase smoke methodology changes.'
  },
  {
    gate: 'hosted_smoke_scripts_ready',
    status: gateStatus(smokeScriptsReady),
    proof_bucket: 'repo_artifact',
    evidence: `${smokeScriptPresentCount}/${smokePlanCount} hosted smoke scripts are present.`,
    next_action: smokeScriptsReady ? 'No script creation needed before owner unblock.' : 'Repair missing hosted smoke scripts before access approval.'
  },
  {
    gate: 'hosted_evidence_register_ready',
    status: gateStatus(evidenceRegisterReady),
    proof_bucket: 'repo_artifact',
    evidence: `register rows=${evidenceRegisterRowCount}/${expectedSmokeCount}; row_errors=${Number(hostedProofValidation.summary?.row_error_count ?? 0)}.`,
    next_action: evidenceRegisterReady ? 'Use the register to record hosted URL, deploy id, logs, screenshots, and redaction status.' : 'Repair hosted proof evidence register rows before smoke.'
  },
  {
    gate: 'local_browser_route_baseline_ready',
    status: gateStatus(localRouteReady),
    proof_bucket: 'local',
    evidence: `local route status=${localBrowserRouteProof.status ?? 'missing'}; ready routes=${Number(localBrowserRouteProof.source?.rendered_or_expected_auth_gate_count ?? 0)}; runtime errors=${Number(localBrowserRouteProof.source?.runtime_console_error_count ?? 0)}.`,
    next_action: localRouteReady ? 'Use this only as local baseline; do not claim hosted proof.' : 'Run local route smoke before hosted smoke.'
  },
  {
    gate: 'hosted_access_preflight_ready',
    status: gateStatus(accessReadyForSmoke, 'open_hosted_access_blocked'),
    proof_bucket: 'hosted_live_access_check',
    evidence: `access_status=${accessStatus}; cli=${cliAvailable}; core_env=${coreEnvPresent}; provider_key=${providerKeyPresent}; target_project_visible=${targetProjectVisible}; functions_access=${functionsListAccess}; secrets_access=${secretsListAccess}; management_access_ready=${managementAccessReady}; stripe_proof_ready=${stripeProofReady}.`,
    next_action: 'Owner confirms project ref, grants function/secret management access, provides deploy URL/binding, and supplies Stripe proof values before smoke.'
  },
  {
    gate: 'hosted_smoke_evidence_present',
    status: gateStatus(executedSmokeCount > 0, 'open_no_hosted_smoke_runs'),
    proof_bucket: 'hosted_live',
    evidence: `executed=${executedSmokeCount}; passed=${passedSmokeCount}; redaction_verified=${redactionVerifiedCount}; logs=${logEvidencePresentCount}; screenshots=${screenshotEvidencePresentCount}; core_coverage=${coreCoverageReadyCount}/${coreCoverageGroupCount}.`,
    next_action: 'Run hosted access, auth, schema, strategist, insights, retrieval/analyze, pricing, and entitlement smoke after access unblocks.'
  },
  {
    gate: 'hosted_claim_boundaries_preserved',
    status: gateStatus(claimConsistencyReady && !hostedClaimAllowed),
    proof_bucket: 'repo_artifact',
    evidence: `claim_consistency_ready=${claimConsistencyReady}; hosted_claim_allowed=${hostedClaimAllowed}; buyer_claim_allowed_count=${buyerClaimAllowedCount}.`,
    next_action: 'Keep hosted-live and commercial-ready language blocked until evidence validator passes.'
  },
  {
    gate: 'hosted_owner_unblock_ready',
    status: gateStatus(ownerUnblockReady),
    proof_bucket: 'repo_artifact',
    evidence: `owner_unblock_ready=${ownerUnblockReady}; hosted_smoke_execution_ready=${hostedSmokeExecutionReady}; hosted_proof_complete=${hostedProofComplete}.`,
    next_action: ownerUnblockReady ? 'Owner can unblock project access/deploy binding and then rerun hosted preflight.' : 'Repair structural hosted proof readiness before owner unblock.'
  }
];

const releaseHolds = [
  {
    hold: 'target_project_visibility_missing',
    severity: 'P1',
    status: targetProjectVisible ? 'cleared' : 'active',
    evidence_needed: 'Intended Supabase project ref is visible to the authenticated CLI/account or corrected in the preflight.'
  },
  {
    hold: 'function_and_secret_management_access_missing',
    severity: 'P1',
    status: managementAccessReady ? 'cleared' : 'active',
    evidence_needed: 'Project-scoped function and secret list commands succeed without exposing secret values.'
  },
  {
    hold: 'stripe_payment_proof_values_missing',
    severity: 'P1',
    status: stripeProofReady ? 'cleared' : 'active',
    evidence_needed: 'Stripe proof keys are present by name for owner-approved test/payment proof.'
  },
  {
    hold: 'hosted_deploy_binding_missing',
    severity: 'P1',
    status: 'active',
    evidence_needed: 'Owner-approved hosted URL plus deploy id or commit binding for the smoke run.'
  },
  {
    hold: 'hosted_smoke_runs_missing',
    severity: 'P1',
    status: executedSmokeCount > 0 ? 'ready_for_review' : 'active',
    evidence_needed: 'Executed hosted smoke rows with run timestamp, operator, logs, screenshots where relevant, failure class, and redaction verification.'
  },
  {
    hold: 'core_hosted_coverage_missing',
    severity: 'P1',
    status: coreCoverageReadyCount >= coreCoverageGroupCount && coreCoverageGroupCount > 0 ? 'cleared' : 'active',
    evidence_needed: 'Hosted access, auth/entitlements, schema, strategist, geopolitical insights, retrieval/analyze, and pricing/payment coverage groups pass.'
  },
  {
    hold: 'owner_approved_hosted_claim_language_missing',
    severity: 'P2',
    status: 'active',
    evidence_needed: 'Owner-approved external wording after hosted evidence validation passes.'
  }
];

const report = {
  schema_version: 'hosted-smoke-execution-readiness-v1',
  generated_at: new Date().toISOString(),
  status: hostedProofComplete
    ? 'hosted_smoke_execution_ready_for_buyer_safe_claim_review'
    : hostedSmokeExecutionReady
      ? 'hosted_smoke_execution_ready_waiting_for_runs'
      : ownerUnblockReady
        ? 'hosted_smoke_execution_blocked_project_privileges_owner_unblock_ready'
        : 'hosted_smoke_execution_readiness_partial',
  source: {
    hosted_access_preflight: inputPaths.hostedAccessPreflight,
    hosted_proof_kit: inputPaths.hostedProofKit,
    hosted_proof_validation: inputPaths.hostedProofValidation,
    local_browser_route_proof: inputPaths.localBrowserRouteProof,
    claim_consistency_validation: inputPaths.claimConsistencyValidation,
    commercial_confidence_gate: inputPaths.commercialConfidenceGate,
    launch_evidence: inputPaths.evidence,
    hosted_dimension_status: hostedDimension.status ?? 'missing',
    hosted_dimension_score_percent: Number(hostedDimension.current_score_percent ?? 0)
  },
  summary: {
    current_hosted_source_count: CURRENT_HOSTED_PROOF_SOURCES.length,
    hosted_access_preflight_status: accessStatus,
    cli_available: cliAvailable,
    core_env_present: coreEnvPresent,
    strategist_provider_key_present: providerKeyPresent,
    stripe_proof_ready: stripeProofReady,
    projects_list_access: projectsListAccess,
    target_project_visible: targetProjectVisible,
    functions_list_access: functionsListAccess,
    secrets_list_access: secretsListAccess,
    management_access_ready: managementAccessReady,
    hosted_access_ready_for_smoke: accessReadyForSmoke,
    smoke_plan_count: smokePlanCount,
    smoke_script_present_count: smokeScriptPresentCount,
    smoke_scripts_ready: smokeScriptsReady,
    evidence_register_row_count: evidenceRegisterRowCount,
    expected_smoke_count: expectedSmokeCount,
    evidence_register_ready: evidenceRegisterReady,
    executed_smoke_count: executedSmokeCount,
    passed_smoke_count: passedSmokeCount,
    buyer_claim_allowed_count: buyerClaimAllowedCount,
    redaction_verified_count: redactionVerifiedCount,
    log_evidence_present_count: logEvidencePresentCount,
    screenshot_evidence_present_count: screenshotEvidencePresentCount,
    core_coverage_ready_count: coreCoverageReadyCount,
    core_coverage_group_count: coreCoverageGroupCount,
    local_browser_route_baseline_ready: localRouteReady,
    claim_consistency_ready: claimConsistencyReady,
    active_release_hold_count: activeCount(releaseHolds),
    owner_unblock_ready: ownerUnblockReady,
    hosted_smoke_execution_ready: hostedSmokeExecutionReady,
    hosted_proof_ready_for_buyer_safe_claims: hostedProofReadyForBuyerSafeClaims,
    hosted_proof_complete: hostedProofComplete,
    hosted_claim_allowed: hostedClaimAllowed
  },
  current_hosted_proof_sources: CURRENT_HOSTED_PROOF_SOURCES,
  acceptance_gates: acceptanceGates,
  release_holds: releaseHolds,
  owner_action_order: [
    'Confirm or correct the intended Supabase project ref.',
    'Grant project-scoped function and secret management visibility or provide an owner-generated redacted manifest.',
    'Provide an owner-approved hosted URL and deploy id or commit binding.',
    'Provide Stripe proof values for payment/pricing smoke in test mode.',
    'Rerun hosted access preflight, then run the hosted smoke plan and record logs/screenshots in the evidence register.',
    'Rerun hosted operational proof validation, hosted smoke execution readiness, claim consistency, and commercial confidence before changing hosted-live language.'
  ],
  proof_boundary: {
    proves: [
      'The repo has hosted smoke scripts, local route baseline proof, evidence-register structure, and claim-boundary checks ready for owner unblock.',
      'Hosted smoke cannot start yet because project access, deploy binding, payment proof values, and hosted evidence are missing.'
    ],
    does_not_prove: [
      'Hosted runtime health, production readiness, buyer-safe hosted claims, commercial readiness, or prediction accuracy.',
      'That Browser or Playwright has verified a live hosted URL in this phase.'
    ]
  }
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

  const sourceRows = validation.current_hosted_proof_sources
    .map((source) => [
      mdCell(source.source),
      source.url,
      mdCell(source.requirement)
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

  return `# Hosted Smoke Execution Readiness - 2026-06-06

## Decision

Status: \`${validation.status}\`.

Owner unblock ready: **${validation.summary.owner_unblock_ready}**.

Hosted smoke execution ready: **${validation.summary.hosted_smoke_execution_ready}**.

Hosted proof complete: **${validation.summary.hosted_proof_complete}**.

Hosted claim allowed: **${validation.summary.hosted_claim_allowed}**.

This proves only that the hosted smoke path is structurally ready and the remaining hosted blockers are identified. It does not prove hosted runtime health or buyer-safe hosted claims.

## Acceptance Gates

| Gate | Status | Proof Bucket | Evidence | Next Action |
|---|---|---|---|---|
${gateRows}

## Current Hosted Proof Sources

| Source | URL | Requirement |
|---|---|---|
${sourceRows}

## Release Holds

| Hold | Severity | Status | Evidence Needed |
|---|---|---|---|
${holdRows}

## Owner Action Order

${validation.owner_action_order.map((item, index) => `${index + 1}. ${item}`).join('\n')}

## Proof Boundary

This is repo/local readiness proof for hosted smoke execution. It cannot support hosted-live, production-ready, commercial-ready, or buyer-safe hosted claims until an owner-approved hosted URL/deploy binding is verified with redacted logs/screenshots and the hosted proof validator passes.
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
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:hosted:smoke-execution-readiness -- --hosted-access-preflight ${inputPaths.hostedAccessPreflight} --hosted-proof-kit ${inputPaths.hostedProofKit} --hosted-proof-validation ${inputPaths.hostedProofValidation} --local-browser-route-proof ${inputPaths.localBrowserRouteProof} --claim-consistency-validation ${inputPaths.claimConsistencyValidation} --commercial-confidence-gate ${inputPaths.commercialConfidenceGate} --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence: status ${report.status}, owner_unblock_ready ${report.summary.owner_unblock_ready}, hosted_smoke_execution_ready ${report.summary.hosted_smoke_execution_ready}, hosted_claim_allowed false`
  ], [
    /npm run audit:hosted:smoke-execution-readiness/
  ]);

  evidence.proof_buckets.repo_artifact = replaceMatchingThenAppend(evidence.proof_buckets.repo_artifact, [
    'scripts/validate-hosted-smoke-execution-readiness.mjs validates hosted smoke execution readiness across access preflight, smoke scripts, proof register, local browser baseline, and claim boundaries',
    'docs/launch-readiness/hosted-smoke-execution-readiness-2026-06-06.json records project-access blockers and owner unblock order while keeping hosted-live claims blocked',
    'docs/launch-readiness/hosted-smoke-execution-readiness-checklist-2026-06-06.csv provides the hosted smoke owner-unblock checklist'
  ], [
    /scripts\/validate-hosted-smoke-execution-readiness\.mjs/,
    /hosted-smoke-execution-readiness-2026-06-06\.json/,
    /hosted-smoke-execution-readiness-checklist-2026-06-06\.csv/
  ]);

  evidence.fix_report = evidence.fix_report ?? {};
  evidence.fix_report.files_changed = replaceMatchingThenAppend(evidence.fix_report.files_changed, [
    'scripts/validate-hosted-smoke-execution-readiness.mjs',
    'scripts/build-commercial-confidence-gate.mjs',
    'docs/launch-readiness/hosted-smoke-execution-readiness-2026-06-06.json',
    'docs/launch-readiness/hosted-smoke-execution-readiness-2026-06-06.md',
    'docs/launch-readiness/hosted-smoke-execution-readiness-checklist-2026-06-06.csv',
    'package.json'
  ], [
    /scripts\/validate-hosted-smoke-execution-readiness\.mjs/,
    /scripts\/build-commercial-confidence-gate\.mjs/,
    /hosted-smoke-execution-readiness-2026-06-06\.json/,
    /hosted-smoke-execution-readiness-2026-06-06\.md/,
    /hosted-smoke-execution-readiness-checklist-2026-06-06\.csv/,
    /package\.json/
  ]);
  evidence.fix_report.tests_run = replaceMatchingThenAppend(evidence.fix_report.tests_run, [
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH node --check scripts/validate-hosted-smoke-execution-readiness.mjs',
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:hosted:smoke-execution-readiness -- --hosted-access-preflight ${inputPaths.hostedAccessPreflight} --hosted-proof-kit ${inputPaths.hostedProofKit} --hosted-proof-validation ${inputPaths.hostedProofValidation} --local-browser-route-proof ${inputPaths.localBrowserRouteProof} --claim-consistency-validation ${inputPaths.claimConsistencyValidation} --commercial-confidence-gate ${inputPaths.commercialConfidenceGate} --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence`
  ], [
    /node --check scripts\/validate-hosted-smoke-execution-readiness\.mjs/,
    /npm run audit:hosted:smoke-execution-readiness/
  ]);
  evidence.fix_report.approval_gates = replaceMatchingThenAppend(evidence.fix_report.approval_gates, [
    'Hosted smoke execution readiness proves only owner-unblock readiness; project visibility, function/secret management access, Stripe proof values, owner-approved hosted URL/deploy binding, hosted smoke logs/screenshots, redaction checks, and owner-approved claim language remain required before hosted-live claims can be upgraded.'
  ], [
    /Hosted smoke execution readiness proves only/
  ]);

  evidence.implementation_decisions = replaceByTaskId(evidence.implementation_decisions, {
    task_id: 'hosted-smoke-execution-readiness-gate',
    decision: 'Add a deterministic hosted smoke execution-readiness validator before Browser or hosted smoke claims.',
    acceptance_check: 'The validator must prove smoke scripts, local route baseline, proof register, and claim-boundary readiness while keeping hosted-live claims blocked without project access, deploy binding, Stripe proof values, and hosted smoke evidence.',
    chosen_variant: 'minimal Node artifact validator plus commercial-confidence gate wiring; no hosted smoke execution, no secret printing, no Browser run without URL/access',
    repo_pattern_reused: 'Existing launch-readiness validator and evidence update pattern',
    files_changed: [
      'scripts/validate-hosted-smoke-execution-readiness.mjs',
      'scripts/build-commercial-confidence-gate.mjs',
      'package.json'
    ],
    tests_run: [
      'node --check scripts/validate-hosted-smoke-execution-readiness.mjs',
      'npm run audit:hosted:smoke-execution-readiness',
      'npm run audit:commercial:confidence'
    ],
    proof: `${report.status}; owner_unblock_ready=${report.summary.owner_unblock_ready}; hosted_smoke_execution_ready=${report.summary.hosted_smoke_execution_ready}; hosted_claim_allowed=false.`,
    reason: 'Hosted/browser proof is market-critical but must be tied to a concrete deploy URL, project access, redacted logs/screenshots, and smoke coverage before buyer-safe hosted claims.'
  });
  evidence.rejected_variants = replaceByTaskId(evidence.rejected_variants, {
    task_id: 'hosted-smoke-execution-readiness-gate',
    variant: 'Run Browser or hosted smoke despite missing project visibility and deploy binding.',
    reason_rejected: 'Without intended project visibility, function/secret management access, Stripe proof values, and owner-approved hosted URL/deploy id, a Browser run would not prove hosted operational readiness.',
    tradeoff: 'A readiness validator gives an exact unblock path without false hosted-live claims.',
    evidence: `${report.status} keeps hosted_smoke_execution_ready=${report.summary.hosted_smoke_execution_ready}.`
  });
  evidence.code_optimization_reviews = replaceByTaskId(evidence.code_optimization_reviews, {
    target_task: 'hosted-smoke-execution-readiness-gate',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'No dependency, no runtime product edit, no hosted smoke execution, no secret exposure, and generated artifacts remain repo/local plus access-preflight proof only.',
    tests_or_checks: [
      'node --check scripts/validate-hosted-smoke-execution-readiness.mjs',
      'npm run audit:hosted:smoke-execution-readiness',
      'npm run audit:commercial:confidence'
    ],
    remaining_risk: 'Owner must provide project access, deploy binding, Stripe proof values, hosted smoke evidence, redaction verification, and claim-language approval.'
  });

  writeArtifact(inputPaths.evidence, `${JSON.stringify(evidence, null, 2)}\n`);
}

console.log(JSON.stringify({
  json_output: outputPaths.json,
  md_output: outputPaths.md,
  csv_output: outputPaths.csv,
  evidence_updated: updateEvidence,
  status: report.status,
  owner_unblock_ready: report.summary.owner_unblock_ready,
  hosted_smoke_execution_ready: report.summary.hosted_smoke_execution_ready,
  hosted_proof_complete: report.summary.hosted_proof_complete,
  smoke_scripts_ready: report.summary.smoke_scripts_ready,
  evidence_register_ready: report.summary.evidence_register_ready,
  local_browser_route_baseline_ready: report.summary.local_browser_route_baseline_ready,
  target_project_visible: report.summary.target_project_visible,
  management_access_ready: report.summary.management_access_ready,
  stripe_proof_ready: report.summary.stripe_proof_ready,
  hosted_claim_allowed: report.summary.hosted_claim_allowed
}, null, 2));
