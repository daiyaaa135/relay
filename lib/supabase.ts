import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Message Supabase returns when the API key is wrong or revoked. */
export const INVALID_API_KEY_MESSAGE = 'Invalid API key';

export function createClient() {
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
