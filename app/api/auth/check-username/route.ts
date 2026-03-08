import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

/**
 * GET /api/auth/check-username?username=...&excludeUserId=...
 * Returns { available: true } if no other profile uses this display_name.
 * Pass excludeUserId to exclude the current user's own profile.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = (searchParams.get('username') ?? '').trim();
  const excludeUserId = searchParams.get('excludeUserId') ?? '';

  if (!username || username.length < 6 || username.length > 30) {
    return Response.json({ error: 'Invalid username' }, { status: 400 });
  }
  if (!/^[A-Za-z0-9_.-]+$/.test(username)) {
    return Response.json({ error: 'Invalid username' }, { status: 400 });
  }

  const admin = createServerClient();
  if (!admin) {
    return Response.json({ error: 'Server not configured' }, { status: 503 });
  }

  let query = admin
    .from('profiles')
    .select('id')
    .ilike('display_name', username)
    .limit(1);

  if (excludeUserId) {
    query = query.neq('id', excludeUserId);
  }

  const { data, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ available: !data || data.length === 0 });
}
