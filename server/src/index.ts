import { createServer } from 'node:http';
import { claudeAdvice } from './advice.ts';
import { createApp } from './app.ts';
import { openDatabase } from './db.ts';

/**
 * Configuration by environment variables:
 * - PORT (default 8787)
 * - DATABASE_PATH (default ./trainerr.sqlite)
 * - ALLOWED_ORIGINS: comma-separated app origins (default: the Capacitor app and the dev server)
 * - ANTHROPIC_API_KEY: key of the Claude API, needed for the advice only
 * - ADVICE_DAILY_LIMIT (default 10 per account and per day)
 */
const port = Number(process.env.PORT ?? 8787);
const app = createApp({
  db: openDatabase(process.env.DATABASE_PATH ?? './trainerr.sqlite'),
  advice: claudeAdvice(),
  allowedOrigins: (
    process.env.ALLOWED_ORIGINS ?? 'capacitor://localhost,https://localhost,http://localhost:5173'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  adviceDailyLimit: Number(process.env.ADVICE_DAILY_LIMIT ?? 10),
});

createServer((req, res) => void app(req, res)).listen(port, () => {
  console.log(`Trainerr server listening on port ${port}`);
});
