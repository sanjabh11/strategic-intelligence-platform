#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const ROOT = process.cwd();
const DEFAULT_EVIDENCE = 'docs/launch-readiness/launch-evidence-2026-06-06.json';
const DEFAULT_COMMERCIAL_CONFIDENCE_GATE = 'docs/launch-readiness/commercial-confidence-gate-2026-06-06.json';
const DEFAULT_GOAL_COMPLETION_AUDIT = 'docs/launch-readiness/commercial-goal-completion-audit-2026-06-06.json';
const DEFAULT_MARKET_NICHE_VALIDATION = 'docs/launch-readiness/market-niche-evidence-validation-2026-06-06.json';
const DEFAULT_COMPETITIVE_POSITIONING_VALIDATION = 'docs/launch-readiness/competitive-positioning-evidence-validation-2026-06-06.json';
const DEFAULT_BUYER_EXECUTION_READINESS = 'docs/launch-readiness/buyer-validation-execution-readiness-2026-06-06.json';
const DEFAULT_BUYER_SUBSTITUTION_KIT = 'docs/launch-readiness/buyer-substitution-proof-kit-2026-06-06.json';
const DEFAULT_BUYER_SUBSTITUTION_EVIDENCE_VALIDATION = 'docs/launch-readiness/buyer-substitution-evidence-validation-2026-06-06.json';
const DEFAULT_FORECAST_EXECUTION_READINESS = 'docs/launch-readiness/forecast-evaluation-execution-readiness-2026-06-06.json';
const DEFAULT_PREDICTION_SCIENCE_VALIDATION = 'docs/launch-readiness/prediction-science-evidence-validation-2026-06-06.json';
const DEFAULT_FORECAST_SCORING_VALIDATION = 'docs/launch-readiness/forecast-scoring-evidence-validation-2026-06-06.json';
const DEFAULT_FORECAST_LEAKAGE_VALIDATION = 'docs/launch-readiness/forecast-leakage-review-validation-2026-06-06.json';
const DEFAULT_ENTERPRISE_EXECUTION_READINESS = 'docs/launch-readiness/enterprise-trust-execution-readiness-2026-06-06.json';
const DEFAULT_HOSTED_SMOKE_EXECUTION_READINESS = 'docs/launch-readiness/hosted-smoke-execution-readiness-2026-06-06.json';
const DEFAULT_CLAIM_CONSISTENCY_VALIDATION = 'docs/launch-readiness/claim-consistency-validation-2026-06-06.json';
const DEFAULT_OWNER_APPROVAL_VALIDATION = 'docs/launch-readiness/owner-approval-register-validation-2026-06-06.json';
const DEFAULT_LOCAL_BROWSER_ROUTE_PROOF = 'docs/launch-readiness/local-browser-route-proof-2026-06-06.json';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/commercial-loophole-remediation-2026-06-06.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/commercial-loophole-remediation-2026-06-06.md';
const DEFAULT_CSV_OUTPUT = 'docs/launch-readiness/commercial-loophole-remediation-checklist-2026-06-06.csv';

const CURRENT_SOURCE_ANCHORS = [
  {
    id: 'nist_ai_rmf',
    source: 'NIST AI Risk Management Framework',
    url: 'https://www.nist.gov/itl/ai-risk-management-framework',
    implication: 'Trustworthy AI posture needs governed risk management, measurement, and claim controls.'
  },
  {
    id: 'nist_genai_profile',
    source: 'NIST AI 600-1 Generative AI Profile',
    url: 'https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf',
    implication: 'Generative-AI decision support needs explicit controls for hallucination, misuse, transparency, and security risks.'
  },
  {
    id: 'oecd_ai_principles_2024',
    source: 'OECD AI Principles, updated 2024',
    url: 'https://www.oecd.org/en/topics/ai-principles.html',
    implication: 'AI systems should be robust, secure, safe, accountable, transparent, and human-centered.'
  },
  {
    id: 'iarpa_ace',
    source: 'IARPA ACE forecasting program',
    url: 'https://www.iarpa.gov/research-programs/ace',
    implication: 'Forecasting accuracy claims need probabilistic judgment, aggregation, and empirical testing against real events.'
  },
  {
    id: 'metaculus_track_record',
    source: 'Metaculus track record and calibration evidence',
    url: 'https://www.metaculus.com/questions/track-record/',
    implication: 'Forecast platforms compete on scored resolved questions, calibration curves, and transparent track records.'
  },
  {
    id: 'forecastbench_dynamic_benchmark',
    source: 'ForecastBench dynamic forecasting benchmark',
    url: 'https://www.forecastbench.org/about/',
    implication: 'AI forecasting claims need dynamic, continuously updated benchmark comparisons rather than static fixtures alone.'
  },
  {
    id: 'metaculus_futureeval',
    source: 'Metaculus FutureEval',
    url: 'https://www.metaculus.com/futureeval/',
    implication: 'AI forecasting agents should be evaluated on real future outcomes and compared against human, community, pro-forecaster, and model baselines.'
  },
  {
    id: 'good_judgment_services',
    source: 'Good Judgment professional forecasting services',
    url: 'https://goodjudgment.com/services/',
    implication: 'Buyer-facing forecasting services sell strategic uncertainty reduction, custom forecasts, monitoring, and training.'
  },
  {
    id: 'palantir_aip',
    source: 'Palantir AIP',
    url: 'https://www.palantir.com/platforms/aip/',
    implication: 'Enterprise substitutes emphasize operational decision workflows, ontology grounding, automations, and human approval.'
  },
  {
    id: 'dataminr_risk_intelligence',
    source: 'Dataminr real-time risk intelligence',
    url: 'https://www.dataminr.com/',
    implication: 'Risk-intelligence buyers expect real-time signal detection, alerting, public-data coverage, and operational response workflows.'
  },
  {
    id: 'wef_global_risks_2026',
    source: 'World Economic Forum Global Risks Report 2026',
    url: 'https://www.weforum.org/publications/global-risks-report-2026/in-full/',
    implication: 'Geoeconomic confrontation, conflict, polarization, misinformation, and AI risk provide current buyer-pain context.'
  },
  {
    id: 'nist_csf_2',
    source: 'NIST Cybersecurity Framework 2.0',
    url: 'https://csrc.nist.gov/news/2024/the-nist-csf-20-is-here',
    implication: 'Enterprise/public-sector trust claims need current cybersecurity governance, risk, and control evidence.'
  },
  {
    id: 'owasp_llm_top_10',
    source: 'OWASP Top 10 for Large Language Model Applications',
    url: 'https://owasp.org/www-project-top-10-for-large-language-model-applications',
    implication: 'LLM apps need prompt-injection, output-handling, data, supply-chain, and agent/tool security proof.'
  },
  {
    id: 'cisa_secure_by_design',
    source: 'CISA Secure by Design',
    url: 'https://www.cisa.gov/news-events/news/building-secure-design-ecosystem',
    implication: 'Security posture should shift customer risk back to the software maker through secure defaults and evidence.'
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
    'Usage: node scripts/validate-commercial-loophole-remediation.mjs',
    `  [--evidence ${DEFAULT_EVIDENCE}]`,
    `  [--commercial-confidence-gate ${DEFAULT_COMMERCIAL_CONFIDENCE_GATE}]`,
    `  [--goal-completion-audit ${DEFAULT_GOAL_COMPLETION_AUDIT}]`,
    `  [--market-niche-validation ${DEFAULT_MARKET_NICHE_VALIDATION}]`,
    `  [--competitive-positioning-validation ${DEFAULT_COMPETITIVE_POSITIONING_VALIDATION}]`,
    `  [--buyer-execution-readiness ${DEFAULT_BUYER_EXECUTION_READINESS}]`,
    `  [--buyer-substitution-kit ${DEFAULT_BUYER_SUBSTITUTION_KIT}]`,
    `  [--buyer-substitution-evidence-validation ${DEFAULT_BUYER_SUBSTITUTION_EVIDENCE_VALIDATION}]`,
    `  [--forecast-execution-readiness ${DEFAULT_FORECAST_EXECUTION_READINESS}]`,
    `  [--prediction-science-validation ${DEFAULT_PREDICTION_SCIENCE_VALIDATION}]`,
    `  [--forecast-scoring-validation ${DEFAULT_FORECAST_SCORING_VALIDATION}]`,
    `  [--forecast-leakage-validation ${DEFAULT_FORECAST_LEAKAGE_VALIDATION}]`,
    `  [--enterprise-execution-readiness ${DEFAULT_ENTERPRISE_EXECUTION_READINESS}]`,
    `  [--hosted-smoke-execution-readiness ${DEFAULT_HOSTED_SMOKE_EXECUTION_READINESS}]`,
    `  [--claim-consistency-validation ${DEFAULT_CLAIM_CONSISTENCY_VALIDATION}]`,
    `  [--owner-approval-validation ${DEFAULT_OWNER_APPROVAL_VALIDATION}]`,
    `  [--local-browser-route-proof ${DEFAULT_LOCAL_BROWSER_ROUTE_PROOF}]`,
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
  goalCompletionAudit: argValue('--goal-completion-audit', DEFAULT_GOAL_COMPLETION_AUDIT),
  marketNicheValidation: argValue('--market-niche-validation', DEFAULT_MARKET_NICHE_VALIDATION),
  competitivePositioningValidation: argValue('--competitive-positioning-validation', DEFAULT_COMPETITIVE_POSITIONING_VALIDATION),
  buyerExecutionReadiness: argValue('--buyer-execution-readiness', DEFAULT_BUYER_EXECUTION_READINESS),
  buyerSubstitutionKit: argValue('--buyer-substitution-kit', DEFAULT_BUYER_SUBSTITUTION_KIT),
  buyerSubstitutionEvidenceValidation: argValue('--buyer-substitution-evidence-validation', DEFAULT_BUYER_SUBSTITUTION_EVIDENCE_VALIDATION),
  forecastExecutionReadiness: argValue('--forecast-execution-readiness', DEFAULT_FORECAST_EXECUTION_READINESS),
  predictionScienceValidation: argValue('--prediction-science-validation', DEFAULT_PREDICTION_SCIENCE_VALIDATION),
  forecastScoringValidation: argValue('--forecast-scoring-validation', DEFAULT_FORECAST_SCORING_VALIDATION),
  forecastLeakageValidation: argValue('--forecast-leakage-validation', DEFAULT_FORECAST_LEAKAGE_VALIDATION),
  enterpriseExecutionReadiness: argValue('--enterprise-execution-readiness', DEFAULT_ENTERPRISE_EXECUTION_READINESS),
  hostedSmokeExecutionReadiness: argValue('--hosted-smoke-execution-readiness', DEFAULT_HOSTED_SMOKE_EXECUTION_READINESS),
  claimConsistencyValidation: argValue('--claim-consistency-validation', DEFAULT_CLAIM_CONSISTENCY_VALIDATION),
  ownerApprovalValidation: argValue('--owner-approval-validation', DEFAULT_OWNER_APPROVAL_VALIDATION),
  localBrowserRouteProof: argValue('--local-browser-route-proof', DEFAULT_LOCAL_BROWSER_ROUTE_PROOF)
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

function asArray(value) {
  return Array.isArray(value) ? value : [];
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

function sourceLabels(ids) {
  return ids
    .map((id) => CURRENT_SOURCE_ANCHORS.find((source) => source.id === id)?.source ?? id)
    .join('; ');
}

const evidence = readJsonIfExists(inputPaths.evidence, { proof_buckets: {}, fix_report: {} });
const commercialGate = readJsonIfExists(inputPaths.commercialConfidenceGate, { posture: {}, dimensions: [], primary_blockers: [] });
const goalCompletionAudit = readJsonIfExists(inputPaths.goalCompletionAudit, { status: 'missing', summary: {}, requirement_audit: [] });
const marketNicheValidation = readJsonIfExists(inputPaths.marketNicheValidation, { status: 'missing', summary: {} });
const competitivePositioningValidation = readJsonIfExists(inputPaths.competitivePositioningValidation, { status: 'missing', summary: {} });
const buyerExecutionReadiness = readJsonIfExists(inputPaths.buyerExecutionReadiness, { status: 'missing', summary: {} });
const buyerSubstitutionKit = readJsonIfExists(inputPaths.buyerSubstitutionKit, { status: 'missing', summary: {} });
const buyerSubstitutionEvidenceValidation = readJsonIfExists(inputPaths.buyerSubstitutionEvidenceValidation, { status: 'missing', summary: {} });
const forecastExecutionReadiness = readJsonIfExists(inputPaths.forecastExecutionReadiness, { status: 'missing', summary: {} });
const predictionScienceValidation = readJsonIfExists(inputPaths.predictionScienceValidation, { status: 'missing', summary: {} });
const forecastScoringValidation = readJsonIfExists(inputPaths.forecastScoringValidation, { status: 'missing', summary: {} });
const forecastLeakageValidation = readJsonIfExists(inputPaths.forecastLeakageValidation, { status: 'missing', summary: {} });
const enterpriseExecutionReadiness = readJsonIfExists(inputPaths.enterpriseExecutionReadiness, { status: 'missing', summary: {} });
const hostedSmokeExecutionReadiness = readJsonIfExists(inputPaths.hostedSmokeExecutionReadiness, { status: 'missing', summary: {} });
const claimConsistencyValidation = readJsonIfExists(inputPaths.claimConsistencyValidation, { status: 'missing', summary: {} });
const ownerApprovalValidation = readJsonIfExists(inputPaths.ownerApprovalValidation, { status: 'missing', summary: {} });
const localBrowserRouteProof = readJsonIfExists(inputPaths.localBrowserRouteProof, { status: 'missing', source: {} });

const posture = commercialGate.posture ?? {};
const confidencePercent = Number(posture.commercial_world_class_confidence_percent ?? 0);
const targetConfidencePercent = Number(posture.target_confidence_percent ?? 95);
const confidenceGapPercent = Number(posture.confidence_gap_percent ?? targetConfidencePercent - confidencePercent);
const launchDecision = posture.launch_decision ?? 'unknown';
const claimConsistencyReady = Boolean(claimConsistencyValidation.summary?.claim_consistency_ready)
  && Number(claimConsistencyValidation.summary?.unsupported_claim_mention_count ?? 0) === 0;
const ownerApprovalStatus = ownerApprovalValidation.status ?? 'missing';
const ownerApprovalRequiredCount = Number(ownerApprovalValidation.summary?.required_approval_count ?? 0);
const ownerApprovalApprovedCount = Number(ownerApprovalValidation.summary?.owner_approved_count ?? 0);
const ownerApprovalReviewedCount = Number(ownerApprovalValidation.summary?.reviewed_count ?? 0);
const ownerApprovalClaimBoundaryAcknowledgedCount = Number(
  ownerApprovalValidation.summary?.claim_boundary_acknowledged_count ?? 0
);
const ownerApprovalRowErrorCount = Number(ownerApprovalValidation.summary?.row_error_count ?? 0);
const ownerApprovalReadyForDownstreamEvidence = Boolean(
  ownerApprovalValidation.summary?.all_required_approvals_ready_for_downstream_evidence
);
const ownerApprovalCommercialReadyClaimAllowed = Boolean(ownerApprovalValidation.summary?.commercial_ready_claim_allowed);
const ownerApprovalWorldClassPredictionClaimAllowed = Boolean(
  ownerApprovalValidation.summary?.world_class_prediction_claim_allowed
);
const ownerApprovalHostedLiveClaimAllowed = Boolean(ownerApprovalValidation.summary?.hosted_live_claim_allowed);
const ownerApprovalBuyerValidatedClaimAllowed = Boolean(ownerApprovalValidation.summary?.buyer_validated_claim_allowed);
const ownerApprovalEnterpriseReadyClaimAllowed = Boolean(ownerApprovalValidation.summary?.enterprise_ready_claim_allowed);
const topFiveNichesReady = Number(marketNicheValidation.summary?.required_niche_present_count ?? 0) >= 5;
const defensibleCompetitiveWedge = Boolean(competitivePositioningValidation.summary?.defensible_competitive_wedge_claim_allowed);
const buyerExecutionReady = Boolean(buyerExecutionReadiness.summary?.execution_ready_for_owner_outreach);
const buyerValidated = Boolean(buyerExecutionReadiness.summary?.buyer_validated_claim_allowed)
  || Boolean(buyerExecutionReadiness.summary?.buyer_validation_verified);
const buyerSubstitutionProtocolReady = Boolean(buyerSubstitutionKit.summary?.substitution_protocol_ready);
const buyerSubstitutionEvidenceReady = Boolean(buyerSubstitutionEvidenceValidation.summary?.ready_for_buyer_proof_gate);
const buyerSubstitutionRealInteractionCount = Number(buyerSubstitutionEvidenceValidation.summary?.real_substitution_interaction_count ?? 0);
const forecastOwnerExportReady = Boolean(forecastExecutionReadiness.summary?.execution_ready_for_owner_resolved_export);
const forecastClaimReady = Boolean(forecastExecutionReadiness.summary?.scoring_chain_ready_for_owner_claim_review);
const mechanicsOnlyPredictionClaim = Boolean(predictionScienceValidation.summary?.mechanics_only_claim_allowed);
const realOutcomeCount = Number(forecastExecutionReadiness.summary?.valid_resolved_forecast_count ?? 0);
const realBaselineCount = Number(forecastExecutionReadiness.summary?.valid_baseline_count ?? 0);
const leakageReviewHasRealRows = Number(forecastLeakageValidation.summary?.real_forecast_row_count ?? 0) > 0
  || Number(forecastLeakageValidation.summary?.reviewed_real_forecast_row_count ?? 0) > 0;
const scoringSampleOnly = Boolean(forecastScoringValidation.summary?.sample_fixture_only)
  || forecastScoringValidation.status === 'forecast_scoring_evidence_validation_sample_only_not_claim_proof';
const enterpriseOwnerReviewReady = Boolean(enterpriseExecutionReadiness.summary?.execution_ready_for_owner_trust_review);
const enterpriseProofReady = Boolean(enterpriseExecutionReadiness.summary?.enterprise_proof_ready_for_owner_claim_review);
const hostedOwnerUnblockReady = Boolean(hostedSmokeExecutionReadiness.summary?.owner_unblock_ready);
const hostedSmokeReady = Boolean(hostedSmokeExecutionReadiness.summary?.hosted_smoke_execution_ready);
const hostedProofComplete = Boolean(hostedSmokeExecutionReadiness.summary?.hosted_proof_complete);
const localRouteProofReady = localBrowserRouteProof.status === 'local_route_proof_ready_not_hosted_proof'
  && Boolean(localBrowserRouteProof.source?.all_top_niche_routes_ready);
const goalCompletionReady = Boolean(goalCompletionAudit.summary?.completion_ready);

const loopholes = [
  {
    id: 'owner_approval_register_not_cleared',
    severity: 'P0',
    status: ownerApprovalReadyForDownstreamEvidence ? 'closed_current' : 'open_owner_evidence_required',
    category: 'approval_governance',
    loophole: 'Downstream prediction, buyer, enterprise, hosted, payment, AI-action, and claim-language evidence cannot be upgraded until the owner approval register is reviewed and approved.',
    evidence: `${ownerApprovalStatus}; approved=${ownerApprovalApprovedCount}/${ownerApprovalRequiredCount}; reviewed=${ownerApprovalReviewedCount}/${ownerApprovalRequiredCount}; claim_boundary_acknowledged=${ownerApprovalClaimBoundaryAcknowledgedCount}/${ownerApprovalRequiredCount}; row_errors=${ownerApprovalRowErrorCount}; ready_for_downstream_evidence=${ownerApprovalReadyForDownstreamEvidence}.`,
    external_anchor_ids: ['nist_ai_rmf', 'oecd_ai_principles_2024', 'cisa_secure_by_design'],
    buyer_impact: 'Without explicit owner approvals, the product can accidentally convert templates, local checks, or unreviewed rows into buyer-facing claims.',
    remediation: 'Owner reviews every required approval row, acknowledges claim boundaries, approves or rejects downstream evidence execution, and reruns the owner approval register validator before downstream gates.',
    proof_to_close: 'Owner approval validation reports all required approvals ready for downstream evidence and zero row errors.',
    owner_action_required: true,
    repo_action_available: false,
    claim_boundary: 'approval-gated proof only'
  },
  {
    id: 'prediction_accuracy_without_resolved_outcomes',
    severity: 'P0',
    status: forecastClaimReady ? 'closed_current' : 'open_owner_evidence_required',
    category: 'prediction_science',
    loophole: 'The product can describe forecasting mechanics, but it cannot claim accurate or world-class predictions without real resolved forecast rows, comparable baselines, leakage review, and scoring review.',
    evidence: `${forecastExecutionReadiness.status}; valid_resolved_forecasts=${realOutcomeCount}; valid_baselines=${realBaselineCount}; scoring_chain_ready=${forecastClaimReady}; leakage_real_rows=${leakageReviewHasRealRows}; scoring_sample_only=${scoringSampleOnly}.`,
    external_anchor_ids: ['iarpa_ace', 'metaculus_track_record', 'forecastbench_dynamic_benchmark', 'metaculus_futureeval', 'good_judgment_services'],
    buyer_impact: 'Strategic buyers will reject prediction-superiority claims unless the track record is scored, calibrated, and benchmarked.',
    remediation: 'Run the resolved-forecast export, validate baselines, complete leakage review, compare Brier/log-loss/calibration metrics, and keep claims at mechanics-only until the gate passes.',
    proof_to_close: 'Forecast execution readiness reports real resolved outcomes and baselines; leakage and scoring validators allow accuracy claims.',
    owner_action_required: true,
    repo_action_available: false,
    claim_boundary: mechanicsOnlyPredictionClaim ? 'mechanics-only forecasting language allowed' : 'prediction claims blocked'
  },
  {
    id: 'buyer_validation_without_completed_calls',
    severity: 'P0',
    status: buyerValidated ? 'closed_current' : 'open_owner_evidence_required',
    category: 'sellability',
    loophole: 'Market research identifies plausible buyer pain, but willingness-to-pay is still unproven without completed discovery calls, qualified follow-ups, paid pilots, LOIs, or procurement signals.',
    evidence: `${buyerExecutionReadiness.status}; completed_calls=${buyerExecutionReadiness.summary?.completed_call_count ?? 0}; qualified_followups=${buyerExecutionReadiness.summary?.qualified_followup_count ?? 0}; paid_loi_procurement=${buyerExecutionReadiness.summary?.paid_pilot_loi_or_procurement_signal_count ?? 0}; execution_ready=${buyerExecutionReady}.`,
    external_anchor_ids: ['wef_global_risks_2026', 'dataminr_risk_intelligence', 'palantir_aip'],
    buyer_impact: 'Without buyer evidence, the strategy is desk-validated rather than sellability-validated.',
    remediation: 'Execute the 10-call buyer validation slate across the five niches and rerun buyer evidence/proof gates.',
    proof_to_close: 'Buyer proof gate allows buyer-validated and willingness-to-pay claims.',
    owner_action_required: true,
    repo_action_available: false,
    claim_boundary: 'buyer-safe pilot claim only'
  },
  {
    id: 'competitive_wedge_without_buyer_substitution_proof',
    severity: 'P1',
    status: defensibleCompetitiveWedge && buyerValidated
      ? 'closed_current'
      : buyerSubstitutionProtocolReady
        ? 'open_owner_evidence_required_protocol_ready'
        : 'open_market_proof_gap',
    category: 'positioning',
    loophole: 'The differentiated wedge is plausible, but it has not yet beaten substitutes in buyer conversations or procurement comparison.',
    evidence: `${competitivePositioningValidation.status}; defensible_wedge=${defensibleCompetitiveWedge}; substitution_protocol_ready=${buyerSubstitutionProtocolReady}; substitution_test_rows=${buyerSubstitutionKit.summary?.substitution_test_row_count ?? 0}; substitution_evidence_ready=${buyerSubstitutionEvidenceReady}; real_substitution_interactions=${buyerSubstitutionRealInteractionCount}; buyer_validated=${buyerValidated}; substitute_categories=${competitivePositioningValidation.summary?.required_substitute_category_present_count ?? 0}/${competitivePositioningValidation.summary?.required_substitute_category_count ?? 0}.`,
    external_anchor_ids: ['palantir_aip', 'dataminr_risk_intelligence', 'good_judgment_services', 'metaculus_track_record'],
    buyer_impact: 'Buyers may view the app as a lightweight substitute for Palantir-style decision workflows, Dataminr-style risk alerting, Metaculus/Good Judgment forecasting, or internal analyst workflows.',
    remediation: buyerSubstitutionProtocolReady
      ? 'Execute the buyer substitution test sheet and record current tool, budget owner, replacement barrier, must-have proof, and paid pilot threshold.'
      : 'Convert the buyer script into a substitution test: current tool, budget owner, replacement barrier, must-have proof, and paid pilot threshold.',
    proof_to_close: 'Buyer evidence shows the app wins a specific pilot wedge against named substitutes.',
    owner_action_required: true,
    repo_action_available: !buyerSubstitutionProtocolReady,
    claim_boundary: 'defensible competitive wedge allowed; replacement/parity claims blocked'
  },
  {
    id: 'hosted_proof_blocked_before_browser_smoke',
    severity: 'P0',
    status: hostedProofComplete ? 'closed_current' : 'open_runtime_access_required',
    category: 'runtime_readiness',
    loophole: 'Local route proof is useful, but hosted-live claims and Browser-verified production behavior remain blocked by hosted access and smoke execution.',
    evidence: `${hostedSmokeExecutionReadiness.status}; local_route_proof=${localRouteProofReady}; owner_unblock_ready=${hostedOwnerUnblockReady}; hosted_smoke_ready=${hostedSmokeReady}; hosted_proof_complete=${hostedProofComplete}.`,
    external_anchor_ids: ['cisa_secure_by_design', 'nist_csf_2'],
    buyer_impact: 'Enterprise buyers and pilot sponsors need proof that the live system works in the actual deployed environment.',
    remediation: 'Resolve project visibility/management access, Stripe proof values, and deploy binding, then run hosted Browser/Playwright smoke tests.',
    proof_to_close: 'Hosted smoke execution readiness and hosted operational proof validators both pass with live evidence.',
    owner_action_required: true,
    repo_action_available: false,
    claim_boundary: 'local proof only'
  },
  {
    id: 'enterprise_trust_pack_not_approved_or_executed',
    severity: 'P0',
    status: enterpriseProofReady ? 'closed_current' : 'open_owner_evidence_required',
    category: 'enterprise_trust',
    loophole: 'Enterprise/public-sector positioning is attractive, but trust proof is incomplete without procurement documents, RLS execution, hosted access proof, and approved AI action controls.',
    evidence: `${enterpriseExecutionReadiness.status}; procurement_docs=${enterpriseExecutionReadiness.summary?.procurement_ready_document_count ?? 0}/${enterpriseExecutionReadiness.summary?.procurement_required_document_count ?? 8}; rls_rows=${enterpriseExecutionReadiness.summary?.rls_executed_row_count ?? 0}/${enterpriseExecutionReadiness.summary?.rls_expected_case_environment_row_count ?? 0}; local_llm_red_team=${enterpriseExecutionReadiness.summary?.local_llm_red_team_passed ?? false}; hosted_access=${enterpriseExecutionReadiness.summary?.hosted_access_ready_for_smoke ?? false}.`,
    external_anchor_ids: ['nist_ai_rmf', 'nist_genai_profile', 'oecd_ai_principles_2024', 'owasp_llm_top_10', 'nist_csf_2', 'cisa_secure_by_design'],
    buyer_impact: 'Procurement teams will treat the product as an interesting pilot, not enterprise-ready infrastructure.',
    remediation: 'Approve trust documents, run RLS proof cases, finish hosted security proof, and keep high-impact AI actions under human review.',
    proof_to_close: 'Enterprise trust execution readiness allows enterprise/public-sector trust claims.',
    owner_action_required: true,
    repo_action_available: false,
    claim_boundary: 'enterprise pilot language only'
  },
  {
    id: 'llm_governance_local_only',
    severity: 'P1',
    status: enterpriseProofReady && hostedProofComplete ? 'closed_current' : 'open_runtime_evidence_gap',
    category: 'ai_governance',
    loophole: 'Local LLM red-team and policy artifacts are not enough for hosted AI governance claims.',
    evidence: `claim_consistency_ready=${claimConsistencyReady}; enterprise_proof_ready=${enterpriseProofReady}; hosted_proof_complete=${hostedProofComplete}; local_llm_red_team=${enterpriseExecutionReadiness.summary?.local_llm_red_team_passed ?? false}.`,
    external_anchor_ids: ['nist_genai_profile', 'owasp_llm_top_10', 'oecd_ai_principles_2024'],
    buyer_impact: 'AI governance buyers will ask whether prompt/tool risks are controlled in the deployed product, not only in local fixtures.',
    remediation: 'Run hosted LLM security smoke checks and keep refusal, provenance, tool/action, and human-review gates documented.',
    proof_to_close: 'Hosted LLM/security evidence is present and claim consistency remains clean.',
    owner_action_required: true,
    repo_action_available: false,
    claim_boundary: 'local red-team proof only'
  },
  {
    id: 'broad_worldwide_sector_claim_too_large',
    severity: 'P1',
    status: topFiveNichesReady && claimConsistencyReady ? 'contained_by_claim_gate' : 'open_positioning_gap',
    category: 'market_scope',
    loophole: 'The original worldwide/world-class ambition is too broad for the current evidence; the sellable scope should stay focused on five pilot niches.',
    evidence: `top_five_niches_ready=${topFiveNichesReady}; launch_decision=${launchDecision}; confidence=${confidencePercent}; unsupported_claims=${claimConsistencyValidation.summary?.unsupported_claim_mention_count ?? 0}.`,
    external_anchor_ids: ['wef_global_risks_2026', 'palantir_aip', 'dataminr_risk_intelligence'],
    buyer_impact: 'Over-broad claims weaken credibility versus mature enterprise intelligence and forecasting vendors.',
    remediation: 'Use the five-niche pilot narrative and prohibit world-class/accurate-prediction copy until evidence gates pass.',
    proof_to_close: '95 percent confidence and goal-completion audit pass with no unsupported claims.',
    owner_action_required: false,
    repo_action_available: true,
    claim_boundary: 'pilot-only positioning'
  },
  {
    id: 'sample_fixture_score_risk',
    severity: 'P1',
    status: scoringSampleOnly ? 'open_evaluation_gap' : 'contained_by_scoring_gate',
    category: 'evaluation_integrity',
    loophole: 'Sample fixture scoring can prove validator mechanics, but it cannot prove predictive accuracy.',
    evidence: `${forecastScoringValidation.status}; sample_fixture_only=${scoringSampleOnly}; valid_resolved_forecasts=${realOutcomeCount}; valid_baselines=${realBaselineCount}.`,
    external_anchor_ids: ['iarpa_ace', 'metaculus_track_record', 'forecastbench_dynamic_benchmark', 'metaculus_futureeval'],
    buyer_impact: 'A technically sophisticated buyer will distinguish fixture correctness from real forecasting skill.',
    remediation: 'Use sample fixtures only for harness checks; require real resolved events before score claims.',
    proof_to_close: 'Scoring validation uses real rows and benchmark comparisons.',
    owner_action_required: true,
    repo_action_available: false,
    claim_boundary: 'fixture proof is not accuracy proof'
  },
  {
    id: 'claim_consistency_is_clean_but_fragile',
    severity: 'P2',
    status: claimConsistencyReady ? 'contained_by_claim_gate' : 'open_claim_risk',
    category: 'claims',
    loophole: 'The claim surface is currently clean, but every generated artifact or landing copy change can reintroduce unsupported world-class, hosted-live, buyer-validated, or accuracy claims.',
    evidence: `${claimConsistencyValidation.status}; scanned_files=${claimConsistencyValidation.summary?.scanned_file_count ?? 0}; high_risk_mentions=${claimConsistencyValidation.summary?.high_risk_claim_mention_count ?? 0}; unsupported=${claimConsistencyValidation.summary?.unsupported_claim_mention_count ?? 0}.`,
    external_anchor_ids: ['nist_ai_rmf', 'oecd_ai_principles_2024'],
    buyer_impact: 'Clean language protects credibility while evidence is still pilot-only.',
    remediation: 'Rerun claim consistency after every launch-readiness, pricing, landing, or outreach language change.',
    proof_to_close: 'Claim consistency remains clean after final buyer-facing copy is generated.',
    owner_action_required: false,
    repo_action_available: true,
    claim_boundary: 'safe if validator keeps passing'
  }
];

const openLoopholes = loopholes.filter((item) => !['closed_current', 'contained_by_claim_gate', 'contained_by_scoring_gate'].includes(item.status));
const p0OpenCount = openLoopholes.filter((item) => item.severity === 'P0').length;
const ownerGatedCount = openLoopholes.filter((item) => item.owner_action_required).length;
const repoActionableCount = openLoopholes.filter((item) => item.repo_action_available).length;
const pilotClaimAllowed = launchDecision === 'pilot-only'
  && claimConsistencyReady
  && topFiveNichesReady
  && defensibleCompetitiveWedge;
const worldClassClaimAllowed = confidencePercent >= targetConfidencePercent
  && goalCompletionReady
  && buyerValidated
  && forecastClaimReady
  && hostedProofComplete
  && enterpriseProofReady;

const remediationLoop = [
  {
    rank: 1,
    lane: 'owner_approval_gate',
    action: 'Owner reviews and approves the consolidated approval register before downstream prediction, buyer, enterprise, hosted, payment, AI-action, and claim-language proof runs.',
    closes: ['owner_approval_register_not_cleared'],
    proof_bucket: 'owner_input'
  },
  {
    rank: 2,
    lane: 'prediction_accuracy',
    action: 'Collect owner-approved resolved forecasts and baselines, then rerun leakage, scoring, science, confidence, and completion gates.',
    closes: ['prediction_accuracy_without_resolved_outcomes', 'sample_fixture_score_risk'],
    proof_bucket: 'owner_input'
  },
  {
    rank: 3,
    lane: 'buyer_validation',
    action: 'Execute the 10-call buyer validation slate and record willingness-to-pay/substitution evidence.',
    closes: ['buyer_validation_without_completed_calls', 'competitive_wedge_without_buyer_substitution_proof'],
    proof_bucket: 'owner_input'
  },
  {
    rank: 4,
    lane: 'enterprise_trust',
    action: 'Approve procurement documents, run RLS proof, and complete hosted LLM/security evidence.',
    closes: ['enterprise_trust_pack_not_approved_or_executed', 'llm_governance_local_only'],
    proof_bucket: 'owner_input'
  },
  {
    rank: 5,
    lane: 'hosted_browser_runtime',
    action: 'Unblock project privileges and execute hosted Browser/Playwright smoke tests.',
    closes: ['hosted_proof_blocked_before_browser_smoke'],
    proof_bucket: 'hosted_live'
  },
  {
    rank: 6,
    lane: 'claim_and_positioning_control',
    action: 'Keep all public copy constrained to pilot-only governed decision support until the completion audit passes.',
    closes: ['broad_worldwide_sector_claim_too_large', 'claim_consistency_is_clean_but_fragile'],
    proof_bucket: 'repo_artifact'
  }
];

const report = {
  schema_version: 'commercial-loophole-remediation-v1',
  generated_at: new Date().toISOString(),
  status: worldClassClaimAllowed
    ? 'commercial_loophole_remediation_closed_world_class_review_ready'
    : 'commercial_loophole_remediation_open_pilot_only',
  source: {
    evidence: inputPaths.evidence,
    commercial_confidence_gate: inputPaths.commercialConfidenceGate,
    goal_completion_audit: inputPaths.goalCompletionAudit,
    market_niche_validation: inputPaths.marketNicheValidation,
    competitive_positioning_validation: inputPaths.competitivePositioningValidation,
    buyer_execution_readiness: inputPaths.buyerExecutionReadiness,
    buyer_substitution_kit: inputPaths.buyerSubstitutionKit,
    buyer_substitution_evidence_validation: inputPaths.buyerSubstitutionEvidenceValidation,
    forecast_execution_readiness: inputPaths.forecastExecutionReadiness,
    prediction_science_validation: inputPaths.predictionScienceValidation,
    forecast_scoring_validation: inputPaths.forecastScoringValidation,
    forecast_leakage_validation: inputPaths.forecastLeakageValidation,
    enterprise_execution_readiness: inputPaths.enterpriseExecutionReadiness,
    hosted_smoke_execution_readiness: inputPaths.hostedSmokeExecutionReadiness,
    claim_consistency_validation: inputPaths.claimConsistencyValidation,
    owner_approval_validation: inputPaths.ownerApprovalValidation,
    local_browser_route_proof: inputPaths.localBrowserRouteProof
  },
  summary: {
    launch_decision: launchDecision,
    commercial_world_class_confidence_percent: confidencePercent,
    target_confidence_percent: targetConfidencePercent,
    confidence_gap_percent: confidenceGapPercent,
    pilot_claim_allowed: pilotClaimAllowed,
    world_class_claim_allowed: worldClassClaimAllowed,
    completion_ready: goalCompletionReady,
    loophole_count: loopholes.length,
    open_loophole_count: openLoopholes.length,
    p0_open_count: p0OpenCount,
    owner_gated_open_count: ownerGatedCount,
    repo_actionable_open_count: repoActionableCount,
    source_anchor_count: CURRENT_SOURCE_ANCHORS.length,
    buyer_validated: buyerValidated,
    buyer_substitution_protocol_ready: buyerSubstitutionProtocolReady,
    buyer_substitution_evidence_ready: buyerSubstitutionEvidenceReady,
    buyer_substitution_real_interaction_count: buyerSubstitutionRealInteractionCount,
    forecast_claim_ready: forecastClaimReady,
    hosted_proof_complete: hostedProofComplete,
    enterprise_proof_ready: enterpriseProofReady,
    claim_consistency_ready: claimConsistencyReady,
    top_five_niches_ready: topFiveNichesReady,
    owner_approval_validation_status: ownerApprovalStatus,
    owner_approval_required_count: ownerApprovalRequiredCount,
    owner_approval_approved_count: ownerApprovalApprovedCount,
    owner_approval_reviewed_count: ownerApprovalReviewedCount,
    owner_approval_claim_boundary_acknowledged_count: ownerApprovalClaimBoundaryAcknowledgedCount,
    owner_approval_row_error_count: ownerApprovalRowErrorCount,
    owner_approval_ready_for_downstream_evidence: ownerApprovalReadyForDownstreamEvidence,
    owner_approval_commercial_ready_claim_allowed: ownerApprovalCommercialReadyClaimAllowed,
    owner_approval_world_class_prediction_claim_allowed: ownerApprovalWorldClassPredictionClaimAllowed,
    owner_approval_hosted_live_claim_allowed: ownerApprovalHostedLiveClaimAllowed,
    owner_approval_buyer_validated_claim_allowed: ownerApprovalBuyerValidatedClaimAllowed,
    owner_approval_enterprise_ready_claim_allowed: ownerApprovalEnterpriseReadyClaimAllowed
  },
  current_source_anchors: CURRENT_SOURCE_ANCHORS,
  loopholes,
  remediation_loop: remediationLoop,
  decision: worldClassClaimAllowed
    ? 'All loopholes can be reviewed for closure; world-class/commercial-ready language may be considered only after final human review.'
    : 'Keep the strategy at pilot-only. The strongest current marketable wedge is governed strategic-intelligence decision support with calibration-aware forecasting mechanics, not proven world-class prediction accuracy.',
  proof_boundary: 'This validator consolidates loopholes and fixes. It does not create buyer calls, hosted proof, enterprise approvals, or real prediction outcomes.'
};

function renderCsv(artifact) {
  return [
    csvLine(['id', 'severity', 'status', 'category', 'loophole', 'evidence', 'source_anchors', 'buyer_impact', 'remediation', 'proof_to_close', 'owner_action_required', 'repo_action_available', 'claim_boundary']),
    ...artifact.loopholes.map((item) => csvLine([
      item.id,
      item.severity,
      item.status,
      item.category,
      item.loophole,
      item.evidence,
      sourceLabels(item.external_anchor_ids),
      item.buyer_impact,
      item.remediation,
      item.proof_to_close,
      item.owner_action_required,
      item.repo_action_available,
      item.claim_boundary
    ]))
  ].join('\n') + '\n';
}

function renderMarkdown(artifact) {
  const rows = artifact.loopholes
    .map((item) => [
      mdCell(item.id),
      mdCell(item.severity),
      mdCell(item.status),
      mdCell(item.category),
      mdCell(item.evidence),
      mdCell(item.remediation)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const sourceRows = artifact.current_source_anchors
    .map((source) => `| ${mdCell(source.id)} | ${mdCell(source.source)} | ${mdCell(source.url)} | ${mdCell(source.implication)} |`)
    .join('\n');

  const loopRows = artifact.remediation_loop
    .map((item) => `| ${item.rank} | ${mdCell(item.lane)} | ${mdCell(item.action)} | ${mdCell(item.closes.join('; '))} | ${mdCell(item.proof_bucket)} |`)
    .join('\n');

  return `# Commercial Loophole Remediation - 2026-06-06

## Decision

Status: \`${artifact.status}\`.

Launch decision: **${artifact.summary.launch_decision}**.

Commercial/world-class confidence: **${artifact.summary.commercial_world_class_confidence_percent}%**.

Confidence gap to ${artifact.summary.target_confidence_percent}%: **${artifact.summary.confidence_gap_percent}%**.

Pilot claim allowed: **${artifact.summary.pilot_claim_allowed}**.

World-class claim allowed: **${artifact.summary.world_class_claim_allowed}**.

Open loopholes: **${artifact.summary.open_loophole_count}/${artifact.summary.loophole_count}**.

P0 open loopholes: **${artifact.summary.p0_open_count}**.

Owner-gated open loopholes: **${artifact.summary.owner_gated_open_count}**.

Owner approval status: **${artifact.summary.owner_approval_validation_status}**.

Owner-approved approval rows: **${artifact.summary.owner_approval_approved_count}/${artifact.summary.owner_approval_required_count}**.

Owner approval ready for downstream evidence: **${artifact.summary.owner_approval_ready_for_downstream_evidence}**.

## Loophole Register

| ID | Severity | Status | Category | Evidence | Remediation |
|---|---|---|---|---|---|
${rows}

## Remediation Loop

| Rank | Lane | Action | Closes | Proof Bucket |
|---|---|---|---|---|
${loopRows}

## Current Source Anchors

| ID | Source | URL | Implication |
|---|---|---|---|
${sourceRows}

## Proof Boundary

${artifact.proof_boundary}
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
  const nextEvidence = readJsonIfExists(inputPaths.evidence, null);
  if (!nextEvidence) {
    console.error(`Cannot update missing evidence artifact: ${inputPaths.evidence}`);
    process.exit(2);
  }

  nextEvidence.proof_buckets = nextEvidence.proof_buckets ?? {};
  nextEvidence.proof_buckets.local = replaceMatchingThenAppend(nextEvidence.proof_buckets.local, [
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:commercial:loopholes -- --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence: status ${report.status}, open_loopholes ${report.summary.open_loophole_count}, p0_open ${report.summary.p0_open_count}, owner_approval ${report.summary.owner_approval_approved_count}/${report.summary.owner_approval_required_count}`
  ], [
    /npm run audit:commercial:loopholes/
  ]);

  nextEvidence.proof_buckets.repo_artifact = replaceMatchingThenAppend(nextEvidence.proof_buckets.repo_artifact, [
    'scripts/validate-commercial-loophole-remediation.mjs consolidates owner-approval, market, prediction, buyer, hosted, enterprise, and claim loopholes into a remediation loop',
    'docs/launch-readiness/commercial-loophole-remediation-2026-06-06.json records current loopholes, source anchors, and proof required to close each gap',
    'docs/launch-readiness/commercial-loophole-remediation-checklist-2026-06-06.csv provides the loophole remediation checklist'
  ], [
    /scripts\/validate-commercial-loophole-remediation\.mjs/,
    /commercial-loophole-remediation-2026-06-06\.json/,
    /commercial-loophole-remediation-checklist-2026-06-06\.csv/
  ]);

  nextEvidence.fix_report = nextEvidence.fix_report ?? {};
  nextEvidence.fix_report.files_changed = replaceMatchingThenAppend(nextEvidence.fix_report.files_changed, [
    'scripts/validate-commercial-loophole-remediation.mjs',
    'docs/launch-readiness/commercial-loophole-remediation-2026-06-06.json',
    'docs/launch-readiness/commercial-loophole-remediation-2026-06-06.md',
    'docs/launch-readiness/commercial-loophole-remediation-checklist-2026-06-06.csv',
    'package.json'
  ], [
    /scripts\/validate-commercial-loophole-remediation\.mjs/,
    /commercial-loophole-remediation-2026-06-06\.json/,
    /commercial-loophole-remediation-2026-06-06\.md/,
    /commercial-loophole-remediation-checklist-2026-06-06\.csv/,
    /package\.json/
  ]);

  nextEvidence.fix_report.tests_run = replaceMatchingThenAppend(nextEvidence.fix_report.tests_run, [
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH node --check scripts/validate-commercial-loophole-remediation.mjs',
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:commercial:loopholes -- --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence`
  ], [
    /node --check scripts\/validate-commercial-loophole-remediation\.mjs/,
    /npm run audit:commercial:loopholes/
  ]);

  nextEvidence.fix_report.approval_gates = replaceMatchingThenAppend(nextEvidence.fix_report.approval_gates, [
    'Commercial loophole remediation gate keeps world-class/commercial-ready claims blocked until owner-approval, prediction, buyer, hosted, and enterprise loopholes are closed with current evidence.'
  ], [
    /Commercial loophole remediation gate keeps/
  ]);

  nextEvidence.implementation_decisions = replaceByTaskId(nextEvidence.implementation_decisions, {
    task_id: 'commercial-loophole-remediation-gate',
    decision: 'Add a consolidated loophole-to-remediation validator for the persistent commercial launch goal.',
    acceptance_check: 'The gate must identify open loopholes across owner approval, marketability, sellability, uniqueness, prediction science, hosted proof, enterprise trust, and claims without increasing confidence or fabricating owner evidence.',
    chosen_variant: 'minimal Node artifact validator and package script',
    rejected_variants: [
      'Product code change: rejected because current blocker is evidence quality, not UI behavior.',
      'Confidence-score increase: rejected because no new buyer, hosted, enterprise, or real forecast outcome proof was added.',
      'Broad market report only: rejected because the goal needs a runnable proof gate tied to repo artifacts.'
    ],
    repo_pattern_reused: 'Existing launch-readiness validator, markdown/csv/json artifact, and launch-evidence update pattern',
    files_changed: [
      'scripts/validate-commercial-loophole-remediation.mjs',
      'package.json'
    ],
    tests_run: [
      'node --check scripts/validate-commercial-loophole-remediation.mjs',
      'npm run audit:commercial:loopholes'
    ],
    proof: `${report.status}; open_loopholes=${report.summary.open_loophole_count}; p0_open=${report.summary.p0_open_count}; owner_approval=${report.summary.owner_approval_approved_count}/${report.summary.owner_approval_required_count}; world_class_claim_allowed=${report.summary.world_class_claim_allowed}.`,
    reason: 'The original goal explicitly asks to find loopholes, suggest fixes, and loop toward factual 95 percent confidence.'
  });

  writeArtifact(inputPaths.evidence, `${JSON.stringify(nextEvidence, null, 2)}\n`);
}

console.log(JSON.stringify({
  json_output: outputPaths.json,
  md_output: outputPaths.md,
  csv_output: outputPaths.csv,
  evidence_updated: updateEvidence,
  status: report.status,
  launch_decision: report.summary.launch_decision,
  commercial_world_class_confidence_percent: report.summary.commercial_world_class_confidence_percent,
  confidence_gap_percent: report.summary.confidence_gap_percent,
  open_loophole_count: report.summary.open_loophole_count,
  p0_open_count: report.summary.p0_open_count,
  owner_gated_open_count: report.summary.owner_gated_open_count,
  owner_approval_validation_status: report.summary.owner_approval_validation_status,
  owner_approval_approved_count: report.summary.owner_approval_approved_count,
  owner_approval_required_count: report.summary.owner_approval_required_count,
  owner_approval_ready_for_downstream_evidence: report.summary.owner_approval_ready_for_downstream_evidence,
  pilot_claim_allowed: report.summary.pilot_claim_allowed,
  world_class_claim_allowed: report.summary.world_class_claim_allowed
}, null, 2));
