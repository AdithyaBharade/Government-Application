import { GoogleGenAI, type Part, type Schema } from '@google/genai';
import { aiEnabled, env } from '../../config/env';
import { AppError } from '../../lib/errors';

// 30s cap per call so an overloaded model fails fast instead of hanging the officer's screen
const client = aiEnabled ? new GoogleGenAI({ apiKey: env.GEMINI_API_KEY, httpOptions: { timeout: 30_000 } }) : null;

export const LANGUAGE_NAMES: Record<string, string> = {
  kn: 'Kannada',
  en: 'English',
  hi: 'Hindi',
  te: 'Telugu',
  ta: 'Tamil',
};

export interface GeminiResult<T> {
  data: T;
  latencyMs: number;
  model: string;
}

/** Overloaded / rate-limited – worth retrying or trying another model. */
function isTransient(err: unknown): boolean {
  const msg = String((err as Error)?.message ?? err).toLowerCase();
  return /\b(429|500|503|504)\b/.test(msg) || msg.includes('timeout') || msg.includes('aborted') || msg.includes('unavailable') || msg.includes('overloaded') || msg.includes('high demand') || msg.includes('quota');
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Primary model, then the fallback model straight away, then the primary once more after a short pause. */
const ATTEMPTS: Array<{ model: () => string; delayMs: number }> = [
  { model: () => env.GEMINI_MODEL, delayMs: 0 },
  { model: () => env.GEMINI_FALLBACK_MODEL || env.GEMINI_MODEL, delayMs: 0 },
  { model: () => env.GEMINI_MODEL, delayMs: 2000 },
];

/**
 * Calls Gemini and forces a JSON response that matches `schema`.
 * Any final failure becomes a 503 AI_UNAVAILABLE so the UI can tell the officer to continue manually –
 * the workflow never depends on AI being up.
 */
export async function generateJson<T>(parts: Part[], schema: Schema, systemInstruction: string): Promise<GeminiResult<T>> {
  if (!client) {
    throw new AppError(503, 'AI_UNAVAILABLE', 'AI assistant is not configured. You can continue without it.');
  }
  const started = Date.now();
  let lastErr: unknown;

  for (const attempt of ATTEMPTS) {
    if (attempt.delayMs) await sleep(attempt.delayMs);
    const model = attempt.model();
    try {
      const res = await client.models.generateContent({
        model,
        contents: [{ role: 'user', parts }],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0.2,
        },
      });
      const text = res.text;
      if (!text) throw new Error('Empty response from Gemini');
      return { data: JSON.parse(text) as T, latencyMs: Date.now() - started, model };
    } catch (err) {
      lastErr = err;
      console.error(`[gemini] ${model} failed:`, String((err as Error)?.message ?? err).slice(0, 200));
      if (!isTransient(err)) break; // bad request / bad JSON etc. – retrying won't help
    }
  }

  throw new AppError(
    503,
    'AI_UNAVAILABLE',
    isTransient(lastErr)
      ? 'AI assistant is busy right now. Please try again in a minute.'
      : 'AI assistant could not respond. You can continue without it.',
  );
}
