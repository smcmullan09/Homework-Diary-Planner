import { z } from 'zod';
import { db } from '@/server/db';
import { endpoint, jsonBody, HttpError } from '@/server/http';
import { homeworkSchema } from '@/lib/validation';
import { dueInstant } from '@/lib/logic';
import { readSettings, syncReminders } from '@/server/reminders';
async function save(request: Request, edit: boolean) {
  const raw = await jsonBody(request);
  const body = homeworkSchema.parse(raw);
  const id = edit ? z.string().parse(raw.id) : undefined;
  return db.$transaction(async (tx) => {
    const settings = readSettings(
      (await tx.owner.findUniqueOrThrow({ where: { id: 'owner' } })).settings,
    );
    let dueAt: Date;
    try {
      dueAt = dueInstant(body.dueDate, body.dueTime, settings.timezone);
    } catch (e) {
      throw new HttpError(400, (e as Error).message);
    }
    const existing = id ? await tx.homework.findUniqueOrThrow({ where: { id } }) : null;
    const data = {
      ...body,
      dueAt,
      reminderOverride: body.reminderOverride ? JSON.stringify(body.reminderOverride) : null,
      completedAt: body.status === 'COMPLETED' ? existing?.completedAt || new Date() : null,
    };
    const task = id
      ? await tx.homework.update({ where: { id }, data })
      : await tx.homework.create({ data });
    await syncReminders(tx, task.id, settings);
    return task;
  });
}
export const POST = endpoint((r) => save(r, false), { mutation: true });
export const PUT = endpoint((r) => save(r, true), { mutation: true });
export const DELETE = endpoint(
  async (request) => {
    const { id } = z.object({ id: z.string() }).parse(await jsonBody(request));
    await db.homework.delete({ where: { id } });
    return { ok: true };
  },
  { mutation: true },
);
