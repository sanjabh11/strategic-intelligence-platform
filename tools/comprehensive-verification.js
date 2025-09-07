#!/usr/bin/env node

/**
 * COMPREHENSIVE VERIFICATION SUITE
 * Runs all validation checks for the Strategic Intelligence Platform
 * Usage: SUPABASE_URL=<url> SUPABASE_KEY=<key> node tools/comprehensive-verification.js
 */

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const ENDPOINT = process.env.ENDPOINT || `${SUPABASE_URL}/functions/v1/analyze-engine`;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL=<supabase_project_url>');
  console.error('   SUPABASE_KEY=<service_role_key>');
  console.error('   ENDPOINT=<optional_endpoint_override>');
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Initialize AJV
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

// Test scenarios
const testScenarios = [
  {
    name: 'Gold Market Data',
    payload: {
      scenario_text: "I want to buy gold now; what should I do? Please provide numeric current_spot_price_usd and a clear recommendation.",
      audience: "learner",
      options: { forceFresh: true, domains: ["market_data"] },
      run_id: `verify_gold_${Date.now()}`
    },
    expectations: {
      hasNumericClaims: true,
      hasUsedRetrievalIds: true,
      cacheHit: false,
      evidenceBacked: true
    }
  },
  {
    name: 'Prisoner\'s Dilemma',
    payload: {
      scenario_text: "Two suspects choose cooperate/defect. Payoffs: both cooperate (3,3), both defect (1,1), defect vs coop (5,0). Identify equilibrium and call solver.",
      audience: "researcher",
      options: { forceFresh: true, expectSolver: true },
      run_id: `verify_pd_${Date.now()}`
    },
    expectations: {
      hasSolverInvocations: true,
      hasEquilibria: true,
      cacheHit: false
    }
  },
  {
    name: 'Tariff Impact',
    payload: {
      scenario_text: "India-US trade standoff: estimate 6-month export drop pct for India if tariffs go from 10% to 50%. Provide a numeric claim named '6m_projected_export_drop_pct' with evidence.",
      audience: "researcher",
      options: { forceFresh: true, domains: ["trade", "economy"] },
      run_id: `verify_tariff_${Date.now()}`
    },
    expectations: {
      hasNumericClaims: true,
      hasRetrievalSources: true,
      cacheHit: false
    }
  },
  {
    name: 'AI Safety',
    payload: {
      scenario_text: "Three major tech companies (Apple, Google, Microsoft) decide whether to lead with strict AI safety standards or compete. Provide evidence-backed recommendations.",
      audience: "researcher",
      options: { forceFresh: true, domains: ["news", "policy"] },
      run_id: `verify_ai_${Date.now()}`
    },
    expectations: {
      evidenceBacked: true,
      hasUsedRetrievalIds: true,
      cacheHit: false
    }
  },
  {
    name: 'Cache Behavior',
    payload: {
      scenario_text: "Gold price now for investment",
      audience: "learner",
      options: { forceFresh: false, domains: ["market_data"] },
      run_id: `verify_cache_${Date.now()}`
    },
    expectations: {
      cacheHit: undefined // Can be true or false depending on TTL
    }
  }
];

async function callAnalyze(payload) {
  try {
    const response = await axios.post(ENDPOINT, payload, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
}

async function validateRun(runId, expectations) {
  try {
    const { data, error } = await supabase
      .from('analysis_runs')
      .select('*')
      .eq('id', runId)
      .single();

    if (error) {
      return { valid: false, error: error.message };
    }

    const analysis = data.analysis || {};
    const provenance = data.provenance || {};

    const results = {
      valid: true,
      checks: []
    };

    // Check expectations
    Object.entries(expectations).forEach(([key, expected]) => {
      let actual;
      let passed = false;
      let message = '';

      switch (key) {
        case 'hasNumericClaims':
          actual = Array.isArray(analysis.numeric_claims) && analysis.numeric_claims.length > 0;
          passed = actual === expected;
          message = `Numeric claims: ${actual} (expected: ${expected})`;
          break;

        case 'hasUsedRetrievalIds':
          actual = Array.isArray(provenance.used_retrieval_ids) && provenance.used_retrieval_ids.length > 0;
          passed = actual === expected;
          message = `Used retrieval IDs: ${actual} (expected: ${expected})`;
          break;

        case 'cacheHit':
          actual = provenance.cache_hit;
          if (expected === undefined) {
            passed = typeof actual === 'boolean';
            message = `Cache hit: ${actual} (boolean check passed)`;
          } else {
            passed = actual === expected;
            message = `Cache hit: ${actual} (expected: ${expected})`;
          }
          break;

        case 'evidenceBacked':
          actual = provenance.evidence_backed;
          passed = actual === expected;
          message = `Evidence backed: ${actual} (expected: ${expected})`;
          break;

        case 'hasSolverInvocations':
          actual = Array.isArray(provenance.solver_invocations) && provenance.solver_invocations.length > 0;
          passed = actual === expected;
          message = `Solver invocations: ${actual} (expected: ${expected})`;
          break;

        case 'hasEquilibria':
          actual = analysis.simulation_results?.equilibria && Array.isArray(analysis.simulation_results.equilibria);
          passed = actual === expected;
          message = `Equilibria: ${actual} (expected: ${expected})`;
          break;

        case 'hasRetrievalSources':
          actual = Array.isArray(provenance.retrieval_sources) && provenance.retrieval_sources.length > 0;
          passed = actual === expected;
          message = `Retrieval sources: ${actual} (expected: ${expected})`;
          break;
      }

      results.checks.push({
        check: key,
        passed,
        message,
        actual,
        expected
      });

      if (!passed) {
        results.valid = false;
      }
    });

    return results;

  } catch (error) {
    return { valid: false, error: error.message };
  }
}

async function runHealthCheck() {
  console.log('\n🏥 SYSTEM HEALTH CHECK');
  console.log('======================');

  try {
    // Get recent runs stats
    const { data: runs, error } = await supabase
      .from('analysis_runs')
      .select('provenance, created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Failed to fetch runs:', error.message);
      return false;
    }

    const totalRuns = runs.length;
    const freshRuns = runs.filter(r => !(r.provenance?.cache_hit)).length;
    const evidenceBackedRuns = runs.filter(r => r.provenance?.evidence_backed).length;
    const solverRuns = runs.filter(r => r.provenance?.solver_invocations?.length > 0).length;

    console.log(`📊 Last 24 hours:`);
    console.log(`   Total runs: ${totalRuns}`);
    console.log(`   Fresh runs: ${freshRuns} (${totalRuns > 0 ? ((freshRuns/totalRuns)*100).toFixed(1) : 0}%)`);
    console.log(`   Evidence-backed: ${evidenceBackedRuns} (${totalRuns > 0 ? ((evidenceBackedRuns/totalRuns)*100).toFixed(1) : 0}%)`);
    console.log(`   Solver runs: ${solverRuns} (${totalRuns > 0 ? ((solverRuns/totalRuns)*100).toFixed(1) : 0}%)`);

    // Check for missing provenance fields
    const missingFields = runs.filter(r => {
      const p = r.provenance || {};
      return !p.llm_model || p.cache_hit === undefined || p.evidence_backed === undefined;
    }).length;

    console.log(`   Missing provenance: ${missingFields} runs`);

    return missingFields === 0 && totalRuns > 0;

  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function runComprehensiveVerification() {
  console.log('🚀 COMPREHENSIVE VERIFICATION SUITE');
  console.log('====================================');
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`Database: ${SUPABASE_URL}`);

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  // Run health check first
  const healthOk = await runHealthCheck();
  if (!healthOk) {
    console.log('\n⚠️  Health check issues detected - proceeding with detailed tests');
  }

  // Run each test scenario
  for (const scenario of testScenarios) {
    console.log(`\n🧪 TESTING: ${scenario.name}`);
    console.log('='.repeat(50));

    totalTests++;

    // Make API call
    console.log('📤 Making API call...');
    const response = await callAnalyze(scenario.payload);

    if (!response.success) {
      console.log(`❌ API call failed:`, response.error);
      failedTests++;
      continue;
    }

    console.log('✅ API call successful');

    // Wait a moment for database write
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Validate the run
    console.log('🔍 Validating run...');
    const validation = await validateRun(scenario.payload.run_id, scenario.expectations);

    if (!validation.valid) {
      console.log('❌ Validation failed');
      validation.checks.forEach(check => {
        const status = check.passed ? '✅' : '❌';
        console.log(`   ${status} ${check.message}`);
      });
      failedTests++;
    } else {
      console.log('✅ Validation passed');
      validation.checks.forEach(check => {
        console.log(`   ✅ ${check.message}`);
      });
      passedTests++;
    }

    // Show provenance summary
    if (response.data?.provenance) {
      const p = response.data.provenance;
      console.log('📊 Provenance Summary:');
      console.log(`   Cache Hit: ${p.cache_hit}`);
      console.log(`   Evidence Backed: ${p.evidence_backed}`);
      console.log(`   Retrieval Count: ${p.retrieval_count}`);
      console.log(`   Used Retrieval IDs: ${p.used_retrieval_ids?.length || 0}`);
      console.log(`   Solver Invocations: ${p.solver_invocations?.length || 0}`);
      console.log(`   LLM Model: ${p.llm_model}`);
    }
  }

  // Final results
  console.log('\n🎯 FINAL RESULTS');
  console.log('================');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Success Rate: ${((passedTests/totalTests)*100).toFixed(1)}%`);

  if (failedTests === 0) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✅ System is production-ready');
    console.log('\n📋 Next Steps:');
    console.log('   1. Enable CI/CD with GitHub Actions');
    console.log('   2. Set up monitoring alerts');
    console.log('   3. Deploy to production');
    console.log('   4. Monitor system health');
    process.exit(0);
  } else {
    console.log('\n⚠️  SOME TESTS FAILED');
    console.log('🔧 Check the error messages above and fix the issues');
    console.log('\n📋 Common fixes:');
    console.log('   - Deploy updated Edge Function code');
    console.log('   - Apply database migration');
    console.log('   - Configure environment variables');
    console.log('   - Check function logs for compilation errors');
    console.log('   - Verify LLM micro-prompt is working');
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

// Run the comprehensive verification
runComprehensiveVerification();