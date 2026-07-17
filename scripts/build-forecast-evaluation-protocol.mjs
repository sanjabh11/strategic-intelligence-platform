#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const ROOT = process.cwd();
const DEFAULT_CALIBRATION_READINESS = 'docs/launch-readiness/calibration-readiness-audit-2026-06-06.json';
const DEFAULT_CALIBRATION_LEDGER = 'docs/launch-readiness/resolved-forecast-calibration-ledger-2026-06-06.json';
const DEFAULT_BENCHMARK_COMPARISON = 'docs/launch-readiness/forecast-benchmark-comparison-2026-06-06.json';
const DEFAULT_ACCURACY_INTAKE_KIT = 'docs/launch-readiness/accuracy-evidence-intake-kit-2026-06-06.json';
const DEFAULT_CONFIDENCE_GATE = 'docs/launch-readiness/commercial-confidence-gate-2026-06-06.json';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/forecast-evaluation-protocol-2026-06-06.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/forecast-evaluation-protocol-2026-06-06.md';
const DEFAULT_CSV_OUTPUT = 'docs/launch-readiness/forecast-evaluation-protocol-checklist-2026-06-06.csv';

function argValue(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function usage() {
  console.error([
    'Usage: node scripts/build-forecast-evaluation-protocol.mjs',
    `  [--calibration-readiness ${DEFAULT_CALIBRATION_READINESS}]`,
    `  [--calibration-ledger ${DEFAULT_CALIBRATION_LEDGER}]`,
    `  [--benchmark-comparison ${DEFAULT_BENCHMARK_COMPARISON}]`,
    `  [--accuracy-intake-kit ${DEFAULT_ACCURACY_INTAKE_KIT}]`,
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
  calibrationReadiness: argValue('--calibration-readiness', DEFAULT_CALIBRATION_READINESS),
  calibrationLedger: argValue('--calibration-ledger', DEFAULT_CALIBRATION_LEDGER),
  benchmarkComparison: argValue('--benchmark-comparison', DEFAULT_BENCHMARK_COMPARISON),
  accuracyIntakeKit: argValue('--accuracy-intake-kit', DEFAULT_ACCURACY_INTAKE_KIT),
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

const calibrationReadiness = readJsonIfExists(inputPaths.calibrationReadiness, {
  summary: {},
  evidence_gates: []
});
const calibrationLedger = readJsonIfExists(inputPaths.calibrationLedger, {
  commercial_claim_status: 'missing',
  source: {},
  summary: {}
});
const benchmarkComparison = readJsonIfExists(inputPaths.benchmarkComparison, {
  commercial_benchmark_status: 'missing',
  source: {},
  summary: {}
});
const accuracyIntakeKit = readJsonIfExists(inputPaths.accuracyIntakeKit, {
  status: 'missing',
  acceptance_gates: [],
  required_owner_inputs: []
});
const confidenceGate = readJsonIfExists(inputPaths.confidenceGate, {
  dimensions: [],
  posture: {}
});

const accuracyDimension = (confidenceGate.dimensions ?? []).find((dimension) => dimension.id === 'prediction_accuracy_proof') ?? {};
const minSampleSize = Number(
  accuracyIntakeKit.required_owner_inputs?.find((input) => Number(input.minimum_rows))?.minimum_rows
  ?? calibrationLedger.summary?.minimum_sample_size
  ?? 25
);
const reliabilityBins = Number(calibrationLedger.summary?.reliability_bins ?? 5);

const protocolStages = [
  {
    stage: 'question_registration',
    owner: 'Product owner plus evaluation reviewer',
    required_artifact: 'forecast question register with resolution criteria',
    pass_condition: 'Each question has binary or explicitly typed outcome, close time, resolution source, ambiguity handling, and exclusion rule before forecasts are scored.',
    claim_boundary: 'No question without pre-registered resolution criteria can support accuracy claims.'
  },
  {
    stage: 'pre_resolution_forecast_capture',
    owner: 'Forecast system operator',
    required_artifact: 'immutable forecast snapshot or approved export',
    pass_condition: 'Every scored probability has a timestamp strictly before resolution and records source_id, model/policy, prompt or workflow version, and evidence bundle reference.',
    claim_boundary: 'Post-resolution, edited, or timestamp-missing probabilities are excluded.'
  },
  {
    stage: 'owner_approved_export',
    owner: 'Repo owner or data steward',
    required_artifact: 'approved resolved forecast export',
    pass_condition: `At least ${minSampleSize} binary resolved rows exist for one scored source before first pilot accuracy reporting.`,
    claim_boundary: 'Below the sample threshold, reports are mechanics proof only.'
  },
  {
    stage: 'calibration_and_brier_scoring',
    owner: 'Evaluation reviewer',
    required_artifact: 'calibration ledger with source summaries and reliability bins',
    pass_condition: `Brier score, sample size, reliability bins, excluded rows, and calibration caveats are reported with ${reliabilityBins} planned bins unless owner changes the protocol.`,
    claim_boundary: 'Brier/reliability metrics support calibration-aware reporting, not superiority by themselves.'
  },
  {
    stage: 'baseline_comparison',
    owner: 'Evaluation reviewer',
    required_artifact: 'benchmark comparison report',
    pass_condition: 'App forecasts are compared with explicit trivial, human/community/pro, market, or external baselines on same or documented comparable questions.',
    claim_boundary: 'No world-class language without real comparable baselines and source URLs.'
  },
  {
    stage: 'leakage_and_contamination_review',
    owner: 'Adversarial reviewer',
    required_artifact: 'leakage review notes',
    pass_condition: 'Review confirms forecasts were made before outcomes, retrieval sources were not post-resolution-only, and benchmark questions were not trained/evaluated with known answers.',
    claim_boundary: 'Any unresolved leakage concern downgrades the result to internal diagnostic only.'
  },
  {
    stage: 'hosted_and_security_boundary',
    owner: 'Security and runtime owner',
    required_artifact: 'hosted smoke and RLS/evaluation-table proof',
    pass_condition: 'Hosted calibration/release jobs and evaluation-table access boundaries are verified before public buyer claims.',
    claim_boundary: 'Local scoring can support internal readiness, not hosted/commercial claims.'
  },
  {
    stage: 'claim_language_review',
    owner: 'Commercial owner',
    required_artifact: 'approved copy review',
    pass_condition: 'Market copy maps to the achieved evidence tier and keeps uncertainty, sample size, and baseline scope visible.',
    claim_boundary: 'The default allowed phrase remains calibration-aware decision support.'
  }
];

const metricSuite = [
  {
    metric: 'brier_score',
    purpose: 'Primary binary probability accuracy score.',
    required_for_claim: true,
    interpretation: 'Lower is better; report sample size and source_id with every score.'
  },
  {
    metric: 'reliability_bins',
    purpose: 'Calibration check across probability buckets.',
    required_for_claim: true,
    interpretation: 'Report observed frequency, count, and calibration error for non-empty bins.'
  },
  {
    metric: 'brier_skill_vs_baseline',
    purpose: 'Shows whether the app beats a specific baseline.',
    required_for_claim: true,
    interpretation: 'Only meaningful when baseline questions and sample scope are comparable.'
  },
  {
    metric: 'coverage_and_abstention',
    purpose: 'Prevents cherry-picking only easy questions.',
    required_for_claim: true,
    interpretation: 'Report how many eligible questions were scored, excluded, unresolved, ambiguous, or abstained.'
  },
  {
    metric: 'time_to_update_or_forecast_age',
    purpose: 'Shows whether forecasts were made early enough to matter.',
    required_for_claim: false,
    interpretation: 'Older standing forecasts and late forecasts should be separated when buyer decisions depend on lead time.'
  },
  {
    metric: 'decision_relevance',
    purpose: 'Connects accuracy to the strategic decision workflow.',
    required_for_claim: false,
    interpretation: 'Track whether a question informed a buyer action, review decision, or forecast registry handoff.'
  }
];

const baselinePolicy = [
  {
    baseline_type: 'trivial',
    examples: ['0.5 binary prior', 'historical base rate when well-defined'],
    minimum_evidence: 'baseline formula and sample scope',
    allowed_claim: 'beats a trivial baseline only'
  },
  {
    baseline_type: 'internal_human_or_team',
    examples: ['analyst estimate', 'team mean', 'community prediction mean from approved export'],
    minimum_evidence: 'same question set, timestamp before resolution, sample size, and role labels',
    allowed_claim: 'compares favorably to internal baseline on this sample'
  },
  {
    baseline_type: 'external_human_community_or_pro',
    examples: ['Metaculus community/pro baseline', 'Good Judgment/custom forecaster baseline where available'],
    minimum_evidence: 'source URL, same or explicitly comparable question mapping, sample size, and scoring method',
    allowed_claim: 'compared with an external forecasting baseline on a documented question set'
  },
  {
    baseline_type: 'market_or_benchmark',
    examples: ['prediction-market implied probability', 'ForecastBench-style dynamic benchmark where comparable'],
    minimum_evidence: 'de-vig or conversion method when applicable, timestamp, source URL, and benchmark protocol notes',
    allowed_claim: 'benchmark-aware comparison; no broad superiority unless independently reviewed'
  }
];

const claimTiers = [
  {
    tier: 'mechanics_only',
    minimum_conditions: [
      'sample fixture or incomplete approved export',
      'no real comparable baseline',
      'hosted/security proof absent'
    ],
    allowed_language: 'calibration and benchmark mechanics are implemented',
    prohibited_language: 'accurate predictions, best-in-class forecasting, world-class forecasting'
  },
  {
    tier: 'pilot_internal_accuracy',
    minimum_conditions: [
      `owner-approved export has at least ${minSampleSize} binary resolved rows for one scored source`,
      'Brier score and reliability bins reported',
      'exclusions and ambiguity rules attached'
    ],
    allowed_language: 'internal pilot calibration report on an approved sample',
    prohibited_language: 'generalizable or world-class accuracy'
  },
  {
    tier: 'buyer_safe_calibration_claim',
    minimum_conditions: [
      'approved export scored',
      'real comparable human/community/pro/external baseline attached',
      'leakage review passed',
      'sample size and caveats visible in buyer packet'
    ],
    allowed_language: 'calibration-aware forecasting workflow with measured performance on a documented sample',
    prohibited_language: 'unqualified prediction superiority'
  },
  {
    tier: 'world_class_review_candidate',
    minimum_conditions: [
      'multi-domain resolved sample is large enough for stable buyer review',
      'human/pro/community or benchmark baselines are independently comparable',
      'hosted run, RLS/evaluation-table boundary, and adversarial review pass',
      'claim language is reviewed against current benchmark context'
    ],
    allowed_language: 'candidate for world-class forecasting review',
    prohibited_language: 'world-class accurate predictions without independent review and repeatability'
  }
];

const leakageControls = [
  'Forecast timestamp must be before resolution timestamp.',
  'Resolution source URL or notes must be attached for every included row.',
  'Post-resolution retrieval, rationale, or analyst notes cannot be used to generate the scored probability.',
  'Synthetic/sample fixtures must remain tagged source-mode sample_fixture.',
  'Question edits after forecast close must be versioned or excluded.',
  'Comparable baselines must use the same questions or a documented mapping.',
  'Any confidential buyer, user, credential, or direct personal contact/payment data must be redacted before artifacts are committed.'
];

const protocol = {
  schema_version: 'forecast-evaluation-protocol-v1',
  generated_at: new Date().toISOString(),
  status: 'evaluation_protocol_ready_not_accuracy_proof',
  proof_boundary: 'This protocol defines how to produce prediction-accuracy evidence. It is not accuracy proof, benchmark proof, hosted proof, or world-class forecasting evidence until owner-approved resolved forecasts and real comparable baselines are scored under the protocol.',
  source: {
    calibration_readiness: inputPaths.calibrationReadiness,
    calibration_readiness_score: calibrationReadiness.summary?.readiness_score_1_to_5 ?? null,
    calibration_ledger: inputPaths.calibrationLedger,
    calibration_claim_status: calibrationLedger.commercial_claim_status ?? 'unknown',
    calibration_mode: calibrationLedger.source?.mode ?? 'unknown',
    benchmark_comparison: inputPaths.benchmarkComparison,
    benchmark_status: benchmarkComparison.commercial_benchmark_status ?? 'unknown',
    benchmark_ledger_mode: benchmarkComparison.source?.ledger_mode ?? 'unknown',
    accuracy_intake_kit: inputPaths.accuracyIntakeKit,
    accuracy_intake_status: accuracyIntakeKit.status ?? 'unknown',
    confidence_gate: inputPaths.confidenceGate,
    confidence_gate_accuracy_status: accuracyDimension.status ?? 'unknown',
    confidence_gate_accuracy_score_percent: accuracyDimension.current_score_percent ?? null
  },
  protocol_stages: protocolStages,
  metric_suite: metricSuite,
  baseline_policy: baselinePolicy,
  claim_tiers: claimTiers,
  leakage_controls: leakageControls,
  owner_inputs_required_next: [
    'approved resolved forecast export with binary outcomes and resolution sources',
    'pre-resolution forecast snapshot or immutable probability records',
    'real comparable baseline file or source URL',
    'owner-approved exclusion and ambiguity rules',
    'evaluation-table security boundary decision',
    'hosted calibration/release smoke evidence after approved deploy/secrets'
  ],
  commands_after_owner_inputs: [
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:calibration:ledger -- --input <owner-approved-resolved-forecast-export.json-or-csv> --source-mode approved_export --output docs/launch-readiness/resolved-forecast-calibration-ledger-approved-<date>.json --min-sample-size ${minSampleSize} --bins ${reliabilityBins}`,
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:forecast:benchmark -- --ledger docs/launch-readiness/resolved-forecast-calibration-ledger-approved-<date>.json --baseline <real-comparable-baseline.json-or-csv> --output docs/launch-readiness/forecast-benchmark-comparison-approved-<date>.json',
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:forecast:protocol -- --calibration-ledger docs/launch-readiness/resolved-forecast-calibration-ledger-approved-<date>.json --benchmark-comparison docs/launch-readiness/forecast-benchmark-comparison-approved-<date>.json --accuracy-intake-kit ${inputPaths.accuracyIntakeKit}`,
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:commercial:confidence -- --json-output docs/launch-readiness/commercial-confidence-gate-2026-06-06.json --md-output docs/launch-readiness/commercial-confidence-gate-2026-06-06.md'
  ],
  current_blockers: [
    `Current ledger status is ${calibrationLedger.commercial_claim_status ?? 'unknown'} with source mode ${calibrationLedger.source?.mode ?? 'unknown'}.`,
    `Current benchmark status is ${benchmarkComparison.commercial_benchmark_status ?? 'unknown'} with ${benchmarkComparison.summary?.comparisons_made ?? 0} sample comparisons.`,
    `Current accuracy confidence score is ${accuracyDimension.current_score_percent ?? 'unknown'} and remains blocked by owner-approved data and baselines.`,
    'No protocol stage has been executed against real owner-approved resolved forecasts in this artifact.'
  ],
  external_methodology_alignment: [
    {
      framework: 'Metaculus FutureEval methodology',
      source_url: 'https://www.metaculus.com/futureeval/methodology',
      protocol_implication: 'Use real future-outcome questions and compare with community/pro/human baselines where both humans and bots made forecasts.'
    },
    {
      framework: 'ForecastBench',
      source_url: 'https://www.forecastbench.org/about/',
      protocol_implication: 'Prefer dynamic, contamination-resistant questions whose answers were unknown at forecast time, with human comparison groups where available.'
    },
    {
      framework: 'ForecastBench documentation',
      source_url: 'https://www.forecastbench.org/docs/',
      protocol_implication: 'Track difficulty-adjusted Brier or comparable Brier-style scoring and ranking stability rather than one-off anecdotes.'
    },
    {
      framework: 'Metaculus scores FAQ',
      source_url: 'https://www.metaculus.com/help/scores-faq/',
      protocol_implication: 'Use proper scoring rules so incentives reward sincere probabilities rather than overconfident predictions.'
    },
    {
      framework: 'NIST AI RMF Measure/Manage',
      source_url: 'https://airc.nist.gov/airmf-resources/airmf/5-sec-core/',
      protocol_implication: 'Document measurable performance changes, field data, monitoring, and risk-response decisions before relying on AI-system claims.'
    }
  ]
};

function renderCsv() {
  const headers = [
    'stage',
    'owner',
    'required_artifact',
    'pass_condition',
    'claim_boundary',
    'current_status',
    'evidence_path',
    'owner_notes'
  ];

  const rows = protocolStages.map((stage) => [
    stage.stage,
    stage.owner,
    stage.required_artifact,
    stage.pass_condition,
    stage.claim_boundary,
    'not_executed',
    '',
    ''
  ]);

  return [headers, ...rows].map(csvLine).join('\n') + '\n';
}

function renderMarkdown() {
  const stageRows = protocolStages
    .map((stage) => [
      mdCell(stage.stage),
      mdCell(stage.owner),
      mdCell(stage.required_artifact),
      mdCell(stage.pass_condition),
      mdCell(stage.claim_boundary)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const metricRows = metricSuite
    .map((metric) => [
      mdCell(metric.metric),
      mdCell(metric.purpose),
      metric.required_for_claim ? 'yes' : 'no',
      mdCell(metric.interpretation)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const baselineRows = baselinePolicy
    .map((baseline) => [
      mdCell(baseline.baseline_type),
      mdCell(baseline.examples.join(', ')),
      mdCell(baseline.minimum_evidence),
      mdCell(baseline.allowed_claim)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const tierRows = claimTiers
    .map((tier) => [
      mdCell(tier.tier),
      mdCell(tier.minimum_conditions.join('; ')),
      mdCell(tier.allowed_language),
      mdCell(tier.prohibited_language)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const sourceRows = protocol.external_methodology_alignment
    .map((item) => `| ${mdCell(item.framework)} | ${item.source_url} | ${mdCell(item.protocol_implication)} |`)
    .join('\n');

  return `# Forecast Evaluation Protocol - 2026-06-06

## Status

Status: \`${protocol.status}\`.

This protocol is not prediction-accuracy proof. It defines the evidence path required before the app can move beyond calibration-aware decision support.

Current accuracy gate score: **${protocol.source.confidence_gate_accuracy_score_percent}%**.

## Protocol Stages

| Stage | Owner | Required Artifact | Pass Condition | Claim Boundary |
|---|---|---|---|---|
${stageRows}

## Metric Suite

| Metric | Purpose | Required For Claim | Interpretation |
|---|---|---|---|
${metricRows}

## Baseline Policy

| Baseline Type | Examples | Minimum Evidence | Allowed Claim |
|---|---|---|---|
${baselineRows}

## Claim Tiers

| Tier | Minimum Conditions | Allowed Language | Prohibited Language |
|---|---|---|---|
${tierRows}

## Leakage Controls

${leakageControls.map((item) => `- ${item}`).join('\n')}

## Current Source Alignment

| Framework | Source | Protocol Implication |
|---|---|---|
${sourceRows}

## Next Commands After Owner Inputs

${protocol.commands_after_owner_inputs.map((item, index) => `${index + 1}. \`${item}\``).join('\n')}

## Proof Boundary

${protocol.proof_boundary}
`;
}

if (outputPaths.json) {
  writeArtifact(outputPaths.json, `${JSON.stringify(protocol, null, 2)}\n`);
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
  status: protocol.status,
  protocol_stage_count: protocolStages.length,
  metric_count: metricSuite.length,
  baseline_policy_count: baselinePolicy.length,
  claim_tier_count: claimTiers.length,
  accuracy_score_percent: protocol.source.confidence_gate_accuracy_score_percent
}, null, 2));
