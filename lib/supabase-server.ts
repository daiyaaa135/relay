import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

/**
 * Server-only Supabase client that bypasses RLS. Use in API routes for operations
 * that must succeed regardless of RLS (e.g. crediting a user when their listing goes live).
 * Requires SUPABASE_SERVICE_ROLE_KEY in env (e.g. .env.local). Do not expose this key to the client.
 */
export function createServerClient(): SupabaseClient | null {
  if (!supabaseUrl || !serviceRoleKey || serviceRoleKey.length < 20) return null;
  return createSupabaseClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

/** Anon-key client for server-side auth checks (e.g. getUser with JWT). */
export function createAnonClient(accessToken?: string): SupabaseClient {
  if (!supabaseUrl || !anonKey) throw new Error('Missing Supabase env vars');
  const options = accessToken
    ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    : undefined;
  return createSupabaseClient(supabaseUrl, anonKey.trim(), options);
}
