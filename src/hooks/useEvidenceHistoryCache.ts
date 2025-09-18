// Local Evidence Query History Cache Hook
// Stores evidence retrieval queries and small metadata in browser localStorage

import { useState, useEffect, useCallback } from 'react'

export interface EvidenceQueryEntry {
  id: string
  query: string
  timestamp: string
  sourcesFound: number
  providersTried: string[] // e.g., ['perplexity','google','firecrawl']
  hash: string
}

const CACHE_KEY = 'evidence-queries-history'
const MAX_ENTRIES = 10
const EXPIRY_DAYS = 14

export function useEvidenceHistoryCache() {
  const [history, setHistory] = useState<EvidenceQueryEntry[]>([])
  const [loading, setLoading] = useState(true)

  const hashString = (s: string) => {
    let h = 0
    for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i)
    return (h & h).toString()
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as EvidenceQueryEntry[]
        const now = Date.now()
        const valid = parsed.filter(e => now - new Date(e.timestamp).getTime() < EXPIRY_DAYS * 86400000)
        setHistory(valid)
      }
    } catch (e) {
      console.warn('Evidence cache load failed:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const save = useCallback((items: EvidenceQueryEntry[]) => {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(items)) } catch {}
  }, [])

  const add = useCallback((entry: { query: string; sourcesFound: number; providersTried: string[] }) => {
    const now = new Date().toISOString()
    const hash = hashString(entry.query)
    setHistory(prev => {
      const idx = prev.findIndex(e => e.hash === hash)
      const newEntry: EvidenceQueryEntry = {
        id: idx >= 0 ? prev[idx].id : crypto.randomUUID(),
        query: entry.query,
        timestamp: now,
        sourcesFound: entry.sourcesFound,
        providersTried: Array.from(new Set(entry.providersTried || [])),
        hash
      }
      const updated = idx >= 0 ? [newEntry, ...prev.slice(0, idx), ...prev.slice(idx + 1)] : [newEntry, ...prev]
      const trimmed = updated.slice(0, MAX_ENTRIES)
      save(trimmed)
      return trimmed
    })
  }, [save])

  const clear = useCallback(() => {
    setHistory([])
    try { localStorage.removeItem(CACHE_KEY) } catch {}
  }, [])

  return { history, loading, add, clear, MAX_ENTRIES, EXPIRY_DAYS }
}

export default useEvidenceHistoryCache
