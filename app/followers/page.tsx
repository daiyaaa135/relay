'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { getDefaultAvatar } from '@/lib/avatars';
import { PageHeader } from '@/app/components/PageHeader';

interface UserRow {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export default function FollowersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) { router.replace('/login'); return; }

      const { data } = await supabase
        .from('profile_follows')
        .select('follower:profiles!follower_id(id, display_name, avatar_url)')
        .eq('following_id', user.id)
        .order('created_at', { ascending: false });

      if (!cancelled) {
        setUsers(
          (data ?? [])
            .map((r) => r.follower as unknown as UserRow)
            .filter(Boolean)
        );
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PageHeader
        className="z-40 glass-card !px-4 !pb-3 !bg-transparent !border-0 border-b border-relay-border dark:border-relay-border-dark"
        style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
      >
        <h1 className="font-semibold text-relay-text dark:text-relay-text-dark text-base">Followers</h1>
      </PageHeader>

      <div className="page-scroll">
        <div className="pb-8">
          {loading ? (
            <div className="px-4 pt-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-2">
                  <div className="size-11 rounded-full bg-relay-border dark:bg-relay-border-dark animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-32 rounded bg-relay-border dark:bg-relay-border-dark animate-pulse" />
                    <div className="h-2.5 w-20 rounded bg-relay-border dark:bg-relay-border-dark animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-24 px-8 text-center">
              <span className="material-symbols-outlined text-4xl text-relay-muted mb-3">group</span>
              <p className="text-relay-text dark:text-relay-text-dark font-semibold">No followers yet</p>
              <p className="text-relay-muted dark:text-relay-muted-light text-sm mt-1">Share your profile to get your first follower.</p>
            </div>
          ) : (
            <ul className="px-4 pt-4 space-y-1">
              {users.map((u) => (
                <li key={u.id}>
                  <Link
                    href={`/profile/${encodeURIComponent(u.display_name ?? u.id)}`}
                    className="flex items-center gap-3 px-2 py-2.5 rounded-xl active:bg-relay-border/40 dark:active:bg-relay-border-dark/40 transition-colors"
                  >
                    <img
                      src={u.avatar_url ?? getDefaultAvatar(u.id)}
                      alt={u.display_name}
                      className="size-11 rounded-full object-cover shrink-0 border border-relay-border dark:border-relay-border-dark"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-relay-text dark:text-relay-text-dark truncate">{u.display_name}</p>
                      <p className="text-xs text-relay-muted dark:text-relay-muted-light truncate">@{u.display_name}</p>
                    </div>
                    <span className="material-symbols-outlined text-relay-muted text-base shrink-0">chevron_right</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
