'use client';

export const dynamic = 'force-dynamic';

import React, { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function EmailPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneParam = searchParams.get('phone') ?? '';

  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Duplicate check
  const [checkStatus, setCheckStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmed = email.trim();
  const isValidFormat = EMAIL_REGEX.test(trimmed);
  const canProceed = isValidFormat && checkStatus === 'available' && !sending;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!isValidFormat) { setCheckStatus('idle'); return; }
    setCheckStatus('checking');
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(trimmed)}`);
        const data = await res.json().catch(() => ({}));
        setCheckStatus(data?.available ? 'available' : 'taken');
      } catch {
        setCheckStatus('idle');
      }
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed]);

  const handleNext = async () => {
    if (!canProceed) return;
    setSendError(null);
    setSending(true);
    try {
      const res = await fetch('/api/auth/send-email-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setSendError(data?.error ?? 'Failed to send code'); return; }
      const params = new URLSearchParams();
      params.set('email', trimmed);
      if (phoneParam) params.set('phone', phoneParam);
      router.push(`/signup/verify-email?${params.toString()}`);
    } catch {
      setSendError('Failed to send code');
    } finally {
      setSending(false);
    }
  };

  const handleBack = () => {
    if (phoneParam) {
      router.push(`/signup/verify-sms?phone=${encodeURIComponent(phoneParam)}`);
    } else {
      router.back();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-relay-bg-dark transition-colors">
      <main className="flex-1 flex flex-col px-6 pt-8 pb-8">
        <h1 className="text-sm font-semibold text-relay-text dark:text-relay-text-dark tracking-tight mb-6">
          What&apos;s your email address?
        </h1>

        <div className="mb-10">
          <label htmlFor="email" className="block text-[10px] text-relay-muted mb-2 uppercase tracking-tight">
            Email
          </label>
          <div className="group relative">
            <div className="flex h-12 items-center bg-relay-bg dark:bg-relay-bg-dark rounded-xl px-4 border border-relay-border dark:border-relay-border-dark group-focus-within:border-primary/80 transition-colors auth-input-card">
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setSendError(null); }}
                placeholder="name@example.com"
                className="block w-full py-2 bg-transparent text-relay-text dark:text-relay-text-dark placeholder-relay-muted focus:ring-0 focus:outline-none text-xs font-medium tracking-tighter"
              />
            </div>
            {isValidFormat && checkStatus === 'checking' && (
              <p className="text-[10px] text-relay-muted mt-2">Checking…</p>
            )}
            {checkStatus === 'taken' && (
              <p className="text-[10px] text-red-600 dark:text-red-400 mt-2">
                This email is already linked to an account.
              </p>
            )}
            {checkStatus === 'available' && (
              <p className="text-[10px] text-green-600 dark:text-green-400 mt-2">Email available</p>
            )}
            {sendError && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-2" role="alert">{sendError}</p>
            )}
          </div>
        </div>

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
            <span>{sending ? 'Sending…' : 'Next'}</span>
            {!sending && <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
          </button>
        </div>
      </main>
    </div>
  );
}

export default function EmailPage() {
  return (
    <Suspense>
      <EmailPageContent />
    </Suspense>
  );
}
