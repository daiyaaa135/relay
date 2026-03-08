'use client';

import React, { useEffect, useRef, useState } from 'react';

const LIGHT_STYLE = 'mapbox://styles/mapbox/light-v11';
const DARK_STYLE = 'mapbox://styles/mapbox/dark-v11';
const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';
const MAP_DELTA = 0.012;

export interface MeetingSpotMapProps {
  latitude: number;
  longitude: number;
  label?: string;
  className?: string;
}

function isDark() {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
}

function createMeetingPin(): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;position:relative;';

  const circle = document.createElement('div');
  circle.style.cssText = [
    'width:40px;height:40px;border-radius:50%;',
    'background:#FF5721;',
    'border:2.5px solid white;',
    'box-shadow:0 3px 10px rgba(255,87,33,0.4);',
    'display:flex;align-items:center;justify-content:center;',
    'position:relative;z-index:1;',
  ].join('');
  circle.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="white">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
  </svg>`;

  const tip = document.createElement('div');
  tip.style.cssText = 'width:7px;height:7px;border-radius:50%;background:#FF5721;margin-top:2px;box-shadow:0 1px 4px rgba(255,87,33,0.5);';

  wrap.appendChild(circle);
  wrap.appendChild(tip);
  return wrap;
}

/** Single-point Mapbox map for agreed meeting location. Non-interactive. */
export function MeetingSpotMap({ latitude, longitude, label, className = '' }: MeetingSpotMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

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
        zoom: 15,
        interactive: false,
        attributionControl: false,
      });

      (map as { on: (e: string, cb: () => void) => void }).on('load', () => {
        if (!mounted) return;

        // Fit bbox around the point
        const sw = new mbgl.LngLat(longitude - MAP_DELTA, latitude - MAP_DELTA);
        const ne = new mbgl.LngLat(longitude + MAP_DELTA, latitude + MAP_DELTA);
        (map as { fitBounds: (b: unknown, o: unknown) => void }).fitBounds(new mbgl.LngLatBounds(sw, ne), {
          padding: 40,
          duration: 0,
        });

        const el = createMeetingPin();
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
  }, [latitude, longitude]);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-relay-border dark:border-relay-border-dark bg-relay-bg dark:bg-relay-bg-dark ${className}`}
    >
      {!loaded && <div className="absolute inset-0 z-20 animate-pulse bg-[#e2e5e9] dark:bg-[#1c1c1e]" />}
      <div ref={containerRef} style={{ width: '100%', paddingBottom: '75%' }} />
      {label && (
        <p className="px-4 py-3 text-center text-xs text-relay-text dark:text-relay-text-dark font-medium">
          {label}
        </p>
      )}
    </div>
  );
}
