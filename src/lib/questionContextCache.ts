// Question Context Cache
// Lightweight localStorage cache for question context persistence
// Cached answers are bound to a normalized prompt hash to prevent
// stale answers from a different intent being reused.

interface QuestionContextPayload {
  question: string;
  prompt?: string;
  promptHash?: string;
  intent?: string;
  context?: string;
  answers?: Record<string, string>;
  timestamp: number;
}

const CACHE_KEY = 'sip_question_context';
const MAX_AGE_MS = 1000 * 60 * 60; // 1 hour

function normalizePrompt(prompt: string): string {
  return prompt.trim().toLowerCase().replace(/\s+/g, ' ');
}

function hashPrompt(prompt: string): string {
  const normalized = normalizePrompt(prompt);
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `h_${hash}`;
}

export function getCachedQuestionContext(currentPrompt?: string): QuestionContextPayload | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuestionContextPayload;
    if (Date.now() - parsed.timestamp > MAX_AGE_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    // If a current prompt is provided, reject cache if prompt hash doesn't match
    if (currentPrompt !== undefined) {
      const currentHash = hashPrompt(currentPrompt);
      if (parsed.promptHash !== currentHash) {
        return null;
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

export function isCacheValidForPrompt(prompt: string): boolean {
  return getCachedQuestionContext(prompt) !== null;
}

export function persistQuestionContext(
  question: string,
  context?: string,
  answers?: Record<string, string>,
  intent?: string,
): void {
  try {
    const prompt = question;
    const payload: QuestionContextPayload = {
      question,
      prompt,
      promptHash: hashPrompt(prompt),
      intent,
      context,
      answers,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Silently fail — cache is best-effort
  }
}
