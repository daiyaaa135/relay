'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { EmailIcon } from '@/app/components/EmailIcon';
import { LockIcon } from '@/app/components/LockIcon';
import { createClient, INVALID_API_KEY_MESSAGE } from '@/lib/supabase';
import styles from './login.module.css';

const HERO_PHONE_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDNCcYl4u8O_H-LaOWuaXugtHtEshXJZbQmvNkpbSTIQYBeY_OiM05IBRomz4-Vyg63ZDe_HmBBjKajXKRAKai2rG9H2NfctNqy0bH7ahVy9UVHtcr6-lDOUchDSJtuJpZBLilzeVJQk1wDfAMy7ttqsXP2cG6Hy3rR1KmiFqSsu1EEXhn_ep8_goan1atzGG-XHifO8f7Jiocs246aK-2xED1grUroINALyT-k6627edRZN-p6ryJfJCKTiclwLZsllbQIguBu576S';
const HERO_LAPTOP_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCWhRZdhR6zFFatwI1WGH_46wTxLtpdXj285TDt3ojsRZdMJAl-DF3VrdzGx-fYLOqjLtFJS2botUm_UhFdN_fzOKZBpg39nJ5kzbKefE-ctqyfqKUZk9qP7WN_YsPxwmLgCEaDZMfbkVt-yoTEBxCFguP68vctzIjGfpf5ho5BiTzjxv5tq97PdxwczSixvhLSLw3oKgLdSLvAdYcjOno5R9LdH-sCWn9txWnaxqiPOcaruHZkoG-29-2hMfCtINxsKLwvG-8HWZL2';
const HERO_HEADPHONES_IMG = '/hero-headphone.png';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const showToast = (message: string) => {
    setError(message);
    if (typeof window !== 'undefined') {
      const toastEvent = new CustomEvent('relay-login-toast', { detail: message });
      window.dispatchEvent(toastEvent);
    }
  };

  const startOAuthSignIn = async (provider: 'google' | 'apple') => {
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();

      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/profile`
          : undefined;

      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });

      if (authError) {
        const message = authError.message || 'Could not start sign-in.';
        showToast(message);
        setLoading(false);
        return;
      }

      if (data?.url && typeof window !== 'undefined') {
        window.location.href = data.url;
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not start sign-in.';
      setError(message);
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter email and password.');
      return;
    }
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();

    try {
      if (isNative) {
        // Server-side sign-in so the Supabase request runs in Node (same as web), avoiding WebView/encoding issues on iOS.
        const res = await fetch('/api/auth/sign-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalizedEmail, password: trimmedPassword }),
        });
        const json = await res.json().catch(() => ({}));
        if (json.error) {
          const msg = json.error.message ?? 'Sign-in failed';
          const displayError =
            msg === 'Invalid login credentials'
              ? 'Invalid email or password. Check for typos, try "Forgot credentials?" to reset, or use the same email and password that work on the web app.'
              : msg;
          setError(displayError);
          setLoading(false);
          return;
        }
        if (json.data?.session) {
          const supabase = createClient();
          await supabase.auth.setSession(json.data.session);
          router.push('/');
          router.refresh();
        }
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: trimmedPassword,
      });
      if (authError) {
        const msg = authError.message;
        const displayError =
          msg.includes(INVALID_API_KEY_MESSAGE)
            ? `${msg} Use the anon or publishable key from Supabase Dashboard → Project Settings → API in .env.local as NEXT_PUBLIC_SUPABASE_ANON_KEY, then restart the dev server.`
            : msg === 'Invalid login credentials'
              ? 'Invalid email or password. Check for typos, try "Forgot credentials?" to reset, or use the same email and password that work on the web app.'
              : msg;
        setError(displayError);
        setLoading(false);
        return;
      }
      if (data.user) {
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Could not connect.';
      const isInvalidKey = raw.includes(INVALID_API_KEY_MESSAGE);
      setError(
        isInvalidKey
          ? `${raw} Use the anon or publishable key from Supabase Dashboard → Project Settings → API in .env.local as NEXT_PUBLIC_SUPABASE_ANON_KEY, then restart the dev server.`
          : raw.includes('Missing') || raw.includes('Supabase')
            ? raw
            : `Could not connect. Check .env.local has NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then restart. ${raw}`
      );
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-relay-bg dark:bg-relay-bg-dark transition-colors">
      {/* Hero: upper half — match signup welcome background */}
      <div className="relative min-h-[50vh] w-full overflow-hidden bg-relay-surface dark:bg-[#1A1A1A] shrink-0">
        <div className="absolute inset-0 flex items-center justify-center opacity-40">
          <svg
            className="w-full h-full text-primary/20 dark:text-relay-muted/20"
            fill="none"
            viewBox="0 0 400 400"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              d="M300 100C330 120 350 160 350 200C350 240 330 280 300 300C270 320 230 340 190 340C150 340 110 320 80 300C50 280 30 240 30 200C30 160 50 120 80 100C110 80 150 60 190 60C230 60 270 80 300 100Z"
              stroke="currentColor"
              strokeDasharray="10 10"
              strokeWidth="2"
            />
            <circle cx="200" cy="200" r="120" stroke="currentColor" strokeDasharray="5 5" strokeWidth="1" />
          </svg>
        </div>
        <div className="absolute inset-0 p-8 grid grid-cols-2 gap-4">
          <div className="gadget-float stagger-1 flex justify-center items-end">
            <img
              alt="Smartphone"
              className="w-24 h-24 object-contain drop-shadow-2xl rounded-xl"
              src={HERO_PHONE_IMG}
            />
          </div>
          <div
            className="gadget-float stagger-2 flex justify-center items-center"
            style={{ animation: 'gadget-float 6s ease-in-out infinite 1.5s' }}
          >
            <img
              alt="Laptop"
              className="w-32 h-32 object-contain drop-shadow-2xl rounded-xl"
              src={HERO_LAPTOP_IMG}
            />
          </div>
          <div
            className="gadget-float stagger-3 flex justify-center items-start col-span-2"
            style={{ animation: 'gadget-float 6s ease-in-out infinite 3s' }}
          >
            <img
              alt="Headphones"
              className="w-28 h-28 object-contain drop-shadow-2xl rounded-xl"
              src={HERO_HEADPHONES_IMG}
            />
          </div>
        </div>
        <div className="absolute top-0 left-0 p-4 z-10 pt-safe-1">
          <button
            onClick={() => router.push('/')}
            className="flex size-12 items-center justify-center rounded-full bg-relay-surface/80 dark:bg-relay-surface-dark/80 backdrop-blur border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark transition-all hover:scale-105 active:scale-95 shadow-sm"
            aria-label="Go back"
          >
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
        </div>
      </div>

      {/* Bottom panel: card with all interactive elements */}
      <div className="flex-1 px-6 pt-10 pb-10 bg-white dark:bg-relay-surface-dark rounded-t-3xl -mt-4 relative z-10 shadow-2xl transition-colors">
        <h1 className="text-sm font-semibold text-relay-text dark:text-relay-text-dark mb-6 tracking-tight">
          Log in
        </h1>

        <form onSubmit={handleLogin} className="flex flex-col gap-5 w-full max-w-sm mx-auto">
          {error && (
            <p className="text-sm text-center bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark rounded-xl py-3 px-4 text-relay-text dark:text-relay-text-dark">
              {error}
            </p>
          )}
          <div className="group relative">
            <label htmlFor="email" className="sr-only">Email address</label>
            <div className={`relative flex h-12 items-center bg-relay-bg dark:bg-relay-bg-dark rounded-xl px-4 py-0 border border-relay-border dark:border-relay-border-dark group-focus-within:border-primary/80 transition-colors ${styles.loginInputCard}`}>
              <EmailIcon className="w-5 h-5 shrink-0 text-relay-muted" />
              <input
                id="email"
                className="block w-full py-2 pl-3 bg-transparent text-relay-text dark:text-relay-text-dark placeholder-relay-muted focus:ring-0 focus:outline-none transition-colors text-xs font-medium tracking-tighter"
                placeholder="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="group relative">
            <label htmlFor="password" className="sr-only">Password</label>
            <div className={`relative flex h-12 items-center bg-relay-bg dark:bg-relay-bg-dark rounded-xl px-4 py-0 border border-relay-border dark:border-relay-border-dark group-focus-within:border-primary/80 transition-colors ${styles.loginInputCard}`}>
              <LockIcon className="w-5 h-5 shrink-0 text-relay-muted" />
              <input
                id="password"
                className="block w-full py-2 pl-3 bg-transparent text-relay-text dark:text-relay-text-dark placeholder-relay-muted focus:ring-0 focus:outline-none transition-colors text-xs font-medium tracking-tighter"
                placeholder="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="ml-2 shrink-0 text-relay-muted hover:text-relay-text transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            <div className="flex justify-center mt-3">
              <button
                type="button"
                onClick={() => router.push('/forgot-password')}
                className="text-[10px] text-relay-muted hover:text-primary transition-colors"
              >
                Forgot password?
              </button>
            </div>
          </div>

          <div className="flex justify-end mb-5">
            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="size-10 rounded-full bg-primary shadow-[-2px_-2px_2px_#ffffff,_2px_2px_2px_#c97a3a] btn-dark-neumorph inline-flex items-center justify-center text-white disabled:opacity-50 disabled:pointer-events-none"
              aria-label="Log in"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
          </div>

          <div className="flex items-center gap-3 my-2">
            <span className="h-px flex-1 bg-relay-border dark:bg-relay-border-dark" />
            <span className="text-[10px] text-relay-muted tracking-tight uppercase">or</span>
            <span className="h-px flex-1 bg-relay-border dark:bg-relay-border-dark" />
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => startOAuthSignIn('google')}
            className="h-12 w-full rounded-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-relay-surface-dark text-xs font-medium text-neutral-900 dark:text-relay-text-dark tracking-tight flex items-center justify-center gap-3 shadow-sm disabled:opacity-60"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335" />
            </svg>
            <span>{loading ? 'Signing in…' : 'Continue with Google'}</span>
          </button>
        </form>

        <div className="mt-8 text-center max-w-sm mx-auto">
          <p className="text-relay-muted text-[10px] font-bold tracking-tight">
            New to tech rotation?{' '}
            <button
              type="button"
              onClick={() => router.push('/signup')}
              className="text-relay-text dark:text-relay-text-dark hover:text-primary transition-colors border-b-2 border-primary/20"
            >
              Join Relay
            </button>
          </p>
        </div>

        <div className="mt-6 text-center max-w-sm mx-auto">
          <p className="text-[10px] text-relay-muted leading-relaxed">
            By signing up or logging in, you agree to our{' '}
            <button
              type="button"
              onClick={() => router.push('/help/legal-terms-of-service?from=login')}
              className="underline underline-offset-2 font-semibold hover:text-primary"
            >
              Terms of Service
            </button>{' '}
            and{' '}
            <button
              type="button"
              onClick={() => router.push('/help/legal-privacy-policy?from=login')}
              className="underline underline-offset-2 font-semibold hover:text-primary"
            >
              Privacy Policy
            </button>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
