import { NextRequest } from 'next/server';
import { createAnonClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email =
      typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email) {
      return Response.json(
        { data: null, error: { message: 'Email is required' } },
        { status: 400 }
      );
    }

    const supabase = createAnonClient();
    const origin = request.nextUrl.origin ?? '';
    const redirectTo = origin ? `${origin}/reset-password` : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      return Response.json(
        {
          data: null,
          error: {
            message: error.message,
            name: error.name,
            status: (error as { status?: number }).status,
          },
        },
        { status: 200 }
      );
    }

    return Response.json({
      data: { ok: true },
      error: null,
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : 'Could not start password reset';
    return Response.json(
      { data: null, error: { message } },
      { status: 200 }
    );
  }
}

