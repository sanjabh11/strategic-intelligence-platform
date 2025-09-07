#!/usr/bin/env node

/**
 * AJV Schema Validator for Analysis Runs
 * Validates stored analysis JSON against audience-specific schemas
 * Usage: RUN_ID=<id> SUPABASE_URL=<url> SUPABASE_KEY=<key> node tools/ajv-validator.js
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const RUN_ID = process.env.RUN_ID;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL=<supabase_project_url>');
  console.error('   SUPABASE_KEY=<service_role_key>');
  console.error('   RUN_ID=<optional_run_id>');
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Initialize AJV with formats
const ajv = new Ajv({
  allErrors: true,
  strict: false,
  removeAdditional: false
});
addFormats(ajv);

// Define comprehensive schemas for each audience
const schemas = {
  student: {
    type: 'object',
    required: ['analysis_id', 'audience', 'summary', 'provenance'],
    properties: {
      analysis_id: { type: 'string' },
      audience: { type: 'string', enum: ['student'] },
      summary: {
        type: 'object',
        required: ['text'],
        properties: { text: { type: 'string' } }
      },
      top_2_actions: {
        type: 'array',
        items: {
          type: 'object',
          required: ['action', 'rationale', 'expected_outcome'],
          properties: {
            action: { type: 'string' },
            rationale: { type: 'string' },
            expected_outcome: { '$ref': '#/definitions/numeric_object' }
          }
        }
      },
      key_terms: {
        type: 'array',
        items: {
          type: 'object',
          required: ['term', 'definition'],
          properties: {
            term: { type: 'string' },
            definition: { type: 'string' }
          }
        }
      },
      two_quiz_questions: {
        type: 'array',
        items: {
          type: 'object',
          required: ['q', 'answer', 'difficulty'],
          properties: {
            q: { type: 'string' },
            answer: { type: 'string' },
            difficulty: { type: 'string', enum: ['easy', 'medium'] }
          }
        }
      },
      provenance: {
        type: 'object',
        required: ['retrieval_count', 'used_retrieval_ids', 'retrieval_sources', 'cache_hit', 'evidence_backed', 'llm_model', 'llm_duration_ms', 'fallback_used'],
        properties: {
          retrieval_count: { type: 'integer', minimum: 0 },
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
    },
    definitions: {
      numeric_object: {
        type: 'object',
        required: ['value', 'confidence', 'sources'],
        properties: {
          value: { type: 'number' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          sources: { type: 'array', items: { type: 'string', pattern: '^rid_' } }
        }
      }
    }
  },

  learner: {
    type: 'object',
    required: ['analysis_id', 'audience', 'summary', 'provenance'],
    properties: {
      analysis_id: { type: 'string' },
      audience: { type: 'string', enum: ['learner'] },
      summary: {
        type: 'object',
        required: ['text'],
        properties: { text: { type: 'string' } }
      },
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
      decision_table: {
        type: 'array',
        items: {
          type: 'object',
          required: ['actor', 'action', 'payoff_estimate'],
          properties: {
            actor: { type: 'string' },
            action: { type: 'string' },
            payoff_estimate: { '$ref': '#/definitions/numeric_object' },
            risk_notes: { type: 'string' }
          }
        }
      },
      expected_value_ranking: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            action: { type: 'string' },
            ev: { type: 'number' },
            ev_confidence: { type: 'number', minimum: 0, maximum: 1 }
          }
        }
      },
      provenance: {
        type: 'object',
        required: ['retrieval_count', 'used_retrieval_ids', 'retrieval_sources', 'cache_hit', 'evidence_backed', 'llm_model', 'llm_duration_ms', 'fallback_used'],
        properties: {
          retrieval_count: { type: 'integer', minimum: 0 },
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
    },
    definitions: {
      numeric_object: {
        type: 'object',
        required: ['value', 'confidence', 'sources'],
        properties: {
          value: { type: 'number' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          sources: { type: 'array', items: { type: 'string', pattern: '^rid_' } }
        }
      }
    }
  },

  researcher: {
    type: 'object',
    required: ['analysis_id', 'audience', 'long_summary', 'provenance'],
    properties: {
      analysis_id: { type: 'string' },
      audience: { type: 'string', enum: ['researcher'] },
      long_summary: {
        type: 'object',
        required: ['text'],
        properties: { text: { type: 'string' } }
      },
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
              required: ['type', 'profile', 'stability', 'confidence'],
              properties: {
                type: { type: 'string', enum: ['pure', 'mixed'] },
                profile: { type: 'array' },
                payoffs: { type: 'array' },
                stability: { type: 'number', minimum: 0, maximum: 1 },
                confidence: { type: 'number', minimum: 0, maximum: 1 }
              }
            }
          }
        }
      },
      provenance: {
        type: 'object',
        required: ['retrieval_count', 'used_retrieval_ids', 'retrieval_sources', 'cache_hit', 'evidence_backed', 'llm_model', 'llm_duration_ms', 'fallback_used'],
        properties: {
          retrieval_count: { type: 'integer', minimum: 0 },
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
  },

  teacher: {
    type: 'object',
    required: ['analysis_id', 'audience', 'lesson_outline', 'provenance'],
    properties: {
      analysis_id: { type: 'string' },
      audience: { type: 'string', enum: ['teacher'] },
      lesson_outline: {
        type: 'object',
        required: ['duration_minutes', 'learning_objectives', 'summary'],
        properties: {
          duration_minutes: { type: 'integer' },
          learning_objectives: { type: 'array', items: { type: 'string' } },
          summary: { type: 'string' }
        }
      },
      provenance: {
        type: 'object',
        required: ['retrieval_count', 'used_retrieval_ids', 'retrieval_sources', 'cache_hit', 'evidence_backed', 'llm_model', 'llm_duration_ms', 'fallback_used'],
        properties: {
          retrieval_count: { type: 'integer', minimum: 0 },
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
  }
};

// Compile validators
const validators = {};
Object.keys(schemas).forEach(audience => {
  validators[audience] = ajv.compile(schemas[audience]);
});

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

async function fetchRecentRuns(limit = 10) {
  console.log(`🔍 Fetching last ${limit} analysis runs`);

  const { data, error } = await supabase
    .from('analysis_runs')
    .select('id, audience, created_at, analysis, provenance')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('❌ Failed to fetch runs:', error.message);
    throw error;
  }

  return data;
}

function validateAnalysis(analysis, audience) {
  if (!analysis) {
    return { valid: false, errors: [{ message: 'No analysis data found' }] };
  }

  const validator = validators[audience];
  if (!validator) {
    return { valid: false, errors: [{ message: `No validator found for audience: ${audience}` }] };
  }

  const valid = validator(analysis);

  return {
    valid,
    errors: validator.errors || []
  };
}

function formatErrors(errors) {
  return errors.map((error, index) => {
    const path = error.instancePath || error.schemaPath || 'root';
    const message = error.message || 'Unknown error';
    return `${index + 1}. ${path}: ${message}`;
  }).join('\n');
}

async function validateSingleRun(runId) {
  try {
    const run = await fetchRun(runId);

    console.log(`📋 Run Details:`);
    console.log(`   ID: ${run.id}`);
    console.log(`   Audience: ${run.audience}`);
    console.log(`   Created: ${run.created_at}`);

    const validation = validateAnalysis(run.analysis, run.audience);

    console.log(`\n📊 Validation Result:`);
    console.log(`   Valid: ${validation.valid ? '✅ YES' : '❌ NO'}`);

    if (!validation.valid) {
      console.log(`\n❌ Validation Errors:`);
      console.log(formatErrors(validation.errors));
    } else {
      console.log(`\n✅ Schema validation PASSED`);

      // Additional checks
      const provenance = run.provenance || {};
      console.log(`\n📊 Provenance Checks:`);
      console.log(`   Cache Hit: ${provenance.cache_hit !== undefined ? '✅' : '❌'} (${provenance.cache_hit})`);
      console.log(`   Evidence Backed: ${provenance.evidence_backed !== undefined ? '✅' : '❌'} (${provenance.evidence_backed})`);
      console.log(`   Retrieval Count: ${provenance.retrieval_count !== undefined ? '✅' : '❌'} (${provenance.retrieval_count})`);
      console.log(`   Used Retrieval IDs: ${Array.isArray(provenance.used_retrieval_ids) ? '✅' : '❌'} (${provenance.used_retrieval_ids?.length || 0} items)`);
      console.log(`   LLM Model: ${provenance.llm_model ? '✅' : '❌'} (${provenance.llm_model})`);
      console.log(`   Fallback Used: ${provenance.fallback_used !== undefined ? '✅' : '❌'} (${provenance.fallback_used})`);
    }

    return validation.valid;

  } catch (error) {
    console.error('💥 Validation failed:', error.message);
    return false;
  }
}

async function validateRecentRuns(limit = 10) {
  try {
    const runs = await fetchRecentRuns(limit);

    console.log(`📊 VALIDATING LAST ${runs.length} RUNS`);
    console.log('=====================================');

    let passed = 0;
    let failed = 0;

    for (const run of runs) {
      console.log(`\n🔍 Run ${run.id} (${run.audience}) - ${run.created_at}`);

      const validation = validateAnalysis(run.analysis, run.audience);

      if (validation.valid) {
        console.log(`   ✅ PASSED`);
        passed++;
      } else {
        console.log(`   ❌ FAILED`);
        console.log(`   Errors: ${validation.errors.length}`);
        failed++;
      }
    }

    console.log(`\n📊 SUMMARY`);
    console.log('===========');
    console.log(`Total Runs: ${runs.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / runs.length) * 100).toFixed(1)}%`);

    return failed === 0;

  } catch (error) {
    console.error('💥 Batch validation failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 AJV Schema Validator for Analysis Runs');
  console.log('==========================================');

  if (RUN_ID) {
    // Validate single run
    console.log(`Validating single run: ${RUN_ID}\n`);
    const success = await validateSingleRun(RUN_ID);
    process.exit(success ? 0 : 1);
  } else {
    // Validate recent runs
    console.log('Validating recent runs (no RUN_ID specified)\n');
    const success = await validateRecentRuns(20);
    process.exit(success ? 0 : 1);
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

// Run the validator
main();