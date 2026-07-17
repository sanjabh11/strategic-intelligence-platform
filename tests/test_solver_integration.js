#!/usr/bin/env node

// Comprehensive Test Suite for Solver Integration
// Run with: node test_solver_integration.js

import https from 'https';
import http from 'http';

const SUPABASE_URL = 'https://jxdihzqoaxtydolmltdr.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4ZGloenFvYXh0eWRvbG1sdGRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5MjQ2MDUsImV4cCI6MjA3MTUwMDYwNX0.RS92p3Y7qJ-38PLFR1L4Y9Rl9R4dmFYYCVxhBcJBW8Q';

async function makeRequest(endpoint, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

async function testAudienceValidation() {
  console.log('\n🧪 Testing Audience Validation...');

  const invalidAudience = {
    scenario_text: "Test scenario",
    audience: "invalid_audience"
  };

  const response = await makeRequest(`${SUPABASE_URL}/functions/v1/analyze-engine`, invalidAudience);

  if (response.status === 400 && response.data.error === 'invalid_audience') {
    console.log('✅ Audience validation working');
    return true;
  } else {
    console.log('❌ Audience validation failed:', response.data);
    return false;
  }
}

async function testCanonicalGameDetection() {
  console.log('\n🎯 Testing Canonical Game Detection...');

  const testCases = [
    {
      name: "Prisoner's Dilemma",
      scenario: "Prisoner's Dilemma canonical: payoff 3/0,2/1 etc. Solve.",
      audience: "researcher",
      expectSolver: true
    },
    {
      name: "Stag Hunt",
      scenario: "Two hunters go out on a hunt. Each can individually choose to hunt a stag or hunt a hare.",
      audience: "researcher",
      expectSolver: true
    },
    {
      name: "Non-canonical scenario",
      scenario: "What should I do about climate change?",
      audience: "researcher",
      expectSolver: false
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n  Testing: ${testCase.name}`);

    const response = await makeRequest(`${SUPABASE_URL}/functions/v1/analyze-engine`, {
      scenario_text: testCase.scenario,
      audience: testCase.audience,
      run_id: `test_${Date.now()}`
    });

    if (response.status === 200) {
      const hasSolverInvocations = response.data.provenance?.solver_invocations?.length > 0;

      if (testCase.expectSolver && hasSolverInvocations) {
        console.log('  ✅ Solver called for canonical game');
      } else if (!testCase.expectSolver && !hasSolverInvocations) {
        console.log('  ✅ No solver called for non-canonical scenario');
      } else {
        console.log('  ❌ Solver expectation mismatch');
        console.log('    Expected solver:', testCase.expectSolver);
        console.log('    Has solver invocations:', hasSolverInvocations);
      }
    } else {
      console.log('  ❌ Request failed:', response.status, response.data);
    }
  }
}

async function testCacheBypass() {
  console.log('\n💾 Testing Cache Bypass...');

  const scenario = {
    scenario_text: "Real-time market analysis for tech stocks",
    audience: "researcher",
    options: { forceFresh: true }
  };

  const response = await makeRequest(`${SUPABASE_URL}/functions/v1/analyze-engine`, scenario);

  if (response.status === 200) {
    const cacheHit = response.data.provenance?.cache_hit;
    if (cacheHit === false) {
      console.log('✅ Cache bypass working - cache_hit: false');
      return true;
    } else {
      console.log('❌ Cache bypass failed - cache_hit:', cacheHit);
      return false;
    }
  } else {
    console.log('❌ Request failed:', response.status);
    return false;
  }
}

async function testEvidenceBackedValidation() {
  console.log('\n📊 Testing Evidence-Backed Validation...');

  const scenario = {
    scenario_text: "Complex geopolitical analysis requiring multiple sources",
    audience: "researcher"
  };

  const response = await makeRequest(`${SUPABASE_URL}/functions/v1/analyze-engine`, scenario);

  if (response.status === 200) {
    const evidenceBacked = response.data.provenance?.evidence_backed;
    const retrievalCount = response.data.provenance?.retrieval_count || 0;

    console.log(`  Evidence backed: ${evidenceBacked}`);
    console.log(`  Retrieval count: ${retrievalCount}`);

    if (evidenceBacked !== undefined) {
      console.log('✅ Evidence-backed field present');
      return true;
    } else {
      console.log('❌ Evidence-backed field missing');
      return false;
    }
  } else {
    console.log('❌ Request failed:', response.status);
    return false;
  }
}

async function testResearcherSchema() {
  console.log('\n🔬 Testing Researcher Schema Compliance...');

  const scenario = {
    scenario_text: "Prisoner's Dilemma with numerical payoffs",
    audience: "researcher"
  };

  const response = await makeRequest(`${SUPABASE_URL}/functions/v1/analyze-engine`, scenario);

  if (response.status === 200) {
    const analysis = response.data.analysis;

    // Check required researcher fields
    const requiredFields = ['analysis_id', 'audience', 'long_summary', 'provenance'];
    const hasRequiredFields = requiredFields.every(field => analysis.hasOwnProperty(field));

    if (hasRequiredFields && analysis.audience === 'researcher') {
      console.log('✅ Researcher schema compliance');
      return true;
    } else {
      console.log('❌ Researcher schema validation failed');
      console.log('  Missing fields:', requiredFields.filter(f => !analysis.hasOwnProperty(f)));
      return false;
    }
  } else {
    console.log('❌ Request failed:', response.status);
    return false;
  }
}

async function testAdvancedFrameworkUpgrade() {
  console.log('\n🧠 Testing Advanced Framework Upgrade...');

  const scenarios = [
    {
      framework: 'coalitional',
      scenario_text: 'Three parliamentary blocs can form binding coalitions and divide rewards. Model every coalition worth and compute a fair payoff split.',
    },
    {
      framework: 'signaling',
      scenario_text: 'An incumbent firm may be strong or weak, knows its type privately, and can signal before an entrant chooses whether to enter.',
    },
  ];

  let passed = true;

  for (const scenario of scenarios) {
    const response = await makeRequest(`${SUPABASE_URL}/functions/v1/analyze-engine`, {
      scenario_text: scenario.scenario_text,
      audience: 'researcher',
      run_id: `test_framework_${scenario.framework}_${Date.now()}`,
    });

    if (response.status !== 200) {
      console.log(`  ❌ ${scenario.framework} request failed:`, response.status, response.data);
      passed = false;
      continue;
    }

    const envelope = response.data.analysis?.simulation_results?.advanced_frameworks?.[scenario.framework];
    if (!envelope) {
      console.log(`  ❌ ${scenario.framework} envelope missing`);
      passed = false;
      continue;
    }

    if (envelope.status !== 'deterministic') {
      console.log(`  ❌ ${scenario.framework} expected deterministic status, got:`, envelope.status);
      passed = false;
      continue;
    }

    if (!envelope.normalized_inputs || Object.keys(envelope.normalized_inputs).length === 0) {
      console.log(`  ❌ ${scenario.framework} missing normalized inputs`);
      passed = false;
      continue;
    }

    console.log(`  ✅ ${scenario.framework} deterministic upgrade verified`);
  }

  return passed;
}

async function runAllTests() {
  console.log('🚀 Starting Comprehensive Test Suite');
  console.log('=====================================');

  const results = [];

  try {
    results.push(await testAudienceValidation());
    results.push(await testCanonicalGameDetection());
    results.push(await testCacheBypass());
    results.push(await testEvidenceBackedValidation());
    results.push(await testResearcherSchema());
    results.push(await testAdvancedFrameworkUpgrade());

    const passed = results.filter(Boolean).length;
    const total = results.length;

    console.log('\n📊 Test Results Summary');
    console.log('=======================');
    console.log(`Passed: ${passed}/${total} tests`);

    if (passed === total) {
      console.log('🎉 All tests passed!');
      process.exit(0);
    } else {
      console.log('⚠️  Some tests failed. Check implementation.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
