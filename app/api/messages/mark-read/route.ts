import { NextRequest } from 'next/server';
import { createAnonClient, createServerClient } from '@/lib/supabase-server';

/**
 * POST /api/messages/mark-read
 * Mark messages in a conversation as read for the current user.
 * Body: { conversationId: string; messageIds: string[] }
 * Only messages sent TO the user (sender_profile_id !== user) are updated.
 */
export async function POST(request: NextRequest) {
  try {
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

    let body: { conversationId?: string; messageIds?: string[] };
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { conversationId, messageIds } = body;
    if (!conversationId || !Array.isArray(messageIds) || messageIds.length === 0) {
      return Response.json({ error: 'conversationId and non-empty messageIds required' }, { status: 400 });
    }

    const { data: conv, error: convError } = await server
      .from('conversations')
      .select('id, buyer_profile_id, seller_profile_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conv) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const isParticipant =
      conv.buyer_profile_id === profileId || conv.seller_profile_id === profileId;
    if (!isParticipant) {
      return Response.json({ error: 'Not a participant' }, { status: 403 });
    }

    const { error: updateError } = await server
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .in('id', messageIds)
      .neq('sender_profile_id', profileId);

    if (updateError) {
      return Response.json(
        { error: updateError.message, code: (updateError as { code?: string }).code },
        { status: 500 }
      );
    }

    return Response.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
