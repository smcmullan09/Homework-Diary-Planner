// Optional local review helper. Never use this to configure a production owner.
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { db } from '../src/server/db';
import { hashPassword } from '../src/server/auth';
import { defaultSettings } from '../src/lib/types';
import { seedDemo } from './seed';
async function main() {
  if (process.env.NODE_ENV === 'production')
    throw new Error('Local preview is disabled in production.');
  // Keep only the final value of each owner variable in an existing review .env.
  const lines = readFileSync('.env', 'utf8').split(/\r?\n/);
  const seen = new Set<string>();
  const normalized = lines.reverse().filter(line => {
    const key = /^(OWNER_EMAIL|OWNER_PASSWORD)=/.exec(line)?.[1];
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).reverse().join('\n');
  writeFileSync('.env', normalized, { mode: 0o600 });
  if (!(await db.owner.findUnique({ where: { id: 'owner' } }))) {
    const password = randomBytes(20).toString('base64url');
    const email = 'owner@smm.local';
    await db.owner.create({
      data: {
        id: 'owner',
        email,
        passwordHash: await hashPassword(password),
        settings: JSON.stringify({ ...defaultSettings, emailAddress: email }),
      },
    });
    writeFileSync('.env', normalized.split('\n').filter(line => !/^OWNER_(EMAIL|PASSWORD)=/.test(line)).join('\n') + `\n# Local review account; change via npm run db:owner before real use.\nOWNER_EMAIL="${email}"\nOWNER_PASSWORD="${password}"\n`, { mode: 0o600 });
  }
  await seedDemo();
  console.log('Local review account is ready. Its credentials are in the ignored .env file.');
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
