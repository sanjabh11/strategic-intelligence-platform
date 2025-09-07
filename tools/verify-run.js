#!/usr/bin/env node

/**
 * Claim Verification Tool
 * Verifies that LLM numeric claims actually match retrieval content
 * Usage: RUN_ID=<id> SUPABASE_URL=<url> SUPABASE_KEY=<key> node tools/verify-run.js
 */

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const RUN_ID = process.env.RUN_ID;

if (!SUPABASE_URL || !SUPABASE_KEY || !RUN_ID) {
  console.error('❌ Missing required environment variables:');
  console.error('   RUN_ID=<analysis_run_id>');
  console.error('   SUPABASE_URL=<supabase_project_url>');
  console.error('   SUPABASE_KEY=<service_role_key>');
  console.error('');
  console.error('Example:');
  console.error('RUN_ID=123e4567-e89b-12d3-a456-426614174000 \\');
  console.error('SUPABASE_URL=https://jxdihzqoaxtydolmltdr.supabase.co \\');
  console.error('SUPABASE_KEY=eyJ... \\');
  console.error('node tools/verify-run.js');
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchRun(runId) {
  console.log(`🔍 Fetching analysis run: ${runId}`);

  const { data, error } = await supabase
    .from('analysis_runs')
    .select('*')
    .eq('id', runId)
    .single();

  if (error) {
    console.error('❌ Failed to fetch run:', error.message);
    throw error;
  }

  return data;
}

function numberTolerance(actual, expected, relativeTolerance = 0.05) {
  if (typeof actual !== 'number' || typeof expected !== 'number') {
    return false;
  }

  const diff = Math.abs(actual - expected);
  const tolerance = Math.max(relativeTolerance * Math.abs(expected), 0.0001);
  return diff <= tolerance;
}

function extractNumbers(text) {
  if (!text || typeof text !== 'string') return [];

  // Extract numeric patterns: integers, decimals, with/without commas
  const numberRegex = /[-+]?\d{1,3}(?:[,0-9]{0,})?\.\d+|[-+]?\d{1,3}(?:[,0-9]{0,})?/g;

  return (text.match(numberRegex) || [])
    .map(s => {
      // Remove commas and convert to number
      const clean = s.replace(/,/g, '');
      const num = Number(clean);
      return isNaN(num) ? null : num;
    })
    .filter(n => n !== null);
}

async function fetchRetrievalContent(rid) {
  console.log(`   📄 Fetching retrieval: ${rid}`);

  // First try to get from retrieval_cache
  const { data: cached, error: cacheError } = await supabase
    .from('retrieval_cache')
    .select('id, url, snippet, content')
    .eq('id', rid)
    .single();

  if (cacheError) {
    console.warn(`   ⚠️  Retrieval ${rid} not found in cache:`, cacheError.message);
    return null;
  }

  let content = cached.content || cached.snippet;

  // If no content but we have URL, try to fetch it
  if (!content && cached.url) {
    console.log(`   🌐 Fetching content from URL: ${cached.url}`);
    try {
      const response = await axios.get(cached.url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ClaimVerifier/1.0)'
        }
      });
      content = String(response.data);
    } catch (fetchError) {
      console.warn(`   ⚠️  Failed to fetch URL content:`, fetchError.message);
      return null;
    }
  }

  return {
    id: cached.id,
    url: cached.url,
    content: content,
    hasContent: !!content
  };
}

async function verifyNumericClaim(claim, retrievals) {
  const { name, value, confidence, sources } = claim;

  console.log(`\n🔢 Verifying claim: ${name}`);
  console.log(`   Claimed value: ${value} (confidence: ${confidence})`);
  console.log(`   Sources: ${sources?.join(', ') || 'none'}`);

  if (!sources || sources.length === 0) {
    console.log(`   ❌ No sources provided for claim ${name}`);
    return { claim: name, matched: 0, total: 0, verified: false };
  }

  let matchedSources = 0;
  const sourceResults = [];

  for (const rid of sources) {
    const retrieval = await fetchRetrievalContent(rid);

    if (!retrieval) {
      sourceResults.push({ rid, status: 'not_found', matched: false });
      continue;
    }

    if (!retrieval.hasContent) {
      sourceResults.push({ rid, status: 'no_content', matched: false });
      continue;
    }

    // Extract numbers from retrieval content
    const numbers = extractNumbers(retrieval.content);

    if (numbers.length === 0) {
      sourceResults.push({
        rid,
        status: 'no_numbers',
        matched: false,
        sampleContent: retrieval.content.substring(0, 100) + '...'
      });
      continue;
    }

    // Check if any extracted number matches the claimed value
    const matches = numbers.filter(num => numberTolerance(value, num, 0.05));

    if (matches.length > 0) {
      matchedSources++;
      sourceResults.push({
        rid,
        status: 'matched',
        matched: true,
        foundNumbers: numbers.slice(0, 5), // Show first 5 numbers found
        matchingNumbers: matches
      });
      console.log(`   ✅ Matched in ${rid}: found ${matches.join(', ')}`);
    } else {
      sourceResults.push({
        rid,
        status: 'no_match',
        matched: false,
        foundNumbers: numbers.slice(0, 5),
        sampleContent: retrieval.content.substring(0, 200) + '...'
      });
      console.log(`   ❌ No match in ${rid}: found numbers ${numbers.slice(0, 5).join(', ')}`);
    }
  }

  const verified = matchedSources > 0;
  const result = {
    claim: name,
    matched: matchedSources,
    total: sources.length,
    verified,
    sources: sourceResults
  };

  console.log(`   📊 Result: ${matchedSources}/${sources.length} sources verified (${verified ? 'PASS' : 'FAIL'})`);

  return result;
}

async function main() {
  try {
    console.log('🚀 Starting Claim Verification');
    console.log('===============================');

    // Fetch the analysis run
    const run = await fetchRun(RUN_ID);

    console.log(`📋 Run Details:`);
    console.log(`   ID: ${run.id}`);
    console.log(`   Created: ${run.created_at}`);
    console.log(`   Audience: ${run.audience}`);
    console.log(`   Scenario: ${run.scenario_text?.substring(0, 100)}${run.scenario_text?.length > 100 ? '...' : ''}`);

    // Check provenance
    const provenance = run.provenance || {};
    console.log(`\n📊 Provenance:`);
    console.log(`   Cache Hit: ${provenance.cache_hit}`);
    console.log(`   Evidence Backed: ${provenance.evidence_backed}`);
    console.log(`   Retrieval Count: ${provenance.retrieval_count}`);
    console.log(`   Used Retrieval IDs: ${provenance.used_retrieval_ids?.length || 0}`);
    console.log(`   LLM Model: ${provenance.llm_model}`);
    console.log(`   Fallback Used: ${provenance.fallback_used}`);

    // Get analysis data
    const analysis = run.analysis || {};
    const numericClaims = analysis.numeric_claims || [];

    if (numericClaims.length === 0) {
      console.log('\n⚠️  No numeric claims found in this analysis run');
      console.log('This might be expected for non-finance queries');
      return;
    }

    console.log(`\n🔢 Found ${numericClaims.length} numeric claims to verify`);

    // Verify each claim
    const verificationResults = [];
    for (const claim of numericClaims) {
      const result = await verifyNumericClaim(claim, provenance.used_retrieval_ids || []);
      verificationResults.push(result);
    }

    // Summary
    console.log('\n📊 VERIFICATION SUMMARY');
    console.log('=======================');

    const totalClaims = verificationResults.length;
    const verifiedClaims = verificationResults.filter(r => r.verified).length;
    const totalSources = verificationResults.reduce((sum, r) => sum + r.total, 0);
    const verifiedSources = verificationResults.reduce((sum, r) => sum + r.matched, 0);

    console.log(`Claims: ${verifiedClaims}/${totalClaims} verified (${((verifiedClaims/totalClaims)*100).toFixed(1)}%)`);
    console.log(`Sources: ${verifiedSources}/${totalSources} verified (${totalSources > 0 ? ((verifiedSources/totalSources)*100).toFixed(1) : 0}%)`);

    // Detailed results
    console.log('\n📋 Detailed Results:');
    verificationResults.forEach(result => {
      const status = result.verified ? '✅' : '❌';
      console.log(`${status} ${result.claim}: ${result.matched}/${result.total} sources`);
    });

    // Final assessment
    const successRate = verifiedClaims / totalClaims;
    console.log('\n🎯 FINAL ASSESSMENT');
    console.log('===================');

    if (successRate >= 0.8) {
      console.log('✅ EXCELLENT: High verification rate - LLM is well-grounded in retrievals');
    } else if (successRate >= 0.6) {
      console.log('⚠️  GOOD: Moderate verification rate - some claims may need review');
    } else if (successRate >= 0.3) {
      console.log('❌ CONCERNING: Low verification rate - many claims may be hallucinated');
    } else {
      console.log('🚨 CRITICAL: Very low verification rate - system may have significant hallucination issues');
    }

    console.log('\n💡 Recommendations:');
    if (successRate < 0.8) {
      console.log('- Check if retrieval content is being properly stored');
      console.log('- Verify LLM is actually reading the injected retrievals');
      console.log('- Consider reducing temperature or strengthening micro-prompt');
      console.log('- Review retrieval quality and ranking');
    }

    // Exit with appropriate code
    process.exit(successRate >= 0.6 ? 0 : 1);

  } catch (error) {
    console.error('💥 Verification failed:', error.message);
    console.error(error.stack);
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

// Run the verification
main();