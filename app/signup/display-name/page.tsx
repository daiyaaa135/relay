'use client';

export const dynamic = 'force-dynamic';

import React, { Suspense }, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function DisplayNamePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') ?? '';
  const phoneParam = searchParams.get('phone') ?? '';

  const [displayName, setDisplayName] = useState('');

  const canProceed = displayName.trim().length > 0;

  const handleNext = () => {
    if (!canProceed) return;
    const params = new URLSearchParams();
    if (emailParam) params.set('email', emailParam);
    if (phoneParam) params.set('phone', phoneParam);
    const query = params.toString();
    router.push(query ? `/signup/location?${query}` : '/signup/location');
  };

  const handleBack = () => {
    const params = new URLSearchParams();
    if (emailParam) params.set('email', emailParam);
    if (phoneParam) params.set('phone', phoneParam);
    const query = params.toString();
    router.push(query ? `/signup/password?${query}` : '/signup/password');
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-relay-bg-dark transition-colors">
      <main className="flex-1 flex flex-col px-6 pt-8 pb-8">
        <h1 className="text-sm font-semibold text-relay-text dark:text-relay-text-dark tracking-tight mb-2">
          What&apos;s your name?
        </h1>
        <p className="text-[10px] text-relay-muted mb-6">
          You can change this later in your profile setting.
        </p>

        <div className="mb-10">
          <label htmlFor="displayName" className="block text-[10px] text-relay-muted mb-2 uppercase tracking-tight">
            Display Name
          </label>
          <div className="group relative">
            <div className="flex h-12 items-center bg-relay-bg dark:bg-relay-bg-dark rounded-xl px-4 border border-relay-border dark:border-relay-border-dark group-focus-within:border-primary/80 transition-colors auth-input-card">
              <input
                id="displayName"
                type="text"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="display name (how others see you)"
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
            className="inline-flex items-center justify-end gap-2 text-primary font-semibold text-xs tracking-tight disabled:opacity-50"
          >
            <span>Next</span>
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </button>
        </div>
      </main>
    </div>
  );
}

export default function DisplayNamePage() {
  return (
    <Suspense>
      <DisplayNamePageContent />
    </Suspense>
  );
}
