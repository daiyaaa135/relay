import { createClient } from './supabase';

export type SwapGadget = {
  id: string;
  name: string;
  image_urls: string[] | null;
};

export type SwapProfile = { display_name: string; avatar_url: string | null } | null;

export type SwapRow = {
  id: string;
  gadget_id: string;
  buyer_profile_id: string;
  seller_profile_id: string;
  credits_amount: number;
  status: string;
  created_at: string;
  gadget?: SwapGadget | SwapGadget[] | null;
  buyer?: SwapProfile | SwapProfile[];
  seller?: SwapProfile | SwapProfile[];
};

/**
 * Fetch all swaps for the current user (as buyer or seller) with gadget details.
 */
export async function fetchMySwaps(profileId: string): Promise<SwapRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('swaps')
    .select(`
      id,
      gadget_id,
      buyer_profile_id,
      seller_profile_id,
      credits_amount,
      status,
      created_at,
      gadget:gadgets(id, name, image_urls),
      buyer:profiles!buyer_profile_id(display_name, avatar_url),
      seller:profiles!seller_profile_id(display_name, avatar_url)
    `)
    .or(`buyer_profile_id.eq.${profileId},seller_profile_id.eq.${profileId}`)
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data ?? []) as SwapRow[];
}

/**
 * Fetch an active swap (not completed/cancelled) for this gadget and user (as buyer or seller).
 * When the viewer is the buyer, includes hasDebited: true only if they actually confirmed (credits debited).
 * Includes conversationId for linking to the message thread.
 */
export async function fetchActiveSwapForGadget(
  gadgetId: string,
  profileId: string
): Promise<{ swapId: string; status: string; hasDebited?: boolean; conversationId?: string } | null> {
  if (!gadgetId || !profileId) return null;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('swaps')
      .select('id, status, buyer_profile_id, seller_profile_id')
      .eq('gadget_id', gadgetId)
      .or(`buyer_profile_id.eq.${profileId},seller_profile_id.eq.${profileId}`)
      .in('status', ['pending', 'confirmed', 'pickup_arranged'])
      .limit(1)
      .maybeSingle();

    if (error || !data?.id) return null;

    const row = data as { id: string; status: string; buyer_profile_id: string; seller_profile_id: string };
    let hasDebited = false;
    if (row.buyer_profile_id === profileId) {
      const { data: debitRow } = await supabase
        .from('transactions')
        .select('id')
        .eq('profile_id', profileId)
        .eq('reference_id', row.id)
        .eq('type', 'swap_debit')
        .limit(1)
        .maybeSingle();
      hasDebited = !!debitRow?.id;
    }

    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .eq('swap_id', row.id)
      .limit(1)
      .maybeSingle();
    const conversationId = conv?.id ?? undefined;

    return { swapId: row.id, status: row.status, hasDebited, conversationId };
  } catch {
    return null;
  }
}

/**
 * Get an existing swap for this gadget and current user (as buyer or seller),
 * or create a new swap. Returns swap id and conversation id (for redirecting to thread).
 */
export async function getOrCreateSwap(
  gadgetId: string,
  buyerProfileId: string,
  sellerProfileId: string,
  creditsAmount: number
): Promise<{ swapId: string; conversationId: string } | { error: string }> {
  if (typeof window === 'undefined') {
    return { error: 'getOrCreateSwap is for client only' };
  }
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      return { error: 'Please sign in to start a swap.' };
    }

    const res = await fetch('/api/swaps/get-or-create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ gadgetId, sellerProfileId, creditsAmount }),
    });
    const body = (await res.json().catch(() => ({}))) as { swapId?: string; conversationId?: string; error?: string };
    if (!res.ok || !body.swapId || !body.conversationId) {
      return { error: body.error ?? 'Failed to start swap' };
    }
    return { swapId: body.swapId, conversationId: body.conversationId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to start swap';
    return { error: msg };
  }
}
