#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const AUDIT_DIR = process.argv[2] || '.positioning-audit';
const failures = [];

function readJson(rel) {
  return JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
}

// Validate research-questions.json
try {
  const rq = readJson(path.join(AUDIT_DIR, 'research-questions.json'));
  if (!rq.audit_id) failures.push('research-questions.json: missing audit_id');
  if (!rq.schema_version) failures.push('research-questions.json: missing schema_version');
  if (!Array.isArray(rq.queries)) failures.push('research-questions.json: queries must be an array');
  if (typeof rq.total_queries !== 'number') failures.push('research-questions.json: total_queries must be a number');
  if (rq.total_queries !== rq.queries.length) failures.push(`research-questions.json: total_queries (${rq.total_queries}) does not match queries array length (${rq.queries.length})`);
} catch (e) {
  failures.push(`research-questions.json: ${e.message}`);
}

// Validate experiment-metadata.json
try {
  const em = readJson(path.join(AUDIT_DIR, 'experiment-metadata.json'));
  if (!em.experiments || typeof em.experiments !== 'object') failures.push('experiment-metadata.json: missing experiments object');
  if (!Array.isArray(em.execution_order)) failures.push('experiment-metadata.json: execution_order must be an array');
  if (typeof em.total_cost !== 'number' && typeof em.total_cost !== 'string') failures.push('experiment-metadata.json: total_cost must be a number or string');
  if (typeof em.total_timeline !== 'string' && em.total_timeline !== null) failures.push('experiment-metadata.json: total_timeline must be a string or null');

  // Cross-check experiment IDs match experiments.json
  try {
    const experiments = readJson(path.join(AUDIT_DIR, 'experiments.json'));
    const expIds = new Set(experiments.experiments.map((e) => e.experiment_id));
    for (const id of em.execution_order) {
      if (!expIds.has(id)) failures.push(`experiment-metadata.json: execution_order contains unknown experiment_id "${id}"`);
    }
  } catch (e) {
    failures.push(`experiment-metadata.json: could not cross-check with experiments.json: ${e.message}`);
  }
} catch (e) {
  failures.push(`experiment-metadata.json: ${e.message}`);
}

// Validate PM-005 exists and is the active manifest
try {
  const pm = readJson(path.join(AUDIT_DIR, 'provenance-manifest.json'));
  if (pm.manifest_id !== 'PM-005') failures.push(`provenance-manifest.json: expected manifest_id PM-005, got ${pm.manifest_id}`);
  const pm005 = readJson(path.join(AUDIT_DIR, 'provenance-manifest-pm005.json'));
  if (JSON.stringify(pm) !== JSON.stringify(pm005)) failures.push('provenance-manifest.json: active manifest does not match PM-005 mirror');
} catch (e) {
  failures.push(`provenance manifest validation: ${e.message}`);
}

if (failures.length) {
  for (const f of failures) console.error(`[FAIL] ${f}`);
  process.exit(1);
}

console.log('[PASS] research-questions.json: valid structure and query count');
console.log('[PASS] experiment-metadata.json: valid structure and experiment ID cross-check');
console.log('[PASS] provenance-manifest.json: PM-005 active and synchronized with mirror');
