// Test Perplexity API integration directly

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const PERPLEXITY_KEY = Deno.env.get('PERPLEXITY_API_KEY')
      ?? Deno.env.get('EDGE_PERPLEXITY_API_KEY')
      ?? Deno.env.get('PERPLEXITY_KEY')
      ?? ""

    console.log('Perplexity key exists:', Boolean(PERPLEXITY_KEY))
    console.log('Perplexity key length:', PERPLEXITY_KEY.length)

    if (!PERPLEXITY_KEY) {
      return new Response(
        JSON.stringify({ error: 'No Perplexity API key found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { query = 'gold price' } = await req.json().catch(() => ({}))

    console.log('Making Perplexity API call with query:', query)

    const url = "https://api.perplexity.ai/chat/completions"
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PERPLEXITY_KEY}`
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          { role: 'system', content: 'You are a research assistant. Return concise, authoritative sources with citations.' },
          { role: 'user', content: `${query}\n\nPlease search the live web and provide 5 relevant sources with citations.` }
        ],
        temperature: 0.2,
        top_k: 5,
        search_recency_filter: 'month',
        return_images: false,
        stream: false,
        max_tokens: 600
      }),
      signal: AbortSignal.timeout(8000)
    })

    console.log('Perplexity response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Perplexity API error:', errorText)
      return new Response(
        JSON.stringify({ error: `Perplexity API returned ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const text = await response.text()
    const parsed = JSON.parse(text)

    const citations = parsed.citations || []
    const messageContent = parsed.choices?.[0]?.message?.content || ''

    const result = {
      success: true,
      citations_count: citations.length,
      citations: citations,
      message_preview: messageContent.substring(0, 200),
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
