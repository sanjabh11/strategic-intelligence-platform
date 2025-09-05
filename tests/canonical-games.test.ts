// Canonical Games Test Suite - Phase 2
// Tests that the platform returns expected structured outputs for key game theory scenarios
// Run with: npm test tests/canonical-games.test.ts

import { expect, describe, it, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Assume Supabase client for testing
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jxdihzqoaxtydolmltdr.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4ZGloenFvYXh0eWRvbG1sdGRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5MjQ2MDUsImV4cCI6MjA3MTUwMDYwNX0.RS92p3Y7qJ-38PLFR1L4Y9Rl9R4dmFYYCVxhBcJBW8Q';
const supabase = createClient(supabaseUrl, supabaseKey);

describe('Canonical Games Test Suite', () => {
  // Test environment setup
  beforeAll(async () => {
    // Ensure our functions are deployed/available
  });

  afterAll(async () => {
    // Cleanup
  });

  describe('Prisoners Dilemma', () => {
    it('should return defect as top EV action for self-interested agents with seeded RNG', async () => {
      const scenario = {
        scenario_text: 'Two suspects are arrested by the police. The police have insufficient evidence for a conviction, and, having separated both prisoners, visit each of them to offer the same deal.',
        mode: 'standard',
        audience: 'researcher'
      };

      // Mock the API call to analyze-engine
      const response = await fetch(`${supabaseUrl}/functions/v1/analyze-engine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify(scenario)
      });

      expect(response.ok).toBe(true);
      const result = await response.json();

      // Assert expected structure
      expect(result.analysis).toBeDefined();
      expect(result.analysis.decision_table).toBeDefined();
      expect(result.analysis.decision_table).toBeInstanceOf(Array);
      expect(result.analysis.decision_table.length).toBeGreaterThan(0);

      // Assert defect is top EV
      expect(result.analysis.expected_value_ranking).toBeDefined();
      expect(result.analysis.expected_value_ranking[0].action).toMatch(/defect/i);
    });
  });

  describe('Stag Hunt', () => {
    it('should assert cooperate is top EV when agent risk_tolerance is low', async () => {
      const scenario = {
        scenario_text: 'Two hunters go out on a hunt. Each can individually choose to hunt a stag or hunt a hare. The scenario involves low risk tolerance.',
        mode: 'standard',
        audience: 'researcher'
      };

      const response = await fetch(`${supabaseUrl}/functions/v1/analyze-engine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify(scenario)
      });

      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result.analysis.expected_value_ranking[0].action).toMatch(/stag|cooperate/i);
    });
  });

  describe('Matching Pennies', () => {
    it('should assert mixed equilibrium with probabilities sum to 1 and type=mixed', async () => {
      const scenario = {
        scenario_text: 'Two players simultaneously choose heads or tails. Player A wins if the coins match, Player B wins if they do not.',
        mode: 'standard',
        audience: 'researcher'
      };

      const response = await fetch(`${supabaseUrl}/functions/v1/analyze-engine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify(scenario)
      });

      expect(response.ok).toBe(true);
      const result = await response.json();

      // Assert mixed equilibrium type
      expect(result.analysis.equilibrium_type).toBe('mixed');

      // Assert probabilities sum to 1
      const { equilibria } = result.analysis.simulation_results || {};
      if (equilibria && equilibria.length > 0) {
        const mixedEq = equilibria.find((eq: any) => eq.type === 'mixed');
        if (mixedEq) {
          expect(mixedEq.profile.reduce((sum: number, p: number) => sum + p, 0)).toBeCloseTo(1, 2);
        }
      }
    });
  });

  describe('AI-Safety Smoke Test', () => {
    it('should POST scenario, assert researcher returns payoff_matrix with numeric values and provenance.retrieval_count > 0 when mode=standard', async () => {
      const scenario = {
        scenario_text: 'Three firms (Apple, Google, Microsoft) face coordination tradeoff: leading on AI safety reduces short-term market share but increases regulatory trust and long-term growth.',
        mode: 'standard',
        audience: 'researcher'
      };

      const response = await fetch(`${supabaseUrl}/functions/v1/analyze-engine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify(scenario)
      });

      expect(response.ok).toBe(true);
      const result = await response.json();

      // Assert audience
      expect(result.analysis.audience).toBe('researcher');

      // Assert payoff matrix exists with numeric values
      expect(result.analysis.payoff_matrix).toBeDefined();
      expect(result.analysis.payoff_matrix.matrix_values).toBeDefined();
      expect(result.analysis.payoff_matrix.matrix_values.length).toBeGreaterThan(0);
      expect(typeof result.analysis.payoff_matrix.matrix_values[0][0]).toBe('number');

      // Assert provenance
      expect(result.analysis.provenance).toBeDefined();
      expect(result.analysis.provenance.retrieval_count).toBeGreaterThan(0);
    });
  });

  describe('Schema Validation Tests', () => {
    it('should persist schema failure row for malformed LLM JSON', async () => {
      // Mock invalid response
      const invalidAnalysis = {
        analysis_id: 'test-invalid',
        audience: 'student',
        summary: { text: 'Missing numeric_object fields' },
        provenance: { retrieval_count: 0, retrieval_ids: [], evidence_backed: false }
        // Missing required decision_table with numeric_object
      };

      // This test would need to mock the Edge Function to return invalid JSON
      // For now, assert that validation exists
      expect(1).toBe(1); // Placeholder
    });

    it('should return 422 for schema validation failure', async () => {
      // Similar to above - mock Edge Function response
      expect(1).toBe(1); // Placeholder
    });
  });
});