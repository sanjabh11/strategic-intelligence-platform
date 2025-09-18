// Local Firecrawl History Cache Hook
// Stores Firecrawl research operations in browser localStorage

import { useState, useEffect, useCallback } from 'react'

export interface FirecrawlHistoryEntry {
  id: string
  mode: 'scrape' | 'crawl' | 'search'
  query?: string
  urls?: string[]
  pagesScraped: number
  providers: string[] // ['firecrawl']
  processingTimeMs: number
  timestamp: string
  hash: string
}

const CACHE_KEY = 'firecrawl-history'
const MAX_ENTRIES = 20
const EXPIRY_DAYS = 30

export function useFirecrawlHistoryCache() {
  const [history, setHistory] = useState<FirecrawlHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  const hashKey = (mode: string, query?: string, urls?: string[]) => {
    const base = `${mode}:${query || ''}:${(urls || []).join(',')}`
    let h = 0
    for (let i = 0; i < base.length; i++) h = (h << 5) - h + base.charCodeAt(i)
    return (h & h).toString()
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as FirecrawlHistoryEntry[]
        const now = Date.now()
        const valid = parsed.filter(e => now - new Date(e.timestamp).getTime() < EXPIRY_DAYS * 86400000)
        setHistory(valid)
      }
    } catch (e) {
      console.warn('Firecrawl history load failed:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const save = useCallback((items: FirecrawlHistoryEntry[]) => {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(items)) } catch {}
  }, [])

  const add = useCallback((entry: { mode: 'scrape' | 'crawl' | 'search'; query?: string; urls?: string[]; pagesScraped: number; processingTimeMs: number }) => {
    const now = new Date().toISOString()
    const hash = hashKey(entry.mode, entry.query, entry.urls)
    setHistory(prev => {
      const idx = prev.findIndex(e => e.hash === hash)
      const newEntry: FirecrawlHistoryEntry = {
        id: idx >= 0 ? prev[idx].id : crypto.randomUUID(),
        mode: entry.mode,
        query: entry.query,
        urls: entry.urls,
        pagesScraped: entry.pagesScraped,
        providers: ['firecrawl'],
        processingTimeMs: entry.processingTimeMs,
        timestamp: now,
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

export default useFirecrawlHistoryCache
