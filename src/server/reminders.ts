import { Prisma } from '@prisma/client';
import { DateTime } from 'luxon';
import { createHash } from 'node:crypto';
import { db } from './db';
import {
  defaultSettings,
  type Settings,
  type ReminderPreferences,
  type Channel,
} from '@/lib/types';
import { reminderPlan } from '@/lib/logic';
import {
  emailProvider,
  smsProvider,
  providerAvailability,
  escapeHtml,
  type NotificationProvider,
} from './providers';
export function readSettings(raw: string): Settings {
  return { ...defaultSettings, ...JSON.parse(raw) };
}
export async function syncReminders(
  tx: Prisma.TransactionClient,
  homeworkId: string,
  settings: Settings,
  now = new Date(),
) {
  const task = await tx.homework.findUniqueOrThrow({ where: { id: homeworkId } });
  const prefs: ReminderPreferences = task.reminderOverride
    ? JSON.parse(task.reminderOverride)
    : settings;
  const plan =
    task.status === 'COMPLETED'
      ? []
      : reminderPlan(
          task.id,
          task.dueAt,
          { ...prefs, email: prefs.email && settings.email, sms: prefs.sms && settings.sms },
          now,
        );
  // Keep past pending schedules if they still match the current deadline/preferences.
  const validKeys =
    task.status === 'COMPLETED'
      ? []
      : reminderPlan(
          task.id,
          task.dueAt,
          { ...prefs, email: prefs.email && settings.email, sms: prefs.sms && settings.sms },
          new Date(0),
        ).map((p) => p.scheduleKey);
  await tx.homeworkReminder.updateMany({
    where: { homeworkId, status: 'PENDING', scheduleKey: { notIn: validKeys } },
    data: { status: 'CANCELLED' },
  });
  for (const item of plan) {
    const prior = await tx.homeworkReminder.findUnique({
      where: { scheduleKey: item.scheduleKey },
    });
    if (!prior) await tx.homeworkReminder.create({ data: item });
    else if (prior.status === 'CANCELLED')
      await tx.homeworkReminder.update({
        where: { id: prior.id },
        data: { status: 'PENDING', error: null },
      });
  }
}
export async function processReminders(
  overrides?: Partial<{ email: NotificationProvider; sms: NotificationProvider }>,
  now = new Date(),
) {
  const stopAt = Date.now() + 240000;
  const owner = await db.owner.findUnique({ where: { id: 'owner' } });
  if (!owner) return { sent: 0, failed: 0, cancelled: 0, unavailable: 0 };
  const available = overrides
    ? { email: !!overrides.email, sms: !!overrides.sms }
    : providerAvailability();
  const channels = (['EMAIL', 'SMS'] as const).filter(
    (channel) => available[channel === 'EMAIL' ? 'email' : 'sms'],
  );
  // A crashed/uncertain attempt is never automatically retried (especially SMS).
  await db.homeworkReminder.updateMany({
    where: { status: 'SENDING', claimedAt: { lt: new Date(now.getTime() - 10 * 60000) } },
    data: {
      status: 'UNKNOWN',
      error:
        'Delivery was interrupted. Check the provider dashboard before sending another reminder.',
    },
  });
  const due = await db.homeworkReminder.findMany({
    where: { status: 'PENDING', scheduledAt: { lte: now }, channel: { in: channels } },
    orderBy: { scheduledAt: 'asc' },
    take: 100,
  });
  const unavailable = await db.homeworkReminder.count({
    where: { status: 'PENDING', scheduledAt: { lte: now }, channel: { notIn: channels } },
  });
  const result = { sent: 0, failed: 0, cancelled: 0, unavailable };
  for (const reminder of due) {
    if (Date.now() > stopAt) break;
    const channel = reminder.channel === 'EMAIL' ? 'email' : 'sms';
    const claim = await db.homeworkReminder.updateMany({
      where: { id: reminder.id, status: 'PENDING' },
      data: { status: 'SENDING', claimedAt: now },
    });
    if (claim.count !== 1) continue;
    const task = await db.homework.findUnique({
      where: { id: reminder.homeworkId },
      include: { subject: true },
    });
    const currentOwner = await db.owner.findUniqueOrThrow({ where: { id: 'owner' } });
    const currentSettings = readSettings(currentOwner.settings);
    const prefs: ReminderPreferences = task?.reminderOverride
      ? JSON.parse(task.reminderOverride)
      : currentSettings;
    const valid =
      task &&
      reminderPlan(task.id, task.dueAt, prefs, new Date(0)).some(
        (p) => p.scheduleKey === reminder.scheduleKey,
      );
    if (
      !task ||
      task.status === 'COMPLETED' ||
      task.dueAt <= now ||
      !currentSettings[channel] ||
      !valid
    ) {
      await db.homeworkReminder.updateMany({
        where: { id: reminder.id },
        data: { status: 'CANCELLED' },
      });
      result.cancelled++;
      continue;
    }
    const dueText = DateTime.fromJSDate(task.dueAt, { zone: currentSettings.timezone }).toFormat(
      task.dueTime ? 'ccc d LLL, HH:mm' : 'ccc d LLL',
    );
    const url = `${(process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '')}/homework/${encodeURIComponent(task.id)}`;
    const heading = `${task.title} is due ${dueText}`;
    const text = `SMM Homework Planner: ${task.title.slice(0, 65)} (${task.subject.name.slice(0, 25)}) due ${dueText}. Priority: ${task.priority.toLowerCase()}.`;
    const html = `<div style="font-family:Arial,sans-serif;max-width:520px;padding:32px;color:#25372d"><p style="font-size:13px;letter-spacing:1px">SMM HOMEWORK PLANNER</p><h1 style="font-size:24px">A little reminder.</h1><h2 style="font-size:19px">${escapeHtml(task.title)}</h2><p>${escapeHtml(task.subject.name)} · ${escapeHtml(dueText)} (${escapeHtml(currentSettings.timezone)})</p><p>Priority: ${escapeHtml(task.priority.toLowerCase())}<br>Estimated time: ${task.estimatedMinutes || 'Not set'} minutes</p><a style="display:inline-block;background:#3f6150;color:white;padding:12px 20px;border-radius:8px;text-decoration:none" href="${escapeHtml(url)}">Open homework</a></div>`;
    try {
      const provider = overrides?.[channel] || (channel === 'email' ? emailProvider : smsProvider);
      const id = await provider.send({
        channel: reminder.channel as Channel,
        to: channel === 'email' ? currentSettings.emailAddress : currentSettings.phone,
        title: heading,
        text,
        html,
        key: createHash('sha256').update(reminder.scheduleKey).digest('hex'),
      });
      await db.homeworkReminder.updateMany({
        where: { id: reminder.id },
        data: { status: 'SENT', sentAt: new Date(), providerMessageId: id, error: null },
      });
      result.sent++;
    } catch (error) {
      await db.homeworkReminder.updateMany({
        where: { id: reminder.id },
        data: {
          status: 'FAILED',
          error: (error instanceof Error ? error.message : 'Provider error').slice(0, 500),
        },
      });
      result.failed++;
    }
  }
  return result;
}
