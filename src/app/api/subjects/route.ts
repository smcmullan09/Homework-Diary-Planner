import { z } from 'zod';
import { db } from '@/server/db';
import { endpoint, jsonBody } from '@/server/http';
import { subjectSchema } from '@/lib/validation';
export const POST = endpoint(
  async (request) => db.subject.create({ data: subjectSchema.parse(await jsonBody(request)) }),
  { mutation: true },
);
export const PUT = endpoint(
  async (request) => {
    const body = z.object({ id: z.string(), data: subjectSchema }).parse(await jsonBody(request));
    return db.subject.update({ where: { id: body.id }, data: body.data });
  },
  { mutation: true },
);
export const DELETE = endpoint(
  async (request) => {
    const { id } = z.object({ id: z.string() }).parse(await jsonBody(request));
    await db.subject.delete({ where: { id } });
    return { ok: true };
  },
  { mutation: true },
);
