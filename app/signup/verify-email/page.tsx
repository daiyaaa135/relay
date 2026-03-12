'use client';

import React, { useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') ?? '';
  const phoneParam = searchParams.get('phone') ?? '';
  const email = emailParam ? decodeURIComponent(emailParam).trim().toLowerCase() : '';

  const [code, setCode] = useState<string[]>(['', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'error'>('idle');
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'verifying' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const codeString = code.join('');
  const canProceed = codeString.length === 4 && verifyStatus !== 'verifying';

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

  const handleResend = async () => {
    if (!email) return;
    setSendStatus('sending');
    setErrorMessage(null);
    try {
      const res = await fetch('/api/auth/send-email-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSendStatus('error');
        setErrorMessage(data?.error ?? 'Failed to resend');
      } else {
        setSendStatus('idle');
      }
    } catch {
      setSendStatus('error');
      setErrorMessage('Failed to resend');
    }
  };

  const handleNext = async () => {
    if (!canProceed || !email) return;
    setVerifyStatus('verifying');
    setErrorMessage(null);
    try {
      const res = await fetch('/api/auth/verify-email-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: codeString }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setVerifyStatus('error');
        setErrorMessage(data?.error ?? 'Invalid or expired code');
        return;
      }
      const params = new URLSearchParams();
      if (emailParam) params.set('email', emailParam);
      if (phoneParam) params.set('phone', phoneParam);
      const query = params.toString();
      router.push(query ? `/signup/password?${query}` : '/signup/password');
    } catch {
      setVerifyStatus('error');
      setErrorMessage('Verification failed');
    }
  };

  const handleBack = () => {
    if (phoneParam) {
      router.push(`/signup/email?phone=${encodeURIComponent(phoneParam)}`);
    } else {
      router.back();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-relay-bg-dark transition-colors">
      <main className="flex-1 flex flex-col px-6 pt-6 pb-8">
        <h1 className="text-sm font-semibold text-relay-text dark:text-relay-text-dark tracking-tight mb-2">
          Enter the 4-digit code sent to you at:
        </h1>
        <p className="text-sm font-semibold text-relay-text dark:text-relay-text-dark mb-6">
          {email}
        </p>

        {errorMessage && (
          <p className="text-xs text-red-600 dark:text-red-400 mb-4" role="alert">{errorMessage}</p>
        )}

        <div className="flex gap-3 mb-4" onPaste={handlePaste}>
          {code.map((digit, i) => (
            <div key={i} className="auth-input-card flex h-12 w-14 items-center justify-center rounded-xl border border-relay-border dark:border-relay-border-dark bg-relay-bg dark:bg-relay-bg-dark">
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

        <p className="text-[10px] text-relay-muted mb-6">
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

        {/* Bottom nav */}
        <div className="mt-auto flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center justify-center size-12 rounded-full bg-relay-surface/50 dark:bg-relay-surface-dark/50 backdrop-blur-xl border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark"
            aria-label="Back"
          >
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed}
            className="inline-flex items-center justify-end gap-2 text-primary font-semibold text-xs tracking-tight disabled:opacity-50"
          >
            <span>{verifyStatus === 'verifying' ? 'Verifying…' : 'Next'}</span>
            {verifyStatus !== 'verifying' && <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
          </button>
        </div>
      </main>
    </div>
  );
}
