'use client';

export const dynamic = 'force-dynamic';

import React, { Suspense, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { ChevronIcon } from '@/app/components/ChevronIcon';

function sanitizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function EditProfileEmailVerifyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') ?? '';
  const email = sanitizeEmail(emailParam ? decodeURIComponent(emailParam) : '');

  const [code, setCode] = useState<string[]>(['', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('sent');
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'verifying' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const codeString = code.join('');
  const canProceed = codeString.length === 4;
  const canUpdate = canProceed && verifyStatus !== 'verifying';

  const handleResend = async () => {
    if (!email) return;
    setSendStatus('sending');
    setErrorMessage(null);
    try {
      const res = await fetch('/api/auth/send-email-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
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
    if (!email || !canProceed) return;
    setVerifyStatus('verifying');
    setErrorMessage(null);
    try {
      const verifyRes = await fetch('/api/auth/verify-email-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, code: codeString }),
      });
      const verifyData = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok || !verifyData?.ok) {
        setVerifyStatus('error');
        setErrorMessage(verifyData?.error ?? 'Invalid or expired code');
        return;
      }

      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ email });
      if (updateError) {
        setVerifyStatus('error');
        setErrorMessage(updateError.message ?? 'Failed to update email');
        return;
      }

      router.push('/edit-profile');
      router.refresh();
    } catch {
      setVerifyStatus('error');
      setErrorMessage('Verification failed');
    }
  };

  if (!email) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-relay-surface-dark px-6">
        <p className="text-relay-muted dark:text-relay-muted-light text-sm mb-4">Missing email. Go back and enter a valid email.</p>
        <button
          type="button"
          onClick={() => router.push('/edit-profile/email')}
          className="text-primary font-semibold text-sm"
        >
          Back to email
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-relay-surface-dark transition-colors">
      <header
        className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-relay-border dark:border-relay-border-dark pt-safe-1"
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="flex size-10 items-center justify-center rounded-full bg-relay-surface dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark shadow-sm active-scale"
          aria-label="Back"
        >
          <ChevronIcon direction="left" className="size-6" />
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
          Enter the 4-digit code sent to you at
        </h2>
        <p className="text-sm font-semibold text-relay-text dark:text-relay-text-dark mb-6 break-all">
          {email}
        </p>

        {errorMessage && (
          <p className="text-xs text-red-600 dark:text-red-400 mb-4" role="alert">
            {errorMessage}
          </p>
        )}

        <div className="flex gap-3 mb-4" onPaste={handlePaste}>
          {code.map((digit, i) => (
            <div
              key={i}
              className="auth-input-card flex h-12 w-14 items-center justify-center rounded-xl border border-relay-border dark:border-relay-border-dark bg-relay-bg dark:bg-relay-bg-dark"
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
                autoFocus={i === 0}
              />
            </div>
          ))}
        </div>

        <p className="text-[10px] text-relay-muted dark:text-relay-muted-light mb-6">
          Tip: Make sure to check your inbox and spam folders
        </p>

        <button
          type="button"
          onClick={handleResend}
          disabled={sendStatus === 'sending'}
          className="h-12 w-full rounded-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-relay-surface-dark text-xs font-medium text-neutral-900 dark:text-relay-text-dark tracking-tight mb-10 self-start max-w-[140px] disabled:opacity-60"
        >
          {sendStatus === 'sending' ? 'Sending…' : 'Resend'}
        </button>
      </main>
    </div>
  );
}

export default function EditProfileEmailVerifyPage() {
  return (
    <Suspense>
      <EditProfileEmailVerifyPageContent />
    </Suspense>
  );
}
