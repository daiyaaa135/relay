'use client';

import React, { useEffect, useRef, useState } from 'react';
import { getDefaultAvatar } from '@/lib/avatars';

const LIGHT_STYLE = 'mapbox://styles/mapbox/light-v11';
const DARK_STYLE = 'mapbox://styles/mapbox/dark-v11';
const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';
const MAP_DELTA = 0.012;

export interface LocationMapWithAvatarProps {
  latitude: number;
  longitude: number;
  avatarUrl?: string | null;
  alt?: string;
  avatarFallbackKey?: string | null;
  className?: string;
}

function isDark() {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
}

function createAvatarPin(avatarSrc: string, alt: string): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;';

  const ring = document.createElement('div');
  ring.style.cssText = [
    'width:56px;height:56px;border-radius:50%;',
    'border:3px solid white;',
    'box-shadow:0 3px 12px rgba(0,0,0,0.2);',
    'background:#e8e9ec;',
    'overflow:hidden;',
    'display:flex;align-items:center;justify-content:center;',
  ].join('');

  const img = document.createElement('img');
  img.src = avatarSrc;
  img.alt = alt || 'Location';
  img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
  ring.appendChild(img);

  const dot = document.createElement('div');
  dot.style.cssText = [
    'width:10px;height:10px;border-radius:50%;',
    'background:#3b82f6;',
    'margin-top:3px;',
    'box-shadow:0 1px 4px rgba(59,130,246,0.5);',
    'border:2px solid white;',
  ].join('');

  wrap.appendChild(ring);
  wrap.appendChild(dot);
  return wrap;
}

/**
 * Shows an approximate location on a Mapbox map with a circular avatar marker.
 * Non-interactive. Supports dark mode + loading skeleton.
 */
export function LocationMapWithAvatar({
  latitude,
  longitude,
  avatarUrl,
  alt = '',
  avatarFallbackKey,
  className = '',
}: LocationMapWithAvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  const fallbackKey = avatarFallbackKey ?? (alt || 'location');
  const resolvedSrc = avatarUrl || getDefaultAvatar(fallbackKey);

  useEffect(() => {
    if (!containerRef.current) return;
    let map: unknown;
    let observer: MutationObserver;
    let mounted = true;

    const init = async () => {
      const mbgl = (await import('mapbox-gl')).default as typeof import('mapbox-gl');
      if (!mounted || !containerRef.current) return;

      mbgl.accessToken = TOKEN;

      map = new mbgl.Map({
        container: containerRef.current,
        style: isDark() ? DARK_STYLE : LIGHT_STYLE,
        center: [longitude, latitude],
        zoom: 14,
        interactive: false,
        attributionControl: false,
      });

      (map as { on: (e: string, cb: () => void) => void }).on('load', () => {
        if (!mounted) return;

        const sw = new mbgl.LngLat(longitude - MAP_DELTA, latitude - MAP_DELTA);
        const ne = new mbgl.LngLat(longitude + MAP_DELTA, latitude + MAP_DELTA);
        (map as { fitBounds: (b: unknown, o: unknown) => void }).fitBounds(new mbgl.LngLatBounds(sw, ne), {
          padding: 40,
          duration: 0,
        });

        const el = createAvatarPin(resolvedSrc, alt);
        new mbgl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([longitude, latitude])
          .addTo(map as Parameters<typeof mbgl.Marker.prototype.addTo>[0]);

        setLoaded(true);
      });

      observer = new MutationObserver(() => {
        (map as { setStyle: (s: string) => void }).setStyle(isDark() ? DARK_STYLE : LIGHT_STYLE);
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    };

    init();

    return () => {
      mounted = false;
      observer?.disconnect();
      (map as { remove?: () => void })?.remove?.();
    };
  }, [latitude, longitude, resolvedSrc, alt]);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-relay-border dark:border-relay-border-dark bg-relay-bg dark:bg-relay-bg-dark ${className}`}
    >
      {/* Shimmer overlays the outer wrapper. Container is in normal flow so Mapbox gets real dimensions. */}
      {!loaded && <div className="absolute inset-0 z-20 animate-pulse bg-[#e2e5e9] dark:bg-[#1c1c1e]" />}
      <div ref={containerRef} style={{ width: '100%', paddingBottom: '75%' }} />
      <p className="px-4 py-3 text-center text-[10px] text-relay-muted dark:text-relay-muted-light">
        We protect your privacy by sharing only an approximate location.
      </p>
    </div>
  );
}
