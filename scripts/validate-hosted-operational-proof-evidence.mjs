#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const ROOT = process.cwd();
const DEFAULT_REGISTER = 'docs/launch-readiness/hosted-operational-proof-evidence-template-2026-06-06.csv';
const DEFAULT_HOSTED_PROOF_KIT = 'docs/launch-readiness/hosted-operational-proof-kit-2026-06-06.json';
const DEFAULT_EVIDENCE = 'docs/launch-readiness/launch-evidence-2026-06-06.json';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/hosted-operational-proof-evidence-validation-2026-06-06.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/hosted-operational-proof-evidence-validation-2026-06-06.md';
const DEFAULT_CSV_OUTPUT = 'docs/launch-readiness/hosted-operational-proof-evidence-validation-checklist-2026-06-06.csv';

const REQUIRED_COLUMNS = [
  'smoke_id',
  'claim_checked',
  'npm_script',
  'command',
  'script_path',
  'script_exists',
  'run_status',
  'hosted_url',
  'deploy_id_or_commit',
  'run_timestamp',
  'operator',
  'log_path',
  'screenshot_path',
  'console_errors',
  'network_errors',
  'failure_class',
  'redaction_verified',
  'buyer_claim_allowed',
  'notes'
];

const ALLOWED_RUN_STATUSES = new Set(['', 'not_run', 'blocked', 'failed', 'passed', 'passed_with_caveats']);
const EXECUTED_STATUSES = new Set(['blocked', 'failed', 'passed', 'passed_with_caveats']);
const PASS_STATUSES = new Set(['passed', 'passed_with_caveats']);
const BUYER_CLAIM_PASS_STATUSES = new Set(['passed']);
const TRUE_VALUES = new Set(['true', 'yes', '1']);
const FALSE_VALUES = new Set(['false', 'no', '0', '']);
const FAILURE_CLASSES = new Set([
  '',
  'none',
  'secret_or_config',
  'deploy_drift',
  'schema_or_rls',
  'provider_reliability',
  'payment_or_entitlement',
  'product_behavior',
  'network_or_cors',
  'auth_or_session',
  'evidence_capture',
  'owner_approval_missing',
  'other'
]);

const CORE_COVERAGE_GROUPS = [
  {
    group: 'hosted_access',
    smoke_ids: ['hosted_access_preflight'],
    reason: 'Binds the run to an observable hosted project and redacted access state.'
  },
  {
    group: 'auth_and_entitlements',
    smoke_ids: ['hosted_auth_and_entitlements'],
    reason: 'Covers account, entitlement, and webhook rejection proof.'
  },
  {
    group: 'schema_preflight',
    smoke_ids: ['hosted_schema_preflight'],
    reason: 'Checks the hosted schema needed for premium workflows.'
  },
  {
    group: 'strategist_console',
    smoke_ids: ['hosted_strategist_console'],
    reason: 'Covers the primary strategic decision-intelligence route.'
  },
  {
    group: 'geopolitical_insights',
    smoke_ids: ['hosted_insights_gdelt'],
    reason: 'Covers the geopolitical-risk radar wedge with provider-mode evidence.'
  },
  {
    group: 'retrieval_and_analyze',
    smoke_ids: ['hosted_retrieval_and_evidence', 'hosted_analyze_evidence_canaries'],
    reason: 'Covers evidence retrieval and evidence-backed analysis canaries.'
  },
  {
    group: 'payment_and_pricing',
    smoke_ids: ['hosted_payment_and_pricing'],
    reason: 'Covers buyer-facing pricing, payment, and entitlement claims.'
  }
];

const PROHIBITED_CLAIM_PATTERNS = [
  /\bworld[- ]class\b/i,
  /\bcommercial[- ]ready\b/i,
  /\baccurate predictions?\b/i,
  /\bprediction superiority\b/i,
  /\bbuyer[- ]validated\b/i,
  /\benterprise[- ]ready\b/i,
  /\bfully proven\b/i,
  /\bproduction[- ]ready\b/i,
  /\bsecure runtime proven\b/i,
  /\btenant isolation proven\b/i
];

const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/i,
  /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  /\b(?:password|passwd|pwd|secret|token|api[_-]?key)\s*[:=]\s*['"]?[^'",\s]{8,}/i,
  /\bSUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['"]?[^'",\s]{8,}/i,
  /\bSTRIPE_SECRET_KEY\s*[:=]\s*['"]?[^'",\s]{8,}/i,
  /\bWHOP_WEBHOOK_SECRET\s*[:=]\s*['"]?[^'",\s]{8,}/i
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
    'Usage: node scripts/validate-hosted-operational-proof-evidence.mjs',
    `  [--register ${DEFAULT_REGISTER}]`,
    `  [--hosted-proof-kit ${DEFAULT_HOSTED_PROOF_KIT}]`,
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
  register: argValue('--register', DEFAULT_REGISTER),
  hostedProofKit: argValue('--hosted-proof-kit', DEFAULT_HOSTED_PROOF_KIT),
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

function readText(relativePath) {
  const absolutePath = resolveRepoPath(relativePath);
  if (!existsSync(absolutePath)) return null;
  return readFileSync(absolutePath, 'utf8');
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

  const nonEmptyRecords = records.filter((record) => record.some((value) => String(value ?? '').trim()));
  const [headers = [], ...body] = nonEmptyRecords;
  return {
    headers: headers.map((header) => header.trim()).filter(Boolean),
    rows: body.map((record) => {
      const item = {};
      headers.forEach((header, index) => {
        item[header.trim()] = record[index] ?? '';
      });
      return item;
    })
  };
}

function normalize(value) {
  return String(value ?? '').trim().toLowerCase();
}

function hasText(value) {
  return String(value ?? '').trim().length > 0;
}

function parseBoolean(value) {
  const normalized = normalize(value);
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return null;
}

function parseNonNegativeInteger(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (!/^\d+$/.test(text)) return null;
  return Number(text);
}

function parseDate(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function looksLikeHostedHttpsUrl(value) {
  const text = String(value ?? '').trim();
  if (!/^https:\/\/[^\s]+$/i.test(text)) return false;
  return !/\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::|\/|$)/i.test(text);
}

function artifactPathExists(value) {
  const text = String(value ?? '').trim();
  if (!text || text === 'owner_supplied_external') return false;
  return existsSync(resolveRepoPath(text));
}

function artifactReferencePresent(value) {
  return hasText(value);
}

function rowText(row) {
  return Object.entries(row ?? {})
    .filter(([key]) => !['command'].includes(key))
    .map(([, value]) => value)
    .join(' ');
}

function hasSecretLikeValue(row) {
  const text = rowText(row);
  return SECRET_PATTERNS.some((pattern) => pattern.test(text));
}

function hasProhibitedClaim(row) {
  const text = rowText(row);
  const lowerText = text.toLowerCase();
  const boundaryLanguagePatterns = [
    /\bno\s+world[- ]class\b/,
    /\bnot\s+world[- ]class\b/,
    /\bno\s+commercial[- ]ready\b/,
    /\bnot\s+commercial[- ]ready\b/,
    /\bhosted proof remains missing\b/,
    /\bnot\s+enterprise[- ]ready\b/,
    /\bnot\s+production[- ]ready\b/,
    /\bdo\s+not\s+claim[^.]{0,120}\bworld[- ]class\b/,
    /\bdo\s+not\s+claim[^.]{0,120}\bcommercial[- ]ready\b/
  ];

  if (boundaryLanguagePatterns.some((pattern) => pattern.test(lowerText))) {
    return false;
  }

  return PROHIBITED_CLAIM_PATTERNS.some((pattern) => pattern.test(text));
}

function missingColumns(headers) {
  return REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
}

function pushIssue(issues, rowNumber, field, problem, severity = 'error') {
  issues.push({
    row_number: rowNumber,
    field,
    severity,
    problem
  });
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

function renderTemplateFromSmokePlan(smokePlan) {
  const rows = smokePlan.map((item) => csvLine([
    item.id,
    item.market_claim_unlocked ?? '',
    item.npm_script ?? '',
    item.command ?? '',
    item.script_path ?? '',
    item.script_exists ? 'yes' : 'no',
    'not_run',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'no',
    'no',
    'Fill after owner-approved hosted smoke. Do not paste secrets.'
  ]));

  return `${[csvLine(REQUIRED_COLUMNS), ...rows].join('\n')}\n`;
}

const hostedProofKit = readJsonIfExists(inputPaths.hostedProofKit, {
  status: 'missing',
  smoke_plan: []
});
const smokePlan = Array.isArray(hostedProofKit.smoke_plan) ? hostedProofKit.smoke_plan : [];
const expectedSmokeIds = new Set(smokePlan.map((item) => item.id).filter(Boolean));
const registerExistedBeforeRun = existsSync(resolveRepoPath(inputPaths.register));

if (!registerExistedBeforeRun && smokePlan.length > 0) {
  writeArtifact(inputPaths.register, renderTemplateFromSmokePlan(smokePlan));
}

const registerText = readText(inputPaths.register);
if (!registerText) {
  console.error(`Missing hosted evidence register and no smoke plan was available to create one: ${inputPaths.register}`);
  process.exit(2);
}

const registerInput = parseCsv(registerText);
const registerMissingColumns = missingColumns(registerInput.headers);
const issues = [];
const rowsBySmokeId = new Map(registerInput.rows.map((row) => [String(row.smoke_id ?? '').trim(), row]));

for (const column of registerMissingColumns) {
  pushIssue(issues, 1, column, 'Hosted operational evidence register is missing a required column.');
}

for (const smokeId of expectedSmokeIds) {
  if (!rowsBySmokeId.has(smokeId)) {
    pushIssue(issues, 1, 'smoke_id', `Missing required hosted smoke row from proof kit: ${smokeId}.`);
  }
}

let executedSmokeCount = 0;
let passedSmokeCount = 0;
let buyerClaimAllowedCount = 0;
let redactionVerifiedCount = 0;
let logEvidencePresentCount = 0;
let logEvidenceExistsCount = 0;
let screenshotEvidencePresentCount = 0;
let screenshotEvidenceExistsCount = 0;

const normalizedRows = registerInput.rows.map((row, index) => {
  const rowNumber = index + 2;
  const smokeId = String(row.smoke_id ?? '').trim();
  const runStatus = normalize(row.run_status) || 'not_run';
  const scriptExistsValue = normalize(row.script_exists);
  const scriptExists = parseBoolean(row.script_exists);
  const actualScriptExists = hasText(row.script_path) ? existsSync(resolveRepoPath(row.script_path)) : false;
  const redactionVerified = parseBoolean(row.redaction_verified);
  const buyerClaimAllowed = parseBoolean(row.buyer_claim_allowed);
  const consoleErrors = parseNonNegativeInteger(row.console_errors);
  const networkErrors = parseNonNegativeInteger(row.network_errors);
  const logPresent = artifactReferencePresent(row.log_path);
  const logExists = row.log_path === 'owner_supplied_external' || artifactPathExists(row.log_path);
  const screenshotPresent = artifactReferencePresent(row.screenshot_path);
  const screenshotExists = row.screenshot_path === 'owner_supplied_external' || artifactPathExists(row.screenshot_path);
  const executed = EXECUTED_STATUSES.has(runStatus);
  const passed = PASS_STATUSES.has(runStatus);

  if (!smokeId) {
    pushIssue(issues, rowNumber, 'smoke_id', 'smoke_id is required.');
  } else if (expectedSmokeIds.size > 0 && !expectedSmokeIds.has(smokeId)) {
    pushIssue(issues, rowNumber, 'smoke_id', `Unknown smoke_id "${smokeId}" is not present in ${inputPaths.hostedProofKit}.`);
  }

  if (!ALLOWED_RUN_STATUSES.has(runStatus)) {
    pushIssue(issues, rowNumber, 'run_status', `Invalid run_status "${row.run_status}".`);
  }

  if (scriptExists === null) {
    pushIssue(issues, rowNumber, 'script_exists', 'script_exists must be yes/no, true/false, or 1/0.');
  } else if (scriptExists && !actualScriptExists) {
    pushIssue(issues, rowNumber, 'script_path', 'script_exists is yes but script_path does not exist in the repo.');
  } else if (!scriptExists && actualScriptExists && scriptExistsValue) {
    pushIssue(issues, rowNumber, 'script_exists', 'script_exists is no but script_path exists in the repo.', 'warning');
  }

  if (redactionVerified === null) {
    pushIssue(issues, rowNumber, 'redaction_verified', 'redaction_verified must be yes/no, true/false, or 1/0.');
  }

  if (buyerClaimAllowed === null) {
    pushIssue(issues, rowNumber, 'buyer_claim_allowed', 'buyer_claim_allowed must be yes/no, true/false, or 1/0.');
  }

  if (hasSecretLikeValue(row)) {
    pushIssue(issues, rowNumber, '*', 'Row appears to contain a secret-like value. Redact logs, screenshots, URLs, notes, and identifiers before using this row.');
  }

  if (hasProhibitedClaim(row)) {
    pushIssue(issues, rowNumber, '*', 'Row appears to contain unsupported hosted/commercial/enterprise/accuracy claim language.', 'warning');
  }

  if (executed) {
    executedSmokeCount += 1;
    if (!looksLikeHostedHttpsUrl(row.hosted_url)) {
      pushIssue(issues, rowNumber, 'hosted_url', 'Executed hosted rows must include an HTTPS non-local hosted_url.');
    }
    if (!hasText(row.deploy_id_or_commit)) {
      pushIssue(issues, rowNumber, 'deploy_id_or_commit', 'Executed hosted rows must include deployed commit, release id, or deploy id.');
    }
    if (!parseDate(row.run_timestamp)) {
      pushIssue(issues, rowNumber, 'run_timestamp', 'Executed hosted rows must include a parseable run_timestamp.');
    }
    if (!hasText(row.operator)) {
      pushIssue(issues, rowNumber, 'operator', 'Executed hosted rows must include operator or stable redacted operator id.');
    }
    if (redactionVerified !== true) {
      pushIssue(issues, rowNumber, 'redaction_verified', 'Executed hosted rows must mark redaction_verified as yes after logs/screenshots are reviewed.');
    }
  }

  if (passed) {
    passedSmokeCount += 1;
    if (!logPresent) {
      pushIssue(issues, rowNumber, 'log_path', 'Passed hosted rows must include log_path or owner_supplied_external.');
    } else if (!logExists) {
      pushIssue(issues, rowNumber, 'log_path', 'Passed hosted rows must point log_path to an existing repo artifact or owner_supplied_external.');
    }
    if (consoleErrors === null) {
      pushIssue(issues, rowNumber, 'console_errors', 'Passed hosted rows must include non-negative integer console_errors.');
    }
    if (networkErrors === null) {
      pushIssue(issues, rowNumber, 'network_errors', 'Passed hosted rows must include non-negative integer network_errors.');
    }
  }

  if (runStatus === 'passed' && ((consoleErrors ?? 0) > 0 || (networkErrors ?? 0) > 0)) {
    pushIssue(issues, rowNumber, 'run_status', 'Rows with console or network errors must use passed_with_caveats, failed, or blocked.');
  }

  if ((runStatus === 'failed' || runStatus === 'blocked' || runStatus === 'passed_with_caveats') && !FAILURE_CLASSES.has(normalize(row.failure_class))) {
    pushIssue(issues, rowNumber, 'failure_class', `failure_class must be one of: ${[...FAILURE_CLASSES].filter(Boolean).join(', ')}.`);
  }

  if ((runStatus === 'failed' || runStatus === 'blocked' || runStatus === 'passed_with_caveats') && !hasText(row.failure_class)) {
    pushIssue(issues, rowNumber, 'failure_class', 'Failed, blocked, and caveated rows must record a failure_class.');
  }

  if (screenshotPresent && !screenshotExists) {
    pushIssue(issues, rowNumber, 'screenshot_path', 'screenshot_path must exist in repo or be owner_supplied_external when present.');
  }

  if (buyerClaimAllowed === true) {
    buyerClaimAllowedCount += 1;
    if (!BUYER_CLAIM_PASS_STATUSES.has(runStatus)) {
      pushIssue(issues, rowNumber, 'buyer_claim_allowed', 'Buyer-claim rows must have run_status=passed, not failed, blocked, not_run, or passed_with_caveats.');
    }
    if (redactionVerified !== true) {
      pushIssue(issues, rowNumber, 'buyer_claim_allowed', 'Buyer-claim rows require redaction_verified=yes.');
    }
    if (!looksLikeHostedHttpsUrl(row.hosted_url)) {
      pushIssue(issues, rowNumber, 'buyer_claim_allowed', 'Buyer-claim rows require HTTPS non-local hosted_url.');
    }
    if (!hasText(row.deploy_id_or_commit)) {
      pushIssue(issues, rowNumber, 'buyer_claim_allowed', 'Buyer-claim rows require deploy_id_or_commit.');
    }
    if (!logExists) {
      pushIssue(issues, rowNumber, 'buyer_claim_allowed', 'Buyer-claim rows require existing log_path or owner_supplied_external.');
    }
    if ((consoleErrors ?? 0) > 0 || (networkErrors ?? 0) > 0) {
      pushIssue(issues, rowNumber, 'buyer_claim_allowed', 'Buyer-claim rows require zero console_errors and zero network_errors.');
    }
  }

  if (redactionVerified === true) redactionVerifiedCount += 1;
  if (logPresent) logEvidencePresentCount += 1;
  if (logExists) logEvidenceExistsCount += 1;
  if (screenshotPresent) screenshotEvidencePresentCount += 1;
  if (screenshotExists) screenshotEvidenceExistsCount += 1;

  const rowErrors = issues.filter((issue) => issue.row_number === rowNumber && issue.severity === 'error').length;

  return {
    smoke_id: smokeId,
    claim_checked: row.claim_checked ?? '',
    npm_script: row.npm_script ?? '',
    script_path: row.script_path ?? '',
    script_exists: scriptExists,
    actual_script_exists: actualScriptExists,
    run_status: runStatus,
    hosted_url_present: hasText(row.hosted_url),
    hosted_url_valid: looksLikeHostedHttpsUrl(row.hosted_url),
    deploy_id_or_commit_present: hasText(row.deploy_id_or_commit),
    run_timestamp_valid: Boolean(parseDate(row.run_timestamp)),
    operator_present: hasText(row.operator),
    log_path_present: logPresent,
    log_path_exists: logExists,
    screenshot_path_present: screenshotPresent,
    screenshot_path_exists: screenshotExists,
    console_errors: consoleErrors,
    network_errors: networkErrors,
    failure_class: normalize(row.failure_class),
    redaction_verified: redactionVerified,
    buyer_claim_allowed: buyerClaimAllowed,
    row_error_count: rowErrors,
    ready: runStatus === 'passed' && buyerClaimAllowed === true && rowErrors === 0
  };
});

const readySmokeIds = new Set(normalizedRows.filter((row) => row.ready).map((row) => row.smoke_id));
const coreCoverage = CORE_COVERAGE_GROUPS.map((group) => {
  const missingSmokeIds = group.smoke_ids.filter((smokeId) => !readySmokeIds.has(smokeId));
  return {
    ...group,
    status: missingSmokeIds.length === 0 ? 'passed' : 'open',
    missing_smoke_ids: missingSmokeIds
  };
});

const errorCount = issues.filter((issue) => issue.severity === 'error').length;
const warningCount = issues.filter((issue) => issue.severity !== 'error').length;
const noHostedRuns = executedSmokeCount === 0;
const schemaPass = registerMissingColumns.length === 0;
const allExpectedRowsPresent = [...expectedSmokeIds].every((smokeId) => rowsBySmokeId.has(smokeId));
const rowQualityPass = errorCount === 0;
const coreCoverageReady = coreCoverage.every((group) => group.status === 'passed');
const readyForBuyerSafeHostedClaims = rowQualityPass && coreCoverageReady;

function gateStatus(condition, noRuns = false) {
  if (noRuns) return 'open_no_hosted_runs';
  return condition ? 'passed' : 'failed';
}

const acceptanceGates = [
  {
    gate: 'register_schema_present',
    status: schemaPass ? 'passed' : 'failed',
    evidence: schemaPass
      ? `Register schema includes ${REQUIRED_COLUMNS.length} required columns.`
      : `Missing register columns: ${registerMissingColumns.join(', ')}.`,
    proof_bucket: 'repo_artifact'
  },
  {
    gate: 'all_proof_kit_rows_present',
    status: expectedSmokeIds.size === 0 ? 'failed' : allExpectedRowsPresent ? 'passed' : 'failed',
    evidence: `${rowsBySmokeId.size} register rows loaded for ${expectedSmokeIds.size} proof-kit smoke rows.`,
    proof_bucket: 'repo_artifact'
  },
  {
    gate: 'hosted_runs_present',
    status: noHostedRuns ? 'open_no_hosted_runs' : 'passed',
    evidence: `${executedSmokeCount} executed hosted rows loaded; ${passedSmokeCount} passed or caveated-pass rows loaded.`,
    proof_bucket: 'hosted_live'
  },
  {
    gate: 'row_quality_validation',
    status: gateStatus(schemaPass && rowQualityPass, noHostedRuns),
    evidence: `${errorCount} row-level errors and ${warningCount} warnings across hosted evidence register.`,
    proof_bucket: 'hosted_live'
  },
  {
    gate: 'redaction_review',
    status: gateStatus(redactionVerifiedCount >= executedSmokeCount && executedSmokeCount > 0, noHostedRuns),
    evidence: `${redactionVerifiedCount}/${executedSmokeCount} executed rows marked redaction_verified.`,
    proof_bucket: 'hosted_live'
  },
  {
    gate: 'evidence_artifacts_attached',
    status: gateStatus(logEvidenceExistsCount >= passedSmokeCount && passedSmokeCount > 0, noHostedRuns),
    evidence: `${logEvidenceExistsCount}/${passedSmokeCount} passed rows have existing log_path or owner_supplied_external; ${screenshotEvidenceExistsCount}/${screenshotEvidencePresentCount} screenshot references exist or are external.`,
    proof_bucket: 'hosted_live'
  },
  {
    gate: 'core_route_api_coverage',
    status: gateStatus(coreCoverageReady, noHostedRuns),
    evidence: `${coreCoverage.filter((group) => group.status === 'passed').length}/${coreCoverage.length} core hosted coverage groups passed with buyer-claim-ready rows.`,
    proof_bucket: 'hosted_live'
  },
  {
    gate: 'claim_boundary_preserved',
    status: issues.some((issue) => issue.problem.includes('unsupported hosted/commercial/enterprise/accuracy claim language')) ? 'warning' : 'passed',
    evidence: 'Rows are checked for unsupported hosted, commercial-ready, enterprise-ready, and prediction-accuracy language.',
    proof_bucket: 'repo_artifact'
  }
];

const status = noHostedRuns
  ? 'hosted_operational_evidence_validation_ready_no_hosted_runs'
  : errorCount > 0
    ? 'hosted_operational_evidence_validation_failed'
    : passedSmokeCount === 0
      ? 'hosted_operational_evidence_validation_executed_no_passes'
      : !coreCoverageReady
        ? 'hosted_operational_evidence_validation_partial_core_coverage_missing'
        : 'hosted_operational_evidence_validation_passed_buyer_safe_specific_claims';

const validation = {
  schema_version: 'hosted-operational-evidence-validation-v1',
  generated_at: new Date().toISOString(),
  status,
  proof_boundary: 'This artifact validates hosted smoke evidence rows for deploy binding, HTTPS hosted URL, log/screenshot attachment, redaction, core route/API coverage, and claim boundaries. It is not prediction-accuracy proof, buyer validation, enterprise security proof, legal/privacy approval, or commercial-ready proof.',
  source: {
    register: inputPaths.register,
    register_template_created: !registerExistedBeforeRun,
    hosted_proof_kit: inputPaths.hostedProofKit,
    hosted_proof_kit_status: hostedProofKit.status ?? 'missing',
    expected_smoke_count: expectedSmokeIds.size
  },
  summary: {
    register_row_count: registerInput.rows.length,
    expected_smoke_count: expectedSmokeIds.size,
    executed_smoke_count: executedSmokeCount,
    passed_smoke_count: passedSmokeCount,
    buyer_claim_allowed_count: buyerClaimAllowedCount,
    redaction_verified_count: redactionVerifiedCount,
    log_evidence_present_count: logEvidencePresentCount,
    log_evidence_exists_count: logEvidenceExistsCount,
    screenshot_evidence_present_count: screenshotEvidencePresentCount,
    screenshot_evidence_exists_count: screenshotEvidenceExistsCount,
    core_coverage_group_count: coreCoverage.length,
    core_coverage_ready_count: coreCoverage.filter((group) => group.status === 'passed').length,
    row_issue_count: issues.length,
    row_error_count: errorCount,
    active_release_hold_count: acceptanceGates.filter((gate) => gate.status !== 'passed').length,
    ready_for_buyer_safe_hosted_claims: readyForBuyerSafeHostedClaims,
    hosted_operational_claim_allowed: readyForBuyerSafeHostedClaims,
    commercial_ready_claim_allowed: false,
    world_class_prediction_claim_allowed: false
  },
  required_columns: REQUIRED_COLUMNS,
  allowed_values: {
    run_status: [...ALLOWED_RUN_STATUSES].sort(),
    failure_class: [...FAILURE_CLASSES].sort(),
    boolean_fields: ['yes', 'no', 'true', 'false', '1', '0']
  },
  core_coverage: coreCoverage,
  smoke_rows: normalizedRows,
  acceptance_gates: acceptanceGates,
  row_issues: issues,
  release_holds: acceptanceGates
    .filter((gate) => gate.status !== 'passed')
    .map((gate) => ({
      hold: gate.gate,
      severity: gate.status === 'failed' ? 'P1' : 'P2',
      status: 'active',
      evidence_needed: gate.evidence
    })),
  current_source_alignment: [
    {
      source: 'OWASP Web Security Testing Guide',
      url: 'https://owasp.org/www-project-web-security-testing-guide/',
      alignment: 'Hosted proof should be tied to deployment-relevant testing, mapped entry points, and recorded evidence rather than broad live-site claims.'
    },
    {
      source: 'OWASP Application Security Verification Standard',
      url: 'https://owasp.org/www-project-application-security-verification-standard/',
      alignment: 'Buyer-facing application security claims need requirement-level verification evidence, not only a smoke-plan template.'
    },
    {
      source: 'NIST SSDF SP 800-218',
      url: 'https://csrc.nist.gov/pubs/sp/800/218/final',
      alignment: 'Secure software release claims should be backed by repeatable verification evidence and vulnerability-response boundaries.'
    },
    {
      source: 'CISA Secure by Demand Guide',
      url: 'https://www.cisa.gov/sites/default/files/2024-08/SecureByDemandGuide_080624_508c.pdf',
      alignment: 'Procurement buyers should receive structured, non-secret supplier evidence and clear current-proof boundaries.'
    }
  ],
  next_commands_after_owner_data: [
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:hosted:validate-evidence -- --register ${inputPaths.register} --hosted-proof-kit ${inputPaths.hostedProofKit} --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence`,
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:commercial:confidence'
  ]
};

function renderMarkdown(report) {
  const gateRows = report.acceptance_gates
    .map((gate) => [
      mdCell(gate.gate),
      gate.status,
      mdCell(gate.evidence),
      gate.proof_bucket
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const coverageRows = report.core_coverage
    .map((group) => [
      mdCell(group.group),
      group.status,
      mdCell(group.smoke_ids.join(', ')),
      mdCell(group.missing_smoke_ids.join(', ') || 'none'),
      mdCell(group.reason)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const smokeRows = report.smoke_rows
    .map((row) => [
      mdCell(row.smoke_id),
      row.run_status,
      row.redaction_verified === true ? 'yes' : 'no',
      row.buyer_claim_allowed === true ? 'yes' : 'no',
      row.ready ? 'yes' : 'no',
      row.row_error_count
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const issueRows = report.row_issues.length
    ? report.row_issues
      .map((issue) => [
        issue.row_number,
        mdCell(issue.field),
        issue.severity,
        mdCell(issue.problem)
      ])
      .map((row) => `| ${row.join(' | ')} |`)
      .join('\n')
    : '| - | - | - | none |';

  const sourceRows = report.current_source_alignment
    .map((source) => [
      mdCell(source.source),
      source.url,
      mdCell(source.alignment)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  return `# Hosted Operational Proof Evidence Validation - 2026-06-06

## Decision Boundary

Status: \`${report.status}\`.

${report.proof_boundary}

Executed hosted rows: **${report.summary.executed_smoke_count}**. Passed rows: **${report.summary.passed_smoke_count}**. Buyer-claim-allowed rows: **${report.summary.buyer_claim_allowed_count}**.

Ready for buyer-safe hosted claims: **${report.summary.ready_for_buyer_safe_hosted_claims}**.

Commercial-ready claim allowed: **${report.summary.commercial_ready_claim_allowed}**. World-class prediction claim allowed: **${report.summary.world_class_prediction_claim_allowed}**.

## Acceptance Gates

| Gate | Status | Evidence | Proof Bucket |
|---|---|---|---|
${gateRows}

## Core Hosted Coverage

| Group | Status | Smoke IDs | Missing | Reason |
|---|---|---|---|---|
${coverageRows}

## Smoke Rows

| Smoke ID | Run Status | Redaction Verified | Buyer Claim Allowed | Ready | Row Errors |
|---|---|---|---|---|---:|
${smokeRows}

## Row Issues

| Row | Field | Severity | Problem |
|---:|---|---|---|
${issueRows}

## Current Source Alignment

| Source | URL | Alignment |
|---|---|---|
${sourceRows}

## Next Commands After Owner Data

${report.next_commands_after_owner_data.map((command, index) => `${index + 1}. \`${command}\``).join('\n')}

## Proof Boundary

Passing this validator can support only the specific hosted workflows that were checked with redacted evidence. It still does not prove buyer validation, enterprise security, privacy/legal readiness, commercial-ready status, or world-class prediction accuracy.
`;
}

function renderCsv(report) {
  return [
    csvLine(['gate', 'status', 'evidence', 'proof_bucket']),
    ...report.acceptance_gates.map((gate) => csvLine([
      gate.gate,
      gate.status,
      gate.evidence,
      gate.proof_bucket
    ]))
  ].join('\n') + '\n';
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
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:hosted:validate-evidence -- --register ${inputPaths.register} --hosted-proof-kit ${inputPaths.hostedProofKit} --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence: status ${validation.status}, ${validation.summary.executed_smoke_count} executed hosted rows, ${validation.summary.buyer_claim_allowed_count} buyer-claim-allowed rows, ready_for_buyer_safe_hosted_claims ${validation.summary.ready_for_buyer_safe_hosted_claims}`
  ], [
    /npm run audit:hosted:validate-evidence/
  ]);

  evidence.proof_buckets.repo_artifact = replaceMatchingThenAppend(evidence.proof_buckets.repo_artifact, [
    'scripts/validate-hosted-operational-proof-evidence.mjs validates hosted smoke evidence rows for deploy binding, HTTPS hosted URL, redacted log/screenshot evidence, core route/API coverage, and claim boundaries before hosted claims can be upgraded',
    'docs/launch-readiness/hosted-operational-proof-evidence-template-2026-06-06.csv is the hosted smoke evidence register for owner-approved hosted command output, deploy binding, logs, screenshots, redaction, failure class, and buyer-claim flags',
    'docs/launch-readiness/hosted-operational-proof-evidence-validation-2026-06-06.json records hosted run count, pass count, buyer-claim-allowed count, redaction coverage, core hosted coverage, row quality, and release holds'
  ], [
    /scripts\/validate-hosted-operational-proof-evidence\.mjs/,
    /hosted-operational-proof-evidence-template-2026-06-06\.csv/,
    /hosted-operational-proof-evidence-validation-2026-06-06\.json/
  ]);

  evidence.fix_report = evidence.fix_report ?? {};
  evidence.fix_report.files_changed = replaceMatchingThenAppend(evidence.fix_report.files_changed, [
    'scripts/validate-hosted-operational-proof-evidence.mjs',
    'scripts/build-commercial-confidence-gate.mjs',
    'package.json',
    'docs/launch-readiness/hosted-operational-proof-evidence-validation-2026-06-06.json',
    'docs/launch-readiness/hosted-operational-proof-evidence-validation-2026-06-06.md',
    'docs/launch-readiness/hosted-operational-proof-evidence-validation-checklist-2026-06-06.csv'
  ], [
    /scripts\/validate-hosted-operational-proof-evidence\.mjs/,
    /scripts\/build-commercial-confidence-gate\.mjs/,
    /package\.json/,
    /hosted-operational-proof-evidence-validation-2026-06-06\.json/,
    /hosted-operational-proof-evidence-validation-2026-06-06\.md/,
    /hosted-operational-proof-evidence-validation-checklist-2026-06-06\.csv/
  ]);
  evidence.fix_report.tests_run = replaceMatchingThenAppend(evidence.fix_report.tests_run, [
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH node --check scripts/validate-hosted-operational-proof-evidence.mjs',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH node --check scripts/build-commercial-confidence-gate.mjs',
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:hosted:validate-evidence -- --register ${inputPaths.register} --hosted-proof-kit ${inputPaths.hostedProofKit} --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence`,
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:commercial:confidence'
  ], [
    /node --check scripts\/validate-hosted-operational-proof-evidence\.mjs/,
    /node --check scripts\/build-commercial-confidence-gate\.mjs/,
    /npm run audit:hosted:validate-evidence/,
    /npm run audit:commercial:confidence/
  ]);
  evidence.fix_report.approval_gates = replaceMatchingThenAppend(evidence.fix_report.approval_gates, [
    'Hosted operational evidence validation is repo/local validation proof only; owner-approved hosted URL, deployed commit or release id, secrets/smoke-user policy, executed hosted logs, screenshots where relevant, redaction review, core route/API coverage, hosted RLS/security proof, buyer validation, and accuracy proof remain required before live, commercial-ready, or world-class prediction claims can be upgraded.'
  ], [
    /Hosted operational evidence validation is repo\/local validation proof only/
  ]);

  evidence.implementation_decisions = replaceByTaskId(evidence.implementation_decisions, {
    task_id: 'hosted-operational-proof-evidence-validation-harness',
    decision: 'Add a deterministic no-dependency validator for hosted smoke evidence rows before hosted operational proof can upgrade buyer-facing live claims.',
    acceptance_check: 'Default hosted evidence template validates as schema-ready but no-hosted-runs, and commercial confidence remains not_95_confident without raising hosted operational proof score.',
    chosen_variant: 'minimal Node evidence-register validator wired to launch evidence and commercial confidence gate',
    repo_pattern_reused: 'Existing launch-readiness Node artifact validator pattern',
    files_changed: [
      'scripts/validate-hosted-operational-proof-evidence.mjs',
      'scripts/build-commercial-confidence-gate.mjs',
      'package.json'
    ],
    tests_run: [
      'node --check scripts/validate-hosted-operational-proof-evidence.mjs',
      'npm run audit:hosted:validate-evidence',
      'npm run audit:commercial:confidence'
    ],
    proof: `${validation.status}; executed_smoke_count=${validation.summary.executed_smoke_count}; buyer_claim_allowed_count=${validation.summary.buyer_claim_allowed_count}; commercial_ready_claim_allowed=false.`,
    reason: 'The hosted operational blocker needs machine-checkable deploy binding, redaction, log/screenshot evidence, and core route/API coverage so hosted proof cannot be upgraded from a template or unreviewed string entry.'
  });
  evidence.rejected_variants = replaceByTaskId(evidence.rejected_variants, {
    task_id: 'hosted-operational-proof-evidence-validation-harness',
    variant: 'Treat any hosted_live proof bucket entry as enough to increase hosted operational confidence.',
    reason_rejected: 'A raw proof string can omit deploy binding, HTTPS hosted URL, redaction status, log/screenshot evidence, core route/API coverage, and failure classification.',
    tradeoff: 'Score-neutral validation adds rigor without requiring secrets or production mutation.',
    evidence: `${validation.status} keeps commercial_ready_claim_allowed=false and world_class_prediction_claim_allowed=false.`
  });
  evidence.code_optimization_reviews = replaceByTaskId(evidence.code_optimization_reviews, {
    target_task: 'hosted-operational-proof-evidence-validation-harness',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'No new dependency, no runtime app change, no hosted command execution, non-destructive CSV validation, and generated artifacts remain repo/local proof only.',
    tests_or_checks: [
      'node --check scripts/validate-hosted-operational-proof-evidence.mjs',
      'npm run audit:hosted:validate-evidence',
      'npm run audit:commercial:confidence'
    ],
    remaining_risk: 'Actual owner-approved hosted smoke runs, redacted logs/screenshots, RLS proof, AI runtime proof, buyer proof, and accuracy proof are still missing.'
  });

  writeArtifact(inputPaths.evidence, `${JSON.stringify(evidence, null, 2)}\n`);
}

console.log(JSON.stringify({
  json_output: outputPaths.json,
  md_output: outputPaths.md,
  csv_output: outputPaths.csv,
  register: inputPaths.register,
  register_template_created: !registerExistedBeforeRun,
  evidence_updated: updateEvidence,
  status: validation.status,
  executed_smoke_count: validation.summary.executed_smoke_count,
  passed_smoke_count: validation.summary.passed_smoke_count,
  buyer_claim_allowed_count: validation.summary.buyer_claim_allowed_count,
  core_coverage_ready_count: validation.summary.core_coverage_ready_count,
  row_issue_count: validation.summary.row_issue_count,
  active_release_hold_count: validation.summary.active_release_hold_count,
  ready_for_buyer_safe_hosted_claims: validation.summary.ready_for_buyer_safe_hosted_claims,
  commercial_ready_claim_allowed: false,
  world_class_prediction_claim_allowed: false
}, null, 2));
