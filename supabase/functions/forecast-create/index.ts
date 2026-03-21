// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const ALLOWED_CATEGORIES = new Set(['geopolitical', 'financial', 'technology', 'economic', 'social', 'other'])

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info'
    }
  })
}

function buildAuthClient(req: Request) {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  return {
    token,
    client: createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })
  }
}

async function getAuthenticatedUser(req: Request) {
  const { client, token } = buildAuthClient(req)
  if (!token) return null
  const { data, error } = await client.auth.getUser()
  if (error || !data?.user) return null
  return data.user
}

function normalizeTags(tags: unknown) {
  if (Array.isArray(tags)) {
    return tags.map(tag => String(tag).trim()).filter(Boolean)
  }
  if (typeof tags === 'string') {
    return tags.split(',').map(tag => tag.trim()).filter(Boolean)
  }
  return []
}

function assessForecastReadiness(draft: any) {
  const issues: string[] = []
  const warnings: string[] = []
  let score = 0
  const question = String(draft.question || '').trim()
  const resolutionCriteria = String(draft.resolution_criteria || '').trim()
  const title = String(draft.title || '').trim()
  const hasResolutionDate = Boolean(draft.resolution_date)
  const hasTimeSignal = /\b(by|before|after|during|on|q[1-4]|20\d{2})\b/i.test(question) || hasResolutionDate
  const hasPrimarySource = /primary source:/i.test(resolutionCriteria)
  const hasFallback = /fallback:/i.test(resolutionCriteria)

  if (!question) issues.push('Forecast question is required.')
  else {
    score += 1
    if (!question.endsWith('?')) warnings.push('Question should be phrased as a resolvable yes/no or directional question.')
  }
  if (!title) issues.push('Forecast title is required.')
  if (resolutionCriteria.length < 40) issues.push('Resolution criteria should be explicit enough to resolve without interpretation.')
  else score += 1
  if (!hasTimeSignal) issues.push('Add a resolution date or explicit time boundary so the forecast is scoreable.')
  else score += 1
  if (!hasPrimarySource) warnings.push('Add a primary resolution source to strengthen trust and future scoring discipline.')
  else score += 1
  if (!hasFallback) warnings.push('Add a fallback resolution source in case the primary source is unavailable.')
  else score += 1
  if (!String(draft.tags || '').trim() && normalizeTags(draft.tags).length === 0) warnings.push('Tags improve discovery and later leaderboard segmentation.')
  if (!draft.analysis_run_id) warnings.push('This draft is not linked to an analysis run, so provenance will be weaker.')

  return { issues, warnings, score, status: issues.length > 0 ? 'needs_work' : score >= 5 ? 'strong' : 'review' }
}

function getAnalysisFreshness(createdAt: string | null) {
  if (!createdAt) return null
  const createdAtMs = new Date(createdAt).getTime()
  if (Number.isNaN(createdAtMs)) return null
  const ageInDays = (Date.now() - createdAtMs) / 86400000
  if (ageInDays <= 1) return { label: 'Fresh analysis', ageInDays, description: 'Linked analysis was generated within the last 24 hours.' }
  if (ageInDays <= 7) return { label: 'Recent analysis', ageInDays, description: 'Linked analysis was generated within the last week.' }
  if (ageInDays <= 30) return { label: 'Aging analysis', ageInDays, description: 'Linked analysis is more than a week old, so verify whether the evidence window is still current.' }
  return { label: 'Potentially stale analysis', ageInDays, description: 'Linked analysis is more than 30 days old and may no longer reflect the latest information environment.' }
}

function assessPublishGovernance(draft: any, readiness: any, reviewState: any) {
  const blockers = [...readiness.issues]
  const reviewRequired: string[] = []
  const warnings = [...readiness.warnings]
  const multiAgentForecast = draft.game_theory_model?.multi_agent_forecast
  const contradictionCount = Array.isArray(multiAgentForecast?.contradictionPoints) ? multiAgentForecast.contradictionPoints.length : 0
  const disagreementIndex = typeof multiAgentForecast?.disagreementIndex === 'number' ? multiAgentForecast.disagreementIndex : 0
  const evidenceCount = typeof multiAgentForecast?.evidenceCount === 'number' ? multiAgentForecast.evidenceCount : null
  const freshness = getAnalysisFreshness(reviewState.createdAt)

  if (draft.analysis_run_id) {
    if (reviewState.loading) blockers.push('Checking linked analysis review state before publication.')
    else if (reviewState.status === 'rejected') blockers.push('Linked analysis was rejected during human review.')
    else if (reviewState.status === 'under_review' || reviewState.status === 'needs_review') reviewRequired.push('Linked analysis must complete human review before this public forecast is created.')
    else {
      if (reviewState.status !== 'approved' && reviewState.evidenceBacked === false) reviewRequired.push('Linked analysis is not evidence-backed. Human review should complete before public publication.')
      if (reviewState.status !== 'approved' && (disagreementIndex >= 0.2 || contradictionCount > 0)) reviewRequired.push('Linked analysis remains contested, so reviewer confirmation is required before publish.')
      if (reviewState.status === null && reviewState.evidenceBacked === null) warnings.push('Linked analysis governance metadata could not be fully verified. Review provenance before publishing.')
      else if (reviewState.status === null && reviewState.evidenceBacked === true) warnings.push('No human review is recorded for this linked analysis yet.')
      if (reviewState.status === 'approved' && (disagreementIndex >= 0.2 || contradictionCount > 0)) warnings.push('This linked analysis was approved despite meaningful disagreement, so keep challenger reasoning visible.')
    }
    if (evidenceCount !== null && evidenceCount < 3) warnings.push(`Linked analysis references only ${evidenceCount} evidence item${evidenceCount === 1 ? '' : 's'}, so trust may be limited.`)
    if (freshness && freshness.ageInDays !== null && freshness.ageInDays > 7) warnings.push(freshness.description)
  }

  if (!draft.analysis_run_id && draft.game_theory_model) warnings.push('This draft carries engine metadata but is not linked to an analysis run, so provenance is weaker than the payload suggests.')

  return {
    canPublish: blockers.length === 0 && reviewRequired.length === 0,
    status: blockers.length > 0 ? 'blocked' : reviewRequired.length > 0 ? 'review_required' : warnings.length > 0 ? 'caution' : 'ready',
    blockers,
    reviewRequired,
    warnings,
    freshness
  }
}

async function getLinkedAnalysis(analysisId: string) {
  const { data, error } = await supabaseAdmin
    .from('analysis_runs')
    .select('id, user_id, status, review_reason, evidence_backed, created_at')
    .eq('id', analysisId)
    .maybeSingle()
  if (error) throw new Error(`Failed to load linked analysis: ${error.message}`)
  if (!data) throw new Error('Linked analysis not found')
  return data
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return jsonResponse(200, { ok: true })
  if (req.method !== 'POST') return jsonResponse(405, { ok: false, message: 'Method not allowed' })

  const user = await getAuthenticatedUser(req)
  if (!user) return jsonResponse(401, { ok: false, message: 'Unauthorized' })

  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') return jsonResponse(400, { ok: false, message: 'Invalid request body' })

    const draft = {
      title: String(body.title || '').trim(),
      description: typeof body.description === 'string' ? body.description.trim() : '',
      category: ALLOWED_CATEGORIES.has(body.category) ? body.category : 'other',
      question: String(body.question || '').trim(),
      resolution_criteria: String(body.resolution_criteria || '').trim(),
      resolution_date: typeof body.resolution_date === 'string' && body.resolution_date.trim() ? body.resolution_date.trim() : '',
      tags: Array.isArray(body.tags) ? body.tags.join(',') : String(body.tags || ''),
      analysis_run_id: typeof body.analysis_run_id === 'string' && body.analysis_run_id.trim() ? body.analysis_run_id.trim() : '',
      game_theory_model: body.game_theory_model && typeof body.game_theory_model === 'object' ? body.game_theory_model : null
    }

    const readiness = assessForecastReadiness(draft)
    let reviewState = { status: null, reviewReason: null, evidenceBacked: null, createdAt: null, loading: false }

    if (draft.analysis_run_id) {
      const linkedAnalysis = await getLinkedAnalysis(draft.analysis_run_id)
      if (linkedAnalysis.user_id && linkedAnalysis.user_id !== user.id) {
        return jsonResponse(403, { ok: false, message: 'Forbidden - you can only link your own analysis runs', code: 'analysis_not_owned' })
      }
      reviewState = {
        status: typeof linkedAnalysis.status === 'string' ? linkedAnalysis.status : null,
        reviewReason: typeof linkedAnalysis.review_reason === 'string' ? linkedAnalysis.review_reason : null,
        evidenceBacked: typeof linkedAnalysis.evidence_backed === 'boolean' ? linkedAnalysis.evidence_backed : null,
        createdAt: typeof linkedAnalysis.created_at === 'string' ? linkedAnalysis.created_at : null,
        loading: false
      }
    }

    const governance = assessPublishGovernance(draft, readiness, reviewState)
    if (!governance.canPublish) {
      return jsonResponse(400, {
        ok: false,
        message: governance.blockers[0] || governance.reviewRequired[0] || 'Forecast is not ready for public publication',
        code: governance.status,
        governance
      })
    }

    const { data, error } = await supabaseAdmin
      .from('forecasts')
      .insert({
        creator_id: user.id,
        title: draft.title,
        description: draft.description,
        category: draft.category,
        question: draft.question,
        resolution_criteria: draft.resolution_criteria,
        resolution_date: draft.resolution_date || null,
        tags: normalizeTags(body.tags ?? draft.tags),
        analysis_run_id: draft.analysis_run_id || null,
        game_theory_model: draft.game_theory_model,
        is_public: true,
        current_probability: 0.5
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to create forecast: ${error.message}`)

    return jsonResponse(200, { ok: true, forecast: data, governance })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    console.error('forecast-create error:', message)
    return jsonResponse(500, { ok: false, message })
  }
})
