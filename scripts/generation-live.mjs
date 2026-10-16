import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { createGenerationService } from '../server/dist/generation.js';
import { createProfileService } from '../server/dist/auth.js';

process.loadEnvFile(resolve('.env'));
for (const name of ['GEMINI_API_KEY', 'GEMINI_MODEL', 'DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY']) {
  if (!process.env[name]?.trim()) throw new Error(`${name} is required for this opt-in live check.`);
}
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } });
const auth = await client.auth.signInAnonymously();
if (auth.error || !auth.data.session) throw new Error('Could not establish an isolated test guest.');
const profile = await createProfileService().getProfile(auth.data.session.access_token);
const service = createGenerationService();
const concepts = [
  ['clients-and-servers', '00000000-0000-4000-8000-000000000101'],
  ['http-requests-and-responses', '00000000-0000-4000-8000-000000000102'],
  ['what-an-api-does', '00000000-0000-4000-8000-000000000105'],
  ['tables-and-records', '00000000-0000-4000-8000-000000000109'],
];
try {
  for (const [slug, conceptId] of concepts.filter(([slug]) => !process.argv[2]
    || (process.argv[2] === 'remaining' && slug !== 'clients-and-servers') || slug === process.argv[2])) {
    try {
      const requestId = randomUUID();
      const first = await service.start(profile, conceptId, requestId);
      const repeated = await service.start(profile, conceptId, requestId);
      const fetched = await service.get(profile.userId, first.id);
      if (first.id !== repeated.id || first.id !== fetched?.id) throw new Error('Saved lesson was not reused.');
      const publicJson = JSON.stringify(first);
      if (publicJson.includes('correctOptionId') || publicJson.includes('feedbackCriteria')) throw new Error('Private assessment data leaked.');
      console.log(JSON.stringify({ concept: slug, result: 'validated', lessonId: first.id,
        steps: first.lesson.steps.length, questions: first.round.questions.length,
        citations: first.citations.length, reused: true }));
    } catch (error) {
      console.error(JSON.stringify({ concept: slug, result: 'failed', code: error?.code ?? 'UNEXPECTED',
        message: error?.message ?? 'Unknown failure' }));
      process.exitCode = 1;
    }
  }
} finally { await service.close(); }
