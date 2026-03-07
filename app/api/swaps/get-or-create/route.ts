import { NextRequest } from 'next/server';
import { createAnonClient, createServerClient } from '@/lib/supabase-server';

/**
 * POST /api/swaps/get-or-create
 * Get or create an active swap between the authenticated buyer and a seller for a gadget.
 * Also ensures a conversation exists and is linked (conversation.swap_id). Returns conversationId for redirect to thread.
 * Body: { gadgetId: string; sellerProfileId: string; creditsAmount: number }
 * Returns: { swapId, conversationId } or { error }.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const anon = createAnonClient(token);
    const { data: { user }, error: authError } = await anon.auth.getUser(token);
    if (authError || !user?.id) {
      return Response.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const buyerProfileId = user.id;

    const body = await request.json().catch(() => ({}));
    const { gadgetId, sellerProfileId, creditsAmount } = body as {
      gadgetId?: string;
      sellerProfileId?: string;
      creditsAmount?: number;
    };

    if (!gadgetId || !sellerProfileId || typeof creditsAmount !== 'number') {
      return Response.json({ error: 'Missing or invalid parameters' }, { status: 400 });
    }
    if (buyerProfileId === sellerProfileId) {
      return Response.json({ error: "You can't message yourself." }, { status: 400 });
    }

    const server = createServerClient();
    if (!server) {
      return Response.json(
        { error: 'Server configuration error. Add SUPABASE_SERVICE_ROLE_KEY to .env.local' },
        { status: 503 }
      );
    }

    const activeStatuses = ['pending', 'confirmed', 'pickup_arranged'] as const;
    const { data: existingSwap } = await server
      .from('swaps')
      .select('id')
      .eq('gadget_id', gadgetId)
      .or(`buyer_profile_id.eq.${buyerProfileId},seller_profile_id.eq.${buyerProfileId}`)
      .in('status', activeStatuses)
      .limit(1)
      .maybeSingle();

    if (existingSwap?.id) {
      const swapId = (existingSwap as { id: string }).id;
      const { data: conv } = await server
        .from('conversations')
        .select('id')
        .eq('swap_id', swapId)
        .limit(1)
        .maybeSingle();
      if (conv?.id) {
        return Response.json({ swapId, conversationId: (conv as { id: string }).id });
      }
      const { data: newConv, error: insertConvErr } = await server
        .from('conversations')
        .insert({
          gadget_id: gadgetId,
          buyer_profile_id: buyerProfileId,
          seller_profile_id: sellerProfileId,
          swap_id: swapId,
        })
        .select('id')
        .single();
      if (insertConvErr || !newConv?.id) {
        return Response.json({ swapId, conversationId: swapId });
      }
      return Response.json({ swapId, conversationId: (newConv as { id: string }).id });
    }

    const { data: insertedSwap, error: swapError } = await server
      .from('swaps')
      .insert({
        gadget_id: gadgetId,
        buyer_profile_id: buyerProfileId,
        seller_profile_id: sellerProfileId,
        credits_amount: creditsAmount,
        status: 'pending',
      })
      .select('id')
      .single();

    if (swapError || !insertedSwap?.id) {
      return Response.json(
        { error: swapError?.message ?? 'Failed to start swap' },
        { status: 500 }
      );
    }
    const swapId = (insertedSwap as { id: string }).id;

    const { data: existingConv } = await server
      .from('conversations')
      .select('id')
      .eq('gadget_id', gadgetId)
      .eq('buyer_profile_id', buyerProfileId)
      .eq('seller_profile_id', sellerProfileId)
      .limit(1)
      .maybeSingle();

    const now = new Date().toISOString();
    if (existingConv?.id) {
      await server
        .from('conversations')
        .update({ swap_id: swapId, updated_at: now })
        .eq('id', (existingConv as { id: string }).id);
      return Response.json({ swapId, conversationId: (existingConv as { id: string }).id });
    }

    const { data: newConv, error: insertConvErr } = await server
      .from('conversations')
      .insert({
        gadget_id: gadgetId,
        buyer_profile_id: buyerProfileId,
        seller_profile_id: sellerProfileId,
        swap_id: swapId,
      })
      .select('id')
      .single();

    if (newConv?.id) {
      return Response.json({ swapId, conversationId: (newConv as { id: string }).id });
    }
    if (insertConvErr?.code === '23505') {
      const { data: conv } = await server
        .from('conversations')
        .select('id')
        .eq('gadget_id', gadgetId)
        .eq('buyer_profile_id', buyerProfileId)
        .eq('seller_profile_id', sellerProfileId)
        .limit(1)
        .maybeSingle();
      if (conv?.id) {
        await server.from('conversations').update({ swap_id: swapId, updated_at: now }).eq('id', (conv as { id: string }).id);
        return Response.json({ swapId, conversationId: (conv as { id: string }).id });
      }
    }
    return Response.json({ error: 'Failed to link conversation' }, { status: 500 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
