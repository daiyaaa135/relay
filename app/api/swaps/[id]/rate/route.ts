import { NextRequest } from 'next/server';
import { createAnonClient, createServerClient } from '@/lib/supabase-server';

/**
 * POST /api/swaps/[id]/rate
 * Rate the other party after a completed swap. Body: { rating: number } (1-5).
 * One rating per user per swap. Updates the rated profile's rating and rating_count.
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

    let raterId: string;
    try {
      const anon = createAnonClient(token);
      const { data: { user }, error } = await anon.auth.getUser(token);
      if (error || !user?.id) {
        return Response.json({ error: 'Invalid or expired token' }, { status: 401 });
      }
      raterId = user.id;
    } catch {
      return Response.json({ error: 'Auth failed' }, { status: 401 });
    }

    let body: { rating?: number; comment?: string };
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const rating = typeof body.rating === 'number' ? Math.round(body.rating) : 0;
    if (rating < 1 || rating > 5) {
      return Response.json({ error: 'Rating must be 1-5' }, { status: 400 });
    }
    const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 500) : null;

    const server = createServerClient();
    if (!server) {
      return Response.json(
        { error: 'Server configuration error. Add SUPABASE_SERVICE_ROLE_KEY to .env.local' },
        { status: 503 }
      );
    }

    const { data: swap, error: swapError } = await server
      .from('swaps')
      .select('id, status, buyer_profile_id, seller_profile_id')
      .eq('id', swapId)
      .single();

    if (swapError || !swap) {
      return Response.json({ error: 'Swap not found' }, { status: 404 });
    }
    if (swap.status !== 'completed') {
      return Response.json({ error: 'Swap is not completed' }, { status: 400 });
    }

    const isBuyer = swap.buyer_profile_id === raterId;
    const isSeller = swap.seller_profile_id === raterId;
    if (!isBuyer && !isSeller) {
      return Response.json({ error: 'Not a participant' }, { status: 403 });
    }

    const ratedId = isBuyer ? swap.seller_profile_id : swap.buyer_profile_id;

    const { data: existing } = await server
      .from('swap_ratings')
      .select('id')
      .eq('swap_id', swapId)
      .eq('rater_profile_id', raterId)
      .single();

    if (existing) {
      return Response.json({ error: 'Already rated' }, { status: 400 });
    }

    const payload: Record<string, unknown> = {
      swap_id: swapId,
      rater_profile_id: raterId,
      rated_profile_id: ratedId,
      rating,
    };
    if (comment !== null && comment !== '') payload.comment = comment;

    let { error: insertError } = await server.from('swap_ratings').insert(payload);

    if (insertError && /comment|schema cache|column/i.test(insertError.message)) {
      const { comment: _c, ...payloadWithoutComment } = payload;
      insertError = (await server.from('swap_ratings').insert(payloadWithoutComment)).error;
    }

    if (insertError) {
      return Response.json({ error: insertError.message }, { status: 500 });
    }

    const { data: profile } = await server
      .from('profiles')
      .select('rating, rating_count')
      .eq('id', ratedId)
      .single();

    if (profile) {
      const currentRating = Number(profile.rating ?? 0);
      const count = Number(profile.rating_count ?? 0);
      const newCount = count + 1;
      const newRating = (currentRating * count + rating) / newCount;
      await server
        .from('profiles')
        .update({
          rating: Math.round(newRating * 100) / 100,
          rating_count: newCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ratedId);
    }

    return Response.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
