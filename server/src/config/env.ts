import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('12h'),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().trim().transform((v) => v || 'gemini-3.5-flash').default('gemini-3.5-flash'),
  /** Used when the main model is overloaded (503/429). Empty = no fallback. */
  GEMINI_FALLBACK_MODEL: z.string().trim().default('gemini-3.8-flash'),
  R2_ACCOUNT_ID: z.string().optional().default(''),
  R2_ACCESS_KEY_ID: z.string().optional().default(''),
  R2_SECRET_ACCESS_KEY: z.string().optional().default(''),
  R2_BUCKET: z.string().optional().default(''),
  PORT: z.coerce.number().default(5050),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  SLA_DAYS: z.coerce.number().int().positive().default(21),
  NODE_ENV: z.string().default('development'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const r2Enabled = Boolean(
  env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET,
);
export const aiEnabled = Boolean(env.GEMINI_API_KEY);
