import { createEventFeedProvider } from './live-data-providers.ts'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    Deno.env.delete(key)
  } else {
    Deno.env.set(key, value)
  }
}

Deno.test('GDELT provider maps official DOC payloads into strategic event seeds', async () => {
  const fixturePath = new URL('./test-fixtures/gdelt-doc-artlist.json', import.meta.url)
  const fixture = await Deno.readTextFile(fixturePath)
  const originalFetch = globalThis.fetch
  const originalQuery = Deno.env.get('GDELT_QUERY')
  const originalSimulation = Deno.env.get('GDELT_ALLOW_SIMULATION')
  const originalUrl = Deno.env.get('GDELT_DOC_API_URL')

  Deno.env.set('GDELT_QUERY', 'trade OR sanctions')
  Deno.env.set('GDELT_ALLOW_SIMULATION', 'false')
  Deno.env.set('GDELT_DOC_API_URL', 'https://api.gdeltproject.org/api/v2/doc/doc')

  globalThis.fetch = async () =>
    new Response(fixture, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  try {
    const provider = createEventFeedProvider()
    const result = await provider.fetchEvents()

    assert(result.diagnostics.mode === 'live', 'expected live diagnostics mode')
    assert(result.events.length === 2, 'expected fixture articles to map to two events')
    assert(result.events[0].actor1 === 'USA', 'expected actor1 to use sourcecountry')
    assert(result.events[0].actor2 === 'China', 'expected actor2 to use sourcecommonname')
    assert(result.events[0].eventCode === '046', 'expected talks event to map to bargaining code')
    assert(result.events[1].eventCode === '172', 'expected sanctions event to map to sanctions code')
  } finally {
    globalThis.fetch = originalFetch
    restoreEnv('GDELT_QUERY', originalQuery)
    restoreEnv('GDELT_ALLOW_SIMULATION', originalSimulation)
    restoreEnv('GDELT_DOC_API_URL', originalUrl)
  }
})

Deno.test('GDELT provider degrades cleanly when live fetch fails and simulation is disabled', async () => {
  const originalFetch = globalThis.fetch
  const originalSimulation = Deno.env.get('GDELT_ALLOW_SIMULATION')

  Deno.env.set('GDELT_ALLOW_SIMULATION', 'false')
  globalThis.fetch = async () => {
    throw new Error('network unavailable')
  }

  try {
    const provider = createEventFeedProvider()
    const result = await provider.fetchEvents()

    assert(result.diagnostics.mode === 'degraded', 'expected degraded diagnostics mode')
    assert(result.events.length === 0, 'expected no simulated events when simulation is disabled')
    assert(
      result.diagnostics.warnings.some((warning) => warning.includes('Live GDELT fetch failed')),
      'expected live fetch failure warning'
    )
  } finally {
    globalThis.fetch = originalFetch
    restoreEnv('GDELT_ALLOW_SIMULATION', originalSimulation)
  }
})
