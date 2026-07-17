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
const questionLimit = Math.max(1, Number(env.QUESTION_LIMIT || 10))
const questionOffset = Math.max(0, Number(env.QUESTION_OFFSET || 0))
const functionTimeoutMs = Math.max(15000, Number(env.PUBLIC_BETA_EVAL_TIMEOUT_MS || 90000))

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
}

const canonicalQuestions = [
  {
    id: 'great_power_war',
    question: 'Will there be a major war between big powers in the next few years, or will tensions cool down?',
    benchmark: {
      label: 'Metaculus great-power war question family',
      url: 'https://www.metaculus.com/questions/4441/when-will-be-the-next-great-power-war/'
    }
  },
  {
    id: 'middle_east',
    question: 'Will the conflict in the Middle East including Israel Iran and their allies escalate, or move toward a stable peace?',
    benchmark: {
      label: 'Metaculus Middle East conflict question family',
      url: 'https://www.metaculus.com/questions/'
    }
  },
  {
    id: 'country_stability',
    question: 'Will my country stay politically stable, or are we heading toward serious unrest, protests, or leadership changes?',
    benchmark: {
      label: 'Metaculus country politics question family',
      url: 'https://www.metaculus.com/questions/'
    }
  },
  {
    id: 'global_recession',
    question: 'Will the global economy enter a recession, or will growth remain strong over the next few years?',
    benchmark: {
      label: 'Metaculus macroeconomy question family',
      url: 'https://www.metaculus.com/questions/'
    }
  },
  {
    id: 'asset_allocation',
    question: 'Will stock markets go up or down in the next year, and is it safer to keep money in stocks, cash, or something else?',
    benchmark: {
      label: 'Metaculus markets question family',
      url: 'https://www.metaculus.com/questions/'
    }
  },
  {
    id: 'gold_safe_assets',
    question: 'Will gold and other safe assets become much more valuable, or will they lose value compared with today?',
    benchmark: {
      label: 'Metaculus gold and safe-haven question family',
      url: 'https://www.metaculus.com/questions/'
    }
  },
  {
    id: 'inflation',
    question: 'Will inflation stay high, fall back to normal, or swing unpredictably in the near future?',
    benchmark: {
      label: 'Metaculus inflation question family',
      url: 'https://www.metaculus.com/questions/'
    }
  },
  {
    id: 'climate_local',
    question: 'Will climate change make extreme weather events like floods heatwaves and storms significantly worse where I live in the coming decade?',
    benchmark: {
      label: 'Metaculus climate risk question family',
      url: 'https://www.metaculus.com/questions/'
    }
  },
  {
    id: 'natural_disaster',
    question: 'Will there be a major natural disaster such as a devastating earthquake volcanic eruption or mega-storm that disrupts global trade or daily life?',
    benchmark: {
      label: 'Metaculus disaster disruption question family',
      url: 'https://www.metaculus.com/questions/'
    }
  },
  {
    id: 'ai_automation',
    question: 'Will new technologies like AI and automation improve most people lives, or increase inequality unemployment and social tension?',
    benchmark: {
      label: 'Metaculus AI impact question family',
      url: 'https://www.metaculus.com/questions/'
    }
  }
]

async function callFunction(functionName, body) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), functionTimeoutMs)
  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  })
  clearTimeout(timeoutId)

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(`${functionName} failed with HTTP ${response.status}: ${JSON.stringify(payload)}`)
  }
  return payload
}

function containsGenericForecastWording(value) {
  return /focal strategic outcome|within 14 days/i.test(value || '')
}

function scoreQuestion({ questionPackage, publicAnswer, evidenceBacked, retrievalCount, distinctProviderCount }) {
  const directness = publicAnswer?.needs_more_input
    ? 3
    : publicAnswer?.direct_answer && publicAnswer?.best_current_call
      ? 5
      : 1

  const horizonClarity = questionPackage?.horizonLabel || publicAnswer?.time_horizon
    ? containsGenericForecastWording(questionPackage?.question) ? 2 : 5
    : 1

  const evidenceTransparency = evidenceBacked && retrievalCount >= 3 && distinctProviderCount >= 2
    ? 5
    : retrievalCount > 0
      ? 3
      : 1

  const publicUsefulness = publicAnswer?.needs_more_input
    ? 3
    : publicAnswer?.what_to_do_next && publicAnswer?.what_could_change_it
      ? 5
      : 2

  const benchmarkComparability = questionPackage?.intent && questionPackage.intent !== 'generic_public_analysis' && !containsGenericForecastWording(questionPackage?.question)
    ? 5
    : publicAnswer?.needs_more_input
      ? 3
      : 1

  const average = Number(((directness + horizonClarity + evidenceTransparency + publicUsefulness + benchmarkComparability) / 5).toFixed(2))

  return {
    directness,
    horizon_clarity: horizonClarity,
    evidence_transparency: evidenceTransparency,
    public_usefulness: publicUsefulness,
    benchmark_comparability: benchmarkComparability,
    average,
  }
}

async function evaluateQuestion(entry, index) {
  const analyzePayload = await callFunction('analyze-engine', {
    runId: `canonical-public-eval-${Date.now()}-${index + 1}`,
    scenario_text: entry.question,
    audience: 'researcher',
    mode: 'standard',
  })

  if (!analyzePayload?.ok || !analyzePayload?.analysis) {
    throw new Error(`analyze-engine returned no analysis for ${entry.id}`)
  }

  const analysis = analyzePayload.analysis
  const multiAgentPayload = await callFunction('multi-agent-forecast', {
    runId: analyzePayload.analysis_run_id || analyzePayload.request_id || `canonical-eval-${entry.id}`,
    scenario: {
      description: analysis.scenario_text || entry.question,
    },
    retrievals: Array.isArray(analysis.retrievals) ? analysis.retrievals : [],
    baseForecast: Array.isArray(analysis.forecast) ? analysis.forecast : [],
    provenance: analysis.provenance ?? null,
  })

  if (!multiAgentPayload?.ok || !multiAgentPayload?.response) {
    throw new Error(`multi-agent-forecast returned no response for ${entry.id}`)
  }

  const response = multiAgentPayload.response
  const retrievalCount = Number(analysis?.provenance?.retrieval_count || analysis?.retrieval_count || analysis?.retrievals?.length || 0)
  const distinctProviderCount = Number(analysis?.provenance?.retrieval_provider_summary?.distinctProviderCount || 0)
  const evidenceBacked = analysis?.provenance?.evidence_backed === true
  const scoring = scoreQuestion({
    questionPackage: response.question,
    publicAnswer: response.publicAnswer,
    evidenceBacked,
    retrievalCount,
    distinctProviderCount,
  })

  return {
    id: entry.id,
    input_question: entry.question,
    benchmark: entry.benchmark,
    routed_intent: response.question?.intent || null,
    rendered_question: response.question?.question || null,
    public_answer: response.publicAnswer || null,
    evidence_backed: evidenceBacked,
    retrieval_count: retrievalCount,
    distinct_provider_count: distinctProviderCount,
    scoring,
  }
}

const results = []
for (const [index, entry] of canonicalQuestions.slice(questionOffset, questionOffset + questionLimit).entries()) {
  console.error(`[public-beta-answer-eval] ${questionOffset + index + 1}/${canonicalQuestions.length}: ${entry.id}`)
  results.push(await evaluateQuestion(entry, index))
}

const averages = results.map((result) => result.scoring.average)
const mean = averages.reduce((sum, value) => sum + value, 0) / averages.length
const min = Math.min(...averages)

console.log(JSON.stringify({
  benchmark_reference: 'Metaculus / FutureEval question-quality standard',
  questions_checked: results.length,
  average_score: Number(mean.toFixed(2)),
  minimum_question_score: Number(min.toFixed(2)),
  passed_gate: mean >= 4.2 && min >= 3,
  results,
}, null, 2))
