import { NextRequest } from 'next/server';
import { createAnonClient, createServerClient } from '@/lib/supabase-server';

/**
 * POST /api/help/close-account
 * Permanently delete the authenticated user's account after verifying the request email
 * matches the account email. Requires Authorization: Bearer <access_token>.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let userId: string;
    let accountEmail: string;
    try {
      const anon = createAnonClient(token);
      const { data: { user }, error } = await anon.auth.getUser(token);
      if (error || !user?.id || !user?.email) {
        return Response.json({ error: 'Invalid or expired token' }, { status: 401 });
      }
      userId = user.id;
      accountEmail = (user.email ?? '').trim().toLowerCase();
    } catch {
      return Response.json({ error: 'Auth failed' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const requestEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!requestEmail) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    if (requestEmail !== accountEmail) {
      return Response.json(
        { error: 'The email you entered does not match your account email.' },
        { status: 400 }
      );
    }

    const server = createServerClient();
    if (!server) return Response.json({ error: 'Server configuration error' }, { status: 503 });

    const { error: deleteError } = await server.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('Close account deleteUser error:', deleteError);
      return Response.json(
        { error: 'Unable to delete account. Please contact support.' },
        { status: 500 }
      );
    }

    return Response.json({ success: true });
  } catch (e) {
    console.error('Close account error:', e);
    return Response.json(
      { error: 'Something went wrong. Please try again or contact support.' },
      { status: 500 }
    );
  }
}
