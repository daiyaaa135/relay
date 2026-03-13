'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockIcon } from '@/app/components/LockIcon';
import { createClient } from '@/lib/supabase';
import styles from '../login/login.module.css';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [checkingLink, setCheckingLink] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [canReset, setCanReset] = useState(false);

  useEffect(() => {
    const verifyRecoverySession = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.getUser();

        if (error || !data?.user) {
          setError(
            'This reset link is invalid or has expired. Request a new link from the login screen.'
          );
          setCanReset(false);
        } else {
          setCanReset(true);
        }
      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : 'Could not verify reset link. Try opening the link again.';
        setError(message);
        setCanReset(false);
      } finally {
        setCheckingLink(false);
      }
    };

    void verifyRecoverySession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canReset || checkingLink) return;

    setError(null);
    setSuccess(null);

    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedNew || !trimmedConfirm) {
      setError('Enter and confirm your new password.');
      return;
    }
    if (trimmedNew !== trimmedConfirm) {
      setError('Passwords do not match.');
      return;
    }
    if (trimmedNew.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: trimmedNew,
      });

      if (error) {
        setError(error.message || 'Could not update password.');
        setSubmitting(false);
        return;
      }

      setSuccess('Password updated. You can log in with your new password.');
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : 'Could not update password. Try again in a moment.';
      setError(message);
    }
    setSubmitting(false);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 items-center justify-center px-8 bg-relay-surface dark:bg-relay-surface-dark relative transition-colors">
      <div className="absolute top-8 left-6 z-20">
        <button
          onClick={() => router.push('/login')}
          className="flex size-12 items-center justify-center rounded-full bg-relay-surface/50 dark:bg-relay-surface-dark/50 backdrop-blur-xl border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark transition-all hover:scale-110 active-scale shadow-sm"
          aria-label="Back to log in"
        >
          <span className="material-symbols-outlined text-[24px]">arrow_back</span>
        </button>
      </div>

      <div className="relative w-full max-w-sm z-10">
        <div className="mb-12 text-center">
          <h1 className="font-serif text-4xl text-relay-text dark:text-relay-text-dark mb-2 tracking-tighter">
            Reset password
          </h1>
          <p className="text-xs text-relay-muted">
            Choose a new password for your Relay account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-8 w-full">
          {(error || success) && (
            <p className="text-sm text-center bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark rounded-xl py-3 px-4 text-relay-text dark:text-relay-text-dark">
              {error ?? success}
            </p>
          )}

          <div className="group relative">
            <div
              className={`relative flex items-center glass-card rounded-xl px-4 py-3.5 border border-relay-border dark:border-relay-border-dark group-focus-within:border-primary/80 transition-colors ${styles.loginInputCard}`}
            >
              <LockIcon className="w-5 h-5 shrink-0 text-relay-muted" />
              <input
                className="block w-full py-2 pl-3 bg-transparent text-relay-text dark:text-relay-text-dark placeholder-relay-muted focus:ring-0 focus:outline-none transition-colors text-xs font-medium tracking-tighter"
                placeholder="New password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                disabled={checkingLink || !canReset || submitting}
              />
            </div>
          </div>

          <div className="group relative">
            <div
              className={`relative flex items-center glass-card rounded-xl px-4 py-3.5 border border-relay-border dark:border-relay-border-dark group-focus-within:border-primary/80 transition-colors ${styles.loginInputCard}`}
            >
              <LockIcon className="w-5 h-5 shrink-0 text-relay-muted" />
              <input
                className="block w-full py-2 pl-3 bg-transparent text-relay-text dark:text-relay-text-dark placeholder-relay-muted focus:ring-0 focus:outline-none transition-colors text-xs font-medium tracking-tighter"
                placeholder="Confirm new password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                disabled={checkingLink || !canReset || submitting}
              />
            </div>
          </div>

          <div className="flex justify-center mt-6">
            <button
              type="submit"
              disabled={checkingLink || !canReset || submitting}
              className="text-primary font-semibold text-xs tracking-tight disabled:opacity-60"
            >
              {checkingLink
                ? 'Checking link…'
                : submitting
                  ? 'Saving…'
                  : 'Save new password'}
            </button>
          </div>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="text-[10px] text-relay-muted hover:text-primary transition-colors"
            >
              Back to log in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

