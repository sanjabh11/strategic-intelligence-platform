import { describe, expect, it, beforeEach, vi } from 'vitest'
import { getCachedQuestionContext, persistQuestionContext, isCacheValidForPrompt } from '../src/lib/questionContextCache'

const mockStore: Record<string, string> = {}

beforeEach(() => {
  Object.keys(mockStore).forEach(k => delete mockStore[k])
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => mockStore[key] ?? null,
    setItem: (key: string, value: string) => { mockStore[key] = value },
    removeItem: (key: string) => { delete mockStore[key] },
  })
})

describe('questionContextCache', () => {
  it('rejects stale answers for a different prompt', () => {
    persistQuestionContext('What is the best strategy for negotiation?', undefined, { q1: 'answer1' }, 'negotiation')
    const cached = getCachedQuestionContext('What is the best strategy for climate policy?')
    expect(cached).toBeNull()
  })

  it('accepts cached answers for the same prompt', () => {
    persistQuestionContext('What is the best strategy for negotiation?', undefined, { q1: 'answer1' }, 'negotiation')
    const cached = getCachedQuestionContext('What is the best strategy for negotiation?')
    expect(cached).not.toBeNull()
    expect(cached?.answers?.q1).toBe('answer1')
  })

  it('stores prompt, promptHash, and intent', () => {
    persistQuestionContext('Analyze the trade war impact', undefined, { q1: 'a1' }, 'geopolitical_analysis')
    const cached = getCachedQuestionContext('Analyze the trade war impact')
    expect(cached).not.toBeNull()
    expect(cached?.prompt).toBe('Analyze the trade war impact')
    expect(cached?.promptHash).toBeDefined()
    expect(cached?.intent).toBe('geopolitical_analysis')
  })

  it('rejects expired entries', () => {
    persistQuestionContext('Old question', undefined, { q1: 'old' })
    // Manually backdate the timestamp
    const raw = mockStore['sip_question_context']
    const parsed = JSON.parse(raw)
    parsed.timestamp = Date.now() - (1000 * 60 * 60 * 2) // 2 hours ago
    mockStore['sip_question_context'] = JSON.stringify(parsed)
    const cached = getCachedQuestionContext('Old question')
    expect(cached).toBeNull()
  })

  it('isCacheValidForPrompt returns true for matching prompt, false for different', () => {
    persistQuestionContext('Test prompt here', undefined, { q1: 'a1' })
    expect(isCacheValidForPrompt('Test prompt here')).toBe(true)
    expect(isCacheValidForPrompt('Different prompt here')).toBe(false)
  })

  it('normalizes prompt before hashing (whitespace and case insensitive)', () => {
    persistQuestionContext('  What   is   THE   best   strategy?  ', undefined, { q1: 'a1' })
    const cached = getCachedQuestionContext('what is the best strategy?')
    expect(cached).not.toBeNull()
  })

  it('rejects legacy cache records without promptHash (pre-migration data)', () => {
    // Simulate a legacy cache entry that was written before promptHash was added
    mockStore['sip_question_context'] = JSON.stringify({
      prompt: undefined,
      promptHash: undefined,
      intent: undefined,
      answers: { q1: 'legacy_answer' },
      timestamp: Date.now(),
    })
    const cached = getCachedQuestionContext('Any prompt at all')
    expect(cached).toBeNull()
  })
})
