// @ts-nocheck
// Supabase Edge Function: get-analysis-status
// Deno runtime
// Endpoint: GET /functions/v1/get-analysis-status?request_id=...

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve((req) => {
  if (req.method !== 'GET') {
    return jsonResponse(405, { ok: false, message: 'Method Not Allowed' })
  }

  const url = new URL(req.url)
  const requestId = url.searchParams.get('request_id')
  if (!requestId) {
    return jsonResponse(400, { ok: false, message: 'request_id is required' })
  }

  // MVP note: current analyze-engine returns results synchronously and does not issue request_ids.
  // If a client calls this endpoint, respond with a placeholder processing state.
  console.log(JSON.stringify({
    event: 'get_analysis_status.request', ts: new Date().toISOString(), request_id: requestId,
    headers: { userAgent: req.headers.get('user-agent') || undefined }
  }))
  const resp = {
    ok: true,
    status: 'processing',
    message: 'Analysis running or not found for this request_id (MVP synchronous engine).'
  }
  console.log(JSON.stringify({ event: 'get_analysis_status.success', ts: new Date().toISOString(), request_id: requestId }))
  return jsonResponse(200, resp)
})
