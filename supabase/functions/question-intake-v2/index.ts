import {
import { getAuthenticatedUser, jsonResponse } from '../_shared/auth.ts'
  evaluateQuestionIntake,
  type ClarificationMode,
  type ClarificationState,
  type QuestionContextPayload,
} from '../../../shared/publicForecasting.ts'

type RequestBody = {
  prompt?: string
  known_context?: Partial<QuestionContextPayload> | Record<string, string>
  clarification_state?: ClarificationState
  mode?: ClarificationMode
  audience?: string
}

const COMMON_COUNTRIES = [
  'India',
  'Brazil',
  'United States',
  'US',
  'China',
  'Russia',
  'Ukraine',
  'Israel',
  'Iran',
  'Saudi Arabia',
  'Turkey',
  'Germany',
  'France',
  'United Kingdom',
  'UK',
  'Japan',
  'South Korea',
  'North Korea',
  'Taiwan',
  'Pakistan',
  'Canada',
  'Mexico',
  'Australia',
  'South Africa',
  'South Asia',
  'Middle East',
]

function inferCountryFromCurrency(value?: string | null) {
  if (!value) return null
  for (const country of COMMON_COUNTRIES) {
    const pattern = new RegExp(`\\b${country.replace(/\s+/g, '\\s+')}\\b`, 'i')
    if (pattern.test(value)) return country
  }
  const leading = value.split('/')[0]?.trim()
  return leading && /^[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2}$/.test(leading) ? leading : null
}

function normalizeContext(body: RequestBody) {
  const knownContext = body.known_context && typeof body.known_context === 'object'
    ? structuredClone(body.known_context)
    : null
  const clarificationState = body.clarification_state
    ? structuredClone(body.clarification_state)
    : null

  const answers = {
    ...((knownContext as Partial<QuestionContextPayload> | null)?.answers || {}),
    ...(clarificationState?.answers || {}),
  }
  const directKeys: Array<keyof QuestionContextPayload['answers']> = [
    'country',
    'location',
    'time_horizon',
    'risk_tolerance',
    'currency',
    'country_impact',
    'scope',
    'theater_focus',
    'conflict_frame',
    'hazard_focus',
    'disruption_lens',
    'comparison_basis',
    'population_scope',
  ]
  if (knownContext && typeof knownContext === 'object') {
    ;(knownContext as Partial<QuestionContextPayload>).answers = answers
    for (const key of directKeys) {
      const directValue = (knownContext as Partial<QuestionContextPayload>)[key]
      const answerValue = answers[key]
      if (!directValue && typeof answerValue === 'string' && answerValue.trim()) {
        ;(knownContext as Partial<QuestionContextPayload>)[key] = answerValue
      }
    }
  }
  if (clarificationState) {
    clarificationState.answers = answers
  }
  const country = (knownContext as Partial<QuestionContextPayload> | null)?.country
    || answers.country
    || inferCountryFromCurrency((knownContext as Partial<QuestionContextPayload> | null)?.currency || answers.currency)

  if (country) {
    if (knownContext && typeof knownContext === 'object') {
      ;(knownContext as Partial<QuestionContextPayload>).country = country
      ;(knownContext as Partial<QuestionContextPayload>).answers = {
        ...((knownContext as Partial<QuestionContextPayload>).answers || {}),
        country,
      }
    }
    if (clarificationState) {
      clarificationState.answers = {
        ...(clarificationState.answers || {}),
        country,
      }
    }
  }

  return { knownContext, clarificationState }
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('APP_URL') || 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info',
    },
  })
}

declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void
}

Deno.serve(async (req: Request) => {
  // Auth check
  const _user = await getAuthenticatedUser(req)
  if (!_user) return jsonResponse(401, { ok: false, error: 'authentication_required' })


  if (req.method === 'OPTIONS') return jsonResponse(200, { ok: true })
  if (req.method !== 'POST') return jsonResponse(405, { ok: false, message: 'Method Not Allowed' })

  try {
    const body: RequestBody = await req.json().catch(() => ({}))
    const prompt = String(body.prompt || '').trim()

    if (!prompt) {
      return jsonResponse(400, {
        ok: false,
        message: 'Missing prompt',
      })
    }

    const { knownContext, clarificationState } = normalizeContext(body)

    const response = evaluateQuestionIntake({
      prompt,
      knownContext: knownContext || null,
      clarificationState: clarificationState || null,
      mode: body.mode || 'public',
      audience: body.audience || 'public',
    })

    return jsonResponse(200, {
      ok: true,
      ...response,
    })
  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    })
  }
})
