import { existsSync, readFileSync, writeFileSync, closeSync, openSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';
import { config } from 'dotenv';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
if (!existsSync('.env')) {
  let content = readFileSync('.env.example', 'utf8');
  content = content
    .replace('AUTH_SECRET=""', `AUTH_SECRET="${randomBytes(32).toString('hex')}"`)
    .replace('CRON_SECRET=""', `CRON_SECRET="${randomBytes(32).toString('hex')}"`)
    .replace('http://localhost:3000', 'http://127.0.0.1:3000');
  writeFileSync('.env', content, { mode: 0o600 });
  console.log('Created .env with unique local secrets.');
}
config({ quiet: true });
if (process.env.DATABASE_URL?.startsWith('file:')) {
  const file = process.env.DATABASE_URL.slice(5);
  const path = isAbsolute(file) ? file : resolve('prisma', file);
  if (!existsSync(path)) closeSync(openSync(path, 'a'));
}
execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'generate'], {
  stdio: 'inherit',
});
execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
  stdio: 'inherit',
});
console.log('Database ready. Next: npm run db:owner, then npm run dev. Optional: npm run db:seed.');
