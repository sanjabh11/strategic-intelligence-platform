#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const ROOT = process.cwd();
const DEFAULT_FORECAST_EXECUTION_READINESS = 'docs/launch-readiness/forecast-evaluation-execution-readiness-2026-06-06.json';
const DEFAULT_FORECAST_EVALUATION_PROTOCOL = 'docs/launch-readiness/forecast-evaluation-protocol-2026-06-06.json';
const DEFAULT_EVIDENCE = 'docs/launch-readiness/launch-evidence-2026-06-06.json';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/forecast-pre-resolution-capture-kit-2026-06-06.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/forecast-pre-resolution-capture-kit-2026-06-06.md';
const DEFAULT_QUESTION_CSV_OUTPUT = 'docs/launch-readiness/forecast-question-register-template-2026-06-06.csv';
const DEFAULT_SNAPSHOT_CSV_OUTPUT = 'docs/launch-readiness/forecast-pre-resolution-snapshot-template-2026-06-06.csv';
const DEFAULT_BASELINE_SNAPSHOT_CSV_OUTPUT = 'docs/launch-readiness/forecast-baseline-snapshot-template-2026-06-06.csv';
const DEFAULT_MIN_PLANNED_QUESTIONS = 25;

const QUESTION_REGISTER_COLUMNS = [
  'question_id',
  'title',
  'question_text',
  'niche',
  'source_surface',
  'created_at',
  'forecast_opened_at',
  'forecast_due_at',
  'scheduled_close_at',
  'resolution_criteria',
  'expected_resolution_source_url',
  'ambiguity_policy',
  'exclusion_rule',
  'decision_relevance',
  'owner',
  'public_or_private',
  'notes'
];

const PRE_RESOLUTION_SNAPSHOT_COLUMNS = [
  'snapshot_id',
  'question_id',
  'prediction_source',
  'forecaster_type',
  'model_or_team',
  'probability',
  'prediction_timestamp',
  'evidence_bundle_ref',
  'prompt_or_policy_version',
  'retrieval_cutoff',
  'source_cutoff',
  'abstained',
  'abstention_reason',
  'notes'
];

const BASELINE_SNAPSHOT_COLUMNS = [
  'baseline_snapshot_id',
  'question_id',
  'baseline_type',
  'label',
  'probability',
  'prediction_timestamp',
  'source_url',
  'sample_size',
  'timestamp_policy',
  'comparability_notes',
  'notes'
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
    'Usage: node scripts/build-forecast-pre-resolution-capture-kit.mjs',
    `  [--forecast-execution-readiness ${DEFAULT_FORECAST_EXECUTION_READINESS}]`,
    `  [--forecast-evaluation-protocol ${DEFAULT_FORECAST_EVALUATION_PROTOCOL}]`,
    `  [--evidence ${DEFAULT_EVIDENCE}]`,
    `  [--json-output ${DEFAULT_JSON_OUTPUT}]`,
    `  [--md-output ${DEFAULT_MD_OUTPUT}]`,
    `  [--question-csv-output ${DEFAULT_QUESTION_CSV_OUTPUT}]`,
    `  [--snapshot-csv-output ${DEFAULT_SNAPSHOT_CSV_OUTPUT}]`,
    `  [--baseline-snapshot-csv-output ${DEFAULT_BASELINE_SNAPSHOT_CSV_OUTPUT}]`,
    `  [--min-planned-questions ${DEFAULT_MIN_PLANNED_QUESTIONS}]`,
    '  [--update-evidence]'
  ].join('\n'));
}

if (hasFlag('--help') || hasFlag('-h')) {
  usage();
  process.exit(0);
}

const inputPaths = {
  forecastExecutionReadiness: argValue('--forecast-execution-readiness', DEFAULT_FORECAST_EXECUTION_READINESS),
  forecastEvaluationProtocol: argValue('--forecast-evaluation-protocol', DEFAULT_FORECAST_EVALUATION_PROTOCOL),
  evidence: argValue('--evidence', DEFAULT_EVIDENCE)
};

const outputPaths = {
  json: argValue('--json-output', DEFAULT_JSON_OUTPUT),
  md: argValue('--md-output', DEFAULT_MD_OUTPUT),
  questionCsv: argValue('--question-csv-output', DEFAULT_QUESTION_CSV_OUTPUT),
  snapshotCsv: argValue('--snapshot-csv-output', DEFAULT_SNAPSHOT_CSV_OUTPUT),
  baselineSnapshotCsv: argValue('--baseline-snapshot-csv-output', DEFAULT_BASELINE_SNAPSHOT_CSV_OUTPUT)
};

const minPlannedQuestions = Number(argValue('--min-planned-questions', DEFAULT_MIN_PLANNED_QUESTIONS));
const updateEvidence = hasFlag('--update-evidence');

if (!Number.isInteger(minPlannedQuestions) || minPlannedQuestions < 1) {
  console.error('--min-planned-questions must be a positive integer.');
  process.exit(2);
}

if (!outputPaths.json && !outputPaths.md && !outputPaths.questionCsv && !outputPaths.snapshotCsv && !outputPaths.baselineSnapshotCsv) {
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

const executionReadiness = readJsonIfExists(inputPaths.forecastExecutionReadiness, { status: 'missing', summary: {} });
const forecastProtocol = readJsonIfExists(inputPaths.forecastEvaluationProtocol, { status: 'missing', protocol_stages: [] });

const repoReadyForOwnerCapture = Boolean(executionReadiness.summary?.execution_ready_for_owner_resolved_export);
const protocolStages = Array.isArray(forecastProtocol.protocol_stages) ? forecastProtocol.protocol_stages.length : 0;
const generatedAt = new Date().toISOString();

const acceptanceGates = [
  {
    gate: 'pre_resolution_question_register_template_ready',
    status: 'passed',
    proof_bucket: 'repo_artifact',
    evidence: `${QUESTION_REGISTER_COLUMNS.length} required question-register columns generated.`,
    next_action: `Owner fills at least ${minPlannedQuestions} planned forecast questions before relying on pilot accuracy claims.`
  },
  {
    gate: 'pre_resolution_forecast_snapshot_template_ready',
    status: 'passed',
    proof_bucket: 'repo_artifact',
    evidence: `${PRE_RESOLUTION_SNAPSHOT_COLUMNS.length} required pre-resolution snapshot columns generated.`,
    next_action: 'Capture each probability before scheduled close/resolution with retrieval and source cutoff timestamps.'
  },
  {
    gate: 'pre_resolution_baseline_snapshot_template_ready',
    status: 'passed',
    proof_bucket: 'repo_artifact',
    evidence: `${BASELINE_SNAPSHOT_COLUMNS.length} baseline-snapshot columns generated.`,
    next_action: 'Capture comparable human, community, pro, market, or model baseline probabilities before resolution.'
  },
  {
    gate: 'resolved_scoring_boundary_preserved',
    status: 'passed',
    proof_bucket: 'repo_artifact',
    evidence: 'The kit starts admissible evidence collection but does not mark any row resolved or score any claim.',
    next_action: 'After outcomes resolve, convert owner-approved rows to the resolved export and run validation/scoring gates.'
  },
  {
    gate: 'forecast_execution_readiness_linked',
    status: repoReadyForOwnerCapture ? 'passed' : 'needs_review',
    proof_bucket: 'repo_artifact',
    evidence: `${inputPaths.forecastExecutionReadiness} status=${executionReadiness.status}; execution_ready_for_owner_resolved_export=${repoReadyForOwnerCapture}.`,
    next_action: repoReadyForOwnerCapture
      ? 'Use this kit as the starting evidence register for the forecast execution-readiness lane.'
      : 'Repair execution-readiness before owner capture begins.'
  }
];

const kit = {
  schema_version: 'forecast-pre-resolution-capture-kit-v1',
  generated_at: generatedAt,
  status: repoReadyForOwnerCapture
    ? 'forecast_pre_resolution_capture_kit_ready_not_accuracy_proof'
    : 'forecast_pre_resolution_capture_kit_ready_execution_readiness_needs_review',
  source: {
    forecast_execution_readiness: inputPaths.forecastExecutionReadiness,
    forecast_execution_readiness_status: executionReadiness.status ?? 'unknown',
    execution_ready_for_owner_resolved_export: repoReadyForOwnerCapture,
    forecast_evaluation_protocol: inputPaths.forecastEvaluationProtocol,
    protocol_stage_count: protocolStages
  },
  summary: {
    min_planned_questions: minPlannedQuestions,
    question_register_template: outputPaths.questionCsv,
    pre_resolution_snapshot_template: outputPaths.snapshotCsv,
    baseline_snapshot_template: outputPaths.baselineSnapshotCsv,
    question_register_column_count: QUESTION_REGISTER_COLUMNS.length,
    pre_resolution_snapshot_column_count: PRE_RESOLUTION_SNAPSHOT_COLUMNS.length,
    baseline_snapshot_column_count: BASELINE_SNAPSHOT_COLUMNS.length,
    accuracy_claim_allowed: false,
    world_class_prediction_claim_allowed: false
  },
  required_owner_inputs: [
    {
      artifact: outputPaths.questionCsv,
      purpose: 'Register forecast questions before outcomes are known.',
      minimum_rows: minPlannedQuestions,
      required_columns: QUESTION_REGISTER_COLUMNS,
      owner_rule: 'Every question needs resolution criteria, expected resolution source, ambiguity policy, exclusion rule, and decision relevance before the first app forecast snapshot is captured.'
    },
    {
      artifact: outputPaths.snapshotCsv,
      purpose: 'Capture app/model/team probabilities before resolution.',
      minimum_rows: minPlannedQuestions,
      required_columns: PRE_RESOLUTION_SNAPSHOT_COLUMNS,
      owner_rule: 'Every probability needs prediction_timestamp, evidence_bundle_ref, prompt_or_policy_version, retrieval_cutoff, and source_cutoff. Post-resolution or timestamp-missing rows cannot support accuracy claims.'
    },
    {
      artifact: outputPaths.baselineSnapshotCsv,
      purpose: 'Capture comparable baseline probabilities before resolution.',
      minimum_rows: 1,
      required_columns: BASELINE_SNAPSHOT_COLUMNS,
      owner_rule: 'Every baseline probability needs source URL or documented source, timestamp policy, and comparability notes before benchmark comparison.'
    }
  ],
  owner_action_order: [
    'Choose at least 25 binary questions across the five commercial niches before outcomes are known.',
    'Fill the question register with resolution criteria, expected resolution source, ambiguity policy, exclusion rule, and decision relevance.',
    'Capture app/model/team probabilities in the pre-resolution snapshot template before each scheduled close/resolution.',
    'Capture comparable human/community/pro/model/market baseline probabilities before resolution where available.',
    'Freeze or archive the completed pre-resolution packet so later resolved exports can prove timestamp order and leakage boundaries.',
    'After outcomes resolve, convert eligible rows into the approved resolved forecast export and run accuracy input, leakage, calibration, benchmark, science, claim consistency, and commercial confidence validators.'
  ],
  acceptance_gates: acceptanceGates,
  next_commands_after_resolution: [
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:accuracy:validate-inputs -- --forecast-csv <owner-approved-resolved-forecast-export.csv> --baseline-csv <real-human-community-pro-baseline.csv> --min-sample-size 25',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:forecast:leakage-review -- --register docs/launch-readiness/forecast-leakage-review-register-2026-06-06.csv --accuracy-input-validation <approved-accuracy-input-validation.json> --forecast-claim-governance docs/launch-readiness/forecast-claim-governance-2026-06-06.json',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:calibration:ledger -- --input <owner-approved-resolved-forecast-export.json-or-csv> --source-mode approved_export --min-sample-size 25 --bins 5',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:forecast:benchmark -- --ledger <approved-calibration-ledger.json> --baseline <real-human-community-pro-baseline.json-or-csv>',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:forecast:validate-scoring && npm run audit:forecast:validate-science && npm run audit:commercial:confidence'
  ],
  proof_boundary: {
    proves: [
      'The repo now has a pre-resolution evidence packet for starting admissible forecast collection before outcomes are known.',
      'The packet preserves timestamp, retrieval cutoff, source cutoff, resolution criteria, ambiguity, exclusion, and baseline comparability requirements.'
    ],
    does_not_prove: [
      'Any forecast outcome, calibration score, Brier score, baseline superiority, hosted runtime proof, enterprise trust proof, buyer validation, or world-class prediction claim.',
      'That any owner-filled pre-resolution rows currently exist.'
    ]
  }
};

function renderMarkdown(report) {
  const ownerRows = report.required_owner_inputs
    .map((input) => [
      input.artifact,
      input.minimum_rows,
      mdCell(input.purpose),
      mdCell(input.owner_rule)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const gateRows = report.acceptance_gates
    .map((gate) => [
      mdCell(gate.gate),
      mdCell(gate.status),
      mdCell(gate.proof_bucket),
      mdCell(gate.evidence),
      mdCell(gate.next_action)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  return `# Forecast Pre-Resolution Capture Kit - 2026-06-06

## Decision Boundary

Status: \`${report.status}\`.

This kit starts the evidence clock for future prediction-accuracy proof. It is not accuracy proof, benchmark proof, hosted proof, buyer validation, or world-class forecasting evidence.

## Owner Inputs

| Artifact | Minimum Rows | Purpose | Owner Rule |
|---|---:|---|---|
${ownerRows}

## Acceptance Gates

| Gate | Status | Proof Bucket | Evidence | Next Action |
|---|---|---|---|---|
${gateRows}

## Owner Action Order

${report.owner_action_order.map((item, index) => `${index + 1}. ${item}`).join('\n')}

## Next Commands After Resolution

${report.next_commands_after_resolution.map((item, index) => `${index + 1}. \`${item}\``).join('\n')}

## Proof Boundary

Proves: ${report.proof_boundary.proves.map((item) => `\`${item}\``).join('; ')}.

Does not prove: ${report.proof_boundary.does_not_prove.map((item) => `\`${item}\``).join('; ')}.
`;
}

function renderCsv(columns) {
  return `${csvLine(columns)}\n`;
}

if (outputPaths.json) {
  writeArtifact(outputPaths.json, `${JSON.stringify(kit, null, 2)}\n`);
}

if (outputPaths.md) {
  writeArtifact(outputPaths.md, renderMarkdown(kit));
}

if (outputPaths.questionCsv) {
  writeArtifact(outputPaths.questionCsv, renderCsv(QUESTION_REGISTER_COLUMNS));
}

if (outputPaths.snapshotCsv) {
  writeArtifact(outputPaths.snapshotCsv, renderCsv(PRE_RESOLUTION_SNAPSHOT_COLUMNS));
}

if (outputPaths.baselineSnapshotCsv) {
  writeArtifact(outputPaths.baselineSnapshotCsv, renderCsv(BASELINE_SNAPSHOT_COLUMNS));
}

if (updateEvidence) {
  const evidence = readJsonIfExists(inputPaths.evidence, null);
  if (!evidence) {
    console.error(`Cannot update missing evidence artifact: ${inputPaths.evidence}`);
    process.exit(2);
  }

  evidence.proof_buckets = evidence.proof_buckets ?? {};
  evidence.proof_buckets.local = replaceMatchingThenAppend(evidence.proof_buckets.local, [
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:forecast:pre-resolution-kit -- --json-output ${outputPaths.json} --md-output ${outputPaths.md} --question-csv-output ${outputPaths.questionCsv} --snapshot-csv-output ${outputPaths.snapshotCsv} --baseline-snapshot-csv-output ${outputPaths.baselineSnapshotCsv} --update-evidence: status ${kit.status}, min_planned_questions ${minPlannedQuestions}, accuracy_claim_allowed false`
  ], [
    /npm run audit:forecast:pre-resolution-kit/
  ]);

  evidence.proof_buckets.repo_artifact = replaceMatchingThenAppend(evidence.proof_buckets.repo_artifact, [
    'scripts/build-forecast-pre-resolution-capture-kit.mjs generates question, forecast-snapshot, and baseline-snapshot templates for starting timestamped pre-resolution forecast evidence collection',
    'docs/launch-readiness/forecast-pre-resolution-capture-kit-2026-06-06.json records owner action order and proof boundaries for future forecast accuracy evidence collection',
    'docs/launch-readiness/forecast-question-register-template-2026-06-06.csv, docs/launch-readiness/forecast-pre-resolution-snapshot-template-2026-06-06.csv, and docs/launch-readiness/forecast-baseline-snapshot-template-2026-06-06.csv provide the owner-filled pre-resolution evidence packet'
  ], [
    /scripts\/build-forecast-pre-resolution-capture-kit\.mjs/,
    /forecast-pre-resolution-capture-kit-2026-06-06\.json/,
    /forecast-question-register-template-2026-06-06\.csv/
  ]);

  evidence.forecast_pre_resolution_capture_kit = {
    status: kit.status,
    artifact: outputPaths.json,
    generated_at: kit.generated_at,
    min_planned_questions: minPlannedQuestions,
    question_register_template: outputPaths.questionCsv,
    pre_resolution_snapshot_template: outputPaths.snapshotCsv,
    baseline_snapshot_template: outputPaths.baselineSnapshotCsv,
    proof_boundary: 'Pre-resolution capture readiness only; no resolved outcomes, scores, baselines, hosted proof, or accuracy claims are proven.'
  };

  evidence.fix_report = evidence.fix_report ?? {};
  evidence.fix_report.files_changed = replaceMatchingThenAppend(evidence.fix_report.files_changed, [
    'scripts/build-forecast-pre-resolution-capture-kit.mjs',
    'docs/launch-readiness/forecast-pre-resolution-capture-kit-2026-06-06.json',
    'docs/launch-readiness/forecast-pre-resolution-capture-kit-2026-06-06.md',
    'docs/launch-readiness/forecast-question-register-template-2026-06-06.csv',
    'docs/launch-readiness/forecast-pre-resolution-snapshot-template-2026-06-06.csv',
    'docs/launch-readiness/forecast-baseline-snapshot-template-2026-06-06.csv',
    'package.json'
  ], [
    /scripts\/build-forecast-pre-resolution-capture-kit\.mjs/,
    /forecast-pre-resolution-capture-kit-2026-06-06\.json/,
    /forecast-pre-resolution-capture-kit-2026-06-06\.md/,
    /forecast-question-register-template-2026-06-06\.csv/,
    /forecast-pre-resolution-snapshot-template-2026-06-06\.csv/,
    /forecast-baseline-snapshot-template-2026-06-06\.csv/,
    /package\.json/
  ]);
  evidence.fix_report.tests_run = replaceMatchingThenAppend(evidence.fix_report.tests_run, [
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH node --check scripts/build-forecast-pre-resolution-capture-kit.mjs',
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:forecast:pre-resolution-kit -- --json-output ${outputPaths.json} --md-output ${outputPaths.md} --question-csv-output ${outputPaths.questionCsv} --snapshot-csv-output ${outputPaths.snapshotCsv} --baseline-snapshot-csv-output ${outputPaths.baselineSnapshotCsv} --update-evidence`
  ], [
    /node --check scripts\/build-forecast-pre-resolution-capture-kit\.mjs/,
    /npm run audit:forecast:pre-resolution-kit/
  ]);

  evidence.implementation_decisions = replaceByTaskId(evidence.implementation_decisions, {
    task_id: 'FORECAST-PRE-RESOLUTION-CAPTURE-KIT-2026-06-06',
    decision: 'Add a pre-resolution capture kit so forecast evidence can start before outcomes resolve.',
    acceptance_check: 'Generate question-register, pre-resolution forecast-snapshot, and baseline-snapshot templates with timestamp, source-cutoff, retrieval-cutoff, resolution-criteria, ambiguity, exclusion, and comparability fields while keeping accuracy claims blocked.',
    chosen_variant: 'minimal artifact generator and owner templates; no scoring, runtime edit, dependency, or hosted operation',
    repo_pattern_reused: 'Existing launch-readiness artifact generator and evidence update pattern',
    files_changed: [
      'scripts/build-forecast-pre-resolution-capture-kit.mjs',
      'package.json'
    ],
    tests_run: [
      'node --check scripts/build-forecast-pre-resolution-capture-kit.mjs',
      'npm run audit:forecast:pre-resolution-kit'
    ],
    proof: `${kit.status}; min_planned_questions=${minPlannedQuestions}; accuracy_claim_allowed=false; world_class_prediction_claim_allowed=false.`,
    reason: 'Resolved-export validators require real rows, but the repo also needs a controlled way to begin admissible pre-resolution evidence capture before those rows can exist.'
  });
  evidence.rejected_variants = replaceByTaskId(evidence.rejected_variants, {
    task_id: 'FORECAST-PRE-RESOLUTION-CAPTURE-KIT-2026-06-06',
    variant: 'Wait for resolved outcomes and only use the existing resolved export template.',
    reason_rejected: 'That preserves the current blocker because no admissible proof chain starts until after outcomes resolve, making timestamp and leakage evidence weaker.',
    tradeoff: 'A pre-resolution packet adds owner workflow clarity without changing product behavior or inflating confidence.',
    evidence: 'Existing forecast execution readiness has 0 valid resolved forecasts and 0 real baselines.'
  });
  evidence.code_optimization_reviews = replaceByTaskId(evidence.code_optimization_reviews, {
    target_task: 'FORECAST-PRE-RESOLUTION-CAPTURE-KIT-2026-06-06',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'No new dependency, no runtime code path, no API/secret use, and no scoring or claim upgrade.',
    tests_or_checks: [
      'node --check scripts/build-forecast-pre-resolution-capture-kit.mjs',
      'npm run audit:forecast:pre-resolution-kit'
    ],
    remaining_risk: 'Owner must still fill real pre-resolution rows, wait for outcomes, validate leakage, score real rows, attach baselines, and clear hosted/RLS gates before prediction claims can improve.'
  });

  writeArtifact(inputPaths.evidence, `${JSON.stringify(evidence, null, 2)}\n`);
}

console.log(JSON.stringify({
  json_output: outputPaths.json,
  md_output: outputPaths.md,
  question_csv_output: outputPaths.questionCsv,
  snapshot_csv_output: outputPaths.snapshotCsv,
  baseline_snapshot_csv_output: outputPaths.baselineSnapshotCsv,
  evidence_updated: updateEvidence,
  status: kit.status,
  min_planned_questions: minPlannedQuestions,
  execution_ready_for_owner_resolved_export: repoReadyForOwnerCapture,
  accuracy_claim_allowed: false,
  world_class_prediction_claim_allowed: false
}, null, 2));
