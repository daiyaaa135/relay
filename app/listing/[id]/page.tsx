'use client';

export const dynamic = 'force-dynamic';

import React, { Suspense, useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { fetchGadgetById, cancelListing } from '@/lib/gadgets';
import { getOrCreateSwap, fetchActiveSwapForGadget } from '@/lib/swaps';
import { getOrCreateConversation } from '@/lib/conversations';
import { fetchExchangeCount, fetchProfile } from '@/lib/profiles';
import { fetchTransactions } from '@/lib/transactions';
import { createClient } from '@/lib/supabase';
import { loadWishlist, toggleWishlistItem } from '@/lib/wishlist';
import { PickupCalendarModal, type PickupSlot } from '@/app/components/PickupCalendarModal';
import { LocationMapWithAvatar } from '@/app/components/LocationMapWithAvatar';
import { PickupLocationsMap } from '@/app/components/PickupLocationsMap';
import { RatingDisplay } from '@/app/components/RatingDisplay';
import { WishlistHeartIcon } from '@/app/components/WishlistHeartIcon';
import type { Gadget } from '@/lib/types';
import { getDefaultAvatar } from '@/lib/avatars';
import { type as typeStyles } from '@/lib/typography';
import { CONDITION_BG, conditionForColor } from '@/lib/constants';
import { ChevronIcon } from '@/app/components/ChevronIcon';

/** Columns to show per category (order preserved). */
const LISTING_COLUMNS_BY_CATEGORY: Record<string, { key: string; label: string }[]> = {
  Phones: [
    { key: 'condition', label: 'Condition' },
    { key: 'color', label: 'Color' },
    { key: 'carrier', label: 'Carrier' },
    { key: 'storage', label: 'Storage' },
  ],
  Tablets: [
    { key: 'condition', label: 'Condition' },
    { key: 'color', label: 'Color' },
    { key: 'carrier', label: 'Carrier' },
    { key: 'storage', label: 'Storage' },
    { key: 'size', label: 'Size' },
  ],
  Laptops: [
    { key: 'condition', label: 'Condition' },
    { key: 'color', label: 'Color' },
    { key: 'storage', label: 'Storage' },
    { key: 'processor', label: 'Processor' },
    { key: 'year', label: 'Year' },
    { key: 'ram', label: 'RAM' },
    { key: 'size', label: 'Size' },
  ],
  Console: [
    { key: 'condition', label: 'Condition' },
    { key: 'color', label: 'Color' },
    { key: 'brand', label: 'Brand' },
    { key: 'storage', label: 'Storage' },
  ],
  'Video Games': [
    { key: 'condition', label: 'Condition' },
    { key: 'console_name', label: 'Console' },
    { key: 'brand', label: 'Brand' },
  ],
  Headphones: [
    { key: 'condition', label: 'Condition' },
    { key: 'color', label: 'Color' },
    { key: 'brand', label: 'Brand' },
  ],
  Speaker: [
    { key: 'condition', label: 'Condition' },
    { key: 'color', label: 'Color' },
    { key: 'brand', label: 'Brand' },
  ],
  MP3: [
    { key: 'condition', label: 'Condition' },
    { key: 'color', label: 'Color' },
    { key: 'brand', label: 'Brand' },
    { key: 'storage', label: 'Storage' },
  ],
  'Gaming Handhelds': [
    { key: 'condition', label: 'Condition' },
    { key: 'color', label: 'Color' },
    { key: 'brand', label: 'Brand' },
  ],
};

function parseSpecs(specs: string | undefined): {
  storage: string | null;
  size: string | null;
  year: string | null;
  ram: string | null;
  processor: string | null;
} {
  const s = specs ?? '';
  const sizeMatch = s.match(/\b(\d+(?:\.\d+)?\s*(?:"|inch|in\.?)\b)/i) ?? s.match(/\b(\d+(?:\.\d+)?)\s*"/);
  const size = sizeMatch ? sizeMatch[1].trim() : null;
  const yearMatch = s.match(/\b(20\d{2}|19\d{2})\b/);
  const year = yearMatch ? yearMatch[1] : null;
  const ramMatch = s.match(/\b(4|8|16|32)\s*GB\b/i);
  const ram = ramMatch ? `${ramMatch[1]} GB` : null;
  const parts = s.split(/\s*•\s*/).map((p) => p.trim()).filter(Boolean);
  const processorPart = parts.find(
    (p) =>
      /M[1234](\s|$)/i.test(p) ||
      /(Intel|AMD)\s+(Core\s+)?/i.test(p) ||
      /(Apple\s+)?M[12]\s*(Pro|Max)?/i.test(p) ||
      /(i[3579]|Ryzen)\s*\d/i.test(p)
  );
  const processor = processorPart ?? null;
  const tbMatch = s.match(/\b(\d+)\s*TB\b/i);
  const gbMatches = [...s.matchAll(/\b(\d+)\s*GB\b/gi)];
  let storage: string | null = null;
  if (tbMatch) {
    storage = `${tbMatch[1]}TB`;
  } else if (gbMatches.length > 0) {
    const gbValues = gbMatches.map((m) => parseInt(m[1], 10));
    const storageCandidates = gbValues.filter((n) => n >= 64 || n === 1024);
    const storageNum = storageCandidates.length > 0 ? Math.max(...storageCandidates) : null;
    if (storageNum != null) storage = storageNum >= 1024 ? '1TB' : `${storageNum}GB`;
  }
  return { storage, size, year, ram, processor };
}

function getColumnValue(
  item: Gadget,
  key: string,
  parsed: ReturnType<typeof parseSpecs>
): { value: string; highlight?: boolean } | null {
  switch (key) {
    case 'condition':
      return item.condition ? { value: item.condition, highlight: true } : null;
    case 'color':
      return item.color ? { value: item.color } : null;
    case 'carrier':
      return item.carrier ? { value: item.carrier } : null;
    case 'storage':
      return parsed.storage ? { value: parsed.storage } : null;
    case 'size':
      return parsed.size ? { value: parsed.size } : null;
    case 'year':
      return parsed.year ? { value: parsed.year } : null;
    case 'ram':
      return parsed.ram ? { value: parsed.ram } : null;
    case 'processor':
      return parsed.processor ? { value: parsed.processor } : null;
    case 'brand':
      return item.brand ? { value: item.brand } : null;
    case 'console_name':
      if (item.category === 'Video Games' && item.specs) {
        const part = item.specs.split(/\s*•\s*/)[0]?.trim();
        if (part && !/^(Loose|CIB)/i.test(part)) return { value: part };
      }
      return null;
    default:
      return null;
  }
}

function ListingDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const searchParams = useSearchParams();

  const [item, setItem] = useState<Gadget | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [messageLoading, setMessageLoading] = useState(false);
  const [credits, setCredits] = useState<number>(0);
  const [isSwapping, setIsSwapping] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pickupCalendarState, setPickupCalendarState] = useState<{
    open: boolean;
    sellerSlots: Array<{ dayOfWeek: number; start: string; end: string }> | null;
  }>({ open: false, sellerSlots: null });
  const [showPickupLocation, setShowPickupLocation] = useState(false);
  const [pendingSlots, setPendingSlots] = useState<PickupSlot[] | null>(null);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [wishlistProfileId, setWishlistProfileId] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [wishlistCount, setWishlistCount] = useState<number | null>(null);
  const [sellerExchangeCount, setSellerExchangeCount] = useState<number | null>(null);
  const [activeSwap, setActiveSwap] = useState<{ swapId: string; status: string; hasDebited?: boolean; conversationId?: string } | null>(null);
  const [cancellingSwap, setCancellingSwap] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingListing, setCancellingListing] = useState(false);
  const [showCancelListingModal, setShowCancelListingModal] = useState(false);
  const [showBecomeMemberModal, setShowBecomeMemberModal] = useState(false);
  const [showListingActionSheet, setShowListingActionSheet] = useState(false);
  const [creditsLoaded, setCreditsLoaded] = useState(false);
  const [activeSwapLoaded, setActiveSwapLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  function MoreVerticalIcon() {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 shrink-0 text-current">
        <path fillRule="evenodd" clipRule="evenodd" d="M4 9.25C2.48122 9.25 1.25 10.4812 1.25 12C1.25 13.5188 2.48122 14.75 4 14.75C5.51878 14.75 6.75 13.5188 6.75 12C6.75 10.4812 5.51878 9.25 4 9.25ZM2.75 12C2.75 11.3096 3.30964 10.75 4 10.75C4.69036 10.75 5.25 11.3096 5.25 12C5.25 12.6904 4.69036 13.25 4 13.25C3.30964 13.25 2.75 12.6904 2.75 12Z" fill="currentColor"/>
        <path fillRule="evenodd" clipRule="evenodd" d="M12 9.25C10.4812 9.25 9.25 10.4812 9.25 12C9.25 13.5188 10.4812 14.75 12 14.75C13.5188 14.75 14.75 13.5188 14.75 12C14.75 10.4812 13.5188 9.25 12 9.25ZM10.75 12C10.75 11.3096 11.3096 10.75 12 10.75C12.6904 10.75 13.25 11.3096 13.25 12C13.25 12.6904 12.6904 13.25 12 13.25C11.3096 13.25 10.75 12.6904 10.75 12Z" fill="currentColor"/>
        <path fillRule="evenodd" clipRule="evenodd" d="M20 9.25C18.4812 9.25 17.25 10.4812 17.25 12C17.25 13.5188 18.4812 14.75 20 14.75C21.5188 14.75 22.75 13.5188 22.75 12C22.75 10.4812 21.5188 9.25 20 9.25ZM18.75 12C18.75 11.3096 19.3096 10.75 20 10.75C20.6904 10.75 21.25 11.3096 21.25 12C21.25 12.6904 20.6904 13.25 20 13.25C19.3096 13.25 18.75 12.6904 18.75 12Z" fill="currentColor"/>
      </svg>
    );
  }

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setNotFound(false);
    fetchGadgetById(id)
      .then((gadget) => {
        setItem(gadget ?? null);
        setNotFound(!gadget);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!userId) {
      setCredits(0);
      setCreditsLoaded(true);
      return;
    }
    let cancelled = false;
    setCreditsLoaded(false);
    (async () => {
      const [profile, txList] = await Promise.all([
        fetchProfile(userId),
        fetchTransactions(userId),
      ]);
      if (cancelled) return;
      const balanceFromLedger = txList.length > 0 ? txList.reduce((sum, t) => sum + t.amount, 0) : null;
      const nextCredits = profile?.credits_balance ?? balanceFromLedger ?? 0;
      setCredits(nextCredits);
      setCreditsLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [userId, id]);

  useEffect(() => {
    loadWishlist().then(({ ids, profileId }) => {
      setWishlist(ids);
      setWishlistProfileId(profileId);
    });
  }, []);

  useEffect(() => {
    if (!item?.id) {
      setWishlistCount(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { count } = await supabase
          .from('wishlists')
          .select('gadget_id', { count: 'exact', head: true })
          .eq('gadget_id', item.id);
        if (!cancelled) {
          setWishlistCount(typeof count === 'number' ? count : 0);
        }
      } catch {
        if (!cancelled) setWishlistCount(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [item?.id]);

  useEffect(() => {
    if (!item?.sellerId) {
      setSellerExchangeCount(null);
      return;
    }
    let cancelled = false;
    fetchExchangeCount(item.sellerId).then((count) => {
      if (!cancelled) setSellerExchangeCount(count);
    });
    return () => { cancelled = true; };
  }, [item?.sellerId]);

  useEffect(() => {
    if (!item?.id || !userId) {
      setActiveSwap(null);
      setActiveSwapLoaded(true);
      return;
    }
    let cancelled = false;
    setActiveSwapLoaded(false);
    fetchActiveSwapForGadget(item.id, userId).then((swap) => {
      if (!cancelled && swap) {
        setActiveSwap({ swapId: swap.swapId, status: swap.status, hasDebited: swap.hasDebited, conversationId: swap.conversationId });
        setActiveSwapLoaded(true);
      } else if (!cancelled) {
        setActiveSwap(null);
        setActiveSwapLoaded(true);
      }
    });
    return () => { cancelled = true; };
  }, [item?.id, userId]);

  const handleCancelSwap = async () => {
    if (!activeSwap || cancellingSwap) return;
    setCancellingSwap(true);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) { setCancellingSwap(false); return; }
    const res = await fetch(`/api/swaps/${activeSwap.swapId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    });
    const body = await res.json().catch(() => ({}));
    setCancellingSwap(false);
    if (res.ok) {
      setShowCancelModal(false);
      setActiveSwap(null);
    } else {
      alert((body as { error?: string }).error ?? 'Could not cancel. Try again.');
    }
  };

  const handleCancelListing = async () => {
    if (!item || !userId || cancellingListing) return;
    setCancellingListing(true);
    const result = await cancelListing(userId, item.id);
    setCancellingListing(false);
    if ('ok' in result) {
      setShowCancelListingModal(false);
      router.push('/profile');
    } else {
      alert(result.error ?? 'Could not cancel listing. Try again.');
    }
  };

  const handleMessageClick = async () => {
    if (!item) return;
    if (!userId) {
      router.push('/login');
      return;
    }
    if (!item.sellerId) {
      alert('This listing does not support messaging. Try a listing from the Explore page.');
      return;
    }
    setMessageLoading(true);
    const result = await getOrCreateConversation(item.id, userId, item.sellerId);
    setMessageLoading(false);
    if ('error' in result) {
      alert(result.error);
      return;
    }
    router.push(`/messages/${result.conversationId}`);
  };

  const itemImages = item?.images && item.images.length > 0 ? item.images : item ? [item.image] : [];

  const toggleWishlist = () => {
    if (!item) return;
    import('@capacitor/haptics').then(({ Haptics, ImpactStyle }) => {
      Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
      });
    }).catch(() => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
    });
    const isInWishlist = wishlist.includes(item.id);
    toggleWishlistItem(wishlistProfileId, item.id, wishlist).then((newIds) => {
      setWishlist(newIds);
      setWishlistCount((prev) => {
        if (prev == null) return prev;
        const next = prev + (isInWishlist ? -1 : 1);
        return next < 0 ? 0 : next;
      });
    });
  };

  const handleShare = async () => {
    if (!item || typeof window === 'undefined') return;
    const shareUrl = window.location.href;
    const shareData = {
      title: item.name,
      text: `Check out this listing on Rellaey: ${item.name}`,
      url: shareUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // Ignore if user cancels share
      }
    } else if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('Link copied to clipboard.');
      } catch {
        alert('Could not copy link. You can share this page from your browser.');
      }
    } else {
      alert('Sharing not supported on this device. You can share this page from your browser.');
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const width = e.currentTarget.offsetWidth;
    const index = Math.round(scrollLeft / width);
    setActiveImage(index);
  };

  const isUnavailableForViewer =
    !!item &&
    (item.status === 'pending_swap' || item.status === 'swapped') &&
    userId !== item.sellerId &&
    !(activeSwap && activeSwap.hasDebited);

  const handleInitiateSwap = async () => {
    if (!item) return;
    if (userId && item.sellerId && userId === item.sellerId) return;
    if (!userId) {
      setShowBecomeMemberModal(true);
      return;
    }
    import('@capacitor/haptics').then(({ Haptics, ImpactStyle }) => {
      Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
      });
    }).catch(() => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
    });
    if (credits < item.credits) {
      alert("Insufficient credits. Please top up your account by listing more items.");
      return;
    }
    // Block check (both directions via server)
    if (item.sellerId) {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const res = await fetch(`/api/swaps/can-swap?buyerId=${userId}&sellerId=${item.sellerId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const body = await res.json().catch(() => ({}));
        if (!body.ok) {
          alert(body.reason ?? "Unable to initiate swap with this user.");
          return;
        }
      }
    }
    setShowConfirm(true);
  };

  const confirmSwap = async () => {
    if (!item) return;
    setShowConfirm(false);
    if (item.sellerId) {
      try {
        const res = await fetch(`/api/profiles/${item.sellerId}/availability`);
        const body = await res.json().catch(() => ({}));
        const slots = Array.isArray((body as { slots?: unknown }).slots)
          ? (body as { slots: Array<{ dayOfWeek: number; start: string; end: string }> }).slots
          : [];
        const sellerSlots = slots.length > 0 ? slots : null;
        setPickupCalendarState({ open: true, sellerSlots });
      } catch {
        setPickupCalendarState({ open: true, sellerSlots: null });
      }
    } else {
      setPickupCalendarState({ open: true, sellerSlots: null });
    }
  };

  const handlePickupTimesConfirm = async (
    slots: PickupSlot[],
    chosenLocation?: { city: string; state: string; latitude: number; longitude: number; displayName?: string }
  ) => {
    if (!item || !userId || !item.sellerId) return;
    setIsSwapping(true);
    setShowPickupLocation(false);
    setPendingSlots(null);
    const result = await getOrCreateSwap(item.id, userId, item.sellerId, item.credits);
    if ('error' in result) {
      setIsSwapping(false);
      alert(result.error);
      setPickupCalendarState((prev) => ({ ...prev, open: false }));
      return;
    }
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setIsSwapping(false);
      alert('Session expired. Please sign in again.');
      setPickupCalendarState((prev) => ({ ...prev, open: false }));
      return;
    }
    const debitRes = await fetch(`/api/swaps/${result.swapId}/debit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    });
    const debitBody = await debitRes.json().catch(() => ({}));
    if (!debitRes.ok) {
      setIsSwapping(false);
      alert((debitBody as { error?: string }).error ?? 'Could not deduct credits. Try again.');
      setPickupCalendarState((prev) => ({ ...prev, open: false }));
      return;
    }
    const proposalPayload = chosenLocation
      ? { _type: 'pickup_proposal' as const, slots, chosenLocation }
      : { _type: 'pickup_proposal' as const, slots };
    await supabase.from('messages').insert({
      conversation_id: result.conversationId,
      sender_profile_id: userId,
      content: JSON.stringify(proposalPayload),
    });
    const newBalance = typeof (debitBody as { newBalance?: number }).newBalance === 'number'
      ? (debitBody as { newBalance: number }).newBalance
      : credits - item.credits;
    setCredits(newBalance);
    setIsSwapping(false);
    setPickupCalendarState((prev) => ({ ...prev, open: false }));
    router.push(`/messages/${result.conversationId}`);
  };

  if (loading) {
    return (
      <div className="bg-relay-surface dark:bg-relay-surface-dark flex-1 min-h-0 flex items-center justify-center">
        <div className="size-16 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="bg-relay-surface dark:bg-relay-surface-dark flex-1 min-h-0 flex flex-col items-center justify-center px-6">
        <p className="text-relay-muted text-center font-serif  text-xl mb-6">Listing not found.</p>
        <button
          onClick={() => router.push('/')}
          className="h-14 px-8 rounded-2xl bg-primary text-white text-xs font-semibold tracking-widest"
        >
          Back to Explore
        </button>
      </div>
    );
  }

  const isWishlisted = wishlist.includes(item.id);

  return (
    <div className="bg-relay-surface dark:bg-relay-surface-dark flex-1 min-h-0 flex flex-col transition-colors">
      <div className="z-40 shrink-0 flex items-center justify-between p-6 bg-transparent pt-safe-1_5">
        <button 
          onClick={() => {
            const from = searchParams.get('from');
            const fromCategory = searchParams.get('category');
            const targetCategory = fromCategory && fromCategory.length > 0 ? fromCategory : 'All';
            const params = new URLSearchParams();
            if (from) params.set('from', from);
            params.set('category', targetCategory);
            const targetUrl = `/?${params.toString()}`;
            router.push(targetUrl);
          }}
          className="flex size-12 items-center justify-center rounded-full glass-card border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark active-scale transition-all"
        >
          <ChevronIcon direction="left" className="size-6" />
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={toggleWishlist}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            className="flex h-12 px-4 items-center justify-center rounded-full glass-card border border-relay-border dark:border-relay-border-dark transition-all active-scale gap-1.5"
          >
            <WishlistHeartIcon
              active={isWishlisted}
              className={`w-6 h-6 shrink-0 text-current transition-all ${isWishlisted ? 'opacity-100' : 'opacity-60'}`}
            />
            <span
              className={`text-[11px] font-semibold tracking-tight ${
                isWishlisted ? 'text-primary' : 'text-relay-text dark:text-relay-text-dark'
              }`}
            >
              {wishlistCount ?? '—'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setShowListingActionSheet(true)}
            aria-label="More options"
            className="flex size-12 items-center justify-center rounded-full glass-card border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark active-scale"
          >
            <MoreVerticalIcon />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pb-48">
      <div className="px-6">
        <div className="relative group mb-6">
          <div 
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar rounded-[56px] border border-relay-border dark:border-relay-border-dark bg-relay-bg dark:bg-relay-bg-dark shadow-2xl aspect-[3/4]"
          >
            {itemImages.map((img, i) => (
              <div key={i} className="relative min-w-full h-full snap-center">
                <Image
                  src={img}
                  alt={`${item.name} view ${i + 1}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 60vw"
                  className="w-full h-full object-cover"
                  priority={i === 0}
                />
              </div>
            ))}
          </div>
          {item.verification_code && (
            <div className="absolute top-3 left-3 z-10 inline-flex items-center px-2.5 py-1 rounded-lg glass-card border border-relay-border dark:border-relay-border-dark">
              <span className="text-[10px] font-bold tracking-[0.2em] text-relay-text dark:text-relay-text-dark">
                {item.verification_code}
              </span>
            </div>
          )}
          {itemImages.length > 1 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 p-2 glass-card">
              {itemImages.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 transition-all duration-500 rounded-full ${activeImage === i ? 'w-8 bg-primary' : 'w-1.5 bg-relay-border dark:bg-relay-border-dark'}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {isUnavailableForViewer && (
            <div className="rounded-3xl border border-relay-border dark:border-relay-border-dark bg-relay-bg/70 dark:bg-relay-bg-dark/70 px-4 py-3 text-[11px] tracking-tight text-relay-muted dark:text-relay-muted-light">
              This item has been picked up by another buyer.
            </div>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-primary text-[10px] font-bold tracking-tight">{item.category}</p>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-relay-bg dark:bg-relay-bg-dark rounded-full border border-relay-border dark:border-relay-border-dark">
                <span className="material-symbols-outlined !text-[12px] text-primary fill-1">verified</span>
                <span className="text-relay-text dark:text-relay-text-dark text-[9px] font-bold tracking-widest">Verified Tech</span>
              </div>
            </div>
            <h1 className={`${typeStyles.xl} text-relay-text dark:text-relay-text-dark tracking-tighter`}>{item.name}</h1>
            <div className="flex items-center gap-2 py-2">
              <span className="material-symbols-outlined !text-sm text-primary">location_on</span>
              <span className="text-relay-muted dark:text-relay-muted-light text-[10px] font-semibold tracking-tight">
                {item.location?.city}, {item.location?.state} • {item.location?.distance} miles away
              </span>
            </div>
          </div>

          {/* Dynamic criteria columns by category */}
          {(() => {
            const config = LISTING_COLUMNS_BY_CATEGORY[item.category] ?? LISTING_COLUMNS_BY_CATEGORY.Phones;
            const parsed = parseSpecs(item.specs);
            const columns = config.map(({ key, label }) => {
              const result = getColumnValue(item, key, parsed);
              const value = result?.value ?? '—';
              const highlight = result?.highlight ?? false;
              return { key, label, value, highlight };
            });

            const count = columns.length;
            const hasSingleColumn = count === 1;
            const hasTwoColumns = count === 2;
            const colsClass =
              count >= 4 ? 'grid-cols-4' : count === 3 ? 'grid-cols-3' : 'grid-cols-2';

            const containerLayoutClass = hasSingleColumn
              ? 'flex justify-start'
              : `grid ${colsClass} ${count > 1 ? 'divide-x divide-relay-border dark:divide-relay-border-dark' : ''} ${
                  hasTwoColumns ? 'max-w-[260px] mx-auto' : ''
                }`;

            return (
              <div
                className={`${containerLayoutClass} py-2 border-y border-relay-border dark:border-relay-border-dark`}
              >
                {columns.map((col) => (
                  <div
                    key={col.key}
                    className={`flex flex-col gap-1 px-2 ${
                      hasSingleColumn ? 'items-start' : 'items-center'
                    }`}
                  >
                    <span className="text-[9px] font-semibold tracking-tight text-relay-muted dark:text-relay-muted-light">
                      {col.label}
                    </span>
                    {col.label === 'Condition' && col.highlight && col.value !== '—' ? (
                      <span
                        className="text-sm font-bold tracking-wide"
                        style={{
                          color:
                            CONDITION_BG[conditionForColor(col.value)] ??
                            CONDITION_BG.Good,
                        }}
                      >
                        {col.value}
                      </span>
                    ) : (
                      <span
                        className={`text-sm font-bold tracking-wide ${
                          col.highlight ? 'text-primary' : 'text-relay-text dark:text-relay-text-dark'
                        }`}
                      >
                        {col.value}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Description & Bundled Extras */}
          {(() => {
            const specsWithoutImei = item.specs
              ? item.specs.replace(/\b\d{15}\b|\b\d{2}\s+\d{6}\s+\d{6}\s+\d{1}\b/g, '').replace(/\s*•\s*•/g, ' •').replace(/^\s*•\s*|\s*•\s*$/g, '').trim()
              : '';
            let accessories: string[] = [];
            let descriptionText = item.description ?? '';
            const accessoryMatch = descriptionText.match(/^Accessories:\s*(.+)/m);
            if (accessoryMatch) {
              accessories = accessoryMatch[1].split(',').map((a) => a.trim()).filter(Boolean);
              descriptionText = descriptionText.replace(/^Accessories:\s*.+\n?/m, '').trim();
            }
            let displayText = [specsWithoutImei, descriptionText].filter(Boolean).join('. ') || 'No details provided.';
            displayText = displayText.replace(/\.\s*;\s*/g, '. ').replace(/;\s*\./g, '. ');
            const accessoryIcons: Record<string, string> = {
              'Charging Cable': 'cable',
              'SIM Ejector Pin': 'sim_card',
              'S Pen': 'stylus',
              'Original Box': 'inventory_2',
            };
            return (
              <div className="space-y-4 py-2">
                <div className="space-y-3">
                  <h4 className="text-[10px] font-semibold tracking-tight text-relay-muted dark:text-relay-muted-light">Description</h4>
                  <p className="text-relay-text dark:text-relay-text-dark text-sm leading-relaxed font-light opacity-80">
                    {displayText}
                  </p>
                </div>

                {accessories.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-semibold tracking-tight text-relay-muted dark:text-relay-muted-light">Bundled Extras</h4>
                    <div className="flex flex-wrap gap-2">
                      {accessories.map((a) => (
                        <div key={a} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-relay-border dark:border-relay-border-dark bg-relay-surface dark:bg-relay-surface-dark">
                          <span className="material-symbols-outlined !text-[14px] text-relay-text dark:text-relay-text-dark">{accessoryIcons[a] ?? 'check_circle'}</span>
                          <span className="text-[10px] font-bold tracking-widest text-relay-text dark:text-relay-text-dark">{a.replace('Charging Cable', 'Cable').replace('SIM Ejector Pin', 'SIM Pin').replace('Original Box', 'Box')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Approximate seller location map (below Bundled Extras) */}
          {item.latitude != null && item.longitude != null && (
            <div className="pt-1 pb-4">
              <LocationMapWithAvatar
                latitude={item.latitude}
                longitude={item.longitude}
                avatarUrl={item.sellerAvatarUrl}
                alt={item.seller}
                avatarFallbackKey={item.sellerId || item.seller}
              />
            </div>
          )}

          {/* Seller capsule + chat button */}
          <div className="mt-4 flex items-stretch gap-3">
            <button
              type="button"
              onClick={() => router.push(item.sellerId ? `/profile/${item.sellerId}` : `/profile/${encodeURIComponent(item.seller)}`)}
              className="flex-1 min-w-0 flex items-center gap-4 p-4 rounded-[24px] bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark shadow-sm text-left hover:bg-relay-surface dark:hover:bg-relay-surface-dark transition-colors"
            >
              <div className="size-14 shrink-0 rounded-full overflow-hidden border border-relay-border dark:border-relay-border-dark">
                <img src={item.sellerAvatarUrl || getDefaultAvatar(item.sellerId || item.seller)} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                <p className="text-relay-text dark:text-relay-text-dark font-semibold text-sm truncate">{item.seller}</p>
                {item.sellerJoinedAt && (
                  <p className="text-[10px] font-normal text-relay-muted dark:text-relay-muted-light truncate">
                    Joined {new Date(item.sellerJoinedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
                )}
                <RatingDisplay rating={item.sellerRating ?? 0} size="md" />
              </div>
              <span className="material-symbols-outlined !text-xl text-relay-muted dark:text-relay-muted-light shrink-0">chevron_right</span>
            </button>
            <button
              onClick={handleMessageClick}
              disabled={messageLoading}
              className="size-14 shrink-0 self-center rounded-2xl border border-relay-border dark:border-relay-border-dark flex items-center justify-center text-relay-text dark:text-relay-text-dark active-scale hover:bg-relay-bg dark:hover:bg-relay-bg-dark transition-colors disabled:opacity-60"
            >
              {messageLoading ? <span className="size-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> : <span className="material-symbols-outlined">chat_bubble</span>}
            </button>
          </div>
        </div>
      </div>

      </div>
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-[100] p-6 glass-card border-t border-relay-border dark:border-relay-border-dark">
        <div className="flex gap-4 items-center">
          <div className="min-w-[5rem] px-5 rounded-3xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark flex items-center justify-center gap-1 shrink-0" style={{ height: '42px' }}>
            <span className="text-relay-text dark:text-relay-text-dark text-base font-bold tracking-tighter">{item.credits.toLocaleString()}</span>
            <span className="text-primary text-xs font-bold tracking-widest font-sans">Cr</span>
          </div>
          {!userId || (item.sellerId && userId !== item.sellerId) ? (
            isUnavailableForViewer ? (
              <div className="flex-1 rounded-3xl flex flex-col items-center justify-center gap-0.5 bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark px-4" style={{ height: '42px' }}>
                <span className="text-[11px] font-semibold tracking-[0.18em] text-relay-muted dark:text-relay-muted-light">
                  UNAVAILABLE
                </span>
              </div>
            ) : activeSwap ? (
              activeSwap.status === 'pending' && activeSwap.hasDebited ? (
                <div className="flex-1 flex gap-3">
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="flex-1 rounded-3xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark flex items-center justify-center gap-3 active-scale hover:bg-relay-surface dark:hover:bg-relay-surface-dark transition-all"
                    style={{ height: '42px' }}
                  >
                    <span className="material-symbols-outlined">cancel</span>
                    <span className="text-xs font-semibold tracking-[0.1em]">Cancel Swap</span>
                  </button>
                  <button
                    onClick={() => router.push(`/messages/${activeSwap.conversationId ?? activeSwap.swapId}`)}
                    className="size-14 shrink-0 border border-relay-border dark:border-relay-border-dark rounded-3xl flex items-center justify-center text-relay-muted hover:text-primary hover:border-primary/30 transition-colors active-scale"
                  >
                    <span className="material-symbols-outlined">chat_bubble</span>
                  </button>
                </div>
              ) : activeSwap.status === 'pending' && !activeSwap.hasDebited ? (
                <button
                  onClick={() => router.push(`/messages/${activeSwap.conversationId ?? activeSwap.swapId}`)}
                  className="flex-1 rounded-3xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark flex items-center justify-center gap-4 active-scale hover:bg-relay-surface dark:hover:bg-relay-surface-dark transition-all"
                  style={{ height: '42px' }}
                >
                  <span className="text-xs font-semibold tracking-[0.1em]">Message</span>
                  <span className="material-symbols-outlined">chat_bubble</span>
                </button>
              ) : (
                <button
                  onClick={() => router.push(`/messages/${activeSwap.conversationId ?? activeSwap.swapId}`)}
                  className="flex-1 rounded-3xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-primary flex items-center justify-center gap-4 active-scale hover:bg-relay-surface dark:hover:bg-relay-surface-dark transition-all"
                  style={{ height: '42px' }}
                >
                  <span className="text-xs font-semibold tracking-[0.1em]">View swap</span>
                  <span className="material-symbols-outlined">chat_bubble</span>
                </button>
              )
            ) : (
              <button 
                onClick={handleInitiateSwap}
                className="flex-1 rounded-3xl bg-primary text-white flex items-center justify-center gap-4 shadow-2xl shadow-primary/40 active-scale transition-all"
                style={{ height: '42px' }}
              >
                <span className="text-xs font-semibold tracking-[0.1em]">Swap with Credits</span>
                <span className="material-symbols-outlined">payments</span>
              </button>
            )
          ) : (() => {
            const hasActiveBuyerSwap = !!activeSwap;
            const hasEnoughCredits = credits >= item.credits;
            const fullyLoaded = creditsLoaded && activeSwapLoaded;
            const canCancel = fullyLoaded && hasEnoughCredits && !hasActiveBuyerSwap;
            const blockedReason = !fullyLoaded
              ? null
              : hasActiveBuyerSwap
              ? 'A buyer has already initiated a swap'
              : !hasEnoughCredits
              ? `Need ${item.credits - credits} more credits to cancel`
              : null;
            if (!fullyLoaded) {
              return (
                <div className="flex-1 rounded-3xl flex flex-col items-center justify-center gap-0.5 bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark px-4" style={{ height: '42px' }}>
                  <span className="text-xs font-semibold tracking-[0.1em] text-relay-muted dark:text-relay-muted-light">Your listing</span>
                </div>
              );
            }
            return canCancel ? (
              <button
                onClick={() => setShowCancelListingModal(true)}
                className="flex-1 rounded-3xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark flex items-center justify-center gap-3 active-scale hover:bg-relay-surface dark:hover:bg-relay-surface-dark transition-all"
                style={{ height: '42px' }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="shrink-0"
                  aria-hidden
                >
                  <path
                    d="M10.409 9.59099C10.1161 9.2981 9.64124 9.2981 9.34835 9.59099C9.05546 9.88388 9.05546 10.3588 9.34835 10.6517L10.9393 12.2426L9.34835 13.8336C9.05546 14.1265 9.05546 14.6014 9.34835 14.8943C9.64124 15.1872 10.1161 15.1872 10.409 14.8943L12 13.3033L13.591 14.8943C13.8839 15.1872 14.3588 15.1872 14.6517 14.8943C14.9445 14.6014 14.9445 14.1265 14.6517 13.8336L13.0607 12.2426L14.6516 10.6517C14.9445 10.3588 14.9445 9.88388 14.6516 9.59099C14.3588 9.2981 13.8839 9.2981 13.591 9.59099L12 11.182L10.409 9.59099Z"
                    fill="currentColor"
                  />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M16.4635 2.37373C15.3214 2.24999 13.8818 2.24999 12.0452 2.25H11.9548C10.1182 2.24999 8.67861 2.24999 7.53648 2.37373C6.37094 2.50001 5.42656 2.76232 4.62024 3.34815C4.13209 3.70281 3.70281 4.13209 3.34815 4.62024C2.76232 5.42656 2.50001 6.37094 2.37373 7.53648C2.24999 8.67861 2.24999 10.1182 2.25 11.9548V12.0452C2.24999 13.8818 2.24999 15.3214 2.37373 16.4635C2.50001 17.6291 2.76232 18.5734 3.34815 19.3798C3.70281 19.8679 4.13209 20.2972 4.62024 20.6518C5.42656 21.2377 6.37094 21.5 7.53648 21.6263C8.67859 21.75 10.1182 21.75 11.9547 21.75H12.0453C13.8818 21.75 15.3214 21.75 16.4635 21.6263C17.6291 21.5 18.5734 21.2377 19.3798 20.6518C19.8679 20.2972 20.2972 19.8679 20.6518 19.3798C21.2377 18.5734 21.5 17.6291 21.6263 16.4635C21.75 15.3214 21.75 13.8818 21.75 12.0453V11.9547C21.75 10.1182 21.75 8.67859 21.6263 7.53648C21.5 6.37094 21.2377 5.42656 20.6518 4.62024C20.2972 4.13209 19.8679 3.70281 19.3798 3.34815C18.5734 2.76232 17.6291 2.50001 16.4635 2.37373ZM5.50191 4.56168C6.00992 4.19259 6.66013 3.97745 7.69804 3.865C8.74999 3.75103 10.1084 3.75 12 3.75C13.8916 3.75 15.25 3.75103 16.302 3.865C17.3399 3.97745 17.9901 4.19259 18.4981 4.56168C18.8589 4.82382 19.1762 5.14111 19.4383 5.50191C19.8074 6.00992 20.0225 6.66013 20.135 7.69804C20.249 8.74999 20.25 10.1084 20.25 12C20.25 13.8916 20.249 15.25 20.135 16.302C20.0225 17.3399 19.8074 17.9901 19.4383 18.4981C19.1762 18.8589 18.8589 19.1762 18.4981 19.4383C17.9901 19.8074 17.3399 20.0225 16.302 20.135C15.25 20.249 13.8916 20.25 12 20.25C10.1084 20.25 8.74999 20.249 7.69804 20.135C6.66013 20.0225 6.00992 19.8074 5.50191 19.4383C5.14111 19.1762 4.82382 18.8589 4.56168 18.4981C4.19259 17.9901 3.97745 17.3399 3.865 16.302C3.75103 15.25 3.75 13.8916 3.75 12C3.75 10.1084 3.75103 8.74999 3.865 7.69804C3.97745 6.66013 4.19259 6.00992 4.56168 5.50191C4.82382 5.14111 5.14111 4.82382 5.50191 4.56168Z"
                    fill="currentColor"
                  />
                </svg>
                <span className="text-xs font-semibold tracking-[0.1em]">Cancel Listing</span>
              </button>
            ) : (
              <div className="flex-1 rounded-3xl flex flex-col items-center justify-center gap-0.5 bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark px-4" style={{ height: '42px' }}>
                <span className="text-xs font-semibold tracking-[0.1em] text-relay-muted dark:text-relay-muted-light">Your listing</span>
                {blockedReason && (
                  <span className="text-[9px] tracking-widest text-relay-muted/60 dark:text-relay-muted-light/60 text-center leading-tight">{blockedReason}</span>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {showListingActionSheet && item && (
        <div
          className="fixed inset-0 z-[120] flex flex-col justify-end"
          role="dialog"
          aria-label="Listing options"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowListingActionSheet(false)}
            aria-hidden
          />
          <div
            className="relative rounded-t-3xl bg-relay-surface dark:bg-relay-surface-dark overflow-hidden pb-[var(--safe-bottom)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-1 px-4 pt-2 pb-3">
              <button
                type="button"
                onClick={() => {
                  setShowListingActionSheet(false);
                  void handleShare();
                }}
                className="w-full py-3.5 rounded-xl text-[17px] font-medium text-relay-text dark:text-relay-text-dark active:bg-black/5 dark:active:bg-white/5"
              >
                Share listing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowListingActionSheet(false);
                  const params = new URLSearchParams();
                  params.set('listingId', item.id);
                  if (item.sellerId) params.set('userId', item.sellerId);
                  const from = searchParams.get('from');
                  const fromCategory = searchParams.get('category');
                  if (from) params.set('from', from);
                  if (fromCategory) params.set('category', fromCategory);
                  router.push(`/report/item?${params.toString()}`);
                }}
                className="w-full py-3.5 rounded-xl text-[17px] font-medium text-red-600 dark:text-red-400 active:bg-black/5 dark:active:bg-white/5"
              >
                Report
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowListingActionSheet(false);
                  router.push(`/list/1?similar=${encodeURIComponent(item.id)}`);
                }}
                className="w-full py-3.5 rounded-xl text-[17px] font-medium text-primary active:bg-black/5 dark:active:bg-white/5"
              >
                List similar item
              </button>
            </div>
            <div className="h-2 bg-relay-border/50 dark:bg-relay-border-dark/50" />
            <div className="px-4 pt-2 pb-3">
              <button
                type="button"
                onClick={() => setShowListingActionSheet(false)}
                className="w-full py-3.5 rounded-xl text-[17px] font-semibold text-primary active:bg-black/5 dark:active:bg-white/5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && item && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center px-6 bg-relay-bg/70 dark:bg-relay-bg-dark/70 backdrop-blur-md"
          onClick={() => setShowCancelModal(false)}
        >
          <div
            className="w-full max-w-md glass-card px-8 pb-10 pt-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-serif  text-relay-text dark:text-relay-text-dark tracking-tighter leading-tight">Cancel this swap?</h2>
              <button
                onClick={() => setShowCancelModal(false)}
                className="size-10 flex items-center justify-center rounded-full bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-muted hover:text-relay-text dark:hover:text-relay-text-dark transition-colors active-scale shrink-0"
              >
                <span className="material-symbols-outlined !text-xl">close</span>
              </button>
            </div>
            <p className="text-sm text-relay-muted dark:text-relay-muted-light leading-relaxed mb-8">
              You can cancel the swap if <span className="font-semibold text-relay-text dark:text-relay-text-dark">{item.seller}</span> has not agreed to the time you proposed.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleCancelSwap}
                disabled={cancellingSwap}
                className="w-full rounded-2xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark font-semibold text-xs tracking-widest active-scale transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ height: '42px' }}
              >
                {cancellingSwap ? (
                  <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined !text-lg">cancel</span>
                )}
                {cancellingSwap ? 'Cancelling…' : 'Cancel the Swap'}
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                className="w-full rounded-2xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark font-semibold text-xs tracking-widest active-scale"
                style={{ height: '42px' }}
              >
                Keep Swap
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelListingModal && item && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center px-6 bg-relay-bg/70 dark:bg-relay-bg-dark/70 backdrop-blur-md"
          onClick={() => setShowCancelListingModal(false)}
        >
          <div
            className="w-full max-w-md glass-card px-8 pb-10 pt-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-serif  text-relay-text dark:text-relay-text-dark tracking-tighter leading-tight">Cancel this listing?</h2>
              <button
                onClick={() => setShowCancelListingModal(false)}
                className="size-10 flex items-center justify-center rounded-full bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-muted hover:text-relay-text dark:hover:text-relay-text-dark transition-colors active-scale shrink-0"
              >
                <span className="material-symbols-outlined !text-xl">close</span>
              </button>
            </div>
            <div className="bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark rounded-3xl p-5 mb-8 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold tracking-widest text-relay-muted">Listing</span>
                <span className="text-sm font-semibold text-relay-text dark:text-relay-text-dark truncate max-w-[60%] text-right">{item.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold tracking-widest text-relay-muted">Credits returned</span>
                <span className="text-sm font-bold text-relay-text dark:text-relay-text-dark">{item.credits.toLocaleString()} Cr</span>
              </div>
            </div>
            <p className="text-sm text-relay-muted dark:text-relay-muted-light leading-relaxed mb-8">
              This listing will be permanently removed. This action cannot be undone.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleCancelListing}
                disabled={cancellingListing}
                className="w-full rounded-2xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark font-semibold text-xs tracking-widest active-scale transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ height: '42px' }}
              >
                {cancellingListing ? (
                  <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined !text-lg">cancel</span>
                )}
                {cancellingListing ? 'Cancelling…' : 'Cancel Listing'}
              </button>
              <button
                onClick={() => setShowCancelListingModal(false)}
                className="w-full rounded-2xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark font-semibold text-xs tracking-widest active-scale"
                style={{ height: '42px' }}
              >
                Keep Listing
              </button>
            </div>
          </div>
        </div>
      )}

      {showBecomeMemberModal && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center px-6 bg-relay-bg/70 dark:bg-relay-bg-dark/70 backdrop-blur-md"
          onClick={() => setShowBecomeMemberModal(false)}
        >
          <div
            className="w-full max-w-sm glass-card p-8 shadow-2xl rounded-[40px] border border-relay-border dark:border-relay-border-dark"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-serif text-relay-text dark:text-relay-text-dark mb-3 tracking-tighter text-center">
              Become a member to start
            </h2>
            <p className="text-sm text-relay-muted dark:text-relay-muted-light text-center mb-8">
              Sign in or create an account to swap with credits on this listing.
            </p>
            <div className="space-y-3">
              <NextStepButton
                type="button"
                onClick={() => {
                  setShowBecomeMemberModal(false);
                  router.push('/login');
                }}
                className="w-full rounded-2xl tracking-widest py-3 active-scale transition-all"
              >
                Sign in / Sign up
              </NextStepButton>
              <button
                onClick={() => setShowBecomeMemberModal(false)}
                className="w-full rounded-2xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark font-semibold text-xs tracking-widest py-3 active-scale"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-relay-bg/70 dark:bg-relay-bg-dark/70 backdrop-blur-md">
          <div className="w-full max-w-sm glass-card p-8 shadow-2xl">
            <h2 className="text-3xl font-serif  text-relay-text dark:text-relay-text-dark mb-4 tracking-tighter text-center">Finalize Swap?</h2>
            <div className="bg-primary/5 p-6 rounded-3xl mb-8 border border-primary/10">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-bold tracking-widest text-relay-muted">Current Balance</span>
                <span className="text-sm font-bold text-relay-text dark:text-relay-text-dark">{credits.toLocaleString()} Cr</span>
              </div>
              <div className="flex justify-between items-center mb-4 text-primary">
                <span className="text-[10px] font-bold tracking-widest">Swap Value</span>
                <span className="text-sm font-bold">-{item.credits.toLocaleString()} Cr</span>
              </div>
              <div className="h-px bg-primary/20 mb-4"></div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold tracking-widest text-relay-muted">Balance After</span>
                <span className="text-base font-bold text-relay-text dark:text-relay-text-dark">{(credits - item.credits).toLocaleString()} Cr</span>
              </div>
            </div>
            <div className="space-y-3">
              <button 
                onClick={confirmSwap}
                disabled={isSwapping}
                className="w-full rounded-2xl bg-primary text-white font-semibold text-xs tracking-widest shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active-scale"
                style={{ height: '42px' }}
              >
                <>
                  <span className="material-symbols-outlined">verified</span>
                  Confirm Swap
                </>
              </button>
              <button 
                onClick={() => setShowConfirm(false)}
                className="w-full rounded-2xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark font-semibold text-xs tracking-widest active-scale"
                style={{ height: '42px' }}
              >
                Back to Listing
              </button>
            </div>
          </div>
        </div>
      )}

      <PickupCalendarModal
        open={pickupCalendarState.open}
        onClose={() => setPickupCalendarState((prev) => ({ ...prev, open: false }))}
        onConfirm={(slots) => {
          const locations = item?.pickupLocations;
          if (locations && locations.length >= 2) {
            setPendingSlots(slots);
            setPickupCalendarState((prev) => ({ ...prev, open: false }));
            setShowPickupLocation(true);
          } else {
            handlePickupTimesConfirm(slots);
          }
        }}
        minSlots={1}
        sellerAvailability={pickupCalendarState.sellerSlots}
      />
      {showPickupLocation && item?.pickupLocations && item.pickupLocations.length >= 2 && pendingSlots && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-relay-bg/70 dark:bg-relay-bg-dark/70 backdrop-blur-md">
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto bg-relay-surface dark:bg-relay-surface-dark rounded-[32px] border border-relay-border dark:border-relay-border-dark shadow-2xl p-6">
            <h2 className="text-xl font-serif  text-relay-text dark:text-relay-text-dark mb-1 tracking-tighter text-center">
              Choose pickup location
            </h2>
            <p className="text-[10px] font-bold tracking-widest text-relay-muted text-center mb-4">
              Seller offered 2 locations — pick one
            </p>
            <PickupLocationsMap locations={item.pickupLocations} className="mb-6" />
            <div className="space-y-3">
              {item.pickupLocations.map((loc, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handlePickupTimesConfirm(pendingSlots, loc)}
                  className="w-full flex items-start gap-3 p-4 rounded-2xl border border-relay-border dark:border-relay-border-dark bg-relay-bg dark:bg-relay-bg-dark text-left hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-primary !text-xl shrink-0 mt-0.5">location_on</span>
                  <span className="text-sm font-medium text-relay-text dark:text-relay-text-dark leading-snug">
                    {loc.displayName?.trim() || [loc.city, loc.state].filter(Boolean).join(', ') || 'Location'}
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => { setShowPickupLocation(false); setPendingSlots(null); setPickupCalendarState((prev) => ({ ...prev, open: true })); }}
              className="w-full max-w-[50%] mx-auto h-12 mt-6 text-relay-muted text-xs font-bold tracking-widest"
            >
              Back
            </button>
          </div>
        </div>
      )}
      {isSwapping && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-relay-bg/70 dark:bg-relay-bg-dark/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-6 glass-card">
            <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-sm font-bold tracking-widest text-relay-text dark:text-relay-text-dark">Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ListingDetailPage() {
  return (
    <Suspense>
      <ListingDetailPageContent />
    </Suspense>
  );
}
