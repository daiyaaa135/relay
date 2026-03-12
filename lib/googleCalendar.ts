import crypto from 'crypto';
import { createServerClient } from '@/lib/supabase-server';
import { loadEnvConfig } from '@next/env';

let envLoaded = false;
function ensureEnvLoaded() {
  if (envLoaded) return;
  envLoaded = true;
  // Workaround: Next/Turbopack can fail to populate process.env inside route workers.
  // Load .env files into process.env at runtime for server-only calendar routes.
  loadEnvConfig(process.cwd());
}

function getCalendarEnv() {
  ensureEnvLoaded();
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID ?? '';
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET ?? '';
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI ?? '';
  const stateSecret = process.env.GOOGLE_CALENDAR_STATE_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  return { clientId, clientSecret, redirectUri, stateSecret };
}

export function createOAuthState(profileId: string, ttlSeconds = 10 * 60): string | null {
  const { stateSecret } = getCalendarEnv();
  if (!stateSecret || stateSecret.length < 20) return null;
  const now = Math.floor(Date.now() / 1000);
  const exp = now + ttlSeconds;
  const payload = `${profileId}.${exp}`;
  const sig = crypto.createHmac('sha256', stateSecret).update(payload).digest('base64url');
  const raw = `${profileId}.${exp}.${sig}`;
  return Buffer.from(raw).toString('base64url');
}

export function parseOAuthState(state: string): { profileId: string } | null {
  if (!stateSecret || !state) return null;
  let raw: string;
  try {
    raw = Buffer.from(state, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  const parts = raw.split('.');
  if (parts.length !== 3) return null;
  const [profileId, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!profileId || !Number.isFinite(exp)) return null;
  const now = Math.floor(Date.now() / 1000);
  if (exp < now) return null;
  const expectedSig = crypto.createHmac('sha256', stateSecret).update(`${profileId}.${exp}`).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
  return { profileId };
}

export function buildGoogleAuthUrl(state: string): string | null {
  const { clientId, redirectUri } = getCalendarEnv();
  if (!clientId || !redirectUri) return null;
  const root = 'https://accounts.google.com/o/oauth2/v2/auth';
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `${root}?${params.toString()}`;
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const { clientId, clientSecret, redirectUri } = getCalendarEnv();
  if (!clientId || !clientSecret || !redirectUri) {
    return { error: 'missing_env', error_description: 'Missing Google Calendar env vars' };
  }
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = (await res.json()) as TokenResponse;
  if (!res.ok) {
    return { ...data, error: data.error ?? 'token_error' };
  }
  return data;
}

export async function refreshAccessToken(profileId: string): Promise<{ accessToken: string } | { error: string }> {
  const { clientId, clientSecret } = getCalendarEnv();
  if (!clientId || !clientSecret) return { error: 'missing_env' };
  const server = createServerClient();
  if (!server) return { error: 'server_client_error' };

  const { data, error } = await server
    .from('profile_google_calendar')
    .select('refresh_token, access_token, expires_at')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error || !data) return { error: 'not_connected' };

  const row = data as { refresh_token: string; access_token: string | null; expires_at: string | null };
  const now = Date.now();
  if (row.access_token && row.expires_at) {
    const expiresAtMs = new Date(row.expires_at).getTime();
    if (Number.isFinite(expiresAtMs) && expiresAtMs - now > 60_000) {
      return { accessToken: row.access_token };
    }
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: row.refresh_token,
    grant_type: 'refresh_token',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = (await res.json()) as TokenResponse;
  if (!res.ok || !json.access_token) {
    return { error: json.error ?? 'refresh_failed' };
  }

  const expiresIn = typeof json.expires_in === 'number' ? json.expires_in : 3600;
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  await server
    .from('profile_google_calendar')
    .update({ access_token: json.access_token, expires_at: expiresAt })
    .eq('profile_id', profileId);

  return { accessToken: json.access_token };
}

