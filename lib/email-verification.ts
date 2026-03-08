/**
 * Email verification module using:
 *  - passwordless-memorystore (https://github.com/florianheinemann/passwordless) for token storage
 *  - emailjs (https://github.com/eleith/emailjs) for SMTP email delivery
 *
 * The passwordless MemoryStore secures tokens via bcrypt hashing and enforces TTL.
 * Replace MemoryStore with a Redis/Mongo store for multi-instance production deployments.
 */

import crypto from 'crypto';
import { SMTPClient } from 'emailjs';

// passwordless-memorystore: implements the passwordless TokenStore interface
// storeOrUpdate(token, uid, msToLive, originUrl, cb)
// authenticate(token, uid, cb(err, valid, referrer))
// invalidateUser(uid, cb)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const MemoryStore = require('passwordless-memorystore');

interface PasswordlessStore {
  storeOrUpdate(
    token: string,
    uid: string,
    msToLive: number,
    originUrl: string | null,
    cb: (err: Error | null) => void
  ): void;
  authenticate(
    token: string,
    uid: string,
    cb: (err: Error | null, valid: boolean, referrer: string | null) => void
  ): void;
  invalidateUser(uid: string, cb: (err: Error | null) => void): void;
}

// Persist the store on the Node.js global object so it survives Next.js
// hot module reloads in development (otherwise codes are wiped on every save).
// In serverless/edge production, replace with a Redis or Mongo store.
const _g = global as typeof global & { _relayTokenStore?: PasswordlessStore };
if (!_g._relayTokenStore) _g._relayTokenStore = new MemoryStore();
const tokenStore: PasswordlessStore = _g._relayTokenStore;

/** Generate a random 4-digit code, zero-padded. */
function generate4DigitCode(): string {
  return String(crypto.randomInt(0, 10000)).padStart(4, '0');
}

/** Build an SMTPClient from environment variables.
 *  ssl=true  → implicit SSL/TLS on port 465
 *  ssl=false → STARTTLS on port 587 (tls: true required by emailjs)
 */
function createSmtpClient(): SMTPClient {
  const ssl = process.env.SMTP_SSL === 'true';
  const port = Number(process.env.SMTP_PORT ?? (ssl ? 465 : 587));
  return new SMTPClient({
    user: process.env.SMTP_USER ?? '',
    password: process.env.SMTP_PASSWORD ?? '',
    host: process.env.SMTP_HOST ?? '',
    ssl,
    tls: !ssl, // enable STARTTLS when not using implicit SSL
    port,
    timeout: 20000, // Outlook STARTTLS handshake needs more than the 5s default
  });
}

/**
 * Passwordless-style delivery function using emailjs.
 * Called with the token to send, user ID, and recipient address.
 */
async function deliverCode(code: string, recipient: string): Promise<void> {
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? '';
  const client = createSmtpClient();
  await client.sendAsync({
    text: [
      `Your Rellaey verification code is: ${code}`,
      '',
      'This code expires in 10 minutes.',
      'If you did not request this, you can safely ignore this email.',
    ].join('\n'),
    from,
    to: recipient,
    subject: 'Your Rellaey verification code',
  });
}

/**
 * Generates a 4-digit code, stores it in the passwordless MemoryStore,
 * and delivers it to the given email via emailjs.
 *
 * The MemoryStore bcrypt-hashes the token before persisting it,
 * so the raw code is never stored on disk or in memory after this call.
 */
export async function sendVerificationCode(email: string): Promise<void> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    throw new Error(
      'Email not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM in .env.local.'
    );
  }

  const code = generate4DigitCode();
  const ttl = 10 * 60 * 1000; // 10 minutes in ms

  // Store token using passwordless MemoryStore (bcrypt-hashed, TTL-enforced)
  await new Promise<void>((resolve, reject) => {
    tokenStore.storeOrUpdate(code, email, ttl, null, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // Deliver the code via emailjs (passwordless delivery function)
  await deliverCode(code, email);
}

/**
 * Verifies a 4-digit code against the passwordless MemoryStore.
 * Returns true on success and invalidates the token so it cannot be reused.
 */
export async function verifyCode(email: string, code: string): Promise<boolean> {
  const valid = await new Promise<boolean>((resolve, reject) => {
    tokenStore.authenticate(code, email, (err, isValid) => {
      if (err) reject(err);
      else resolve(isValid);
    });
  });

  if (valid) {
    // Invalidate — one-time use (core passwordless guarantee)
    await new Promise<void>((resolve) => {
      tokenStore.invalidateUser(email, () => resolve());
    });
  }

  return valid;
}
