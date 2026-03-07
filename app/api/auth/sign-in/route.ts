import { NextRequest } from 'next/server';
import { createAnonClient } from '@/lib/supabase-server';

/**
 * Server-side sign-in so the Supabase auth request runs in Node (same as web server),
 * avoiding WebView/encoding differences that can cause "Invalid login credentials" on iOS simulator.
 * Returns session so the client can setSession and stay logged in.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!email || !password) {
      return Response.json(
        { error: { message: 'Email and password required' } },
        { status: 400 }
      );
    }

    const supabase = createAnonClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return Response.json(
        { data: null, error: { message: error.message, name: error.name, status: (error as { status?: number }).status } },
        { status: 200 }
      );
    }

    return Response.json({
      data: data?.session ? { session: data.session, user: data.user } : null,
      error: null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Sign-in failed';
    return Response.json(
      { data: null, error: { message } },
      { status: 200 }
    );
  }
}
