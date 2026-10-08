import { DateTime } from 'luxon';
import type { Homework, Period, ReminderPreferences } from './types';

export function dueInstant(date: string, time: string | null | undefined, zone: string): Date {
  const input = `${date}T${time || '23:59:59'}`;
  const value = DateTime.fromISO(input, { zone });
  if (!value.isValid || value.toFormat("yyyy-MM-dd'T'HH:mm") !== input.slice(0, 16)) {
    throw new Error('This date or time does not exist in your timezone (check daylight saving).');
  }
  // During a repeated autumn hour use the earlier instant consistently.
  return value
    .getPossibleOffsets()
    .sort((a, b) => a.toMillis() - b.toMillis())[0]
    .toJSDate();
}
export function overdue(task: Pick<Homework, 'status' | 'dueAt'>, now = new Date()): boolean {
  return task.status !== 'COMPLETED' && new Date(task.dueAt).getTime() < now.getTime();
}
export function dueLabel(
  task: Pick<Homework, 'dueDate' | 'dueAt' | 'status'>,
  zone: string,
  now = new Date(),
) {
  if (task.status === 'COMPLETED') return 'Completed';
  const today = DateTime.fromJSDate(now, { zone }).startOf('day');
  const delta = Math.round(DateTime.fromISO(task.dueDate, { zone }).diff(today, 'days').days);
  if (overdue(task, now))
    return delta === 0
      ? 'Overdue today'
      : `Overdue by ${Math.abs(delta)} day${Math.abs(delta) === 1 ? '' : 's'}`;
  if (delta === 0) return 'Due today';
  if (delta === 1) return 'Due tomorrow';
  return `Due in ${delta} days`;
}
export function reminderPlan(
  id: string,
  dueAt: Date,
  prefs: ReminderPreferences,
  now = new Date(),
) {
  const channels = (['EMAIL', 'SMS'] as const).filter((c) =>
    c === 'EMAIL' ? prefs.email : prefs.sms,
  );
  return channels
    .flatMap((channel) =>
      [...new Set(prefs.offsets)].map((offset) => {
        const scheduledAt = new Date(dueAt.getTime() - offset * 60_000);
        return {
          homeworkId: id,
          channel,
          scheduledAt,
          scheduleKey: `${id}:${channel}:${dueAt.toISOString()}:${offset}`,
        };
      }),
    )
    .filter((r) => r.scheduledAt >= now);
}
export function lessonState(periods: Period[], zone: string, now = new Date()) {
  const time = DateTime.fromJSDate(now, { zone }).toFormat('HH:mm');
  const sorted = [...periods].sort((a, b) => a.startTime.localeCompare(b.startTime));
  return {
    current: sorted.find((p) => p.startTime <= time && p.endTime > time),
    next: sorted.find((p) => p.startTime > time),
    finished: sorted.length > 0 && sorted.every((p) => p.endTime <= time),
    noSchool: sorted.length === 0,
  };
}
export function periodsValid(periods: Pick<Period, 'startTime' | 'endTime'>[]) {
  const sorted = [...periods].sort((a, b) => a.startTime.localeCompare(b.startTime));
  return sorted.every(
    (p, i) => p.startTime < p.endTime && (i === 0 || sorted[i - 1].endTime <= p.startTime),
  );
}
export interface TimerState {
  id: string;
  mode: 'STOPWATCH' | 'COUNTDOWN';
  targetSeconds: number;
  accumulatedMs: number;
  runningSince: number | null;
  startedAt: string | null;
  homeworkId: string;
  subjectId: string;
}
export function elapsedMs(
  timer: Pick<TimerState, 'accumulatedMs' | 'runningSince' | 'mode' | 'targetSeconds'>,
  now = Date.now(),
) {
  const raw = Math.max(
    0,
    timer.accumulatedMs + (timer.runningSince === null ? 0 : Math.max(0, now - timer.runningSince)),
  );
  return timer.mode === 'COUNTDOWN' ? Math.min(raw, timer.targetSeconds * 1000) : raw;
}
export function duration(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`;
}
