import { NextRequest } from 'next/server';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * GET /api/auth/check-email?email=...&excludeUserId=...
 * Returns { available: true } if the email is not in use by any other account.
 * Pass excludeUserId (the current user's id) when checking from edit-profile
 * so the user's own current email doesn't block them.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = (searchParams.get('email') ?? '').trim().toLowerCase();
  const excludeUserId = searchParams.get('excludeUserId') ?? '';

  if (!email || !EMAIL_REGEX.test(email)) {
    return Response.json({ error: 'Invalid email' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: 'Server not configured' }, { status: 503 });
  }

  // GoTrue admin REST API — getUserByEmail doesn't exist in Supabase JS v2,
  // so we call the HTTP endpoint directly.
  const params = new URLSearchParams({ filter: email, page: '1', per_page: '10' });
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users?${params}`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!res.ok) {
    // Can't determine — treat as available to avoid blocking the user
    return Response.json({ available: true });
  }

  const json = await res.json();
  const users: Array<{ id: string; email?: string }> = json?.users ?? [];

  // filter is prefix-based, so do an exact match here
  const match = users.find(u => (u.email ?? '').toLowerCase() === email);

  if (!match) {
    return Response.json({ available: true });
  }

  // The found user is the requester themselves — still available
  if (excludeUserId && match.id === excludeUserId) {
    return Response.json({ available: true });
  }

  return Response.json({ available: false });
}
