'use client';

import React, { useEffect, useRef, useState } from 'react';
import { distanceMiles } from '@/lib/geo';

const LIGHT_STYLE = 'mapbox://styles/mapbox/light-v11';
const DARK_STYLE = 'mapbox://styles/mapbox/dark-v11';
const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';
const PADDING = 0.015;

type Point = { lat: number; lon: number } | null;

interface Props {
  meetingLat: number;
  meetingLon: number;
  buyerPoint: Point;
  sellerPoint: Point;
  buyerLabel?: string;
  sellerLabel?: string;
  buyerAvatarUrl?: string | null;
  sellerAvatarUrl?: string | null;
  className?: string;
}

function isDark() {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
}

function formatDist(miles: number): string {
  if (miles < 0.1) return `${Math.round(miles * 5280)} ft away`;
  return `${miles.toFixed(1)} mi away`;
}

/** Meeting spot pin: large destination marker with slow pulse ring */
function createMeetingEl(): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;position:relative;';

  // Pin body
  const pin = document.createElement('div');
  pin.style.cssText = [
    'width:40px;height:40px;border-radius:50%;',
    'background:#FF5721;',
    'border:2.5px solid white;',
    'box-shadow:0 3px 10px rgba(255,87,33,0.45);',
    'display:flex;align-items:center;justify-content:center;',
    'position:relative;z-index:1;',
  ].join('');
  pin.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
  </svg>`;

  // Tip dot
  const tip = document.createElement('div');
  tip.style.cssText = 'width:7px;height:7px;border-radius:50%;background:#FF5721;margin-top:2px;box-shadow:0 1px 4px rgba(255,87,33,0.5);';

  // Label above (using absolute positioning so it doesn't affect anchor)
  const label = document.createElement('div');
  label.textContent = 'Meet here';
  label.style.cssText = [
    'position:absolute;bottom:100%;margin-bottom:3px;',
    'font-size:9px;font-weight:800;letter-spacing:0.02em;',
    'color:#FF5721;white-space:nowrap;',
    'background:rgba(255,255,255,0.88);',
    'backdrop-filter:blur(4px);',
    'padding:1px 5px;border-radius:4px;',
    'box-shadow:0 1px 4px rgba(0,0,0,0.12);',
  ].join('');

  wrap.appendChild(label);
  wrap.appendChild(pin);
  wrap.appendChild(tip);
  return wrap;
}

interface PersonMarker {
  el: HTMLElement;
  distSpan: HTMLSpanElement;
}

/** Person marker: avatar circle with ping ring + name + distance */
function createPersonEl(
  color: 'blue' | 'amber',
  avatarUrl: string | null | undefined,
  label: string,
  distText: string,
): PersonMarker {
  const accent = color === 'blue' ? '#3b82f6' : '#f59e0b';
  const initial = label === 'You' ? 'Y' : (label.charAt(0).toUpperCase() || (color === 'blue' ? 'B' : 'S'));

  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;position:relative;';

  // Avatar circle
  const circle = document.createElement('div');
  circle.style.cssText = [
    'width:36px;height:36px;border-radius:50%;',
    `background:${accent};`,
    'border:2.5px solid white;',
    `box-shadow:0 2px 8px ${color === 'blue' ? 'rgba(59,130,246,0.4)' : 'rgba(245,158,11,0.4)'};`,
    'display:flex;align-items:center;justify-content:center;',
    'overflow:hidden;position:relative;z-index:1;',
    'font-size:13px;font-weight:700;color:white;',
  ].join('');

  if (avatarUrl) {
    const img = document.createElement('img');
    img.src = avatarUrl;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
    img.alt = label;
    circle.appendChild(img);
  } else {
    circle.textContent = initial;
  }

  // Name label
  const nameSpan = document.createElement('span');
  nameSpan.textContent = label;
  nameSpan.style.cssText = [
    `font-size:8px;font-weight:700;color:${accent};`,
    'margin-top:2px;max-width:56px;',
    'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
    'text-shadow:0 1px 3px rgba(255,255,255,0.95),0 1px 2px rgba(0,0,0,0.15);',
  ].join('');

  // Distance label
  const distSpan = document.createElement('span');
  distSpan.textContent = distText;
  distSpan.style.cssText = [
    'font-size:7px;font-weight:600;color:#555;',
    'white-space:nowrap;',
    'text-shadow:0 1px 2px rgba(255,255,255,0.95);',
  ].join('');

  wrap.appendChild(circle);
  wrap.appendChild(nameSpan);
  wrap.appendChild(distSpan);

  return { el: wrap, distSpan };
}

/** Map showing meeting spot + optional buyer/seller live positions. */
export function LivePickupMap({
  meetingLat,
  meetingLon,
  buyerPoint,
  sellerPoint,
  buyerLabel = 'Buyer',
  sellerLabel = 'Seller',
  buyerAvatarUrl,
  sellerAvatarUrl,
  className = '',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const mapboxglRef = useRef<typeof import('mapbox-gl') | null>(null);
  const meetingMarkerRef = useRef<unknown>(null);
  const buyerMarkerRef = useRef<unknown>(null);
  const sellerMarkerRef = useRef<unknown>(null);
  const buyerDistRef = useRef<HTMLSpanElement | null>(null);
  const sellerDistRef = useRef<HTMLSpanElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Compute bounds that fit all available points
  function computeBounds(mbgl: typeof import('mapbox-gl'), map: unknown) {
    const pts: Array<{ lat: number; lon: number }> = [
      { lat: meetingLat, lon: meetingLon },
      ...(buyerPoint ? [buyerPoint] : []),
      ...(sellerPoint ? [sellerPoint] : []),
    ];
    const lats = pts.map((p) => p.lat);
    const lons = pts.map((p) => p.lon);
    const sw = new mbgl.LngLat(Math.min(...lons) - PADDING, Math.min(...lats) - PADDING);
    const ne = new mbgl.LngLat(Math.max(...lons) + PADDING, Math.max(...lats) + PADDING);
    const bounds = new mbgl.LngLatBounds(sw, ne);
    (map as { fitBounds: (b: unknown, opts: unknown) => void }).fitBounds(bounds, {
      padding: 40,
      maxZoom: 16,
      duration: 800,
    });
  }

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current) return;
    let map: ReturnType<typeof import('mapbox-gl')['Map']['prototype']['constructor']> | undefined;
    let observer: MutationObserver;
    let mounted = true;

    const init = async () => {
      const mbgl = (await import('mapbox-gl')).default as typeof import('mapbox-gl');
      if (!mounted || !containerRef.current) return;

      mbgl.accessToken = TOKEN;
      mapboxglRef.current = mbgl;

      map = new mbgl.Map({
        container: containerRef.current,
        style: isDark() ? DARK_STYLE : LIGHT_STYLE,
        center: [meetingLon, meetingLat],
        zoom: 14,
        attributionControl: false,
        logoPosition: 'bottom-left' as const,
      }) as unknown as typeof map;

      // Allow pan + zoom only; disable rotation, box-zoom, keyboard nav
      (map as unknown as { dragRotate: { disable: () => void } }).dragRotate.disable();
      (map as unknown as { touchZoomRotate: { disableRotation: () => void } }).touchZoomRotate.disableRotation();
      (map as unknown as { doubleClickZoom: { disable: () => void } }).doubleClickZoom.disable();
      (map as unknown as { keyboard: { disable: () => void } }).keyboard.disable();
      (map as unknown as { boxZoom: { disable: () => void } }).boxZoom.disable();

      mapRef.current = map;

      (map as unknown as { on: (event: string, cb: () => void) => void }).on('load', () => {
        if (!mounted) return;
        setLoaded(true);

        // Meeting spot marker
        const meetingEl = createMeetingEl();
        meetingMarkerRef.current = new mbgl.Marker({ element: meetingEl, anchor: 'bottom' })
          .setLngLat([meetingLon, meetingLat])
          .addTo(map!);

        // Buyer marker
        if (buyerPoint) {
          const d = distanceMiles(buyerPoint.lat, buyerPoint.lon, meetingLat, meetingLon);
          const { el, distSpan } = createPersonEl('blue', buyerAvatarUrl, buyerLabel, formatDist(d));
          buyerDistRef.current = distSpan;
          buyerMarkerRef.current = new mbgl.Marker({ element: el, anchor: 'top', offset: [0, -18] })
            .setLngLat([buyerPoint.lon, buyerPoint.lat])
            .addTo(map!);
        }

        // Seller marker
        if (sellerPoint) {
          const d = distanceMiles(sellerPoint.lat, sellerPoint.lon, meetingLat, meetingLon);
          const { el, distSpan } = createPersonEl('amber', sellerAvatarUrl, sellerLabel, formatDist(d));
          sellerDistRef.current = distSpan;
          sellerMarkerRef.current = new mbgl.Marker({ element: el, anchor: 'top', offset: [0, -18] })
            .setLngLat([sellerPoint.lon, sellerPoint.lat])
            .addTo(map!);
        }

        computeBounds(mbgl, map);
      });

      // Dark mode observer
      observer = new MutationObserver(() => {
        if (!mapRef.current) return;
        (mapRef.current as { setStyle: (s: string) => void }).setStyle(isDark() ? DARK_STYLE : LIGHT_STYLE);
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    };

    init();

    return () => {
      mounted = false;
      observer?.disconnect();
      (map as unknown as { remove?: () => void })?.remove?.();
      mapRef.current = null;
      mapboxglRef.current = null;
      meetingMarkerRef.current = null;
      buyerMarkerRef.current = null;
      sellerMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update buyer position + distance
  useEffect(() => {
    if (!mapRef.current || !mapboxglRef.current) return;
    const mbgl = mapboxglRef.current;

    if (buyerPoint) {
      const d = distanceMiles(buyerPoint.lat, buyerPoint.lon, meetingLat, meetingLon);
      if (buyerMarkerRef.current) {
        (buyerMarkerRef.current as { setLngLat: (ll: [number, number]) => void }).setLngLat([buyerPoint.lon, buyerPoint.lat]);
        if (buyerDistRef.current) buyerDistRef.current.textContent = formatDist(d);
      } else if (loaded) {
        const { el, distSpan } = createPersonEl('blue', buyerAvatarUrl, buyerLabel, formatDist(d));
        buyerDistRef.current = distSpan;
        buyerMarkerRef.current = new mbgl.Marker({ element: el, anchor: 'top', offset: [0, -18] })
          .setLngLat([buyerPoint.lon, buyerPoint.lat])
          .addTo(mapRef.current as Parameters<typeof mbgl.Marker.prototype.addTo>[0]);
      }
      computeBounds(mbgl, mapRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyerPoint, loaded]);

  // Update seller position + distance
  useEffect(() => {
    if (!mapRef.current || !mapboxglRef.current) return;
    const mbgl = mapboxglRef.current;

    if (sellerPoint) {
      const d = distanceMiles(sellerPoint.lat, sellerPoint.lon, meetingLat, meetingLon);
      if (sellerMarkerRef.current) {
        (sellerMarkerRef.current as { setLngLat: (ll: [number, number]) => void }).setLngLat([sellerPoint.lon, sellerPoint.lat]);
        if (sellerDistRef.current) sellerDistRef.current.textContent = formatDist(d);
      } else if (loaded) {
        const { el, distSpan } = createPersonEl('amber', sellerAvatarUrl, sellerLabel, formatDist(d));
        sellerDistRef.current = distSpan;
        sellerMarkerRef.current = new mbgl.Marker({ element: el, anchor: 'top', offset: [0, -18] })
          .setLngLat([sellerPoint.lon, sellerPoint.lat])
          .addTo(mapRef.current as Parameters<typeof mbgl.Marker.prototype.addTo>[0]);
      }
      computeBounds(mbgl, mapRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerPoint, loaded]);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-relay-border dark:border-relay-border-dark bg-relay-bg dark:bg-relay-bg-dark ${className}`}
    >
      {!loaded && <div className="absolute inset-0 z-20 animate-pulse bg-[#e2e5e9] dark:bg-[#1c1c1e]" />}
      <div ref={containerRef} style={{ width: '100%', paddingBottom: '75%' }} />
    </div>
  );
}
