import { NextRequest } from 'next/server';
import { createAnonClient } from '@/lib/supabase-server';
import { buildGoogleAuthUrl, createOAuthState } from '@/lib/googleCalendar';

/**
 * POST /api/calendar/connect
 * Starts Google Calendar OAuth for the current user and returns the Google consent URL.
 * Requires Authorization: Bearer <access_token>.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let profileId: string;
  try {
    const anon = createAnonClient(token);
    const { data: { user }, error } = await anon.auth.getUser(token);
    if (error || !user?.id) {
      return Response.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    profileId = user.id;
  } catch {
    return Response.json({ error: 'Auth failed' }, { status: 401 });
  }

  const state = createOAuthState(profileId);
  if (!state) {
    return Response.json({ error: 'Server configuration error' }, { status: 503 });
  }
  const redirectUrl = buildGoogleAuthUrl(state);
  if (!redirectUrl) {
    return Response.json({ error: 'Server configuration error' }, { status: 503 });
  }
  return Response.json({ redirectUrl });
}

