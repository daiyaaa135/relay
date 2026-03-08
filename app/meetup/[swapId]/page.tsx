'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { LivePickupMap } from '@/app/components/LivePickupMap';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Slot = { date: string; start: string; end: string };
type ChosenLocation = { latitude: number; longitude: number; displayName?: string; city?: string; state?: string };

function BroadcastLocationIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Left waves */}
      <path d="M45 80 Q35 100 45 120" stroke="currentColor" strokeWidth={3} strokeLinecap="round" opacity={0.4} />
      <path d="M55 85 Q48 100 55 115" stroke="currentColor" strokeWidth={3} strokeLinecap="round" opacity={0.6} />
      <path d="M65 90 Q61 100 65 110" stroke="currentColor" strokeWidth={3} strokeLinecap="round" opacity={0.8} />
      {/* Right waves */}
      <path d="M155 80 Q165 100 155 120" stroke="currentColor" strokeWidth={3} strokeLinecap="round" opacity={0.4} />
      <path d="M145 85 Q152 100 145 115" stroke="currentColor" strokeWidth={3} strokeLinecap="round" opacity={0.6} />
      <path d="M135 90 Q139 100 135 110" stroke="currentColor" strokeWidth={3} strokeLinecap="round" opacity={0.8} />
      {/* Pin outline */}
      <path
        d="M100 50 C85 50 73 62 73 77 C73 92 100 130 100 130 C100 130 127 92 127 77 C127 62 115 50 100 50 Z"
        stroke="currentColor"
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Pin inner circle */}
      <circle cx={100} cy={77} r={10} stroke="currentColor" strokeWidth={3} fill="none" />
      {/* Center dot */}
      <circle cx={100} cy={77} r={4} fill="currentColor" />
    </svg>
  );
}

export default function MeetupPage() {
  const params = useParams();
  const router = useRouter();
  const swapId = (params.swapId as string) ?? '';
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [location, setLocation] = useState<ChosenLocation | null>(null);
  const [otherId, setOtherId] = useState<string | null>(null);
  const [otherDisplayName, setOtherDisplayName] = useState('');
  const [otherAvatarUrl, setOtherAvatarUrl] = useState<string | null>(null);
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  const [isBuyer, setIsBuyer] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [buyerLat, setBuyerLat] = useState<number | null>(null);
  const [buyerLon, setBuyerLon] = useState<number | null>(null);
  const [sellerLat, setSellerLat] = useState<number | null>(null);
  const [sellerLon, setSellerLon] = useState<number | null>(null);
  const [myLivePoint, setMyLivePoint] = useState<{ lat: number; lon: number } | null>(null);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [autoShareDisabled, setAutoShareDisabled] = useState(false);
  const [sellerArrivedAt, setSellerArrivedAt] = useState<string | null>(null);
  const [arrivedError, setArrivedError] = useState<string | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [gadgetId, setGadgetId] = useState<string | null>(null);
  const [canReportIssue, setCanReportIssue] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueReason, setIssueReason] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!swapId || !UUID_REGEX.test(swapId)) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      let { data: { session } } = await supabase.auth.getSession();
      let user = session?.user ?? null;
      if (!user?.id) {
        const { data: { user: u } } = await supabase.auth.getUser();
        user = u ?? null;
      }
      if (!user?.id) {
        await new Promise((r) => setTimeout(r, 500));
        if (cancelled) return;
        ({ data: { session } } = await supabase.auth.getSession());
        user = session?.user ?? null;
      }
      if (cancelled) return;
      if (!user?.id) {
        setLoading(false);
        setNotFound(true);
        return;
      }
      setUserId(user.id);
      const { data: myProfile } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).single();
      if (!cancelled && myProfile?.avatar_url) setMyAvatarUrl(myProfile.avatar_url);

      type SwapRow = {
        id: string;
        status: string;
        buyer_profile_id: string;
        seller_profile_id: string;
        gadget_id?: string | null;
        seller_arrived_at?: string | null;
        buyer_lat?: number | null;
        buyer_lon?: number | null;
        seller_lat?: number | null;
        seller_lon?: number | null;
        buyer?: { display_name: string; avatar_url?: string | null } | { display_name: string; avatar_url?: string | null }[];
        seller?: { display_name: string; avatar_url?: string | null } | { display_name: string; avatar_url?: string | null }[];
      };
      let swap: SwapRow | null = null;
      let swapError: { code?: string; message?: string } | null = null;
      let res = await supabase
        .from('swaps')
        .select('id, status, buyer_profile_id, seller_profile_id, gadget_id, seller_arrived_at, buyer_lat, buyer_lon, seller_lat, seller_lon, buyer:profiles!buyer_profile_id(display_name, avatar_url), seller:profiles!seller_profile_id(display_name, avatar_url)')
        .eq('id', swapId)
        .single();
      swapError = res.error;
      swap = res.data as SwapRow | null;
      if (swapError && !swap) {
        const fallback = await supabase.from('swaps').select('id, status, buyer_profile_id, seller_profile_id, buyer:profiles!buyer_profile_id(display_name), seller:profiles!seller_profile_id(display_name)').eq('id', swapId).single();
        if (!cancelled && !fallback.error && fallback.data) {
          swap = fallback.data as SwapRow;
          swapError = null;
        }
      }
      if (cancelled) return;
      if (swapError || !swap) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const row = swap;
      setStatus(row.status);
      setGadgetId(row.gadget_id ?? null);
      const buyer = Array.isArray(row.buyer) ? row.buyer[0] : row.buyer;
      const seller = Array.isArray(row.seller) ? row.seller[0] : row.seller;
      const isBuyerSide = row.buyer_profile_id === user.id;
      setIsBuyer(isBuyerSide);
      const otherProfileId = isBuyerSide ? row.seller_profile_id : row.buyer_profile_id;
      setOtherId(otherProfileId);
      let otherName = (isBuyerSide ? seller?.display_name : buyer?.display_name) ?? '';
      if (!otherName) {
        const otherId = isBuyerSide ? row.seller_profile_id : row.buyer_profile_id;
        const { data: p } = await supabase.from('profiles').select('display_name').eq('id', otherId).single();
        otherName = (p as { display_name?: string })?.display_name ?? (isBuyerSide ? 'Seller' : 'Buyer');
      }
      setOtherDisplayName(otherName);
      const otherAvatar = (isBuyerSide ? seller : buyer) as { avatar_url?: string | null } | undefined;
      if (otherAvatar && 'avatar_url' in otherAvatar) setOtherAvatarUrl(otherAvatar.avatar_url ?? null);
      if (typeof row.buyer_lat === 'number' && typeof row.buyer_lon === 'number') {
        setBuyerLat(row.buyer_lat);
        setBuyerLon(row.buyer_lon);
      }
      if (typeof row.seller_lat === 'number' && typeof row.seller_lon === 'number') {
        setSellerLat(row.seller_lat);
        setSellerLon(row.seller_lon);
      }
      if (row.seller_arrived_at) setSellerArrivedAt(row.seller_arrived_at);

      if (row.status === 'completed') {
        const { data: existingRating } = await supabase
          .from('swap_ratings')
          .select('id')
          .eq('swap_id', swapId)
          .eq('rater_profile_id', user.id)
          .maybeSingle();
        if (!cancelled && !existingRating) setShowRatingModal(true);
      }

      const { data: conv } = await supabase.from('conversations').select('id').eq('swap_id', swapId).limit(1).maybeSingle();
      if (!cancelled && conv?.id) setConversationId((conv as { id: string }).id);
      const { data: messages } = conv?.id
        ? await supabase.from('messages').select('content').eq('conversation_id', (conv as { id: string }).id).order('created_at', { ascending: true })
        : { data: [] };
      if (cancelled) {
        setLoading(false);
        return;
      }
      let parsedSlot: Slot | null = null;
      let parsedLocation: ChosenLocation | null = null;
      for (const m of (messages ?? []) as { content: string }[]) {
        try {
          const p = JSON.parse(m.content) as { _type?: string; slot?: Slot; chosenLocation?: ChosenLocation };
          if (p._type === 'pickup_accepted' && p.slot) parsedSlot = p.slot;
          if (p._type === 'pickup_proposal' && p.chosenLocation && typeof p.chosenLocation.latitude === 'number') parsedLocation = p.chosenLocation;
        } catch {
          // ignore
        }
      }
      setSlot(parsedSlot);
      setLocation(parsedLocation);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [swapId]);

  useEffect(() => {
    if (!slot) {
      setCanReportIssue(false);
      return;
    }
    const computeCanReport = () => {
      try {
        const pickup = new Date(`${slot.date}T${slot.start}:00`);
        if (Number.isNaN(pickup.getTime())) {
          setCanReportIssue(false);
          return;
        }
        const now = new Date();
        const diffMs = now.getTime() - pickup.getTime();
        setCanReportIssue(diffMs >= 60 * 60 * 1000);
      } catch {
        setCanReportIssue(false);
      }
    };
    computeCanReport();
    const id = window.setInterval(computeCanReport, 60_000);
    return () => window.clearInterval(id);
  }, [slot?.date, slot?.start]);

  useEffect(() => {
    if (!swapId || !UUID_REGEX.test(swapId) || !userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`meetup-swap:${swapId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'swaps', filter: `id=eq.${swapId}` }, (payload) => {
        const next = payload.new as { buyer_lat?: number | null; buyer_lon?: number | null; seller_lat?: number | null; seller_lon?: number | null; seller_arrived_at?: string | null; status?: string };
        if (typeof next.buyer_lat === 'number' && typeof next.buyer_lon === 'number') {
          setBuyerLat(next.buyer_lat);
          setBuyerLon(next.buyer_lon);
        } else {
          setBuyerLat(null);
          setBuyerLon(null);
        }
        if (typeof next.seller_lat === 'number' && typeof next.seller_lon === 'number') {
          setSellerLat(next.seller_lat);
          setSellerLon(next.seller_lon);
        } else {
          setSellerLat(null);
          setSellerLon(null);
        }
        if (next.seller_arrived_at !== undefined) setSellerArrivedAt(next.seller_arrived_at ?? null);
        if (next.status === 'completed') {
          setStatus('completed');
          setShowRatingModal(true);
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [swapId, userId]);

  const updateMyLiveLocation = async (lat: number, lon: number) => {
    if (!userId || !swapId) return;
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    const res = await fetch(`/api/swaps/${swapId}/location`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ lat, lon }),
    });
    const text = await res.text();
    let data: Record<string, unknown> | null = null;
    try {
      if (text) data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      data = null;
    }
    if (!res.ok) return;
    if (data) {
      if (typeof (data as { buyer_lat?: number }).buyer_lat === 'number') {
        setBuyerLat((data as { buyer_lat: number }).buyer_lat);
        setBuyerLon((data as { buyer_lon: number }).buyer_lon);
      }
      if (typeof (data as { seller_lat?: number }).seller_lat === 'number') {
        setSellerLat((data as { seller_lat: number }).seller_lat);
        setSellerLon((data as { seller_lon: number }).seller_lon);
      }
    }
  };

  const startSharingLocation = () => {
    if (!navigator.geolocation || !location || sharingLocation || watchIdRef.current != null) return;
    setSharingLocation(true);
    const throttleMs = 15000;
    let lastSent = 0;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setMyLivePoint({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        const now = Date.now();
        const isFirst = lastSent === 0;
        if (isFirst || now - lastSent >= throttleMs) {
          lastSent = now;
          updateMyLiveLocation(pos.coords.latitude, pos.coords.longitude);
        }
      },
      () => setSharingLocation(false),
      { enableHighAccuracy: true, maximumAge: throttleMs }
    );
  };

  const stopSharingLocation = async () => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setSharingLocation(false);
    setAutoShareDisabled(true);
    if (!userId || !swapId) return;
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    const res = await fetch(`/api/swaps/${swapId}/location`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ lat: null, lon: null }),
    });
    if (!res.ok) return;
    if (isBuyer) {
      setBuyerLat(null);
      setBuyerLon(null);
    } else {
      setSellerLat(null);
      setSellerLon(null);
    }
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // Show user's own position on the map immediately when map section loads
  useEffect(() => {
    if (!location || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setMyLivePoint({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
    );
  }, [location]);

  // Automatically start live location sharing around the agreed pickup time when the
  // user has already granted location access and a slot/location are known.
  useEffect(() => {
    if (!slot || !location || autoShareDisabled || sharingLocation) return;
    const pickup = new Date(`${slot.date}T${slot.start}:00`);
    if (Number.isNaN(pickup.getTime())) return;

    const now = Date.now();
    const leadMs = 5 * 60 * 1000; // start up to 5 minutes before pickup
    const startAt = pickup.getTime() - leadMs;
    const delay = Math.max(0, startAt - now);

    const timeoutId = window.setTimeout(() => {
      if (!autoShareDisabled && !sharingLocation && location) {
        startSharingLocation();
      }
    }, delay);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [slot?.date, slot?.start, location?.latitude, location?.longitude, autoShareDisabled, sharingLocation]);

  const pickupTimeLabel = slot
    ? (() => {
        const [h, min] = slot.start.split(':').map(Number);
        const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
        const ampm = h < 12 ? 'AM' : 'PM';
        return `pickup at ${hour}:${min.toString().padStart(2, '0')} ${ampm}`;
      })()
    : 'Pickup arranged';

  // Same stage logic as Explore: 2 = "[Name] is here" only when seller tapped Yes (seller_arrived_at set)
  const meetupStage: 1 | 2 | 3 =
    status === 'completed' ? 3 : sellerArrivedAt ? 2 : 1;

  const statusHeading =
    meetupStage === 1
      ? 'Preparing for your meetup...'
      : meetupStage === 2
        ? `${otherDisplayName || 'They'} is here`
        : 'Pickup Confirmed';

  const locationName = location?.displayName?.trim() || [location?.city, location?.state].filter(Boolean).join(', ') || 'Meeting spot';
  const addressLine = [location?.city, location?.state].filter(Boolean).join(', ') || '';

  const handleOpenIssueModal = () => {
    setIssueReason(null);
    setShowIssueModal(true);
  };

  const handleSubmitIssue = () => {
    if (!issueReason) return;
    setShowIssueModal(false);

    const encodedUser = otherId ? `userId=${encodeURIComponent(otherId)}` : '';

    if (issueReason === 'item_issue') {
      if (gadgetId) {
        const qs = [
          `listingId=${encodeURIComponent(gadgetId)}`,
          encodedUser,
        ].filter(Boolean).join('&');
        router.push(`/report/item?${qs}`);
      } else if (encodedUser) {
        router.push(`/report?${encodedUser}`);
      } else {
        router.push('/report');
      }
      return;
    }

    if (issueReason === 'no_show') {
      const params = [
        encodedUser,
        `reason=${encodeURIComponent('No-shows and lateness')}`,
      ].filter(Boolean).join('&');
      router.push(`/report?${params}`);
      return;
    }

    if (issueReason === 'other') {
      const params = [
        encodedUser,
        `reason=${encodeURIComponent('Something Else')}`,
      ].filter(Boolean).join('&');
      router.push(`/report?${params}`);
      return;
    }

    // Default: go to member report grid
    if (encodedUser) {
      router.push(`/report?${encodedUser}`);
    } else {
      router.push('/report');
    }
  };

  const handleConfirmPickup = async () => {
    if (!userId || !swapId || confirming || status === 'completed') return;
    setConfirming(true);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setConfirming(false);
      return;
    }
    const res = await fetch(`/api/swaps/${swapId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    });
    const body = await res.json().catch(() => ({}));
    setConfirming(false);
    if (res.ok) {
      setStatus('completed');
      setShowRatingModal(true);
    } else {
      alert(body?.error ?? 'Could not confirm pickup. Try again.');
    }
  };

  const handleSellerConfirmPickup = async () => {
    if (!userId || !swapId || confirming || status === 'completed' || isBuyer) return;
    setConfirming(true);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setConfirming(false);
      return;
    }
    const res = await fetch(`/api/swaps/${swapId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    });
    const body = await res.json().catch(() => ({}));
    setConfirming(false);
    if (res.ok) {
      setStatus('completed');
      setShowRatingModal(true);
    } else {
      alert(body?.error ?? 'Could not confirm pickup. Try again.');
    }
  };

  const handleSubmitRating = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!userId || !swapId || ratingStars < 1 || ratingStars > 5 || ratingSubmitting) return;
    setRatingError(null);
    setRatingSubmitting(true);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setRatingSubmitting(false);
      setRatingError('Session expired. Try Skip and rate later from their profile.');
      return;
    }
    try {
      const res = await fetch(`/api/swaps/${swapId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ rating: ratingStars, comment: ratingComment.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setShowRatingModal(false);
      } else {
        setRatingError((data as { error?: string }).error || 'Could not submit rating. Try again.');
      }
    } catch {
      setRatingError('Network error. Try again.');
    } finally {
      setRatingSubmitting(false);
    }
  };

  const handleSellerArrived = async () => {
    if (!userId || !swapId || isBuyer) return;
    setArrivedError(null);
    const supabase = createClient();
    const at = new Date().toISOString();
    const { error } = await supabase
      .from('swaps')
      .update({ seller_arrived_at: at })
      .eq('id', swapId)
      .eq('seller_profile_id', userId);
    if (error) {
      setArrivedError(error.message || 'Could not save. Try again.');
      return;
    }
    setSellerArrivedAt(at);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-relay-surface dark:bg-relay-surface-dark">
        <div className="size-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (notFound || !userId) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-relay-surface dark:bg-relay-surface-dark px-6">
        <p className="text-relay-muted font-medium mb-4">Meetup not found.</p>
        <button type="button" onClick={() => router.push('/')} className="h-8 px-6 rounded-xl bg-primary text-white text-xs font-semibold tracking-tight flex items-center justify-center">
          Back to Explore
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark">
      <div className="page-scroll">
        <header
          className="sticky top-0 z-20 glass-card flex items-center justify-between px-4 py-3 border-b border-relay-border dark:border-relay-border-dark bg-relay-surface/95 dark:bg-relay-surface-dark/95 backdrop-blur-md"
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
        >
          <button
            type="button"
            onClick={() => router.back()}
            className="size-10 rounded-full flex items-center justify-center text-relay-text dark:text-relay-text-dark"
            aria-label="Back"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          <span className="text-[10px] font-bold tracking-tight text-relay-muted">Meetup</span>
          <Link
            href={otherId ? `/report?userId=${otherId}` : '/report'}
            className="size-10 rounded-full flex items-center justify-center text-relay-muted"
            aria-label="Report issue"
          >
            <span className="material-symbols-outlined">help</span>
          </Link>
        </header>

        <div>
          {location && (
            <div className="border-b border-relay-border dark:border-relay-border-dark">
              <div className="relative w-full aspect-[4/3] bg-relay-bg dark:bg-relay-bg-dark">
                <LivePickupMap
                  meetingLat={location.latitude}
                  meetingLon={location.longitude}
                  buyerPoint={isBuyer ? (myLivePoint ?? (buyerLat != null && buyerLon != null ? { lat: buyerLat, lon: buyerLon } : null)) : (buyerLat != null && buyerLon != null ? { lat: buyerLat, lon: buyerLon } : null)}
                  sellerPoint={!isBuyer ? (myLivePoint ?? (sellerLat != null && sellerLon != null ? { lat: sellerLat, lon: sellerLon } : null)) : (sellerLat != null && sellerLon != null ? { lat: sellerLat, lon: sellerLon } : null)}
                  buyerLabel={isBuyer ? 'You' : otherDisplayName || 'Buyer'}
                  sellerLabel={isBuyer ? otherDisplayName || 'Seller' : 'You'}
                  buyerAvatarUrl={isBuyer ? myAvatarUrl : otherAvatarUrl}
                  sellerAvatarUrl={isBuyer ? otherAvatarUrl : myAvatarUrl}
                />
              </div>
              <div className="px-4 py-3">
              <p className="font-normal text-relay-text dark:text-relay-text-dark text-[12px] tracking-tighter">
                {locationName}
              </p>
              {addressLine && (
                <p className="text-[10px] text-relay-muted flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined !text-xs">location_on</span>
                  {addressLine}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 px-4 pt-4 pb-6">
        <div className="p-4 rounded-2xl glass-card border border-relay-border dark:border-relay-border-dark shadow-lg">
          <div className="flex flex-nowrap items-center gap-3 mb-1">
            <p className="text-relay-text dark:text-relay-text-dark font-semibold text-base min-w-0 flex-1">{statusHeading}</p>
            {location && (
              <button
                type="button"
                onClick={sharingLocation ? stopSharingLocation : startSharingLocation}
                className={`shrink-0 active-scale ${
                  sharingLocation
                    ? 'text-primary'
                    : 'text-relay-muted dark:text-relay-muted-light hover:text-primary'
                }`}
                style={{ margin: 2 }}
                aria-label={sharingLocation ? 'Stop sharing location' : 'Share my location'}
              >
                <BroadcastLocationIcon className="size-6" />
              </button>
            )}
          </div>
          <p className="text-relay-text dark:text-relay-text-dark text-sm text-relay-muted mb-2">{pickupTimeLabel}</p>
          <div className="flex gap-1 mb-4">
            {([1, 2, 3] as const).map((s) => (
                <div
                  key={s}
                  className={`h-1.5 flex-1 rounded-full ${
                    s <= meetupStage
                      ? meetupStage === 3 ? 'bg-green-500' : 'bg-primary'
                      : 'bg-relay-border dark:bg-relay-border-dark'
                  }`}
                />
            ))}
          </div>

          <div className="flex gap-3">
            {location && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  location.displayName?.trim() || [location.city, location.state].filter(Boolean).join(', ') || `${location.latitude},${location.longitude}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark text-[10px] font-normal tracking-tighter"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="size-6 shrink-0 text-current" aria-hidden>
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 6.25C9.92893 6.25 8.25 7.92893 8.25 10C8.25 12.0711 9.92893 13.75 12 13.75C14.0711 13.75 15.75 12.0711 15.75 10C15.75 7.92893 14.0711 6.25 12 6.25ZM9.75 10C9.75 8.75736 10.7574 7.75 12 7.75C13.2426 7.75 14.25 8.75736 14.25 10C14.25 11.2426 13.2426 12.25 12 12.25C10.7574 12.25 9.75 11.2426 9.75 10Z" fill="currentColor" />
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 0.25C7.11666 0.25 3.25 4.49277 3.25 9.6087C3.25 11.2494 4.06511 13.1814 5.09064 14.9945C6.13277 16.837 7.46288 18.6762 8.62903 20.1633L8.66793 20.2129C9.23714 20.9388 9.72203 21.5573 10.1922 21.9844C10.7052 22.4504 11.2709 22.7555 12 22.7555C12.7291 22.7555 13.2948 22.4504 13.8078 21.9844C14.278 21.5572 14.7629 20.9388 15.3321 20.2129L15.371 20.1633C16.5371 18.6762 17.8672 16.837 18.9094 14.9945C19.9349 13.1814 20.75 11.2494 20.75 9.6087C20.75 4.49277 16.8833 0.25 12 0.25ZM4.75 9.6087C4.75 5.21571 8.04678 1.75 12 1.75C15.9532 1.75 19.25 5.21571 19.25 9.6087C19.25 10.8352 18.6104 12.4764 17.6037 14.256C16.6137 16.0063 15.3342 17.7794 14.1906 19.2377C13.5717 20.027 13.1641 20.5426 12.7992 20.8741C12.4664 21.1764 12.2442 21.2555 12 21.2555C11.7558 21.2555 11.5336 21.1764 11.2008 20.8741C10.8359 20.5426 10.4283 20.027 9.80938 19.2377C8.66578 17.7794 7.38628 16.0063 6.39625 14.256C5.38962 12.4764 4.75 10.8352 4.75 9.6087Z" fill="currentColor" />
                </svg>
                Get directions
              </a>
            )}
            <Link
              href={conversationId ? `/messages/${conversationId}` : `/messages/${swapId}`}
              className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark text-[10px] font-normal tracking-tighter"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="size-6 shrink-0 text-current" aria-hidden>
                <path d="M11.2885 10.2372C11.0054 9.38779 9.92735 9.13331 9.29426 9.7664L8.53033 10.5303C8.23744 10.8232 7.76256 10.8232 7.46967 10.5303C7.17678 10.2374 7.17678 9.76256 7.46967 9.46967L8.2336 8.70574C9.65517 7.28417 12.0758 7.8556 12.7115 9.76283C12.9946 10.6122 14.0726 10.8667 14.7057 10.2336L15.4697 9.46967C15.7626 9.17678 16.2374 9.17678 16.5303 9.46967C16.8232 9.76256 16.8232 10.2374 16.5303 10.5303L15.7664 11.2943C14.3448 12.7158 11.9242 12.1444 11.2885 10.2372Z" fill="currentColor" />
                <path fillRule="evenodd" clipRule="evenodd" d="M9.96644 1.25H14.0336C15.4053 1.25 16.4807 1.24999 17.3451 1.32061C18.2252 1.39252 18.9523 1.54138 19.6104 1.87671C20.6924 2.42798 21.572 3.30762 22.1233 4.38955C22.4586 5.04769 22.6075 5.77479 22.6794 6.65494C22.75 7.51928 22.75 8.59471 22.75 9.96642V11.1842C22.75 11.2338 22.75 11.2828 22.75 11.3311C22.7502 12.8797 22.7504 13.8244 22.5177 14.6179C21.9667 16.4971 20.4971 17.9667 18.6179 18.5177C17.8244 18.7504 16.8797 18.7502 15.3311 18.75C15.2827 18.75 15.2338 18.75 15.1842 18.75H14.6354L14.5751 18.7501C13.7079 18.7556 12.8632 19.0264 12.1543 19.5259L12.1051 19.5609L9.49441 21.4257C7.9899 22.5003 6.01288 20.9484 6.69954 19.2317C6.79183 19.001 6.62191 18.75 6.37341 18.75H5.77166C3.27441 18.75 1.25 16.7256 1.25 14.2283L1.25 9.96644C1.25 8.59472 1.24999 7.51929 1.32061 6.65494C1.39252 5.77479 1.54138 5.04769 1.87671 4.38955C2.42798 3.30762 3.30762 2.42798 4.38955 1.87671C5.04769 1.54138 5.77479 1.39252 6.65494 1.32061C7.51929 1.24999 8.59472 1.25 9.96644 1.25ZM6.77708 2.81563C5.9897 2.87996 5.48197 3.00359 5.07054 3.21322C4.27085 3.62068 3.62068 4.27085 3.21322 5.07054C3.00359 5.48197 2.87996 5.9897 2.81563 6.77708C2.75058 7.57322 2.75 8.58749 2.75 10V14.2283C2.75 15.8972 4.10284 17.25 5.77166 17.25H6.37341C7.68311 17.25 8.57867 18.5728 8.09226 19.7888C7.96197 20.1145 8.33709 20.409 8.62255 20.2051L11.2333 18.3403L11.2902 18.2997C12.2493 17.6239 13.3922 17.2576 14.5655 17.2501L14.6354 17.25H15.1842C16.9261 17.25 17.6363 17.2424 18.1958 17.0783C19.5848 16.671 20.671 15.5848 21.0783 14.1958C21.2424 13.6363 21.25 12.9261 21.25 11.1842V10C21.25 8.58749 21.2494 7.57322 21.1844 6.77708C21.12 5.9897 20.9964 5.48197 20.7868 5.07054C20.3793 4.27085 19.7291 3.62068 18.9295 3.21322C18.518 3.00359 18.0103 2.87996 17.2229 2.81563C16.4268 2.75058 15.4125 2.75 14 2.75H10C8.58749 2.75 7.57322 2.75058 6.77708 2.81563Z" fill="currentColor" />
              </svg>
              Message
            </Link>
          </div>
        </div>

        <div className="mb-3" aria-hidden />

        {isBuyer ? (
          <div className="p-5 rounded-2xl bg-relay-surface dark:bg-relay-input-dark border border-relay-border dark:border-relay-border-dark">
            <p className="text-relay-text dark:text-relay-text-dark font-semibold text-base mb-1">Got your gadget?</p>
            <p className="text-relay-muted text-sm mb-4">We&apos;re just checking. Once you confirm, you can rate {otherDisplayName}.</p>
            {status === 'completed' ? (
              <p className="text-relay-text dark:text-relay-text-dark text-sm font-medium">Pickup confirmed.</p>
            ) : (
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handleConfirmPickup}
                  disabled={confirming}
                  className="flex-1 flex justify-center text-primary text-[11px] font-semibold tracking-tight disabled:opacity-50"
                >
                  {confirming ? 'Confirming…' : 'Confirm pickup'}
                </button>
                {canReportIssue && (
                  <button
                    type="button"
                    onClick={handleOpenIssueModal}
                    className="flex-1 flex justify-center text-relay-muted dark:text-relay-muted-light text-[11px] font-medium tracking-tight underline-offset-2 hover:underline"
                  >
                    Report an issue
                  </button>
                )}
              </div>
            )}
          </div>
        ) : status === 'completed' ? (
          <div className="p-5 rounded-2xl bg-relay-surface dark:bg-relay-input-dark border border-relay-border dark:border-relay-border-dark">
            <p className="text-relay-text dark:text-relay-text-dark text-sm font-medium">Pickup confirmed.</p>
          </div>
        ) : sellerArrivedAt ? (
          <div className="p-5 rounded-2xl bg-relay-surface dark:bg-relay-input-dark border border-relay-border dark:border-relay-border-dark">
            <p className="text-relay-text dark:text-relay-text-dark font-semibold text-base mb-4">Did {otherDisplayName || 'the buyer'} finish the pickup?</p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleSellerConfirmPickup}
                disabled={confirming}
                className="flex-1 flex justify-center text-primary text-[11px] font-semibold tracking-tight disabled:opacity-50"
              >
                {confirming ? 'Confirming…' : 'Confirm pickup'}
              </button>
              {canReportIssue && (
                <button
                  type="button"
                  onClick={handleOpenIssueModal}
                  className="flex-1 flex justify-center text-relay-muted dark:text-relay-muted-light text-[11px] font-medium tracking-tight underline-offset-2 hover:underline"
                >
                  Report an issue
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-relay-surface dark:bg-relay-input-dark border border-relay-border dark:border-relay-border-dark">
            <p className="text-relay-text dark:text-relay-text-dark font-semibold text-base mb-4">Did you arrive at the meeting spot?</p>
            {arrivedError && (
              <p className="text-relay-text dark:text-relay-text-dark/80 text-xs mb-3">
                {arrivedError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSellerArrived}
                className="flex-1 h-12 rounded-xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark text-[10px] font-normal tracking-tighter"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => router.push(conversationId ? `/messages/${conversationId}` : `/messages/${swapId}`)}
                className="flex-1 h-12 rounded-xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark text-[10px] font-normal tracking-tighter"
              >
                Not yet
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
      </div>

      {showRatingModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-relay-bg/70 dark:bg-relay-bg-dark/70 backdrop-blur-md"
          aria-modal="true"
          role="dialog"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="w-full max-w-sm p-6 glass-card shadow-xl"
            style={{ width: '61.8vw', maxWidth: 420, minWidth: 220 }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-relay-text dark:text-relay-text-dark font-semibold text-lg mb-1">Rate {otherDisplayName || 'your swap partner'}</p>
            <p className="text-relay-muted text-sm mb-4">How did the pickup go?</p>
            {ratingError && (
              <p className="text-relay-text dark:text-relay-text-dark/80 text-xs mb-3">
                {ratingError}
              </p>
            )}
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRatingStars(star)}
                  className="size-10 rounded-full flex items-center justify-center text-2xl transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label={`${star} star${star > 1 ? 's' : ''}`}
                >
                  <span className={ratingStars >= star ? 'text-primary' : 'text-relay-muted opacity-50'}>
                    {ratingStars >= star ? '★' : '☆'}
                  </span>
                </button>
              ))}
            </div>
            <label className="block mb-4">
              <span className="text-relay-muted text-xs block mb-1">Add a comment (optional)</span>
              <textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="How did it go?"
                maxLength={500}
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark text-sm placeholder:text-relay-muted resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowRatingModal(false)}
                className="flex-1 h-8 rounded-xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark text-xs font-bold tracking-tight"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmitRating(e)}
                disabled={ratingStars < 1 || ratingSubmitting}
                className="flex-1 h-8 rounded-xl bg-primary text-white text-xs font-semibold tracking-tight disabled:opacity-50"
              >
                {ratingSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showIssueModal && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center px-6 bg-relay-bg/70 dark:bg-relay-bg-dark/70 backdrop-blur-md"
          aria-modal="true"
          role="dialog"
          onClick={() => setShowIssueModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl glass-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-relay-text dark:text-relay-text-dark mb-4">
              What happened at pickup?
            </h2>
            <div className="space-y-2 mb-5">
              {[
                { id: 'no_show', label: "The other person didn't show up" },
                { id: 'item_issue', label: "I received the item but there's an issue" },
                { id: 'other', label: 'Something else' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setIssueReason(opt.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left text-sm ${
                    issueReason === opt.id
                      ? 'border-primary bg-primary/5 text-relay-text dark:text-relay-text-dark'
                      : 'border-relay-border dark:border-relay-border-dark bg-relay-bg dark:bg-relay-bg-dark text-relay-text dark:text-relay-text-dark'
                  }`}
                >
                  <span
                    className={`size-4 rounded-full border flex items-center justify-center ${
                      issueReason === opt.id ? 'border-primary' : 'border-relay-border dark:border-relay-border-dark'
                    }`}
                  >
                    {issueReason === opt.id && <span className="size-2 rounded-full bg-primary" />}
                  </span>
                  <span className="text-[13px] leading-snug">{opt.label}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowIssueModal(false)}
                className="flex-1 h-8 rounded-xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-xs font-bold tracking-tight text-relay-text dark:text-relay-text-dark"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!issueReason}
                onClick={handleSubmitIssue}
                className="flex-1 h-8 rounded-xl bg-primary text-white text-xs font-semibold tracking-tight disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
