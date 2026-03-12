import { NextRequest } from 'next/server';
import { sendVerificationCode } from '@/lib/email-verification';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/send-email-code
 * Generates a 4-digit code, stores it via passwordless MemoryStore,
 * and delivers it to the given email via emailjs.
 *
 * Body: { email: string }
 * Requires: SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_FROM in .env.local
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email =
      typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email || !EMAIL_REGEX.test(email)) {
      return Response.json({ error: 'Invalid email address' }, { status: 400 });
    }

    await sendVerificationCode(email);
    return Response.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send code';
    const status = message.includes('not configured') ? 503 : 500;
    return Response.json({ error: message }, { status });
  }
}
