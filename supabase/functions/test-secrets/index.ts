// Test function to check if secrets are accessible

Deno.serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const perplexityKey = Deno.env.get('PERPLEXITY_API_KEY')
    const edgePerplexityKey = Deno.env.get('EDGE_PERPLEXITY_API_KEY')
    const perplexityKeyLegacy = Deno.env.get('PERPLEXITY_KEY')
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY')
    const geminiKey = Deno.env.get('GEMINI_API_KEY')

    const result = {
      perplexity_api_key_exists: Boolean(perplexityKey),
      perplexity_api_key_length: perplexityKey?.length || 0,
      perplexity_api_key_prefix: perplexityKey?.substring(0, 8) || 'none',
      edge_perplexity_api_key_exists: Boolean(edgePerplexityKey),
      perplexity_key_legacy_exists: Boolean(perplexityKeyLegacy),
      firecrawl_api_key_exists: Boolean(firecrawlKey),
      gemini_api_key_exists: Boolean(geminiKey),
      timestamp: new Date().toISOString()
    }

    return new Response(
      JSON.stringify(result, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
