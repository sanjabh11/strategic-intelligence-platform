// retrievalClient.ts - Streaming retrieval architecture for Ph4.md
// Implements parallel API calls to UN Comtrade, World Bank, IMF, GDELT, and Perplexity
// Deno runtime compatible

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Simple hash function for query hashing
function simpleHash(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

// Simple UUID generator
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Google Programmable Search (CSE)
export async function fetchGoogleCSE(query: string): Promise<any[]> {
  if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) return []

  return await retry(async () => {
    const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}&cx=${GOOGLE_CSE_ID}`
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) throw new Error(`Google CSE HTTP ${res.status}`)
    const data = await res.json()
    const items = Array.isArray(data?.items) ? data.items.slice(0, 5) : []
    return items.map((it: any) => ({
      id: uuid(),
      source: 'google_cse',
      url: it.link,
      snippet: it.snippet || it.title || '',
      score: 0.65,
      retrieved_at: new Date().toISOString()
    }))
  }, 'google_cse') || []
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Accept PERPLEXITY_API_KEY (preferred), EDGE_PERPLEXITY_API_KEY (supported), and PERPLEXITY_KEY (legacy)
const PERPLEXITY_KEY = Deno.env.get('PERPLEXITY_API_KEY')
  ?? Deno.env.get('EDGE_PERPLEXITY_API_KEY')
  ?? Deno.env.get('PERPLEXITY_KEY')
  ?? ""
const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY') ?? ""
const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY') ?? Deno.env.get('GOOGLE_SEARCH_API_KEY') ?? ""
const GOOGLE_CSE_ID = Deno.env.get('GOOGLE_CSE_ID') ?? Deno.env.get('GOOGLE_CX') ?? ""
const UNCOMTRADE_BASE = Deno.env.get('UNCOMTRADE_BASE') || "https://comtrade.un.org/api/get"
const WORLD_BANK_BASE = Deno.env.get('WORLD_BANK_BASE') || "https://api.worldbank.org/v2"
const GDELT_BASE = Deno.env.get('GDELT_BASE') || "https://api.gdeltproject.org/api/v2/doc/doc"
// Circuit breaker state management
async function getCircuitBreakerState(serviceName: string) {
  const { data } = await supabase
    .from('circuit_breaker')
    .select('*')
    .eq('provider', serviceName)
    .single()

  if (data?.opened_until) {
    const now = new Date().toISOString()
    if (now < data.opened_until) {
      // Cooldown still active, keep in open state
      return {
        ...data,
        state: 'open',
        fail_count: data.consecutive_failures
      }
    } else {
      // Cooldown expired, allow half-open state
      return {
        ...data,
        state: 'half',
        fail_count: data.consecutive_failures
      }
    }
  }

  return data ? { ...data, state: 'closed', fail_count: data.consecutive_failures || 0 } : null
}

async function updateCircuitBreaker(serviceName: string, success: boolean) {
  const now = new Date().toISOString()
  const nowTimestamp = Date.now()

  const current = await getCircuitBreakerState(serviceName) || { state: 'closed', fail_count: 0 }

  if (success) {
    // Reset on success
    await supabase
      .from('circuit_breaker')
      .upsert({
        provider: serviceName,
        consecutive_failures: 0,
        opened_until: null
      }, { onConflict: 'provider' })
  } else {
    // Increment failure count
    const newFailCount = (current.fail_count || 0) + 1
    let openedUntil: string | null = null

    if (newFailCount >= 5) {
      // Set cooldown for 60 seconds after the fifth failure
      openedUntil = new Date(nowTimestamp + 60 * 1000).toISOString()
    }

    await supabase
      .from('circuit_breaker')
      .upsert({
        provider: serviceName,
        consecutive_failures: newFailCount,
        opened_until: openedUntil
      }, { onConflict: 'provider' })
  }
}

// Retry helper with exponential backoff and connection resilience
async function retry<T>(fn: () => Promise<T>, serviceName: string, maxRetries = 3): Promise<T | null> {
  // TEMPORARILY BYPASS CIRCUIT BREAKER FOR DEBUGGING
  console.log(`[retry] Calling ${serviceName}`)
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await fn()
      console.log(`[retry] ${serviceName} succeeded`)
      return result
    } catch (error: any) {
      // Classify error types for better handling
      const errorMessage = error?.message || String(error)
      const isConnectionError = errorMessage.includes('ECONNREFUSED') ||
                               errorMessage.includes('ENOTFOUND') ||
                               errorMessage.includes('ETIMEDOUT') ||
                               errorMessage.includes('timeout') ||
                               errorMessage.includes('network') ||
                               errorMessage.includes('connection')

      const isRateLimitError = errorMessage.includes('429') ||
                              errorMessage.includes('rate limit') ||
                              errorMessage.includes('quota')

      const isServerError = errorMessage.includes('5') ||
                           errorMessage.includes('server error')

      console.warn(`${serviceName} attempt ${i + 1} failed:`, errorMessage)

      // For rate limits, mark as failure but with different handling
      if (isRateLimitError || isServerError) {
        await updateCircuitBreaker(serviceName, false)
      }

      if (i < maxRetries - 1) {
        // Adjust delay based on error type
        let baseDelay = 300
        if (isConnectionError) {
          baseDelay = 500 // Longer delay for connection issues
        } else if (isRateLimitError) {
          baseDelay = 2000 // Much longer for rate limits
        }

        const delay = Math.pow(2, i) * baseDelay // Exponential backoff
        console.log(`Retrying ${serviceName} in ${delay}ms after ${isConnectionError ? 'connection' : isRateLimitError ? 'rate limit' : 'other'} error`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  return null
}

// UN Comtrade API integration
export async function fetchUNComtrade(country1ISO: string, country2ISO: string, query: string): Promise<any[]> {
  return await retry(async () => {
    const nowYear = new Date().getFullYear()
    const yearsList = Array.from({ length: 5 }, (_, i) => nowYear - i).join(",")
    const url = `${UNCOMTRADE_BASE}?max=25&type=C&freq=A&px=HS&ps=${yearsList}&r=${country1ISO}&p=${country2ISO}&fmt=json`

    const response = await fetch(url, { signal: AbortSignal.timeout(2500) })
    if (!response.ok) throw new Error(`UN Comtrade HTTP ${response.status}`)

    const data = await response.json()
    const total = (data.dataset || []).reduce((acc: number, row: any) => acc + (row.TradeValue || 0), 0)

    return [{
      id: uuid(),
      source: "uncomtrade",
      url,
      snippet: `Bilateral trade (last 5 years): $${total.toLocaleString()} total value`,
      score: 0.9,
      retrieved_at: new Date().toISOString()
    }]
  }, 'uncomtrade') || []
}

// World Bank API integration
export async function fetchWorldBankIndicator(indicator: string, countryCode: string, query: string): Promise<any[]> {
  return await retry(async () => {
    const url = `${WORLD_BANK_BASE}/country/${countryCode}/indicator/${indicator}?format=json&per_page=5`

    const response = await fetch(url, { signal: AbortSignal.timeout(2500) })
    if (!response.ok) throw new Error(`World Bank HTTP ${response.status}`)

    const data = await response.json()
    const values = (data?.[1] || []).slice(0, 5).map((x: any) => ({ date: x.date, value: x.value }))

    const latestValue = values[0]?.value
    const snippet = latestValue ?
      `${indicator} for ${countryCode}: ${values.map((v: any) => `${v.date}:${v.value}`).slice(0, 3).join(", ")}` :
      `${indicator} data for ${countryCode}`

    return [{
      id: uuid(),
      source: "worldbank",
      url,
      snippet,
      score: 0.85,
      retrieved_at: new Date().toISOString()
    }]
  }, 'worldbank') || []
}

// IMF API integration (simplified - using their data portal)
export async function fetchIMFData(countryCode: string, query: string): Promise<any[]> {
  return await retry(async () => {
    // Using IMF's JSON endpoint for WEO data
    const url = `https://www.imf.org/external/datamapper/api/v1/forecasts?periods=2024,2025&countryCodes=${countryCode}`

    const response = await fetch(url, { signal: AbortSignal.timeout(2500) })
    if (!response.ok) throw new Error(`IMF HTTP ${response.status}`)

    const data = await response.json()
    const forecasts = data.values || {}

    const snippet = Object.keys(forecasts).length > 0 ?
      `IMF forecasts for ${countryCode}: ${Object.entries(forecasts).slice(0, 3).map(([k, v]) => `${k}:${v}`).join(", ")}` :
      `IMF economic data for ${countryCode}`

    return [{
      id: uuid(),
      source: "imf",
      url,
      snippet,
      score: 0.8,
      retrieved_at: new Date().toISOString()
    }]
  }, 'imf') || []
}

// GDELT API integration
export async function fetchGDELT(query: string): Promise<any[]> {
  return await retry(async () => {
    const searchQuery = encodeURIComponent(query)
    const url = `${GDELT_BASE}?query=${searchQuery}&mode=artlist&format=json`

    const response = await fetch(url, { signal: AbortSignal.timeout(2500) })
    if (!response.ok) throw new Error(`GDELT HTTP ${response.status}`)

    const data = await response.json()
    const articles = (data.articles || []).slice(0, 3).map((a: any) => ({
      id: uuid(),
      source: "gdelt",
      url: a.url || a.document_url,
      snippet: (a.summary || a.segments || "").slice(0, 300),
      score: 0.7,
      retrieved_at: new Date().toISOString()
    }))

    return articles
  }, 'gdelt') || []
}

// Perplexity integration (existing)
export async function fetchPerplexity(query: string): Promise<any[]> {
  if (!PERPLEXITY_KEY) return []

  return await retry(async () => {
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
      signal: AbortSignal.timeout(4000)
    })

    const text = await response.text()
    const parsed = JSON.parse(text)
    
    // Perplexity API returns: { citations: [...], choices: [{message: {content: "text"}}] }
    const citations = parsed.citations || []
    const messageContent = parsed.choices?.[0]?.message?.content || ''

    const hits = citations.map((url: string, idx: number) => ({
      id: `pplx_${Date.now()}_${idx}`,
      source: "perplexity",
      url: url,
      snippet: messageContent.slice(idx * 150, (idx + 1) * 150) || messageContent.slice(0, 200), // Extract relevant snippet
      score: 0.95 - (idx * 0.05), // Decreasing score by citation order
      retrieved_at: new Date().toISOString()
    }))

    console.log(`[Perplexity] Retrieved ${hits.length} citations from response`)
    return hits
  }, 'perplexity') || []
}

// Gemini sources (prompted citations)
export async function fetchGeminiSources(query: string): Promise<any[]> {
  if (!GEMINI_KEY) return []

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Task: Find 5 authoritative, recent web sources related to the query. Return ONLY a JSON array named sources with objects: {url:string, snippet:string}.

Query: ${query}`
              }
            ]
          }
        ],
        generationConfig: { temperature: 0.2, maxOutputTokens: 512 }
      }),
      signal: AbortSignal.timeout(4000)
    })

    if (!resp.ok) throw new Error(`Gemini HTTP ${resp.status}`)
    const data = await resp.json()

    // Best-effort parsing of JSON array from text
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    let sources: any[] = []
    try {
      const match = text.match(/\[.*\]/s)
      if (match) sources = JSON.parse(match[0])
    } catch (_) {}

    return (sources || []).slice(0, 5).map((s: any) => ({
      id: uuid(),
      source: 'gemini',
      url: s.url,
      snippet: s.snippet || '',
      score: 0.6,
      retrieved_at: new Date().toISOString()
    }))
  } catch (e) {
    console.warn('Gemini sources failed:', e?.message ?? e)
    return []
  }
}

// Main orchestrator function
export async function fetchAllRetrievals(opts: {
  query: string,
  entities: string[],
  timeoutMs?: number,
  requiredSources?: string[],
  forceFresh?: boolean,
  audience?: string
}): Promise<{ retrievals: any[], cache_hit: boolean, retrieval_count: number }> {
  const { query, entities, timeoutMs = 7000, requiredSources = [], forceFresh = false, ttlSeconds, audience } = opts as any

  console.log(`Starting parallel retrievals for query: ${query}`)

  // Generate query hash for caching
  const queryHash = simpleHash(query + JSON.stringify(entities)).toString()
  let usedCache = false

  // Check if cache should be bypassed
  if (shouldBypassCache(query, entities, forceFresh, audience)) {
    console.log('Cache bypassed - fetching fresh data')
  } else {
    // Try to get cached results first
    const cachedResults = await getCachedRetrievals(queryHash)
    if (cachedResults.length > 0) {
      console.log(`Cache hit: ${cachedResults.length} cached results`)
      usedCache = true
      // Filter by quality score (minimum score of 0.5)
      const highQualityCached = cachedResults.filter(r => (r.score || 0) >= 0.5)
      return {
        retrievals: highQualityCached.slice(0, 8),
        cache_hit: true,
        retrieval_count: cachedResults.length
      }
    }
  }

  // Extract country codes from entities (simple heuristic)
  const countryCodes = entities.filter(e => e.length === 2 || e.length === 3).slice(0, 2)
  const primaryCountry = countryCodes[0] || 'USA'
  const secondaryCountry = countryCodes[1] || 'CHN'

  // Prepare parallel tasks
  const tasks: Promise<any[]>[] = []

  // Always include Perplexity
  tasks.push(fetchPerplexity(query))

  // Include Gemini prompted sources
  tasks.push(fetchGeminiSources(query))

  // Include Google CSE when configured (secondary web search)
  tasks.push(fetchGoogleCSE(query))

  // UN Comtrade for bilateral trade
  if (countryCodes.length >= 2) {
    tasks.push(fetchUNComtrade(primaryCountry, secondaryCountry, query))
  } else {
    tasks.push(Promise.resolve([]))
  }

  // World Bank for economic indicators
  if (entities.length > 0) {
    tasks.push(fetchWorldBankIndicator("NY.GDP.MKTP.CD", primaryCountry, query))
  } else {
    tasks.push(Promise.resolve([]))
  }

  // IMF for forecasts
  tasks.push(fetchIMFData(primaryCountry, query))

  // GDELT for news/events
  tasks.push(fetchGDELT(query))

  // Execute with overall timeout
  const timeoutPromise = new Promise<any[]>((_, reject) =>
    setTimeout(() => reject(new Error('Retrieval timeout')), timeoutMs)
  )

  try {
    const settled = await Promise.race([
      Promise.allSettled(tasks),
      timeoutPromise
    ])

    // Extract successful results from Promise.allSettled
    const results = settled
      .filter((s: any) => s.status === 'fulfilled')
      .map((s: any) => s.value)

    const flattened = results.flat().filter(Boolean)

    // Score and sort
    const scored = flattened.map((r: any) => ({ ...r, score: (r.score || 0.5) }))
    scored.sort((a: any, b: any) => b.score - a.score)

    // Ensure required sources are present
    for (const req of requiredSources) {
      if (!scored.some(s => s.source === req)) {
        console.warn(`Required source ${req} not found, attempting fallback`)
        // Could implement fallback logic here
      }
    }

    const topResults = scored.slice(0, 8)
    console.log(`Retrieved ${topResults.length} results from ${new Set(topResults.map(r => r.source)).size} sources`)

    // Cache the results only if we fetched fresh data
    if (!usedCache) {
      try {
        await cacheRetrievalResults(queryHash, topResults, ttlSeconds, query, audience)
      } catch (cacheError) {
        console.warn('Failed to cache results:', cacheError)
      }
    }

    return { retrievals: topResults, cache_hit: false, retrieval_count: topResults.length }
  } catch (error) {
    console.error('Retrieval orchestration failed:', error)
    return { retrievals: [], cache_hit: false, retrieval_count: 0 }
  }
}

// Determine TTL based on query type and content
function determineTTL(query: string, audience?: string): number {
  const lowerQuery = query.toLowerCase()
  
  // Real-time financial queries: 10-30 minutes
  const financialKeywords = ['price', 'stock', 'market', 'trading', 'gold', 'oil', 'bitcoin', 'crypto', 'currency', 'forex']
  if (financialKeywords.some(keyword => lowerQuery.includes(keyword))) {
    return 30 * 60 // 30 minutes in seconds
  }
  
  // Geopolitical/policy queries: 12-24 hours
  const geopoliticalKeywords = ['war', 'conflict', 'sanctions', 'election', 'treaty', 'diplomatic', 'military']
  if (geopoliticalKeywords.some(keyword => lowerQuery.includes(keyword))) {
    return 12 * 60 * 60 // 12 hours in seconds
  }
  
  // Market audience: 30 minutes
  if (audience === 'market') {
    return 30 * 60 // 30 minutes
  }
  
  // Student/personal audiences: 1 hour
  if (audience === 'student' || audience === 'personal') {
    return 60 * 60 // 1 hour
  }
  
  // Educational content: 7 days (default)
  return 7 * 24 * 60 * 60 // 7 days in seconds
}

// Cache retrieval results
export async function cacheRetrievalResults(queryHash: string, results: any[], ttlSeconds?: number, query?: string, audience?: string): Promise<void> {
  if (!results.length) return

  // Use provided TTL or determine based on query type
  const finalTTL = ttlSeconds || determineTTL(query || '', audience)
  const ttlDate = new Date(Date.now() + finalTTL * 1000)

  const cacheEntries = results.map(result => ({
    query_hash: queryHash,
    source: result.source,
    url: result.url,
    snippet: result.snippet,
    score: result.score,
    retrieved_at: result.retrieved_at || new Date().toISOString(),
    ttl: ttlDate.toISOString()
  }))

  const { error } = await supabase
    .from('retrieval_cache')
    .insert(cacheEntries)

  if (error) {
    console.error('Failed to cache retrieval results:', error)
  } else {
    console.log(`Cached ${cacheEntries.length} retrieval results with TTL: ${ttlDate.toISOString()}`)
  }
}

// Check if cache should be bypassed based on query characteristics
function shouldBypassCache(query: string, entities: string[], forceFresh?: boolean, audience?: string): boolean {
  // Force fresh flag overrides all caching
  if (forceFresh) {
    console.log('Bypassing cache due to forceFresh flag')
    return true
  }

  // Audience-based bypass for real-time sensitive audiences
  const bypassAudiences = ['student', 'personal', 'market']
  if (audience && bypassAudiences.includes(audience)) {
    console.log(`Bypassing cache due to audience type: ${audience}`)
    return true
  }

  // Comprehensive real-time keywords that indicate fresh data is needed
  const realTimeKeywords = [
    'today', 'current', 'latest', 'breaking', 'live', 'now', 'recent',
    'breaking news', 'just in', 'hours ago', 'minutes ago', 'seconds ago',
    'this week', 'this month', 'this quarter', 'ytd', 'year to date',
    'price', 'tariff', 'just announced', 'newly released', 'updated',
    'real-time', 'realtime', 'up-to-date', 'up to date', 'fresh',
    'immediate', 'instant', 'current price', 'current rate', 'current value'
  ]

  const lowerQuery = query.toLowerCase()
  const matchedKeywords = realTimeKeywords.filter(keyword => lowerQuery.includes(keyword))
  if (matchedKeywords.length > 0) {
    console.log('Bypassing cache due to real-time keywords:', matchedKeywords)
    return true
  }

  // Enhanced financial market keywords requiring fresh data
  const financialKeywords = [
    'stocks', 'shares', 'equities', 'bonds', 'commodities', 'forex', 'currency',
    'exchange', 'markets', 'trading', 'volatility', 'crisis', 'price', 'prices',
    'gold', 'silver', 'oil', 'bitcoin', 'crypto', 'trading', 'investment',
    'portfolio', 'returns', 'yield', 'interest rate', 'fed', 'federal reserve',
    'stock market', 'market cap', 'valuation', 'earnings', 'revenue'
  ]
  
  if (financialKeywords.some(keyword => lowerQuery.includes(keyword))) {
    console.log('Bypassing cache due to financial market keywords')
    return true
  }

  // Enhanced geopolitical events or news
  const geopoliticalKeywords = [
    'war', 'conflict', 'military', 'sanctions', 'election', 'elections', 'referendum',
    'voting', 'poll', 'crisis', 'protest', 'riot', 'uprising', 'diplomatic', 'treaty',
    'agreement', 'negotiation', 'diplomacy', 'foreign policy', 'international',
    'bilateral', 'multilateral', 'summit', 'conference', 'resolution', 'veto'
  ]
  
  if (geopoliticalKeywords.some(keyword => lowerQuery.includes(keyword))) {
    console.log('Bypassing cache due to geopolitical keywords')
    return true
  }

  return false
}

// Retrieve from cache
export async function getCachedRetrievals(queryHash: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('retrieval_cache')
    .select('*')
    .eq('query_hash', queryHash)
    .gt('ttl', new Date().toISOString())

  if (error) {
    console.error('Failed to retrieve cached results:', error)
    return []
  }

  return data || []
}