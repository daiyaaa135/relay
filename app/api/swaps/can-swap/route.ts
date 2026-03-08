import { NextRequest } from 'next/server';
import { createAnonClient, createServerClient } from '@/lib/supabase-server';

/**
 * GET /api/swaps/can-swap?buyerId=...&sellerId=...
 * Check whether a swap can be initiated between buyer and seller.
 * Returns { ok: true } or { ok: false, reason: string }.
 * Uses service role to check blocks in both directions.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const anon = createAnonClient(token);
    const { data: { user }, error: authError } = await anon.auth.getUser(token);
    if (authError || !user?.id) return Response.json({ error: 'Invalid token' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const buyerId = searchParams.get('buyerId');
    const sellerId = searchParams.get('sellerId');

    if (!buyerId || !sellerId) return Response.json({ error: 'Missing params' }, { status: 400 });
    if (buyerId !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const server = createServerClient();
    if (!server) return Response.json({ ok: false, reason: 'Server error' }, { status: 503 });

    // Check both block directions
    const { data: blocks } = await server
      .from('profile_blocks')
      .select('blocker_id, blocked_id')
      .or(`and(blocker_id.eq.${buyerId},blocked_id.eq.${sellerId}),and(blocker_id.eq.${sellerId},blocked_id.eq.${buyerId})`);

    if (blocks && blocks.length > 0) {
      const buyerBlockedSeller = blocks.some((b) => b.blocker_id === buyerId);
      return Response.json({
        ok: false,
        reason: buyerBlockedSeller
          ? "You've blocked this user."
          : "This user is not available for swaps.",
      });
    }

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
