import { describe, expect, it } from 'vitest';
import {
  dueInstant,
  dueLabel,
  elapsedMs,
  lessonState,
  overdue,
  periodsValid,
  reminderPlan,
} from '../src/lib/logic';
import { homeworkSchema, settingsSchema, sessionSchema } from '../src/lib/validation';
import { defaultSettings, type Period } from '../src/lib/types';
const now = new Date('2026-10-08T12:00:00Z');
const period = (start: string, end: string): Period => ({
  id: start,
  name: 'Custom lesson',
  startTime: start,
  endTime: end,
  slotType: 'LESSON',
  subjectId: null,
  room: '',
  teacherName: '',
  label: '',
});
describe('Homework deadlines', () => {
  it('calculates overdue for incomplete homework only', () => {
    expect(overdue({ status: 'NOT_STARTED', dueAt: '2026-10-07T23:00:00Z' }, now)).toBe(true);
    expect(overdue({ status: 'IN_PROGRESS', dueAt: '2026-10-07T23:00:00Z' }, now)).toBe(true);
    expect(overdue({ status: 'COMPLETED', dueAt: '2026-10-07T23:00:00Z' }, now)).toBe(false);
    expect(overdue({ status: 'NOT_STARTED', dueAt: now.toISOString() }, now)).toBe(false);
  });
  it('defaults untimed homework to the local end of day', () =>
    expect(dueInstant('2026-10-08', null, 'Europe/London').toISOString()).toBe(
      '2026-10-08T22:59:59.000Z',
    ));
  it('respects daylight saving offsets', () => {
    expect(dueInstant('2026-01-12', '09:00', 'Europe/London').toISOString()).toBe(
      '2026-01-12T09:00:00.000Z',
    );
    expect(dueInstant('2026-07-12', '09:00', 'Europe/London').toISOString()).toBe(
      '2026-07-12T08:00:00.000Z',
    );
  });
  it('rejects nonexistent DST times and resolves ambiguous times consistently', () => {
    expect(() => dueInstant('2026-03-29', '01:30', 'Europe/London')).toThrow('does not exist');
    expect(dueInstant('2026-10-25', '01:30', 'Europe/London').toISOString()).toBe(
      '2026-10-25T00:30:00.000Z',
    );
  });
  it('uses the configured local day for due labels', () => {
    const task = {
      status: 'NOT_STARTED' as const,
      dueDate: '2026-10-09',
      dueAt: '2026-10-09T12:00:00Z',
    };
    expect(dueLabel(task, 'Asia/Tokyo', new Date('2026-10-08T23:30:00Z'))).toBe('Due today');
    expect(dueLabel(task, 'America/New_York', new Date('2026-10-08T23:30:00Z'))).toBe(
      'Due tomorrow',
    );
  });
  it('rejects due-before-assigned and invalid dates/status', () => {
    const task = {
      title: 'Test',
      subjectId: 'one',
      assignedDate: '2026-10-08',
      dueDate: '2026-10-07',
    };
    expect(homeworkSchema.safeParse(task).success).toBe(false);
    expect(homeworkSchema.safeParse({ ...task, dueDate: '2026-02-30' }).success).toBe(false);
    expect(
      homeworkSchema.safeParse({ ...task, dueDate: '2026-10-09', status: 'OVERDUE' }).success,
    ).toBe(false);
    expect(homeworkSchema.parse({ ...task, dueDate: '2026-10-09' }).status).toBe('NOT_STARTED');
  });
});
describe('Reminder scheduling', () => {
  it('creates one key per channel, deadline and unique offset', () => {
    const plan = reminderPlan(
      'task',
      new Date('2026-10-10T12:00:00Z'),
      { email: true, sms: true, offsets: [60, 60, 1440] },
      now,
    );
    expect(plan).toHaveLength(4);
    expect(new Set(plan.map((p) => p.scheduleKey)).size).toBe(4);
    expect(plan.find((p) => p.scheduleKey.endsWith(':60'))?.scheduledAt.toISOString()).toBe(
      '2026-10-10T11:00:00.000Z',
    );
  });
  it('does not schedule already passed times or disabled channels', () => {
    expect(reminderPlan('task', now, { email: true, sms: false, offsets: [60] }, now)).toHaveLength(
      0,
    );
    expect(
      reminderPlan(
        'task',
        new Date('2026-10-20'),
        { email: false, sms: false, offsets: [60] },
        now,
      ),
    ).toHaveLength(0);
  });
  it('changes keys when the due date changes', () => {
    const prefs = { email: true, sms: false, offsets: [60] };
    expect(reminderPlan('a', new Date('2026-10-10'), prefs, now)[0].scheduleKey).not.toBe(
      reminderPlan('a', new Date('2026-10-11'), prefs, now)[0].scheduleKey,
    );
  });
});
describe('Timetable', () => {
  const periods = [
    period('09:00', '10:00'),
    { ...period('10:00', '10:30'), slotType: 'BREAK' as const },
    period('10:30', '11:30'),
  ];
  it('finds current and next periods in local time', () => {
    const result = lessonState(periods, 'Europe/London', new Date('2026-10-08T08:30:00Z'));
    expect(result.current?.startTime).toBe('09:00');
    expect(result.next?.startTime).toBe('10:00');
  });
  it('handles exact boundaries and break periods', () => {
    const result = lessonState(periods, 'Europe/London', new Date('2026-10-08T09:00:00Z'));
    expect(result.current?.slotType).toBe('BREAK');
    expect(result.next?.startTime).toBe('10:30');
  });
  it('handles no-school and finished-school states', () => {
    expect(lessonState([], 'Europe/London', now).noSchool).toBe(true);
    expect(lessonState(periods, 'Europe/London', now).finished).toBe(true);
  });
  it('rejects overlaps and reversed intervals, accepts adjacent periods', () => {
    expect(periodsValid(periods)).toBe(true);
    expect(periodsValid([period('09:00', '10:00'), period('09:30', '10:30')])).toBe(false);
    expect(periodsValid([period('10:00', '09:00')])).toBe(false);
  });
});
describe('Study timer', () => {
  it('recovers running elapsed time from timestamps across refresh', () =>
    expect(
      elapsedMs(
        { accumulatedMs: 30000, runningSince: 1000, mode: 'STOPWATCH', targetSeconds: 1500 },
        61000,
      ),
    ).toBe(90000));
  it('does not count paused time', () =>
    expect(
      elapsedMs(
        { accumulatedMs: 30000, runningSince: null, mode: 'STOPWATCH', targetSeconds: 1500 },
        999999,
      ),
    ).toBe(30000));
  it('caps countdown sessions at their duration', () =>
    expect(
      elapsedMs(
        { accumulatedMs: 0, runningSince: 1000, mode: 'COUNTDOWN', targetSeconds: 60 },
        1000000,
      ),
    ).toBe(60000));
  it('guards against clocks moving backward', () =>
    expect(
      elapsedMs(
        { accumulatedMs: 30000, runningSince: 100000, mode: 'STOPWATCH', targetSeconds: 60 },
        50000,
      ),
    ).toBe(30000));
  it('rejects impossible session lengths', () =>
    expect(
      sessionSchema.safeParse({
        id: '61be00b4-5aa4-4c7e-8d45-cd641147bb76',
        homeworkId: null,
        subjectId: null,
        startTime: '2026-10-08T10:00:00Z',
        endTime: '2026-10-08T10:01:00Z',
        durationSeconds: 500,
        type: 'STOPWATCH',
      }).success,
    ).toBe(false));
});
describe('Settings validation', () => {
  it('requires valid international phone numbers and a recipient when enabled', () => {
    expect(
      settingsSchema.safeParse({ ...defaultSettings, sms: true, phone: '07700900123' }).success,
    ).toBe(false);
    expect(settingsSchema.safeParse({ ...defaultSettings, email: true }).success).toBe(false);
    expect(
      settingsSchema.safeParse({ ...defaultSettings, sms: true, phone: '+447700900123' }).success,
    ).toBe(true);
  });
  it('rejects invalid timezone', () =>
    expect(settingsSchema.safeParse({ ...defaultSettings, timezone: 'Moon/Base' }).success).toBe(
      false,
    ));
});
