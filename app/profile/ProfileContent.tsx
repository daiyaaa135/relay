'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { fetchProfile, fetchExchangeCount, fetchFollowerCount, isFollowing, followProfile, unfollowProfile, type Profile } from '@/lib/profiles';
import { fetchGadgetsByProfileId } from '@/lib/gadgets';
import { getOrCreateConversation } from '@/lib/conversations';
import type { Gadget } from '@/lib/types';
import { RatingDisplay } from '@/app/components/RatingDisplay';
import { getDefaultAvatar } from '@/lib/avatars';
import type { ProfileReviewRow } from '@/app/api/profiles/[profileId]/reviews/route';
import { formatJoinedDate } from '@/lib/dateFormatters';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface ProfileContentProps {
  /** Display name (for /profile/[username]) or pass profileId when known */
  username?: string;
  /** When viewing own profile, pass the user's profile id so we fetch by id */
  profileId?: string;
  /** True when viewing your own profile */
  isSelf?: boolean;
}

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sec = (now.getTime() - d.getTime()) / 1000;
  if (sec < 60) return 'Just now';
  if (sec < 3600) return `${Math.floor(sec / 60)} minutes ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hours ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)} days ago`;
  if (sec < 2592000) return `${Math.floor(sec / 604800)} weeks ago`;
  if (sec < 31536000) return `${Math.floor(sec / 2592000)} months ago`;
  return `${Math.floor(sec / 31536000)} years ago`;
}

export default function ProfileContent({ username, profileId: profileIdProp, isSelf: isSelfProp }: ProfileContentProps) {
  const router = useRouter();
  const [tab, setTab] = useState<'active' | 'swapped' | 'reviews'>('active');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [exchangeCount, setExchangeCount] = useState<number>(0);
  const [followerCount, setFollowerCount] = useState<number>(0);
  const [following, setFollowing] = useState<boolean>(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeGadgets, setActiveGadgets] = useState<Gadget[]>([]);
  const [swappedGadgets, setSwappedGadgets] = useState<Gadget[]>([]);
  const [reviews, setReviews] = useState<ProfileReviewRow[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const isSelf = isSelfProp ?? false;
  const identifier = profileIdProp ?? username ?? '';

  useEffect(() => {
    if (!identifier) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    (async () => {
      const p = await fetchProfile(identifier);
      if (cancelled) return;
      setProfile(p);
      if (!p) {
        if (!cancelled) setLoading(false);
        return;
      }
      const [count, followers, active, swapped] = await Promise.all([
        fetchExchangeCount(p.id),
        fetchFollowerCount(p.id),
        fetchGadgetsByProfileId(p.id, 'active'),
        fetchGadgetsByProfileId(p.id, 'swapped'),
      ]);
      if (cancelled) return;
      setExchangeCount(count);
      setFollowerCount(followers);
      setActiveGadgets(active);
      setSwappedGadgets(swapped);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [identifier]);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null)).catch(() => setCurrentUserId(null));
  }, []);

  useEffect(() => {
    if (!currentUserId || !profile?.id || isSelf) return;
    let cancelled = false;
    isFollowing(currentUserId, profile.id).then((v) => { if (!cancelled) setFollowing(v); });
    return () => { cancelled = true; };
  }, [currentUserId, profile?.id, isSelf]);

  useEffect(() => {
    if (!profile?.id) {
      setReviews([]);
      return;
    }
    let cancelled = false;
    setReviewsLoading(true);
    fetch(`/api/profiles/${profile.id}/reviews`)
      .then((res) => res.ok ? res.json() : [])
      .then((data) => { if (!cancelled) setReviews(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setReviews([]); })
      .finally(() => { if (!cancelled) setReviewsLoading(false); });
    return () => { cancelled = true; };
  }, [profile?.id]);

  const handleFollowClick = async () => {
    if (!profile || isSelf || !currentUserId) {
      if (!currentUserId) router.push('/login');
      return;
    }
    Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
    });
    setFollowLoading(true);
    const fn = following ? unfollowProfile : followProfile;
    const err = await fn(currentUserId, profile.id);
    setFollowLoading(false);
    if (err) {
      alert(err);
      return;
    }
    setFollowing(!following);
    setFollowerCount((c) => (following ? Math.max(0, c - 1) : c + 1));
  };

  const handleMessageClick = async () => {
    if (!profile || isSelf) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    const firstListing = activeGadgets[0];
    if (!firstListing?.sellerId || firstListing.sellerId === user.id) {
      router.push('/messages');
      return;
    }
    setMessageLoading(true);
    const result = await getOrCreateConversation(firstListing.id, user.id, firstListing.sellerId);
    setMessageLoading(false);
    if ('error' in result) {
      router.push('/messages');
      return;
    }
    router.push(`/messages/${result.conversationId}`);
  };

  const displayName = profile?.display_name ?? (username ? decodeURIComponent(username) : 'User');
  const displayBio = (profile?.bio?.trim() ?? '').trim();
  const avatarUrl = profile?.avatar_url || getDefaultAvatar(profile?.id ?? displayName);
  const rating = profile ? profile.rating : 0;
  const ratingCount = profile ? profile.rating_count : 0;
  const items = tab === 'active' ? activeGadgets : tab === 'swapped' ? swappedGadgets : [];

  if (loading) {
    return (
      <div className="flex flex-1 min-h-0 items-center justify-center bg-relay-surface dark:bg-relay-surface-dark">
        <div className="size-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!profile && identifier) {
    return (
      <div className="flex flex-col flex-1 min-h-0 items-center justify-center bg-relay-surface dark:bg-relay-surface-dark px-6 gap-6">
        <p className="text-relay-muted text-sm text-center">Profile not found.</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="h-8 px-8 bg-primary text-white text-xs font-semibold tracking-tight rounded-2xl"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark transition-colors">
      <header className="shrink-0 px-6 pb-10 flex flex-col items-center text-center" style={{ paddingTop: 'max(3rem, env(safe-area-inset-top))' }}>
        <div className="flex w-full justify-between items-center mb-10">
          <button
            onClick={() => router.push('/')}
            className="text-relay-muted hover:text-relay-text dark:hover:text-relay-text-dark transition-colors size-10 flex items-center justify-center rounded-full bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark active-scale"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          {isSelf ? (
            <button
              onClick={() => router.push('/settings')}
              className="text-relay-muted hover:text-relay-text dark:hover:text-relay-text-dark transition-colors size-10 flex items-center justify-center rounded-full bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark active-scale"
            >
              <span className="material-symbols-outlined">settings</span>
            </button>
          ) : (
            <button
              onClick={handleMessageClick}
              disabled={messageLoading}
              className="size-10 flex items-center justify-center rounded-full bg-relay-surface dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark shadow-sm active-scale disabled:opacity-60"
            >
              {messageLoading ? <span className="size-5 border-2 border-relay-border border-t-relay-text dark:border-t-relay-text-dark rounded-full animate-spin" /> : <span className="material-symbols-outlined !text-[22px]">chat_bubble</span>}
            </button>
          )}
        </div>

        <div className="relative mb-8">
          <div className="size-32 bg-relay-bg dark:bg-relay-bg-dark rounded-full overflow-hidden border-2 border-primary/20 p-1.5 shadow-2xl">
            <img
              src={avatarUrl}
              alt="Profile"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          {profile?.membership_tier === 'relay_plus' && (
            <div className="absolute bottom-1 right-1 w-8 h-8 bg-primary text-white flex items-center justify-center rounded-full border-4 border-relay-surface dark:border-relay-surface-dark shadow-xl shadow-primary/20">
              <span className="material-symbols-outlined !text-[18px] font-bold">check</span>
            </div>
          )}
        </div>

        <h1 className="font-serif text-4xl font-bold text-relay-text dark:text-relay-text-dark tracking-tighter">{displayName}</h1>
        {profile?.created_at && (
          <p className="text-[10px] font-normal text-relay-muted dark:text-relay-muted-light mb-4">
            {formatJoinedDate(profile.created_at)}
          </p>
        )}
        <div className="flex items-center gap-8 mb-8">
          <RatingDisplay rating={rating} count={ratingCount} size="md" />
          <div className="h-4 w-px bg-relay-border dark:border-relay-border-dark" />
          <div className="text-[10px] tracking-tight text-relay-muted">
            <span className="font-bold text-relay-text dark:text-relay-text-dark">{followerCount}</span> Followers
          </div>
          <div className="h-4 w-px bg-relay-border dark:border-relay-border-dark" />
          <div className="text-[10px] tracking-tight text-relay-muted">
            <span className="font-bold text-relay-text dark:text-relay-text-dark">{exchangeCount}</span> Exchanges
          </div>
        </div>
        {displayBio && (
          <p className="text-sm font-light text-relay-muted dark:text-relay-muted-light max-w-[300px] leading-relaxed ">
            &quot;{displayBio}&quot;
          </p>
        )}

        {!isSelf && (
          <div className="mt-8 flex gap-6 w-full">
            <button
              onClick={handleMessageClick}
              disabled={messageLoading}
              className="flex-1 h-8 bg-primary text-white text-[10px] font-bold tracking-tight rounded-xl shadow-xl shadow-primary/20 active-scale transition-all disabled:opacity-60"
            >
              {messageLoading ? 'Opening…' : 'Message'}
            </button>
            <button
              type="button"
              onClick={handleFollowClick}
              disabled={followLoading}
              className={`flex-1 h-8 border text-[10px] font-bold tracking-tight rounded-xl active-scale transition-all disabled:opacity-60 ${
                following
                  ? 'border-transparent bg-primary/10 text-primary'
                  : 'border-transparent text-relay-text dark:text-relay-text-dark'
              }`}
            >
              {followLoading ? '…' : following ? 'Following' : 'Follow'}
            </button>
          </div>
        )}
      </header>

      <div className="w-full mb-10 bg-transparent z-20 transition-colors">
        <div className="flex px-6">
          <button
            onClick={() => setTab('active')}
            className={`flex-1 pb-4 text-[10px] font-bold tracking-tight transition-all border-b-2 ${
              tab === 'active' ? 'text-primary' : 'border-transparent text-relay-muted dark:text-relay-muted-light'
            }`}
            style={{ borderBottomColor: tab === 'active' ? '#FF5721' : 'transparent', borderBottomWidth: 2 }}
          >
            Active Listings
          </button>
          <button
            onClick={() => setTab('swapped')}
            className={`flex-1 pb-4 text-[10px] font-bold tracking-tight transition-all border-b-2 ${
              tab === 'swapped' ? 'text-primary' : 'border-transparent text-relay-muted dark:text-relay-muted-light'
            }`}
            style={{ borderBottomColor: tab === 'swapped' ? '#FF5721' : 'transparent', borderBottomWidth: 2 }}
          >
            Swapped
          </button>
          <button
            onClick={() => setTab('reviews')}
            className={`flex-1 pb-4 text-[10px] font-bold tracking-tight transition-all border-b-2 ${
              tab === 'reviews' ? 'text-primary' : 'border-transparent text-relay-muted dark:text-relay-muted-light'
            }`}
            style={{ borderBottomColor: tab === 'reviews' ? '#FF5721' : 'transparent', borderBottomWidth: 2 }}
          >
            Reviews
          </button>
        </div>
      </div>

      {tab === 'reviews' ? (
        <div className="flex-1 overflow-y-auto px-6 pb-32 hide-scrollbar scroll-bounce">
          {reviewsLoading ? (
            <div className="flex justify-center py-16">
              <div className="size-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-relay-muted dark:text-relay-muted-light text-sm">No reviews yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-relay-border dark:divide-relay-border-dark">
              {reviews.map((rev) => (
                <li key={rev.id} className="py-4 first:pt-0">
                  <div className="p-4 rounded-2xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark">
                    <div className="flex items-center gap-3">
                      <div className="size-10 shrink-0 rounded-full overflow-hidden border border-relay-border dark:border-relay-border-dark">
                        <img
                          src={rev.rater_avatar_url || getDefaultAvatar(rev.rater_display_name)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-relay-text dark:text-relay-text-dark truncate">
                          {rev.rater_display_name}
                        </span>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className={`material-symbols-outlined !text-base ${star <= rev.rating ? 'text-primary' : 'text-relay-muted dark:text-relay-muted-light opacity-40'}`}
                              style={star <= rev.rating ? { fontVariationSettings: "'FILL' 1" } : undefined}
                            >
                              star
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className="text-[11px] font-normal text-relay-muted dark:text-relay-muted-light shrink-0">
                        {formatRelativeTime(rev.created_at)}
                      </span>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm font-normal text-relay-text dark:text-relay-text-dark line-clamp-2">
                        {rev.comment || 'No comment.'}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <div className="size-10 shrink-0 rounded-lg overflow-hidden border border-relay-border dark:border-relay-border-dark bg-relay-surface dark:bg-relay-surface-dark">
                        {rev.gadget_image ? (
                          <img src={rev.gadget_image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined !text-lg text-relay-muted dark:text-relay-muted-light">inventory_2</span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-normal text-relay-muted dark:text-relay-muted-light">Swapped for</p>
                        <p className="text-sm font-semibold text-relay-text dark:text-relay-text-dark truncate">{rev.gadget_name}</p>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
      <div className="grid grid-cols-2 gap-6 px-6 pb-32">
        {items.length === 0 ? (
          <div className="col-span-2 py-16 text-center">
            <p className="text-relay-muted dark:text-relay-muted-light text-sm">{tab === 'active' ? 'No active listings.' : 'No swapped items.'}</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              onClick={() => router.push(`/listing/${item.id}`)}
              className="group cursor-pointer flex flex-col gap-4 active-scale transition-all duration-300"
            >
              <div className="relative aspect-[3/4] bg-relay-bg dark:bg-relay-bg-dark overflow-hidden rounded-[32px] border border-relay-border dark:border-relay-border-dark shadow-sm">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all duration-1000 group-hover:scale-110" />
                {tab === 'active' && (
                  <div className="absolute top-4 right-4 bg-primary text-white px-3 py-1.5 text-[8px] font-bold tracking-[0.3em] rounded-full shadow-lg shadow-primary/20">
                    Active
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1 px-2">
                <h3 className="font-serif text-sm  text-relay-text dark:text-relay-text-dark group-hover:text-primary transition-colors leading-tight">{item.name}</h3>
                <div className="flex justify-between items-center">
                  <p className="text-[8px] tracking-[0.2em] text-relay-muted">{item.category}</p>
                  <span className="text-[10px] font-display font-bold text-primary">{item.credits} Cr</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      )}

      {isSelf && (
        <div className="fixed bottom-32 right-8">
          <button
            onClick={() => router.push('/list')}
            className="size-16 bg-primary text-white rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center active-scale transition-all"
            style={{ minWidth: 14, minHeight: 14, margin: 2 }}
          >
            <span className="material-symbols-outlined text-4xl">add</span>
          </button>
        </div>
      )}
    </div>
  );
}
