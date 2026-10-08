import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { z } from 'zod';
import { db } from '../src/server/db';
import { hashPassword } from '../src/server/auth';
import { defaultSettings } from '../src/lib/types';
async function hiddenPassword(): Promise<string> {
  if (!stdin.isTTY)
    throw new Error('Set OWNER_PASSWORD in your environment for non-interactive provisioning.');
  stdout.write('Password (at least 12 characters, input hidden): ');
  return new Promise((resolve, reject) => {
    let value = '';
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    const done = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', handle);
      stdout.write('\n');
    };
    const handle = (chunk: string) => {
      for (const c of chunk) {
        if (c === '\u0003') {
          done();
          reject(new Error('Cancelled.'));
          return;
        }
        if (c === '\r' || c === '\n') {
          done();
          resolve(value);
          return;
        }
        if (c === '\u007f' || c === '\b') value = value.slice(0, -1);
        else if (c >= ' ') value += c;
      }
    };
    stdin.on('data', handle);
  });
}
async function main() {
  const rl = createInterface({ input: stdin, output: stdout });
  const email = (process.env.OWNER_EMAIL || (await rl.question('Owner email: ')))
    .trim()
    .toLowerCase();
  rl.close();
  const password = process.env.OWNER_PASSWORD || (await hiddenPassword());
  z.email().parse(email);
  z.string().min(12).max(1024).parse(password);
  const passwordHash = await hashPassword(password);
  await db.$transaction(async (tx) => {
    await tx.owner.upsert({
      where: { id: 'owner' },
      create: {
        id: 'owner',
        email,
        passwordHash,
        settings: JSON.stringify({ ...defaultSettings, emailAddress: email }),
      },
      update: { email, passwordHash },
    });
    await tx.authSession.deleteMany();
    await tx.loginAttempt.deleteMany();
  });
  console.log('Owner account saved. Existing sessions have been signed out. You can now sign in.');
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
