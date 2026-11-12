import { createApp } from './app';
import { aiEnabled, env, r2Enabled } from './config/env';

const app = createApp();

// On Vercel the app runs as a serverless function: Vercel imports the default export and
// routes requests to it, so we must not open a port. Everywhere else (local, Render) listen.
if (!process.env.VERCEL) {
  app.listen(env.PORT, () => {
    console.log(`Kadata API on :${env.PORT} | AI: ${aiEnabled ? env.GEMINI_MODEL : 'off'} | storage: ${r2Enabled ? 'R2' : 'PostgreSQL'}`);
  });
}

export default app;
