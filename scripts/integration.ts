import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, closeSync, openSync } from 'node:fs';
import { defaultSettings } from '../src/lib/types';
// A fresh database prevents tests from touching the user's planner.
mkdirSync('artifacts/databases', { recursive: true });
const database = resolve('artifacts/databases', `integration-${randomUUID()}.db`);
process.env.DATABASE_URL = `file:${database.replaceAll('\\', '/')}`;
closeSync(openSync(database, 'a'));
execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
  env: process.env,
  stdio: 'pipe',
});
const { db } = await import('../src/server/db');
const { syncReminders, processReminders } = await import('../src/server/reminders');
const { hashPassword, verifyPassword } = await import('../src/server/auth');
const { getData } = await import('../src/server/data');
const { restoreBackup } = await import('../src/server/backup');
try {
  const settings = {
    ...defaultSettings,
    email: true,
    sms: true,
    emailAddress: 'test@example.com',
    phone: '+447700900123',
    offsets: [60],
  };
  const hash = await hashPassword('a-strong-test-password');
  assert.notEqual(hash, 'a-strong-test-password');
  assert.equal(await verifyPassword('a-strong-test-password', hash), true);
  assert.equal(await verifyPassword('wrong-password', hash), false);
  await db.owner.create({
    data: {
      id: 'owner',
      email: 'test@example.com',
      passwordHash: hash,
      settings: JSON.stringify(settings),
    },
  });
  const subject = await db.subject.create({ data: { name: 'Maths', colour: '#72957b' } });
  const instant = new Date('2026-10-08T12:00:00Z');
  const homework = await db.homework.create({
    data: {
      title: 'Integration test',
      subjectId: subject.id,
      assignedDate: '2026-10-08',
      dueDate: '2026-10-08',
      dueTime: '15:00',
      dueAt: new Date('2026-10-08T14:00:00Z'),
    },
  });
  await db.$transaction((tx) => syncReminders(tx, homework.id, settings, instant));
  await db.$transaction((tx) => syncReminders(tx, homework.id, settings, instant));
  assert.equal(await db.homeworkReminder.count(), 2, 'schedule repeated without duplication');
  let delivered = 0;
  const provider = {
    send: async () => {
      delivered++;
      return `message-${delivered}`;
    },
  };
  const at = new Date('2026-10-08T13:30:00Z');
  await Promise.all([
    processReminders({ email: provider, sms: provider }, at),
    processReminders({ email: provider, sms: provider }, at),
  ]);
  assert.equal(delivered, 2, 'concurrent cron sends each channel once');
  await processReminders({ email: provider, sms: provider }, at);
  assert.equal(delivered, 2, 'repeat cron does not resend');
  await assert.rejects(
    db.subject.delete({ where: { id: subject.id } }),
    'referenced subject deletion is restricted',
  );
  await db.homework.update({
    where: { id: homework.id },
    data: { dueAt: new Date('2026-10-09T14:00:00Z'), dueDate: '2026-10-09' },
  });
  await db.$transaction((tx) => syncReminders(tx, homework.id, settings, instant));
  assert.equal(
    await db.homeworkReminder.count({ where: { status: 'PENDING' } }),
    2,
    'changed deadline has new schedules',
  );
  await db.homework.update({
    where: { id: homework.id },
    data: { status: 'COMPLETED', completedAt: instant },
  });
  await db.$transaction((tx) => syncReminders(tx, homework.id, settings, instant));
  assert.equal(
    await db.homeworkReminder.count({ where: { status: 'PENDING' } }),
    0,
    'completed task cancels future reminders',
  );
  await db.homework.update({
    where: { id: homework.id },
    data: { status: 'NOT_STARTED', completedAt: null },
  });
  await db.$transaction((tx) => syncReminders(tx, homework.id, settings, instant));
  const fail = {
    send: async (): Promise<string> => {
      throw new Error('Simulated provider failure');
    },
  };
  await processReminders({ email: fail, sms: fail }, new Date('2026-10-09T13:30:00Z'));
  assert.equal(
    await db.homeworkReminder.count({ where: { status: 'FAILED' } }),
    2,
    'provider failure is recorded',
  );
  await processReminders({ email: provider, sms: provider }, new Date('2026-10-09T13:30:00Z'));
  assert.equal(delivered, 2, 'failed sends not retried automatically');
  const session = {
    id: randomUUID(),
    homeworkId: homework.id,
    subjectId: subject.id,
    startTime: instant,
    endTime: new Date(instant.getTime() + 60000),
    durationSeconds: 60,
    type: 'STOPWATCH',
  };
  await db.studySession.upsert({ where: { id: session.id }, create: session, update: {} });
  await db.studySession.upsert({ where: { id: session.id }, create: session, update: {} });
  assert.equal(await db.studySession.count(), 1, 'retry-safe session recording');
  // A disabled provider's backlog must not starve the available channel's due messages.
  await db.homework.update({
    where: { id: homework.id },
    data: { dueAt: new Date('2026-10-10T14:00:00Z'), dueDate: '2026-10-10' },
  });
  await db.$transaction((tx) => syncReminders(tx, homework.id, settings, instant));
  for (let i = 0; i < 101; i++)
    await db.homeworkReminder.create({
      data: {
        homeworkId: homework.id,
        channel: 'EMAIL',
        scheduledAt: instant,
        scheduleKey: `integration-blocked-${i}`,
      },
    });
  const before = delivered;
  const processed = await processReminders({ sms: provider }, new Date('2026-10-10T13:30:00Z'));
  assert.equal(delivered, before + 1, 'unconfigured email backlog cannot block available SMS');
  assert.equal(processed.unavailable, 102, 'unconfigured due messages remain visible');
  const backup = JSON.parse(JSON.stringify({ version: 1, ...(await getData()) }));
  await assert.rejects(
    restoreBackup({ ...backup, homework: [{ ...backup.homework[0], subjectId: 'missing' }] }),
    'missing references rejected before restore',
  );
  await assert.rejects(
    restoreBackup({ ...backup, homework: [{ ...backup.homework[0], dueDate: '2020-01-01' }] }),
    'due-before-assigned validation survives export schema',
  );
  assert.equal(await db.homework.count(), 1, 'invalid restore preserves existing data');
  await restoreBackup(backup);
  assert.equal(await db.homework.count(), 1, 'valid backup round-trip preserves homework');
  assert.equal(await db.studySession.count(), 1, 'valid backup round-trip preserves history');
  assert.equal(
    JSON.parse((await db.owner.findUniqueOrThrow({ where: { id: 'owner' } })).settings).email,
    false,
    'restore disables unexpected delivery',
  );
  await assert.rejects(
    restoreBackup({
      ...backup,
      subjects: [...backup.subjects, { ...backup.subjects[0], id: 'another-id' }],
    }),
    'duplicate subject name rejects restore',
  );
  assert.equal(await db.homework.count(), 1, 'transaction rollback preserves old homework');
  await db.homework.delete({ where: { id: homework.id } });
  assert.equal(await db.homeworkReminder.count(), 0, 'deleting homework cascades reminders');
  assert.equal(
    (await db.studySession.findUniqueOrThrow({ where: { id: session.id } })).homeworkId,
    null,
    'deleting homework preserves study history',
  );
  await db.subject.delete({ where: { id: subject.id } });
  assert.equal(
    (await db.studySession.findUniqueOrThrow({ where: { id: session.id } })).subjectId,
    null,
    'deleting unused subject preserves history',
  );
  console.log(
    'PASS: database CRUD, authentication hashing, safe deletion, scheduling, concurrent claims, completion cancellation, provider errors and idempotent session recording.',
  );
} finally {
  await db.$disconnect();
  rmSync(database, { force: true });
}
