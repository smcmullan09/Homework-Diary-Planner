import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHmac } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import { db } from './db';
const scrypt = promisify(scryptCallback);
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
function tokenHash(token: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new Error('AUTH_SECRET must contain at least 32 characters.');
  return createHmac('sha256', secret).update(token).digest('hex');
}
export async function ownerSession() {
  const token = (await cookies()).get('smm_session')?.value;
  if (!token) return null;
  const session = await db.authSession.findUnique({
    where: { id: tokenHash(token) },
    include: { owner: true },
  });
  return session && session.expiresAt > new Date() ? session.owner : null;
}
export async function createSession(ownerId: string) {
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 7 * 86400000);
  await db.authSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await db.authSession.create({ data: { id: tokenHash(token), ownerId, expiresAt: expires } });
  (await cookies()).set('smm_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    path: '/',
    expires,
  });
}
export async function logout() {
  const jar = await cookies();
  const token = jar.get('smm_session')?.value;
  if (token) await db.authSession.deleteMany({ where: { id: tokenHash(token) } });
  jar.delete('smm_session');
}
export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a),
    right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
