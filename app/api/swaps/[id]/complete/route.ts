import { NextRequest } from 'next/server';
import { createAnonClient, createServerClient } from '@/lib/supabase-server';

/**
 * POST /api/swaps/[id]/complete
 * Confirm pickup at meetup: mark swap completed. Credits are already deducted when the buyer
 * confirmed pickup time (product page). If no swap_debit exists yet (legacy flow), we debit here.
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

    let callerId: string;
    try {
      const anon = createAnonClient(token);
      const { data: { user }, error } = await anon.auth.getUser(token);
      if (error || !user?.id) {
        return Response.json({ error: 'Invalid or expired token' }, { status: 401 });
      }
      callerId = user.id;
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
    const isBuyer = swap.buyer_profile_id === callerId;
    const isSeller = swap.seller_profile_id === callerId;
    if (!isBuyer && !isSeller) {
      return Response.json({ error: 'Only the buyer or seller can confirm pickup' }, { status: 403 });
    }
    const buyerId = swap.buyer_profile_id;
    if (swap.status === 'completed') {
      return Response.json({ error: 'Swap already completed' }, { status: 400 });
    }
    if (swap.status !== 'pickup_arranged') {
      return Response.json({ error: 'Swap is not in pickup_arranged status' }, { status: 400 });
    }

    const amount = Number(swap.credits_amount);
    if (!(amount > 0)) {
      return Response.json({ error: 'Invalid swap credits amount' }, { status: 400 });
    }

    const { data: existingDebit } = await server
      .from('transactions')
      .select('id')
      .eq('reference_id', swapId)
      .eq('type', 'swap_debit')
      .limit(1)
      .maybeSingle();

    if (!existingDebit?.id) {
      const { data: buyerProfile } = await server
        .from('profiles')
        .select('credits_balance')
        .eq('id', buyerId)
        .single();

      const currentBalance = buyerProfile?.credits_balance != null ? Number(buyerProfile.credits_balance) : 0;
      if (currentBalance < amount) {
        return Response.json(
          { error: 'Insufficient credits. Your balance is too low to complete this swap.' },
          { status: 400 }
        );
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

      const { error: txError } = await server.from('transactions').insert({
        profile_id: buyerId,
        amount: -amount,
        type: 'swap_debit',
        description: itemName,
        reference_id: swapId,
      });
      if (txError) {
        console.error('[api/swaps/complete] transaction insert failed:', txError.message);
        return Response.json({ error: 'Failed to record transaction' }, { status: 500 });
      }

      const { error: balanceError } = await server
        .from('profiles')
        .update({ credits_balance: currentBalance - amount })
        .eq('id', buyerId);
      if (balanceError) {
        console.error('[api/swaps/complete] credits_balance update failed:', balanceError.message);
        return Response.json({ error: 'Failed to update balance' }, { status: 500 });
      }
    }

    const completedAt = new Date().toISOString();
    const { error: updateError } = await server
      .from('swaps')
      .update({ status: 'completed', completed_at: completedAt, updated_at: completedAt })
      .eq('id', swapId);
    if (updateError) {
      console.error('[api/swaps/complete] swap update failed:', updateError.message);
      return Response.json({ error: 'Failed to complete swap' }, { status: 500 });
    }

    // Mark gadget as swapped
    if (swap.gadget_id) {
      await server.from('gadgets').update({ status: 'swapped' }).eq('id', swap.gadget_id);
    }

    // Credit the seller
    const sellerId = swap.seller_profile_id;
    const { data: existingCredit } = await server
      .from('transactions')
      .select('id')
      .eq('reference_id', swapId)
      .eq('type', 'swap_credit')
      .limit(1)
      .maybeSingle();

    if (!existingCredit?.id) {
      let itemName = 'Swap';
      if (swap.gadget_id) {
        const { data: gadget } = await server.from('gadgets').select('name').eq('id', swap.gadget_id).single();
        if (gadget?.name) itemName = (gadget as { name: string }).name.trim();
      }
      const { data: sellerProfile } = await server
        .from('profiles')
        .select('credits_balance')
        .eq('id', sellerId)
        .single();
      const sellerBalance = sellerProfile?.credits_balance != null ? Number(sellerProfile.credits_balance) : 0;
      await server.from('transactions').insert({
        profile_id: sellerId,
        amount: amount,
        type: 'swap_credit',
        description: itemName,
        reference_id: swapId,
      });
      await server.from('profiles').update({ credits_balance: sellerBalance + amount }).eq('id', sellerId);
    }

    return Response.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
