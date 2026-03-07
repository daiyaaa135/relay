import { NextRequest } from 'next/server';
import { createAnonClient, createServerClient } from '@/lib/supabase-server';

/**
 * PATCH /api/swaps/[id]/location
 * Set or clear the current user's live pickup location for the swap.
 * Body: { lat: number; lon: number } to set, or {} / { lat: null, lon: null } to clear.
 * Only the caller's role (buyer or seller) columns are updated.
 */
export async function PATCH(
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

    let profileId: string;
    try {
      const anon = createAnonClient(token);
      const { data: { user }, error } = await anon.auth.getUser(token);
      if (error || !user?.id) {
        return Response.json({ error: 'Invalid or expired token' }, { status: 401 });
      }
      profileId = user.id;
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
      .select('id, buyer_profile_id, seller_profile_id')
      .eq('id', swapId)
      .single();

    if (swapError || !swap) {
      return Response.json({ error: 'Swap not found' }, { status: 404 });
    }

    const isBuyer = swap.buyer_profile_id === profileId;
    const isSeller = swap.seller_profile_id === profileId;
    if (!isBuyer && !isSeller) {
      return Response.json({ error: 'Not a participant' }, { status: 403 });
    }

    let body: { lat?: number | null; lon?: number | null };
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const lat = body.lat;
    const lon = body.lon;
    const shouldSet = typeof lat === 'number' && typeof lon === 'number';

    if (isBuyer) {
      const payload = shouldSet
        ? { buyer_lat: lat, buyer_lon: lon, buyer_location_at: new Date().toISOString() }
        : { buyer_lat: null, buyer_lon: null, buyer_location_at: null };
      const { data, error } = await server
        .from('swaps')
        .update(payload)
        .eq('id', swapId)
        .select('buyer_lat, buyer_lon, buyer_location_at, seller_lat, seller_lon, seller_location_at')
        .single();
      if (error) {
        const msg = String(error.message ?? error);
        return Response.json({ error: msg, code: (error as { code?: string }).code }, { status: 500 });
      }
      return Response.json(data);
    }

    const payload = shouldSet
      ? { seller_lat: lat, seller_lon: lon, seller_location_at: new Date().toISOString() }
      : { seller_lat: null, seller_lon: null, seller_location_at: null };
    const { data, error } = await server
      .from('swaps')
      .update(payload)
      .eq('id', swapId)
      .select('buyer_lat, buyer_lon, buyer_location_at, seller_lat, seller_lon, seller_location_at')
      .single();
    if (error) {
      const msg = String(error.message ?? error);
      return Response.json({ error: msg, code: (error as { code?: string }).code }, { status: 500 });
    }
    return Response.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
