'use client';

export const dynamic = 'force-dynamic';

import React, { Suspense }, { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

/** Format 10 digits as (XXX) XXX-XXXX */
function formatPhoneDisplay(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 10);
  if (d.length < 10) return d ? `(${d}` : '';
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function VerifySmsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneParam = searchParams.get('phone') ?? '';
  const digitsOnly = phoneParam.replace(/\D/g, '').slice(0, 10);
  const displayPhone = digitsOnly.length === 10 ? formatPhoneDisplay(digitsOnly) : '(929) 203-3520';

  const [code, setCode] = useState<string[]>(['', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'verifying' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const sentOnce = useRef(false);

  const codeString = code.join('');
  const canProceed = codeString.length === 4;

  useEffect(() => {
    if (digitsOnly.length !== 10) return;
    // User already passed verification for this phone and navigated back — don't send again
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('phone_verified') === digitsOnly) {
      sentOnce.current = true;
      setSendStatus('sent');
      return;
    }
    if (sentOnce.current) return;
    sentOnce.current = true;
    setSendStatus('sending');
    setErrorMessage(null);
    fetch('/api/auth/send-sms-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: digitsOnly }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setSendStatus('sent');
        } else {
          setSendStatus('error');
          setErrorMessage(data?.error ?? 'Failed to send code');
        }
      })
      .catch(() => {
        setSendStatus('error');
        setErrorMessage('Failed to send code');
      });
  }, [digitsOnly]);

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

  const handleNext = async () => {
    if (!canProceed) return;
    setVerifyStatus('verifying');
    setErrorMessage(null);
    try {
      const res = await fetch('/api/auth/verify-sms-and-check-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digitsOnly, code: codeString }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setVerifyStatus('error');
        setErrorMessage(data?.error ?? 'Invalid or expired code');
        return;
      }
      if (data?.existingAccount && data?.signInLink) {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('phone_verified', digitsOnly);
        }
        window.location.href = data.signInLink;
        return;
      }
      if (data?.existingAccount) {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('phone_verified', digitsOnly);
        }
        router.push('/login');
        router.refresh();
        return;
      }
      if (data?.ok) {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('phone_verified', digitsOnly);
        }
        router.push(`/signup/email?phone=${encodeURIComponent(digitsOnly)}`);
        return;
      }
      setVerifyStatus('error');
      setErrorMessage(data?.error ?? 'Invalid or expired code');
    } catch {
      setVerifyStatus('error');
      setErrorMessage('Verification failed');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-relay-bg-dark transition-colors">
      <main className="flex-1 flex flex-col px-6 pt-6 pb-8">
        <h1 className="text-sm font-semibold text-relay-text dark:text-relay-text-dark tracking-tight mb-2">
          Enter the 4-digit code sent via SMS at {displayPhone}.
        </h1>
        <Link
          href="/welcome"
          className="text-[10px] text-relay-muted underline mb-4 inline-block"
        >
          Changed your mobile number?
        </Link>

        {errorMessage && (
          <p className="text-xs text-red-600 dark:text-red-400 mb-4">
            {errorMessage}
          </p>
        )}

        {sendStatus === 'sending' && (
          <p className="text-[10px] text-relay-muted mb-4">Sending code…</p>
        )}

        <div className="flex gap-3 mb-8" onPaste={handlePaste}>
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
              />
            </div>
          ))}
        </div>

        <div className="space-y-3 mb-10">
          <button
            type="button"
            onClick={handleResendSms}
            disabled={sendStatus === 'sending' || digitsOnly.length !== 10}
            className="h-12 w-full rounded-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-relay-surface-dark text-xs font-medium text-neutral-900 dark:text-relay-text-dark tracking-tight disabled:opacity-60"
          >
            {sendStatus === 'sending' ? 'Sending…' : 'Resend code via SMS'}
          </button>
          <button
            type="button"
            className="h-12 w-full rounded-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-relay-surface-dark text-xs font-medium text-neutral-900 dark:text-relay-text-dark tracking-tight"
          >
            Call me with code
          </button>
        </div>

        {/* Bottom nav */}
        <div className="mt-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center justify-center size-12 rounded-full bg-relay-surface/50 dark:bg-relay-surface-dark/50 backdrop-blur-xl border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark"
            aria-label="Back"
          >
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed || verifyStatus === 'verifying'}
            className="inline-flex items-center justify-end gap-2 text-primary font-semibold text-xs tracking-tight disabled:opacity-50"
          >
            {verifyStatus === 'verifying' ? 'Verifying…' : (
              <>
                <span>Next</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}

export default function VerifySmsPage() {
  return (
    <Suspense>
      <VerifySmsPageContent />
    </Suspense>
  );
}
