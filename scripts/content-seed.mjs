import { resolve } from 'node:path';
import pg from 'pg';
import { importContent, loadContent } from './content-lib.mjs';

const content = await loadContent();
process.loadEnvFile(resolve('.env'));
const databaseUrl = process.env.DATABASE_URL;
const appUrl = process.env.VITE_SUPABASE_URL;
if (!databaseUrl || !appUrl) throw new Error('DATABASE_URL and VITE_SUPABASE_URL are required in .env.');
const target = new URL(databaseUrl);
const project = new URL(appUrl);
const projectRef = project.hostname.split('.')[0];
if (!['postgres:', 'postgresql:'].includes(target.protocol)
  || !['supabase.com', 'supabase.co'].some(host => target.hostname.endsWith(`.${host}`))
  || (!target.username.includes(projectRef) && !target.hostname.includes(projectRef))
  || !target.password || project.protocol !== 'https:') {
  throw new Error('The database connection must be a password-protected Supabase URL for this app project.');
}

// Local development smoke tool; provider-managed certificate chain is absent from this host's trust store.
const db = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
await db.connect();
try {
  await importContent(db, content);
  const rows = await db.query(`select c.slug, count(distinct sc.id)::int as sources, count(distinct ch.id)::int as chunks
    from public.concepts c join public.source_concepts cm on cm.concept_id=c.id
    join public.sources sc on sc.id=cm.source_id and sc.status='approved' and sc.permission_review='allowed'
    join public.source_chunks ch on ch.revision_id=sc.active_revision_id
    join public.chunk_concepts cc on cc.chunk_id=ch.id and cc.concept_id=c.id
    where c.slug=any($1) group by c.slug order by c.slug`, [[...content.coverage.keys()]]);
  for (const row of rows.rows) console.log(`${row.slug}: ${row.sources} active source(s), ${row.chunks} mapped chunk(s)`);
  if (rows.rowCount !== content.coverage.size || rows.rows.some(row => row.chunks < 2)) throw new Error('Post-import objective coverage failed.');
  const totals = await db.query(`select count(distinct s.id)::int as sources,
      count(distinct r.id)::int as revisions, count(distinct ch.id)::int as chunks,
      count(distinct cc.chunk_id)::int as mapped_chunks
    from public.sources s join public.source_revisions r on r.id=s.active_revision_id
    join public.source_chunks ch on ch.revision_id=r.id
    join public.chunk_concepts cc on cc.chunk_id=ch.id
    where s.canonical_url=any($1)`, [content.manifest.sources.map(source => source.url)]);
  const actual = totals.rows[0];
  if (actual.sources !== content.sourceCount || actual.revisions !== content.sourceCount
    || actual.chunks !== content.chunkCount || actual.mapped_chunks !== content.chunkCount) {
    throw new Error(`Unexpected source/revision/chunk totals: ${JSON.stringify(actual)}`);
  }
  console.log(`Verified ${actual.sources} source(s), ${actual.revisions} revision(s), ${actual.chunks} chunk(s), ${actual.mapped_chunks} mapped chunk(s).`);
  console.log('Content import complete.');
} finally { await db.end(); }
