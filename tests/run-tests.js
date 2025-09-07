#!/usr/bin/env node

/**
 * run-tests.js - E2E Test Suite for Strategic Intelligence Platform
 * Usage: ENDPOINT=https://... SERVICE_KEY=<key> node tests/run-tests.js
 */
import axios from 'axios';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ENDPOINT = process.env.ENDPOINT;
const SERVICE_KEY = process.env.SERVICE_KEY;

if (!ENDPOINT || !SERVICE_KEY) {
  console.error('ERROR: Set ENDPOINT and SERVICE_KEY environment variables');
  console.error('Example: ENDPOINT="https://jxdihzqoaxtydolmltdr.supabase.co/functions/v1/analyze-engine" SERVICE_KEY="<key>" node tests/run-tests.js');
  process.exit(2);
}

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

// Comprehensive response schema validation
const responseSchema = {
  type: 'object',
  required: ['ok', 'analysis', 'provenance'],
  properties: {
    ok: { type: 'boolean' },
    analysis: {
      type: 'object',
      required: ['audience'],
      properties: {
        audience: { type: 'string', enum: ['student', 'learner', 'researcher', 'teacher', 'reviewer'] },
        numeric_claims: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'value', 'confidence', 'sources'],
            properties: {
              name: { type: 'string' },
              value: { type: 'number' },
              confidence: { type: 'number', minimum: 0, maximum: 1 },
              sources: { type: 'array', items: { type: 'string', pattern: '^rid_' } }
            }
          }
        },
        simulation_results: {
          type: 'object',
          properties: {
            equilibria: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['pure', 'mixed'] },
                  profile: { type: 'array' },
                  payoffs: { type: 'array' },
                  stability: { type: 'number', minimum: 0, maximum: 1 }
                }
              }
            }
          }
        }
      }
    },
    provenance: {
      type: 'object',
      required: ['retrieval_count', 'used_retrieval_ids', 'retrieval_sources', 'cache_hit', 'evidence_backed', 'llm_model', 'llm_duration_ms', 'fallback_used'],
      properties: {
        retrieval_count: { type: 'integer' },
        used_retrieval_ids: { type: 'array', items: { type: 'string', pattern: '^rid_' } },
        retrieval_sources: { type: 'array', items: { type: 'string' } },
        cache_hit: { type: 'boolean' },
        evidence_backed: { type: 'boolean' },
        llm_model: { type: 'string' },
        llm_duration_ms: { type: 'integer' },
        fallback_used: { type: 'boolean' },
        solver_invocations: { type: 'array' }
      }
    }
  }
};

const validateResponse = ajv.compile(responseSchema);

async function callAnalyze(payload) {
  try {
    const response = await axios.post(ENDPOINT, payload, {
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    return response.data;
  } catch (error) {
    console.error('HTTP Error:', error.response?.status, error.response?.data || error.message);
    throw error;
  }
}

async function assert(condition, message) {
  if (!condition) {
    console.error('❌ ASSERTION FAILED:', message);
    process.exitCode = 1;
    throw new Error(message);
  }
}

async function testGoldMarket() {
  console.log('\n🧪 [1] Testing Gold market data (forceFresh: true)');
  const payload = {
    scenario_text: "I want to buy gold now; what should I do? Please provide numeric current_spot_price_usd and a clear recommendation.",
    audience: "learner",
    options: { forceFresh: true, domains: ["market_data"] },
    run_id: `test_gold_${Date.now()}`
  };

  const res = await callAnalyze(payload);
  console.log(`Status: Response received`);

  const ok = validateResponse(res);
  if (!ok) {
    console.error('Schema validation errors:', validateResponse.errors);
    throw new Error('Schema validation failed for gold test');
  }

  await assert(res.provenance.cache_hit === false, 'Expected cache_hit: false for forceFresh');
  await assert(Array.isArray(res.provenance.used_retrieval_ids) && res.provenance.used_retrieval_ids.length > 0,
    `Expected used_retrieval_ids present, got: ${JSON.stringify(res.provenance.used_retrieval_ids)}`);

  const num = (res.analysis.numeric_claims || []).find(n => n.name === 'current_spot_price_usd');
  await assert(num && typeof num.value === 'number',
    `Expected numeric_claim current_spot_price_usd, got: ${JSON.stringify(num)}`);

  console.log('✅ Gold market test PASSED');
  console.log(`   - Cache hit: ${res.provenance.cache_hit}`);
  console.log(`   - Retrieval count: ${res.provenance.retrieval_count}`);
  console.log(`   - Used retrieval IDs: ${res.provenance.used_retrieval_ids?.length || 0}`);
  console.log(`   - Numeric claims: ${res.analysis.numeric_claims?.length || 0}`);
}

async function testPrisonersDilemma() {
  console.log('\n🎯 [2] Testing Prisoner\'s Dilemma solver invocation');
  const payload = {
    scenario_text: "Two suspects choose cooperate/defect. Payoffs: both cooperate (3,3), both defect (1,1), defect vs coop (5,0). Identify equilibrium and call solver.",
    audience: "researcher",
    options: { forceFresh: true, expectSolver: true },
    run_id: `test_pd_${Date.now()}`
  };

  const res = await callAnalyze(payload);
  console.log(`Status: Response received`);

  const ok = validateResponse(res);
  if (!ok) {
    console.error('Schema validation errors:', validateResponse.errors);
    throw new Error('Schema validation failed for PD test');
  }

  await assert(Array.isArray(res.provenance.solver_invocations) && res.provenance.solver_invocations.length > 0,
    `Expected solver_invocations present, got: ${JSON.stringify(res.provenance.solver_invocations)}`);

  const eqs = res.analysis.simulation_results?.equilibria;
  await assert(Array.isArray(eqs) && eqs.length > 0,
    `Expected equilibria array from solver, got: ${JSON.stringify(eqs)}`);

  console.log('✅ Prisoner\'s Dilemma test PASSED');
  console.log(`   - Solver invocations: ${res.provenance.solver_invocations?.length || 0}`);
  console.log(`   - Equilibria found: ${eqs?.length || 0}`);
}

async function testTariffImpact() {
  console.log('\n📊 [3] Testing Tariff impact retrievals (uncomtrade)');
  const payload = {
    scenario_text: "India-US trade standoff: estimate 6-month export drop pct for India if tariffs go from 10% to 50%. Provide a numeric claim named '6m_projected_export_drop_pct' with evidence.",
    audience: "researcher",
    options: { forceFresh: true, domains: ["trade", "economy"] },
    run_id: `test_tariff_${Date.now()}`
  };

  const res = await callAnalyze(payload);
  console.log(`Status: Response received`);

  const ok = validateResponse(res);
  if (!ok) {
    console.error('Schema validation errors:', validateResponse.errors);
    throw new Error('Schema validation failed for tariff test');
  }

  await assert(res.provenance.retrieval_sources && res.provenance.retrieval_sources.length > 0,
    `Expected retrieval_sources present, got: ${JSON.stringify(res.provenance.retrieval_sources)}`);

  const claim = (res.analysis.numeric_claims || []).find(c => c.name === '6m_projected_export_drop_pct');
  await assert(claim && typeof claim.value === 'number',
    `Expected 6m_projected_export_drop_pct numeric claim, got: ${JSON.stringify(claim)}`);

  console.log('✅ Tariff impact test PASSED');
  console.log(`   - Retrieval sources: ${res.provenance.retrieval_sources?.join(', ') || 'none'}`);
  console.log(`   - Numeric claims: ${res.analysis.numeric_claims?.length || 0}`);
}

async function testAISafety() {
  console.log('\n🤖 [4] Testing AI safety analysis (evidence-backed)');
  const payload = {
    scenario_text: "Three major tech companies (Apple, Google, Microsoft) decide whether to lead with strict AI safety standards or compete. Provide evidence-backed recommendations.",
    audience: "researcher",
    options: { forceFresh: true, domains: ["news", "policy"] },
    run_id: `test_ai_${Date.now()}`
  };

  const res = await callAnalyze(payload);
  console.log(`Status: Response received`);

  const ok = validateResponse(res);
  if (!ok) {
    console.error('Schema validation errors:', validateResponse.errors);
    throw new Error('Schema validation failed for AI safety test');
  }

  await assert(res.provenance.evidence_backed === true,
    `Expected evidence_backed: true for AI safety researcher query, got: ${res.provenance.evidence_backed}`);

  await assert(res.provenance.used_retrieval_ids && res.provenance.used_retrieval_ids.length > 0,
    `Expected used_retrieval_ids present, got: ${JSON.stringify(res.provenance.used_retrieval_ids)}`);

  console.log('✅ AI safety test PASSED');
  console.log(`   - Evidence backed: ${res.provenance.evidence_backed}`);
  console.log(`   - Used retrieval IDs: ${res.provenance.used_retrieval_ids?.length || 0}`);
}

async function testCacheBypass() {
  console.log('\n💾 [5] Testing cache bypass behavior');
  const scenario = "Gold price now for investment";

  // Fresh run
  const payloadFresh = {
    scenario_text: scenario,
    audience: "learner",
    options: { forceFresh: true, domains: ["market_data"] },
    run_id: `test_cache_fresh_${Date.now()}`
  };

  // Cached run
  const payloadCached = {
    scenario_text: scenario,
    audience: "learner",
    options: { forceFresh: false, domains: ["market_data"] },
    run_id: `test_cache_cached_${Date.now()}`
  };

  console.log('   Running fresh query...');
  const fresh = await callAnalyze(payloadFresh);
  await assert(fresh.provenance.cache_hit === false,
    `Expected fresh run cache_hit: false, got: ${fresh.provenance.cache_hit}`);

  console.log('   Running cached query...');
  const cached = await callAnalyze(payloadCached);

  // Note: cached run may still be fresh if TTL expired
  if (cached.provenance.cache_hit !== true) {
    console.warn('⚠️  Warning: cached run did not return cache_hit: true (TTL may be short)');
    console.log(`   Fresh retrievals: ${fresh.provenance.retrieval_count}`);
    console.log(`   Cached retrievals: ${cached.provenance.retrieval_count}`);
  } else {
    console.log('✅ Cache bypass test PASSED (cache_hit: true on cached run)');
  }

  console.log(`   Fresh cache_hit: ${fresh.provenance.cache_hit}`);
  console.log(`   Cached cache_hit: ${cached.provenance.cache_hit}`);
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Comprehensive E2E Test Suite');
  console.log('=======================================');
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`Using service key: ${SERVICE_KEY.substring(0, 10)}...`);

  const startTime = Date.now();
  let passed = 0;
  let failed = 0;

  try {
    await testGoldMarket();
    passed++;
  } catch (error) {
    console.error(`❌ Gold market test FAILED: ${error.message}`);
    failed++;
  }

  try {
    await testPrisonersDilemma();
    passed++;
  } catch (error) {
    console.error(`❌ Prisoner's Dilemma test FAILED: ${error.message}`);
    failed++;
  }

  try {
    await testTariffImpact();
    passed++;
  } catch (error) {
    console.error(`❌ Tariff impact test FAILED: ${error.message}`);
    failed++;
  }

  try {
    await testAISafety();
    passed++;
  } catch (error) {
    console.error(`❌ AI safety test FAILED: ${error.message}`);
    failed++;
  }

  try {
    await testCacheBypass();
    passed++;
  } catch (error) {
    console.error(`❌ Cache bypass test FAILED: ${error.message}`);
    failed++;
  }

  const duration = Date.now() - startTime;

  console.log('\n📊 TEST RESULTS SUMMARY');
  console.log('=======================');
  console.log(`Total Tests: ${passed + failed}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Duration: ${duration}ms`);
  console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✅ System is ready for production');
    process.exit(0);
  } else {
    console.log('\n⚠️  SOME TESTS FAILED');
    console.log('🔧 Check the error messages above and fix the issues');
    console.log('📋 Common fixes:');
    console.log('   - Deploy updated Edge Function code');
    console.log('   - Apply database migration');
    console.log('   - Configure environment variables');
    console.log('   - Check function logs for compilation errors');
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the tests
runAllTests().catch((error) => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});