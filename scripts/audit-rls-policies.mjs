#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const migrationDir = path.join(repoRoot, 'supabase', 'migrations');

const args = process.argv.slice(2);
const outputIndex = args.indexOf('--output');
const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : null;

const sensitiveTablePatterns = [
  /users?/i,
  /subscription/i,
  /usage/i,
  /human_reviews?/i,
  /review_queue/i,
  /analysis_runs?/i,
  /asset_storage/i,
  /schema_failures?/i,
  /retrievals?/i,
  /user_overrides?/i,
  /simulation_runs?/i,
  /collaborative/i,
  /session_participants?/i,
  /messages?/i,
  /warroom/i,
  /monitoring_alerts?/i,
  /rpc_errors?/i,
  /whitebox/i,
  /feature_usage/i,
  /whop/i,
  /classroom/i,
  /assignment/i
];

const publicReadAllowlist = new Set([
  'tier_limits',
  'marketplace_scenarios',
  'domain_specific_patterns'
]);

function usage() {
  console.error('Usage: node scripts/audit-rls-policies.mjs [--output path/to/report.json]');
}

function lineNumberForIndex(text, index) {
  return text.slice(0, index).split('\n').length;
}

function tableNameFromPolicy(statement) {
  const match = statement.match(/\bON\s+(?:public\.)?("?[\w]+"?)/i);
  return match ? match[1].replaceAll('"', '') : 'unknown';
}

function operationFromPolicy(statement) {
  const match = statement.match(/\bFOR\s+(SELECT|INSERT|UPDATE|DELETE|ALL)\b/i);
  return match ? match[1].toUpperCase() : 'ALL';
}

function policyNameFromStatement(statement) {
  const quoted = statement.match(/\bCREATE\s+POLICY\s+"([^"]+)"/i);
  if (quoted) return quoted[1];
  const unquoted = statement.match(/\bCREATE\s+POLICY\s+([^\s]+)\s+/i);
  return unquoted ? unquoted[1] : 'unknown_policy';
}

function isSensitiveTable(table) {
  return sensitiveTablePatterns.some((pattern) => pattern.test(table));
}

function normalizeStatement(statement) {
  return statement.replace(/\s+/g, ' ').trim();
}

function classifyPolicy(statement, table, operation) {
  const normalized = normalizeStatement(statement);
  const lower = normalized.toLowerCase();
  const findings = [];
  const sensitive = isSensitiveTable(table);
  const allowlistedPublicRead = operation === 'SELECT' && publicReadAllowlist.has(table);

  if (/\bTO\s+public\b/i.test(normalized)) {
    findings.push({
      severity: operation === 'SELECT' && !sensitive ? 'P2' : 'P1',
      issue: 'policy_grants_to_public_role',
      reason: 'Policy explicitly targets the public role.'
    });
  }

  if (/USING\s*\(\s*true\s*\)/i.test(normalized)) {
    findings.push({
      severity: allowlistedPublicRead ? 'P3' : sensitive || operation !== 'SELECT' ? 'P1' : 'P2',
      issue: 'unconditional_using_true',
      reason: 'Policy permits access without an ownership, role, status, or tenant predicate.'
    });
  }

  if (/WITH\s+CHECK\s*\(\s*auth\.role\s*\(\s*\)\s*=\s*'anon'\s*\)/i.test(normalized)) {
    findings.push({
      severity: 'P1',
      issue: 'anonymous_write_check',
      reason: 'Anonymous writes are accepted for this table.'
    });
  }

  if (operation !== 'SELECT' && /\bauth\.role\s*\(\s*\)\s*=\s*'anon'\b/i.test(normalized)) {
    findings.push({
      severity: 'P1',
      issue: 'anonymous_non_select_policy',
      reason: 'A non-read policy is bound to anonymous users.'
    });
  }

  if (
    operation === 'SELECT' &&
    sensitive &&
    !/(auth\.uid|get_user_role|service_role|status\s+NOT\s+IN|created_by|owner|user_id|auth_id)/i.test(normalized)
  ) {
    findings.push({
      severity: 'P1',
      issue: 'sensitive_table_read_without_identity_predicate',
      reason: 'Sensitive table read policy does not show a clear identity, role, status, or ownership predicate.'
    });
  }

  if (
    operation !== 'SELECT' &&
    !/(auth\.uid|get_user_role|service_role|created_by|owner|user_id|auth_id)/i.test(normalized)
  ) {
    findings.push({
      severity: 'P2',
      issue: 'write_without_obvious_identity_predicate',
      reason: 'Write policy does not show an obvious identity, role, or owner predicate.'
    });
  }

  return findings.map((finding) => ({
    ...finding,
    table,
    operation,
    statement: normalized.length > 360 ? `${normalized.slice(0, 357)}...` : normalized
  }));
}

function collectPolicies(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const relativePath = path.relative(repoRoot, filePath);
  const policies = [];
  const policyRegex = /CREATE\s+POLICY\b[\s\S]*?;/gi;
  let match;

  while ((match = policyRegex.exec(text)) !== null) {
    const statement = match[0];
    const table = tableNameFromPolicy(statement);
    const operation = operationFromPolicy(statement);
    const policy = policyNameFromStatement(statement);
    const line = lineNumberForIndex(text, match.index);
    const findings = classifyPolicy(statement, table, operation);
    policies.push({
      file: relativePath,
      line,
      policy,
      table,
      operation,
      findings
    });
  }

  return policies;
}

function collectRlsTables(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const relativePath = path.relative(repoRoot, filePath);
  const tables = [];
  const rlsRegex = /ALTER\s+TABLE\s+(?:public\.)?("?[\w]+"?)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY\s*;/gi;
  let match;

  while ((match = rlsRegex.exec(text)) !== null) {
    tables.push({
      file: relativePath,
      line: lineNumberForIndex(text, match.index),
      table: match[1].replaceAll('"', '')
    });
  }

  return tables;
}

if (outputIndex >= 0 && !outputPath) {
  usage();
  process.exit(2);
}

if (!existsSync(migrationDir)) {
  console.error(`Missing migration directory: ${migrationDir}`);
  process.exit(2);
}

const migrationFiles = readdirSync(migrationDir)
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .map((file) => path.join(migrationDir, file));

const rlsTables = migrationFiles.flatMap(collectRlsTables);
const policies = migrationFiles.flatMap(collectPolicies);
const findings = policies.flatMap((policy) =>
  policy.findings.map((finding) => ({
    ...finding,
    file: policy.file,
    line: policy.line,
    policy: policy.policy
  }))
);

const severityOrder = { P1: 1, P2: 2, P3: 3 };
findings.sort((a, b) =>
  (severityOrder[a.severity] - severityOrder[b.severity]) ||
  a.file.localeCompare(b.file) ||
  a.line - b.line ||
  a.table.localeCompare(b.table)
);

const summary = {
  migration_file_count: migrationFiles.length,
  rls_enabled_table_count: new Set(rlsTables.map((entry) => entry.table)).size,
  policy_count: policies.length,
  finding_count: findings.length,
  severity_counts: findings.reduce((acc, finding) => {
    acc[finding.severity] = (acc[finding.severity] || 0) + 1;
    return acc;
  }, { P1: 0, P2: 0, P3: 0 }),
  p1_table_count: new Set(findings.filter((finding) => finding.severity === 'P1').map((finding) => finding.table)).size
};

const report = {
  generated_at: new Date().toISOString(),
  repo: repoRoot,
  scope: 'static migration policy audit; does not prove currently deployed Supabase policies',
  summary,
  rls_tables: rlsTables,
  findings
};

const serialized = `${JSON.stringify(report, null, 2)}\n`;

if (outputPath) {
  const resolved = path.resolve(repoRoot, outputPath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  writeFileSync(resolved, serialized);
  console.log(`Wrote ${path.relative(repoRoot, resolved)}`);
  console.log(JSON.stringify(summary, null, 2));
} else {
  process.stdout.write(serialized);
}
