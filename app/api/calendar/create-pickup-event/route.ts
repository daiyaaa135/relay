import { NextRequest } from 'next/server';
import { createAnonClient, createServerClient } from '@/lib/supabase-server';
import { refreshAccessToken } from '@/lib/googleCalendar';

type PickupSlot = { date: string; start: string; end: string };

/**
 * POST /api/calendar/create-pickup-event
 * Creates a Google Calendar event for a confirmed pickup time on the seller's calendar.
 * Body: { swapId: string, slot: { date: string, start: string, end: string } }
 * Caller must be the seller for the swap.
 */
export async function POST(request: NextRequest) {
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

  let body: { swapId?: string; slot?: PickupSlot };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { swapId, slot } = body;
  if (!swapId || !slot?.date || !slot.start || !slot.end) {
    return Response.json({ error: 'Missing swapId or slot' }, { status: 400 });
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
    .select('id, seller_profile_id, gadget_id')
    .eq('id', swapId)
    .single();

  if (swapError || !swap) {
    return Response.json({ error: 'Swap not found' }, { status: 404 });
  }

  if (swap.seller_profile_id !== callerId) {
    return Response.json({ error: 'Only the seller can create pickup events' }, { status: 403 });
  }

  let itemName = 'ReLay pickup';
  if (swap.gadget_id) {
    const { data: gadget } = await server
      .from('gadgets')
      .select('name')
      .eq('id', swap.gadget_id)
      .single();
    if (gadget?.name) itemName = `Pickup – ${(gadget as { name: string }).name.trim()}`;
  }

  const tokenResult = await refreshAccessToken(callerId);
  if ('error' in tokenResult) {
    if (tokenResult.error === 'not_connected') {
      // Calendar not connected; treat as no-op so swap flow still succeeds
      return Response.json({ ok: true, skipped: 'not_connected' });
    }
    return Response.json({ error: 'Failed to get calendar access token' }, { status: 500 });
  }

  const startDateTime = `${slot.date}T${slot.start}:00`;
  const endDateTime = `${slot.date}T${slot.end}:00`;

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenResult.accessToken}`,
    },
    body: JSON.stringify({
      summary: itemName,
      start: { dateTime: startDateTime },
      end: { dateTime: endDateTime },
    }),
  });

  if (!res.ok) {
    return Response.json({ error: 'event_create_failed' }, { status: 500 });
  }

  return Response.json({ ok: true });
}

