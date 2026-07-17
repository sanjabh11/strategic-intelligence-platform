#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const ROOT = process.cwd();

const DEFAULT_EVIDENCE = 'docs/launch-readiness/launch-evidence-2026-06-06.json';
const DEFAULT_PILOT_OFFER_PACK = 'docs/launch-readiness/pilot-offer-pack-2026-06-06.json';
const DEFAULT_PILOT_OUTCOME_MEASUREMENT_KIT = 'docs/launch-readiness/pilot-outcome-measurement-kit-2026-06-06.json';
const DEFAULT_MARKET_NICHE_VALIDATION = 'docs/launch-readiness/market-niche-evidence-validation-2026-06-06.json';
const DEFAULT_COMPETITIVE_POSITIONING_VALIDATION = 'docs/launch-readiness/competitive-positioning-evidence-validation-2026-06-06.json';
const DEFAULT_BUYER_DISCOVERY_KIT = 'docs/launch-readiness/buyer-discovery-kit-2026-06-06.json';
const DEFAULT_BUYER_EXECUTION_READINESS = 'docs/launch-readiness/buyer-validation-execution-readiness-2026-06-06.json';
const DEFAULT_BUYER_SUBSTITUTION_EVIDENCE_VALIDATION = 'docs/launch-readiness/buyer-substitution-evidence-validation-2026-06-06.json';
const DEFAULT_LOCAL_BROWSER_ROUTE_PROOF = 'docs/launch-readiness/local-browser-route-proof-2026-06-06.json';
const DEFAULT_HOSTED_SMOKE_EXECUTION_READINESS = 'docs/launch-readiness/hosted-smoke-execution-readiness-2026-06-06.json';
const DEFAULT_OWNER_APPROVAL_VALIDATION = 'docs/launch-readiness/owner-approval-register-validation-2026-06-06.json';
const DEFAULT_CLAIM_CONSISTENCY_VALIDATION = 'docs/launch-readiness/claim-consistency-validation-2026-06-06.json';
const DEFAULT_EXTERNAL_SOURCE_FRESHNESS = 'docs/launch-readiness/external-source-freshness-2026-06-06.json';
const DEFAULT_COMMERCIAL_CONFIDENCE_GATE = 'docs/launch-readiness/commercial-confidence-gate-2026-06-06.json';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/pilot-package-readiness-2026-06-06.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/pilot-package-readiness-2026-06-06.md';
const DEFAULT_CSV_OUTPUT = 'docs/launch-readiness/pilot-package-readiness-checklist-2026-06-06.csv';

const REQUIRED_NICHES = [
  'Enterprise/public-sector strategic decision intelligence',
  'Governed forecasting and research workflow',
  'Geopolitical risk radar and scenario monitor',
  'Executive and analyst briefing layer',
  'Negotiation and strategic reasoning training'
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
    'Usage: node scripts/validate-pilot-package-readiness.mjs',
    `  [--evidence ${DEFAULT_EVIDENCE}]`,
    `  [--pilot-offer-pack ${DEFAULT_PILOT_OFFER_PACK}]`,
    `  [--pilot-outcome-measurement-kit ${DEFAULT_PILOT_OUTCOME_MEASUREMENT_KIT}]`,
    `  [--market-niche-validation ${DEFAULT_MARKET_NICHE_VALIDATION}]`,
    `  [--competitive-positioning-validation ${DEFAULT_COMPETITIVE_POSITIONING_VALIDATION}]`,
    `  [--buyer-discovery-kit ${DEFAULT_BUYER_DISCOVERY_KIT}]`,
    `  [--buyer-execution-readiness ${DEFAULT_BUYER_EXECUTION_READINESS}]`,
    `  [--buyer-substitution-evidence-validation ${DEFAULT_BUYER_SUBSTITUTION_EVIDENCE_VALIDATION}]`,
    `  [--local-browser-route-proof ${DEFAULT_LOCAL_BROWSER_ROUTE_PROOF}]`,
    `  [--hosted-smoke-execution-readiness ${DEFAULT_HOSTED_SMOKE_EXECUTION_READINESS}]`,
    `  [--owner-approval-validation ${DEFAULT_OWNER_APPROVAL_VALIDATION}]`,
    `  [--claim-consistency-validation ${DEFAULT_CLAIM_CONSISTENCY_VALIDATION}]`,
    `  [--external-source-freshness ${DEFAULT_EXTERNAL_SOURCE_FRESHNESS}]`,
    `  [--commercial-confidence-gate ${DEFAULT_COMMERCIAL_CONFIDENCE_GATE}]`,
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
  pilotOfferPack: argValue('--pilot-offer-pack', DEFAULT_PILOT_OFFER_PACK),
  pilotOutcomeMeasurementKit: argValue('--pilot-outcome-measurement-kit', DEFAULT_PILOT_OUTCOME_MEASUREMENT_KIT),
  marketNicheValidation: argValue('--market-niche-validation', DEFAULT_MARKET_NICHE_VALIDATION),
  competitivePositioningValidation: argValue('--competitive-positioning-validation', DEFAULT_COMPETITIVE_POSITIONING_VALIDATION),
  buyerDiscoveryKit: argValue('--buyer-discovery-kit', DEFAULT_BUYER_DISCOVERY_KIT),
  buyerExecutionReadiness: argValue('--buyer-execution-readiness', DEFAULT_BUYER_EXECUTION_READINESS),
  buyerSubstitutionEvidenceValidation: argValue(
    '--buyer-substitution-evidence-validation',
    DEFAULT_BUYER_SUBSTITUTION_EVIDENCE_VALIDATION
  ),
  localBrowserRouteProof: argValue('--local-browser-route-proof', DEFAULT_LOCAL_BROWSER_ROUTE_PROOF),
  hostedSmokeExecutionReadiness: argValue('--hosted-smoke-execution-readiness', DEFAULT_HOSTED_SMOKE_EXECUTION_READINESS),
  ownerApprovalValidation: argValue('--owner-approval-validation', DEFAULT_OWNER_APPROVAL_VALIDATION),
  claimConsistencyValidation: argValue('--claim-consistency-validation', DEFAULT_CLAIM_CONSISTENCY_VALIDATION),
  externalSourceFreshness: argValue('--external-source-freshness', DEFAULT_EXTERNAL_SOURCE_FRESHNESS),
  commercialConfidenceGate: argValue('--commercial-confidence-gate', DEFAULT_COMMERCIAL_CONFIDENCE_GATE)
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

function csvLine(values) {
  return values.map(csvCell).join(',');
}

function mdCell(value) {
  return String(value ?? '').replaceAll('|', '/').replace(/\s+/g, ' ').trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalize(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
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

function existingProofPacketCount(paths) {
  return asArray(paths).filter((item) => existsSync(resolveRepoPath(item))).length;
}

const evidence = readJsonIfExists(inputPaths.evidence, { proof_buckets: {}, fix_report: {} });
const pilotOfferPack = readJsonIfExists(inputPaths.pilotOfferPack, { status: 'missing', pilot_offer: {}, niche_offer_sequence: [] });
const pilotOutcomeMeasurementKit = readJsonIfExists(inputPaths.pilotOutcomeMeasurementKit, { status: 'missing', summary: {}, outcome_rows: [] });
const marketNicheValidation = readJsonIfExists(inputPaths.marketNicheValidation, { status: 'missing', summary: {}, niche_checks: [] });
const competitivePositioningValidation = readJsonIfExists(inputPaths.competitivePositioningValidation, { status: 'missing', summary: {} });
const buyerDiscoveryKit = readJsonIfExists(inputPaths.buyerDiscoveryKit, { status: 'missing', selected_targets: [], source: {} });
const buyerExecutionReadiness = readJsonIfExists(inputPaths.buyerExecutionReadiness, { status: 'missing', summary: {} });
const buyerSubstitutionEvidenceValidation = readJsonIfExists(inputPaths.buyerSubstitutionEvidenceValidation, {
  status: 'missing',
  summary: {}
});
const localBrowserRouteProof = readJsonIfExists(inputPaths.localBrowserRouteProof, { status: 'missing', source: {} });
const hostedSmokeExecutionReadiness = readJsonIfExists(inputPaths.hostedSmokeExecutionReadiness, { status: 'missing', summary: {} });
const ownerApprovalValidation = readJsonIfExists(inputPaths.ownerApprovalValidation, { status: 'missing', summary: {} });
const claimConsistencyValidation = readJsonIfExists(inputPaths.claimConsistencyValidation, { status: 'missing', summary: {} });
const externalSourceFreshness = readJsonIfExists(inputPaths.externalSourceFreshness, { status: 'missing', summary: {} });
const commercialConfidenceGate = readJsonIfExists(inputPaths.commercialConfidenceGate, { posture: {}, primary_blockers: [] });

const offer = pilotOfferPack.pilot_offer ?? {};
const proofPacket = asArray(offer.proof_packet);
const nicheSequence = asArray(pilotOfferPack.niche_offer_sequence);
const selectedTargets = asArray(buyerDiscoveryKit.selected_targets);
const presentNiches = new Set(nicheSequence.map((item) => normalize(item.niche)));
const selectedNiches = new Set(selectedTargets.map((item) => normalize(item.niche)));
const missingNiches = REQUIRED_NICHES.filter((niche) => !presentNiches.has(normalize(niche)));
const missingSelectedNiches = REQUIRED_NICHES.filter((niche) => !selectedNiches.has(normalize(niche)));
const sequenceRowsWithProof = nicheSequence.filter((item) => asArray(item.proof_assets).length > 0).length;
const sequenceRowsWithBoundary = nicheSequence.filter((item) => String(item.sale_boundary ?? '').trim()).length;
const proofPacketExistingCount = existingProofPacketCount(proofPacket);
const ownerApprovedCount = Number(ownerApprovalValidation.summary?.owner_approved_count ?? 0);
const ownerRequiredCount = Number(ownerApprovalValidation.summary?.required_approval_count ?? 0);
const sourceCount = Number(externalSourceFreshness.summary?.source_count ?? 0);
const checkedSourceCount = Number(externalSourceFreshness.summary?.checked_count ?? 0);
const brokenSourceCount = Number(externalSourceFreshness.summary?.broken_or_removed_count ?? 0);
const accessLimitedSourceCount = Number(externalSourceFreshness.summary?.access_limited_unverified_count ?? 0);
const localRouteReady = localBrowserRouteProof.status === 'local_route_proof_ready_not_hosted_proof'
  && Boolean(localBrowserRouteProof.source?.all_top_niche_routes_ready)
  && Number(localBrowserRouteProof.source?.runtime_console_error_count ?? 0) === 0;
const buyerExecutionReady = Boolean(buyerExecutionReadiness.summary?.execution_ready_for_owner_outreach);
const substitutionProtocolReady = Boolean(buyerSubstitutionEvidenceValidation.summary?.substitution_protocol_ready);
const outcomeMeasurementReady = pilotOutcomeMeasurementKit.status === 'pilot_outcome_measurement_kit_ready_not_outcome_proof'
  && Boolean(pilotOutcomeMeasurementKit.summary?.outcome_measurement_ready_for_owner_review)
  && Number(pilotOutcomeMeasurementKit.summary?.top_five_niche_coverage_count ?? 0) >= REQUIRED_NICHES.length
  && Number(pilotOutcomeMeasurementKit.summary?.rows_with_baseline_measure ?? 0) >= REQUIRED_NICHES.length
  && Number(pilotOutcomeMeasurementKit.summary?.rows_with_target_measure ?? 0) >= REQUIRED_NICHES.length
  && Number(pilotOutcomeMeasurementKit.summary?.rows_with_buyer_decision_event ?? 0) >= REQUIRED_NICHES.length
  && Number(pilotOutcomeMeasurementKit.summary?.forbidden_claim_mention_count ?? 0) === 0
  && !Boolean(pilotOutcomeMeasurementKit.summary?.outcome_proof_claimed);
const buyerValidationVerified = Boolean(buyerExecutionReadiness.summary?.buyer_validation_verified)
  || Boolean(buyerExecutionReadiness.summary?.buyer_validated_claim_allowed);
const hostedProofComplete = Boolean(hostedSmokeExecutionReadiness.summary?.hosted_proof_complete);
const ownerApprovalReady = Boolean(ownerApprovalValidation.summary?.all_required_approvals_ready_for_downstream_evidence);
const claimConsistencyReady = Boolean(claimConsistencyValidation.summary?.claim_consistency_ready)
  && Number(claimConsistencyValidation.summary?.unsupported_claim_mention_count ?? 0) === 0;
const sourceFreshnessReady = sourceCount > 0 && checkedSourceCount === sourceCount && brokenSourceCount === 0;
const marketBuyerSafePilot = Boolean(marketNicheValidation.summary?.buyer_safe_pilot_claim_allowed);
const competitiveWedgeAllowed = Boolean(competitivePositioningValidation.summary?.defensible_competitive_wedge_claim_allowed);
const noClaimUpgradeAllowed = !Boolean(ownerApprovalValidation.summary?.commercial_ready_claim_allowed)
  && !Boolean(ownerApprovalValidation.summary?.world_class_prediction_claim_allowed)
  && !Boolean(ownerApprovalValidation.summary?.hosted_live_claim_allowed)
  && !Boolean(ownerApprovalValidation.summary?.buyer_validated_claim_allowed)
  && !Boolean(ownerApprovalValidation.summary?.enterprise_ready_claim_allowed);

const offerReady = pilotOfferPack.status === 'pilot_offer_pack_ready_not_buyer_proof'
  && Boolean(offer.name)
  && Boolean(offer.promise)
  && asArray(offer.allowed_claims).length > 0
  && asArray(offer.prohibited_claims).length > 0
  && asArray(offer.success_criteria).length > 0;
const topFivePackaged = missingNiches.length === 0 && nicheSequence.length >= REQUIRED_NICHES.length;
const selectedSlateCoversTopFive = missingSelectedNiches.length === 0 && selectedTargets.length >= 10;
const proofPacketReady = proofPacket.length > 0 && proofPacketExistingCount === proofPacket.length;
const packageReadyForOwnerReview = offerReady
  && topFivePackaged
  && sequenceRowsWithProof >= REQUIRED_NICHES.length
  && sequenceRowsWithBoundary >= REQUIRED_NICHES.length
  && proofPacketReady
  && localRouteReady
  && buyerExecutionReady
  && selectedSlateCoversTopFive
  && outcomeMeasurementReady
  && substitutionProtocolReady
  && claimConsistencyReady
  && sourceFreshnessReady
  && marketBuyerSafePilot
  && competitiveWedgeAllowed;
const externalShareReady = packageReadyForOwnerReview
  && ownerApprovalReady
  && hostedProofComplete
  && buyerValidationVerified;

const acceptanceGates = [
  {
    gate: 'pilot_offer_contract_ready',
    status: offerReady ? 'passed' : 'failed',
    proof_bucket: 'repo_artifact',
    evidence: `status=${pilotOfferPack.status}; allowed_claims=${asArray(offer.allowed_claims).length}; prohibited_claims=${asArray(offer.prohibited_claims).length}; success_criteria=${asArray(offer.success_criteria).length}.`,
    next_action: offerReady ? 'Use this as the offer contract for owner review.' : 'Regenerate the pilot offer pack.'
  },
  {
    gate: 'top_five_niche_package_coverage',
    status: topFivePackaged ? 'passed' : 'failed',
    proof_bucket: 'repo_artifact',
    evidence: `${nicheSequence.length}/${REQUIRED_NICHES.length} niche rows present; missing=${missingNiches.join('; ') || 'none'}; proof_rows=${sequenceRowsWithProof}; boundary_rows=${sequenceRowsWithBoundary}.`,
    next_action: topFivePackaged ? 'Keep the five-niche offer sequence fixed until buyer evidence changes it.' : 'Add missing niche offer rows.'
  },
  {
    gate: 'proof_packet_files_exist',
    status: proofPacketReady ? 'passed' : 'failed',
    proof_bucket: 'repo_artifact',
    evidence: `${proofPacketExistingCount}/${proofPacket.length} proof-packet files exist.`,
    next_action: proofPacketReady ? 'Attach this packet only as repo/local proof.' : 'Repair missing proof-packet paths.'
  },
  {
    gate: 'local_route_baseline_ready',
    status: localRouteReady ? 'passed' : 'failed',
    proof_bucket: 'local',
    evidence: `${localBrowserRouteProof.status}; routes=${localBrowserRouteProof.source?.rendered_or_expected_auth_gate_count ?? 0}; runtime_errors=${localBrowserRouteProof.source?.runtime_console_error_count ?? 0}; hosted_live_proof=${Boolean(localBrowserRouteProof.source?.hosted_live_proof)}.`,
    next_action: localRouteReady ? 'Use as local route baseline only.' : 'Run local route proof before owner review.'
  },
  {
    gate: 'buyer_execution_slate_ready',
    status: buyerExecutionReady && selectedSlateCoversTopFive ? 'passed' : 'failed',
    proof_bucket: 'repo_artifact',
    evidence: `execution_ready=${buyerExecutionReady}; selected_targets=${selectedTargets.length}; selected_top_five=${REQUIRED_NICHES.length - missingSelectedNiches.length}/${REQUIRED_NICHES.length}; missing=${missingSelectedNiches.join('; ') || 'none'}.`,
    next_action: buyerExecutionReady ? 'Owner can approve or edit the call slate.' : 'Regenerate buyer execution readiness.'
  },
  {
    gate: 'pilot_outcome_measurement_ready',
    status: outcomeMeasurementReady ? 'passed_not_outcome_proof' : 'failed',
    proof_bucket: 'repo_artifact',
    evidence: `${pilotOutcomeMeasurementKit.status}; outcome_measurement_ready=${Boolean(pilotOutcomeMeasurementKit.summary?.outcome_measurement_ready_for_owner_review)}; outcome_proof_claimed=${Boolean(pilotOutcomeMeasurementKit.summary?.outcome_proof_claimed)}; top_five=${pilotOutcomeMeasurementKit.summary?.top_five_niche_coverage_count ?? 0}/${REQUIRED_NICHES.length}; forbidden_claims=${pilotOutcomeMeasurementKit.summary?.forbidden_claim_mention_count ?? 0}.`,
    next_action: outcomeMeasurementReady ? 'Attach the outcome measurement kit before owner-approved buyer calls.' : 'Build or repair the pilot outcome measurement kit.'
  },
  {
    gate: 'substitution_protocol_ready',
    status: substitutionProtocolReady ? 'passed_not_buyer_proof' : 'failed',
    proof_bucket: 'repo_artifact',
    evidence: `${buyerSubstitutionEvidenceValidation.status}; real_interactions=${buyerSubstitutionEvidenceValidation.summary?.real_substitution_interaction_count ?? 0}; ready_for_buyer_proof_gate=${Boolean(buyerSubstitutionEvidenceValidation.summary?.ready_for_buyer_proof_gate)}.`,
    next_action: 'Execute owner-approved substitution calls before replacement or parity claims.'
  },
  {
    gate: 'source_freshness_ready',
    status: sourceFreshnessReady ? 'passed_with_access_limits' : 'failed',
    proof_bucket: 'repo_artifact',
    evidence: `${externalSourceFreshness.status}; checked=${checkedSourceCount}/${sourceCount}; access_limited=${accessLimitedSourceCount}; broken=${brokenSourceCount}.`,
    next_action: sourceFreshnessReady ? 'Use source freshness as desk-research proof only.' : 'Refresh or replace broken external sources.'
  },
  {
    gate: 'claim_consistency_ready',
    status: claimConsistencyReady ? 'passed' : 'failed',
    proof_bucket: 'repo_artifact',
    evidence: `${claimConsistencyValidation.status}; unsupported=${claimConsistencyValidation.summary?.unsupported_claim_mention_count ?? 0}.`,
    next_action: 'Rerun after any buyer-facing package language change.'
  },
  {
    gate: 'owner_approval_gate',
    status: ownerApprovalReady ? 'passed' : 'blocked_owner_approval_missing',
    proof_bucket: 'owner_input',
    evidence: `${ownerApprovalValidation.status}; owner_approved=${ownerApprovedCount}/${ownerRequiredCount}; ready_for_downstream_evidence=${ownerApprovalReady}.`,
    next_action: 'Owner reviews approval rows before external sharing or downstream proof execution.'
  },
  {
    gate: 'buyer_and_hosted_proof_absent',
    status: !buyerValidationVerified && !hostedProofComplete ? 'blocked_no_upgrade' : 'partial_or_passed',
    proof_bucket: 'owner_input_and_hosted_live',
    evidence: `buyer_validated=${buyerValidationVerified}; hosted_proof_complete=${hostedProofComplete}; hosted_status=${hostedSmokeExecutionReadiness.status}.`,
    next_action: 'Do not upgrade beyond owner-review pilot package until buyer and hosted proof pass.'
  },
  {
    gate: 'claim_upgrade_guardrail',
    status: noClaimUpgradeAllowed ? 'passed_blocking_upgrades' : 'failed_upgrade_claim_allowed',
    proof_bucket: 'repo_artifact',
    evidence: `commercial_ready=${Boolean(ownerApprovalValidation.summary?.commercial_ready_claim_allowed)}; world_class_prediction=${Boolean(ownerApprovalValidation.summary?.world_class_prediction_claim_allowed)}; hosted_live=${Boolean(ownerApprovalValidation.summary?.hosted_live_claim_allowed)}; buyer_validated=${Boolean(ownerApprovalValidation.summary?.buyer_validated_claim_allowed)}; enterprise_ready=${Boolean(ownerApprovalValidation.summary?.enterprise_ready_claim_allowed)}.`,
    next_action: 'Keep package language pilot-only until owner, buyer, hosted, enterprise, and prediction gates pass.'
  }
];

const releaseHolds = [
  {
    hold: 'owner_approval_missing',
    severity: 'P0',
    status: ownerApprovalReady ? 'cleared' : 'active',
    evidence_needed: '13/13 owner approval rows reviewed, claim boundaries acknowledged, and approved for downstream evidence execution.'
  },
  {
    hold: 'buyer_validation_missing',
    severity: 'P0',
    status: buyerValidationVerified ? 'cleared' : 'active',
    evidence_needed: '10 completed buyer calls, three qualified follow-ups, and one paid-pilot/LOI/procurement-path signal.'
  },
  {
    hold: 'hosted_proof_missing',
    severity: 'P0',
    status: hostedProofComplete ? 'cleared' : 'active',
    evidence_needed: 'Executed hosted smoke evidence with deploy binding, redacted logs/screenshots, and core route/API coverage.'
  },
  {
    hold: 'prediction_accuracy_missing',
    severity: 'P0',
    status: commercialConfidenceGate.primary_blockers?.some((blocker) => blocker.id === 'prediction_accuracy_proof')
      ? 'active'
      : 'cleared',
    evidence_needed: 'Owner-approved resolved forecasts, comparable baselines, leakage review, scoring, and approved claim language.'
  }
];

const status = externalShareReady
  ? 'pilot_package_ready_for_external_share_review'
  : packageReadyForOwnerReview
    ? 'pilot_package_ready_for_owner_review_not_external_share'
    : 'pilot_package_incomplete';

const packageRows = REQUIRED_NICHES.map((niche) => {
  const sequence = nicheSequence.find((item) => normalize(item.niche) === normalize(niche)) ?? {};
  const targetCount = selectedTargets.filter((target) => normalize(target.niche) === normalize(niche)).length;
  return {
    niche,
    packaged: Boolean(sequence.niche),
    selected_target_count: targetCount,
    proof_asset_count: asArray(sequence.proof_assets).length,
    sale_boundary: sequence.sale_boundary ?? '',
    readiness_score_percent: Number(sequence.readiness_score_percent ?? 0)
  };
});

const report = {
  schema_version: 'pilot-package-readiness-v1',
  generated_at: new Date().toISOString(),
  status,
  proof_boundary: 'This artifact validates that the five-niche pilot package is coherent and ready for owner review. It is not buyer validation, hosted proof, enterprise readiness, prediction accuracy proof, or external-share approval.',
  source: {
    evidence: inputPaths.evidence,
    pilot_offer_pack: inputPaths.pilotOfferPack,
    pilot_outcome_measurement_kit: inputPaths.pilotOutcomeMeasurementKit,
    market_niche_validation: inputPaths.marketNicheValidation,
    competitive_positioning_validation: inputPaths.competitivePositioningValidation,
    buyer_discovery_kit: inputPaths.buyerDiscoveryKit,
    buyer_execution_readiness: inputPaths.buyerExecutionReadiness,
    buyer_substitution_evidence_validation: inputPaths.buyerSubstitutionEvidenceValidation,
    local_browser_route_proof: inputPaths.localBrowserRouteProof,
    hosted_smoke_execution_readiness: inputPaths.hostedSmokeExecutionReadiness,
    owner_approval_validation: inputPaths.ownerApprovalValidation,
    claim_consistency_validation: inputPaths.claimConsistencyValidation,
    external_source_freshness: inputPaths.externalSourceFreshness,
    commercial_confidence_gate: inputPaths.commercialConfidenceGate
  },
  summary: {
    package_ready_for_owner_review: packageReadyForOwnerReview,
    external_share_ready: externalShareReady,
    offer_ready: offerReady,
    required_niche_count: REQUIRED_NICHES.length,
    packaged_niche_count: nicheSequence.length,
    missing_niche_count: missingNiches.length,
    selected_target_count: selectedTargets.length,
    selected_top_five_niche_count: REQUIRED_NICHES.length - missingSelectedNiches.length,
    proof_packet_existing_count: proofPacketExistingCount,
    proof_packet_count: proofPacket.length,
    local_route_ready: localRouteReady,
    buyer_execution_ready: buyerExecutionReady,
    buyer_validation_verified: buyerValidationVerified,
    outcome_measurement_ready: outcomeMeasurementReady,
    outcome_proof_claimed: false,
    substitution_protocol_ready: substitutionProtocolReady,
    hosted_proof_complete: hostedProofComplete,
    owner_approval_ready: ownerApprovalReady,
    owner_approved_count: ownerApprovedCount,
    owner_required_count: ownerRequiredCount,
    claim_consistency_ready: claimConsistencyReady,
    source_freshness_ready: sourceFreshnessReady,
    source_count: sourceCount,
    access_limited_source_count: accessLimitedSourceCount,
    broken_source_count: brokenSourceCount,
    market_buyer_safe_pilot_claim_allowed: marketBuyerSafePilot,
    competitive_wedge_claim_allowed: competitiveWedgeAllowed,
    buyer_validated_claim_allowed: false,
    hosted_live_claim_allowed: false,
    enterprise_ready_claim_allowed: false,
    accuracy_claim_allowed: false,
    world_class_prediction_claim_allowed: false
  },
  pilot_package_rows: packageRows,
  acceptance_gates: acceptanceGates,
  release_holds: releaseHolds,
  next_actions: [
    'Owner reviews the pilot package, approval register, and pilot-only external language before any external share.',
    'After owner approval, execute buyer calls and substitution tests; do not claim buyer validation from package readiness.',
    'After hosted access unblocks, run hosted smoke and attach redacted logs/screenshots before hosted-live claims.',
    'After real resolved forecast rows and baselines exist, rerun leakage, scoring, prediction science, and confidence gates.'
  ]
};

function renderMarkdown(artifact) {
  const gateRows = artifact.acceptance_gates
    .map((gate) => `| ${[
      gate.gate,
      gate.status,
      gate.proof_bucket,
      gate.evidence,
      gate.next_action
    ].map(mdCell).join(' | ')} |`)
    .join('\n');
  const nicheRows = artifact.pilot_package_rows
    .map((row) => `| ${[
      row.niche,
      row.packaged,
      row.selected_target_count,
      row.proof_asset_count,
      row.readiness_score_percent,
      row.sale_boundary
    ].map(mdCell).join(' | ')} |`)
    .join('\n');
  const holdRows = artifact.release_holds
    .map((hold) => `| ${[hold.hold, hold.severity, hold.status, hold.evidence_needed].map(mdCell).join(' | ')} |`)
    .join('\n');
  const actions = artifact.next_actions.map((item, index) => `${index + 1}. ${item}`).join('\n');

  return `# Pilot Package Readiness - 2026-06-06

Status: \`${artifact.status}\`.

Package ready for owner review: **${artifact.summary.package_ready_for_owner_review}**.

External-share ready: **${artifact.summary.external_share_ready}**.

Owner approvals: **${artifact.summary.owner_approved_count}/${artifact.summary.owner_required_count}**.

Selected top-five niche coverage: **${artifact.summary.selected_top_five_niche_count}/${artifact.summary.required_niche_count}**.

Local route ready: **${artifact.summary.local_route_ready}**.

Buyer validation verified: **${artifact.summary.buyer_validation_verified}**.

Outcome measurement ready: **${artifact.summary.outcome_measurement_ready}**.

Hosted proof complete: **${artifact.summary.hosted_proof_complete}**.

## Niche Package Rows

| Niche | Packaged | Selected Targets | Proof Assets | Readiness Score | Sale Boundary |
|---|---:|---:|---:|---:|---|
${nicheRows}

## Acceptance Gates

| Gate | Status | Proof Bucket | Evidence | Next Action |
|---|---|---|---|---|
${gateRows}

## Release Holds

| Hold | Severity | Status | Evidence Needed |
|---|---|---|---|
${holdRows}

## Next Actions

${actions}

## Proof Boundary

${artifact.proof_boundary}
`;
}

function renderCsv(artifact) {
  return [
    csvLine(['gate', 'status', 'proof_bucket', 'evidence', 'next_action']),
    ...artifact.acceptance_gates.map((gate) => csvLine([
      gate.gate,
      gate.status,
      gate.proof_bucket,
      gate.evidence,
      gate.next_action
    ]))
  ].join('\n') + '\n';
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
  const nextEvidence = readJsonIfExists(inputPaths.evidence, null);
  if (!nextEvidence) {
    console.error(`Cannot update missing evidence artifact: ${inputPaths.evidence}`);
    process.exit(2);
  }

  nextEvidence.proof_buckets = nextEvidence.proof_buckets ?? {};
  nextEvidence.proof_buckets.local = replaceMatchingThenAppend(nextEvidence.proof_buckets.local, [
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:pilot:package-readiness -- --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence: status ${report.status}, package_ready_for_owner_review ${report.summary.package_ready_for_owner_review}, external_share_ready ${report.summary.external_share_ready}`
  ], [
    /npm run audit:pilot:package-readiness/
  ]);

  nextEvidence.proof_buckets.repo_artifact = replaceMatchingThenAppend(nextEvidence.proof_buckets.repo_artifact, [
    'scripts/validate-pilot-package-readiness.mjs validates the five-niche pilot package across offer clarity, local route proof, buyer slate readiness, outcome measurement, substitution protocol, source freshness, owner approval, and claim boundaries',
    'docs/launch-readiness/pilot-package-readiness-2026-06-06.json records owner-review readiness without upgrading buyer, hosted, enterprise, or prediction claims',
    'docs/launch-readiness/pilot-package-readiness-checklist-2026-06-06.csv provides the pilot-package readiness checklist'
  ], [
    /scripts\/validate-pilot-package-readiness\.mjs/,
    /pilot-package-readiness-2026-06-06\.json/,
    /pilot-package-readiness-checklist-2026-06-06\.csv/
  ]);

  nextEvidence.fix_report = nextEvidence.fix_report ?? {};
  nextEvidence.fix_report.files_changed = replaceMatchingThenAppend(nextEvidence.fix_report.files_changed, [
    'scripts/validate-pilot-package-readiness.mjs',
    'docs/launch-readiness/pilot-package-readiness-2026-06-06.json',
    'docs/launch-readiness/pilot-package-readiness-2026-06-06.md',
    'docs/launch-readiness/pilot-package-readiness-checklist-2026-06-06.csv',
    'package.json'
  ], [
    /scripts\/validate-pilot-package-readiness\.mjs/,
    /pilot-package-readiness-2026-06-06\.json/,
    /pilot-package-readiness-2026-06-06\.md/,
    /pilot-package-readiness-checklist-2026-06-06\.csv/,
    /package\.json/
  ]);

  nextEvidence.fix_report.tests_run = replaceMatchingThenAppend(nextEvidence.fix_report.tests_run, [
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH node --check scripts/validate-pilot-package-readiness.mjs',
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:pilot:package-readiness -- --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence`
  ], [
    /node --check scripts\/validate-pilot-package-readiness\.mjs/,
    /npm run audit:pilot:package-readiness/
  ]);

  nextEvidence.fix_report.approval_gates = replaceMatchingThenAppend(nextEvidence.fix_report.approval_gates, [
    'Pilot package readiness is owner-review proof only; external sharing, buyer validation, hosted proof, enterprise readiness, and prediction accuracy remain blocked until their validators pass.'
  ], [
    /Pilot package readiness is owner-review proof only/
  ]);

  nextEvidence.implementation_decisions = replaceByTaskId(nextEvidence.implementation_decisions, {
    task_id: 'pilot-package-readiness-validator',
    decision: 'Add a score-neutral validator for the marketable five-niche pilot package.',
    acceptance_check: 'The validator must prove the pilot package is coherent, measurable, and owner-review-ready while keeping external-share, buyer-validated, hosted-live, enterprise-ready, and world-class prediction claims blocked.',
    chosen_variant: 'minimal Node artifact validator; no product runtime change, no new dependency, no confidence-score increase',
    rejected_variants: [
      'Product UI change: rejected because the blocker is proof packaging, not a missing screen.',
      'Confidence-score increase: rejected because no owner approval, buyer call, hosted smoke, enterprise proof, or real forecast outcome was added.',
      'Broad market report: rejected because the existing artifact set already has market research; the missing repo-side gap is package coherence.'
    ],
    repo_pattern_reused: 'Existing launch-readiness Node validator and evidence update pattern',
    files_changed: [
      'scripts/validate-pilot-package-readiness.mjs',
      'package.json'
    ],
    tests_run: [
      'node --check scripts/validate-pilot-package-readiness.mjs',
      'npm run audit:pilot:package-readiness'
    ],
    proof: `${report.status}; package_ready_for_owner_review=${report.summary.package_ready_for_owner_review}; outcome_measurement_ready=${report.summary.outcome_measurement_ready}; external_share_ready=${report.summary.external_share_ready}; world_class_prediction_claim_allowed=false.`,
    reason: 'The original goal asks for long-term marketability and sellability; this gate proves the current pilot package is coherent without overclaiming unavailable proof.'
  });

  nextEvidence.rejected_variants = replaceByTaskId(nextEvidence.rejected_variants, {
    task_id: 'pilot-package-readiness-validator',
    variant: 'Treat the pilot offer pack itself as enough to approve external sharing.',
    reason_rejected: 'The offer pack is a builder artifact; external sharing still needs owner approval, hosted proof, and buyer-proof boundaries.',
    tradeoff: 'A readiness validator adds a narrow owner-review gate while preserving pilot-only status.',
    evidence: `${report.status} keeps external_share_ready=${report.summary.external_share_ready}.`
  });

  nextEvidence.code_optimization_reviews = replaceByTaskId(nextEvidence.code_optimization_reviews, {
    target_task: 'pilot-package-readiness-validator',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'No dependency, no app runtime edit, no live outreach, no hosted/secret-dependent execution, and no confidence score change.',
    tests_or_checks: [
      'node --check scripts/validate-pilot-package-readiness.mjs',
      'npm run audit:pilot:package-readiness'
    ],
    remaining_risk: 'Owner approvals, buyer calls, hosted proof, enterprise procurement evidence, and real forecast scoring remain missing.'
  });

  writeArtifact(inputPaths.evidence, `${JSON.stringify(nextEvidence, null, 2)}\n`);
}

console.log(JSON.stringify({
  json_output: outputPaths.json,
  md_output: outputPaths.md,
  csv_output: outputPaths.csv,
  evidence_updated: updateEvidence,
  status: report.status,
  package_ready_for_owner_review: report.summary.package_ready_for_owner_review,
  external_share_ready: report.summary.external_share_ready,
  selected_top_five_niche_count: report.summary.selected_top_five_niche_count,
  owner_approved_count: report.summary.owner_approved_count,
  owner_required_count: report.summary.owner_required_count,
  buyer_validation_verified: report.summary.buyer_validation_verified,
  hosted_proof_complete: report.summary.hosted_proof_complete,
  world_class_prediction_claim_allowed: report.summary.world_class_prediction_claim_allowed
}, null, 2));
