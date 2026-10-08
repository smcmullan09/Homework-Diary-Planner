import { endpoint } from '@/server/http';
import { getData } from '@/server/data';
export const GET = endpoint(async () => {
  const { subjects, homework, days, sessions, settings, reminders } = await getData();
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    subjects,
    homework,
    days,
    sessions,
    settings,
    reminders,
  };
});
