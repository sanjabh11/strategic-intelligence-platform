import { useEffect, useRef, useState } from 'react'
import { ENDPOINTS, getAuthHeaders } from '../lib/supabase'

export interface StreamUpdate {
  type: 'start' | 'progress' | 'complete' | 'error'
  payload: any
}

export function useAnalyzeStream() {
  const [events, setEvents] = useState<StreamUpdate[]>([])
  const [active, setActive] = useState(false)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => () => { controllerRef.current?.abort() }, [])

  const start = async (scenario_text: string, iterations: number = 10) => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setEvents([])
    setActive(true)

    const resp = await fetch(ENDPOINTS.ANALYZE_STREAM, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
      body: JSON.stringify({ scenario_text, iterations }),
      signal: controller.signal,
    })
    if (!resp.ok || !resp.body) {
      setEvents(prev => prev.concat({ type: 'error', payload: { message: 'stream error' } }))
      setActive(false)
      return
    }

    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop() || ''
      for (const part of parts) {
        const lines = part.split('\n')
        const evt = lines.find(l => l.startsWith('event: '))?.slice(7) as StreamUpdate['type'] | undefined
        const dataLine = lines.find(l => l.startsWith('data: '))?.slice(6)
        if (!evt || !dataLine) continue
        try {
          const payload = JSON.parse(dataLine)
          setEvents(prev => prev.concat({ type: evt, payload }))
          if (evt === 'complete') setActive(false)
        } catch {}
      }
    }
  }

  const stop = () => {
    controllerRef.current?.abort()
    setActive(false)
  }

  return { events, active, start, stop }
}

import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
