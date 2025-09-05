import { useCallback, useState } from 'react'
import { ENDPOINTS, getAuthHeaders } from '../lib/supabase'

export interface SimilarItem { id: string; score: number }

export function useSymmetryMining() {
  const [items, setItems] = useState<SimilarItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const query = useCallback(async (features?: number[], top_k: number = 5) => {
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch(ENDPOINTS.SYMMETRY_MINING, {
        method: 'POST',
        headers: { ...getAuthHeaders() },
        body: JSON.stringify({ features, top_k })
      })
      const txt = await resp.text()
      const json = (() => { try { return JSON.parse(txt) } catch { return null } })()
      if (!resp.ok) throw new Error(json?.message || txt || resp.statusText)
      setItems(json?.items || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  return { items, loading, error, query }
}





