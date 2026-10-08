import type { Channel } from '@/lib/types';
export interface NotificationMessage {
  channel: Channel;
  to: string;
  title: string;
  text: string;
  html: string;
  key: string;
}
export interface NotificationProvider {
  send(message: NotificationMessage): Promise<string>;
}
export function providerAvailability() {
  return {
    email: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
    sms: Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER,
    ),
  };
}
async function responseBody(response: Response): Promise<Record<string, unknown>> {
  const body = (await response.json()) as Record<string, unknown>;
  if (!response.ok)
    throw new Error(
      `Provider rejected request (${response.status}): ${String(body.message || body.code || 'unknown error').slice(0, 300)}`,
    );
  return body;
}
export const emailProvider: NotificationProvider = {
  async send(message) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': message.key,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: message.to,
        subject: message.title,
        text: message.text,
        html: message.html,
      }),
    });
    return String((await responseBody(response)).id);
  },
};
export const smsProvider: NotificationProvider = {
  async send(message) {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
        headers: {
          Authorization: `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: process.env.TWILIO_PHONE_NUMBER || '',
          To: message.to,
          Body: message.text,
        }),
      },
    );
    return String((await responseBody(response)).sid);
  },
};
export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}
