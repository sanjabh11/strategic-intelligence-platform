import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

function loadEnvFile(filepath) {
  if (!fs.existsSync(filepath)) return {}
  const content = fs.readFileSync(filepath, 'utf8')
  const entries = {}
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator === -1) continue
    entries[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim()
  }
  return entries
}

const env = { ...loadEnvFile(path.resolve(process.cwd(), '.env')), ...process.env }
const supabaseUrl = env.VITE_SUPABASE_URL
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY
const dbUrl = env.SUPABASE_DB_URL

if (!supabaseUrl || !serviceRoleKey || !dbUrl) {
  throw new Error('Missing VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_DB_URL.')
}

const canaries = [
  'NATO burden sharing and US troop withdrawal consequences for Europe, Russia, and China',
  'China rare-earth export restrictions and downstream EV supply-chain bargaining',
  'India-US tariff retaliation and pharmaceutical procurement strategy',
]

function queryCount(sql) {
  return Number(execSync(`psql "${dbUrl}" -t -A -c "${sql}"`, { encoding: 'utf8' }).trim() || '0')
}

const beforeRetrievals = queryCount('select count(*) from public.retrievals;')
const beforeCache = queryCount('select count(*) from public.retrieval_cache;')

const providerStatusCounts = new Map()

for (let index = 0; index < canaries.length; index++) {
  const scenario = canaries[index]
  const response = await fetch(`${supabaseUrl}/functions/v1/evidence-retrieval-exa`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
    body: JSON.stringify({
      runId: crypto.randomUUID(),
      query: scenario,
      contextualFactors: {
        domain: index === 1 || index === 2 ? 'commodity_procurement' : 'geopolitics',
        stakeholders: scenario.match(/\b(USA?|China|India|Russia|Europe|NATO)\b/gi) || [],
        temporalScope: { start: '2024-01-01', end: '2026-12-31' },
        confidenceThreshold: 0.45,
      },
      sourceConfig: {
        include_exa: true,
        include_academic: true,
        include_news: true,
        include_firecrawl: true,
        maxSources: 8,
      },
    }),
  })

  const payload = await response.json()
  if (!response.ok || !payload?.ok || !payload?.response) {
    throw new Error(`evidence-retrieval-exa failed for canary ${index + 1}: ${JSON.stringify(payload)}`)
  }

  const evidenceSet = Array.isArray(payload.response.evidence_set) ? payload.response.evidence_set : []
  const diagnostics = payload.response.provider_diagnostics
  if (evidenceSet.length < 3) {
    throw new Error(`canary ${index + 1} returned fewer than 3 normalized sources: ${JSON.stringify(diagnostics)}`)
  }

  if (!diagnostics || !Array.isArray(diagnostics.statuses)) {
    throw new Error(`canary ${index + 1} missing provider diagnostics`)
  }

  for (const status of diagnostics.statuses) {
    const key = `${status.provider}:${status.status}`
    providerStatusCounts.set(key, (providerStatusCounts.get(key) || 0) + 1)
  }
}

const afterRetrievals = queryCount('select count(*) from public.retrievals;')
const afterCache = queryCount('select count(*) from public.retrieval_cache;')

if (afterRetrievals <= beforeRetrievals) {
  throw new Error(`retrievals did not grow. before=${beforeRetrievals} after=${afterRetrievals}`)
}

if (afterCache <= 0) {
  throw new Error(`retrieval_cache is empty after hosted smoke. before=${beforeCache} after=${afterCache}`)
}

console.log(JSON.stringify({
  before_retrievals: beforeRetrievals,
  after_retrievals: afterRetrievals,
  before_cache: beforeCache,
  after_cache: afterCache,
  cache_changed: afterCache !== beforeCache,
  provider_status_counts: Object.fromEntries(providerStatusCounts.entries()),
}, null, 2))
