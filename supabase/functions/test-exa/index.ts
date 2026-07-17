// Test Exa API integration directly

// PUBLIC: No auth required
Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('APP_URL') || 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const exaKey = Deno.env.get('EXA_API_KEY') ?? ''

    if (!exaKey) {
      return new Response(
        JSON.stringify({ error: 'No Exa API key found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { query = 'gold price' } = await req.json().catch(() => ({}))
    const response = await fetch('https://api.exa.ai/search', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": exaKey
      },
      body: JSON.stringify({
        query,
        type: 'auto',
        numResults: 5,
        contents: {
          highlights: true
        }
      }),
      signal: AbortSignal.timeout(8000)
    })

    if (!response.ok) {
      const errorText = await response.text()
      return new Response(
        JSON.stringify({ error: `Exa API returned ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const text = await response.text()
    const parsed = JSON.parse(text)
    const results = Array.isArray(parsed.results) ? parsed.results : []
    const topResult = results[0] || null

    const result = {
      success: true,
      provider: 'exa',
      results_count: results.length,
      top_titles: results.slice(0, 3).map((item: Record<string, unknown>) => item.title).filter(Boolean),
      first_highlight_preview: Array.isArray(topResult?.highlights) ? String(topResult.highlights[0] || '').slice(0, 200) : '',
      timestamp: new Date().toISOString()
    }

    return new Response(
      JSON.stringify(result, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
