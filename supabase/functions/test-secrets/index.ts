// Test function to check if secrets are accessible

function extractBearerToken(value: string | null) {
  if (!value) return null
  const match = value.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('EDGE_SUPABASE_SERVICE_ROLE_KEY')
    const bearer = extractBearerToken(req.headers.get('authorization'))
    const apiKey = req.headers.get('apikey')?.trim() || null
    if (!serviceRoleKey || (bearer !== serviceRoleKey && apiKey !== serviceRoleKey)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const exaKey = Deno.env.get('EXA_API_KEY')
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY')
    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    const openaiKey = Deno.env.get('OPENAI_KEY') || Deno.env.get('OPENAI_API_KEY')
    const xaiKey = Deno.env.get('XAI_API_KEY') || Deno.env.get('GROK_API_KEY')
    const geminiAnalyzeModel = Deno.env.get('GEMINI_ANALYZE_MODEL') || Deno.env.get('GEMINI_STRATEGIST_MODEL')
    const geminiFallbackAnalyzeModel = Deno.env.get('GEMINI_FALLBACK_ANALYZE_MODEL')
      || Deno.env.get('GEMINI_FALLBACK_STRATEGIST_MODEL')
      || 'gemini-2.5-flash'
    const openaiAnalyzeModel = Deno.env.get('OPENAI_ANALYZE_MODEL') || Deno.env.get('OPENAI_STRATEGIST_MODEL') || 'gpt-4o-mini'
    const xaiAnalyzeModel = Deno.env.get('XAI_ANALYZE_MODEL') || Deno.env.get('XAI_STRATEGIST_MODEL') || 'grok-4.20-reasoning'
    const geminiStrategistModel = Deno.env.get('GEMINI_STRATEGIST_MODEL')
    const geminiFallbackModel = Deno.env.get('GEMINI_FALLBACK_STRATEGIST_MODEL') || 'gemini-2.5-flash'
    const geminiRetrievalModel = Deno.env.get('GEMINI_RETRIEVAL_MODEL')

    const result = {
      exa_api_key_exists: Boolean(exaKey),
      firecrawl_api_key_exists: Boolean(firecrawlKey),
      gemini_api_key_exists: Boolean(geminiKey),
      openai_api_key_exists: Boolean(openaiKey),
      xai_api_key_exists: Boolean(xaiKey),
      gemini_analyze_model: geminiAnalyzeModel || null,
      gemini_fallback_analyze_model: geminiFallbackAnalyzeModel,
      openai_analyze_model: openaiAnalyzeModel,
      xai_analyze_model: xaiAnalyzeModel,
      gemini_strategist_model: geminiStrategistModel || null,
      gemini_fallback_strategist_model: geminiFallbackModel,
      gemini_retrieval_model: geminiRetrievalModel || null,
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
