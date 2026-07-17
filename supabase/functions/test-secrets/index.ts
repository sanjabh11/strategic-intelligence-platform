// Test function to check if secrets are accessible

function extractBearerToken(value: string | null) {
  if (!value) return null
  const match = value.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

function resolveProviderOrder({
  geminiKey,
  openrouterKey,
  openrouterModel,
  openaiKey,
  xaiKey,
}: {
  geminiKey: string | undefined
  openrouterKey: string | undefined
  openrouterModel: string | null | undefined
  openaiKey: string | undefined
  xaiKey: string | undefined
}) {
  const order: string[] = []
  const normalizedOpenRouterModel = openrouterModel?.trim() || ''
  const openrouterIsPrimary = Boolean(openrouterKey) && normalizedOpenRouterModel.length > 0 && normalizedOpenRouterModel !== 'openrouter/free'
  if (openrouterIsPrimary) order.push('openrouter')
  if (geminiKey) order.push('gemini')
  if (openrouterKey && !openrouterIsPrimary) order.push('openrouter')
  if (openaiKey) order.push('openai')
  if (xaiKey) order.push('xai')
  return order
}

// PUBLIC: No auth required
Deno.serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('APP_URL') || 'null',
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
    const openrouterKey = Deno.env.get('OPENROUTER_API_KEY')
    const openaiKey = Deno.env.get('OPENAI_KEY') || Deno.env.get('OPENAI_API_KEY')
    const xaiKey = Deno.env.get('XAI_API_KEY') || Deno.env.get('GROK_API_KEY')
    const geminiAnalyzeModel = Deno.env.get('GEMINI_ANALYZE_MODEL') || Deno.env.get('GEMINI_STRATEGIST_MODEL')
    const geminiFallbackAnalyzeModel = Deno.env.get('GEMINI_FALLBACK_ANALYZE_MODEL')
      || Deno.env.get('GEMINI_FALLBACK_STRATEGIST_MODEL')
      || 'gemini-2.5-flash'
    const openrouterModel = Deno.env.get('OPENROUTER_MODEL')?.trim() || null
    const openrouterBaseUrl = Deno.env.get('OPENROUTER_BASE_URL') || 'https://openrouter.ai/api/v1'
    const openrouterHttpReferer = Deno.env.get('OPENROUTER_HTTP_REFERER') || Deno.env.get('APP_URL') || null
    const openaiAnalyzeModel = Deno.env.get('OPENAI_ANALYZE_MODEL') || Deno.env.get('OPENAI_STRATEGIST_MODEL') || 'gpt-4o-mini'
    const xaiAnalyzeModel = Deno.env.get('XAI_ANALYZE_MODEL') || Deno.env.get('XAI_STRATEGIST_MODEL') || 'grok-4.20-reasoning'
    const geminiStrategistModel = Deno.env.get('GEMINI_STRATEGIST_MODEL')
    const geminiFallbackModel = Deno.env.get('GEMINI_FALLBACK_STRATEGIST_MODEL') || 'gemini-2.5-flash'
    const geminiRetrievalModel = Deno.env.get('GEMINI_RETRIEVAL_MODEL')
    const providerOrder = resolveProviderOrder({
      geminiKey,
      openrouterKey,
      openrouterModel,
      openaiKey,
      xaiKey,
    })
    const geminiSameProviderRetryConfigured = Boolean(geminiKey)
      && Boolean(geminiFallbackModel)
      && Boolean(geminiStrategistModel)
      && geminiFallbackModel !== geminiStrategistModel
    const crossProviderFallbackConfigured = providerOrder.includes('openrouter')
      && providerOrder.length >= 2

    const result = {
      exa_api_key_exists: Boolean(exaKey),
      firecrawl_api_key_exists: Boolean(firecrawlKey),
      gemini_api_key_exists: Boolean(geminiKey),
      openrouter_api_key_exists: Boolean(openrouterKey),
      openai_api_key_exists: Boolean(openaiKey),
      xai_api_key_exists: Boolean(xaiKey),
      gemini_analyze_model: geminiAnalyzeModel || null,
      gemini_fallback_analyze_model: geminiFallbackAnalyzeModel,
      openrouter_model: openrouterModel,
      openrouter_base_url: openrouterBaseUrl,
      openrouter_http_referer_set: Boolean(openrouterHttpReferer),
      openai_analyze_model: openaiAnalyzeModel,
      xai_analyze_model: xaiAnalyzeModel,
      gemini_strategist_model: geminiStrategistModel || null,
      gemini_fallback_strategist_model: geminiFallbackModel,
      provider_order: providerOrder,
      cross_provider_fallback_configured: crossProviderFallbackConfigured,
      gemini_same_provider_retry_configured: geminiSameProviderRetryConfigured,
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
