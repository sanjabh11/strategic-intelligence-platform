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
const functionTimeoutMs = Math.max(15000, Number(env.PUBLIC_BETA_EVAL_TIMEOUT_MS || 90000))

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
}

const canonicalQuestions = [
  {
    id: 'great_power_war',
    question: 'Will there be a major war between big powers in the next few years, or will tensions cool down?',
    expectedIntent: 'global_geopolitics',
    expectedGate: 'country_impact',
    expectedQuestionNeedle: 'great powers',
    clarificationAnswers: {
      country_impact: 'Explain impact on my country',
      country: 'India',
      theater_focus: 'Indo-Pacific',
      conflict_frame: 'Escalation risk',
      time_horizon: '3 years',
    },
  },
  {
    id: 'middle_east_conflict',
    question: 'Will the conflict in the Middle East including Israel Iran and their allies escalate, or move toward a stable peace?',
    expectedIntent: 'middle_east_conflict',
    expectedGate: 'country_impact',
    expectedQuestionNeedle: 'contained conflict path',
    clarificationAnswers: {
      country_impact: 'Explain impact on my country',
      country: 'India',
      theater_focus: 'Israel-Iran and regional spillovers',
      conflict_frame: 'Escalation risk',
      time_horizon: '18 months',
    },
  },
  {
    id: 'country_stability',
    question: 'Will my country stay politically stable, or are we heading toward serious unrest, protests, or leadership changes?',
    expectedIntent: 'country_politics',
    expectedGate: 'country',
    expectedQuestionNeedle: 'political stability',
    clarificationAnswers: {
      country: 'India',
      time_horizon: '18 months',
    },
  },
  {
    id: 'global_recession',
    question: 'Will the global economy enter a recession, or will growth remain strong over the next few years?',
    expectedIntent: 'macroeconomy',
    expectedGate: 'country_impact',
    expectedQuestionNeedle: 'recession',
    clarificationAnswers: {
      country_impact: 'Explain impact on my country',
      country: 'India',
      scope: 'Global',
      time_horizon: '24 months',
    },
  },
  {
    id: 'asset_allocation',
    question: 'Will stock markets go up or down in the next year, and is it safer to keep money in stocks, cash, or something else?',
    expectedIntent: 'asset_allocation',
    expectedGate: 'country_impact',
    expectedQuestionNeedle: 'defensive positioning',
    clarificationAnswers: {
      time_horizon: '12 months',
      currency: 'India / INR investors',
      risk_tolerance: 'Medium',
      country_impact: 'Explain impact on my country',
      country: 'India',
      comparison_basis: 'Against cash',
    },
  },
  {
    id: 'gold_safe_assets',
    question: 'Will gold and other safe assets become much more valuable, or will they lose value compared with today?',
    expectedIntent: 'commodity_safe_haven',
    expectedGate: 'country_impact',
    expectedQuestionNeedle: 'safe-haven assets',
    clarificationAnswers: {
      comparison_basis: 'Against local purchasing power',
      country_impact: 'Explain impact on my country',
      country: 'India',
      currency: 'India / INR savers',
      time_horizon: '12 months',
    },
  },
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
  const releaseStatus = publicAnswer?.answer_release_status || 'ready'
  const directness = releaseStatus === 'ready'
    ? (publicAnswer?.direct_answer && publicAnswer?.best_current_call ? 5 : 2)
    : releaseStatus === 'needs_more_input'
      ? 3
      : 2

  const horizonClarity = questionPackage?.horizonLabel || publicAnswer?.time_horizon
    ? containsGenericForecastWording(questionPackage?.question) ? 1 : 5
    : 1

  const evidenceTransparency = evidenceBacked && retrievalCount >= 3 && distinctProviderCount >= 2
    ? 5
    : retrievalCount > 0
      ? 3
      : 1

  const publicUsefulness = publicAnswer?.what_to_do_next && publicAnswer?.what_could_change_it
    ? releaseStatus === 'ready'
      ? 5
      : 3
    : 1

  const benchmarkComparability = questionPackage?.intent && questionPackage.intent !== 'generic_public_analysis' && !containsGenericForecastWording(questionPackage?.question)
    ? 5
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

function extractProviderFailure(payload, analysis) {
  const provenance = payload?.provenance ?? analysis?.provenance ?? {}
  return {
    mode: payload?.mode || null,
    reason: provenance?.reason || payload?.reason || null,
    failure_class: provenance?.failure_class || analysis?.provenance?.failure_class || null,
    failure_stage: provenance?.failure_stage || analysis?.provenance?.failure_stage || null,
    provider_attempts: provenance?.provider_attempts || analysis?.provenance?.provider_attempts || [],
  }
}

async function resolveIntake(entry) {
  let answers = {}
  let askedQuestionIds = []
  let totalQuestionsAsked = 0
  let gateSeen = false
  let latest = null

  for (let step = 0; step < 5; step += 1) {
    latest = await callFunction('question-intake', {
      prompt: entry.question,
      known_context: {
        answers,
        decision_use: 'public_beta_regression',
      },
      clarification_state: {
        answers,
        askedQuestionIds,
        totalQuestionsAsked,
      },
      mode: 'public',
      audience: 'public',
    })

    if (!latest?.ok) {
      throw new Error(`question-intake returned invalid payload for ${entry.id}`)
    }

    const questions = Array.isArray(latest.questions) ? latest.questions : []
    if (questions.some((question) => question.id === entry.expectedGate)) {
      gateSeen = true
    }

    if (latest.status === 'ready' || questions.length === 0) {
      return {
        gateSeen,
        intake: latest,
        answers,
      }
    }

    for (const question of questions) {
      if (!(question.id in entry.clarificationAnswers)) {
        throw new Error(`No fixture answer configured for ${entry.id} clarification ${question.id}`)
      }
      answers = {
        ...answers,
        [question.id]: entry.clarificationAnswers[question.id],
      }
      if (!askedQuestionIds.includes(question.id)) {
        askedQuestionIds = [...askedQuestionIds, question.id]
      }
    }
    totalQuestionsAsked = Math.min(4, askedQuestionIds.length)
  }

  return {
    gateSeen,
    intake: latest,
    answers,
  }
}

async function evaluateQuestion(entry, index) {
  const intakeResult = await resolveIntake(entry)
  if (!intakeResult.gateSeen) {
    throw new Error(`${entry.id} never surfaced clarification gate ${entry.expectedGate}`)
  }

  const questionContext = {
    ...(intakeResult.intake?.question_context || {}),
    intent: entry.expectedIntent,
    country: entry.clarificationAnswers.country || intakeResult.intake?.question_context?.country || null,
    time_horizon: entry.clarificationAnswers.time_horizon || intakeResult.intake?.question_context?.time_horizon || null,
    risk_tolerance: entry.clarificationAnswers.risk_tolerance || intakeResult.intake?.question_context?.risk_tolerance || null,
    currency: entry.clarificationAnswers.currency || intakeResult.intake?.question_context?.currency || null,
    clarification_status: 'ready',
    completeness_score: 1,
    unresolved_dimensions: [],
    required_inputs: [],
    answers: {
      ...(intakeResult.intake.question_context?.answers || {}),
      ...entry.clarificationAnswers,
    },
  }

  const analyzePayload = await callFunction('analyze-engine', {
    runId: `public-beta-six-${Date.now()}-${index + 1}`,
    scenario_text: entry.question,
    question_context: questionContext,
    audience: 'researcher',
    mode: 'standard',
  })

  if (!analyzePayload?.ok || !analyzePayload?.analysis) {
    throw new Error(`analyze-engine returned no analysis for ${entry.id}`)
  }

  const analysis = analyzePayload.analysis
  const providerFailure = extractProviderFailure(analyzePayload, analysis)
  const providerGatePassed = !(
    providerFailure.mode === 'fallback'
    || providerFailure.reason === 'llm_failed'
    || providerFailure.reason === 'llm_exception'
    || providerFailure.failure_class
    || providerFailure.failure_stage
  )

  if (!providerGatePassed) {
    throw new Error(`${entry.id} provider gate failed: ${JSON.stringify(providerFailure)}`)
  }

  const multiAgentPayload = await callFunction('multi-agent-forecast', {
    runId: analyzePayload.analysis_run_id || analyzePayload.request_id || `public-beta-six-${entry.id}`,
    scenario: {
      description: analysis.scenario_text || entry.question,
    },
    retrievals: Array.isArray(analysis.retrievals) ? analysis.retrievals : [],
    baseForecast: Array.isArray(analysis.forecast) ? analysis.forecast : [],
    provenance: analysis.provenance ?? null,
    questionContext: analysis.question_context || questionContext,
    mode: 'public',
    audience: 'public',
  })

  if (!multiAgentPayload?.ok || !multiAgentPayload?.response) {
    throw new Error(`multi-agent-forecast returned no response for ${entry.id}`)
  }

  const response = multiAgentPayload.response
  const routedIntent = response.question?.intent || null
  if (routedIntent !== entry.expectedIntent) {
    throw new Error(`${entry.id} misclassified intent: expected ${entry.expectedIntent}, got ${routedIntent}`)
  }
  if (!String(response.question?.question || '').toLowerCase().includes(entry.expectedQuestionNeedle.toLowerCase())) {
    throw new Error(`${entry.id} rendered question did not contain expected phrase: ${entry.expectedQuestionNeedle}`)
  }

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

  if (scoring.average < 3) {
    throw new Error(`${entry.id} score fell below threshold: ${scoring.average}`)
  }

  return {
    id: entry.id,
    expected_intent: entry.expectedIntent,
    intake_status: intakeResult.intake?.status || null,
    provider_gate_passed: providerGatePassed,
    provider_failure: providerFailure,
    routed_intent: routedIntent,
    gate_checked: entry.expectedGate,
    gate_seen: intakeResult.gateSeen,
    rendered_question: response.question?.question || null,
    evidence_backed: evidenceBacked,
    retrieval_count: retrievalCount,
    distinct_provider_count: distinctProviderCount,
    public_answer: response.publicAnswer || null,
    scoring,
  }
}

const results = []
for (const [index, entry] of canonicalQuestions.entries()) {
  console.error(`[public-beta-six-question-regression] ${index + 1}/${canonicalQuestions.length}: ${entry.id}`)
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
  passed_gate: mean >= 3 && min >= 3,
  results,
}, null, 2))
