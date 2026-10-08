import { z } from 'zod';
import { DateTime, IANAZone } from 'luxon';
import { priorities, statuses, slotTypes } from './types';
import { periodsValid } from './logic';
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => DateTime.fromISO(s).isValid, 'Enter a real date');
export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const reminderSchema = z.object({
  email: z.boolean(),
  sms: z.boolean(),
  offsets: z.array(z.number().int().min(1).max(525600)).max(30),
});
export const settingsSchema = reminderSchema
  .extend({
    timezone: z.string().refine((s) => IANAZone.isValidZone(s), 'Choose a valid IANA timezone'),
    theme: z.enum(['light', 'dark', 'system']),
    dateFormat: z.enum(['dd LLL yyyy', 'LLL dd, yyyy']),
    timeFormat: z.enum(['12', '24']),
    emailAddress: z.union([z.literal(''), z.email()]),
    phone: z.union([
      z.literal(''),
      z.string().regex(/^\+[1-9]\d{6,14}$/, 'Use international format, e.g. +447700900123'),
    ]),
  })
  .refine((s) => !s.email || !!s.emailAddress, {
    message: 'Add an email address to enable email reminders',
    path: ['emailAddress'],
  })
  .refine((s) => !s.sms || !!s.phone, {
    message: 'Add a mobile number to enable SMS reminders',
    path: ['phone'],
  });
export const subjectSchema = z.object({
  name: z.string().trim().min(1).max(60),
  colour: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  icon: z
    .enum(['book', 'calculator', 'flask', 'pen', 'globe', 'atom', 'music', 'palette'])
    .default('book'),
});
export const homeworkSchema = z
  .object({
    title: z.string().trim().min(1, 'Give your homework a title').max(180),
    subjectId: z.string().min(1, 'Choose a subject'),
    description: z.string().max(20000).default(''),
    assignedDate: dateSchema,
    dueDate: dateSchema,
    dueTime: timeSchema.nullable().default(null),
    priority: z.enum(priorities).default('MEDIUM'),
    status: z.enum(statuses).default('NOT_STARTED'),
    estimatedMinutes: z.number().int().min(0).max(100000).default(0),
    notes: z.string().max(20000).default(''),
    reminderOverride: reminderSchema.nullable().default(null),
  })
  .refine((h) => h.dueDate >= h.assignedDate, {
    message: 'Due date must be on or after the assigned date',
    path: ['dueDate'],
  });
export const periodSchema = z.object({
  id: z.string().max(100),
  name: z.string().trim().min(1).max(80),
  slotType: z.enum(slotTypes),
  startTime: timeSchema,
  endTime: timeSchema,
  subjectId: z.string().nullable(),
  label: z.string().max(120),
  room: z.string().max(80),
  teacherName: z.string().max(120),
});
export const daySchema = z.object({
  weekday: z.number().int().min(1).max(7),
  enabled: z.boolean(),
  periods: z
    .array(periodSchema)
    .refine(periodsValid, 'Periods must end after they start and cannot overlap'),
});
export const timetableSchema = z
  .array(daySchema)
  .max(7)
  .refine(
    (d) => new Set(d.map((x) => x.weekday)).size === d.length,
    'Each day can appear only once',
  );
export const sessionSchema = z
  .object({
    id: z.uuid(),
    homeworkId: z.string().nullable(),
    subjectId: z.string().nullable(),
    startTime: z.iso.datetime(),
    endTime: z.iso.datetime(),
    durationSeconds: z.number().int().min(1).max(604800),
    type: z.enum(['STOPWATCH', 'COUNTDOWN']),
  })
  .refine(
    (s) =>
      Date.parse(s.endTime) >= Date.parse(s.startTime) &&
      s.durationSeconds * 1000 <= Date.parse(s.endTime) - Date.parse(s.startTime) + 1000,
    'Session duration exceeds elapsed time',
  );
