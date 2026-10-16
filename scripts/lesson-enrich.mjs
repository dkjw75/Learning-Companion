// Opt-in update of named sessions. Gemini receives only their public lesson and cited passages.
import { createHash, randomUUID } from 'node:crypto';
import pg from 'pg';
import { lessonSchema } from '../shared/dist/index.js';
import { createGenerationProvider } from '../server/dist/generation.js';
import { enrichLessonContent, lessonContentResponseSchema } from '../server/dist/lesson-content.js';
import { reserveCall, transaction } from '../server/dist/ai-store.js';

process.loadEnvFile('.env');
if (!process.env.DATABASE_URL?.trim()) throw new Error('This application needs a configured database connection.');
const ids = process.argv.slice(2);
if (!ids.length || new Set(ids).size !== ids.length || ids.some(id => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)))
  throw new Error('Pass the existing lesson session UUIDs to enrich.');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 2 });
try {
  const provider = createGenerationProvider(undefined, undefined, lessonContentResponseSchema);
  const sessions = await pool.query(`select s.id,s.owner_id,s.lesson,coalesce(u.is_anonymous,true) as is_anonymous
    from public.lesson_sessions s join auth.users u on u.id=s.owner_id
    where s.id=any($1::uuid[]) and s.generation_state='ready'`, [ids]);
  if (sessions.rows.length !== ids.length) throw new Error('One of the named lessons is unavailable.');
  // Validate the full selection before spending any calls.
  for (const row of sessions.rows) lessonSchema.parse(row.lesson);
  for (const row of sessions.rows) {
    const lesson = lessonSchema.parse(row.lesson);
    const passages = (await pool.query('select id,body from public.source_chunks where id=any($1::uuid[])', [lesson.citationChunkIds])).rows;
    const operationId = randomUUID();
    await transaction(pool, async db => {
      await reserveCall(db, row.owner_id, row.is_anonymous);
      await db.query(`insert into app_private.operation_requests(id,owner_id,operation_kind,request_id,input_hash,state,usage_metadata)
        values($1,$2,'stage7_content_enrichment',$3,$4,'pending','{"calls":1}'::jsonb)`,
      [operationId, row.owner_id, randomUUID(), createHash('sha256').update(JSON.stringify({ lesson, passages })).digest('hex')]);
    });
    try {
      const enriched = await enrichLessonContent(lesson, passages, provider);
      await transaction(pool, async db => {
        const saved = await db.query(`update public.lesson_sessions set lesson=$1::jsonb,updated_at=now()
          where id=$2 and owner_id=$3 and generation_state='ready' and lesson=$4::jsonb returning id`,
        [JSON.stringify(enriched), row.id, row.owner_id, JSON.stringify(row.lesson)]);
        if (saved.rowCount !== 1) throw new Error('Lesson changed while updating; existing content was preserved.');
        await db.query(`update app_private.operation_requests set state='completed',result_id=$2,updated_at=now() where id=$1`, [operationId, row.id]);
      });
      console.log(JSON.stringify({ sessionId: row.id, result: 'content updated in place', steps: enriched.steps.length }));
    } catch (error) {
      await pool.query(`update app_private.operation_requests set state='failed',updated_at=now() where id=$1 and state='pending'`, [operationId]);
      console.error(JSON.stringify({ sessionId: row.id, result: 'not updated', code: error.code ?? 'INVALID_CONTENT' }));
      process.exitCode = 1;
    }
  }
} catch (error) {
  console.error(JSON.stringify({ result: 'enrichment stopped', code: error.code ?? 'INVALID_INPUT' }));
  process.exitCode = 1;
} finally { await pool.end(); }
