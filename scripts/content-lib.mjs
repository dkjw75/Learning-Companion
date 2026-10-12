import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const starterSlugs = new Map([
  ['clients-and-servers', 'client-server-roles'],
  ['http-requests-and-responses', 'http-exchange'],
  ['what-an-api-does', 'api-contract'],
  ['tables-and-records', 'table-record'],
]);

export async function loadContent() {
  const manifest = JSON.parse(await readFile(resolve('content/starter-sources.json'), 'utf8'));
  return validateContent(manifest);
}

export function chunkText(text, limit = 900) {
  const sentences = text.trim().match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(part => part.trim()) ?? [];
  const chunks = [];
  let current = '';
  for (const sentence of sentences) {
    if (sentence.length > limit) throw new Error('One source sentence exceeds the chunk limit.');
    if (current && `${current} ${sentence}`.length > limit) {
      chunks.push(current);
      current = sentence;
    } else current = current ? `${current} ${sentence}` : sentence;
  }
  if (current) chunks.push(current);
  return chunks;
}

export function validateContent(manifest) {
  if (manifest.version !== 1 || !Array.isArray(manifest.sources)) throw new Error('Invalid content manifest version or sources.');
  const urls = new Set();
  const coverage = new Map([...starterSlugs.keys()].map(slug => [slug, 0]));
  for (const source of manifest.sources) {
    const url = new URL(source.url);
    if (url.protocol !== 'https:' || !['developer.mozilla.org', 'www.postgresql.org'].includes(url.hostname)) throw new Error(`Unapproved source host: ${source.url}`);
    if (urls.has(source.url)) throw new Error(`Duplicate source URL: ${source.url}`);
    urls.add(source.url);
    if (source.permissionReview !== 'allowed' || !source.license || !source.licenseUrl || !source.approvalBasis || !source.sourceVersion || !source.title) throw new Error(`Incomplete approval/permission metadata: ${source.url}`);
    if (starterSlugs.get(source.conceptSlug) !== source.objectiveId) throw new Error(`Unknown concept or objective: ${source.url}`);
    if (!Array.isArray(source.passages) || source.passages.length === 0) throw new Error(`No passages: ${source.url}`);
    for (const passage of source.passages) {
      if (!passage.heading?.trim() || !passage.sectionAnchor?.trim() || !passage.text?.trim()) throw new Error(`Empty passage or section anchor: ${source.url}`);
      const chunks = chunkText(passage.text);
      if (!chunks.length || chunks.some(chunk => chunk.length < 40)) throw new Error(`Passage is too short: ${source.url}`);
      coverage.set(source.conceptSlug, coverage.get(source.conceptSlug) + chunks.length);
    }
  }
  for (const [slug, count] of coverage) if (count < 2) throw new Error(`Objective lacks two traceable chunks: ${slug}`);
  return { manifest, coverage, sourceCount: urls.size, chunkCount: [...coverage.values()].reduce((a, b) => a + b, 0) };
}

export function sourceHash(source) {
  return createHash('sha256').update(JSON.stringify({ url: source.url, version: source.sourceVersion, passages: source.passages })).digest('hex');
}

export async function importContent(db, { manifest }) {
  await db.query('begin');
  try {
    for (const source of manifest.sources) {
      const concept = await db.query('select id, objectives from public.concepts where slug = $1 and owner_id is null', [source.conceptSlug]);
      if (concept.rowCount !== 1 || !concept.rows[0].objectives.some(objective => objective.id === source.objectiveId)) throw new Error(`Catalogue mismatch: ${source.conceptSlug}/${source.objectiveId}`);
      const sourceRow = await db.query(`insert into public.sources(canonical_url,title,host,permission_review,status)
        values($1,$2,$3,'allowed','draft') on conflict(canonical_url) do update set title=excluded.title,host=excluded.host,
        permission_review='allowed',updated_at=now() returning id`, [source.url, source.title, new URL(source.url).hostname]);
      const sourceId = sourceRow.rows[0].id;
      const revision = await db.query(`insert into public.source_revisions(source_id,content_hash,source_version,review_state,reviewed_at)
        values($1,$2,$3,'approved',now()) on conflict(source_id,content_hash) do update set review_state='approved'
        returning id`, [sourceId, sourceHash(source), source.sourceVersion]);
      const revisionId = revision.rows[0].id;
      await db.query(`insert into public.source_concepts(source_id,concept_id) values($1,$2) on conflict do nothing`, [sourceId, concept.rows[0].id]);
      let ordinal = 0;
      for (const passage of source.passages) for (const body of chunkText(passage.text)) {
        const chunk = await db.query(`insert into public.source_chunks(revision_id,heading,ordinal,body)
          values($1,$2,$3,$4) on conflict(revision_id,ordinal) do update set heading=excluded.heading,body=excluded.body
          returning id`, [revisionId, passage.heading, ordinal++, body]);
        await db.query(`insert into public.chunk_concepts(chunk_id,concept_id,objective_id)
          values($1,$2,$3) on conflict do nothing`, [chunk.rows[0].id, concept.rows[0].id, source.objectiveId]);
      }
      await db.query(`update public.sources set active_revision_id=$2,status='approved',updated_at=now() where id=$1`, [sourceId, revisionId]);
    }
    await db.query('commit');
  } catch (error) {
    await db.query('rollback');
    throw error;
  }
}
