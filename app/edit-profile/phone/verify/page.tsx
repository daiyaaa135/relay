'use client';

import React, { useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

/** Format 10 digits as (XXX) XXX-XXXX */
function formatPhoneDisplay(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 10);
  if (d.length < 10) return d ? `(${d}` : '';
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export default function EditProfilePhoneVerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneParam = searchParams.get('phone') ?? '';
  const digitsOnly = phoneParam.replace(/\D/g, '').slice(0, 10);
  const displayPhone = digitsOnly.length === 10 ? formatPhoneDisplay(digitsOnly) : '';

  const [code, setCode] = useState<string[]>(['', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('sent');
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'verifying' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const codeString = code.join('');
  const canProceed = codeString.length === 4;
  const canUpdate = canProceed && verifyStatus !== 'verifying';

  const handleResendSms = async () => {
    if (digitsOnly.length !== 10) return;
    setSendStatus('sending');
    setErrorMessage(null);
    try {
      const res = await fetch('/api/auth/send-sms-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digitsOnly }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSendStatus('sent');
      } else {
        setSendStatus('error');
        setErrorMessage(data?.error ?? 'Failed to resend');
      }
    } catch {
      setSendStatus('error');
      setErrorMessage('Failed to resend');
    }
  };

  const handleChange = (index: number, value: string) => {
    const char = value.replace(/\D/g, '').slice(-1);
    const next = [...code];
    next[index] = char;
    setCode(next);
    if (char && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4).split('');
    const next = [...code];
    pasted.forEach((char, i) => {
      if (i < 4) next[i] = char;
    });
    setCode(next);
    const focusIdx = Math.min(pasted.length, 3);
    inputRefs.current[focusIdx]?.focus();
  };

  const handleUpdate = async () => {
    if (!canProceed || digitsOnly.length !== 10) return;
    setVerifyStatus('verifying');
    setErrorMessage(null);
    try {
      const res = await fetch('/api/auth/verify-sms-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digitsOnly, code: codeString }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setVerifyStatus('error');
        setErrorMessage(data?.error ?? 'Invalid or expired code');
        return;
      }
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        phone: '+1' + digitsOnly,
      });
      if (updateError) {
        setVerifyStatus('error');
        setErrorMessage(updateError.message ?? 'Could not update phone');
        return;
      }
      router.push('/edit-profile');
      router.refresh();
    } catch {
      setVerifyStatus('error');
      setErrorMessage('Verification failed');
    }
  };

  if (digitsOnly.length !== 10) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-relay-surface-dark px-6">
        <p className="text-relay-muted dark:text-relay-muted-light text-sm mb-4">Invalid phone. Go back and enter a valid number.</p>
        <button
          type="button"
          onClick={() => router.push('/edit-profile/phone')}
          className="text-primary font-semibold text-sm"
        >
          Back to phone number
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-relay-surface-dark transition-colors">
      <header
        className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-relay-border dark:border-relay-border-dark"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="flex size-10 items-center justify-center rounded-full text-relay-muted hover:bg-relay-bg dark:hover:bg-relay-bg-dark transition-colors"
          aria-label="Back"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-lg font-semibold text-relay-text dark:text-relay-text-dark">Account</h1>
        <button
          type="button"
          onClick={handleUpdate}
          disabled={!canUpdate}
          className="text-primary font-semibold text-xs tracking-tight disabled:opacity-40"
        >
          {verifyStatus === 'verifying' ? 'Verifying…' : 'Update'}
        </button>
      </header>

      <main className="flex-1 flex flex-col px-6 pt-8 pb-8">
        <h2 className="text-sm font-semibold text-relay-text dark:text-relay-text-dark tracking-tight mb-2">
          Enter the 4-digit code sent via SMS at {displayPhone}.
        </h2>
        <Link
          href="/edit-profile/phone"
          className="text-[10px] text-relay-muted dark:text-relay-muted-light underline mb-4 inline-block"
        >
          Changed your mobile number?
        </Link>

        {errorMessage && (
          <p className="text-xs text-red-600 dark:text-red-400 mb-4" role="alert">
            {errorMessage}
          </p>
        )}

        {sendStatus === 'sending' && (
          <p className="text-[10px] text-relay-muted dark:text-relay-muted-light mb-4">Sending code…</p>
        )}

        <div className="flex gap-3 mb-6" onPaste={handlePaste}>
          {code.map((digit, i) => (
            <div
              key={i}
              className="auth-input-card flex h-12 w-14 flex-1 items-center justify-center rounded-xl border border-relay-border dark:border-relay-border-dark bg-relay-bg dark:bg-relay-bg-dark"
            >
              <input
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-full h-full bg-transparent text-relay-text dark:text-relay-text-dark text-center text-xs font-medium tracking-tighter focus:outline-none focus:ring-0"
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleResendSms}
          disabled={sendStatus === 'sending'}
          className="text-[10px] text-relay-muted dark:text-relay-muted-light underline mb-10 disabled:opacity-50"
        >
          Resend code via SMS
        </button>
      </main>
    </div>
  );
}
