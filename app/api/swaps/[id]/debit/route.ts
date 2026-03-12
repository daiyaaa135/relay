import { NextRequest } from 'next/server';
import { createAnonClient, createServerClient } from '@/lib/supabase-server';

/**
 * POST /api/swaps/[id]/debit
 * Deduct credits from the buyer when they confirm pickup times (product page → Swap with credits → Confirm swap → Confirm pickup time).
 * Caller must be the buyer. Idempotent: if swap_debit already exists for this swap, returns ok without double-debiting.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: swapId } = await params;
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let buyerId: string;
    try {
      const anon = createAnonClient(token);
      const { data: { user }, error } = await anon.auth.getUser(token);
      if (error || !user?.id) {
        return Response.json({ error: 'Invalid or expired token' }, { status: 401 });
      }
      buyerId = user.id;
    } catch {
      return Response.json({ error: 'Auth failed' }, { status: 401 });
    }

    const server = createServerClient();
    if (!server) {
      return Response.json(
        { error: 'Server configuration error. Add SUPABASE_SERVICE_ROLE_KEY to .env.local' },
        { status: 503 }
      );
    }

    const { data: swap, error: swapError } = await server
      .from('swaps')
      .select('id, status, buyer_profile_id, seller_profile_id, credits_amount, gadget_id')
      .eq('id', swapId)
      .single();

    if (swapError || !swap) {
      return Response.json({ error: 'Swap not found' }, { status: 404 });
    }

    let itemName = 'Swap';
    if (swap.gadget_id) {
      const { data: gadget } = await server
        .from('gadgets')
        .select('name')
        .eq('id', swap.gadget_id)
        .single();
      if (gadget?.name) itemName = (gadget as { name: string }).name.trim();
    }
    if (swap.buyer_profile_id !== buyerId) {
      return Response.json({ error: 'Only the buyer can confirm pickup times and deduct credits' }, { status: 403 });
    }
    if (swap.status === 'completed') {
      return Response.json({ error: 'Swap already completed' }, { status: 400 });
    }

    const amount = Number(swap.credits_amount);
    if (!(amount > 0)) {
      return Response.json({ error: 'Invalid swap credits amount' }, { status: 400 });
    }

    const { data: existing } = await server
      .from('transactions')
      .select('id')
      .eq('reference_id', swapId)
      .eq('type', 'swap_debit')
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      return Response.json({ ok: true, alreadyDebited: true });
    }

    const { data: buyerProfile } = await server
      .from('profiles')
      .select('credits_balance')
      .eq('id', buyerId)
      .single();

    const currentBalance = buyerProfile?.credits_balance != null ? Number(buyerProfile.credits_balance) : 0;
    if (currentBalance < amount) {
      return Response.json(
        { error: 'Insufficient credits. Your balance is too low to confirm this pickup.' },
        { status: 400 }
      );
    }

    const { error: txError } = await server.from('transactions').insert({
      profile_id: buyerId,
      amount: -amount,
      type: 'swap_debit',
      description: itemName,
      reference_id: swapId,
    });
    if (txError) {
      console.error('[api/swaps/debit] transaction insert failed:', txError.message);
      return Response.json({ error: 'Failed to record transaction' }, { status: 500 });
    }

    const { error: balanceError } = await server
      .from('profiles')
      .update({ credits_balance: currentBalance - amount, updated_at: new Date().toISOString() })
      .eq('id', buyerId);
    if (balanceError) {
      console.error('[api/swaps/debit] credits_balance update failed:', balanceError.message);
      return Response.json({ error: 'Failed to update balance' }, { status: 500 });
    }

    // Mark gadget as pending_swap
    if (swap.gadget_id) {
      await server.from('gadgets').update({ status: 'pending_swap' }).eq('id', swap.gadget_id);
    }

    return Response.json({ ok: true, newBalance: currentBalance - amount });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
