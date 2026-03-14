'use client';

export const dynamic = 'force-dynamic';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';

const MIN_PASSWORD_LENGTH = 8;

function PasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') ?? '';
  const phoneParam = searchParams.get('phone') ?? '';
  const displayNameParam = searchParams.get('displayName') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const email = emailParam.trim().toLowerCase();
  const passwordsMatch = password === confirmPassword;
  const passwordLongEnough = password.length >= MIN_PASSWORD_LENGTH;
  const canProceed =
    passwordLongEnough && passwordsMatch && confirmPassword.length > 0 && !loading;

  const handleNext = async () => {
    if (!canProceed) return;
    setError(null);
    setLoading(true);

    try {
      // 1. Create the Supabase account (email already verified by our code system)
      const signUpRes = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName: displayNameParam }),
      });
      const signUpData = await signUpRes.json().catch(() => ({}));
      if (!signUpRes.ok) {
        setError(signUpData?.error ?? 'Could not create account');
        return;
      }

      // 2. Sign in immediately so the session cookie is set
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message ?? 'Account created but sign-in failed');
        return;
      }

      // 3. Continue the onboarding flow
      const params = new URLSearchParams();
      if (emailParam) params.set('email', emailParam);
      if (phoneParam) params.set('phone', phoneParam);
      if (displayNameParam) params.set('displayName', displayNameParam);
      const query = params.toString();
      router.push(query ? `/signup/display-name?${query}` : '/signup/display-name');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    const params = new URLSearchParams();
    if (emailParam) params.set('email', emailParam);
    if (phoneParam) params.set('phone', phoneParam);
    const query = params.toString();
    router.push(query ? `/signup/verify-email?${query}` : '/signup/verify-email');
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-relay-bg-dark transition-colors">
      <main className="flex-1 flex flex-col px-6 pt-6 pb-8">
        <h1 className="text-sm font-semibold text-relay-text dark:text-relay-text-dark tracking-tight mb-2">
          Set up your password
        </h1>
        <p className="text-[10px] text-relay-muted mb-6">
          Choose a password you&apos;ll use to sign in with your email.
        </p>

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>
        )}

        <div className="mb-4">
          <label htmlFor="password" className="block text-[10px] text-relay-muted mb-2 uppercase tracking-tight">
            Password
          </label>
          <div className="group relative">
            <div className="flex h-12 items-center bg-relay-bg dark:bg-relay-bg-dark rounded-xl px-4 border border-relay-border dark:border-relay-border-dark group-focus-within:border-primary/80 transition-colors auth-input-card">
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                placeholder="At least 8 characters"
                className="block w-full py-2 bg-transparent text-relay-text dark:text-relay-text-dark placeholder-relay-muted focus:ring-0 focus:outline-none text-xs font-medium tracking-tighter"
              />
            </div>
          </div>
        </div>

        <div className="mb-10">
          <label htmlFor="confirmPassword" className="block text-[10px] text-relay-muted mb-2 uppercase tracking-tight">
            Confirm password
          </label>
          <div className="group relative">
            <div className="flex h-12 items-center bg-relay-bg dark:bg-relay-bg-dark rounded-xl px-4 border border-relay-border dark:border-relay-border-dark group-focus-within:border-primary/80 transition-colors auth-input-card">
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                placeholder="Re-enter password"
                className="block w-full py-2 bg-transparent text-relay-text dark:text-relay-text-dark placeholder-relay-muted focus:ring-0 focus:outline-none text-xs font-medium tracking-tighter"
              />
            </div>
          </div>
        </div>

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
            className="size-10 rounded-full bg-primary shadow-[-2px_-2px_2px_#ffffff,_2px_2px_2px_#c97a3a] dark:shadow-none inline-flex items-center justify-center text-white disabled:opacity-50 disabled:pointer-events-none"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </button>
        </div>
      </main>
    </div>
  );
}

export default function PasswordPage() {
  return (
    <Suspense>
      <PasswordPageContent />
    </Suspense>
  );
}
