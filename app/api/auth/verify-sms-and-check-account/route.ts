import { NextRequest } from 'next/server';
import twilio from 'twilio';
import { createServerClient } from '@/lib/supabase-server';

/**
 * POST /api/auth/verify-sms-and-check-account
 * 1) Verifies the SMS code with Twilio.
 * 2) If valid, checks whether this phone is already linked to an account.
 * 3) If existing account with email: returns a magic link to sign the user in and redirect to home.
 * 4) If existing account without email: returns existingAccount true (client can redirect to login).
 * 5) If no existing account: returns existingAccount false so client continues to signup/email.
 * Body: { phone: string, code: string }
 */
export async function POST(request: NextRequest) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !verifyServiceSid) {
    return Response.json(
      { error: 'SMS verification not configured.' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    let phone = typeof body?.phone === 'string' ? body.phone.replace(/\D/g, '') : '';
    if (phone.length === 10) {
      phone = '+1' + phone;
    } else if (!phone.startsWith('+')) {
      return Response.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    const code = typeof body?.code === 'string' ? body.code.replace(/\D/g, '').slice(0, 6) : '';
    if (!code) {
      return Response.json({ error: 'Code required' }, { status: 400 });
    }

    const client = twilio(accountSid, authToken);
    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({
        to: phone,
        code,
      });

    if (verification.status !== 'approved') {
      return Response.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    const admin = createServerClient();
    if (!admin) {
      return Response.json(
        { ok: true, existingAccount: false },
        { status: 200 }
      );
    }

    const norm = (p: string) => p.replace(/\D/g, '').slice(-10);
    const phoneNorm = norm(phone);

    // Paginate through all auth users to find matching phone.
    // TODO: store phone in profiles table and index it to avoid O(N) scan.
    let existingUser: Awaited<ReturnType<typeof admin.auth.admin.listUsers>>['data']['users'][number] | undefined;
    let page = 1;
    const PAGE_SIZE = 1000;
    while (!existingUser) {
      const { data: listData } = await admin.auth.admin.listUsers({ perPage: PAGE_SIZE, page });
      const users = listData?.users ?? [];
      existingUser = users.find((u) => norm(u.phone ?? '') === phoneNorm);
      if (users.length < PAGE_SIZE) break;
      page++;
    }

    if (!existingUser) {
      return Response.json({ ok: true, existingAccount: false });
    }

    const email = (existingUser.email ?? '').trim().toLowerCase();
    if (email) {
      const origin = request.nextUrl.origin ?? '';
      const redirectTo = origin ? `${origin}/` : undefined;
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: redirectTo ? { redirectTo } : undefined,
      });
      if (!linkError && linkData?.properties?.action_link) {
        return Response.json({
          ok: true,
          existingAccount: true,
          signInLink: linkData.properties.action_link,
        });
      }
    }

    return Response.json({
      ok: true,
      existingAccount: true,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Verification failed';
    return Response.json({ error: message }, { status: 400 });
  }
}
