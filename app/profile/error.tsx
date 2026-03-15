'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('[ProfileError]', error);
  }, [error]);

  return (
    <div className="flex flex-col flex-1 min-h-0 items-center justify-center px-6 py-20 bg-relay-surface dark:bg-relay-surface-dark">
      <span className="material-symbols-outlined text-relay-muted dark:text-relay-muted-light text-5xl mb-4">
        person
      </span>
      <h2 className="text-relay-text dark:text-relay-text-dark font-serif text-lg font-semibold mb-2">
        Profile unavailable
      </h2>
      <p className="text-relay-muted dark:text-relay-muted-light text-xs text-center max-w-[260px] leading-relaxed mb-6">
        There was a problem loading this profile.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="h-10 px-6 bg-primary text-white text-xs font-semibold tracking-tight rounded-2xl active:scale-95 transition-transform"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="h-10 px-6 bg-relay-surface dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark text-xs font-semibold tracking-tight rounded-2xl active:scale-95 transition-transform"
        >
          Go home
        </button>
      </div>
    </div>
  );
}
