#!/usr/bin/env node

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const CASEBOOK_PATH = path.resolve(ROOT, process.argv[2] || '.positioning-audit/experiment-casebook-2026-07-17.json');
const SCHEMA_PATH = path.join(ROOT, 'schemas/audit-v8/experiment-casebook.schema.json');
const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
const casebook = JSON.parse(readFileSync(CASEBOOK_PATH, 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);
const validateSchema = ajv.compile(schema);

function semanticErrors(document) {
  const errors = [];
  const cases = document.cases || [];
  const ids = cases.map((entry) => entry.case_id);
  const education = cases.filter((entry) => entry.lane === 'education');
  const enterprise = cases.filter((entry) => entry.lane === 'enterprise');
  if (new Set(ids).size !== ids.length) errors.push('case IDs must be unique');
  if (education.length !== 5) errors.push(`expected 5 education cases, found ${education.length}`);
  if (enterprise.length !== 5) errors.push(`expected 5 enterprise cases, found ${enterprise.length}`);
  const privateData = JSON.stringify(cases).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|(?:\+?\d[\d ()-]{7,}\d)/gi) || [];
  if (privateData.length) errors.push('private email or phone data detected');

  // Check all cases are designed_not_executed and not_contacted
  for (const c of cases) {
    if (c.status !== 'designed_not_executed') errors.push(`case ${c.case_id} has status "${c.status}", expected "designed_not_executed"`);
    if (c.contact_status !== 'not_contacted') errors.push(`case ${c.case_id} has contact_status "${c.contact_status}", expected "not_contacted"`);
    if (c.result !== undefined) errors.push(`case ${c.case_id} has a result field — no results allowed in design-only casebook`);
  }

  // Check experiment mapping freeze
  const eduMapping = new Set(education.map((c) => `${c.experiment_id}/${c.hypothesis_id}`));
  const entMapping = new Set(enterprise.map((c) => `${c.experiment_id}/${c.hypothesis_id}`));
  if (eduMapping.size !== 1 || !eduMapping.has('EXP-007/H-EDU-4')) errors.push('education cases must all map to EXP-007/H-EDU-4');
  if (entMapping.size !== 1 || !entMapping.has('EXP-008/H-ENT-0')) errors.push('enterprise cases must all map to EXP-008/H-ENT-0');

  // Check root-level status
  if (document.status !== 'designed_not_executed') errors.push(`root status must be "designed_not_executed", got "${document.status}"`);

  // Check root-level rules object
  if (document.rules) {
    const rules = document.rules;
    if (rules.allow_outreach === true) errors.push('rules.allow_outreach must be false in design-only casebook');
    if (rules.allow_experiment_execution === true) errors.push('rules.allow_experiment_execution must be false in design-only casebook');
  }

  // Check summary object
  if (document.summary) {
    const s = document.summary;
    if (s.total_cases !== cases.length) errors.push(`summary.total_cases (${s.total_cases}) does not match actual case count (${cases.length})`);
    if (s.education_cases !== education.length) errors.push(`summary.education_cases (${s.education_cases}) does not match actual (${education.length})`);
    if (s.enterprise_cases !== enterprise.length) errors.push(`summary.enterprise_cases (${s.enterprise_cases}) does not match actual (${enterprise.length})`);
  }

  // Check validation object
  if (document.validation) {
    const v = document.validation;
    if (v.all_cases_design_only !== true) errors.push('validation.all_cases_design_only must be true');
    if (v.no_private_contact_data !== true) errors.push('validation.no_private_contact_data must be true');
  }

  // Check source URLs are present and public (not internal/private)
  for (const c of cases) {
    if (c.public_source_url) {
      if (!c.public_source_url.startsWith('http://') && !c.public_source_url.startsWith('https://')) {
        errors.push(`case ${c.case_id} public_source_url is not a valid HTTP(S) URL: ${c.public_source_url}`);
      }
    }
  }

  return errors;
}

function valid(document) {
  return Boolean(validateSchema(document)) && semanticErrors(document).length === 0;
}

const failures = [];
if (!validateSchema(casebook)) {
  failures.push(...(validateSchema.errors || []).map((error) => `${error.instancePath || '<root>'} ${error.message}`));
}
failures.push(...semanticErrors(casebook));

const negativeFixtures = [
  ['reversed_mapping', (document) => { document.cases[0].experiment_id = 'EXP-007'; }],
  ['contacted_target', (document) => { document.cases[0].contact_status = 'contacted'; }],
  ['execution_result_field', (document) => { document.cases[0].result = 'positive'; }],
  ['duplicate_case_id', (document) => { document.cases[1].case_id = document.cases[0].case_id; }],
  ['private_contact_data', (document) => { document.cases[0].target_role = 'Director, person@example.com'; }],
];

for (const [name, mutate] of negativeFixtures) {
  const fixture = structuredClone(casebook);
  mutate(fixture);
  if (valid(fixture)) failures.push(`negative fixture unexpectedly passed: ${name}`);
}

if (failures.length) {
  for (const failure of failures) console.error(`[FAIL] ${failure}`);
  process.exit(1);
}

console.log('[PASS] casebook schema: 10 design-only cases');
console.log('[PASS] lane mapping: EXP-007 education/H-EDU-4; EXP-008 enterprise/H-ENT-0');
console.log('[PASS] targets: 5 education + 5 enterprise, all not_contacted');
console.log('[PASS] negative fixtures: reversed mapping, contacted, result field, duplicate ID, private data');
