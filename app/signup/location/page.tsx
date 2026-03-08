'use client';

import React, { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SuccessTransition } from '@/app/components/SuccessTransition';

export default function LocationPage() {
  const router = useRouter();
  const [showSuccess, setShowSuccess] = useState(false);
  const hasNavigatedRef = useRef(false);

  const handleGrantAccess = () => {
    // In a future iteration this is where we would request native location access.
    setShowSuccess(true);
  };

  const handleAnimationComplete = useCallback(() => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    router.replace('/');
  }, [router]);

  return (
    <>
      <div className="min-h-screen flex flex-col bg-white dark:bg-relay-bg-dark transition-colors">
        <main className="flex-1 flex flex-col px-6 pt-8 pb-10">
          <p className="text-[10px] font-semibold text-relay-muted uppercase tracking-wide mb-2">
            Last thing and we&apos;re done
          </p>
          <h1 className="text-sm font-semibold text-relay-text dark:text-relay-text-dark tracking-tight mb-12">
            Enable location to discover local swaps near you.
          </h1>

          {/* Map pin with concentric circles */}
          <div className="flex-1 flex items-center justify-center relative my-8">
            <div className="relative flex items-center justify-center">
              {/* Concentric circles */}
              <div className="absolute size-48 rounded-full border border-relay-border dark:border-relay-border-dark opacity-20" />
              <div className="absolute size-36 rounded-full border border-relay-border dark:border-relay-border-dark opacity-30" />
              <div className="absolute size-24 rounded-full border border-relay-border dark:border-relay-border-dark opacity-40" />
              {/* Map pin icon */}
              <span className="material-symbols-outlined text-[80px] text-relay-text dark:text-relay-text-dark relative z-10">
                location_on
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGrantAccess}
            className="h-12 w-full rounded-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-relay-surface-dark text-xs font-medium text-neutral-900 dark:text-relay-text-dark tracking-tight"
          >
            Grant Access to Location
          </button>
        </main>
      </div>

      {showSuccess && <SuccessTransition onComplete={handleAnimationComplete} />}
    </>
  );
}

