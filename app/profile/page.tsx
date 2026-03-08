'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import ProfileContent from './ProfileContent';

export default function ProfilePage() {
  const router = useRouter();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const supabase = createClient();
        const hasHash = typeof window !== 'undefined' && !!window.location.hash;
        const hash = typeof window !== 'undefined' ? window.location.hash : '';
        const hasAccessTokenHash = hash.includes('access_token=');
        const hasCodeQuery =
          typeof window !== 'undefined' &&
          new URLSearchParams(window.location.search).has('code');
        const hasAuthStorage =
          typeof window !== 'undefined' &&
          (() => {
            try {
              const keys = Object.keys(window.localStorage ?? {});
              return keys.some((k) => k.includes('auth-token'));
            } catch {
              return false;
            }
          })();

        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        if (!user) {
          setProfileId(null);
          setDisplayName(null);
          setLoading(false);
          return;
        }
        let { data: profile } = await supabase
          .from('profiles')
          .select('id, display_name')
          .eq('id', user.id)
          .single();
        if (cancelled) return;
        if (!profile) {
          const name = (user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User').toString().slice(0, 100);
          const { error: upsertError } = await supabase.from('profiles').upsert(
            { id: user.id, display_name: name },
            { onConflict: 'id' }
          );
          if (!upsertError) {
            profile = { id: user.id, display_name: name };
          }
        }
        setProfileId(profile?.id ?? user.id);
        setDisplayName(profile?.display_name ?? user.email?.split('@')[0] ?? 'User');
      } catch {
        if (!cancelled) setError('Could not load profile.');
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!loading && displayName === null) router.replace('/login');
  }, [loading, displayName, router]);

  if (loading) {
    return (
      <div className="flex flex-1 min-h-0 items-center justify-center bg-relay-surface dark:bg-relay-surface-dark">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 min-h-0 items-center justify-center bg-relay-surface dark:bg-relay-surface-dark px-6">
        <p className="text-sm text-center text-relay-text dark:text-relay-text-dark">{error}</p>
      </div>
    );
  }

  if (displayName === null) {
    return (
      <div className="flex flex-1 min-h-0 items-center justify-center bg-relay-surface dark:bg-relay-surface-dark">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return <ProfileContent profileId={profileId ?? undefined} username={displayName ?? undefined} isSelf />;
}
