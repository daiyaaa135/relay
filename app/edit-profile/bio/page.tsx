'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { fetchProfile, updateProfile } from '@/lib/profiles';
import { ScreenSkeleton } from '@/app/components/Skeleton';

const BIO_MAX = 200;

export default function EditProfileBioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bio, setBio] = useState('');
  const [initialBio, setInitialBio] = useState('');

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
      const current = profile?.bio ?? '';
      setInitialBio(current);
      setBio(current);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const trimmed = bio.trim().slice(0, BIO_MAX);
  const initialTrimmed = initialBio.trim().slice(0, BIO_MAX);
  const canSave = trimmed !== initialTrimmed;

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
    const result = await updateProfile(user.id, { bio: trimmed || null });
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
        className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-relay-border dark:border-relay-border-dark"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="flex size-10 items-center justify-center rounded-full text-relay-muted hover:bg-relay-bg dark:hover:bg-relay-bg-dark transition-colors"
          aria-label="Back"
        >
          <span className="material-symbols-outlined">arrow_back</span>
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
          Bio
        </h2>
        <p className="text-[10px] text-relay-muted dark:text-relay-muted-light mb-10 leading-relaxed">
          Add a short intro to your profile.
        </p>

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 mb-4" role="alert">
            {error}
          </p>
        )}

        <div className="mb-10">
          <label htmlFor="bio" className="block text-[10px] text-relay-muted mb-2 uppercase tracking-tight">
            Bio
          </label>
          <div className="group relative">
            <div className="bg-relay-bg dark:bg-relay-bg-dark rounded-xl px-4 border border-relay-border dark:border-relay-border-dark group-focus-within:border-primary/80 transition-colors auth-input-card">
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
                placeholder="Tell people a little about you…"
                rows={4}
                className="block w-full py-3 bg-transparent text-relay-text dark:text-relay-text-dark placeholder-relay-muted focus:ring-0 focus:outline-none text-xs font-medium tracking-tighter resize-none"
                autoFocus
              />
            </div>
            <div className="mt-2 flex justify-end">
              <span className="text-[10px] text-relay-muted dark:text-relay-muted-light font-medium tracking-tight">
                {bio.length} / {BIO_MAX}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

