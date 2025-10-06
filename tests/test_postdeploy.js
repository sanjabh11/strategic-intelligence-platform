#!/usr/bin/env node

// Post-Deployment Verification Script
// Run with: SUPABASE_URL="https://<project>.supabase.co" SUPABASE_SERVICE_ROLE_KEY="<key>" node test_postdeploy.js

import fetch from 'node-fetch';

const SUPABASE_URL = process.env.SUPABASE_URL;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/analyze-engine`;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function call(payload) {
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`
    },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = { ok: false, status: res.status, text };
  }
  return { status: res.status, body: json };
}

async function runTests() {
  console.log('🚀 Post-Deployment Verification Tests');
  console.log('=====================================\n');

  // Test 1: Audience validation
  console.log('1) Audience validation (invalid audience): expect 400');
  let r = await call({
    scenario_text: 'test',
    audience: 'invalid_audience'
  });
  console.log(`Status: ${r.status}`);
  console.log(`Response:`, r.body);
  console.log(`✅ PASS: ${r.status === 400 && r.body.error === 'invalid_audience' ? 'YES' : 'NO'}\n`);

  // Test 2: Cache bypass
  console.log('2) Cache bypass (forceFresh): expect provenance.cache_hit === false');
  r = await call({
    scenario_text: 'Gold price test',
    audience: 'learner',
    options: { forceFresh: true },
    run_id: 'test_gold_auto'
  });
  console.log(`Status: ${r.status}`);
  console.log(`Cache Hit:`, r.body.provenance?.cache_hit);
  console.log(`Audience:`, r.body.analysis?.audience);
  console.log(`Retrieval Count:`, r.body.provenance?.retrieval_count);
  console.log(`✅ PASS: ${r.body.provenance?.cache_hit === false && r.body.analysis?.audience === 'learner' ? 'YES' : 'NO'}\n`);

  // Test 3: Prisoner Dilemma solver
  console.log('3) Prisoner Dilemma solver (expect solver_invocations)');
  r = await call({
    scenario_text: "Two prisoners. Payoffs: (3,3) coop; (1,1) both defect; (5,0) defect vs coop",
    audience: 'researcher',
    options: { forceFresh: true, expectSolver: true },
    run_id: 'test_pd_auto'
  });
  console.log(`Status: ${r.status}`);
  console.log(`Solver Invocations:`, r.body.provenance?.solver_invocations);
  console.log(`Audience:`, r.body.analysis?.audience);
  console.log(`✅ PASS: ${r.body.provenance?.solver_invocations?.length > 0 && r.body.analysis?.audience === 'researcher' ? 'YES' : 'NO'}\n`);

  console.log('📋 Verification Summary:');
  console.log('- Use run_id values (test_gold_auto, test_pd_auto) to query analysis_runs table');
  console.log('- Check solver_invocations and cache_hit fields in database');
  console.log('- Verify audience-specific response schemas are working');
}

// Run tests
runTests().catch(console.error);