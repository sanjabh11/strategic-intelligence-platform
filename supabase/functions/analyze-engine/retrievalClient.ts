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

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const PERPLEXITY_KEY = Deno.env.get('PERPLEXITY_KEY') ?? ""
const UNCOMTRADE_BASE = Deno.env.get('UNCOMTRADE_BASE') || "https://comtrade.un.org/api/get"
const WORLD_BANK_BASE = Deno.env.get('WORLD_BANK_BASE') || "https://api.worldbank.org/v2"
const GDELT_BASE = Deno.env.get('GDELT_BASE') || "https://api.gdeltproject.org/api/v2/doc/doc"

// Circuit breaker state management
async function getCircuitBreakerState(serviceName: string) {
  const { data } = await supabase
    .from('circuit_breaker')
    .select('state, fail_count, last_failure, cooldown_until')
    .eq('service_name', serviceName)
    .single()

  if (data?.cooldown_until) {
    const now = new Date().toISOString()
    if (now < data.cooldown_until) {
      // Cooldown still active, keep in open state
      return {
        ...data,
        state: 'open'
      }
    } else {
      // Cooldown expired, allow half-open state
      return {
        ...data,
        state: 'half'
      }
    }
  }

  return data
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
        service_name: serviceName,
        state: 'closed',
        fail_count: 0,
        last_failure: null,
        cooldown_until: null
      }, { onConflict: 'service_name' })
  } else {
    // Increment failure count
    const newFailCount = (current.fail_count || 0) + 1
    let newState: string
    let cooldownUntil: string | null = null

    if (newFailCount >= 5) {
      newState = 'open'
      // Set cooldown for 60 seconds after the fifth failure
      cooldownUntil = new Date(nowTimestamp + 60 * 1000).toISOString()
    } else {
      newState = 'half'
    }

    await supabase
      .from('circuit_breaker')
      .upsert({
        service_name: serviceName,
        state: newState,
        fail_count: newFailCount,
        last_failure: now,
        cooldown_until: cooldownUntil
      }, { onConflict: 'service_name' })
  }
}

// Retry helper with exponential backoff and connection resilience
async function retry<T>(fn: () => Promise<T>, serviceName: string, maxRetries = 3): Promise<T | null> {
  const breaker = await getCircuitBreakerState(serviceName)
  if (breaker?.state === 'open') {
    console.warn(`Circuit breaker open for ${serviceName}, skipping`)
    return null
  }

  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await fn()
      await updateCircuitBreaker(serviceName, true)
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
    const results = parsed.choices?.[0]?.message?.content || parsed.results || []

    const hits = (Array.isArray(results) ? results : []).map((r: any, idx: number) => ({
      source: "perplexity",
      url: r.url,
      snippet: r.snippet || r.summary || r.excerpt || '',
      score: r.score || 0.5,
      retrieved_at: new Date().toISOString()
    }))

    return hits
  }, 'perplexity') || []
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
    const results = await Promise.race([
      Promise.all(tasks),
      timeoutPromise
    ])

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