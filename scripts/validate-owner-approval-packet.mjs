#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const packetPath = path.resolve(process.cwd(), process.argv[2] || '.positioning-audit/owner-approval-packet-2026-07-17.md');
const packet = readFileSync(packetPath, 'utf8');
const failures = [];

const requiredSections = [
  '## 1. Target Slate Approval',
  '## 2. Outreach Wording',
  '## 3. Allowed Channels',
  '## 4. Demo Scope',
  '## 5. Consent and Recording Language',
  '## 6. Redaction and Retention Rules',
  '## 7. Public-Sector Confidentiality Boundaries',
  '## 8. Education Privacy and Research/QI Classification',
  '## 9. Approval to Run Experiments',
  '## 10. Actions NOT Authorized Without Separate Approval',
];

for (const section of requiredSections) {
  if (!packet.includes(section)) failures.push(`missing section: ${section}`);
}

const requiredPhrases = [
  'Enterprise Targets (EXP-008 → H-ENT-0)',
  'Education Targets (EXP-007 → H-EDU-4)',
  'Plan approval or silence is not experiment approval',
  'No student PII',
  'institutional privacy approval',
  'authorized IRB/human-research office',
  'Independent Approval Register',
];
for (const phrase of requiredPhrases) {
  if (!packet.toLowerCase().includes(phrase.toLowerCase())) failures.push(`missing approval boundary: ${phrase}`);
}

if (/typically does not require IRB review/i.test(packet)) {
  failures.push('packet makes an unauthorized categorical QI/IRB determination');
}

const urls = packet.match(/https:\/\/[^)\s]+/g) || [];
if (urls.length < 10) failures.push(`expected at least 10 public/reference URLs, found ${urls.length}`);

// Parse and validate target table rows
const enterpriseSection = packet.match(/Enterprise Targets \(EXP-008 → H-ENT-0\)[\s\S]*?(?=\n##|\n###|$)/);
const educationSection = packet.match(/Education Targets \(EXP-007 → H-EDU-4\)[\s\S]*?(?=\n##|\n###|$)/);

if (!enterpriseSection) failures.push('missing enterprise targets section with EXP-008 mapping');
if (!educationSection) failures.push('missing education targets section with EXP-007 mapping');

if (enterpriseSection) {
  const entRows = enterpriseSection[0].match(/^\| \d+ \|/gm) || [];
  if (entRows.length < 5) failures.push(`expected at least 5 enterprise target rows, found ${entRows.length}`);
}

if (educationSection) {
  const eduRows = educationSection[0].match(/^\| \d+ \|/gm) || [];
  if (eduRows.length < 5) failures.push(`expected at least 5 education target rows, found ${eduRows.length}`);
}

// Validate no-outreach boundary is explicit
if (!/outreach.*(?:not.*authorized|FROZEN|not.*approved)|silence.*not.*experiment.*approval|actions.*FROZEN/i.test(packet)) {
  failures.push('missing explicit no-outreach boundary statement');
}

// Validate independent approval register entries
const approvalRegisterMatches = packet.match(/Independent Approval Register/gi) || [];
if (approvalRegisterMatches.length < 1) failures.push('missing Independent Approval Register section');

// Validate purpose limitation and retention/deletion rules
if (!/retention|deletion|data.*lifecycle/i.test(packet)) {
  failures.push('missing retention/deletion rules');
}

// Validate no-PII rule for education
if (!/no.*PII|no.*student.*data/i.test(packet)) {
  failures.push('missing explicit no-PII rule for education lane');
}

if (failures.length) {
  for (const failure of failures) console.error(`[FAIL] ${failure}`);
  process.exit(1);
}

console.log(`[PASS] owner approval packet: ${requiredSections.length} required sections`);
console.log(`[PASS] mappings and independent approval boundaries`);
console.log(`[PASS] education institutional-review and privacy controls`);
console.log(`[PASS] ${urls.length} public/reference URLs present; live recheck remains required before outreach`);
