#!/usr/bin/env node

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const AUDIT_DIR = process.argv[2] || '.positioning-audit';
const SCHEMA_DIR = path.join(ROOT, 'schemas/audit-v8');
const EXECUTED_STATUSES = new Set(['completed', 'failed', 'inconclusive']);

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function resolveAudit(name) {
  return path.join(ROOT, AUDIT_DIR, name);
}

function formatErrors(errors) {
  return (errors || []).map((error) => `${error.instancePath || '<root>'} ${error.message}`).join('; ');
}

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  strictTypes: false,
  strictRequired: false,
  allowUnionTypes: true,
});
addFormats(ajv);
ajv.addKeyword({ keyword: 'version', schemaType: 'string' });

const schemaTargets = [
  ['state.schema.json', resolveAudit('state.json')],
  ['experiment.schema.json', resolveAudit('experiments.json')],
  ['evidence-corpus.schema.json', resolveAudit('evidence-corpus.json')],
  ['hypothesis.schema.json', resolveAudit('hypotheses.json')],
];

const failures = [];
const passes = [];

function check(name, condition, detail) {
  if (condition) passes.push(name);
  else failures.push(`${name}: ${detail}`);
}

for (const [schemaName, instancePath] of schemaTargets) {
  const schemaPath = path.join(SCHEMA_DIR, schemaName);
  check(`file.${schemaName}`, existsSync(schemaPath), `missing ${schemaPath}`);
  check(`instance.${path.basename(instancePath)}`, existsSync(instancePath), `missing ${instancePath}`);
  if (!existsSync(schemaPath) || !existsSync(instancePath)) continue;
  const validate = ajv.compile(readJson(schemaPath));
  const valid = validate(readJson(instancePath));
  check(`schema.${path.basename(instancePath)}`, valid, formatErrors(validate.errors));
}

const artifactsDir = resolveAudit('artifacts');
if (existsSync(artifactsDir)) {
  const artifactSchema = readJson(path.join(SCHEMA_DIR, 'artifact.schema.json'));
  const validateArtifact = ajv.compile(artifactSchema);
  for (const name of readdirSync(artifactsDir).filter((entry) => entry.endsWith('.json')).sort()) {
    const valid = validateArtifact(readJson(path.join(artifactsDir, name)));
    check(`schema.artifact.${name}`, valid, formatErrors(validateArtifact.errors));
  }
}

if (existsSync(resolveAudit('state.json')) && existsSync(resolveAudit('experiments.json'))) {
  const state = readJson(resolveAudit('state.json'));
  const experimentsDoc = readJson(resolveAudit('experiments.json'));
  const hypothesesDoc = existsSync(resolveAudit('hypotheses.json'))
    ? readJson(resolveAudit('hypotheses.json'))
    : { hypotheses: [] };
  const experiments = experimentsDoc.experiments || [];
  const observedExecuted = experiments.filter((experiment) => EXECUTED_STATUSES.has(experiment.status)).length;

  check('lifecycle.audit_id_consistency', state.audit_id === experimentsDoc.audit_id,
    `state=${state.audit_id}, experiments=${experimentsDoc.audit_id}`);
  check('lifecycle.designed_count_consistency', state.experiments_designed === experiments.length,
    `declared=${state.experiments_designed}, observed=${experiments.length}`);
  check('lifecycle.executed_count_consistency', state.experiments_executed === observedExecuted,
    `declared=${state.experiments_executed}, observed=${observedExecuted}`);

  if (state.current_phase === 'VALIDATION_PENDING') {
    check('lifecycle.pending_has_no_executions', state.experiments_executed === 0,
      `experiments_executed=${state.experiments_executed}`);
    const promoted = [...(state.hypotheses || []), ...(hypothesesDoc.hypotheses || [])]
      .filter((hypothesis) => hypothesis.status !== 'unresolved');
    check('lifecycle.pending_has_no_promoted_hypotheses', promoted.length === 0,
      `promoted=${promoted.map((hypothesis) => hypothesis.id).join(',')}`);
  }
}

console.log('============================================================');
console.log('Pinned ECC v8 Schema Validator');
console.log('============================================================');
for (const name of passes) console.log(`  [PASS] ${name}`);
for (const failure of failures) console.log(`  [FAIL] ${failure}`);
console.log(`\nChecks passed: ${passes.length}`);
console.log(`Checks failed: ${failures.length}`);

if (failures.length) {
  console.log('\nPINNED V8 VALIDATION FAILED');
  process.exit(1);
}

console.log('\nPINNED V8 VALIDATION PASSED');
