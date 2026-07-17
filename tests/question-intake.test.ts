import { describe, expect, it } from 'vitest'
import {
  buildPublicAnswer,
  evaluateQuestionIntake,
  routeCitizenQuestion,
} from '../shared/publicForecasting'

describe('adaptive clarification intake', () => {
  it('does not ask duplicate country or horizon questions when the prompt already contains them', () => {
    const intake = evaluateQuestionIntake({
      prompt: 'Will political stability in India hold over the next 18 months, or are serious protests and leadership changes more likely?',
      mode: 'public',
      audience: 'public',
    })

    expect(intake.intent).toBe('country_politics')
    expect(intake.questions.some((question) => question.id === 'country')).toBe(false)
    expect(intake.questions.some((question) => question.id === 'time_horizon')).toBe(false)
    expect(intake.question_context.country).toBe('India')
  })

  it('blocks a generic country-politics prompt until a country is provided', () => {
    const intake = evaluateQuestionIntake({
      prompt: 'Will my country stay politically stable, or are we heading toward serious unrest and leadership changes?',
      mode: 'public',
      audience: 'public',
    })

    expect(intake.status).toBe('needs_input')
    expect(intake.questions.map((question) => question.id)).toContain('country')
    expect(intake.question_context.required_inputs.map((question) => question.id)).toContain('country')
  })

  it('asks horizon and currency first for asset-allocation questions, then risk tolerance', () => {
    const initial = evaluateQuestionIntake({
      prompt: 'Will stock markets go up or down next year, and is it safer to keep money in stocks, cash, or something else?',
      mode: 'public',
      audience: 'public',
    })

    expect(initial.intent).toBe('asset_allocation')
    expect(initial.questions.map((question) => question.id)).toEqual(['time_horizon', 'currency'])

    const followUp = evaluateQuestionIntake({
      prompt: 'Will stock markets go up or down next year, and is it safer to keep money in stocks, cash, or something else?',
      mode: 'public',
      audience: 'public',
      clarificationState: {
        answers: {
          time_horizon: '12 months',
          currency: 'US dollar investors',
        },
        askedQuestionIds: ['time_horizon', 'currency'],
        totalQuestionsAsked: 2,
      },
    })

    expect(followUp.questions.map((question) => question.id)).toContain('risk_tolerance')
    expect(followUp.questions.map((question) => question.id)).toContain('country_impact')
    expect(followUp.questions.map((question) => question.id)).not.toContain('time_horizon')
  })

  it('reaches ready for asset allocation within four questions when currency context already implies the country', () => {
    const ready = evaluateQuestionIntake({
      prompt: 'Will stock markets go up or down next year, and is it safer to keep money in stocks, cash, or something else?',
      mode: 'public',
      audience: 'public',
      clarificationState: {
        answers: {
          time_horizon: '12 months',
          currency: 'India / INR investors',
          risk_tolerance: 'Medium',
          country_impact: 'Explain impact on my country',
        },
        askedQuestionIds: ['time_horizon', 'currency', 'risk_tolerance', 'country_impact'],
        totalQuestionsAsked: 4,
      },
    })

    expect(ready.status).toBe('ready')
    expect(ready.question_context.country).toBe('India')
    expect(ready.question_context.required_inputs).toHaveLength(0)
  })

  it('asks for a location before treating a local climate question as ready', () => {
    const intake = evaluateQuestionIntake({
      prompt: 'Will climate change make extreme weather significantly worse where I live in the coming decade?',
      mode: 'public',
      audience: 'public',
    })

    expect(intake.intent).toBe('local_climate_risk')
    expect(intake.status).toBe('needs_input')
    expect(intake.questions.map((question) => question.id)).toContain('location')

    const route = routeCitizenQuestion(intake.question_context.normalized_prompt, intake.question_context)
    expect(route.requiredInputs.map((question) => question.id)).toContain('location')
  })

  it('asks theater or frame only when the war prompt is ambiguous', () => {
    const ambiguous = evaluateQuestionIntake({
      prompt: 'Will there be a major war between big powers in the next few years, or will tensions cool down?',
      mode: 'public',
      audience: 'public',
    })
    const specific = evaluateQuestionIntake({
      prompt: 'Will tensions in the Taiwan Strait between the United States and China cool down, or escalate toward a major direct war in the next 3 years?',
      mode: 'public',
      audience: 'public',
    })

    expect(ambiguous.intent).toBe('global_geopolitics')
    expect(ambiguous.questions.some((question) => question.id === 'country_impact')).toBe(true)
    expect(ambiguous.questions.some((question) => question.id === 'theater_focus' || question.id === 'conflict_frame')).toBe(true)
    expect(specific.questions.some((question) => question.id === 'theater_focus')).toBe(false)
  })

  it('requires a country after the user asks for country impact on a global question', () => {
    const intake = evaluateQuestionIntake({
      prompt: 'Will the global economy enter a recession, or will growth remain strong over the next few years?',
      mode: 'public',
      audience: 'public',
      clarificationState: {
        answers: {
          country_impact: 'Explain impact on my country',
        },
        askedQuestionIds: ['country_impact'],
        totalQuestionsAsked: 1,
      },
    })

    expect(intake.status).toBe('needs_input')
    expect(intake.question_context.required_inputs.map((question) => question.id)).toContain('country')
    expect(intake.questions.map((question) => question.id)).toContain('country')
  })

  it('does not misread purchasing power as an energy-disruption lens', () => {
    const intake = evaluateQuestionIntake({
      prompt: 'Will gold and other safe assets become much more valuable, or will they lose value compared with today?',
      mode: 'public',
      audience: 'public',
      clarificationState: {
        answers: {
          comparison_basis: 'Against local purchasing power',
          country_impact: 'Explain impact on my country',
          country: 'India',
          currency: 'India / INR savers',
          time_horizon: '12 months',
        },
        askedQuestionIds: ['comparison_basis', 'country_impact', 'country', 'currency', 'time_horizon'],
        totalQuestionsAsked: 5,
      },
    })

    expect(intake.question_context.answers.disruption_lens).toBeUndefined()
  })

  it('does not let appended country-impact context override the base intent', () => {
    const intake = evaluateQuestionIntake({
      prompt: [
        'Will gold and other safe assets become much more valuable, or will they lose value compared with today?',
        '',
        'User context:',
        'Country: India',
        'Preferred time horizon: 12 months',
        'Country or currency context: India / INR savers',
        'Country impact lens: Explain impact on my country',
        'Comparison basis: Against local purchasing power',
      ].join('\n'),
      mode: 'public',
      audience: 'public',
    })

    expect(intake.intent).toBe('commodity_safe_haven')
    const route = routeCitizenQuestion(intake.question_context.normalized_prompt, intake.question_context)
    expect(route.intent).toBe('commodity_safe_haven')
    expect(route.question).toContain('safe-haven assets')
  })

  it('trusts a ready clarified intent when routing the final forecast question', () => {
    const route = routeCitizenQuestion(
      [
        'Will gold and other safe assets become much more valuable, or will they lose value compared with today?',
        '',
        'User context:',
        'Country: India',
        'Preferred time horizon: 12 months',
        'Country or currency context: India / INR savers',
        'Country impact lens: Explain impact on my country',
        'Comparison basis: Against local purchasing power',
      ].join('\n'),
      {
        intent: 'commodity_safe_haven',
        clarification_status: 'ready',
        country: 'India',
        time_horizon: '12 months',
        currency: 'India / INR savers',
        answers: {
          country: 'India',
          time_horizon: '12 months',
          currency: 'India / INR savers',
          country_impact: 'Explain impact on my country',
          comparison_basis: 'Against local purchasing power',
        },
        completeness_score: 1,
        asked_question_ids: ['country_impact', 'country', 'comparison_basis', 'currency', 'time_horizon'],
        confidence: 0.9,
        normalized_prompt: '',
        context_locked_fields: [],
        unresolved_dimensions: [],
        question_cluster: 'Gold and safe-haven assets',
        required_inputs: [],
      }
    )

    expect(route.intent).toBe('commodity_safe_haven')
    expect(route.question).toContain('safe-haven assets')
  })

  it('normalizes investor wording when routing asset-allocation questions', () => {
    const route = routeCitizenQuestion(
      'Will stock markets go up or down next year, and is it safer to keep money in stocks, cash, or something else?',
      {
        intent: 'asset_allocation',
        clarification_status: 'ready',
        time_horizon: '12 months',
        currency: 'India / INR investors investors',
        risk_tolerance: 'Medium',
        answers: {
          time_horizon: '12 months',
          currency: 'India / INR investors investors',
          risk_tolerance: 'Medium',
        },
        completeness_score: 1,
        asked_question_ids: ['time_horizon', 'currency', 'risk_tolerance'],
        confidence: 0.9,
        normalized_prompt: '',
        context_locked_fields: [],
        unresolved_dimensions: [],
        question_cluster: 'Asset allocation',
        required_inputs: [],
      }
    )

    expect(route.question).toContain('India / INR investors')
    expect(route.question).not.toContain('investors investors')
  })

  it('withholds a public answer when evidence is insufficient even if the route is fully clarified', () => {
    const route = routeCitizenQuestion(
      'Will gold and other safe assets become much more valuable, or will they lose value compared with today?',
      {
        intent: 'commodity_safe_haven',
        clarification_status: 'ready',
        country: 'India',
        time_horizon: '12 months',
        currency: 'India / INR savers',
        answers: {
          country: 'India',
          time_horizon: '12 months',
          currency: 'India / INR savers',
          country_impact: 'Explain impact on my country',
          comparison_basis: 'Against local purchasing power',
        },
        completeness_score: 1,
        asked_question_ids: ['country_impact', 'country', 'comparison_basis', 'currency', 'time_horizon'],
        confidence: 0.92,
        normalized_prompt: '',
        context_locked_fields: [],
        unresolved_dimensions: [],
        question_cluster: 'Gold and safe-haven assets',
        required_inputs: [],
      }
    )

    const publicAnswer = buildPublicAnswer({
      prompt: 'Will gold and other safe assets become much more valuable, or will they lose value compared with today?',
      summary: 'Will gold and other safe assets become much more valuable, or will they lose value compared with today?',
      route,
      probability: 0.57,
      confidence: 0.64,
      evidenceBacked: false,
      retrievalCount: 4,
      distinctProviderCount: 2,
      disagreementIndex: 0.18,
      contradictionPoints: ['Real yields remain contested.'],
      missingEvidence: ['Live commodity evidence is still thin.'],
      questionContext: {
        intent: 'commodity_safe_haven',
        clarification_status: 'ready',
        country: 'India',
        time_horizon: '12 months',
        currency: 'India / INR savers',
        answers: {
          country: 'India',
          time_horizon: '12 months',
          currency: 'India / INR savers',
          country_impact: 'Explain impact on my country',
          comparison_basis: 'Against local purchasing power',
        },
        completeness_score: 1,
        asked_question_ids: ['country_impact', 'country', 'comparison_basis', 'currency', 'time_horizon'],
        confidence: 0.92,
        normalized_prompt: '',
        context_locked_fields: [],
        unresolved_dimensions: [],
        question_cluster: 'Gold and safe-haven assets',
        required_inputs: [],
      },
    })

    expect(publicAnswer.answer_release_status).toBe('insufficient_evidence')
    expect(publicAnswer.best_current_call).toBe('Insufficient evidence for a public call')
    expect(publicAnswer.direct_answer).toContain('withholding a citizen-ready public call')
    expect(publicAnswer.why_this_is_the_call).not.toContain('Will gold and other safe assets')
  })

  it('keeps already displayed unanswered questions visible even when the four-question budget is exhausted', () => {
    const intake = evaluateQuestionIntake({
      prompt: 'Will stock markets go up or down, and should I keep my money in stocks, cash, or something else?',
      mode: 'public',
      audience: 'public',
      clarificationState: {
        answers: {
          time_horizon: '12 months',
          currency: 'India / INR investors',
        },
        askedQuestionIds: ['time_horizon', 'currency', 'risk_tolerance', 'country_impact'],
        totalQuestionsAsked: 4,
      },
    })

    expect(intake.remaining_question_budget).toBe(0)
    expect(intake.status).toBe('needs_input')
    expect(intake.questions.map((question) => question.id)).toEqual(['risk_tolerance', 'country_impact'])
  })

  it('blocks once the four-question budget is exhausted and a new unresolved question would still be required', () => {
    const intake = evaluateQuestionIntake({
      prompt: 'Will my country stay politically stable, or are we heading toward serious unrest and leadership changes?',
      mode: 'public',
      audience: 'public',
      clarificationState: {
        answers: {
          country_impact: 'Explain impact on my country',
          time_horizon: '18 months',
        },
        askedQuestionIds: ['time_horizon', 'currency', 'risk_tolerance', 'country_impact'],
        totalQuestionsAsked: 4,
      },
    })

    expect(intake.remaining_question_budget).toBe(0)
    expect(intake.status).toBe('blocked')
    expect(intake.questions).toHaveLength(0)
  })
})
