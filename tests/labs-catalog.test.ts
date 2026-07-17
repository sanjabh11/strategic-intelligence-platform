import { describe, expect, it } from 'vitest'
import { canAccessLabModule, mapSubscriptionToLabTier, SURFACED_LAB_MODULES } from '../src/lib/labsCatalog'

describe('labs catalog gating', () => {
  it('maps subscription tiers to surfaced lab tiers', () => {
    expect(mapSubscriptionToLabTier('free')).toBe('free')
    expect(mapSubscriptionToLabTier('pro')).toBe('pro')
    expect(mapSubscriptionToLabTier('academic')).toBe('elite')
    expect(mapSubscriptionToLabTier('enterprise')).toBe('elite')
  })

  it('allows pro-tier surfaced modules for pro and academic users', () => {
    const module = SURFACED_LAB_MODULES[0]
    expect(canAccessLabModule('pro', module)).toBe(true)
    expect(canAccessLabModule('academic', module)).toBe(true)
    expect(canAccessLabModule('free', module)).toBe(false)
  })
})
