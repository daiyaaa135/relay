import { NextRequest } from 'next/server';
import twilio from 'twilio';

/**
 * POST /api/auth/verify-sms-code
 * Verifies the 4-digit code with Twilio Verify.
 * Body: { phone: string, code: string }
 * Requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID.
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
    const body = await request.json();
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

    if (verification.status === 'approved') {
      return Response.json({ ok: true });
    }
    return Response.json({ error: 'Invalid or expired code' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Verification failed';
    return Response.json({ error: message }, { status: 400 });
  }
}
