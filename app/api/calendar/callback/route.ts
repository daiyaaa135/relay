import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { exchangeCodeForTokens, parseOAuthState } from '@/lib/googleCalendar';

/**
 * GET /api/calendar/callback
 * OAuth2 redirect URI for Google Calendar. Exchanges code for tokens and stores
 * them in profile_google_calendar, then redirects back to Availability settings.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return Response.redirect(new URL('/settings/availability?error=missing_code', url.origin));
  }

  const parsed = parseOAuthState(state);
  if (!parsed?.profileId) {
    return Response.redirect(new URL('/settings/availability?error=invalid_state', url.origin));
  }
  const profileId = parsed.profileId;

  const tokenResponse = await exchangeCodeForTokens(code);
  if (!tokenResponse || tokenResponse.error || !tokenResponse.access_token) {
    return Response.redirect(new URL('/settings/availability?error=oauth_failed', url.origin));
  }

  const server = createServerClient();
  if (!server) {
    return Response.redirect(new URL('/settings/availability?error=server_config', url.origin));
  }

  let refreshToken = tokenResponse.refresh_token;
  if (!refreshToken) {
    const { data: existing } = await server
      .from('profile_google_calendar')
      .select('refresh_token')
      .eq('profile_id', profileId)
      .maybeSingle();
    if (existing && (existing as { refresh_token?: string }).refresh_token) {
      refreshToken = (existing as { refresh_token: string }).refresh_token;
    }
  }

  if (!refreshToken) {
    return Response.redirect(new URL('/settings/availability?error=no_refresh_token', url.origin));
  }

  const expiresIn = typeof tokenResponse.expires_in === 'number' ? tokenResponse.expires_in : 3600;
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  const { error } = await server
    .from('profile_google_calendar')
    .upsert(
      {
        profile_id: profileId,
        refresh_token: refreshToken,
        access_token: tokenResponse.access_token,
        expires_at: expiresAt,
      },
      { onConflict: 'profile_id' }
    );

  if (error) {
    return Response.redirect(new URL('/settings/availability?error=persist_failed', url.origin));
  }

  return Response.redirect(new URL('/settings/availability?synced=1', url.origin));
}

