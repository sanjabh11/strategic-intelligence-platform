#!/usr/bin/env node

/**
 * Implementation Validation Test Script
 * Tests all the critical P0 and P1 fixes we implemented
 */

import { execSync } from 'child_process';
import fs from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Environment variables SUPABASE_URL and SUPABASE_ANON_KEY are required');
  process.exit(1);
}

console.log('🚀 Starting Implementation Validation Tests...\n');

const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  details: []
};

// Test scenarios for different validation points
const testScenarios = [
  {
    name: 'Cache Bypass with Force Fresh',
    scenario: 'gold price today - current market analysis',
    options: { forceFresh: true },
    audience: 'student',
    expected: {
      cache_hit: false,
      retrieval_count: '>=1',
      evidence_backed: true
    }
  },
  {
    name: 'Real-time Financial Query',
    scenario: 'current gold price and market trends today',
    audience: 'researcher',
    expected: {
      cache_hit: false,
      retrieval_count: '>=3',
      evidence_backed: true
    }
  },
  {
    name: 'Geopolitical Evidence Test',
    scenario: 'US-China trade war impacts on semiconductor supply chains',
    audience: 'researcher',
    expected: {
      evidence_backed: true,
      retrieval_sources: ['perplexity', 'uncomtrade', 'worldbank', 'gdelt']
    }
  },
  {
    name: 'Evidence-backed Determination',
    scenario: 'India-US tariffs and trade policy implications',
    audience: 'researcher',
    expected: {
      evidence_backed: true,
      perplexity_sources: '>=1',
      other_sources: '>=2'
    }
  }
];

// Helper function to make API calls
async function testAnalyzeEngine(testCase, index) {
  const requestId = `test-${index + 1}-${Date.now()}`;
  const payload = {
    request_id: requestId,
    scenario_text: testCase.scenario,
    audience: testCase.audience,
    mode: "standard",
    options: testCase.options || {}
  };

  try {
    const curlCommand = `
curl -s -X POST "${SUPABASE_URL}/functions/v1/analyze-engine" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '${JSON.stringify(payload)}'
`.trim();

    const response = execSync(curlCommand, { encoding: 'utf-8' });
    const jsonResponse = JSON.parse(response);

    return { success: true, response: jsonResponse, requestId };
  } catch (error) {
    return { success: false, error: error.message, requestId };
  }
}

// Validation function
function validateResponse(testCase, result) {
  const validation = {
    testCase: testCase.name,
    passed: true,
    failures: [],
    metrics: {}
  };

  if (!result.success) {
    validation.passed = false;
    validation.failures.push('Request failed completely');
    return validation;
  }

  const data = result.response;

  // Check for valid response structure
  if (!data.ok || !data.analysis) {
    validation.passed = false;
    validation.failures.push('Invalid response structure');
    return validation;
  }

  const analysis = data.analysis;
  const provenance = data.provenance;

  // Test 1: Cache hit tracking
  if (testCase.expected.cache_hit !== undefined) {
    const actualCacheHit = provenance.cache_hit;
    const expectedCacheHit = testCase.expected.cache_hit;
    
    if (actualCacheHit !== expectedCacheHit) {
      validation.passed = false;
      validation.failures.push(`Cache hit mismatch: expected ${expectedCacheHit}, got ${actualCacheHit}`);
    } else {
      validation.metrics.cache_hit = actualCacheHit;
    }
  }

  // Test 2: Retrieval count
  if (testCase.expected.retrieval_count) {
    const actualCount = provenance.retrieval_count;
    const expectedCount = testCase.expected.retrieval_count;
    
    if (expectedCount.includes('>=')) {
      const minCount = parseInt(expectedCount.replace('>=', ''));
      if (actualCount < minCount) {
        validation.passed = false;
        validation.failures.push(`Retrieval count too low: expected >=${minCount}, got ${actualCount}`);
      }
    } else {
      if (actualCount !== parseInt(expectedCount)) {
        validation.passed = false;
        validation.failures.push(`Retrieval count mismatch: expected ${expectedCount}, got ${actualCount}`);
      }
    }
    validation.metrics.retrieval_count = actualCount;
  }

  // Test 3: Evidence-backed status
  if (testCase.expected.evidence_backed !== undefined) {
    const actualEvidenceBacked = provenance.evidence_backed;
    const expectedEvidenceBacked = testCase.expected.evidence_backed;
    
    if (actualEvidenceBacked !== expectedEvidenceBacked) {
      validation.passed = false;
      validation.failures.push(`Evidence-backed mismatch: expected ${expectedEvidenceBacked}, got ${actualEvidenceBacked}`);
    } else {
      validation.metrics.evidence_backed = actualEvidenceBacked;
    }
  }

  // Test 4: Retrieval sources
  if (testCase.expected.retrieval_sources) {
    const actualSources = provenance.retrieval_sources || [];
    const expectedSources = testCase.expected.retrieval_sources;
    
    const hasExpectedSources = expectedSources.every(source => 
      actualSources.includes(source)
    );
    
    if (!hasExpectedSources) {
      validation.passed = false;
      validation.failures.push(`Missing expected sources: expected ${expectedSources.join(', ')}, got ${actualSources.join(', ')}`);
    } else {
      validation.metrics.retrieval_sources = actualSources;
    }
  }

  // Test 5: Perplexity sources
  if (testCase.expected.perplexity_sources) {
    const actualSources = provenance.retrieval_sources || [];
    const perplexityCount = actualSources.filter(s => s === 'perplexity').length;
    const expectedCount = testCase.expected.perplexity_sources;
    
    if (expectedCount.includes('>=')) {
      const minCount = parseInt(expectedCount.replace('>=', ''));
      if (perplexityCount < minCount) {
        validation.passed = false;
        validation.failures.push(`Perplexity sources too low: expected >=${minCount}, got ${perplexityCount}`);
      }
    }
    validation.metrics.perplexity_sources = perplexityCount;
  }

  // Test 6: Other sources
  if (testCase.expected.other_sources) {
    const actualSources = provenance.retrieval_sources || [];
    const otherCount = actualSources.filter(s => s !== 'perplexity').length;
    const expectedCount = testCase.expected.other_sources;
    
    if (expectedCount.includes('>=')) {
      const minCount = parseInt(expectedCount.replace('>=', ''));
      if (otherCount < minCount) {
        validation.passed = false;
        validation.failures.push(`Other sources too low: expected >=${minCount}, got ${otherCount}`);
      }
    }
    validation.metrics.other_sources = otherCount;
  }

  return validation;
}

// Main test runner
async function runTests() {
  console.log(`Running ${testScenarios.length} validation tests...\n`);

  for (let i = 0; i < testScenarios.length; i++) {
    const testCase = testScenarios[i];
    console.log(`Test ${i + 1}: ${testCase.name}`);
    
    const result = await testAnalyzeEngine(testCase, i);
    const validation = validateResponse(testCase, result);
    
    testResults.total++;
    if (validation.passed) {
      testResults.passed++;
      console.log(`  ✅ PASSED`);
    } else {
      testResults.failed++;
      console.log(`  ❌ FAILED`);
      validation.failures.forEach(failure => console.log(`    - ${failure}`));
    }
    
    if (Object.keys(validation.metrics).length > 0) {
      console.log(`    Metrics:`, validation.metrics);
    }
    
    console.log('');
    
    // Small delay between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n📊 TEST RESULTS SUMMARY');
  console.log('========================');
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed}`);
  console.log(`Failed: ${testResults.failed}`);
  console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%\n`);

  // Acceptance Criteria Check
  console.log('🎯 ACCEPTANCE CRITERIA CHECK');
  console.log('=============================');
  
  const acceptanceCriteria = {
    'Cache bypass working': testResults.details.some(d => d.metrics?.cache_hit === false),
    'Retrieval count >= 1 for real-time queries': testResults.details.some(d => d.metrics?.retrieval_count >= 1),
    'Evidence-backed rate >= 85%': (testResults.details.filter(d => d.metrics?.evidence_backed).length / testResults.details.length) >= 0.85,
    'Perplexity sources present': testResults.details.some(d => d.metrics?.perplexity_sources >= 1),
    'Multiple data sources': testResults.details.some(d => d.metrics?.retrieval_sources?.length >= 3)
  };

  Object.entries(acceptanceCriteria).forEach(([criteria, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${criteria}`);
  });

  const allCriteriaPassed = Object.values(acceptanceCriteria).every(v => v);
  
  if (allCriteriaPassed) {
    console.log('\n🎉 ALL ACCEPTANCE CRITERIA PASSED!');
    console.log('The implementation is ready for production deployment.');
  } else {
    console.log('\n⚠️  Some acceptance criteria failed. Review the test results above.');
  }

  // Write detailed results to file
  fs.writeFileSync('test_validation_results.json', JSON.stringify({
    summary: testResults,
    acceptanceCriteria,
    details: testResults.details,
    timestamp: new Date().toISOString()
  }, null, 2));
  
  console.log('\n📄 Detailed results saved to test_validation_results.json');
}

// Run the tests
runTests().catch(console.error);