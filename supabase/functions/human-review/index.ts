// @ts-nocheck
// Supabase Edge Function: human-review
// Deno runtime
// Endpoints:
// - GET /functions/v1/review_queue - Fetch pending reviews
// - POST /functions/v1/analysis/{id}/review - Approve/reject analysis

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- Environment helpers ---
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase environment variables")
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Build a request-scoped auth client from the incoming Authorization header
function buildAuthClient(req: Request) {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  })
  return { client, token }
}

// --- Utility helpers ---
function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// --- Authentication ---
async function getReviewerUser(req: Request): Promise<{ id: string; role: string } | null> {
  try {
    const { client, token } = buildAuthClient(req)
    if (!token) return null

    const { data: userRes, error: userErr } = await client.auth.getUser()
    if (userErr || !userRes?.user) return null

    const authId = userRes.user.id
    // Lookup role in users table (created by migration 20250904_0010...)
    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('id, role, auth_id')
      .eq('auth_id', authId)
      .maybeSingle()

    const role = (userRow?.role || 'user') as string
    return { id: authId, role }
  } catch {
    return null
  }
}

// --- Database operations ---
async function getPendingReviews() {
  const { data, error } = await supabaseAdmin
    .from('analysis_runs')
    .select(`
      id,
      scenario_text,
      created_at,
      status,
      audience,
      analysis_json
    `)
    .eq('status', 'under_review')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }

  return data || []
}

// Enhanced detection for high-stakes geopolitical analyses that need review
function detectHighStakesAnalysis(scenarioText: string, evidenceBacked: boolean, predictedImpact?: number): boolean {
  // Check for geopolitical keywords
  const geopoliticalKeywords = [
    'war', 'conflict', 'invasion', 'sanctions', 'treaty', 'alliance', 'nuclear', 'military', 'terrorism',
    'cyberattack', 'espionage', 'diplomacy', 'geopolitical', 'international', 'border', 'sovereignty',
    'china', 'russia', 'iran', 'north korea', 'middle east', 'ukraine', 'taiwan'
  ]

  const hasGeopoliticalContent = geopoliticalKeywords.some(keyword =>
    scenarioText?.toLowerCase().includes(keyword)
  )

  // Check for high predicted impact (if available)
  const highImpact = predictedImpact !== undefined && predictedImpact > 0.7

  // Flag if geopolitical AND either high impact OR not evidence-backed
  return hasGeopoliticalContent && (!evidenceBacked || highImpact)
}

async function flagAnalysisForReview(analysisId: string, reason: string) {
  const { error } = await supabaseAdmin
    .from('analysis_runs')
    .update({
      status: 'under_review',
      review_reason: reason
    })
    .eq('id', analysisId)

  if (error) {
    console.error('Failed to flag analysis for review:', error)
    return false
  }

  return true
}

async function getAnalysisRun(analysisId: string) {
  const { data, error } = await supabaseAdmin
    .from('analysis_runs')
    .select('*')
    .eq('id', analysisId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Analysis not found')
    }
    throw new Error(`Database error: ${error.message}`)
  }

  return data
}

async function updateAnalysisStatus(analysisId: string, status: 'approved' | 'rejected') {
  const { error } = await supabaseAdmin
    .from('analysis_runs')
    .update({ status })
    .eq('id', analysisId)

  if (error) {
    throw new Error(`Failed to update analysis status: ${error.message}`)
  }

  return true
}

async function createHumanReview(analysisId: string, reviewerId: string, status: 'approved' | 'rejected', notes?: string) {
  const { data, error } = await supabaseAdmin
    .from('human_reviews')
    .insert({
      analysis_run_id: analysisId,
      reviewer_id: reviewerId,
      status,
      notes: notes || null,
      reviewed_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create review: ${error.message}`)
  }

  return data
}

// --- Route handlers ---
async function handleReviewQueue() {
  try {
    const reviews = await getPendingReviews()

    // Enrich with reviewer guidance
    const enrichedReviews = await Promise.all(reviews.map(async review => {
      const analysis = review.analysis_json
      const isHighStakes = detectHighStakesAnalysis(
        review.scenario_text || '',
        analysis?.provenance?.evidence_backed || false,
        // Try to determine impact from decision table or similar
        analysis?.decision_table?.[0]?.payoff_estimate?.value || undefined
      )

      return {
        id: review.id,
        scenario_text: review.scenario_text?.slice(0, 200) + (review.scenario_text?.length > 200 ? '...' : ''),
        created_at: review.created_at,
        audience: review.audience,
        summary: analysis?.summary?.text || null,
        decision_table: analysis?.decision_table || null,
        expected_value_ranking: analysis?.expected_value_ranking || null,
        review_reason: review.review_reason || 'High-stakes geopolitical analysis requiring human validation',
        reviewer_guidance: isHighStakes ?
          '🚨 HIGH PRIORITY: This analysis involves geopolitical factors. Verify claims, sources, and strategic implications before approval.' :
          'Standard review: Check for logical consistency and appropriate sources.',
        evidence_backed: analysis?.provenance?.evidence_backed || false,
        retrieval_count: analysis?.provenance?.retrieval_count || 0,
        analysis_json: analysis // Include full analysis for additional data
      }
    }))

    return jsonResponse(200, {
      ok: true,
      reviews: enrichedReviews,
      total_pending: enrichedReviews.length,
      reviewer_prompt: `
REVIEWER GUIDELINES:
📋 Check for logical consistency in strategic analysis
🔍 Verify sources and provenance are appropriate
⚖️ Assess if conclusions are evidence-based
🚨 Flag any geopolitical/national security implications
❌ Reject if sources are insufficient or biased

High-stakes analyses will be clearly marked with 🚨
      `.trim()
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Review queue error:', msg)
    return jsonResponse(500, { ok: false, message: msg })
  }
}

async function handleReview(analysisId: string, req: Request) {
  const reviewer = await getReviewerUser(req)

  if (!reviewer) {
    return jsonResponse(401, { ok: false, message: 'Unauthorized' })
  }

  // Check if reviewer has reviewer role
  if (reviewer.role !== 'reviewer') {
    return jsonResponse(403, { ok: false, message: 'Forbidden - reviewer role required' })
  }

  try {
    // Parse request body
    const body = await req.json()
    const { action, notes } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return jsonResponse(400, { ok: false, message: 'Invalid action. Must be "approve" or "reject"' })
    }

    const reviewStatus = action === 'approve' ? 'approved' : 'rejected'

    // Get analysis run
    const analysis = await getAnalysisRun(analysisId)

    if (analysis.status !== 'under_review') {
      return jsonResponse(400, { ok: false, message: 'Analysis is not pending review' })
    }

    // Update analysis status
    await updateAnalysisStatus(analysisId, reviewStatus)

    // Create review record
    const review = await createHumanReview(analysisId, reviewer.id, reviewStatus, notes)

    return jsonResponse(200, {
      ok: true,
      analysis_id: analysisId,
      action,
      review_id: review.id,
      reviewed_at: review.reviewed_at
    })

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Review error:', msg)
    return jsonResponse(500, { ok: false, message: msg })
  }
}

// --- Main handler ---
Deno.serve(async (req) => {
  try {
    const url = new URL(req.url)
    const pathname = url.pathname
    const method = req.method

    // Normalize checks to support function mounted at /functions/v1/human-review
    const isReviewQueue = pathname.endsWith('/review_queue') || pathname.endsWith('/human-review/review_queue')
    const analysisReviewMatch = pathname.match(/\/functions\/v1\/(?:human-review\/)?analysis\/([^/]+)\/review$/)

    // GET .../review_queue
    if (method === 'GET' && isReviewQueue) {
      return await handleReviewQueue()
    }

    // POST .../analysis/{id}/review
    if (method === 'POST' && analysisReviewMatch) {
      const analysisId = analysisReviewMatch[1]
      return await handleReview(analysisId, req)
    }

    return jsonResponse(404, { ok: false, message: 'Endpoint not found' })

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Unhandled error:', msg)
    return jsonResponse(500, { ok: false, message: msg })
  }
})