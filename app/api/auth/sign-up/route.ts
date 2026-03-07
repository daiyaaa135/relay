import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/sign-up
 * Creates a Supabase account using the service-role admin client so that:
 *  - email_confirm is set to true (we already verified it ourselves)
 *  - The user can immediately sign in with their credentials
 *
 * Body: { email: string, password: string, displayName?: string }
 */
export async function POST(request: NextRequest) {
  const admin = createServerClient();
  if (!admin) {
    return Response.json(
      { error: 'Server not configured. Check SUPABASE_SERVICE_ROLE_KEY.' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const email =
      typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password =
      typeof body?.password === 'string' ? body.password : '';
    const displayName =
      typeof body?.displayName === 'string' ? body.displayName.trim() : '';

    if (!email || !EMAIL_REGEX.test(email)) {
      return Response.json({ error: 'Invalid email address' }, { status: 400 });
    }
    if (password.length < 8) {
      return Response.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Create user with email pre-confirmed (we already verified it via our own code)
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: displayName ? { display_name: displayName } : undefined,
    });

    if (error) {
      // Surface duplicate email as a user-friendly message
      const message =
        error.message.includes('already registered') ||
        error.message.includes('already been registered')
          ? 'An account with this email already exists.'
          : error.message;
      return Response.json({ error: message }, { status: 400 });
    }

    return Response.json({ ok: true, userId: data.user.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sign-up failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
