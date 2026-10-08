import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { ownerSession } from './auth';
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const allowed = new URL(process.env.APP_URL || request.url).origin;
  if (!origin || origin !== allowed)
    throw new HttpError(403, 'This request must come from the application.');
}
export async function jsonBody(request: Request) {
  if (Number(request.headers.get('content-length')) > 5_000_000)
    throw new HttpError(413, 'This file is too large (maximum 5 MB).');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'A JSON body is required.');
  const decoder = new TextDecoder();
  let body = '',
    bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 5_000_000) {
        await reader.cancel();
        throw new HttpError(413, 'This file is too large (maximum 5 MB).');
      }
      body += decoder.decode(chunk.value, { stream: true });
    }
    body += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new HttpError(400, 'Invalid JSON.');
  }
}
export function endpoint(
  handler: (request: Request) => Promise<unknown>,
  options: { public?: boolean; mutation?: boolean } = {},
) {
  return async (request: Request) => {
    try {
      if (options.mutation) sameOrigin(request);
      if (!options.public && !(await ownerSession()))
        throw new HttpError(401, 'Please sign in again.');
      return NextResponse.json(await handler(request), {
        headers: { 'Cache-Control': 'no-store' },
      });
    } catch (error) {
      if (error instanceof HttpError)
        return NextResponse.json({ error: error.message }, { status: error.status });
      if (error instanceof ZodError)
        return NextResponse.json(
          { error: error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') },
          { status: 400 },
        );
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        const message =
          error.code === 'P2002'
            ? 'This record already exists.'
            : error.code === 'P2003'
              ? 'This item is in use. Reassign its homework and timetable periods before deleting it.'
              : error.code === 'P2025'
                ? 'This item no longer exists.'
                : 'The database could not save your change.';
        return NextResponse.json({ error: message }, { status: 409 });
      }
      console.error('Request failed', error);
      return NextResponse.json(
        { error: 'Something went wrong. Please try again.' },
        { status: 500 },
      );
    }
  };
}
