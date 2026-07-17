// Public Forecasting
// Types and functions for citizen/public question routing and forecasting
// Contract source: tests/question-intake.test.ts, scripts/public-beta-six-question-regression.mjs

// ---------------------------------------------------------------------------
// Intent taxonomy — domain-specific, not generic
// ---------------------------------------------------------------------------

export type CitizenForecastIntent =
  | 'global_geopolitics'
  | 'middle_east_conflict'
  | 'country_politics'
  | 'macroeconomy'
  | 'asset_allocation'
  | 'commodity_safe_haven'
  | 'local_climate_risk'
  | 'generic_public_analysis'
  | 'binary_outcome'
  | 'directional_forecast'
  | 'scenario_analysis'
  | 'policy_impact'
  | 'market_prediction'
  | 'geopolitical_event';

// ---------------------------------------------------------------------------
// Clarification question IDs
// ---------------------------------------------------------------------------

export type ClarificationQuestionId =
  | 'time_horizon'
  | 'geographic_scope'
  | 'decision_context'
  | 'success_criteria'
  | 'key_players'
  | 'baseline_assumption'
  | 'country'
  | 'currency'
  | 'risk_tolerance'
  | 'country_impact'
  | 'location'
  | 'theater_focus'
  | 'conflict_frame'
  | 'comparison_basis'
  | 'scope';

// ---------------------------------------------------------------------------
// Required input (visible to user)
// ---------------------------------------------------------------------------

export interface CitizenRequiredInput {
  id: ClarificationQuestionId;
  field: string;
  label: string;
  required: boolean;
}

// ---------------------------------------------------------------------------
// Question context payload — the full normalized context
// ---------------------------------------------------------------------------

export interface QuestionContextPayload {
  question?: string;
  context?: string;
  completeness_score?: number;
  context_locked_fields?: string[];
  unresolved_dimensions?: string[];
  question_cluster?: string;
  timestamp?: number;
  intent?: CitizenForecastIntent;
  country?: string | null;
  time_horizon?: string | null;
  currency?: string | null;
  risk_tolerance?: string | null;
  answers?: Record<string, string>;
  clarification_status?: 'needs_input' | 'ready' | 'blocked';
  normalized_prompt?: string;
  required_inputs?: CitizenRequiredInput[];
  asked_question_ids?: ClarificationQuestionId[];
  confidence?: number;
  decision_use?: string;
}

// ---------------------------------------------------------------------------
// Context alignment
// ---------------------------------------------------------------------------

export interface ContextAlignmentSummary {
  aligned: boolean;
  score: number;
  gaps: string[];
  recommendations: string[];
}

// ---------------------------------------------------------------------------
// Public answer — with evidence-withholding answer states
// ---------------------------------------------------------------------------

export interface PublicAnswer {
  summary: string;
  keyFindings: string[];
  confidenceLevel: 'low' | 'medium' | 'high';
  confidence_label?: string;
  caveats: string[];
  forecastProbability?: number;
  answer_release_status: 'ready' | 'needs_more_input' | 'insufficient_evidence';
  context_status?: string;
  context_alignment_score?: number;
  needs_more_input?: boolean;
  watch_factors?: string[];
  direct_answer?: string;
  best_current_call?: string;
  what_to_do_next?: string;
  what_could_change_it?: string;
  why_this_is_the_call?: string;
  time_horizon?: string;
  required_inputs?: CitizenRequiredInput[];
  clarification_summary?: string;
  context_locked_fields?: string[];
}

// ---------------------------------------------------------------------------
// Clarification state
// ---------------------------------------------------------------------------

export interface ClarificationState {
  answers: Partial<Record<ClarificationQuestionId, string>>;
  askedQuestionIds: ClarificationQuestionId[];
  totalQuestionsAsked: number;
}

// ---------------------------------------------------------------------------
// Question intake response
// ---------------------------------------------------------------------------

export interface ClarificationQuestion {
  id: ClarificationQuestionId;
  prompt: string;
  label?: string;
  kind?: 'text' | 'select' | 'multiselect';
  options?: Array<{ value: string; label: string }>;
  reason?: string;
}

export interface QuestionIntakeResponse {
  status: 'ready' | 'needs_input' | 'blocked' | 'out_of_scope';
  intent: CitizenForecastIntent;
  question_context?: QuestionContextPayload;
  confidence: number;
  relevance_summary?: string;
  questions: ClarificationQuestion[];
  remaining_question_budget?: number;
  clarification_questions?: ClarificationQuestion[];
}

// ---------------------------------------------------------------------------
// Route result — the routing decision for a clarified question
// ---------------------------------------------------------------------------

export interface RouteResult {
  intent: CitizenForecastIntent;
  horizonDays: number;
  category: string;
  question: string;
  requiredInputs: CitizenRequiredInput[];
  horizonLabel?: string;
  questionType: 'binary' | 'directional';
  title: string;
  contextAlignment?: ContextAlignmentSummary;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MAX_QUESTIONS = 4;

const COUNTRY_PATTERNS: Array<{ regex: RegExp; country: string }> = [
  { regex: /\bIndia\b/i, country: 'India' },
  { regex: /\bUnited States\b|\bUSA\b|\bUS\b(?!\w)/i, country: 'United States' },
  { regex: /\bChina\b/i, country: 'China' },
  { regex: /\bRussia\b/i, country: 'Russia' },
  { regex: /\bJapan\b/i, country: 'Japan' },
  { regex: /\bGermany\b/i, country: 'Germany' },
  { regex: /\bFrance\b/i, country: 'France' },
  { regex: /\bUnited Kingdom\b|\bUK\b|\bBritain\b/i, country: 'United Kingdom' },
  { regex: /\bIsrael\b/i, country: 'Israel' },
  { regex: /\bIran\b/i, country: 'Iran' },
  { regex: /\bTaiwan\b/i, country: 'Taiwan' },
  { regex: /\bBrazil\b/i, country: 'Brazil' },
  { regex: /\bAustralia\b/i, country: 'Australia' },
  { regex: /\bCanada\b/i, country: 'Canada' },
  { regex: /\bSouth Korea\b|\bKorea\b/i, country: 'South Korea' },
  { regex: /\bPakistan\b/i, country: 'Pakistan' },
];

const HORIZON_PATTERNS: Array<{ regex: RegExp; label: (m: RegExpMatchArray) => string }> = [
  { regex: /next\s+(\d+)\s+months?/i, label: (m) => `${m[1]} months` },
  { regex: /next\s+(\d+)\s+years?/i, label: (m) => `${m[1]} years` },
  { regex: /(\d+)\s+months?/i, label: (m) => `${m[1]} months` },
  { regex: /(\d+)\s+years?/i, label: (m) => `${m[1]} years` },
];

function extractCountry(text: string): string | null {
  for (const { regex, country } of COUNTRY_PATTERNS) {
    if (regex.test(text)) return country;
  }
  return null;
}

function extractHorizon(text: string): string | null {
  for (const { regex, label } of HORIZON_PATTERNS) {
    const match = text.match(regex);
    if (match) return label(match);
  }
  return null;
}

function extractCurrency(text: string): string | null {
  if (/INR|India.*savers|India.*investors/i.test(text)) return 'India / INR';
  if (/USD|US\s+dollar|dollar\s+investors/i.test(text)) return 'US / USD';
  if (/EUR|euro/i.test(text)) return 'EU / EUR';
  if (/GBP|pound/i.test(text)) return 'UK / GBP';
  return null;
}

function inferCountryFromCurrency(currency: string | null): string | null {
  if (!currency) return null;
  if (/India|INR/i.test(currency)) return 'India';
  if (/US|USD/i.test(currency)) return 'United States';
  if (/EU|EUR/i.test(currency)) return 'European Union';
  if (/UK|GBP/i.test(currency)) return 'United Kingdom';
  return null;
}

function hasSpecificTheater(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  const theaters = [
    'taiwan', 'south china sea', 'ukraine', 'korean peninsula',
    'middle east', 'israel', 'iran', 'gaza', 'syria',
    'india.*pakistan', 'kashmir', 'africa', 'sahel',
  ];
  return theaters.some(t => new RegExp(t, 'i').test(lower));
}

// ---------------------------------------------------------------------------
// Intent classification — deterministic, domain-specific
// ---------------------------------------------------------------------------

function classifyIntent(prompt: string): CitizenForecastIntent {
  const lower = prompt.toLowerCase();

  // Middle East conflict — check before generic geopolitics
  if (/middle\s+east|israel|iran|gaza|hamas|hezbollah|houthi/i.test(lower)) {
    return 'middle_east_conflict';
  }

  // Country politics
  if (/my\s+country.*politically\s+stable|political\s+stability|unrest|protests|leadership\s+changes?/i.test(lower)) {
    return 'country_politics';
  }

  // Asset allocation
  if (/stock\s+markets?|stocks?|cash|asset\s+allocation|keep\s+my\s+money|safer\s+to\s+keep/i.test(lower)) {
    return 'asset_allocation';
  }

  // Commodity / safe haven
  if (/gold|safe\s+assets?|safe-haven|commodit/i.test(lower)) {
    return 'commodity_safe_haven';
  }

  // Climate
  if (/climate\s+change|extreme\s+weather|where\s+I\s+live/i.test(lower)) {
    return 'local_climate_risk';
  }

  // Macroeconomy / recession
  if (/global\s+economy|recession|growth\s+remain|gdp|inflation/i.test(lower)) {
    return 'macroeconomy';
  }

  // Global geopolitics — great power war, Taiwan, etc.
  if (/major\s+war.*big\s+powers|great\s+power|taiwan|united\s+states.*china|escalate|tensions\s+cool/i.test(lower)) {
    return 'global_geopolitics';
  }

  // Generic fallbacks
  if (/will\s+.*probability/i.test(lower)) return 'binary_outcome';
  if (/price|market/i.test(lower)) return 'market_prediction';
  if (/war|conflict|sanction/i.test(lower)) return 'geopolitical_event';
  if (/policy|regulation|law/i.test(lower)) return 'policy_impact';
  if (/scenario|what\s+if/i.test(lower)) return 'scenario_analysis';

  return 'generic_public_analysis';
}

// ---------------------------------------------------------------------------
// Required inputs per intent
// ---------------------------------------------------------------------------

function requiredInputsForIntent(
  intent: CitizenForecastIntent,
  context: { country?: string | null; time_horizon?: string | null; currency?: string | null; risk_tolerance?: string | null; location?: string | null; answers?: Record<string, string> },
): CitizenRequiredInput[] {
  const inputs: CitizenRequiredInput[] = [];

  switch (intent) {
    case 'country_politics':
      if (!context.country) {
        inputs.push({ id: 'country', field: 'country', label: 'Which country?', required: true });
      }
      if (!context.time_horizon) {
        inputs.push({ id: 'time_horizon', field: 'time_horizon', label: 'What time horizon?', required: true });
      }
      break;

    case 'asset_allocation':
      if (!context.time_horizon) {
        inputs.push({ id: 'time_horizon', field: 'time_horizon', label: 'What time horizon?', required: true });
      }
      if (!context.currency) {
        inputs.push({ id: 'currency', field: 'currency', label: 'What currency or investor context?', required: true });
      }
      if (context.time_horizon && context.currency) {
        if (!context.risk_tolerance) {
          inputs.push({ id: 'risk_tolerance', field: 'risk_tolerance', label: 'What is your risk tolerance?', required: true });
        }
        if (!context.answers?.['country_impact']) {
          inputs.push({ id: 'country_impact', field: 'country_impact', label: 'Should we explain impact on your country?', required: true });
        }
      }
      break;

    case 'commodity_safe_haven':
      if (!context.time_horizon) {
        inputs.push({ id: 'time_horizon', field: 'time_horizon', label: 'What time horizon?', required: true });
      }
      if (!context.currency) {
        inputs.push({ id: 'currency', field: 'currency', label: 'What currency or saver context?', required: true });
      }
      if (!context.country) {
        inputs.push({ id: 'country', field: 'country', label: 'Which country?', required: true });
      }
      if (!inputs.length && !context.answers?.['comparison_basis']) {
        inputs.push({ id: 'comparison_basis', field: 'comparison_basis', label: 'Comparison basis?', required: true });
      }
      break;

    case 'local_climate_risk':
      if (!context.location) {
        inputs.push({ id: 'location', field: 'location', label: 'Where do you live?', required: true });
      }
      if (!context.time_horizon) {
        inputs.push({ id: 'time_horizon', field: 'time_horizon', label: 'What time horizon?', required: true });
      }
      break;

    case 'global_geopolitics':
    case 'middle_east_conflict':
      if (!context.country && !context.answers?.['country_impact']) {
        inputs.push({ id: 'country_impact', field: 'country_impact', label: 'Should we explain impact on your country?', required: true });
      }
      if (!context.country && context.answers?.['country_impact']) {
        inputs.push({ id: 'country', field: 'country', label: 'Which country?', required: true });
      }
      // Only ask theater/frame if the prompt is ambiguous (no specific theater mentioned)
      if (intent === 'global_geopolitics' && !context.answers?.['theater_focus'] && !context.answers?.['conflict_frame'] && !context.answers?.['_has_specific_theater']) {
        inputs.push({ id: 'theater_focus', field: 'theater_focus', label: 'Which theater or conflict focus?', required: false });
        inputs.push({ id: 'conflict_frame', field: 'conflict_frame', label: 'Escalation risk or de-escalation path?', required: false });
      }
      if (!context.time_horizon) {
        inputs.push({ id: 'time_horizon', field: 'time_horizon', label: 'What time horizon?', required: true });
      }
      break;

    case 'macroeconomy':
      if (!context.country && !context.answers?.['country_impact']) {
        inputs.push({ id: 'country_impact', field: 'country_impact', label: 'Should we explain impact on your country?', required: true });
      }
      if (!context.country && context.answers?.['country_impact']) {
        inputs.push({ id: 'country', field: 'country', label: 'Which country?', required: true });
      }
      if (!context.time_horizon) {
        inputs.push({ id: 'time_horizon', field: 'time_horizon', label: 'What time horizon?', required: true });
      }
      break;

    default:
      if (!context.time_horizon) {
        inputs.push({ id: 'time_horizon', field: 'time_horizon', label: 'What time horizon?', required: true });
      }
      break;
  }

  return inputs;
}

// ---------------------------------------------------------------------------
// Normalize prompt — strip appended user context, extract base question
// ---------------------------------------------------------------------------

function normalizePrompt(prompt: string): string {
  const contextIdx = prompt.indexOf('User context:');
  if (contextIdx > 0) {
    return prompt.slice(0, contextIdx).trim();
  }
  return prompt.trim();
}

// ---------------------------------------------------------------------------
// Extract answers from appended context block
// ---------------------------------------------------------------------------

function extractAnswersFromPrompt(prompt: string): Record<string, string> {
  const answers: Record<string, string> = {};
  const contextIdx = prompt.indexOf('User context:');
  if (contextIdx < 0) return answers;

  const contextBlock = prompt.slice(contextIdx);
  const lines = contextBlock.split(/\n/);
  for (const line of lines) {
    const match = line.match(/^(Country|Preferred time horizon|Country or currency context|Country impact lens|Comparison basis|Currency|Risk tolerance|Location|Theater focus|Conflict frame|Scope):\s*(.+)$/i);
    if (match) {
      const key = match[1].toLowerCase()
        .replace('preferred time horizon', 'time_horizon')
        .replace('country or currency context', 'currency')
        .replace('country impact lens', 'country_impact')
        .replace('comparison basis', 'comparison_basis')
        .replace('theater focus', 'theater_focus')
        .replace('conflict frame', 'conflict_frame')
        .replace('risk tolerance', 'risk_tolerance')
        .replace(/\s+/g, '_');
      answers[key] = match[2].trim();
    }
  }
  return answers;
}

// ---------------------------------------------------------------------------
// Deduplicate repeated words (e.g., "investors investors" -> "investors")
// ---------------------------------------------------------------------------

function deduplicateWords(text: string): string {
  return text.replace(/\b(\w+)\s+\1\b/gi, '$1');
}

// ---------------------------------------------------------------------------
// Cluster label for intent
// ---------------------------------------------------------------------------

function clusterForIntent(intent: CitizenForecastIntent): string {
  const clusters: Record<string, string> = {
    country_politics: 'Political stability',
    asset_allocation: 'Asset allocation',
    commodity_safe_haven: 'Gold and safe-haven assets',
    local_climate_risk: 'Climate and extreme weather',
    global_geopolitics: 'Great power tensions',
    middle_east_conflict: 'Middle East conflict',
    macroeconomy: 'Global recession risk',
  };
  return clusters[intent] || 'Public strategic forecast';
}

function categoryForIntent(intent: CitizenForecastIntent): string {
  const categories: Record<string, string> = {
    global_geopolitics: 'geopolitical',
    middle_east_conflict: 'geopolitical',
    country_politics: 'political',
    macroeconomy: 'economic',
    asset_allocation: 'financial',
    commodity_safe_haven: 'commodity',
    local_climate_risk: 'climate',
  };
  return categories[intent] || 'general';
}

function titleForIntent(intent: CitizenForecastIntent): string {
  const titles: Record<string, string> = {
    global_geopolitics: 'Great power tensions outlook',
    middle_east_conflict: 'Middle East conflict trajectory',
    country_politics: 'Political stability outlook',
    macroeconomy: 'Global recession risk',
    asset_allocation: 'Asset allocation guidance',
    commodity_safe_haven: 'Safe-haven assets outlook',
    local_climate_risk: 'Climate risk outlook',
  };
  return titles[intent] || 'Strategic outlook';
}

function parseHorizonDays(horizon: string | null): number {
  if (!horizon) return 365;
  const months = horizon.match(/(\d+)\s+months?/i);
  if (months) return parseInt(months[1]) * 30;
  const years = horizon.match(/(\d+)\s+years?/i);
  if (years) return parseInt(years[1]) * 365;
  return 365;
}

function buildQuestionText(
  intent: CitizenForecastIntent,
  ctx: {
    country: string | null;
    timeHorizon: string | null;
    currency: string | null;
    riskTolerance: string | null;
    basePrompt: string;
  },
): string {
  const horizon = ctx.timeHorizon || '12 months';

  switch (intent) {
    case 'commodity_safe_haven':
      return `Will safe-haven assets (gold, etc.) gain or lose value over the next ${horizon}${ctx.currency ? ` for ${deduplicateWords(ctx.currency)}` : ''}?`;

    case 'asset_allocation':
      return `How should ${deduplicateWords(ctx.currency || 'investors')} position between stocks, cash, and alternatives over the next ${horizon} given a ${ctx.riskTolerance || 'medium'} risk tolerance?`;

    case 'country_politics':
      return `Will ${ctx.country || 'the country'} remain politically stable over the next ${horizon}, or are unrest and leadership changes more likely?`;

    case 'global_geopolitics':
      return `Will great power tensions escalate or de-escalate over the next ${horizon}${ctx.country ? `, and what is the impact on ${ctx.country}` : ''}?`;

    case 'middle_east_conflict':
      return `Will the Middle East conflict follow a contained conflict path or escalate regionally over the next ${horizon}${ctx.country ? `, and what is the impact on ${ctx.country}` : ''}?`;

    case 'macroeconomy':
      return `Will the global economy enter a recession or maintain growth over the next ${horizon}${ctx.country ? `, and what is the recession impact on ${ctx.country}` : ''}?`;

    case 'local_climate_risk':
      return `Will climate change make extreme weather significantly worse over the next ${horizon}?`;

    default:
      return ctx.basePrompt;
  }
}

// ---------------------------------------------------------------------------
// Evaluate question intake
// ---------------------------------------------------------------------------

export function evaluateQuestionIntake(params: {
  prompt: string;
  knownContext?: {
    intent?: CitizenForecastIntent;
    decision_use?: string;
  };
  clarificationState?: ClarificationState;
  mode?: 'public' | 'internal';
  audience?: 'public' | 'analyst';
}): QuestionIntakeResponse {
  const { prompt, knownContext, clarificationState } = params;

  const appendedAnswers = extractAnswersFromPrompt(prompt);
  const basePrompt = normalizePrompt(prompt);

  const allAnswers: Record<string, string> = {
    ...appendedAnswers,
    ...(clarificationState?.answers || {}),
  };

  const intent = knownContext?.intent ?? classifyIntent(basePrompt);

  const currency = allAnswers.currency || extractCurrency(basePrompt) || null;
  const country = allAnswers.country || extractCountry(basePrompt) || inferCountryFromCurrency(currency) || null;
  const timeHorizon = allAnswers.time_horizon || extractHorizon(basePrompt) || null;
  const riskTolerance = allAnswers.risk_tolerance || null;
  const location = allAnswers.location || null;

  const requiredInputs = requiredInputsForIntent(intent, {
    country,
    time_horizon: timeHorizon,
    currency,
    risk_tolerance: riskTolerance,
    location,
    answers: allAnswers,
  });

  // For global_geopolitics, check if prompt has a specific theater
  if (intent === 'global_geopolitics' && hasSpecificTheater(basePrompt)) {
    allAnswers['_has_specific_theater'] = 'true';
  }

  // Re-compute required inputs with updated answers (for theater detection)
  const finalRequiredInputs = requiredInputsForIntent(intent, {
    country,
    time_horizon: timeHorizon,
    currency,
    risk_tolerance: riskTolerance,
    location,
    answers: allAnswers,
  });

  const askedIds = clarificationState?.askedQuestionIds ?? [];
  const totalAsked = clarificationState?.totalQuestionsAsked ?? 0;
  const remainingBudget = Math.max(0, MAX_QUESTIONS - totalAsked);

  // Questions to display: required inputs not yet answered
  const questionsToShow = finalRequiredInputs
    .filter((input) => !allAnswers[input.id])
    .map((input) => ({ id: input.id, prompt: input.label }));

  // Split into already-displayed (asked but unanswered) and new
  const alreadyDisplayedUnanswered = questionsToShow.filter(
    (q) => askedIds.includes(q.id),
  );
  const newQuestions = questionsToShow.filter(
    (q) => !askedIds.includes(q.id),
  );

  // If budget is exhausted
  if (remainingBudget === 0) {
    const unansweredRequired = finalRequiredInputs.filter(
      (input) => input.required && !allAnswers[input.id],
    );
    const newUnansweredRequired = unansweredRequired.filter(
      (input) => !askedIds.includes(input.id),
    );

    if (newUnansweredRequired.length > 0) {
      // Blocked — new required question but no budget to ask it
      return {
        status: 'blocked',
        intent,
        confidence: 0.3,
        questions: [],
        remaining_question_budget: 0,
        question_context: {
          question: basePrompt,
          normalized_prompt: basePrompt,
          intent,
          country,
          time_horizon: timeHorizon,
          currency,
          risk_tolerance: riskTolerance,
          answers: allAnswers,
          clarification_status: 'blocked',
          completeness_score: 0.4,
          unresolved_dimensions: unansweredRequired.map((i) => i.id),
          required_inputs: finalRequiredInputs,
          asked_question_ids: askedIds,
          context_locked_fields: [],
          question_cluster: clusterForIntent(intent),
        },
      };
    }

    // Budget exhausted but no NEW required questions — either ready or needs_input for already-displayed
    const hasUnansweredAlreadyDisplayed = alreadyDisplayedUnanswered.length > 0;
    const status: QuestionIntakeResponse['status'] = hasUnansweredAlreadyDisplayed ? 'needs_input' : 'ready';

    return {
      status,
      intent,
      confidence: hasUnansweredAlreadyDisplayed ? 0.6 : 0.85,
      questions: alreadyDisplayedUnanswered,
      remaining_question_budget: 0,
      question_context: {
        question: basePrompt,
        normalized_prompt: basePrompt,
        intent,
        country,
        time_horizon: timeHorizon,
        currency,
        risk_tolerance: riskTolerance,
        answers: allAnswers,
        clarification_status: hasUnansweredAlreadyDisplayed ? 'needs_input' : 'ready',
        completeness_score: hasUnansweredAlreadyDisplayed ? 0.7 : 1,
        unresolved_dimensions: hasUnansweredAlreadyDisplayed
          ? alreadyDisplayedUnanswered.map((q) => q.id)
          : [],
        required_inputs: hasUnansweredAlreadyDisplayed ? finalRequiredInputs : [],
        asked_question_ids: askedIds,
        context_locked_fields: [],
        question_cluster: clusterForIntent(intent),
      },
    };
  }

  // Show already-displayed unanswered + new questions up to budget
  const displayQuestions = [...alreadyDisplayedUnanswered, ...newQuestions].slice(
    0,
    Math.max(remainingBudget, alreadyDisplayedUnanswered.length),
  );

  const hasUnansweredRequired = finalRequiredInputs.some(
    (input) => input.required && !allAnswers[input.id],
  );

  const status: QuestionIntakeResponse['status'] = hasUnansweredRequired
    ? 'needs_input'
    : 'ready';

  const completeness = status === 'ready' ? 1 : Math.min(0.9, 0.3 + totalAsked * 0.15);

  return {
    status,
    intent,
    confidence: completeness,
    questions: displayQuestions,
    remaining_question_budget: remainingBudget,
    clarification_questions: displayQuestions,
    question_context: {
      question: basePrompt,
      normalized_prompt: basePrompt,
      intent,
      country,
      time_horizon: timeHorizon,
      currency,
      risk_tolerance: riskTolerance,
      answers: allAnswers,
      clarification_status: status === 'ready' ? 'ready' : 'needs_input',
      completeness_score: completeness,
      unresolved_dimensions: hasUnansweredRequired
        ? finalRequiredInputs.filter((i) => i.required && !allAnswers[i.id]).map((i) => i.id)
        : [],
      required_inputs: hasUnansweredRequired ? finalRequiredInputs : [],
      asked_question_ids: askedIds,
      context_locked_fields: [],
      question_cluster: clusterForIntent(intent),
    },
  };
}

// ---------------------------------------------------------------------------
// Route citizen question — build the forecast question from clarified context
// ---------------------------------------------------------------------------

export function routeCitizenQuestion(
  prompt: string,
  context?: QuestionContextPayload,
): RouteResult {
  const basePrompt = normalizePrompt(prompt);
  const intent = context?.intent ?? classifyIntent(basePrompt);
  const country = context?.country || extractCountry(basePrompt) || null;
  const timeHorizon = context?.time_horizon || extractHorizon(basePrompt) || '12 months';
  const currency = context?.currency || extractCurrency(basePrompt) || null;
  const riskTolerance = context?.risk_tolerance || null;

  const horizonDays = parseHorizonDays(timeHorizon);
  const horizonLabel = timeHorizon;

  const questionText = buildQuestionText(intent, {
    country,
    timeHorizon,
    currency,
    riskTolerance,
    basePrompt,
  });

  const requiredInputs = requiredInputsForIntent(intent, {
    country,
    time_horizon: timeHorizon,
    currency,
    risk_tolerance: riskTolerance,
  });

  return {
    intent,
    horizonDays,
    category: categoryForIntent(intent),
    question: questionText,
    requiredInputs,
    horizonLabel,
    questionType: 'directional',
    title: titleForIntent(intent),
  };
}

// ---------------------------------------------------------------------------
// Assess context alignment
// ---------------------------------------------------------------------------

export function assessContextAlignment(params: {
  route: RouteResult;
  questionContext?: QuestionContextPayload;
  evidenceBacked: boolean;
  sourceCount: number;
  distinctProviderCount: number;
  retrievalCount?: number;
}): ContextAlignmentSummary {
  const { route, questionContext, evidenceBacked, sourceCount, distinctProviderCount } = params;
  const gaps: string[] = [];
  const recommendations: string[] = [];
  let score = 0.5;

  if (questionContext?.completeness_score) {
    score = questionContext.completeness_score;
  }

  if (!evidenceBacked) {
    gaps.push('No evidence backing');
    recommendations.push('Gather supporting evidence');
    score -= 0.1;
  }

  if (sourceCount < 2) {
    gaps.push('Insufficient sources');
    recommendations.push('Retrieve additional sources');
    score -= 0.1;
  }

  if (distinctProviderCount < 2) {
    gaps.push('Single provider dependency');
    recommendations.push('Diversify evidence providers');
    score -= 0.05;
  }

  score = Math.max(0, Math.min(1, score));

  return {
    aligned: gaps.length === 0,
    score,
    gaps,
    recommendations,
  };
}

// ---------------------------------------------------------------------------
// Build question package from route
// ---------------------------------------------------------------------------

export function buildQuestionPackageFromRoute(
  route: RouteResult,
  options: { title: string; horizonDays: number },
): { title: string; intent: CitizenForecastIntent; horizonDays: number; category: string } {
  return {
    title: options.title,
    intent: route.intent,
    horizonDays: options.horizonDays,
    category: route.category,
  };
}

// ---------------------------------------------------------------------------
// Build public answer — with evidence-withholding safety behavior
// ---------------------------------------------------------------------------

export function buildPublicAnswer(params: {
  prompt: string;
  summary: string;
  route: RouteResult;
  evidenceBacked?: boolean;
  probability?: number;
  confidence?: number;
  retrievalCount?: number;
  distinctProviderCount?: number;
  disagreementIndex?: number;
  contradictionPoints?: string[];
  missingEvidence?: string[];
  questionContext?: QuestionContextPayload;
}): PublicAnswer {
  const {
    summary,
    evidenceBacked,
    probability,
    confidence,
    route,
    contradictionPoints,
    missingEvidence,
    questionContext,
  } = params;

  if (!evidenceBacked) {
    return {
      summary: summary.slice(0, 500),
      keyFindings: [],
      confidenceLevel: 'low',
      caveats: ['This analysis is not backed by retrieved evidence.'],
      answer_release_status: 'insufficient_evidence',
      direct_answer:
        'We are withholding a citizen-ready public call because the evidence base is insufficient for a responsible forecast.',
      best_current_call: 'Insufficient evidence for a public call',
      what_to_do_next: 'Additional evidence retrieval is needed before a public answer can be released.',
      what_could_change_it: missingEvidence?.join(' ') || 'More diverse evidence sources would be needed.',
      why_this_is_the_call:
        'The evidence gate requires sufficient backing from multiple independent sources before releasing a public forecast.',
      time_horizon: route.horizonLabel || questionContext?.time_horizon || undefined,
      required_inputs: route.requiredInputs,
      context_locked_fields: questionContext?.context_locked_fields || [],
    };
  }

  const caveats: string[] = [];
  if (contradictionPoints && contradictionPoints.length > 0) {
    caveats.push(...contradictionPoints);
  }

  return {
    summary: summary.slice(0, 500),
    keyFindings: [],
    confidenceLevel: confidence && confidence > 0.7 ? 'high' : confidence && confidence > 0.4 ? 'medium' : 'low',
    caveats,
    forecastProbability: probability,
    answer_release_status: 'ready',
    direct_answer: `Based on current evidence, our best current call is ${probability != null ? `${(probability * 100).toFixed(0)}% ` : ''}for this outcome.`,
    best_current_call: probability != null ? `${(probability * 100).toFixed(0)}%` : 'Trending toward the stated outcome',
    what_to_do_next: 'Monitor the key drivers identified in the analysis for changes.',
    what_could_change_it: missingEvidence?.join(' ') || 'New evidence could shift this assessment.',
    why_this_is_the_call:
      'The evidence base supports a directional call with moderate confidence based on retrieved sources.',
    time_horizon: route.horizonLabel || questionContext?.time_horizon || undefined,
    required_inputs: route.requiredInputs,
    context_locked_fields: questionContext?.context_locked_fields || [],
  };
}

// ---------------------------------------------------------------------------
// Append public question context
// ---------------------------------------------------------------------------

export function appendPublicQuestionContext(
  prompt: string,
  answers: Partial<Record<ClarificationQuestionId, string>>,
): string {
  const parts = [prompt];
  for (const [key, value] of Object.entries(answers)) {
    if (value?.trim()) {
      parts.push(`[${key.replace(/_/g, ' ')}: ${value.trim()}]`);
    }
  }
  return parts.join(' ');
}
