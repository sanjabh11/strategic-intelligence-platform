// @ts-nocheck
// Supabase Edge Function: analyze-stream
// Deno runtime
// Endpoint: POST /functions/v1/analyze-stream (Server-Sent Events)

function sseHeaders() {
  return new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  })
}

function sendEvent(controller: ReadableStreamDefaultController, event: string, data: unknown) {
  controller.enqueue(new TextEncoder().encode(`event: ${event}\n`))
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`))
}

function mulberry32(seed: number) {
  let t = seed >>> 0
  return function () {
    t += 0x6D2B79F5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: sseHeaders() })
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: sseHeaders() })

  const { scenario_text, iterations = 10, deterministicSeed = 4242 } = await req.json().catch(() => ({}))
  const rnd = mulberry32(deterministicSeed)

  const stream = new ReadableStream({
    start(controller) {
      sendEvent(controller, 'start', { ok: true, message: 'analysis started', scenario_text })
      let stability = 0.5 + rnd() * 0.1
      let t = 0
      const timer = setInterval(() => {
        t++
        stability = Math.min(0.99, Math.max(0.01, stability + (rnd() - 0.45) * 0.05))
        const profile = {
          P1: { Cooperate: Number((0.5 + (rnd() - 0.5) * 0.1).toFixed(3)), Defect: Number((0.5 + (rnd() - 0.5) * 0.1).toFixed(3)) },
          P2: { Cooperate: Number((0.5 + (rnd() - 0.5) * 0.1).toFixed(3)), Defect: Number((0.5 + (rnd() - 0.5) * 0.1).toFixed(3)) }
        }
        sendEvent(controller, 'progress', { step: t, stability: Number(stability.toFixed(3)), profile })
        if (t >= iterations) {
          sendEvent(controller, 'complete', { ok: true, stability: Number(stability.toFixed(3)) })
          clearInterval(timer)
          controller.close()
        }
      }, 600)
    },
    cancel() {},
  })

  return new Response(stream, { headers: sseHeaders() })
})


