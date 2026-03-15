'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[global-error] Caught root-level error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#f5f0eb', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: '24px' }}>
        <p style={{ fontSize: 48, marginBottom: 16 }}>⚠️</p>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>
          Something went wrong
        </h2>
        <p style={{ fontSize: 12, color: '#888', marginBottom: 24, maxWidth: 260 }}>
          {error?.message ?? 'An unexpected error occurred.'}
        </p>
        <button
          type="button"
          onClick={reset}
          style={{ background: '#FF5721', color: '#fff', border: 'none', borderRadius: 9999, padding: '10px 28px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
