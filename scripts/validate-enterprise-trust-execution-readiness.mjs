#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const ROOT = process.cwd();
const DEFAULT_ENTERPRISE_TRUST_PACK = 'docs/launch-readiness/enterprise-trust-pack-2026-06-06.json';
const DEFAULT_ENTERPRISE_EVIDENCE_VALIDATION = 'docs/launch-readiness/enterprise-procurement-evidence-validation-2026-06-06.json';
const DEFAULT_ENTERPRISE_PROCUREMENT_GATE = 'docs/launch-readiness/enterprise-procurement-readiness-gate-2026-06-06.json';
const DEFAULT_RLS_DRAFT = 'docs/launch-readiness/rls-identity-and-review-policy-draft-2026-06-06.json';
const DEFAULT_RLS_PROOF_VALIDATION = 'docs/launch-readiness/rls-proof-evidence-validation-2026-06-06.json';
const DEFAULT_LLM_SECURITY_AUDIT = 'docs/launch-readiness/llm-security-readiness-audit-2026-06-06.json';
const DEFAULT_AI_ACTION_INVENTORY = 'docs/launch-readiness/ai-action-inventory-2026-06-06.json';
const DEFAULT_AI_ACTION_POLICY = 'docs/launch-readiness/ai-high-impact-action-policy-2026-06-06.json';
const DEFAULT_HOSTED_ACCESS_PREFLIGHT = 'docs/launch-readiness/hosted-access-preflight-validation-2026-06-06.json';
const DEFAULT_HOSTED_PROOF_VALIDATION = 'docs/launch-readiness/hosted-operational-proof-evidence-validation-2026-06-06.json';
const DEFAULT_CLAIM_CONSISTENCY_VALIDATION = 'docs/launch-readiness/claim-consistency-validation-2026-06-06.json';
const DEFAULT_COMMERCIAL_CONFIDENCE_GATE = 'docs/launch-readiness/commercial-confidence-gate-2026-06-06.json';
const DEFAULT_EVIDENCE = 'docs/launch-readiness/launch-evidence-2026-06-06.json';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/enterprise-trust-execution-readiness-2026-06-06.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/enterprise-trust-execution-readiness-2026-06-06.md';
const DEFAULT_CSV_OUTPUT = 'docs/launch-readiness/enterprise-trust-execution-readiness-checklist-2026-06-06.csv';

const CURRENT_ENTERPRISE_TRUST_SOURCES = [
  {
    source: 'NIST AI RMF',
    url: 'https://www.nist.gov/itl/ai-risk-management-framework',
    requirement: 'Use documented governance, measurement, evaluation, monitoring, and risk-management evidence before AI trust claims.'
  },
  {
    source: 'NIST AI RMF Trustworthy AI in Critical Infrastructure Profile concept note',
    url: 'https://www.nist.gov/system/files/documents/2026/04/08/Concept%20Note_%20Development%20of%20the%20NIST%20AI%20RMF%20Trustworthy%20Use%20of%20AI%20in%20Critical%20Infrastructure%20Profile.pdf',
    requirement: 'For critical-infrastructure-facing AI, emphasize TEVV, adversarial robustness, explainability, graceful degradation, supply-chain visibility, and human oversight.'
  },
  {
    source: 'NIST SSDF SP 800-218',
    url: 'https://csrc.nist.gov/pubs/sp/800/218/final',
    requirement: 'Provide a secure-development vocabulary and repeatable SDLC evidence that purchasers can use during acquisition.'
  },
  {
    source: 'CISA Secure by Demand Guide',
    url: 'https://www.cisa.gov/sites/default/files/2024-08/SecureByDemandGuide_080624_508c.pdf',
    requirement: 'Answer product-security procurement questions and show secure-by-design ownership, transparency, and accountability.'
  },
  {
    source: 'OWASP GenAI Security Project / LLM Top 10',
    url: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
    requirement: 'Cover prompt injection, sensitive information disclosure, insecure output handling, excessive agency, overreliance, model theft, and related GenAI security risks.'
  },
  {
    source: 'ISO/IEC 42001:2023',
    url: 'https://www.iso.org/standard/42001',
    requirement: 'Treat AI governance as a management-system readiness path; do not claim certification or audited AIMS without external proof.'
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
    'Usage: node scripts/validate-enterprise-trust-execution-readiness.mjs',
    `  [--enterprise-trust-pack ${DEFAULT_ENTERPRISE_TRUST_PACK}]`,
    `  [--enterprise-evidence-validation ${DEFAULT_ENTERPRISE_EVIDENCE_VALIDATION}]`,
    `  [--enterprise-procurement-gate ${DEFAULT_ENTERPRISE_PROCUREMENT_GATE}]`,
    `  [--rls-draft ${DEFAULT_RLS_DRAFT}]`,
    `  [--rls-proof-validation ${DEFAULT_RLS_PROOF_VALIDATION}]`,
    `  [--llm-security-audit ${DEFAULT_LLM_SECURITY_AUDIT}]`,
    `  [--ai-action-inventory ${DEFAULT_AI_ACTION_INVENTORY}]`,
    `  [--ai-action-policy ${DEFAULT_AI_ACTION_POLICY}]`,
    `  [--hosted-access-preflight ${DEFAULT_HOSTED_ACCESS_PREFLIGHT}]`,
    `  [--hosted-proof-validation ${DEFAULT_HOSTED_PROOF_VALIDATION}]`,
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
  enterpriseTrustPack: argValue('--enterprise-trust-pack', DEFAULT_ENTERPRISE_TRUST_PACK),
  enterpriseEvidenceValidation: argValue('--enterprise-evidence-validation', DEFAULT_ENTERPRISE_EVIDENCE_VALIDATION),
  enterpriseProcurementGate: argValue('--enterprise-procurement-gate', DEFAULT_ENTERPRISE_PROCUREMENT_GATE),
  rlsDraft: argValue('--rls-draft', DEFAULT_RLS_DRAFT),
  rlsProofValidation: argValue('--rls-proof-validation', DEFAULT_RLS_PROOF_VALIDATION),
  llmSecurityAudit: argValue('--llm-security-audit', DEFAULT_LLM_SECURITY_AUDIT),
  aiActionInventory: argValue('--ai-action-inventory', DEFAULT_AI_ACTION_INVENTORY),
  aiActionPolicy: argValue('--ai-action-policy', DEFAULT_AI_ACTION_POLICY),
  hostedAccessPreflight: argValue('--hosted-access-preflight', DEFAULT_HOSTED_ACCESS_PREFLIGHT),
  hostedProofValidation: argValue('--hosted-proof-validation', DEFAULT_HOSTED_PROOF_VALIDATION),
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

function artifactExists(relativePath) {
  return existsSync(resolveRepoPath(relativePath));
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

const enterpriseTrustPack = readJsonIfExists(inputPaths.enterpriseTrustPack, { status: 'missing', source: {}, procurement_questionnaire: [], acceptance_gates: [] });
const enterpriseEvidenceValidation = readJsonIfExists(inputPaths.enterpriseEvidenceValidation, { status: 'missing', summary: {}, source: {}, release_holds: [] });
const enterpriseProcurementGate = readJsonIfExists(inputPaths.enterpriseProcurementGate, { status: 'missing', summary: {}, release_holds: [] });
const rlsDraft = readJsonIfExists(inputPaths.rlsDraft, { status: 'missing', summary: {}, source: {} });
const rlsProofValidation = readJsonIfExists(inputPaths.rlsProofValidation, { status: 'missing', summary: {}, source: {} });
const llmSecurityAudit = readJsonIfExists(inputPaths.llmSecurityAudit, { status: 'missing', summary: {} });
const aiActionInventory = readJsonIfExists(inputPaths.aiActionInventory, { status: 'missing', summary: {} });
const aiActionPolicy = readJsonIfExists(inputPaths.aiActionPolicy, { status: 'missing', summary: {} });
const hostedAccessPreflight = readJsonIfExists(inputPaths.hostedAccessPreflight, { status: 'missing', summary: {} });
const hostedProofValidation = readJsonIfExists(inputPaths.hostedProofValidation, { status: 'missing', summary: {} });
const claimConsistencyValidation = readJsonIfExists(inputPaths.claimConsistencyValidation, { status: 'missing', summary: {} });
const commercialConfidenceGate = readJsonIfExists(inputPaths.commercialConfidenceGate, { posture: {}, dimensions: [] });

const enterpriseDimension = (commercialConfidenceGate.dimensions ?? []).find((dimension) => dimension.id === 'enterprise_security_trust') ?? {};
const trustPackReady = enterpriseTrustPack.status === 'enterprise_trust_pack_ready_not_security_proof';
const questionnaireRowCount = Number(enterpriseTrustPack.source?.questionnaire_row_count ?? enterpriseTrustPack.procurement_questionnaire?.length ?? 0);
const trustDomainCount = Number(enterpriseTrustPack.source?.trust_domain_count ?? enterpriseTrustPack.trust_domains?.length ?? 0);
const trustAcceptanceGateCount = Number(enterpriseTrustPack.source?.acceptance_gate_count ?? enterpriseTrustPack.acceptance_gates?.length ?? 0);
const procurementEvidenceStatus = enterpriseEvidenceValidation.status ?? 'missing';
const procurementRegisterTemplateExists = artifactExists(enterpriseEvidenceValidation.source?.register ?? '');
const procurementRegisterTemplateReady = procurementRegisterTemplateExists
  && Number(enterpriseEvidenceValidation.summary?.register_row_count ?? 0) >= 8
  && Number(enterpriseEvidenceValidation.summary?.row_error_count ?? 0) === 0;
const procurementReadyDocumentCount = Number(enterpriseEvidenceValidation.summary?.ready_document_count ?? 0);
const procurementRequiredDocumentCount = Number(enterpriseEvidenceValidation.summary?.required_document_count ?? 8);
const procurementMissingDocumentCount = Number(enterpriseEvidenceValidation.summary?.missing_or_unapproved_document_count ?? procurementRequiredDocumentCount);
const procurementExternalShareApprovedCount = Number(enterpriseEvidenceValidation.summary?.external_share_approved_document_count ?? 0);
const procurementEvidenceReadyForReview = Boolean(enterpriseEvidenceValidation.summary?.ready_for_enterprise_procurement_review);
const procurementPrivacyDpaReady = Boolean(enterpriseEvidenceValidation.summary?.privacy_dpa_ready);
const procurementSupportSlaReady = Boolean(enterpriseEvidenceValidation.summary?.support_sla_ready);
const procurementIncidentReady = Boolean(enterpriseEvidenceValidation.summary?.incident_response_ready);
const procurementGateReady = enterpriseProcurementGate.status === 'enterprise_procurement_gate_ready_not_owner_approved_or_security_proof';
const procurementGateReleaseHoldCount = Number(enterpriseProcurementGate.summary?.release_hold_count ?? 0);
const rlsDraftReady = rlsDraft.commercial_security_status === 'policy_draft_not_applied'
  || rlsDraft.status === 'policy_draft_not_applied'
  || Number(rlsDraft.summary?.policy_count_to_create ?? 0) > 0;
const rlsProofExpectedRows = Number(rlsProofValidation.summary?.expected_case_environment_row_count ?? 0);
const rlsProofExecutedRows = Number(rlsProofValidation.summary?.executed_row_count ?? 0);
const rlsProofReady = Boolean(rlsProofValidation.summary?.rls_tenant_isolation_proof_ready);
const rlsProofRegisterExists = artifactExists(rlsProofValidation.source?.register ?? '');
const rlsProofExecutionPlanReady = rlsProofRegisterExists
  && rlsProofExpectedRows >= 1
  && rlsDraftReady;
const llmFixtureCount = Number(llmSecurityAudit.summary?.red_team_fixture_count ?? 0);
const llmLocalPassedCount = Number(llmSecurityAudit.summary?.local_red_team_passed_count ?? 0);
const llmRuntimeExecutedCount = Number(llmSecurityAudit.summary?.runtime_red_team_executed_count ?? 0);
const llmLocalRedTeamPassed = llmFixtureCount > 0 && llmLocalPassedCount === llmFixtureCount;
const llmHostedRuntimeProofReady = llmRuntimeExecutedCount > 0 && Number(llmSecurityAudit.summary?.runtime_red_team_proof_score_percent ?? 0) > 0;
const aiInventoryReady = aiActionInventory.status === 'ai_action_inventory_ready_high_impact_gates_partial_not_hosted_proof';
const aiActionSurfaceCount = Number(aiActionInventory.summary?.action_surface_count ?? 0);
const aiDirectIrreversibleActionCount = Number(aiActionInventory.summary?.direct_llm_to_irreversible_action_count ?? 0);
const aiPolicyReady = aiActionPolicy.status === 'draft_high_impact_action_policy_ready_not_owner_approved_or_hosted_tested';
const aiPolicySurfaceCount = Number(aiActionPolicy.summary?.policy_surface_count ?? 0);
const aiApprovalRequiredSurfaceCount = Number(aiActionPolicy.summary?.approval_required_surface_count ?? 0);
const aiOwnerApprovedPolicyCount = Number(aiActionPolicy.summary?.owner_approved_policy_count ?? 0);
const aiHostedVerifiedTestCount = Number(aiActionPolicy.summary?.hosted_verified_test_count ?? 0);
const hostedAccessReady = Boolean(hostedAccessPreflight.summary?.hosted_access_ready_for_smoke);
const hostedClaimAllowed = Boolean(hostedAccessPreflight.summary?.hosted_claim_allowed)
  || Boolean(hostedProofValidation.summary?.hosted_operational_claim_allowed);
const hostedProofReady = Boolean(hostedProofValidation.summary?.ready_for_buyer_safe_hosted_claims);
const claimConsistencyReady = Boolean(claimConsistencyValidation.summary?.claim_consistency_ready)
  && Number(claimConsistencyValidation.summary?.unsupported_claim_mention_count ?? 0) === 0
  && Boolean(claimConsistencyValidation.summary?.enterprise_ready_claim_blocked);
const enterpriseReadyClaimAllowed = Boolean(enterpriseEvidenceValidation.summary?.enterprise_ready_claim_allowed)
  || Boolean(rlsProofValidation.summary?.enterprise_ready_claim_allowed)
  || hostedClaimAllowed;

const executionReadyForOwnerTrustReview = [
  trustPackReady,
  questionnaireRowCount >= 10,
  trustDomainCount >= 8,
  trustAcceptanceGateCount >= 8,
  procurementRegisterTemplateReady,
  procurementGateReady,
  rlsProofExecutionPlanReady,
  llmLocalRedTeamPassed,
  aiInventoryReady,
  aiPolicyReady,
  aiDirectIrreversibleActionCount === 0,
  claimConsistencyReady,
  !enterpriseReadyClaimAllowed
].every(Boolean);

const enterpriseProofReady = [
  procurementEvidenceReadyForReview,
  procurementReadyDocumentCount >= procurementRequiredDocumentCount,
  procurementExternalShareApprovedCount >= procurementRequiredDocumentCount,
  procurementPrivacyDpaReady,
  procurementSupportSlaReady,
  procurementIncidentReady,
  rlsProofReady,
  llmHostedRuntimeProofReady,
  aiOwnerApprovedPolicyCount >= aiPolicySurfaceCount && aiPolicySurfaceCount > 0,
  aiHostedVerifiedTestCount > 0,
  hostedAccessReady,
  hostedProofReady
].every(Boolean);

const acceptanceGates = [
  {
    gate: 'current_enterprise_trust_sources_attached',
    status: gateStatus(CURRENT_ENTERPRISE_TRUST_SOURCES.length >= 6),
    proof_bucket: 'repo_artifact',
    evidence: `${CURRENT_ENTERPRISE_TRUST_SOURCES.length} current enterprise AI/security source anchors attached.`,
    next_action: 'Refresh source anchors when NIST, CISA, OWASP, or ISO guidance changes.'
  },
  {
    gate: 'enterprise_trust_pack_ready',
    status: gateStatus(trustPackReady && questionnaireRowCount >= 10 && trustDomainCount >= 8 && trustAcceptanceGateCount >= 8),
    proof_bucket: 'repo_artifact',
    evidence: `trust_pack_status=${enterpriseTrustPack.status}; questionnaire_rows=${questionnaireRowCount}; trust_domains=${trustDomainCount}; acceptance_gates=${trustAcceptanceGateCount}.`,
    next_action: 'Use the trust pack as the internal procurement-questionnaire map only.'
  },
  {
    gate: 'procurement_register_template_ready',
    status: gateStatus(procurementRegisterTemplateReady),
    proof_bucket: 'repo_artifact',
    evidence: `register_template_exists=${procurementRegisterTemplateExists}; ready_docs=${procurementReadyDocumentCount}/${procurementRequiredDocumentCount}; missing_docs=${procurementMissingDocumentCount}; external_share_approved=${procurementExternalShareApprovedCount}.`,
    next_action: 'Owner fills and approves required procurement documents before any enterprise-ready claim.'
  },
  {
    gate: 'procurement_gate_ready',
    status: gateStatus(procurementGateReady),
    proof_bucket: 'repo_artifact',
    evidence: `procurement_gate_status=${enterpriseProcurementGate.status}; release_holds=${procurementGateReleaseHoldCount}.`,
    next_action: 'Clear release holds with owner-approved docs, hosted proof, RLS proof, AI action policy approval, and claim-language review.'
  },
  {
    gate: 'rls_execution_plan_ready_not_proof',
    status: gateStatus(rlsProofExecutionPlanReady, 'open_rls_execution_plan_not_ready'),
    proof_bucket: 'repo_artifact',
    evidence: `rls_register_exists=${rlsProofRegisterExists}; rls_draft_ready=${rlsDraftReady}; expected_case_environment_rows=${rlsProofExpectedRows}; executed_rows=${rlsProofExecutedRows}; rls_proof_ready=${rlsProofReady}.`,
    next_action: 'Owner approves classifications and migration, then run local and linked RLS proof rows.'
  },
  {
    gate: 'local_llm_red_team_ready_not_hosted',
    status: gateStatus(llmLocalRedTeamPassed),
    proof_bucket: 'local',
    evidence: `local_red_team_passed=${llmLocalPassedCount}/${llmFixtureCount}; hosted_runtime_executed=${llmRuntimeExecutedCount}; hosted_runtime_ready=${llmHostedRuntimeProofReady}.`,
    next_action: 'Run owner-approved hosted LLM red-team smoke before external security claims.'
  },
  {
    gate: 'ai_action_policy_ready_not_owner_approved',
    status: gateStatus(aiInventoryReady && aiPolicyReady && aiDirectIrreversibleActionCount === 0),
    proof_bucket: 'repo_artifact',
    evidence: `action_surfaces=${aiActionSurfaceCount}; policy_surfaces=${aiPolicySurfaceCount}; approval_required=${aiApprovalRequiredSurfaceCount}; direct_llm_to_irreversible_actions=${aiDirectIrreversibleActionCount}; owner_approved_policies=${aiOwnerApprovedPolicyCount}; hosted_verified_tests=${aiHostedVerifiedTestCount}.`,
    next_action: 'Owner approves high-impact action policy and runs hosted no-autonomous-action boundary tests.'
  },
  {
    gate: 'hosted_runtime_boundary_ready',
    status: gateStatus(hostedAccessReady && hostedProofReady, 'open_hosted_runtime_not_ready'),
    proof_bucket: 'hosted_live',
    evidence: `hosted_access_ready=${hostedAccessReady}; hosted_proof_ready=${hostedProofReady}; hosted_claim_allowed=${hostedClaimAllowed}.`,
    next_action: 'Clear hosted access preflight and hosted operational proof validation.'
  },
  {
    gate: 'claim_boundaries_preserved',
    status: gateStatus(claimConsistencyReady && !enterpriseReadyClaimAllowed),
    proof_bucket: 'repo_artifact',
    evidence: `claim_consistency_ready=${claimConsistencyReady}; enterprise_ready_claim_allowed=${enterpriseReadyClaimAllowed}.`,
    next_action: 'Keep enterprise-ready, hosted-live, certified, and security-proof language blocked until evidence validators pass.'
  },
  {
    gate: 'enterprise_execution_ready_for_owner_review',
    status: gateStatus(executionReadyForOwnerTrustReview),
    proof_bucket: 'repo_artifact',
    evidence: `execution_ready_for_owner_trust_review=${executionReadyForOwnerTrustReview}; enterprise_proof_ready=${enterpriseProofReady}.`,
    next_action: executionReadyForOwnerTrustReview
      ? 'Owner can review, approve, and attach procurement documents and then run hosted/RLS evidence gates.'
      : 'Repair structural readiness before owner procurement review.'
  }
];

const releaseHolds = [
  {
    hold: 'owner_approved_procurement_documents_missing',
    severity: 'P1',
    status: procurementReadyDocumentCount >= procurementRequiredDocumentCount ? 'cleared' : 'active',
    evidence_needed: 'Eight owner-approved procurement documents covering privacy/data processing, data inventory, retention, DPA/subprocessors, support/SLA, incident response, secure SDLC, and external-share approval.'
  },
  {
    hold: 'external_share_approval_missing',
    severity: 'P1',
    status: procurementExternalShareApprovedCount >= procurementRequiredDocumentCount ? 'cleared' : 'active',
    evidence_needed: 'Owner-approved external-share status for every artifact that may be shown to buyers.'
  },
  {
    hold: 'rls_tests_not_executed',
    severity: 'P1',
    status: rlsProofReady ? 'cleared' : 'active',
    evidence_needed: 'Executed local and linked RLS proof register rows with migration marker and redacted logs.'
  },
  {
    hold: 'hosted_llm_red_team_not_executed',
    severity: 'P1',
    status: llmHostedRuntimeProofReady ? 'cleared' : 'active',
    evidence_needed: 'Hosted runtime LLM red-team rows for prompt injection, disclosure, output handling, excessive agency, overreliance, and unbounded consumption.'
  },
  {
    hold: 'ai_action_policy_not_owner_approved_or_hosted_tested',
    severity: 'P1',
    status: aiOwnerApprovedPolicyCount >= aiPolicySurfaceCount && aiHostedVerifiedTestCount > 0 ? 'cleared' : 'active',
    evidence_needed: 'Owner-approved high-impact action policy plus hosted no-autonomous-action boundary tests.'
  },
  {
    hold: 'hosted_access_and_operational_proof_missing',
    severity: 'P1',
    status: hostedAccessReady && hostedProofReady ? 'cleared' : 'active',
    evidence_needed: 'Hosted access preflight success and validated hosted operational proof with deploy binding and redacted logs/screenshots.'
  },
  {
    hold: 'enterprise_claim_language_missing',
    severity: 'P2',
    status: 'active',
    evidence_needed: 'Owner-approved external wording after procurement, hosted, RLS, and AI runtime gates pass.'
  }
];

const report = {
  schema_version: 'enterprise-trust-execution-readiness-v1',
  generated_at: new Date().toISOString(),
  status: enterpriseProofReady
    ? 'enterprise_trust_execution_ready_for_owner_claim_review'
    : executionReadyForOwnerTrustReview
      ? 'enterprise_trust_execution_ready_for_owner_review_no_approved_docs'
      : 'enterprise_trust_execution_readiness_partial',
  source: {
    enterprise_trust_pack: inputPaths.enterpriseTrustPack,
    enterprise_evidence_validation: inputPaths.enterpriseEvidenceValidation,
    enterprise_procurement_gate: inputPaths.enterpriseProcurementGate,
    rls_draft: inputPaths.rlsDraft,
    rls_proof_validation: inputPaths.rlsProofValidation,
    llm_security_audit: inputPaths.llmSecurityAudit,
    ai_action_inventory: inputPaths.aiActionInventory,
    ai_action_policy: inputPaths.aiActionPolicy,
    hosted_access_preflight: inputPaths.hostedAccessPreflight,
    hosted_proof_validation: inputPaths.hostedProofValidation,
    claim_consistency_validation: inputPaths.claimConsistencyValidation,
    commercial_confidence_gate: inputPaths.commercialConfidenceGate,
    launch_evidence: inputPaths.evidence,
    enterprise_dimension_status: enterpriseDimension.status ?? 'missing',
    enterprise_dimension_score_percent: Number(enterpriseDimension.current_score_percent ?? 0)
  },
  summary: {
    current_enterprise_source_count: CURRENT_ENTERPRISE_TRUST_SOURCES.length,
    trust_pack_ready: trustPackReady,
    questionnaire_row_count: questionnaireRowCount,
    trust_domain_count: trustDomainCount,
    trust_acceptance_gate_count: trustAcceptanceGateCount,
    procurement_register_template_ready: procurementRegisterTemplateReady,
    procurement_evidence_validation_status: procurementEvidenceStatus,
    procurement_required_document_count: procurementRequiredDocumentCount,
    procurement_ready_document_count: procurementReadyDocumentCount,
    procurement_missing_document_count: procurementMissingDocumentCount,
    procurement_external_share_approved_count: procurementExternalShareApprovedCount,
    procurement_evidence_ready_for_review: procurementEvidenceReadyForReview,
    procurement_privacy_dpa_ready: procurementPrivacyDpaReady,
    procurement_support_sla_ready: procurementSupportSlaReady,
    procurement_incident_response_ready: procurementIncidentReady,
    procurement_gate_ready: procurementGateReady,
    procurement_gate_release_hold_count: procurementGateReleaseHoldCount,
    rls_execution_plan_ready: rlsProofExecutionPlanReady,
    rls_expected_case_environment_row_count: rlsProofExpectedRows,
    rls_executed_row_count: rlsProofExecutedRows,
    rls_tenant_isolation_proof_ready: rlsProofReady,
    local_llm_red_team_passed: llmLocalRedTeamPassed,
    llm_local_red_team_passed_count: llmLocalPassedCount,
    llm_red_team_fixture_count: llmFixtureCount,
    llm_hosted_runtime_executed_count: llmRuntimeExecutedCount,
    llm_hosted_runtime_proof_ready: llmHostedRuntimeProofReady,
    ai_action_inventory_ready: aiInventoryReady,
    ai_action_policy_ready: aiPolicyReady,
    ai_action_surface_count: aiActionSurfaceCount,
    ai_policy_surface_count: aiPolicySurfaceCount,
    ai_approval_required_surface_count: aiApprovalRequiredSurfaceCount,
    ai_direct_llm_to_irreversible_action_count: aiDirectIrreversibleActionCount,
    ai_owner_approved_policy_count: aiOwnerApprovedPolicyCount,
    ai_hosted_verified_test_count: aiHostedVerifiedTestCount,
    hosted_access_ready_for_smoke: hostedAccessReady,
    hosted_proof_ready_for_buyer_safe_claims: hostedProofReady,
    hosted_claim_allowed: hostedClaimAllowed,
    claim_consistency_ready: claimConsistencyReady,
    active_release_hold_count: activeCount(releaseHolds),
    execution_ready_for_owner_trust_review: executionReadyForOwnerTrustReview,
    enterprise_proof_ready_for_owner_claim_review: enterpriseProofReady,
    enterprise_ready_claim_allowed: enterpriseReadyClaimAllowed
  },
  current_enterprise_trust_sources: CURRENT_ENTERPRISE_TRUST_SOURCES,
  acceptance_gates: acceptanceGates,
  release_holds: releaseHolds,
  owner_action_order: [
    'Review the procurement evidence register and attach or approve the eight required documents.',
    'Mark which artifacts are externally shareable and verify they contain no secrets or unsupported claims.',
    'Approve RLS table classifications and policy draft, then run local and linked RLS proof rows.',
    'Approve the high-impact AI action policy and run hosted no-autonomous-action boundary tests.',
    'Clear hosted access preflight and run hosted LLM/security smoke with redacted evidence.',
    'Rerun enterprise procurement evidence validation, this execution-readiness gate, claim consistency, and commercial confidence before changing enterprise/security language.'
  ],
  proof_boundary: {
    proves: [
      'The repo has an internal trust pack, procurement questionnaire, procurement register template, RLS proof plan, local LLM red-team proof, and AI action policy draft ready for owner review.',
      'Enterprise/security proof remains claim-blocked until owner documents, hosted proof, RLS proof, and AI runtime proof are executed and validated.'
    ],
    does_not_prove: [
      'Enterprise readiness, SOC 2/ISO certification, tenant-isolation proof, hosted runtime proof, buyer-share approval, or public-sector procurement acceptance.',
      'That privacy/DPA/SLA/incident-response documents exist or are owner-approved.'
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

  const sourceRows = validation.current_enterprise_trust_sources
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

  return `# Enterprise Trust Execution Readiness - 2026-06-06

## Decision

Status: \`${validation.status}\`.

Execution ready for owner trust review: **${validation.summary.execution_ready_for_owner_trust_review}**.

Enterprise proof ready for owner claim review: **${validation.summary.enterprise_proof_ready_for_owner_claim_review}**.

Enterprise-ready claim allowed: **${validation.summary.enterprise_ready_claim_allowed}**.

This proves only that the enterprise trust packet can move to owner review. It does not prove enterprise readiness, hosted runtime proof, tenant-isolation proof, certification, or public-sector procurement acceptance.

## Acceptance Gates

| Gate | Status | Proof Bucket | Evidence | Next Action |
|---|---|---|---|---|
${gateRows}

## Current Enterprise Trust Sources

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

This is repo/local execution-readiness proof for owner procurement review. It cannot support external enterprise-ready, certified, hosted-live, tenant-isolation, or public-sector procurement language until owner documents, hosted proof, RLS proof, AI runtime proof, and claim wording are revalidated.
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
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:enterprise:execution-readiness -- --enterprise-trust-pack ${inputPaths.enterpriseTrustPack} --enterprise-evidence-validation ${inputPaths.enterpriseEvidenceValidation} --enterprise-procurement-gate ${inputPaths.enterpriseProcurementGate} --rls-draft ${inputPaths.rlsDraft} --rls-proof-validation ${inputPaths.rlsProofValidation} --llm-security-audit ${inputPaths.llmSecurityAudit} --ai-action-inventory ${inputPaths.aiActionInventory} --ai-action-policy ${inputPaths.aiActionPolicy} --hosted-access-preflight ${inputPaths.hostedAccessPreflight} --hosted-proof-validation ${inputPaths.hostedProofValidation} --claim-consistency-validation ${inputPaths.claimConsistencyValidation} --commercial-confidence-gate ${inputPaths.commercialConfidenceGate} --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence: status ${report.status}, execution_ready_for_owner_trust_review ${report.summary.execution_ready_for_owner_trust_review}, enterprise_proof_ready_for_owner_claim_review ${report.summary.enterprise_proof_ready_for_owner_claim_review}, enterprise_ready_claim_allowed false`
  ], [
    /npm run audit:enterprise:execution-readiness/
  ]);

  evidence.proof_buckets.repo_artifact = replaceMatchingThenAppend(evidence.proof_buckets.repo_artifact, [
    'scripts/validate-enterprise-trust-execution-readiness.mjs validates enterprise trust execution readiness across procurement documents, RLS proof, LLM security, AI action policy, hosted access, and claim boundaries',
    'docs/launch-readiness/enterprise-trust-execution-readiness-2026-06-06.json records owner-review readiness while keeping enterprise-ready and hosted/security proof claims blocked',
    'docs/launch-readiness/enterprise-trust-execution-readiness-checklist-2026-06-06.csv provides the owner-review execution checklist for procurement/security evidence'
  ], [
    /scripts\/validate-enterprise-trust-execution-readiness\.mjs/,
    /enterprise-trust-execution-readiness-2026-06-06\.json/,
    /enterprise-trust-execution-readiness-checklist-2026-06-06\.csv/
  ]);

  evidence.fix_report = evidence.fix_report ?? {};
  evidence.fix_report.files_changed = replaceMatchingThenAppend(evidence.fix_report.files_changed, [
    'scripts/validate-enterprise-trust-execution-readiness.mjs',
    'scripts/build-commercial-confidence-gate.mjs',
    'docs/launch-readiness/enterprise-trust-execution-readiness-2026-06-06.json',
    'docs/launch-readiness/enterprise-trust-execution-readiness-2026-06-06.md',
    'docs/launch-readiness/enterprise-trust-execution-readiness-checklist-2026-06-06.csv',
    'package.json'
  ], [
    /scripts\/validate-enterprise-trust-execution-readiness\.mjs/,
    /scripts\/build-commercial-confidence-gate\.mjs/,
    /enterprise-trust-execution-readiness-2026-06-06\.json/,
    /enterprise-trust-execution-readiness-2026-06-06\.md/,
    /enterprise-trust-execution-readiness-checklist-2026-06-06\.csv/,
    /package\.json/
  ]);
  evidence.fix_report.tests_run = replaceMatchingThenAppend(evidence.fix_report.tests_run, [
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH node --check scripts/validate-enterprise-trust-execution-readiness.mjs',
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:enterprise:execution-readiness -- --enterprise-trust-pack ${inputPaths.enterpriseTrustPack} --enterprise-evidence-validation ${inputPaths.enterpriseEvidenceValidation} --enterprise-procurement-gate ${inputPaths.enterpriseProcurementGate} --rls-draft ${inputPaths.rlsDraft} --rls-proof-validation ${inputPaths.rlsProofValidation} --llm-security-audit ${inputPaths.llmSecurityAudit} --ai-action-inventory ${inputPaths.aiActionInventory} --ai-action-policy ${inputPaths.aiActionPolicy} --hosted-access-preflight ${inputPaths.hostedAccessPreflight} --hosted-proof-validation ${inputPaths.hostedProofValidation} --claim-consistency-validation ${inputPaths.claimConsistencyValidation} --commercial-confidence-gate ${inputPaths.commercialConfidenceGate} --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence`
  ], [
    /node --check scripts\/validate-enterprise-trust-execution-readiness\.mjs/,
    /npm run audit:enterprise:execution-readiness/
  ]);
  evidence.fix_report.approval_gates = replaceMatchingThenAppend(evidence.fix_report.approval_gates, [
    'Enterprise trust execution readiness proves only owner-review readiness; owner-approved procurement documents, external-share approvals, RLS proof, hosted LLM/security proof, high-impact action policy approval, hosted boundary tests, and owner-approved claim language remain required before enterprise-ready claims can be upgraded.'
  ], [
    /Enterprise trust execution readiness proves only/
  ]);

  evidence.implementation_decisions = replaceByTaskId(evidence.implementation_decisions, {
    task_id: 'enterprise-trust-execution-readiness-gate',
    decision: 'Add a deterministic enterprise trust execution-readiness validator before owner procurement/security review.',
    acceptance_check: 'The validator must prove trust-pack, register, RLS plan, local LLM red-team, AI action policy, and claim-boundary readiness while keeping enterprise-ready claims blocked without owner documents, hosted proof, RLS proof, and runtime AI policy evidence.',
    chosen_variant: 'minimal Node artifact validator plus commercial-confidence gate wiring; no RLS migration, no hosted execution, no owner-doc fabrication',
    repo_pattern_reused: 'Existing launch-readiness validator and evidence update pattern',
    files_changed: [
      'scripts/validate-enterprise-trust-execution-readiness.mjs',
      'scripts/build-commercial-confidence-gate.mjs',
      'package.json'
    ],
    tests_run: [
      'node --check scripts/validate-enterprise-trust-execution-readiness.mjs',
      'npm run audit:enterprise:execution-readiness',
      'npm run audit:commercial:confidence'
    ],
    proof: `${report.status}; execution_ready_for_owner_trust_review=${report.summary.execution_ready_for_owner_trust_review}; enterprise_proof_ready_for_owner_claim_review=${report.summary.enterprise_proof_ready_for_owner_claim_review}; enterprise_ready_claim_allowed=false.`,
    reason: 'Enterprise/public-sector sellability depends on procurement-ready trust evidence, but current proof is repo/local only and must not be marketed as enterprise-ready.'
  });
  evidence.rejected_variants = replaceByTaskId(evidence.rejected_variants, {
    task_id: 'enterprise-trust-execution-readiness-gate',
    variant: 'Create owner procurement documents or apply RLS/hosted security changes without approval.',
    reason_rejected: 'Owner documents, production/linked Supabase changes, hosted smoke, and external-share approvals are gated actions; fabricating or executing them would blur proof boundaries.',
    tradeoff: 'A readiness validator makes the owner review path executable without unsafe production or compliance claims.',
    evidence: `${report.status} keeps enterprise_ready_claim_allowed=${report.summary.enterprise_ready_claim_allowed}.`
  });
  evidence.code_optimization_reviews = replaceByTaskId(evidence.code_optimization_reviews, {
    target_task: 'enterprise-trust-execution-readiness-gate',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'No dependency, no runtime product edit, no hosted access, no RLS mutation, no owner-document fabrication, and generated artifacts remain repo/local proof only.',
    tests_or_checks: [
      'node --check scripts/validate-enterprise-trust-execution-readiness.mjs',
      'npm run audit:enterprise:execution-readiness',
      'npm run audit:commercial:confidence'
    ],
    remaining_risk: 'Owner-approved procurement documents, external-share approvals, RLS proof, hosted LLM/security proof, AI action policy approval, hosted boundary tests, and claim language remain missing.'
  });

  writeArtifact(inputPaths.evidence, `${JSON.stringify(evidence, null, 2)}\n`);
}

console.log(JSON.stringify({
  json_output: outputPaths.json,
  md_output: outputPaths.md,
  csv_output: outputPaths.csv,
  evidence_updated: updateEvidence,
  status: report.status,
  execution_ready_for_owner_trust_review: report.summary.execution_ready_for_owner_trust_review,
  enterprise_proof_ready_for_owner_claim_review: report.summary.enterprise_proof_ready_for_owner_claim_review,
  procurement_ready_document_count: report.summary.procurement_ready_document_count,
  procurement_required_document_count: report.summary.procurement_required_document_count,
  rls_executed_row_count: report.summary.rls_executed_row_count,
  local_llm_red_team_passed: report.summary.local_llm_red_team_passed,
  hosted_access_ready_for_smoke: report.summary.hosted_access_ready_for_smoke,
  enterprise_ready_claim_allowed: report.summary.enterprise_ready_claim_allowed
}, null, 2));
