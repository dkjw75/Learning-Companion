import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

process.loadEnvFile(resolve('.env'));
const databaseUrl = process.env.DATABASE_URL;
const appUrl = process.env.VITE_SUPABASE_URL;
if (!databaseUrl || !appUrl) throw new Error('DATABASE_URL and VITE_SUPABASE_URL are required in .env.');
const target = new URL(databaseUrl);
const project = new URL(appUrl);
const projectRef = project.hostname.split('.')[0];
if (!['postgres:', 'postgresql:'].includes(target.protocol)
  || !target.hostname.endsWith('.supabase.com') && !target.hostname.endsWith('.supabase.co')
  || !target.username.includes(projectRef) && !target.hostname.includes(projectRef)
  || !target.password || project.protocol !== 'https:') {
  throw new Error('The database connection must be a password-protected Supabase URL for this app project.');
}

const action = process.argv[2];
if (!['dry-run', 'push'].includes(action)) throw new Error('Use dry-run or push.');
const args = [resolve('node_modules/supabase/dist/supabase.js'), 'db', 'push',
  '--db-url', databaseUrl, '--skip-vault', '--include-seed', '--yes'];
if (action === 'dry-run') args.push('--dry-run');
const redact = text => text.replaceAll(databaseUrl, '[DATABASE_URL]')
  .replaceAll(decodeURIComponent(target.password), '[DATABASE_PASSWORD]')
  .replaceAll(target.password, '[DATABASE_PASSWORD]');
const child = spawn(process.execPath, args, {
  cwd: resolve('.'),
  env: { ...process.env, SUPABASE_HOME: resolve('.supabase-home') },
  windowsHide: true,
});
let output = '';
let errors = '';
child.stdout.on('data', chunk => { output += String(chunk); });
child.stderr.on('data', chunk => { errors += String(chunk); });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('close', code => {
  process.stdout.write(redact(output));
  process.stderr.write(redact(errors));
  if (code) process.exitCode = code;
});
