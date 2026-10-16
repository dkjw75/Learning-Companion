import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { createApp } from './app.js';
import { createLocalRunsService } from './ai-runs.js';
import { createGenerationService } from './generation.js';

config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });
const port = Number(process.env.PORT?.trim() || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}
const localRuns = process.env.NODE_ENV === 'production' || !process.env.DATABASE_URL?.trim()
  ? undefined : createLocalRunsService(process.env.DATABASE_URL.trim());
const generation = process.env.DATABASE_URL?.trim() ? createGenerationService(process.env.DATABASE_URL.trim()) : undefined;
const server = createApp(undefined, localRuns, generation).listen(port, '127.0.0.1', () => {
  console.info(`LearningCompanion API listening on http://127.0.0.1:${port}`);
});
server.on('error', error => {
  console.error(`API could not start (${error.message}).`);
  process.exitCode = 1;
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.close(() => {
    void Promise.all([localRuns?.close(), generation?.close()]).finally(() => process.exit(0));
  }));
}
