// Public Forecasting
// Types and functions for citizen/public question routing and forecasting

export type CitizenForecastIntent =
  | 'generic_public_analysis'
  | 'binary_outcome'
  | 'directional_forecast'
  | 'scenario_analysis'
  | 'policy_impact'
  | 'market_prediction'
  | 'geopolitical_event';

export interface CitizenRequiredInput {
  field: string;
  label: string;
  required: boolean;
}

export interface QuestionContextPayload {
  question: string;
  context?: string;
  completeness_score?: number;
  context_locked_fields?: string[];
  unresolved_dimensions?: string[];
  question_cluster?: string;
  timestamp?: number;
}

export interface ContextAlignmentSummary {
  aligned: boolean;
  score: number;
  gaps: string[];
  recommendations: string[];
}

export interface PublicAnswer {
  summary: string;
  keyFindings: string[];
  confidenceLevel: 'low' | 'medium' | 'high';
  caveats: string[];
  forecastProbability?: number;
}

export type ClarificationQuestionId =
  | 'time_horizon'
  | 'geographic_scope'
  | 'decision_context'
  | 'success_criteria'
  | 'key_players'
  | 'baseline_assumption';

export interface ClarificationState {
  answers: Partial<Record<ClarificationQuestionId, string>>;
  askedQuestionIds: ClarificationQuestionId[];
  totalQuestionsAsked: number;
}

export interface QuestionIntakeResponse {
  status: 'ready' | 'needs_input' | 'blocked' | 'out_of_scope';
  intent: CitizenForecastIntent;
  question_context?: QuestionContextPayload;
  confidence: number;
  clarification_questions?: Array<{
    id: ClarificationQuestionId;
    prompt: string;
  }>;
}

interface RouteResult {
  intent: CitizenForecastIntent;
  horizonDays: number;
  category: string;
}

export function routeCitizenQuestion(
  prompt: string,
  _context?: QuestionContextPayload
): RouteResult {
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes('will ') || lowerPrompt.includes('probability of')) {
    return { intent: 'binary_outcome', horizonDays: 90, category: 'prediction' };
  }
  if (lowerPrompt.includes('price') || lowerPrompt.includes('market') || lowerPrompt.includes('stock')) {
    return { intent: 'market_prediction', horizonDays: 30, category: 'financial' };
  }
  if (lowerPrompt.includes('war') || lowerPrompt.includes('conflict') || lowerPrompt.includes('sanction')) {
    return { intent: 'geopolitical_event', horizonDays: 180, category: 'geopolitical' };
  }
  if (lowerPrompt.includes('policy') || lowerPrompt.includes('regulation') || lowerPrompt.includes('law')) {
    return { intent: 'policy_impact', horizonDays: 365, category: 'policy' };
  }
  if (lowerPrompt.includes('scenario') || lowerPrompt.includes('what if')) {
    return { intent: 'scenario_analysis', horizonDays: 180, category: 'scenario' };
  }

  return { intent: 'generic_public_analysis', horizonDays: 90, category: 'general' };
}

export function assessContextAlignment(params: {
  route: RouteResult;
  questionContext?: QuestionContextPayload;
  evidenceBacked: boolean;
  sourceCount: number;
  distinctProviderCount: number;
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

export function buildQuestionPackageFromRoute(
  route: RouteResult,
  options: { title: string; horizonDays: number }
): { title: string; intent: CitizenForecastIntent; horizonDays: number; category: string } {
  return {
    title: options.title,
    intent: route.intent,
    horizonDays: options.horizonDays,
    category: route.category,
  };
}

export function buildPublicAnswer(params: {
  prompt: string;
  summary: string;
  route: RouteResult;
  evidenceBacked?: boolean;
}): PublicAnswer {
  const { summary, evidenceBacked } = params;
  const caveats: string[] = [];

  if (!evidenceBacked) {
    caveats.push('This analysis is not backed by retrieved evidence.');
  }

  return {
    summary: summary.slice(0, 500),
    keyFindings: [],
    confidenceLevel: evidenceBacked ? 'medium' : 'low',
    caveats,
  };
}

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

  if (prompt.trim().length < 12) {
    return {
      status: 'blocked',
      intent: knownContext?.intent ?? 'generic_public_analysis',
      confidence: 0.2,
      question_context: {
        question: prompt,
        completeness_score: 0.1,
        unresolved_dimensions: ['prompt_too_short'],
        question_cluster: 'Public strategic forecast',
      },
    };
  }

  const route = routeCitizenQuestion(prompt);
  const askedCount = clarificationState?.totalQuestionsAsked ?? 0;
  const completeness = Math.min(1, 0.3 + (prompt.length / 500) * 0.3 + askedCount * 0.15);

  const needsClarification = completeness < 0.6 && askedCount < 3;

  return {
    status: needsClarification ? 'needs_input' : 'ready',
    intent: knownContext?.intent ?? route.intent,
    confidence: completeness,
    question_context: {
      question: prompt,
      completeness_score: completeness,
      context_locked_fields: [],
      unresolved_dimensions: needsClarification ? ['time_horizon', 'key_players'] : [],
      question_cluster: 'Public strategic forecast',
    },
    clarification_questions: needsClarification
      ? [
          { id: 'time_horizon', prompt: 'What time horizon are you considering?' },
          { id: 'key_players', prompt: 'Who are the key players or stakeholders?' },
        ]
      : undefined,
  };
}

export function appendPublicQuestionContext(
  prompt: string,
  answers: Partial<Record<ClarificationQuestionId, string>>
): string {
  const parts = [prompt];
  for (const [key, value] of Object.entries(answers)) {
    if (value?.trim()) {
      parts.push(`[${key.replace(/_/g, ' ')}: ${value.trim()}]`);
    }
  }
  return parts.join(' ');
}
