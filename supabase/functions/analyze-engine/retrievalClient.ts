import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  cacheRetrievalResults as cacheNormalizedRetrievals,
  getCachedRetrievals as getNormalizedCachedRetrievals,
  isEvidenceBackedRetrievals,
  persistRankedEvidence,
  rankAndGroundEvidence,
  runRetrievalStack,
  summarizeEvidenceItems,
  summarizeProviderRuns,
  toLegacyRetrievals,
  type RetrievalProviderRun,
} from '../_shared/retrieval-stack-exa.ts'

const SUPABASE_PROJECT_REF = Deno.env.get('SUPABASE_PROJECT_REF')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || (SUPABASE_PROJECT_REF ? `https://${SUPABASE_PROJECT_REF}.supabase.co` : undefined)!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('EDGE_SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function inferDomain(query: string) {
  const normalized = query.toLowerCase()
  if (/(gold|oil|bitcoin|crypto|supply chain|procurement|tariff|rare earth|pharmaceutical)/.test(normalized)) {
    return 'commodity_procurement'
  }
  if (/(nato|troop|sanction|russia|china|india|military|security|trade war|diplomatic)/.test(normalized)) {
    return 'geopolitics'
  }
  return 'all'
}

export function shouldBypassCache(query: string, _entities: string[], forceFresh?: boolean, audience?: string): boolean {
  if (forceFresh) return true
  if (audience === 'market' || audience === 'student' || audience === 'personal') return true
  return /\b(today|current|latest|breaking|live|now|recent|spot price)\b/i.test(query)
}

export async function cacheRetrievalResults(queryHash: string, results: any[], _ttlSeconds?: number, query?: string, audience?: string): Promise<void> {
  await cacheNormalizedRetrievals(
    supabase,
    queryHash,
    results.map((entry) => ({
      id: String(entry.id || crypto.randomUUID()),
      provider: String(entry.source || entry.provider || 'unknown'),
      title: String(entry.title || entry.url || 'retrieval'),
      content: String(entry.snippet || ''),
      url: entry.url || undefined,
      source_type: 'web',
      relevance_score: Number(entry.score || 0.5),
      credibility_score: Number(entry.credibility_score || entry.score || 0.5),
      temporal_distance: Number(entry.temporal_distance || 30),
      query_variant: 'canonical_query',
      passage_excerpt: String(entry.snippet || '').slice(0, 300),
    })),
    query,
    audience,
  )
}

export async function getCachedRetrievals(queryHash: string): Promise<any[]> {
  const cached = await getNormalizedCachedRetrievals(supabase, queryHash)
  return toLegacyRetrievals(cached)
}

export async function fetchAllRetrievals(opts: {
  query: string
  entities: string[]
  timeoutMs?: number
  requiredSources?: string[]
  forceFresh?: boolean
  audience?: string
  requestId?: string | null
  queryHash?: string
}): Promise<{
  retrievals: any[]
  cache_hit: boolean
  retrieval_count: number
  provider_runs: RetrievalProviderRun[]
  distinct_provider_count: number
  retrieval_provider_summary: ReturnType<typeof summarizeProviderRuns>
  evidence_backed: boolean
}> {
  const result = await runRetrievalStack({
    admin: supabase,
    requestId: opts.requestId || null,
    query: opts.query,
    entities: opts.entities,
    audience: opts.audience,
    includeAcademic: true,
    includeNews: true,
    includeFirecrawl: true,
    includeOfficial: true,
    maxSources: 8,
    forceFresh: opts.forceFresh,
    queryHash: opts.queryHash,
    domain: inferDomain(opts.query),
  })

  const ranked = await rankAndGroundEvidence(result.evidence, inferDomain(opts.query))
  const persisted = ranked.length
    ? await persistRankedEvidence(supabase, opts.query, ranked)
    : { evidence: ranked, groundedEntities: [] }
  const retrievals = toLegacyRetrievals(persisted.evidence)

  return {
    retrievals,
    cache_hit: result.cacheHit,
    retrieval_count: retrievals.length,
    provider_runs: result.providerRuns,
    distinct_provider_count: result.distinctProviderCount,
    retrieval_provider_summary: result.providerRuns.length
      ? summarizeProviderRuns(result.providerRuns)
      : summarizeEvidenceItems(persisted.evidence),
    evidence_backed: isEvidenceBackedRetrievals(persisted.evidence),
  }
}
