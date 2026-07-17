#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import process from 'node:process';
import { resolveProofDate } from './proof-date.mjs';

const args = process.argv.slice(2);
let proofDate;
try {
  proofDate = resolveProofDate(args);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}

function argValue(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

const baseUrl = argValue('--base-url', 'http://127.0.0.1:4188');
const port = new URL(baseUrl).port || '4188';
const smokePath = `docs/launch-readiness/local-browser-route-smoke-${proofDate}.json`;
const screenshotDir = `docs/launch-readiness/browser-route-smoke-${proofDate}`;
const commonEnv = {
  ...process.env,
  VITE_PUBLIC_BETA_MODE: 'full',
  VITE_LABS_GOLD_BYPASS: 'true',
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'phase6-anon-key',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'phase6-anon-key',
};

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, { cwd: process.cwd(), env: commonEnv, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function isReachable() {
  try {
    const response = await fetch(baseUrl, { signal: AbortSignal.timeout(1000) });
    return response.status < 500;
  } catch {
    return false;
  }
}

async function waitForPreview() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await isReachable()) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Preview did not become reachable at ${baseUrl}`);
}

let preview;
try {
  if (!(await isReachable())) {
    if (!existsSync('dist/index.html')) {
      throw new Error('Missing dist/index.html; run pnpm build before route proof.');
    }
    preview = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', port, '--strictPort'], {
      cwd: process.cwd(),
      env: commonEnv,
      stdio: 'inherit',
    });
    await waitForPreview();
  }

  run(process.execPath, [
    'scripts/run-local-browser-route-smoke.mjs',
    '--proof-date', proofDate,
    '--base-url', baseUrl,
    '--json-output', smokePath,
    '--screenshot-dir', screenshotDir,
  ]);
  run(process.execPath, [
    'scripts/build-local-browser-route-proof.mjs',
    '--proof-date', proofDate,
    '--smoke', smokePath,
  ]);
} finally {
  if (preview && !preview.killed) preview.kill('SIGTERM');
}
