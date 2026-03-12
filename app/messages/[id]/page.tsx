'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { LivePickupMap } from '@/app/components/LivePickupMap';
import { PickupCalendarModal, type PickupSlot } from '@/app/components/PickupCalendarModal';
import { getDefaultAvatar } from '@/lib/avatars';
import { formatJoinedDate } from '@/lib/dateFormatters';
import { ChevronIcon } from '@/app/components/ChevronIcon';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SwapGadget = { id: string; name: string; image_urls: string[] | null } | null;

type SwapWithProfiles = {
  id: string;
  buyer_profile_id: string;
  seller_profile_id: string;
  status: string;
  buyer_lat?: number | null;
  buyer_lon?: number | null;
  buyer_location_at?: string | null;
  seller_lat?: number | null;
  seller_lon?: number | null;
  seller_location_at?: string | null;
  buyer?: { display_name: string; avatar_url: string | null; created_at?: string };
  seller?: { display_name: string; avatar_url: string | null; created_at?: string };
  gadget?: SwapGadget;
};

type MessageRow = {
  id: string;
  content: string;
  sender_profile_id: string;
  created_at: string;
  read_at?: string | null;
};

export default function ChatThreadPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params.id as string) || '';
  const isValidId = UUID_REGEX.test(id);

  const [userId, setUserId] = useState<string | null>(null);
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [swap, setSwap] = useState<SwapWithProfiles | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [message, setMessage] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showRescheduleCalendar, setShowRescheduleCalendar] = useState(false);
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);
  const [myLivePoint, setMyLivePoint] = useState<{ lat: number; lon: number } | null>(null);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [autoShareDisabled, setAutoShareDisabled] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(true);
  const watchIdRef = useRef<number | null>(null);
  const listEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id || !isValidId) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      setUserId(user?.id ?? null);
      if (!user) {
        setLoading(false);
        setNotFound(true);
        return;
      }

      // Run myProfile + convById in parallel — neither depends on the other
      const [{ data: myProfile }, convById] = await Promise.all([
        supabase.from('profiles').select('avatar_url').eq('id', user.id).single(),
        supabase.from('conversations').select('id, swap_id, buyer_profile_id, seller_profile_id, gadget_id').eq('id', id).single(),
      ]);
      if (!cancelled && myProfile?.avatar_url) setMyAvatarUrl(myProfile.avatar_url);

      let resolvedConversationId: string;
      let swapIdToLoad: string | null = null;
      if (convById.data?.id) {
        resolvedConversationId = (convById.data as { id: string }).id;
        swapIdToLoad = (convById.data as { swap_id: string | null }).swap_id;
      } else {
        const convBySwapId = await supabase.from('conversations').select('id').eq('swap_id', id).single();
        if (convBySwapId.data?.id) {
          resolvedConversationId = (convBySwapId.data as { id: string }).id;
          swapIdToLoad = id;
        } else {
          if (!cancelled) { setNotFound(true); setLoading(false); }
          return;
        }
      }

      if (cancelled) return;
      setConversationId(resolvedConversationId);

      // Run swap/conversation details + messages fetch in parallel
      const swapOrConvQuery = swapIdToLoad
        ? supabase.from('swaps').select(`
            id,
            buyer_profile_id,
            seller_profile_id,
            status,
            buyer_lat,
            buyer_lon,
            buyer_location_at,
            seller_lat,
            seller_lon,
            seller_location_at,
            buyer:profiles!buyer_profile_id(display_name, avatar_url, created_at),
            seller:profiles!seller_profile_id(display_name, avatar_url, created_at),
            gadget:gadgets!gadget_id(id, name, image_urls)
          `).eq('id', swapIdToLoad).single()
        : supabase.from('conversations').select(`
            id,
            buyer_profile_id,
            seller_profile_id,
            buyer:profiles!buyer_profile_id(display_name, avatar_url, created_at),
            seller:profiles!seller_profile_id(display_name, avatar_url, created_at),
            gadget:gadgets!gadget_id(id, name, image_urls)
          `).eq('id', resolvedConversationId).single();

      const [swapOrConvRes, { data: messagesData }] = await Promise.all([
        swapOrConvQuery,
        supabase.from('messages')
          .select('id, content, sender_profile_id, created_at, read_at')
          .eq('conversation_id', resolvedConversationId)
          .order('created_at', { ascending: true }),
      ]);

      if (!cancelled && swapOrConvRes.data) {
        if (swapIdToLoad) {
          const s = swapOrConvRes.data as unknown as SwapWithProfiles & { gadget?: SwapGadget | SwapGadget[] };
          const buyerProfile = Array.isArray(s.buyer) ? (s.buyer as unknown[])[0] : s.buyer;
          const sellerProfile = Array.isArray(s.seller) ? (s.seller as unknown[])[0] : s.seller;
          const gadgetNorm = Array.isArray(s.gadget) ? (s.gadget as SwapGadget[])[0] : s.gadget ?? null;
          setSwap({
            ...s,
            buyer: buyerProfile as SwapWithProfiles['buyer'],
            seller: sellerProfile as SwapWithProfiles['seller'],
            gadget: gadgetNorm as SwapWithProfiles['gadget'],
          });
        } else {
          const c = swapOrConvRes.data as Record<string, unknown>;
          const buyerProfile = Array.isArray(c.buyer) ? (c.buyer as Record<string, unknown>[])[0] : c.buyer;
          const sellerProfile = Array.isArray(c.seller) ? (c.seller as Record<string, unknown>[])[0] : c.seller;
          const gadgetNorm = Array.isArray(c.gadget) ? (c.gadget as SwapGadget[])[0] : (c.gadget as SwapGadget) ?? null;
          setSwap({
            id: '',
            buyer_profile_id: c.buyer_profile_id as string,
            seller_profile_id: c.seller_profile_id as string,
            status: '',
            buyer: buyerProfile as SwapWithProfiles['buyer'],
            seller: sellerProfile as SwapWithProfiles['seller'],
            gadget: gadgetNorm as SwapWithProfiles['gadget'],
          });
        }
      }

      if (!cancelled && messagesData) setMessages((messagesData as MessageRow[]));
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id, isValidId]);

  useEffect(() => {
    if (!conversationId || !userId || messages.length === 0) return;
    const unreadIds = messages
      .filter((m) => m.sender_profile_id !== userId && m.read_at == null)
      .map((m) => m.id);
    if (unreadIds.length === 0) return;
    (async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const res = await fetch('/api/messages/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ conversationId, messageIds: unreadIds }),
      });
      if (res.ok) {
        const now = new Date().toISOString();
        setMessages((prev) => prev.map((m) => (unreadIds.includes(m.id) ? { ...m, read_at: now } : m)));
      }
    })();
  }, [conversationId, userId, messages]);

  useEffect(() => {
    if (!conversationId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const newMsg = payload.new as MessageRow;
          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const updated = payload.new as MessageRow;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, read_at: updated.read_at } : m))
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    if (!swap?.id || !userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`swap:${swap.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'swaps', filter: `id=eq.${swap.id}` },
        (payload) => {
          const next = payload.new as SwapWithProfiles;
          setSwap((prev) => (prev ? { ...prev, buyer_lat: next.buyer_lat, buyer_lon: next.buyer_lon, buyer_location_at: next.buyer_location_at, seller_lat: next.seller_lat, seller_lon: next.seller_lon, seller_location_at: next.seller_location_at } : prev));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [swap?.id, userId]);

  const otherDisplayName =
    swap && userId
      ? swap.buyer_profile_id === userId
        ? (swap.seller?.display_name ?? 'Seller')
        : (swap.buyer?.display_name ?? 'Buyer')
      : '';
  const otherAvatar =
    swap && userId
      ? swap.buyer_profile_id === userId
        ? swap.seller?.avatar_url
        : swap.buyer?.avatar_url
      : null;
  const otherCreatedAt =
    swap && userId
      ? swap.buyer_profile_id === userId
        ? swap.seller?.created_at
        : swap.buyer?.created_at
      : undefined;
  const otherId = swap && userId ? (swap.buyer_profile_id === userId ? swap.seller_profile_id : swap.buyer_profile_id) : '';

  const handleSend = async () => {
    const text = message.trim();
    if (!text || !userId || !conversationId || sending) return;
    import('@capacitor/haptics').then(({ Haptics, ImpactStyle }) => {
      Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
      });
    }).catch(() => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
    });
    setSending(true);
    setSendError(null);
    setMessage('');
    const supabase = createClient();
    const { data: inserted, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_profile_id: userId,
        content: text,
      })
      .select('id, content, sender_profile_id, created_at')
      .single();
    setSending(false);
    if (!error && inserted) {
      setMessages((prev) => [...prev, inserted as MessageRow]);
    } else if (error) {
      setMessage(text);
      setSendError(/policy|row-level security|blocked/i.test(error.message) ? 'You can\'t message this user.' : 'Unable to send message.');
    }
  };

  const formatTime = (createdAt: string) => {
    const d = new Date(createdAt);
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  };

  type PickupSlot = { date: string; start: string; end: string };
  type ChosenLocation = { city: string; state: string; latitude: number; longitude: number; displayName?: string };
  type PickupProposalPayload = { _type: 'pickup_proposal'; slots: PickupSlot[]; chosenLocation?: ChosenLocation };
  type PickupAcceptedPayload = { _type: 'pickup_accepted'; slot: PickupSlot };

  const parseMessageContent = (content: string): { type: 'text' } | { type: 'pickup_proposal'; slots: PickupSlot[]; chosenLocation?: ChosenLocation } | { type: 'pickup_accepted'; slot: PickupSlot } | { type: 'swap_cancelled'; buyerDisplayName: string } => {
    try {
      const parsed = JSON.parse(content) as PickupProposalPayload | PickupAcceptedPayload | { _type: string; buyerDisplayName?: string };
      if (parsed._type === 'pickup_proposal' && Array.isArray((parsed as PickupProposalPayload).slots)) return { type: 'pickup_proposal', slots: (parsed as PickupProposalPayload).slots, chosenLocation: (parsed as PickupProposalPayload).chosenLocation };
      if (parsed._type === 'pickup_accepted' && (parsed as PickupAcceptedPayload).slot) return { type: 'pickup_accepted', slot: (parsed as PickupAcceptedPayload).slot };
      if (parsed._type === 'swap_cancelled') return { type: 'swap_cancelled', buyerDisplayName: parsed.buyerDisplayName ?? 'Buyer' };
    } catch {
      // plain text
    }
    return { type: 'text' };
  };

  const proposalCount = messages.filter((m) => {
    try { return (JSON.parse(m.content) as { _type?: string })._type === 'pickup_proposal'; } catch { return false; }
  }).length;

  const handleReschedule = async (slots: PickupSlot[]) => {
    if (!userId || !conversationId || rescheduleSubmitting) return;
    setRescheduleSubmitting(true);
    setShowRescheduleCalendar(false);

    if (proposalCount >= 2 && swap?.id) {
      // Auto-cancel: exceeded reschedule limit
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await fetch(`/api/swaps/${swap.id}/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        });
      }
      setSwap((prev) => (prev ? { ...prev, status: 'cancelled' } : prev));
      setRescheduleSubmitting(false);
      return;
    }

    const supabase = createClient();
    const proposalPayload = { _type: 'pickup_proposal' as const, slots };
    if (conversationId) {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_profile_id: userId,
        content: JSON.stringify(proposalPayload),
      });
    }
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), content: JSON.stringify(proposalPayload), sender_profile_id: userId, created_at: new Date().toISOString() },
    ]);
    setRescheduleSubmitting(false);
  };

  const formatSlotLabel = (slot: PickupSlot) => {
    const d = new Date(slot.date + 'T12:00:00');
    const dateStr = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    const toAmPm = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      if (h === 0) return `12:${m.toString().padStart(2, '0')} am`;
      if (h < 12) return `${h}:${m.toString().padStart(2, '0')} am`;
      if (h === 12) return `12:${m.toString().padStart(2, '0')} pm`;
      return `${h - 12}:${m.toString().padStart(2, '0')} pm`;
    };
    return `${dateStr}, ${toAmPm(slot.start)}–${toAmPm(slot.end)}`;
  };

  const formatTimeOnly = (start: string) => {
    const [h, m] = start.split(':').map(Number);
    if (h === 0) return `12:${m.toString().padStart(2, '0')} am`;
    if (h < 12) return `${h}:${m.toString().padStart(2, '0')} am`;
    if (h === 12) return `12:${m.toString().padStart(2, '0')} pm`;
    return `${h - 12}:${m.toString().padStart(2, '0')} pm`;
  };

  const groupSlotsByDate = (slots: PickupSlot[]): { date: string; dateLabel: string; slots: PickupSlot[] }[] => {
    const byDate = new Map<string, PickupSlot[]>();
    for (const slot of slots) {
      const list = byDate.get(slot.date) ?? [];
      list.push(slot);
      byDate.set(slot.date, list);
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, slotsForDate]) => ({
        date,
        dateLabel: new Date(date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
        slots: slotsForDate.sort((a, b) => a.start.localeCompare(b.start)),
      }));
  };

  const isSeller = swap && userId ? swap.seller_profile_id === userId : false;
  const hasAcceptedPickup = messages.some((m) => {
    const p = parseMessageContent(m.content);
    return p.type === 'pickup_accepted';
  });

  const agreedMeetingLocation = (() => {
    if (!hasAcceptedPickup) return null;
    const proposalsWithLocation = messages.filter((m) => {
      const p = parseMessageContent(m.content);
      return p.type === 'pickup_proposal' && p.chosenLocation;
    });
    const proposal = proposalsWithLocation.length > 0 ? proposalsWithLocation[proposalsWithLocation.length - 1] : null;
    if (!proposal) return null;
    const p = parseMessageContent(proposal.content);
    return p.type === 'pickup_proposal' ? p.chosenLocation ?? null : null;
  })();

  const lat = agreedMeetingLocation && (typeof agreedMeetingLocation.latitude === 'number' ? agreedMeetingLocation.latitude : Number(agreedMeetingLocation.latitude));
  const lon = agreedMeetingLocation && (typeof agreedMeetingLocation.longitude === 'number' ? agreedMeetingLocation.longitude : Number(agreedMeetingLocation.longitude));
  const showMapsSection = !!(
    swap &&
    String(swap.status).toLowerCase() === 'pickup_arranged' &&
    agreedMeetingLocation &&
    typeof lat === 'number' &&
    !Number.isNaN(lat) &&
    typeof lon === 'number' &&
    !Number.isNaN(lon)
  );
  useEffect(() => {
    if (showMapsSection) return;
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showMapsSection]);
  useEffect(() => {
    if (!showMapsSection || !scrollContainerRef.current) return;
    const el = scrollContainerRef.current;
    const id = setTimeout(() => {
      el.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(id);
  }, [showMapsSection]);

  const agreedSlot = (() => {
    const accepted = messages.find((m) => parseMessageContent(m.content).type === 'pickup_accepted');
    if (!accepted) return null;
    const p = parseMessageContent(accepted.content);
    return p.type === 'pickup_accepted' ? p.slot : null;
  })();

  const handleAcceptPickupSlot = async (slot: PickupSlot) => {
    if (!userId || !conversationId || !swap?.id || sending || !isSeller || hasAcceptedPickup) return;
    setSending(true);
    const supabase = createClient();
    const content = JSON.stringify({ _type: 'pickup_accepted', slot });
    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_profile_id: userId,
      content,
    });
    if (!error) {
      setMessages((prev) => [...prev, { id: '', content, sender_profile_id: userId!, created_at: new Date().toISOString() }]);
      await supabase.from('swaps').update({ status: 'pickup_arranged' }).eq('id', swap.id);
      setSwap((prev) => (prev ? { ...prev, status: 'pickup_arranged' } : null));
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetch('/api/calendar/create-pickup-event', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ swapId: swap.id, slot }),
          });
        }
      } catch {
        // ignore calendar errors; swap flow should still succeed
      }
    }
    setSending(false);
  };

  const updateMyLiveLocation = async (lat: number, lon: number) => {
    if (!swap?.id || !userId) return;
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    const res = await fetch(`/api/swaps/${id}/location`, {
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
    if (data && res.ok) setSwap((prev) => (prev ? { ...prev, ...data } : prev));
  };

  const startSharingLocation = () => {
    if (!navigator.geolocation || !agreedMeetingLocation || sharingLocation || watchIdRef.current != null) return;
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
    if (!swap?.id || !userId) return;
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    const res = await fetch(`/api/swaps/${swap.id}/location`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ lat: null, lon: null }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setSwap((prev) => (prev ? { ...prev, ...data } : prev));
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // Show user's own position on the map immediately when map section becomes visible
  useEffect(() => {
    if (!agreedMeetingLocation || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setMyLivePoint({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
    );
  }, [agreedMeetingLocation]);

  // When a pickup time is agreed and maps section is visible, automatically start sharing
  // live location around the pickup time for users who have already granted location access.
  useEffect(() => {
    if (!agreedSlot || !showMapsSection || autoShareDisabled || sharingLocation || !agreedMeetingLocation) return;
    const pickup = new Date(`${agreedSlot.date}T${agreedSlot.start}:00`);
    if (Number.isNaN(pickup.getTime())) return;

    const now = Date.now();
    const leadMs = 5 * 60 * 1000; // start up to 5 minutes before pickup
    const startAt = pickup.getTime() - leadMs;
    const delay = Math.max(0, startAt - now);

    const timeoutId = window.setTimeout(() => {
      if (!autoShareDisabled && !sharingLocation && agreedMeetingLocation) {
        startSharingLocation();
      }
    }, delay);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [agreedSlot?.date, agreedSlot?.start, showMapsSection, autoShareDisabled, sharingLocation, agreedMeetingLocation]);

  if (loading) {
    return (
      <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark items-center justify-center">
        <div className="size-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (notFound || !isValidId) {
    return (
      <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark items-center justify-center px-6 text-center">
        <p className="text-relay-muted text-sm mb-4">Conversation not found or you’re not part of it.</p>
        <p className="text-relay-muted text-xs mb-6">Open a conversation from your Inbox or by tapping Message on a listing.</p>
        <button
          onClick={() => router.push('/messages')}
          className="h-8 px-8 rounded-2xl bg-primary text-white text-xs font-semibold tracking-tight"
        >
          Back to Inbox
        </button>
      </div>
    );
  }

  if (!swap) return null;

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark transition-colors">
      <header className="shrink-0 px-6 pb-6 flex items-center gap-4 bg-transparent z-[60] pt-safe-3">
        <button
          onClick={() => router.push('/messages')}
          className="text-relay-muted hover:text-relay-text dark:hover:text-relay-text-dark transition-colors"
        >
          <ChevronIcon direction="left" className="size-6" />
        </button>
        <button
          type="button"
          onClick={() => otherId && router.push(`/profile/${otherId}`)}
          className="size-12 rounded-full overflow-hidden border-2 border-relay-border dark:border-relay-border-dark p-0.5 shrink-0 focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-full"
        >
          <img
            src={otherAvatar || getDefaultAvatar(otherId)}
            alt={otherDisplayName}
            className="w-full h-full object-cover rounded-full"
          />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-serif font-semibold text-relay-text dark:text-relay-text-dark leading-none">{otherDisplayName}</h1>
          {otherCreatedAt && (
            <p className="text-[10px] font-normal text-relay-muted dark:text-relay-muted-light mb-1">
              {formatJoinedDate(otherCreatedAt)}
            </p>
          )}
          {swap?.id && (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-medium tracking-tighter text-relay-muted">
                {{ pending: 'Pending', confirmed: 'Confirmed', pickup_arranged: 'Pick up arranged', completed: 'Completed', cancelled: 'Cancelled' }[swap.status] ?? swap.status}
              </span>
            </div>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setShowOptions(!showOptions)}
            className={`text-relay-muted hover:text-primary transition-colors ${showOptions ? 'text-primary' : ''}`}
          >
            <span className="material-symbols-outlined !text-3xl">more_vert</span>
          </button>
          {showOptions && (
            <div className="absolute right-0 top-12 w-56 bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark rounded-[32px] shadow-2xl py-3 z-50">
              <button
                onClick={() => {
                  router.push(`/profile/${otherId}`);
                  setShowOptions(false);
                }}
                className="w-full px-6 py-4 flex items-center gap-3 text-relay-text dark:text-relay-text-dark hover:bg-primary/5 transition-all text-[11px] tracking-tight"
              >
                <span className="material-symbols-outlined !text-lg">person</span>
                View Profile
              </button>
              <div className="h-px bg-relay-border dark:border-relay-border-dark mx-4 my-1" />
              <button
                onClick={() => {
                  router.push(otherId ? `/report?userId=${otherId}` : '/report');
                  setShowOptions(false);
                }}
                className="w-full px-6 py-4 flex items-center gap-3 text-primary hover:bg-primary/5 transition-all text-[11px] tracking-tight"
              >
                <span className="material-symbols-outlined !text-lg">flag</span>
                Report
              </button>
            </div>
          )}
        </div>
      </header>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto flex flex-col hide-scrollbar" onClick={() => setShowOptions(false)}>
        {showMapsSection && (
          <div className="sticky top-0 z-10 bg-relay-surface/95 dark:bg-relay-surface-dark/95 backdrop-blur-md border-b border-relay-border dark:border-relay-border-dark">
            <button
              type="button"
              onClick={() => setMapExpanded((e) => !e)}
              className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-relay-bg/50 dark:hover:bg-relay-bg-dark/50 transition-colors"
            >
              <p className="text-[10px] font-normal tracking-tighter text-relay-muted flex items-center gap-1.5 min-w-0 flex-1">
                <span className="material-symbols-outlined !text-sm text-primary shrink-0">location_on</span>
                <span className="truncate">{agreedMeetingLocation!.displayName?.trim() || [agreedMeetingLocation!.city, agreedMeetingLocation!.state].filter(Boolean).join(', ')}</span>
              </p>
              <span className="material-symbols-outlined text-relay-muted shrink-0">
                {mapExpanded ? 'expand_less' : 'expand_more'}
              </span>
            </button>
            {mapExpanded && (
              <div className="px-4 pb-4">
                <LivePickupMap
                  meetingLat={lat!}
                  meetingLon={lon!}
                  buyerPoint={!isSeller ? (myLivePoint ?? (swap.buyer_lat != null && swap.buyer_lon != null ? { lat: Number(swap.buyer_lat), lon: Number(swap.buyer_lon) } : null)) : (swap.buyer_lat != null && swap.buyer_lon != null ? { lat: Number(swap.buyer_lat), lon: Number(swap.buyer_lon) } : null)}
                  sellerPoint={isSeller ? (myLivePoint ?? (swap.seller_lat != null && swap.seller_lon != null ? { lat: Number(swap.seller_lat), lon: Number(swap.seller_lon) } : null)) : (swap.seller_lat != null && swap.seller_lon != null ? { lat: Number(swap.seller_lat), lon: Number(swap.seller_lon) } : null)}
                  buyerLabel={isSeller ? (swap.buyer?.display_name ?? 'Buyer') : 'You'}
                  sellerLabel={isSeller ? 'You' : (swap.seller?.display_name ?? 'Seller')}
                  buyerAvatarUrl={isSeller ? swap.buyer?.avatar_url : myAvatarUrl}
                  sellerAvatarUrl={isSeller ? myAvatarUrl : swap.seller?.avatar_url}
                />
              </div>
            )}
          </div>
        )}

        <div className="px-6 py-8 space-y-8 flex flex-col flex-1">
          <div className="text-center">
            <span className="text-[10px] font-semibold tracking-tight text-relay-muted opacity-40">Conversation</span>
          </div>

          {swap?.gadget && (
            <Link
              href={`/listing/${swap.gadget.id}`}
              className="flex items-center gap-3 p-3 rounded-2xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark hover:opacity-90 transition-opacity w-full max-w-[280px] mx-auto"
            >
              <div className="size-14 rounded-xl overflow-hidden bg-relay-surface dark:bg-relay-surface-dark shrink-0">
                {swap.gadget.image_urls?.[0] ? (
                  <img src={swap.gadget.image_urls[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-relay-muted w-full h-full flex items-center justify-center !text-2xl">inventory_2</span>
                )}
              </div>
              <p className="text-xs font-medium text-relay-text dark:text-relay-text-dark truncate flex-1">{swap.gadget.name}</p>
            </Link>
          )}

        {messages.length === 0 ? (
          <p className="text-center text-relay-muted text-xs">No messages yet. Say hi!</p>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.sender_profile_id === userId;
            const parsed = parseMessageContent(msg.content);

            if (parsed.type === 'pickup_proposal') {
              const isBuyer = msg.sender_profile_id === userId;
              const buyerLocationLabel = parsed.chosenLocation
                ? (parsed.chosenLocation.displayName?.trim() || [parsed.chosenLocation.city, parsed.chosenLocation.state].filter(Boolean).join(', '))
                : null;
              const gadget = swap?.gadget;
              const itemPreview = gadget && (
                <Link
                  href={`/listing/${gadget.id}`}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark hover:opacity-90 transition-opacity w-full max-w-[280px]"
                >
                  <div className="size-14 rounded-xl overflow-hidden bg-relay-surface dark:bg-relay-surface-dark shrink-0">
                    {gadget.image_urls?.[0] ? (
                      <img src={gadget.image_urls[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-relay-muted w-full h-full flex items-center justify-center !text-2xl">inventory_2</span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-relay-text dark:text-relay-text-dark truncate flex-1">{gadget.name}</p>
                </Link>
              );
              if (isBuyer) {
                return (
                  <div key={msg.id} className="w-full flex flex-col items-center py-2">
                    {itemPreview}
                    <div className="text-center mt-3">
                      <span className="text-[10px] tracking-[0.05em] text-relay-muted opacity-40">
                        You proposed pickup times to {otherDisplayName}
                        {buyerLocationLabel && ` · Location: ${buyerLocationLabel}`}
                      </span>
                    </div>
                    <span className="text-[9px] font-medium text-relay-muted mt-2 tracking-widest opacity-60">
                      {formatTime(msg.created_at)}
                    </span>
                    {msg.read_at && (
                      <span className="text-[9px] text-relay-muted opacity-70 mt-0.5">Read</span>
                    )}
                  </div>
                );
              }
              const byDate = groupSlotsByDate(parsed.slots);
              const showAcceptButtons = isSeller && !hasAcceptedPickup && swap?.status !== 'cancelled';
              const locationLabel = parsed.chosenLocation
                ? (parsed.chosenLocation.displayName?.trim() || [parsed.chosenLocation.city, parsed.chosenLocation.state].filter(Boolean).join(', '))
                : null;
              return (
                <div key={msg.id} className="max-w-[85%] flex flex-col self-start items-start">
                  <div className="p-5 rounded-3xl rounded-tl-none bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark w-full">
                    {itemPreview && <div className="mb-4">{itemPreview}</div>}
                    {locationLabel && (
                      <p className="text-[10px] font-bold tracking-widest text-relay-muted mb-2 flex items-center gap-1.5">
                        <span className="material-symbols-outlined !text-sm text-primary">location_on</span>
                        Buyer chose: {locationLabel}
                      </p>
                    )}
                    <p className="text-[10px] font-bold tracking-widest text-relay-muted mb-4">
                      {hasAcceptedPickup ? 'Pickup time confirmed below' : 'Pickup times — choose one'}
                    </p>
                    <div className="space-y-4">
                      {byDate.map(({ date, dateLabel, slots: slotsForDate }) => (
                        <div key={date}>
                          <p className="text-[10px] font-bold tracking-widest text-relay-muted mb-2">{dateLabel}</p>
                          <div className="flex flex-wrap gap-2">
                            {slotsForDate.map((slot, i) => (
                              showAcceptButtons ? (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => handleAcceptPickupSlot(slot)}
                                  disabled={sending}
                                  className="px-4 py-2.5 rounded-xl bg-relay-surface dark:bg-relay-surface-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark text-sm font-medium hover:bg-primary hover:text-white hover:border-primary transition-colors disabled:opacity-50"
                                >
                                  {formatTimeOnly(slot.start)}
                                </button>
                              ) : (
                                <span key={i} className="px-4 py-2.5 rounded-xl bg-relay-surface/50 dark:bg-relay-surface-dark/50 border border-relay-border dark:border-relay-border-dark text-relay-muted text-sm">
                                  {formatTimeOnly(slot.start)}
                                </span>
                              )
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <span className="text-[9px] font-medium text-relay-muted mt-2 tracking-widest opacity-60">
                    {formatTime(msg.created_at)}
                  </span>
                </div>
              );
            }

            if (parsed.type === 'pickup_accepted') {
              const isSelfAccepted = msg.sender_profile_id === userId;
              const fromSeller = isSelfAccepted ? 'self-end items-end' : 'self-start items-start';
              const bubbleCorner = isSelfAccepted ? 'rounded-tr-none' : 'rounded-tl-none';
              return (
                <div key={msg.id} className={`max-w-[85%] flex flex-col ${fromSeller}`}>
                  <div className={`p-5 rounded-3xl ${bubbleCorner} bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark w-full`}>
                    <p className="text-[10px] font-bold tracking-widest text-primary mb-1">Pickup time confirmed</p>
                    <p className="text-sm font-medium text-relay-text dark:text-relay-text-dark">
                      {formatSlotLabel(parsed.slot)}
                    </p>
                  </div>
                  <span className="text-[9px] font-medium text-relay-muted mt-2 tracking-widest opacity-60">
                    {formatTime(msg.created_at)}
                  </span>
                  {isSelfAccepted && msg.read_at && (
                    <span className="text-[9px] text-relay-muted opacity-70 mt-0.5">Read</span>
                  )}
                </div>
              );
            }

            if (parsed.type === 'swap_cancelled') {
              const isBuyer = msg.sender_profile_id === userId;
              return (
                <div key={msg.id} className="w-full flex flex-col items-center py-2">
                  <div className="text-center">
                    <span className="text-[10px] tracking-[0.05em] text-relay-muted opacity-40">
                      {isBuyer
                        ? 'You have cancelled the swap'
                        : `${parsed.buyerDisplayName} has cancelled the swap`}
                    </span>
                  </div>
                  <span className="text-[9px] font-medium text-relay-muted mt-2 tracking-widest opacity-60">
                    {formatTime(msg.created_at)}
                  </span>
                  {isBuyer && msg.read_at && (
                    <span className="text-[9px] text-relay-muted opacity-70 mt-0.5">Read</span>
                  )}
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`max-w-[85%] flex flex-col ${isSelf ? 'self-end items-end' : 'self-start items-start'}`}
              >
                <div
                  className={`p-5 rounded-3xl text-sm leading-relaxed tracking-tighter ${
                    isSelf
                      ? 'bg-primary text-white rounded-tr-none shadow-xl shadow-primary/10'
                      : 'bg-relay-bg dark:bg-relay-bg-dark text-relay-text dark:text-relay-text-dark rounded-tl-none border border-relay-border dark:border-relay-border-dark'
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[9px] font-medium text-relay-muted mt-2 tracking-widest opacity-60">
                  {formatTime(msg.created_at)}
                </span>
                {isSelf && msg.read_at && (
                  <span className="text-[9px] text-relay-muted opacity-70 mt-0.5">Read</span>
                )}
              </div>
            );
          })
        )}
        <div ref={listEndRef} />
        </div>
      </div>

      {/* Reschedule pickup button for buyer in confirmed status */}
      {swap && userId && swap.buyer_profile_id === userId && swap.status === 'confirmed' && !hasAcceptedPickup && (
        <div className="px-6 py-3 border-t border-relay-border dark:border-relay-border-dark bg-relay-surface/95 dark:bg-relay-surface-dark/95">
          {proposalCount >= 2 ? (
            <p className="text-[10px] font-bold tracking-widest text-primary text-center">
              Reschedule limit reached — swap will be cancelled on next attempt.
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setShowRescheduleCalendar(true)}
              disabled={rescheduleSubmitting}
              className="w-full max-w-[50%] mx-auto py-3 rounded-2xl border border-relay-border dark:border-relay-border-dark text-[11px] tracking-tight text-relay-text dark:text-relay-text-dark hover:border-primary hover:text-primary transition-colors active-scale disabled:opacity-50"
            >
              {rescheduleSubmitting ? 'Sending…' : `Propose new times (${2 - proposalCount} remaining)`}
            </button>
          )}
        </div>
      )}

      <div className="px-6 py-8 border-t border-relay-border dark:border-relay-border-dark bg-relay-surface/95 dark:bg-relay-surface-dark/95 backdrop-blur-xl">
        {sendError && (
          <p className="text-xs text-relay-text dark:text-relay-text-dark/80 mb-2" role="alert">
            {sendError}
          </p>
        )}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={message}
              onChange={(e) => { setMessage(e.target.value); setSendError(null); }}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Message..."
              className="w-full h-14 bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark rounded-2xl px-6 text-sm text-relay-text dark:text-relay-text-dark placeholder-relay-muted focus:ring-1 focus:ring-primary/40 transition-all shadow-inner"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className={`size-14 rounded-2xl flex items-center justify-center transition-all shrink-0 ${
              message.trim() && !sending
                ? 'bg-primary text-white shadow-xl shadow-primary/20'
                : 'bg-relay-bg dark:bg-relay-bg-dark text-relay-muted opacity-40'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {sending ? (
              <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined">send</span>
            )}
          </button>
        </div>
      </div>

      {showRescheduleCalendar && (
        <PickupCalendarModal
          open={showRescheduleCalendar}
          onClose={() => setShowRescheduleCalendar(false)}
          onConfirm={(slots) => {
            if (proposalCount >= 2) {
              if (!window.confirm('You have reached the 2-reschedule limit. Confirming will cancel this swap.')) return;
            }
            handleReschedule(slots);
          }}
        />
      )}
    </div>
  );
}
