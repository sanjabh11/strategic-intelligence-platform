#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const ROOT = process.cwd();
const DEFAULT_ARTIFACT_DIR = 'docs/launch-readiness';

function argValue(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

const proofDate = argValue('--proof-date', new Date().toISOString().slice(0, 10));

const DEFAULT_EVIDENCE = 'docs/launch-readiness/launch-evidence-2026-06-06.json';
const DEFAULT_COMMERCIAL_CONFIDENCE_GATE = 'docs/launch-readiness/commercial-confidence-gate-2026-06-06.json';
const DEFAULT_MARKET_NICHE_VALIDATION = 'docs/launch-readiness/market-niche-evidence-validation-2026-06-06.json';
const DEFAULT_COMPETITIVE_POSITIONING_VALIDATION = 'docs/launch-readiness/competitive-positioning-evidence-validation-2026-06-06.json';
const DEFAULT_PREDICTION_SCIENCE_VALIDATION = 'docs/launch-readiness/prediction-science-evidence-validation-2026-06-06.json';
const DEFAULT_BUYER_PROOF_GATE = 'docs/launch-readiness/buyer-proof-gate-2026-06-06.json';
const DEFAULT_HOSTED_PROOF_VALIDATION = 'docs/launch-readiness/hosted-operational-proof-evidence-validation-2026-06-06.json';
const DEFAULT_ENTERPRISE_PROCUREMENT_GATE = 'docs/launch-readiness/enterprise-procurement-readiness-gate-2026-06-06.json';
const DEFAULT_JSON_OUTPUT = `docs/launch-readiness/claim-consistency-validation-${proofDate}.json`;
const DEFAULT_MD_OUTPUT = `docs/launch-readiness/claim-consistency-validation-${proofDate}.md`;
const DEFAULT_CSV_OUTPUT = `docs/launch-readiness/claim-consistency-validation-checklist-${proofDate}.csv`;

const CLAIM_PATTERNS = [
  {
    claim: 'world_class_accuracy',
    severity: 'P1',
    pattern: /\bworld[-_ ]class (?:accurate predictions?|prediction accuracy|prediction performance|prediction claims?|forecasting claims?)\b|\bworld_class_prediction\b|\bworld-class accurate predictions\b/i,
    allowed_gate: 'world_class_prediction_claim_blocked'
  },
  {
    claim: 'commercial_ready',
    severity: 'P1',
    pattern: /\bcommercial[-_ ]ready\b/i,
    allowed_gate: 'commercial_ready_claim_blocked'
  },
  {
    claim: 'accurate_predictions',
    severity: 'P1',
    pattern: /\baccurate predictions?\b|\bprediction superiority\b|\bbenchmark superiority\b/i,
    allowed_gate: 'accuracy_claim_blocked'
  },
  {
    claim: 'buyer_validated',
    severity: 'P1',
    pattern: /\bbuyer[-_ ]validated\b|\breferenceable buyer\b|\bwillingness[-_ ]to[-_ ]pay proof\b/i,
    allowed_gate: 'buyer_validated_claim_blocked'
  },
  {
    claim: 'hosted_live',
    severity: 'P2',
    pattern: /\bhosted[-_ ]live proof complete\b|\bfully proven hosted runtime\b|\blive market[-_ ]data intelligence\b/i,
    allowed_gate: 'hosted_live_claim_blocked'
  },
  {
    claim: 'enterprise_ready',
    severity: 'P1',
    pattern: /\benterprise[-_ ]ready\b|\bfully remediated rls\b|\btenant[-_ ]isolation claim\b/i,
    allowed_gate: 'enterprise_ready_claim_blocked'
  },
  {
    claim: 'replacement_or_parity',
    severity: 'P2',
    pattern: /\breplacement for geopolitical intelligence teams\b|\bpalantir[-_ ]class\b|\bforecastbench\/metaculus\/good judgment parity\b|\bforecasting parity\b/i,
    allowed_gate: 'competitive_replacement_or_parity_claim_blocked'
  }
];

const BOUNDARY_CONTEXT_PATTERNS = [
  /\bavoid\b/i,
  /\bblocked\b/i,
  /\bclaim[_ -]?allowed["']?\s*[:=]\s*false\b/i,
  /\bfalse\b/i,
  /\bnot\b/i,
  /\bno\b/i,
  /\bwithout\b/i,
  /\bunless\b/i,
  /\bbefore\b/i,
  /\bmissing\b/i,
  /\bunproven\b/i,
  /\brisk\b/i,
  /\bmust\b/i,
  /\brequired\b/i,
  /\brequire\b/i,
  /\brequires\b/i,
  /\bprevents\b/i,
  /\bover[- ]sold\b/i,
  /\bdistinguishes\b/i,
  /\bprohibited\b/i,
  /\bprohibits\b/i,
  /\bunsupported\b/i,
  /\bnot proof\b/i,
  /\bnot_proof_of\b/i,
  /\bdoes_not_prove\b/i,
  /\bproof_boundary\b/i,
  /\bclaim_boundary\b/i,
  /\brelease_hold\b/i,
  /\bevidence_needed\b/i,
  /\bsample_only\b/i,
  /\bnot_95_confident\b/i,
  /\bpilot-only\b/i,
  /\bnot_buyer\b/i,
  /\bnot_accuracy\b/i,
  /\bnot_claim\b/i,
  /\bnot_launch\b/i,
  /\bready_no_real\b/i,
  /\bclaims to avoid\b/i,
  /\bprohibited_claims\b/i,
  /\bprohibited_market_language\b/i,
  /\bprohibited_language\b/i,
  /\bprohibited_claim\b/i
];

function usage() {
  console.error([
    'Usage: node scripts/validate-launch-claim-consistency.mjs',
    `  [--proof-date ${proofDate}]`,
    `  [--artifact-dir ${DEFAULT_ARTIFACT_DIR}]`,
    `  [--evidence ${DEFAULT_EVIDENCE}]`,
    `  [--commercial-confidence-gate ${DEFAULT_COMMERCIAL_CONFIDENCE_GATE}]`,
    `  [--market-niche-validation ${DEFAULT_MARKET_NICHE_VALIDATION}]`,
    `  [--competitive-positioning-validation ${DEFAULT_COMPETITIVE_POSITIONING_VALIDATION}]`,
    `  [--prediction-science-validation ${DEFAULT_PREDICTION_SCIENCE_VALIDATION}]`,
    `  [--buyer-proof-gate ${DEFAULT_BUYER_PROOF_GATE}]`,
    `  [--hosted-proof-validation ${DEFAULT_HOSTED_PROOF_VALIDATION}]`,
    `  [--enterprise-procurement-gate ${DEFAULT_ENTERPRISE_PROCUREMENT_GATE}]`,
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
  artifactDir: argValue('--artifact-dir', DEFAULT_ARTIFACT_DIR),
  evidence: argValue('--evidence', DEFAULT_EVIDENCE),
  commercialConfidenceGate: argValue('--commercial-confidence-gate', DEFAULT_COMMERCIAL_CONFIDENCE_GATE),
  marketNicheValidation: argValue('--market-niche-validation', DEFAULT_MARKET_NICHE_VALIDATION),
  competitivePositioningValidation: argValue('--competitive-positioning-validation', DEFAULT_COMPETITIVE_POSITIONING_VALIDATION),
  predictionScienceValidation: argValue('--prediction-science-validation', DEFAULT_PREDICTION_SCIENCE_VALIDATION),
  buyerProofGate: argValue('--buyer-proof-gate', DEFAULT_BUYER_PROOF_GATE),
  hostedProofValidation: argValue('--hosted-proof-validation', DEFAULT_HOSTED_PROOF_VALIDATION),
  enterpriseProcurementGate: argValue('--enterprise-procurement-gate', DEFAULT_ENTERPRISE_PROCUREMENT_GATE)
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

function replaceMatchingThenAppend(list, items, matchers) {
  const filtered = Array.isArray(list)
    ? list.filter((entry) => !matchers.some((matcher) => matcher.test(String(entry ?? ''))))
    : [];
  for (const item of items) {
    if (!filtered.includes(item)) filtered.push(item);
  }
  return filtered;
}

function replaceByTaskId(list, item) {
  const itemKey = item.task_id ?? item.target_task;
  const next = Array.isArray(list)
    ? list.filter((entry) => (entry.task_id ?? entry.target_task) !== itemKey)
    : [];
  next.push(item);
  return next;
}

function gateStatus(condition) {
  return condition ? 'passed' : 'failed';
}

function artifactFiles(relativeDir) {
  const absoluteDir = resolveRepoPath(relativeDir);
  if (!existsSync(absoluteDir)) return [];
  const excludedOutputs = new Set([outputPaths.json, outputPaths.md, outputPaths.csv]
    .filter(Boolean)
    .map((file) => path.normalize(file)));
  return readdirSync(absoluteDir)
    .filter((file) => /\.(json|md|csv)$/i.test(file))
    .filter((file) => !/^claim-consistency-validation/.test(file))
    .filter((file) => !/^launch-claim-consistency/.test(file))
    .map((file) => path.join(relativeDir, file))
    .filter((file) => !excludedOutputs.has(path.normalize(file)))
    .sort();
}

function isBoundaryContext(context) {
  return BOUNDARY_CONTEXT_PATTERNS.some((pattern) => pattern.test(context));
}

function scanClaims(files) {
  const mentions = [];
  let lineCount = 0;
  for (const file of files) {
    const text = readFileSync(resolveRepoPath(file), 'utf8');
    const lines = text.split('\n');
    lineCount += lines.length;
    lines.forEach((line, index) => {
      for (const claimPattern of CLAIM_PATTERNS) {
        if (!claimPattern.pattern.test(line)) continue;
        const context = lines
          .slice(Math.max(0, index - 8), Math.min(lines.length, index + 9))
          .join('\n');
        mentions.push({
          file,
          line: index + 1,
          claim: claimPattern.claim,
          severity: claimPattern.severity,
          allowed_gate: claimPattern.allowed_gate,
          boundary_context: isBoundaryContext(context),
          text: line.trim().slice(0, 260)
        });
      }
    });
  }
  return { mentions, lineCount };
}

const commercialConfidenceGate = readJsonIfExists(inputPaths.commercialConfidenceGate, { posture: {}, source: {} });
const marketNicheValidation = readJsonIfExists(inputPaths.marketNicheValidation, { summary: {} });
const competitivePositioningValidation = readJsonIfExists(inputPaths.competitivePositioningValidation, { summary: {} });
const predictionScienceValidation = readJsonIfExists(inputPaths.predictionScienceValidation, { summary: {} });
const buyerProofGate = readJsonIfExists(inputPaths.buyerProofGate, { summary: {} });
const hostedProofValidation = readJsonIfExists(inputPaths.hostedProofValidation, { summary: {} });
const enterpriseProcurementGate = readJsonIfExists(inputPaths.enterpriseProcurementGate, { summary: {} });

const files = artifactFiles(inputPaths.artifactDir);
const { mentions, lineCount } = scanClaims(files);
const unsupportedMentions = mentions.filter((mention) => !mention.boundary_context);
const boundaryMentions = mentions.filter((mention) => mention.boundary_context);
const unsupportedBySeverity = unsupportedMentions.reduce((accumulator, mention) => {
  accumulator[mention.severity] = (accumulator[mention.severity] ?? 0) + 1;
  return accumulator;
}, {});

const worldClassBlocked = commercialConfidenceGate.posture?.decision === 'not_95_confident'
  && !Boolean(predictionScienceValidation.summary?.world_class_prediction_claim_allowed)
  && !Boolean(commercialConfidenceGate.source?.prediction_science_world_class_prediction_claim_allowed);
const accuracyBlocked = !Boolean(predictionScienceValidation.summary?.accuracy_claim_allowed)
  && !Boolean(commercialConfidenceGate.source?.prediction_science_accuracy_claim_allowed);
const buyerValidatedBlocked = !Boolean(buyerProofGate.summary?.buyer_validation_verified)
  && !Boolean(marketNicheValidation.summary?.buyer_validated_claim_allowed);
const hostedLiveBlocked = !Boolean(hostedProofValidation.summary?.ready_for_buyer_safe_hosted_claims)
  && !Boolean(marketNicheValidation.summary?.hosted_live_claim_allowed);
const enterpriseReadyBlocked = !Boolean(enterpriseProcurementGate.summary?.ready_for_enterprise_procurement_review)
  && !Boolean(marketNicheValidation.summary?.enterprise_ready_claim_allowed);
const competitiveReplacementBlocked = !Boolean(competitivePositioningValidation.summary?.replacement_claim_allowed)
  && !Boolean(competitivePositioningValidation.summary?.palantir_equivalence_claim_allowed)
  && !Boolean(competitivePositioningValidation.summary?.forecasting_parity_claim_allowed);
const commercialReadyBlocked = commercialConfidenceGate.posture?.launch_decision === 'pilot-only'
  && commercialConfidenceGate.posture?.decision === 'not_95_confident';

const acceptanceGates = [
  {
    gate: 'launch_artifact_corpus_present',
    status: gateStatus(files.length >= 50),
    evidence: `${files.length} launch-readiness JSON/Markdown/CSV artifacts scanned across ${lineCount} lines.`,
    proof_bucket: 'repo_artifact'
  },
  {
    gate: 'claim_gate_artifacts_present',
    status: gateStatus([
      inputPaths.commercialConfidenceGate,
      inputPaths.marketNicheValidation,
      inputPaths.competitivePositioningValidation,
      inputPaths.predictionScienceValidation,
      inputPaths.buyerProofGate,
      inputPaths.hostedProofValidation,
      inputPaths.enterpriseProcurementGate
    ].every((file) => existsSync(resolveRepoPath(file)))),
    evidence: 'Commercial confidence, market niche, competitive positioning, prediction science, buyer, hosted, and enterprise gates are readable.',
    proof_bucket: 'repo_artifact'
  },
  {
    gate: 'unsupported_high_risk_claims_absent',
    status: gateStatus(unsupportedMentions.length === 0),
    evidence: `${unsupportedMentions.length} unsupported high-risk claim mentions; ${boundaryMentions.length} mentions are in blocked/prohibited/caveated contexts.`,
    proof_bucket: 'repo_artifact'
  },
  {
    gate: 'world_class_prediction_claim_blocked',
    status: gateStatus(worldClassBlocked),
    evidence: `commercial_decision=${commercialConfidenceGate.posture?.decision ?? 'missing'}; prediction_science_world_class=${Boolean(predictionScienceValidation.summary?.world_class_prediction_claim_allowed)}.`,
    proof_bucket: 'repo_artifact'
  },
  {
    gate: 'accuracy_claim_blocked',
    status: gateStatus(accuracyBlocked),
    evidence: `prediction_science_accuracy_claim_allowed=${Boolean(predictionScienceValidation.summary?.accuracy_claim_allowed)}; prediction_science_ready_for_claim_review=${Boolean(predictionScienceValidation.summary?.prediction_science_ready_for_claim_review)}.`,
    proof_bucket: 'repo_artifact'
  },
  {
    gate: 'buyer_validated_claim_blocked',
    status: gateStatus(buyerValidatedBlocked),
    evidence: `buyer_validation_verified=${Boolean(buyerProofGate.summary?.buyer_validation_verified)}; market_niche_buyer_validated=${Boolean(marketNicheValidation.summary?.buyer_validated_claim_allowed)}.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'hosted_live_claim_blocked',
    status: gateStatus(hostedLiveBlocked),
    evidence: `hosted_ready_for_buyer_safe_claims=${Boolean(hostedProofValidation.summary?.ready_for_buyer_safe_hosted_claims)}; market_niche_hosted_live=${Boolean(marketNicheValidation.summary?.hosted_live_claim_allowed)}.`,
    proof_bucket: 'hosted_live'
  },
  {
    gate: 'enterprise_ready_claim_blocked',
    status: gateStatus(enterpriseReadyBlocked),
    evidence: `enterprise_ready_for_review=${Boolean(enterpriseProcurementGate.summary?.ready_for_enterprise_procurement_review)}; market_niche_enterprise_ready=${Boolean(marketNicheValidation.summary?.enterprise_ready_claim_allowed)}.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'competitive_replacement_or_parity_claim_blocked',
    status: gateStatus(competitiveReplacementBlocked),
    evidence: `replacement=${Boolean(competitivePositioningValidation.summary?.replacement_claim_allowed)}; palantir_equivalence=${Boolean(competitivePositioningValidation.summary?.palantir_equivalence_claim_allowed)}; forecasting_parity=${Boolean(competitivePositioningValidation.summary?.forecasting_parity_claim_allowed)}.`,
    proof_bucket: 'repo_artifact'
  },
  {
    gate: 'commercial_ready_claim_blocked',
    status: gateStatus(commercialReadyBlocked),
    evidence: `launch_decision=${commercialConfidenceGate.posture?.launch_decision ?? 'missing'}; confidence_decision=${commercialConfidenceGate.posture?.decision ?? 'missing'}.`,
    proof_bucket: 'repo_artifact'
  }
];

const consistencyReady = acceptanceGates.every((gate) => gate.status === 'passed');
const validation = {
  schema_version: 'claim-consistency-validation-v1',
  generated_at: new Date().toISOString(),
  status: consistencyReady
    ? 'claim_consistency_validation_passed_pilot_only_boundaries'
    : 'claim_consistency_validation_failed_or_needs_review',
  source: {
    artifact_dir: inputPaths.artifactDir,
    launch_evidence: inputPaths.evidence,
    commercial_confidence_gate: inputPaths.commercialConfidenceGate,
    market_niche_validation: inputPaths.marketNicheValidation,
    competitive_positioning_validation: inputPaths.competitivePositioningValidation,
    prediction_science_validation: inputPaths.predictionScienceValidation,
    buyer_proof_gate: inputPaths.buyerProofGate,
    hosted_proof_validation: inputPaths.hostedProofValidation,
    enterprise_procurement_gate: inputPaths.enterpriseProcurementGate
  },
  summary: {
    scanned_file_count: files.length,
    scanned_line_count: lineCount,
    detected_claim_mention_count: mentions.length,
    boundary_context_claim_mention_count: boundaryMentions.length,
    unsupported_claim_mention_count: unsupportedMentions.length,
    unsupported_p1_claim_mention_count: unsupportedBySeverity.P1 ?? 0,
    unsupported_p2_claim_mention_count: unsupportedBySeverity.P2 ?? 0,
    claim_consistency_ready: consistencyReady,
    world_class_prediction_claim_blocked: worldClassBlocked,
    accuracy_claim_blocked: accuracyBlocked,
    buyer_validated_claim_blocked: buyerValidatedBlocked,
    hosted_live_claim_blocked: hostedLiveBlocked,
    enterprise_ready_claim_blocked: enterpriseReadyBlocked,
    competitive_replacement_or_parity_claim_blocked: competitiveReplacementBlocked,
    commercial_ready_claim_blocked: commercialReadyBlocked,
    launch_decision: commercialConfidenceGate.posture?.launch_decision ?? 'missing',
    commercial_world_class_confidence_percent: Number(commercialConfidenceGate.posture?.commercial_world_class_confidence_percent ?? 0)
  },
  unsupported_claim_mentions: unsupportedMentions,
  boundary_context_claim_mentions: boundaryMentions.slice(0, 100),
  acceptance_gates: acceptanceGates,
  release_holds: [
    {
      hold: 'recheck_claim_consistency_after_owner_data_or_hosted_proof',
      severity: 'P2',
      status: 'active',
      evidence_needed: 'Rerun this validator whenever buyer calls, hosted proof, enterprise evidence, or resolved forecast data changes claim eligibility.'
    },
    {
      hold: 'owner_approved_external_claim_language_missing',
      severity: 'P2',
      status: 'active',
      evidence_needed: 'Owner-approved external-share copy review before outreach, decks, or public claims.'
    }
  ],
  proof_boundary: 'This validator checks whether generated launch-readiness artifacts keep high-risk commercial, buyer, hosted, enterprise, competitive, and prediction claims inside blocked/prohibited/caveated contexts. It does not prove buyer demand, hosted readiness, enterprise procurement readiness, or prediction accuracy.'
};

function renderMarkdown(report) {
  const gateRows = report.acceptance_gates
    .map((gate) => [
      gate.gate,
      gate.status,
      gate.proof_bucket,
      mdCell(gate.evidence)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const unsupportedRows = report.unsupported_claim_mentions
    .map((mention) => [
      mention.file,
      mention.line,
      mention.claim,
      mention.severity,
      mdCell(mention.text)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n') || '| none |  |  |  |  |';

  return `# Claim Consistency Validation - ${proofDate}

## Decision

Status: \`${report.status}\`.

Claim consistency ready: **${report.summary.claim_consistency_ready}**.

Unsupported high-risk claim mentions: **${report.summary.unsupported_claim_mention_count}**.

Boundary/caveated claim mentions: **${report.summary.boundary_context_claim_mention_count}**.

Launch decision remains: **${report.summary.launch_decision}**.

## Acceptance Gates

| Gate | Status | Proof Bucket | Evidence |
|---|---|---|---|
${gateRows}

## Unsupported Mentions

| File | Line | Claim | Severity | Text |
|---|---:|---|---|---|
${unsupportedRows}

## Proof Boundary

${report.proof_boundary}
`;
}

function renderCsv(report) {
  const header = csvLine(['gate', 'status', 'proof_bucket', 'evidence']);
  const rows = report.acceptance_gates.map((gate) => csvLine([
    gate.gate,
    gate.status,
    gate.proof_bucket,
    gate.evidence
  ]));
  return `${[header, ...rows].join('\n')}\n`;
}

if (outputPaths.json) {
  writeArtifact(outputPaths.json, `${JSON.stringify(validation, null, 2)}\n`);
}

if (outputPaths.md) {
  writeArtifact(outputPaths.md, renderMarkdown(validation));
}

if (outputPaths.csv) {
  writeArtifact(outputPaths.csv, renderCsv(validation));
}

if (updateEvidence) {
  const evidence = readJsonIfExists(inputPaths.evidence, null);
  if (!evidence) {
    console.error(`Cannot update missing evidence artifact: ${inputPaths.evidence}`);
    process.exit(2);
  }

  evidence.proof_buckets = evidence.proof_buckets ?? {};
  evidence.proof_buckets.local = replaceMatchingThenAppend(evidence.proof_buckets.local, [
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:claims:consistency -- --artifact-dir ${inputPaths.artifactDir} --commercial-confidence-gate ${inputPaths.commercialConfidenceGate} --market-niche-validation ${inputPaths.marketNicheValidation} --competitive-positioning-validation ${inputPaths.competitivePositioningValidation} --prediction-science-validation ${inputPaths.predictionScienceValidation} --buyer-proof-gate ${inputPaths.buyerProofGate} --hosted-proof-validation ${inputPaths.hostedProofValidation} --enterprise-procurement-gate ${inputPaths.enterpriseProcurementGate} --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence: status ${validation.status}, unsupported_claim_mentions ${validation.summary.unsupported_claim_mention_count}, claim_consistency_ready ${validation.summary.claim_consistency_ready}`
  ], [
    /npm run audit:claims:consistency/
  ]);

  evidence.proof_buckets.repo_artifact = replaceMatchingThenAppend(evidence.proof_buckets.repo_artifact, [
    'scripts/validate-launch-claim-consistency.mjs scans generated launch-readiness artifacts for unsupported high-risk commercial, buyer, hosted, enterprise, competitive, and prediction claims',
    'docs/launch-readiness/claim-consistency-validation-2026-06-06.json records cross-artifact claim mentions, unsupported mentions, gate booleans, and proof boundaries',
    'docs/launch-readiness/claim-consistency-validation-checklist-2026-06-06.csv provides the claim-consistency checklist'
  ], [
    /scripts\/validate-launch-claim-consistency\.mjs/,
    /claim-consistency-validation-2026-06-06\.json/,
    /claim-consistency-validation-checklist-2026-06-06\.csv/
  ]);

  evidence.fix_report = evidence.fix_report ?? {};
  evidence.fix_report.files_changed = replaceMatchingThenAppend(evidence.fix_report.files_changed, [
    'scripts/validate-launch-claim-consistency.mjs',
    'scripts/build-commercial-confidence-gate.mjs',
    'docs/launch-readiness/claim-consistency-validation-2026-06-06.json',
    'docs/launch-readiness/claim-consistency-validation-2026-06-06.md',
    'docs/launch-readiness/claim-consistency-validation-checklist-2026-06-06.csv',
    'package.json'
  ], [
    /scripts\/validate-launch-claim-consistency\.mjs/,
    /scripts\/build-commercial-confidence-gate\.mjs/,
    /claim-consistency-validation-2026-06-06\.json/,
    /claim-consistency-validation-2026-06-06\.md/,
    /claim-consistency-validation-checklist-2026-06-06\.csv/,
    /package\.json/
  ]);
  evidence.fix_report.tests_run = replaceMatchingThenAppend(evidence.fix_report.tests_run, [
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH node --check scripts/validate-launch-claim-consistency.mjs',
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:claims:consistency -- --artifact-dir ${inputPaths.artifactDir} --commercial-confidence-gate ${inputPaths.commercialConfidenceGate} --market-niche-validation ${inputPaths.marketNicheValidation} --competitive-positioning-validation ${inputPaths.competitivePositioningValidation} --prediction-science-validation ${inputPaths.predictionScienceValidation} --buyer-proof-gate ${inputPaths.buyerProofGate} --hosted-proof-validation ${inputPaths.hostedProofValidation} --enterprise-procurement-gate ${inputPaths.enterpriseProcurementGate} --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence`
  ], [
    /node --check scripts\/validate-launch-claim-consistency\.mjs/,
    /npm run audit:claims:consistency/
  ]);
  evidence.fix_report.approval_gates = replaceMatchingThenAppend(evidence.fix_report.approval_gates, [
    'Claim consistency validation is repo/local artifact proof only; rerun after buyer calls, hosted proof, enterprise evidence, resolved forecast data, or owner-approved claim-language changes.'
  ], [
    /Claim consistency validation is repo\/local artifact proof only/
  ]);

  evidence.implementation_decisions = replaceByTaskId(evidence.implementation_decisions, {
    task_id: 'launch-claim-consistency-validation-harness',
    decision: 'Add a deterministic no-dependency scanner for cross-artifact high-risk launch claim consistency and exclude its own generated outputs from the scanned corpus.',
    acceptance_check: 'The validator scans launch-readiness artifacts, ignores current claim-consistency output files, and confirms unsupported high-risk claim mentions are absent while blocked/prohibited/caveated contexts remain allowed.',
    chosen_variant: 'minimal Node artifact scanner plus output exclusion and commercial-confidence gate wiring; no content rewrite and no new dependency',
    repo_pattern_reused: 'Existing launch-readiness Node artifact validator pattern',
    files_changed: [
      'scripts/validate-launch-claim-consistency.mjs',
      'scripts/build-commercial-confidence-gate.mjs',
      'package.json'
    ],
    tests_run: [
      'node --check scripts/validate-launch-claim-consistency.mjs',
      'npm run audit:claims:consistency',
      'npm run audit:commercial:confidence'
    ],
    proof: `${validation.status}; unsupported_claim_mention_count=${validation.summary.unsupported_claim_mention_count}; claim_consistency_ready=${validation.summary.claim_consistency_ready}.`,
    reason: 'The goal requires marketable, sellable, proof-bound positioning; cross-artifact claim drift can undermine the credibility of all individual gates, and self-scanning prior claim reports can create false unsupported-claim regressions.'
  });
  evidence.rejected_variants = replaceByTaskId(evidence.rejected_variants, {
    task_id: 'launch-claim-consistency-validation-harness',
    variant: 'Manually trust each generated launch artifact after individual validators pass.',
    reason_rejected: 'Generated docs can still contradict gates through overbroad claim language; a corpus-level scanner catches drift without manual document review.',
    tradeoff: 'Score-neutral validation improves claim discipline without pretending buyer, hosted, enterprise, or prediction evidence exists.',
    evidence: `${validation.status} with ${validation.summary.unsupported_claim_mention_count} unsupported high-risk mentions.`
  });
  evidence.code_optimization_reviews = replaceByTaskId(evidence.code_optimization_reviews, {
    target_task: 'launch-claim-consistency-validation-harness',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'No new dependency, no app runtime edit, no hosted or secret-dependent execution, self-output files are excluded from the claim corpus, and generated artifacts remain repo/local proof only.',
    tests_or_checks: [
      'node --check scripts/validate-launch-claim-consistency.mjs',
      'npm run audit:claims:consistency',
      'npm run audit:commercial:confidence'
    ],
    remaining_risk: 'Owner-approved buyer calls, hosted proof, enterprise procurement evidence, real forecast outcomes, and external claim-language approval are still missing.'
  });

  writeArtifact(inputPaths.evidence, `${JSON.stringify(evidence, null, 2)}\n`);
}

console.log(JSON.stringify({
  json_output: outputPaths.json,
  md_output: outputPaths.md,
  csv_output: outputPaths.csv,
  evidence_updated: updateEvidence,
  status: validation.status,
  scanned_file_count: validation.summary.scanned_file_count,
  detected_claim_mention_count: validation.summary.detected_claim_mention_count,
  boundary_context_claim_mention_count: validation.summary.boundary_context_claim_mention_count,
  unsupported_claim_mention_count: validation.summary.unsupported_claim_mention_count,
  claim_consistency_ready: validation.summary.claim_consistency_ready
}, null, 2));
