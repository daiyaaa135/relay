'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { ScreenSkeleton } from '@/app/components/Skeleton';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EditProfileEmailPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [initialEmail, setInitialEmail] = useState('');
  const [userId, setUserId] = useState('');

  // Duplicate check
  const [checkStatus, setCheckStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      const current = (user as { email?: string } | null)?.email ?? '';
      setInitialEmail(current);
      setEmail(current);
      setUserId(user?.id ?? '');
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const trimmed = email.trim();
  const isValid = EMAIL_REGEX.test(trimmed);
  const hasChanged = trimmed !== (initialEmail ?? '').trim();

  // Only run duplicate check when email is valid and has changed
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!isValid || !hasChanged) { setCheckStatus('idle'); return; }
    setCheckStatus('checking');
    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ email: trimmed });
        if (userId) params.set('excludeUserId', userId);
        const res = await fetch(`/api/auth/check-email?${params.toString()}`);
        const data = await res.json().catch(() => ({}));
        setCheckStatus(data?.available ? 'available' : 'taken');
      } catch {
        setCheckStatus('idle');
      }
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed, hasChanged]);

  const canUpdate =
    isValid &&
    hasChanged &&
    (checkStatus === 'available' || checkStatus === 'idle') &&
    checkStatus !== 'taken' &&
    checkStatus !== 'checking' &&
    !updating;

  const handleUpdate = async () => {
    if (!isValid || !hasChanged) return;
    setError(null);
    setUpdating(true);
    try {
      const res = await fetch('/api/auth/send-email-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? 'Failed to send code');
        return;
      }
      router.push(`/edit-profile/email/verify?email=${encodeURIComponent(trimmed)}`);
    } catch {
      setError('Failed to send code');
    } finally {
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
          {updating ? 'Updating…' : 'Update'}
        </button>
      </header>

      <main className="flex-1 flex flex-col px-6 pt-8 pb-8">
        <h2 className="text-sm font-semibold text-relay-text dark:text-relay-text-dark tracking-tight mb-2">
          Email
        </h2>
        <p className="text-[10px] text-relay-muted dark:text-relay-muted-light mb-10 leading-relaxed">
          You&apos;ll use this email to sign in and recover your account.
        </p>

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>
        )}

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
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                placeholder="name@example.com"
                className="block w-full py-2 bg-transparent text-relay-text dark:text-relay-text-dark placeholder-relay-muted focus:ring-0 focus:outline-none text-xs font-medium tracking-tighter"
                autoFocus
              />
            </div>
            {hasChanged && isValid && checkStatus === 'checking' && (
              <p className="text-[10px] text-relay-muted mt-2">Checking…</p>
            )}
            {hasChanged && checkStatus === 'taken' && (
              <p className="text-[10px] text-red-600 dark:text-red-400 mt-2">
                This email is already linked to another account.
              </p>
            )}
            {hasChanged && checkStatus === 'available' && (
              <p className="text-[10px] text-green-600 dark:text-green-400 mt-2">Email available</p>
            )}
            {!hasChanged && (
              <p className="text-[10px] text-relay-muted dark:text-relay-muted-light mt-2">
                A verification code will be sent to this email.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
