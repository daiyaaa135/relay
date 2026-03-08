'use client';

import React, { useEffect, useRef, useState } from 'react';

const LIGHT_STYLE = 'mapbox://styles/mapbox/light-v11';
const DARK_STYLE = 'mapbox://styles/mapbox/dark-v11';
const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';
const PADDING = 0.012;

export interface PickupLocationPoint {
  latitude: number;
  longitude: number;
}

interface Props {
  locations: PickupLocationPoint[];
  className?: string;
}

function isDark() {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
}

function createNumberedPin(num: number): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;';

  const circle = document.createElement('div');
  circle.style.cssText = [
    'width:32px;height:32px;border-radius:50%;',
    'background:#FF5721;',
    'border:2.5px solid white;',
    'box-shadow:0 2px 8px rgba(255,87,33,0.4);',
    'display:flex;align-items:center;justify-content:center;',
    'font-size:13px;font-weight:700;color:white;',
  ].join('');
  circle.textContent = String(num);

  const tip = document.createElement('div');
  tip.style.cssText = 'width:6px;height:6px;border-radius:50%;background:#FF5721;margin-top:2px;box-shadow:0 1px 3px rgba(255,87,33,0.4);';

  wrap.appendChild(circle);
  wrap.appendChild(tip);
  return wrap;
}

/**
 * Shows a Mapbox map fitting all pickup points with numbered pin markers.
 * Non-interactive (read-only). Supports dark mode + loading skeleton.
 */
export function PickupLocationsMap({ locations, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (locations.length < 2 || !containerRef.current) return;

    let map: unknown;
    let observer: MutationObserver;
    let mounted = true;

    const init = async () => {
      const mbgl = (await import('mapbox-gl')).default as typeof import('mapbox-gl');
      if (!mounted || !containerRef.current) return;

      mbgl.accessToken = TOKEN;

      const lats = locations.map((l) => l.latitude);
      const lons = locations.map((l) => l.longitude);

      map = new mbgl.Map({
        container: containerRef.current,
        style: isDark() ? DARK_STYLE : LIGHT_STYLE,
        center: [
          (Math.min(...lons) + Math.max(...lons)) / 2,
          (Math.min(...lats) + Math.max(...lats)) / 2,
        ],
        zoom: 13,
        interactive: false,
        attributionControl: false,
      });

      (map as { on: (e: string, cb: () => void) => void }).on('load', () => {
        if (!mounted) return;

        // Fit to all points
        const sw = new mbgl.LngLat(Math.min(...lons) - PADDING, Math.min(...lats) - PADDING);
        const ne = new mbgl.LngLat(Math.max(...lons) + PADDING, Math.max(...lats) + PADDING);
        (map as { fitBounds: (b: unknown, o: unknown) => void }).fitBounds(new mbgl.LngLatBounds(sw, ne), {
          padding: 40,
          maxZoom: 15,
          duration: 0,
        });

        // Add numbered markers
        locations.slice(0, 2).forEach((loc, i) => {
          const el = createNumberedPin(i + 1);
          new mbgl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([loc.longitude, loc.latitude])
            .addTo(map as Parameters<typeof mbgl.Marker.prototype.addTo>[0]);
        });

        setLoaded(true);
      });

      // Dark mode
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
  }, [locations]);

  if (locations.length < 2) return null;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-relay-border dark:border-relay-border-dark bg-relay-bg dark:bg-relay-bg-dark ${className}`}
    >
      {/* 16:10 → 62.5% */}
      {!loaded && <div className="absolute inset-0 z-20 animate-pulse bg-[#e2e5e9] dark:bg-[#1c1c1e]" />}
      <div ref={containerRef} style={{ width: '100%', paddingBottom: '62.5%' }} />
    </div>
  );
}
