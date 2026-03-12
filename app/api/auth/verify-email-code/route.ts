import { NextRequest } from 'next/server';
import { verifyCode } from '@/lib/email-verification';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/verify-email-code
 * Verifies a 4-digit code against the passwordless MemoryStore.
 * On success, the token is invalidated (one-time use).
 *
 * Body: { email: string, code: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email =
      typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const code =
      typeof body?.code === 'string'
        ? body.code.replace(/\D/g, '').slice(0, 4)
        : '';

    if (!email || !EMAIL_REGEX.test(email)) {
      return Response.json({ error: 'Invalid email address' }, { status: 400 });
    }
    if (code.length !== 4) {
      return Response.json({ error: 'Code required' }, { status: 400 });
    }

    const valid = await verifyCode(email, code);
    if (!valid) {
      return Response.json(
        { error: 'Invalid or expired code' },
        { status: 400 }
      );
    }

    return Response.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Verification failed';
    return Response.json({ error: message }, { status: 400 });
  }
}
