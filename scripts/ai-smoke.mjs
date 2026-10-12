import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import { createGeminiProvider, runSmoke } from '../server/dist/ai.js';
import { createPgAiStore } from '../server/dist/ai-store.js';

process.loadEnvFile(resolve('.env'));
for (const name of ['GEMINI_API_KEY', 'GEMINI_MODEL', 'DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY']) {
  if (!process.env[name]?.trim()) throw new Error(`${name} is required for this opt-in live test.`);
}
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();
let source;
try {
  const concept = await db.query(`select id,title,objectives from public.concepts where slug='clients-and-servers' and owner_id is null`);
  if (concept.rowCount !== 1) throw new Error('Starter concept is missing.');
  const objective = concept.rows[0].objectives.find(item => item.id === 'client-server-roles');
  if (!objective) throw new Error('Starter objective is missing.');
  const chunks = await db.query(`select ch.id, ch.heading, ch.body, s.canonical_url, cc.objective_id
    from public.source_chunks ch
    join public.source_revisions r on r.id=ch.revision_id and r.review_state='approved'
    join public.sources s on s.id=r.source_id and s.active_revision_id=r.id
      and s.status='approved' and s.permission_review='allowed'
    join public.chunk_concepts cc on cc.chunk_id=ch.id and cc.concept_id=$1 and cc.objective_id=$2
    order by s.canonical_url, ch.ordinal limit 6`, [concept.rows[0].id, objective.id]);
  if (chunks.rowCount < 2) throw new Error('Not enough active approved chunks for the objective.');
  source = { conceptId: concept.rows[0].id, conceptTitle: concept.rows[0].title,
    objectiveId: objective.id, objectiveDescription: objective.description,
    passages: chunks.rows.map(row => ({ id: row.id, heading: row.heading, body: row.body,
      sourceUrl: row.canonical_url, objectiveId: row.objective_id })) };
} finally { await db.end(); }

const auth = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } });
const signedIn = await auth.auth.signInAnonymously();
if (signedIn.error || !signedIn.data.user) throw new Error('Could not create a test guest for quota ownership.');
const input = { ...source, ownerId: signedIn.data.user.id, isAnonymous: true, requestId: randomUUID() };
const repository = createPgAiStore();
try {
  const result = await runSmoke(input, repository.store, createGeminiProvider());
  console.log(JSON.stringify({ outcome: 'validated', model: process.env.GEMINI_MODEL,
    sourceChunks: input.passages.length, lessonSteps: result.output.lesson.steps.length,
    questions: result.output.questions.length, repaired: result.repaired, elapsedMs: result.elapsedMs,
    promptTokens: result.usage?.promptTokens, outputTokens: result.usage?.outputTokens,
    runsUrl: 'http://localhost:3000/api/runs' }));
} catch (error) {
  console.error(JSON.stringify({ outcome: 'failed', code: error?.code ?? 'UNEXPECTED', message: error?.message ?? 'Unknown failure' }));
  process.exitCode = 1;
} finally { await repository.close(); }
