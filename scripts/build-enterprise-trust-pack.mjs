#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const ROOT = process.cwd();

const DEFAULT_EVIDENCE = 'docs/launch-readiness/launch-evidence-2026-06-06.json';
const DEFAULT_CONFIDENCE_GATE = 'docs/launch-readiness/commercial-confidence-gate-2026-06-06.json';
const DEFAULT_RLS_CLASSIFICATION = 'docs/launch-readiness/rls-table-classification-register-2026-06-06.json';
const DEFAULT_RLS_TEST_PLAN = 'docs/launch-readiness/rls-identity-and-review-test-plan-2026-06-06.json';
const DEFAULT_RLS_DRAFT = 'docs/launch-readiness/rls-identity-and-review-policy-draft-2026-06-06.json';
const DEFAULT_HOSTED_PROOF_KIT = 'docs/launch-readiness/hosted-operational-proof-kit-2026-06-06.json';
const DEFAULT_FORECAST_PROTOCOL = 'docs/launch-readiness/forecast-evaluation-protocol-2026-06-06.json';
const DEFAULT_ACCURACY_INTAKE = 'docs/launch-readiness/accuracy-evidence-intake-kit-2026-06-06.json';
const DEFAULT_PILOT_OFFER = 'docs/launch-readiness/pilot-offer-pack-2026-06-06.json';
const DEFAULT_LLM_SECURITY_AUDIT = 'docs/launch-readiness/llm-security-readiness-audit-2026-06-06.json';
const DEFAULT_AI_ACTION_INVENTORY = 'docs/launch-readiness/ai-action-inventory-2026-06-06.json';
const DEFAULT_AI_ACTION_POLICY = 'docs/launch-readiness/ai-high-impact-action-policy-2026-06-06.json';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/enterprise-trust-pack-2026-06-06.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/enterprise-trust-pack-2026-06-06.md';
const DEFAULT_CSV_OUTPUT = 'docs/launch-readiness/enterprise-security-questionnaire-2026-06-06.csv';

function argValue(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function usage() {
  console.error([
    'Usage: node scripts/build-enterprise-trust-pack.mjs',
    `  [--evidence ${DEFAULT_EVIDENCE}]`,
    `  [--confidence-gate ${DEFAULT_CONFIDENCE_GATE}]`,
    `  [--rls-classification ${DEFAULT_RLS_CLASSIFICATION}]`,
    `  [--rls-test-plan ${DEFAULT_RLS_TEST_PLAN}]`,
    `  [--rls-draft ${DEFAULT_RLS_DRAFT}]`,
    `  [--hosted-proof-kit ${DEFAULT_HOSTED_PROOF_KIT}]`,
    `  [--forecast-protocol ${DEFAULT_FORECAST_PROTOCOL}]`,
    `  [--accuracy-intake ${DEFAULT_ACCURACY_INTAKE}]`,
    `  [--pilot-offer ${DEFAULT_PILOT_OFFER}]`,
    `  [--llm-security-audit ${DEFAULT_LLM_SECURITY_AUDIT}]`,
    `  [--ai-action-inventory ${DEFAULT_AI_ACTION_INVENTORY}]`,
    `  [--ai-action-policy ${DEFAULT_AI_ACTION_POLICY}]`,
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
  confidenceGate: argValue('--confidence-gate', DEFAULT_CONFIDENCE_GATE),
  rlsClassification: argValue('--rls-classification', DEFAULT_RLS_CLASSIFICATION),
  rlsTestPlan: argValue('--rls-test-plan', DEFAULT_RLS_TEST_PLAN),
  rlsDraft: argValue('--rls-draft', DEFAULT_RLS_DRAFT),
  hostedProofKit: argValue('--hosted-proof-kit', DEFAULT_HOSTED_PROOF_KIT),
  forecastProtocol: argValue('--forecast-protocol', DEFAULT_FORECAST_PROTOCOL),
  accuracyIntake: argValue('--accuracy-intake', DEFAULT_ACCURACY_INTAKE),
  pilotOffer: argValue('--pilot-offer', DEFAULT_PILOT_OFFER),
  llmSecurityAudit: argValue('--llm-security-audit', DEFAULT_LLM_SECURITY_AUDIT),
  aiActionInventory: argValue('--ai-action-inventory', DEFAULT_AI_ACTION_INVENTORY),
  aiActionPolicy: argValue('--ai-action-policy', DEFAULT_AI_ACTION_POLICY)
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

const evidence = readJsonIfExists(inputPaths.evidence, {
  launch_decision: 'unknown',
  proof_buckets: { hosted_live: [], local: [], repo_artifact: [] },
  fix_report: { tests_run: [] },
  gaps: []
});
const confidenceGate = readJsonIfExists(inputPaths.confidenceGate, {
  posture: {},
  dimensions: []
});
const rlsClassification = readJsonIfExists(inputPaths.rlsClassification, {
  summary: {},
  source: {}
});
const rlsTestPlan = readJsonIfExists(inputPaths.rlsTestPlan, {
  summary: {},
  source: {}
});
const rlsDraft = readJsonIfExists(inputPaths.rlsDraft, {
  summary: {},
  source: {},
  commercial_security_status: 'missing'
});
const hostedProofKit = readJsonIfExists(inputPaths.hostedProofKit, {
  status: 'missing',
  smoke_plan: []
});
const forecastProtocol = readJsonIfExists(inputPaths.forecastProtocol, {
  status: 'missing',
  protocol_stages: [],
  metric_suite: [],
  claim_tiers: []
});
const accuracyIntake = readJsonIfExists(inputPaths.accuracyIntake, {
  status: 'missing',
  acceptance_gates: []
});
const pilotOffer = readJsonIfExists(inputPaths.pilotOffer, {
  status: 'missing',
  pilot_offer: {},
  niche_offer_sequence: []
});
const llmSecurityAudit = readJsonIfExists(inputPaths.llmSecurityAudit, {
  status: 'missing',
  summary: {
    required_control_count: 0,
    covered_static_count: 0,
    local_red_team_executed_count: 0,
    local_red_team_passed_count: 0,
    local_red_team_proof_score_percent: 0,
    runtime_red_team_executed_count: 0,
    runtime_red_team_proof_score_percent: 0,
    red_team_fixture_count: 0
  },
  red_team_fixtures: []
});
const aiActionInventory = readJsonIfExists(inputPaths.aiActionInventory, {
  status: 'missing',
  summary: {
    action_surface_count: 0,
    high_impact_product_action_count: 0,
    direct_llm_to_irreversible_action_count: 0,
    static_gate_complete_hosted_unverified_count: 0,
    partial_static_gate_count: 0,
    hosted_verified_count: 0
  },
  action_surfaces: []
});
const aiActionPolicy = readJsonIfExists(inputPaths.aiActionPolicy, {
  status: 'missing',
  summary: {
    policy_surface_count: 0,
    approval_required_surface_count: 0,
    hosted_boundary_test_count: 0,
    static_boundary_test_count: 0,
    hosted_verified_test_count: 0,
    owner_approved_policy_count: 0
  },
  boundary_tests: []
});

const dimensionById = new Map((confidenceGate.dimensions ?? []).map((dimension) => [dimension.id, dimension]));
const hostedProofCount = Array.isArray(evidence.proof_buckets?.hosted_live)
  ? evidence.proof_buckets.hosted_live.length
  : 0;
const localProofCount = Array.isArray(evidence.proof_buckets?.local)
  ? evidence.proof_buckets.local.length
  : 0;
const repoProofCount = Array.isArray(evidence.proof_buckets?.repo_artifact)
  ? evidence.proof_buckets.repo_artifact.length
  : 0;
const hostedSmokePlanCount = Array.isArray(hostedProofKit.smoke_plan) ? hostedProofKit.smoke_plan.length : 0;
const hostedSmokePresentCount = (hostedProofKit.smoke_plan ?? []).filter((check) => check.script_exists).length;
const testsRun = Array.isArray(evidence.fix_report?.tests_run) ? evidence.fix_report.tests_run : [];
const llmSecurityAuditReady = [
  'llm_security_readiness_audit_ready_not_runtime_redteam_proof',
  'llm_security_local_red_team_passed_not_hosted_proof'
].includes(llmSecurityAudit.status);
const llmStaticControlCount = Number(llmSecurityAudit.summary?.covered_static_count ?? 0);
const llmRequiredControlCount = Number(llmSecurityAudit.summary?.required_control_count ?? 0);
const llmFixtureCount = Number(llmSecurityAudit.summary?.red_team_fixture_count ?? llmSecurityAudit.red_team_fixtures?.length ?? 0);
const llmLocalExecutedFixtureCount = Number(llmSecurityAudit.summary?.local_red_team_executed_count ?? 0);
const llmLocalPassedFixtureCount = Number(llmSecurityAudit.summary?.local_red_team_passed_count ?? 0);
const llmLocalProofScore = Number(llmSecurityAudit.summary?.local_red_team_proof_score_percent ?? 0);
const llmExecutedFixtureCount = Number(llmSecurityAudit.summary?.runtime_red_team_executed_count ?? 0);
const llmRuntimeProofScore = Number(llmSecurityAudit.summary?.runtime_red_team_proof_score_percent ?? 0);
const llmLocalTestsPassed = llmFixtureCount > 0 && llmLocalPassedFixtureCount === llmFixtureCount;
const aiActionInventoryReady = aiActionInventory.status === 'ai_action_inventory_ready_high_impact_gates_partial_not_hosted_proof';
const aiActionSurfaceCount = Number(aiActionInventory.summary?.action_surface_count ?? aiActionInventory.action_surfaces?.length ?? 0);
const aiHighImpactActionCount = Number(aiActionInventory.summary?.high_impact_product_action_count ?? 0);
const aiDirectIrreversibleActionCount = Number(aiActionInventory.summary?.direct_llm_to_irreversible_action_count ?? 0);
const aiStaticGateCompleteCount = Number(aiActionInventory.summary?.static_gate_complete_hosted_unverified_count ?? 0);
const aiPartialGateCount = Number(aiActionInventory.summary?.partial_static_gate_count ?? 0);
const aiHostedVerifiedCount = Number(aiActionInventory.summary?.hosted_verified_count ?? 0);
const aiActionPolicyReady = aiActionPolicy.status === 'draft_high_impact_action_policy_ready_not_owner_approved_or_hosted_tested';
const aiPolicySurfaceCount = Number(aiActionPolicy.summary?.policy_surface_count ?? 0);
const aiApprovalRequiredSurfaceCount = Number(aiActionPolicy.summary?.approval_required_surface_count ?? 0);
const aiHostedBoundaryTestCount = Number(aiActionPolicy.summary?.hosted_boundary_test_count ?? 0);
const aiStaticBoundaryTestCount = Number(aiActionPolicy.summary?.static_boundary_test_count ?? 0);
const aiHostedVerifiedTestCount = Number(aiActionPolicy.summary?.hosted_verified_test_count ?? 0);
const aiOwnerApprovedPolicyCount = Number(aiActionPolicy.summary?.owner_approved_policy_count ?? 0);

const currentSourceAlignment = [
  {
    framework: 'NIST AI RMF',
    source_url: 'https://www.nist.gov/itl/ai-risk-management-framework',
    current_basis: 'Voluntary AI risk management for trustworthy AI systems, including design, development, use, and evaluation.',
    trust_pack_implication: 'Treat governance, measurement, lifecycle risk, and critical-infrastructure trust as procurement evidence gates.'
  },
  {
    framework: 'NIST AI RMF Core',
    source_url: 'https://airc.nist.gov/airmf-resources/airmf/5-sec-core/',
    current_basis: 'The core functions are govern, map, measure, and manage, with governance cross-cutting the lifecycle.',
    trust_pack_implication: 'Map the app to govern/map/measure/manage evidence instead of relying on generic responsible-AI copy.'
  },
  {
    framework: 'NIST SSDF SP 800-218',
    source_url: 'https://csrc.nist.gov/pubs/sp/800/218/final',
    current_basis: 'SSDF gives producers and purchasers a common secure-development vocabulary for acquisition conversations.',
    trust_pack_implication: 'Use repeatable tests, dependency scans, least-privilege RLS, and release evidence as buyer-facing proof.'
  },
  {
    framework: 'CISA Secure by Design',
    source_url: 'https://www.cisa.gov/resources-tools/resources/secure-by-design',
    current_basis: 'Secure by Design emphasizes ownership of customer security outcomes, transparency, accountability, and leadership commitment.',
    trust_pack_implication: 'Do not transfer verification burden to buyers; show explicit owner gates and redacted proof paths.'
  },
  {
    framework: 'CISA Secure by Demand Guide',
    source_url: 'https://www.cisa.gov/resources-tools/resources/secure-demand-guide',
    current_basis: 'Buyer-side procurement should ask software suppliers direct questions about secure-by-design practices.',
    trust_pack_implication: 'Provide a procurement questionnaire that separates current proof, missing proof, and allowed claims.'
  },
  {
    framework: 'OWASP GenAI/LLM Top 10 2025',
    source_url: 'https://genai.owasp.org/llm-top-10/',
    current_basis: 'The 2025 risks include prompt injection, sensitive information disclosure, supply chain, output handling, excessive agency, misinformation, and unbounded consumption.',
    trust_pack_implication: 'Add LLM threat questions before any enterprise or public-sector AI claim is upgraded.'
  },
  {
    framework: 'ISO/IEC 42001:2023',
    source_url: 'https://www.iso.org/standard/42001',
    current_basis: 'ISO/IEC 42001 defines requirements for an AI management system and is applicable across public and private sectors.',
    trust_pack_implication: 'Position this pack as pre-certification evidence mapping, not ISO certification or an audited AI management system.'
  }
];

const trustDomains = [
  {
    id: 'access_and_entitlements',
    domain: 'Authentication, accounts, and entitlements',
    current_evidence: [
      inputPaths.hostedProofKit,
      `${hostedSmokePresentCount}/${hostedSmokePlanCount} hosted proof-kit scripts are present`,
      'Hosted auth and entitlement proof remains unexecuted in this evidence set'
    ],
    proof_status: hostedProofCount > 0 ? 'partial_hosted_proof' : 'proof_kit_ready_not_hosted_proof',
    buyer_risk: 'Paid pilots can stall if account creation, gated access, and entitlement behavior are not demonstrated on the hosted environment.',
    next_gate: 'Run hosted auth and entitlement smoke after owner-approved hosted URL, deployed release, secrets, and smoke-user policy.'
  },
  {
    id: 'rls_object_authorization',
    domain: 'RLS, tenant isolation, and object authorization',
    current_evidence: [
      `${inputPaths.rlsClassification}: ${rlsClassification.summary?.pending_owner_classification_count ?? 0} pending owner classifications`,
      `${inputPaths.rlsDraft}: ${rlsDraft.summary?.policy_count_to_drop ?? 0} broad policies to drop and ${rlsDraft.summary?.policy_count_to_create ?? 0} least-privilege policies to create`,
      `${inputPaths.rlsTestPlan}: ${rlsTestPlan.summary?.test_case_count ?? 0} planned pgTAP cases`
    ],
    proof_status: rlsDraft.source?.test_execution_verified ? 'tested' : 'policy_draft_not_applied',
    buyer_risk: 'Enterprise and public-sector procurement will block if public, anonymous, tenant, and reviewer boundaries are not tested.',
    next_gate: 'Owner approves classifications and draft, then one narrow migration plus pgTAP and hosted smoke proof.'
  },
  {
    id: 'hosted_runtime_binding',
    domain: 'Hosted deployment and runtime binding',
    current_evidence: [
      `${hostedProofCount} hosted/live proof entries in ${inputPaths.evidence}`,
      `${inputPaths.hostedProofKit} defines ${hostedSmokePlanCount} hosted smoke checks`
    ],
    proof_status: hostedProofCount > 0 ? 'partial_hosted_proof' : 'hosted_proof_absent',
    buyer_risk: 'Local proof and generated kits do not prove the buyer-visible hosted app.',
    next_gate: 'Attach deploy id, hosted URL, redacted logs, screenshots, and smoke outputs.'
  },
  {
    id: 'llm_and_genai_security',
    domain: 'LLM and GenAI application security',
    current_evidence: [
      'Prompt, evidence, and review workflow exists in repo artifacts',
      llmSecurityAuditReady
        ? `${inputPaths.llmSecurityAudit}: ${llmStaticControlCount}/${llmRequiredControlCount} OWASP LLM control areas have static evidence, ${llmLocalPassedFixtureCount}/${llmFixtureCount} local fixtures passed, and hosted runtime proof remains ${llmRuntimeProofScore}%`
        : `${inputPaths.llmSecurityAudit} is missing or not ready`,
      aiActionInventoryReady
        ? `${inputPaths.aiActionInventory}: ${aiActionSurfaceCount} action surfaces, ${aiHighImpactActionCount} high-impact product actions, ${aiDirectIrreversibleActionCount} direct LLM-to-irreversible actions found, ${aiHostedVerifiedCount} hosted-verified surfaces`
        : `${inputPaths.aiActionInventory} is missing or not ready`,
      aiActionPolicyReady
        ? `${inputPaths.aiActionPolicy}: ${aiPolicySurfaceCount} policy surfaces, ${aiApprovalRequiredSurfaceCount} approval-required surfaces, ${aiHostedBoundaryTestCount} hosted boundary tests specified, ${aiHostedVerifiedTestCount} hosted tests verified`
        : `${inputPaths.aiActionPolicy} is missing or not ready`,
      `${llmLocalExecutedFixtureCount} local red-team fixtures executed; ${llmExecutedFixtureCount} hosted runtime red-team fixtures executed`,
      'Unsafe eval was removed from outcome forecasting in an earlier safe-fix phase'
    ],
    proof_status: llmLocalTestsPassed ? 'local_redteam_passed_hosted_redteam_missing' : llmSecurityAuditReady ? 'static_audit_ready_runtime_redteam_missing' : 'questionnaire_ready_tests_missing',
    buyer_risk: 'LLM prompt injection, sensitive-data disclosure, output handling, and excessive agency risks can undermine public-sector trust.',
    next_gate: llmLocalTestsPassed
      ? 'Run the same non-secret fixture set against owner-approved hosted LLM flows with redacted logs and screenshots.'
      : 'Convert the defined red-team fixtures into runnable tests and execute them locally and, after owner approval, against hosted LLM flows.'
  },
  {
    id: 'forecast_evaluation_governance',
    domain: 'Forecast evaluation and claim governance',
    current_evidence: [
      `${inputPaths.forecastProtocol}: ${forecastProtocol.protocol_stages?.length ?? 0} protocol stages`,
      `${inputPaths.accuracyIntake}: ${(accuracyIntake.acceptance_gates ?? []).length} acceptance gates`,
      `Prediction accuracy score: ${dimensionById.get('prediction_accuracy_proof')?.current_score_percent ?? 'unknown'}%`
    ],
    proof_status: forecastProtocol.status ?? 'missing',
    buyer_risk: 'Accuracy and world-class language will create reputational and legal risk unless it is backed by resolved outcomes and comparable baselines.',
    next_gate: 'Score owner-approved resolved forecasts with Brier/reliability metrics and real human/community/pro/external baselines.'
  },
  {
    id: 'source_provenance_reliability',
    domain: 'Data source provenance, freshness, and reliability',
    current_evidence: [
      'Market/feed reliability remains mixed in the launch gaps',
      'Hosted non-simulated feed proof is not attached',
      'Pilot offer keeps source and forecast language scoped'
    ],
    proof_status: 'provenance_controls_partial_feed_sla_missing',
    buyer_risk: 'Strategic-intelligence buyers need source labels, recency, degraded-feed warnings, and explicit non-simulation proof.',
    next_gate: 'Run hosted data-provider smoke and add source freshness/SLA labels before operational monitoring claims.'
  },
  {
    id: 'dependency_and_supply_chain',
    domain: 'Dependency and software supply chain',
    current_evidence: [
      testsRun.find((check) => check.includes('npm audit --audit-level=moderate')) ?? 'npm audit proof not found in tests_run',
      'No new dependency is added by this trust-pack generator'
    ],
    proof_status: testsRun.some((check) => check.includes('npm audit --audit-level=moderate')) ? 'local_audit_clean' : 'needs_refresh',
    buyer_risk: 'Buyers may ask for dependency audit, update policy, SBOM, and release provenance.',
    next_gate: 'Keep npm audit clean, add SBOM/release provenance if procurement asks, and avoid new dependencies without evidence.'
  },
  {
    id: 'observability_and_redaction',
    domain: 'Monitoring, incident evidence, and log redaction',
    current_evidence: [
      'Hosted proof kit requires redacted evidence fields',
      'No production incident/monitoring runbook is attached',
      'No live log export is attached'
    ],
    proof_status: 'redaction_plan_ready_monitoring_proof_missing',
    buyer_risk: 'Public-sector and enterprise buyers will ask how issues are detected, triaged, and communicated without leaking sensitive data.',
    next_gate: 'Attach owner-approved monitoring, alerting, incident-response, and log-redaction evidence.'
  },
  {
    id: 'privacy_retention_contracts',
    domain: 'Privacy, retention, DPA, support, and SLA',
    current_evidence: [
      'Not resolved in repository artifacts',
      'Pilot offer keeps scope narrow and buyer-specific',
      'No DPA, retention schedule, support policy, or SLA is attached'
    ],
    proof_status: 'owner_documents_missing',
    buyer_risk: 'Procurement can block even when the app is technically strong if privacy, retention, and support terms are missing.',
    next_gate: 'Owner supplies or approves DPA/privacy/retention/support/SLA terms before enterprise procurement claims.'
  },
  {
    id: 'ai_governance_management_system',
    domain: 'AI governance management system',
    current_evidence: [
      'NIST AI RMF and ISO/IEC 42001 mapped as source anchors',
      'Forecast protocol and confidence gate define evidence thresholds',
      'No ISO/IEC 42001 certification or audited AI management system exists in this evidence set'
    ],
    proof_status: 'framework_mapping_ready_not_certification',
    buyer_risk: 'Governance buyers may require policy owners, risk register, model/system inventory, periodic review, and audit trail.',
    next_gate: 'Create owner-approved AI system inventory, risk register, review cadence, and certification/audit stance if selling to regulated buyers.'
  }
];

const questionnaireRows = [
  {
    domain: 'Commercial claim boundary',
    buyer_question: 'Can this be represented as enterprise-ready or world-class accurate today?',
    current_answer: 'No. The current decision remains pilot-only and market language must stay buyer-safe.',
    evidence_artifact: inputPaths.confidenceGate,
    proof_status: confidenceGate.posture?.decision ?? 'unknown',
    missing_proof: 'Hosted proof, buyer validation, RLS test evidence, and real accuracy baselines.',
    owner_action: 'Approve pilot-only positioning and prohibit world-class prediction claims until evidence gates pass.',
    allowed_claim: 'Governed strategic-intelligence pilot with calibration-aware decision support.'
  },
  {
    domain: 'RLS and object authorization',
    buyer_question: 'Are tenant, user, reviewer, and public/private boundaries enforced and tested?',
    current_answer: 'A first-batch draft and test plan exist, but they are not applied or executed.',
    evidence_artifact: `${inputPaths.rlsClassification}; ${inputPaths.rlsTestPlan}; ${inputPaths.rlsDraft}`,
    proof_status: rlsDraft.commercial_security_status ?? 'policy_draft_not_applied',
    missing_proof: 'Owner classification, migration, pgTAP pass, linked Supabase verification, and hosted smoke.',
    owner_action: 'Review classifications, resolve open owner decisions, and approve one narrow RLS migration.',
    allowed_claim: 'RLS remediation path is drafted; enterprise isolation proof is not complete.'
  },
  {
    domain: 'Public and anonymous exceptions',
    buyer_question: 'Which tables are intentionally public or anonymous, and why?',
    current_answer: 'The classification register identifies public/anonymous exception reviews, but owner decisions are pending.',
    evidence_artifact: inputPaths.rlsClassification,
    proof_status: 'owner_classification_pending',
    missing_proof: 'Approved data category, privacy impact, buyer-safe rationale, and tests for each exception.',
    owner_action: 'Mark every public/anonymous exception as approved, removed, or narrowed.',
    allowed_claim: 'Public/anonymous access is under review.'
  },
  {
    domain: 'Hosted runtime proof',
    buyer_question: 'Does the hosted app match the repo-backed launch surface?',
    current_answer: 'No hosted/live proof is attached; the proof kit defines checks to run after owner-approved access.',
    evidence_artifact: inputPaths.hostedProofKit,
    proof_status: hostedProofCount > 0 ? 'partial_hosted_proof' : 'hosted_proof_absent',
    missing_proof: 'Hosted URL, deploy id, access preflight, auth/schema/function drift, screenshots, and redacted logs.',
    owner_action: 'Provide hosted URL, deployment state, secrets policy, and smoke-user policy, then run hosted proof kit.',
    allowed_claim: 'Hosted proof plan exists; hosted behavior is not proven in this artifact.'
  },
  {
    domain: 'Auth and entitlement controls',
    buyer_question: 'Can paid/premium access and account boundaries be demonstrated?',
    current_answer: 'Scripts exist for hosted diagnostics; no hosted entitlement proof is attached.',
    evidence_artifact: inputPaths.hostedProofKit,
    proof_status: 'proof_kit_ready_not_hosted_proof',
    missing_proof: 'Hosted auth diagnostics, invalid webhook rejection proof, and entitlement table evidence.',
    owner_action: 'Run hosted auth/payment proof after owner-approved secrets and payment test policy.',
    allowed_claim: 'Auth and entitlement proof path is defined.'
  },
  {
    domain: 'LLM prompt injection',
    buyer_question: 'Has the app been tested against prompt injection and instruction override attacks?',
    current_answer: llmSecurityAuditReady
      ? llmLocalTestsPassed
        ? 'Static prompt-injection controls are inventoried and the local non-secret red-team fixtures passed; hosted model-path testing remains pending.'
        : 'Static prompt-injection controls and fixtures are inventoried, but the fixtures have not been executed against runtime model paths.'
      : 'Not as a runnable trust artifact in this phase.',
    evidence_artifact: inputPaths.llmSecurityAudit,
    proof_status: llmLocalTestsPassed ? 'local_redteam_passed_hosted_missing' : llmSecurityAuditReady ? 'static_audit_ready_runtime_redteam_missing' : 'test_missing',
    missing_proof: llmLocalTestsPassed
      ? 'Hosted prompt-injection regression tests with redacted logs and buyer-visible evidence.'
      : 'Executed prompt-injection regression tests covering strategist, evidence, review, and forecast flows.',
    owner_action: llmLocalTestsPassed
      ? 'Approve hosted fixture execution policy, redacted evidence paths, and smoke-user scope.'
      : 'Convert defined fixtures into runnable tests and expected refusal/provenance behavior.',
    allowed_claim: llmLocalTestsPassed ? 'Local prompt-injection regression coverage exists; hosted resistance is not proven.' : llmSecurityAuditReady ? 'Prompt-injection audit plan exists; runtime resistance is not proven.' : 'Prompt-injection test coverage is planned, not complete.'
  },
  {
    domain: 'Sensitive information disclosure',
    buyer_question: 'Can the app prevent or flag sensitive data leakage through LLM output or logs?',
    current_answer: llmSecurityAuditReady
      ? llmLocalTestsPassed
        ? 'Static diagnostics/redaction controls are inventoried and local canary fixtures passed; hosted output/log redaction proof is pending.'
        : 'Static diagnostics/redaction controls and secret-canary fixtures are inventoried, but no runtime secret-leakage proof is attached.'
      : 'Redaction expectations exist in proof kits, but no full hosted redaction proof is attached.',
    evidence_artifact: `${inputPaths.llmSecurityAudit}; ${inputPaths.hostedProofKit}`,
    proof_status: llmLocalTestsPassed ? 'local_redaction_fixture_passed_hosted_missing' : llmSecurityAuditReady ? 'static_audit_ready_runtime_redaction_missing' : 'redaction_plan_ready_not_proven',
    missing_proof: 'Hosted sensitive-data fixtures, log-redaction inspection, and hosted output proof.',
    owner_action: llmLocalTestsPassed ? 'Run hosted redaction and sensitive-output checks with non-secret fixtures after approval.' : 'Run redaction and sensitive-output checks with non-secret fixtures.',
    allowed_claim: llmLocalTestsPassed ? 'Local sensitive-disclosure fixture coverage exists; hosted redaction proof is pending.' : llmSecurityAuditReady ? 'Sensitive-disclosure audit plan exists; runtime redaction proof is pending.' : 'Redaction requirements are specified.'
  },
  {
    domain: 'LLM output handling',
    buyer_question: 'Are LLM outputs validated before downstream use?',
    current_answer: llmSecurityAuditReady
      ? llmLocalTestsPassed
        ? 'Static audit confirms structured schemas, sanitizers, evidence-reference filtering, provenance downgrade, and local adversarial fixture execution.'
        : 'Static audit confirms structured schemas, sanitizers, evidence-reference filtering, and provenance downgrade tests, but cross-route adversarial output fixtures are not executed.'
      : 'The product has review/provenance workflows, but procurement-grade output-handling tests are not attached.',
    evidence_artifact: `${inputPaths.llmSecurityAudit}; ${inputPaths.evidence}`,
    proof_status: llmLocalTestsPassed ? 'local_output_handling_fixtures_passed_hosted_missing' : llmSecurityAuditReady ? 'static_output_controls_present_runtime_fixtures_missing' : 'workflow_evidence_tests_missing',
    missing_proof: llmLocalTestsPassed ? 'Hosted adversarial output fixtures for buyer-critical flows.' : 'Executed malformed JSON, schema-breaking, tool-like, HTML/SQL, and unsafe-content regression checks for buyer-critical flows.',
    owner_action: llmLocalTestsPassed ? 'Run hosted output-handling fixtures with redacted evidence.' : 'Run focused tests for malformed/unsafe model outputs and review escalation.',
    allowed_claim: llmLocalTestsPassed ? 'Local output-handling red-team fixtures passed; hosted model-path coverage is pending.' : llmSecurityAuditReady ? 'Static output-handling controls are present; runtime adversarial coverage is pending.' : 'Human-review-aware output workflow exists; security test proof is pending.'
  },
  {
    domain: 'Excessive agency and tool use',
    buyer_question: 'Can the AI take irreversible or high-impact actions automatically?',
    current_answer: aiActionPolicyReady
      ? `The AI action inventory maps ${aiActionSurfaceCount} action surfaces and ${aiHighImpactActionCount} high-impact product actions. The draft high-impact action policy defines ${aiPolicySurfaceCount} policy surfaces, ${aiApprovalRequiredSurfaceCount} approval-required surfaces, ${aiHostedBoundaryTestCount} hosted boundary tests, and ${aiStaticBoundaryTestCount} static boundary tests. It found ${aiDirectIrreversibleActionCount} direct LLM-to-irreversible-action surfaces, but owner approval count is ${aiOwnerApprovedPolicyCount} and hosted verified test count is ${aiHostedVerifiedTestCount}.`
      : aiActionInventoryReady
      ? `The AI action inventory maps ${aiActionSurfaceCount} action surfaces and ${aiHighImpactActionCount} high-impact product actions. It found ${aiDirectIrreversibleActionCount} direct LLM-to-irreversible-action surfaces, but ${aiHostedVerifiedCount} hosted action-boundary tests are attached.`
      : llmSecurityAuditReady
        ? llmLocalTestsPassed
          ? 'Static audit identifies deterministic auth/review gates and local excessive-agency fixtures passed; the AI action inventory is missing or stale.'
          : 'Static audit identifies deterministic auth/review gates and defines an excessive-agency fixture, but no full AI action inventory or runtime no-action test is attached.'
        : 'This phase did not verify autonomous tool-execution boundaries; launch posture keeps claims as decision support.',
    evidence_artifact: aiActionPolicyReady
      ? `${inputPaths.aiActionPolicy}; ${inputPaths.aiActionInventory}; ${inputPaths.llmSecurityAudit}; ${inputPaths.evidence}`
      : aiActionInventoryReady
      ? `${inputPaths.aiActionInventory}; ${inputPaths.llmSecurityAudit}; ${inputPaths.evidence}`
      : `${inputPaths.llmSecurityAudit}; ${inputPaths.evidence}`,
    proof_status: aiActionPolicyReady
      ? 'draft_action_policy_ready_owner_approval_and_hosted_tests_missing'
      : aiActionInventoryReady
      ? 'action_inventory_ready_hosted_no_action_proof_missing'
      : llmLocalTestsPassed ? 'local_no_autonomous_action_fixture_passed_inventory_missing' : llmSecurityAuditReady ? 'static_agency_controls_partial_action_inventory_missing' : 'claim_scoped_tests_missing',
    missing_proof: aiActionPolicyReady
      ? 'Owner-approved high-impact action policy, hosted no-autonomous-action test execution, RLS proof, payment/webhook invalid-signature proof, and redacted hosted evidence.'
      : aiActionInventoryReady
      ? 'Owner-approved high-impact action policy, hosted no-autonomous-action tests, RLS proof, and payment/webhook invalid-signature proof.'
      : 'Tool/action inventory, high-impact action gates, and no-autonomous-action tests.',
    owner_action: aiActionPolicyReady
      ? 'Review the draft high-impact action policy, approve or edit every approval-required surface, then run hosted action-boundary smoke tests with redacted evidence.'
      : aiActionInventoryReady
      ? 'Approve a high-impact action policy and run hosted action-boundary smoke tests with redacted evidence.'
      : 'Create an AI action inventory and require explicit human approval for high-impact actions.',
    allowed_claim: 'Decision support, not autonomous execution.'
  },
  {
    domain: 'Forecast accuracy and calibration',
    buyer_question: 'What evidence supports prediction accuracy?',
    current_answer: 'Calibration primitives, sample ledger mechanics, and a protocol exist; no real owner-approved resolved-outcome proof exists.',
    evidence_artifact: `${inputPaths.forecastProtocol}; ${inputPaths.accuracyIntake}`,
    proof_status: forecastProtocol.status ?? 'missing',
    missing_proof: 'Owner-approved resolved forecast export, real comparable baselines, leakage review, and hosted calibration proof.',
    owner_action: 'Supply approved forecast/baseline data and run calibration plus benchmark scripts under protocol gates.',
    allowed_claim: 'Calibration-aware workflow only.'
  },
  {
    domain: 'Source provenance and data freshness',
    buyer_question: 'Are external data sources fresh, non-simulated, and labeled?',
    current_answer: 'Some source/provenance mechanics exist; hosted non-simulated proof and SLA labels are missing.',
    evidence_artifact: inputPaths.hostedProofKit,
    proof_status: 'feed_proof_missing',
    missing_proof: 'Hosted provider smoke, freshness timestamps, degraded-feed handling, and source SLA labels.',
    owner_action: 'Run hosted feed checks and add buyer-facing source reliability labels.',
    allowed_claim: 'Evidence-aware workflow with source caveats.'
  },
  {
    domain: 'Dependency and supply chain',
    buyer_question: 'Is there current vulnerability and supply-chain evidence?',
    current_answer: testsRun.some((check) => check.includes('npm audit --audit-level=moderate'))
      ? 'Local dependency audit evidence is present and clean.'
      : 'Dependency audit evidence should be refreshed.',
    evidence_artifact: inputPaths.evidence,
    proof_status: testsRun.some((check) => check.includes('npm audit --audit-level=moderate')) ? 'local_audit_clean' : 'needs_refresh',
    missing_proof: 'Optional SBOM, release provenance, and signed/deployed commit evidence for procurement.',
    owner_action: 'Refresh npm audit before procurement and add SBOM if required.',
    allowed_claim: 'Local dependency audit was clean when last run; release provenance is separate.'
  },
  {
    domain: 'Secure development lifecycle',
    buyer_question: 'Which secure-development controls are repeatable?',
    current_answer: 'Local TypeScript/build/test/audit scripts exist; procurement policy artifacts are not complete.',
    evidence_artifact: inputPaths.evidence,
    proof_status: localProofCount > 0 ? 'local_checks_present' : 'checks_missing',
    missing_proof: 'Secure SDLC policy, change review cadence, vulnerability response SLA, and release checklist owner approval.',
    owner_action: 'Approve a lightweight secure-development and release checklist tied to existing commands.',
    allowed_claim: 'Repeatable local verification exists.'
  },
  {
    domain: 'Monitoring and incident response',
    buyer_question: 'How are incidents detected, triaged, and communicated?',
    current_answer: 'No production incident response or monitoring evidence is attached.',
    evidence_artifact: 'not attached',
    proof_status: 'owner_documents_missing',
    missing_proof: 'Monitoring dashboard, alert routing, incident response process, and breach/support communication stance.',
    owner_action: 'Supply or approve incident, monitoring, and support runbooks.',
    allowed_claim: 'Not ready for incident-response claims.'
  },
  {
    domain: 'Privacy and retention',
    buyer_question: 'What data is stored, retained, deleted, and shared?',
    current_answer: 'This repo evidence does not include an owner-approved privacy, retention, or DPA packet.',
    evidence_artifact: 'not attached',
    proof_status: 'owner_documents_missing',
    missing_proof: 'Data inventory, retention policy, deletion workflow, DPA, subprocessors, and cross-border handling.',
    owner_action: 'Create buyer-specific data/privacy packet before procurement.',
    allowed_claim: 'Pilot data terms must be negotiated or explicitly scoped.'
  },
  {
    domain: 'AI governance management system',
    buyer_question: 'Does the organization have ISO/IEC 42001 certification or equivalent AI governance system?',
    current_answer: 'No certification or audited management system is attached; only framework-aligned evidence mapping exists.',
    evidence_artifact: 'this enterprise trust pack',
    proof_status: 'framework_mapping_ready_not_certification',
    missing_proof: 'AI system inventory, risk register, policy owners, review cadence, audit evidence, and certification decision.',
    owner_action: 'Decide whether pilot sales need ISO/IEC 42001 alignment only or a formal certification path.',
    allowed_claim: 'NIST/ISO-aligned pre-certification evidence mapping.'
  },
  {
    domain: 'Buyer proof and willingness to pay',
    buyer_question: 'Has a buyer accepted the trust posture for a paid pilot?',
    current_answer: 'No real buyer acceptance or paid-pilot signal is attached in this evidence set.',
    evidence_artifact: inputPaths.pilotOffer,
    proof_status: pilotOffer.status ?? 'missing',
    missing_proof: 'Discovery call outcomes, buyer objections, security-questionnaire feedback, and paid/LOI signal.',
    owner_action: 'Use this questionnaire in approved discovery calls and record security objections.',
    allowed_claim: 'Pilot offer is packaged, not buyer validated.'
  },
  {
    domain: 'Support and SLA',
    buyer_question: 'What uptime, support, escalation, and response commitments are available?',
    current_answer: 'No support or SLA document is attached.',
    evidence_artifact: 'not attached',
    proof_status: 'owner_documents_missing',
    missing_proof: 'Pilot support model, escalation owner, uptime boundary, response times, and maintenance window.',
    owner_action: 'Define narrow pilot support terms before paid procurement.',
    allowed_claim: 'Support/SLA terms are pending owner approval.'
  },
  {
    domain: 'Procurement evidence packet',
    buyer_question: 'What can be shared with a security/procurement reviewer today?',
    current_answer: 'This packet can be shared internally as a structured readiness map, not as final proof.',
    evidence_artifact: `${outputPaths.json}; ${outputPaths.md}; ${outputPaths.csv}`,
    proof_status: 'enterprise_trust_pack_ready_not_security_proof',
    missing_proof: 'Owner-approved answers, completed security tests, hosted proof, and legal/privacy attachments.',
    owner_action: 'Owner reviews answers and marks which rows can be shared externally.',
    allowed_claim: 'Procurement-readiness questionnaire draft.'
  }
];

const acceptanceGates = [
  {
    gate: 'owner_table_classification',
    required_evidence: inputPaths.rlsClassification,
    current_status: rlsClassification.source?.owner_classification_verified ? 'passed' : 'blocked_owner_approval',
    command_after_approval: 'review docs/launch-readiness/rls-table-classification-register-2026-06-06.csv and mark owner decisions',
    unlocks: 'narrow RLS migration drafting'
  },
  {
    gate: 'rls_migration_and_pgtap',
    required_evidence: `${inputPaths.rlsDraft}; ${inputPaths.rlsTestPlan}`,
    current_status: rlsDraft.source?.test_execution_verified ? 'passed' : 'blocked_not_applied_or_tested',
    command_after_approval: 'convert approved draft into supabase/migrations plus supabase test db',
    unlocks: 'enterprise isolation proof'
  },
  {
    gate: 'hosted_smoke_and_deploy_binding',
    required_evidence: inputPaths.hostedProofKit,
    current_status: hostedProofCount > 0 ? 'partial' : 'blocked_no_hosted_proof',
    command_after_approval: 'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run diag:hosted:access && npm run smoke:strategist:hosted',
    unlocks: 'buyer-safe hosted demo claims'
  },
  {
    gate: 'llm_security_regression',
    required_evidence: inputPaths.llmSecurityAudit,
    current_status: llmLocalTestsPassed ? 'local_tests_passed_hosted_tests_missing' : llmSecurityAuditReady ? 'static_audit_ready_runtime_tests_missing' : 'blocked_tests_missing',
    command_after_approval: llmLocalTestsPassed
      ? 'Run owner-approved hosted LLM security smoke with non-secret fixtures and redacted logs.'
      : 'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:llm:security, then convert fixtures into runnable prompt-injection/sensitive-disclosure/output-handling regression tests',
    unlocks: 'public-sector AI trust claims'
  },
  {
    gate: 'ai_action_inventory_and_high_impact_policy',
    required_evidence: aiActionPolicyReady ? `${inputPaths.aiActionPolicy}; ${inputPaths.aiActionInventory}` : inputPaths.aiActionInventory,
    current_status: aiActionPolicyReady ? 'draft_policy_ready_owner_approval_and_hosted_tests_missing' : aiActionInventoryReady ? 'inventory_ready_policy_and_hosted_tests_missing' : 'blocked_inventory_missing',
    command_after_approval: aiActionPolicyReady
      ? 'Review the draft high-impact action policy, approve or edit every approval-required surface, then run hosted no-autonomous-action smoke for publication, review, payment/webhook, and post-analysis fanout boundaries.'
      : aiActionInventoryReady
      ? 'Approve high-impact action policy, then run hosted no-autonomous-action smoke for publication, review, payment/webhook, and post-analysis fanout boundaries.'
      : 'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:ai:actions',
    unlocks: 'excessive-agency and no-autonomous-action procurement answers'
  },
  {
    gate: 'forecast_claim_tier',
    required_evidence: `${inputPaths.forecastProtocol}; ${inputPaths.accuracyIntake}`,
    current_status: 'blocked_real_data_missing',
    command_after_approval: 'run audit:calibration:ledger and audit:forecast:benchmark on owner-approved resolved data and baselines',
    unlocks: 'accuracy claim upgrade, if results support it'
  },
  {
    gate: 'privacy_retention_dpa',
    required_evidence: 'owner-supplied legal/privacy packet',
    current_status: 'blocked_owner_documents_missing',
    command_after_approval: 'attach data inventory, retention, deletion, subprocessors, DPA, support, and SLA terms',
    unlocks: 'enterprise procurement packet'
  },
  {
    gate: 'secure_sdlc_packet',
    required_evidence: inputPaths.evidence,
    current_status: testsRun.length > 0 ? 'partial_local_checks_present' : 'blocked_checks_missing',
    command_after_approval: 'refresh npm audit, build, focused tests, and release checklist before external procurement review',
    unlocks: 'secure-development questionnaire answers'
  }
];

const pack = {
  schema_version: 'enterprise-trust-pack-v1',
  generated_at: new Date().toISOString(),
  generated_for_date: '2026-06-06',
  status: 'enterprise_trust_pack_ready_not_security_proof',
  source: {
    ...inputPaths,
    local_proof_count: localProofCount,
    repo_proof_count: repoProofCount,
    hosted_proof_count: hostedProofCount,
    hosted_smoke_plan_count: hostedSmokePlanCount,
    hosted_smoke_present_count: hostedSmokePresentCount,
    llm_security_audit_status: llmSecurityAudit.status ?? 'missing',
    llm_static_control_count: llmStaticControlCount,
    llm_required_control_count: llmRequiredControlCount,
    llm_red_team_fixture_count: llmFixtureCount,
    llm_local_red_team_executed_count: llmLocalExecutedFixtureCount,
    llm_local_red_team_passed_count: llmLocalPassedFixtureCount,
    llm_local_red_team_proof_score_percent: llmLocalProofScore,
    llm_runtime_red_team_executed_count: llmExecutedFixtureCount,
    llm_runtime_red_team_proof_score_percent: llmRuntimeProofScore,
    ai_action_inventory_status: aiActionInventory.status ?? 'missing',
    ai_action_surface_count: aiActionSurfaceCount,
    ai_high_impact_product_action_count: aiHighImpactActionCount,
    ai_direct_llm_to_irreversible_action_count: aiDirectIrreversibleActionCount,
    ai_static_gate_complete_hosted_unverified_count: aiStaticGateCompleteCount,
    ai_partial_static_gate_count: aiPartialGateCount,
    ai_hosted_verified_count: aiHostedVerifiedCount,
    ai_action_policy_status: aiActionPolicy.status ?? 'missing',
    ai_policy_surface_count: aiPolicySurfaceCount,
    ai_approval_required_surface_count: aiApprovalRequiredSurfaceCount,
    ai_hosted_boundary_test_count: aiHostedBoundaryTestCount,
    ai_static_boundary_test_count: aiStaticBoundaryTestCount,
    ai_hosted_verified_test_count: aiHostedVerifiedTestCount,
    ai_owner_approved_policy_count: aiOwnerApprovedPolicyCount,
    questionnaire_row_count: questionnaireRows.length,
    trust_domain_count: trustDomains.length,
    acceptance_gate_count: acceptanceGates.length,
    production_state_verified: Boolean(rlsDraft.source?.production_state_verified),
    owner_classification_verified: Boolean(rlsClassification.source?.owner_classification_verified),
    rls_migration_applied: Boolean(rlsDraft.source?.migration_applied),
    rls_test_execution_verified: Boolean(rlsDraft.source?.test_execution_verified),
    hosted_state_verified: hostedProofCount > 0
  },
  proof_boundary: {
    allowed_use: 'Internal and buyer-prep procurement readiness map for a guided pilot.',
    not_proof_of: [
      'SOC 2, ISO/IEC 42001, ISO/IEC 27001, FedRAMP, or formal security certification',
      'production Supabase policy state',
      'completed RLS remediation',
      'hosted runtime behavior',
      'buyer approval or willingness to pay',
      'world-class prediction accuracy'
    ],
    buyer_safe_positioning: 'Security and AI-governance proof path is explicit, but enterprise security proof remains pending owner approvals and hosted/testing evidence.'
  },
  current_source_alignment: currentSourceAlignment,
  trust_domains: trustDomains,
  procurement_questionnaire: questionnaireRows,
  acceptance_gates: acceptanceGates,
  recommended_external_sharing_gate: [
    'Owner reviews every questionnaire answer and marks rows approved for external sharing.',
    'Remove internal script names, logs, or sensitive architecture details for public-sector procurement where needed.',
    'Attach only redacted hosted smoke evidence and never include secrets.',
    'Keep the prohibited claims list visible in any buyer-facing security packet.'
  ],
  next_commands_after_owner_approval: [
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:enterprise:trust-pack',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:ai:actions',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:ai:action-policy',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:llm:security',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:rls:policy-draft',
    'supabase test db',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run diag:hosted:access',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run smoke:strategist:hosted',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:commercial:confidence'
  ]
};

function renderMarkdown(report) {
  const sourceRows = report.current_source_alignment
    .map((source) => [
      mdCell(source.framework),
      source.source_url,
      mdCell(source.trust_pack_implication)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const domainRows = report.trust_domains
    .map((domain) => [
      mdCell(domain.domain),
      mdCell(domain.proof_status),
      mdCell(domain.buyer_risk),
      mdCell(domain.next_gate)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const questionnaireRowsMd = report.procurement_questionnaire
    .map((row) => [
      mdCell(row.domain),
      mdCell(row.buyer_question),
      mdCell(row.proof_status),
      mdCell(row.allowed_claim)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const gateRows = report.acceptance_gates
    .map((gate) => [
      mdCell(gate.gate),
      mdCell(gate.current_status),
      mdCell(gate.required_evidence),
      mdCell(gate.unlocks)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  return `# Enterprise Trust Pack - 2026-06-06

## Decision

Status: \`${report.status}\`.

This packet converts the current commercial-readiness evidence into an enterprise/public-sector procurement and AI-governance questionnaire. It is a readiness artifact, not security certification, hosted proof, buyer validation, or prediction-accuracy proof.

Buyer-safe position:

> ${report.proof_boundary.buyer_safe_positioning}

## Proof Boundary

Allowed use: ${report.proof_boundary.allowed_use}

Not proof of:

${report.proof_boundary.not_proof_of.map((item) => `- ${item}`).join('\n')}

## Current Source Alignment

| Framework | Source | Procurement Implication |
|---|---|---|
${sourceRows}

## Trust Domains

| Domain | Proof Status | Buyer Risk | Next Gate |
|---|---|---|---|
${domainRows}

## Procurement Questionnaire

| Domain | Buyer Question | Proof Status | Allowed Claim |
|---|---|---|---|
${questionnaireRowsMd}

## Acceptance Gates

| Gate | Current Status | Required Evidence | Unlocks |
|---|---|---|---|
${gateRows}

## External Sharing Gate

${report.recommended_external_sharing_gate.map((item, index) => `${index + 1}. ${item}`).join('\n')}

## Next Commands After Owner Approval

${report.next_commands_after_owner_approval.map((item) => `- \`${item}\``).join('\n')}
`;
}

function renderCsv(report) {
  const headers = [
    'domain',
    'buyer_question',
    'current_answer',
    'evidence_artifact',
    'proof_status',
    'missing_proof',
    'owner_action',
    'allowed_claim'
  ];

  return [
    csvLine(headers),
    ...report.procurement_questionnaire.map((row) => csvLine(headers.map((header) => row[header])))
  ].join('\n') + '\n';
}

if (outputPaths.json) {
  writeArtifact(outputPaths.json, `${JSON.stringify(pack, null, 2)}\n`);
}

if (outputPaths.md) {
  writeArtifact(outputPaths.md, renderMarkdown(pack));
}

if (outputPaths.csv) {
  writeArtifact(outputPaths.csv, renderCsv(pack));
}

console.log(JSON.stringify({
  json_output: outputPaths.json,
  md_output: outputPaths.md,
  csv_output: outputPaths.csv,
  status: pack.status,
  trust_domain_count: pack.source.trust_domain_count,
  questionnaire_row_count: pack.source.questionnaire_row_count,
  acceptance_gate_count: pack.source.acceptance_gate_count,
  hosted_state_verified: pack.source.hosted_state_verified,
  rls_test_execution_verified: pack.source.rls_test_execution_verified
}, null, 2));
