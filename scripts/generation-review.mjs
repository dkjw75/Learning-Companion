// Prints public lesson/question content and cited approved passages for manual evaluation.
// Never queries private assessment secrets.
import { resolve } from 'node:path';
import pg from 'pg';

process.loadEnvFile(resolve('.env'));
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();
try {
  const ids = process.argv.slice(2);
  if (!ids.length || ids.some(id => !/^[0-9a-f-]{36}$/i.test(id))) throw new Error('Pass saved session UUIDs.');
  const result = await db.query(`select s.id,c.slug,s.lesson,s.citation_snapshot,r.questions
    from public.lesson_sessions s join public.concepts c on c.id=s.concept_id
    join public.assessment_rounds r on r.session_id=s.id and r.kind='initial'
    where s.id=any($1::uuid[]) and s.generation_state='ready'`, [ids]);
  for (const row of result.rows) {
    const chunks = await db.query(`select ch.id,ch.body from public.source_chunks ch
      where ch.id=any($1::uuid[])`, [row.citation_snapshot.map(item => item.id)]);
    console.log(JSON.stringify({ concept: row.slug, sessionId: row.id,
      lesson: { title: row.lesson.title, diagrams: row.lesson.diagrams,
        steps: row.lesson.steps.map(step => ({ heading: step.heading, caption: step.caption,
          explanation: step.explanation, workedExample: step.workedExample, commonMistake: step.commonMistake,
          citationChunkIds: step.citationChunkIds })) },
      questions: row.questions.map(question => ({ prompt: question.prompt, kind: question.kind,
        options: question.options, citationChunkIds: question.citationChunkIds })),
      passages: chunks.rows.map(chunk => ({ id: chunk.id, body: chunk.body })),
    }));
  }
} finally { await db.end(); }
