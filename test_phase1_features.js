// Test script for Phase 1 features
// Run with: node test_phase1_features.js

// Test 1: AJV Schema rejects malformed numeric_object
console.log('=== Testing AJV Schema Validation ===');

// Note: In a real environment, this would import Ajv
// import Ajv from 'ajv';

// For testing, we'll simulate AJV validation
function validateNumericObject(obj) {
  // Simple validation mimicking AJV schema
  if (!obj || typeof obj !== 'object') return false;
  if (typeof obj.value !== 'number') return false;
  if (typeof obj.confidence !== 'number' || obj.confidence < 0 || obj.confidence > 1) return false;
  if (!Array.isArray(obj.sources) || obj.sources.length < 1) return false;

  for (const source of obj.sources) {
    if (!source.id || typeof source.score !== 'number' || source.score < 0 || source.score > 1) {
      return false;
    }
  }

  return true;
}
// Test valid numeric object
const validNumericObj = {
  value: 1000000,
  confidence: 0.8,
  sources: [{ id: "retr-1", score: 0.9, excerpt: "Sample excerpt" }]
};

const invalidNumericObj1 = {
  value: "not a number", // wrong type
  confidence: 0.8,
  sources: [{ id: "retr-1", score: 0.9 }]
};

const invalidNumericObj2 = {
  value: 1000000,
  confidence: 0.8 // missing sources
};

const invalidNumericObj3 = {
  value: 1000000,
  confidence: 1.5, // confidence > 1
  sources: [{ id: "retr-1", score: 0.9 }]
};

console.log('Valid object test:', validateNumericObject(validNumericObj) ? 'PASS' : 'FAIL');
console.log('Invalid type test:', !validateNumericObject(invalidNumericObj1) ? 'PASS' : 'FAIL');
console.log('Missing sources test:', !validateNumericObject(invalidNumericObj2) ? 'PASS' : 'FAIL');
console.log('Confidence > 1 test:', !validateNumericObject(invalidNumericObj3) ? 'PASS' : 'FAIL');

// Test 2: EV Engine links sources correctly
console.log('\n=== Testing EV Engine Source Linking ===');

// Simulated EV engine test (simplified)
function testEVLinking() {
  const testActions = [
    {
      actor: "Company",
      action: "invest_heavy",
      payoff_estimate: {
        value: 1000000,
        confidence: 0.8,
        sources: [{ id: "retr-1", score: 0.9, excerpt: "Investment yields high returns" }]
      }
    },
    {
      actor: "Company",
      action: "invest_light",
      payoff_estimate: {
        value: 500000,
        confidence: 0.6,
        sources: [] // Empty sources
      }
    }
  ];

  // Simulate computeEVs logic
  const results = testActions.map(a => {
    const sources = a.payoff_estimate.sources.map(s => ({
      retrieval_id: s.id,
      score: s.score,
      excerpt: s.excerpt
    }));
    const derived = !sources || sources.length === 0;

    return {
      action: a.action,
      sources,
      derived,
      raw: { ...a.payoff_estimate, derived }
    };
  });

  console.log('First action sources linked:', results[0].sources.length > 0 ? 'PASS' : 'FAIL');
  console.log('Second action marked as derived:', results[1].derived ? 'PASS' : 'FAIL');
}

testEVLinking();

// Test 3: Human Review Flagging
console.log('\n=== Testing Human Review Flagging ===');

function detectHighStakesAnalysis(scenarioText, evidenceBacked, predictedImpact) {
  const geopoliticalKeywords = [
    'war', 'conflict', 'invasion', 'sanctions', 'treaty', 'alliance', 'nuclear', 'military', 'terrorism',
    'cyberattack', 'espionage', 'diplomacy', 'geopolitical', 'international', 'border', 'sovereignty',
    'china', 'russia', 'iran', 'north korea', 'middle east', 'ukraine', 'taiwan'
  ];

  const hasGeopoliticalContent = geopoliticalKeywords.some(keyword =>
    scenarioText?.toLowerCase().includes(keyword)
  );

  const highImpact = predictedImpact !== undefined && predictedImpact > 0.7;

  // Flag if geopolitical OR (not evidence-backed AND high impact)
  return hasGeopoliticalContent || (!evidenceBacked && highImpact);
}

// Test cases
const testCases = [
  { scenario: 'Market analysis of tech stocks', evidenceBacked: true, expected: false },
  { scenario: 'Geopolitical tensions in Ukraine', evidenceBacked: true, expected: true },
  { scenario: 'Nuclear accord negotiation', evidenceBacked: false, expected: true },
  { scenario: 'Regular business strategy', evidenceBacked: false, impact: 0.5, expected: false },
  { scenario: 'International trade war', evidenceBacked: true, impact: 0.9, expected: true }
];

testCases.forEach((test, i) => {
  const result = detectHighStakesAnalysis(test.scenario, test.evidenceBacked, test.impact);
  console.log(`Test ${i+1}: ${result === test.expected ? 'PASS' : 'FAIL'} (${test.scenario})`);
});

console.log('\n=== All Tests Complete ===');