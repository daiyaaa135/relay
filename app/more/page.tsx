'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { type } from '@/lib/typography';
import { ListingsIcon } from '@/app/components/ListingsIcon';
import { WalletIcon } from '@/app/components/WalletIcon';
import { ProfileIcon } from '@/app/components/ProfileIcon';
import { SettingsIcon } from '@/app/components/SettingsIcon';
import { SwapsIcon } from '@/app/components/SwapsIcon';
import { fetchProfile, fetchFollowerCount, type Profile } from '@/lib/profiles';
import { getDefaultAvatar } from '@/lib/avatars';

export default function MorePage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [followingCount, setFollowingCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      const loggedIn = !!user?.id;
      setIsLoggedIn(loggedIn);
      if (!loggedIn || !user?.id) {
        setProfileLoading(false);
        return;
      }

      try {
        const [p, followers, following] = await Promise.all([
          fetchProfile(user.id),
          fetchFollowerCount(user.id),
          (async () => {
            const { data, error } = await supabase
              .from('profile_follows')
              .select('follower_id')
              .eq('follower_id', user.id);
            const count = Array.isArray(data) ? data.length : 0;
            if (error) return 0;
            return count ?? 0;
          })(),
        ]);
        if (cancelled) return;
        if (p) setProfile(p);
        setFollowerCount(followers);
        setFollowingCount(following);
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (isLoggedIn === false) router.replace('/welcome');
  }, [isLoggedIn, router]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    router.push('/');
    router.refresh();
  };

  const menuItems = [
    { label: 'Wallet', icon: 'account_balance_wallet', path: '/wallet', desc: 'Credits & Assets', iconComponent: WalletIcon },
    { label: 'Membership', icon: 'military_tech', path: '/pricing', desc: 'Pro Access Plan', highlight: true },
    { label: 'My Swaps', icon: 'shopping_bag', path: '/swaps', desc: 'Active Exchanges', iconComponent: SwapsIcon },
    { label: 'My Listings', icon: 'inventory_2', path: '/listings', desc: 'Listings & Swapped Items', iconComponent: ListingsIcon },
    { label: 'Settings', icon: 'settings', path: '/settings', desc: 'Preferences', iconComponent: SettingsIcon },
  ];

  if (isLoggedIn === null) {
    return (
      <div className="flex h-full items-center justify-center bg-relay-surface dark:bg-relay-surface-dark">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark transition-colors">
      <header className="shrink-0 z-30 px-6 pb-0 bg-relay-surface dark:bg-relay-surface-dark pt-safe-5">
        <div className="rounded-3xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark px-5 py-5 shadow-sm">
          <div className="flex items-center gap-4">
            {profileLoading ? (
              <>
                <div className="size-16 rounded-full bg-relay-surface dark:bg-relay-surface-dark animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-relay-surface dark:bg-relay-surface-dark rounded animate-pulse" />
                  <div className="h-3 w-24 bg-relay-surface dark:bg-relay-surface-dark rounded animate-pulse" />
                  <div className="h-3 w-28 bg-relay-surface dark:bg-relay-surface-dark rounded animate-pulse" />
                </div>
              </>
            ) : (
              <>
                <div className="size-16 rounded-full overflow-hidden bg-relay-surface dark:bg-relay-surface-dark border border-relay-border dark:border-relay-border-dark flex items-center justify-center">
                  {profile ? (
                    <img
                      src={profile.avatar_url || getDefaultAvatar(profile.id ?? profile.display_name)}
                      alt={profile.display_name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-relay-muted text-[32px]">person</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium text-relay-text dark:text-relay-text-dark truncate">
                    {profile?.display_name ?? 'User'}
                  </p>
                  <p className="text-xs text-relay-muted dark:text-relay-muted-light mt-0.5 truncate">
                    @{(profile?.display_name ?? 'user').toString().replace(/\s+/g, '').toLowerCase()}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (!profile) return;
                      const username = (profile.display_name ?? '').trim() || 'user';
                      router.push(`/profile/${encodeURIComponent(username)}`);
                    }}
                    className="mt-1 text-xs font-semibold text-primary hover:opacity-90 active:opacity-80 transition-colors"
                  >
                    View public profile
                  </button>
                </div>
              </>
            )}
          </div>
          <div className="mt-5 grid grid-cols-3 divide-x divide-relay-border/60 dark:divide-relay-border-dark/60">
            <button onClick={() => router.push('/following')} className="flex flex-col items-center justify-center px-2 active:opacity-60 transition-opacity">
              <span className="text-sm font-semibold text-relay-text dark:text-relay-text-dark">
                {profileLoading ? '—' : followingCount.toLocaleString()}
              </span>
              <span className="mt-1 text-[10px] font-medium text-relay-muted dark:text-relay-muted-light">
                Following
              </span>
            </button>
            <button onClick={() => router.push('/followers')} className="flex flex-col items-center justify-center px-2 active:opacity-60 transition-opacity">
              <span className="text-sm font-semibold text-relay-text dark:text-relay-text-dark">
                {profileLoading ? '—' : followerCount.toLocaleString()}
              </span>
              <span className="mt-1 text-[10px] font-medium text-relay-muted dark:text-relay-muted-light">
                Followers
              </span>
            </button>
            <button
              onClick={() => router.push('/wallet')}
              className="flex flex-col items-center justify-center px-2 active:opacity-60 transition-opacity"
            >
              <span className="text-sm font-semibold text-relay-text dark:text-relay-text-dark">
                {profileLoading ? '—' : `${(profile?.credits_balance ?? 0).toLocaleString()} Cr`}
              </span>
              <span className="mt-1 text-[10px] font-medium text-relay-muted dark:text-relay-muted-light">
                Credits
              </span>
            </button>
          </div>
        </div>
      </header>

      <div className="page-scroll">
      <div className="pb-20">
      <div className="px-6 pt-3 space-y-3">
        {menuItems.map((item, idx) => {
          const IconComponent = 'iconComponent' in item ? item.iconComponent : null;
          return (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            style={{ transitionDelay: `${idx * 50}ms` }}
            className="w-full flex items-center gap-4 py-3.5 px-4 rounded-[28px] bg-relay-bg dark:bg-relay-bg-dark active-scale transition-all group"
          >
            <div className={`size-11 rounded-full flex items-center justify-center shrink-0 transition-all ${item.highlight ? 'bg-primary text-white shadow-xl shadow-primary/30' : 'bg-relay-surface dark:bg-relay-surface-dark text-relay-muted group-hover:text-primary'}`}>
              {IconComponent ? (
                <IconComponent className="size-6 shrink-0 text-current" />
              ) : 'image' in item && item.image && typeof item.image === 'string' ? (
                <img src={item.image} alt="" className="size-6 object-contain dark:invert" />
              ) : (
                <span className="material-symbols-outlined !text-xl">{item.icon}</span>
              )}
            </div>
            <div className="flex-1 text-left min-w-0">
              <h4 className="text-sm font-medium text-relay-text dark:text-relay-text-dark">
                {item.label}
              </h4>
              <p className="text-[10px] text-relay-muted dark:text-relay-muted-light font-medium mt-1 tracking-widest opacity-40 dark:opacity-60 group-hover:opacity-100 transition-opacity">{item.desc}</p>
            </div>
            <span className="material-symbols-outlined text-relay-border dark:text-relay-border-dark group-hover:text-primary transition-colors">arrow_right_alt</span>
          </button>
          );
        })}
      </div>

      <div className="mt-8 px-8 flex justify-center">
        {isLoggedIn === true && (
          <button
            type="button"
            onClick={handleSignOut}
            className="text-relay-muted text-xs font-medium hover:text-primary underline underline-offset-2 active-scale transition-colors"
          >
            Log out
          </button>
        )}
      </div>
      </div>
      </div>
    </div>
  );
}
