import { NextRequest, NextResponse } from 'next/server';
import { createAnonClient, createServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const anonClient = createAnonClient(token);
  const { data: { user }, error } = await anonClient.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { pushToken: string; platform: string };
  const { pushToken, platform } = body;
  if (!pushToken || !platform) {
    return NextResponse.json({ error: 'pushToken and platform required' }, { status: 400 });
  }

  const db = createServerClient();
  if (!db) return NextResponse.json({ error: 'Server config error' }, { status: 500 });

  const { error: upsertError } = await db
    .from('device_push_tokens')
    .upsert(
      { profile_id: user.id, token: pushToken, platform, updated_at: new Date().toISOString() },
      { onConflict: 'profile_id,token' }
    );

  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
