#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const ROOT = process.cwd();
const DEFAULT_EVIDENCE = 'docs/launch-readiness/launch-evidence-2026-06-06.json';
const DEFAULT_COMMERCIAL_CONFIDENCE_GATE = 'docs/launch-readiness/commercial-confidence-gate-2026-06-06.json';
const DEFAULT_MARKET_NICHE_VALIDATION = 'docs/launch-readiness/market-niche-evidence-validation-2026-06-06.json';
const DEFAULT_COMPETITIVE_POSITIONING_VALIDATION = 'docs/launch-readiness/competitive-positioning-evidence-validation-2026-06-06.json';
const DEFAULT_PILOT_PACKAGE_READINESS = 'docs/launch-readiness/pilot-package-readiness-2026-06-06.json';
const DEFAULT_BUYER_EXECUTION_READINESS = 'docs/launch-readiness/buyer-validation-execution-readiness-2026-06-06.json';
const DEFAULT_BUYER_SUBSTITUTION_EVIDENCE_VALIDATION = 'docs/launch-readiness/buyer-substitution-evidence-validation-2026-06-06.json';
const DEFAULT_FORECAST_EXECUTION_READINESS = 'docs/launch-readiness/forecast-evaluation-execution-readiness-2026-06-06.json';
const DEFAULT_ENTERPRISE_EXECUTION_READINESS = 'docs/launch-readiness/enterprise-trust-execution-readiness-2026-06-06.json';
const DEFAULT_HOSTED_SMOKE_EXECUTION_READINESS = 'docs/launch-readiness/hosted-smoke-execution-readiness-2026-06-06.json';
const DEFAULT_CLAIM_CONSISTENCY_VALIDATION = 'docs/launch-readiness/claim-consistency-validation-2026-06-06.json';
const DEFAULT_OWNER_APPROVAL_VALIDATION = 'docs/launch-readiness/owner-approval-register-validation-2026-06-06.json';
const DEFAULT_LOCAL_BROWSER_ROUTE_PROOF = 'docs/launch-readiness/local-browser-route-proof-2026-06-06.json';
const DEFAULT_EXTERNAL_SOURCE_FRESHNESS = 'docs/launch-readiness/external-source-freshness-2026-06-06.json';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/commercial-goal-completion-audit-2026-06-06.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/commercial-goal-completion-audit-2026-06-06.md';
const DEFAULT_CSV_OUTPUT = 'docs/launch-readiness/commercial-goal-completion-audit-checklist-2026-06-06.csv';

function argValue(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function usage() {
  console.error([
    'Usage: node scripts/validate-commercial-goal-completion.mjs',
    `  [--evidence ${DEFAULT_EVIDENCE}]`,
    `  [--commercial-confidence-gate ${DEFAULT_COMMERCIAL_CONFIDENCE_GATE}]`,
    `  [--market-niche-validation ${DEFAULT_MARKET_NICHE_VALIDATION}]`,
    `  [--competitive-positioning-validation ${DEFAULT_COMPETITIVE_POSITIONING_VALIDATION}]`,
    `  [--pilot-package-readiness ${DEFAULT_PILOT_PACKAGE_READINESS}]`,
    `  [--buyer-execution-readiness ${DEFAULT_BUYER_EXECUTION_READINESS}]`,
    `  [--buyer-substitution-evidence-validation ${DEFAULT_BUYER_SUBSTITUTION_EVIDENCE_VALIDATION}]`,
    `  [--forecast-execution-readiness ${DEFAULT_FORECAST_EXECUTION_READINESS}]`,
    `  [--enterprise-execution-readiness ${DEFAULT_ENTERPRISE_EXECUTION_READINESS}]`,
    `  [--hosted-smoke-execution-readiness ${DEFAULT_HOSTED_SMOKE_EXECUTION_READINESS}]`,
    `  [--claim-consistency-validation ${DEFAULT_CLAIM_CONSISTENCY_VALIDATION}]`,
    `  [--owner-approval-validation ${DEFAULT_OWNER_APPROVAL_VALIDATION}]`,
    `  [--local-browser-route-proof ${DEFAULT_LOCAL_BROWSER_ROUTE_PROOF}]`,
    `  [--external-source-freshness ${DEFAULT_EXTERNAL_SOURCE_FRESHNESS}]`,
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
  evidence: argValue('--evidence', DEFAULT_EVIDENCE),
  commercialConfidenceGate: argValue('--commercial-confidence-gate', DEFAULT_COMMERCIAL_CONFIDENCE_GATE),
  marketNicheValidation: argValue('--market-niche-validation', DEFAULT_MARKET_NICHE_VALIDATION),
  competitivePositioningValidation: argValue('--competitive-positioning-validation', DEFAULT_COMPETITIVE_POSITIONING_VALIDATION),
  pilotPackageReadiness: argValue('--pilot-package-readiness', DEFAULT_PILOT_PACKAGE_READINESS),
  buyerExecutionReadiness: argValue('--buyer-execution-readiness', DEFAULT_BUYER_EXECUTION_READINESS),
  buyerSubstitutionEvidenceValidation: argValue('--buyer-substitution-evidence-validation', DEFAULT_BUYER_SUBSTITUTION_EVIDENCE_VALIDATION),
  forecastExecutionReadiness: argValue('--forecast-execution-readiness', DEFAULT_FORECAST_EXECUTION_READINESS),
  enterpriseExecutionReadiness: argValue('--enterprise-execution-readiness', DEFAULT_ENTERPRISE_EXECUTION_READINESS),
  hostedSmokeExecutionReadiness: argValue('--hosted-smoke-execution-readiness', DEFAULT_HOSTED_SMOKE_EXECUTION_READINESS),
  claimConsistencyValidation: argValue('--claim-consistency-validation', DEFAULT_CLAIM_CONSISTENCY_VALIDATION),
  ownerApprovalValidation: argValue('--owner-approval-validation', DEFAULT_OWNER_APPROVAL_VALIDATION),
  localBrowserRouteProof: argValue('--local-browser-route-proof', DEFAULT_LOCAL_BROWSER_ROUTE_PROOF),
  externalSourceFreshness: argValue('--external-source-freshness', DEFAULT_EXTERNAL_SOURCE_FRESHNESS)
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

function statusFor({ passed, partial, blocked }) {
  if (passed) return 'proven_current';
  if (blocked) return 'blocked_owner_or_external_evidence';
  if (partial) return 'partial_current';
  return 'not_proven_current';
}

const evidence = readJsonIfExists(inputPaths.evidence, { proof_buckets: {}, fix_report: {} });
const commercialGate = readJsonIfExists(inputPaths.commercialConfidenceGate, { posture: {}, dimensions: [], primary_blockers: [], source: {} });
const marketNicheValidation = readJsonIfExists(inputPaths.marketNicheValidation, { status: 'missing', summary: {} });
const competitivePositioningValidation = readJsonIfExists(inputPaths.competitivePositioningValidation, { status: 'missing', summary: {} });
const pilotPackageReadiness = readJsonIfExists(inputPaths.pilotPackageReadiness, { status: 'missing', summary: {} });
const buyerExecutionReadiness = readJsonIfExists(inputPaths.buyerExecutionReadiness, { status: 'missing', summary: {} });
const buyerSubstitutionEvidenceValidation = readJsonIfExists(inputPaths.buyerSubstitutionEvidenceValidation, { status: 'missing', summary: {} });
const forecastExecutionReadiness = readJsonIfExists(inputPaths.forecastExecutionReadiness, { status: 'missing', summary: {} });
const enterpriseExecutionReadiness = readJsonIfExists(inputPaths.enterpriseExecutionReadiness, { status: 'missing', summary: {} });
const hostedSmokeExecutionReadiness = readJsonIfExists(inputPaths.hostedSmokeExecutionReadiness, { status: 'missing', summary: {} });
const claimConsistencyValidation = readJsonIfExists(inputPaths.claimConsistencyValidation, { status: 'missing', summary: {} });
const ownerApprovalValidation = readJsonIfExists(inputPaths.ownerApprovalValidation, { status: 'missing', summary: {} });
const localBrowserRouteProof = readJsonIfExists(inputPaths.localBrowserRouteProof, { status: 'missing', source: {} });
const externalSourceFreshness = readJsonIfExists(inputPaths.externalSourceFreshness, { status: 'missing', summary: {} });

const posture = commercialGate.posture ?? {};
const dimensions = commercialGate.dimensions ?? [];
const primaryBlockers = commercialGate.primary_blockers ?? [];
const proofBuckets = evidence.proof_buckets ?? {};
const localProofCount = Array.isArray(proofBuckets.local) ? proofBuckets.local.length : 0;
const repoProofCount = Array.isArray(proofBuckets.repo_artifact) ? proofBuckets.repo_artifact.length : 0;
const hostedProofCount = Array.isArray(proofBuckets.hosted_live) ? proofBuckets.hosted_live.length : 0;
const launchArtifactsReferenced = Object.values(commercialGate.source ?? {}).filter((value) => String(value ?? '').startsWith('docs/launch-readiness/')).length;

const sourceAnchorCounts = {
  market: Number(marketNicheValidation.summary?.current_research_anchor_count ?? 0),
  competitive: Number(competitivePositioningValidation.summary?.current_competitive_source_count ?? 0),
  forecast: Number(forecastExecutionReadiness.summary?.current_execution_source_count ?? 0),
  enterprise: Number(enterpriseExecutionReadiness.summary?.current_enterprise_source_count ?? 0),
  hosted: Number(hostedSmokeExecutionReadiness.summary?.current_hosted_source_count ?? 0)
};
const totalSourceAnchorCount = Object.values(sourceAnchorCounts).reduce((sum, value) => sum + value, 0);
const sourceFreshnessSourceCount = Number(externalSourceFreshness.summary?.source_count ?? 0);
const sourceFreshnessCheckedCount = Number(externalSourceFreshness.summary?.checked_count ?? 0);
const sourceFreshnessReachableCount = Number(externalSourceFreshness.summary?.reachable_count ?? 0);
const sourceFreshnessAccessLimitedCount = Number(externalSourceFreshness.summary?.access_limited_unverified_count ?? 0);
const sourceFreshnessBrokenCount = Number(externalSourceFreshness.summary?.broken_or_removed_count ?? 0);
const sourceFreshnessChecked = sourceFreshnessSourceCount > 0 && sourceFreshnessCheckedCount === sourceFreshnessSourceCount;
const sourceFreshnessCurrentEnough = sourceFreshnessChecked && sourceFreshnessBrokenCount === 0;

const confidencePercent = Number(posture.commercial_world_class_confidence_percent ?? 0);
const claimConsistencyReady = Boolean(claimConsistencyValidation.summary?.claim_consistency_ready)
  && Number(claimConsistencyValidation.summary?.unsupported_claim_mention_count ?? 0) === 0;
const ownerApprovalValidationStatus = ownerApprovalValidation.status ?? 'missing';
const ownerApprovalRequiredCount = Number(ownerApprovalValidation.summary?.required_approval_count ?? 0);
const ownerApprovalApprovedCount = Number(ownerApprovalValidation.summary?.owner_approved_count ?? 0);
const ownerApprovalRowErrorCount = Number(ownerApprovalValidation.summary?.row_error_count ?? 0);
const ownerApprovalReadyForDownstreamEvidence = Boolean(
  ownerApprovalValidation.summary?.all_required_approvals_ready_for_downstream_evidence
);
const topFiveNichesReady = Number(marketNicheValidation.summary?.required_niche_present_count ?? 0) >= 5
  && Number(marketNicheValidation.summary?.niche_count ?? 0) >= 5;
const marketPilotWedgeReady = Boolean(marketNicheValidation.summary?.buyer_safe_pilot_claim_allowed)
  && Boolean(competitivePositioningValidation.summary?.defensible_competitive_wedge_claim_allowed);
const pilotPackageReadyForOwnerReview = Boolean(pilotPackageReadiness.summary?.package_ready_for_owner_review);
const pilotPackageExternalShareReady = Boolean(pilotPackageReadiness.summary?.external_share_ready);
const pilotPackageSelectedTopFiveCount = Number(pilotPackageReadiness.summary?.selected_top_five_niche_count ?? 0);
const pilotPackageRequiredNicheCount = Number(pilotPackageReadiness.summary?.required_niche_count ?? 5);
const buyerExecutionReady = Boolean(buyerExecutionReadiness.summary?.execution_ready_for_owner_outreach);
const buyerValidated = Boolean(buyerExecutionReadiness.summary?.buyer_validation_verified)
  || Boolean(buyerExecutionReadiness.summary?.buyer_validated_claim_allowed);
const buyerSubstitutionEvidenceReady = Boolean(buyerSubstitutionEvidenceValidation.summary?.ready_for_buyer_proof_gate);
const buyerSubstitutionRealInteractionCount = Number(
  buyerSubstitutionEvidenceValidation.summary?.real_substitution_interaction_count ?? 0
);
const buyerSubstitutionValidCompletedCallCount = Number(
  buyerSubstitutionEvidenceValidation.summary?.valid_completed_substitution_call_count ?? 0
);
const buyerSubstitutionCompletedNicheCount = Number(
  buyerSubstitutionEvidenceValidation.summary?.completed_substitution_niche_count ?? 0
);
const buyerSubstitutionCommitmentSignalCount = Number(
  buyerSubstitutionEvidenceValidation.summary?.valid_commitment_signal_count ?? 0
);
const forecastOwnerExportReady = Boolean(forecastExecutionReadiness.summary?.execution_ready_for_owner_resolved_export);
const forecastClaimReady = Boolean(forecastExecutionReadiness.summary?.scoring_chain_ready_for_owner_claim_review);
const enterpriseOwnerReviewReady = Boolean(enterpriseExecutionReadiness.summary?.execution_ready_for_owner_trust_review);
const enterpriseProofReady = Boolean(enterpriseExecutionReadiness.summary?.enterprise_proof_ready_for_owner_claim_review);
const hostedOwnerUnblockReady = Boolean(hostedSmokeExecutionReadiness.summary?.owner_unblock_ready);
const hostedSmokeReady = Boolean(hostedSmokeExecutionReadiness.summary?.hosted_smoke_execution_ready);
const hostedProofComplete = Boolean(hostedSmokeExecutionReadiness.summary?.hosted_proof_complete);
const localBrowserProofReady = localBrowserRouteProof.status === 'local_route_proof_ready_not_hosted_proof'
  && Boolean(localBrowserRouteProof.source?.all_top_niche_routes_ready);

const requirements = [
  {
    id: 'top_five_niche_areas_clear',
    requirement: 'Proceed only once the top five niche areas are clear.',
    status: statusFor({ passed: topFiveNichesReady }),
    evidence: `${marketNicheValidation.status}; niches=${marketNicheValidation.summary?.niche_count ?? 0}/${marketNicheValidation.summary?.required_niche_count ?? 5}; buyer_safe_pilot_claim_allowed=${Boolean(marketNicheValidation.summary?.buyer_safe_pilot_claim_allowed)}.`,
    proof_bucket: 'repo_artifact',
    next_action: topFiveNichesReady ? 'Keep these five niches as the working commercial thesis until buyer evidence changes the ranking.' : 'Regenerate market niche validation.'
  },
  {
    id: 'repo_first_deep_codebase_audit',
    requirement: 'Inspect the real codebase closely before conclusions.',
    status: statusFor({ passed: localProofCount >= 30 && repoProofCount >= 30 && launchArtifactsReferenced >= 25, partial: localProofCount > 0 || repoProofCount > 0 }),
    evidence: `${localProofCount} local proof entries, ${repoProofCount} repo-artifact entries, ${launchArtifactsReferenced} launch-readiness source artifacts referenced by the confidence gate.`,
    proof_bucket: 'repo_artifact',
    next_action: 'Continue treating full source/runtime checks as lane-specific proof; avoid claiming every source line is fully audited.'
  },
  {
    id: 'current_internet_best_practice_research',
    requirement: 'Use current internet-backed best practices and scientific frameworks.',
    status: statusFor({ passed: totalSourceAnchorCount >= 25 && sourceFreshnessCurrentEnough, partial: totalSourceAnchorCount > 0 || sourceFreshnessSourceCount > 0 }),
    evidence: `Source anchors: market=${sourceAnchorCounts.market}, competitive=${sourceAnchorCounts.competitive}, forecast=${sourceAnchorCounts.forecast}, enterprise=${sourceAnchorCounts.enterprise}, hosted=${sourceAnchorCounts.hosted}; total=${totalSourceAnchorCount}. Source freshness=${externalSourceFreshness.status}; checked=${sourceFreshnessCheckedCount}/${sourceFreshnessSourceCount}; reachable=${sourceFreshnessReachableCount}; access_limited=${sourceFreshnessAccessLimitedCount}; broken=${sourceFreshnessBrokenCount}.`,
    proof_bucket: 'repo_artifact',
    next_action: 'Refresh source anchors when market, forecasting, AI security, or hosted-proof standards change.'
  },
  {
    id: 'marketability_sellability_uniqueness',
    requirement: 'Identify unique, marketable, sellable strengths versus market gaps.',
    status: statusFor({ passed: marketPilotWedgeReady && buyerValidated, partial: marketPilotWedgeReady, blocked: !buyerValidated && marketPilotWedgeReady }),
    evidence: `${competitivePositioningValidation.status}; defensible_competitive_wedge_claim_allowed=${Boolean(competitivePositioningValidation.summary?.defensible_competitive_wedge_claim_allowed)}; pilot_package_status=${pilotPackageReadiness.status}; package_ready_for_owner_review=${pilotPackageReadyForOwnerReview}; external_share_ready=${pilotPackageExternalShareReady}; selected_top_five=${pilotPackageSelectedTopFiveCount}/${pilotPackageRequiredNicheCount}; buyer_validated_claim_allowed=${Boolean(competitivePositioningValidation.summary?.buyer_validated_claim_allowed)}; substitution_evidence_status=${buyerSubstitutionEvidenceValidation.status}; substitution_evidence_ready=${buyerSubstitutionEvidenceReady}; real_substitution_interactions=${buyerSubstitutionRealInteractionCount}.`,
    proof_bucket: 'repo_artifact',
    next_action: buyerExecutionReady ? 'Run owner-approved discovery calls and validate real buyer signals.' : 'Repair buyer execution readiness before outreach.'
  },
  {
    id: 'buyer_validation_and_willingness_to_pay',
    requirement: 'Verify sellability with buyer evidence, not desk research alone.',
    status: statusFor({ passed: buyerValidated, partial: buyerExecutionReady, blocked: buyerExecutionReady && !buyerValidated }),
    evidence: `${buyerExecutionReadiness.status}; selected targets=${buyerExecutionReadiness.summary?.selected_target_count ?? 0}; completed calls=${buyerExecutionReadiness.summary?.completed_call_count ?? 0}; valid outcome-capture rows=${buyerExecutionReadiness.summary?.valid_outcome_capture_count_after_input_validation ?? 0}; qualified followups=${buyerExecutionReadiness.summary?.qualified_followup_count ?? 0}; paid/LOI/procurement signals=${buyerExecutionReadiness.summary?.paid_pilot_loi_or_procurement_signal_count ?? 0}; substitution validation=${buyerSubstitutionEvidenceValidation.status}; substitution completed calls=${buyerSubstitutionValidCompletedCallCount}; substitution niches=${buyerSubstitutionCompletedNicheCount}; substitution commitment signals=${buyerSubstitutionCommitmentSignalCount}; owner approvals=${ownerApprovalApprovedCount}/${ownerApprovalRequiredCount}.`,
    proof_bucket: 'owner_input',
    next_action: 'Owner completes the 10-call validation loop with outcome-capture rows, fills substitution outcomes, and reruns buyer input, substitution-evidence, and proof validators.'
  },
  {
    id: 'accurate_prediction_scientific_proof',
    requirement: 'Make accurate/world-class prediction strategy factually defensible.',
    status: statusFor({ passed: forecastClaimReady, partial: forecastOwnerExportReady, blocked: forecastOwnerExportReady && !forecastClaimReady }),
    evidence: `${forecastExecutionReadiness.status}; repo surfaces=${forecastExecutionReadiness.summary?.present_repo_surface_count ?? 0}/${forecastExecutionReadiness.summary?.required_repo_surface_count ?? 0}; valid resolved forecasts=${forecastExecutionReadiness.summary?.valid_resolved_forecast_count ?? 0}; valid baselines=${forecastExecutionReadiness.summary?.valid_baseline_count ?? 0}; scoring_chain_ready=${forecastClaimReady}; owner approvals=${ownerApprovalApprovedCount}/${ownerApprovalRequiredCount}.`,
    proof_bucket: 'owner_input',
    next_action: 'Owner supplies resolved forecast export and comparable baselines, then rerun leakage/scoring/science validators.'
  },
  {
    id: 'hosted_browser_runtime_proof',
    requirement: 'Use Browser/hosted runtime proof before hosted-live or buyer-facing runtime claims.',
    status: statusFor({ passed: hostedProofComplete, partial: localBrowserProofReady && hostedOwnerUnblockReady, blocked: hostedOwnerUnblockReady && !hostedSmokeReady }),
    evidence: `${hostedSmokeExecutionReadiness.status}; owner_unblock_ready=${hostedOwnerUnblockReady}; hosted_smoke_execution_ready=${hostedSmokeReady}; hosted_proof_complete=${hostedProofComplete}; local route proof=${localBrowserProofReady}; hosted proof entries=${hostedProofCount}; owner approvals=${ownerApprovalApprovedCount}/${ownerApprovalRequiredCount}.`,
    proof_bucket: hostedProofComplete ? 'hosted_live' : 'repo_artifact',
    next_action: 'Owner grants project access/deploy binding and then Browser/Playwright hosted smoke can run.'
  },
  {
    id: 'enterprise_public_sector_trust',
    requirement: 'Support enterprise/public-sector sellability with trust, procurement, RLS, LLM security, and AI action controls.',
    status: statusFor({ passed: enterpriseProofReady, partial: enterpriseOwnerReviewReady, blocked: enterpriseOwnerReviewReady && !enterpriseProofReady }),
    evidence: `${enterpriseExecutionReadiness.status}; procurement docs=${enterpriseExecutionReadiness.summary?.procurement_ready_document_count ?? 0}/${enterpriseExecutionReadiness.summary?.procurement_required_document_count ?? 8}; RLS rows=${enterpriseExecutionReadiness.summary?.rls_executed_row_count ?? 0}/${enterpriseExecutionReadiness.summary?.rls_expected_case_environment_row_count ?? 0}; local LLM red-team=${enterpriseExecutionReadiness.summary?.local_llm_red_team_passed ?? false}; hosted access=${enterpriseExecutionReadiness.summary?.hosted_access_ready_for_smoke ?? false}; owner approvals=${ownerApprovalApprovedCount}/${ownerApprovalRequiredCount}.`,
    proof_bucket: 'owner_input',
    next_action: 'Owner approves procurement documents and RLS/action-policy gates, then run hosted/RLS proof.'
  },
  {
    id: 'loopholes_and_fix_loop',
    requirement: 'Find loopholes, suggest fixes, and keep looping.',
    status: statusFor({ passed: primaryBlockers.length > 0 && dimensions.length >= 7 }),
    evidence: `${primaryBlockers.length} primary blockers ranked; dimension statuses=${dimensions.map((dimension) => `${dimension.id}:${dimension.status}`).join('; ')}; owner approval register=${ownerApprovalValidationStatus}; approved=${ownerApprovalApprovedCount}/${ownerApprovalRequiredCount}; errors=${ownerApprovalRowErrorCount}.`,
    proof_bucket: 'repo_artifact',
    next_action: 'Continue the loop in ranked order: prediction, buyer, enterprise, hosted.'
  },
  {
    id: 'claim_boundary_truthfulness',
    requirement: 'Do not overclaim world-class, commercial-ready, hosted-live, enterprise-ready, or accurate predictions.',
    status: statusFor({ passed: claimConsistencyReady }),
    evidence: `${claimConsistencyValidation.status}; scanned=${claimConsistencyValidation.summary?.scanned_file_count ?? 0}; unsupported=${claimConsistencyValidation.summary?.unsupported_claim_mention_count ?? 0}; confidence=${confidencePercent}.`,
    proof_bucket: 'repo_artifact',
    next_action: 'Rerun claim consistency after every generated artifact or market-language change.'
  },
  {
    id: 'requested_95_percent_confidence',
    requirement: 'Reach factual 95% confidence in the strategy and world-class prediction posture.',
    status: statusFor({ passed: confidencePercent >= 95, partial: confidencePercent >= 70, blocked: confidencePercent < 95 }),
    evidence: `commercial_world_class_confidence_percent=${confidencePercent}; target=${posture.target_confidence_percent ?? 95}; decision=${posture.decision ?? 'unknown'}; launch_decision=${posture.launch_decision ?? 'unknown'}.`,
    proof_bucket: 'commercial_gate',
    next_action: 'Do not mark the goal complete until real owner/buyer/hosted/prediction evidence closes the confidence gap.'
  }
];

const provenCount = requirements.filter((item) => item.status === 'proven_current').length;
const partialCount = requirements.filter((item) => item.status === 'partial_current').length;
const blockedCount = requirements.filter((item) => item.status === 'blocked_owner_or_external_evidence').length;
const notProvenCount = requirements.filter((item) => item.status === 'not_proven_current').length;
const completionReady = confidencePercent >= 95
  && requirements.every((item) => item.status === 'proven_current')
  && (posture.decision ?? '') === 'ready_for_commercial_ready_review';

const audit = {
  schema_version: 'commercial-goal-completion-audit-v1',
  generated_at: new Date().toISOString(),
  status: completionReady
    ? 'commercial_goal_completion_audit_passed'
    : 'commercial_goal_completion_audit_not_complete',
  source: {
    evidence: inputPaths.evidence,
    commercial_confidence_gate: inputPaths.commercialConfidenceGate,
    market_niche_validation: inputPaths.marketNicheValidation,
    competitive_positioning_validation: inputPaths.competitivePositioningValidation,
    pilot_package_readiness: inputPaths.pilotPackageReadiness,
    buyer_execution_readiness: inputPaths.buyerExecutionReadiness,
    buyer_substitution_evidence_validation: inputPaths.buyerSubstitutionEvidenceValidation,
    forecast_execution_readiness: inputPaths.forecastExecutionReadiness,
    enterprise_execution_readiness: inputPaths.enterpriseExecutionReadiness,
    hosted_smoke_execution_readiness: inputPaths.hostedSmokeExecutionReadiness,
    claim_consistency_validation: inputPaths.claimConsistencyValidation,
    owner_approval_validation: inputPaths.ownerApprovalValidation,
    local_browser_route_proof: inputPaths.localBrowserRouteProof,
    external_source_freshness: inputPaths.externalSourceFreshness
  },
  summary: {
    requirement_count: requirements.length,
    proven_count: provenCount,
    partial_count: partialCount,
    blocked_owner_or_external_count: blockedCount,
    not_proven_count: notProvenCount,
    completion_ready: completionReady,
    launch_decision: posture.launch_decision ?? 'unknown',
    pilot_strategy_confidence_percent: Number(posture.pilot_strategy_confidence_percent ?? 0),
    commercial_world_class_confidence_percent: confidencePercent,
    target_confidence_percent: Number(posture.target_confidence_percent ?? 95),
    confidence_gap_percent: Number(posture.confidence_gap_percent ?? 95 - confidencePercent),
    claim_consistency_ready: claimConsistencyReady,
    owner_approval_validation_status: ownerApprovalValidationStatus,
    owner_approval_required_count: ownerApprovalRequiredCount,
    owner_approval_approved_count: ownerApprovalApprovedCount,
    owner_approval_row_error_count: ownerApprovalRowErrorCount,
    owner_approval_ready_for_downstream_evidence: ownerApprovalReadyForDownstreamEvidence,
    pilot_package_readiness_status: pilotPackageReadiness.status,
    pilot_package_ready_for_owner_review: pilotPackageReadyForOwnerReview,
    pilot_package_external_share_ready: pilotPackageExternalShareReady,
    pilot_package_selected_top_five_count: pilotPackageSelectedTopFiveCount,
    pilot_package_required_niche_count: pilotPackageRequiredNicheCount,
    top_five_niches_clear: topFiveNichesReady,
    buyer_validation_verified: buyerValidated,
    buyer_substitution_evidence_ready: buyerSubstitutionEvidenceReady,
    buyer_substitution_real_interaction_count: buyerSubstitutionRealInteractionCount,
    buyer_substitution_valid_completed_call_count: buyerSubstitutionValidCompletedCallCount,
    buyer_substitution_completed_niche_count: buyerSubstitutionCompletedNicheCount,
    buyer_substitution_commitment_signal_count: buyerSubstitutionCommitmentSignalCount,
    forecast_claim_ready: forecastClaimReady,
    hosted_proof_complete: hostedProofComplete,
    enterprise_proof_ready: enterpriseProofReady,
    source_anchor_count: totalSourceAnchorCount,
    external_source_freshness_status: externalSourceFreshness.status,
    external_source_freshness_source_count: sourceFreshnessSourceCount,
    external_source_freshness_reachable_count: sourceFreshnessReachableCount,
    external_source_freshness_access_limited_count: sourceFreshnessAccessLimitedCount,
    external_source_freshness_broken_count: sourceFreshnessBrokenCount,
    local_proof_count: localProofCount,
    repo_proof_count: repoProofCount,
    hosted_proof_count: hostedProofCount
  },
  requirement_audit: requirements,
  primary_blockers: primaryBlockers,
  next_decision: completionReady
    ? 'Goal can be reviewed for completion.'
    : 'Keep goal active. Current evidence supports pilot-only positioning, not 95% world-class/commercial-ready completion.',
  next_loop_order: [
    'Owner-approved consolidated approval register rows before downstream forecast, buyer, enterprise, RLS, hosted, payment, AI-action, and claim-language proof runs.',
    'Owner-approved resolved forecast export and comparable baselines for prediction proof.',
    'Owner-approved 10-call buyer discovery execution and evidence validation.',
    'Owner-approved buyer substitution outcomes across the five niches, including current tool, budget owner, switching barrier, proof shown, qualified outcome, and commitment signal.',
    'Owner-approved procurement documents, RLS execution, AI action policy approval, and hosted LLM/security proof.',
    'Hosted project visibility, function/secret management access, deploy binding, Stripe proof values, and hosted smoke runs.',
    'Rerun claim consistency and commercial confidence after every evidence addition.'
  ],
  proof_boundary: 'This audit checks whether the original goal is currently complete. It does not create buyer evidence, hosted proof, enterprise proof, or prediction accuracy proof.'
};

function renderCsv(report) {
  return [
    csvLine(['id', 'status', 'proof_bucket', 'requirement', 'evidence', 'next_action']),
    ...report.requirement_audit.map((item) => csvLine([
      item.id,
      item.status,
      item.proof_bucket,
      item.requirement,
      item.evidence,
      item.next_action
    ]))
  ].join('\n') + '\n';
}

function renderMarkdown(report) {
  const rows = report.requirement_audit
    .map((item) => [
      mdCell(item.id),
      mdCell(item.status),
      mdCell(item.proof_bucket),
      mdCell(item.evidence),
      mdCell(item.next_action)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  return `# Commercial Goal Completion Audit - 2026-06-06

## Decision

Status: \`${report.status}\`.

Completion ready: **${report.summary.completion_ready}**.

Launch decision: **${report.summary.launch_decision}**.

Pilot strategy confidence: **${report.summary.pilot_strategy_confidence_percent}%**.

Commercial/world-class confidence: **${report.summary.commercial_world_class_confidence_percent}%**.

Confidence gap to 95%: **${report.summary.confidence_gap_percent}%**.

Claim consistency ready: **${report.summary.claim_consistency_ready}**.

## Requirement Audit

| Requirement | Status | Proof Bucket | Evidence | Next Action |
|---|---|---|---|---|
${rows}

## Next Loop Order

${report.next_loop_order.map((item, index) => `${index + 1}. ${item}`).join('\n')}

## Proof Boundary

${report.proof_boundary}
`;
}

if (outputPaths.json) {
  writeArtifact(outputPaths.json, `${JSON.stringify(audit, null, 2)}\n`);
}

if (outputPaths.md) {
  writeArtifact(outputPaths.md, renderMarkdown(audit));
}

if (outputPaths.csv) {
  writeArtifact(outputPaths.csv, renderCsv(audit));
}

if (updateEvidence) {
  const nextEvidence = readJsonIfExists(inputPaths.evidence, null);
  if (!nextEvidence) {
    console.error(`Cannot update missing evidence artifact: ${inputPaths.evidence}`);
    process.exit(2);
  }

  nextEvidence.proof_buckets = nextEvidence.proof_buckets ?? {};
  nextEvidence.proof_buckets.local = replaceMatchingThenAppend(nextEvidence.proof_buckets.local, [
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:commercial:goal-completion -- --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence: status ${audit.status}, completion_ready ${audit.summary.completion_ready}, commercial_world_class_confidence_percent ${audit.summary.commercial_world_class_confidence_percent}`
  ], [
    /npm run audit:commercial:goal-completion/
  ]);

  nextEvidence.proof_buckets.repo_artifact = replaceMatchingThenAppend(nextEvidence.proof_buckets.repo_artifact, [
    'scripts/validate-commercial-goal-completion.mjs maps the original goal requirements to current proof status and keeps the goal active when evidence is missing',
    'docs/launch-readiness/commercial-goal-completion-audit-2026-06-06.json records proven, partial, owner-blocked, and not-proven requirements',
    'docs/launch-readiness/commercial-goal-completion-audit-checklist-2026-06-06.csv provides the goal-completion checklist'
  ], [
    /scripts\/validate-commercial-goal-completion\.mjs/,
    /commercial-goal-completion-audit-2026-06-06\.json/,
    /commercial-goal-completion-audit-checklist-2026-06-06\.csv/
  ]);

  nextEvidence.fix_report = nextEvidence.fix_report ?? {};
  nextEvidence.fix_report.files_changed = replaceMatchingThenAppend(nextEvidence.fix_report.files_changed, [
    'scripts/validate-commercial-goal-completion.mjs',
    'docs/launch-readiness/commercial-goal-completion-audit-2026-06-06.json',
    'docs/launch-readiness/commercial-goal-completion-audit-2026-06-06.md',
    'docs/launch-readiness/commercial-goal-completion-audit-checklist-2026-06-06.csv',
    'package.json'
  ], [
    /scripts\/validate-commercial-goal-completion\.mjs/,
    /commercial-goal-completion-audit-2026-06-06\.json/,
    /commercial-goal-completion-audit-2026-06-06\.md/,
    /commercial-goal-completion-audit-checklist-2026-06-06\.csv/,
    /package\.json/
  ]);
  nextEvidence.fix_report.tests_run = replaceMatchingThenAppend(nextEvidence.fix_report.tests_run, [
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH node --check scripts/validate-commercial-goal-completion.mjs',
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:commercial:goal-completion -- --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence`
  ], [
    /node --check scripts\/validate-commercial-goal-completion\.mjs/,
    /npm run audit:commercial:goal-completion/
  ]);
  nextEvidence.fix_report.approval_gates = replaceMatchingThenAppend(nextEvidence.fix_report.approval_gates, [
    'Commercial goal completion audit confirms the active goal is not complete until buyer validation, hosted proof, enterprise proof, prediction scoring proof, and 95% commercial/world-class confidence are proven with current evidence.'
  ], [
    /Commercial goal completion audit confirms/
  ]);

  nextEvidence.implementation_decisions = replaceByTaskId(nextEvidence.implementation_decisions, {
    task_id: 'commercial-goal-completion-audit',
    decision: 'Add a deterministic full-objective completion audit so the persistent goal is not accidentally narrowed to the latest validator.',
    acceptance_check: 'The audit must map each explicit objective requirement to current evidence, include current external source freshness when available, and keep completion false while 95% confidence, buyer validation, hosted proof, enterprise proof, or prediction proof is missing.',
    chosen_variant: 'minimal Node artifact validator and package script with optional external-source-freshness input; no score inflation and no owner evidence fabrication',
    repo_pattern_reused: 'Existing launch-readiness validator and evidence update pattern',
    files_changed: [
      'scripts/validate-commercial-goal-completion.mjs',
      'package.json'
    ],
    tests_run: [
      'node --check scripts/validate-commercial-goal-completion.mjs',
      'npm run audit:commercial:goal-completion'
    ],
    proof: `${audit.status}; completion_ready=${audit.summary.completion_ready}; commercial_world_class_confidence_percent=${audit.summary.commercial_world_class_confidence_percent}.`,
    reason: 'The original goal requires factual 95% confidence and world-class/commercial-ready proof; current artifacts are strong but still pilot-only.'
  });

  writeArtifact(inputPaths.evidence, `${JSON.stringify(nextEvidence, null, 2)}\n`);
}

console.log(JSON.stringify({
  json_output: outputPaths.json,
  md_output: outputPaths.md,
  csv_output: outputPaths.csv,
  evidence_updated: updateEvidence,
  status: audit.status,
  completion_ready: audit.summary.completion_ready,
  proven_count: audit.summary.proven_count,
  partial_count: audit.summary.partial_count,
  blocked_owner_or_external_count: audit.summary.blocked_owner_or_external_count,
  not_proven_count: audit.summary.not_proven_count,
  launch_decision: audit.summary.launch_decision,
  commercial_world_class_confidence_percent: audit.summary.commercial_world_class_confidence_percent,
  confidence_gap_percent: audit.summary.confidence_gap_percent
}, null, 2));
