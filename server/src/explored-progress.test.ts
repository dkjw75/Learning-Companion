import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { expect, it } from 'vitest';

it('marks saved lessons explored without lowering assessment status', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create schema app_private;
      create table public.lesson_sessions(owner_id text, concept_id text, generation_state text,
        lesson jsonb, created_at timestamptz default now());
      create table public.user_concept_progress(owner_id text, concept_id text,
        learning_status text, last_explored_at timestamptz, updated_at timestamptz default now(),
        primary key(owner_id, concept_id));
      insert into public.lesson_sessions(owner_id,concept_id,generation_state,lesson) values
        ('opened','topic','ready','{}'), ('assessed','topic','ready','{}'),
        ('unassessed','topic','ready','{}'), ('pending','topic','pending',null);
      insert into public.user_concept_progress(owner_id,concept_id,learning_status) values
        ('assessed','topic','developing'), ('unassessed','topic','not_assessed');`);
    await db.exec(await readFile(new URL('../../supabase/migrations/20261016000500_explored_progress.sql', import.meta.url), 'utf8'));
    const statuses = await db.query<{ owner_id: string; learning_status: string; explored: boolean }>(`
      select owner_id,learning_status,last_explored_at is not null as explored
      from public.user_concept_progress order by owner_id`);
    expect(statuses.rows).toEqual([
      { owner_id: 'assessed', learning_status: 'developing', explored: true },
      { owner_id: 'opened', learning_status: 'explored', explored: true },
      { owner_id: 'unassessed', learning_status: 'explored', explored: true },
    ]);
    await db.exec(`insert into public.lesson_sessions(owner_id,concept_id,generation_state,lesson)
      values ('new','topic','ready','{}');
      update public.lesson_sessions set generation_state='ready',lesson='{}' where owner_id='pending';`);
    const newStatuses = await db.query<{ owner_id: string; learning_status: string }>(`
      select owner_id,learning_status from public.user_concept_progress
      where owner_id in ('new','pending') order by owner_id`);
    expect(newStatuses.rows).toEqual([
      { owner_id: 'new', learning_status: 'explored' },
      { owner_id: 'pending', learning_status: 'explored' },
    ]);
  } finally { await db.close(); }
});
