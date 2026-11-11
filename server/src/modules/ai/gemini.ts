import { GoogleGenAI, type Part, type Schema } from '@google/genai';
import { aiEnabled, env } from '../../config/env';
import { AppError } from '../../lib/errors';

const client = aiEnabled ? new GoogleGenAI({ apiKey: env.GEMINI_API_KEY }) : null;

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

/**
 * Calls Gemini and forces a JSON response that matches `schema`.
 * Any failure becomes a 503 AI_UNAVAILABLE so the UI can tell the officer to continue manually –
 * the workflow never depends on AI being up.
 */
export async function generateJson<T>(parts: Part[], schema: Schema, systemInstruction: string): Promise<GeminiResult<T>> {
  if (!client) {
    throw new AppError(503, 'AI_UNAVAILABLE', 'AI assistant is not configured. You can continue without it.');
  }
  const started = Date.now();
  try {
    const res = await client.models.generateContent({
      model: env.GEMINI_MODEL,
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
    return { data: JSON.parse(text) as T, latencyMs: Date.now() - started, model: env.GEMINI_MODEL };
  } catch (err) {
    console.error('[gemini]', err);
    const msg = String((err as Error)?.message ?? '');
    const busy = msg.includes('429') || msg.toLowerCase().includes('quota');
    throw new AppError(
      503,
      'AI_UNAVAILABLE',
      busy ? 'AI assistant is busy right now. Please try again in a minute.' : 'AI assistant could not respond. You can continue without it.',
    );
  }
}
