import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/** Message Supabase returns when the API key is wrong or revoked. */
export const INVALID_API_KEY_MESSAGE = 'Invalid API key';

declare global {
  interface Window {
    __SUPABASE_PUBLIC_ENV__?: { url: string; anonKey: string };
  }
}

function getSupabaseEnv(): { url: string; anonKey: string } {
  if (typeof window !== 'undefined' && window.__SUPABASE_PUBLIC_ENV__) {
    const { url, anonKey } = window.__SUPABASE_PUBLIC_ENV__;
    if (url && anonKey) return { url, anonKey };
  }
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  };
}

export function createClient() {
  const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabaseEnv();
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/1b68bc98-dfbf-4969-9794-62dc8b7c5307', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'lib/supabase.ts:createClient',
      message: 'createClient env check',
      data: {
        hasUrl: Boolean(supabaseUrl?.trim()),
        hasKey: Boolean(supabaseAnonKey?.trim()),
        runId: 'post-fix',
      },
      timestamp: Date.now(),
      hypothesisId: 'H1-H5',
    }),
  }).catch(() => {});
  // #endregion
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase env vars. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local (not env.) and restart the dev server.'
    );
  }
  const trimmedKey = supabaseAnonKey.trim();
  if (trimmedKey === 'your-anon-key' || trimmedKey.length < 20) {
    throw new Error(
      'Supabase anon key looks wrong. Copy the anon or publishable key from Supabase Dashboard → Project Settings → API into .env.local as NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }
  return createSupabaseClient(supabaseUrl, trimmedKey);
}
