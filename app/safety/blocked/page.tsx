'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { fetchBlockedProfiles, unblockUser, type BlockedProfile } from '@/lib/blocks';
import { getDefaultAvatar } from '@/lib/avatars';
import { PageHeader } from '@/app/components/PageHeader';

export default function BlockedAccountsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<BlockedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      setUserId(user?.id ?? null);
      if (!user?.id) {
        setLoading(false);
        return;
      }
      const list = await fetchBlockedProfiles(user.id);
      if (!cancelled) setBlocked(list);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleUnblock = async (blockedId: string) => {
    if (!userId) return;
    setUnblockingId(blockedId);
    const err = await unblockUser(userId, blockedId);
    setUnblockingId(null);
    if (!err) {
      setBlocked((prev) => prev.filter((b) => b.id !== blockedId));
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark transition-colors">
      <PageHeader className="bg-transparent border-b-0">
        <h1 className="text-2xl font-serif text-relay-text dark:text-relay-text-dark tracking-tighter">Blocked Accounts</h1>
      </PageHeader>
      <div className="page-scroll" style={{ marginTop: '-1px' }}>
      <div className="px-6 py-10 pb-20">
        {loading ? (
          <div className="flex justify-center py-20">
            <span className="size-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : blocked.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="size-20 rounded-full bg-relay-bg dark:bg-relay-bg-dark flex items-center justify-center border border-relay-border dark:border-relay-border-dark mb-6">
              <span className="material-symbols-outlined text-relay-muted !text-4xl">block</span>
            </div>
            <p className="text-sm text-relay-muted dark:text-relay-muted-light font-light max-w-[260px] leading-relaxed ">
              You haven&apos;t blocked anyone yet. Blocked users won&apos;t be able to message you or see your listings.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {blocked.map((profile) => (
              <div
                key={profile.id}
                className="flex items-center gap-4 p-5 rounded-3xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark"
              >
                <Link
                  href={`/profile/${profile.id}`}
                  className="flex items-center gap-4 flex-1 min-w-0"
                >
                  <img
                    src={profile.avatar_url || getDefaultAvatar(profile.id)}
                    alt=""
                    className="size-12 rounded-full object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-relay-text dark:text-relay-text-dark truncate">
                      {profile.display_name}
                    </p>
                    <p className="text-[10px] text-relay-muted">Blocked</p>
                  </div>
                </Link>
                <button
                  onClick={() => handleUnblock(profile.id)}
                  disabled={unblockingId === profile.id}
                  className="px-4 py-2 rounded-xl text-xs font-semibold tracking-widest bg-relay-surface dark:bg-relay-surface-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark hover:bg-primary hover:text-white hover:border-primary transition-all disabled:opacity-50"
                >
                  {unblockingId === profile.id ? '...' : 'Unblock'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
