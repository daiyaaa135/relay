'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Smartphone,
  Tablet,
  Headphones,
  Speaker,
  Gamepad2,
  Music,
  Package,
  type LucideIcon,
} from 'lucide-react';
import { LaptopIcon } from '@/app/components/LaptopIcon';
import type { BrowseResponse } from '@/app/api/browse/[category]/route';
import { type } from '@/lib/typography';
import { ChevronIcon } from '@/app/components/ChevronIcon';

const VALID_CATEGORIES = [
  'Phones', 'Laptops', 'Tablets', 'Headphones', 'Speaker', 'Console', 'Video Games', 'MP3', 'Gaming Handhelds',
];

const CATEGORY_SECTION_ICON: Record<string, LucideIcon | typeof LaptopIcon> = {
  Phones: Smartphone,
  Laptops: LaptopIcon,
  Tablets: Tablet,
  Headphones: Headphones,
  Speaker: Speaker,
  Console: Gamepad2,
  'Video Games': Gamepad2,
  MP3: Music,
  'Gaming Handhelds': Gamepad2,
};

/** Representative brand colors used for brand section headings. */
const BRAND_COLORS: Record<string, string> = {
  Apple: '#000000',
  Samsung: '#1428A0',
  Google: '#4285F4',
  OnePlus: '#EB0028',
  Motorola: '#0098D6',
};

function sectionLabel(category: string, brand: string): string {
  return brand;
}

const PULL_THRESHOLD = 72; // px before release triggers refresh

export default function BrowseCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const rawParam = (params?.category as string) || '';
  const category = rawParam ? decodeURIComponent(rawParam).trim() : '';
  const [data, setData] = useState<BrowseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const mainRef = useRef<HTMLElement>(null);
  const touchStartY = useRef(0);
  const isPullingRef = useRef(false);
  const hapticFiredRef = useRef(false);
  const pullDistanceRef = useRef(0);

  const isValid = VALID_CATEGORIES.includes(category);

  const fetchData = useCallback(async () => {
    if (!category || !isValid) return;
    setError(null);
    try {
      const res = await fetch(`/api/browse/${encodeURIComponent(category)}`);
      if (!res.ok) throw new Error('Failed to load');
      const json: BrowseResponse = await res.json();
      setData(json);
    } catch {
      setError('Could not load devices.');
    }
  }, [category, isValid]);

  useEffect(() => {
    if (!category || !isValid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData, category, isValid]);

  // Pull-to-refresh — document-level listeners so iOS WKWebView doesn't swallow them
  useEffect(() => {
    const el = mainRef.current;
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
        await fetchData();
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
  }, [fetchData]);

  if (!category || !isValid) {
    return (
      <div className="h-full bg-relay-surface dark:bg-relay-surface-dark flex flex-col items-center justify-center p-6 transition-colors">
        <p className="text-relay-text dark:text-relay-text-dark text-sm opacity-80">Invalid category.</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-4 text-primary text-sm font-bold tracking-widest"
        >
          Go back
        </button>
      </div>
    );
  }

  const isVideoGames = category === 'Video Games';
  const pullProgress = Math.min(pullDistance / PULL_THRESHOLD, 1);

  return (
    <div className="flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark flex flex-col transition-colors">
      {/* Header: back + title (canonical layout) */}
      <PageHeader onBack={() => router.push('/')} className="z-20">
        <h1 className={`${type.h2} !font-semibold text-relay-text dark:text-relay-text-dark`}>
          {category}
        </h1>
      </PageHeader>

      {/* Pull-to-refresh indicator — uses transform (GPU) not height (layout reflow) */}
      <div className="flex items-center justify-center overflow-hidden shrink-0" style={{ height: 52 }}>
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
                opacity: pullProgress,
                transform: `rotate(${pullProgress * 180}deg)`,
                transition: 'transform 0.08s linear',
              }}
            >
              arrow_downward
            </span>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <main
        ref={mainRef}
        className="flex-1 min-h-0 overflow-y-auto pb-8 overscroll-y-contain"
        style={{ marginTop: '-1px' }}
      >
        {loading && !isRefreshing && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="size-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-relay-muted dark:text-relay-muted-light text-xs font-bold tracking-widest">Loading...</p>
          </div>
        )}

        {error && (
          <div className="px-6 py-12 text-center">
            <p className="text-relay-text dark:text-relay-text-dark text-sm mb-4 opacity-80">{error}</p>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                fetchData().finally(() => setLoading(false));
              }}
              className="text-primary text-xs font-bold tracking-widest"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && data && (
          <div className="px-4 pt-6 space-y-8">
            {data.brands.map(({ brand, devices }) => (
              <section key={brand}>
                {(() => {
                  const brandColor = BRAND_COLORS.Apple ?? '#000000';
                  return (
                    <h2
                      className="flex items-center gap-2 text-[16px] font-normal mb-3"
                      style={{ color: brandColor }}
                    >
                      {sectionLabel(data.category, brand)}
                    </h2>
                  );
                })()}
                <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 -mx-4 px-4">
                  {devices.map((device) => {
                    const href = `/browse/${encodeURIComponent(category)}/${encodeURIComponent(device.brand)}/${encodeURIComponent(device.model)}${device.image_url ? `?img=${encodeURIComponent(device.image_url)}` : ''}`;
                    const cardClasses = isVideoGames
                      ? 'flex-shrink-0 w-[18vw] max-w-[70px] rounded-lg'
                      : 'flex-shrink-0 w-[72vw] max-w-[280px] rounded-2xl';
                    return (
                      <Link
                        key={device.id}
                        href={href}
                        className={`${cardClasses} bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark overflow-hidden transition-all active:scale-[0.97]`}
                      >
                        {isVideoGames ? (
                          <div className="flex flex-col">
                            <div className="w-full aspect-[3/4] flex items-center justify-center bg-relay-surface dark:bg-relay-surface-dark p-1 transition-colors">
                              {device.image_url ? (
                                <img src={device.image_url} alt={device.model} className="w-full h-full object-contain" loading="lazy" />
                              ) : (
                                <Gamepad2 className="size-8 text-relay-muted dark:text-relay-muted-light" />
                              )}
                            </div>
                            <div className="flex flex-col p-1 min-w-0">
                              <p className="text-relay-text dark:text-relay-text-dark text-[10px] line-clamp-2 leading-tight">{device.model}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex">
                            <div className="w-2/5 min-h-[100px] flex items-center justify-center bg-relay-surface dark:bg-relay-surface-dark p-2 transition-colors">
                              {device.image_url ? (
                                <img src={device.image_url} alt="" className="w-full h-full object-contain max-h-24" loading="lazy" />
                              ) : (
                                <Smartphone className="size-10 text-relay-muted dark:text-relay-muted-light" />
                              )}
                            </div>
                            <div className="flex-1 flex flex-col justify-center p-3 min-w-0">
                              <p className="text-relay-text dark:text-relay-text-dark text-sm truncate">{device.brand} {device.model}</p>
                            </div>
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
            {data.brands.length === 0 && (
              <div className="py-16 text-center">
                <Package className="size-14 mx-auto text-relay-muted dark:text-relay-muted-light" />
                <p className="text-relay-muted dark:text-relay-muted-light text-sm mt-3">No devices in this category yet.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
