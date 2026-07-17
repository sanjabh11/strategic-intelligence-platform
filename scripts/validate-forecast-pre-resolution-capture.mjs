#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const ROOT = process.cwd();
const DEFAULT_QUESTION_REGISTER = 'docs/launch-readiness/forecast-question-register-template-2026-06-06.csv';
const DEFAULT_FORECAST_SNAPSHOT = 'docs/launch-readiness/forecast-pre-resolution-snapshot-template-2026-06-06.csv';
const DEFAULT_BASELINE_SNAPSHOT = 'docs/launch-readiness/forecast-baseline-snapshot-template-2026-06-06.csv';
const DEFAULT_CAPTURE_KIT = 'docs/launch-readiness/forecast-pre-resolution-capture-kit-2026-06-06.json';
const DEFAULT_EVIDENCE = 'docs/launch-readiness/launch-evidence-2026-06-06.json';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/forecast-pre-resolution-capture-validation-2026-06-06.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/forecast-pre-resolution-capture-validation-2026-06-06.md';
const DEFAULT_CSV_OUTPUT = 'docs/launch-readiness/forecast-pre-resolution-capture-validation-checklist-2026-06-06.csv';
const DEFAULT_MIN_PLANNED_QUESTIONS = 25;

const REQUIRED_QUESTION_COLUMNS = [
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

const REQUIRED_FORECAST_SNAPSHOT_COLUMNS = [
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

const REQUIRED_BASELINE_SNAPSHOT_COLUMNS = [
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
    'Usage: node scripts/validate-forecast-pre-resolution-capture.mjs',
    `  [--question-register ${DEFAULT_QUESTION_REGISTER}]`,
    `  [--forecast-snapshot ${DEFAULT_FORECAST_SNAPSHOT}]`,
    `  [--baseline-snapshot ${DEFAULT_BASELINE_SNAPSHOT}]`,
    `  [--capture-kit ${DEFAULT_CAPTURE_KIT}]`,
    `  [--evidence ${DEFAULT_EVIDENCE}]`,
    `  [--json-output ${DEFAULT_JSON_OUTPUT}]`,
    `  [--md-output ${DEFAULT_MD_OUTPUT}]`,
    `  [--csv-output ${DEFAULT_CSV_OUTPUT}]`,
    `  [--min-planned-questions ${DEFAULT_MIN_PLANNED_QUESTIONS}]`,
    '  [--update-evidence]'
  ].join('\n'));
}

if (hasFlag('--help') || hasFlag('-h')) {
  usage();
  process.exit(0);
}

const inputPaths = {
  questionRegister: argValue('--question-register', DEFAULT_QUESTION_REGISTER),
  forecastSnapshot: argValue('--forecast-snapshot', DEFAULT_FORECAST_SNAPSHOT),
  baselineSnapshot: argValue('--baseline-snapshot', DEFAULT_BASELINE_SNAPSHOT),
  captureKit: argValue('--capture-kit', DEFAULT_CAPTURE_KIT),
  evidence: argValue('--evidence', DEFAULT_EVIDENCE)
};

const outputPaths = {
  json: argValue('--json-output', DEFAULT_JSON_OUTPUT),
  md: argValue('--md-output', DEFAULT_MD_OUTPUT),
  csv: argValue('--csv-output', DEFAULT_CSV_OUTPUT)
};

const minPlannedQuestions = Number(argValue('--min-planned-questions', DEFAULT_MIN_PLANNED_QUESTIONS));
const updateEvidence = hasFlag('--update-evidence');

if (!Number.isInteger(minPlannedQuestions) || minPlannedQuestions < 1) {
  console.error('--min-planned-questions must be a positive integer.');
  process.exit(2);
}

if (!outputPaths.json && !outputPaths.md && !outputPaths.csv) {
  console.error('At least one output path is required.');
  process.exit(2);
}

function resolveRepoPath(relativePath) {
  return path.isAbsolute(relativePath) ? relativePath : path.join(ROOT, relativePath);
}

function readText(relativePath) {
  const absolutePath = resolveRepoPath(relativePath);
  if (!existsSync(absolutePath)) {
    console.error(`Missing required input artifact: ${relativePath}`);
    process.exit(2);
  }
  return {
    absolutePath,
    text: readFileSync(absolutePath, 'utf8')
  };
}

function readTextIfExists(relativePath) {
  const absolutePath = resolveRepoPath(relativePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, 'utf8') : '';
}

function readJsonIfExists(relativePath, fallback) {
  const text = readTextIfExists(relativePath);
  return text ? JSON.parse(text) : fallback;
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
  const rows = body.map((record) => {
    const item = {};
    headers.forEach((header, index) => {
      item[header.trim()] = record[index] ?? '';
    });
    return item;
  });

  return {
    kind: 'csv',
    headers: headers.map((header) => header.trim()).filter(Boolean),
    rows
  };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function readRows(relativePath, collectionNames) {
  const source = readText(relativePath);
  const extension = path.extname(source.absolutePath).toLowerCase();
  if (extension === '.csv') {
    return parseCsv(source.text);
  }

  const parsed = JSON.parse(source.text);
  const rows = Array.isArray(parsed)
    ? parsed
    : collectionNames.flatMap((name) => asArray(parsed[name]));

  return {
    kind: 'json',
    headers: [...new Set(rows.flatMap((row) => Object.keys(row ?? {})))],
    rows
  };
}

function normalizeProbability(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return numeric >= 0 && numeric <= 1 ? numeric : null;
}

function normalizePositiveInteger(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const integer = Math.floor(numeric);
  return integer > 0 && integer === numeric ? integer : null;
}

function normalizeBoolean(value) {
  const text = String(value ?? '').trim().toLowerCase();
  if (['true', 'yes', '1', 'y', 'abstained'].includes(text)) return true;
  if (['false', 'no', '0', 'n', ''].includes(text)) return false;
  return null;
}

function parseTimestamp(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function looksLikeUrl(value) {
  const text = String(value ?? '').trim();
  return /^https?:\/\/[^\s]+$/i.test(text);
}

function hasText(value) {
  return String(value ?? '').trim().length > 0;
}

function rowContainsPlaceholder(row) {
  const joined = Object.values(row ?? {}).join(' ').toLowerCase();
  return /\b(sample|fixture|placeholder|template|example|lorem|test-only)\b/.test(joined);
}

function missingColumns(headers, requiredColumns) {
  return requiredColumns.filter((column) => !headers.includes(column));
}

function pushIssue(issues, rowType, rowNumber, field, problem, severity = 'error') {
  issues.push({
    row_type: rowType,
    row_number: rowNumber,
    field,
    severity,
    problem
  });
}

function rowErrorCount(issues, rowType, rowNumber) {
  return issues.filter((issue) => (
    issue.row_type === rowType
    && issue.row_number === rowNumber
    && issue.severity === 'error'
  )).length;
}

function gateStatus(condition, emptyRows = false) {
  if (emptyRows) return 'open_no_owner_rows';
  return condition ? 'passed' : 'failed';
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

function validateQuestionRows(input) {
  const issues = [];
  const questionById = new Map();
  const validQuestionIds = new Set();
  const seenQuestionIds = new Set();
  let placeholderRowCount = 0;
  let sourceBackedQuestionCount = 0;
  let timestampOrderedQuestionCount = 0;

  input.rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const questionId = String(row.question_id ?? '').trim();
    const createdAt = parseTimestamp(row.created_at);
    const openedAt = parseTimestamp(row.forecast_opened_at);
    const dueAt = parseTimestamp(row.forecast_due_at);
    const closeAt = parseTimestamp(row.scheduled_close_at);
    const hasExpectedSource = hasText(row.expected_resolution_source_url);

    if (questionId && !questionById.has(questionId)) {
      questionById.set(questionId, {
        row,
        rowNumber,
        createdAt,
        openedAt,
        dueAt,
        closeAt
      });
    }

    if (rowContainsPlaceholder(row)) {
      placeholderRowCount += 1;
      pushIssue(issues, 'question', rowNumber, '*', 'Row appears to contain sample/template/placeholder text.');
    }

    if (!questionId) {
      pushIssue(issues, 'question', rowNumber, 'question_id', 'Missing stable question_id.');
    } else if (seenQuestionIds.has(questionId)) {
      pushIssue(issues, 'question', rowNumber, 'question_id', `Duplicate question_id ${questionId}.`);
    }
    seenQuestionIds.add(questionId);

    if (!hasText(row.title)) {
      pushIssue(issues, 'question', rowNumber, 'title', 'Missing concise forecast title.');
    }

    if (!hasText(row.question_text)) {
      pushIssue(issues, 'question', rowNumber, 'question_text', 'Missing forecast question text.');
    }

    if (!hasText(row.niche)) {
      pushIssue(issues, 'question', rowNumber, 'niche', 'Missing commercial niche tag.');
    }

    if (!hasText(row.source_surface)) {
      pushIssue(issues, 'question', rowNumber, 'source_surface', 'Missing source surface or data surface for the question.');
    }

    if (!createdAt) {
      pushIssue(issues, 'question', rowNumber, 'created_at', 'Missing parseable created_at timestamp.');
    }

    if (!openedAt) {
      pushIssue(issues, 'question', rowNumber, 'forecast_opened_at', 'Missing parseable forecast_opened_at timestamp.');
    }

    if (!dueAt) {
      pushIssue(issues, 'question', rowNumber, 'forecast_due_at', 'Missing parseable forecast_due_at timestamp.');
    }

    if (!closeAt) {
      pushIssue(issues, 'question', rowNumber, 'scheduled_close_at', 'Missing parseable scheduled_close_at timestamp.');
    }

    if (createdAt && openedAt && createdAt > openedAt) {
      pushIssue(issues, 'question', rowNumber, 'created_at', 'created_at must be on or before forecast_opened_at.');
    }

    if (openedAt && dueAt && openedAt > dueAt) {
      pushIssue(issues, 'question', rowNumber, 'forecast_opened_at', 'forecast_opened_at must be on or before forecast_due_at.');
    }

    if (dueAt && closeAt && dueAt > closeAt) {
      pushIssue(issues, 'question', rowNumber, 'forecast_due_at', 'forecast_due_at must be on or before scheduled_close_at.');
    }

    if (!hasText(row.resolution_criteria)) {
      pushIssue(issues, 'question', rowNumber, 'resolution_criteria', 'Missing pre-registered resolution criteria.');
    }

    if (!hasExpectedSource) {
      pushIssue(issues, 'question', rowNumber, 'expected_resolution_source_url', 'Missing expected resolution source URL or documented source.');
    } else if (!looksLikeUrl(row.expected_resolution_source_url)) {
      pushIssue(issues, 'question', rowNumber, 'expected_resolution_source_url', 'Source is documented but is not an HTTP(S) URL; attach URL when available.', 'warning');
    }

    if (!hasText(row.ambiguity_policy)) {
      pushIssue(issues, 'question', rowNumber, 'ambiguity_policy', 'Missing ambiguity policy.');
    }

    if (!hasText(row.exclusion_rule)) {
      pushIssue(issues, 'question', rowNumber, 'exclusion_rule', 'Missing exclusion rule.');
    }

    if (!hasText(row.decision_relevance)) {
      pushIssue(issues, 'question', rowNumber, 'decision_relevance', 'Missing decision relevance statement.');
    }

    if (!hasText(row.owner)) {
      pushIssue(issues, 'question', rowNumber, 'owner', 'Missing owner.');
    }

    if (!hasText(row.public_or_private)) {
      pushIssue(issues, 'question', rowNumber, 'public_or_private', 'Missing public_or_private classification.');
    }

    if (hasExpectedSource) {
      sourceBackedQuestionCount += 1;
    }

    if (createdAt && openedAt && dueAt && closeAt && createdAt <= openedAt && openedAt <= dueAt && dueAt <= closeAt) {
      timestampOrderedQuestionCount += 1;
    }

    if (rowErrorCount(issues, 'question', rowNumber) === 0 && questionId) {
      validQuestionIds.add(questionId);
    }
  });

  return {
    issues,
    questionById,
    validQuestionIds,
    validQuestionCount: validQuestionIds.size,
    placeholderRowCount,
    sourceBackedQuestionCount,
    timestampOrderedQuestionCount
  };
}

function validateForecastSnapshots(input, questionValidation) {
  const issues = [];
  const coveredQuestionIds = new Set();
  const seenSnapshotIds = new Set();
  let validForecastSnapshotCount = 0;
  let abstainedSnapshotCount = 0;
  let placeholderRowCount = 0;
  let timestampOrderedSnapshotCount = 0;

  input.rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const snapshotId = String(row.snapshot_id ?? '').trim();
    const questionId = String(row.question_id ?? '').trim();
    const question = questionValidation.questionById.get(questionId);
    const abstained = normalizeBoolean(row.abstained);
    const probability = normalizeProbability(row.probability);
    const predictionTimestamp = parseTimestamp(row.prediction_timestamp);
    const retrievalCutoff = parseTimestamp(row.retrieval_cutoff);
    const sourceCutoff = parseTimestamp(row.source_cutoff);

    if (rowContainsPlaceholder(row)) {
      placeholderRowCount += 1;
      pushIssue(issues, 'forecast_snapshot', rowNumber, '*', 'Row appears to contain sample/template/placeholder text.');
    }

    if (!snapshotId) {
      pushIssue(issues, 'forecast_snapshot', rowNumber, 'snapshot_id', 'Missing stable snapshot_id.');
    } else if (seenSnapshotIds.has(snapshotId)) {
      pushIssue(issues, 'forecast_snapshot', rowNumber, 'snapshot_id', `Duplicate snapshot_id ${snapshotId}.`);
    }
    seenSnapshotIds.add(snapshotId);

    if (!questionId) {
      pushIssue(issues, 'forecast_snapshot', rowNumber, 'question_id', 'Missing question_id.');
    } else if (!question) {
      pushIssue(issues, 'forecast_snapshot', rowNumber, 'question_id', `question_id ${questionId} is not present in the question register.`);
    }

    if (!hasText(row.prediction_source)) {
      pushIssue(issues, 'forecast_snapshot', rowNumber, 'prediction_source', 'Missing prediction source.');
    }

    if (!hasText(row.forecaster_type)) {
      pushIssue(issues, 'forecast_snapshot', rowNumber, 'forecaster_type', 'Missing forecaster type.');
    }

    if (!hasText(row.model_or_team)) {
      pushIssue(issues, 'forecast_snapshot', rowNumber, 'model_or_team', 'Missing model or team label.');
    }

    if (abstained === true) {
      abstainedSnapshotCount += 1;
      if (!hasText(row.abstention_reason)) {
        pushIssue(issues, 'forecast_snapshot', rowNumber, 'abstention_reason', 'Abstained snapshots need an abstention reason.');
      }
    } else if (probability === null) {
      pushIssue(issues, 'forecast_snapshot', rowNumber, 'probability', 'Non-abstained probability must be a decimal between 0 and 1.');
    }

    if (abstained === null) {
      pushIssue(issues, 'forecast_snapshot', rowNumber, 'abstained', 'abstained must be true/false, yes/no, or 1/0.');
    }

    if (!predictionTimestamp) {
      pushIssue(issues, 'forecast_snapshot', rowNumber, 'prediction_timestamp', 'Missing parseable prediction_timestamp.');
    }

    if (question?.dueAt && predictionTimestamp && predictionTimestamp > question.dueAt) {
      pushIssue(issues, 'forecast_snapshot', rowNumber, 'prediction_timestamp', 'prediction_timestamp must be on or before question forecast_due_at.');
    }

    if (question?.closeAt && predictionTimestamp && predictionTimestamp >= question.closeAt) {
      pushIssue(issues, 'forecast_snapshot', rowNumber, 'prediction_timestamp', 'prediction_timestamp must be before scheduled_close_at.');
    }

    if (!hasText(row.evidence_bundle_ref)) {
      pushIssue(issues, 'forecast_snapshot', rowNumber, 'evidence_bundle_ref', 'Missing evidence bundle reference.');
    }

    if (!hasText(row.prompt_or_policy_version)) {
      pushIssue(issues, 'forecast_snapshot', rowNumber, 'prompt_or_policy_version', 'Missing prompt or policy version.');
    }

    if (!retrievalCutoff) {
      pushIssue(issues, 'forecast_snapshot', rowNumber, 'retrieval_cutoff', 'Missing parseable retrieval_cutoff timestamp.');
    }

    if (!sourceCutoff) {
      pushIssue(issues, 'forecast_snapshot', rowNumber, 'source_cutoff', 'Missing parseable source_cutoff timestamp.');
    }

    if (retrievalCutoff && predictionTimestamp && retrievalCutoff > predictionTimestamp) {
      pushIssue(issues, 'forecast_snapshot', rowNumber, 'retrieval_cutoff', 'retrieval_cutoff must be on or before prediction_timestamp.');
    }

    if (sourceCutoff && predictionTimestamp && sourceCutoff > predictionTimestamp) {
      pushIssue(issues, 'forecast_snapshot', rowNumber, 'source_cutoff', 'source_cutoff must be on or before prediction_timestamp.');
    }

    if (
      predictionTimestamp
      && retrievalCutoff
      && sourceCutoff
      && retrievalCutoff <= predictionTimestamp
      && sourceCutoff <= predictionTimestamp
      && (!question?.dueAt || predictionTimestamp <= question.dueAt)
      && (!question?.closeAt || predictionTimestamp < question.closeAt)
    ) {
      timestampOrderedSnapshotCount += 1;
    }

    if (rowErrorCount(issues, 'forecast_snapshot', rowNumber) === 0 && questionId) {
      validForecastSnapshotCount += 1;
      coveredQuestionIds.add(questionId);
    }
  });

  return {
    issues,
    coveredQuestionIds,
    validForecastSnapshotCount,
    abstainedSnapshotCount,
    placeholderRowCount,
    timestampOrderedSnapshotCount
  };
}

function validateBaselineSnapshots(input, questionValidation) {
  const issues = [];
  const coveredQuestionIds = new Set();
  const seenBaselineIds = new Set();
  let validBaselineSnapshotCount = 0;
  let placeholderRowCount = 0;
  let sourceBackedBaselineSnapshotCount = 0;
  let timestampOrderedBaselineSnapshotCount = 0;

  input.rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const baselineId = String(row.baseline_snapshot_id ?? '').trim();
    const questionId = String(row.question_id ?? '').trim();
    const question = questionValidation.questionById.get(questionId);
    const probability = normalizeProbability(row.probability);
    const predictionTimestamp = parseTimestamp(row.prediction_timestamp);
    const sampleSize = normalizePositiveInteger(row.sample_size);
    const hasSource = hasText(row.source_url);

    if (rowContainsPlaceholder(row)) {
      placeholderRowCount += 1;
      pushIssue(issues, 'baseline_snapshot', rowNumber, '*', 'Row appears to contain sample/template/placeholder text.');
    }

    if (!baselineId) {
      pushIssue(issues, 'baseline_snapshot', rowNumber, 'baseline_snapshot_id', 'Missing stable baseline_snapshot_id.');
    } else if (seenBaselineIds.has(baselineId)) {
      pushIssue(issues, 'baseline_snapshot', rowNumber, 'baseline_snapshot_id', `Duplicate baseline_snapshot_id ${baselineId}.`);
    }
    seenBaselineIds.add(baselineId);

    if (!questionId) {
      pushIssue(issues, 'baseline_snapshot', rowNumber, 'question_id', 'Missing question_id.');
    } else if (!question) {
      pushIssue(issues, 'baseline_snapshot', rowNumber, 'question_id', `question_id ${questionId} is not present in the question register.`);
    }

    if (!hasText(row.baseline_type)) {
      pushIssue(issues, 'baseline_snapshot', rowNumber, 'baseline_type', 'Missing baseline type.');
    }

    if (!hasText(row.label)) {
      pushIssue(issues, 'baseline_snapshot', rowNumber, 'label', 'Missing baseline label.');
    }

    if (probability === null) {
      pushIssue(issues, 'baseline_snapshot', rowNumber, 'probability', 'Probability must be a decimal between 0 and 1.');
    }

    if (!predictionTimestamp) {
      pushIssue(issues, 'baseline_snapshot', rowNumber, 'prediction_timestamp', 'Missing parseable prediction_timestamp.');
    }

    if (question?.dueAt && predictionTimestamp && predictionTimestamp > question.dueAt) {
      pushIssue(issues, 'baseline_snapshot', rowNumber, 'prediction_timestamp', 'prediction_timestamp must be on or before question forecast_due_at.');
    }

    if (question?.closeAt && predictionTimestamp && predictionTimestamp >= question.closeAt) {
      pushIssue(issues, 'baseline_snapshot', rowNumber, 'prediction_timestamp', 'prediction_timestamp must be before scheduled_close_at.');
    }

    if (!hasSource) {
      pushIssue(issues, 'baseline_snapshot', rowNumber, 'source_url', 'Missing source URL or documented source.');
    } else if (!looksLikeUrl(row.source_url)) {
      pushIssue(issues, 'baseline_snapshot', rowNumber, 'source_url', 'Source is documented but is not an HTTP(S) URL; attach URL when available.', 'warning');
    }

    if (sampleSize === null) {
      pushIssue(issues, 'baseline_snapshot', rowNumber, 'sample_size', 'Sample size must be a positive integer.');
    }

    if (!hasText(row.timestamp_policy)) {
      pushIssue(issues, 'baseline_snapshot', rowNumber, 'timestamp_policy', 'Missing timestamp policy.');
    }

    if (!hasText(row.comparability_notes)) {
      pushIssue(issues, 'baseline_snapshot', rowNumber, 'comparability_notes', 'Missing comparability notes.');
    }

    if (
      predictionTimestamp
      && (!question?.dueAt || predictionTimestamp <= question.dueAt)
      && (!question?.closeAt || predictionTimestamp < question.closeAt)
    ) {
      timestampOrderedBaselineSnapshotCount += 1;
    }

    if (hasSource) {
      sourceBackedBaselineSnapshotCount += 1;
    }

    if (rowErrorCount(issues, 'baseline_snapshot', rowNumber) === 0 && questionId) {
      validBaselineSnapshotCount += 1;
      coveredQuestionIds.add(questionId);
    }
  });

  return {
    issues,
    coveredQuestionIds,
    validBaselineSnapshotCount,
    placeholderRowCount,
    sourceBackedBaselineSnapshotCount,
    timestampOrderedBaselineSnapshotCount
  };
}

const questionInput = readRows(inputPaths.questionRegister, ['questions', 'rows', 'records', 'data']);
const forecastSnapshotInput = readRows(inputPaths.forecastSnapshot, ['forecast_snapshots', 'snapshots', 'rows', 'records', 'data']);
const baselineSnapshotInput = readRows(inputPaths.baselineSnapshot, ['baseline_snapshots', 'snapshots', 'rows', 'records', 'data']);
const captureKit = readJsonIfExists(inputPaths.captureKit, { status: 'missing', summary: {} });

const questionMissingColumns = missingColumns(questionInput.headers, REQUIRED_QUESTION_COLUMNS);
const forecastSnapshotMissingColumns = missingColumns(forecastSnapshotInput.headers, REQUIRED_FORECAST_SNAPSHOT_COLUMNS);
const baselineSnapshotMissingColumns = missingColumns(baselineSnapshotInput.headers, REQUIRED_BASELINE_SNAPSHOT_COLUMNS);

const questionValidation = validateQuestionRows(questionInput);
const forecastSnapshotValidation = validateForecastSnapshots(forecastSnapshotInput, questionValidation);
const baselineSnapshotValidation = validateBaselineSnapshots(baselineSnapshotInput, questionValidation);
const rowIssues = [
  ...questionValidation.issues,
  ...forecastSnapshotValidation.issues,
  ...baselineSnapshotValidation.issues
];

if (questionMissingColumns.length) {
  pushIssue(rowIssues, 'question_schema', 1, questionMissingColumns.join(', '), 'Question register is missing required columns.');
}

if (forecastSnapshotMissingColumns.length) {
  pushIssue(rowIssues, 'forecast_snapshot_schema', 1, forecastSnapshotMissingColumns.join(', '), 'Forecast snapshot input is missing required columns.');
}

if (baselineSnapshotMissingColumns.length) {
  pushIssue(rowIssues, 'baseline_snapshot_schema', 1, baselineSnapshotMissingColumns.join(', '), 'Baseline snapshot input is missing required columns.');
}

const schemaReady = questionMissingColumns.length === 0
  && forecastSnapshotMissingColumns.length === 0
  && baselineSnapshotMissingColumns.length === 0;
const ownerRowsPresent = questionInput.rows.length > 0
  || forecastSnapshotInput.rows.length > 0
  || baselineSnapshotInput.rows.length > 0;
const rowErrorTotal = rowIssues.filter((issue) => issue.severity === 'error').length;
const rowWarningTotal = rowIssues.filter((issue) => issue.severity === 'warning').length;
const placeholderRowCount = questionValidation.placeholderRowCount
  + forecastSnapshotValidation.placeholderRowCount
  + baselineSnapshotValidation.placeholderRowCount;
const forecastSnapshotCoverageComplete = questionValidation.validQuestionCount > 0
  && forecastSnapshotValidation.coveredQuestionIds.size === questionValidation.validQuestionCount;
const readyForPreResolutionFreeze = schemaReady
  && ownerRowsPresent
  && rowErrorTotal === 0
  && questionValidation.validQuestionCount >= minPlannedQuestions
  && forecastSnapshotCoverageComplete
  && baselineSnapshotValidation.validBaselineSnapshotCount > 0;

const acceptanceGates = [
  {
    gate: 'question_schema_present',
    status: questionMissingColumns.length === 0 ? 'passed' : 'failed',
    proof_bucket: 'repo_artifact',
    evidence: questionMissingColumns.length
      ? `Missing question columns: ${questionMissingColumns.join(', ')}.`
      : `Question register includes ${REQUIRED_QUESTION_COLUMNS.length} required columns.`
  },
  {
    gate: 'forecast_snapshot_schema_present',
    status: forecastSnapshotMissingColumns.length === 0 ? 'passed' : 'failed',
    proof_bucket: 'repo_artifact',
    evidence: forecastSnapshotMissingColumns.length
      ? `Missing forecast snapshot columns: ${forecastSnapshotMissingColumns.join(', ')}.`
      : `Forecast snapshot register includes ${REQUIRED_FORECAST_SNAPSHOT_COLUMNS.length} required columns.`
  },
  {
    gate: 'baseline_snapshot_schema_present',
    status: baselineSnapshotMissingColumns.length === 0 ? 'passed' : 'failed',
    proof_bucket: 'repo_artifact',
    evidence: baselineSnapshotMissingColumns.length
      ? `Missing baseline snapshot columns: ${baselineSnapshotMissingColumns.join(', ')}.`
      : `Baseline snapshot register includes ${REQUIRED_BASELINE_SNAPSHOT_COLUMNS.length} required columns.`
  },
  {
    gate: 'owner_rows_present',
    status: ownerRowsPresent ? 'passed' : 'open_no_owner_rows',
    proof_bucket: 'owner_input',
    evidence: `${questionInput.rows.length} question rows, ${forecastSnapshotInput.rows.length} forecast snapshot rows, and ${baselineSnapshotInput.rows.length} baseline snapshot rows loaded.`
  },
  {
    gate: 'minimum_pre_resolution_question_rows',
    status: gateStatus(questionValidation.validQuestionCount >= minPlannedQuestions, !ownerRowsPresent),
    proof_bucket: 'owner_input',
    evidence: `${questionValidation.validQuestionCount} valid pre-resolution question rows; required ${minPlannedQuestions}.`
  },
  {
    gate: 'question_metadata_quality',
    status: gateStatus(
      questionInput.rows.length > 0
        && questionValidation.validQuestionCount === questionInput.rows.length
        && questionValidation.timestampOrderedQuestionCount === questionInput.rows.length,
      !ownerRowsPresent
    ),
    proof_bucket: 'owner_input',
    evidence: `${questionValidation.validQuestionCount}/${questionInput.rows.length} question rows pass metadata, resolution-source, ambiguity, exclusion, owner, and timestamp-order checks.`
  },
  {
    gate: 'forecast_snapshot_coverage_and_timestamp_quality',
    status: gateStatus(
      forecastSnapshotInput.rows.length > 0
        && forecastSnapshotCoverageComplete
        && forecastSnapshotValidation.validForecastSnapshotCount === forecastSnapshotInput.rows.length
        && forecastSnapshotValidation.timestampOrderedSnapshotCount === forecastSnapshotInput.rows.length,
      !ownerRowsPresent
    ),
    proof_bucket: 'owner_input',
    evidence: `${forecastSnapshotValidation.validForecastSnapshotCount}/${forecastSnapshotInput.rows.length} forecast snapshots pass probability/abstention, evidence bundle, cutoff, and timestamp checks; ${forecastSnapshotValidation.coveredQuestionIds.size}/${questionValidation.validQuestionCount} valid questions have a valid forecast snapshot.`
  },
  {
    gate: 'baseline_snapshot_present',
    status: gateStatus(
      baselineSnapshotValidation.validBaselineSnapshotCount > 0
        && baselineSnapshotValidation.validBaselineSnapshotCount === baselineSnapshotInput.rows.length
        && baselineSnapshotValidation.timestampOrderedBaselineSnapshotCount === baselineSnapshotInput.rows.length,
      !ownerRowsPresent
    ),
    proof_bucket: 'owner_input',
    evidence: `${baselineSnapshotValidation.validBaselineSnapshotCount}/${baselineSnapshotInput.rows.length} baseline snapshots pass probability, source, sample-size, timestamp, and comparability checks.`
  },
  {
    gate: 'placeholder_or_sample_rows_absent',
    status: gateStatus(placeholderRowCount === 0, !ownerRowsPresent),
    proof_bucket: 'owner_input',
    evidence: `${placeholderRowCount} sample/template/placeholder rows detected.`
  },
  {
    gate: 'ready_to_freeze_not_accuracy_proof',
    status: gateStatus(readyForPreResolutionFreeze, !ownerRowsPresent),
    proof_bucket: 'repo_artifact',
    evidence: 'A passed freeze gate only proves the pre-resolution packet is internally coherent; it does not prove outcomes, calibration, Brier scores, baseline superiority, hosted proof, or buyer-safe claims.'
  }
];

const status = !schemaReady
  ? 'forecast_pre_resolution_capture_validation_failed_schema'
  : !ownerRowsPresent
    ? 'forecast_pre_resolution_capture_validation_ready_no_owner_rows'
    : rowErrorTotal > 0
      ? 'forecast_pre_resolution_capture_validation_failed'
      : questionValidation.validQuestionCount < minPlannedQuestions
        ? 'forecast_pre_resolution_capture_validation_passed_below_question_threshold'
        : !forecastSnapshotCoverageComplete
          ? 'forecast_pre_resolution_capture_validation_passed_missing_forecast_snapshot_coverage'
          : baselineSnapshotValidation.validBaselineSnapshotCount < 1
            ? 'forecast_pre_resolution_capture_validation_passed_missing_baseline_snapshots'
            : 'forecast_pre_resolution_capture_validation_passed_ready_to_freeze';

const validation = {
  schema_version: 'forecast-pre-resolution-capture-validation-v1',
  generated_at: new Date().toISOString(),
  status,
  proof_boundary: 'This artifact validates pre-resolution question, forecast snapshot, and baseline snapshot inputs before outcomes resolve. It is not prediction-accuracy proof, benchmark superiority proof, hosted proof, or buyer proof.',
  source: {
    question_register: inputPaths.questionRegister,
    question_register_kind: questionInput.kind,
    forecast_snapshot: inputPaths.forecastSnapshot,
    forecast_snapshot_kind: forecastSnapshotInput.kind,
    baseline_snapshot: inputPaths.baselineSnapshot,
    baseline_snapshot_kind: baselineSnapshotInput.kind,
    capture_kit: inputPaths.captureKit,
    capture_kit_status: captureKit.status ?? 'missing',
    minimum_planned_questions: minPlannedQuestions
  },
  summary: {
    schema_ready: schemaReady,
    owner_rows_present: ownerRowsPresent,
    question_rows_read: questionInput.rows.length,
    valid_question_count: questionValidation.validQuestionCount,
    source_backed_question_count: questionValidation.sourceBackedQuestionCount,
    timestamp_ordered_question_count: questionValidation.timestampOrderedQuestionCount,
    forecast_snapshot_rows_read: forecastSnapshotInput.rows.length,
    valid_forecast_snapshot_count: forecastSnapshotValidation.validForecastSnapshotCount,
    abstained_forecast_snapshot_count: forecastSnapshotValidation.abstainedSnapshotCount,
    forecast_snapshot_covered_question_count: forecastSnapshotValidation.coveredQuestionIds.size,
    timestamp_ordered_forecast_snapshot_count: forecastSnapshotValidation.timestampOrderedSnapshotCount,
    baseline_snapshot_rows_read: baselineSnapshotInput.rows.length,
    valid_baseline_snapshot_count: baselineSnapshotValidation.validBaselineSnapshotCount,
    source_backed_baseline_snapshot_count: baselineSnapshotValidation.sourceBackedBaselineSnapshotCount,
    baseline_snapshot_covered_question_count: baselineSnapshotValidation.coveredQuestionIds.size,
    timestamp_ordered_baseline_snapshot_count: baselineSnapshotValidation.timestampOrderedBaselineSnapshotCount,
    question_missing_column_count: questionMissingColumns.length,
    forecast_snapshot_missing_column_count: forecastSnapshotMissingColumns.length,
    baseline_snapshot_missing_column_count: baselineSnapshotMissingColumns.length,
    row_issue_count: rowIssues.length,
    row_error_count: rowErrorTotal,
    row_warning_count: rowWarningTotal,
    active_release_hold_count: acceptanceGates.filter((gate) => gate.status !== 'passed').length,
    ready_for_pre_resolution_freeze: readyForPreResolutionFreeze,
    accuracy_claim_allowed: false,
    world_class_prediction_claim_allowed: false
  },
  required_columns: {
    questions: REQUIRED_QUESTION_COLUMNS,
    forecast_snapshots: REQUIRED_FORECAST_SNAPSHOT_COLUMNS,
    baseline_snapshots: REQUIRED_BASELINE_SNAPSHOT_COLUMNS
  },
  acceptance_gates: acceptanceGates,
  row_issues: rowIssues,
  release_holds: acceptanceGates
    .filter((gate) => gate.status !== 'passed')
    .map((gate) => ({
      hold: gate.gate,
      severity: gate.status === 'failed' ? 'P1' : 'P2',
      status: 'active',
      evidence_needed: gate.evidence
    })),
  next_commands_after_freeze: [
    'Archive the owner-filled question register, forecast snapshot, and baseline snapshot files with immutable timestamps.',
    'After outcomes resolve, convert eligible frozen question/snapshot rows into the approved resolved forecast export.',
    'Run audit:accuracy:validate-inputs, audit:forecast:leakage-review, audit:calibration:ledger, audit:forecast:benchmark, audit:forecast:validate-scoring, and audit:commercial:confidence on owner-approved resolved rows.'
  ]
};

function renderCsv(report) {
  return [
    csvLine(['gate', 'status', 'proof_bucket', 'evidence']),
    ...report.acceptance_gates.map((gate) => csvLine([
      gate.gate,
      gate.status,
      gate.proof_bucket,
      gate.evidence
    ]))
  ].join('\n') + '\n';
}

function renderMarkdown(report) {
  const gateRows = report.acceptance_gates
    .map((gate) => [
      mdCell(gate.gate),
      mdCell(gate.status),
      mdCell(gate.proof_bucket),
      mdCell(gate.evidence)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const issueRows = report.row_issues.slice(0, 50)
    .map((issue) => [
      mdCell(issue.row_type),
      mdCell(issue.row_number),
      mdCell(issue.field),
      mdCell(issue.severity),
      mdCell(issue.problem)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  return `# Forecast Pre-Resolution Capture Validation - 2026-06-06

## Decision

Status: \`${report.status}\`.

Ready for pre-resolution freeze: **${report.summary.ready_for_pre_resolution_freeze}**.

Accuracy claim allowed: **${report.summary.accuracy_claim_allowed}**.

World-class prediction claim allowed: **${report.summary.world_class_prediction_claim_allowed}**.

This validates the pre-resolution capture packet only. It does not prove forecast accuracy, benchmark superiority, hosted proof, buyer validation, or world-class prediction performance.

## Summary

| Metric | Value |
|---|---:|
| Schema ready | ${report.summary.schema_ready} |
| Owner rows present | ${report.summary.owner_rows_present} |
| Valid questions | ${report.summary.valid_question_count} |
| Valid forecast snapshots | ${report.summary.valid_forecast_snapshot_count} |
| Forecast snapshot covered questions | ${report.summary.forecast_snapshot_covered_question_count} |
| Valid baseline snapshots | ${report.summary.valid_baseline_snapshot_count} |
| Row errors | ${report.summary.row_error_count} |
| Row warnings | ${report.summary.row_warning_count} |

## Acceptance Gates

| Gate | Status | Proof Bucket | Evidence |
|---|---|---|---|
${gateRows}

## Row Issues

${issueRows ? `| Row Type | Row Number | Field | Severity | Problem |
|---|---:|---|---|---|
${issueRows}` : 'No row issues recorded.'}

## Proof Boundary

The passed state, if reached, means the owner-filled packet is coherent enough to freeze before outcomes resolve. It still cannot support external prediction-accuracy language until resolved outcomes, comparable baselines, leakage review, scoring, hosted proof, RLS proof, and claim consistency all pass.
`;
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
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:forecast:validate-pre-resolution -- --question-register ${inputPaths.questionRegister} --forecast-snapshot ${inputPaths.forecastSnapshot} --baseline-snapshot ${inputPaths.baselineSnapshot} --capture-kit ${inputPaths.captureKit} --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence: status ${validation.status}, ready_for_pre_resolution_freeze ${validation.summary.ready_for_pre_resolution_freeze}, accuracy_claim_allowed false`
  ], [
    /npm run audit:forecast:validate-pre-resolution/
  ]);

  evidence.proof_buckets.repo_artifact = replaceMatchingThenAppend(evidence.proof_buckets.repo_artifact, [
    'scripts/validate-forecast-pre-resolution-capture.mjs validates owner-filled pre-resolution question, forecast snapshot, and baseline snapshot packets before outcomes resolve',
    'docs/launch-readiness/forecast-pre-resolution-capture-validation-2026-06-06.json records the pre-resolution freeze gate while keeping accuracy and world-class prediction claims blocked',
    'docs/launch-readiness/forecast-pre-resolution-capture-validation-checklist-2026-06-06.csv provides the pre-resolution capture checklist for owner packet review'
  ], [
    /scripts\/validate-forecast-pre-resolution-capture\.mjs/,
    /forecast-pre-resolution-capture-validation-2026-06-06\.json/,
    /forecast-pre-resolution-capture-validation-checklist-2026-06-06\.csv/
  ]);

  evidence.forecast_pre_resolution_capture_validation = {
    status: validation.status,
    artifact: outputPaths.json,
    question_rows_read: validation.summary.question_rows_read,
    valid_question_count: validation.summary.valid_question_count,
    forecast_snapshot_rows_read: validation.summary.forecast_snapshot_rows_read,
    valid_forecast_snapshot_count: validation.summary.valid_forecast_snapshot_count,
    baseline_snapshot_rows_read: validation.summary.baseline_snapshot_rows_read,
    valid_baseline_snapshot_count: validation.summary.valid_baseline_snapshot_count,
    row_error_count: validation.summary.row_error_count,
    ready_for_pre_resolution_freeze: validation.summary.ready_for_pre_resolution_freeze,
    accuracy_claim_allowed: false,
    world_class_prediction_claim_allowed: false,
    proof_boundary: validation.proof_boundary
  };

  evidence.fix_report = evidence.fix_report ?? {};
  evidence.fix_report.files_changed = replaceMatchingThenAppend(evidence.fix_report.files_changed, [
    'scripts/validate-forecast-pre-resolution-capture.mjs',
    'docs/launch-readiness/forecast-pre-resolution-capture-validation-2026-06-06.json',
    'docs/launch-readiness/forecast-pre-resolution-capture-validation-2026-06-06.md',
    'docs/launch-readiness/forecast-pre-resolution-capture-validation-checklist-2026-06-06.csv',
    'package.json'
  ], [
    /scripts\/validate-forecast-pre-resolution-capture\.mjs/,
    /forecast-pre-resolution-capture-validation-2026-06-06\.json/,
    /forecast-pre-resolution-capture-validation-2026-06-06\.md/,
    /forecast-pre-resolution-capture-validation-checklist-2026-06-06\.csv/,
    /package\.json/
  ]);
  evidence.fix_report.tests_run = replaceMatchingThenAppend(evidence.fix_report.tests_run, [
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH node --check scripts/validate-forecast-pre-resolution-capture.mjs',
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:forecast:validate-pre-resolution -- --question-register ${inputPaths.questionRegister} --forecast-snapshot ${inputPaths.forecastSnapshot} --baseline-snapshot ${inputPaths.baselineSnapshot} --capture-kit ${inputPaths.captureKit} --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence`
  ], [
    /node --check scripts\/validate-forecast-pre-resolution-capture\.mjs/,
    /npm run audit:forecast:validate-pre-resolution/
  ]);
  evidence.fix_report.approval_gates = replaceMatchingThenAppend(evidence.fix_report.approval_gates, [
    'Pre-resolution forecast capture validation proves only owner-packet coherence before outcomes resolve; real resolved outcomes, comparable baselines, leakage review, scoring, hosted/RLS proof, and owner-approved claim language remain required before prediction accuracy claims can be upgraded.'
  ], [
    /Pre-resolution forecast capture validation proves only/
  ]);

  evidence.implementation_decisions = replaceByTaskId(evidence.implementation_decisions, {
    task_id: 'FORECAST-PRE-RESOLUTION-CAPTURE-VALIDATOR-2026-06-06',
    decision: 'Add a deterministic validator for owner-filled pre-resolution forecast capture packets before outcomes resolve.',
    acceptance_check: 'The validator must verify schemas, owner row presence, question metadata, timestamp order, forecast snapshot coverage, baseline snapshot evidence, and placeholder absence while keeping accuracy claims blocked.',
    chosen_variant: 'minimal Node artifact validator plus package script; no app runtime edit, no new dependency, no scoring rewrite',
    repo_pattern_reused: 'Existing launch-readiness validator, artifact rendering, and launch evidence update pattern',
    files_changed: [
      'scripts/validate-forecast-pre-resolution-capture.mjs',
      'package.json'
    ],
    tests_run: [
      'node --check scripts/validate-forecast-pre-resolution-capture.mjs',
      'npm run audit:forecast:validate-pre-resolution'
    ],
    proof: `${validation.status}; schema_ready=${validation.summary.schema_ready}; owner_rows_present=${validation.summary.owner_rows_present}; ready_for_pre_resolution_freeze=${validation.summary.ready_for_pre_resolution_freeze}; accuracy_claim_allowed=false.`,
    reason: 'The prior kit generated the right templates, but it did not machine-check owner-filled pre-resolution packets before freezing them for later resolved-outcome scoring.'
  });
  evidence.rejected_variants = replaceByTaskId(evidence.rejected_variants, {
    task_id: 'FORECAST-PRE-RESOLUTION-CAPTURE-VALIDATOR-2026-06-06',
    variant: 'Leave the pre-resolution kit as templates and owner instructions only.',
    reason_rejected: 'Template-only evidence cannot catch missing timestamps, post-close snapshots, missing baseline comparability, placeholders, or question/snapshot ID mismatches before the packet is frozen.',
    tradeoff: 'A narrow validator creates an auditable gate without changing product behavior or inflating commercial confidence.',
    evidence: `${validation.status} keeps accuracy_claim_allowed=false.`
  });
  evidence.code_optimization_reviews = replaceByTaskId(evidence.code_optimization_reviews, {
    target_task: 'FORECAST-PRE-RESOLUTION-CAPTURE-VALIDATOR-2026-06-06',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'No dependency, no hosted or secret-dependent execution, no scoring algorithm change, and generated artifacts remain repo/local proof only.',
    tests_or_checks: [
      'node --check scripts/validate-forecast-pre-resolution-capture.mjs',
      'npm run audit:forecast:validate-pre-resolution'
    ],
    remaining_risk: 'Owner-filled rows, real resolved outcomes, comparable baselines, leakage review, hosted/RLS proof, and claim-language approval remain missing.'
  });

  writeArtifact(inputPaths.evidence, `${JSON.stringify(evidence, null, 2)}\n`);
}

console.log(JSON.stringify({
  json_output: outputPaths.json,
  md_output: outputPaths.md,
  csv_output: outputPaths.csv,
  evidence_updated: updateEvidence,
  status: validation.status,
  schema_ready: validation.summary.schema_ready,
  owner_rows_present: validation.summary.owner_rows_present,
  valid_question_count: validation.summary.valid_question_count,
  valid_forecast_snapshot_count: validation.summary.valid_forecast_snapshot_count,
  valid_baseline_snapshot_count: validation.summary.valid_baseline_snapshot_count,
  row_error_count: validation.summary.row_error_count,
  ready_for_pre_resolution_freeze: validation.summary.ready_for_pre_resolution_freeze,
  accuracy_claim_allowed: validation.summary.accuracy_claim_allowed,
  world_class_prediction_claim_allowed: validation.summary.world_class_prediction_claim_allowed
}, null, 2));
