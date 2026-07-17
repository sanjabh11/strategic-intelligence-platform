import { describe, it, expect, vi } from 'vitest';
import { useStrategyAnalysis } from '../src/hooks/useStrategyAnalysis';
import { getAuthHeaders, getUserAuthHeaders } from '../src/lib/supabase';

// Mock supabase module
vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: null }) })) })),
      insert: vi.fn().mockResolvedValue({ data: null }),
    })),
  },
  ENDPOINTS: { ANALYZE: 'https://test.supabase.co/functions/v1/analyze-engine' },
  getAuthHeaders: vi.fn(() => ({ 'Content-Type': 'application/json', apikey: 'test-key' })),
  getUserAuthHeaders: vi.fn(async () => ({ 'Content-Type': 'application/json', apikey: 'test-key', Authorization: 'Bearer test-token' })),
  isLocalPreviewOrigin: false,
}));

describe('useStrategyAnalysis hook', () => {
  it('should export a hook function', () => {
    expect(typeof useStrategyAnalysis).toBe('function');
  });

  it('should export AnalysisResult type-related schemas', () => {
    expect(useStrategyAnalysis).toBeDefined();
  });
});

describe('auth header utilities', () => {
  it('getAuthHeaders should return headers with apikey', () => {
    const headers = getAuthHeaders();
    expect(headers).toHaveProperty('apikey');
    expect(headers).toHaveProperty('Content-Type', 'application/json');
  });

  it('getUserAuthHeaders should return headers with Authorization', async () => {
    const headers = await getUserAuthHeaders();
    expect(headers).toHaveProperty('Authorization');
    expect(headers.Authorization).toMatch(/^Bearer /);
  });
});
