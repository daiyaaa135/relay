import { NextRequest } from 'next/server';
import { createAnonClient, createServerClient } from '@/lib/supabase-server';

/**
 * POST /api/swaps/[id]/cancel
 * Cancel a pending swap. Only the buyer can cancel, and only when:
 *   - Swap is in 'pending' status
 * If credits were already debited (swap_debit transaction exists), they are refunded.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: swapId } = await params;
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let buyerId: string;
    try {
      const anon = createAnonClient(token);
      const { data: { user }, error } = await anon.auth.getUser(token);
      if (error || !user?.id) return Response.json({ error: 'Invalid or expired token' }, { status: 401 });
      buyerId = user.id;
    } catch {
      return Response.json({ error: 'Auth failed' }, { status: 401 });
    }

    const server = createServerClient();
    if (!server) return Response.json({ error: 'Server configuration error' }, { status: 503 });

    const { data: swap, error: swapError } = await server
      .from('swaps')
      .select('id, status, buyer_profile_id, seller_profile_id, credits_amount, gadget_id')
      .eq('id', swapId)
      .single();

    if (swapError || !swap) return Response.json({ error: 'Swap not found' }, { status: 404 });
    if (swap.buyer_profile_id !== buyerId) {
      return Response.json({ error: 'Only the buyer can cancel a swap' }, { status: 403 });
    }
    if (swap.status !== 'pending') {
      return Response.json({
        error: 'This swap can no longer be cancelled. Once pickup times are confirmed and credits are debited, the exchange must be completed in person.',
      }, { status: 400 });
    }

    const amount = Number(swap.credits_amount);

    // Check if credits were already debited for this swap
    const { data: existingDebit } = await server
      .from('transactions')
      .select('id')
      .eq('reference_id', swapId)
      .eq('type', 'swap_debit')
      .limit(1)
      .maybeSingle();

    const now = new Date().toISOString();

    // Cancel the swap
    const { error: updateError } = await server
      .from('swaps')
      .update({ status: 'cancelled', updated_at: now })
      .eq('id', swapId);

    if (updateError) return Response.json({ error: 'Failed to cancel swap' }, { status: 500 });

    // Restore gadget to available if it was marked pending_swap
    if (swap.gadget_id) {
      await server.from('gadgets').update({ status: 'available' }).eq('id', swap.gadget_id);
    }

    // Insert a system message so both parties see the cancellation in chat
    const { data: conv } = await server.from('conversations').select('id').eq('swap_id', swapId).limit(1).maybeSingle();
    if (conv?.id) {
      const { data: buyerProfile2 } = await server
        .from('profiles')
        .select('display_name')
        .eq('id', buyerId)
        .single();
      const buyerDisplayName = (buyerProfile2 as { display_name?: string } | null)?.display_name ?? 'Buyer';
      await server.from('messages').insert({
        conversation_id: (conv as { id: string }).id,
        sender_profile_id: buyerId,
        content: JSON.stringify({ _type: 'swap_cancelled', buyerDisplayName }),
      });
    }

    // Refund buyer credits if debit already happened
    if (existingDebit?.id && amount > 0) {
      const { data: buyerProfile } = await server
        .from('profiles')
        .select('credits_balance')
        .eq('id', buyerId)
        .single();
      const currentBalance = buyerProfile?.credits_balance != null ? Number(buyerProfile.credits_balance) : 0;

      const { error: txError } = await server.from('transactions').insert({
        profile_id: buyerId,
        amount: amount,
        type: 'swap_credit',
        description: 'Swap cancelled — refund',
        reference_id: swapId,
      });
      const { error: balanceError } = await server.from('profiles')
        .update({ credits_balance: currentBalance + amount, updated_at: now })
        .eq('id', buyerId);

    }

    return Response.json({ ok: true, refunded: !!(existingDebit?.id && amount > 0) });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
