'use client';

export const dynamic = 'force-dynamic';

import React, { Suspense, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { BRANDS_BY_CATEGORY, CONDITION_BG, CONDITION_TEXT, conditionForColor } from '@/lib/constants';
import { DeviceSearchBar } from '@/app/components/DeviceSearchBar';
import { FilterIcon } from '@/app/components/FilterIcon';
import { WishlistHeartIcon } from '@/app/components/WishlistHeartIcon';
import { fetchGadgets } from '@/lib/gadgets';
import { distanceMiles } from '@/lib/geo';
import { loadWishlist, toggleWishlistItem } from '@/lib/wishlist';
import { Skeleton } from '@/app/components/Skeleton';
import type { Gadget } from '@/lib/types';
import { getDefaultAvatar } from '@/lib/avatars';
import { ChevronIcon } from '@/app/components/ChevronIcon';
import { NextStepButton } from '@/app/components/NextStepButton';
import {
  PhoneIcon,
  LaptopCategoryIcon,
  TabletIcon,
  HeadphonesIcon,
  SpeakerIcon,
  MP3PlayerIcon,
  GamingHandheldIcon,
  VideoGameIcon,
  GamingConsoleIcon,
  ExploreIcon,
  AllIcon,
} from '@/app/components/CategoryIcons';

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

function LandingPageContent() {
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
  const [exploreReady, setExploreReady] = useState(false);
  const exploreLoadedRef = useRef(0);

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
        import('@capacitor/haptics').then(({ Haptics, ImpactStyle }) => {
          Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
          });
        }).catch(() => {
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
    import('@capacitor/haptics').then(({ Haptics, ImpactStyle }) => {
      Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
      });
    }).catch(() => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
    });
    toggleWishlistItem(wishlistProfileId, id, wishlist).then((newIds) => setWishlist(newIds));
  }, [wishlist, wishlistProfileId]);

  const conditions = ['Like New', 'Excellent', 'Good', 'Fair', 'Poor'];
  const STORAGE_OPTIONS = ['64GB', '128GB', '256GB', '512GB', '1TB'];
  const sortOptions = ['Newest First', 'Nearest location', 'Lowest Credits', 'Highest Credits', 'Best Condition'];
  const CATEGORY_SVG_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    Phones: PhoneIcon,
    Laptops: LaptopCategoryIcon,
    Tablets: TabletIcon,
    Headphones: HeadphonesIcon,
    Speaker: SpeakerIcon,
    MP3: MP3PlayerIcon,
    'Gaming Handhelds': GamingHandheldIcon,
    'Video Games': VideoGameIcon,
    Console: GamingConsoleIcon,
  };
  // Explore page category cards: place SVGs in public/category-cards/ with these exact filenames.
  // Bump CATEGORY_CARD_VERSION when you replace assets so browsers load the new SVGs (avoids cache).
  const CATEGORY_CARD_VERSION = '2';
  const CATEGORY_CARD_IMAGES: Record<string, string> = {
    Phones: `/category-cards/phones.svg?v=${CATEGORY_CARD_VERSION}`,
    Laptops: `/category-cards/laptops.svg?v=${CATEGORY_CARD_VERSION}`,
    Console: `/category-cards/console.svg?v=${CATEGORY_CARD_VERSION}`,
    Tablets: `/category-cards/tablets.svg?v=${CATEGORY_CARD_VERSION}`,
    Headphones: `/category-cards/headphones.svg?v=${CATEGORY_CARD_VERSION}`,
    Speaker: `/category-cards/speaker.svg?v=${CATEGORY_CARD_VERSION}`,
    MP3: `/category-cards/mp3.svg?v=${CATEGORY_CARD_VERSION}`,
    'Gaming Handhelds': `/category-cards/gaming-handhelds.svg?v=${CATEGORY_CARD_VERSION}`,
    'Video Games': `/category-cards/video-games.svg?v=${CATEGORY_CARD_VERSION}`,
  };
  const categories = [
    { name: 'Explore', icon: 'explore', navIcon: null, svgIcon: ExploreIcon, useMaterialIcon: false, iconClass: '' },
    { name: 'All', icon: 'apps', navIcon: null, svgIcon: AllIcon, useMaterialIcon: false, iconClass: '' },
    ...Object.keys(BRANDS_BY_CATEGORY).map((cat) => ({
      name: cat,
      icon: 'devices',
      navIcon: null,
      svgIcon: CATEGORY_SVG_ICONS[cat] ?? null,
      useMaterialIcon: !CATEGORY_SVG_ICONS[cat],
      iconClass: '',
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
        className="shrink-0 z-40 glass-card no-blur border-b border-relay-border dark:border-relay-border-dark px-6 pb-2 space-y-2 pt-safe-2_5"
        style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
      >
        <div className="flex items-center gap-3 min-h-14">
          <DeviceSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search marketplace..."
            onSelectDevice={(device) => {
              router.push(
                `/browse/${encodeURIComponent(device.category)}/${encodeURIComponent(device.brand)}/${encodeURIComponent(device.model)}${
                  device.image_url ? `?img=${encodeURIComponent(device.image_url)}` : ''
                }`,
              );
            }}
          />
          {selectedCategory !== 'Explore' && selectedCategory !== 'All' && (
            <button
              type="button"
              onClick={() => setShowFilters(true)}
              aria-label="Filters"
              className={`size-14 shrink-0 rounded-sm border flex items-center justify-center transition-all active-scale ${
                showFilters ||
                selectedConditions.length > 0 ||
                selectedBrands.length > 0 ||
                selectedStorages.length > 0
                  ? 'border-transparent text-primary bg-primary/5'
                  : 'border-relay-border dark:border-relay-border-dark text-relay-muted hover:text-relay-text'
              }`}
            >
              <FilterIcon className="size-6 shrink-0 text-current" />
            </button>
          )}
        </div>
        <div className="flex gap-4 overflow-x-auto hide-scrollbar py-0.5 px-1 items-center">
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
                    ? 'h-8 px-4 rounded-[41px] bg-[#F1F5F9] text-relay-text dark:text-gray-200 shadow-[-2px_-2px_2px_#ffffff,_2px_2px_2px_#c9d9e8] dark:bg-gray-700 dark:shadow-none'
                    : 'h-6 w-6 rounded-full text-relay-muted dark:text-white hover:text-relay-text dark:hover:text-white/90 hover:bg-gray-200/60 dark:hover:bg-gray-700/40'
                }`}
              >
                {cat.svgIcon ? (
                  (() => { const Icon = cat.svgIcon; return <Icon size={24} className="shrink-0" />; })()
                ) : cat.useMaterialIcon ? (
                  <span className="material-symbols-outlined !text-[20px]">{cat.icon}</span>
                ) : cat.navIcon ? (
                  <Image
                    src={cat.navIcon}
                    alt=""
                    width={24}
                    height={24}
                    className={`size-6 object-contain shrink-0 ${'iconScale' in cat && cat.iconScale ? cat.iconScale : ''} ${'iconClass' in cat && cat.iconClass ? cat.iconClass : ''}`}
                  />
                ) : (
                  <Image
                    src={cat.icon}
                    alt=""
                    width={24}
                    height={24}
                    className="size-6 object-contain shrink-0 dark:invert"
                  />
                )}
                {isActive && <span className="text-[10px] font-medium tracking-tighter whitespace-nowrap">{cat.name}</span>}
              </button>
            );
          })}
        </div>
      </header>

      {/* Pull-to-refresh indicator — collapses when idle */}
      <div
        className="flex items-center justify-center overflow-hidden shrink-0"
        style={{
          height: isRefreshing ? 52 : pullDistance,
          transition: pullDistance === 0 && !isRefreshing ? 'height 0.25s ease' : 'none',
        }}
      >
        <div
          style={{
            transform: `translateY(${isRefreshing ? '0px' : `${Math.max(0, pullDistance - 52)}px`})`,
            transition: pullDistance === 0 && !isRefreshing ? 'transform 0.25s ease' : 'none',
            willChange: 'transform',
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
      </div>

      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain pb-20 pt-4" style={{ marginTop: '-1px' }}>

      {upcomingMeetup && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => router.push(`/meetup/${upcomingMeetup.swapId}`)}
          onKeyDown={(e) => e.key === 'Enter' && router.push(`/meetup/${upcomingMeetup.swapId}`)}
          className="mx-6 mt-0 mb-4 p-5 rounded-2xl glass-card border border-relay-border dark:border-relay-border-dark shadow-lg cursor-pointer active:scale-[0.99] transition-transform"
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
                className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark text-[10px] font-normal tracking-tighter shadow-inner"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 64 64"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="size-[15px] shrink-0 text-current"
                  aria-hidden
                >
                  <path d="M56 8L8 32L28 36L32 56L56 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Get directions
              </a>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); router.push(`/messages/${upcomingMeetup.conversationId ?? upcomingMeetup.swapId}`); }}
              className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark text-[10px] font-normal tracking-tighter shadow-inner"
            >
                <svg width="18" height="18" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-[18px] shrink-0 text-current" aria-hidden>
                  <path d="M10 8H54C55.1 8 56 8.9 56 10V42C56 43.1 55.1 44 54 44H24L10 56V44C8.9 44 8 43.1 8 42V10C8 8.9 8.9 8 10 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Message
            </button>
          </div>
        </div>
      )}

      <div className="px-6 pt-4 pb-32">
        {selectedCategory === 'Explore' ? (
          <>
            <div className="relative">
              {!exploreReady && (
                <div className="grid grid-cols-2 gap-4" aria-busy="true">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />
                  ))}
                </div>
              )}
              <div
                className="grid grid-cols-2 gap-4 transition-opacity duration-300 ease-out"
                style={{ opacity: exploreReady ? 1 : 0, position: exploreReady ? 'relative' : 'absolute', top: 0, left: 0, right: 0 }}
              >
              {Object.keys(BRANDS_BY_CATEGORY).map((cat, index) => {
                const totalCategories = Object.keys(BRANDS_BY_CATEGORY).length;
                return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => router.push(`/browse/${encodeURIComponent(cat)}`)}
                  className="group relative overflow-hidden rounded-2xl aspect-[4/3] border border-relay-border dark:border-relay-border-dark transition-all active:scale-[0.98]"
                >
                  {CATEGORY_CARD_IMAGES[cat] ? (
                    <Image
                      src={CATEGORY_CARD_IMAGES[cat]}
                      alt=""
                      fill
                      priority={index < 4}
                      sizes="(max-width: 768px) 50vw, 33vw"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      onLoad={() => {
                        exploreLoadedRef.current += 1;
                        if (exploreLoadedRef.current >= totalCategories) {
                          setExploreReady(true);
                        }
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-relay-surface dark:bg-relay-surface-dark flex items-center justify-center">
                      <span className="material-symbols-outlined !text-[48px] text-relay-muted">devices</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-transparent" />
                  <span className="absolute bottom-3 left-0 right-0 text-center text-white text-xs font-semibold tracking-normal px-2">{cat}</span>
                </button>
                );
              })}
              </div>
            </div>
          </>
        ) : (
        <>
        <div className="flex items-end justify-between mb-10">
           <div>
             <h1 className="text-relay-text dark:text-relay-text-dark text-[24px] font-display tracking-tighter leading-none mb-1">
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
            <div className="grid grid-cols-1 gap-14">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[1/1.618] rounded-[64px]" />
              ))}
            </div>
          ) : (
          <>
          {filteredItems.map((item, idx) => (
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
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  priority={idx === 0}
                  sizes="(max-width: 768px) 100vw, 60vw"
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
                  <h3 className="text-white text-4xl font-display leading-tight tracking-tighter mb-3">{item.name}</h3>
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
                        <Image
                          src={item.sellerAvatarUrl || getDefaultAvatar(item.sellerId || item.seller)}
                          alt=""
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
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
              <Image
                src="/no-gear-found.png"
                alt=""
                width={96}
                height={96}
                className="w-24 h-24 object-contain mb-8"
                aria-hidden
              />
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
            className="absolute inset-0 bg-relay-bg/70 dark:bg-relay-bg-dark/70 backdrop-blur-[10px]"
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
                    <p className="text-[10px] font-bold tracking-tight text-relay-muted dark:text-relay-muted-light">Distance</p>
                    {userLocation && (
                      <p className="text-xs font-medium text-relay-text dark:text-relay-text-dark mt-0.5">
                        {`${distanceRange} miles`}
                      </p>
                    )}
                    {!userLocation ? (
                      <div className="mt-3">
                        {locationError && (
                          <p className="text-[10px] text-relay-text dark:text-relay-text-dark/80 mb-2" role="alert">
                            {locationError}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={locationLoading ? undefined : requestLocation}
                          aria-label="Share my location to see nearby swap"
                          className="inline-flex items-center justify-center"
                        >
                          <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M14.7808 19.7005L14.1906 19.2377V19.2377L14.7808 19.7005ZM9.21921 19.7005L8.62903 20.1633L9.21921 19.7005ZM12 22.0055V21.2555V22.0055ZM9 9.25C8.58579 9.25 8.25 9.58579 8.25 10C8.25 10.4142 8.58579 10.75 9 10.75V9.25ZM15 10.75C15.4142 10.75 15.75 10.4142 15.75 10C15.75 9.58579 15.4142 9.25 15 9.25V10.75ZM11.25 13C11.25 13.4142 11.5858 13.75 12 13.75C12.4142 13.75 12.75 13.4142 12.75 13H11.25ZM12.75 7C12.75 6.58579 12.4142 6.25 12 6.25C11.5858 6.25 11.25 6.58579 11.25 7H12.75ZM19.25 9.6087C19.25 10.8352 18.6104 12.4764 17.6037 14.256C16.6137 16.0063 15.3342 17.7794 14.1906 19.2377L15.371 20.1633C16.5371 18.6762 17.8672 16.837 18.9094 14.9945C19.9349 13.1814 20.75 11.2494 20.75 9.6087H19.25ZM9.80938 19.2377C8.66578 17.7794 7.38628 16.0063 6.39625 14.256C5.38962 12.4764 4.75 10.8352 4.75 9.6087H3.25C3.25 11.2494 4.06511 13.1814 5.09064 14.9945C6.13277 16.837 7.46288 18.6762 8.62903 20.1633L9.80938 19.2377ZM4.75 9.6087C4.75 5.21571 8.04678 1.75 12 1.75V0.25C7.11666 0.25 3.25 4.49277 3.25 9.6087H4.75ZM12 1.75C15.9532 1.75 19.25 5.21571 19.25 9.6087H20.75C20.75 4.49277 16.8833 0.25 12 0.25V1.75ZM14.1906 19.2377C13.5717 20.027 13.1641 20.5426 12.7992 20.8741C12.4664 21.1764 12.2442 21.2555 12 21.2555V22.7555C12.7291 22.7555 13.2948 22.4504 13.8078 21.9844C14.2886 21.5476 14.7849 20.9107 15.371 20.1633L14.1906 19.2377ZM8.62903 20.1633C9.21511 20.9107 9.71136 21.5476 10.1922 21.9844C10.7052 22.4504 11.2709 22.7555 12 22.7555V21.2555C11.7558 21.2555 11.5336 21.1764 11.2008 20.8741C10.8359 20.5426 10.4283 20.027 9.80938 19.2377L8.62903 20.1633ZM9 10.75H15V9.25H9V10.75ZM12.75 13L12.75 7H11.25L11.25 13H12.75Z"
                              fill="#2D264B"
                            />
                            <path
                              d="M12 8.5L14.5 12L12 15.5L9.5 12Z"
                              fill="#FF6B59"
                            />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="mt-3">
                        <div className="relative h-6 flex items-center">
                          <div className="absolute inset-0 rounded-full bg-[linear-gradient(135deg,#E8F0F8,#FFFFFF)] border border-[#E3EDF7] shadow-[0_2px_22px_rgba(200,212,225,1)_inset,0_9px_18px_rgba(201,211,225,1)_inset,-12px_-10px_12px_rgba(255,255,255,0.75)_inset]" />
                          <div
                            className="absolute inset-y-1.5 left-2 rounded-full bg-[linear-gradient(to-b,#9BB9D3,#97B4CF)]"
                            style={{ width: `${(distanceRange / 100) * 100}%` }}
                          />
                          <input
                            type="range"
                            min="1"
                            max="100"
                            step="1"
                            value={distanceRange}
                            onChange={(e) => setDistanceRange(parseInt(e.target.value, 10))}
                            className="relative z-10 w-full h-4 opacity-0 cursor-pointer"
                          />
                          <div
                            className="pointer-events-none absolute w-9 h-9 rounded-full bg-[#E4F0FA] border border-[#E5EFFA] shadow-[25px_28px_66px_rgba(176,195,211,0.73)] flex items-center justify-center"
                            style={{ left: `calc(${(distanceRange / 100) * 100}% - 18px)` }}
                          >
                            <div className="w-3 h-3 rounded-full bg-[linear-gradient(135deg,#FF6B59,#D35646)] shadow-[0_9px_20px_rgba(255,104,81,1)]" />
                          </div>
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
                    <div className="relative h-6 mt-3 flex items-center">
                      <div className="absolute inset-0 rounded-full bg-[linear-gradient(135deg,#E8F0F8,#FFFFFF)] border border-[#E3EDF7] shadow-[0_2px_22px_rgba(200,212,225,1)_inset,0_9px_18px_rgba(201,211,225,1)_inset,-12px_-10px_12px_rgba(255,255,255,0.75)_inset]" />
                      <div
                        className="absolute inset-y-1.5 left-2 rounded-full bg-[linear-gradient(to-b,#9BB9D3,#97B4CF)]"
                        style={{ width: `${(priceRange / 2000) * 100}%` }}
                      />
                      <input
                        type="range"
                        min="0"
                        max="2000"
                        step="50"
                        value={priceRange}
                        onChange={(e) => setPriceRange(parseInt(e.target.value, 10))}
                        className="relative z-10 w-full h-6 opacity-0 cursor-pointer"
                      />
                      <div
                        className="pointer-events-none absolute w-9 h-9 rounded-full bg-[#E4F0FA] border border-[#E5EFFA] shadow-[25px_28px_66px_rgba(176,195,211,0.73)] flex items-center justify-center"
                        style={{ left: `calc(${(priceRange / 2000) * 100}% - 18px)` }}
                      >
                        <div className="w-3 h-3 rounded-full bg-[linear-gradient(135deg,#FF6B59,#D35646)] shadow-[0_9px_20px_rgba(255,104,81,1)]" />
                      </div>
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
                    className="flex-1 h-8 rounded-full bg-[#F1F5F9] shadow-[-2px_-2px_2px_#ffffff,_2px_2px_2px_#c9d9e8] dark:shadow-none text-relay-muted dark:text-relay-muted-light text-[10px] font-bold tracking-tight active-scale"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFilters(false)}
                    className="flex-[1.5] h-8 rounded-full bg-primary text-white text-xs font-semibold tracking-tight shadow-[-2px_-2px_2px_#ffffff,_2px_2px_2px_#c97a3a] dark:shadow-none active-scale"
                  >
                    Apply Selection
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-relay-border dark:border-relay-border-dark">
                  <button type="button" onClick={() => setFilterSubPanel(null)} className="size-10 flex items-center justify-center text-relay-text dark:text-relay-text-dark">
                    <ChevronIcon direction="left" className="size-6" />
                  </button>
                  <h2 className="text-[22px] font-semibold tracking-tighter text-relay-text dark:text-relay-text-dark">
                    {filterSubPanel === 'brand' ? 'Brand' : filterSubPanel === 'condition' ? 'Condition' : 'Storage'}
                  </h2>
                  <button type="button" onClick={() => { setShowFilters(false); setFilterSubPanel(null); }} className="size-10 flex items-center justify-center text-relay-text dark:text-relay-text-dark">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-4 hide-scrollbar">
                  {filterSubPanel === 'brand' && (
                    <>
                      <button type="button" onClick={() => setSelectedBrands([])} className={`w-full py-4 text-xs font-medium text-left border-b border-relay-border dark:border-relay-border-dark ${selectedBrands.length === 0 ? 'text-primary' : 'text-relay-text dark:text-relay-text-dark'}`}>
                        All
                      </button>
                      {brandsForFilter.map((b) => (
                        <button key={b} type="button" onClick={() => handleBrandToggle(b)} className={`w-full py-4 text-xs font-medium text-left border-b border-relay-border dark:border-relay-border-dark ${selectedBrands.includes(b) ? 'text-primary' : 'text-relay-text dark:text-relay-text-dark'}`}>
                          {b.toUpperCase()}
                        </button>
                      ))}
                    </>
                  )}
                  {filterSubPanel === 'condition' && (
                    <>
                      <button type="button" onClick={() => setSelectedConditions([])} className={`w-full py-4 text-xs font-medium text-left border-b border-relay-border dark:border-relay-border-dark ${selectedConditions.length === 0 ? 'text-primary' : 'text-relay-text dark:text-relay-text-dark'}`}>
                        All
                      </button>
                      {conditions.map((c) => (
                        <button key={c} type="button" onClick={() => handleConditionToggle(c)} className={`w-full py-4 text-xs font-medium text-left border-b border-relay-border dark:border-relay-border-dark ${selectedConditions.includes(c) ? 'text-primary' : 'text-relay-text dark:text-relay-text-dark'}`}>
                          {c.toUpperCase()}
                        </button>
                      ))}
                    </>
                  )}
                  {filterSubPanel === 'storage' && (
                    <>
                      <button type="button" onClick={() => setSelectedStorages([])} className={`w-full py-4 text-xs font-medium text-left border-b border-relay-border dark:border-relay-border-dark ${selectedStorages.length === 0 ? 'text-primary' : 'text-relay-text dark:text-relay-text-dark'}`}>
                        All
                      </button>
                      {STORAGE_OPTIONS.map((s) => (
                        <button key={s} type="button" onClick={() => handleStorageToggle(s)} className={`w-full py-4 text-xs font-medium text-left border-b border-relay-border dark:border-relay-border-dark ${selectedStorages.includes(s) ? 'text-primary' : 'text-relay-text dark:text-relay-text-dark'}`}>
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
                    className="flex-1 h-8 rounded-full bg-[#F1F5F9] shadow-[-2px_-2px_2px_#ffffff,_2px_2px_2px_#c9d9e8] dark:shadow-none text-relay-muted dark:text-relay-muted-light text-[10px] font-bold tracking-tight active-scale"
                  >
                    Reset
                  </button>
                  <button type="button" onClick={() => setFilterSubPanel(null)} className="flex-[1.5] h-8 rounded-full bg-primary text-white text-xs font-semibold tracking-tight shadow-[-2px_-2px_2px_#ffffff,_2px_2px_2px_#c97a3a] dark:shadow-none active-scale">
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

export default function LandingPage() {
  return (
    <Suspense>
      <LandingPageContent />
    </Suspense>
  );
}
