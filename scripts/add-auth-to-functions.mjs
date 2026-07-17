#!/usr/bin/env node
// Adds auth checks to edge functions that need user authentication
// Tier 1: Sensitive user-data functions (must verify auth)
// Tier 2: Enhancement chain functions called from client
// Skips: webhooks, public endpoints, internal/scheduled, already-protected

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const functionsDir = 'supabase/functions';

// Functions that already have auth
const alreadyProtected = new Set([
  'forecast-create', 'personal-life-coach', 'stripe-checkout', 'stripe-verify',
  'analysis-hydrator', 'hydrate-analysis', 'human-review'
]);

// Public endpoints (no auth needed)
const publicFunctions = new Set([
  'health', 'test-exa', 'test-secrets', 'system-status', 'get-analysis-status',
  'sso-auth', 'lti-launch', 'gdelt-stream', 'market-stream', 'analyze-stream'
]);

// Webhooks (signature verification, not user auth)
const webhookFunctions = new Set([
  'stripe-webhook', 'whop-webhook'
]);

// Internal/scheduled (called server-side, rely on RLS)
const internalFunctions = new Set([
  'calibration-refresh', 'drift-evaluate', 'shadow-model-refresh',
  'ontology-sync', 'whitebox-scheduled', 'worldbank-sync', 'process-queue',
  'game-monitoring', 'release-evaluation', 'release-promotion',
  'symmetry-mining-service', 'bayes-belief-updating'
]);

const dirs = readdirSync(functionsDir, { withFileTypes: true })
  .filter(d => d.isDirectory() && !d.name.startsWith('_'))
  .map(d => d.name);

let modified = 0;
let skipped = 0;
let publicCount = 0;
let internalCount = 0;
let webhookCount = 0;

for (const dir of dirs) {
  const indexPath = join(functionsDir, dir, 'index.ts');
  if (!existsSync(indexPath)) continue;

  let content = readFileSync(indexPath, 'utf8');

  if (alreadyProtected.has(dir)) {
    skipped++;
    continue;
  }

  if (publicFunctions.has(dir)) {
    // Add PUBLIC comment if not already present
    if (!content.includes('PUBLIC: No auth')) {
      content = content.replace(
        /(Deno\.serve\()/,
        '// PUBLIC: No auth required\n$1'
      );
      writeFileSync(indexPath, content);
    }
    publicCount++;
    continue;
  }

  if (webhookFunctions.has(dir)) {
    if (!content.includes('WEBHOOK:')) {
      content = content.replace(
        /(Deno\.serve\()/,
        '// WEBHOOK: Signature verification required, not user auth\n$1'
      );
      writeFileSync(indexPath, content);
    }
    webhookCount++;
    continue;
  }

  if (internalFunctions.has(dir)) {
    if (!content.includes('INTERNAL:')) {
      content = content.replace(
        /(Deno\.serve\()/,
        '// INTERNAL: Called server-side, relies on RLS for auth\n$1'
      );
      writeFileSync(indexPath, content);
    }
    internalCount++;
    continue;
  }

  // Tier 1 & 2: Add auth check
  // Check if already has auth import
  const hasAuthImport = content.includes('getAuthenticatedUser') || content.includes('requireAuth') || content.includes('withAuth');

  if (!hasAuthImport) {
    // Add import at the top (after existing imports)
    const importLine = "import { getAuthenticatedUser, jsonResponse } from '../_shared/auth.ts'\n";
    // Find the last import line
    const importMatch = content.match(/^(import[^\n]+\n)+/m);
    if (importMatch) {
      const lastImportEnd = importMatch.index + importMatch[0].length;
      content = content.slice(0, lastImportEnd) + importLine + content.slice(lastImportEnd);
    } else {
      content = importLine + content;
    }
  }

  // Add auth check after Deno.serve(async (req...) => {
  // Pattern: Deno.serve(async (req) => { or Deno.serve(async (req: Request) => {
  const servePattern = /Deno\.serve\(async \(req(?::\s*Request)?\) => \{/;
  const serveMatch = content.match(servePattern);

  if (serveMatch) {
    const authCheck = `
  // Auth check
  const _user = await getAuthenticatedUser(req)
  if (!_user) return jsonResponse(401, { ok: false, error: 'authentication_required' })

`;
    const insertPos = content.indexOf(serveMatch[0]) + serveMatch[0].length;
    content = content.slice(0, insertPos) + authCheck + content.slice(insertPos);
    writeFileSync(indexPath, content);
    modified++;
  } else {
    // Check for Deno.serve(handler) pattern
    const handlerPattern = /Deno\.serve\(handler\)/;
    if (handlerPattern.test(content)) {
      content = content.replace(
        /import \{ getAuthenticatedUser, jsonResponse \} from '\.\.\/_shared\/auth\.ts'/,
        "import { withAuth } from '../_shared/auth.ts'"
      );
      content = content.replace('Deno.serve(handler)', 'Deno.serve(withAuth(handler))');
      writeFileSync(indexPath, content);
      modified++;
    } else {
      console.log(`WARNING: Could not add auth to ${dir} - no recognized Deno.serve pattern`);
    }
  }
}

console.log(`\nResults:`);
console.log(`  Modified (auth added): ${modified}`);
console.log(`  Already protected: ${skipped}`);
console.log(`  Public (comment added): ${publicCount}`);
console.log(`  Internal (comment added): ${internalCount}`);
console.log(`  Webhook (comment added): ${webhookCount}`);
