// @ts-nocheck
// Supabase Edge Function: evidence-retrieval-exa
// Deno runtime
// Endpoint: POST /functions/v1/evidence-retrieval-exa

import { createClient } from 'npm:@supabase/supabase-js@2'
import { DEFAULT_RETRIEVAL_POLICY_ID, ensureOntologySeed } from '../_shared/ml-platform.ts'
import {
import { getAuthenticatedUser, jsonResponse } from '../_shared/auth.ts'
  persistRankedEvidence,
  rankAndGroundEvidence,
  RETRIEVAL_STACK_VERSION,
  runRetrievalStack,
  summarizeEvidenceItems,
  summarizeProviderRuns,
  type NormalizedEvidenceItem,
} from '../_shared/retrieval-stack-exa.ts'

interface EvidenceRetrievalRequest {
  runId: string
  query: string
  contextualFactors: {
    domain: string
    stakeholders: string[]
    temporalScope: { start: string; end: string }
    confidenceThreshold: number
  }
  sourceConfig: {
    include_exa?: boolean
    include_academic?: boolean
    include_news?: boolean
    include_firecrawl?: boolean
    maxSources: number
  }
}

interface EvidenceSource {
  id: string
  title: string
  content: string
  url?: string
  provider?: string
  source_type: 'academic' | 'news' | 'expert' | 'historical' | 'web' | 'official'
  relevance_score: number
  credibility_score: number
  temporal_distance: number
  citation_format: {
    apa: string
    mla: string
    chicago: string
  }
  retrieval_id?: string
  passage_excerpt?: string
  grounded_entities?: Array<{
    entity_key: string
    entity_type: string
    domain: string
    label: string
    confidence: number
    matched_text: string
  }>
  ranking_score?: number
  query_variant?: string
}

interface EvidenceRetrievalResponse {
  runId: string
  query: string
  evidence_set: EvidenceSource[]
  grounded_entities?: EvidenceSource['grounded_entities']
  retrieval_policy_id?: string
  stack_version?: string
  provider_diagnostics?: ReturnType<typeof summarizeProviderRuns>
  meta_analysis: {
    total_sources: number
    quality_distribution: Record<string, number>
    temporal_coverage: {
      earliest: string
      latest: string
      avg_age_days: number
    }
    confidence_assessment: {
      overall_credibility: number
      evidence_gaps: string[]
      bias_indicators: string[]
    }
  }
  strategic_insights: {
    key_findings: Array<{
      finding: string
      evidence: string[]
      confidence: number
    }>
    contradictory_signal: boolean
    emerging_patterns: string[]
  }
  citations: {
    formatted_citations: string[]
    recommended_style: 'apa' | 'mla' | 'chicago'
  }
}

function jsonResponse(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('APP_URL') || 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info',
    },
  })
}

function safeCitation(title: string, url?: string) {
  const year = new Date().getFullYear()
  let hostname = 'unknown'
  try {
    hostname = new URL(url || 'https://example.com').hostname
  } catch {
    hostname = 'unknown'
  }
  return {
    apa: `${hostname}. (${year}). ${title}. ${url || ''}`,
    mla: `"${title}" ${hostname}, ${new Date().toISOString().slice(0, 10)}, ${url || ''}`,
    chicago: `${hostname}. "${title}" ${year}. ${url || ''}`,
  }
}

function toEvidenceSource(item: NormalizedEvidenceItem): EvidenceSource {
  return {
    id: item.id,
    title: item.title,
    content: item.content,
    url: item.url,
    provider: item.provider,
    source_type: item.source_type,
    relevance_score: item.relevance_score,
    credibility_score: item.credibility_score,
    temporal_distance: item.temporal_distance,
    citation_format: safeCitation(item.title, item.url),
    passage_excerpt: item.passage_excerpt,
    grounded_entities: item.grounded_entities,
    ranking_score: item.ranking_score,
    query_variant: item.query_variant,
  }
}

function analyzeEvidenceSet(evidence: EvidenceSource[]): EvidenceRetrievalResponse['meta_analysis'] {
  const avgCredibility = evidence.length
    ? evidence.reduce((sum, item) => sum + Number(item.credibility_score || 0), 0) / evidence.length
    : 0

  const avgAgeDays = evidence.length
    ? evidence.reduce((sum, item) => sum + Number(item.temporal_distance || 0), 0) / evidence.length
    : 0

  const quality_distribution = evidence.reduce<Record<string, number>>((acc, item) => {
    acc[item.provider || item.source_type] = (acc[item.provider || item.source_type] || 0) + 1
    return acc
  }, {})

  const evidence_gaps: string[] = []
  if (evidence.length < 3) evidence_gaps.push('fewer than 3 normalized sources')
  if (!evidence.some((item) => item.source_type === 'official')) evidence_gaps.push('no official-data provider coverage')
  if (!evidence.some((item) => item.source_type === 'news' || item.provider === 'exa' || item.provider === 'firecrawl')) {
    evidence_gaps.push('limited contemporary web or news coverage')
  }

  return {
    total_sources: evidence.length,
    quality_distribution,
    temporal_coverage: {
      earliest: evidence.length ? new Date(Date.now() - Math.max(...evidence.map((item) => item.temporal_distance || 0)) * 24 * 60 * 60 * 1000).toISOString() : new Date().toISOString(),
      latest: evidence.length ? new Date(Date.now() - Math.min(...evidence.map((item) => item.temporal_distance || 0)) * 24 * 60 * 60 * 1000).toISOString() : new Date().toISOString(),
      avg_age_days: Number(avgAgeDays.toFixed(2)),
    },
    confidence_assessment: {
      overall_credibility: Number(avgCredibility.toFixed(4)),
      evidence_gaps,
      bias_indicators: evidence.some((item) => item.provider === 'gdelt') ? ['news-source bias possible'] : [],
    },
  }
}

function analyzeStrategicInsights(evidence: EvidenceSource[], stakeholders: string[]): EvidenceRetrievalResponse['strategic_insights'] {
  const stakeholderMatches = stakeholders.filter((stakeholder) =>
    evidence.some((item) => `${item.title} ${item.content}`.toLowerCase().includes(stakeholder.toLowerCase())),
  )

  const keyFindings = evidence.slice(0, 3).map((item) => ({
    finding: item.title,
    evidence: [item.url || item.title],
    confidence: Number(Math.min(0.95, item.credibility_score).toFixed(4)),
  }))

  return {
    key_findings: keyFindings,
    contradictory_signal: new Set(evidence.map((item) => item.provider)).size >= 3 && evidence.some((item) => item.credibility_score < 0.65),
    emerging_patterns: stakeholderMatches.length
      ? [`coverage for stakeholders: ${stakeholderMatches.join(', ')}`]
      : ['stakeholder coverage remains sparse'],
  }
}

function formatCitations(evidence: EvidenceSource[]): EvidenceRetrievalResponse['citations'] {
  const hasAcademic = evidence.some((item) => item.source_type === 'academic')
  const hasNews = evidence.some((item) => item.source_type === 'news')
  const recommended_style: 'apa' | 'mla' | 'chicago' = hasAcademic ? 'apa' : hasNews ? 'mla' : 'chicago'

  return {
    formatted_citations: evidence.map((item) => item.citation_format[recommended_style]),
    recommended_style,
  }
}

async function retrieveEvidence(request: EvidenceRetrievalRequest, supabase: any): Promise<EvidenceRetrievalResponse> {
  const stakeholders = request.contextualFactors.stakeholders || []
  const stack = await runRetrievalStack({
    admin: supabase,
    requestId: request.runId,
    query: request.query,
    entities: stakeholders,
    domain: request.contextualFactors.domain,
    audience: 'researcher',
    includeAcademic: request.sourceConfig.include_academic !== false,
    includeNews: request.sourceConfig.include_news !== false,
    includeFirecrawl: request.sourceConfig.include_firecrawl !== false,
    includeOfficial: true,
    maxSources: request.sourceConfig.maxSources || 8,
    forceFresh: true,
  })

  const filteredEvidence = stack.evidence
    .filter((item) => item.relevance_score >= request.contextualFactors.confidenceThreshold)
    .slice(0, request.sourceConfig.maxSources || 8)

  const evidenceSet = filteredEvidence.map(toEvidenceSource)
  const meta_analysis = analyzeEvidenceSet(evidenceSet)
  const strategic_insights = analyzeStrategicInsights(evidenceSet, stakeholders)
  const citations = formatCitations(evidenceSet)

  return {
    runId: request.runId,
    query: request.query,
    evidence_set: evidenceSet,
    stack_version: RETRIEVAL_STACK_VERSION,
    provider_diagnostics: stack.providerRuns.length
      ? summarizeProviderRuns(stack.providerRuns)
      : summarizeEvidenceItems(filteredEvidence),
    meta_analysis,
    strategic_insights,
    citations,
  }
}

async function persistEvidence(
  supabase: any,
  runId: string,
  query: string,
  domain: string,
  evidence: EvidenceSource[],
) {
  await supabase
    .from('analysis_runs')
    .upsert({
      id: runId,
      scenario_text: 'Evidence retrieval for strategic analysis',
      created_at: new Date().toISOString(),
      processing_time_ms: 0,
    })

  await ensureOntologySeed(supabase)
  const rankedEvidence = await rankAndGroundEvidence(
    evidence.map((entry) => ({
      id: entry.id,
      provider: entry.provider || entry.source_type,
      title: entry.title,
      content: entry.content,
      url: entry.url,
      source_type: entry.source_type,
      relevance_score: entry.relevance_score,
      credibility_score: entry.credibility_score,
      temporal_distance: entry.temporal_distance,
      passage_excerpt: entry.passage_excerpt,
      grounded_entities: entry.grounded_entities,
      ranking_score: entry.ranking_score,
      query_variant: (entry.query_variant || 'canonical_query') as any,
    })),
    domain,
  )

  const evidenceRows = rankedEvidence.map((entry) => ({
    id: entry.id,
    title: entry.title,
    url: entry.url,
    snippet: entry.content.substring(0, 500),
    retrievals: [{ confidence: entry.credibility_score, relevance: entry.relevance_score }],
  }))

  await supabase
    .from('evidence_sources')
    .upsert(evidenceRows)

  const persisted = await persistRankedEvidence(supabase, query, rankedEvidence)

  try {
    await supabase.rpc('update_processing_metrics', {
      run_id: runId,
      processing_ms: 1500,
      stability_delta: 0.1,
    })
  } catch (error) {
    console.warn('update_processing_metrics RPC failed:', error)
  }

  return persisted
}

Deno.serve(async (req) => {
  // Auth check
  const _user = await getAuthenticatedUser(req)
  if (!_user) return jsonResponse(401, { ok: false, error: 'authentication_required' })


  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('APP_URL') || 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info',
    } })
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { ok: false, message: 'Method Not Allowed' })
  }

  try {
    const request: EvidenceRetrievalRequest = await req.json()
    if (!request.runId || !request.query) {
      return jsonResponse(400, { ok: false, message: 'Missing required fields: runId or query' })
    }

    const ref = Deno.env.get('SUPABASE_PROJECT_REF') || 'jxdihzqoaxtydolmltdr'
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || `https://${ref}.supabase.co`
    const writeKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('EDGE_SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl, writeKey)

    const response = await retrieveEvidence(request, supabase)
    const persisted = await persistEvidence(
      supabase,
      request.runId,
      request.query,
      request.contextualFactors.domain,
      response.evidence_set,
    )

    response.evidence_set = persisted.evidence.map((entry: any) => ({
      ...toEvidenceSource(entry),
      retrieval_id: entry.retrieval_id || entry.id,
      grounded_entities: entry.grounded_entities,
      ranking_score: entry.ranking_score,
    }))
    response.grounded_entities = persisted.groundedEntities
    response.retrieval_policy_id = DEFAULT_RETRIEVAL_POLICY_ID

    return jsonResponse(200, {
      ok: true,
      response,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Evidence retrieval failed'
    console.error('Evidence retrieval error:', error)
    return jsonResponse(500, {
      ok: false,
      message,
    })
  }
})
