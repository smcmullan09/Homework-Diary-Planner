import { db } from './db';
import { readSettings } from './reminders';
import { providerAvailability } from './providers';
export async function getData() {
  const [owner, subjects, homework, days, sessions, reminders] = await Promise.all([
    db.owner.findUniqueOrThrow({ where: { id: 'owner' } }),
    db.subject.findMany({ orderBy: { name: 'asc' } }),
    db.homework.findMany({
      orderBy: { dueAt: 'asc' },
      include: { sessions: { select: { durationSeconds: true } } },
    }),
    db.timetableDay.findMany({
      orderBy: { weekday: 'asc' },
      include: { periods: { orderBy: { startTime: 'asc' } } },
    }),
    db.studySession.findMany({ orderBy: { startTime: 'desc' } }),
    db.homeworkReminder.findMany({ orderBy: { scheduledAt: 'desc' }, take: 500 }),
  ]);
  return {
    subjects,
    homework: homework.map(({ sessions: tracked, ...h }) => ({
      ...h,
      reminderOverride: h.reminderOverride ? JSON.parse(h.reminderOverride) : null,
      actualSeconds: tracked.reduce((a, s) => a + s.durationSeconds, 0),
    })),
    days,
    sessions,
    reminders,
    settings: readSettings(owner.settings),
    ownerEmail: owner.email,
    onboarded: owner.onboarded,
    providers: providerAvailability(),
  };
}
