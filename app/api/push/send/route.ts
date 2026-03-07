import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { getFirebaseMessaging } from '@/lib/firebase-admin';

// Supabase Database Webhook payload on messages INSERT
interface WebhookPayload {
  type: 'INSERT';
  table: string;
  record: {
    id: string;
    conversation_id: string;
    sender_profile_id: string;
    content: string;
    created_at: string;
  };
  schema: string;
}

export async function POST(req: NextRequest) {
  // Verify the webhook secret to ensure this is called by Supabase only
  const secret = req.headers.get('x-webhook-secret');
  if (secret !== process.env.PUSH_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await req.json() as WebhookPayload;
  if (payload.type !== 'INSERT' || payload.table !== 'messages') {
    return NextResponse.json({ ok: true });
  }

  const { conversation_id, sender_profile_id, content } = payload.record;

  const db = createServerClient();
  if (!db) return NextResponse.json({ error: 'Server config error' }, { status: 500 });

  // Get the conversation participants
  const { data: conversation } = await db
    .from('conversations')
    .select('buyer_profile_id, seller_profile_id')
    .eq('id', conversation_id)
    .single();

  if (!conversation) return NextResponse.json({ ok: true });

  // The recipient is whoever is NOT the sender
  const recipientId =
    conversation.buyer_profile_id === sender_profile_id
      ? conversation.seller_profile_id
      : conversation.buyer_profile_id;

  // Check notification preferences
  const { data: profile } = await db
    .from('profiles')
    .select('notify_messages, display_name')
    .eq('id', recipientId)
    .single();

  if (!profile?.notify_messages) return NextResponse.json({ ok: true });

  // Get sender's display name for the notification title
  const { data: sender } = await db
    .from('profiles')
    .select('display_name')
    .eq('id', sender_profile_id)
    .single();

  // Get recipient's push tokens
  const { data: tokens } = await db
    .from('device_push_tokens')
    .select('token, platform')
    .eq('profile_id', recipientId);

  if (!tokens?.length) return NextResponse.json({ ok: true });

  // Build notification body (strip system message JSON, truncate long messages)
  let body = content;
  try {
    const parsed = JSON.parse(content) as { _type?: string };
    if (parsed._type === 'pickup_proposal') body = 'Proposed a pickup time';
    else if (parsed._type === 'pickup_accepted') body = 'Accepted the pickup time';
    else if (parsed._type === 'swap_cancelled') body = 'Cancelled the swap';
    else body = content;
  } catch {
    // plain text message
  }
  if (body.length > 100) body = body.slice(0, 97) + '…';

  const title = sender?.display_name ?? 'New message';
  const deepLink = `/messages/${conversation_id}`;

  const messaging = getFirebaseMessaging();

  // Send to all device tokens; collect failed ones for cleanup
  const failedTokens: string[] = [];

  await Promise.all(
    tokens.map(async ({ token }) => {
      try {
        await messaging.send({
          token,
          notification: { title, body },
          data: { url: deepLink },
          apns: {
            payload: { aps: { badge: 1, sound: 'default' } },
          },
          android: {
            notification: { sound: 'default', channelId: 'messages' },
          },
        });
      } catch (err: unknown) {
        const code = (err as { errorInfo?: { code?: string } })?.errorInfo?.code ?? '';
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        ) {
          failedTokens.push(token);
        }
      }
    })
  );

  // Remove stale tokens
  if (failedTokens.length > 0) {
    await db
      .from('device_push_tokens')
      .delete()
      .in('token', failedTokens);
  }

  return NextResponse.json({ ok: true });
}
