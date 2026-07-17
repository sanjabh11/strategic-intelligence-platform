#!/usr/bin/env node

import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const SOURCE_AUDIT = path.resolve(ROOT, process.argv[2] || '.positioning-audit');
const PINNED_VALIDATOR = path.join(ROOT, 'scripts/validate-audit-v8-schema.mjs');
const PARITY_VALIDATOR = path.join(ROOT, 'scripts/validate-audit-v8-parity.mjs');

function mutateJson(filePath, mutate) {
  const document = JSON.parse(readFileSync(filePath, 'utf8'));
  mutate(document);
  writeFileSync(filePath, `${JSON.stringify(document, null, 2)}\n`);
}

const fixtures = [
  {
    name: 'invalid_drift_status',
    mutate(dir) {
      mutateJson(path.join(dir, 'state.json'), (state) => { state.drift_status = 'assessed'; });
    },
  },
  {
    name: 'invalid_tool_health_status',
    mutate(dir) {
      mutateJson(path.join(dir, 'state.json'), (state) => { state.tool_health['lti-launch'].status = 'blocked_partial'; });
    },
  },
  {
    name: 'forbidden_experiment_root_field',
    mutate(dir) {
      mutateJson(path.join(dir, 'experiments.json'), (experiments) => { experiments.total_cost = '$0'; });
    },
  },
  {
    name: 'inconsistent_experiment_count',
    mutate(dir) {
      mutateJson(path.join(dir, 'state.json'), (state) => { state.experiments_designed += 1; });
    },
  },
  {
    name: 'execution_while_validation_pending',
    mutate(dir) {
      mutateJson(path.join(dir, 'state.json'), (state) => { state.experiments_executed = 1; });
    },
  },
  {
    name: 'supported_hypothesis_without_results',
    mutate(dir) {
      mutateJson(path.join(dir, 'state.json'), (state) => { state.hypotheses[0].status = 'supported'; });
      mutateJson(path.join(dir, 'hypotheses.json'), (hypotheses) => { hypotheses.hypotheses[0].status = 'supported'; });
    },
  },
];

let failed = false;
for (const fixture of fixtures) {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'sip-audit-v8-'));
  const auditDir = path.join(tempRoot, '.positioning-audit');
  try {
    cpSync(SOURCE_AUDIT, auditDir, { recursive: true });
    fixture.mutate(auditDir);
    const pinned = spawnSync(process.execPath, [PINNED_VALIDATOR, auditDir], { cwd: ROOT, encoding: 'utf8' });
    const parity = spawnSync(process.execPath, [PARITY_VALIDATOR, auditDir], { cwd: ROOT, encoding: 'utf8' });
    const passed = pinned.status !== 0 && parity.status !== 0;
    console.log(`  [${passed ? 'PASS' : 'FAIL'}] ${fixture.name} — pinned=${pinned.status}, parity=${parity.status}`);
    if (!passed) failed = true;
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

if (failed) {
  console.error('V8 NEGATIVE REGRESSION FIXTURES FAILED');
  process.exit(1);
}

console.log('ALL V8 NEGATIVE REGRESSION FIXTURES PASSED');
