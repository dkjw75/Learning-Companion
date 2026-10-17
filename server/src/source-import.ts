import { createHash } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { BlockList, isIP } from 'node:net';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import type { Pool } from 'pg';
import robotsParser from 'robots-parser';
import { transaction } from './ai-store.js';

type Rejection = { url: string; reason: string };
export type ImportResult = { accepted: { url: string; chunkCount: number }[]; rejected: Rejection[]; chunkCount: number; ready: boolean };
type Passage = { heading: string; body: string };
type Page = { url: string; title: string; text: string; passages: Passage[] };

const blocked = new BlockList();
for (const [address, prefix, family] of [
  ['0.0.0.0', 8, 'ipv4'], ['10.0.0.0', 8, 'ipv4'], ['100.64.0.0', 10, 'ipv4'],
  ['127.0.0.0', 8, 'ipv4'], ['169.254.0.0', 16, 'ipv4'], ['172.16.0.0', 12, 'ipv4'],
  ['192.0.0.0', 24, 'ipv4'], ['192.168.0.0', 16, 'ipv4'], ['198.18.0.0', 15, 'ipv4'],
  ['224.0.0.0', 4, 'ipv4'], ['240.0.0.0', 4, 'ipv4'], ['::', 128, 'ipv6'],
  ['::1', 128, 'ipv6'], ['fc00::', 7, 'ipv6'], ['fe80::', 10, 'ipv6'],
  ['ff00::', 8, 'ipv6'],
] as const) blocked.addSubnet(address, prefix, family);

export function allowedUrl(raw: string) {
  if (raw.length > 2048) throw new Error('URL is too long');
  const url = new URL(raw);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || isIP(url.hostname))
    throw new Error('URL is not a public HTTPS page');
  if (!url.hostname.includes('.') || /\.(?:local|localhost|internal|test|invalid)$/i.test(url.hostname))
    throw new Error('URL is not a public HTTPS page');
  if (url.hostname === 'w3schools.com' || url.hostname.endsWith('.w3schools.com'))
    throw new Error('Source terms disallow automated fetching');
  url.hash = '';
  return url;
}

async function getText(raw: string, mediaType: string, maxBytes: number): Promise<{ url: string; text: string; robotsHeader: string }> {
  let current = raw;
  const signal = AbortSignal.timeout(10_000);
  for (let hop = 0; hop <= 3; hop++) {
    const url = allowedUrl(current);
    const addresses = await lookup(url.hostname, { all: true });
    if (!addresses.length || addresses.some(item => blocked.check(item.address, item.family === 4 ? 'ipv4' : 'ipv6')))
      throw new Error('Source host resolved to a non-public address');
    const address = addresses[0]!;
    const response = await new Promise<{ status: number; location?: string | undefined; robotsHeader?: string; body: Buffer }>((resolve, reject) => {
      const req = request(url, {
        signal, headers: { Accept: mediaType, 'Accept-Encoding': 'identity', 'User-Agent': 'LearningCompanion/1.0 (source discovery)' },
        family: address.family,
        lookup: (_host, _options, callback) => callback(null, address.address, address.family),
      }, res => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400) {
          res.resume();
          resolve({ status, location: res.headers.location, body: Buffer.alloc(0) });
          return;
        }
        if (status !== 200) { res.resume(); reject(new Error(`HTTP ${status}`)); return; }
        const type = res.headers['content-type'];
        const encoding = res.headers['content-encoding'];
        if (!String(type ?? '').toLowerCase().startsWith(mediaType) || (encoding && encoding !== 'identity')) {
          res.resume(); reject(new Error(`Response is not uncompressed ${mediaType}`)); return;
        }
        const length = Number(res.headers['content-length'] ?? 0);
        if (length > maxBytes) { res.resume(); reject(new Error('Response exceeds size limit')); return; }
        const parts: Buffer[] = [];
        let size = 0;
        res.on('data', (part: Buffer) => {
          size += part.length;
          if (size > maxBytes) req.destroy(new Error('Response exceeds size limit'));
          else parts.push(part);
        });
        res.on('end', () => resolve({ status, robotsHeader: String(res.headers['x-robots-tag'] ?? ''), body: Buffer.concat(parts) }));
        res.on('error', reject);
      });
      req.on('error', reject);
      req.end();
    });
    if (response.status >= 300 && response.status < 400) {
      if (!response.location || hop === 3) throw new Error('Too many or invalid redirects');
      current = new URL(response.location, url).href;
      continue;
    }
    if (url.hostname === 'vertexaisearch.cloud.google.com' && url.pathname.startsWith('/grounding-api-redirect/'))
      throw new Error('Grounding link did not resolve to a source page');
    return { url: url.href, text: new TextDecoder('utf-8', { fatal: true }).decode(response.body),
      robotsHeader: response.robotsHeader ?? '' };
  }
  throw new Error('Too many redirects');
}

export async function getHtml(raw: string): Promise<{ url: string; html: string }> {
  const page = await getText(raw, 'text/html', 2_000_000);
  if (/noindex|nosnippet|noarchive/i.test(page.robotsHeader)) throw new Error('Page disallows reuse');
  return { url: page.url, html: page.text };
}

async function checkRobots(pageUrl: string, cache: Map<string, Promise<string>>) {
  const url = new URL(pageUrl);
  const robotsUrl = `${url.origin}/robots.txt`;
  if (!cache.has(robotsUrl)) cache.set(robotsUrl, getText(robotsUrl, 'text/plain', 100_000)
    .then(result => result.text).catch(error => {
      if (error instanceof Error && error.message === 'HTTP 404') return '';
      throw error;
    }));
  const parse = robotsParser as unknown as (url: string, text: string) => { isAllowed: (url: string, agent: string) => boolean | undefined };
  if (parse(robotsUrl, await cache.get(robotsUrl)!).isAllowed(pageUrl, 'LearningCompanion') === false)
    throw new Error('Site disallows this page in robots.txt');
}

const stop = new Set(['a', 'an', 'and', 'are', 'can', 'compare', 'describe', 'explain', 'for', 'how', 'in', 'is', 'of', 'the', 'to', 'use', 'what', 'when', 'why', 'with']);
const terms = (text: string) => [...new Set((text.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [])
  .filter(word => !stop.has(word)).map(word => word.endsWith('ies') ? `${word.slice(0, -3)}y`
    : word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word))];

export function chunkArticle(html: string, url: string): { title: string; text: string; passages: Passage[] } {
  const document = new JSDOM(html, { url }).window.document;
  if (/noindex|nosnippet/i.test(document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? ''))
    throw new Error('Page disallows reuse');
  const article = new Readability(document).parse();
  if (!article?.content || !article.title) throw new Error('No readable article');
  const content = new JSDOM(article.content, { url }).window.document;
  const blocks: Passage[] = [];
  let heading = article.title.trim();
  for (const element of content.querySelectorAll('h1,h2,h3,h4,p,pre,li')) {
    const value = element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    if (!value) continue;
    if (/^H[1-4]$/.test(element.tagName)) heading = value.slice(0, 200);
    else if (value.split(/\s+/).length >= 8 && !element.parentElement?.closest('li')) blocks.push({ heading, body: value });
  }
  const text = blocks.map(block => block.body).join('\n');
  if (text.length > 100_000) throw new Error('Article exceeds text limit');
  const passages: Passage[] = [];
  let group: string[] = [];
  let words = 0;
  let currentHeading = heading;
  const flush = () => {
    if (words >= 100) passages.push({ heading: currentHeading, body: group.join('\n') });
    group = []; words = 0;
  };
  for (const block of blocks) {
    const count = block.body.split(/\s+/).length;
    if (count > 450) { flush(); continue; }
    if (group.length && (block.heading !== currentHeading || words + count > 450)) flush();
    currentHeading = block.heading;
    group.push(block.body); words += count;
  }
  flush();
  if (passages.some(passage => passage.body.length > 12_000)) throw new Error('Passage exceeds size limit');
  return { title: article.title.slice(0, 200), text, passages: passages.slice(0, 12) };
}

export function coversObjective(title: string, objective: string, page: Pick<Page, 'title' | 'passages'>) {
  const body = new Set(terms(`${page.title} ${page.passages.map(passage => `${passage.heading} ${passage.body}`).join(' ')}`));
  const titleTerms = terms(title);
  const objectiveTerms = terms(objective);
  const hits = (list: string[]) => list.filter(term => body.has(term)).length;
  return page.passages.length > 0 && titleTerms.length > 0
    && hits(titleTerms) / titleTerms.length >= 0.6 && hits(objectiveTerms) >= Math.min(2, objectiveTerms.length);
}

export async function importSources(pool: Pool, ownerId: string, nodeId: string, urls: string[]): Promise<ImportResult> {
  const saved = await pool.query<{ chunk_count: string }>(`select count(c.id)::text as chunk_count
    from app_private.discovered_source_snapshots s join app_private.discovered_source_chunks c on c.snapshot_id=s.id
    where s.owner_id=$1 and s.node_id=$2`, [ownerId, nodeId]);
  const previous = Number(saved.rows[0]?.chunk_count ?? 0);
  if (previous >= 2) return { accepted: [], rejected: [], chunkCount: previous, ready: true };
  const node = await pool.query<{ title: string; objective: string }>(
    'select title,objective from public.topic_tree_nodes where id=$1 and owner_id=$2', [nodeId, ownerId]);
  if (!node.rows[0]) throw new Error('Topic is unavailable');
  const accepted: Page[] = [];
  const rejected: Rejection[] = [];
  const robots = new Map<string, Promise<string>>();
  for (const url of urls.slice(0, 5)) {
    try {
      const fetched = await getHtml(url);
      await checkRobots(fetched.url, robots);
      const article = chunkArticle(fetched.html, fetched.url);
      if (!coversObjective(node.rows[0].title, node.rows[0].objective, article)) throw new Error('Page does not cover the learning objective');
      if (!accepted.some(page => page.url === fetched.url)) accepted.push({ url: fetched.url, ...article });
    } catch (error) {
      rejected.push({ url, reason: error instanceof Error ? error.message : 'Could not check page' });
    }
  }
  const chunkCount = accepted.reduce((total, page) => total + page.passages.length, 0);
  if (chunkCount < 2) return { accepted: [], rejected, chunkCount: 0, ready: false };
  await transaction(pool, async db => {
    for (const page of accepted) {
      const snapshot = await db.query<{ id: string }>(`insert into app_private.discovered_source_snapshots
        (owner_id,node_id,canonical_url,title,content_hash,extracted_text)
        values($1,$2,$3,$4,$5,$6) on conflict(owner_id,node_id,canonical_url) do nothing returning id`,
      [ownerId, nodeId, page.url, page.title, createHash('sha256').update(page.text).digest('hex'), page.text]);
      if (!snapshot.rows[0]) continue;
      for (const [ordinal, passage] of page.passages.entries()) await db.query(`insert into app_private.discovered_source_chunks
        (snapshot_id,heading,ordinal,body) values($1,$2,$3,$4)`,
      [snapshot.rows[0].id, passage.heading, ordinal, passage.body]);
    }
  });
  return { accepted: accepted.map(page => ({ url: page.url, chunkCount: page.passages.length })), rejected, chunkCount, ready: true };
}
