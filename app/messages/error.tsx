'use client';

import React, { useEffect } from 'react';

export default function MessagesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[MessagesError]', error);
  }, [error]);

  return (
    <div className="flex flex-col flex-1 min-h-0 items-center justify-center px-6 py-20 bg-relay-surface dark:bg-relay-surface-dark">
      <span className="material-symbols-outlined text-relay-muted dark:text-relay-muted-light text-5xl mb-4">
        inbox
      </span>
      <h2 className="text-relay-text dark:text-relay-text-dark font-serif text-lg font-semibold mb-2">
        Couldn&apos;t load messages
      </h2>
      <p className="text-relay-muted dark:text-relay-muted-light text-xs text-center max-w-[260px] leading-relaxed mb-6">
        There was a problem loading your conversations.
      </p>
      <button
        type="button"
        onClick={reset}
        className="h-10 px-8 bg-primary text-white text-xs font-semibold tracking-tight rounded-2xl active:scale-95 transition-transform"
      >
        Try again
      </button>
    </div>
  );
}
