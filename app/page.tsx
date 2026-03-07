'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { BRANDS_BY_CATEGORY, CONDITION_BG, CONDITION_TEXT, conditionForColor } from '@/lib/constants';
import { DeviceSearchBar } from '@/app/components/DeviceSearchBar';
import { FilterIcon } from '@/app/components/FilterIcon';
import { WishlistHeartIcon } from '@/app/components/WishlistHeartIcon';
import { fetchGadgets } from '@/lib/gadgets';
import { distanceMiles } from '@/lib/geo';
import { loadWishlist, toggleWishlistItem } from '@/lib/wishlist';
import type { Gadget } from '@/lib/types';
import { getDefaultAvatar } from '@/lib/avatars';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

type UserLocation = { latitude: number; longitude: number };

type UpcomingMeetup = {
  swapId: string;
  conversationId?: string;
  pickupTimeLabel: string;
  /** 1 = before time, 2 = time arrived, 3 = buyer confirmed */
  stage: 1 | 2 | 3;
  otherDisplayName?: string;
  location?: { latitude: number; longitude: number; displayName?: string; city?: string; state?: string };
};

const RELAY_USER_LOCATION_KEY = 'relay_user_location';

/** Metal Glass utility for filter panel */
const FILTER_PANEL_BG = 'glass-card';

export default function LandingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [gadgets, setGadgets] = useState<Gadget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Explore');
  const [priceRange, setPriceRange] = useState(2000);
  const [distanceRange, setDistanceRange] = useState(100);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedStorages, setSelectedStorages] = useState<string[]>([]);
  const [selectedCarrier, setSelectedCarrier] = useState('');
  const [filterSubPanel, setFilterSubPanel] = useState<null | 'brand' | 'condition' | 'storage'>(null);
  const [sortBy, setSortBy] = useState('Newest First');
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [wishlistProfileId, setWishlistProfileId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [upcomingMeetup, setUpcomingMeetup] = useState<UpcomingMeetup | null>(null);
  const [catalogBrands, setCatalogBrands] = useState<string[]>([]);

  const loadGadgets = useCallback(() => {
    setLoading(true);
    return fetchGadgets().then((data) => {
      setGadgets(data);
      setLoading(false);
    });
  }, []);

  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const isPullingRef = useRef(false);
  const hapticFiredRef = useRef(false);
  const pullDistanceRef = useRef(0);

  const PULL_THRESHOLD = 72;

  const loadUpcomingMeetup = React.useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return;
    const { data: swaps } = await supabase
      .from('swaps')
      .select('id, status, completed_at, buyer_profile_id, seller_profile_id, buyer:profiles!buyer_profile_id(display_name), seller:profiles!seller_profile_id(display_name)')
      .or(`buyer_profile_id.eq.${user.id},seller_profile_id.eq.${user.id}`)
      .in('status', ['pickup_arranged', 'completed'])
      .order('created_at', { ascending: false })
      .limit(1);
    if (!swaps?.length) return;
    const row = swaps[0] as { id: string; status: string; completed_at: string | null; buyer_profile_id: string; seller_profile_id: string; buyer?: { display_name: string } | { display_name: string }[]; seller?: { display_name: string } | { display_name: string }[] };
    const swapId = row.id;
    const { data: swapLocation } = await supabase.from('swaps').select('seller_arrived_at').eq('id', swapId).single();
    const sellerArrivedAt = swapLocation?.seller_arrived_at ?? null;
    const isBuyer = row.buyer_profile_id === user.id;
    const otherProfile = isBuyer ? (Array.isArray(row.seller) ? row.seller[0] : row.seller) : (Array.isArray(row.buyer) ? row.buyer[0] : row.buyer);
    const otherDisplayName = otherProfile?.display_name ?? (isBuyer ? 'Seller' : 'Buyer');
    const status = row.status;
    const { data: conv } = await supabase.from('conversations').select('id').eq('swap_id', swapId).limit(1).maybeSingle();
    const conversationId = (conv as { id: string } | null)?.id;
    const { data: messages } = conversationId
      ? await supabase.from('messages').select('content').eq('conversation_id', conversationId).order('created_at', { ascending: true })
      : { data: [] };
    let pickupTimeLabel = 'Pickup arranged';
    let location: UpcomingMeetup['location'];
    let slotDate = '';
    let slotStart = '';
    if (messages?.length) {
      for (const m of messages as { content: string }[]) {
        try {
          const p = JSON.parse(m.content) as { _type?: string; slot?: { date: string; start: string }; chosenLocation?: { latitude: number; longitude: number; displayName?: string; city?: string; state?: string } };
          if (p._type === 'pickup_accepted' && p.slot?.start) {
            slotDate = p.slot.date ?? '';
            slotStart = p.slot.start ?? '';
            const [h, min] = p.slot.start.split(':').map(Number);
            const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
            const ampm = h < 12 ? 'AM' : 'PM';
            pickupTimeLabel = `pickup time ${hour}:${min.toString().padStart(2, '0')} ${ampm}`;
          }
          if (p._type === 'pickup_proposal' && p.chosenLocation && typeof p.chosenLocation.latitude === 'number' && typeof p.chosenLocation.longitude === 'number') {
            location = { latitude: p.chosenLocation.latitude, longitude: p.chosenLocation.longitude, displayName: p.chosenLocation.displayName, city: p.chosenLocation.city, state: p.chosenLocation.state };
          }
        } catch {
          // ignore
        }
      }
    }
    let stage: 1 | 2 | 3 = 1;
    if (status === 'completed') stage = 3;
    else if (sellerArrivedAt) stage = 2;

    // Hide "Pickup Confirmed" banner 20 minutes after the swap was completed
    if (stage === 3 && row.completed_at) {
      const completedAt = new Date(row.completed_at).getTime();
      if (Date.now() - completedAt > 20 * 60 * 1000) {
        setUpcomingMeetup(null);
        return;
      }
    }

    setUpcomingMeetup({ swapId, conversationId, pickupTimeLabel, stage, otherDisplayName, location });
  }, []);

  useEffect(() => {
    loadGadgets();
  }, [loadGadgets]);

  useEffect(() => {
    const onFocus = () => {
      loadGadgets();
      loadUpcomingMeetup();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadUpcomingMeetup]);

  useEffect(() => {
    loadWishlist().then(({ ids, profileId }) => {
      setWishlist(ids);
      setWishlistProfileId(profileId);
    });
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(RELAY_USER_LOCATION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as UserLocation;
        if (typeof parsed?.latitude === 'number' && typeof parsed?.longitude === 'number') {
          setUserLocation(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadUpcomingMeetup();
  }, [loadUpcomingMeetup]);

  useEffect(() => {
    const categoryFromQuery = searchParams.get('category');
    if (!categoryFromQuery) return;
    const validNames = new Set<string>(['Explore', 'All', ...Object.keys(BRANDS_BY_CATEGORY)]);
    if (!validNames.has(categoryFromQuery)) return;
    setSelectedCategory(categoryFromQuery);
  }, [searchParams]);

  useEffect(() => {
    if (selectedCategory === 'Explore' || selectedCategory === 'All') {
      setCatalogBrands([]);
      return;
    }
    fetch(`/api/browse/${encodeURIComponent(selectedCategory)}/brands`)
      .then((res) => res.ok ? res.json() : { brands: [] })
      .then((json: { brands?: string[] }) => setCatalogBrands(json.brands ?? []))
      .catch(() => setCatalogBrands([]));
  }, [selectedCategory]);

  // Pull-to-refresh — document-level listeners so iOS WKWebView doesn't swallow them
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      // Only activate when the touch begins inside our scroll container
      if (!el.contains(e.target as Node)) return;
      if (el.scrollTop <= 0) {
        touchStartY.current = e.touches[0].clientY;
        isPullingRef.current = true;
        hapticFiredRef.current = false;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current) return;
      const dy = e.touches[0].clientY - touchStartY.current;
      if (dy <= 0) {
        pullDistanceRef.current = 0;
        setPullDistance(0);
        return;
      }
      // cancelable check required — iOS throws if you call preventDefault on a non-cancelable event
      if (e.cancelable) e.preventDefault();
      const clamped = Math.min(dy * 0.4, PULL_THRESHOLD + 20);
      pullDistanceRef.current = clamped;
      setPullDistance(clamped);
      if (clamped >= PULL_THRESHOLD && !hapticFiredRef.current) {
        hapticFiredRef.current = true;
        // Capacitor Haptics on iOS/Android, vibrate fallback on web
        Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {
          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
        });
      }
    };

    const onTouchEnd = async () => {
      if (!isPullingRef.current) return;
      isPullingRef.current = false;
      const dist = pullDistanceRef.current;
      pullDistanceRef.current = 0;
      setPullDistance(0);
      if (dist >= PULL_THRESHOLD) {
        setIsRefreshing(true);
        await loadGadgets();
        setIsRefreshing(false);
      }
    };

    // Attach to document so events aren't eaten by iOS viewport rubber-banding
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [loadGadgets]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Location is not supported by your browser.');
      return;
    }
    // Browsers block geolocation on non-HTTPS (except localhost)
    const isSecure = typeof window !== 'undefined' && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (!isSecure) {
      setLocationError('Location requires HTTPS. Open this site via https:// to use proximity.');
      return;
    }
    setLocationError(null);
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setUserLocation(loc);
        try {
          localStorage.setItem(RELAY_USER_LOCATION_KEY, JSON.stringify(loc));
        } catch {
          // ignore
        }
        setLocationLoading(false);
      },
      (err: GeolocationPositionError) => {
        const code = err?.code ?? 0;
        if (code === 1) {
          setLocationError('Location was blocked. If you denied it before, allow it in your browser’s site settings (e.g. lock icon in the address bar), then tap "Use my location" again.');
        } else if (code === 3) {
          setLocationError('Location request timed out. Check your connection and try again.');
        } else {
          setLocationError('Location is unavailable. Try again or check that location services are on for this device.');
        }
        setLocationLoading(false);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 }
    );
  };

  const handleStorageToggle = (s: string) => {
    setSelectedStorages((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const toggleWishlist = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
    });
    toggleWishlistItem(wishlistProfileId, id, wishlist).then((newIds) => setWishlist(newIds));
  }, [wishlist, wishlistProfileId]);

  const conditions = ['Like New', 'Excellent', 'Good', 'Fair', 'Poor'];
  const STORAGE_OPTIONS = ['64GB', '128GB', '256GB', '512GB', '1TB'];
  const sortOptions = ['Newest First', 'Nearest location', 'Lowest Credits', 'Highest Credits', 'Best Condition'];
  const CATEGORY_ICONS: Record<string, string> = {
    Phones: '/icons/phone.png',
    Laptops: '/icons/laptop.png',
    Console: '/icons/console.png',
    Tablets: '/icons/tablet.png',
    Headphones: '/icons/headphones.png',
    Speaker: '/icons/speaker.png',
    MP3: '/icons/relics.png',
    'Gaming Handhelds': '/icons/gaming-handhelds.png',
    'Video Games': '/icons/video-games.png',
  };

  const NAV_ICONS: Record<string, string> = {
    Phones: '/icons/phone-nav.png',
    Laptops: '/icons/laptop-nav.png',
    Console: '/icons/console-nav.png',
    Tablets: '/icons/tablet-nav.png',
    Headphones: '/icons/headphones-nav.png',
    Speaker: '/icons/speaker-nav.png',
    MP3: '/icons/relics-nav.png',
    'Gaming Handhelds': '/icons/gaming-handhelds-nav.png',
    'Video Games': '/icons/video-games-nav.png',
  };
  const CATEGORY_CARD_IMAGES: Record<string, string> = {
    Phones: '/category-cards/phones.svg',
    Laptops: '/category-cards/laptops.svg',
    Console: '/category-cards/console.svg',
    Tablets: '/category-cards/tablets.svg',
    Headphones: '/category-cards/headphones.svg',
    Speaker: '/category-cards/speaker.svg',
    MP3: '/category-cards/mp3.svg',
    'Gaming Handhelds': '/category-cards/gaming-handhelds.svg',
    'Video Games': '/category-cards/video-games.svg',
  };
  const categories = [
    { name: 'Explore', icon: 'explore', navIcon: '/icons/nav/explore.png', useMaterialIcon: false, iconScale: 'scale-110', iconClass: 'brightness-0 opacity-80 dark:invert dark:opacity-90' },
    { name: 'All', icon: 'apps', navIcon: '/icons/nav/all.png', useMaterialIcon: false, iconClass: 'brightness-0 opacity-80 dark:invert dark:opacity-90' },
    ...Object.keys(BRANDS_BY_CATEGORY).map((cat) => ({
      name: cat,
      icon: CATEGORY_ICONS[cat] ?? 'devices',
      navIcon: NAV_ICONS[cat] ?? null,
      useMaterialIcon: !CATEGORY_ICONS[cat],
      iconClass: 'brightness-0 opacity-80 dark:invert dark:opacity-90',
    })),
  ];
  
  const allBrands = useMemo(() => {
    return Array.from(new Set(Object.values(BRANDS_BY_CATEGORY).flat())).sort();
  }, []);

  const brandsForFilter = catalogBrands.length > 0 ? catalogBrands : allBrands;

  const handleConditionToggle = (c: string) => {
    setSelectedConditions(prev => prev.includes(c) ? prev.filter(item => item !== c) : [...prev, c]);
  };

  const handleBrandToggle = (b: string) => {
    setSelectedBrands(prev => prev.includes(b) ? prev.filter(item => item !== b) : [...prev, b]);
  };

  const filteredItems = useMemo(() => {
    const withDistance = userLocation
      ? gadgets.map((item) => {
          const dist =
            item.latitude != null && item.longitude != null
              ? distanceMiles(userLocation.latitude, userLocation.longitude, item.latitude, item.longitude)
              : null;
          return { ...item, _distanceMi: dist };
        })
      : gadgets.map((item) => ({ ...item, _distanceMi: null as number | null }));

    let filtered = withDistance.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory || (selectedCategory === 'Phones' && item.category === 'Smartphones');
      const matchesPrice = item.credits <= priceRange;
      const distanceMi = item._distanceMi ?? item.location?.distance ?? 0;
      const matchesDistance = !userLocation || distanceMi <= distanceRange;
      const matchesCondition = selectedConditions.length === 0 || selectedConditions.includes(item.condition);
      const matchesBrand = selectedBrands.length === 0 || selectedBrands.includes(item.brand);
      const matchesStorage = selectedStorages.length === 0 || selectedStorages.some((s) => item.specs?.includes(s));
      const isPhone = item.category === 'Phones' || item.category === 'Smartphones';
      const carrierNorm = (v: string) => (v ?? '').toLowerCase().replace(/\s+/g, ' ');
      const matchesCarrier = selectedCategory !== 'Phones' || !selectedCarrier || (isPhone && item.carrier && (carrierNorm(item.carrier).includes(carrierNorm(selectedCarrier)) || (selectedCarrier === 'Unlocked' && (carrierNorm(item.carrier).includes('unlock') || carrierNorm(item.carrier) === 'sim free'))));
      return matchesSearch && matchesCategory && matchesPrice && matchesDistance && matchesCondition && matchesBrand && matchesStorage && matchesCarrier;
    });

    switch (sortBy) {
      case 'Lowest Credits':
        return filtered.sort((a, b) => a.credits - b.credits);
      case 'Highest Credits':
        return filtered.sort((a, b) => b.credits - a.credits);
      case 'Nearest location':
        return filtered.sort((a, b) => (a._distanceMi ?? 9999) - (b._distanceMi ?? 9999));
      default:
        return filtered;
    }
  }, [gadgets, userLocation, searchQuery, selectedCategory, selectedCarrier, priceRange, distanceRange, selectedConditions, selectedBrands, selectedStorages, sortBy]);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark transition-colors">
      <header
        className="shrink-0 z-40 glass-card border-b border-relay-border dark:border-relay-border-dark px-6 pb-2 space-y-2"
        style={{ paddingTop: 'max(2.5rem, env(safe-area-inset-top))', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
      >
        <div className="flex items-center gap-3">
          <DeviceSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search marketplace..."
            onSelectDevice={(device) => {
              router.push(`/browse/${encodeURIComponent(device.category)}/${encodeURIComponent(device.brand)}/${encodeURIComponent(device.model)}${device.image_url ? `?img=${encodeURIComponent(device.image_url)}` : ''}`);
            }}
          />
          {selectedCategory !== 'Explore' && selectedCategory !== 'All' && (
            <button
              type="button"
              onClick={() => setShowFilters(true)}
              aria-label="Filters"
              className={`size-14 rounded-2xl border flex items-center justify-center transition-all active-scale ${showFilters || selectedConditions.length > 0 || selectedBrands.length > 0 || selectedStorages.length > 0 ? 'border-transparent text-primary bg-primary/5' : 'border-relay-border dark:border-relay-border-dark text-relay-muted hover:text-relay-text'}`}
            >
              <FilterIcon className="size-7 shrink-0 text-current" />
            </button>
          )}
        </div>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar py-0.5 px-1 items-center">
          {categories.map((cat, index) => {
            const isActive = selectedCategory === cat.name;
            return (
              <button
                key={`${cat.name}-${index}`}
                onClick={() => {
                  const nextCategory = cat.name;
                  setSelectedCategory(nextCategory);
                  if (nextCategory !== selectedCategory) {
                    setSelectedBrands([]);
                  }
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('category', nextCategory);
                  router.replace(`/?${params.toString()}`);
                }}
                className={`flex-shrink-0 flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                  isActive
                    ? 'h-8 px-5 rounded-full bg-gray-200/80 dark:bg-gray-700/60 text-relay-text dark:text-gray-200'
                    : 'size-10 rounded-full text-relay-muted dark:text-white hover:text-relay-text dark:hover:text-white/90 hover:bg-gray-200/60 dark:hover:bg-gray-700/40'
                }`}
              >
                {cat.useMaterialIcon ? (
                  <span className="material-symbols-outlined !text-[28px]">{cat.icon}</span>
                ) : cat.navIcon ? (
                  <img
                    src={cat.navIcon}
                    alt=""
                    className={`size-[28px] object-contain shrink-0 ${'iconScale' in cat && cat.iconScale ? cat.iconScale : ''} ${'iconClass' in cat && cat.iconClass ? cat.iconClass : ''}`}
                  />
                ) : (
                  <img
                    src={cat.icon}
                    alt=""
                    className="size-[28px] object-contain shrink-0 dark:invert"
                  />
                )}
                {isActive && <span className="text-[10px] font-medium tracking-tighter whitespace-nowrap">{cat.name}</span>}
              </button>
            );
          })}
        </div>
      </header>

      {/* Pull-to-refresh indicator */}
      <div
        className="flex items-center justify-center overflow-hidden shrink-0"
        style={{
          height: isRefreshing ? 52 : pullDistance,
          transition: pullDistance === 0 && !isRefreshing ? 'height 0.25s ease' : 'none',
        }}
      >
        {isRefreshing ? (
          <div className="size-5 border-2 border-gray-300 border-t-gray-400 rounded-full animate-spin" />
        ) : (
          <span
            className="material-symbols-outlined text-gray-400"
            style={{
              fontSize: '20px',
              opacity: Math.min(pullDistance / PULL_THRESHOLD, 1),
              transform: `rotate(${Math.min(pullDistance / PULL_THRESHOLD, 1) * 180}deg)`,
              transition: 'transform 0.08s linear',
            }}
          >
            arrow_downward
          </span>
        )}
      </div>

      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain pb-20" style={{ marginTop: '-1px' }}>

      {upcomingMeetup && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => router.push(`/meetup/${upcomingMeetup.swapId}`)}
          onKeyDown={(e) => e.key === 'Enter' && router.push(`/meetup/${upcomingMeetup.swapId}`)}
          className="mx-6 mt-6 p-5 rounded-2xl glass-card border border-relay-border dark:border-relay-border-dark shadow-lg cursor-pointer active:scale-[0.99] transition-transform"
        >
          <p className="text-relay-text dark:text-relay-text-dark font-semibold text-base mb-1">
            {upcomingMeetup.stage === 1 && 'Preparing for your meetup...'}
            {upcomingMeetup.stage === 2 && `${upcomingMeetup.otherDisplayName ?? 'They'} is here`}
            {upcomingMeetup.stage === 3 && 'Pickup Confirmed'}
          </p>
          <p className="text-relay-text dark:text-relay-text-dark text-sm mb-3">{upcomingMeetup.pickupTimeLabel}</p>
          <div className="flex gap-1 mb-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full ${
                  s <= upcomingMeetup.stage
                    ? upcomingMeetup.stage === 3 ? 'bg-green-500' : 'bg-primary'
                    : 'bg-relay-border dark:bg-relay-border-dark'
                }`}
              />
            ))}
          </div>
          <div className="flex gap-3">
            {upcomingMeetup.location && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  upcomingMeetup.location.displayName?.trim() || [upcomingMeetup.location.city, upcomingMeetup.location.state].filter(Boolean).join(', ') || `${upcomingMeetup.location.latitude},${upcomingMeetup.location.longitude}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex-1 flex items-center justify-center gap-2 h-12 rounded-2xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark text-[10px] font-normal tracking-tighter shadow-inner"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="size-6 shrink-0 text-current" aria-hidden>
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 6.25C9.92893 6.25 8.25 7.92893 8.25 10C8.25 12.0711 9.92893 13.75 12 13.75C14.0711 13.75 15.75 12.0711 15.75 10C15.75 7.92893 14.0711 6.25 12 6.25ZM9.75 10C9.75 8.75736 10.7574 7.75 12 7.75C13.2426 7.75 14.25 8.75736 14.25 10C14.25 11.2426 13.2426 12.25 12 12.25C10.7574 12.25 9.75 11.2426 9.75 10Z" fill="currentColor" />
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 0.25C7.11666 0.25 3.25 4.49277 3.25 9.6087C3.25 11.2494 4.06511 13.1814 5.09064 14.9945C6.13277 16.837 7.46288 18.6762 8.62903 20.1633L8.66793 20.2129C9.23714 20.9388 9.72203 21.5573 10.1922 21.9844C10.7052 22.4504 11.2709 22.7555 12 22.7555C12.7291 22.7555 13.2948 22.4504 13.8078 21.9844C14.278 21.5572 14.7629 20.9388 15.3321 20.2129L15.371 20.1633C16.5371 18.6762 17.8672 16.837 18.9094 14.9945C19.9349 13.1814 20.75 11.2494 20.75 9.6087C20.75 4.49277 16.8833 0.25 12 0.25ZM4.75 9.6087C4.75 5.21571 8.04678 1.75 12 1.75C15.9532 1.75 19.25 5.21571 19.25 9.6087C19.25 10.8352 18.6104 12.4764 17.6037 14.256C16.6137 16.0063 15.3342 17.7794 14.1906 19.2377C13.5717 20.027 13.1641 20.5426 12.7992 20.8741C12.4664 21.1764 12.2442 21.2555 12 21.2555C11.7558 21.2555 11.5336 21.1764 11.2008 20.8741C10.8359 20.5426 10.4283 20.027 9.80938 19.2377C8.66578 17.7794 7.38628 16.0063 6.39625 14.256C5.38962 12.4764 4.75 10.8352 4.75 9.6087Z" fill="currentColor" />
                </svg>
                Get directions
              </a>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); router.push(`/messages/${upcomingMeetup.conversationId ?? upcomingMeetup.swapId}`); }}
              className="flex-1 flex items-center justify-center gap-2 h-12 rounded-2xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark text-[10px] font-normal tracking-tighter shadow-inner"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="size-6 shrink-0 text-current" aria-hidden>
                  <path d="M11.2885 10.2372C11.0054 9.38779 9.92735 9.13331 9.29426 9.7664L8.53033 10.5303C8.23744 10.8232 7.76256 10.8232 7.46967 10.5303C7.17678 10.2374 7.17678 9.76256 7.46967 9.46967L8.2336 8.70574C9.65517 7.28417 12.0758 7.8556 12.7115 9.76283C12.9946 10.6122 14.0726 10.8667 14.7057 10.2336L15.4697 9.46967C15.7626 9.17678 16.2374 9.17678 16.5303 9.46967C16.8232 9.76256 16.8232 10.2374 16.5303 10.5303L15.7664 11.2943C14.3448 12.7158 11.9242 12.1444 11.2885 10.2372Z" fill="currentColor" />
                  <path fillRule="evenodd" clipRule="evenodd" d="M9.96644 1.25H14.0336C15.4053 1.25 16.4807 1.24999 17.3451 1.32061C18.2252 1.39252 18.9523 1.54138 19.6104 1.87671C20.6924 2.42798 21.572 3.30762 22.1233 4.38955C22.4586 5.04769 22.6075 5.77479 22.6794 6.65494C22.75 7.51928 22.75 8.59471 22.75 9.96642V11.1842C22.75 11.2338 22.75 11.2828 22.75 11.3311C22.7502 12.8797 22.7504 13.8244 22.5177 14.6179C21.9667 16.4971 20.4971 17.9667 18.6179 18.5177C17.8244 18.7504 16.8797 18.7502 15.3311 18.75C15.2827 18.75 15.2338 18.75 15.1842 18.75H14.6354L14.5751 18.7501C13.7079 18.7556 12.8632 19.0264 12.1543 19.5259L12.1051 19.5609L9.49441 21.4257C7.9899 22.5003 6.01288 20.9484 6.69954 19.2317C6.79183 19.001 6.62191 18.75 6.37341 18.75H5.77166C3.27441 18.75 1.25 16.7256 1.25 14.2283L1.25 9.96644C1.25 8.59472 1.24999 7.51929 1.32061 6.65494C1.39252 5.77479 1.54138 5.04769 1.87671 4.38955C2.42798 3.30762 3.30762 2.42798 4.38955 1.87671C5.04769 1.54138 5.77479 1.39252 6.65494 1.32061C7.51929 1.24999 8.59472 1.25 9.96644 1.25ZM6.77708 2.81563C5.9897 2.87996 5.48197 3.00359 5.07054 3.21322C4.27085 3.62068 3.62068 4.27085 3.21322 5.07054C3.00359 5.48197 2.87996 5.9897 2.81563 6.77708C2.75058 7.57322 2.75 8.58749 2.75 10V14.2283C2.75 15.8972 4.10284 17.25 5.77166 17.25H6.37341C7.68311 17.25 8.57867 18.5728 8.09226 19.7888C7.96197 20.1145 8.33709 20.409 8.62255 20.2051L11.2333 18.3403L11.2902 18.2997C12.2493 17.6239 13.3922 17.2576 14.5655 17.2501L14.6354 17.25H15.1842C16.9261 17.25 17.6363 17.2424 18.1958 17.0783C19.5848 16.671 20.671 15.5848 21.0783 14.1958C21.2424 13.6363 21.25 12.9261 21.25 11.1842V10C21.25 8.58749 21.2494 7.57322 21.1844 6.77708C21.12 5.9897 20.9964 5.48197 20.7868 5.07054C20.3793 4.27085 19.7291 3.62068 18.9295 3.21322C18.518 3.00359 18.0103 2.87996 17.2229 2.81563C16.4268 2.75058 15.4125 2.75 14 2.75H10C8.58749 2.75 7.57322 2.75058 6.77708 2.81563Z" fill="currentColor" />
                </svg>
                Message
            </button>
          </div>
        </div>
      )}

      <div className="px-6 py-10 pb-32">
        {selectedCategory === 'Explore' ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              {Object.keys(BRANDS_BY_CATEGORY).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => router.push(`/browse/${encodeURIComponent(cat)}`)}
                  className="group relative overflow-hidden rounded-2xl aspect-[4/3] border border-relay-border dark:border-relay-border-dark transition-all active:scale-[0.98]"
                >
                  {CATEGORY_ICONS[cat] ? (
                    <img src={CATEGORY_ICONS[cat]} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <div className="absolute inset-0 bg-relay-surface dark:bg-relay-surface-dark flex items-center justify-center">
                      <span className="material-symbols-outlined !text-[48px] text-relay-muted">devices</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-transparent" />
                  <span className="absolute bottom-3 left-0 right-0 text-center text-white text-xs font-semibold tracking-normal px-2">{cat}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
        <>
        <div className="flex items-end justify-between mb-10">
           <div>
             <h1 className="text-relay-text dark:text-relay-text-dark text-[24px] font-serif tracking-tighter leading-none mb-1">
               Nearby Picks
             </h1>
            <p className="text-[10px] font-semibold text-relay-muted tracking-tight">{filteredItems.length} Listings</p>
           </div>
           <div className="relative min-w-[140px]">
             <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full h-10 bg-transparent border-b border-primary/20 text-[9px] text-primary font-semibold appearance-none focus:ring-0 cursor-pointer"
              >
                {sortOptions.map(opt => (
                  <option key={opt} value={opt} className="bg-relay-surface dark:bg-relay-surface-dark">{opt}</option>
                ))}
              </select>
              <span className="absolute right-0 top-1/2 -translate-y-1/2 material-symbols-outlined !text-[14px] text-primary pointer-events-none">expand_more</span>
           </div>
        </div>

        <div className="grid grid-cols-1 gap-14">
          {loading ? (
            <div className="py-32 text-center flex flex-col items-center">
              <div className="size-16 rounded-full border-2 border-primary border-t-transparent animate-spin mb-6" />
              <p className="text-relay-muted font-bold text-[10px] tracking-widest">Loading marketplace...</p>
            </div>
          ) : (
          <>
          {filteredItems.map((item) => (
            <div 
              key={item.id} 
              onClick={() => {
                const params = new URLSearchParams();
                params.set('from', 'home');
                params.set('category', selectedCategory);
                router.push(`/listing/${item.id}?${params.toString()}`);
              }}
              className="group cursor-pointer active-scale transition-all duration-500"
            >
              <div className="relative aspect-[1/1.618] overflow-hidden rounded-[64px] bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark shadow-2xl">
                <img 
                  src={item.image} 
                  alt={item.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-all duration-1000 grayscale-[10%] group-hover:grayscale-0" 
                />
                <div className="absolute top-8 left-8 flex flex-col gap-2">
                    {(() => {
                      const key = conditionForColor(item.condition);
                      const bgHex = CONDITION_BG[key] ?? CONDITION_BG.Good;
                      const textHex = CONDITION_TEXT[key] ?? CONDITION_TEXT.Good;
                      const bgWithAlpha = `${bgHex}E6`;
                      return (
                        <div
                          className="px-4 py-2 glass-card rounded-xl text-[9px] font-bold tracking-widest border border-relay-border dark:border-relay-border-dark"
                          style={{
                            background: bgWithAlpha,
                            color: textHex,
                          }}
                        >
                          {item.condition}
                        </div>
                      );
                    })()}
                  {item.isMemberListing && (
                    <div className="flex items-center gap-1.5 px-4 py-2 bg-primary rounded-xl text-[9px] font-bold tracking-widest text-white border border-white/10 shadow-xl shadow-primary/30">
                      <span className="material-symbols-outlined !text-[16px]">verified</span>
                      Rellaey+
                    </div>
                  )}
                </div>
                <div className="absolute top-8 right-8">
                  <button
                    type="button"
                    onClick={(e) => toggleWishlist(item.id, e)}
                    aria-label={wishlist.includes(item.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                    className="size-12 rounded-full glass-card flex items-center justify-center transition-all active-scale group/fav border border-relay-border dark:border-relay-border-dark"
                  >
                    <WishlistHeartIcon
                      active={wishlist.includes(item.id)}
                      className={`w-6 h-6 shrink-0 text-current transition-all ${wishlist.includes(item.id) ? 'opacity-100' : 'opacity-60 group-hover/fav:opacity-100'}`}
                    />
                  </button>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90 transition-opacity pointer-events-none" aria-hidden />
                <div className="absolute bottom-12 left-10 right-10">
                  <p className="text-primary text-[10px] font-bold tracking-tight mb-2">{item.category}</p>
                  <h3 className="text-white text-4xl font-serif  leading-tight tracking-tighter mb-3">{item.name}</h3>
                  <div className="flex items-center gap-2 mb-8 opacity-60">
                    <span className="material-symbols-outlined !text-[14px] text-primary">location_on</span>
                    <span className="text-white text-[9px] font-bold tracking-[0.2em]">
                      {item.location
                        ? `${item.location.city}, ${item.location.state}${(item as { _distanceMi?: number | null })._distanceMi != null ? ` • ${Math.round((item as { _distanceMi: number })._distanceMi)} mi` : ''}`
                        : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/10 pt-8">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full overflow-hidden border-2 border-relay-border dark:border-relay-border-dark">
                        <img src={item.sellerAvatarUrl || getDefaultAvatar(item.sellerId || item.seller)} alt="" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-white text-[11px] tracking-tight">{item.seller}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-white/40 text-[7px] font-bold tracking-[0.3em] mb-1">Exchange Value</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-white text-4xl font-display font-bold tracking-tighter leading-none">{item.credits.toLocaleString()}</span>
                        <span className="text-primary text-[10px] font-bold tracking-widest">Cr</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredItems.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <img src="/no-gear-found.png" alt="" className="w-24 h-24 object-contain mb-8" aria-hidden />
              <h2 className="text-relay-text dark:text-relay-text-dark font-serif text-lg font-semibold mb-2">No gear found</h2>
              <p className="text-relay-muted dark:text-relay-muted-light text-[11px] font-normal max-w-[240px] leading-relaxed mb-6">
                {selectedCategory !== 'Explore' ? `No ${selectedCategory} listings` : 'Nothing'}
                {selectedBrands.length > 0 ? ` from ${selectedBrands.join(', ')}` : ''}
                {selectedConditions.length > 0 ? ` in ${selectedConditions.join(', ')} condition` : ''}
                {searchQuery ? ` matching "${searchQuery}"` : ''}
                {` within ${distanceRange} miles.`}
              </p>
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setSelectedBrands([]);
                  setSelectedConditions([]);
                  setSelectedStorages([]);
                  setSelectedCarrier('');
                  setSearchQuery('');
                  setPriceRange(2000);
                  setDistanceRange(100);
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('category', 'All');
                  router.replace(`/?${params.toString()}`);
                }}
                className="text-primary text-xs font-semibold tracking-tight hover:text-primary/80 transition-colors"
              >
                Clear filters
              </button>
            </div>
          )}
          </>
          )}
        </div>
        </>
        )}
      </div>
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-relay-bg/70 dark:bg-relay-bg-dark/70 backdrop-blur-md"
            onClick={() => {
              setShowFilters(false);
              setFilterSubPanel(null);
            }}
          />
          <div
            data-filter-panel
            className={`absolute bottom-0 left-0 right-0 border-t border-relay-border dark:border-relay-border-dark rounded-t-[32px] flex flex-col shadow-2xl overflow-hidden font-display ${FILTER_PANEL_BG}`}
            style={{ maxHeight: '61.8vh' }}
          >
            {filterSubPanel === null ? (
              <>
                <div className="shrink-0 flex items-center justify-between px-6 py-5 border-b border-relay-border dark:border-relay-border-dark">
                  <div className="w-10" />
                  <h2 className="text-[22px] font-semibold text-relay-text dark:text-relay-text-dark tracking-tighter">Market Filters</h2>
                  <button type="button" onClick={() => { setShowFilters(false); setFilterSubPanel(null); }} className="size-10 flex items-center justify-center text-relay-text dark:text-relay-text-dark">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                <div data-filter-scroll className="flex-1 overflow-y-auto px-6 py-4 hide-scrollbar">
                  <button type="button" onClick={() => setFilterSubPanel('brand')} className="w-full flex items-center justify-between py-4 text-left">
                    <p className="text-xs font-medium text-relay-text dark:text-relay-text-dark">{selectedBrands.length === 0 ? 'Brand' : selectedBrands.join(', ')}</p>
                    <span className="material-symbols-outlined text-relay-muted dark:text-relay-muted-light">chevron_right</span>
                  </button>
                  <button type="button" onClick={() => setFilterSubPanel('condition')} className="w-full flex items-center justify-between py-4 text-left">
                    <p className="text-xs font-medium text-relay-text dark:text-relay-text-dark">{selectedConditions.length === 0 ? 'Condition' : selectedConditions.join(', ')}</p>
                    <span className="material-symbols-outlined text-relay-muted dark:text-relay-muted-light">chevron_right</span>
                  </button>
                  <button type="button" onClick={() => setFilterSubPanel('storage')} className="w-full flex items-center justify-between py-4 text-left">
                    <p className="text-xs font-medium text-relay-text dark:text-relay-text-dark">{selectedStorages.length === 0 ? 'Storage' : selectedStorages.join(', ')}</p>
                    <span className="material-symbols-outlined text-relay-muted dark:text-relay-muted-light">chevron_right</span>
                  </button>
                  <div className="py-4">
                    <p className="text-[10px] font-bold tracking-tight text-relay-muted dark:text-relay-muted-light">Proximity</p>
                    <p className="text-xs font-medium text-relay-text dark:text-relay-text-dark mt-0.5">
                      {userLocation ? `${distanceRange} miles` : 'Location not set'}
                    </p>
                    {!userLocation ? (
                      <div className="mt-3 p-4 rounded-2xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark">
                        <p className="text-xs text-relay-muted dark:text-relay-muted-light mb-3">Share your location to filter by distance (HTTPS required).</p>
                        {locationError && (
                          <p className="text-[10px] text-relay-text dark:text-relay-text-dark/80 mb-2" role="alert">
                            {locationError}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={requestLocation}
                          disabled={locationLoading}
                          className="mx-auto block text-primary text-xs font-normal tracking-tight hover:text-primary/80 transition-colors disabled:opacity-60"
                        >
                          Use my location
                        </button>
                      </div>
                    ) : (
                      <div className="mt-3">
                        <div className="relative h-1.5 bg-relay-border dark:bg-relay-border-dark rounded-full flex items-center group">
                          <div className="absolute left-0 h-full bg-primary rounded-l-full transition-all" style={{ width: `${(distanceRange / 100) * 100}%` }} />
                          <input type="range" min="1" max="100" step="1" value={distanceRange} onChange={(e) => setDistanceRange(parseInt(e.target.value, 10))} className="w-full absolute inset-0 opacity-0 cursor-pointer z-10" />
                          <div className="absolute size-4 bg-primary rounded-full shadow-sm pointer-events-none" style={{ left: `calc(${(distanceRange / 100) * 100}% - 8px)` }} />
                        </div>
                        <div className="flex justify-between text-[8px] font-bold text-relay-muted tracking-tight mt-1">
                          <span>1 mi</span>
                          <span>100 mi</span>
                        </div>
                        <button type="button" onClick={() => { setUserLocation(null); setLocationError(null); try { localStorage.removeItem(RELAY_USER_LOCATION_KEY); } catch { } }} className="text-[10px] font-bold tracking-tight text-relay-muted hover:text-primary mt-2">Clear location</button>
                      </div>
                    )}
                  </div>
                  <div className="pt-6 pb-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold tracking-tight text-relay-muted dark:text-relay-muted-light">Valuation Ceiling</p>
                      <span className="text-base font-bold text-primary">{priceRange.toLocaleString()} Cr</span>
                    </div>
                    <div className="relative h-1.5 bg-relay-border dark:bg-relay-border-dark rounded-full mt-3 flex items-center group">
                      <div className="absolute left-0 h-full bg-primary rounded-l-full transition-all" style={{ width: `${(priceRange / 2000) * 100}%` }} />
                      <input
                        type="range"
                        min="0"
                        max="2000"
                        step="50"
                        value={priceRange}
                        onChange={(e) => setPriceRange(parseInt(e.target.value, 10))}
                        className="w-full absolute inset-0 opacity-0 cursor-pointer z-10"
                      />
                      <div className="absolute size-4 bg-primary rounded-full shadow-sm pointer-events-none" style={{ left: `calc(${(priceRange / 2000) * 100}% - 8px)` }} />
                    </div>
                  </div>
                </div>
                <div className="shrink-0 p-6 flex gap-3 border-t border-relay-border dark:border-relay-border-dark">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedConditions([]);
                      setSelectedBrands([]);
                      setSelectedStorages([]);
                      setSelectedCarrier('');
                      setPriceRange(2000);
                      setDistanceRange(100);
                    }}
                    className="flex-1 h-8 rounded-2xl border border-relay-border dark:border-relay-border-dark bg-relay-surface dark:bg-relay-bg-dark text-relay-muted dark:text-relay-muted-light text-[10px] font-bold tracking-tight active-scale"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFilters(false)}
                    className="next-step-button flex-[1.5] h-8 rounded-2xl text-white text-xs font-semibold tracking-tight active-scale"
                  >
                    Apply Selection
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-relay-border dark:border-relay-border-dark">
                  <button type="button" onClick={() => setFilterSubPanel(null)} className="size-10 flex items-center justify-center text-relay-text dark:text-relay-text-dark">
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                  <h2 className="text-[10px] font-bold tracking-[0.4em] text-relay-muted dark:text-relay-muted-light">
                    {filterSubPanel === 'brand' ? 'Brand' : filterSubPanel === 'condition' ? 'Condition' : 'Storage'}
                  </h2>
                  <button type="button" onClick={() => { setShowFilters(false); setFilterSubPanel(null); }} className="size-10 flex items-center justify-center text-relay-text dark:text-relay-text-dark">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-4 hide-scrollbar">
                  {filterSubPanel === 'brand' && (
                    <>
                      <button type="button" onClick={() => setSelectedBrands([])} className={`w-full py-4 text-sm text-left border-b border-relay-border dark:border-relay-border-dark ${selectedBrands.length === 0 ? 'text-primary text-xs font-semibold' : 'text-relay-text dark:text-relay-text-dark'}`}>
                        All
                      </button>
                      {brandsForFilter.map((b) => (
                        <button key={b} type="button" onClick={() => handleBrandToggle(b)} className={`w-full py-4 text-sm text-left border-b border-relay-border dark:border-relay-border-dark ${selectedBrands.includes(b) ? 'text-primary text-xs font-semibold' : 'text-relay-text dark:text-relay-text-dark'}`}>
                          {b.toUpperCase()}
                        </button>
                      ))}
                    </>
                  )}
                  {filterSubPanel === 'condition' && (
                    <>
                      <button type="button" onClick={() => setSelectedConditions([])} className={`w-full py-4 text-sm text-left border-b border-relay-border dark:border-relay-border-dark ${selectedConditions.length === 0 ? 'text-primary text-xs font-semibold' : 'text-relay-text dark:text-relay-text-dark'}`}>
                        All
                      </button>
                      {conditions.map((c) => (
                        <button key={c} type="button" onClick={() => handleConditionToggle(c)} className={`w-full py-4 text-sm text-left border-b border-relay-border dark:border-relay-border-dark ${selectedConditions.includes(c) ? 'text-primary text-xs font-semibold' : 'text-relay-text dark:text-relay-text-dark'}`}>
                          {c.toUpperCase()}
                        </button>
                      ))}
                    </>
                  )}
                  {filterSubPanel === 'storage' && (
                    <>
                      <button type="button" onClick={() => setSelectedStorages([])} className={`w-full py-4 text-sm text-left border-b border-relay-border dark:border-relay-border-dark ${selectedStorages.length === 0 ? 'text-primary text-xs font-semibold' : 'text-relay-text dark:text-relay-text-dark'}`}>
                        All
                      </button>
                      {STORAGE_OPTIONS.map((s) => (
                        <button key={s} type="button" onClick={() => handleStorageToggle(s)} className={`w-full py-4 text-sm text-left border-b border-relay-border dark:border-relay-border-dark ${selectedStorages.includes(s) ? 'text-primary text-xs font-semibold' : 'text-relay-text dark:text-relay-text-dark'}`}>
                          {s}
                        </button>
                      ))}
                    </>
                  )}
                </div>
                <div className="shrink-0 p-6 flex gap-3 border-t border-relay-border dark:border-relay-border-dark">
                  <button
                    type="button"
                    onClick={() => {
                      if (filterSubPanel === 'brand') setSelectedBrands([]);
                      else if (filterSubPanel === 'condition') setSelectedConditions([]);
                      else setSelectedStorages([]);
                    }}
                    className="flex-1 h-8 rounded-2xl border border-relay-border dark:border-relay-border-dark bg-relay-surface dark:bg-relay-bg-dark text-relay-muted dark:text-relay-muted-light text-[10px] font-bold tracking-tight active-scale"
                  >
                    Reset
                  </button>
                  <button type="button" onClick={() => setFilterSubPanel(null)} className="next-step-button flex-[1.5] h-8 rounded-2xl text-white text-xs font-semibold tracking-tight active-scale">
                    Apply Selection
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
