import { db } from '@/server/db';
import { endpoint, jsonBody } from '@/server/http';
import { timetableSchema } from '@/lib/validation';
export const PUT = endpoint(
  async (request) => {
    const days = timetableSchema.parse(await jsonBody(request));
    await db.$transaction(async (tx) => {
      await tx.timetableDay.deleteMany();
      for (const day of days)
        await tx.timetableDay.create({
          data: {
            weekday: day.weekday,
            enabled: day.enabled,
            periods: { create: day.periods.map(({ id: _id, ...p }) => p) },
          },
        });
    });
    return { ok: true };
  },
  { mutation: true },
);
