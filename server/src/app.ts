import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { aiEnabled, env, r2Enabled } from './config/env';
import { errorHandler } from './middleware/error';
import { authRouter } from './modules/auth/routes';
import { applicationsRouter } from './modules/applications/routes';
import { documentsRouter } from './modules/documents/routes';
import { aiRouter } from './modules/ai/routes';
import { insightsRouter } from './modules/insights/routes';

export function createApp() {
  const app = express();
  const origins = env.CORS_ORIGIN.split(',').map((o) => o.trim());

  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: origins, credentials: false }));
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  app.get('/api/health', (_req, res) => res.json({ ok: true, ai: aiEnabled, storage: r2Enabled ? 'r2' : 'db' }));

  app.use('/api/auth', authRouter);
  app.use('/api/applications', applicationsRouter);
  app.use('/api', documentsRouter);
  app.use('/api', aiRouter);
  app.use('/api', insightsRouter);

  app.use('/api', (_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }));
  app.use(errorHandler);
  return app;
}

/**
 * Vercel's Express preset uses src/app.ts as the function entrypoint (it is checked before
 * src/index.ts) and expects the Express app as the default export.
 */
const app = createApp();
export default app;
