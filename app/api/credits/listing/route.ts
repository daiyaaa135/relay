import { NextRequest } from 'next/server';
import { createServerClient, createAnonClient } from '@/lib/supabase-server';

/**
 * POST /api/credits/listing
 * Credit the seller when their listing goes live. Called by the client after createGadget succeeds.
 * Body: { gadgetId: string, credits: number }
 * Requires Authorization: Bearer <access_token>.
 * Uses service role so transaction insert and profile update are not blocked by RLS.
 */
export async function POST(request: NextRequest) {
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

  let body: { gadgetId?: string; credits?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { gadgetId, credits } = body;
  if (!gadgetId || typeof credits !== 'number' || credits <= 0) {
    return Response.json({ error: 'Missing gadgetId or invalid credits' }, { status: 400 });
  }

  const server = createServerClient();
  if (!server) {
    return Response.json(
      { error: 'Server configuration error. Add SUPABASE_SERVICE_ROLE_KEY to .env.local.' },
      { status: 503 }
    );
  }

  const { data: gadget, error: gadgetError } = await server
    .from('gadgets')
    .select('profile_id, name')
    .eq('id', gadgetId)
    .single();

  if (gadgetError || !gadget) {
    return Response.json({ error: 'Listing not found' }, { status: 404 });
  }
  const g = gadget as { profile_id?: string; name?: string };
  if (g.profile_id !== profileId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const itemName = (g.name ?? '').trim() || 'Listing';
  const { error: txError } = await server.from('transactions').insert({
    profile_id: profileId,
    amount: credits,
    type: 'listing_credit',
    description: itemName,
    reference_id: gadgetId,
  });
  if (txError) {
    console.error('[api/credits/listing] transaction insert failed:', txError.message);
    return Response.json({ error: 'Failed to record credit' }, { status: 500 });
  }

  const { data: profileRow } = await server.from('profiles').select('credits_balance').eq('id', profileId).single();
  const currentBalance = profileRow?.credits_balance != null ? Number(profileRow.credits_balance) : 0;
  const { error: balanceError } = await server
    .from('profiles')
    .update({ credits_balance: currentBalance + credits })
    .eq('id', profileId);
  if (balanceError) {
    console.error('[api/credits/listing] credits_balance update failed:', balanceError.message);
    return Response.json({ error: 'Failed to update balance' }, { status: 500 });
  }

  return Response.json({ ok: true });
}
