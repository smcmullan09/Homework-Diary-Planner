export const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export const statuses = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'] as const;
export const slotTypes = ['LESSON', 'BREAK', 'LUNCH', 'REGISTRATION', 'STUDY', 'OTHER'] as const;
export type Priority = (typeof priorities)[number];
export type Status = (typeof statuses)[number];
export type Channel = 'EMAIL' | 'SMS';
export interface ReminderPreferences {
  email: boolean;
  sms: boolean;
  offsets: number[];
}
export interface Settings extends ReminderPreferences {
  timezone: string;
  theme: 'light' | 'dark' | 'system';
  dateFormat: 'dd LLL yyyy' | 'LLL dd, yyyy';
  timeFormat: '24' | '12';
  emailAddress: string;
  phone: string;
}
export const defaultSettings: Settings = {
  timezone: 'Europe/London',
  theme: 'light',
  dateFormat: 'dd LLL yyyy',
  timeFormat: '24',
  email: false,
  sms: false,
  emailAddress: '',
  phone: '',
  offsets: [1440, 180],
};
export interface Subject {
  id: string;
  name: string;
  colour: string;
  icon: string;
  createdAt?: string;
  updatedAt?: string;
}
export interface Homework {
  id: string;
  title: string;
  subjectId: string;
  description: string;
  assignedDate: string;
  dueDate: string;
  dueTime: string | null;
  dueAt: string;
  priority: Priority;
  status: Status;
  estimatedMinutes: number;
  notes: string;
  reminderOverride: ReminderPreferences | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  actualSeconds: number;
}
export interface Period {
  id: string;
  name: string;
  slotType: (typeof slotTypes)[number];
  startTime: string;
  endTime: string;
  subjectId: string | null;
  label: string;
  room: string;
  teacherName: string;
}
export interface TimetableDay {
  id: string;
  weekday: number;
  enabled: boolean;
  periods: Period[];
}
export interface StudySession {
  id: string;
  homeworkId: string | null;
  subjectId: string | null;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  type: string;
}
export interface Reminder {
  id: string;
  homeworkId: string;
  channel: Channel;
  scheduledAt: string;
  sentAt: string | null;
  status: string;
  error: string | null;
  providerMessageId: string | null;
}
export interface AppData {
  subjects: Subject[];
  homework: Homework[];
  days: TimetableDay[];
  sessions: StudySession[];
  reminders: Reminder[];
  settings: Settings;
  ownerEmail: string;
  onboarded: boolean;
  providers: { email: boolean; sms: boolean };
}
export const label = (value: string) =>
  value
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
export const weekdays = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
