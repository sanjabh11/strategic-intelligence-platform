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
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.')
}

if (process.env.RUN_LIVE_MARKET_SMOKE !== 'true') {
  console.log('Skipping live market smoke check. Set RUN_LIVE_MARKET_SMOKE=true to execute it.')
  process.exit(0)
}

let response
try {
  response = await fetch(`${supabaseUrl}/functions/v1/market-stream`, {
    signal: AbortSignal.timeout(15000),
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json'
    }
  })
} catch (error) {
  if (error instanceof Error && error.name === 'TimeoutError') {
    throw new Error('market-stream timed out after 15s. The hosted function is stale, unresponsive, or blocked upstream.')
  }
  throw error
}

const payload = await response.json().catch(() => null)

if (!response.ok) {
  throw new Error(`market-stream failed with HTTP ${response.status}: ${JSON.stringify(payload)}`)
}

const provider = payload?.provider
const prices = Array.isArray(payload?.market_data) ? payload.market_data : []
const gold = prices.find((asset) => asset?.asset === 'Gold') ?? null

if (!provider || typeof provider !== 'object') {
  throw new Error('market-stream returned no provider diagnostics. The hosted function is stale or malformed.')
}

if (provider.mode === 'simulated') {
  throw new Error(`market-stream is still running in simulated mode: ${JSON.stringify(provider)}`)
}

if (!Array.isArray(prices)) {
  throw new Error('market-stream returned malformed market_data.')
}

console.log(JSON.stringify({
  success: payload?.success === true,
  assets_count: prices.length,
  gold_available: Boolean(gold),
  gold_price: gold?.price ?? null,
  provider
}, null, 2))
