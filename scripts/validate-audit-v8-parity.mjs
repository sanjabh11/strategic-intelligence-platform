#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const AUDIT_DIR = process.argv[2] || '.positioning-audit';
const PINNED_DIR = path.join(ROOT, 'schemas/audit-v8');
const lock = JSON.parse(readFileSync(path.join(PINNED_DIR, 'schema-lock.json'), 'utf8'));
const externalRoot = process.env.ECC_NICHE_AUDIT_SKILL_DIR
  || path.join(os.homedir(), '.codex/skills/ecc-niche-positioning-audit');
const externalSchemas = path.join(externalRoot, 'schemas');
const externalValidator = path.join(externalRoot, 'scripts/validate_skill.py');
const pinnedValidator = path.join(ROOT, 'scripts/validate-audit-v8-schema.mjs');

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

for (const [name, expectedHash] of Object.entries(lock.files)) {
  const pinnedPath = path.join(PINNED_DIR, name);
  if (!existsSync(pinnedPath) || sha256(pinnedPath) !== expectedHash) {
    console.error(`[FAIL] pinned schema lock mismatch: ${name}`);
    process.exit(1);
  }
}

if (!existsSync(externalValidator) || !existsSync(externalSchemas)) {
  console.log(JSON.stringify({ parity_status: 'unavailable', reason: 'external_validator_not_found', path: externalRoot }));
  console.log('[UNAVAILABLE] External ECC validator not found. Pinned schema validation remains authoritative.');
  process.exit(0);
}

const drift = [];
for (const [name, expectedHash] of Object.entries(lock.files)) {
  const externalPath = path.join(externalSchemas, name);
  const actualHash = existsSync(externalPath) ? sha256(externalPath) : 'missing';
  if (actualHash !== expectedHash) drift.push(`${name}: expected ${expectedHash}, got ${actualHash}`);
}

if (drift.length) {
  for (const item of drift) console.error(`[FAIL] ${item}`);
  console.error(JSON.stringify({ parity_status: 'fail', reason: 'schema_drift', drift }));
  console.error('External ECC schemas differ from the repository-pinned v8 contract.');
  process.exit(1);
}

const validatorHash = sha256(externalValidator);
if (validatorHash !== lock.external_validator_sha256) {
  console.warn(`[WARN] External validator implementation hash changed: ${validatorHash}`);
}

const pinnedResult = spawnSync(process.execPath, [pinnedValidator, AUDIT_DIR], {
  cwd: ROOT,
  encoding: 'utf8',
});
const result = spawnSync('python3', [externalValidator, '--audit-dir', AUDIT_DIR], {
  cwd: ROOT,
  encoding: 'utf8',
});
if (pinnedResult.status !== result.status) {
  console.error(`[FAIL] Validator result mismatch: pinned=${pinnedResult.status}, external=${result.status}`);
  process.exit(1);
}
process.stdout.write(result.stdout || '');
process.stderr.write(result.stderr || '');
if (result.status !== 0 || pinnedResult.status !== 0) {
  console.error('[FAIL] The audit instance was rejected by the parity gate.');
  process.exit(1);
}

console.log(JSON.stringify({ parity_status: 'pass', schema_drift: false, validator_implementation_drift: validatorHash !== lock.external_validator_sha256 }));
console.log('[PASS] Pinned schemas match the installed ECC schemas and both validators accept the audit.');
