import { loadContent } from './content-lib.mjs';

const result = await loadContent();
console.log(`Validated ${result.sourceCount} approved source URLs, ${result.chunkCount} mapped passages, and ${result.coverage.size} starter concepts.`);
for (const [slug, count] of result.coverage) console.log(`${slug}: ${count} mapped passage(s)`);
