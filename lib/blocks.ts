import { createClient } from './supabase';

export type BlockedProfile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  blocked_at: string;
};

/** Fetch profiles the current user has blocked. */
export async function fetchBlockedProfiles(blockerId: string | null): Promise<BlockedProfile[]> {
  if (!blockerId) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profile_blocks')
      .select(`
        created_at,
        blocked:profiles!blocked_id(id, display_name, avatar_url)
      `)
      .eq('blocker_id', blockerId)
      .order('created_at', { ascending: false });
    if (error) return [];
    const rows = (data ?? []) as Array<{
      created_at: string;
      blocked: { id: string; display_name: string; avatar_url: string | null } | { id: string; display_name: string; avatar_url: string | null }[];
    }>;
    return rows
      .map((r) => {
        const b = Array.isArray(r.blocked) ? r.blocked[0] : r.blocked;
        if (!b) return null;
        return {
          id: b.id,
          display_name: b.display_name ?? 'User',
          avatar_url: b.avatar_url ?? null,
          blocked_at: r.created_at,
        };
      })
      .filter((x): x is BlockedProfile => x != null);
  } catch {
    return [];
  }
}

/** Block a user. Returns error message or null on success. */
export async function blockUser(blockerId: string, blockedId: string): Promise<string | null> {
  if (!blockerId || !blockedId || blockerId === blockedId) return 'Invalid';
  try {
    const supabase = createClient();
    const { error } = await supabase.from('profile_blocks').insert({ blocker_id: blockerId, blocked_id: blockedId });
    if (error) {
      if (error.code === '23505') return null; // already blocked
      return error.message;
    }
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : 'Block failed';
  }
}

/** Unblock a user. Returns error message or null on success. */
export async function unblockUser(blockerId: string, blockedId: string): Promise<string | null> {
  if (!blockerId || !blockedId) return 'Invalid';
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('profile_blocks')
      .delete()
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId);
    return error?.message ?? null;
  } catch (e) {
    return e instanceof Error ? e.message : 'Unblock failed';
  }
}

/** Check if the current user has blocked the given profile. */
export async function isBlocked(blockerId: string | null, blockedId: string): Promise<boolean> {
  if (!blockerId || !blockedId || blockerId === blockedId) return false;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profile_blocks')
      .select('blocker_id')
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId)
      .maybeSingle();
    return !error && !!data;
  } catch {
    return false;
  }
}
