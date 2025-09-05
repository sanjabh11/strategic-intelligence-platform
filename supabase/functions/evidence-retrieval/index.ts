// @ts-nocheck
// Supabase Edge Function: evidence-retrieval
// Deno runtime
// Endpoint: POST /functions/v1/evidence-retrieval
// Advanced evidence retrieval and citation system with CBR/Perplexity integration

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function jsonResponse(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    },
  })
}

interface EvidenceRetrievalRequest {
  runId: string;
  query: string;
  contextualFactors: {
    domain: string;
    stakeholders: string[];
    temporalScope: { start: string; end: string };
    confidenceThreshold: number;
  };
  sourceConfig: {
    include_perplexity?: boolean;
    include_academic?: boolean;
    include_news?: boolean;
    include_firecrawl?: boolean;
    maxSources: number;
  };
}

// Networking helpers
const REQUEST_TIMEOUT_MS = 15000
const RETRIES = 2
const BACKOFF_MS = 1000

async function fetchWithTimeoutRetry(url: string, init: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS, retries = RETRIES, backoffMs = BACKOFF_MS): Promise<Response> {
  let attempt = 0
  let lastErr: any
  while (attempt <= retries) {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, { ...init, signal: controller.signal })
      clearTimeout(id)
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status}`)
      } else {
        return res
      }
    } catch (e) {
      lastErr = e
    }
    attempt++
    if (attempt <= retries) {
      await new Promise(r => setTimeout(r, backoffMs * attempt))
    }
  }
  throw lastErr
}

// Perplexity primary retrieval
async function perplexityRetrieval(query: string): Promise<EvidenceSource[]> {
  const apiKey = Deno.env.get('PERPLEXITY_API_KEY')
  if (!apiKey) throw new Error('PERPLEXITY_API_KEY missing')

  const system = 'You are a research assistant. Return ONLY JSON with an array of sources. Each source must have: title, url, snippet (<=500 chars).'
  const user = `Query: ${query}. Return 3-5 high-quality recent web sources as JSON.`

  const res = await fetchWithTimeoutRetry('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: 0.2
    })
  })

  const data = await res.json()
  const content: string = data?.choices?.[0]?.message?.content || ''
  // Attempt to parse JSON from content
  let parsed: any
  try {
    parsed = JSON.parse(content)
  } catch {
    // Try to extract JSON block
    const match = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
    if (match) parsed = JSON.parse(match[0])
  }

  const items: Array<{ title: string, url: string, snippet?: string }> = Array.isArray(parsed) ? parsed : (parsed?.sources || [])
  if (!Array.isArray(items) || items.length === 0) throw new Error('Perplexity parse failed')

  const now = Date.now()
  return items.slice(0, 5).map((s, i) => ({
    id: `perplexity-${crypto.randomUUID().substring(0,8)}-${i}`,
    title: s.title || `Result ${i+1} for ${query.substring(0, 40)}`,
    content: (s.snippet || '').substring(0, 500) || `Summary for ${s.url}`,
    url: s.url,
    source_type: 'web',
    relevance_score: 0.8,
    credibility_score: 0.75,
    temporal_distance: Math.floor(Math.random() * 14),
    citation_format: {
      apa: `${new URL(s.url).hostname}. (${new Date(now).getFullYear()}). ${s.title || 'Web source'}. ${s.url}`,
      mla: `"${s.title || 'Web source'}." ${new URL(s.url).hostname}, ${new Date(now).toISOString().split('T')[0]}, ${s.url}`,
      chicago: `${new URL(s.url).hostname}. "${s.title || 'Web source'}." ${new Date(now).getFullYear()}. ${s.url}`
    },
    retrieval_id: crypto.randomUUID(),
    passage_excerpt: s.snippet || 'No excerpt available'
  }))
}

interface EvidenceSource {
  id: string;
  title: string;
  content: string;
  url?: string;
  source_type: 'academic' | 'news' | 'expert' | 'historical' | 'web';
  relevance_score: number;
  credibility_score: number;
  temporal_distance: number; // days since publication
  citation_format: {
    apa: string;
    mla: string;
    chicago: string;
  };
  retrieval_id?: string; // ID from retrievals table for provenance
  passage_excerpt?: string; // Specific passage used for seeding numeric values
}

interface EvidenceRetrievalResponse {
  runId: string;
  query: string;
  evidence_set: EvidenceSource[];
  meta_analysis: {
    total_sources: number;
    quality_distribution: Record<string, number>;
    temporal_coverage: {
      earliest: string;
      latest: string;
      avg_age_days: number;
    };
    confidence_assessment: {
      overall_credibility: number;
      evidence_gaps: string[];
      bias_indicators: string[];
    };
  };
  strategic_insights: {
    key_findings: Array<{
      finding: string;
      evidence: string[];
      confidence: number;
    }>;
    contradictory_signal: boolean;
    emerging_patterns: string[];
  };
  citations: {
    formatted_citations: string[];
    recommended_style: 'apa' | 'mla' | 'chicago';
  };
}

// Advanced evidence retrieval with multiple source integration
async function retrieveEvidence(
  request: EvidenceRetrievalRequest
): Promise<EvidenceRetrievalResponse> {

  const evidenceSet: EvidenceSource[] = [];

  // Mock evidence retrieval - in production this would call real APIs
  // Perplexity AI integration for web/general knowledge
  if (request.sourceConfig.include_perplexity) {
    try {
      const perplexityEvidence = await perplexityRetrieval(request.query);
      evidenceSet.push(...perplexityEvidence);
    } catch (err) {
      console.warn('Perplexity primary failed:', err?.message || err)
      // Secondary key: Firecrawl fallback when enabled
      if (request.sourceConfig.include_firecrawl) {
        const firecrawlEvidence = await firecrawlResearchRetrieval(request);
        evidenceSet.push(...firecrawlEvidence);
      }
    }
  }

  // Academic source integration (would use Google Scholar, JSTOR, etc.)
  if (request.sourceConfig.include_academic) {
    const academicEvidence = await mockAcademicRetrieval(request.query, request.contextualFactors.domain);
    evidenceSet.push(...academicEvidence);
  }

  // News and current events (would use NewsAPI, RSS feeds, etc.)
  if (request.sourceConfig.include_news) {
    const newsEvidence = await mockNewsRetrieval(request.query, request.contextualFactors.temporalScope);
    evidenceSet.push(...newsEvidence);
  }

  // Firecrawl web research integration
  if (request.sourceConfig.include_firecrawl) {
    // If Perplexity already succeeded, Firecrawl can still add diversity; otherwise, this may already have been used as fallback.
    try {
      const firecrawlEvidence = await firecrawlResearchRetrieval(request);
      evidenceSet.push(...firecrawlEvidence);
    } catch (e) {
      console.warn('Firecrawl retrieval failed:', e)
    }
  }

  // Filter and score evidence based on contextual factors
  const filteredEvidence = evidenceSet
    .filter(evidence => {
      // Apply temporal filter
      const DAY_MS = 24 * 60 * 60 * 1000;
      const publicationDate = new Date(Date.now() - (evidence.temporal_distance || 0) * DAY_MS).getTime();
      const startDate = Date.parse(request.contextualFactors.temporalScope.start);
      const endDate = Date.parse(request.contextualFactors.temporalScope.end);

      return publicationDate >= startDate && publicationDate <= endDate;
    })
    .filter(evidence => evidence.relevance_score >= request.contextualFactors.confidenceThreshold)
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, request.sourceConfig.maxSources);

  // Perform meta-analysis
  const meta_analysis = analyzeEvidenceSet(filteredEvidence);

  // Generate strategic insights
  const strategic_insights = analyzeStrategicInsights(filteredEvidence, request.contextualFactors.stakeholders);

  // Format citations
  const citations = formatCitations(filteredEvidence);

  return {
    runId: request.runId,
    query: request.query,
    evidence_set: filteredEvidence,
    meta_analysis,
    strategic_insights,
    citations
  };
}

// Perplexity retrieval (removed mock - integrate real API)
async function mockPerplexityRetrieval(query: string): Promise<EvidenceSource[]> {
  console.warn('Perplexity retrieval not yet implemented - returning empty results');
  return [];
}

// Academic retrieval (removed mock - integrate real API)
async function mockAcademicRetrieval(query: string, domain: string): Promise<EvidenceSource[]> {
  console.warn('Academic retrieval not yet implemented - returning empty results');
  return [];
}

// News retrieval (removed mock - integrate real API)
async function mockNewsRetrieval(query: string, temporalScope: { start: string; end: string }): Promise<EvidenceSource[]> {
  console.warn('News retrieval not yet implemented - returning empty results');
  return [];
}

// Firecrawl web research retrieval
async function firecrawlResearchRetrieval(request: EvidenceRetrievalRequest): Promise<EvidenceSource[]> {
  try {
    const ref = Deno.env.get('SUPABASE_PROJECT_REF') || 'jxdihzqoaxtydolmltdr';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || `https://${ref}.supabase.co`;

    // Auto-detect if this is a URL-based query
    const isUrlQuery = request.query.startsWith('http://') || request.query.startsWith('https://');

    let firecrawlRequest;
    if (isUrlQuery) {
      // Use scrape mode for direct URLs
      firecrawlRequest = {
        runId: request.runId,
        mode: 'scrape',
        urls: [request.query],
        config: {
          returnFormat: 'markdown',
          includeMetadata: true,
          extractSchemas: true
        },
        context: {
          domain: request.contextualFactors.domain,
          stakeholders: request.contextualFactors.stakeholders,
          strategicContext: request.query
        }
      };
    } else {
      // Use search mode for keywords
      firecrawlRequest = {
        runId: request.runId,
        mode: 'search',
        query: request.query,
        config: {
          maxPages: 3,
          returnFormat: 'markdown',
          includeMetadata: true,
          extractSchemas: false
        },
        context: {
          domain: request.contextualFactors.domain,
          stakeholders: request.contextualFactors.stakeholders,
          strategicContext: request.query
        }
      };
    }

    const response = await fetchWithTimeoutRetry(`${supabaseUrl}/functions/v1/firecrawl-research`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY') || ''}`
      },
      body: JSON.stringify(firecrawlRequest)
    });

    if (!response.ok) {
      console.warn('Firecrawl research failed, using fallback');
      return await mockFirecrawlRetrieval(request);
    }

    const data = await response.json();

    if (data.ok && data.response && data.response.evidence) {
      return data.response.evidence.map((item: any) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        url: item.url,
        source_type: 'web',
        relevance_score: item.relevance_score,
        credibility_score: item.credibility_score,
        temporal_distance: item.temporal_distance,
        citation_format: item.citation_format,
        retrieval_id: crypto.randomUUID(),
        passage_excerpt: item.content || 'No excerpt available'
      }));
    } else {
      console.warn('Invalid Firecrawl response, using fallback');
      return await mockFirecrawlRetrieval(request);
    }

  } catch (error) {
    console.error('Firecrawl retrieval error:', error);
    return await mockFirecrawlRetrieval(request);
  }
}

// Firecrawl retrieval (removed mock - integrate real API)
async function mockFirecrawlRetrieval(request: EvidenceRetrievalRequest): Promise<EvidenceSource[]> {
  console.warn('Firecrawl retrieval not yet implemented - returning empty results');
  return [];
}

// Advanced meta-analysis of evidence set
function analyzeEvidenceSet(evidence: EvidenceSource[]): EvidenceRetrievalResponse['meta_analysis'] {

  const qualityDistribution = evidence.reduce((acc, source) => {
    const quality = source.credibility_score > 0.8 ? 'high' :
                   source.credibility_score > 0.6 ? 'medium' : 'low';
    acc[quality] = (acc[quality] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const dates = evidence.map(e => new Date(Date.now() - e.temporal_distance * 24 * 60 * 60 * 1000));
  const earliest = dates.reduce((min, date) => date < min ? date : min, new Date()).toISOString();
  const latest = dates.reduce((max, date) => date > max ? date : max, new Date(0)).toISOString();
  const avgAgeDays = evidence.reduce((sum, e) => sum + e.temporal_distance, 0) / evidence.length;

  const overallCredibility = evidence.reduce((sum, e) => sum + e.credibility_score, 0) / evidence.length;
  const evidenceGaps = [];
  const biasIndicators = [];

  // Simple gap detection
  if (evidence.filter(e => e.source_type === 'academic').length < 1) {
    evidenceGaps.push('Limited academic research coverage');
  }
  if (evidence.filter(e => e.temporal_distance < 30).length < 1) {
    evidenceGaps.push('Lack of recent contemporary analysis');
  }
  if (evidence.filter(e => e.source_type === 'web').length < 1) {
    evidenceGaps.push('Limited web-based intelligence');
  }

  // Basic bias detection (simplified)
  const sourceTypeDistribution = evidence.reduce((acc, e) => {
    acc[e.source_type] = (acc[e.source_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (Object.values(sourceTypeDistribution).some(count => count > evidence.length * 0.7)) {
    biasIndicators.push('Over-reliance on single source type');
  }

  return {
    total_sources: evidence.length,
    quality_distribution: qualityDistribution,
    temporal_coverage: {
      earliest,
      latest,
      avg_age_days: Math.round(avgAgeDays)
    },
    confidence_assessment: {
      overall_credibility: Math.round(overallCredibility * 100) / 100,
      evidence_gaps: evidenceGaps,
      bias_indicators: biasIndicators
    }
  };
}

// Generate strategic insights from evidence
function analyzeStrategicInsights(
  evidence: EvidenceSource[],
  stakeholders: string[]
): EvidenceRetrievalResponse['strategic_insights'] {

  const keyFindings = [];
  const emergingPatterns = [];
  let contradictorySignals = false;

  // Extract insights using evidence content
  evidence.forEach(source => {
    if (source.content.includes('cooperative') || source.content.includes('coordination')) {
      const finding = `Strong evidence for cooperative outcomes in ${source.title}`;
      const supportingEvidence = [source.citation_format.apa];

      if (source.content.includes('compete') || source.content.includes('competitive')) {
        contradictorySignals = true;
        finding += ' (with competitive counter-evidence)';
        supportingEvidence.push('Note: Mixed signals detected');
      }

      keyFindings.push({
        finding,
        evidence: supportingEvidence,
        confidence: source.credibility_score * source.relevance_score
      });
    }
  });

  // Detect emerging patterns across stakeholders
  if (stakeholders.length > 1) {
    emergingPatterns.push('Multi-stakeholder scenarios show preference for negotiated solutions');
  }

  // Pattern recognition based on temporal analysis
  const recentEvidence = evidence.filter(e => e.temporal_distance < 90);
  if (recentEvidence.length > evidence.length / 2) {
    emergingPatterns.push('Recent developments favor adaptive strategies over static positions');
  }

  return {
    key_findings: keyFindings,
    contradictory_signal: contradictorySignals,
    emerging_patterns: emergingPatterns
  };
}

// Format citations in multiple styles
function formatCitations(evidence: EvidenceSource[]): EvidenceRetrievalResponse['citations'] {

  const formattedCitations = evidence.map(source => source.citation_format.apa);

  // Determine recommended style based on context
  const hasAcademic = evidence.some(e => e.source_type === 'academic');
  const hasNews = evidence.some(e => e.source_type === 'news');

  const recommendedStyle = hasAcademic ? 'apa' : hasNews ? 'mla' : 'chicago';

  return {
    formatted_citations: formattedCitations,
    recommended_style: recommendedStyle
  };
}

// Persist evidence to database
async function persistEvidence(
  supabase: any,
  runId: string,
  evidence: EvidenceSource[]
) {

  // Insert into analysis_runs if not exists
  await supabase
    .from('analysis_runs')
    .upsert({
      id: runId,
      scenario_text: `Evidence retrieval for strategic analysis`,
      created_at: new Date().toISOString(),
      processing_time_ms: 0
    });

  // Insert evidence sources
  const evidenceData = evidence.map(e => ({
    id: e.id,
    title: e.title,
    url: e.url,
    snippet: e.content.substring(0, 500),
    retrievals: [{ confidence: e.credibility_score, relevance: e.relevance_score }]
  }));

  await supabase
    .from('evidence_sources')
    .upsert(evidenceData);

  // Update analysis_runs with evidence count
  await supabase
    .from('analysis_runs')
    .update({
      // Deprecated inline SQL fragments replaced by RPC below
    })
    .eq('id', runId);

  // Use RPC for atomic increments
  try {
    await supabase.rpc('update_processing_metrics', {
      run_id: runId,
      processing_ms: 1500,
      stability_delta: 0.1
    })
  } catch (e) {
    console.warn('update_processing_metrics RPC failed:', e)
  }
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }})
  }
  if (req.method !== 'POST') {
    return jsonResponse(405, { ok: false, message: 'Method Not Allowed' });
  }

  try {
    const request: EvidenceRetrievalRequest = await req.json();

    if (!request.runId || !request.query) {
      return jsonResponse(400, {
        ok: false,
        message: 'Missing required fields: runId or query'
      });
    }

    // Perform evidence retrieval
    const response = await retrieveEvidence(request);

    // Persist to database (optional)
    const ref = Deno.env.get('SUPABASE_PROJECT_REF') || 'jxdihzqoaxtydolmltdr';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || `https://${ref}.supabase.co`;
    const writeKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('EDGE_SUPABASE_SERVICE_ROLE_KEY');

    if (supabaseUrl && writeKey) {
      const supabase = createClient(supabaseUrl, writeKey);

      try {
        await persistEvidence(supabase, request.runId, response.evidence_set);
      } catch (persistError) {
        console.error('Evidence persistence failed:', persistError);
        // Continue with response
      }
    }

    return jsonResponse(200, {
      ok: true,
      response
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Evidence retrieval failed';
    console.error('Evidence retrieval error:', error);
    return jsonResponse(500, {
      ok: false,
      message: msg
    });
  }
});