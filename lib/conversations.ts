import { createClient } from './supabase';

/**
 * Get or create a conversation (message-only thread) for a gadget between buyer and seller.
 * Does not create a swap. Use this when the user taps "Message" without starting a swap.
 */
export async function getOrCreateConversation(
  gadgetId: string,
  buyerProfileId: string,
  sellerProfileId: string
): Promise<{ conversationId: string } | { error: string }> {
  if (typeof window === 'undefined') {
    return { error: 'getOrCreateConversation is for client only' };
  }
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      return { error: 'Please sign in to start a conversation.' };
    }

    const res = await fetch('/api/conversations/get-or-create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ gadgetId, sellerProfileId }),
    });
    const body = (await res.json().catch(() => ({}))) as { conversationId?: string; error?: string };
    if (!res.ok || !body.conversationId) {
      return { error: body.error ?? 'Failed to start conversation' };
    }
    return { conversationId: body.conversationId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to start conversation';
    return { error: msg };
  }
}

/**
 * Fetch conversation id for a swap (when we have swapId and need to link to thread).
 */
export async function getConversationIdBySwapId(swapId: string): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('conversations')
      .select('id')
      .eq('swap_id', swapId)
      .limit(1)
      .maybeSingle();
    if (error || !data?.id) return null;
    return data.id;
  } catch {
    return null;
  }
}
