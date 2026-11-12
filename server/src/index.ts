import app from './app';
import { aiEnabled, env, r2Enabled } from './config/env';

// On Vercel, src/app.ts is the entrypoint and this file is not used. Locally and on Render, listen.
if (!process.env.VERCEL) {
  app.listen(env.PORT, () => {
    console.log(`Kadata API on :${env.PORT} | AI: ${aiEnabled ? env.GEMINI_MODEL : 'off'} | storage: ${r2Enabled ? 'R2' : 'PostgreSQL'}`);
  });
}

export default app;
