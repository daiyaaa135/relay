'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { createClient } from '@/lib/supabase';
import { startNativeOAuth } from '@/lib/capacitorOAuth';

/** Format 10 digits as +1 XXX XXX XXXX for confirmation display */
function formatPhoneForDisplay(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 10);
  if (d.length < 10) return d ? `+1 ${d}` : '';
  return `+1 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

const HERO_PHONE_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDNCcYl4u8O_H-LaOWuaXugtHtEshXJZbQmvNkpbSTIQYBeY_OiM05IBRomz4-Vyg63ZDe_HmBBjKajXKRAKai2rG9H2NfctNqy0bH7ahVy9UVHtcr6-lDOUchDSJtuJpZBLilzeVJQk1wDfAMy7ttqsXP2cG6Hy3rR1KmiFqSsu1EEXhn_ep8_goan1atzGG-XHifO8f7Jiocs246aK-2xED1grUroINALyT-k6627edRZN-p6ryJfJCKTiclwLZsllbQIguBu576S';
const HERO_LAPTOP_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCWhRZdhR6zFFatwI1WGH_46wTxLtpdXj285TDt3ojsRZdMJAl-DF3VrdzGx-fYLOqjLtFJS2botUm_UhFdN_fzOKZBpg39nJ5kzbKefE-ctqyfqKUZk9qP7WN_YsPxwmLgCEaDZMfbkVt-yoTEBxCFguP68vctzIjGfpf5ho5BiTzjxv5tq97PdxwczSixvhLSLw3oKgLdSLvAdYcjOno5R9LdH-sCWn9txWnaxqiPOcaruHZkoG-29-2hMfCtINxsKLwvG-8HWZL2';
const HERO_HEADPHONES_IMG = '/hero-headphone.png';
export default function WelcomePage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const digitsOnly = phone.replace(/\D/g, '');
  const canContinue = digitsOnly.length === 10;

  const handleContinue = () => {
    if (!canContinue) return;
    setShowConfirmModal(true);
  };

  const handleConfirmYes = () => {
    setShowConfirmModal(false);
    router.push(`/signup/verify-sms?phone=${encodeURIComponent(digitsOnly)}`);
  };

  const handleConfirmEdit = () => {
    setShowConfirmModal(false);
  };

  useEffect(() => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('phone_verified');
    }
  }, []);

  const startGoogleSignIn = async () => {
    setGoogleError(null);
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      const webRedirectTo =
        typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;

      await startNativeOAuth(supabase, 'google', webRedirectTo);

      // On native, session is set — navigate home
      if (Capacitor.isNativePlatform()) {
        router.replace('/');
      }
      // On web, signInWithOAuth redirects automatically
    } catch (err) {
      setGoogleError(err instanceof Error ? err.message : 'Could not start sign-in.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-relay-bg dark:bg-relay-bg-dark transition-colors">
      {/* Hero: decorative area with floating gadgets */}
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
              className="w-24 h-24 object-contain shadow-xl rounded-xl"
              src={HERO_PHONE_IMG}
            />
          </div>
          <div className="gadget-float stagger-2 flex justify-center items-center" style={{ animation: 'gadget-float 6s ease-in-out infinite 1.5s' }}>
            <img
              alt="Laptop"
              className="w-32 h-32 object-contain shadow-xl rounded-xl"
              src={HERO_LAPTOP_IMG}
            />
          </div>
          <div className="gadget-float stagger-3 flex justify-center items-start col-span-2" style={{ animation: 'gadget-float 6s ease-in-out infinite 3s' }}>
            <img
              alt="Headphones"
              className="w-28 h-28 object-contain shadow-xl rounded-xl"
              src={HERO_HEADPHONES_IMG}
            />
          </div>
        </div>
      </div>

      {/* Card: welcome + auth options — pushed down so hero stays visible */}
      <div className="flex-1 px-6 pt-10 pb-10 bg-white dark:bg-relay-surface-dark rounded-t-3xl -mt-4 relative z-10 shadow-2xl transition-colors">
        <h1 className="text-sm font-semibold text-relay-text dark:text-relay-text-dark mb-5 tracking-tight">
          Welcome to Rellaey
        </h1>

        <div className="w-full mb-4">
          <div className="group relative">
            <div className="flex h-12 items-center bg-relay-bg dark:bg-relay-bg-dark rounded-xl px-4 border border-relay-border dark:border-relay-border-dark group-focus-within:border-primary/80 transition-colors auth-input-card">
              <span className="text-relay-text dark:text-relay-text-dark mr-2 text-xs font-medium">+1</span>
              <label htmlFor="phone" className="sr-only">Phone number</label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(201) 555-0123"
                className="block w-full py-2 pl-0 bg-transparent text-relay-text dark:text-relay-text-dark placeholder-relay-muted focus:ring-0 focus:outline-none text-xs font-medium tracking-tighter flex-1"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end mb-5">
          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue}
            className="size-10 rounded-full bg-primary shadow-[-2px_-2px_2px_#ffffff,_2px_2px_2px_#c97a3a] btn-dark-neumorph inline-flex items-center justify-center text-white disabled:opacity-50 disabled:pointer-events-none"
            aria-label="Continue"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </button>
        </div>

        {/* Number confirmation modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setShowConfirmModal(false)}>
            <div
              className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl bg-white dark:bg-relay-surface-dark p-6 shadow-xl transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-center font-semibold text-relay-text dark:text-relay-text-dark text-xs mb-2">
                Number Confirmation
              </h2>
              <p className="text-center font-semibold text-relay-text dark:text-relay-text-dark text-sm mb-2">
                {formatPhoneForDisplay(digitsOnly)}
              </p>
              <p className="text-center text-relay-text dark:text-relay-text-dark text-xs mb-6">
                Is your phone number above correct?
              </p>
              <div className="space-y-0 border-t border-relay-border dark:border-relay-border-dark">
                <button
                  type="button"
                  onClick={handleConfirmYes}
                  className="w-full py-4 text-primary font-semibold text-xs"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={handleConfirmEdit}
                  className="w-full py-4 text-primary font-semibold text-xs border-t border-relay-border dark:border-relay-border-dark"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 mb-5">
          <span className="h-px flex-1 bg-relay-border dark:bg-relay-border-dark" />
          <span className="text-[10px] text-relay-muted tracking-tight uppercase">or</span>
          <span className="h-px flex-1 bg-relay-border dark:bg-relay-border-dark" />
        </div>

        {googleError && (
          <p className="text-xs text-red-600 dark:text-red-400 mb-4">{googleError}</p>
        )}

        <div className="space-y-3 mb-6">
          <button
            type="button"
            onClick={startGoogleSignIn}
            disabled={googleLoading}
            className="h-12 w-full rounded-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-relay-surface-dark text-xs font-medium text-neutral-900 dark:text-relay-text-dark tracking-tight flex items-center justify-center gap-3 disabled:opacity-60"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335" />
            </svg>
            <span>{googleLoading ? 'Signing in…' : 'Continue with Google'}</span>
          </button>
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="h-12 w-full rounded-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-relay-surface-dark text-xs font-medium text-neutral-900 dark:text-relay-text-dark tracking-tight flex items-center justify-center gap-3"
          >
            <span className="material-symbols-outlined text-lg">mail</span>
            <span>Continue with Email</span>
          </button>
        </div>

        <p className="text-[10px] text-relay-muted text-center leading-relaxed mt-6">
          By continuing, you agree to calls, including by autodialer, or SMS messages, from Rellaey to the number provided.
        </p>
      </div>

    </div>
  );
}
