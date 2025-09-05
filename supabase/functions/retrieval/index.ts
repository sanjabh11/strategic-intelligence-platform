// Supabase Edge Function: retrieval
// GET /functions/v1/retrieval/{id}
// Returns cached retrieval metadata for provenance linking

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- Helpers ---
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

function jsonResponse(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET') {
    return jsonResponse(405, { ok: false, message: 'Method Not Allowed' })
  }

  // Extract id from URL
  const url = new URL(req.url)
  const pathParts = url.pathname.split('/')
  const id = pathParts[pathParts.length - 1]

  if (!id || id.length !== 36) { // UUID length
    return jsonResponse(400, { ok: false, message: 'Invalid retrieval ID' })
  }

  // Supabase client
  const supabaseUrl = Deno.env.get('EDGE_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')
  const writeKey = Deno.env.get('EDGE_SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('EDGE_SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !anonKey) {
    return jsonResponse(500, { ok: false, message: 'Database configuration error' })
  }

  const db = createClient(supabaseUrl, writeKey || anonKey)

  try {
    const { data, error } = await db
      .from('retrievals')
      .select('id, query_hash, retrieval_id, title, url, snippet, score, created_at')
      .eq('id', id)
      .single()

    if (error || !data) {
      return jsonResponse(404, { ok: false, message: 'Retrieval not found' })
    }

    return jsonResponse(200, { ok: true, retrieval: data })
  } catch (err) {
    console.error('Retrieval error:', err)
    return jsonResponse(500, { ok: false, message: 'Internal server error' })
  }
})