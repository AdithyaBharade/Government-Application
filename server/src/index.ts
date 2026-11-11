import { createApp } from './app';
import { aiEnabled, env, r2Enabled } from './config/env';

createApp().listen(env.PORT, () => {
  console.log(`Kadata API on :${env.PORT} | AI: ${aiEnabled ? env.GEMINI_MODEL : 'off'} | storage: ${r2Enabled ? 'R2' : 'PostgreSQL'}`);
});
