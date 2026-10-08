import { z } from 'zod';
import { db } from './db';
import { HttpError } from './http';
import {
  subjectSchema,
  homeworkSchema,
  timetableSchema,
  sessionSchema,
  settingsSchema,
} from '@/lib/validation';
import { dueInstant } from '@/lib/logic';
import { syncReminders } from './reminders';
export const backupSchema = z.object({
  version: z.literal(1),
  settings: settingsSchema,
  subjects: z.array(subjectSchema.extend({ id: z.string().min(1).max(100) })).max(1000),
  homework: z
    .array(
      homeworkSchema.safeExtend({
        id: z.string().min(1).max(100),
        completedAt: z.iso.datetime().nullable(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime(),
      }),
    )
    .max(10000),
  days: timetableSchema,
  sessions: z.array(sessionSchema).max(50000),
});
export async function restoreBackup(raw: unknown) {
  const backup = backupSchema.parse(raw);
  const ids = new Set(backup.subjects.map((s) => s.id));
  const tasks = new Set(backup.homework.map((h) => h.id));
  if (
    ids.size !== backup.subjects.length ||
    tasks.size !== backup.homework.length ||
    backup.homework.some((h) => !ids.has(h.subjectId)) ||
    backup.days.some((d) => d.periods.some((p) => p.subjectId && !ids.has(p.subjectId))) ||
    backup.sessions.some(
      (s) => (s.homeworkId && !tasks.has(s.homeworkId)) || (s.subjectId && !ids.has(s.subjectId)),
    )
  )
    throw new HttpError(
      400,
      'Backup contains duplicate IDs or missing subject/homework references.',
    );
  await db.$transaction(
    async (tx) => {
      await tx.studySession.deleteMany();
      await tx.homework.deleteMany();
      await tx.timetableDay.deleteMany();
      await tx.subject.deleteMany();
      for (const subject of backup.subjects) await tx.subject.create({ data: subject });
      for (const h of backup.homework) {
        let dueAt: Date;
        try {
          dueAt = dueInstant(h.dueDate, h.dueTime, backup.settings.timezone);
        } catch (e) {
          throw new HttpError(400, (e as Error).message);
        }
        await tx.homework.create({
          data: {
            ...h,
            dueAt,
            reminderOverride: h.reminderOverride ? JSON.stringify(h.reminderOverride) : null,
            completedAt: h.status === 'COMPLETED' ? h.completedAt || new Date() : null,
          },
        });
      }
      for (const day of backup.days)
        await tx.timetableDay.create({
          data: {
            weekday: day.weekday,
            enabled: day.enabled,
            periods: { create: day.periods.map(({ id: _id, ...p }) => p) },
          },
        });
      for (const session of backup.sessions) await tx.studySession.create({ data: session });
      const settings = { ...backup.settings, email: false, sms: false };
      await tx.owner.update({
        where: { id: 'owner' },
        data: { settings: JSON.stringify(settings) },
      });
      for (const task of backup.homework) await syncReminders(tx, task.id, settings);
    },
    { timeout: 30000 },
  );
  return {
    ok: true,
    message: 'Data restored. Review notification settings before re-enabling reminders.',
  };
}
