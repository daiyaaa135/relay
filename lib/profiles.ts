import { createClient } from './supabase';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  rating: number;
  rating_count: number;
  membership_tier: string;
  /** Profile creation date (ISO string) for "Joined Month Year" */
  created_at?: string;
  /** Current credit balance (from profiles.credits_balance) */
  credits_balance?: number;
  /** Notification preferences (may be missing if migration not applied) */
  notify_messages?: boolean;
  notify_swaps?: boolean;
  notify_pickup_30_min?: boolean;
  notify_pickup_15_min?: boolean;
};

/**
 * Fetch profile by id (UUID) or by display_name.
 * Use id when you have it (e.g. from listing.sellerId); use display_name for /profile/[username] URLs.
 */
const PROFILE_COLS = 'id, display_name, avatar_url, rating, rating_count, membership_tier, created_at, credits_balance';
const PROFILE_COLS_WITH_BIO = 'id, display_name, avatar_url, bio, rating, rating_count, membership_tier, created_at, credits_balance';
const PROFILE_COLS_FULL = 'id, display_name, avatar_url, bio, rating, rating_count, membership_tier, created_at, credits_balance, notify_messages, notify_swaps, notify_pickup_30_min, notify_pickup_15_min';

export async function fetchProfile(identifier: string): Promise<Profile | null> {
  if (!identifier) return null;
  try {
    const supabase = createClient();
    const isId = UUID_REGEX.test(identifier);
    let selectCols = PROFILE_COLS_FULL;
    let supabaseQuery = supabase.from('profiles').select(selectCols);
    supabaseQuery = isId
      ? supabaseQuery.eq('id', identifier).single()
      : supabaseQuery.ilike('display_name', decodeURIComponent(identifier)).limit(1);
    let { data, error } = await supabaseQuery;
    if (error && /bio|schema cache|column.*profiles|notify_/i.test(error.message)) {
      selectCols = PROFILE_COLS_WITH_BIO;
      supabaseQuery = supabase.from('profiles').select(selectCols);
      supabaseQuery = isId
        ? supabaseQuery.eq('id', identifier).single()
        : supabaseQuery.ilike('display_name', decodeURIComponent(identifier)).limit(1);
      const res = await supabaseQuery;
      data = res.data;
      error = res.error;
      if (error && /bio|schema cache|column.*profiles/i.test(error.message)) {
        supabaseQuery = supabase.from('profiles').select(PROFILE_COLS);
        supabaseQuery = isId
          ? supabaseQuery.eq('id', identifier).single()
          : supabaseQuery.ilike('display_name', decodeURIComponent(identifier)).limit(1);
        const fallback = await supabaseQuery;
        data = fallback.data;
        error = fallback.error;
      }
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) return null;
    const r = row as Record<string, unknown>;
    return {
      id: row.id,
      display_name: row.display_name ?? 'User',
      avatar_url: row.avatar_url ?? null,
      bio: (row as { bio?: string | null }).bio ?? null,
      rating: Number(row.rating ?? 0),
      rating_count: Number(row.rating_count ?? 0),
      membership_tier: row.membership_tier ?? 'guest',
      created_at: typeof r.created_at === 'string' ? r.created_at : undefined,
      credits_balance: r.credits_balance !== undefined && r.credits_balance !== null ? Number(r.credits_balance) : undefined,
      notify_messages: r.notify_messages !== undefined ? Boolean(r.notify_messages) : undefined,
      notify_swaps: r.notify_swaps !== undefined ? Boolean(r.notify_swaps) : undefined,
      notify_pickup_30_min: r.notify_pickup_30_min !== undefined ? Boolean(r.notify_pickup_30_min) : undefined,
      notify_pickup_15_min: r.notify_pickup_15_min !== undefined ? Boolean(r.notify_pickup_15_min) : undefined,
    };
  } catch {
    return null;
  }
}

export type ProfileUpdate = {
  display_name?: string;
  avatar_url?: string | null;
  bio?: string | null;
};

/** Result of updateProfile when bio column may be missing */
export type UpdateProfileResult =
  | { error: null; bioSaved?: boolean }
  | { error: string; bioSaved?: boolean };

/** Update the current user's profile. Only provided fields are updated. */
export async function updateProfile(profileId: string, updates: ProfileUpdate): Promise<UpdateProfileResult> {
  if (!profileId) return { error: 'No profile' };
  const supabase = createClient();
  const basePayload: Record<string, unknown> = {};
  if (updates.display_name !== undefined) basePayload.display_name = (updates.display_name.trim() || 'User').slice(0, 100);
  if (updates.avatar_url !== undefined) basePayload.avatar_url = updates.avatar_url || null;
  const hasBio = updates.bio !== undefined;
  const bioValue = hasBio ? (updates.bio?.trim() || null) : undefined;

  try {
    const payload = { ...basePayload };
    if (hasBio) payload.bio = bioValue;
    if (Object.keys(payload).length === 0) return { error: null };

    const { error } = await supabase.from('profiles').update(payload).eq('id', profileId);
    if (!error) return { error: null, bioSaved: hasBio };

    const isBioColumnError = /bio|schema cache|column.*profiles/i.test(error.message);
    if (isBioColumnError && hasBio && Object.keys(basePayload).length > 0) {
      const { error: baseError } = await supabase.from('profiles').update(basePayload).eq('id', profileId);
      if (!baseError) {
        return { error: null, bioSaved: false };
      }
    }
    return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Update failed' };
  }
}

export type NotificationPrefs = {
  notify_messages?: boolean;
  notify_swaps?: boolean;
  notify_pickup_30_min?: boolean;
  notify_pickup_15_min?: boolean;
};

/** Update only notification preferences. Use after running migration 20241103000000_add_profiles_notification_prefs. */
export async function updateNotificationPrefs(profileId: string, prefs: NotificationPrefs): Promise<{ error: string | null }> {
  if (!profileId) return { error: 'No profile' };
  const payload: Record<string, boolean> = {};
  if (prefs.notify_messages !== undefined) payload.notify_messages = prefs.notify_messages;
  if (prefs.notify_swaps !== undefined) payload.notify_swaps = prefs.notify_swaps;
  if (prefs.notify_pickup_30_min !== undefined) payload.notify_pickup_30_min = prefs.notify_pickup_30_min;
  if (prefs.notify_pickup_15_min !== undefined) payload.notify_pickup_15_min = prefs.notify_pickup_15_min;
  if (Object.keys(payload).length === 0) return { error: null };
  try {
    const supabase = createClient();
    const { error } = await supabase.from('profiles').update(payload).eq('id', profileId);
    return { error: error?.message ?? null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Update failed' };
  }
}

/** Count swaps where this profile is buyer or seller (any status, or only completed). */
export async function fetchExchangeCount(profileId: string, completedOnly = false): Promise<number> {
  if (!profileId) return 0;
  try {
    const supabase = createClient();
    let query = supabase
      .from('swaps')
      .select('id', { count: 'exact', head: true })
      .or(`buyer_profile_id.eq.${profileId},seller_profile_id.eq.${profileId}`);
    if (completedOnly) query = query.eq('status', 'completed');
    const { count, error } = await query;
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

/** Count followers for a profile (how many users follow this shop). */
export async function fetchFollowerCount(profileId: string): Promise<number> {
  if (!profileId) return 0;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profile_follows')
      .select('follower_id')
      .eq('following_id', profileId);

    const rowCount = Array.isArray(data) ? data.length : 0;
    if (error) return 0;
    return rowCount;
  } catch {
    return 0;
  }
}

/** Check if the current user follows the given profile. */
export async function isFollowing(followerId: string | null, followingId: string): Promise<boolean> {
  if (!followerId || !followingId || followerId === followingId) return false;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profile_follows')
      .select('follower_id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();
    return !error && !!data;
  } catch {
    return false;
  }
}

/** Follow a profile. Returns error message or null on success. */
export async function followProfile(followerId: string, followingId: string): Promise<string | null> {
  if (!followerId || !followingId || followerId === followingId) return 'Invalid';
  try {
    const supabase = createClient();
    const { error } = await supabase.from('profile_follows').insert({ follower_id: followerId, following_id: followingId });
    if (error) {
      if (error.code === '23505') return null; // already following
      return error.message;
    }
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : 'Follow failed';
  }
}

/** Unfollow a profile. Returns error message or null on success. */
export async function unfollowProfile(followerId: string, followingId: string): Promise<string | null> {
  if (!followerId || !followingId) return 'Invalid';
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('profile_follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);
    return error?.message ?? null;
  } catch (e) {
    return e instanceof Error ? e.message : 'Unfollow failed';
  }
}
