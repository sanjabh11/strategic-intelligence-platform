#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const DEFAULT_EVIDENCE = 'docs/launch-readiness/launch-evidence-2026-06-06.json';
const DEFAULT_RLS_DRAFT = 'docs/launch-readiness/rls-identity-and-review-policy-draft-2026-06-06.json';
const DEFAULT_CALIBRATION = 'docs/launch-readiness/calibration-readiness-audit-2026-06-06.json';
const DEFAULT_BENCHMARK = 'docs/launch-readiness/forecast-benchmark-comparison-2026-06-06.json';
const DEFAULT_ACCURACY_INTAKE_KIT = 'docs/launch-readiness/accuracy-evidence-intake-kit-2026-06-06.json';
const DEFAULT_ACCURACY_INPUT_VALIDATION = 'docs/launch-readiness/accuracy-evidence-input-validation-2026-06-06.json';
const DEFAULT_FORECAST_EVALUATION_PROTOCOL = 'docs/launch-readiness/forecast-evaluation-protocol-2026-06-06.json';
const DEFAULT_FORECAST_CLAIM_GOVERNANCE = 'docs/launch-readiness/forecast-claim-governance-2026-06-06.json';
const DEFAULT_LEAKAGE_REVIEW_VALIDATION = 'docs/launch-readiness/forecast-leakage-review-validation-2026-06-06.json';
const DEFAULT_SCORING_VALIDATION = 'docs/launch-readiness/forecast-scoring-evidence-validation-2026-06-06.json';
const DEFAULT_PREDICTION_SCIENCE_VALIDATION = 'docs/launch-readiness/prediction-science-evidence-validation-2026-06-06.json';
const DEFAULT_FORECAST_EXECUTION_READINESS = 'docs/launch-readiness/forecast-evaluation-execution-readiness-2026-06-06.json';
const DEFAULT_RLS_PROOF_VALIDATION = 'docs/launch-readiness/rls-proof-evidence-validation-2026-06-06.json';
const DEFAULT_HOSTED_PROOF_KIT = 'docs/launch-readiness/hosted-operational-proof-kit-2026-06-06.json';
const DEFAULT_HOSTED_ACCESS_PREFLIGHT = 'docs/launch-readiness/hosted-access-preflight-validation-2026-06-06.json';
const DEFAULT_HOSTED_PROOF_VALIDATION = 'docs/launch-readiness/hosted-operational-proof-evidence-validation-2026-06-06.json';
const DEFAULT_HOSTED_SMOKE_EXECUTION_READINESS = 'docs/launch-readiness/hosted-smoke-execution-readiness-2026-06-06.json';
const DEFAULT_PILOT_OFFER_PACK = 'docs/launch-readiness/pilot-offer-pack-2026-06-06.json';
const DEFAULT_PILOT_PACKAGE_READINESS = 'docs/launch-readiness/pilot-package-readiness-2026-06-06.json';
const DEFAULT_ENTERPRISE_TRUST_PACK = 'docs/launch-readiness/enterprise-trust-pack-2026-06-06.json';
const DEFAULT_ENTERPRISE_EVIDENCE_VALIDATION = 'docs/launch-readiness/enterprise-procurement-evidence-validation-2026-06-06.json';
const DEFAULT_ENTERPRISE_PROCUREMENT_GATE = 'docs/launch-readiness/enterprise-procurement-readiness-gate-2026-06-06.json';
const DEFAULT_ENTERPRISE_EXECUTION_READINESS = 'docs/launch-readiness/enterprise-trust-execution-readiness-2026-06-06.json';
const DEFAULT_LLM_SECURITY_AUDIT = 'docs/launch-readiness/llm-security-readiness-audit-2026-06-06.json';
const DEFAULT_AI_ACTION_INVENTORY = 'docs/launch-readiness/ai-action-inventory-2026-06-06.json';
const DEFAULT_AI_ACTION_POLICY = 'docs/launch-readiness/ai-high-impact-action-policy-2026-06-06.json';
const DEFAULT_BUYER_CRM = 'docs/launch-readiness/buyer-validation-crm-template-2026-06-06.csv';
const DEFAULT_BUYER_TARGETS = 'docs/launch-readiness/buyer-validation-targets-2026-06-06.json';
const DEFAULT_BUYER_DISCOVERY_KIT = 'docs/launch-readiness/buyer-discovery-kit-2026-06-06.json';
const DEFAULT_BUYER_EVIDENCE_VALIDATION = 'docs/launch-readiness/buyer-evidence-input-validation-2026-06-06.json';
const DEFAULT_BUYER_PROOF_GATE = 'docs/launch-readiness/buyer-proof-gate-2026-06-06.json';
const DEFAULT_BUYER_EXECUTION_READINESS = 'docs/launch-readiness/buyer-validation-execution-readiness-2026-06-06.json';
const DEFAULT_BUYER_SUBSTITUTION_EVIDENCE_VALIDATION = 'docs/launch-readiness/buyer-substitution-evidence-validation-2026-06-06.json';
const DEFAULT_LOCAL_BROWSER_ROUTE_PROOF = 'docs/launch-readiness/local-browser-route-proof-2026-06-06.json';
const DEFAULT_MARKET_NICHE_VALIDATION = 'docs/launch-readiness/market-niche-evidence-validation-2026-06-06.json';
const DEFAULT_COMPETITIVE_POSITIONING_VALIDATION = 'docs/launch-readiness/competitive-positioning-evidence-validation-2026-06-06.json';
const DEFAULT_CLAIM_CONSISTENCY_VALIDATION = 'docs/launch-readiness/claim-consistency-validation-2026-06-06.json';
const DEFAULT_OWNER_APPROVAL_VALIDATION = 'docs/launch-readiness/owner-approval-register-validation-2026-06-06.json';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/commercial-confidence-gate-2026-06-06.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/commercial-confidence-gate-2026-06-06.md';

function argValue(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function usage() {
  console.error([
    'Usage: node scripts/build-commercial-confidence-gate.mjs',
    `  [--evidence ${DEFAULT_EVIDENCE}]`,
    `  [--rls-draft ${DEFAULT_RLS_DRAFT}]`,
    `  [--calibration ${DEFAULT_CALIBRATION}]`,
    `  [--benchmark ${DEFAULT_BENCHMARK}]`,
    `  [--accuracy-intake-kit ${DEFAULT_ACCURACY_INTAKE_KIT}]`,
    `  [--accuracy-input-validation ${DEFAULT_ACCURACY_INPUT_VALIDATION}]`,
    `  [--forecast-evaluation-protocol ${DEFAULT_FORECAST_EVALUATION_PROTOCOL}]`,
    `  [--forecast-claim-governance ${DEFAULT_FORECAST_CLAIM_GOVERNANCE}]`,
    `  [--leakage-review-validation ${DEFAULT_LEAKAGE_REVIEW_VALIDATION}]`,
    `  [--scoring-validation ${DEFAULT_SCORING_VALIDATION}]`,
    `  [--prediction-science-validation ${DEFAULT_PREDICTION_SCIENCE_VALIDATION}]`,
    `  [--forecast-execution-readiness ${DEFAULT_FORECAST_EXECUTION_READINESS}]`,
    `  [--rls-proof-validation ${DEFAULT_RLS_PROOF_VALIDATION}]`,
    `  [--hosted-proof-kit ${DEFAULT_HOSTED_PROOF_KIT}]`,
    `  [--hosted-access-preflight ${DEFAULT_HOSTED_ACCESS_PREFLIGHT}]`,
    `  [--hosted-proof-validation ${DEFAULT_HOSTED_PROOF_VALIDATION}]`,
    `  [--hosted-smoke-execution-readiness ${DEFAULT_HOSTED_SMOKE_EXECUTION_READINESS}]`,
    `  [--pilot-offer-pack ${DEFAULT_PILOT_OFFER_PACK}]`,
    `  [--pilot-package-readiness ${DEFAULT_PILOT_PACKAGE_READINESS}]`,
    `  [--enterprise-trust-pack ${DEFAULT_ENTERPRISE_TRUST_PACK}]`,
  `  [--enterprise-evidence-validation ${DEFAULT_ENTERPRISE_EVIDENCE_VALIDATION}]`,
  `  [--enterprise-procurement-gate ${DEFAULT_ENTERPRISE_PROCUREMENT_GATE}]`,
  `  [--enterprise-execution-readiness ${DEFAULT_ENTERPRISE_EXECUTION_READINESS}]`,
  `  [--llm-security-audit ${DEFAULT_LLM_SECURITY_AUDIT}]`,
    `  [--ai-action-inventory ${DEFAULT_AI_ACTION_INVENTORY}]`,
    `  [--ai-action-policy ${DEFAULT_AI_ACTION_POLICY}]`,
    `  [--buyer-crm ${DEFAULT_BUYER_CRM}]`,
    `  [--buyer-targets ${DEFAULT_BUYER_TARGETS}]`,
    `  [--buyer-discovery-kit ${DEFAULT_BUYER_DISCOVERY_KIT}]`,
    `  [--buyer-evidence-validation ${DEFAULT_BUYER_EVIDENCE_VALIDATION}]`,
    `  [--buyer-proof-gate ${DEFAULT_BUYER_PROOF_GATE}]`,
    `  [--buyer-execution-readiness ${DEFAULT_BUYER_EXECUTION_READINESS}]`,
    `  [--buyer-substitution-evidence-validation ${DEFAULT_BUYER_SUBSTITUTION_EVIDENCE_VALIDATION}]`,
    `  [--local-browser-route-proof ${DEFAULT_LOCAL_BROWSER_ROUTE_PROOF}]`,
    `  [--market-niche-validation ${DEFAULT_MARKET_NICHE_VALIDATION}]`,
    `  [--competitive-positioning-validation ${DEFAULT_COMPETITIVE_POSITIONING_VALIDATION}]`,
    `  [--claim-consistency-validation ${DEFAULT_CLAIM_CONSISTENCY_VALIDATION}]`,
    `  [--owner-approval-validation ${DEFAULT_OWNER_APPROVAL_VALIDATION}]`,
    `  [--json-output ${DEFAULT_JSON_OUTPUT}]`,
    `  [--md-output ${DEFAULT_MD_OUTPUT}]`
  ].join('\n'));
}

if (hasFlag('--help') || hasFlag('-h')) {
  usage();
  process.exit(0);
}

const inputPaths = {
  evidence: argValue('--evidence', DEFAULT_EVIDENCE),
  rlsDraft: argValue('--rls-draft', DEFAULT_RLS_DRAFT),
  calibration: argValue('--calibration', DEFAULT_CALIBRATION),
  benchmark: argValue('--benchmark', DEFAULT_BENCHMARK),
  accuracyIntakeKit: argValue('--accuracy-intake-kit', DEFAULT_ACCURACY_INTAKE_KIT),
  accuracyInputValidation: argValue('--accuracy-input-validation', DEFAULT_ACCURACY_INPUT_VALIDATION),
  forecastEvaluationProtocol: argValue('--forecast-evaluation-protocol', DEFAULT_FORECAST_EVALUATION_PROTOCOL),
  forecastClaimGovernance: argValue('--forecast-claim-governance', DEFAULT_FORECAST_CLAIM_GOVERNANCE),
  leakageReviewValidation: argValue('--leakage-review-validation', DEFAULT_LEAKAGE_REVIEW_VALIDATION),
  scoringValidation: argValue('--scoring-validation', DEFAULT_SCORING_VALIDATION),
  predictionScienceValidation: argValue('--prediction-science-validation', DEFAULT_PREDICTION_SCIENCE_VALIDATION),
  forecastExecutionReadiness: argValue('--forecast-execution-readiness', DEFAULT_FORECAST_EXECUTION_READINESS),
  rlsProofValidation: argValue('--rls-proof-validation', DEFAULT_RLS_PROOF_VALIDATION),
  hostedProofKit: argValue('--hosted-proof-kit', DEFAULT_HOSTED_PROOF_KIT),
  hostedAccessPreflight: argValue('--hosted-access-preflight', DEFAULT_HOSTED_ACCESS_PREFLIGHT),
  hostedProofValidation: argValue('--hosted-proof-validation', DEFAULT_HOSTED_PROOF_VALIDATION),
  hostedSmokeExecutionReadiness: argValue('--hosted-smoke-execution-readiness', DEFAULT_HOSTED_SMOKE_EXECUTION_READINESS),
  pilotOfferPack: argValue('--pilot-offer-pack', DEFAULT_PILOT_OFFER_PACK),
  pilotPackageReadiness: argValue('--pilot-package-readiness', DEFAULT_PILOT_PACKAGE_READINESS),
  enterpriseTrustPack: argValue('--enterprise-trust-pack', DEFAULT_ENTERPRISE_TRUST_PACK),
  enterpriseEvidenceValidation: argValue('--enterprise-evidence-validation', DEFAULT_ENTERPRISE_EVIDENCE_VALIDATION),
  enterpriseProcurementGate: argValue('--enterprise-procurement-gate', DEFAULT_ENTERPRISE_PROCUREMENT_GATE),
  enterpriseExecutionReadiness: argValue('--enterprise-execution-readiness', DEFAULT_ENTERPRISE_EXECUTION_READINESS),
  llmSecurityAudit: argValue('--llm-security-audit', DEFAULT_LLM_SECURITY_AUDIT),
  aiActionInventory: argValue('--ai-action-inventory', DEFAULT_AI_ACTION_INVENTORY),
  aiActionPolicy: argValue('--ai-action-policy', DEFAULT_AI_ACTION_POLICY),
  buyerCrm: argValue('--buyer-crm', DEFAULT_BUYER_CRM),
  buyerTargets: argValue('--buyer-targets', DEFAULT_BUYER_TARGETS),
  buyerDiscoveryKit: argValue('--buyer-discovery-kit', DEFAULT_BUYER_DISCOVERY_KIT),
  buyerEvidenceValidation: argValue('--buyer-evidence-validation', DEFAULT_BUYER_EVIDENCE_VALIDATION),
  buyerProofGate: argValue('--buyer-proof-gate', DEFAULT_BUYER_PROOF_GATE),
  buyerExecutionReadiness: argValue('--buyer-execution-readiness', DEFAULT_BUYER_EXECUTION_READINESS),
  buyerSubstitutionEvidenceValidation: argValue('--buyer-substitution-evidence-validation', DEFAULT_BUYER_SUBSTITUTION_EVIDENCE_VALIDATION),
  localBrowserRouteProof: argValue('--local-browser-route-proof', DEFAULT_LOCAL_BROWSER_ROUTE_PROOF),
  marketNicheValidation: argValue('--market-niche-validation', DEFAULT_MARKET_NICHE_VALIDATION),
  competitivePositioningValidation: argValue('--competitive-positioning-validation', DEFAULT_COMPETITIVE_POSITIONING_VALIDATION),
  claimConsistencyValidation: argValue('--claim-consistency-validation', DEFAULT_CLAIM_CONSISTENCY_VALIDATION),
  ownerApprovalValidation: argValue('--owner-approval-validation', DEFAULT_OWNER_APPROVAL_VALIDATION)
};

const jsonOutputPath = argValue('--json-output', DEFAULT_JSON_OUTPUT);
const mdOutputPath = argValue('--md-output', DEFAULT_MD_OUTPUT);

if (!jsonOutputPath && !mdOutputPath) {
  console.error('At least one of --json-output or --md-output is required.');
  process.exit(2);
}

function resolveRepoPath(relativePath) {
  return path.isAbsolute(relativePath) ? relativePath : path.resolve(process.cwd(), relativePath);
}

function readJson(relativePath) {
  const absolutePath = resolveRepoPath(relativePath);
  if (!existsSync(absolutePath)) {
    console.error(`Missing required JSON artifact: ${relativePath}`);
    process.exit(2);
  }
  return JSON.parse(readFileSync(absolutePath, 'utf8'));
}

function readTextIfExists(relativePath) {
  const absolutePath = resolveRepoPath(relativePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, 'utf8') : '';
}

function readJsonIfExists(relativePath, fallback) {
  const absolutePath = resolveRepoPath(relativePath);
  return existsSync(absolutePath) ? JSON.parse(readFileSync(absolutePath, 'utf8')) : fallback;
}

function parseCsv(text) {
  const records = [];
  let field = '';
  let row = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      records.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    records.push(row);
  }

  const nonEmptyRecords = records.filter((record) => record.some((value) => value.trim()));
  const [headers = [], ...body] = nonEmptyRecords;
  return body.map((record) => {
    const item = {};
    headers.forEach((header, index) => {
      item[header.trim()] = record[index] ?? '';
    });
    return item;
  });
}

function writeArtifact(relativePath, content) {
  const absolutePath = resolveRepoPath(relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content);
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function mdCell(value) {
  return String(value ?? '').replaceAll('|', '/').replace(/\s+/g, ' ').trim();
}

const evidence = readJson(inputPaths.evidence);
const rlsDraft = readJson(inputPaths.rlsDraft);
const calibration = readJson(inputPaths.calibration);
const benchmark = readJson(inputPaths.benchmark);
const accuracyIntakeKit = readJsonIfExists(inputPaths.accuracyIntakeKit, { status: 'missing', acceptance_gates: [] });
const accuracyInputValidation = readJsonIfExists(inputPaths.accuracyInputValidation, {
  status: 'missing',
  summary: {
    valid_resolved_forecast_count: 0,
    valid_baseline_count: 0,
    active_release_hold_count: 0,
    ready_for_calibration_scoring: false
  },
  acceptance_gates: []
});
const forecastEvaluationProtocol = readJsonIfExists(inputPaths.forecastEvaluationProtocol, { status: 'missing', protocol_stages: [], metric_suite: [], claim_tiers: [] });
const forecastClaimGovernance = readJsonIfExists(inputPaths.forecastClaimGovernance, {
  status: 'missing',
  summary: {
    governance_acceptance_threshold_count: 0,
    release_hold_count: 0,
    real_resolved_outcome_count: 0,
    real_baseline_comparison_count: 0,
    approved_world_class_claim: false
  },
  acceptance_thresholds: [],
  release_holds: []
});
const leakageReviewValidation = readJsonIfExists(inputPaths.leakageReviewValidation, {
  status: 'missing',
  summary: {
    ready_control_count: 0,
    required_control_count: 8,
    valid_resolved_forecast_count: 0,
    valid_baseline_count: 0,
    unresolved_issue_total: 0,
    high_or_critical_risk_count: 0,
    active_release_hold_count: 0,
    ready_for_accuracy_claim_review: false,
    leakage_review_passed: false
  },
  acceptance_gates: [],
  release_holds: []
});
const scoringValidation = readJsonIfExists(inputPaths.scoringValidation, {
  status: 'missing',
  summary: {
    included_point_count: 0,
    max_source_sample_size: 0,
    baselines_loaded: 0,
    comparisons_made: 0,
    active_release_hold_count: 0,
    scoring_output_ready_for_claim_review: false,
    accuracy_claim_allowed: false,
    world_class_prediction_claim_allowed: false
  }
});
const predictionScienceValidation = readJsonIfExists(inputPaths.predictionScienceValidation, {
  status: 'missing',
  summary: {
    scientific_source_count: 0,
    protocol_stage_count: 0,
    metric_count: 0,
    claim_tier_count: 0,
    governance_threshold_count: 0,
    valid_resolved_forecast_count: 0,
    real_resolved_outcome_count: 0,
    valid_baseline_count: 0,
    real_baseline_comparison_count: 0,
    leakage_review_passed: false,
    scoring_output_ready_for_claim_review: false,
    active_release_hold_count: 0,
    scientific_framework_alignment_ready: false,
    prediction_science_ready_for_claim_review: false,
    mechanics_only_claim_allowed: false,
    accuracy_claim_allowed: false,
    world_class_prediction_claim_allowed: false
  },
  acceptance_gates: [],
  release_holds: []
});
const forecastExecutionReadiness = readJsonIfExists(inputPaths.forecastExecutionReadiness, {
  status: 'missing',
  summary: {
    required_repo_surface_count: 0,
    present_repo_surface_count: 0,
    repo_surface_ready: false,
    owner_template_count: 0,
    owner_template_ready_count: 0,
    owner_templates_ready: false,
    valid_resolved_forecast_count: 0,
    real_resolved_outcome_count: 0,
    valid_baseline_count: 0,
    real_baseline_comparison_count: 0,
    leakage_review_passed: false,
    scoring_output_ready_for_claim_review: false,
    hosted_access_ready_for_smoke: false,
    rls_tenant_isolation_proof_ready: false,
    active_release_hold_count: 0,
    execution_ready_for_owner_resolved_export: false,
    scoring_chain_ready_for_owner_claim_review: false,
    accuracy_claim_allowed: false,
    world_class_prediction_claim_allowed: false
  },
  acceptance_gates: [],
  release_holds: []
});
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
const hostedProofKit = readJsonIfExists(inputPaths.hostedProofKit, { status: 'missing', smoke_plan: [], source: {} });
const hostedAccessPreflight = readJsonIfExists(inputPaths.hostedAccessPreflight, {
  status: 'missing',
  summary: {
    cli_available: false,
    core_env_present: false,
    strategist_provider_key_present: false,
    stripe_proof_ready: false,
    projects_list_access: 'missing',
    listed_project_count: 0,
    target_project_visible: false,
    functions_list_access: 'missing',
    secrets_list_access: 'missing',
    management_access_ready: false,
    hosted_access_ready_for_smoke: false,
    hosted_claim_allowed: false,
    active_release_hold_count: 0
  },
  acceptance_gates: [],
  release_holds: []
});
const hostedProofValidation = readJsonIfExists(inputPaths.hostedProofValidation, {
  status: 'missing',
  summary: {
    executed_smoke_count: 0,
    passed_smoke_count: 0,
    buyer_claim_allowed_count: 0,
    core_coverage_ready_count: 0,
    core_coverage_group_count: 7,
    active_release_hold_count: 0,
    ready_for_buyer_safe_hosted_claims: false,
    hosted_operational_claim_allowed: false
  },
  acceptance_gates: []
});
const hostedSmokeExecutionReadiness = readJsonIfExists(inputPaths.hostedSmokeExecutionReadiness, {
  status: 'missing',
  summary: {
    hosted_access_preflight_status: 'missing',
    cli_available: false,
    core_env_present: false,
    strategist_provider_key_present: false,
    stripe_proof_ready: false,
    target_project_visible: false,
    functions_list_access: 'missing',
    secrets_list_access: 'missing',
    management_access_ready: false,
    hosted_access_ready_for_smoke: false,
    smoke_plan_count: 0,
    smoke_script_present_count: 0,
    smoke_scripts_ready: false,
    evidence_register_row_count: 0,
    expected_smoke_count: 0,
    evidence_register_ready: false,
    executed_smoke_count: 0,
    passed_smoke_count: 0,
    core_coverage_ready_count: 0,
    core_coverage_group_count: 0,
    local_browser_route_baseline_ready: false,
    claim_consistency_ready: false,
    active_release_hold_count: 0,
    owner_unblock_ready: false,
    hosted_smoke_execution_ready: false,
    hosted_proof_complete: false,
    hosted_claim_allowed: false
  },
  acceptance_gates: [],
  release_holds: []
});
const pilotOfferPack = readJsonIfExists(inputPaths.pilotOfferPack, { status: 'missing', pilot_offer: {}, niche_offer_sequence: [] });
const pilotPackageReadiness = readJsonIfExists(inputPaths.pilotPackageReadiness, {
  status: 'missing',
  summary: {
    package_ready_for_owner_review: false,
    external_share_ready: false,
    selected_top_five_niche_count: 0,
    required_niche_count: 5,
    owner_approved_count: 0,
    owner_required_count: 0,
    buyer_validation_verified: false,
    hosted_proof_complete: false,
    world_class_prediction_claim_allowed: false
  }
});
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
  }
});
const enterpriseProcurementGate = readJsonIfExists(inputPaths.enterpriseProcurementGate, {
  status: 'missing',
  summary: {
    required_document_count: 0,
    required_document_ready_count: 0,
    required_document_missing_or_unapproved_count: 0,
    external_share_approved_artifact_count: 0,
    release_hold_count: 0,
    privacy_dpa_ready: false,
    support_sla_ready: false,
    incident_response_ready: false
  },
  acceptance_gates: [],
  release_holds: []
});
const enterpriseExecutionReadiness = readJsonIfExists(inputPaths.enterpriseExecutionReadiness, {
  status: 'missing',
  summary: {
    trust_pack_ready: false,
    questionnaire_row_count: 0,
    trust_domain_count: 0,
    trust_acceptance_gate_count: 0,
    procurement_register_template_ready: false,
    procurement_required_document_count: 8,
    procurement_ready_document_count: 0,
    procurement_missing_document_count: 8,
    procurement_external_share_approved_count: 0,
    procurement_evidence_ready_for_review: false,
    procurement_gate_ready: false,
    rls_execution_plan_ready: false,
    rls_expected_case_environment_row_count: 0,
    rls_executed_row_count: 0,
    rls_tenant_isolation_proof_ready: false,
    local_llm_red_team_passed: false,
    llm_hosted_runtime_proof_ready: false,
    ai_action_inventory_ready: false,
    ai_action_policy_ready: false,
    ai_owner_approved_policy_count: 0,
    ai_hosted_verified_test_count: 0,
    hosted_access_ready_for_smoke: false,
    hosted_proof_ready_for_buyer_safe_claims: false,
    claim_consistency_ready: false,
    active_release_hold_count: 0,
    execution_ready_for_owner_trust_review: false,
    enterprise_proof_ready_for_owner_claim_review: false,
    enterprise_ready_claim_allowed: false
  },
  acceptance_gates: [],
  release_holds: []
});
const llmSecurityAudit = readJsonIfExists(inputPaths.llmSecurityAudit, {
  status: 'missing',
  summary: {
    covered_static_count: 0,
    required_control_count: 0,
    local_red_team_executed_count: 0,
    local_red_team_passed_count: 0,
    local_red_team_proof_score_percent: 0,
    runtime_red_team_executed_count: 0,
    runtime_red_team_proof_score_percent: 0,
    red_team_fixture_count: 0
  }
});
const aiActionInventory = readJsonIfExists(inputPaths.aiActionInventory, {
  status: 'missing',
  summary: {
    action_surface_count: 0,
    high_impact_product_action_count: 0,
    direct_llm_to_irreversible_action_count: 0,
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
  }
});
const buyerRows = parseCsv(readTextIfExists(inputPaths.buyerCrm));
const buyerTargets = readJsonIfExists(inputPaths.buyerTargets, { target_count: 0, targets: [] });
const buyerDiscoveryKit = readJsonIfExists(inputPaths.buyerDiscoveryKit, { source: { selected_count: 0 }, selected_targets: [] });
const buyerEvidenceValidation = readJsonIfExists(inputPaths.buyerEvidenceValidation, {
  status: 'missing',
  summary: {
    real_interaction_count: 0,
    valid_completed_call_count: 0,
    valid_outcome_capture_count: 0,
    valid_qualified_followup_count: 0,
    valid_commitment_signal_count: 0,
    active_release_hold_count: 0,
    ready_for_buyer_proof_gate: false
  }
});
const buyerProofGate = readJsonIfExists(inputPaths.buyerProofGate, {
  status: 'missing',
  summary: {
    completed_call_with_required_fields_count: 0,
    qualified_followup_count: 0,
    paid_pilot_loi_or_procurement_signal_count: 0,
    release_hold_count: 0,
    buyer_validation_verified: false
  },
  acceptance_gates: [],
  release_holds: []
});
const buyerExecutionReadiness = readJsonIfExists(inputPaths.buyerExecutionReadiness, {
  status: 'missing',
  summary: {
    target_count: 0,
    selected_target_count: 0,
    call_sheet_row_count: 0,
    crm_row_count: 0,
    priority_niche_count: 0,
    selected_priority_niche_covered_count: 0,
    call_sheet_priority_niche_covered_count: 0,
    execution_ready_for_owner_outreach: false,
    completed_call_count: 0,
    qualified_followup_count: 0,
    paid_pilot_loi_or_procurement_signal_count: 0,
    buyer_validation_verified: false,
    buyer_validated_claim_allowed: false,
    active_release_hold_count: 0
  },
  acceptance_gates: [],
  release_holds: []
});
const buyerSubstitutionEvidenceValidation = readJsonIfExists(inputPaths.buyerSubstitutionEvidenceValidation, {
  status: 'missing',
  summary: {
    real_substitution_interaction_count: 0,
    valid_completed_substitution_call_count: 0,
    completed_substitution_niche_count: 0,
    valid_qualified_substitution_outcome_count: 0,
    valid_commitment_signal_count: 0,
    active_release_hold_count: 0,
    ready_for_buyer_proof_gate: false,
    substitution_protocol_ready: false,
    buyer_validated_claim_allowed: false,
    replacement_claim_allowed: false,
    parity_claim_allowed: false
  },
  acceptance_gates: [],
  release_holds: []
});
const localBrowserRouteProof = readJsonIfExists(inputPaths.localBrowserRouteProof, {
  status: 'missing',
  source: {
    route_count: 0,
    rendered_or_expected_auth_gate_count: 0,
    runtime_console_error_count: 0,
    hosted_live_proof: false
  },
  marketability_route_map: []
});
const marketNicheValidation = readJsonIfExists(inputPaths.marketNicheValidation, {
  status: 'missing',
  summary: {
    niche_count: 0,
    required_niche_count: 5,
    source_alignment_count: 0,
    current_research_anchor_count: 0,
    substitution_matrix_count: 0,
    local_route_signal_ready_count: 0,
    active_release_hold_count: 0,
    buyer_safe_pilot_claim_allowed: false,
    buyer_validated_claim_allowed: false,
    hosted_live_claim_allowed: false,
    enterprise_ready_claim_allowed: false,
    accuracy_claim_allowed: false,
    world_class_prediction_claim_allowed: false
  },
  acceptance_gates: [],
  release_holds: []
});
const competitivePositioningValidation = readJsonIfExists(inputPaths.competitivePositioningValidation, {
  status: 'missing',
  summary: {
    market_signal_row_count: 0,
    current_competitive_source_count: 0,
    competitor_substitute_row_count: 0,
    required_competitor_category_count: 7,
    required_competitor_category_present_count: 0,
    loophole_row_count: 0,
    buyer_plan_row_count: 0,
    active_release_hold_count: 0,
    defensible_competitive_wedge_claim_allowed: false,
    replacement_claim_allowed: false,
    data_breadth_superiority_claim_allowed: false,
    palantir_equivalence_claim_allowed: false,
    expert_advisory_replacement_claim_allowed: false,
    forecasting_parity_claim_allowed: false,
    world_class_prediction_claim_allowed: false
  },
  acceptance_gates: [],
  release_holds: []
});
const claimConsistencyValidation = readJsonIfExists(inputPaths.claimConsistencyValidation, {
  status: 'missing',
  summary: {
    scanned_file_count: 0,
    scanned_line_count: 0,
    detected_claim_mention_count: 0,
    boundary_context_claim_mention_count: 0,
    unsupported_claim_mention_count: 0,
    unsupported_p1_claim_mention_count: 0,
    unsupported_p2_claim_mention_count: 0,
    claim_consistency_ready: false,
    world_class_prediction_claim_blocked: false,
    accuracy_claim_blocked: false,
    buyer_validated_claim_blocked: false,
    hosted_live_claim_blocked: false,
    enterprise_ready_claim_blocked: false,
    competitive_replacement_or_parity_claim_blocked: false,
    commercial_ready_claim_blocked: false
  },
  acceptance_gates: [],
  release_holds: []
});
const ownerApprovalValidation = readJsonIfExists(inputPaths.ownerApprovalValidation, {
  status: 'missing',
  summary: {
    required_approval_count: 0,
    owner_approved_count: 0,
    row_error_count: 0,
    all_required_approvals_ready_for_downstream_evidence: false,
    commercial_ready_claim_allowed: false,
    world_class_prediction_claim_allowed: false,
    hosted_live_claim_allowed: false,
    buyer_validated_claim_allowed: false,
    enterprise_ready_claim_allowed: false
  },
  acceptance_gates: [],
  release_holds: []
});

const proofBuckets = evidence.proof_buckets ?? {};
const hostedProofCount = Array.isArray(proofBuckets.hosted_live) ? proofBuckets.hosted_live.length : 0;
const hostedSmokePlanCount = Array.isArray(hostedProofKit.smoke_plan) ? hostedProofKit.smoke_plan.length : 0;
const hostedSmokePresentCount = (hostedProofKit.smoke_plan ?? []).filter((item) => item.script_exists).length;
const hostedAccessPreflightStatus = hostedAccessPreflight.status ?? 'missing';
const hostedAccessCliAvailable = Boolean(hostedAccessPreflight.summary?.cli_available);
const hostedAccessCoreEnvPresent = Boolean(hostedAccessPreflight.summary?.core_env_present);
const hostedAccessProviderKeyPresent = Boolean(hostedAccessPreflight.summary?.strategist_provider_key_present);
const hostedAccessStripeProofReady = Boolean(hostedAccessPreflight.summary?.stripe_proof_ready);
const hostedAccessProjectsListAccess = hostedAccessPreflight.summary?.projects_list_access ?? 'missing';
const hostedAccessListedProjectCount = Number(hostedAccessPreflight.summary?.listed_project_count ?? 0);
const hostedAccessTargetProjectVisible = Boolean(hostedAccessPreflight.summary?.target_project_visible);
const hostedAccessFunctionsListAccess = hostedAccessPreflight.summary?.functions_list_access ?? 'missing';
const hostedAccessSecretsListAccess = hostedAccessPreflight.summary?.secrets_list_access ?? 'missing';
const hostedAccessManagementAccessReady = Boolean(hostedAccessPreflight.summary?.management_access_ready);
const hostedAccessReadyForSmoke = Boolean(hostedAccessPreflight.summary?.hosted_access_ready_for_smoke);
const hostedAccessClaimAllowed = Boolean(hostedAccessPreflight.summary?.hosted_claim_allowed);
const hostedAccessReleaseHoldCount = Number(hostedAccessPreflight.summary?.active_release_hold_count ?? 0);
const hostedProofValidationStatus = hostedProofValidation.status ?? 'missing';
const hostedProofExecutedSmokeCount = Number(hostedProofValidation.summary?.executed_smoke_count ?? 0);
const hostedProofPassedSmokeCount = Number(hostedProofValidation.summary?.passed_smoke_count ?? 0);
const hostedProofBuyerClaimAllowedCount = Number(hostedProofValidation.summary?.buyer_claim_allowed_count ?? 0);
const hostedProofCoreCoverageReadyCount = Number(hostedProofValidation.summary?.core_coverage_ready_count ?? 0);
const hostedProofCoreCoverageGroupCount = Number(hostedProofValidation.summary?.core_coverage_group_count ?? 0);
const hostedProofReleaseHoldCount = Number(hostedProofValidation.summary?.active_release_hold_count ?? 0);
const hostedProofReadyForBuyerSafeClaims = Boolean(hostedProofValidation.summary?.ready_for_buyer_safe_hosted_claims)
  || hostedProofValidationStatus === 'hosted_operational_evidence_validation_passed_buyer_safe_specific_claims';
const hostedSmokeExecutionReadinessStatus = hostedSmokeExecutionReadiness.status ?? 'missing';
const hostedSmokeExecutionOwnerUnblockReady = Boolean(hostedSmokeExecutionReadiness.summary?.owner_unblock_ready);
const hostedSmokeExecutionReady = Boolean(hostedSmokeExecutionReadiness.summary?.hosted_smoke_execution_ready);
const hostedSmokeProofComplete = Boolean(hostedSmokeExecutionReadiness.summary?.hosted_proof_complete);
const hostedSmokeScriptsReady = Boolean(hostedSmokeExecutionReadiness.summary?.smoke_scripts_ready);
const hostedSmokeEvidenceRegisterReady = Boolean(hostedSmokeExecutionReadiness.summary?.evidence_register_ready);
const hostedSmokeLocalRouteBaselineReady = Boolean(
  hostedSmokeExecutionReadiness.summary?.local_browser_route_baseline_ready
);
const hostedSmokeTargetProjectVisible = Boolean(hostedSmokeExecutionReadiness.summary?.target_project_visible);
const hostedSmokeManagementAccessReady = Boolean(hostedSmokeExecutionReadiness.summary?.management_access_ready);
const hostedSmokeStripeProofReady = Boolean(hostedSmokeExecutionReadiness.summary?.stripe_proof_ready);
const hostedSmokeSmokePlanCount = Number(hostedSmokeExecutionReadiness.summary?.smoke_plan_count ?? 0);
const hostedSmokeScriptPresentCount = Number(hostedSmokeExecutionReadiness.summary?.smoke_script_present_count ?? 0);
const hostedSmokeEvidenceRegisterRowCount = Number(hostedSmokeExecutionReadiness.summary?.evidence_register_row_count ?? 0);
const hostedSmokeExpectedSmokeCount = Number(hostedSmokeExecutionReadiness.summary?.expected_smoke_count ?? 0);
const hostedSmokeExecutedCount = Number(hostedSmokeExecutionReadiness.summary?.executed_smoke_count ?? 0);
const hostedSmokePassedCount = Number(hostedSmokeExecutionReadiness.summary?.passed_smoke_count ?? 0);
const hostedSmokeCoreCoverageReadyCount = Number(hostedSmokeExecutionReadiness.summary?.core_coverage_ready_count ?? 0);
const hostedSmokeCoreCoverageGroupCount = Number(hostedSmokeExecutionReadiness.summary?.core_coverage_group_count ?? 0);
const hostedSmokeReleaseHoldCount = Number(hostedSmokeExecutionReadiness.summary?.active_release_hold_count ?? 0);
const hostedSmokeClaimAllowed = Boolean(hostedSmokeExecutionReadiness.summary?.hosted_claim_allowed);
const hostedOperationalScore = hostedProofReadyForBuyerSafeClaims
  ? 75
  : hostedProofBuyerClaimAllowedCount > 0
    ? 55
    : hostedProofCount > 0
      ? 35
      : hostedSmokePlanCount > 0
        ? 25
        : 15;
const pilotOfferReady = pilotOfferPack.status === 'pilot_offer_pack_ready_not_buyer_proof';
const pilotNicheCount = Array.isArray(pilotOfferPack.niche_offer_sequence) ? pilotOfferPack.niche_offer_sequence.length : 0;
const pilotPackageReadinessStatus = pilotPackageReadiness.status ?? 'missing';
const pilotPackageReadyForOwnerReview = Boolean(pilotPackageReadiness.summary?.package_ready_for_owner_review);
const pilotPackageExternalShareReady = Boolean(pilotPackageReadiness.summary?.external_share_ready);
const pilotPackageSelectedTopFiveCount = Number(pilotPackageReadiness.summary?.selected_top_five_niche_count ?? 0);
const pilotPackageRequiredNicheCount = Number(pilotPackageReadiness.summary?.required_niche_count ?? 5);
const pilotPackageOwnerApprovedCount = Number(pilotPackageReadiness.summary?.owner_approved_count ?? 0);
const pilotPackageOwnerRequiredCount = Number(pilotPackageReadiness.summary?.owner_required_count ?? 0);
const pilotPackageBuyerValidationVerified = Boolean(pilotPackageReadiness.summary?.buyer_validation_verified);
const pilotPackageHostedProofComplete = Boolean(pilotPackageReadiness.summary?.hosted_proof_complete);
const pilotPackageWorldClassPredictionClaimAllowed = Boolean(
  pilotPackageReadiness.summary?.world_class_prediction_claim_allowed
);
const enterpriseTrustPackReady = enterpriseTrustPack.status === 'enterprise_trust_pack_ready_not_security_proof';
const enterpriseQuestionnaireRowCount = Number(
  enterpriseTrustPack.source?.questionnaire_row_count ?? enterpriseTrustPack.procurement_questionnaire?.length ?? 0
);
const enterpriseAcceptanceGateCount = Number(
  enterpriseTrustPack.source?.acceptance_gate_count ?? enterpriseTrustPack.acceptance_gates?.length ?? 0
);
const enterpriseEvidenceValidationStatus = enterpriseEvidenceValidation.status ?? 'missing';
const enterpriseEvidenceReadyForReview = Boolean(enterpriseEvidenceValidation.summary?.ready_for_enterprise_procurement_review)
  || enterpriseEvidenceValidationStatus === 'enterprise_procurement_evidence_validation_passed_pending_security_runtime_proof';
const enterpriseEvidenceReadyDocumentCount = Number(enterpriseEvidenceValidation.summary?.ready_document_count ?? 0);
const enterpriseEvidenceRequiredDocumentCount = Number(enterpriseEvidenceValidation.summary?.required_document_count ?? 8);
const enterpriseEvidenceMissingDocumentCount = Number(
  enterpriseEvidenceValidation.summary?.missing_or_unapproved_document_count
  ?? Math.max(0, enterpriseEvidenceRequiredDocumentCount - enterpriseEvidenceReadyDocumentCount)
);
const enterpriseEvidenceExternalShareApprovedCount = Number(
  enterpriseEvidenceValidation.summary?.external_share_approved_document_count ?? 0
);
const enterpriseEvidenceReleaseHoldCount = Number(enterpriseEvidenceValidation.summary?.active_release_hold_count ?? 0);
const enterpriseEvidencePrivacyDpaReady = Boolean(enterpriseEvidenceValidation.summary?.privacy_dpa_ready);
const enterpriseEvidenceSupportSlaReady = Boolean(enterpriseEvidenceValidation.summary?.support_sla_ready);
const enterpriseEvidenceIncidentResponseReady = Boolean(enterpriseEvidenceValidation.summary?.incident_response_ready);
const enterpriseProcurementGateReady = enterpriseProcurementGate.status === 'enterprise_procurement_gate_ready_not_owner_approved_or_security_proof';
const enterpriseProcurementDocumentCount = Number(enterpriseProcurementGate.summary?.required_document_count ?? 0);
const enterpriseProcurementMissingDocumentCount = Number(
  enterpriseProcurementGate.summary?.required_document_missing_or_unapproved_count ?? 0
);
const enterpriseExternalShareApprovedCount = Number(
  enterpriseProcurementGate.summary?.external_share_approved_artifact_count ?? 0
);
const enterpriseProcurementReleaseHoldCount = Number(enterpriseProcurementGate.summary?.release_hold_count ?? 0);
const enterpriseExecutionReadinessStatus = enterpriseExecutionReadiness.status ?? 'missing';
const enterpriseExecutionTrustPackReady = Boolean(enterpriseExecutionReadiness.summary?.trust_pack_ready);
const enterpriseExecutionQuestionnaireRowCount = Number(enterpriseExecutionReadiness.summary?.questionnaire_row_count ?? 0);
const enterpriseExecutionTrustDomainCount = Number(enterpriseExecutionReadiness.summary?.trust_domain_count ?? 0);
const enterpriseExecutionAcceptanceGateCount = Number(
  enterpriseExecutionReadiness.summary?.trust_acceptance_gate_count ?? 0
);
const enterpriseExecutionProcurementRegisterReady = Boolean(
  enterpriseExecutionReadiness.summary?.procurement_register_template_ready
);
const enterpriseExecutionRequiredDocumentCount = Number(
  enterpriseExecutionReadiness.summary?.procurement_required_document_count ?? 8
);
const enterpriseExecutionReadyDocumentCount = Number(
  enterpriseExecutionReadiness.summary?.procurement_ready_document_count ?? 0
);
const enterpriseExecutionMissingDocumentCount = Number(
  enterpriseExecutionReadiness.summary?.procurement_missing_document_count ?? 8
);
const enterpriseExecutionExternalShareApprovedCount = Number(
  enterpriseExecutionReadiness.summary?.procurement_external_share_approved_count ?? 0
);
const enterpriseExecutionEvidenceReadyForReview = Boolean(
  enterpriseExecutionReadiness.summary?.procurement_evidence_ready_for_review
);
const enterpriseExecutionProcurementGateReady = Boolean(enterpriseExecutionReadiness.summary?.procurement_gate_ready);
const enterpriseExecutionRlsPlanReady = Boolean(enterpriseExecutionReadiness.summary?.rls_execution_plan_ready);
const enterpriseExecutionRlsExpectedRowCount = Number(
  enterpriseExecutionReadiness.summary?.rls_expected_case_environment_row_count ?? 0
);
const enterpriseExecutionRlsExecutedRowCount = Number(
  enterpriseExecutionReadiness.summary?.rls_executed_row_count ?? 0
);
const enterpriseExecutionRlsProofReady = Boolean(
  enterpriseExecutionReadiness.summary?.rls_tenant_isolation_proof_ready
);
const enterpriseExecutionLocalLlmRedTeamPassed = Boolean(
  enterpriseExecutionReadiness.summary?.local_llm_red_team_passed
);
const enterpriseExecutionHostedLlmRuntimeProofReady = Boolean(
  enterpriseExecutionReadiness.summary?.llm_hosted_runtime_proof_ready
);
const enterpriseExecutionAiActionInventoryReady = Boolean(
  enterpriseExecutionReadiness.summary?.ai_action_inventory_ready
);
const enterpriseExecutionAiActionPolicyReady = Boolean(enterpriseExecutionReadiness.summary?.ai_action_policy_ready);
const enterpriseExecutionAiOwnerApprovedPolicyCount = Number(
  enterpriseExecutionReadiness.summary?.ai_owner_approved_policy_count ?? 0
);
const enterpriseExecutionAiHostedVerifiedTestCount = Number(
  enterpriseExecutionReadiness.summary?.ai_hosted_verified_test_count ?? 0
);
const enterpriseExecutionHostedAccessReady = Boolean(
  enterpriseExecutionReadiness.summary?.hosted_access_ready_for_smoke
);
const enterpriseExecutionHostedProofReady = Boolean(
  enterpriseExecutionReadiness.summary?.hosted_proof_ready_for_buyer_safe_claims
);
const enterpriseExecutionClaimConsistencyReady = Boolean(enterpriseExecutionReadiness.summary?.claim_consistency_ready);
const enterpriseExecutionReleaseHoldCount = Number(enterpriseExecutionReadiness.summary?.active_release_hold_count ?? 0);
const enterpriseExecutionReadyForOwnerTrustReview = Boolean(
  enterpriseExecutionReadiness.summary?.execution_ready_for_owner_trust_review
);
const enterpriseExecutionProofReadyForOwnerClaimReview = Boolean(
  enterpriseExecutionReadiness.summary?.enterprise_proof_ready_for_owner_claim_review
);
const enterpriseExecutionEnterpriseReadyClaimAllowed = Boolean(
  enterpriseExecutionReadiness.summary?.enterprise_ready_claim_allowed
);
const llmSecurityAuditReady = [
  'llm_security_readiness_audit_ready_not_runtime_redteam_proof',
  'llm_security_local_red_team_passed_not_hosted_proof'
].includes(llmSecurityAudit.status);
const llmStaticControlCount = Number(llmSecurityAudit.summary?.covered_static_count ?? 0);
const llmRequiredControlCount = Number(llmSecurityAudit.summary?.required_control_count ?? 0);
const llmFixtureCount = Number(llmSecurityAudit.summary?.red_team_fixture_count ?? 0);
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
const aiHostedVerifiedCount = Number(aiActionInventory.summary?.hosted_verified_count ?? 0);
const aiActionPolicyReady = aiActionPolicy.status === 'draft_high_impact_action_policy_ready_not_owner_approved_or_hosted_tested';
const aiPolicySurfaceCount = Number(aiActionPolicy.summary?.policy_surface_count ?? 0);
const aiApprovalRequiredSurfaceCount = Number(aiActionPolicy.summary?.approval_required_surface_count ?? 0);
const aiHostedBoundaryTestCount = Number(aiActionPolicy.summary?.hosted_boundary_test_count ?? 0);
const aiStaticBoundaryTestCount = Number(aiActionPolicy.summary?.static_boundary_test_count ?? 0);
const aiHostedVerifiedTestCount = Number(aiActionPolicy.summary?.hosted_verified_test_count ?? 0);
const aiOwnerApprovedPolicyCount = Number(aiActionPolicy.summary?.owner_approved_policy_count ?? 0);
const forecastProtocolStageCount = Array.isArray(forecastEvaluationProtocol.protocol_stages) ? forecastEvaluationProtocol.protocol_stages.length : 0;
const forecastProtocolReady = forecastEvaluationProtocol.status === 'evaluation_protocol_ready_not_accuracy_proof';
const accuracyInputValidationStatus = accuracyInputValidation.status ?? 'missing';
const accuracyInputValidationReadyForScoring = Boolean(accuracyInputValidation.summary?.ready_for_calibration_scoring)
  || accuracyInputValidationStatus === 'accuracy_input_validation_passed_pending_scoring';
const accuracyInputValidationValidForecastCount = Number(accuracyInputValidation.summary?.valid_resolved_forecast_count ?? 0);
const accuracyInputValidationValidBaselineCount = Number(accuracyInputValidation.summary?.valid_baseline_count ?? 0);
const accuracyInputValidationReleaseHoldCount = Number(accuracyInputValidation.summary?.active_release_hold_count ?? 0);
const forecastClaimGovernanceReady = forecastClaimGovernance.status === 'forecast_claim_governance_ready_not_accuracy_proof';
const forecastClaimThresholdCount = Number(
  forecastClaimGovernance.summary?.governance_acceptance_threshold_count
  ?? forecastClaimGovernance.acceptance_thresholds?.length
  ?? 0
);
const forecastClaimReleaseHoldCount = Number(
  forecastClaimGovernance.summary?.release_hold_count
  ?? forecastClaimGovernance.release_holds?.filter?.((hold) => hold.status === 'active').length
  ?? 0
);
const leakageReviewValidationStatus = leakageReviewValidation.status ?? 'missing';
const leakageReviewReadyControlCount = Number(leakageReviewValidation.summary?.ready_control_count ?? 0);
const leakageReviewRequiredControlCount = Number(leakageReviewValidation.summary?.required_control_count ?? 0);
const leakageReviewValidForecastCount = Number(leakageReviewValidation.summary?.valid_resolved_forecast_count ?? 0);
const leakageReviewValidBaselineCount = Number(leakageReviewValidation.summary?.valid_baseline_count ?? 0);
const leakageReviewUnresolvedIssueTotal = Number(leakageReviewValidation.summary?.unresolved_issue_total ?? 0);
const leakageReviewHighRiskCount = Number(leakageReviewValidation.summary?.high_or_critical_risk_count ?? 0);
const leakageReviewReleaseHoldCount = Number(leakageReviewValidation.summary?.active_release_hold_count ?? 0);
const leakageReviewReadyForAccuracyClaim = Boolean(leakageReviewValidation.summary?.ready_for_accuracy_claim_review)
  || leakageReviewValidationStatus === 'forecast_leakage_review_validation_passed_pending_claim_review';
const leakageReviewPassed = Boolean(leakageReviewValidation.summary?.leakage_review_passed)
  || leakageReviewReadyForAccuracyClaim;
const scoringValidationStatus = scoringValidation.status ?? 'missing';
const scoringOutputReadyForClaimReview = Boolean(scoringValidation.summary?.scoring_output_ready_for_claim_review);
const scoringValidationIncludedPointCount = Number(scoringValidation.summary?.included_point_count ?? 0);
const scoringValidationMaxSourceSampleSize = Number(scoringValidation.summary?.max_source_sample_size ?? 0);
const scoringValidationBaselineCount = Number(scoringValidation.summary?.baselines_loaded ?? 0);
const scoringValidationComparisonCount = Number(scoringValidation.summary?.comparisons_made ?? 0);
const scoringValidationReleaseHoldCount = Number(scoringValidation.summary?.active_release_hold_count ?? 0);
const predictionScienceValidationStatus = predictionScienceValidation.status ?? 'missing';
const predictionScienceSourceCount = Number(predictionScienceValidation.summary?.scientific_source_count ?? 0);
const predictionScienceProtocolStageCount = Number(predictionScienceValidation.summary?.protocol_stage_count ?? 0);
const predictionScienceMetricCount = Number(predictionScienceValidation.summary?.metric_count ?? 0);
const predictionScienceClaimTierCount = Number(predictionScienceValidation.summary?.claim_tier_count ?? 0);
const predictionScienceGovernanceThresholdCount = Number(predictionScienceValidation.summary?.governance_threshold_count ?? 0);
const predictionScienceValidResolvedForecastCount = Number(
  predictionScienceValidation.summary?.valid_resolved_forecast_count ?? 0
);
const predictionScienceRealResolvedOutcomeCount = Number(
  predictionScienceValidation.summary?.real_resolved_outcome_count ?? 0
);
const predictionScienceValidBaselineCount = Number(predictionScienceValidation.summary?.valid_baseline_count ?? 0);
const predictionScienceRealBaselineComparisonCount = Number(
  predictionScienceValidation.summary?.real_baseline_comparison_count ?? 0
);
const predictionScienceReleaseHoldCount = Number(predictionScienceValidation.summary?.active_release_hold_count ?? 0);
const predictionScienceFrameworkAlignmentReady = Boolean(
  predictionScienceValidation.summary?.scientific_framework_alignment_ready
);
const predictionScienceReadyForClaimReview = Boolean(
  predictionScienceValidation.summary?.prediction_science_ready_for_claim_review
);
const predictionScienceMechanicsOnlyClaimAllowed = Boolean(
  predictionScienceValidation.summary?.mechanics_only_claim_allowed
);
const predictionScienceAccuracyClaimAllowed = Boolean(predictionScienceValidation.summary?.accuracy_claim_allowed);
const predictionScienceWorldClassPredictionClaimAllowed = Boolean(
  predictionScienceValidation.summary?.world_class_prediction_claim_allowed
);
const forecastExecutionReadinessStatus = forecastExecutionReadiness.status ?? 'missing';
const forecastExecutionRequiredSurfaceCount = Number(
  forecastExecutionReadiness.summary?.required_repo_surface_count ?? 0
);
const forecastExecutionPresentSurfaceCount = Number(
  forecastExecutionReadiness.summary?.present_repo_surface_count ?? 0
);
const forecastExecutionRepoSurfaceReady = Boolean(forecastExecutionReadiness.summary?.repo_surface_ready);
const forecastExecutionTemplateCount = Number(forecastExecutionReadiness.summary?.owner_template_count ?? 0);
const forecastExecutionTemplateReadyCount = Number(
  forecastExecutionReadiness.summary?.owner_template_ready_count ?? 0
);
const forecastExecutionOwnerTemplatesReady = Boolean(forecastExecutionReadiness.summary?.owner_templates_ready);
const forecastExecutionValidResolvedForecastCount = Number(
  forecastExecutionReadiness.summary?.valid_resolved_forecast_count ?? 0
);
const forecastExecutionRealResolvedOutcomeCount = Number(
  forecastExecutionReadiness.summary?.real_resolved_outcome_count ?? 0
);
const forecastExecutionValidBaselineCount = Number(forecastExecutionReadiness.summary?.valid_baseline_count ?? 0);
const forecastExecutionRealBaselineComparisonCount = Number(
  forecastExecutionReadiness.summary?.real_baseline_comparison_count ?? 0
);
const forecastExecutionLeakagePassed = Boolean(forecastExecutionReadiness.summary?.leakage_review_passed);
const forecastExecutionScoringReady = Boolean(
  forecastExecutionReadiness.summary?.scoring_output_ready_for_claim_review
);
const forecastExecutionHostedAccessReady = Boolean(forecastExecutionReadiness.summary?.hosted_access_ready_for_smoke);
const forecastExecutionRlsReady = Boolean(forecastExecutionReadiness.summary?.rls_tenant_isolation_proof_ready);
const forecastExecutionReleaseHoldCount = Number(forecastExecutionReadiness.summary?.active_release_hold_count ?? 0);
const forecastExecutionReadyForOwnerExport = Boolean(
  forecastExecutionReadiness.summary?.execution_ready_for_owner_resolved_export
);
const forecastExecutionScoringChainReady = Boolean(
  forecastExecutionReadiness.summary?.scoring_chain_ready_for_owner_claim_review
);
const forecastExecutionAccuracyClaimAllowed = Boolean(forecastExecutionReadiness.summary?.accuracy_claim_allowed);
const forecastExecutionWorldClassPredictionClaimAllowed = Boolean(
  forecastExecutionReadiness.summary?.world_class_prediction_claim_allowed
);
const rlsProofValidationStatus = rlsProofValidation.status ?? 'missing';
const rlsProofReadyForSecurityClaim = Boolean(rlsProofValidation.summary?.rls_tenant_isolation_proof_ready);
const rlsProofExpectedCaseEnvironmentCount = Number(rlsProofValidation.summary?.expected_case_environment_row_count ?? 0);
const rlsProofExecutedCount = Number(rlsProofValidation.summary?.executed_row_count ?? 0);
const rlsProofLocalReadyCount = Number(rlsProofValidation.summary?.local_ready_count ?? 0);
const rlsProofLinkedReadyCount = Number(rlsProofValidation.summary?.linked_ready_count ?? 0);
const rlsProofReleaseHoldCount = Number(rlsProofValidation.summary?.active_release_hold_count ?? 0);
const rlsProofTenantIsolationClaimAllowed = Boolean(rlsProofValidation.summary?.tenant_isolation_claim_allowed);
const realResolvedOutcomeCount = Number(forecastClaimGovernance.summary?.real_resolved_outcome_count ?? 0);
const realBaselineComparisonCount = Number(forecastClaimGovernance.summary?.real_baseline_comparison_count ?? 0);
const worldClassClaimApproved = Boolean(forecastClaimGovernance.summary?.approved_world_class_claim);
const localBrowserRouteProofReady = localBrowserRouteProof.status === 'local_route_proof_ready_not_hosted_proof';
const localBrowserRouteCount = Number(localBrowserRouteProof.source?.route_count ?? 0);
const localBrowserRouteReadyCount = Number(localBrowserRouteProof.source?.rendered_or_expected_auth_gate_count ?? 0);
const localBrowserRouteRuntimeErrorCount = Number(localBrowserRouteProof.source?.runtime_console_error_count ?? 0);
const localBrowserHostedProof = Boolean(localBrowserRouteProof.source?.hosted_live_proof ?? localBrowserRouteProof.hosted_live_proof);
const localProofCount = Array.isArray(proofBuckets.local) ? proofBuckets.local.length : 0;
const repoProofCount = Array.isArray(proofBuckets.repo_artifact) ? proofBuckets.repo_artifact.length : 0;
const realBuyerRows = buyerRows.filter((row) => {
  const status = String(row.status ?? '').trim().toLowerCase();
  return status && !['research', 'template', 'hypothesis'].includes(status);
});
const buyerTargetCount = Number(buyerTargets.target_count ?? buyerTargets.targets?.length ?? 0);
const buyerDiscoverySelectedCount = Number(
  buyerDiscoveryKit.source?.selected_count ?? buyerDiscoveryKit.selected_targets?.length ?? 0
);
const buyerEvidenceValidationStatus = buyerEvidenceValidation.status ?? 'missing';
const buyerEvidenceValidationReady = Boolean(buyerEvidenceValidation.summary?.ready_for_buyer_proof_gate)
  || buyerEvidenceValidationStatus === 'buyer_evidence_input_validation_passed_pending_owner_review';
const buyerEvidenceRealInteractionCount = Number(buyerEvidenceValidation.summary?.real_interaction_count ?? 0);
const buyerEvidenceValidCompletedCallCount = Number(buyerEvidenceValidation.summary?.valid_completed_call_count ?? 0);
const buyerEvidenceValidOutcomeCaptureCount = Number(buyerEvidenceValidation.summary?.valid_outcome_capture_count ?? 0);
const buyerEvidenceValidQualifiedFollowupCount = Number(buyerEvidenceValidation.summary?.valid_qualified_followup_count ?? 0);
const buyerEvidenceValidCommitmentSignalCount = Number(buyerEvidenceValidation.summary?.valid_commitment_signal_count ?? 0);
const buyerEvidenceReleaseHoldCount = Number(buyerEvidenceValidation.summary?.active_release_hold_count ?? 0);
const buyerProofGateReady = buyerProofGate.status === 'buyer_proof_gate_ready_not_buyer_validation';
const buyerProofAcceptanceGateCount = Number(
  buyerProofGate.acceptance_gates?.length ?? buyerProofGate.summary?.acceptance_gate_count ?? 0
);
const buyerProofReleaseHoldCount = Number(buyerProofGate.summary?.release_hold_count ?? 0);
const buyerCompletedCallCount = Number(buyerProofGate.summary?.completed_call_with_required_fields_count ?? 0);
const buyerQualifiedFollowupCount = Number(buyerProofGate.summary?.qualified_followup_count ?? 0);
const buyerPaidLoiProcurementSignalCount = Number(
  buyerProofGate.summary?.paid_pilot_loi_or_procurement_signal_count ?? 0
);
const buyerExecutionReadinessStatus = buyerExecutionReadiness.status ?? 'missing';
const buyerExecutionReadyForOwnerOutreach = Boolean(
  buyerExecutionReadiness.summary?.execution_ready_for_owner_outreach
);
const buyerExecutionTargetCount = Number(buyerExecutionReadiness.summary?.target_count ?? 0);
const buyerExecutionSelectedTargetCount = Number(buyerExecutionReadiness.summary?.selected_target_count ?? 0);
const buyerExecutionPriorityNicheCount = Number(buyerExecutionReadiness.summary?.priority_niche_count ?? 0);
const buyerExecutionSelectedPriorityNicheCount = Number(
  buyerExecutionReadiness.summary?.selected_priority_niche_covered_count ?? 0
);
const buyerExecutionCallSheetPriorityNicheCount = Number(
  buyerExecutionReadiness.summary?.call_sheet_priority_niche_covered_count ?? 0
);
const buyerExecutionCallSheetRowCount = Number(buyerExecutionReadiness.summary?.call_sheet_row_count ?? 0);
const buyerExecutionCrmRowCount = Number(buyerExecutionReadiness.summary?.crm_row_count ?? 0);
const buyerExecutionReleaseHoldCount = Number(buyerExecutionReadiness.summary?.active_release_hold_count ?? 0);
const buyerExecutionBuyerValidatedClaimAllowed = Boolean(
  buyerExecutionReadiness.summary?.buyer_validated_claim_allowed
);
const buyerSubstitutionEvidenceValidationStatus = buyerSubstitutionEvidenceValidation.status ?? 'missing';
const buyerSubstitutionEvidenceReady = Boolean(
  buyerSubstitutionEvidenceValidation.summary?.ready_for_buyer_proof_gate
);
const buyerSubstitutionProtocolReady = Boolean(
  buyerSubstitutionEvidenceValidation.summary?.substitution_protocol_ready
);
const buyerSubstitutionRealInteractionCount = Number(
  buyerSubstitutionEvidenceValidation.summary?.real_substitution_interaction_count ?? 0
);
const buyerSubstitutionValidCompletedCallCount = Number(
  buyerSubstitutionEvidenceValidation.summary?.valid_completed_substitution_call_count ?? 0
);
const buyerSubstitutionCompletedNicheCount = Number(
  buyerSubstitutionEvidenceValidation.summary?.completed_substitution_niche_count ?? 0
);
const buyerSubstitutionQualifiedOutcomeCount = Number(
  buyerSubstitutionEvidenceValidation.summary?.valid_qualified_substitution_outcome_count ?? 0
);
const buyerSubstitutionCommitmentSignalCount = Number(
  buyerSubstitutionEvidenceValidation.summary?.valid_commitment_signal_count ?? 0
);
const buyerSubstitutionReleaseHoldCount = Number(
  buyerSubstitutionEvidenceValidation.summary?.active_release_hold_count ?? 0
);
const paidSignalRows = buyerRows.filter((row) => {
  const joined = Object.values(row).join(' ').toLowerCase();
  return joined.includes('paid') || joined.includes('loi') || joined.includes('pilot');
});
const marketNicheValidationStatus = marketNicheValidation.status ?? 'missing';
const marketNicheCount = Number(marketNicheValidation.summary?.niche_count ?? 0);
const marketNicheRequiredCount = Number(marketNicheValidation.summary?.required_niche_count ?? 5);
const marketNicheSourceAlignmentCount = Number(marketNicheValidation.summary?.source_alignment_count ?? 0);
const marketNicheResearchAnchorCount = Number(marketNicheValidation.summary?.current_research_anchor_count ?? 0);
const marketNicheSubstitutionCount = Number(marketNicheValidation.summary?.substitution_matrix_count ?? 0);
const marketNicheRouteSignalReadyCount = Number(marketNicheValidation.summary?.local_route_signal_ready_count ?? 0);
const marketNicheReleaseHoldCount = Number(marketNicheValidation.summary?.active_release_hold_count ?? 0);
const marketNicheBuyerSafePilotClaimAllowed = Boolean(
  marketNicheValidation.summary?.buyer_safe_pilot_claim_allowed
);
const marketNicheBuyerValidatedClaimAllowed = Boolean(
  marketNicheValidation.summary?.buyer_validated_claim_allowed
);
const marketNicheHostedLiveClaimAllowed = Boolean(
  marketNicheValidation.summary?.hosted_live_claim_allowed
);
const marketNicheEnterpriseReadyClaimAllowed = Boolean(
  marketNicheValidation.summary?.enterprise_ready_claim_allowed
);
const marketNicheAccuracyClaimAllowed = Boolean(
  marketNicheValidation.summary?.accuracy_claim_allowed
);
const marketNicheWorldClassPredictionClaimAllowed = Boolean(
  marketNicheValidation.summary?.world_class_prediction_claim_allowed
);
const competitivePositioningValidationStatus = competitivePositioningValidation.status ?? 'missing';
const competitiveMarketSignalRowCount = Number(
  competitivePositioningValidation.summary?.market_signal_row_count ?? 0
);
const competitiveCurrentSourceCount = Number(
  competitivePositioningValidation.summary?.current_competitive_source_count ?? 0
);
const competitiveSubstituteRowCount = Number(
  competitivePositioningValidation.summary?.competitor_substitute_row_count ?? 0
);
const competitiveRequiredCategoryCount = Number(
  competitivePositioningValidation.summary?.required_competitor_category_count ?? 7
);
const competitiveRequiredCategoryPresentCount = Number(
  competitivePositioningValidation.summary?.required_competitor_category_present_count ?? 0
);
const competitiveLoopholeRowCount = Number(
  competitivePositioningValidation.summary?.loophole_row_count ?? 0
);
const competitiveBuyerPlanRowCount = Number(
  competitivePositioningValidation.summary?.buyer_plan_row_count ?? 0
);
const competitiveReleaseHoldCount = Number(
  competitivePositioningValidation.summary?.active_release_hold_count ?? 0
);
const competitiveWedgeClaimAllowed = Boolean(
  competitivePositioningValidation.summary?.defensible_competitive_wedge_claim_allowed
);
const competitiveReplacementClaimAllowed = Boolean(
  competitivePositioningValidation.summary?.replacement_claim_allowed
);
const competitiveDataBreadthClaimAllowed = Boolean(
  competitivePositioningValidation.summary?.data_breadth_superiority_claim_allowed
);
const competitivePalantirEquivalenceClaimAllowed = Boolean(
  competitivePositioningValidation.summary?.palantir_equivalence_claim_allowed
);
const competitiveExpertAdvisoryReplacementClaimAllowed = Boolean(
  competitivePositioningValidation.summary?.expert_advisory_replacement_claim_allowed
);
const competitiveForecastingParityClaimAllowed = Boolean(
  competitivePositioningValidation.summary?.forecasting_parity_claim_allowed
);
const competitiveWorldClassPredictionClaimAllowed = Boolean(
  competitivePositioningValidation.summary?.world_class_prediction_claim_allowed
);
const claimConsistencyValidationStatus = claimConsistencyValidation.status ?? 'missing';
const claimConsistencyScannedFileCount = Number(claimConsistencyValidation.summary?.scanned_file_count ?? 0);
const claimConsistencyScannedLineCount = Number(claimConsistencyValidation.summary?.scanned_line_count ?? 0);
const claimConsistencyDetectedMentionCount = Number(
  claimConsistencyValidation.summary?.detected_claim_mention_count ?? 0
);
const claimConsistencyBoundaryMentionCount = Number(
  claimConsistencyValidation.summary?.boundary_context_claim_mention_count ?? 0
);
const claimConsistencyUnsupportedMentionCount = Number(
  claimConsistencyValidation.summary?.unsupported_claim_mention_count ?? 0
);
const claimConsistencyUnsupportedP1Count = Number(
  claimConsistencyValidation.summary?.unsupported_p1_claim_mention_count ?? 0
);
const claimConsistencyUnsupportedP2Count = Number(
  claimConsistencyValidation.summary?.unsupported_p2_claim_mention_count ?? 0
);
const claimConsistencyReady = Boolean(claimConsistencyValidation.summary?.claim_consistency_ready);
const claimConsistencyWorldClassBlocked = Boolean(
  claimConsistencyValidation.summary?.world_class_prediction_claim_blocked
);
const claimConsistencyAccuracyBlocked = Boolean(claimConsistencyValidation.summary?.accuracy_claim_blocked);
const claimConsistencyBuyerValidatedBlocked = Boolean(
  claimConsistencyValidation.summary?.buyer_validated_claim_blocked
);
const claimConsistencyHostedLiveBlocked = Boolean(claimConsistencyValidation.summary?.hosted_live_claim_blocked);
const claimConsistencyEnterpriseReadyBlocked = Boolean(
  claimConsistencyValidation.summary?.enterprise_ready_claim_blocked
);
const claimConsistencyCompetitiveBlocked = Boolean(
  claimConsistencyValidation.summary?.competitive_replacement_or_parity_claim_blocked
);
const claimConsistencyCommercialReadyBlocked = Boolean(
  claimConsistencyValidation.summary?.commercial_ready_claim_blocked
);
const ownerApprovalValidationStatus = ownerApprovalValidation.status ?? 'missing';
const ownerApprovalRequiredCount = Number(ownerApprovalValidation.summary?.required_approval_count ?? 0);
const ownerApprovalApprovedCount = Number(ownerApprovalValidation.summary?.owner_approved_count ?? 0);
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

const evidenceGateStatuses = new Map(
  (calibration.evidence_gates ?? []).map((gate) => [gate.gate, gate.status])
);

const dimensions = [
  {
    id: 'market_thesis',
    label: 'Market thesis and niche focus',
    weight_percent: 15,
    current_score_percent: 80,
    status: marketNicheBuyerSafePilotClaimAllowed
      ? 'niche_evidence_validated_pilot_only_not_buyer_proof'
      : pilotOfferReady
        ? 'pilot_offer_pack_ready_desk_research_only'
        : 'strong_but_desk_research_only',
    evidence: [
      `${evidence.pain_points?.length ?? 0} pain points and ${evidence.target_customers?.length ?? 0} target segments in ${inputPaths.evidence}`,
      'Market differentiation artifact aligns five niches with competitor/substitute sources.',
      pilotOfferReady
        ? `${inputPaths.pilotOfferPack} packages ${pilotNicheCount} niche offers into a buyer-safe pilot offer without treating it as buyer proof.`
        : `${inputPaths.pilotOfferPack} is missing or not ready.`,
      pilotPackageReadinessStatus !== 'missing'
        ? `${inputPaths.pilotPackageReadiness} status is ${pilotPackageReadinessStatus}; package_ready_for_owner_review=${pilotPackageReadyForOwnerReview}, external_share_ready=${pilotPackageExternalShareReady}, selected_top_five=${pilotPackageSelectedTopFiveCount}/${pilotPackageRequiredNicheCount}, owner_approved=${pilotPackageOwnerApprovedCount}/${pilotPackageOwnerRequiredCount}, buyer_validation_verified=${pilotPackageBuyerValidationVerified}, hosted_proof_complete=${pilotPackageHostedProofComplete}, and world_class_prediction_claim_allowed=${pilotPackageWorldClassPredictionClaimAllowed}.`
        : `${inputPaths.pilotPackageReadiness} has not been generated; five-niche pilot package coherence remains unchecked.`,
      marketNicheValidationStatus !== 'missing'
        ? `${inputPaths.marketNicheValidation} status is ${marketNicheValidationStatus} with ${marketNicheCount}/${marketNicheRequiredCount} niches, ${marketNicheSourceAlignmentCount} source alignments, ${marketNicheResearchAnchorCount} current research anchors, ${marketNicheSubstitutionCount} substitution rows, ${marketNicheRouteSignalReadyCount} local route signals, ${marketNicheReleaseHoldCount} active holds, buyer_safe_pilot_claim_allowed=${marketNicheBuyerSafePilotClaimAllowed}, buyer_validated_claim_allowed=${marketNicheBuyerValidatedClaimAllowed}, and world_class_prediction_claim_allowed=${marketNicheWorldClassPredictionClaimAllowed}.`
        : `${inputPaths.marketNicheValidation} has not been generated; market thesis remains desk-research-only.`,
      claimConsistencyValidationStatus !== 'missing'
        ? `${inputPaths.claimConsistencyValidation} status is ${claimConsistencyValidationStatus} after scanning ${claimConsistencyScannedFileCount} launch artifacts and ${claimConsistencyScannedLineCount} lines: ${claimConsistencyDetectedMentionCount} high-risk claim mentions, ${claimConsistencyBoundaryMentionCount} boundary/caveated mentions, ${claimConsistencyUnsupportedMentionCount} unsupported mentions, ${claimConsistencyUnsupportedP1Count} unsupported P1 mentions, and claim_consistency_ready=${claimConsistencyReady}.`
        : `${inputPaths.claimConsistencyValidation} has not been generated; cross-artifact claim consistency remains unchecked.`
    ],
    required_to_reach_95: [
      'Attach named buyer feedback for each top-three segment.',
      'Show at least three qualified follow-ups and one paid pilot or LOI discussion.'
    ]
  },
  {
    id: 'differentiated_workflow',
    label: 'Differentiated governed workflow',
    weight_percent: 15,
    current_score_percent: 78,
    status: pilotOfferReady ? 'pilot_offer_packaged_guided_pilot_wedge' : 'demoable_guided_pilot_wedge',
    evidence: [
      'Current wedge is evidence-to-actor-reasoning-to-human-review-to-forecast draft.',
      'Repo artifacts include strategistContract, enterpriseWorkflow, forecastGovernance, human-review, and forecast-create.',
      pilotOfferReady
        ? `${pilotOfferPack.pilot_offer?.name ?? 'Pilot offer'} defines allowed/prohibited claims, pilot scope, success criteria, and buyer-fit checklist.`
        : 'Pilot offer pack has not been generated.',
      pilotPackageReadyForOwnerReview
        ? `${inputPaths.pilotPackageReadiness} validates the five-niche package as owner-review-ready while keeping external_share_ready=${pilotPackageExternalShareReady}.`
        : `${inputPaths.pilotPackageReadiness} does not yet validate the five-niche package as owner-review-ready.`,
      competitivePositioningValidationStatus !== 'missing'
        ? `${inputPaths.competitivePositioningValidation} status is ${competitivePositioningValidationStatus} with ${competitiveRequiredCategoryPresentCount}/${competitiveRequiredCategoryCount} substitute categories, ${competitiveSubstituteRowCount} competitor rows, ${competitiveCurrentSourceCount} current competitive sources, ${competitiveLoopholeRowCount} loophole rows, ${competitiveBuyerPlanRowCount} buyer-plan rows, ${competitiveReleaseHoldCount} active holds, defensible_competitive_wedge_claim_allowed=${competitiveWedgeClaimAllowed}, replacement_claim_allowed=${competitiveReplacementClaimAllowed}, Palantir-equivalence=${competitivePalantirEquivalenceClaimAllowed}, forecasting_parity=${competitiveForecastingParityClaimAllowed}, and world_class_prediction_claim_allowed=${competitiveWorldClassPredictionClaimAllowed}.`
        : `${inputPaths.competitivePositioningValidation} has not been generated; competitor/substitute positioning remains Markdown-only.`
    ],
    required_to_reach_95: [
      'Record one complete hosted buyer-demo run through console, review, and forecast draft.',
      'Package the flow as a narrow pilot offer instead of broad platform positioning.'
    ]
  },
  {
    id: 'repo_product_proof',
    label: 'Repo and local product proof',
    weight_percent: 15,
    current_score_percent: localProofCount >= 10 && repoProofCount >= 10 ? 75 : 60,
    status: localBrowserRouteProofReady
      ? 'local_route_proof_good_hosted_proof_absent'
      : 'local_proof_good_hosted_proof_absent',
    evidence: [
      `${localProofCount} local proof entries and ${repoProofCount} repo-artifact entries captured.`,
      'TypeScript/build/focused tests/Deno/browser local proof exist in the evidence ledger.',
      localBrowserRouteProofReady
        ? `${inputPaths.localBrowserRouteProof} captures ${localBrowserRouteReadyCount}/${localBrowserRouteCount} top-niche routes rendered or expected-auth-gated, with ${localBrowserRouteRuntimeErrorCount} runtime console errors and hosted_live_proof=${localBrowserHostedProof}.`
        : `${inputPaths.localBrowserRouteProof} is missing or not ready.`
    ],
    required_to_reach_95: [
      'Add hosted smoke outputs and screenshots for console, forecasts, review, pricing/auth, and calibration jobs.',
      localBrowserRouteProofReady
        ? 'Promote the local route proof into owner-approved hosted route proof before using it in buyer-facing live claims.'
        : 'Run local route proof for the top-five niche routes before refining demo positioning.',
      'Keep local and hosted proof separated in buyer-facing artifacts.'
    ]
  },
  {
    id: 'enterprise_security_trust',
    label: 'Enterprise security and trust proof',
    weight_percent: 15,
    current_score_percent: rlsProofReadyForSecurityClaim ? 70 : 45,
    status: rlsProofReadyForSecurityClaim
      ? 'rls_tenant_isolation_proof_ready_pending_enterprise_review'
      : enterpriseExecutionReadyForOwnerTrustReview
        ? 'enterprise_trust_execution_ready_owner_docs_and_runtime_proof_missing'
      : enterpriseTrustPackReady
        ? aiActionPolicyReady
          ? llmSecurityAuditReady
            ? llmLocalTestsPassed
              ? 'trust_llm_action_policy_draft_ready_local_redteam_passed_policy_draft_not_applied'
              : 'trust_llm_action_policy_draft_ready_static_audit_policy_draft_not_applied'
            : 'trust_action_policy_draft_ready_policy_draft_not_applied'
        : aiActionInventoryReady
          ? llmSecurityAuditReady
            ? llmLocalTestsPassed
              ? 'trust_llm_action_inventory_ready_local_redteam_passed_policy_draft_not_applied'
              : 'trust_llm_action_inventory_ready_static_audit_policy_draft_not_applied'
            : 'trust_action_inventory_ready_policy_draft_not_applied'
          : llmSecurityAuditReady
            ? llmLocalTestsPassed
              ? 'trust_and_llm_local_redteam_passed_policy_draft_not_applied'
              : 'trust_and_llm_static_audit_ready_policy_draft_not_applied'
          : 'trust_pack_ready_policy_draft_not_applied'
        : rlsDraft.commercial_security_status ?? 'unknown',
    evidence: [
      `${inputPaths.rlsDraft} reports ${rlsDraft.summary?.policy_count_to_drop ?? 0} broad policy drops, ${rlsDraft.summary?.policy_count_to_create ?? 0} least-privilege policies, and ${rlsDraft.summary?.open_decision_count ?? 0} open owner decisions.`,
      `Production state verified: ${Boolean(rlsDraft.source?.production_state_verified)}; test execution verified: ${Boolean(rlsDraft.source?.test_execution_verified)}.`,
      `${inputPaths.rlsProofValidation} status is ${rlsProofValidationStatus} with ${rlsProofExecutedCount}/${rlsProofExpectedCaseEnvironmentCount} executed case/environment rows, local ready ${rlsProofLocalReadyCount}, linked ready ${rlsProofLinkedReadyCount}, ${rlsProofReleaseHoldCount} active validation holds, and tenant_isolation_claim_allowed=${rlsProofTenantIsolationClaimAllowed}.`,
      enterpriseTrustPackReady
        ? `${inputPaths.enterpriseTrustPack} adds ${enterpriseQuestionnaireRowCount} procurement questionnaire rows and ${enterpriseAcceptanceGateCount} acceptance gates, but status remains ${enterpriseTrustPack.status}.`
        : `${inputPaths.enterpriseTrustPack} is missing or not ready.`,
      `${inputPaths.enterpriseEvidenceValidation} status is ${enterpriseEvidenceValidationStatus} with ${enterpriseEvidenceReadyDocumentCount}/${enterpriseEvidenceRequiredDocumentCount} ready required documents, ${enterpriseEvidenceMissingDocumentCount} missing/unapproved documents, ${enterpriseEvidenceExternalShareApprovedCount} external-share approvals, ${enterpriseEvidenceReleaseHoldCount} active validation holds, and ready_for_enterprise_procurement_review=${enterpriseEvidenceReadyForReview}.`,
      enterpriseProcurementGateReady
        ? `${inputPaths.enterpriseProcurementGate} defines ${enterpriseProcurementDocumentCount} required procurement documents, ${enterpriseProcurementMissingDocumentCount} missing/unapproved documents, ${enterpriseExternalShareApprovedCount} owner-approved external-share artifacts, and ${enterpriseProcurementReleaseHoldCount} active release holds.`
        : `${inputPaths.enterpriseProcurementGate} is missing or not ready.`,
      enterpriseExecutionReadinessStatus !== 'missing'
        ? `${inputPaths.enterpriseExecutionReadiness} status is ${enterpriseExecutionReadinessStatus} with execution_ready_for_owner_trust_review=${enterpriseExecutionReadyForOwnerTrustReview}, enterprise_proof_ready_for_owner_claim_review=${enterpriseExecutionProofReadyForOwnerClaimReview}, trust_pack_ready=${enterpriseExecutionTrustPackReady}, procurement_register_template_ready=${enterpriseExecutionProcurementRegisterReady}, ready documents ${enterpriseExecutionReadyDocumentCount}/${enterpriseExecutionRequiredDocumentCount}, external-share approvals ${enterpriseExecutionExternalShareApprovedCount}, RLS plan ready=${enterpriseExecutionRlsPlanReady}, RLS executed rows ${enterpriseExecutionRlsExecutedRowCount}/${enterpriseExecutionRlsExpectedRowCount}, local LLM red-team passed=${enterpriseExecutionLocalLlmRedTeamPassed}, hosted LLM runtime proof ready=${enterpriseExecutionHostedLlmRuntimeProofReady}, AI policy ready=${enterpriseExecutionAiActionPolicyReady}, AI owner-approved policies=${enterpriseExecutionAiOwnerApprovedPolicyCount}, hosted AI boundary tests=${enterpriseExecutionAiHostedVerifiedTestCount}, hosted access ready=${enterpriseExecutionHostedAccessReady}, hosted proof ready=${enterpriseExecutionHostedProofReady}, ${enterpriseExecutionReleaseHoldCount} active holds, and enterprise_ready_claim_allowed=${enterpriseExecutionEnterpriseReadyClaimAllowed}.`
        : `Run npm run audit:enterprise:execution-readiness after trust-pack and procurement-gate generation so owner-review readiness, missing documents, RLS execution, LLM hosted proof, AI action policy approval, and claim boundaries are checked together.`,
      llmSecurityAuditReady
        ? `${inputPaths.llmSecurityAudit} maps ${llmStaticControlCount}/${llmRequiredControlCount} OWASP LLM control areas, has ${llmLocalPassedFixtureCount}/${llmFixtureCount} local fixtures passed with local proof score ${llmLocalProofScore}%, and has ${llmExecutedFixtureCount} hosted runtime fixtures executed with runtime proof score ${llmRuntimeProofScore}%.`
        : `${inputPaths.llmSecurityAudit} is missing or not ready.`,
      aiActionInventoryReady
        ? `${inputPaths.aiActionInventory} maps ${aiActionSurfaceCount} action surfaces, ${aiHighImpactActionCount} high-impact product actions, ${aiDirectIrreversibleActionCount} direct LLM-to-irreversible actions found, and ${aiHostedVerifiedCount} hosted-verified action surfaces.`
        : `${inputPaths.aiActionInventory} is missing or not ready.`,
      aiActionPolicyReady
        ? `${inputPaths.aiActionPolicy} defines ${aiPolicySurfaceCount} policy surfaces, ${aiApprovalRequiredSurfaceCount} approval-required surfaces, ${aiHostedBoundaryTestCount} hosted boundary tests, ${aiStaticBoundaryTestCount} static boundary tests, ${aiOwnerApprovedPolicyCount} owner-approved policies, and ${aiHostedVerifiedTestCount} hosted verified tests.`
        : `${inputPaths.aiActionPolicy} is missing or not ready.`,
      `${inputPaths.ownerApprovalValidation} status is ${ownerApprovalValidationStatus} with ${ownerApprovalApprovedCount}/${ownerApprovalRequiredCount} required approvals owner-approved, row errors ${ownerApprovalRowErrorCount}, ready_for_downstream_evidence=${ownerApprovalReadyForDownstreamEvidence}, enterprise_ready_claim_allowed=${ownerApprovalEnterpriseReadyClaimAllowed}.`
    ],
    required_to_reach_95: [
      'Clear owner approval register rows for procurement documents, RLS execution, AI action policy, hosted runtime tests, and enterprise claim language before upgrading enterprise-ready claims.',
      'Owner approves table classifications and policy draft.',
      'Convert approved SQL into one narrow migration, run pgTAP locally and against linked Supabase, then run the RLS proof validator before any tenant-isolation claim is upgraded.',
      llmLocalTestsPassed
        ? 'Run owner-approved hosted LLM red-team smoke before public-sector AI security claims.'
        : 'Convert LLM red-team fixtures into runnable local and hosted tests before public-sector AI security claims.',
      aiActionInventoryReady
        ? aiActionPolicyReady
          ? 'Owner approves or edits the draft high-impact AI action policy, then runs hosted no-autonomous-action tests for publication, review, payment/webhook, and post-analysis fanout boundaries.'
          : 'Approve a high-impact AI action policy and run hosted no-autonomous-action tests for publication, review, payment/webhook, and post-analysis fanout boundaries.'
        : 'Create an AI action inventory and high-impact action policy before public-sector AI no-autonomous-action claims.',
      enterpriseExecutionReadyForOwnerTrustReview
        ? 'Use the enterprise trust execution-readiness gate as the owner procurement/security review contract, then rerun it after owner documents and runtime proofs are added.'
        : 'Run the enterprise trust execution-readiness gate before owner procurement/security review so document, RLS, LLM, AI action, hosted, and claim-boundary gaps are checked together.',
      enterpriseProcurementGateReady
        ? 'Clear the enterprise procurement release holds with owner-approved privacy/retention/DPA, support/SLA, incident response, external-share register, RLS/hosted proof, and AI runtime proof.'
        : 'Create an enterprise procurement privacy/support/SLA gate before enterprise-ready claims.',
      'Fill and validate the enterprise procurement evidence register so owner-approved documents, external-share approvals, and no-secrets/no-unsupported-claims markers are machine-checked before procurement claims are upgraded.',
      'Complete privacy/retention, monitoring, support/SLA, and procurement questionnaire evidence before enterprise-ready claims.'
    ]
  },
  {
    id: 'prediction_accuracy_proof',
    label: 'Prediction accuracy and calibration proof',
    weight_percent: 20,
    current_score_percent: scoringOutputReadyForClaimReview ? 55 : 35,
    status: forecastExecutionScoringChainReady
      ? 'forecast_execution_scoring_chain_ready_pending_owner_claim_review'
      : forecastExecutionReadyForOwnerExport
      ? 'forecast_execution_ready_owner_export_missing_real_rows'
      : predictionScienceFrameworkAlignmentReady && !predictionScienceReadyForClaimReview
      ? 'science_framework_aligned_real_data_missing'
      : scoringOutputReadyForClaimReview
      ? 'scoring_evidence_ready_pending_owner_claim_review'
      : forecastClaimGovernanceReady
      ? 'claim_governance_ready_real_data_missing'
      : forecastProtocolReady
      ? 'evaluation_protocol_ready_sample_only'
      : accuracyIntakeKit.status === 'accuracy_intake_ready_not_accuracy_proof'
      ? 'intake_ready_sample_only'
      : 'mechanics_present_sample_only',
    evidence: [
      `${inputPaths.calibration} has ${(calibration.evidence_gates ?? []).length} evidence gates with statuses: ${[...evidenceGateStatuses.entries()].map(([gate, status]) => `${gate}:${status}`).join(', ')}.`,
      `${inputPaths.benchmark} status is ${benchmark.commercial_benchmark_status ?? 'unknown'} with ${benchmark.summary?.comparisons_made ?? 0} sample comparisons.`,
      `${inputPaths.accuracyIntakeKit} status is ${accuracyIntakeKit.status ?? 'unknown'} with ${(accuracyIntakeKit.acceptance_gates ?? []).length} acceptance gates.`,
      `${inputPaths.accuracyInputValidation} status is ${accuracyInputValidationStatus} with ${accuracyInputValidationValidForecastCount} valid resolved forecasts, ${accuracyInputValidationValidBaselineCount} valid baselines, ${accuracyInputValidationReleaseHoldCount} active validation holds, and ready_for_calibration_scoring=${accuracyInputValidationReadyForScoring}.`,
      `${inputPaths.leakageReviewValidation} status is ${leakageReviewValidationStatus} with ${leakageReviewReadyControlCount}/${leakageReviewRequiredControlCount} leakage controls ready, ${leakageReviewValidForecastCount} valid forecasts, ${leakageReviewValidBaselineCount} valid baselines, ${leakageReviewUnresolvedIssueTotal} unresolved issues, ${leakageReviewHighRiskCount} high/critical risk rows, ${leakageReviewReleaseHoldCount} active validation holds, and ready_for_accuracy_claim_review=${leakageReviewReadyForAccuracyClaim}.`,
      `${inputPaths.scoringValidation} status is ${scoringValidationStatus} with ${scoringValidationIncludedPointCount} included points, max source sample size ${scoringValidationMaxSourceSampleSize}, ${scoringValidationBaselineCount} baselines, ${scoringValidationComparisonCount} comparisons, ${scoringValidationReleaseHoldCount} active validation holds, and scoring_output_ready_for_claim_review=${scoringOutputReadyForClaimReview}.`,
      `${inputPaths.predictionScienceValidation} status is ${predictionScienceValidationStatus} with ${predictionScienceSourceCount} current forecasting-science sources, ${predictionScienceProtocolStageCount} protocol stages, ${predictionScienceMetricCount} metrics, ${predictionScienceClaimTierCount} claim tiers, ${predictionScienceGovernanceThresholdCount} governance thresholds, ${predictionScienceValidResolvedForecastCount}/${predictionScienceRealResolvedOutcomeCount} valid/real resolved outcomes, ${predictionScienceValidBaselineCount}/${predictionScienceRealBaselineComparisonCount} valid/real baselines, ${predictionScienceReleaseHoldCount} active holds, scientific_framework_alignment_ready=${predictionScienceFrameworkAlignmentReady}, prediction_science_ready_for_claim_review=${predictionScienceReadyForClaimReview}, mechanics_only_claim_allowed=${predictionScienceMechanicsOnlyClaimAllowed}, and world_class_prediction_claim_allowed=${predictionScienceWorldClassPredictionClaimAllowed}.`,
      `${inputPaths.forecastExecutionReadiness} status is ${forecastExecutionReadinessStatus} with ${forecastExecutionPresentSurfaceCount}/${forecastExecutionRequiredSurfaceCount} repo surfaces, ${forecastExecutionTemplateReadyCount}/${forecastExecutionTemplateCount} owner templates, ${forecastExecutionValidResolvedForecastCount}/${forecastExecutionRealResolvedOutcomeCount} valid/real resolved outcomes, ${forecastExecutionValidBaselineCount}/${forecastExecutionRealBaselineComparisonCount} valid/real baselines, ${forecastExecutionReleaseHoldCount} active holds, execution_ready_for_owner_resolved_export=${forecastExecutionReadyForOwnerExport}, scoring_chain_ready_for_owner_claim_review=${forecastExecutionScoringChainReady}, hosted_access_ready_for_smoke=${forecastExecutionHostedAccessReady}, rls_tenant_isolation_proof_ready=${forecastExecutionRlsReady}, and world_class_prediction_claim_allowed=${forecastExecutionWorldClassPredictionClaimAllowed}.`,
      `${inputPaths.ownerApprovalValidation} blocks prediction claim upgrades until owner approval rows for pre-resolution freeze, resolved export, and prediction claim language are approved; owner-approved rows=${ownerApprovalApprovedCount}/${ownerApprovalRequiredCount}, world_class_prediction_claim_allowed=${ownerApprovalWorldClassPredictionClaimAllowed}.`,
      forecastProtocolReady
        ? `${inputPaths.forecastEvaluationProtocol} defines ${forecastProtocolStageCount} protocol stages, ${(forecastEvaluationProtocol.metric_suite ?? []).length} metrics, and ${(forecastEvaluationProtocol.claim_tiers ?? []).length} claim tiers without treating them as accuracy proof.`
        : `${inputPaths.forecastEvaluationProtocol} is missing or not ready.`,
      forecastClaimGovernanceReady
        ? `${inputPaths.forecastClaimGovernance} defines ${forecastClaimThresholdCount} governance thresholds, ${forecastClaimReleaseHoldCount} active release holds, ${realResolvedOutcomeCount} real resolved outcomes, ${realBaselineComparisonCount} real baseline comparisons, and world-class claim approval ${worldClassClaimApproved}.`
        : `${inputPaths.forecastClaimGovernance} is missing or not ready.`
    ],
    required_to_reach_95: [
      'Clear owner approval register rows for pre-resolution packet freeze, resolved forecast export, and prediction claim language before any accuracy or world-class prediction claim review.',
      forecastClaimGovernanceReady
        ? 'Clear the forecast claim-governance release holds with validated owner-approved inputs, resolved outcomes, real baselines, leakage review, hosted/security proof, and approved claim language.'
        : 'Create a forecast claim-governance checklist before any prediction-superiority or world-class language.',
      'Run the accuracy input validator on owner-approved resolved forecasts and baselines before calibration or benchmark scoring.',
      'Run the forecast leakage review validator on owner-approved resolved forecasts and baselines so pre-resolution timestamps, temporal source cutoffs, retrieval cutoffs, baseline comparability, benchmark contamination, training/evaluation overlap, ambiguous outcomes, and claim copy are reviewer-approved.',
      forecastExecutionReadyForOwnerExport
        ? 'Use the forecast evaluation execution-readiness gate as the owner export contract, then rerun it after real forecast and baseline rows are added.'
        : 'Run the forecast evaluation execution-readiness gate to verify repo surfaces and owner export templates before requesting real resolved outcomes.',
      'Run the forecast scoring evidence validator after calibration ledger and benchmark comparison outputs are generated so sample-only mechanics cannot support accuracy claims.',
      'Run the calibration ledger on owner-approved resolved forecasts with explicit inclusion/exclusion rules and sample size.',
      'Compare against real human/community/pro/external baselines on comparable questions before any world-class accuracy claim.'
    ]
  },
  {
    id: 'buyer_validation',
    label: 'Buyer validation and willingness to pay',
    weight_percent: 15,
    current_score_percent: buyerEvidenceValidationReady && buyerSubstitutionEvidenceReady
      ? 75
      : realBuyerRows.length > 0 || buyerSubstitutionRealInteractionCount > 0
        ? 40
        : buyerTargetCount >= 20
          ? 25
          : 15,
    status: buyerEvidenceValidationReady && buyerSubstitutionEvidenceReady
      ? 'buyer_evidence_ready_for_proof_gate_pending_owner_review'
      : realBuyerRows.length > 0 || buyerSubstitutionRealInteractionCount > 0
      ? 'partial_real_buyer_feedback'
      : buyerExecutionReadyForOwnerOutreach
        ? buyerSubstitutionProtocolReady
          ? 'buyer_execution_ready_substitution_evidence_gate_no_real_calls'
          : 'buyer_execution_ready_no_completed_calls'
      : buyerProofGateReady
        ? 'buyer_proof_gate_ready_no_completed_calls'
      : buyerDiscoverySelectedCount >= 10
        ? 'discovery_kit_ready_not_buyer_proof'
        : buyerTargetCount >= 20
          ? 'named_target_pack_ready_not_buyer_proof'
          : 'template_only',
    evidence: [
      `${buyerRows.length} CRM template rows loaded; ${realBuyerRows.length} rows are beyond research/template status.`,
      `${buyerTargetCount} named validation targets loaded from ${inputPaths.buyerTargets}.`,
      `${buyerDiscoverySelectedCount} selected discovery-kit targets loaded from ${inputPaths.buyerDiscoveryKit}.`,
      `${inputPaths.buyerEvidenceValidation} status is ${buyerEvidenceValidationStatus} with ${buyerEvidenceRealInteractionCount} real interactions, ${buyerEvidenceValidCompletedCallCount} valid completed calls, ${buyerEvidenceValidOutcomeCaptureCount} valid outcome-capture rows, ${buyerEvidenceValidQualifiedFollowupCount} valid qualified follow-ups, ${buyerEvidenceValidCommitmentSignalCount} valid commitment signals, ${buyerEvidenceReleaseHoldCount} active validation holds, and ready_for_buyer_proof_gate=${buyerEvidenceValidationReady}.`,
      `${inputPaths.buyerSubstitutionEvidenceValidation} status is ${buyerSubstitutionEvidenceValidationStatus} with substitution_protocol_ready=${buyerSubstitutionProtocolReady}, ${buyerSubstitutionRealInteractionCount} real substitution interactions, ${buyerSubstitutionValidCompletedCallCount} valid completed substitution calls, ${buyerSubstitutionCompletedNicheCount} completed niches, ${buyerSubstitutionQualifiedOutcomeCount} qualified substitution outcomes, ${buyerSubstitutionCommitmentSignalCount} commitment signals, ${buyerSubstitutionReleaseHoldCount} active holds, and ready_for_buyer_proof_gate=${buyerSubstitutionEvidenceReady}.`,
      buyerProofGateReady
        ? `${inputPaths.buyerProofGate} defines ${buyerProofAcceptanceGateCount} buyer proof gates, ${buyerProofReleaseHoldCount} active release holds, ${buyerCompletedCallCount} completed calls with required fields, ${buyerQualifiedFollowupCount} qualified follow-ups, and ${buyerPaidLoiProcurementSignalCount} paid-pilot/LOI/procurement signals.`
        : `${inputPaths.buyerProofGate} is missing or not ready.`,
      buyerExecutionReadinessStatus !== 'missing'
        ? `${inputPaths.buyerExecutionReadiness} status is ${buyerExecutionReadinessStatus} with execution_ready_for_owner_outreach=${buyerExecutionReadyForOwnerOutreach}, ${buyerExecutionSelectedPriorityNicheCount}/${buyerExecutionPriorityNicheCount} selected priority niches covered, ${buyerExecutionCallSheetPriorityNicheCount}/${buyerExecutionPriorityNicheCount} call-sheet priority niches covered, ${buyerExecutionReleaseHoldCount} active release holds, and buyer_validated_claim_allowed=${buyerExecutionBuyerValidatedClaimAllowed}.`
        : `Run npm run audit:buyer:execution-readiness after buyer discovery-kit generation so the 10-call slate, schema, niche coverage, local proof, and claim boundaries are checked before owner outreach.`,
      `${inputPaths.ownerApprovalValidation} blocks buyer-validation claim upgrades until discovery slate, outcome-capture protocol, and external claim-language approval rows are owner-approved; owner-approved rows=${ownerApprovalApprovedCount}/${ownerApprovalRequiredCount}, buyer_validated_claim_allowed=${ownerApprovalBuyerValidatedClaimAllowed}.`,
      `${paidSignalRows.length} rows mention paid pilot, LOI, or pilot signal.`
    ],
    required_to_reach_95: [
      'Clear owner approval register rows for discovery slate, buyer outcome-capture protocol, and buyer external claim language before outreach proof can be upgraded.',
      buyerExecutionReadyForOwnerOutreach
        ? 'Owner approves or edits the balanced buyer-validation execution slate before manual outreach.'
        : 'Run the buyer-validation execution-readiness gate so selected targets cover the validated top-five niches and claim-safe proof assets before outreach.',
      buyerProofGateReady
        ? 'Clear the buyer proof-gate release holds with 10 completed calls, three qualified follow-ups, and one paid-pilot/LOI/procurement-path signal.'
        : 'Create a buyer proof gate before treating discovery artifacts as sellability evidence.',
      'Run the buyer evidence input validator after real discovery rows are added so only valid completed calls, pilot outcome-capture rows, qualified follow-ups, and commitment signals count.',
      'Run the buyer substitution evidence validator after owner-filled substitution rows are added so current-tool, budget-owner, switching-barrier, must-have-proof, qualified outcome, and commitment signals are checked against substitutes.',
      'Complete the 10-call validation loop and record buyer role, proof shown, objection, next action, willingness-to-pay signal, baseline/current workflow, pilot outcome or expected delta, quality signal, buyer decision event, and outcome evidence notes.',
      'Do not upgrade beyond pilot-only without at least three qualified follow-ups and one paid-pilot or LOI conversation.'
    ]
  },
  {
    id: 'hosted_operational_proof',
    label: 'Hosted operational proof',
    weight_percent: 5,
    current_score_percent: hostedOperationalScore,
    status: hostedProofReadyForBuyerSafeClaims
      ? 'validated_hosted_proof_ready_for_specific_buyer_safe_claims'
      : hostedSmokeExecutionOwnerUnblockReady && !hostedSmokeExecutionReady
        ? 'hosted_smoke_owner_unblock_ready_project_access_missing'
      : hostedSmokeExecutionReady
        ? 'hosted_smoke_execution_ready_waiting_for_runs'
      : hostedAccessPreflightStatus !== 'missing' && !hostedAccessReadyForSmoke
        ? 'hosted_access_preflight_blocked_before_smoke'
      : hostedProofBuyerClaimAllowedCount > 0
        ? 'partial_validated_hosted_proof'
        : hostedProofCount > 0
          ? 'unvalidated_hosted_live_entries'
          : hostedProofValidationStatus === 'hosted_operational_evidence_validation_ready_no_hosted_runs'
            ? 'proof_validator_ready_hosted_runs_absent'
            : hostedSmokePlanCount > 0
              ? 'proof_kit_ready_hosted_proof_absent'
              : 'hosted_proof_absent',
    evidence: [
      `${hostedProofCount} hosted/live proof entries captured in ${inputPaths.evidence}.`,
      hostedSmokePlanCount > 0
        ? `${hostedSmokePresentCount}/${hostedSmokePlanCount} hosted proof-kit scripts are present in ${inputPaths.hostedProofKit}.`
        : `${inputPaths.hostedProofKit} is missing or has no smoke plan.`,
      hostedAccessPreflightStatus !== 'missing'
        ? `${inputPaths.hostedAccessPreflight} status is ${hostedAccessPreflightStatus}; cli_available=${hostedAccessCliAvailable}; core_env_present=${hostedAccessCoreEnvPresent}; provider_key_present=${hostedAccessProviderKeyPresent}; projects_access=${hostedAccessProjectsListAccess}; target_project_visible=${hostedAccessTargetProjectVisible}; functions_access=${hostedAccessFunctionsListAccess}; secrets_access=${hostedAccessSecretsListAccess}; stripe_proof_ready=${hostedAccessStripeProofReady}; hosted_access_ready_for_smoke=${hostedAccessReadyForSmoke}; hosted_claim_allowed=${hostedAccessClaimAllowed}.`
        : 'Run hosted access preflight before hosted smoke so CLI availability, project privileges, env-key presence, and payment-proof gaps are explicit.',
      `${inputPaths.hostedProofValidation} status is ${hostedProofValidationStatus} with ${hostedProofExecutedSmokeCount} executed hosted rows, ${hostedProofPassedSmokeCount} passed/caveated rows, ${hostedProofBuyerClaimAllowedCount} buyer-claim-allowed rows, ${hostedProofCoreCoverageReadyCount}/${hostedProofCoreCoverageGroupCount} core coverage groups ready, ${hostedProofReleaseHoldCount} active validation holds, and ready_for_buyer_safe_hosted_claims=${hostedProofReadyForBuyerSafeClaims}.`,
      hostedSmokeExecutionReadinessStatus !== 'missing'
        ? `${inputPaths.hostedSmokeExecutionReadiness} status is ${hostedSmokeExecutionReadinessStatus} with owner_unblock_ready=${hostedSmokeExecutionOwnerUnblockReady}, hosted_smoke_execution_ready=${hostedSmokeExecutionReady}, hosted_proof_complete=${hostedSmokeProofComplete}, smoke scripts ${hostedSmokeScriptPresentCount}/${hostedSmokeSmokePlanCount}, evidence rows ${hostedSmokeEvidenceRegisterRowCount}/${hostedSmokeExpectedSmokeCount}, executed smokes ${hostedSmokeExecutedCount}, passed smokes ${hostedSmokePassedCount}, core coverage ${hostedSmokeCoreCoverageReadyCount}/${hostedSmokeCoreCoverageGroupCount}, target_project_visible=${hostedSmokeTargetProjectVisible}, management_access_ready=${hostedSmokeManagementAccessReady}, stripe_proof_ready=${hostedSmokeStripeProofReady}, local_browser_route_baseline_ready=${hostedSmokeLocalRouteBaselineReady}, ${hostedSmokeReleaseHoldCount} active holds, and hosted_claim_allowed=${hostedSmokeClaimAllowed}.`
        : `Run npm run audit:hosted:smoke-execution-readiness after hosted access preflight and proof validation so smoke scripts, local browser baseline, proof register, owner unblockers, and hosted claim boundaries are checked together.`,
      `${inputPaths.ownerApprovalValidation} blocks hosted-live claim upgrades until hosted access, deploy binding, payment proof, and hosted claim-language approval rows are owner-approved; owner-approved rows=${ownerApprovalApprovedCount}/${ownerApprovalRequiredCount}, hosted_live_claim_allowed=${ownerApprovalHostedLiveClaimAllowed}.`,
      'Hosted proof remains the blocker for buyer-safe live claims until validation has deploy binding, redacted logs/screenshots, and core route/API coverage.'
    ],
    required_to_reach_95: [
      'Clear owner approval register rows for hosted project access, deploy binding, payment proof values, and hosted claim language before hosted-live proof can be upgraded.',
      hostedSmokeExecutionOwnerUnblockReady
        ? 'Use the hosted smoke execution-readiness gate as the owner unblock contract, then rerun it after project access, deploy binding, and Stripe proof values are supplied.'
        : 'Run the hosted smoke execution-readiness gate so project access, deploy binding, proof register, smoke scripts, local browser baseline, and claim boundaries are checked together.',
      hostedAccessReadyForSmoke
        ? 'Run owner-approved hosted smoke commands with deploy binding, redacted logs, and screenshots.'
        : 'Clear hosted access preflight blockers: intended project visibility, function/secret management access, owner-approved hosted URL/deploy binding, and missing payment proof values.',
      'Run hosted access, auth, schema, strategist, insights, retrieval/analyze, and pricing/entitlement smoke scripts after owner-approved deploy/secrets.',
      'Fill the hosted operational proof evidence register with hosted URL, deploy id or commit, timestamp, operator, logs, screenshots where relevant, failure class, and redaction status.',
      'Run the hosted operational evidence validator so only passed, redacted, core-coverage rows can support specific buyer-safe hosted claims.',
      'Attach screenshots/logs without exposing credentials or direct personal/payment identifiers.'
    ]
  }
];

const weightedScore = dimensions.reduce(
  (sum, dimension) => sum + (dimension.current_score_percent * dimension.weight_percent) / 100,
  0
);
const totalWeight = dimensions.reduce((sum, dimension) => sum + dimension.weight_percent, 0);
const commercialWorldClassConfidence = round((weightedScore / totalWeight) * 100, 1);
const pilotStrategyConfidence = round(
  ['market_thesis', 'differentiated_workflow', 'repo_product_proof']
    .map((id) => dimensions.find((dimension) => dimension.id === id)?.current_score_percent ?? 0)
    .reduce((sum, score) => sum + score, 0) / 3,
  1
);

const blockerOrder = dimensions
  .filter((dimension) => dimension.current_score_percent < 70)
  .sort((left, right) => {
    const leftGap = (95 - left.current_score_percent) * left.weight_percent;
    const rightGap = (95 - right.current_score_percent) * right.weight_percent;
    return rightGap - leftGap;
  });

const gate = {
  schema_version: 'commercial-confidence-gate-v1',
  generated_at: new Date().toISOString(),
  source: {
    launch_evidence: inputPaths.evidence,
    rls_policy_draft: inputPaths.rlsDraft,
    calibration_readiness: inputPaths.calibration,
    forecast_benchmark_comparison: inputPaths.benchmark,
    accuracy_intake_kit: inputPaths.accuracyIntakeKit,
    accuracy_input_validation: inputPaths.accuracyInputValidation,
    forecast_evaluation_protocol: inputPaths.forecastEvaluationProtocol,
    forecast_claim_governance: inputPaths.forecastClaimGovernance,
    leakage_review_validation: inputPaths.leakageReviewValidation,
    scoring_validation: inputPaths.scoringValidation,
    prediction_science_validation: inputPaths.predictionScienceValidation,
    forecast_execution_readiness: inputPaths.forecastExecutionReadiness,
    rls_proof_validation: inputPaths.rlsProofValidation,
    hosted_proof_kit: inputPaths.hostedProofKit,
    hosted_access_preflight: inputPaths.hostedAccessPreflight,
    hosted_proof_validation: inputPaths.hostedProofValidation,
    hosted_smoke_execution_readiness: inputPaths.hostedSmokeExecutionReadiness,
    pilot_offer_pack: inputPaths.pilotOfferPack,
    pilot_package_readiness: inputPaths.pilotPackageReadiness,
    enterprise_trust_pack: inputPaths.enterpriseTrustPack,
    enterprise_evidence_validation: inputPaths.enterpriseEvidenceValidation,
    enterprise_procurement_gate: inputPaths.enterpriseProcurementGate,
    enterprise_execution_readiness: inputPaths.enterpriseExecutionReadiness,
    llm_security_audit: inputPaths.llmSecurityAudit,
    ai_action_inventory: inputPaths.aiActionInventory,
    ai_action_policy: inputPaths.aiActionPolicy,
    buyer_validation_crm: inputPaths.buyerCrm,
    buyer_validation_targets: inputPaths.buyerTargets,
    buyer_discovery_kit: inputPaths.buyerDiscoveryKit,
    buyer_evidence_validation: inputPaths.buyerEvidenceValidation,
    buyer_substitution_evidence_validation: inputPaths.buyerSubstitutionEvidenceValidation,
    buyer_execution_readiness: inputPaths.buyerExecutionReadiness,
    local_browser_route_proof: inputPaths.localBrowserRouteProof,
    market_niche_validation: inputPaths.marketNicheValidation,
    competitive_positioning_validation: inputPaths.competitivePositioningValidation,
    claim_consistency_validation: inputPaths.claimConsistencyValidation,
    owner_approval_validation: inputPaths.ownerApprovalValidation,
    production_state_verified: false,
    hosted_live_entry_count: hostedProofCount,
    hosted_state_verified: hostedProofReadyForBuyerSafeClaims,
    hosted_proof_validation_status: hostedProofValidationStatus,
    hosted_proof_executed_smoke_count: hostedProofExecutedSmokeCount,
    hosted_proof_passed_smoke_count: hostedProofPassedSmokeCount,
    hosted_proof_buyer_claim_allowed_count: hostedProofBuyerClaimAllowedCount,
    hosted_proof_core_coverage_ready_count: hostedProofCoreCoverageReadyCount,
    hosted_proof_core_coverage_group_count: hostedProofCoreCoverageGroupCount,
    hosted_proof_validation_release_hold_count: hostedProofReleaseHoldCount,
    hosted_proof_ready_for_buyer_safe_claims: hostedProofReadyForBuyerSafeClaims,
    hosted_smoke_execution_readiness_status: hostedSmokeExecutionReadinessStatus,
    hosted_smoke_owner_unblock_ready: hostedSmokeExecutionOwnerUnblockReady,
    hosted_smoke_execution_ready: hostedSmokeExecutionReady,
    hosted_smoke_proof_complete: hostedSmokeProofComplete,
    hosted_smoke_scripts_ready: hostedSmokeScriptsReady,
    hosted_smoke_evidence_register_ready: hostedSmokeEvidenceRegisterReady,
    hosted_smoke_local_route_baseline_ready: hostedSmokeLocalRouteBaselineReady,
    hosted_smoke_target_project_visible: hostedSmokeTargetProjectVisible,
    hosted_smoke_management_access_ready: hostedSmokeManagementAccessReady,
    hosted_smoke_stripe_proof_ready: hostedSmokeStripeProofReady,
    hosted_smoke_smoke_plan_count: hostedSmokeSmokePlanCount,
    hosted_smoke_script_present_count: hostedSmokeScriptPresentCount,
    hosted_smoke_evidence_register_row_count: hostedSmokeEvidenceRegisterRowCount,
    hosted_smoke_expected_smoke_count: hostedSmokeExpectedSmokeCount,
    hosted_smoke_executed_count: hostedSmokeExecutedCount,
    hosted_smoke_passed_count: hostedSmokePassedCount,
    hosted_smoke_core_coverage_ready_count: hostedSmokeCoreCoverageReadyCount,
    hosted_smoke_core_coverage_group_count: hostedSmokeCoreCoverageGroupCount,
    hosted_smoke_release_hold_count: hostedSmokeReleaseHoldCount,
    hosted_smoke_claim_allowed: hostedSmokeClaimAllowed,
    hosted_access_preflight_status: hostedAccessPreflightStatus,
    hosted_access_cli_available: hostedAccessCliAvailable,
    hosted_access_core_env_present: hostedAccessCoreEnvPresent,
    hosted_access_provider_key_present: hostedAccessProviderKeyPresent,
    hosted_access_stripe_proof_ready: hostedAccessStripeProofReady,
    hosted_access_projects_list_access: hostedAccessProjectsListAccess,
    hosted_access_listed_project_count: hostedAccessListedProjectCount,
    hosted_access_target_project_visible: hostedAccessTargetProjectVisible,
    hosted_access_functions_list_access: hostedAccessFunctionsListAccess,
    hosted_access_secrets_list_access: hostedAccessSecretsListAccess,
    hosted_access_management_access_ready: hostedAccessManagementAccessReady,
    hosted_access_ready_for_smoke: hostedAccessReadyForSmoke,
    hosted_access_claim_allowed: hostedAccessClaimAllowed,
    hosted_access_release_hold_count: hostedAccessReleaseHoldCount,
    pilot_package_readiness_status: pilotPackageReadinessStatus,
    pilot_package_ready_for_owner_review: pilotPackageReadyForOwnerReview,
    pilot_package_external_share_ready: pilotPackageExternalShareReady,
    pilot_package_selected_top_five_count: pilotPackageSelectedTopFiveCount,
    pilot_package_required_niche_count: pilotPackageRequiredNicheCount,
    pilot_package_owner_approved_count: pilotPackageOwnerApprovedCount,
    pilot_package_owner_required_count: pilotPackageOwnerRequiredCount,
    pilot_package_buyer_validation_verified: pilotPackageBuyerValidationVerified,
    pilot_package_hosted_proof_complete: pilotPackageHostedProofComplete,
    pilot_package_world_class_prediction_claim_allowed: pilotPackageWorldClassPredictionClaimAllowed,
    local_browser_route_proof_status: localBrowserRouteProof.status ?? 'missing',
    local_browser_route_count: localBrowserRouteCount,
    local_browser_route_ready_count: localBrowserRouteReadyCount,
    local_browser_route_runtime_error_count: localBrowserRouteRuntimeErrorCount,
    local_browser_route_hosted_live_proof: localBrowserHostedProof,
    market_niche_validation_status: marketNicheValidationStatus,
    market_niche_count: marketNicheCount,
    market_niche_required_count: marketNicheRequiredCount,
    market_niche_source_alignment_count: marketNicheSourceAlignmentCount,
    market_niche_current_research_anchor_count: marketNicheResearchAnchorCount,
    market_niche_substitution_matrix_count: marketNicheSubstitutionCount,
    market_niche_local_route_signal_ready_count: marketNicheRouteSignalReadyCount,
    market_niche_release_hold_count: marketNicheReleaseHoldCount,
    market_niche_buyer_safe_pilot_claim_allowed: marketNicheBuyerSafePilotClaimAllowed,
    market_niche_buyer_validated_claim_allowed: marketNicheBuyerValidatedClaimAllowed,
    market_niche_hosted_live_claim_allowed: marketNicheHostedLiveClaimAllowed,
    market_niche_enterprise_ready_claim_allowed: marketNicheEnterpriseReadyClaimAllowed,
    market_niche_accuracy_claim_allowed: marketNicheAccuracyClaimAllowed,
    market_niche_world_class_prediction_claim_allowed: marketNicheWorldClassPredictionClaimAllowed,
    competitive_positioning_validation_status: competitivePositioningValidationStatus,
    competitive_market_signal_row_count: competitiveMarketSignalRowCount,
    competitive_current_source_count: competitiveCurrentSourceCount,
    competitive_substitute_row_count: competitiveSubstituteRowCount,
    competitive_required_category_count: competitiveRequiredCategoryCount,
    competitive_required_category_present_count: competitiveRequiredCategoryPresentCount,
    competitive_loophole_row_count: competitiveLoopholeRowCount,
    competitive_buyer_plan_row_count: competitiveBuyerPlanRowCount,
    competitive_release_hold_count: competitiveReleaseHoldCount,
    competitive_wedge_claim_allowed: competitiveWedgeClaimAllowed,
    competitive_replacement_claim_allowed: competitiveReplacementClaimAllowed,
    competitive_data_breadth_claim_allowed: competitiveDataBreadthClaimAllowed,
    competitive_palantir_equivalence_claim_allowed: competitivePalantirEquivalenceClaimAllowed,
    competitive_expert_advisory_replacement_claim_allowed: competitiveExpertAdvisoryReplacementClaimAllowed,
    competitive_forecasting_parity_claim_allowed: competitiveForecastingParityClaimAllowed,
    competitive_world_class_prediction_claim_allowed: competitiveWorldClassPredictionClaimAllowed,
    claim_consistency_validation_status: claimConsistencyValidationStatus,
    claim_consistency_scanned_file_count: claimConsistencyScannedFileCount,
    claim_consistency_scanned_line_count: claimConsistencyScannedLineCount,
    claim_consistency_detected_claim_mention_count: claimConsistencyDetectedMentionCount,
    claim_consistency_boundary_context_claim_mention_count: claimConsistencyBoundaryMentionCount,
    claim_consistency_unsupported_claim_mention_count: claimConsistencyUnsupportedMentionCount,
    claim_consistency_unsupported_p1_claim_mention_count: claimConsistencyUnsupportedP1Count,
    claim_consistency_unsupported_p2_claim_mention_count: claimConsistencyUnsupportedP2Count,
    claim_consistency_ready: claimConsistencyReady,
    claim_consistency_world_class_prediction_claim_blocked: claimConsistencyWorldClassBlocked,
    claim_consistency_accuracy_claim_blocked: claimConsistencyAccuracyBlocked,
    claim_consistency_buyer_validated_claim_blocked: claimConsistencyBuyerValidatedBlocked,
    claim_consistency_hosted_live_claim_blocked: claimConsistencyHostedLiveBlocked,
    claim_consistency_enterprise_ready_claim_blocked: claimConsistencyEnterpriseReadyBlocked,
    claim_consistency_competitive_replacement_or_parity_claim_blocked: claimConsistencyCompetitiveBlocked,
    claim_consistency_commercial_ready_claim_blocked: claimConsistencyCommercialReadyBlocked,
    owner_approval_validation_status: ownerApprovalValidationStatus,
    owner_approval_required_count: ownerApprovalRequiredCount,
    owner_approval_approved_count: ownerApprovalApprovedCount,
    owner_approval_row_error_count: ownerApprovalRowErrorCount,
    owner_approval_ready_for_downstream_evidence: ownerApprovalReadyForDownstreamEvidence,
    owner_approval_commercial_ready_claim_allowed: ownerApprovalCommercialReadyClaimAllowed,
    owner_approval_world_class_prediction_claim_allowed: ownerApprovalWorldClassPredictionClaimAllowed,
    owner_approval_hosted_live_claim_allowed: ownerApprovalHostedLiveClaimAllowed,
    owner_approval_buyer_validated_claim_allowed: ownerApprovalBuyerValidatedClaimAllowed,
    owner_approval_enterprise_ready_claim_allowed: ownerApprovalEnterpriseReadyClaimAllowed,
    buyer_validation_verified: realBuyerRows.length >= 10,
    ai_action_inventory_status: aiActionInventory.status ?? 'missing',
    ai_action_surface_count: aiActionSurfaceCount,
    ai_high_impact_product_action_count: aiHighImpactActionCount,
    ai_direct_llm_to_irreversible_action_count: aiDirectIrreversibleActionCount,
    ai_hosted_verified_count: aiHostedVerifiedCount,
    ai_action_policy_status: aiActionPolicy.status ?? 'missing',
    ai_policy_surface_count: aiPolicySurfaceCount,
    ai_approval_required_surface_count: aiApprovalRequiredSurfaceCount,
    ai_hosted_boundary_test_count: aiHostedBoundaryTestCount,
    ai_static_boundary_test_count: aiStaticBoundaryTestCount,
    ai_owner_approved_policy_count: aiOwnerApprovedPolicyCount,
    ai_hosted_verified_test_count: aiHostedVerifiedTestCount,
    enterprise_procurement_gate_status: enterpriseProcurementGate.status ?? 'missing',
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
    enterprise_procurement_required_document_count: enterpriseProcurementDocumentCount,
    enterprise_procurement_missing_document_count: enterpriseProcurementMissingDocumentCount,
    enterprise_external_share_approved_artifact_count: enterpriseExternalShareApprovedCount,
    enterprise_procurement_release_hold_count: enterpriseProcurementReleaseHoldCount,
    enterprise_execution_readiness_status: enterpriseExecutionReadinessStatus,
    enterprise_execution_trust_pack_ready: enterpriseExecutionTrustPackReady,
    enterprise_execution_questionnaire_row_count: enterpriseExecutionQuestionnaireRowCount,
    enterprise_execution_trust_domain_count: enterpriseExecutionTrustDomainCount,
    enterprise_execution_acceptance_gate_count: enterpriseExecutionAcceptanceGateCount,
    enterprise_execution_procurement_register_ready: enterpriseExecutionProcurementRegisterReady,
    enterprise_execution_required_document_count: enterpriseExecutionRequiredDocumentCount,
    enterprise_execution_ready_document_count: enterpriseExecutionReadyDocumentCount,
    enterprise_execution_missing_document_count: enterpriseExecutionMissingDocumentCount,
    enterprise_execution_external_share_approved_count: enterpriseExecutionExternalShareApprovedCount,
    enterprise_execution_evidence_ready_for_review: enterpriseExecutionEvidenceReadyForReview,
    enterprise_execution_procurement_gate_ready: enterpriseExecutionProcurementGateReady,
    enterprise_execution_rls_plan_ready: enterpriseExecutionRlsPlanReady,
    enterprise_execution_rls_expected_row_count: enterpriseExecutionRlsExpectedRowCount,
    enterprise_execution_rls_executed_row_count: enterpriseExecutionRlsExecutedRowCount,
    enterprise_execution_rls_proof_ready: enterpriseExecutionRlsProofReady,
    enterprise_execution_local_llm_red_team_passed: enterpriseExecutionLocalLlmRedTeamPassed,
    enterprise_execution_hosted_llm_runtime_proof_ready: enterpriseExecutionHostedLlmRuntimeProofReady,
    enterprise_execution_ai_action_inventory_ready: enterpriseExecutionAiActionInventoryReady,
    enterprise_execution_ai_action_policy_ready: enterpriseExecutionAiActionPolicyReady,
    enterprise_execution_ai_owner_approved_policy_count: enterpriseExecutionAiOwnerApprovedPolicyCount,
    enterprise_execution_ai_hosted_verified_test_count: enterpriseExecutionAiHostedVerifiedTestCount,
    enterprise_execution_hosted_access_ready: enterpriseExecutionHostedAccessReady,
    enterprise_execution_hosted_proof_ready: enterpriseExecutionHostedProofReady,
    enterprise_execution_claim_consistency_ready: enterpriseExecutionClaimConsistencyReady,
    enterprise_execution_release_hold_count: enterpriseExecutionReleaseHoldCount,
    enterprise_execution_ready_for_owner_trust_review: enterpriseExecutionReadyForOwnerTrustReview,
    enterprise_execution_proof_ready_for_owner_claim_review: enterpriseExecutionProofReadyForOwnerClaimReview,
    enterprise_execution_enterprise_ready_claim_allowed: enterpriseExecutionEnterpriseReadyClaimAllowed,
    forecast_claim_governance_status: forecastClaimGovernance.status ?? 'missing',
    accuracy_input_validation_status: accuracyInputValidationStatus,
    accuracy_input_validation_ready_for_scoring: accuracyInputValidationReadyForScoring,
    accuracy_input_validation_valid_forecast_count: accuracyInputValidationValidForecastCount,
    accuracy_input_validation_valid_baseline_count: accuracyInputValidationValidBaselineCount,
    accuracy_input_validation_release_hold_count: accuracyInputValidationReleaseHoldCount,
    leakage_review_validation_status: leakageReviewValidationStatus,
    leakage_review_ready_control_count: leakageReviewReadyControlCount,
    leakage_review_required_control_count: leakageReviewRequiredControlCount,
    leakage_review_valid_forecast_count: leakageReviewValidForecastCount,
    leakage_review_valid_baseline_count: leakageReviewValidBaselineCount,
    leakage_review_unresolved_issue_total: leakageReviewUnresolvedIssueTotal,
    leakage_review_high_or_critical_risk_count: leakageReviewHighRiskCount,
    leakage_review_release_hold_count: leakageReviewReleaseHoldCount,
    leakage_review_ready_for_accuracy_claim_review: leakageReviewReadyForAccuracyClaim,
    leakage_review_passed: leakageReviewPassed,
    scoring_validation_status: scoringValidationStatus,
    scoring_validation_included_point_count: scoringValidationIncludedPointCount,
    scoring_validation_max_source_sample_size: scoringValidationMaxSourceSampleSize,
    scoring_validation_baseline_count: scoringValidationBaselineCount,
    scoring_validation_comparison_count: scoringValidationComparisonCount,
    scoring_validation_release_hold_count: scoringValidationReleaseHoldCount,
    scoring_output_ready_for_claim_review: scoringOutputReadyForClaimReview,
    prediction_science_validation_status: predictionScienceValidationStatus,
    prediction_science_source_count: predictionScienceSourceCount,
    prediction_science_protocol_stage_count: predictionScienceProtocolStageCount,
    prediction_science_metric_count: predictionScienceMetricCount,
    prediction_science_claim_tier_count: predictionScienceClaimTierCount,
    prediction_science_governance_threshold_count: predictionScienceGovernanceThresholdCount,
    prediction_science_valid_resolved_forecast_count: predictionScienceValidResolvedForecastCount,
    prediction_science_real_resolved_outcome_count: predictionScienceRealResolvedOutcomeCount,
    prediction_science_valid_baseline_count: predictionScienceValidBaselineCount,
    prediction_science_real_baseline_comparison_count: predictionScienceRealBaselineComparisonCount,
    prediction_science_release_hold_count: predictionScienceReleaseHoldCount,
    prediction_science_framework_alignment_ready: predictionScienceFrameworkAlignmentReady,
    prediction_science_ready_for_claim_review: predictionScienceReadyForClaimReview,
    prediction_science_mechanics_only_claim_allowed: predictionScienceMechanicsOnlyClaimAllowed,
    prediction_science_accuracy_claim_allowed: predictionScienceAccuracyClaimAllowed,
    prediction_science_world_class_prediction_claim_allowed: predictionScienceWorldClassPredictionClaimAllowed,
    forecast_execution_readiness_status: forecastExecutionReadinessStatus,
    forecast_execution_required_surface_count: forecastExecutionRequiredSurfaceCount,
    forecast_execution_present_surface_count: forecastExecutionPresentSurfaceCount,
    forecast_execution_repo_surface_ready: forecastExecutionRepoSurfaceReady,
    forecast_execution_template_count: forecastExecutionTemplateCount,
    forecast_execution_template_ready_count: forecastExecutionTemplateReadyCount,
    forecast_execution_owner_templates_ready: forecastExecutionOwnerTemplatesReady,
    forecast_execution_valid_resolved_forecast_count: forecastExecutionValidResolvedForecastCount,
    forecast_execution_real_resolved_outcome_count: forecastExecutionRealResolvedOutcomeCount,
    forecast_execution_valid_baseline_count: forecastExecutionValidBaselineCount,
    forecast_execution_real_baseline_comparison_count: forecastExecutionRealBaselineComparisonCount,
    forecast_execution_leakage_review_passed: forecastExecutionLeakagePassed,
    forecast_execution_scoring_output_ready_for_claim_review: forecastExecutionScoringReady,
    forecast_execution_hosted_access_ready_for_smoke: forecastExecutionHostedAccessReady,
    forecast_execution_rls_tenant_isolation_proof_ready: forecastExecutionRlsReady,
    forecast_execution_release_hold_count: forecastExecutionReleaseHoldCount,
    forecast_execution_ready_for_owner_resolved_export: forecastExecutionReadyForOwnerExport,
    forecast_execution_scoring_chain_ready_for_owner_claim_review: forecastExecutionScoringChainReady,
    forecast_execution_accuracy_claim_allowed: forecastExecutionAccuracyClaimAllowed,
    forecast_execution_world_class_prediction_claim_allowed: forecastExecutionWorldClassPredictionClaimAllowed,
    rls_proof_validation_status: rlsProofValidationStatus,
    rls_proof_expected_case_environment_count: rlsProofExpectedCaseEnvironmentCount,
    rls_proof_executed_count: rlsProofExecutedCount,
    rls_proof_local_ready_count: rlsProofLocalReadyCount,
    rls_proof_linked_ready_count: rlsProofLinkedReadyCount,
    rls_proof_release_hold_count: rlsProofReleaseHoldCount,
    rls_proof_ready_for_security_claim: rlsProofReadyForSecurityClaim,
    rls_tenant_isolation_claim_allowed: rlsProofTenantIsolationClaimAllowed,
    forecast_claim_threshold_count: forecastClaimThresholdCount,
    forecast_claim_release_hold_count: forecastClaimReleaseHoldCount,
    forecast_real_resolved_outcome_count: realResolvedOutcomeCount,
    forecast_real_baseline_comparison_count: realBaselineComparisonCount,
    forecast_world_class_claim_approved: worldClassClaimApproved,
    buyer_proof_gate: inputPaths.buyerProofGate,
    buyer_evidence_validation_status: buyerEvidenceValidationStatus,
    buyer_evidence_ready_for_proof_gate: buyerEvidenceValidationReady,
    buyer_evidence_real_interaction_count: buyerEvidenceRealInteractionCount,
    buyer_evidence_valid_completed_call_count: buyerEvidenceValidCompletedCallCount,
    buyer_evidence_valid_outcome_capture_count: buyerEvidenceValidOutcomeCaptureCount,
    buyer_evidence_valid_qualified_followup_count: buyerEvidenceValidQualifiedFollowupCount,
    buyer_evidence_valid_commitment_signal_count: buyerEvidenceValidCommitmentSignalCount,
    buyer_evidence_release_hold_count: buyerEvidenceReleaseHoldCount,
    buyer_substitution_evidence_validation_status: buyerSubstitutionEvidenceValidationStatus,
    buyer_substitution_protocol_ready: buyerSubstitutionProtocolReady,
    buyer_substitution_evidence_ready_for_proof_gate: buyerSubstitutionEvidenceReady,
    buyer_substitution_real_interaction_count: buyerSubstitutionRealInteractionCount,
    buyer_substitution_valid_completed_call_count: buyerSubstitutionValidCompletedCallCount,
    buyer_substitution_completed_niche_count: buyerSubstitutionCompletedNicheCount,
    buyer_substitution_valid_qualified_outcome_count: buyerSubstitutionQualifiedOutcomeCount,
    buyer_substitution_valid_commitment_signal_count: buyerSubstitutionCommitmentSignalCount,
    buyer_substitution_release_hold_count: buyerSubstitutionReleaseHoldCount,
    buyer_proof_gate_status: buyerProofGate.status ?? 'missing',
    buyer_proof_acceptance_gate_count: buyerProofAcceptanceGateCount,
    buyer_proof_release_hold_count: buyerProofReleaseHoldCount,
    buyer_completed_call_with_required_fields_count: buyerCompletedCallCount,
    buyer_qualified_followup_count: buyerQualifiedFollowupCount,
    buyer_paid_pilot_loi_or_procurement_signal_count: buyerPaidLoiProcurementSignalCount,
    buyer_execution_readiness_status: buyerExecutionReadinessStatus,
    buyer_execution_ready_for_owner_outreach: buyerExecutionReadyForOwnerOutreach,
    buyer_execution_target_count: buyerExecutionTargetCount,
    buyer_execution_selected_target_count: buyerExecutionSelectedTargetCount,
    buyer_execution_priority_niche_count: buyerExecutionPriorityNicheCount,
    buyer_execution_selected_priority_niche_count: buyerExecutionSelectedPriorityNicheCount,
    buyer_execution_call_sheet_priority_niche_count: buyerExecutionCallSheetPriorityNicheCount,
    buyer_execution_call_sheet_row_count: buyerExecutionCallSheetRowCount,
    buyer_execution_crm_row_count: buyerExecutionCrmRowCount,
    buyer_execution_release_hold_count: buyerExecutionReleaseHoldCount,
    buyer_execution_buyer_validated_claim_allowed: buyerExecutionBuyerValidatedClaimAllowed
  },
  posture: {
    launch_decision: evidence.launch_decision ?? 'unknown',
    pilot_strategy_confidence_percent: pilotStrategyConfidence,
    commercial_world_class_confidence_percent: commercialWorldClassConfidence,
    target_confidence_percent: 95,
    confidence_gap_percent: round(95 - commercialWorldClassConfidence, 1),
    decision: commercialWorldClassConfidence >= 95 ? 'ready_for_commercial_ready_review' : 'not_95_confident',
    recommended_market_language: 'governed strategic-intelligence pilot with calibration-aware decision support',
    prohibited_market_language: 'world-class accurate predictions'
  },
  dimensions: dimensions.map((dimension) => ({
    ...dimension,
    weighted_contribution_percent: round((dimension.current_score_percent * dimension.weight_percent) / totalWeight, 2)
  })),
  primary_blockers: blockerOrder.map((dimension, index) => ({
    rank: index + 1,
    id: dimension.id,
    label: dimension.label,
    current_score_percent: dimension.current_score_percent,
    weight_percent: dimension.weight_percent,
    missing_evidence: dimension.required_to_reach_95
  })),
  external_framework_alignment: [
    {
      framework: 'NIST AI RMF',
      source_url: 'https://www.nist.gov/itl/ai-risk-management-framework',
      implication: 'Treat governance, measurement, managed risk, and critical-infrastructure trust evidence as proof gates, not marketing copy.',
      proof_status: predictionScienceFrameworkAlignmentReady && claimConsistencyReady
        ? 'mapped_open_real_measurement_and_runtime_evidence_missing'
        : 'open_framework_mapping_or_claim_boundary_incomplete',
      current_evidence: `claim_consistency_ready=${claimConsistencyReady}; prediction_science_framework_alignment_ready=${predictionScienceFrameworkAlignmentReady}; commercial_world_class_confidence=${commercialWorldClassConfidence}%.`,
      missing_proof: 'Real resolved outcomes, comparable baselines, hosted/runtime monitoring evidence, RLS proof, and owner-approved claim language.',
      claim_boundary: 'Supports governed pilot framing only; does not prove trustworthy deployed AI management or world-class prediction accuracy.'
    },
    {
      framework: 'NIST SSDF SP 800-218',
      source_url: 'https://csrc.nist.gov/pubs/sp/800/218/final',
      implication: 'Enterprise procurement should see repeatable secure-development, vulnerability, and acquisition evidence rather than broad security claims.',
      proof_status: enterpriseExecutionReadyForOwnerTrustReview
        ? 'mapped_owner_documents_and_runtime_security_proof_missing'
        : 'open_enterprise_execution_readiness_incomplete',
      current_evidence: `enterprise_execution_ready_for_owner_trust_review=${enterpriseExecutionReadyForOwnerTrustReview}; RLS executed rows=${enterpriseExecutionRlsExecutedRowCount}/${enterpriseExecutionRlsExpectedRowCount}; ready procurement documents=${enterpriseExecutionReadyDocumentCount}/${enterpriseExecutionRequiredDocumentCount}.`,
      missing_proof: 'Owner-approved procurement documents, RLS pgTAP/local/linked execution, hosted smoke evidence, incident/support/privacy controls, and external-share approvals.',
      claim_boundary: 'Do not claim enterprise-ready or secure-development maturity from static repo evidence alone.'
    },
    {
      framework: 'CISA Secure by Design and Secure by Demand',
      source_url: 'https://www.cisa.gov/resources-tools/resources/secure-demand-guide',
      implication: 'Use supplier security questions to separate current proof, missing proof, owner actions, and buyer-safe claims.',
      proof_status: enterpriseExecutionReadyForOwnerTrustReview
        ? 'supplier_security_review_packet_ready_missing_owner_runtime_evidence'
        : 'open_supplier_security_packet_incomplete',
      current_evidence: `enterprise trust gate=${enterpriseExecutionReadinessStatus}; procurement gate=${enterpriseProcurementGate.status ?? 'missing'}; owner approvals=${ownerApprovalApprovedCount}/${ownerApprovalRequiredCount}.`,
      missing_proof: 'Owner-completed supplier questionnaire, hosted proof, redacted logs, RLS evidence, AI runtime policy approval, and no-secrets external-share review.',
      claim_boundary: 'Buyer security review can be prepared; buyer-facing security claims stay blocked until owner/runtime proof exists.'
    },
    {
      framework: 'OWASP GenAI/LLM Top 10 2025',
      source_url: 'https://genai.owasp.org/llm-top-10/',
      implication: 'LLM security proof must cover prompt injection, sensitive information disclosure, output handling, supply chain, excessive agency, and unbounded consumption.',
      proof_status: llmLocalTestsPassed
        ? 'local_red_team_passed_hosted_runtime_missing'
        : 'open_static_or_local_llm_security_proof_incomplete',
      current_evidence: `LLM local fixtures passed=${llmLocalPassedFixtureCount}/${llmFixtureCount}; hosted runtime fixtures executed=${llmExecutedFixtureCount}; AI hosted boundary tests=${aiHostedVerifiedTestCount}.`,
      missing_proof: 'Owner-approved hosted LLM red-team smoke, hosted no-autonomous-action tests, redacted logs, and approved high-impact action policy.',
      claim_boundary: 'Local/static security proof can support internal readiness only; hosted/public-sector LLM security claims remain blocked.'
    },
    {
      framework: 'ISO/IEC 42001:2023',
      source_url: 'https://www.iso.org/standard/81230.html',
      implication: 'AI governance can be mapped for readiness, but certification or an audited AI management system cannot be claimed from repo artifacts alone.',
      proof_status: ownerApprovalReadyForDownstreamEvidence
        ? 'owner_governance_approvals_ready_audit_evidence_still_missing'
        : 'open_owner_governance_approvals_missing',
      current_evidence: `owner approval status=${ownerApprovalValidationStatus}; owner approvals=${ownerApprovalApprovedCount}/${ownerApprovalRequiredCount}; enterprise_ready_claim_allowed=${ownerApprovalEnterpriseReadyClaimAllowed}.`,
      missing_proof: 'Audited AI management-system scope, risk register, accountable owners, monitoring evidence, document control, and certification/audit evidence if any certification is claimed.',
      claim_boundary: 'Do not imply ISO certification, audited AI management system, or enterprise AI governance maturity.'
    },
    {
      framework: 'EU AI Act risk controls',
      source_url: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj',
      implication: 'Worldwide public-sector and enterprise buyers need clear risk classification, human oversight, logging, accuracy, robustness, cybersecurity, and high-impact action boundaries.',
      proof_status: aiActionInventoryReady && aiActionPolicyReady
        ? 'risk_controls_mapped_owner_approval_and_hosted_tests_missing'
        : 'open_risk_classification_and_action_policy_incomplete',
      current_evidence: `AI action inventory ready=${aiActionInventoryReady}; AI action policy ready=${aiActionPolicyReady}; owner-approved policies=${aiOwnerApprovedPolicyCount}; hosted verified tests=${aiHostedVerifiedTestCount}.`,
      missing_proof: 'Owner-approved AI action policy, hosted no-autonomous-action tests, logging/monitoring evidence, human oversight proof, and jurisdiction-specific legal review before regulated-market claims.',
      claim_boundary: 'Supports internal risk-control planning only; not EU AI Act compliance proof.'
    },
    {
      framework: 'FTC AI claims substantiation guidance',
      source_url: 'https://www.ftc.gov/business-guidance/blog/2023/02/keep-your-ai-claims-check',
      implication: 'Marketing claims about AI capability, superiority, accuracy, replacement, or readiness must be substantiated before they are shown externally.',
      proof_status: claimConsistencyReady && claimConsistencyUnsupportedMentionCount === 0
        ? 'pilot_only_claim_boundary_passed_unsupported_claims_zero'
        : 'open_unsupported_claims_present_or_claim_scan_incomplete',
      current_evidence: `unsupported claim mentions=${claimConsistencyUnsupportedMentionCount}; scanned files=${claimConsistencyScannedFileCount}; claim_consistency_ready=${claimConsistencyReady}.`,
      missing_proof: 'Owner-approved external claim language plus buyer validation, hosted proof, enterprise proof, and real forecast scoring before stronger market claims.',
      claim_boundary: 'Use governed pilot language; block world-class, accuracy, replacement, hosted-live, buyer-validated, and enterprise-ready claims.'
    },
    {
      framework: 'Metaculus FutureEval',
      source_url: 'https://www.metaculus.com/futureeval/methodology/',
      implication: 'Forecasting claims need resolved outcomes and comparison against human/community/pro or model baselines.',
      proof_status: forecastExecutionScoringChainReady
        ? 'scoring_chain_ready_pending_owner_claim_review'
        : 'open_real_resolved_outcomes_and_baselines_missing',
      current_evidence: `valid/real resolved outcomes=${forecastExecutionValidResolvedForecastCount}/${forecastExecutionRealResolvedOutcomeCount}; valid/real baselines=${forecastExecutionValidBaselineCount}/${forecastExecutionRealBaselineComparisonCount}; scoring_chain_ready=${forecastExecutionScoringChainReady}.`,
      missing_proof: 'Owner-approved resolved forecast export, comparable baselines, leakage review, calibration ledger, benchmark comparison, and claim-governance approval.',
      claim_boundary: 'Forecasting mechanics are present; world-class or benchmark-superiority prediction claims remain blocked.'
    },
    {
      framework: 'ForecastBench',
      source_url: 'https://www.forecastbench.org/about/',
      implication: 'World-class AI forecasting claims require dynamic, contamination-resistant benchmarks and human accuracy references.',
      proof_status: scoringOutputReadyForClaimReview && predictionScienceReadyForClaimReview
        ? 'forecast_scoring_ready_pending_independent_or_owner_claim_review'
        : 'open_sample_only_or_no_real_scoring_evidence',
      current_evidence: `scoring validation=${scoringValidationStatus}; included points=${scoringValidationIncludedPointCount}; comparisons=${scoringValidationComparisonCount}; prediction_science_ready_for_claim_review=${predictionScienceReadyForClaimReview}.`,
      missing_proof: 'Dynamic/future-event benchmark set, contamination/leakage controls, comparable human/community/pro baselines, sufficient sample size, and owner-approved external claim language.',
      claim_boundary: 'Sample fixtures and static benchmark mechanics cannot support world-class forecasting claims.'
    },
    {
      framework: 'TRIPOD+AI reporting discipline',
      source_url: 'https://www.tripod-statement.org/',
      implication: 'Prediction-model claims should report intended use, data provenance, participants/events, predictors, model versioning, performance, uncertainty, limitations, and external validation.',
      proof_status: predictionScienceFrameworkAlignmentReady
        ? 'reporting_structure_mapped_real_validation_missing'
        : 'open_prediction_reporting_structure_incomplete',
      current_evidence: `protocol stages=${predictionScienceProtocolStageCount}; metrics=${predictionScienceMetricCount}; claim tiers=${predictionScienceClaimTierCount}; real resolved outcomes=${predictionScienceRealResolvedOutcomeCount}.`,
      missing_proof: 'Real validation cohort/question set, external validation or comparable benchmark, performance uncertainty, data provenance, limitations, and owner-approved claim review.',
      claim_boundary: 'Used as reporting rigor guidance only; not a direct domain certification for geopolitical or strategic forecasts.'
    }
  ],
  next_loop_order: [
    `Use ${inputPaths.pilotOfferPack} as the buyer-safe offer contract before discovery or demo calls.`,
    pilotPackageReadinessStatus !== 'missing'
      ? `Use ${inputPaths.pilotPackageReadiness} as the package coherence gate before owner review; current status ${pilotPackageReadinessStatus}, package_ready_for_owner_review=${pilotPackageReadyForOwnerReview}, external_share_ready=${pilotPackageExternalShareReady}, and owner_approved=${pilotPackageOwnerApprovedCount}/${pilotPackageOwnerRequiredCount}.`
      : `Run npm run audit:pilot:package-readiness after the pilot offer, market, buyer, local-route, source-freshness, and claim gates so the sellable package is checked before owner review.`,
    marketNicheValidationStatus !== 'missing'
      ? `Use ${inputPaths.marketNicheValidation} to keep the five-niche market thesis buyer-safe; current status ${marketNicheValidationStatus} and buyer_safe_pilot_claim_allowed=${marketNicheBuyerSafePilotClaimAllowed}.`
      : `Run npm run audit:market:validate-niches after the pilot offer pack so the five-niche market thesis is checked against current sources, route proof, and claim boundaries.`,
    competitivePositioningValidationStatus !== 'missing'
      ? `Use ${inputPaths.competitivePositioningValidation} to keep competitor/substitute positioning constrained; current status ${competitivePositioningValidationStatus}, defensible_competitive_wedge_claim_allowed=${competitiveWedgeClaimAllowed}, replacement_claim_allowed=${competitiveReplacementClaimAllowed}, and forecasting_parity_claim_allowed=${competitiveForecastingParityClaimAllowed}.`
      : `Run npm run audit:market:validate-competitive-positioning after the market differentiation artifact so competitor/substitute claims are checked before buyer-facing copy.`,
    claimConsistencyValidationStatus !== 'missing'
      ? `Use ${inputPaths.claimConsistencyValidation} before external-share packaging; current status ${claimConsistencyValidationStatus}, unsupported_claim_mentions=${claimConsistencyUnsupportedMentionCount}, and claim_consistency_ready=${claimConsistencyReady}.`
      : `Run npm run audit:claims:consistency before outreach, decks, or public launch docs so generated artifacts cannot drift beyond active proof gates.`,
    `Use ${inputPaths.ownerApprovalValidation} as the consolidated owner approval gate before downstream owner/buyer/hosted/security evidence runs; current status ${ownerApprovalValidationStatus}, owner_approved=${ownerApprovalApprovedCount}/${ownerApprovalRequiredCount}, ready_for_downstream_evidence=${ownerApprovalReadyForDownstreamEvidence}, and commercial_ready_claim_allowed=${ownerApprovalCommercialReadyClaimAllowed}.`,
    buyerExecutionReadinessStatus !== 'missing'
      ? `Use ${inputPaths.buyerExecutionReadiness} before owner outreach; current status ${buyerExecutionReadinessStatus}, execution_ready_for_owner_outreach=${buyerExecutionReadyForOwnerOutreach}, selected_priority_niche_coverage=${buyerExecutionSelectedPriorityNicheCount}/${buyerExecutionPriorityNicheCount}, and buyer_validated_claim_allowed=${buyerExecutionBuyerValidatedClaimAllowed}.`
      : `Run npm run audit:buyer:execution-readiness after the discovery kit so the selected slate covers the validated top-five niches before owner-approved outreach.`,
    buyerProofGateReady
      ? `Use ${inputPaths.buyerProofGate} to classify discovery outcomes before upgrading buyer-validation or willingness-to-pay claims.`
      : 'Run npm run audit:buyer:proof-gate to create the buyer-validation release-hold checklist.',
    `Use ${inputPaths.buyerEvidenceValidation} to validate CRM/call-sheet input quality before buyer proof-gate upgrades; current status ${buyerEvidenceValidationStatus}.`,
    `Use ${inputPaths.buyerSubstitutionEvidenceValidation} to validate owner-filled substitute-vs-wedge outcomes before replacement, parity, buyer-validation, or willingness-to-pay claims are upgraded; current status ${buyerSubstitutionEvidenceValidationStatus}, real_substitution_interactions=${buyerSubstitutionRealInteractionCount}, and ready_for_buyer_proof_gate=${buyerSubstitutionEvidenceReady}.`,
    `Use ${inputPaths.buyerTargets}, ${inputPaths.buyerDiscoveryKit}, and ${inputPaths.buyerCrm} as the buyer-validation ordering gate.`,
    'Owner approves or edits the 10-target discovery slate before any external contact.',
    'Run approved discovery calls and record buyer role, proof shown, objection, next action, and willingness-to-pay signal in the call sheet/CRM.',
    localBrowserRouteProofReady
      ? `Use ${inputPaths.localBrowserRouteProof} as local route-render proof only; do not upgrade it to live proof without hosted screenshots/logs.`
      : `Run npm run audit:local:route-smoke and npm run audit:local:browser-route-proof to capture repeatable local route proof for the top-five niche routes.`,
    hostedAccessPreflightStatus !== 'missing'
      ? `Use ${inputPaths.hostedAccessPreflight} before Browser/hosted smoke; current status ${hostedAccessPreflightStatus}, functions_access=${hostedAccessFunctionsListAccess}, secrets_access=${hostedAccessSecretsListAccess}, hosted_access_ready_for_smoke=${hostedAccessReadyForSmoke}, and hosted_claim_allowed=${hostedAccessClaimAllowed}.`
      : `Run npm run audit:hosted:access-preflight before Browser/hosted smoke so access privileges and payment-proof blockers are explicit.`,
    hostedSmokeExecutionReadinessStatus !== 'missing'
      ? `Use ${inputPaths.hostedSmokeExecutionReadiness} as the Browser/hosted smoke owner-unblock gate; current status ${hostedSmokeExecutionReadinessStatus}, owner_unblock_ready=${hostedSmokeExecutionOwnerUnblockReady}, hosted_smoke_execution_ready=${hostedSmokeExecutionReady}, hosted_proof_complete=${hostedSmokeProofComplete}, and hosted_claim_allowed=${hostedSmokeClaimAllowed}.`
      : `Run npm run audit:hosted:smoke-execution-readiness after access preflight and proof validation so hosted smoke blockers are explicit before Browser or Playwright hosted runs.`,
    `Use ${inputPaths.hostedProofKit} and its evidence template to capture hosted demo proof after owner-approved hosted access, deploy state, and secrets.`,
    `Use ${inputPaths.hostedProofValidation} to validate deploy binding, redacted logs/screenshots, core hosted coverage, and buyer-claim flags before any hosted-live claim is upgraded; current status ${hostedProofValidationStatus}.`,
    `Use ${inputPaths.enterpriseTrustPack} and its security questionnaire to review procurement/security objections before any enterprise or public-sector pilot claim is upgraded.`,
    enterpriseProcurementGateReady
      ? `Use ${inputPaths.enterpriseProcurementGate} to clear privacy, retention, DPA, support/SLA, incident, and external-share approval holds before enterprise-ready claims.`
      : 'Run npm run audit:enterprise:procurement-gate to create the privacy/support/SLA procurement release-hold checklist.',
    enterpriseExecutionReadinessStatus !== 'missing'
      ? `Use ${inputPaths.enterpriseExecutionReadiness} as the owner procurement/security review gate; current status ${enterpriseExecutionReadinessStatus}, execution_ready_for_owner_trust_review=${enterpriseExecutionReadyForOwnerTrustReview}, enterprise_proof_ready_for_owner_claim_review=${enterpriseExecutionProofReadyForOwnerClaimReview}, and enterprise_ready_claim_allowed=${enterpriseExecutionEnterpriseReadyClaimAllowed}.`
      : `Run npm run audit:enterprise:execution-readiness after enterprise procurement gate generation so trust-pack, procurement docs, RLS execution, LLM security, AI action policy, hosted proof, and claim boundaries are checked together.`,
    `Use ${inputPaths.enterpriseEvidenceValidation} to validate owner procurement evidence rows before enterprise proof-gate upgrades; current status ${enterpriseEvidenceValidationStatus}.`,
    llmLocalTestsPassed
      ? `Use ${inputPaths.llmSecurityAudit} and the local red-team report to prepare owner-approved hosted LLM security smoke with redacted evidence.`
      : `Use ${inputPaths.llmSecurityAudit} and its red-team fixtures to convert static LLM security coverage into executed prompt-injection, sensitive-disclosure, output-handling, excessive-agency, misinformation, and unbounded-consumption tests.`,
    aiActionInventoryReady
      ? aiActionPolicyReady
        ? `Use ${inputPaths.aiActionPolicy} to review/approve high-impact action policy and run hosted no-autonomous-action smoke tests before upgrading excessive-agency claims.`
        : `Use ${inputPaths.aiActionInventory} to approve high-impact action policy and hosted no-autonomous-action smoke tests before upgrading excessive-agency claims.`
      : `Run npm run audit:ai:actions to create the AI action inventory before upgrading excessive-agency claims.`,
    `Use ${inputPaths.rlsProofValidation} after approved migration, local pgTAP, and linked Supabase pgTAP runs; current status ${rlsProofValidationStatus}.`,
    forecastClaimGovernanceReady
      ? `Use ${inputPaths.forecastClaimGovernance} to clear prediction-claim release holds before any accuracy-superiority or world-class language.`
      : 'Run npm run audit:forecast:claim-governance to create the prediction-claim release-hold checklist.',
    `Use ${inputPaths.accuracyInputValidation} to validate forecast/baseline input quality before calibration scoring; current status ${accuracyInputValidationStatus}.`,
    `Use ${inputPaths.leakageReviewValidation} to validate leakage/contamination controls before any accuracy or benchmark-superiority claim; current status ${leakageReviewValidationStatus}.`,
    `Use ${inputPaths.scoringValidation} to validate calibration-ledger and benchmark-comparison outputs before any accuracy claim review; current status ${scoringValidationStatus}.`,
    predictionScienceValidationStatus !== 'missing'
      ? `Use ${inputPaths.predictionScienceValidation} as the top-level forecasting-science gate before any accuracy or world-class language; current status ${predictionScienceValidationStatus}, framework_alignment_ready=${predictionScienceFrameworkAlignmentReady}, and prediction_science_ready_for_claim_review=${predictionScienceReadyForClaimReview}.`
      : `Run npm run audit:forecast:validate-science after forecast scoring validation so current forecasting-science requirements are checked before accuracy claims.`,
    forecastExecutionReadinessStatus !== 'missing'
      ? `Use ${inputPaths.forecastExecutionReadiness} as the owner resolved-outcome export execution gate; current status ${forecastExecutionReadinessStatus}, execution_ready_for_owner_resolved_export=${forecastExecutionReadyForOwnerExport}, scoring_chain_ready_for_owner_claim_review=${forecastExecutionScoringChainReady}, and world_class_prediction_claim_allowed=${forecastExecutionWorldClassPredictionClaimAllowed}.`
      : `Run npm run audit:forecast:execution-readiness after prediction science validation so repo surfaces and owner export templates are checked before requesting resolved-outcome data.`,
    `Use ${inputPaths.forecastEvaluationProtocol} and ${inputPaths.accuracyIntakeKit} to supply owner-approved resolved forecasts, leakage controls, metrics, claim tiers, and real comparable baselines.`,
    'Run calibration and benchmark scripts on owner-approved resolved forecasts and real baselines.',
    'Only then revisit commercial-ready or world-class prediction language.'
  ]
};

function renderMarkdown(report) {
  const dimensionRows = report.dimensions
    .map((dimension) => [
      mdCell(dimension.label),
      `${dimension.weight_percent}`,
      `${dimension.current_score_percent}`,
      `${dimension.weighted_contribution_percent}`,
      mdCell(dimension.status)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const blockerRows = report.primary_blockers
    .map((blocker) => [
      blocker.rank,
      mdCell(blocker.label),
      blocker.current_score_percent,
      mdCell(blocker.missing_evidence.join(' '))
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const frameworkRows = report.external_framework_alignment
    .map((framework) => [
      mdCell(framework.framework),
      framework.source_url,
      mdCell(framework.proof_status),
      mdCell(framework.current_evidence),
      mdCell(framework.missing_proof),
      mdCell(framework.claim_boundary)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  return `# Commercial Confidence Gate - 2026-06-06

## Decision

Current decision: \`${report.posture.launch_decision}\`.

Pilot-strategy confidence is **${report.posture.pilot_strategy_confidence_percent}%**. Commercial/world-class confidence is **${report.posture.commercial_world_class_confidence_percent}%**, leaving a **${report.posture.confidence_gap_percent}%** gap to the requested 95% threshold.

Use market language: **${report.posture.recommended_market_language}**.

Avoid market language: **${report.posture.prohibited_market_language}**.

## Dimension Score

| Dimension | Weight | Current Score | Weighted Contribution | Status |
|---|---:|---:|---:|---|
${dimensionRows}

## Primary Blockers To 95%

| Rank | Blocker | Current Score | Missing Evidence |
|---:|---|---:|---|
${blockerRows}

## External Framework Alignment

| Framework | Source | Proof Status | Current Evidence | Missing Proof | Claim Boundary |
|---|---|---|---|---|---|
${frameworkRows}

## Next Loop Order

${report.next_loop_order.map((item, index) => `${index + 1}. ${item}`).join('\n')}

## Proof Boundary

This report is a deterministic confidence gate over existing local artifacts. It does not inspect hosted Supabase state, does not perform outreach, does not run production jobs, and does not upgrade prediction-accuracy claims.
`;
}

if (jsonOutputPath) {
  writeArtifact(jsonOutputPath, `${JSON.stringify(gate, null, 2)}\n`);
}

if (mdOutputPath) {
  writeArtifact(mdOutputPath, renderMarkdown(gate));
}

console.log(JSON.stringify({
  json_output: jsonOutputPath,
  md_output: mdOutputPath,
  launch_decision: gate.posture.launch_decision,
  pilot_strategy_confidence_percent: gate.posture.pilot_strategy_confidence_percent,
  commercial_world_class_confidence_percent: gate.posture.commercial_world_class_confidence_percent,
  decision: gate.posture.decision,
  primary_blocker_count: gate.primary_blockers.length
}, null, 2));
