import { NextResponse } from 'next/server';
import { safeEqual } from '@/server/auth';
import { processReminders } from '@/server/reminders';
export const runtime = 'nodejs';
export const maxDuration = 300;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (
    !secret ||
    secret.length < 32 ||
    !safeEqual(request.headers.get('authorization') || '', `Bearer ${secret}`)
  )
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json(await processReminders(), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Reminder processing failed', error);
    return NextResponse.json({ error: 'Reminder processing failed' }, { status: 500 });
  }
}
export const POST = GET;
