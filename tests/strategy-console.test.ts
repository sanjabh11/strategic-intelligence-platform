import { describe, it, expect, vi } from 'vitest';
import StrategyConsole from '../src/components/StrategyConsole';
import { generateLicenseKey, validateLicenseKey } from '../src/lib/whop';

// Mock supabase and auth modules
vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: null }) })) })),
      insert: vi.fn().mockResolvedValue({ data: null }),
    })),
  },
  getAuthHeaders: vi.fn(() => ({ 'Content-Type': 'application/json', apikey: 'test-key' })),
  getUserAuthHeaders: vi.fn(async () => ({ 'Content-Type': 'application/json', apikey: 'test-key', Authorization: 'Bearer test-token' })),
  isLocalPreviewOrigin: false,
}));

describe('StrategyConsole component', () => {
  it('should be importable as a React component', () => {
    expect(StrategyConsole).toBeDefined();
    expect(typeof StrategyConsole).toBe('function');
  });

  it('exports a renderable component without an unsafe module cast', () => {
    expect(StrategyConsole).toBeDefined();
    expect(['function', 'object']).toContain(typeof StrategyConsole);
  });
});

describe('Whop license utilities', () => {
  const testSecret = 'test-secret-key-for-vitest';
  const testExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

  it('generateLicenseKey should produce a string key', async () => {
    const key = await generateLicenseKey('user-123', 'pro', testExpiry, testSecret);
    expect(typeof key).toBe('string');
    expect(key.length).toBeGreaterThan(0);
  });

  it('validateLicenseKey should validate a generated key', async () => {
    const key = await generateLicenseKey('user-456', 'elite', testExpiry, testSecret);
    const result = await validateLicenseKey(key, testSecret);
    expect(result.valid).toBe(true);
    expect(result.userId).toBe('user-456');
  });

  it('validateLicenseKey should reject a tampered key', async () => {
    const key = await generateLicenseKey('user-789', 'pro', testExpiry, testSecret);
    const tampered = key.slice(0, -4) + 'XXXX';
    const result = await validateLicenseKey(tampered, testSecret);
    expect(result.valid).toBe(false);
  });

  it('validateLicenseKey should reject wrong secret', async () => {
    const key = await generateLicenseKey('user-A', 'pro', testExpiry, testSecret);
    const result = await validateLicenseKey(key, 'wrong-secret');
    expect(result.valid).toBe(false);
  });
});
