'use client';

export const dynamic = 'force-dynamic';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EmailIcon } from '@/app/components/EmailIcon';
import styles from '../login/login.module.css';

function ForgotPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Enter the email you use for Relay.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.error) {
        const msg =
          json?.error?.message ||
          'Could not start password reset. Try again in a moment.';
        setError(msg);
        setLoading(false);
        return;
      }

      setMessage(
        'If an account exists for that email, we’ve sent a link to reset your password.'
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Could not start password reset. Try again in a moment.';
      setError(msg);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 items-center justify-center px-8 bg-relay-surface dark:bg-relay-surface-dark relative transition-colors">
      <div className="absolute top-8 left-6 z-20">
        <button
          onClick={() => {
            const from = searchParams.get('from');
            if (from === 'settings') {
              router.push('/settings');
            } else {
              router.push('/login');
            }
          }}
          className="flex size-12 items-center justify-center rounded-full bg-relay-surface/50 dark:bg-relay-surface-dark/50 backdrop-blur-xl border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark transition-all hover:scale-110 active-scale shadow-sm"
          aria-label="Go back"
        >
          <span className="material-symbols-outlined text-[24px]">arrow_back</span>
        </button>
      </div>

      <div className="relative w-full max-w-sm z-10">
        <div className="mb-12 text-center">
          <h1 className="font-serif text-2xl text-relay-text dark:text-relay-text-dark mb-2 tracking-tighter">
            Forgot password
          </h1>
          <p className="text-xs text-relay-muted">
            Enter your email and we’ll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-8 w-full">
          {(error || message) && (
            <p className="text-sm text-center bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark rounded-xl py-3 px-4 text-relay-text dark:text-relay-text-dark">
              {error ?? message}
            </p>
          )}

          <div className="group relative">
            <div
              className={`relative flex h-12 items-center glass-card rounded-xl px-4 py-0 border border-relay-border dark:border-relay-border-dark group-focus-within:border-primary/80 transition-colors ${styles.loginInputCard}`}
            >
              <EmailIcon className="w-5 h-5 shrink-0 text-relay-muted" />
              <input
                className="block w-full py-2 pl-3 bg-transparent text-relay-text dark:text-relay-text-dark placeholder-relay-muted focus:ring-0 focus:outline-none transition-colors text-sm font-medium tracking-tighter"
                placeholder="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex justify-center mt-6">
            <button
              type="submit"
              disabled={loading}
              className="text-primary font-semibold text-xs tracking-tight disabled:opacity-60"
            >
              {loading ? 'Sending reset link…' : 'Reset password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordPageContent />
    </Suspense>
  );
}
