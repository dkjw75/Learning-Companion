// Database integration check with an explicitly synthetic provider response.
// No fixture is served to students; every saved test session is removed below.
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import { createGenerationService } from '../server/dist/generation.js';
import { createProfileService } from '../server/dist/auth.js';

process.loadEnvFile(resolve('.env'));
const auth = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } });
const signedIn = await auth.auth.signInAnonymously();
if (signedIn.error || !signedIn.data.session) throw new Error('Could not create a test guest.');
const profile = await createProfileService().getProfile(signedIn.data.session.access_token);
const database = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await database.connect();
const provider = async prompt => {
  const input = JSON.parse(prompt.split('INPUT DATA:\n')[1]);
  const citation = input.passages[0].id;
  const objective = input.objectives[0].id;
  return JSON.stringify({ title: `${input.title} test lesson`,
    diagrams: [{ id: 'diagram', title: 'Concept exchange', type: 'flow',
      nodes: [{ id: 'start', label: 'Start', description: 'The starting item.' },
        { id: 'end', label: 'End', description: 'The ending item.' }],
      edges: [{ id: 'connection', from: 'start', to: 'end', label: 'Connects' }] }],
    steps: Array.from({ length: 4 }, (_, i) => ({ id: `step${i}`, heading: `Step ${i + 1}`,
      caption: `Synthetic storage check for ${input.title}.`, diagramId: 'diagram',
      highlightNodeIds: ['start'], highlightEdgeIds: ['connection'], citationChunkIds: [citation] })),
    questions: Array.from({ length: 3 }, (_, i) => ({ id: `q${i}`, familyId: `family${i}`,
      prompt: `Synthetic question ${i + 1}?`, kind: i === 2 ? 'application' : 'recall',
      objectiveIds: [objective], citationChunkIds: [citation],
      options: Array.from({ length: 4 }, (_, j) => ({ id: `o${j}`, text: `Option ${j + 1}` })),
      correctOptionId: 'o0', feedbackCriteria: 'Synthetic private test criterion.' })),
  });
};
const service = createGenerationService(process.env.DATABASE_URL, provider);
const ids = [
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000102',
  '00000000-0000-4000-8000-000000000105',
  '00000000-0000-4000-8000-000000000109',
];
try {
  for (const conceptId of ids) {
    const requestId = randomUUID();
    const first = await service.start(profile, conceptId, requestId);
    const repeat = await service.start(profile, conceptId, requestId);
    const fetched = await service.get(profile.userId, first.id);
    if (first.id !== repeat.id || first.id !== fetched?.id) throw new Error('Session was not reused.');
    if (JSON.stringify(first).includes('correctOptionId')) throw new Error('Private answer key leaked.');
    const secret = await database.query('select answer_keys,feedback_criteria from app_private.assessment_secrets where round_id=$1', [first.round.id]);
    if (secret.rows[0]?.answer_keys.q0 !== 'o0' || !secret.rows[0]?.feedback_criteria.q0)
      throw new Error('Private key or feedback criterion was not saved.');
    const other = await service.get(randomUUID(), first.id);
    if (other) throw new Error('Another owner read the session.');
    console.log(JSON.stringify({ conceptId, result: 'synthetic storage check passed', reused: true,
      lessonSteps: first.lesson.steps.length, questions: first.round.questions.length }));
  }
} finally {
  await service.close();
  await database.query("delete from public.lesson_sessions where owner_id=$1 and lesson->>'title' like '% test lesson'", [profile.userId]);
  await database.query("delete from app_private.operation_requests where owner_id=$1 and operation_kind='stage6_lesson'", [profile.userId]);
  await database.end();
}
