import { NextRequest } from 'next/server';
import { createAnonClient, createServerClient } from '@/lib/supabase-server';

/**
 * POST /api/conversations/get-or-create
 * Get or create a conversation (message thread) between the authenticated user (buyer) and seller for a gadget.
 * Does not create a swap. Body: { gadgetId: string; sellerProfileId: string }
 * Returns: { conversationId } or { error }.
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
    const { gadgetId, sellerProfileId } = body as { gadgetId?: string; sellerProfileId?: string };

    if (!gadgetId || !sellerProfileId) {
      return Response.json({ error: 'Missing gadgetId or sellerProfileId' }, { status: 400 });
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
    const { data: existing, error: queryError } = await server
      .from('conversations')
      .select('id')
      .eq('gadget_id', gadgetId)
      .eq('buyer_profile_id', buyerProfileId)
      .eq('seller_profile_id', sellerProfileId)
      .limit(1)
      .maybeSingle();

    if (queryError) {
      const raw = queryError.message ?? 'Failed to load conversation';
      const isMissingTable = /conversations.*schema cache|relation.*conversations.*does not exist/i.test(raw);
      return Response.json(
        {
          error: isMissingTable
            ? 'Conversations table is missing. Run Supabase migrations (e.g. npx supabase db push or run supabase/migrations/20260228110000_conversations_and_messages.sql in the SQL editor).'
            : raw,
        },
        { status: 500 }
      );
    }
    if (existing?.id) {
      return Response.json({ conversationId: existing.id });
    }

    const { data: inserted, error } = await server
      .from('conversations')
      .insert({
        gadget_id: gadgetId,
        buyer_profile_id: buyerProfileId,
        seller_profile_id: sellerProfileId,
      })
      .select('id')
      .single();

    if (error || !inserted?.id) {
      const raw = error?.message ?? 'Failed to start conversation';
      const isMissingTable = /conversations.*schema cache|relation.*conversations.*does not exist/i.test(raw);
      return Response.json(
        {
          error: isMissingTable
            ? 'Conversations table is missing. Run Supabase migrations (e.g. npx supabase db push or run supabase/migrations/20260228110000_conversations_and_messages.sql in the SQL editor).'
            : raw,
        },
        { status: 500 }
      );
    }

    return Response.json({ conversationId: inserted.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isMissingTable = /conversations.*schema cache|relation.*conversations.*does not exist/i.test(msg);
    return Response.json(
      {
        error: isMissingTable
          ? 'Conversations table is missing. Run Supabase migrations (e.g. npx supabase db push or run supabase/migrations/20260228110000_conversations_and_messages.sql in the SQL editor).'
          : msg,
      },
      { status: 500 }
    );
  }
}
