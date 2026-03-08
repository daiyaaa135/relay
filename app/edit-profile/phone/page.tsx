'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { ScreenSkeleton } from '@/app/components/Skeleton';

/** Format 10-digit US number as (XXX) XXX-XXXX for input display */
function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Normalize to 10 digits */
function toDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10);
}

export default function EditProfilePhonePage() {
  const router = useRouter();
  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [initialDigits, setInitialDigits] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      const raw = (user as { phone?: string } | null)?.phone ?? '';
      const digits = raw.replace(/\D/g, '').slice(-10);
      if (digits.length === 10) {
        setInitialDigits(digits);
        setPhoneDisplay(formatPhoneInput(digits));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneDisplay(formatPhoneInput(e.target.value));
  };

  const currentDigits = toDigits(phoneDisplay);
  const isValid = currentDigits.length === 10;
  const hasChanged = initialDigits !== currentDigits;
  const canUpdate = isValid && hasChanged && !updating;

  const handleUpdate = async () => {
    if (!isValid) return;
    setError(null);
    if (!hasChanged) {
      return;
    }
    setUpdating(true);
    try {
      const res = await fetch('/api/auth/send-sms-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: currentDigits }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? 'Failed to send code');
        setUpdating(false);
        return;
      }
      router.push(`/edit-profile/phone/verify?phone=${encodeURIComponent(currentDigits)}`);
    } catch {
      setError('Failed to send code');
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <ScreenSkeleton
        className="min-h-screen bg-white dark:bg-relay-surface-dark transition-colors"
        rows={4}
      />
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
          {updating ? 'Sending…' : 'Update'}
        </button>
      </header>

      <main className="flex-1 flex flex-col px-6 pt-8 pb-8">
        <h2 className="text-sm font-semibold text-relay-text dark:text-relay-text-dark tracking-tight mb-2">
          Phone number
        </h2>
        <p className="text-[10px] text-relay-muted dark:text-relay-muted-light mb-10 leading-relaxed">
          You&apos;ll use this number to get notifications, sign in, and recover your account.
        </p>

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 mb-4" role="alert">
            {error}
          </p>
        )}

        <div className="mb-10">
          <label htmlFor="phone" className="block text-[10px] text-relay-muted mb-2 uppercase tracking-tight">
            Phone number
          </label>
          <div className="group relative">
            <div className="flex h-12 items-center bg-relay-bg dark:bg-relay-bg-dark rounded-xl px-4 border border-relay-border dark:border-relay-border-dark group-focus-within:border-primary/80 transition-colors auth-input-card">
              <span className="text-relay-muted select-none text-xs font-medium tracking-tighter mr-2">+1</span>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                value={phoneDisplay}
                onChange={handlePhoneChange}
                placeholder="(000) 000-0000"
                className="block w-full py-2 bg-transparent text-relay-text dark:text-relay-text-dark placeholder-relay-muted focus:ring-0 focus:outline-none text-xs font-medium tracking-tighter"
              />
            </div>
            <p className="text-[10px] text-relay-muted dark:text-relay-muted-light mt-2">
              A verification code will be sent to this number.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
