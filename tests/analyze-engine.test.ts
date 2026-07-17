import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { normalizeStrategistResponse, normalizeAdvancedGameOutputs } from '../src/lib/strategistContract';

describe('analyze-engine response normalization', () => {
  describe('normalizeStrategistResponse', () => {
    it('should normalize a well-formed response', () => {
      const raw = {
        success: true,
        decision_id: 'test-001',
        strategist: {
          executive_summary: 'Test summary',
          summary: 'Test',
          game_classification: { canonical_form: 'prisoners_dilemma', label: "Prisoner's Dilemma" },
          actors: [{ id: 'a1', name: 'Alice', role: 'player', objectives: ['maximize'] }],
          actor_map: [{ actorId: 'a1', name: 'Alice', role: 'player' }],
          incentives: [{ actorId: 'a1', incentives: ['win'], leverage: ['info'], constraints: ['time'] }],
          options: [{ actorId: 'a1', options: [{ action: 'Cooperate', expected_value: 3 }] }],
          equilibria: [{ name: 'Nash', profile: { a1: 'Cooperate' }, whyItHolds: 'stable', stability: 0.8 }],
          recommendation: {
            primary_action: 'Cooperate',
            rationale: 'Best outcome',
            expected_outcome: 'Mutual cooperation',
            confidence: 0.8,
            alternatives: [],
          },
          evidence: [],
          claims: [],
          provenance: { source: 'evidence_backed', provider: 'gemini' },
          source: 'llm',
        },
      };
      const result = normalizeStrategistResponse(raw);
      expect(result.success).toBe(true);
      expect(result.strategist.actors).toHaveLength(1);
      expect(result.strategist.actors[0].name).toBe('Alice');
    });

    it('should handle missing strategist field gracefully', () => {
      const raw = { success: false };
      const result = normalizeStrategistResponse(raw);
      expect(result.success).toBe(false);
      expect(result.strategist).toBeDefined();
      expect(result.strategist.actors).toEqual([]);
    });

    it('should handle null input gracefully', () => {
      const result = normalizeStrategistResponse(null);
      expect(result.strategist).toBeDefined();
      expect(result.strategist.actors).toEqual([]);
    });
  });

  describe('normalizeAdvancedGameOutputs', () => {
    it('should normalize valid advanced game outputs', () => {
      const raw = {
        coalitional: {
          framework: 'coalitional',
          status: 'deterministic',
          summary: 'Stable coalition',
          keyResult: 'Core exists',
          confidence: 0.9,
          warnings: [],
          normalized_inputs: { players: 3, coalitions: 2 },
        },
      };
      const result = normalizeAdvancedGameOutputs(raw);
      expect(result?.coalitional).toBeDefined();
      expect(result?.coalitional?.status).toBe('deterministic');
    });

    it('should return undefined for non-object input', () => {
      expect(normalizeAdvancedGameOutputs(null)).toBeUndefined();
      expect(normalizeAdvancedGameOutputs('string')).toBeUndefined();
      expect(normalizeAdvancedGameOutputs(42)).toBeUndefined();
    });
  });
});

describe('CORS header validation', () => {
  it('should not contain wildcard Access-Control-Allow-Origin in auth.ts', () => {
    const authPath = path.join(__dirname, '..', 'supabase', 'functions', '_shared', 'auth.ts');
    const content = fs.readFileSync(authPath, 'utf-8');
    expect(content).not.toContain("'Access-Control-Allow-Origin': '*'");
    expect(content).not.toContain('"Access-Control-Allow-Origin": "*"');
  });
});
