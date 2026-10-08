import { z } from 'zod';
import { db } from '@/server/db';
import { createSession, verifyPassword, hashPassword } from '@/server/auth';
import { endpoint, HttpError, jsonBody } from '@/server/http';
let dummy: string | undefined;
export const POST = endpoint(
  async (request) => {
    const body = z
      .object({ email: z.email(), password: z.string().min(1).max(1024) })
      .parse(await jsonBody(request));
    const key = 'owner-login';
    const now = new Date();
    await db.loginAttempt.upsert({ where: { id: key }, create: { id: key, count: 0 }, update: {} });
    await db.loginAttempt.updateMany({
      where: { id: key, windowStart: { lt: new Date(now.getTime() - 15 * 60000) } },
      data: { count: 0, windowStart: now },
    });
    const attempt = await db.loginAttempt.update({
      where: { id: key },
      data: { count: { increment: 1 } },
    });
    if (attempt.count > 10)
      throw new HttpError(429, 'Too many sign-in attempts. Please wait 15 minutes.');
    const owner = await db.owner.findUnique({ where: { id: 'owner' } });
    dummy ||= await hashPassword('not-a-real-password-for-timing-only');
    const valid = await verifyPassword(body.password, owner?.passwordHash || dummy);
    if (!owner || owner.email !== body.email.toLowerCase() || !valid)
      throw new HttpError(401, 'The email or password is incorrect.');
    await db.loginAttempt.deleteMany({ where: { id: key } });
    await createSession(owner.id);
    return { ok: true };
  },
  { public: true, mutation: true },
);
