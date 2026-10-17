import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

const migration = await readFile(new URL('../supabase/migrations/20261008000100_baseline.sql', import.meta.url), 'utf8');
const questionGuard = await readFile(new URL('../supabase/migrations/20261009000100_public_question_guard.sql', import.meta.url), 'utf8');
const onboardingMigration = await readFile(new URL('../supabase/migrations/20261009000200_onboarding.sql', import.meta.url), 'utf8');
const broadInterestsMigration = await readFile(new URL('../supabase/migrations/20261009000300_broad_tech_interests.sql', import.meta.url), 'utf8');
const operatingSystemsInterestMigration = await readFile(new URL('../supabase/migrations/20261017000100_operating_systems_interest.sql', import.meta.url), 'utf8');
const aiOperationsMigration = await readFile(new URL('../supabase/migrations/20261009000400_ai_operations.sql', import.meta.url), 'utf8');
const assessmentPracticeMigration = await readFile(new URL('../supabase/migrations/20261016000300_assessment_practice.sql', import.meta.url), 'utf8');
const assessmentResultsMigration = await readFile(new URL('../supabase/migrations/20261016000400_assessment_results.sql', import.meta.url), 'utf8');
const seed = await readFile(new URL('../supabase/seed.sql', import.meta.url), 'utf8');
const a = '00000000-0000-4000-8000-000000000901';
const b = '00000000-0000-4000-8000-000000000902';
const privateId = '00000000-0000-4000-8000-000000000903';
const sessionId = '00000000-0000-4000-8000-000000000904';
const roundId = '00000000-0000-4000-8000-000000000905';

async function createDatabase() {
  const pg = new PGlite();
  await pg.exec(`
    create role anon;
    create role authenticated;
    create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    grant usage on schema auth to anon, authenticated, service_role;
  `);
  await pg.exec(migration);
  await pg.exec(questionGuard);
  await pg.exec(onboardingMigration);
  await pg.exec(broadInterestsMigration);
  await pg.exec(aiOperationsMigration);
  await pg.exec(assessmentPracticeMigration);
  await pg.exec(assessmentResultsMigration);
  await pg.exec(operatingSystemsInterestMigration);
  await pg.exec(seed);
  return pg;
}
async function asUser(pg, userId) {
  await pg.exec('set role authenticated');
  await pg.exec(`set request.jwt.claim.sub = '${userId}'`);
}
async function asOwner(pg) { await pg.exec('reset role'); }
async function expectDenied(fn, description) {
  let denied = false;
  try { await fn(); } catch (error) { denied = true; assert.match(error.message, /(permission denied|not found|does not exist|schema app_private|Round not found|Request ID was reused|non-public field)/i, description); }
  assert.ok(denied, description);
}

const pg = await createDatabase();
try {
  // Seed re-entry does not duplicate shared metadata or reset future availability.
  await pg.exec(seed);
  assert.equal((await pg.query('select count(*)::int as n from public.concepts')).rows[0].n, 12);
  assert.equal((await pg.query('select count(*)::int as n from public.concept_edges')).rows[0].n, 13);
  assert.equal((await pg.query('select count(*)::int as n from public.concepts where content_available')).rows[0].n, 0);
  await pg.query('insert into auth.users(id) values ($1),($2)', [a,b]);
  assert.equal((await pg.query('select count(*)::int as n from public.profiles')).rows[0].n, 2);
  await pg.query(`insert into public.concepts(id,slug,title,area,supported,owner_id)
    values ($1,'private-topic','Private topic','other',false,$2)`, [privateId,a]);

  await asUser(pg,a);
  assert.equal((await pg.query('select count(*)::int as n from public.profiles')).rows[0].n, 1);
  assert.equal((await pg.query('select count(*)::int as n from public.concepts')).rows[0].n, 13);
  assert.equal((await pg.query('select count(*)::int as n from public.profiles where user_id = $1',[b])).rows[0].n, 0);
  await pg.query('update public.profiles set interests = $1, experience_level = $2, diagnostic_evidence = $3, onboarding_complete = true where user_id = $4',
    [['operating_systems', 'cloud'], 'some', '[]', a]);
  assert.equal((await pg.query('select onboarding_complete from public.profiles where user_id = $1',[a])).rows[0].onboarding_complete, true);
  assert.equal((await pg.query('select count(*)::int as n from public.user_concept_progress')).rows[0].n, 0);
  const otherProfileUpdate = await pg.query('update public.profiles set experience_level = $1 where user_id = $2 returning user_id',['experienced',b]);
  assert.equal(otherProfileUpdate.rows.length, 0, 'Learners must not mutate another profile.');
  await expectDenied(() => pg.query('select * from app_private.assessment_secrets'), 'Private keys must not be readable.');
  await expectDenied(() => pg.query('select * from public.content_packs'), 'Private pack metadata must not be readable.');
  await asUser(pg,b);
  assert.equal((await pg.query('select count(*)::int as n from public.concepts')).rows[0].n, 12);
  assert.equal((await pg.query('select count(*)::int as n from public.concepts where id = $1',[privateId])).rows[0].n, 0);
  await asOwner(pg);

  const questions = [0,1,2].map(i => ({ id: `q-${i}`, familyId: `family-${i}`, prompt: `Question ${i}`,
    kind: i === 2 ? 'application' : 'recall', objectiveIds: ['objective-1'], citationChunkIds: [],
    options: [{id:'a',text:'A'},{id:'b',text:'B'}] }));
  await pg.query(`insert into public.lesson_sessions(id,owner_id,concept_id,mode,source_mode)
    values ($1,$2,$3,'learn','unverified')`, [sessionId,a,privateId]);
  await expectDenied(() => pg.query(`insert into public.assessment_rounds(id,session_id,owner_id,kind,questions,source_mode,assessment_basis)
    values ($1,$2,$3,'initial',$4,'unverified','ai_generated_key')`,
  [roundId,sessionId,a,JSON.stringify(questions.map((question, index) => index === 0
    ? { ...question, correctOptionId: 'a' } : question))]), 'Public question snapshots must reject answer keys.');
  await pg.query(`insert into public.assessment_rounds(id,session_id,owner_id,kind,questions,source_mode,assessment_basis)
    values ($1,$2,$3,'initial',$4,'unverified','ai_generated_key')`, [roundId,sessionId,a,JSON.stringify(questions)]);
  await pg.query(`insert into app_private.assessment_secrets(round_id,answer_keys)
    values ($1,$2)`, [roundId,JSON.stringify({'q-0':'a','q-1':'a','q-2':'a'})]);
  await asUser(pg,b);
  assert.equal((await pg.query('select count(*)::int as n from public.assessment_rounds')).rows[0].n, 0);
  await expectDenied(() => pg.query(`select public.submit_mcq_answer($1,'q-0','a',$2)`,[roundId,randomUUID()]), 'Another user must not submit answers to a private round.');
  await asUser(pg,a);
  const firstRequest = randomUUID();
  const first = (await pg.query(`select public.submit_mcq_answer($1,'q-0','a',$2) as result`,[roundId,firstRequest])).rows[0].result;
  assert.equal(first.completed,false);
  assert.equal(first.evidence.independent,true);
  assert.equal((await pg.query('select completed_at from public.lesson_sessions where id=$1',[sessionId])).rows[0].completed_at,null);
  const replay = (await pg.query(`select public.submit_mcq_answer($1,'q-0','a',$2) as result`,[roundId,firstRequest])).rows[0].result;
  assert.deepEqual(replay,first);
  await expectDenied(() => pg.query(`select public.submit_mcq_answer($1,'q-0','b',$2)`,[roundId,firstRequest]), 'A request ID cannot be reused with a different answer.');
  await pg.query(`select public.submit_mcq_answer($1,'q-1','a',$2)`,[roundId,randomUUID()]);
  const final = (await pg.query(`select public.submit_mcq_answer($1,'q-2','a',$2) as result`,[roundId,randomUUID()])).rows[0].result;
  assert.equal(final.completed,true);
  assert.equal(final.progressUpdate.currentStatus,'demonstrated_understanding');
  assert.equal(final.progressUpdate.sourceMode,'unverified');
  assert.equal(final.progressUpdate.assessmentBasis,'ai_generated_key');
  assert.ok((await pg.query('select completed_at from public.lesson_sessions where id=$1',[sessionId])).rows[0].completed_at);
  assert.equal((await pg.query('select completed_check_count from public.user_concept_progress where concept_id=$1',[privateId])).rows[0].completed_check_count,1);
  const practiceSessionId = randomUUID();
  const practiceRoundId = randomUUID();
  await asOwner(pg);
  await pg.query(`insert into public.lesson_sessions(id,owner_id,concept_id,mode,source_mode)
    values ($1,$2,$3,'learn','unverified')`, [practiceSessionId,a,privateId]);
  await pg.query(`insert into public.assessment_rounds(id,session_id,owner_id,kind,questions,source_mode,assessment_basis)
    values ($1,$2,$3,'initial',$4,'unverified','ai_generated_key')`, [practiceRoundId,practiceSessionId,a,JSON.stringify(questions)]);
  await pg.query(`insert into app_private.assessment_secrets(round_id,answer_keys) values ($1,$2)`,
    [practiceRoundId,JSON.stringify({'q-0':'a','q-1':'a','q-2':'a'})]);
  await asUser(pg,a);
  const hintId = randomUUID();
  const hint = (await pg.query(`select public.request_mcq_hint($1,'q-0',$2) as result`,[practiceRoundId,hintId])).rows[0].result;
  assert.equal(hint.assisted,true);
  assert.deepEqual((await pg.query(`select public.request_mcq_hint($1,'q-0',$2) as result`,[practiceRoundId,hintId])).rows[0].result,hint);
  const assistedFirst = (await pg.query(`select public.submit_mcq_answer($1,'q-0','b',$2) as result`,[practiceRoundId,randomUUID()])).rows[0].result;
  assert.equal(assistedFirst.evidence.independent,false);
  assert.equal((await pg.query('select learning_status from public.user_concept_progress where concept_id=$1',[privateId])).rows[0].learning_status,'demonstrated_understanding');
  const retryId = randomUUID();
  const retry = (await pg.query(`select public.submit_mcq_answer($1,'q-0','a',$2) as result`,[practiceRoundId,retryId])).rows[0].result;
  assert.equal(retry.evidence.attemptIndex,2);
  assert.equal(retry.evidence.independent,false);
  assert.deepEqual((await pg.query(`select public.submit_mcq_answer($1,'q-0','a',$2) as result`,[practiceRoundId,retryId])).rows[0].result,retry);
  await pg.query(`select public.submit_mcq_answer($1,'q-1','a',$2)`,[practiceRoundId,randomUUID()]);
  const practiceFinal = (await pg.query(`select public.submit_mcq_answer($1,'q-2','a',$2) as result`,[practiceRoundId,randomUUID()])).rows[0].result;
  assert.equal(practiceFinal.progressUpdate.currentStatus,'developing');
  assert.ok((await pg.query('select completed_at from public.lesson_sessions where id=$1',[practiceSessionId])).rows[0].completed_at);
  assert.equal((await pg.query('select completed_check_count from public.user_concept_progress where concept_id=$1',[privateId])).rows[0].completed_check_count,2);
  await asOwner(pg);
  assert.equal((await pg.query('select count(*)::int as n from public.answer_attempts')).rows[0].n,7);
  const second = await createDatabase();
  try { assert.equal((await second.query('select count(*)::int as n from public.concepts')).rows[0].n,12); }
  finally { await second.close(); }
  console.log('Embedded PostgreSQL smoke passed: migrations, owner isolation, key secrecy, hints, retries, and atomic progress.');
} finally { await pg.close(); }
