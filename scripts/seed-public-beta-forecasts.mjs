import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

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

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

const LAUNCH_TAG = 'public-beta-launch-v1'
const CURATOR_EMAIL = 'public-beta-curator@strategic-intelligence.local'
const CURATOR_PASSWORD = `PublicBeta!${crypto.randomUUID().slice(0, 8)}`

const candidateScenarios = [
  {
    category: 'geopolitical',
    title: 'Will tensions between the biggest powers cool down or break wider?',
    scenario: 'Will there be a major war between big powers in the next few years, or will tensions cool down?',
    tags: ['citizen-questions', 'geopolitical', 'great-power-war', 'security']
  },
  {
    category: 'geopolitical',
    title: 'Will the Middle East move toward wider war or a more stable peace?',
    scenario: 'Will the conflict in the Middle East including Israel Iran and their allies escalate, or move toward a stable peace?',
    tags: ['citizen-questions', 'geopolitical', 'middle-east', 'conflict']
  },
  {
    category: 'social',
    title: 'Will India stay politically stable over the next 18 months?',
    scenario: 'Will my country stay politically stable, or are we heading toward serious unrest, protests, or leadership changes?\n\nUser context:\nCountry: India',
    tags: ['citizen-questions', 'politics', 'india', 'stability']
  },
  {
    category: 'social',
    title: 'Will Brazil stay politically stable over the next 18 months?',
    scenario: 'Will my country stay politically stable, or are we heading toward serious unrest, protests, or leadership changes?\n\nUser context:\nCountry: Brazil',
    tags: ['citizen-questions', 'politics', 'brazil', 'stability']
  },
  {
    category: 'economic',
    title: 'Will the world economy avoid a deep recession?',
    scenario: 'Will the global economy enter a recession, or will growth remain strong over the next few years?',
    tags: ['citizen-questions', 'macroeconomy', 'recession', 'growth']
  },
  {
    category: 'financial',
    title: 'Are stocks or defensive assets safer over the next year?',
    scenario: 'Will stock markets go up or down in the next year, and is it safer to keep money in stocks, cash, or something else?\n\nUser context:\nPreferred time horizon: 12 months\nRisk tolerance: Medium\nCountry or currency context: US dollar',
    tags: ['citizen-questions', 'markets', 'asset-allocation', 'stocks']
  },
  {
    category: 'financial',
    title: 'Will gold and safe assets become more valuable from here?',
    scenario: 'Will gold and other safe assets become much more valuable, or will they lose value compared with today?',
    tags: ['citizen-questions', 'gold', 'safe-haven', 'financial']
  },
  {
    category: 'economic',
    title: 'Will inflation calm down or stay unstable?',
    scenario: 'Will inflation stay high, fall back to normal, or swing unpredictably in the near future?',
    tags: ['citizen-questions', 'inflation', 'macro', 'cost-of-living']
  },
  {
    category: 'social',
    title: 'Will extreme weather risk worsen in South Asia over the next decade?',
    scenario: 'Will climate change make extreme weather events like floods heatwaves and storms significantly worse where I live in the coming decade?\n\nUser context:\nLocation: South Asia',
    tags: ['citizen-questions', 'climate', 'south-asia', 'weather']
  },
  {
    category: 'geopolitical',
    title: 'Could a major natural disaster disrupt trade and daily life?',
    scenario: 'Will there be a major natural disaster such as a devastating earthquake volcanic eruption or mega-storm that disrupts global trade or daily life?',
    tags: ['citizen-questions', 'disaster', 'trade', 'global-risk']
  },
  {
    category: 'technology',
    title: 'Will AI improve lives broadly or raise inequality faster?',
    scenario: 'Will new technologies like AI and automation improve most people lives, or increase inequality unemployment and social tension?',
    tags: ['citizen-questions', 'ai', 'automation', 'society']
  },
  {
    category: 'geopolitical',
    title: 'Will US-China rivalry stay contained or deepen into a broader shock?',
    scenario: 'Will tensions between the United States and China stay contained, or escalate into a broader technology trade and security shock over the next few years?',
    tags: ['citizen-questions', 'us-china', 'trade', 'technology']
  },
  {
    category: 'economic',
    title: 'Will household cost pressure stay volatile because of energy and shipping shocks?',
    scenario: 'Will energy and shipping shocks keep household costs and consumer inflation volatile over the next 18 months?',
    tags: ['citizen-questions', 'energy', 'shipping', 'inflation']
  }
]

async function ensureCuratorUser() {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw new Error(`Failed to list auth users: ${error.message}`)

  const existing = data.users.find((user) => user.email?.toLowerCase() === CURATOR_EMAIL.toLowerCase())
  if (existing) return existing.id

  const created = await supabaseAdmin.auth.admin.createUser({
    email: CURATOR_EMAIL,
    password: CURATOR_PASSWORD,
    email_confirm: true,
    user_metadata: {
      role: 'internal_public_beta_curator'
    }
  })

  if (created.error || !created.data.user?.id) {
    throw new Error(`Failed to create curator user: ${created.error?.message || 'unknown error'}`)
  }

  return created.data.user.id
}

async function callHostedFunction(functionName, body, { method = 'POST' } = {}) {
  const url = new URL(`${supabaseUrl}/functions/v1/${functionName}`)
  let requestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey
    }
  }

  if (method !== 'GET') {
    requestInit.body = JSON.stringify(body)
  } else if (body) {
    for (const [key, value] of Object.entries(body)) {
      url.searchParams.set(key, String(value))
    }
  }

  const response = await fetch(url, requestInit)
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(`${functionName} failed with HTTP ${response.status}: ${JSON.stringify(payload)}`)
  }
  return payload
}

async function resolveAnalysisRunId(candidate, hintedId) {
  const { data, error } = await supabaseAdmin
    .from('analysis_runs')
    .select('id, created_at, analysis_json')
    .order('created_at', { ascending: false })
    .limit(60)

  if (error) {
    throw new Error(`Failed to load recent analysis runs: ${error.message}`)
  }

  const cutoffMs = Date.now() - (20 * 60 * 1000)
  const match = (data || []).find((row) => {
    const createdAtMs = new Date(row.created_at || 0).getTime()
    const scenarioText = row.analysis_json?.scenario_text
    return createdAtMs >= cutoffMs && scenarioText === candidate.scenario
  })

  if (match?.id) return match.id
  if (hintedId) return hintedId

  throw new Error(`Unable to resolve analysis_runs.id for "${candidate.title}".`)
}

function buildDescription(analysis, multiAgentForecast, candidate) {
  const summary = analysis?.summary?.text || analysis?.scenario_text || candidate.scenario
  const champion = multiAgentForecast.consensus.champion
  const adversarial = multiAgentForecast.adversarialReview
  const publicAnswer = multiAgentForecast.publicAnswer

  return [
    publicAnswer?.direct_answer || summary,
    `Best current call: ${publicAnswer?.best_current_call || multiAgentForecast.question.question}`,
    `Why this is the call: ${publicAnswer?.why_this_is_the_call || summary}`,
    `Primary caution: ${publicAnswer?.what_could_change_it || adversarial.contradictionPoints[0] || adversarial.missingEvidence[0] || adversarial.recommendation}`,
    `What to do next: ${publicAnswer?.what_to_do_next || 'Treat this as a decision aid, not a certainty.'}`,
    `Current public probability: ${(champion.calibratedProbability * 100).toFixed(1)}%.`
  ].join('\n\n')
}

function buildForecastPayload(candidate, analysisRunId, analysis, multiAgentForecast) {
  const champion = multiAgentForecast.consensus.champion
  const providerSummary = analysis?.provenance?.retrieval_provider_summary ?? null
  const retrievalCount = Number(analysis?.provenance?.retrieval_count || analysis?.retrieval_count || analysis?.retrievals?.length || 0)

  return {
    creator_id: null,
    title: candidate.title,
    description: buildDescription(analysis, multiAgentForecast, candidate),
    category: candidate.category,
    question: multiAgentForecast.question.question,
    resolution_criteria: [
      multiAgentForecast.question.resolutionCriteria,
      `Primary source: ${multiAgentForecast.question.resolutionSource}.`,
      `Fallback source: ${multiAgentForecast.question.fallbackResolution}.`
    ].join(' '),
    resolution_date: multiAgentForecast.question.closeTime,
    current_probability: champion.calibratedProbability,
    analysis_run_id: analysisRunId,
    game_theory_model: {
      source: LAUNCH_TAG,
      seed_metadata: {
        seeded_at: new Date().toISOString(),
        launch_wave: 'broad-external-beta-v1',
        candidate_title: candidate.title
      },
      multi_agent_forecast: multiAgentForecast,
      public_answer: multiAgentForecast.publicAnswer || null,
      provenance: analysis?.provenance ?? null,
      retrieval_provider_summary: providerSummary,
      retrieval_count: retrievalCount
    },
    tags: [...candidate.tags, 'public-beta-launch', LAUNCH_TAG],
    is_public: true,
    prediction_count: 0
  }
}

async function seedInitialPrediction(curatorId, forecastId, multiAgentForecast) {
  const champion = multiAgentForecast.consensus.champion
  const publicAnswer = multiAgentForecast.publicAnswer

  const { error: predictionError } = await supabaseAdmin
    .from('forecast_predictions')
    .insert({
      forecast_id: forecastId,
      user_id: curatorId,
      probability: champion.calibratedProbability,
      confidence: champion.confidence,
      reasoning: publicAnswer?.direct_answer || multiAgentForecast.adversarialReview.recommendation || 'Seeded from hosted evidence-backed launch analysis.',
      is_public: false
    })

  if (predictionError) {
    throw new Error(`Failed to seed initial prediction for forecast ${forecastId}: ${predictionError.message}`)
  }

  const { error: rpcError } = await supabaseAdmin.rpc('update_forecast_probability', { p_forecast_id: forecastId })
  if (rpcError) {
    throw new Error(`Failed to refresh aggregate probability for forecast ${forecastId}: ${rpcError.message}`)
  }
}

async function cleanupExistingLaunchForecasts(curatorId) {
  const { data, error } = await supabaseAdmin
    .from('forecasts')
    .select('id, tags')
    .eq('creator_id', curatorId)

  if (error) throw new Error(`Failed to load existing forecasts: ${error.message}`)

  const idsToDelete = (data || [])
    .filter((row) => Array.isArray(row.tags) && row.tags.includes(LAUNCH_TAG))
    .map((row) => row.id)

  if (idsToDelete.length === 0) return 0

  const { error: deleteError } = await supabaseAdmin
    .from('forecasts')
    .delete()
    .in('id', idsToDelete)

  if (deleteError) throw new Error(`Failed to delete existing launch forecasts: ${deleteError.message}`)
  return idsToDelete.length
}

async function findExistingEvidenceBackedAnalysis(candidate) {
  const { data, error } = await supabaseAdmin
    .from('analysis_runs')
    .select('id, created_at, analysis_json')
    .order('created_at', { ascending: false })
    .limit(250)

  if (error) {
    throw new Error(`Failed to inspect recent analysis runs: ${error.message}`)
  }

  return (data || []).find((row) => {
    const scenarioText = row.analysis_json?.scenario_text
    const provenance = row.analysis_json?.provenance
    const retrievalCount = Number(provenance?.retrieval_count || row.analysis_json?.retrieval_count || row.analysis_json?.retrievals?.length || 0)
    const evidenceBacked = provenance?.evidence_backed === true
    const distinctProviderCount = Number(provenance?.retrieval_provider_summary?.distinctProviderCount || 0)

    return scenarioText === candidate.scenario
      && evidenceBacked
      && retrievalCount >= 3
      && distinctProviderCount >= 2
  }) || null
}

async function createForecast(curatorId, candidate) {
  const existingAnalysis = await findExistingEvidenceBackedAnalysis(candidate)
  let analysisRunId = existingAnalysis?.id || null
  let analysis = existingAnalysis?.analysis_json || null

  if (!analysisRunId || !analysis) {
    const analyzePayload = await callHostedFunction('analyze-engine', {
      runId: `public-beta-seed-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      scenario_text: candidate.scenario,
      audience: 'researcher',
      mode: 'standard'
    })

    if (!analyzePayload?.ok || !analyzePayload?.analysis) {
      throw new Error(`Hosted analysis failed for "${candidate.title}": ${JSON.stringify(analyzePayload)}`)
    }

    analysis = analyzePayload.analysis
    analysisRunId = await resolveAnalysisRunId(
      candidate,
      analyzePayload.analysis_run_id || analyzePayload.analysis_id || analyzePayload.request_id || null
    )
    if (!analysisRunId) {
      throw new Error(`Hosted analysis returned no run identifier for "${candidate.title}".`)
    }
  }

  const retrievalCount = Number(analysis?.provenance?.retrieval_count || analysis?.retrieval_count || analysis?.retrievals?.length || 0)
  const evidenceBacked = analysis?.provenance?.evidence_backed === true
  const distinctProviderCount = Number(analysis?.provenance?.retrieval_provider_summary?.distinctProviderCount || 0)

  if (!evidenceBacked || retrievalCount < 3 || distinctProviderCount < 2) {
    throw new Error(
      `Hosted analysis for "${candidate.title}" did not clear the launch gate. evidence_backed=${evidenceBacked} retrieval_count=${retrievalCount} providers=${distinctProviderCount}`
    )
  }

  const hydrated = await callHostedFunction('analysis-hydrator', { analysis_run_id: analysisRunId }, { method: 'GET' })
  if (!hydrated?.ok || !hydrated?.analysis) {
    throw new Error(`analysis-hydrator failed for "${candidate.title}": ${JSON.stringify(hydrated)}`)
  }

  const multiAgentPayload = await callHostedFunction('multi-agent-forecast', {
    runId: analysisRunId,
    scenario: {
      description: analysis?.scenario_text || candidate.scenario,
    },
    retrievals: Array.isArray(analysis?.retrievals) ? analysis.retrievals : [],
    baseForecast: Array.isArray(analysis?.forecast) ? analysis.forecast : [],
    provenance: analysis?.provenance ?? null
  })

  if (!multiAgentPayload?.ok || !multiAgentPayload?.response) {
    throw new Error(`multi-agent-forecast failed for "${candidate.title}": ${JSON.stringify(multiAgentPayload)}`)
  }

  const multiAgentForecast = multiAgentPayload.response
  if (multiAgentForecast?.consensus?.champion?.method === 'local fallback consensus') {
    throw new Error(`multi-agent-forecast fell back locally for "${candidate.title}".`)
  }

  const payload = buildForecastPayload(candidate, analysisRunId, analysis, multiAgentForecast)
  payload.creator_id = curatorId

  const { data, error } = await supabaseAdmin
    .from('forecasts')
    .insert(payload)
    .select('id, title, current_probability, analysis_run_id, tags')
    .single()

  if (error) {
    throw new Error(`Failed to insert forecast "${candidate.title}": ${error.message}`)
  }

  try {
    await seedInitialPrediction(curatorId, data.id, multiAgentForecast)
  } catch (error) {
    await supabaseAdmin.from('forecasts').delete().eq('id', data.id)
    throw error
  }

  return {
    id: data.id,
    title: data.title,
    current_probability: Number(data.current_probability),
    analysis_run_id: data.analysis_run_id,
    retrieval_count: Number(analysis?.provenance?.retrieval_count || analysis?.retrieval_count || 0),
    distinct_provider_count: Number(analysis?.provenance?.retrieval_provider_summary?.distinctProviderCount || 0)
  }
}

const curatorId = await ensureCuratorUser()
const deletedCount = await cleanupExistingLaunchForecasts(curatorId)

const created = []
const failures = []

for (const candidate of candidateScenarios) {
  if (created.length >= 12) break

  try {
    const forecast = await createForecast(curatorId, candidate)
    created.push({ ...forecast, category: candidate.category })
    console.log(`seeded: ${candidate.title}`)
  } catch (error) {
    failures.push({
      title: candidate.title,
      category: candidate.category,
      message: error instanceof Error ? error.message : String(error)
    })
    console.warn(`skipped: ${candidate.title}`)
  }
}

if (created.length < 12) {
  throw new Error(`Only seeded ${created.length} launch forecasts. Need 12. Failures: ${JSON.stringify(failures, null, 2)}`)
}

console.log(JSON.stringify({
  ok: true,
  deleted_existing_launch_forecasts: deletedCount,
  curator_id: curatorId,
  seeded_count: created.length,
  created,
  failures
}, null, 2))
