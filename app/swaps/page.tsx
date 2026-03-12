'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { fetchMySwaps, type SwapRow } from '@/lib/swaps';
import { type } from '@/lib/typography';
import { ChevronIcon } from '@/app/components/ChevronIcon';
import { PageHeader } from '@/app/components/PageHeader';
import { NextStepButton } from '@/app/components/NextStepButton';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  pickup_arranged: 'Pickup arranged',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function formatDate(createdAt: string): string {
  const d = new Date(createdAt);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

type RatingModalState = { swapId: string; itemName: string } | null;
type CancelModalState = { swapId: string; sellerName: string } | null;

export default function SwapsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [profileId, setProfileId] = useState<string | null>(null);
  const [swaps, setSwaps] = useState<SwapRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelModal, setCancelModal] = useState<CancelModalState>(null);
  const [ratedSwapIds, setRatedSwapIds] = useState<Set<string>>(new Set());
  const [ratingModal, setRatingModal] = useState<RatingModalState>(null);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        setAuthChecked(true);
        if (!user?.id) { setLoading(false); return; }
        setProfileId(user.id);
        const list = await fetchMySwaps(user.id);
        if (cancelled) return;
        setSwaps(list);

        // Fetch which completed swaps this user has already rated
        const completedIds = list.filter((s) => s.status === 'completed').map((s) => s.id);
        if (completedIds.length > 0) {
          const { data: ratings } = await supabase
            .from('swap_ratings')
            .select('swap_id')
            .eq('rater_profile_id', user.id)
            .in('swap_id', completedIds);
          if (!cancelled && ratings) {
            setRatedSwapIds(new Set(ratings.map((r: { swap_id: string }) => r.swap_id)));
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleCancelSwap = async () => {
    if (!cancelModal) return;
    const swapId = cancelModal.swapId;
    setCancellingId(swapId);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { alert('Session expired. Please sign in again.'); return; }
      const res = await fetch(`/api/swaps/${swapId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setCancelModal(null);
        setSwaps((prev) => prev.map((s) => s.id === swapId ? { ...s, status: 'cancelled' } : s));
      } else {
        alert((body as { error?: string }).error ?? 'Could not cancel swap. Try again.');
      }
    } finally {
      setCancellingId(null);
    }
  };

  const openRatingModal = (swap: SwapRow) => {
    const raw = swap.gadget;
    const gadget = Array.isArray(raw) ? raw[0] : raw;
    setRatingModal({ swapId: swap.id, itemName: gadget?.name ?? 'Unknown item' });
    setRatingStars(0);
    setRatingComment('');
    setRatingError(null);
  };

  const handleSubmitRating = async () => {
    if (!ratingModal || ratingStars < 1 || ratingStars > 5 || ratingSubmitting) return;
    import('@capacitor/haptics').then(({ Haptics, ImpactStyle }) => {
      Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
      });
    }).catch(() => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
    });
    setRatingSubmitting(true);
    setRatingError(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setRatingError('Session expired.'); return; }
      const res = await fetch(`/api/swaps/${ratingModal.swapId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ rating: ratingStars, comment: ratingComment.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setRatedSwapIds((prev) => new Set([...prev, ratingModal.swapId]));
        setRatingModal(null);
      } else {
        setRatingError((data as { error?: string }).error ?? 'Could not submit rating.');
      }
    } finally {
      setRatingSubmitting(false);
    }
  };

  const incoming = swaps.filter((s) => s.seller_profile_id === profileId);
  const outgoing = swaps.filter((s) => s.buyer_profile_id === profileId);
  const list = activeTab === 'incoming' ? incoming : outgoing;

  if (!authChecked || loading) {
    return (
      <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark transition-colors">
        <PageHeader>
          <h1 className={`${type.h1} !font-semibold text-relay-text dark:text-relay-text-dark`}>My Swaps</h1>
        </PageHeader>
        <div className="flex-1 flex items-center justify-center px-6">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
        </div>
      </div>
    );
  }

  if (!profileId) {
    return (
      <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark transition-colors">
        <PageHeader>
          <h1 className={`${type.h1} !font-semibold text-relay-text dark:text-relay-text-dark`}>My Swaps</h1>
        </PageHeader>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <p className="text-relay-muted text-sm mb-4">Log in to see your swaps.</p>
          <NextStepButton type="button" onClick={() => router.push('/login')} className="px-10 py-3 rounded-xl tracking-widest">
            Log in
          </NextStepButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark transition-colors">
      <PageHeader>
        <h1 className={`${type.h1} !font-semibold text-relay-text dark:text-relay-text-dark`}>My Swaps</h1>
      </PageHeader>
      <header className="shrink-0 z-30 px-6 pb-0 border-b border-relay-border dark:border-relay-border-dark bg-relay-surface/95 dark:bg-relay-surface-dark/95" style={{ marginTop: '-0.5rem' }}>
        <div className="flex gap-8 px-6 pt-2 pb-4">
          <button
            onClick={() => setActiveTab('incoming')}
            className={`pb-4 text-[10px] font-bold tracking-tight transition-all border-b-2 ${
              activeTab === 'incoming'
                ? 'border-relay-text dark:border-relay-text-dark text-relay-text dark:text-relay-text-dark'
                : 'border-transparent text-relay-muted'
            }`}
          >
            Incoming <span className="ml-1 opacity-50">{incoming.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('outgoing')}
            className={`pb-4 text-[10px] font-bold tracking-tight transition-all border-b-2 ${
              activeTab === 'outgoing'
                ? 'border-relay-text dark:border-relay-text-dark text-relay-text dark:text-relay-text-dark'
                : 'border-transparent text-relay-muted'
            }`}
          >
            Outgoing <span className="ml-1 opacity-50">{outgoing.length}</span>
          </button>
        </div>
      </header>

      <div className="page-scroll" style={{ marginTop: '-1px' }}>
      <div className="px-6 pt-0 pb-20 space-y-8">
        {list.map((swap) => {
          const raw = swap.gadget;
          const gadget = Array.isArray(raw) ? raw[0] : raw;
          const img = gadget?.image_urls?.[0] ?? 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=400';
          const itemName = gadget?.name ?? 'Unknown item';
          const statusLabel = STATUS_LABEL[swap.status] ?? swap.status;
          const isCompleted = swap.status === 'completed';
          const isBuyer = swap.buyer_profile_id === profileId;
          const canCancel = isBuyer && swap.status === 'pending';
          const canRate = isCompleted && isBuyer && !ratedSwapIds.has(swap.id);
          const rawSeller = swap.seller;
          const sellerProfile = Array.isArray(rawSeller) ? rawSeller[0] : rawSeller;
          const sellerName = sellerProfile?.display_name ?? 'the seller';

          return (
            <div key={swap.id} className="flex gap-4 group">
              <div
                onClick={() => router.push(`/listing/${swap.gadget_id}`)}
                className="size-20 bg-relay-bg dark:bg-relay-bg-dark rounded-xl overflow-hidden border border-relay-border dark:border-relay-border-dark shrink-0 cursor-pointer active-scale transition-all"
              >
                <img
                  src={img}
                  alt={itemName}
                  loading="lazy"
                  className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all"
                />
              </div>
              <div className="flex-1 flex flex-col justify-between py-1">
                <div className="flex justify-between items-start">
                  <div
                    onClick={() => router.push(`/listing/${swap.gadget_id}`)}
                    className="cursor-pointer"
                  >
                    <h3 className="text-relay-text dark:text-relay-text-dark font-serif  text-base leading-tight group-hover:text-primary transition-colors">{itemName}</h3>
                    <p className="text-[10px] text-relay-muted font-bold tracking-widest mt-1">{swap.id.slice(0, 8)}… • {formatDate(swap.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-bold text-relay-text dark:text-relay-text-dark tracking-tighter">{swap.credits_amount}</span>
                    <span className="block text-[8px] text-primary font-bold tracking-widest">Cr</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className={`size-1.5 rounded-full ${isCompleted ? 'bg-green-500' : swap.status === 'cancelled' ? 'bg-relay-muted' : 'bg-primary'}`} />
                    <span className={`text-[9px] font-bold tracking-widest ${isCompleted ? 'text-relay-muted' : swap.status === 'cancelled' ? 'text-relay-muted' : 'text-primary'}`}>{statusLabel}</span>
                  </div>
                  {canRate && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openRatingModal(swap); }}
                      className="text-[9px] font-bold tracking-widest text-primary border border-primary/30 px-2 py-0.5 rounded-full hover:bg-primary/10 transition-colors active-scale"
                    >
                      Rate
                    </button>
                  )}
                  {canCancel && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setCancelModal({ swapId: swap.id, sellerName }); }}
                      disabled={cancellingId === swap.id}
                      className="text-[9px] font-bold tracking-widest text-relay-text border border-relay-border px-2 py-0.5 rounded-full hover:bg-relay-bg dark:hover:bg-relay-bg-dark transition-colors active-scale disabled:opacity-50"
                    >
                      {cancellingId === swap.id ? '…' : 'Cancel'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {list.length === 0 && (
          <div className="py-20 text-center">
            <span className="material-symbols-outlined text-4xl text-relay-border dark:text-relay-border-dark mb-4">inventory_2</span>
            <p className="text-relay-muted text-[10px] font-bold tracking-widest">No swaps found here</p>
          </div>
        )}
      </div>
      </div>

      {/* Cancel swap modal */}
      {cancelModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-6" onClick={() => setCancelModal(null)}>
          <div className="absolute inset-0 bg-relay-bg/70 dark:bg-relay-bg-dark/70 backdrop-blur-md" />
          <div
            className="relative w-full max-w-md glass-card px-8 pb-10 pt-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-serif  text-relay-text dark:text-relay-text-dark tracking-tighter leading-tight">Cancel this swap?</h2>
              <button
                onClick={() => setCancelModal(null)}
                className="size-10 flex items-center justify-center rounded-full bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-muted hover:text-relay-text dark:hover:text-relay-text-dark transition-colors active-scale shrink-0"
              >
                <span className="material-symbols-outlined !text-xl">close</span>
              </button>
            </div>
            <p className="text-sm text-relay-muted dark:text-relay-muted-light leading-relaxed mb-8">
              You can cancel the swap if{' '}
              <span className="font-semibold text-relay-text dark:text-relay-text-dark">{cancelModal.sellerName}</span>{' '}
              has not agreed to the time you proposed.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleCancelSwap}
                disabled={cancellingId === cancelModal.swapId}
                className="w-full h-14 bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark rounded-2xl font-semibold text-xs tracking-widest active-scale transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cancellingId === cancelModal.swapId ? (
                  <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined !text-lg">cancel</span>
                )}
                {cancellingId === cancelModal.swapId ? 'Cancelling…' : 'Cancel the Swap'}
              </button>
              <button
                onClick={() => setCancelModal(null)}
                className="w-full h-14 bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark rounded-2xl font-semibold text-xs tracking-widest active-scale"
              >
                Keep Swap
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating modal */}
      {ratingModal && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center">
          <div className="absolute inset-0 bg-relay-bg/70 dark:bg-relay-bg-dark/70 backdrop-blur-md" onClick={() => setRatingModal(null)} />
          <div className="relative w-full max-w-md glass-card rounded-t-[32px] px-8 pb-12 pt-8 shadow-2xl">
            <h2 className="text-2xl font-serif  text-relay-text dark:text-relay-text-dark mb-1">Rate this swap</h2>
            <p className="text-xs text-relay-muted mb-8">{ratingModal.itemName}</p>

            <div className="flex justify-center gap-3 mb-8">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRatingStars(star)}
                  className={`size-12 rounded-full flex items-center justify-center transition-all active-scale ${ratingStars >= star ? 'text-primary' : 'text-relay-muted opacity-50'}`}
                >
                  <span className={`material-symbols-outlined !text-3xl ${ratingStars >= star ? 'fill-1' : ''}`}>star</span>
                </button>
              ))}
            </div>

            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="Leave a comment (optional)"
              maxLength={500}
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-sm text-relay-text dark:text-relay-text-dark placeholder:text-relay-muted resize-none mb-6 focus:outline-none focus:border-primary"
            />

            {ratingError && (
              <p className="text-xs text-relay-text dark:text-relay-text-dark/80 mb-4">
                {ratingError}
              </p>
            )}

            <button
              onClick={handleSubmitRating}
              disabled={ratingStars < 1 || ratingSubmitting}
              className="w-full h-14 rounded-2xl bg-primary text-white text-xs font-semibold tracking-widest disabled:opacity-40 transition-all active-scale mb-3"
            >
              {ratingSubmitting ? 'Submitting…' : 'Submit Rating'}
            </button>
            <button
              onClick={() => setRatingModal(null)}
              className="w-full text-xs text-relay-muted font-bold tracking-widest py-3"
            >
              Skip
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
