'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { fetchProfile, updateProfile } from '@/lib/profiles';
import { ScreenSkeleton } from '@/app/components/Skeleton';

export default function EditProfileNamePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [initialName, setInitialName] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setLoading(false);
        return;
      }

      const profile = await fetchProfile(user.id);
      if (cancelled) return;
      const current = profile?.display_name ?? user.email?.split('@')[0] ?? 'User';
      setInitialName(current);
      setName(current);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const trimmed = name.trim();
  const canSave = trimmed.length > 0 && trimmed !== initialName.trim();

  const handleUpdate = async () => {
    if (!canSave) {
      router.back();
      return;
    }
    setError(null);
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setError('Not signed in');
      return;
    }
    const result = await updateProfile(user.id, { display_name: trimmed });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push('/edit-profile');
    router.refresh();
  };

  if (loading) {
    return (
      <ScreenSkeleton
        className="min-h-screen bg-white dark:bg-relay-bg-dark transition-colors"
        rows={4}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-relay-surface-dark transition-colors">
      <header
        className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-relay-border dark:border-relay-border-dark pt-safe-1"
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="flex size-10 items-center justify-center rounded-full bg-relay-surface dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark shadow-sm active-scale"
          aria-label="Back"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              d="M15 19L8 12L15 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-relay-text dark:text-relay-text-dark">Account</h1>
        <button
          type="button"
          onClick={handleUpdate}
          disabled={!canSave || saving}
          className="text-primary font-semibold text-xs tracking-tight disabled:opacity-40"
        >
          {saving ? 'Updating…' : 'Update'}
        </button>
      </header>

      <main className="flex-1 flex flex-col px-6 pt-8 pb-8">
        <h2 className="text-sm font-semibold text-relay-text dark:text-relay-text-dark tracking-tight mb-2">
          Name
        </h2>
        <p className="text-[10px] text-relay-muted dark:text-relay-muted-light mb-10 leading-relaxed">
          This name is shown on your profile.
        </p>

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 mb-4" role="alert">
            {error}
          </p>
        )}

        <div className="mb-10">
          <label htmlFor="name" className="block text-[10px] text-relay-muted mb-2 uppercase tracking-tight">
            Name
          </label>
          <div className="group relative">
            <div className="flex h-12 items-center bg-relay-bg dark:bg-relay-bg-dark rounded-xl px-4 border border-relay-border dark:border-relay-border-dark group-focus-within:border-primary/80 transition-colors auth-input-card">
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="block w-full py-2 bg-transparent text-relay-text dark:text-relay-text-dark placeholder-relay-muted focus:ring-0 focus:outline-none text-xs font-medium tracking-tighter"
                autoFocus
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

