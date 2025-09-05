import { useCallback, useEffect, useState } from 'react'
import { ENDPOINTS, getAuthHeaders } from '../lib/supabase'

export interface SharedStrategy {
  id: string
  run_id?: string
  title: string
  scenario_summary?: string
  strategy: unknown
  created_at: string
}

export function useSharedStrategies() {
  const [items, setItems] = useState<SharedStrategy[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Use REST query via anon key
      const url = new URL(ENDPOINTS.COLLECTIVE_STATS.replace('/functions/v1/collective-stats','/rest/v1/shared_strategies'))
      url.searchParams.set('select', 'id,run_id,title,scenario_summary,strategy,created_at')
      url.searchParams.set('order', 'created_at.desc')
      url.searchParams.set('limit', '50')
      const resp = await fetch(url.toString(), { headers: { ...getAuthHeaders() } })
      if (!resp.ok) throw new Error(await resp.text())
      const data = await resp.json()
      setItems(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  const share = useCallback(async (payload: { run_id?: string; title: string; scenario_summary?: string; strategy: unknown }) => {
    const resp = await fetch(ENDPOINTS.SHARE_STRATEGY, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
      body: JSON.stringify(payload)
    })
    if (!resp.ok) throw new Error(await resp.text())
    await refresh()
  }, [refresh])

  useEffect(() => { refresh() }, [refresh])
  return { items, loading, error, refresh, share }
}





