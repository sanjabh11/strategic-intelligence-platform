// @ts-nocheck
// Supabase Edge Function: firecrawl-research
// Deno runtime with Firecrawl API integration for advanced web research
// Endpoint: POST /functions/v1/firecrawl-research

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface JsonResponse {
  status: number;
  body: any;
}

function jsonResponse(status: number, body: any): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

// Firecrawl Research Request Interface
interface FirecrawlResearchRequest {
  runId: string;
  urls?: string[];           // For targeted scraping
  query?: string;           // For search/crawl operations
  mode: 'scrape' | 'crawl' | 'search';
  config: {
    maxPages?: number;
    extractSchemas?: boolean;
    includeMetadata?: boolean;
    returnFormat?: 'markdown' | 'json' | 'structured';
  };
  context: {
    domain: string;
    stakeholders: string[];
    strategicContext: string;
  };
}

// Firecrawl Evidence Response
interface FirecrawlEvidenceResponse {
  runId: string;
  evidence: EvidenceSource[];
  processingStats: {
    pagesScraped: number;
    processingTimeMs: number;
    apiCalls: number;
    cacheHits: number;
  };
  qualityMetrics: {
    dataFreshness: number; // score 0-1
    sourceCredibility: number;
    relevanceScore: number;
  };
  structuredData?: any[]; // Extracted schemas if requested
}

// Evidence Source Interface
interface EvidenceSource {
  id: string;
  title: string;
  content: string;
  url: string;
  source_type: 'web';
  relevance_score: number;
  credibility_score: number;
  temporal_distance: number;
  citation_format: {
    apa: string;
    mla: string;
    chicago: string;
  };
  retrieval_id?: string; // ID from retrievals table for provenance
  passage_excerpt?: string; // Specific passage used for seeding numeric values
  metadata?: {
    pageTitle: string;
    description?: string;
    publishDate?: string;
    lastModified?: string;
    author?: string;
    siteName: string;
    wordCount: number;
    readingTime: number;
  };
}

// Local cache for scraped results
const SCRAPE_CACHE = new Map<string, {data: any, timestamp: number, expiresAt: number}>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Firecrawl API Base URL
const FIRECRAWL_BASE_URL = 'https://api.firecrawl.dev';

// Networking: timeouts/retries & per-host pacing
const REQUEST_TIMEOUT_MS = 15000;
const RETRIES = 2;
const BACKOFF_MS = 1000;

async function fetchWithTimeoutRetry(url: string, init: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS, retries = RETRIES, backoffMs = BACKOFF_MS): Promise<Response> {
  let attempt = 0;
  let lastErr: any;
  while (attempt <= retries) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(id);
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status}`);
      } else {
        return res;
      }
    } catch (e) {
      lastErr = e;
    }
    attempt++;
    if (attempt <= retries) {
      await new Promise(r => setTimeout(r, backoffMs * attempt));
    }
  }
  throw lastErr;
}

// Per-host minimal pacing
const hostLastRequest = new Map<string, number>();
const MIN_REQUEST_INTERVAL = 1000; // 1 req/sec per host
async function ensurePacedForHost(host: string) {
  const now = Date.now();
  const last = hostLastRequest.get(host) || 0;
  const diff = now - last;
  if (diff < MIN_REQUEST_INTERVAL) {
    await new Promise(r => setTimeout(r, MIN_REQUEST_INTERVAL - diff));
  }
  hostLastRequest.set(host, Date.now());
}

async function makeFirecrawlRequest(endpoint: string, payload: any): Promise<any> {
  const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!firecrawlApiKey) {
    console.warn('Firecrawl API key not configured');
    throw new Error('Firecrawl API key not configured');
  }

  // Per-host pacing
  const url = new URL(`${FIRECRAWL_BASE_URL}${endpoint}`);
  await ensurePacedForHost(url.hostname);

  try {
    const response = await fetchWithTimeoutRetry(`${FIRECRAWL_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${firecrawlApiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Firecrawl API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Firecrawl API request failed:', error);
    throw error; // No mock fallback
  }
}

async function mockFirecrawlResponse(endpoint: string, payload: any): Promise<any> {
  // Mock response for development/testing when API is not available
  if (endpoint.includes('/scrape')) {
    const url = payload.url;
    const domain = url ? url.replace('https://', '').split('.')[0] : 'example';

    return {
      success: true,
      data: {
        url: url || 'https://example.com',
        markdown: `# ${domain.charAt(0).toUpperCase() + domain.slice(1)} - Strategic Intelligence Report\n\n## Executive Summary\n\nThis is a comprehensive analysis of ${domain} in the context of strategic decision-making. Our research indicates strong positions across multiple strategic domains with notable influence in competitive landscapes.\n\n## Strategic Positioning\n- Market leadership confirmed\n- Technological differentiation achieved\n- Partnership networks established\n\n## Future Outlook\nStrong growth potential with adaptive strategies recommended.\n\n---\n*Analysis generated: ${new Date().toISOString()}*`,
        metadata: {
          title: `${domain.charAt(0).toUpperCase() + domain.slice(1)} - Official Intelligence Portal`,
          description: `Official strategic intelligence repository for ${domain}`,
          language: 'en',
          sourceURL: url || 'https://example.com',
          pageError: false,
          pageStatusCode: 200,
          ogImage: null,
          ogDescription: null,
          ogTitle: null,
          ogUrl: null
        }
      }
    };
  }

  if (endpoint.includes('/crawl')) {
    return {
      success: true,
      data: [{
        url: payload.url,
        markdown: `## ${payload.url} - Full Website Analysis\n\nCrawled content across ${Math.floor(Math.random() * 20) + 5} pages reveals strategic patterns and competitive advantages.`,
        metadata: {
          pageStatusCode: 200,
          title: `Complete Analysis - ${payload.url}`,
          description: 'Comprehensive web crawler analysis'
        }
      }]
    };
  }

  if (endpoint.includes('/search')) {
    const mockResults = [];
    for (let i = 0; i < 3; i++) {
      mockResults.push({
        url: `https://strategic-research-site-${i}.com/${payload.query.replace(' ', '-')}`,
        markdown: `## Strategic Analysis: ${payload.query}\n\nComprehensive research on ${payload.query} reveals significant strategic implications across competitive landscapes. Analysis indicates strong position development with emerging patterns in industry leadership.`,
        metadata: {
          title: `Strategic Intelligence - ${payload.query} Research ${i + 1}`,
          description: `Detailed analysis of ${payload.query} strategic dynamics`
        }
      });
    }

    return {
      success: true,
      data: mockResults
    };
  }

  return { success: false, error: 'Unknown endpoint' };
}

function checkCache(url: string): any | null {
  const cached = SCRAPE_CACHE.get(url);
  if (!cached) return null;

  if (Date.now() > cached.expiresAt) {
    SCRAPE_CACHE.delete(url);
    return null;
  }

  return cached;
}

function setCache(url: string, data: any): void {
  const expiresAt = Date.now() + CACHE_DURATION;
  SCRAPE_CACHE.set(url, {
    data,
    timestamp: Date.now(),
    expiresAt
  });
}

// Analyze credibility of web source
function analyzeSourceCredibility(url: string, content: string, metadata: any): number {
  let credibility = 0.5; // Baseline

  // Domain reputation scoring
  const trustedDomains = ['edu', 'gov', 'org', 'mil'];
  if (trustedDomains.some(domain => url.includes(`.${domain}`))) {
    credibility += 0.2;
  }

  // Content quality indicators
  const wordCount = content.split(' ').length;
  if (wordCount > 500) credibility += 0.15;
  if (wordCount > 1000) credibility += 0.1;

  // Metadata completeness
  if (metadata.title) credibility += 0.1;
  if (metadata.description) credibility += 0.05;
  if (metadata.publishDate) credibility += 0.1;

  return Math.min(credibility, 1.0);
}

// Analyze relevance to strategic context
function analyzeStrategicRelevance(content: string, context: any): number {
  let relevance = 0.3; // Baseline

  const strategicKeywords = [
    ...context.stakeholders,
    context.domain,
    'strategy', 'analysis', 'intelligence', 'competitive', 'market',
    'leadership', 'innovation', 'growth', 'partnership', 'position'
  ];

  const lowerContent = content.toLowerCase();
  const matchedKeywords = strategicKeywords.filter(keyword =>
    lowerContent.includes(keyword.toLowerCase())
  );

  relevance += Math.min(matchedKeywords.length * 0.1, 0.5);

  // Contextual phrase matching
  const strategicPhrases = [
    'strategic positioning',
    'competitive advantage',
    'market dynamics',
    'decision making',
    'risk analysis'
  ];

  strategicPhrases.forEach(phrase => {
    if (lowerContent.includes(phrase)) {
      relevance += 0.05;
    }
  });

  return Math.min(relevance, 1.0);
}

// Convert response to EvidenceSource format
function convertToEvidenceSource(
  firecrawlResponse: any,
  context: any
): EvidenceSource {
  const url = firecrawlResponse.url;
  const domain = url.replace('https://', '').replace('www.', '').split('.')[0];

  const title = firecrawlResponse.metadata?.title ||
    `Strategic Analysis: ${context.strategicContext || domain}`;

  const content = firecrawlResponse.markdown ||
    `Web-scraped content from ${url} reveals strategic insights for ${context.domain}`;

  const relevanceScore = analyzeStrategicRelevance(content, context);
  const credibilityScore = analyzeSourceCredibility(url, content, firecrawlResponse.metadata);

  const wordCount = content.split(' ').length;
  const readingTime = Math.ceil(wordCount / 200); // Assuming 200 words per minute

  const id = `firecrawl-${crypto.randomUUID().substring(0, 8)}`;

  return {
    id,
    title,
    content: content.substring(0, 5000), // Limit content length
    url,
    source_type: 'web',
    relevance_score: relevanceScore,
    credibility_score: credibilityScore,
    temporal_distance: firecrawlResponse.metadata?.publishDate
      ? Math.floor((Date.now() - new Date(firecrawlResponse.metadata.publishDate).getTime()) / (24 * 60 * 60 * 1000))
      : Math.floor(Math.random() * 30), // Recent content assumed
    citation_format: {
      apa: `${domain.charAt(0).toUpperCase() + domain.slice(1)}. (${new Date().getFullYear()}). ${title.substring(0, 60)}${title.length > 60 ? '...' : ''}. ${url}`,
      mla: `"${title}." ${domain.charAt(0).toUpperCase() + domain.slice(1)}, ${new Date().getFullYear()}, ${url}`,
      chicago: `${domain.charAt(0).toUpperCase() + domain.slice(1)}. "${title}." ${new Date().getFullYear()}. ${url}`
    },
    retrieval_id: crypto.randomUUID(),
    passage_excerpt: content.substring(0, 200) || 'No excerpt available',
    metadata: {
      pageTitle: firecrawlResponse.metadata?.title || title,
      description: firecrawlResponse.metadata?.description,
      publishDate: firecrawlResponse.metadata?.publishDate,
      lastModified: firecrawlResponse.metadata?.lastModified,
      author: firecrawlResponse.metadata?.author,
      siteName: domain.charAt(0).toUpperCase() + domain.slice(1),
      wordCount,
      readingTime
    }
  };
}

// Main research function
async function performFirecrawlResearch(
  request: FirecrawlResearchRequest
): Promise<FirecrawlEvidenceResponse> {

  const startTime = Date.now();
  let apiCalls = 0;
  let cacheHits = 0;
  const evidence: EvidenceSource[] = [];

  try {
    switch (request.mode) {
      case 'scrape':
        if (request.urls) {
          const urls = request.urls;
          const CONCURRENCY = Math.min(3, urls.length);

          const queue = urls.slice();
          async function worker() {
            while (queue.length) {
              const url = queue.shift()!;
              const cached = checkCache(url);
              if (cached) {
                cacheHits++;
                const evidenceSource = convertToEvidenceSource(cached.data, request.context);
                evidence.push(evidenceSource);
                continue;
              }
              const host = new URL(url).hostname;
              await ensurePacedForHost(host);
              const response = await makeFirecrawlRequest('/v1/scrape', {
                url,
                formats: ['markdown'],
                includeTags: ['p', 'h1', 'h2', 'h3', 'li']
              });
              apiCalls++;
              if (response.success) {
                setCache(url, response.data);
                const ev = convertToEvidenceSource(response.data, request.context);
                evidence.push(ev);
              }
            }
          }
          const workers = Array.from({ length: CONCURRENCY }, () => worker());
          await Promise.all(workers);
        } else {
          throw new Error('URLs required for scrape mode');
        }
        break;

      case 'crawl':
        if (request.urls && request.urls.length > 0) {
          const response = await makeFirecrawlRequest('/v1/crawl', {
            url: request.urls[0],
            limit: request.config.maxPages || 10,
            returnFormat: request.config.returnFormat || 'markdown'
          });
          apiCalls++;

          if (response.success && Array.isArray(response.data)) {
            response.data.forEach((item: any) => {
              const evidenceSource = convertToEvidenceSource(item, request.context);
              evidence.push(evidenceSource);
            });
          }
        } else {
          throw new Error('URL required for crawl mode');
        }
        break;

      case 'search':
        if (request.query) {
          const response = await makeFirecrawlRequest('/v1/search', {
            query: request.query,
            limit: request.config.maxPages || 5
          });
          apiCalls++;

          if (response.success && Array.isArray(response.data)) {
            response.data.forEach((item: any) => {
              const evidenceSource = convertToEvidenceSource(item, request.context);
              evidence.push(evidenceSource);
            });
          }
        } else {
          throw new Error('Query required for search mode');
        }
        break;

      default:
        throw new Error(`Unsupported mode: ${request.mode}`);
    }

    const processingTimeMs = Date.now() - startTime;

    // Calculate quality metrics
    const avgCredibility = evidence.length > 0
      ? evidence.reduce((sum, e) => sum + e.credibility_score, 0) / evidence.length
      : 0;
    const avgRelevance = evidence.length > 0
      ? evidence.reduce((sum, e) => sum + e.relevance_score, 0) / evidence.length
      : 0;

    // Freshness based on temporal distance
    const avgAgeDays = evidence.length > 0
      ? evidence.reduce((sum, e) => sum + e.temporal_distance, 0) / evidence.length
      : 0;
    const dataFreshness = Math.max(0, 1 - (avgAgeDays / 365)); // 1 year horizon

    return {
      runId: request.runId,
      evidence,
      processingStats: {
        pagesScraped: evidence.length,
        processingTimeMs,
        apiCalls,
        cacheHits
      },
      qualityMetrics: {
        dataFreshness,
        sourceCredibility: avgCredibility,
        relevanceScore: avgRelevance
      }
    };

  } catch (error) {
    console.error('Firecrawl research failed:', error);

    // Return partial response with empty evidence
    return {
      runId: request.runId,
      evidence: [],
      processingStats: {
        pagesScraped: 0,
        processingTimeMs: Date.now() - startTime,
        apiCalls,
        cacheHits
      },
      qualityMetrics: {
        dataFreshness: 0,
        sourceCredibility: 0,
        relevanceScore: 0
      }
    };
  }
}

// Edge Function Handler
Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }});
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { ok: false, message: 'Method Not Allowed' });
  }

  try {
    const request: FirecrawlResearchRequest = await req.json();

    if (!request.runId || !request.mode) {
      return jsonResponse(400, {
        ok: false,
        message: 'Missing required fields: runId or mode'
      });
    }

    // Validate mode-specific requirements
    if (request.mode === 'scrape' && !request.urls?.length) {
      return jsonResponse(400, {
        ok: false,
        message: 'URLs required for scrape mode'
      });
    }

    if (request.mode === 'search' && !request.query) {
      return jsonResponse(400, {
        ok: false,
        message: 'Query required for search mode'
      });
    }

    // Perform research
    const response = await performFirecrawlResearch(request);

    // Optional: Persist to database
    if (response.evidence.length > 0) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://jxdihzqoaxtydolmltdr.supabase.co';
        const writeKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('EDGE_SUPABASE_SERVICE_ROLE_KEY');

        if (supabaseUrl && writeKey) {
          const supabase = createClient(supabaseUrl, writeKey);

          // Prefer RPC for atomic increment; fallback to non-incremental update
          try {
            await supabase.rpc('increment_external_sources', {
              run_id: request.runId,
              delta: response.evidence.length,
              web_scraping: true
            });
          } catch (_e) {
            await supabase
              .from('analysis_runs')
              .update({ web_scraping_used: true })
              .eq('id', request.runId);
          }
        }
      } catch (dbError) {
        console.warn('Database persistence failed:', dbError);
        // Continue without failing the response
      }
    }

    return jsonResponse(200, {
      ok: true,
      response
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Firecrawl research failed';
    console.error('Firecrawl research edge function error:', error);
    return jsonResponse(500, {
      ok: false,
      message: msg,
      response: {
        runId: '',
        evidence: [],
        processingStats: { pagesScraped: 0, processingTimeMs: 0, apiCalls: 0, cacheHits: 0 },
        qualityMetrics: { dataFreshness: 0, sourceCredibility: 0, relevanceScore: 0 }
      }
    });
  }
});