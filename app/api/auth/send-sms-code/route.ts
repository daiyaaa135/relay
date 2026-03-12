import { NextRequest } from 'next/server';
import twilio from 'twilio';

/**
 * POST /api/auth/send-sms-code
 * Sends a 4-digit verification code via Twilio Verify to the given phone (E.164).
 * Body: { phone: string } — 10-digit US number or E.164 (e.g. "+12025551234").
 * Requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID.
 * Create a Verify Service at https://console.twilio.com/us1/develop/verify/services
 */
export async function POST(request: NextRequest) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !verifyServiceSid) {
    return Response.json(
      { error: 'SMS verification not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID in .env.local.' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    let phone = typeof body?.phone === 'string' ? body.phone.replace(/\D/g, '') : '';
    if (phone.length === 10) {
      phone = '+1' + phone;
    } else if (!phone.startsWith('+') || phone.length < 10) {
      return Response.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    const client = twilio(accountSid, authToken);
    await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({
        to: phone,
        channel: 'sms',
      });

    return Response.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send code';
    return Response.json({ error: message }, { status: 500 });
  }
}
