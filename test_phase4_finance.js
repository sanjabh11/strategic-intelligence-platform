import { execSync } from 'child_process';
import fs from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Environment variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required');
  process.exit(1);
}

// 10 Finance test scenarios
const financeScenarios = [
  "Gold price trends and current market analysis",
  "Oil market outlook and trading opportunities",
  "Bitcoin cryptocurrency investment analysis",
  "EURUSD forex trading scenario",
  "SPY ETF market performance review",
  "Crude oil futures market analysis",
  "Bitcoin vs Ethereum crypto market comparison",
  "GBPUSD currency pair trading opportunity",
  "Silver commodity market outlook",
  "USDJPY forex pair technical analysis"
];

// Test results container
const testResults = {
  total: financeScenarios.length,
  passed: 0,
  failed: 0,
  details: [],
  metrics: {
    totalTimestampChecks: 0,
    validTimestamps: 0,
    top2ActionsPresent: 0,
    provenancePresent: 0,
    sourcesWithPassages: 0,
    evidenceBackedAppropriate: 0,
    uiBannerReady: 0,
    schemaFailures: 0
  }
};

// Helper function to make analyze-engine request
async function testAnalyzeEngine(scenario, index) {
  const requestId = `test-${index + 1}-${Date.now()}`;
  const payload = {
    runId: requestId,
    scenario_text: scenario,
    audience: "researcher",
    mode: "standard",
    forceFresh: scenario.includes("Gold price") ? true : false
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

// Validate response against finance criteria
function validateResponse(scenario, result) {
  const validation = {
    scenario,
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

  // 1. Check for valid response structure
  if (!data.ok || !data.analysis) {
    validation.passed = false;
    validation.failures.push('Invalid response structure');
    return validation;
  }

  const analysis = data.analysis;

  // 2. Check spot_price timestamp within last 24 hours
  let timestampValid = false;
  if (analysis.indicators && analysis.indicators.spot_price && analysis.indicators.spot_price.timestamp) {
    const timestamp = new Date(analysis.indicators.spot_price.timestamp);
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    if (timestamp >= twentyFourHoursAgo && timestamp <= now) {
      timestampValid = true;
      testResults.metrics.validTimestamps++;
    }
    testResults.metrics.totalTimestampChecks++;
  }

  validation.metrics.timestampValid = timestampValid;

  // 3. Check top_2_actions present with required fields
  let top2ActionsValid = false;
  if (analysis.top_2_actions && Array.isArray(analysis.top_2_actions) && analysis.top_2_actions.length >= 2) {
    const hasRequiredFields = analysis.top_2_actions.every(action =>
      action.action &&
      action.allocation_pct &&
      action.entry_price_range
    );
    if (hasRequiredFields) {
      top2ActionsValid = true;
      testResults.metrics.top2ActionsPresent++;
    }
  }

  validation.metrics.top2ActionsValid = top2ActionsValid;

  // 4. Check provenance.retrieval_ids present
  let provenanceValid = false;
  if (analysis.provenance && analysis.provenance.retrieval_ids && Array.isArray(analysis.provenance.retrieval_ids)) {
    provenanceValid = true;
    testResults.metrics.provenancePresent++;
  }

  validation.metrics.provenanceValid = provenanceValid;

  // 5. Check numeric claims have sources with passage text
  let sourcesWithPassagesValid = true;
  if (analysis.numeric_claims && Array.isArray(analysis.numeric_claims)) {
    for (const claim of analysis.numeric_claims) {
      if (claim.sources && Array.isArray(claim.sources)) {
        const hasPassageText = claim.sources.every(source =>
          source.passage_text && source.passage_text.length > 0
        );
        if (!hasPassageText) {
          sourcesWithPassagesValid = false;
          break;
        }
      }
    }
  }
  if (sourcesWithPassagesValid) {
    testResults.metrics.sourcesWithPassages++;
  }

  validation.metrics.sourcesWithPassagesValid = sourcesWithPassagesValid;

  // 6. Check evidence_backed is true/false appropriately
  let evidenceBackedAppropriate = false;
  if (typeof analysis.provenance?.evidence_backed === 'boolean') {
    // Should be true if there are retrievals/sources, false if none
    const hasSources = (analysis.retrievals && analysis.retrievals.length > 0) ||
                      (analysis.provenance?.retrieval_ids && analysis.provenance.retrieval_ids.length > 0);
    if (hasSources === analysis.provenance.evidence_backed) {
      evidenceBackedAppropriate = true;
      testResults.metrics.evidenceBackedAppropriate++;
    }
  }

  validation.metrics.evidenceBackedAppropriate = evidenceBackedAppropriate;

  // 7. Check UI banner ready (presence of key fields)
  let uiBannerReady = false;
  if (analysis.indicators &&
      analysis.top_2_actions &&
      analysis.provenance &&
      analysis.market_indicators) {
    uiBannerReady = true;
    testResults.metrics.uiBannerReady++;
  }

  validation.metrics.uiBannerReady = uiBannerReady;

  // Overall validation
  const requiredChecks = [
    timestampValid,
    top2ActionsValid,
    provenanceValid,
    sourcesWithPassagesValid,
    evidenceBackedAppropriate,
    uiBannerReady
  ];

  if (!requiredChecks.every(check => check)) {
    validation.passed = false;
    validation.failures.push(`Required checks failed: ${requiredChecks.map((check, i) =>
      !check ? ['timestamp', 'top2_actions', 'provenance', 'sources', 'evidence_backed', 'ui_banner'][i] : null
    ).filter(x => x).join(', ')}`);
  }

  return validation;
}

// Main test execution
async function runTests() {
  console.log('=== Phase 4 Finance Smoke Tests ===\n');
  console.log(`Running ${financeScenarios.length} finance test scenarios (at least 8/10 should pass smoke criteria)...\n`);

  for (let i = 0; i < financeScenarios.length; i++) {
    const scenario = financeScenarios[i];
    console.log(`[${i + 1}/${financeScenarios.length}] Testing: ${scenario}`);

    const result = await testAnalyzeEngine(scenario, i);
    const validation = validateResponse(scenario, result);

    if (validation.passed) {
      testResults.passed++;
      console.log('✓ PASSED\n');
    } else {
      testResults.failed++;
      console.log('✗ FAILED:', validation.failures.join('; '));
      console.log();
    }

    testResults.details.push({
      scenario,
      validation,
      result
    });

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Calculate final metrics
  console.log('\n=== SMOKE TEST RESULTS ===\n');

  console.log('PASS/FAIL SUMMARY:');
  console.log(`Passed: ${testResults.passed}/${testResults.total}`);
  console.log(`Failed: ${testResults.failed}/${testResults.total}\n`);

  console.log('SMOKE CRITERIA VALIDATION:');
  console.log(`1. Spot price timestamp within 24h: ${testResults.metrics.validTimestamps}/${testResults.metrics.totalTimestampChecks}`);
  console.log(`2. Top 2 actions with allocation_pct & entry_price_range: ${testResults.metrics.top2ActionsPresent}/${testResults.total}`);
  console.log(`3. Provenance retrieval_ids present: ${testResults.metrics.provenancePresent}/${testResults.total}`);
  console.log(`4. Numeric claims have sources with passages: ${testResults.metrics.sourcesWithPassages}/${testResults.total}`);
  console.log(`5. Evidence backed true/false appropriate: ${testResults.metrics.evidenceBackedAppropriate}/${testResults.total}`);
  console.log(`6. UI banner ready (key fields present): ${testResults.metrics.uiBannerReady}/${testResults.total}\n`);

  console.log('PRIMARY SMOKE REQUIREMENT:');
  const criterion8of10 = testResults.passed >= 8;
  console.log(`• At least 8/10 queries pass all criteria: ${criterion8of10 ? '✓ PASSED' : '✗ FAILED'}\n`);

  if (criterion8of10) {
    console.log('🚀 Finance smoke tests PASSED - core functionality validated!');
  } else {
    console.log('❌ Finance smoke tests FAILED - requires investigation');
  }

  // Write detailed results to file
  fs.writeFileSync('test_results_phase4.json', JSON.stringify(testResults, null, 2));
  console.log('\nDetailed results saved to test_results_phase4.json');
}

// Run the tests
runTests().catch(console.error);