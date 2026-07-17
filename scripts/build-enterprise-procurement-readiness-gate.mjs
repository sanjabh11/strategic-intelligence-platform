#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const ROOT = process.cwd();
const DEFAULT_ENTERPRISE_TRUST_PACK = 'docs/launch-readiness/enterprise-trust-pack-2026-06-06.json';
const DEFAULT_ENTERPRISE_EVIDENCE_VALIDATION = 'docs/launch-readiness/enterprise-procurement-evidence-validation-2026-06-06.json';
const DEFAULT_RLS_DRAFT = 'docs/launch-readiness/rls-identity-and-review-policy-draft-2026-06-06.json';
const DEFAULT_RLS_PROOF_VALIDATION = 'docs/launch-readiness/rls-proof-evidence-validation-2026-06-06.json';
const DEFAULT_HOSTED_PROOF_KIT = 'docs/launch-readiness/hosted-operational-proof-kit-2026-06-06.json';
const DEFAULT_LLM_SECURITY_AUDIT = 'docs/launch-readiness/llm-security-readiness-audit-2026-06-06.json';
const DEFAULT_AI_ACTION_POLICY = 'docs/launch-readiness/ai-high-impact-action-policy-2026-06-06.json';
const DEFAULT_BUYER_PROOF_GATE = 'docs/launch-readiness/buyer-proof-gate-2026-06-06.json';
const DEFAULT_FORECAST_CLAIM_GOVERNANCE = 'docs/launch-readiness/forecast-claim-governance-2026-06-06.json';
const DEFAULT_CONFIDENCE_GATE = 'docs/launch-readiness/commercial-confidence-gate-2026-06-06.json';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/enterprise-procurement-readiness-gate-2026-06-06.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/enterprise-procurement-readiness-gate-2026-06-06.md';
const DEFAULT_CSV_OUTPUT = 'docs/launch-readiness/enterprise-procurement-readiness-checklist-2026-06-06.csv';

function argValue(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function usage() {
  console.error([
    'Usage: node scripts/build-enterprise-procurement-readiness-gate.mjs',
    `  [--enterprise-trust-pack ${DEFAULT_ENTERPRISE_TRUST_PACK}]`,
    `  [--enterprise-evidence-validation ${DEFAULT_ENTERPRISE_EVIDENCE_VALIDATION}]`,
    `  [--rls-draft ${DEFAULT_RLS_DRAFT}]`,
    `  [--rls-proof-validation ${DEFAULT_RLS_PROOF_VALIDATION}]`,
    `  [--hosted-proof-kit ${DEFAULT_HOSTED_PROOF_KIT}]`,
    `  [--llm-security-audit ${DEFAULT_LLM_SECURITY_AUDIT}]`,
    `  [--ai-action-policy ${DEFAULT_AI_ACTION_POLICY}]`,
    `  [--buyer-proof-gate ${DEFAULT_BUYER_PROOF_GATE}]`,
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
  enterpriseTrustPack: argValue('--enterprise-trust-pack', DEFAULT_ENTERPRISE_TRUST_PACK),
  enterpriseEvidenceValidation: argValue('--enterprise-evidence-validation', DEFAULT_ENTERPRISE_EVIDENCE_VALIDATION),
  rlsDraft: argValue('--rls-draft', DEFAULT_RLS_DRAFT),
  rlsProofValidation: argValue('--rls-proof-validation', DEFAULT_RLS_PROOF_VALIDATION),
  hostedProofKit: argValue('--hosted-proof-kit', DEFAULT_HOSTED_PROOF_KIT),
  llmSecurityAudit: argValue('--llm-security-audit', DEFAULT_LLM_SECURITY_AUDIT),
  aiActionPolicy: argValue('--ai-action-policy', DEFAULT_AI_ACTION_POLICY),
  buyerProofGate: argValue('--buyer-proof-gate', DEFAULT_BUYER_PROOF_GATE),
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
  return existsSync(absolutePath) ? JSON.parse(readFileSync(absolutePath, 'utf8')) : fallback;
}

function writeArtifact(relativePath, contents) {
  const absolutePath = resolveRepoPath(relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, contents);
}

function artifactExists(relativePath) {
  return existsSync(resolveRepoPath(relativePath));
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

const enterpriseTrustPack = readJsonIfExists(inputPaths.enterpriseTrustPack, {
  status: 'missing',
  source: {},
  procurement_questionnaire: [],
  acceptance_gates: []
});
const enterpriseEvidenceValidation = readJsonIfExists(inputPaths.enterpriseEvidenceValidation, {
  status: 'missing',
  summary: {
    ready_document_count: 0,
    required_document_count: 8,
    missing_or_unapproved_document_count: 8,
    external_share_approved_document_count: 0,
    active_release_hold_count: 0,
    privacy_dpa_ready: false,
    support_sla_ready: false,
    incident_response_ready: false,
    ready_for_enterprise_procurement_review: false
  },
  acceptance_gates: []
});
const rlsDraft = readJsonIfExists(inputPaths.rlsDraft, { source: {}, summary: {} });
const rlsProofValidation = readJsonIfExists(inputPaths.rlsProofValidation, {
  status: 'missing',
  summary: {
    expected_case_environment_row_count: 0,
    executed_row_count: 0,
    local_ready_count: 0,
    linked_ready_count: 0,
    active_release_hold_count: 0,
    local_rls_proof_ready: false,
    linked_rls_proof_ready: false,
    migration_applied_marker_ready: false,
    rls_tenant_isolation_proof_ready: false,
    tenant_isolation_claim_allowed: false
  }
});
const hostedProofKit = readJsonIfExists(inputPaths.hostedProofKit, { status: 'missing', smoke_plan: [] });
const llmSecurityAudit = readJsonIfExists(inputPaths.llmSecurityAudit, { status: 'missing', summary: {} });
const aiActionPolicy = readJsonIfExists(inputPaths.aiActionPolicy, { status: 'missing', summary: {} });
const buyerProofGate = readJsonIfExists(inputPaths.buyerProofGate, { status: 'missing', summary: {} });
const forecastClaimGovernance = readJsonIfExists(inputPaths.forecastClaimGovernance, { status: 'missing', summary: {} });
const confidenceGate = readJsonIfExists(inputPaths.confidenceGate, { dimensions: [], posture: {} });

const enterpriseDimension = (confidenceGate.dimensions ?? []).find((dimension) => dimension.id === 'enterprise_security_trust') ?? {};
const rlsProofValidationStatus = rlsProofValidation.status ?? 'missing';
const rlsProofReadyForSecurityClaim = Boolean(rlsProofValidation.summary?.rls_tenant_isolation_proof_ready);
const rlsProofExpectedCaseEnvironmentCount = Number(rlsProofValidation.summary?.expected_case_environment_row_count ?? 0);
const rlsProofExecutedCount = Number(rlsProofValidation.summary?.executed_row_count ?? 0);
const rlsProofLocalReadyCount = Number(rlsProofValidation.summary?.local_ready_count ?? 0);
const rlsProofLinkedReadyCount = Number(rlsProofValidation.summary?.linked_ready_count ?? 0);
const rlsProofReleaseHoldCount = Number(rlsProofValidation.summary?.active_release_hold_count ?? 0);
const rlsProofTenantIsolationClaimAllowed = Boolean(rlsProofValidation.summary?.tenant_isolation_claim_allowed);
const hostedProofCount = Number(enterpriseTrustPack.source?.hosted_proof_count ?? 0);
const hostedSmokePlanCount = Number(enterpriseTrustPack.source?.hosted_smoke_plan_count ?? hostedProofKit.smoke_plan?.length ?? 0);
const hostedSmokePresentCount = Number(enterpriseTrustPack.source?.hosted_smoke_present_count ?? 0);
const questionnaireRowCount = Number(enterpriseTrustPack.source?.questionnaire_row_count ?? enterpriseTrustPack.procurement_questionnaire?.length ?? 0);
const trustDomainCount = Number(enterpriseTrustPack.source?.trust_domain_count ?? enterpriseTrustPack.trust_domains?.length ?? 0);
const acceptanceGateCount = Number(enterpriseTrustPack.source?.acceptance_gate_count ?? enterpriseTrustPack.acceptance_gates?.length ?? 0);
const ownerApprovedPolicyCount = Number(aiActionPolicy.summary?.owner_approved_policy_count ?? 0);
const hostedActionTestCount = Number(aiActionPolicy.summary?.hosted_verified_test_count ?? 0);
const llmHostedRuntimeFixtureCount = Number(llmSecurityAudit.summary?.runtime_red_team_executed_count ?? 0);
const buyerCommitmentSignalCount = Number(buyerProofGate.summary?.paid_pilot_loi_or_procurement_signal_count ?? 0);
const forecastRealOutcomeCount = Number(forecastClaimGovernance.summary?.real_resolved_outcome_count ?? 0);
const enterpriseEvidenceValidationStatus = enterpriseEvidenceValidation.status ?? 'missing';
const enterpriseEvidenceReadyForReview = Boolean(enterpriseEvidenceValidation.summary?.ready_for_enterprise_procurement_review)
  || enterpriseEvidenceValidationStatus === 'enterprise_procurement_evidence_validation_passed_pending_security_runtime_proof';
const enterpriseEvidenceReadyDocumentCount = Number(enterpriseEvidenceValidation.summary?.ready_document_count ?? 0);
const enterpriseEvidenceRequiredDocumentCount = Number(
  enterpriseEvidenceValidation.summary?.required_document_count ?? 8
);
const enterpriseEvidenceMissingDocumentCount = Number(
  enterpriseEvidenceValidation.summary?.missing_or_unapproved_document_count ?? Math.max(0, enterpriseEvidenceRequiredDocumentCount - enterpriseEvidenceReadyDocumentCount)
);
const enterpriseEvidenceExternalShareApprovedCount = Number(
  enterpriseEvidenceValidation.summary?.external_share_approved_document_count ?? 0
);
const enterpriseEvidenceReleaseHoldCount = Number(enterpriseEvidenceValidation.summary?.active_release_hold_count ?? 0);
const enterpriseEvidencePrivacyDpaReady = Boolean(enterpriseEvidenceValidation.summary?.privacy_dpa_ready);
const enterpriseEvidenceSupportSlaReady = Boolean(enterpriseEvidenceValidation.summary?.support_sla_ready);
const enterpriseEvidenceIncidentResponseReady = Boolean(enterpriseEvidenceValidation.summary?.incident_response_ready);
const enterpriseEvidenceDocumentById = new Map(
  (enterpriseEvidenceValidation.document_rows ?? []).map((row) => [row.document_id, row])
);

function evidenceDocumentStatus(documentId, fallbackStatus) {
  const row = enterpriseEvidenceDocumentById.get(documentId);
  if (!row) return fallbackStatus;
  if (row.ready) return 'ready_owner_approved';
  if (row.owner_approved) return 'owner_approved_needs_validation';
  if (row.review_ready) return 'reviewed_not_owner_approved';
  return fallbackStatus;
}

const requiredDocuments = [
  {
    id: 'privacy_notice_or_data_processing_summary',
    title: 'Privacy notice or buyer data-processing summary',
    expected_artifact: 'owner-supplied privacy/data-processing summary',
    current_status: evidenceDocumentStatus('privacy_notice_or_data_processing_summary', 'missing_owner_document'),
    why_required: 'Enterprise buyers need to know what data is collected, why, where it is stored, and who can access it.'
  },
  {
    id: 'data_inventory_and_classification',
    title: 'Data inventory and classification table',
    expected_artifact: 'owner-approved data inventory mapped to RLS classifications',
    current_status: evidenceDocumentStatus(
      'data_inventory_and_classification',
      Boolean(rlsDraft.source?.production_state_verified) ? 'partial_runtime_review_needed' : 'missing_owner_approval'
    ),
    why_required: 'Privacy, retention, RLS, and support claims need a shared data-category map.'
  },
  {
    id: 'retention_and_deletion_policy',
    title: 'Retention and deletion policy',
    expected_artifact: 'owner-approved retention/deletion terms',
    current_status: evidenceDocumentStatus('retention_and_deletion_policy', 'missing_owner_document'),
    why_required: 'Procurement reviewers ask how long buyer data is retained and how deletion requests are handled.'
  },
  {
    id: 'dpa_and_subprocessor_position',
    title: 'DPA and subprocessor position',
    expected_artifact: 'DPA/subprocessor packet or explicit pilot-specific exception',
    current_status: evidenceDocumentStatus('dpa_and_subprocessor_position', 'missing_owner_document'),
    why_required: 'Public-sector and enterprise procurement typically require data-processing and subprocessor terms.'
  },
  {
    id: 'support_and_sla_terms',
    title: 'Pilot support and SLA terms',
    expected_artifact: 'support owner, response target, uptime boundary, escalation path, and maintenance window',
    current_status: evidenceDocumentStatus('support_and_sla_terms', 'missing_owner_document'),
    why_required: 'A paid pilot needs clear support responsibilities even before full enterprise SLA commitments.'
  },
  {
    id: 'incident_response_and_breach_notice',
    title: 'Incident response and breach-notice stance',
    expected_artifact: 'incident triage, severity, notification, and communication runbook',
    current_status: evidenceDocumentStatus('incident_response_and_breach_notice', 'missing_owner_document'),
    why_required: 'Security reviewers need to know how incidents are detected, triaged, and communicated.'
  },
  {
    id: 'secure_sdlc_and_vulnerability_response',
    title: 'Secure SDLC and vulnerability response',
    expected_artifact: 'release checklist, vulnerability intake, patch target, dependency scan cadence',
    current_status: evidenceDocumentStatus(
      'secure_sdlc_and_vulnerability_response',
      enterpriseTrustPack.source?.local_proof_count > 0 ? 'partial_local_checks_present' : 'missing_evidence'
    ),
    why_required: 'Secure-by-demand procurement asks how suppliers build, test, and remediate software.'
  },
  {
    id: 'external_share_approval',
    title: 'External-share approval register',
    expected_artifact: 'owner-approved list of questionnaire rows and artifacts that may be shared with buyers',
    current_status: evidenceDocumentStatus('external_share_approval', 'missing_owner_approval'),
    why_required: 'Procurement packets must avoid leaking secrets, internal logs, or unsupported claims.'
  }
];

const externalShareArtifacts = [
  {
    artifact: inputPaths.enterpriseTrustPack,
    current_status: artifactExists(inputPaths.enterpriseTrustPack) ? 'draft_internal_ready' : 'missing',
    share_boundary: 'Internal readiness map unless owner marks external-shareable rows.'
  },
  {
    artifact: inputPaths.rlsDraft,
    current_status: artifactExists(inputPaths.rlsDraft) ? 'draft_not_applied' : 'missing',
    share_boundary: 'Can show remediation path; cannot claim deployed RLS proof.'
  },
  {
    artifact: inputPaths.rlsProofValidation,
    current_status: artifactExists(inputPaths.rlsProofValidation) ? rlsProofValidationStatus : 'missing',
    share_boundary: 'Can show RLS evidence validation status; cannot claim tenant isolation unless validator and owner-approved linked evidence pass.'
  },
  {
    artifact: inputPaths.hostedProofKit,
    current_status: hostedSmokePresentCount >= hostedSmokePlanCount && hostedSmokePlanCount > 0 ? 'proof_plan_ready' : 'partial',
    share_boundary: 'Can show smoke plan; cannot claim hosted proof until logs/screenshots are attached.'
  },
  {
    artifact: inputPaths.llmSecurityAudit,
    current_status: llmSecurityAudit.status ?? 'missing',
    share_boundary: 'Can show local red-team readiness; hosted runtime resistance remains unproven.'
  },
  {
    artifact: inputPaths.aiActionPolicy,
    current_status: aiActionPolicy.status ?? 'missing',
    share_boundary: 'Draft action policy only; owner approval and hosted boundary tests are missing.'
  },
  {
    artifact: inputPaths.buyerProofGate,
    current_status: buyerProofGate.status ?? 'missing',
    share_boundary: 'First-sale proof gate only; no buyer validation claim.'
  },
  {
    artifact: inputPaths.forecastClaimGovernance,
    current_status: forecastClaimGovernance.status ?? 'missing',
    share_boundary: 'Accuracy claim governance only; no real resolved-outcome accuracy proof.'
  }
];

const sourceAlignment = [
  {
    framework: 'NIST Privacy Framework',
    source_url: 'https://www.nist.gov/privacy-framework/privacy-framework',
    implication: 'Privacy should be treated as enterprise risk management with clear data, retention, and processing evidence.'
  },
  {
    framework: 'CISA Secure by Demand Guide',
    source_url: 'https://www.cisa.gov/resources-tools/resources/secure-demand-guide',
    implication: 'Procurement buyers should receive direct answers about secure-by-design practices, current proof, and supplier accountability.'
  },
  {
    framework: 'NIST SSDF SP 800-218',
    source_url: 'https://csrc.nist.gov/pubs/sp/800/218/final',
    implication: 'Secure-development, vulnerability response, and release evidence need repeatable artifacts, not generic claims.'
  },
  {
    framework: 'NIST AI RMF',
    source_url: 'https://www.nist.gov/itl/ai-risk-management-framework',
    implication: 'AI trust claims should remain governed, measured, and managed across the lifecycle.'
  },
  {
    framework: 'ISO/IEC 42001:2023',
    source_url: 'https://www.iso.org/standard/42001',
    implication: 'AI management-system language is valid only as alignment unless an audited/certified management system exists.'
  }
];

const acceptanceGates = [
  {
    gate: 'enterprise_procurement_evidence_register_validation',
    required_evidence: 'Owner evidence register validates required documents, owner approvals, artifact paths, external-share approvals, no-secrets markers, and no unsupported claim markers.',
    current_status: enterpriseEvidenceReadyForReview ? 'ready_for_review' : 'blocked_owner_evidence_register_not_ready',
    allowed_claim: 'Enterprise evidence register is ready for procurement review.',
    prohibited_claim: 'Draft documents or unvalidated rows prove enterprise readiness.'
  },
  {
    gate: 'privacy_data_inventory',
    required_evidence: 'Owner-approved data inventory, data categories, processing purpose, storage location, access roles, retention, and deletion path.',
    current_status: 'blocked_owner_documents_missing',
    allowed_claim: 'Privacy/data inventory is a required procurement gate.',
    prohibited_claim: 'Privacy-ready or DPA-ready enterprise deployment.'
  },
  {
    gate: 'support_sla_incident_terms',
    required_evidence: 'Pilot support owner, response targets, escalation path, maintenance boundary, incident severity model, and breach/notice stance.',
    current_status: 'blocked_owner_documents_missing',
    allowed_claim: 'Support/SLA terms are pending owner approval.',
    prohibited_claim: 'Enterprise SLA, production support, or incident-response readiness.'
  },
  {
    gate: 'external_share_register',
    required_evidence: 'Owner marks which rows/artifacts are external-shareable and removes secrets/internal-only detail.',
    current_status: 'blocked_owner_approval_missing',
    allowed_claim: 'Procurement packet draft exists for internal review.',
    prohibited_claim: 'Buyer-shareable security packet.'
  },
  {
    gate: 'rls_and_hosted_security_proof',
    required_evidence: 'Owner-approved RLS migration, pgTAP/linked Supabase proof, hosted smoke logs/screenshots, and deploy binding.',
    current_status: rlsProofReadyForSecurityClaim && hostedProofCount > 0 ? 'ready_for_review' : 'blocked_rls_hosted_proof_missing',
    allowed_claim: 'RLS and hosted proof path exists.',
    prohibited_claim: 'Tenant isolation or hosted runtime is proven.'
  },
  {
    gate: 'llm_ai_action_runtime_proof',
    required_evidence: 'Hosted LLM red-team fixtures, owner-approved high-impact action policy, hosted no-autonomous-action tests, and redacted logs.',
    current_status: llmHostedRuntimeFixtureCount > 0 && ownerApprovedPolicyCount > 0 && hostedActionTestCount > 0 ? 'ready_for_review' : 'blocked_hosted_ai_runtime_proof_missing',
    allowed_claim: 'Local/draft AI trust artifacts exist.',
    prohibited_claim: 'Hosted AI security, no-autonomous-action, or public-sector AI trust is proven.'
  },
  {
    gate: 'buyer_and_accuracy_dependency',
    required_evidence: 'Buyer commitment signal plus resolved-outcome forecast evidence before enterprise-ready or world-class prediction claims.',
    current_status: buyerCommitmentSignalCount > 0 && forecastRealOutcomeCount > 0 ? 'ready_for_review' : 'blocked_buyer_accuracy_dependencies_missing',
    allowed_claim: 'Guided pilot posture remains the correct commercial boundary.',
    prohibited_claim: 'Enterprise-ready, buyer-validated, or world-class prediction claims.'
  }
];

const releaseHolds = [
  {
    hold: 'enterprise_procurement_evidence_register_not_ready',
    severity: 'P1',
    status: enterpriseEvidenceReadyForReview ? 'ready_for_review' : 'active',
    evidence_needed: 'Validated owner evidence register with required documents, owner approvals, external-share status, no-secrets markers, and no unsupported claim markers.'
  },
  {
    hold: 'privacy_retention_dpa_missing',
    severity: 'P1',
    status: 'active',
    evidence_needed: 'Owner-approved privacy/data-processing summary, retention/deletion terms, DPA/subprocessor stance, and data inventory.'
  },
  {
    hold: 'support_sla_incident_missing',
    severity: 'P1',
    status: 'active',
    evidence_needed: 'Pilot support/SLA terms, escalation owner, incident response, and breach/notice stance.'
  },
  {
    hold: 'external_share_register_missing',
    severity: 'P1',
    status: 'active',
    evidence_needed: 'Owner-approved external-share register for procurement artifacts and questionnaire rows.'
  },
  {
    hold: 'rls_hosted_security_proof_missing',
    severity: 'P1',
    status: rlsProofReadyForSecurityClaim && hostedProofCount > 0 ? 'ready_for_review' : 'active',
    evidence_needed: 'RLS proof validator must pass with owner-approved local and linked pgTAP rows plus hosted smoke evidence.'
  },
  {
    hold: 'hosted_ai_security_and_action_boundary_missing',
    severity: 'P1',
    status: llmHostedRuntimeFixtureCount > 0 && ownerApprovedPolicyCount > 0 && hostedActionTestCount > 0 ? 'ready_for_review' : 'active',
    evidence_needed: 'Hosted LLM security and no-autonomous-action proof.'
  }
];

const gate = {
  schema_version: 'enterprise-procurement-readiness-gate-v1',
  generated_at: new Date().toISOString(),
  status: 'enterprise_procurement_gate_ready_not_owner_approved_or_security_proof',
  source: {
    ...inputPaths,
    enterprise_dimension_status: enterpriseDimension.status ?? 'unknown',
    enterprise_dimension_score_percent: Number(enterpriseDimension.current_score_percent ?? 0),
    trust_pack_status: enterpriseTrustPack.status ?? 'missing',
    enterprise_evidence_validation_status: enterpriseEvidenceValidationStatus,
    enterprise_evidence_ready_for_review: enterpriseEvidenceReadyForReview,
    enterprise_evidence_ready_document_count: enterpriseEvidenceReadyDocumentCount,
    enterprise_evidence_required_document_count: enterpriseEvidenceRequiredDocumentCount,
    enterprise_evidence_missing_document_count: enterpriseEvidenceMissingDocumentCount,
    enterprise_evidence_external_share_approved_count: enterpriseEvidenceExternalShareApprovedCount,
    enterprise_evidence_release_hold_count: enterpriseEvidenceReleaseHoldCount,
    enterprise_evidence_privacy_dpa_ready: enterpriseEvidencePrivacyDpaReady,
    enterprise_evidence_support_sla_ready: enterpriseEvidenceSupportSlaReady,
    enterprise_evidence_incident_response_ready: enterpriseEvidenceIncidentResponseReady,
    rls_proof_validation_status: rlsProofValidationStatus,
    rls_proof_expected_case_environment_count: rlsProofExpectedCaseEnvironmentCount,
    rls_proof_executed_count: rlsProofExecutedCount,
    rls_proof_local_ready_count: rlsProofLocalReadyCount,
    rls_proof_linked_ready_count: rlsProofLinkedReadyCount,
    rls_proof_release_hold_count: rlsProofReleaseHoldCount,
    rls_proof_ready_for_security_claim: rlsProofReadyForSecurityClaim,
    rls_tenant_isolation_claim_allowed: rlsProofTenantIsolationClaimAllowed,
    questionnaire_row_count: questionnaireRowCount,
    trust_domain_count: trustDomainCount,
    acceptance_gate_count: acceptanceGateCount,
    hosted_proof_count: hostedProofCount,
    hosted_smoke_plan_count: hostedSmokePlanCount,
    hosted_smoke_present_count: hostedSmokePresentCount,
    llm_hosted_runtime_fixture_count: llmHostedRuntimeFixtureCount,
    ai_owner_approved_policy_count: ownerApprovedPolicyCount,
    ai_hosted_verified_test_count: hostedActionTestCount,
    buyer_commitment_signal_count: buyerCommitmentSignalCount,
    forecast_real_resolved_outcome_count: forecastRealOutcomeCount
  },
  proof_boundary: {
    proves: [
      'Enterprise procurement missing documents and release holds are explicit.',
      'Privacy, retention, support/SLA, incident, and external-share approval gates are ready for owner review.',
      'Draft procurement artifacts are separated from security proof and buyer-shareable claims.'
    ],
    does_not_prove: [
      'Privacy compliance, DPA approval, or legal review.',
      'Enterprise SLA, support readiness, incident-response readiness, or breach-notification readiness.',
      'RLS/tenant isolation proof, hosted runtime proof, AI runtime security proof, buyer validation, or prediction accuracy.'
    ]
  },
  summary: {
    required_document_count: requiredDocuments.length,
    required_document_ready_count: enterpriseEvidenceReadyDocumentCount,
    required_document_missing_or_unapproved_count: enterpriseEvidenceMissingDocumentCount,
    external_share_artifact_count: externalShareArtifacts.length,
    external_share_approved_artifact_count: enterpriseEvidenceExternalShareApprovedCount,
    acceptance_gate_count: acceptanceGates.length,
    release_hold_count: releaseHolds.filter((hold) => hold.status === 'active').length,
    enterprise_security_score_percent: Number(enterpriseDimension.current_score_percent ?? 0),
    owner_approved_external_share_count: enterpriseEvidenceExternalShareApprovedCount,
    rls_proof_executed_count: rlsProofExecutedCount,
    rls_proof_local_ready_count: rlsProofLocalReadyCount,
    rls_proof_linked_ready_count: rlsProofLinkedReadyCount,
    rls_proof_ready_for_security_claim: rlsProofReadyForSecurityClaim,
    hosted_proof_count: hostedProofCount,
    privacy_dpa_ready: enterpriseEvidencePrivacyDpaReady,
    support_sla_ready: enterpriseEvidenceSupportSlaReady,
    incident_response_ready: enterpriseEvidenceIncidentResponseReady
  },
  current_source_alignment: sourceAlignment,
  required_documents: requiredDocuments,
  external_share_artifacts: externalShareArtifacts,
  acceptance_gates: acceptanceGates,
  release_holds: releaseHolds,
  required_owner_inputs: [
    'Fill and validate docs/launch-readiness/enterprise-procurement-evidence-register-2026-06-06.csv before upgrading enterprise procurement claims.',
    'Approve or provide privacy/data-processing summary, retention/deletion policy, DPA/subprocessor stance, and data inventory.',
    'Approve or provide pilot support/SLA, incident response, escalation owner, and breach/notice stance.',
    'Mark which procurement questionnaire rows and artifacts can be shared externally.',
    'Run RLS, hosted smoke, hosted LLM, and hosted AI action-boundary proof after owner-approved environment access.',
    'Fill and validate the RLS proof evidence register after local and linked pgTAP execution before any tenant-isolation claim is upgraded.',
    'Keep enterprise-ready, public-sector AI trust, and certification claims blocked until proof and approvals exist.'
  ],
  next_commands_after_owner_approval: [
    'npm run audit:enterprise:validate-evidence -- --json-output docs/launch-readiness/enterprise-procurement-evidence-validation-2026-06-06.json --md-output docs/launch-readiness/enterprise-procurement-evidence-validation-2026-06-06.md --csv-output docs/launch-readiness/enterprise-procurement-evidence-validation-checklist-2026-06-06.csv',
    'Attach owner-approved privacy/support/SLA/incident documents or update this gate with their paths.',
    'npm run audit:rls:validate-proof -- --register docs/launch-readiness/rls-proof-evidence-register-2026-06-06.csv --test-plan docs/launch-readiness/rls-identity-and-review-test-plan-2026-06-06.json --policy-draft docs/launch-readiness/rls-identity-and-review-policy-draft-2026-06-06.json --json-output docs/launch-readiness/rls-proof-evidence-validation-2026-06-06.json --md-output docs/launch-readiness/rls-proof-evidence-validation-2026-06-06.md --csv-output docs/launch-readiness/rls-proof-evidence-validation-checklist-2026-06-06.csv --update-evidence',
    'npm run audit:enterprise:procurement-gate -- --json-output docs/launch-readiness/enterprise-procurement-readiness-gate-2026-06-06.json --md-output docs/launch-readiness/enterprise-procurement-readiness-gate-2026-06-06.md --csv-output docs/launch-readiness/enterprise-procurement-readiness-checklist-2026-06-06.csv',
    'npm run audit:enterprise:trust-pack -- --json-output docs/launch-readiness/enterprise-trust-pack-2026-06-06.json --md-output docs/launch-readiness/enterprise-trust-pack-2026-06-06.md --csv-output docs/launch-readiness/enterprise-security-questionnaire-2026-06-06.csv',
    'npm run audit:commercial:confidence -- --json-output docs/launch-readiness/commercial-confidence-gate-2026-06-06.json --md-output docs/launch-readiness/commercial-confidence-gate-2026-06-06.md'
  ],
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
  const docRows = report.required_documents
    .map((document) => [
      mdCell(document.title),
      mdCell(document.current_status),
      mdCell(document.expected_artifact),
      mdCell(document.why_required)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const artifactRows = report.external_share_artifacts
    .map((artifact) => [
      mdCell(artifact.artifact),
      mdCell(artifact.current_status),
      mdCell(artifact.share_boundary)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

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
      mdCell(source.framework),
      source.source_url,
      mdCell(source.implication)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  return `# Enterprise Procurement Readiness Gate - 2026-06-06

## Decision

Status: \`${report.status}\`.

This artifact makes enterprise procurement, privacy, retention, support/SLA, incident, and external-share gates explicit. It does not prove privacy compliance, legal review, SLA readiness, incident-response readiness, RLS security, hosted runtime, AI runtime security, buyer validation, or prediction accuracy.

Enterprise security/trust score remains **${report.summary.enterprise_security_score_percent}%**. Owner-approved external-share artifacts: **${report.summary.external_share_approved_artifact_count}**. Required documents ready: **${report.summary.required_document_ready_count}/${report.summary.required_document_count}**.

Enterprise evidence validation status: **${report.source.enterprise_evidence_validation_status}** with ready-for-review **${report.source.enterprise_evidence_ready_for_review}**, privacy/DPA ready **${report.summary.privacy_dpa_ready}**, support/SLA ready **${report.summary.support_sla_ready}**, and incident response ready **${report.summary.incident_response_ready}**.

Allowed current claim: **Enterprise procurement readiness gates are mapped for owner review.**

Prohibited current claim: **Enterprise-ready security, privacy, SLA, or certified AI governance.**

## Required Documents

| Document | Current Status | Expected Artifact | Why Required |
|---|---|---|---|
${docRows}

## External-Share Artifacts

| Artifact | Current Status | Share Boundary |
|---|---|---|
${artifactRows}

## Acceptance Gates

| Gate | Current Status | Allowed Claim | Prohibited Claim |
|---|---|---|---|
${gateRows}

## Release Holds

| Hold | Severity | Status | Evidence Needed |
|---|---|---|---|
${holdRows}

## Current Source Alignment

| Framework | URL | Alignment |
|---|---|---|
${sourceRows}

## Required Owner Inputs

${report.required_owner_inputs.map((input, index) => `${index + 1}. ${input}`).join('\n')}

## Next Commands After Owner Approval

${report.next_commands_after_owner_approval.map((command, index) => `${index + 1}. \`${command}\``).join('\n')}

## Proof Boundary

This is an internal procurement readiness and approval gate. It is not a buyer-shareable security packet until owner-approved legal/privacy/support documents, external-share approvals, hosted proof, RLS proof, and AI runtime proof are attached.
`;
}

if (outputPaths.json) {
  writeArtifact(outputPaths.json, `${JSON.stringify(gate, null, 2)}\n`);
}

if (outputPaths.md) {
  writeArtifact(outputPaths.md, renderMarkdown(gate));
}

if (outputPaths.csv) {
  writeArtifact(outputPaths.csv, renderCsv(gate));
}

console.log(JSON.stringify({
  json_output: outputPaths.json,
  md_output: outputPaths.md,
  csv_output: outputPaths.csv,
  status: gate.status,
  required_document_missing_or_unapproved_count: gate.summary.required_document_missing_or_unapproved_count,
  external_share_approved_artifact_count: gate.summary.external_share_approved_artifact_count,
  release_hold_count: gate.summary.release_hold_count,
  enterprise_security_score_percent: gate.summary.enterprise_security_score_percent
}, null, 2));
