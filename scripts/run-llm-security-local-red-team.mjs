#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const ROOT = process.cwd();

const DEFAULT_FIXTURES = 'docs/launch-readiness/llm-security-red-team-fixtures-2026-06-06.csv';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/llm-security-local-red-team-report-2026-06-06.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/llm-security-local-red-team-report-2026-06-06.md';
const DEFAULT_CSV_OUTPUT = 'docs/launch-readiness/llm-security-local-red-team-results-2026-06-06.csv';

const COMMANDS = [
  {
    id: 'provider_deno_red_team',
    label: 'Provider and edge-function local LLM security fixtures',
    command: 'deno',
    args: ['test', '--allow-env', '--allow-read', 'supabase/functions/_shared/llm-security-red-team.deno.ts'],
    fallback_command: 'npx',
    fallback_args: ['--yes', 'deno@2.8.2', 'test', '--allow-env', '--allow-read', 'supabase/functions/_shared/llm-security-red-team.deno.ts'],
    fixture_ids: [
      'direct_prompt_injection_user_input',
      'indirect_prompt_injection_retrieval_snippet',
      'secret_exfiltration_canary',
      'malformed_structured_json',
      'system_prompt_leakage',
      'excessive_agency_payment_or_outreach',
      'source_id_forgery',
      'stale_or_poisoned_retrieval',
      'misinformation_accuracy_overclaim',
      'unbounded_consumption_large_prompt'
    ]
  },
  {
    id: 'client_vitest_red_team',
    label: 'Client contract LLM security fixtures',
    command: 'npx',
    args: ['vitest', 'run', 'tests/llm-security-red-team.test.ts'],
    fixture_ids: [
      'source_id_forgery',
      'misinformation_accuracy_overclaim',
      'excessive_agency_payment_or_outreach'
    ]
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
    'Usage: node scripts/run-llm-security-local-red-team.mjs',
    `  [--fixtures ${DEFAULT_FIXTURES}]`,
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
  fixtures: argValue('--fixtures', DEFAULT_FIXTURES)
};
const outputPaths = {
  json: argValue('--json-output', DEFAULT_JSON_OUTPUT),
  md: argValue('--md-output', DEFAULT_MD_OUTPUT),
  csv: argValue('--csv-output', DEFAULT_CSV_OUTPUT)
};

function resolveRepoPath(relativePath) {
  return path.isAbsolute(relativePath) ? relativePath : path.join(ROOT, relativePath);
}

function readText(relativePath) {
  const absolutePath = resolveRepoPath(relativePath);
  if (!existsSync(absolutePath)) {
    console.error(`Missing required fixture file: ${relativePath}`);
    process.exit(2);
  }
  return readFileSync(absolutePath, 'utf8');
}

function writeArtifact(relativePath, contents) {
  if (!relativePath) return;
  const absolutePath = resolveRepoPath(relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, contents);
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

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csvLine(columns) {
  return columns.map(csvCell).join(',');
}

function truncate(value, maxLength = 5000) {
  const text = String(value ?? '');
  return text.length > maxLength ? `${text.slice(0, maxLength)}\n...[truncated]` : text;
}

function runCommand(spec) {
  const startedAt = new Date().toISOString();
  let command = spec.command;
  let commandArgs = spec.args;
  let child = spawnSync(command, commandArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${process.env.HOME}/.nvm/versions/node/v20.19.5/bin:${process.env.PATH ?? ''}`
    }
  });
  const fallbackUsed = child.error?.code === 'ENOENT' && spec.fallback_command && spec.fallback_args;
  if (fallbackUsed) {
    command = spec.fallback_command;
    commandArgs = spec.fallback_args;
    child = spawnSync(command, commandArgs, {
      cwd: ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${process.env.HOME}/.nvm/versions/node/v20.19.5/bin:${process.env.PATH ?? ''}`
      }
    });
  }

  return {
    id: spec.id,
    label: spec.label,
    command: [command, ...commandArgs].join(' '),
    fallback_used: Boolean(fallbackUsed),
    fixture_ids: spec.fixture_ids,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    exit_code: typeof child.status === 'number' ? child.status : 1,
    passed: child.status === 0,
    stdout: truncate(child.stdout),
    stderr: truncate(child.stderr),
    signal: child.signal ?? null,
    error: child.error ? String(child.error.message ?? child.error) : null
  };
}

function mdCell(value) {
  return String(value ?? '').replaceAll('|', '/').replace(/\s+/g, ' ').trim();
}

function renderMarkdown(report) {
  const commandRows = report.commands
    .map((command) => `| ${[
      command.id,
      command.passed ? 'passed' : 'failed',
      command.exit_code,
      command.command
    ].map(mdCell).join(' | ')} |`)
    .join('\n');

  const fixtureRows = report.fixture_results
    .map((fixture) => `| ${[
      fixture.id,
      fixture.maps_to,
      fixture.status,
      fixture.commands.join('; ')
    ].map(mdCell).join(' | ')} |`)
    .join('\n');

  return `# LLM Security Local Red-Team Report - 2026-06-06

## Decision

Status: \`${report.status}\`.

This report executes non-secret local Deno and Vitest fixtures. It is not hosted LLM behavior, jailbreak resistance certification, or buyer-accepted AI security proof.

## Summary

| Metric | Value |
|---|---:|
| Fixture count | ${report.summary.fixture_count} |
| Local fixtures executed | ${report.summary.local_red_team_executed_count} |
| Local fixtures passed | ${report.summary.local_red_team_passed_count} |
| Hosted runtime fixtures executed | ${report.summary.hosted_runtime_red_team_executed_count} |
| Commands passed | ${report.summary.command_pass_count}/${report.summary.command_count} |

## Commands

| Command | Status | Exit Code | Invocation |
|---|---|---:|---|
${commandRows}

## Fixture Results

| Fixture | Maps To | Status | Commands |
|---|---|---|---|
${fixtureRows}
`;
}

function renderCsv(report) {
  const headers = ['id', 'maps_to', 'status', 'commands'];
  return [
    csvLine(headers),
    ...report.fixture_results.map((fixture) => csvLine([
      fixture.id,
      fixture.maps_to,
      fixture.status,
      fixture.commands.join('; ')
    ]))
  ].join('\n') + '\n';
}

const fixtures = parseCsv(readText(inputPaths.fixtures));
const commands = COMMANDS.map(runCommand);
const passedFixtureIds = new Set();
const commandIdsByFixtureId = new Map(fixtures.map((fixture) => [fixture.id, []]));

for (const command of commands) {
  for (const fixtureId of command.fixture_ids) {
    if (!commandIdsByFixtureId.has(fixtureId)) {
      commandIdsByFixtureId.set(fixtureId, []);
    }
    commandIdsByFixtureId.get(fixtureId).push(command.id);
    if (command.passed) {
      passedFixtureIds.add(fixtureId);
    }
  }
}

const fixtureResults = fixtures.map((fixture) => {
  const commandsForFixture = commandIdsByFixtureId.get(fixture.id) ?? [];
  return {
    id: fixture.id,
    maps_to: fixture.maps_to,
    surface: fixture.surface,
    expected_control: fixture.expected_control,
    status: passedFixtureIds.has(fixture.id) ? 'local_test_executed_passed' : 'local_test_missing_or_failed',
    commands: commandsForFixture
  };
});

const passedCount = fixtureResults.filter((fixture) => fixture.status === 'local_test_executed_passed').length;
const commandPassCount = commands.filter((command) => command.passed).length;
const allPassed = passedCount === fixtureResults.length && commandPassCount === commands.length;

const report = {
  schema_version: 'llm-security-local-red-team-report-v1',
  generated_at: new Date().toISOString(),
  generated_for_date: '2026-06-06',
  status: allPassed ? 'local_llm_red_team_passed_not_hosted_proof' : 'local_llm_red_team_failed',
  proof_boundary: {
    allowed_use: 'Non-secret local regression evidence for provider sanitization, client provenance, and deterministic action gates.',
    not_proof_of: [
      'hosted model behavior',
      'jailbreak resistance certification',
      'absence of prompt injection vulnerabilities',
      'production log redaction',
      'buyer-accepted AI security posture'
    ]
  },
  source: {
    fixtures: inputPaths.fixtures,
    deno_test: 'supabase/functions/_shared/llm-security-red-team.deno.ts',
    vitest_test: 'tests/llm-security-red-team.test.ts'
  },
  summary: {
    fixture_count: fixtureResults.length,
    local_red_team_executed_count: fixtureResults.length,
    local_red_team_passed_count: passedCount,
    hosted_runtime_red_team_executed_count: 0,
    command_count: commands.length,
    command_pass_count: commandPassCount
  },
  commands,
  fixture_results: fixtureResults
};

writeArtifact(outputPaths.json, `${JSON.stringify(report, null, 2)}\n`);
writeArtifact(outputPaths.md, renderMarkdown(report));
writeArtifact(outputPaths.csv, renderCsv(report));

console.log(JSON.stringify({
  json_output: outputPaths.json,
  md_output: outputPaths.md,
  csv_output: outputPaths.csv,
  status: report.status,
  fixture_count: report.summary.fixture_count,
  local_red_team_passed_count: report.summary.local_red_team_passed_count,
  hosted_runtime_red_team_executed_count: report.summary.hosted_runtime_red_team_executed_count,
  command_pass_count: report.summary.command_pass_count,
  command_count: report.summary.command_count
}, null, 2));

if (!allPassed) {
  process.exit(1);
}
