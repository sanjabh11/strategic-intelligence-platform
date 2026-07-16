// Question Context Cache
// Lightweight localStorage cache for question context persistence

interface QuestionContextPayload {
  question: string;
  context?: string;
  timestamp: number;
}

const CACHE_KEY = 'sip_question_context';
const MAX_AGE_MS = 1000 * 60 * 60; // 1 hour

export function getCachedQuestionContext(): QuestionContextPayload | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuestionContextPayload;
    if (Date.now() - parsed.timestamp > MAX_AGE_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function persistQuestionContext(question: string, context?: string): void {
  try {
    const payload: QuestionContextPayload = {
      question,
      context,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Silently fail — cache is best-effort
  }
}
