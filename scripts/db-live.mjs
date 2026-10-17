import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

process.loadEnvFile(resolve('.env'));
const require = createRequire(import.meta.url);
const request = require('supertest');
const { createApp } = await import('../server/dist/http-app.js');
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
const databaseUrl = process.env.DATABASE_URL;
if (!url || !key || !databaseUrl) throw new Error('Supabase URL, publishable key, and DATABASE_URL are required.');

// The development Supabase database endpoint presents a provider-managed chain
// that is not in this host's trust store. This client is only a local smoke tool.
const database = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
await database.connect();
let privateId;
try {
  const seed = await database.query(`select count(*)::int as concepts,
    count(*) filter (where content_available)::int as available from public.concepts where owner_id is null`);
  assert.equal(seed.rows[0].concepts, 12);
  assert.equal(seed.rows[0].available, 0);
  assert.equal((await database.query('select count(*)::int as n from public.concept_edges where reviewed')).rows[0].n, 13);

  const guest = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const first = guest();
  const second = guest();
  const firstAuth = await first.auth.signInAnonymously();
  if (firstAuth.error) throw new Error(`Anonymous sign-in failed: ${firstAuth.error.message}`);
  const secondAuth = await second.auth.signInAnonymously();
  if (secondAuth.error) throw new Error(`Second anonymous sign-in failed: ${secondAuth.error.message}`);
  const firstUser = firstAuth.data.user;
  const secondUser = secondAuth.data.user;
  const firstToken = firstAuth.data.session?.access_token;
  const secondToken = secondAuth.data.session?.access_token;
  assert.ok(firstUser && secondUser && firstToken && secondToken);
  assert.notEqual(firstUser.id, secondUser.id);
  assert.equal(firstUser.is_anonymous, true);
  assert.equal(secondUser.is_anonymous, true);

  const app = createApp();
  const firstMe = await request(app).get('/api/me').set('Authorization', `Bearer ${firstToken}`).expect(200);
  const secondMe = await request(app).get('/api/me').set('Authorization', `Bearer ${secondToken}`).expect(200);
  assert.equal(firstMe.body.data.userId, firstUser.id);
  assert.equal(secondMe.body.data.userId, secondUser.id);
  assert.equal(firstMe.body.data.isAnonymous, true);
  const noToken = await request(app).get('/api/me').expect(401);
  assert.equal(noToken.body.error.code, 'UNAUTHENTICATED');

  const firstProfiles = await first.from('profiles').select('user_id');
  assert.ifError(firstProfiles.error);
  assert.deepEqual(firstProfiles.data.map(row => row.user_id), [firstUser.id]);
  const crossProfile = await first.from('profiles').select('user_id').eq('user_id', secondUser.id);
  assert.ifError(crossProfile.error);
  assert.deepEqual(crossProfile.data, []);
  const crossUpdate = await first.from('profiles').update({ timezone: 'Pacific/Honolulu' }).eq('user_id', secondUser.id).select('user_id');
  assert.ifError(crossUpdate.error);
  assert.deepEqual(crossUpdate.data, [], 'Owner RLS must hide another learner’s row from updates.');
  const unchanged = await database.query('select timezone from public.profiles where user_id=$1', [secondUser.id]);
  assert.notEqual(unchanged.rows[0].timezone, 'Pacific/Honolulu');

  privateId = randomUUID();
  await database.query(`insert into public.concepts(id,slug,title,area,supported,owner_id)
    values ($1,$2,'Isolation test concept','other',false,$3)`,
  [privateId, `isolation-${privateId}`, firstUser.id]);
  const ownConcept = await first.from('concepts').select('id').eq('id', privateId);
  const otherConcept = await second.from('concepts').select('id').eq('id', privateId);
  assert.ifError(ownConcept.error);
  assert.ifError(otherConcept.error);
  assert.equal(ownConcept.data.length, 1);
  assert.deepEqual(otherConcept.data, []);
  const crossConceptUpdate = await second.from('concepts').update({ title: 'Stolen' }).eq('id', privateId).select('id');
  assert.ok(crossConceptUpdate.error);
  const privateKeys = await first.from('assessment_secrets').select('round_id');
  assert.ok(privateKeys.error);
  const packMetadata = await first.from('content_packs').select('private_metadata');
  assert.ok(packMetadata.error);
  console.log('Live Supabase passed: 12 concepts/13 edges, two anonymous profiles, verified bearer API, owner isolation, mutation denial, and private-key boundary.');
} finally {
  if (privateId) await database.query('delete from public.concepts where id=$1', [privateId]);
  await database.end();
}
