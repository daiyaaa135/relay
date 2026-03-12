import { createClient } from './supabase';

const LS_KEY = 'relay_wishlist';

/** Read gadget IDs from localStorage (used when logged out). */
export function getLocalWishlist(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (!saved) return [];
    const ids = JSON.parse(saved) as unknown;
    return Array.isArray(ids) ? (ids as string[]) : [];
  } catch {
    return [];
  }
}

/** Persist to localStorage. */
export function setLocalWishlist(ids: string[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_KEY, JSON.stringify(ids));
}

/** Fetch all wishlist gadget IDs for a logged-in user. */
export async function fetchWishlistIds(profileId: string): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('wishlists')
    .select('gadget_id')
    .eq('profile_id', profileId);
  if (error) return [];
  return (data ?? []).map((r: { gadget_id: string }) => r.gadget_id);
}

/** Add a gadget to the DB wishlist. */
export async function addToWishlist(profileId: string, gadgetId: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('wishlists').upsert({ profile_id: profileId, gadget_id: gadgetId });
}

/** Remove a gadget from the DB wishlist. */
export async function removeFromWishlist(profileId: string, gadgetId: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('wishlists').delete().eq('profile_id', profileId).eq('gadget_id', gadgetId);
}

/**
 * Load wishlist for the current user: DB if logged in, localStorage otherwise.
 * Also syncs any existing localStorage items to DB when the user is logged in.
 */
export async function loadWishlist(): Promise<{ ids: string[]; profileId: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profileId = user?.id ?? null;

  if (!profileId) {
    return { ids: getLocalWishlist(), profileId: null };
  }

  // Sync localStorage items to DB, then use DB as source of truth
  const localIds = getLocalWishlist();
  const dbIds = await fetchWishlistIds(profileId);

  const toSync = localIds.filter((id) => !dbIds.includes(id));
  if (toSync.length > 0) {
    const supabase2 = createClient();
    await supabase2.from('wishlists').upsert(
      toSync.map((gadget_id) => ({ profile_id: profileId, gadget_id }))
    );
    setLocalWishlist([]); // clear local after sync
  }

  const merged = Array.from(new Set([...dbIds, ...toSync]));
  return { ids: merged, profileId };
}

/** Toggle a gadget in the wishlist (add if absent, remove if present). */
export async function toggleWishlistItem(
  profileId: string | null,
  gadgetId: string,
  currentIds: string[]
): Promise<string[]> {
  const isWishlisted = currentIds.includes(gadgetId);
  const newIds = isWishlisted
    ? currentIds.filter((id) => id !== gadgetId)
    : [...currentIds, gadgetId];

  if (profileId) {
    if (isWishlisted) {
      await removeFromWishlist(profileId, gadgetId);
    } else {
      await addToWishlist(profileId, gadgetId);
    }
  } else {
    setLocalWishlist(newIds);
  }

  return newIds;
}
