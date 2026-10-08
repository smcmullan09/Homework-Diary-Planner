import { db } from '@/server/db';
import { endpoint, jsonBody, HttpError } from '@/server/http';
import { settingsSchema } from '@/lib/validation';
import { readSettings, syncReminders } from '@/server/reminders';
import { dueInstant } from '@/lib/logic';
import { z } from 'zod';
export const PUT = endpoint(
  async (request) => {
    const { settings, onboarded } = z
      .object({ settings: settingsSchema, onboarded: z.boolean().optional() })
      .parse(await jsonBody(request));
    await db.$transaction(
      async (tx) => {
        const previous = readSettings(
          (await tx.owner.findUniqueOrThrow({ where: { id: 'owner' } })).settings,
        );
        const timezoneChanged = previous.timezone !== settings.timezone;
        await tx.owner.update({
          where: { id: 'owner' },
          data: {
            settings: JSON.stringify(settings),
            ...(onboarded === undefined ? {} : { onboarded }),
          },
        });
        if (
          !timezoneChanged &&
          previous.email === settings.email &&
          previous.sms === settings.sms &&
          JSON.stringify(previous.offsets) === JSON.stringify(settings.offsets)
        )
          return;
        for (const task of await tx.homework.findMany()) {
          let dueAt: Date;
          try {
            dueAt = dueInstant(task.dueDate, task.dueTime, settings.timezone);
          } catch (e) {
            throw new HttpError(400, (e as Error).message);
          }
          if (timezoneChanged)
            await tx.homework.update({ where: { id: task.id }, data: { dueAt } });
          await syncReminders(tx, task.id, settings);
        }
      },
      { timeout: 20000 },
    );
    return { ok: true };
  },
  { mutation: true },
);
