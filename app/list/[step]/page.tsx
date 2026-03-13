'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BRANDS_BY_CATEGORY } from '@/lib/constants';
import { getRelicStorageOptions, NO_STORAGE_OPTION } from '@/lib/relicStorage';
import { getLaptopStorageOptions } from '@/lib/laptopStorage';
import { getConsoleStorageOptions, CONSOLE_NO_STORAGE_OPTION } from '@/lib/consoleStorage';
import { getColorsForModel } from '@/lib/phoneColors';
import { getTabletColorsForModel } from '@/lib/tabletColors';
import { getAccessoryColorsForModel } from '@/lib/accessoryColors';
import { getLaptopColorsForModel } from '@/lib/laptopColors';
import { createClient } from '@/lib/supabase';
import { createGadget, updateGadgetPickupLocations, type PickupLocationRow } from '@/lib/gadgets';
import { hasAvailability } from '@/lib/availability';
import { fetchProfile } from '@/lib/profiles';
import { reverseGeocode, searchLocations, type LocationSuggestion } from '@/lib/geo';
import { Capacitor } from '@capacitor/core';
import dynamic from 'next/dynamic';

const DeviceCaptureFlow = dynamic(
  () => import('@/app/components/DeviceCaptureFlow').then(m => ({ default: m.DeviceCaptureFlow })),
  { ssr: false, loading: () => <div className="w-full h-48 rounded-2xl bg-relay-bg animate-pulse" /> }
);
const LocationMapWithAvatar = dynamic(
  () => import('@/app/components/LocationMapWithAvatar').then(m => ({ default: m.LocationMapWithAvatar })),
  { ssr: false, loading: () => <div className="w-full h-48 rounded-2xl bg-relay-bg animate-pulse" /> }
);
const SearchableGameDropdown = dynamic(
  () => import('@/app/components/SearchableGameDropdown').then(m => ({ default: m.SearchableGameDropdown })),
  { ssr: false, loading: () => <div className="w-full h-12 rounded-xl bg-relay-bg animate-pulse" /> }
);
import { NextStepButton } from '@/app/components/NextStepButton';
import { useListing, VALUATION_STORAGE_KEY } from '../ListingContext';
import { ConditionStepPart, getWorstCondition } from '../ConditionStepPart';
import { ListingStepFooter, type ListingStepFooterProps } from '../components/ListingStepFooter';
import type { DeviceType } from '@/lib/DeviceCaptureConfig';

const MIN_LISTING_PHOTOS = 6;

const CONSOLE_ACCESSORY_OPTIONS = [
  { id: 'Power cord', required: true },
  { id: 'Controller', required: true },
  { id: 'HDMI cable', required: false },
] as const;

const TABLET_ACCESSORY_OPTIONS = [
  { id: 'Charging cable' },
  { id: 'Power adapter' },
] as const;

const LAPTOP_ACCESSORY_OPTIONS = [
  { id: 'Charging cable' },
  { id: 'Power adapter' },
] as const;

const HANDHELD_ACCESSORY_OPTIONS = [
  { id: 'Charging cable' },
  { id: 'Power adapter' },
] as const;

const HEADPHONES_ACCESSORY_OPTIONS = [
  { id: 'Charging cable' },
  { id: 'Power adapter' },
  { id: 'Original box' },
] as const;

const SPEAKER_ACCESSORY_OPTIONS = [
  { id: 'Power cable / adapter' },
  { id: 'Remote control' },
  { id: 'Original box' },
] as const;

const MP3_ACCESSORY_OPTIONS = [
  { id: 'Charging/sync cable' },
] as const;

const MAPBOX_LIGHT = 'mapbox://styles/mapbox/light-v11';
const MAPBOX_DARK = 'mapbox://styles/mapbox/dark-v11';
const PICKUP_MAP_PADDING = 0.012;

function isDarkMode() {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
}

function createPickupPin(num: 1 | 2, color: string): HTMLElement {
  const symbol = num === 1 ? '①' : '②';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;';
  const circle = document.createElement('div');
  circle.style.cssText = [
    'width:28px;height:28px;border-radius:50%;',
    `background:${color};`,
    'border:2px solid white;',
    'box-shadow:0 2px 8px rgba(0,0,0,0.15);',
    'display:flex;align-items:center;justify-content:center;',
    'font-size:14px;font-weight:700;color:white;line-height:1;',
  ].join('');
  circle.textContent = symbol;
  const tip = document.createElement('div');
  tip.style.cssText = `width:6px;height:6px;border-radius:50%;background:${color};margin-top:2px;box-shadow:0 1px 3px rgba(0,0,0,0.2);`;
  wrap.appendChild(circle);
  wrap.appendChild(tip);
  return wrap;
}

/** Mapbox map with two pins (coral ①, blue ②) and legend pills. Same layout as reference. */
function SharedMap({
  loc1,
  loc2,
}: {
  loc1: PickupLocationRow | null;
  loc2: PickupLocationRow | null;
}) {
  const hasAny = loc1 || loc2;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [containerMounted, setContainerMounted] = useState(false);

  const setContainerRef = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el;
    setContainerMounted(!!el);
  }, []);

  const token = typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '') : '';

  const name1 = loc1?.displayName?.split(',')[0]?.trim() ?? loc1?.city ?? '1';
  const name2 = loc2?.displayName?.split(',')[0]?.trim() ?? loc2?.city ?? '2';

  useEffect(() => {
    if (!hasAny || !token || !containerMounted || !containerRef.current) {
      setMapReady(false);
      return;
    }

    const container = containerRef.current;
    let map: import('mapbox-gl').Map | undefined;
    let observer: MutationObserver;
    let mounted = true;

    const init = async () => {
      const mbgl = (await import('mapbox-gl')).default as unknown as {
        accessToken: string;
        Map: new (opts: { container: HTMLElement; style: string; center: [number, number]; zoom: number; interactive: boolean; attributionControl: boolean }) => { on: (e: string, cb: () => void) => void; fitBounds: (b: unknown, o: { padding: number; maxZoom: number; duration: number }) => void; setStyle: (s: string) => void; remove: () => void };
        LngLat: new (lng: number, lat: number) => unknown;
        LngLatBounds: new (sw: unknown, ne: unknown) => unknown;
        Marker: new (opts: { element: HTMLElement; anchor: string }) => { setLngLat: (c: [number, number]) => { addTo: (m: unknown) => void }; addTo: (m: unknown) => void };
      };
      if (!mounted || !container.parentElement) return;

      mbgl.accessToken = token;

      const points = [loc1, loc2].filter(Boolean) as PickupLocationRow[];
      const lats = points.map((p) => p.latitude);
      const lons = points.map((p) => p.longitude);
      const center: [number, number] = [
        (Math.min(...lons) + Math.max(...lons)) / 2,
        (Math.min(...lats) + Math.max(...lats)) / 2,
      ];

      map = new mbgl.Map({
        container,
        style: isDarkMode() ? MAPBOX_DARK : MAPBOX_LIGHT,
        center,
        zoom: 12,
        interactive: false,
        attributionControl: false,
      }) as import('mapbox-gl').Map;

      map.on('load', () => {
        if (!mounted || !map) return;
        const sw = new mbgl.LngLat(Math.min(...lons) - PICKUP_MAP_PADDING, Math.min(...lats) - PICKUP_MAP_PADDING);
        const ne = new mbgl.LngLat(Math.max(...lons) + PICKUP_MAP_PADDING, Math.max(...lats) + PICKUP_MAP_PADDING);
        map.fitBounds(new mbgl.LngLatBounds(sw, ne) as Parameters<typeof map.fitBounds>[0], { padding: 40, maxZoom: 15, duration: 0 });

        if (loc1) {
          const el1 = createPickupPin(1, '#f08070');
          new mbgl.Marker({ element: el1, anchor: 'bottom' })
            .setLngLat([loc1.longitude, loc1.latitude])
            .addTo(map);
        }
        if (loc2) {
          const el2 = createPickupPin(2, '#3b82f6');
          new mbgl.Marker({ element: el2, anchor: 'bottom' })
            .setLngLat([loc2.longitude, loc2.latitude])
            .addTo(map);
        }

        setMapReady(true);
      });

      observer = new MutationObserver(() => {
        if (map) map.setStyle(isDarkMode() ? MAPBOX_DARK : MAPBOX_LIGHT);
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    };

    init();

    return () => {
      mounted = false;
      observer?.disconnect();
      map?.remove();
      setMapReady(false);
    };
  }, [hasAny, token, containerMounted, loc1?.latitude, loc1?.longitude, loc2?.latitude, loc2?.longitude]);

  const hasToken = !!token;

  return (
    <div
      className="rounded-2xl overflow-hidden relative"
      style={{ background: '#eef0ea', minHeight: 210 }}
    >
      {!hasAny && (
        <div className="flex items-center justify-center h-[210px] text-[#bbb] text-sm font-medium">
          Enter a location above to preview
        </div>
      )}
      {hasAny && hasToken && (
        <>
          {!mapReady && (
            <div className="absolute inset-0 z-10 animate-pulse bg-[#e2e5e9] dark:bg-[#1c1c1e]" />
          )}
          <div ref={setContainerRef} className="relative w-full h-[210px]" />
          <div className="absolute bottom-2.5 left-2.5 flex gap-1.5 z-10">
            {loc1 && (
              <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full py-1 px-2.5 shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-[#f08070] shrink-0" />
                <span className="text-[11px] font-bold text-[#333]">{name1.length > 10 ? name1.slice(0, 9) + '…' : name1}</span>
              </div>
            )}
            {loc2 && (
              <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full py-1 px-2.5 shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] shrink-0" />
                <span className="text-[11px] font-bold text-[#333]">{name2.length > 10 ? name2.slice(0, 9) + '…' : name2}</span>
              </div>
            )}
          </div>
        </>
      )}
      {hasAny && !hasToken && (
        <div className="flex items-center justify-center h-[210px] text-[#888] text-sm">
          Map unavailable (no API key)
        </div>
      )}
    </div>
  );
}

/** Functionality checklist for valuation deduction. Weight = % of base value deducted when this check FAILS (unchecked). */
const FUNCTIONALITY_CHECKS: { text: string; weight: number }[] = [
  { text: 'The device turns on, turns off, and charges. It has a battery, case, and SIM drawer.', weight: 0.4 },
  { text: 'The front and rear cameras work perfectly.', weight: 0.2 },
  { text: 'The speakers and microphones work perfectly.', weight: 0.15 },
  { text: 'Touch ID and Face ID are functional (if present).', weight: 0.1 },
  { text: 'All other features including Wi-Fi, Bluetooth, buttons, etc. work perfectly.', weight: 0.15 },
];

/** Handheld-specific functionality checklist used on the Gaming Handhelds flow. */
const HANDHELD_FUNCTIONALITY_CHECKS: string[] = [
  'Powers on and off with no issues, and charges properly.',
  'Reads cartridges properly.',
  'The hinge is not damaged.',
  'LCD screen has no issues (for example, no cracks, dead pixels, or discoloration).',
  'Touchscreen functions correctly.',
  'Sound works properly (no distorted sound or missing audio).',
  'All buttons function normally.',
];

function CoinCelebration({ credits }: { credits: number }) {
  const [displayCredits, setDisplayCredits] = useState(0);
  const [showText, setShowText] = useState(false);
  const coins = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: Math.random() * 80 + 10,
        delay: Math.random() * 0.8,
        size: Math.random() * 16 + 20,
        type: (Math.random() > 0.5 ? 'rise' : 'pop') as 'rise' | 'pop',
        duration: 1.2 + Math.random() * 1.0,
      })),
    []
  );
  const confetti = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: 0.3 + Math.random() * 1.0,
        tone: Math.random() > 0.5 ? 'primary' : 'muted',
        size: Math.random() * 6 + 3,
      })),
    []
  );
  useEffect(() => {
    const t = setTimeout(() => {
      setShowText(true);
      const duration = 1200;
      const steps = 30;
      let current = 0;
      const iv = setInterval(() => {
        current += credits / steps;
        if (current >= credits) {
          setDisplayCredits(credits);
          clearInterval(iv);
        } else setDisplayCredits(Math.floor(current));
      }, duration / steps);
      return () => clearInterval(iv);
    }, 600);
    return () => clearTimeout(t);
  }, [credits]);
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-relay-bg/70 dark:bg-relay-bg-dark/70 backdrop-blur-md animate-[fadeIn_0.3s_ease-out_forwards]" />
      {coins.map((coin) => (
        <div
          key={coin.id}
          className={coin.type === 'rise' ? 'animate-coin-rise' : 'animate-coin-pop'}
          style={{
            position: 'absolute',
            left: `${coin.left}%`,
            bottom: coin.type === 'rise' ? '30%' : `${40 + Math.random() * 20}%`,
            animationDelay: `${coin.delay}s`,
            animationDuration: `${coin.duration}s`,
            opacity: 0,
          }}
        >
          <div
            style={{ width: coin.size, height: coin.size, minWidth: 14, minHeight: 14, margin: 2 }}
            className="rounded-full bg-relay-surface dark:bg-relay-input-dark flex items-center justify-center border-2 border-relay-border dark:border-relay-border-dark"
          >
            <span
              className="text-primary font-bold"
              style={{ fontSize: coin.size * 0.45 }}
            >
              $
            </span>
          </div>
        </div>
      ))}
      {confetti.map((c) => (
        <div
          key={`confetti-${c.id}`}
          className="animate-confetti-fall"
          style={{
            position: 'absolute',
            left: `${c.left}%`,
            top: '20%',
            width: c.size,
            height: c.size,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            backgroundColor: c.tone === 'primary' ? 'var(--relay-text)' : 'var(--relay-muted)',
            animationDelay: `${c.delay}s`,
            opacity: 0,
          }}
        />
      ))}
      {showText && (
        <div className="relative z-10 flex flex-col items-center gap-3 animate-credits-count-up">
          <div className="absolute inset-0 -m-12 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-relay-surface dark:bg-relay-input-dark flex items-center justify-center border-2 border-relay-border dark:border-relay-border-dark">
              <span className="text-primary font-bold text-2xl">$</span>
            </div>
            <div className="flex flex-col">
              <span className="text-5xl font-serif text-relay-text dark:text-relay-text-dark tracking-tighter">
                +{displayCredits.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-primary tracking-[0.3em] mt-0.5">
                Credits Earned
              </span>
            </div>
          </div>
          <p className="text-xs font-medium mt-2 tracking-wide text-relay-muted dark:text-relay-muted-light">
            Added to your wallet
          </p>
        </div>
      )}
    </div>
  );
}

function ValuationCountUp({ credits }: { credits: number }) {
  const [displayed, setDisplayed] = React.useState(0);
  React.useEffect(() => {
    if (credits <= 0) { setDisplayed(0); return; }
    let start: number | null = null;
    const duration = 900;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * credits));
      if (progress < 1) requestAnimationFrame(step);
    };
    const id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [credits]);
  return (
    <div className="shrink-0">
      <p className="text-[9px] font-bold tracking-widest text-relay-muted dark:text-relay-muted-light uppercase">Valuation</p>
      <p className="text-3xl font-bold text-relay-text dark:text-relay-text-dark leading-tight tabular-nums">
        {displayed.toLocaleString()} <span className="text-sm font-bold text-primary">Cr</span>
      </p>
    </div>
  );
}

export default function StepPage() {
  const params = useParams();
  const router = useRouter();
  const stepNum = parseInt(String(params.step ?? '1'), 10) || 1;
  const ctx = useListing();
  const {
    userId, authChecked, setUserId, setAuthChecked,
    category, setCategory, brand, setBrand, modelName, setModelName, condition, setCondition,
    frontCondition, setFrontCondition, backCondition, setBackCondition,
    batteryHealth, setBatteryHealth,
    sideTop, setSideTop, sideBottom, setSideBottom, sideLeft, setSideLeft, sideRight, setSideRight,
    conditionPercentage, setConditionPercentage, conditionAnalyzing, setConditionAnalyzing, conditionError, setConditionError,
    swappaCredits, setSwappaCredits, swappaPrice, setSwappaPrice, swappaLookupError, setSwappaLookupError,
    storage, setStorage, ram, setRam, color, setColor, carrier, setCarrier, imei, setImei, videoGameName, setVideoGameName, videoGameCondition, setVideoGameCondition, description, setDescription,
    accessories, toggleAccessory, functionalityOptions, toggleFunctionality, consoleFunctional, setConsoleFunctional, verificationCode,
    listingLocation, setListingLocation, locationLoading, setLocationLoading, locationError, setLocationError,
    listingPhotoUrls, setListingPhotoUrls, photoError, setPhotoError,
    chipCpu, setChipCpu, year, setYear, size, setSize,
    laptopCredits, setLaptopCredits, laptopSupported, setLaptopSupported, laptopMessage, setLaptopMessage,
    laptopModels, setLaptopModels, laptopModelsLoading, setLaptopModelsLoading,
    laptopChipOptions, setLaptopChipOptions, laptopYearOptions, setLaptopYearOptions, laptopRamOptions, setLaptopRamOptions, laptopSizeOptions, setLaptopSizeOptions, laptopOptionsLoading, setLaptopOptionsLoading,
    phoneBrands, setPhoneBrands, phoneBrandsLoading, setPhoneBrandsLoading, phoneModels, setPhoneModels, phoneModelsLoading, setPhoneModelsLoading,
    tabletBrands, setTabletBrands, tabletBrandsLoading, setTabletBrandsLoading, tabletModels, setTabletModels, tabletModelsLoading, setTabletModelsLoading,
    tabletYearOptions, setTabletYearOptions, tabletSizeOptions, setTabletSizeOptions, tabletOptionsLoading, setTabletOptionsLoading,
    accessoryBrands, setAccessoryBrands, accessoryBrandsLoading, setAccessoryBrandsLoading, accessoryModels, setAccessoryModels, accessoryModelsLoading, setAccessoryModelsLoading,
    relicBrands, setRelicBrands, relicBrandsLoading, setRelicBrandsLoading, relicModels, setRelicModels, relicModelsLoading, setRelicModelsLoading,
    handheldBrands, setHandheldBrands, handheldBrandsLoading, setHandheldBrandsLoading, handheldModels, setHandheldModels, handheldModelsLoading, setHandheldModelsLoading,
    videoGameConsoles, setVideoGameConsoles, videoGameConsolesLoading, setVideoGameConsolesLoading,
    dynamicColorOptions, setDynamicColorOptions, colorOptionsLoading, setColorOptionsLoading,
    aboutScreenshotFile, setAboutScreenshotFile, aboutScreenshotPreviewUrl, setAboutScreenshotPreviewUrl,
    storageScreenshotFile, setStorageScreenshotFile, storageScreenshotPreviewUrl, setStorageScreenshotPreviewUrl,
    oemUnlockingScreenshotFile, setOemUnlockingScreenshotFile, oemUnlockingScreenshotPreviewUrl, setOemUnlockingScreenshotPreviewUrl,
    verificationStatus, setVerificationStatus, verificationMessage, setVerificationMessage,
    laptopSerialScreenshotFile, setLaptopSerialScreenshotFile, laptopSerialScreenshotPreviewUrl, setLaptopSerialScreenshotPreviewUrl,
    laptopSerialNumber, setLaptopSerialNumber, laptopVerificationStatus, setLaptopVerificationStatus, laptopVerificationMessage, setLaptopVerificationMessage,
    deviceCaptureOpen, setDeviceCaptureOpen, isValuating, setIsValuating, isSubmitting, setIsSubmitting, submitError, setSubmitError,
    showCelebration, setShowCelebration, celebrationCredits, setCelebrationCredits,
    saveDraft, loadDraft, clearDraft, hasDraft,
    hasResumedDraftRef,
    showLeaveModal, setShowLeaveModal, pendingLeaveCallback, setPendingLeaveCallback,
  } = ctx;

  const [showResumeDraftModal, setShowResumeDraftModal] = useState(false);
  const resumeDraftChecked = useRef(false);
  const savingDraftAndLeavingRef = useRef(false);
  const reappliedDraftOnStep1Ref = useRef(false);
  const [showPickupLocationsModal, setShowPickupLocationsModal] = useState(false);
  const [newGadgetId, setNewGadgetId] = useState<string | null>(null);
  const [pickupLocation1, setPickupLocation1] = useState<PickupLocationRow | null>(null);
  const [pickupLocation2, setPickupLocation2] = useState<PickupLocationRow | null>(null);
  const [location1Query, setLocation1Query] = useState('');
  const [location2Query, setLocation2Query] = useState('');
  const [location1Suggestions, setLocation1Suggestions] = useState<LocationSuggestion[]>([]);
  const [location2Suggestions, setLocation2Suggestions] = useState<LocationSuggestion[]>([]);
  const [locationSuggestionsLoading, setLocationSuggestionsLoading] = useState(false);
  const [pickupDropdownVisible, setPickupDropdownVisible] = useState<'1' | '2' | null>(null);
  const [pickupLocationsSaving, setPickupLocationsSaving] = useState(false);
  const [pickupLocationsError, setPickupLocationsError] = useState<string | null>(null);

  const isPhoneFlow = category === 'Phones';
  const isLaptopFlow = category === 'Laptops';
  const isTabletFlow = category === 'Tablets';
  const isConsoleLikeFlow = ['Console', 'Video Games', 'Headphones', 'Gaming Handhelds', 'Speaker', 'MP3'].includes(category);
  const isVideoGamesFlow = category === 'Video Games';
  const totalSteps = isPhoneFlow || isLaptopFlow || isTabletFlow ? 7 : isVideoGamesFlow ? 4 : isConsoleLikeFlow ? 5 : 6;
  const currentStep = Math.max(1, Math.min(stepNum, totalSteps));
  const accessoryType = category === 'Headphones' ? 'headphones' : category === 'Speaker' ? 'speaker' : category === 'Console' ? 'console' : null;

  useEffect(() => {
    if (!showCelebration) return;
  }, [showCelebration, celebrationCredits, currentStep, totalSteps, category]);

  useEffect(() => {
    if (!showCelebration) return;
    if (newGadgetId) return;
    if (currentStep !== 1) return;
    setShowCelebration(false);
    setCelebrationCredits(0);
  }, [showCelebration, celebrationCredits, currentStep, totalSteps, category, newGadgetId, setShowCelebration, setCelebrationCredits]);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => { setUserId(user?.id ?? null); setAuthChecked(true); }).catch(() => { setUserId(null); setAuthChecked(true); });
  }, [setUserId, setAuthChecked]);

  // On step 1: check for a prefill from the device detail page (takes priority over any saved draft)
  useEffect(() => {
    if (currentStep !== 1 || resumeDraftChecked.current) return;
    if (typeof window === 'undefined') return;
    const raw = sessionStorage.getItem('relay_list_prefill');
    if (raw) {
      try {
        sessionStorage.removeItem('relay_list_prefill');
        const { category: c, brand: b, model: m } = JSON.parse(raw) as { category?: string; brand?: string; model?: string };
        if (c) setCategory(c);
        if (b) setBrand(b);
        if (m) setModelName(m);
        clearDraft();
      } catch {}
      resumeDraftChecked.current = true;
      return;
    }
    // No prefill — check for a saved draft as usual (only if we haven't already resumed this session, e.g. user went back from step 2 to step 1). Use ref so the value is set synchronously when they click Resume and is still true when we navigate back.
    if (hasDraft() && !hasResumedDraftRef.current) {
      resumeDraftChecked.current = true;
      setShowResumeDraftModal(true);
    }
  }, [currentStep, hasDraft, hasResumedDraftRef, clearDraft, setCategory, setBrand, setModelName]);

  // When we navigate back to step 1 after resuming a draft, other effects may have cleared modelName/color/etc. Re-apply draft from localStorage once so all step 1 fields show the saved values.
  useEffect(() => {
    if (currentStep !== 1 || !hasResumedDraftRef.current) return;
    if (reappliedDraftOnStep1Ref.current) return;
    if (typeof window === 'undefined') return;
    loadDraft();
    reappliedDraftOnStep1Ref.current = true;
  }, [currentStep, loadDraft]);
  useEffect(() => {
    if (currentStep === 1) return;
    reappliedDraftOnStep1Ref.current = false;
  }, [currentStep]);

  // Warn before closing/refreshing tab when user has progress
  useEffect(() => {
    const hasProgress = currentStep > 1 || category !== 'Phones' || brand !== 'Apple' || modelName.trim() !== '';
    if (!hasProgress) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [currentStep, category, brand, modelName]);

  // Browser back: show leave modal instead of navigating away immediately (unless user clicked "Save as draft")
  useEffect(() => {
    const onPopState = () => {
      if (savingDraftAndLeavingRef.current) {
        savingDraftAndLeavingRef.current = false;
        return;
      }
      setShowLeaveModal(true);
      history.forward();
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [currentStep]);

  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!userId || !listingLocation) {
      setUserAvatarUrl(null);
      return;
    }
    let cancelled = false;
    fetchProfile(userId).then((profile) => {
      if (!cancelled && profile?.avatar_url) setUserAvatarUrl(profile.avatar_url);
    });
    return () => { cancelled = true; };
  }, [userId, listingLocation]);

  // Debounced location search for pickup locations modal
  useEffect(() => {
    if (!showPickupLocationsModal) return;
    const q1 = location1Query.trim();
    const q2 = location2Query.trim();
    if (q1.length < 2 && q2.length < 2) {
      setLocation1Suggestions([]);
      setLocation2Suggestions([]);
      setLocationSuggestionsLoading(false);
      return;
    }
    const userLoc = listingLocation
      ? { latitude: listingLocation.latitude, longitude: listingLocation.longitude, state: listingLocation.state }
      : undefined;
    const t = setTimeout(async () => {
      setLocationSuggestionsLoading(true);
      // Always use Nominatim (OSM) for pickup location search; Mapbox is used only for the map.
      const search = searchLocations;
      if (q1.length < 2) setLocation1Suggestions([]);
      else {
        const list = await search(q1, userLoc);
        setLocation1Suggestions(list);
      }
      if (q2.length < 2) setLocation2Suggestions([]);
      else {
        const list = await search(q2, userLoc);
        setLocation2Suggestions(list);
      }
      setLocationSuggestionsLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [showPickupLocationsModal, location1Query, location2Query, listingLocation]);

  // Rehydrate valuation from sessionStorage when on Review with no credits (survives navigation/remount)
  const valuationCategories = ['Phones', 'Tablets', 'Laptops', 'MP3', 'Console', 'Video Games', 'Gaming Handhelds', 'Headphones', 'Speaker'];
  useEffect(() => {
    if (!valuationCategories.includes(category) || currentStep !== totalSteps) return;
    if (swappaCredits != null && swappaCredits > 0) return;
    if (typeof window === 'undefined') return;
    try {
      const s = sessionStorage.getItem(VALUATION_STORAGE_KEY);
      if (!s) return;
      const { credits, price } = JSON.parse(s) as { credits?: number; price?: number };
      if (credits != null && credits > 0) {
        setSwappaCredits(credits);
        if (price != null && price > 0) setSwappaPrice(price);
      }
    } catch {}
  }, [category, currentStep, totalSteps, swappaCredits, setSwappaCredits, setSwappaPrice]);

  const prevLaptopBrandRef = useRef<string | null>(null);
  useEffect(() => {
    if (category !== 'Laptops') return;
    const prevBrand = prevLaptopBrandRef.current;
    const brandChanged = prevBrand !== null && prevBrand !== brand;
    prevLaptopBrandRef.current = brand;
    setLaptopModelsLoading(true);
    // Only clear model when the brand changes (not on mount / navigation back to step 1)
    if (!hasResumedDraftRef.current && brandChanged) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1b68bc98-dfbf-4969-9794-62dc8b7c5307', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'list/[step]/page.tsx:effect-Laptops', message: 'Clearing modelName (Laptops)', data: { currentStep }, timestamp: Date.now(), hypothesisId: 'H1-H5' }) }).catch(() => {});
      // #endregion
      setModelName('');
    }
    fetch(`/api/devices/models?${new URLSearchParams({ brand })}`).then((r) => r.json()).then((d: { models?: string[] }) => setLaptopModels(Array.isArray(d.models) ? d.models : [])).catch(() => setLaptopModels([])).finally(() => setLaptopModelsLoading(false));
  }, [category, brand, setModelName, setLaptopModels, setLaptopModelsLoading]);

  useEffect(() => {
    if (category !== 'Phones') return;
    setPhoneBrandsLoading(true);
    fetch('/api/phones/brands').then((r) => r.json()).then((d: { brands?: string[] }) => {
      const b = Array.isArray(d.brands) ? d.brands : [];
      setPhoneBrands(b);
      if (!hasResumedDraftRef.current && b.length && (!brand || !b.includes(brand))) setBrand(b[0] ?? '');
    }).catch(() => setPhoneBrands([])).finally(() => setPhoneBrandsLoading(false));
  }, [category]);

  const prevPhoneBrandRef = useRef<string | null>(null);
  useEffect(() => {
    if (category !== 'Phones') return;
    const prevBrand = prevPhoneBrandRef.current;
    const brandChanged = prevBrand !== null && prevBrand !== brand;
    prevPhoneBrandRef.current = brand;
    if (!hasResumedDraftRef.current && brandChanged) {
      setModelName('');
    }
    setPhoneModelsLoading(true);
    fetch(`/api/phones/models?${new URLSearchParams({ brand })}`).then((r) => r.json()).then((d: { models?: string[] }) => setPhoneModels(Array.isArray(d.models) ? d.models : [])).catch(() => setPhoneModels([])).finally(() => setPhoneModelsLoading(false));
  }, [category, brand, setModelName, setPhoneModels, setPhoneModelsLoading]);

  const prevAccessoryBrandRef = useRef<string | null>(null);
  useEffect(() => {
    if (!accessoryType) return;
    const prevBrand = prevAccessoryBrandRef.current;
    const brandChanged = prevBrand !== null && prevBrand !== brand;
    prevAccessoryBrandRef.current = brand;
    setAccessoryBrandsLoading(true);
    // Clear only when user actually changes brand/type (not on step-1 remount)
    if (!hasResumedDraftRef.current && brandChanged) setModelName('');
    fetch(`/api/accessories/brands?type=${accessoryType}`).then((r) => r.json()).then((d: { brands?: string[] }) => {
      const b = Array.isArray(d.brands) ? d.brands : [];
      setAccessoryBrands(b);
      if (!hasResumedDraftRef.current && b.length && (!brand || !b.includes(brand))) setBrand(b[0] ?? '');
    }).catch(() => setAccessoryBrands([])).finally(() => setAccessoryBrandsLoading(false));
  }, [accessoryType, brand, currentStep, setBrand, setModelName, setAccessoryBrands, setAccessoryBrandsLoading]);

  useEffect(() => {
    if (!accessoryType) return;
    const prevBrand = prevAccessoryBrandRef.current;
    const brandChanged = prevBrand !== null && prevBrand !== brand;
    prevAccessoryBrandRef.current = brand;
    setAccessoryModelsLoading(true);
    if (!hasResumedDraftRef.current && brandChanged) setModelName('');
    fetch(`/api/accessories/models?${new URLSearchParams({ type: accessoryType, brand })}`).then((r) => r.json()).then((d: { models?: string[] }) => setAccessoryModels(Array.isArray(d.models) ? d.models : [])).catch(() => setAccessoryModels([])).finally(() => setAccessoryModelsLoading(false));
  }, [accessoryType, brand, currentStep, setModelName, setAccessoryModels, setAccessoryModelsLoading]);

  const prevRelicBrandRef = useRef<string | null>(null);
  useEffect(() => {
    if (category !== 'MP3') return;
    const prevBrand = prevRelicBrandRef.current;
    const brandChanged = prevBrand !== null && prevBrand !== brand;
    prevRelicBrandRef.current = brand;
    setRelicBrandsLoading(true);
    if (!hasResumedDraftRef.current && brandChanged) setModelName('');
    fetch('/api/relics/brands').then((r) => r.json()).then((d: { brands?: string[] }) => {
      const b = Array.isArray(d.brands) ? d.brands : [];
      setRelicBrands(b);
      if (!hasResumedDraftRef.current && b.length && (!brand || !b.includes(brand))) setBrand(b[0] ?? '');
    }).catch(() => setRelicBrands([])).finally(() => setRelicBrandsLoading(false));
  }, [category, brand, currentStep, setBrand, setModelName, setRelicBrands, setRelicBrandsLoading]);

  useEffect(() => {
    if (category !== 'MP3') return;
    const prevBrand = prevRelicBrandRef.current;
    const brandChanged = prevBrand !== null && prevBrand !== brand;
    prevRelicBrandRef.current = brand;
    setRelicModelsLoading(true);
    if (!hasResumedDraftRef.current && brandChanged) setModelName('');
    fetch(`/api/relics/models?${new URLSearchParams({ brand })}`).then((r) => r.json()).then((d: { models?: string[] }) => setRelicModels(Array.isArray(d.models) ? d.models : [])).catch(() => setRelicModels([])).finally(() => setRelicModelsLoading(false));
  }, [category, brand, currentStep, setModelName, setRelicModels, setRelicModelsLoading]);

  const prevHandheldBrandRef = useRef<string | null>(null);
  useEffect(() => {
    if (category !== 'Gaming Handhelds') return;
    const prevBrand = prevHandheldBrandRef.current;
    const brandChanged = prevBrand !== null && prevBrand !== brand;
    prevHandheldBrandRef.current = brand;
    setHandheldBrandsLoading(true);
    if (!hasResumedDraftRef.current && brandChanged) setModelName('');
    fetch('/api/gaming-handhelds/brands').then((r) => r.json()).then((d: { brands?: string[] }) => {
      const b = Array.isArray(d.brands) ? d.brands : [];
      setHandheldBrands(b);
      if (!hasResumedDraftRef.current && b.length && (!brand || !b.includes(brand))) setBrand(b[0] ?? '');
    }).catch(() => setHandheldBrands([])).finally(() => setHandheldBrandsLoading(false));
  }, [category, brand, currentStep, setBrand, setModelName, setHandheldBrands, setHandheldBrandsLoading]);

  useEffect(() => {
    if (category !== 'Gaming Handhelds') return;
    const prevBrand = prevHandheldBrandRef.current;
    const brandChanged = prevBrand !== null && prevBrand !== brand;
    prevHandheldBrandRef.current = brand;
    setHandheldModelsLoading(true);
    if (!hasResumedDraftRef.current && brandChanged) setModelName('');
    fetch(`/api/gaming-handhelds/models?${new URLSearchParams({ brand })}`).then((r) => r.json()).then((d: { models?: string[] }) => setHandheldModels(Array.isArray(d.models) ? d.models : [])).catch(() => setHandheldModels([])).finally(() => setHandheldModelsLoading(false));
  }, [category, brand, currentStep, setModelName, setHandheldModels, setHandheldModelsLoading]);

  const prevTabletBrandRef = useRef<string | null>(null);
  useEffect(() => {
    if (category !== 'Tablets') return;
    const prevBrand = prevTabletBrandRef.current;
    const brandChanged = prevBrand !== null && prevBrand !== brand;
    prevTabletBrandRef.current = brand;
    setTabletBrandsLoading(true);
    if (!hasResumedDraftRef.current && brandChanged) {
      setModelName('');
    }
    fetch('/api/tablets/brands').then((r) => r.json()).then((d: { brands?: string[] }) => {
      const b = Array.isArray(d.brands) ? d.brands : [];
      setTabletBrands(b);
      if (!hasResumedDraftRef.current && b.length && (!brand || !b.includes(brand))) setBrand(b[0] ?? '');
    }).catch(() => setTabletBrands([])).finally(() => setTabletBrandsLoading(false));
  }, [category, brand, currentStep, setBrand, setModelName, setTabletBrands, setTabletBrandsLoading]);

  useEffect(() => {
    if (category !== 'Tablets') return;
    const prevBrand = prevTabletBrandRef.current;
    const brandChanged = prevBrand !== null && prevBrand !== brand;
    prevTabletBrandRef.current = brand;
    setTabletModelsLoading(true);
    if (!hasResumedDraftRef.current && brandChanged) setModelName('');
    fetch(`/api/tablets/models?${new URLSearchParams({ brand })}`).then((r) => r.json()).then((d: { models?: string[] }) => setTabletModels(Array.isArray(d.models) ? d.models : [])).catch(() => setTabletModels([])).finally(() => setTabletModelsLoading(false));
  }, [category, brand, currentStep, setModelName, setTabletModels, setTabletModelsLoading]);

  const prevVideoGamesBrandRef = useRef<string | null>(null);
  useEffect(() => {
    if (category !== 'Video Games') return;
    const prevBrand = prevVideoGamesBrandRef.current;
    const brandChanged = prevBrand !== null && prevBrand !== brand;
    prevVideoGamesBrandRef.current = brand;
    if (!brand.trim()) {
      setVideoGameConsoles([]);
      if (!hasResumedDraftRef.current && brandChanged) setModelName('');
      return;
    }
    setVideoGameConsolesLoading(true);
    if (!hasResumedDraftRef.current && brandChanged) setModelName('');
    fetch(`/api/video-games/consoles?${new URLSearchParams({ brand: brand.trim() })}`).then((r) => r.json()).then((d: { consoles?: string[] }) => setVideoGameConsoles(Array.isArray(d.consoles) ? d.consoles : [])).catch(() => setVideoGameConsoles([])).finally(() => setVideoGameConsolesLoading(false));
  }, [category, brand, currentStep, setModelName, setVideoGameConsoles, setVideoGameConsolesLoading]);

  useEffect(() => {
    if (category !== 'Tablets' || !brand) return;
    setTabletOptionsLoading(true);
    const q = new URLSearchParams({ brand });
    if (modelName.trim()) q.set('model', modelName.trim());
    if (year.trim()) q.set('year', year.trim());
    fetch(`/api/tablets/options?${q}`).then((r) => r.json()).then((d: { year?: string[]; size?: string[] }) => {
      setTabletYearOptions(Array.isArray(d.year) ? d.year : []);
      setTabletSizeOptions(Array.isArray(d.size) ? d.size : []);
    }).catch(() => { setTabletYearOptions([]); setTabletSizeOptions([]); }).finally(() => setTabletOptionsLoading(false));
  }, [category, brand, modelName, year, setTabletYearOptions, setTabletSizeOptions, setTabletOptionsLoading]);

  useEffect(() => {
    if (category !== 'Tablets') return;
    if (!hasResumedDraftRef.current && carrier !== 'Wifi' && carrier !== 'Unlocked') setCarrier('Wifi');
  }, [category, carrier, setCarrier]);

  useEffect(() => {
    if (category !== 'Tablets') return;
    if (!hasResumedDraftRef.current && tabletSizeOptions.length > 0 && size && !tabletSizeOptions.includes(size)) setSize('');
  }, [category, size, tabletSizeOptions, setSize]);

  useEffect(() => {
    if (category !== 'Laptops' || !brand) return;
    setLaptopOptionsLoading(true);
    const q = new URLSearchParams({ brand });
    if (modelName.trim()) q.set('model', modelName.trim());
    fetch(`/api/devices/options?${q}`).then((r) => r.json()).then((d: { chipCpu?: string[]; year?: string[]; ram?: string[]; size?: string[] }) => {
      setLaptopChipOptions(Array.isArray(d.chipCpu) ? d.chipCpu : []);
      setLaptopYearOptions(Array.isArray(d.year) ? d.year : []);
      setLaptopRamOptions(Array.isArray(d.ram) ? d.ram : []);
      setLaptopSizeOptions(Array.isArray(d.size) ? d.size : []);
    }).catch(() => { setLaptopChipOptions([]); setLaptopYearOptions([]); setLaptopRamOptions([]); setLaptopSizeOptions([]); }).finally(() => setLaptopOptionsLoading(false));
  }, [category, brand, modelName, setLaptopChipOptions, setLaptopYearOptions, setLaptopRamOptions, setLaptopSizeOptions, setLaptopOptionsLoading]);

  useEffect(() => {
    if (category === 'Laptops' && !hasResumedDraftRef.current) setChipCpu('');
  }, [category, modelName, setChipCpu]);

  // Only clear Swappa valuation when device details change — not on mount (Next.js remounts this page when step changes, which would wipe the valuation on Review).
  const prevDeviceRef = useRef({ brand, modelName, storage, carrier });
  useEffect(() => {
    const prev = prevDeviceRef.current;
    const same = prev.brand === brand && prev.modelName === modelName && prev.storage === storage && prev.carrier === carrier;
    prevDeviceRef.current = { brand, modelName, storage, carrier };
    if (same) return;
    setSwappaCredits(null);
    setSwappaPrice(null);
    setSwappaLookupError(null);
  }, [brand, modelName, storage, carrier, setSwappaCredits, setSwappaPrice, setSwappaLookupError]);

  useEffect(() => {
    if (!['Phones', 'Laptops', 'Tablets', 'Headphones', 'Speaker', 'Console', 'Video Games', 'MP3', 'Gaming Handhelds'].includes(category) || !brand.trim() || !modelName.trim()) return;
    setColorOptionsLoading(true);
    setDynamicColorOptions(null);
    const params = new URLSearchParams({ brand: brand.trim(), model: modelName.trim(), category });
    fetch(`/api/colors?${params}`).then((r) => r.json()).then((d: { colors?: string[] }) => {
      const c = Array.isArray(d.colors) ? d.colors : [];
      setDynamicColorOptions(c.length ? c : null);
    }).catch(() => setDynamicColorOptions(null)).finally(() => setColorOptionsLoading(false));
  }, [category, brand, modelName, setDynamicColorOptions, setColorOptionsLoading]);

  const staticColorOptions = useMemo(() => {
    if (category === 'Laptops') return getLaptopColorsForModel(brand, modelName);
    if (category === 'Tablets') return getTabletColorsForModel(brand, modelName);
    if (['Headphones', 'Speaker', 'Console', 'Video Games'].includes(category)) return getAccessoryColorsForModel(category, brand, modelName);
    if (category === 'MP3') return ['Black', 'White', 'Silver', 'Gray', 'Gold', 'Other'];
    if (category === 'Gaming Handhelds') return ['Black', 'White', 'Silver', 'Gray', 'Blue', 'Red', 'Other'];
    return getColorsForModel(brand, modelName);
  }, [category, brand, modelName]);
  const colorOptions = dynamicColorOptions ?? staticColorOptions;

  const laptopYearOptionsFrom2020 = useMemo(() => {
    return laptopYearOptions.filter((y) => {
      const n = Number(y);
      return !Number.isNaN(n) && n >= 2020;
    });
  }, [laptopYearOptions]);

  useEffect(() => {
    if (category !== 'Laptops' || !year) return;
    if (!hasResumedDraftRef.current) {
      const n = Number(year);
      if (!Number.isNaN(n) && n < 2020) setYear('');
    }
  }, [category, year, setYear]);

  useEffect(() => {
    if (!hasResumedDraftRef.current && color && !colorOptions.includes(color)) setColor('');
  }, [colorOptions, color, setColor]);

  const isGooglePhone = brand.toLowerCase() === 'google';
  const requireOemUnlockingScreenshot = isGooglePhone && (carrier === 'Unlocked' || !carrier.trim());

  const handleAboutScreenshotChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (aboutScreenshotPreviewUrl) URL.revokeObjectURL(aboutScreenshotPreviewUrl);
    setAboutScreenshotFile(file ?? null);
    setAboutScreenshotPreviewUrl(file ? URL.createObjectURL(file) : null);
    setVerificationStatus('idle');
    setVerificationMessage('');
  }, [aboutScreenshotPreviewUrl, setAboutScreenshotFile, setAboutScreenshotPreviewUrl, setVerificationStatus, setVerificationMessage]);

  const handleStorageScreenshotChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (storageScreenshotPreviewUrl) URL.revokeObjectURL(storageScreenshotPreviewUrl);
    setStorageScreenshotFile(file ?? null);
    setStorageScreenshotPreviewUrl(file ? URL.createObjectURL(file) : null);
    setVerificationStatus('idle');
    setVerificationMessage('');
  }, [storageScreenshotPreviewUrl, setStorageScreenshotFile, setStorageScreenshotPreviewUrl, setVerificationStatus, setVerificationMessage]);

  const handleOemUnlockingScreenshotChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (oemUnlockingScreenshotPreviewUrl) URL.revokeObjectURL(oemUnlockingScreenshotPreviewUrl);
    setOemUnlockingScreenshotFile(file ?? null);
    setOemUnlockingScreenshotPreviewUrl(file ? URL.createObjectURL(file) : null);
    setVerificationStatus('idle');
    setVerificationMessage('');
  }, [oemUnlockingScreenshotPreviewUrl, setOemUnlockingScreenshotFile, setOemUnlockingScreenshotPreviewUrl, setVerificationStatus, setVerificationMessage]);

  useEffect(() => {
    if (!requireOemUnlockingScreenshot && oemUnlockingScreenshotFile) {
      if (oemUnlockingScreenshotPreviewUrl) URL.revokeObjectURL(oemUnlockingScreenshotPreviewUrl);
      setOemUnlockingScreenshotFile(null);
      setOemUnlockingScreenshotPreviewUrl(null);
    }
  }, [requireOemUnlockingScreenshot, oemUnlockingScreenshotFile, oemUnlockingScreenshotPreviewUrl, setOemUnlockingScreenshotFile, setOemUnlockingScreenshotPreviewUrl]);

  const canRunVerification =
    aboutScreenshotFile &&
    imei.trim() &&
    (!isGooglePhone || (storageScreenshotFile && (!requireOemUnlockingScreenshot || oemUnlockingScreenshotFile)));

  const handleLaptopSerialScreenshotChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (laptopSerialScreenshotPreviewUrl) URL.revokeObjectURL(laptopSerialScreenshotPreviewUrl);
    setLaptopSerialScreenshotFile(file ?? null);
    setLaptopSerialScreenshotPreviewUrl(file ? URL.createObjectURL(file) : null);
    setLaptopVerificationStatus('idle');
    setLaptopVerificationMessage('');
  }, [laptopSerialScreenshotPreviewUrl, setLaptopSerialScreenshotFile, setLaptopSerialScreenshotPreviewUrl, setLaptopVerificationStatus, setLaptopVerificationMessage]);

  const canRunSerialVerification = laptopSerialScreenshotFile != null && imei.trim().length >= 7 && brand.trim() && modelName.trim();

  const isTabletUnlocked = category === 'Tablets' && carrier === 'Unlocked';
  const canRunTabletImeiVerification = aboutScreenshotFile != null && imei.trim().replace(/\D/g, '').length >= 15 && brand.trim() && modelName.trim();

  const runSerialVerification = useCallback(async () => {
    if (!canRunSerialVerification) return;
    setLaptopVerificationStatus('verifying');
    setLaptopVerificationMessage('');
    try {
      const fd = new FormData();
      fd.append('image', laptopSerialScreenshotFile!);
      fd.append('userSerial', imei.trim());
      fd.append('userBrand', brand.trim());
      fd.append('userModel', modelName.trim());
      const res = await fetch('/api/ocr/verify-laptop-serial', { method: 'POST', body: fd });
      const data = (await res.json()) as { passed?: boolean; message?: string };
      if (data.passed) {
        setLaptopVerificationStatus('passed');
        setLaptopVerificationMessage(data.message ?? 'Serial number and model verified.');
      } else {
        setLaptopVerificationStatus('failed');
        setLaptopVerificationMessage(data.message ?? 'Verification failed.');
      }
    } catch {
      setLaptopVerificationStatus('failed');
      setLaptopVerificationMessage('Verification failed. Please try again.');
    }
  }, [canRunSerialVerification, laptopSerialScreenshotFile, imei, brand, modelName, setLaptopVerificationStatus, setLaptopVerificationMessage]);

  const runTabletImeiVerification = useCallback(async () => {
    if (!canRunTabletImeiVerification) return;
    setVerificationStatus('verifying');
    setVerificationMessage('');
    try {
      const fd = new FormData();
      fd.append('image', aboutScreenshotFile!);
      fd.append('userImei', imei.trim().replace(/\D/g, '').slice(0, 15));
      fd.append('userCarrier', 'Unlocked');
      fd.append('userStorage', storage);
      fd.append('userModel', modelName.trim());
      fd.append('userBrand', brand.trim());
      const res = await fetch('/api/ocr/verify-about', { method: 'POST', body: fd });
      const data = (await res.json()) as { passed?: boolean; message?: string };
      if (data.passed) {
        setVerificationStatus('passed');
        setVerificationMessage(data.message ?? 'IMEI and model verified.');
      } else {
        setVerificationStatus('failed');
        setVerificationMessage(data.message ?? 'Verification failed.');
      }
    } catch {
      setVerificationStatus('failed');
      setVerificationMessage('Verification failed. Please try again.');
    }
  }, [canRunTabletImeiVerification, aboutScreenshotFile, imei, storage, modelName, brand, setVerificationStatus, setVerificationMessage]);

  const runVerification = useCallback(async () => {
    if (!canRunVerification) return;
    setVerificationStatus('verifying');
    setVerificationMessage('');
    try {
      const fd = new FormData();
      fd.append('image', aboutScreenshotFile!);
      fd.append('userImei', imei.trim());
      fd.append('userCarrier', carrier);
      fd.append('userStorage', storage);
      fd.append('userModel', modelName.trim());
      fd.append('userBrand', brand);
      if (isGooglePhone && storageScreenshotFile) fd.append('storageImage', storageScreenshotFile);
      if (requireOemUnlockingScreenshot && oemUnlockingScreenshotFile) fd.append('oemUnlockingImage', oemUnlockingScreenshotFile);
      const res = await fetch('/api/ocr/verify-about', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setVerificationStatus('failed');
        setVerificationMessage(data.error ?? 'Verification failed.');
        return;
      }
      setVerificationStatus(data.passed ? 'passed' : 'failed');
      setVerificationMessage(data.message ?? (data.passed ? 'IMEI, carrier, and storage match.' : 'Verification failed.'));
    } catch {
      setVerificationStatus('failed');
      setVerificationMessage('Verification request failed.');
    }
  }, [aboutScreenshotFile, imei, carrier, storage, modelName, brand, isGooglePhone, storageScreenshotFile, requireOemUnlockingScreenshot, oemUnlockingScreenshotFile, canRunVerification, setVerificationStatus, setVerificationMessage]);

  const simulateValuation = useCallback(async () => {
    const useSwappaValuation = category === 'Phones' || category === 'Tablets' || category === 'Laptops' || category === 'Console';
    const useEbayValuation = category === 'MP3';
    if (category === 'Video Games') {
      if (!brand?.trim() || !modelName?.trim() || !videoGameName?.trim() || !videoGameCondition?.trim()) {
        setSwappaLookupError('Please select console and game and condition in Step 1 before getting a valuation.');
        return;
      }
      setIsValuating(true);
      setSwappaLookupError(null);
      try {
        const pr = await fetch('/api/credits/pricecharting-game-lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            console: modelName.trim(),
            game: videoGameName.trim(),
            condition: videoGameCondition.trim(),
          }),
        });
        const pd = (await pr.json()) as { credits?: number; price?: number; error?: string };
        if (!pd.error && pd.credits != null && pd.credits > 0) {
          setSwappaCredits(pd.credits);
          if (pd.price != null) setSwappaPrice(pd.price);
          setSwappaLookupError(null);
        } else {
          setSwappaLookupError(pd.error ?? 'PriceCharting valuation not available for this game.');
        }
      } catch (err) {
        setSwappaLookupError(err instanceof Error ? err.message : 'PriceCharting game lookup failed.');
      }
      setTimeout(() => {
        setIsValuating(false);
        router.push(`/list/${totalSteps}`);
      }, 1500);
      return;
    }
    if (useEbayValuation) {
      if (!brand?.trim() || !modelName?.trim()) {
        setSwappaLookupError('Please select brand and model in Step 1 before getting a valuation.');
        return;
      }
      setIsValuating(true);
      setSwappaLookupError('Valuation is not available for this category.');
      setTimeout(() => {
        setIsValuating(false);
        router.push(`/list/${totalSteps}`);
      }, 1500);
      return;
    }
    if (useSwappaValuation) {
      const condFromUser = getWorstCondition(frontCondition, backCondition, sideTop, sideBottom, sideLeft, sideRight);
      if (!condFromUser) {
        setConditionError('Please complete the Front and Back condition steps first.');
        return;
      }
      if (!brand?.trim() || !modelName?.trim()) {
        setSwappaLookupError('Please select brand and model in Step 1 before getting a valuation.');
        return;
      }
      setIsValuating(true);
      setSwappaLookupError(null);
      let cond = condFromUser;
      // Call OpenAI condition analyze whenever Get Valuation is tapped (whenever we have photos to analyze)
      if (listingPhotoUrls.length > 0) {
        try {
          const caRes = await fetch('/api/condition/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageUrls: listingPhotoUrls,
              user_front_condition: frontCondition ?? '',
              user_back_condition: backCondition ?? '',
            }),
          });
          const caData = (await caRes.json()) as { condition?: string; error?: string };
          if (caData.condition) {
            cond = caData.condition;
            setCondition(cond);
          }
        } catch (e) {
          setCondition(condFromUser);
        }
      }
      const carrierForSwappa = category === 'Laptops' || category === 'Console' ? '' : (carrier ?? '');
      // For tablets, Swappa URLs include size and year (e.g. apple-ipad-pro-11-4th-gen-2022). Build model string to match.
      // For Console, include effective storage in model (e.g. "3DS XL 4GB") and pass empty storage to Swappa.
      let modelForSwappa = modelName;
      if (category === 'Tablets' && (size?.trim() || year?.trim())) {
        const sizeClean = size?.replace(/"/g, '').trim() ?? '';
        const yearClean = year?.trim() ?? '';
        const m = modelName.match(/^(iPad Pro)\s+(.+)$/i);
        if (m) {
          modelForSwappa = [m[1], sizeClean, m[2], yearClean].filter(Boolean).join(' ');
        } else {
          modelForSwappa = [modelName, sizeClean, yearClean].filter(Boolean).join(' ');
        }
      }
      if (category === 'Console') {
        modelForSwappa = modelName.trim();
      }
      const storageForSwappaBody = category === 'Console' ? '' : storage;
      // Console: PriceCharting only (Loose used + condition multiplier); no Swappa, no eBay fallback.
      try {
        if (category === 'Console') {
          const pr = await fetch('/api/credits/pricecharting-lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brand, model: modelForSwappa.trim(), condition: cond }),
          });
          const pd = (await pr.json()) as { credits?: number; price?: number; error?: string };
          if (!pd.error && pd.credits != null && pd.credits > 0) {
            setSwappaCredits(pd.credits);
            if (pd.price != null) setSwappaPrice(pd.price);
            setSwappaLookupError(null);
          } else {
            setSwappaLookupError(pd.error ?? 'PriceCharting valuation not available for this console.');
          }
        } else if (category === 'Laptops') {
          // Laptops: Compare Laptop Prices only (no Swappa)
          try {
            const cr = await fetch('/api/credits/compare-laptop-prices-lookup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ brand, model: modelForSwappa.trim(), condition: cond }),
            });
            const cd = (await cr.json()) as { credits?: number; price?: number; error?: string };
            if (cd.credits != null && cd.credits > 0) {
              setSwappaCredits(cd.credits);
              if (cd.price != null) setSwappaPrice(cd.price);
              setSwappaLookupError(null);
            } else {
              setSwappaLookupError(cd.error ?? 'Valuation not available from Compare Laptop Prices.');
            }
          } catch (err) {
            setSwappaLookupError(err instanceof Error ? err.message : 'Compare Laptop Prices lookup failed.');
          }
        } else {
          // Phones, Tablets: Swappa only
          const sr = await fetch('/api/credits/swappa-lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brand, model: modelForSwappa, storage: storageForSwappaBody, condition: cond, carrier: carrierForSwappa, color: color || undefined }),
          });
          const sd = (await sr.json()) as { credits?: number; price?: number; error?: string };
          if (!sd.error && sd.credits != null && sd.credits > 0) {
            setSwappaCredits(sd.credits);
            if (sd.price != null) setSwappaPrice(sd.price);
            setSwappaLookupError(null);
          } else {
            setSwappaLookupError(sd.error ?? 'Valuation not available from Swappa.');
          }
        }
      } catch (err) {
        setSwappaLookupError(err instanceof Error ? err.message : (category === 'Console' ? 'PriceCharting lookup failed.' : category === 'Laptops' ? 'Compare Laptop Prices lookup failed.' : 'Swappa lookup failed.'));
      }
      setTimeout(() => {
        setIsValuating(false);
        router.push(`/list/${totalSteps}`);
      }, 1500);
      return;
    }
    // Other categories: Headphones/Speaker → HiFi Shark; rest → no valuation source
    const brandTrimmed = brand?.trim() ?? '';
    const modelNameTrimmed = modelName?.trim() ?? '';
    const otherCheckFail = !brandTrimmed || !modelNameTrimmed;
    if (otherCheckFail) {
      const msg = brandTrimmed && !modelNameTrimmed
        ? 'Please enter a model name in Step 1 before getting a valuation.'
        : 'Please select brand and model in Step 1 before getting a valuation.';
      setSwappaLookupError(msg);
      return;
    }
    const condFromUser = getWorstCondition(frontCondition, backCondition, sideTop, sideBottom, sideLeft, sideRight);
    const cond = condFromUser ?? 'Good';
    setIsValuating(true);
    setSwappaLookupError(null);
    const isHifiSharkCategory = category === 'Headphones' || category === 'Speaker';
    try {
      if (isHifiSharkCategory) {
        const hr = await fetch('/api/credits/hifishark-lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brand: brand.trim(), model: modelName.trim(), condition: cond }),
        });
        const hd = (await hr.json()) as { credits?: number; price?: number; error?: string };
        if (hd.error) setSwappaLookupError(hd.error);
        else if (hd.credits != null) {
          setSwappaCredits(hd.credits);
          if (hd.price != null) setSwappaPrice(hd.price);
        }
      } else if (category === 'Gaming Handhelds') {
        const sr = await fetch('/api/credits/swappa-lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brand: brand.trim(), model: modelName.trim(), condition: cond }),
        });
        const sd = (await sr.json()) as { credits?: number; price?: number; error?: string };
        if (!sd.error && sd.credits != null && sd.credits > 0) {
          setSwappaCredits(sd.credits);
          if (sd.price != null) setSwappaPrice(sd.price);
          setSwappaLookupError(null);
        } else {
          // Swappa fallback: try PriceCharting
          const pr = await fetch('/api/credits/pricecharting-lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brand: brand.trim(), model: modelName.trim(), condition: cond }),
          });
          const pd = (await pr.json()) as { credits?: number; price?: number; error?: string };
          if (!pd.error && pd.credits != null && pd.credits > 0) {
            setSwappaCredits(pd.credits);
            if (pd.price != null) setSwappaPrice(pd.price);
            setSwappaLookupError(null);
          } else {
            setSwappaLookupError(sd.error ?? pd.error ?? 'Valuation not available for this handheld.');
          }
        }
      } else {
        // Other categories: no valuation source
        setSwappaLookupError('Valuation is not available for this category.');
      }
    } catch (err) {
      setSwappaLookupError(err instanceof Error ? err.message : (isHifiSharkCategory ? 'HiFi Shark lookup failed.' : 'Valuation failed.'));
    }
    setTimeout(() => {
      setIsValuating(false);
      router.push(`/list/${totalSteps}`);
    }, 1500);
  }, [category, frontCondition, backCondition, sideTop, sideBottom, sideLeft, sideRight, brand, modelName, videoGameName, videoGameCondition, size, year, storage, carrier, color, listingPhotoUrls, totalSteps, router, setIsValuating, setCondition, setConditionError, setSwappaCredits, setSwappaPrice, setSwappaLookupError]);

  const twoPhotoCategories = ['Video Games'];
  const threePhotoCategories = ['Headphones', 'Speaker', 'Gaming Handhelds'];
  const minListingPhotos = twoPhotoCategories.includes(category) ? 2 : threePhotoCategories.includes(category) ? 3 : MIN_LISTING_PHOTOS;
  const hasEnoughPhotos = listingPhotoUrls.length >= minListingPhotos;
  const hasStorage = ['Phones', 'Tablets', 'Laptops', 'MP3', 'Console'].includes(category);
  const relicStorageOptions = useMemo(
    () => (category === 'MP3' ? getRelicStorageOptions(modelName) : []),
    [category, modelName]
  );
  const laptopStorageOptions = useMemo(
    () => (category === 'Laptops' ? getLaptopStorageOptions(modelName) : []),
    [category, modelName]
  );
  const consoleStorageOptions = useMemo(
    () => (category === 'Console' ? getConsoleStorageOptions(modelName) : []),
    [category, modelName]
  );
  const effectiveStorage = category === 'MP3' && relicStorageOptions.length > 0
    ? (relicStorageOptions.includes(storage) ? storage : relicStorageOptions[0])
    : category === 'Laptops' && laptopStorageOptions.length > 0
      ? (laptopStorageOptions.includes(storage) ? storage : laptopStorageOptions[0])
      : category === 'Console' && consoleStorageOptions.length > 0
        ? (consoleStorageOptions.includes(storage) ? storage : consoleStorageOptions[0])
        : storage;
  const identifierLabel = category === 'Phones' ? 'IMEI Number' : category === 'Tablets' && carrier === 'Unlocked' ? 'IMEI Number' : 'Serial Number';
  const derivedCondition = useMemo(() =>
    getWorstCondition(frontCondition, backCondition, sideTop, sideBottom, sideLeft, sideRight),
    [frontCondition, backCondition, sideTop, sideBottom, sideLeft, sideRight]
  );
  const effectiveCondition = condition ?? derivedCondition;
  const { estimatedCredits: baseEstimatedCredits, estimatedCreditsReason } = useMemo(() => {
    const swappaCategories = ['Phones', 'Tablets', 'Laptops', 'Console'];
    const ebayCategories = ['MP3'];
    const valuationCategories = [...swappaCategories, ...ebayCategories];

    // Gaming Handhelds: apply bespoke functional rules
    if (category === 'Gaming Handhelds' && swappaCredits !== null && swappaCredits > 0) {
      const has = (text: string) => functionalityOptions.includes(text);
      const powersOk = has(HANDHELD_FUNCTIONALITY_CHECKS[0]); // powers on/off + charges
      const cartridgesOk = has(HANDHELD_FUNCTIONALITY_CHECKS[1]);
      const hingeOk = has(HANDHELD_FUNCTIONALITY_CHECKS[2]);
      const screenOk = has(HANDHELD_FUNCTIONALITY_CHECKS[3]);
      const touchOk = has(HANDHELD_FUNCTIONALITY_CHECKS[4]);
      const soundOk = has(HANDHELD_FUNCTIONALITY_CHECKS[5]);
      const buttonsOk = has(HANDHELD_FUNCTIONALITY_CHECKS[6]);

      const reject =
        !powersOk ||
        !cartridgesOk ||
        !hingeOk ||
        !screenOk ||
        !touchOk;

      if (reject) {
        return {
          estimatedCredits: 0,
          estimatedCreditsReason: 'This handheld cannot be listed because one or more critical functions do not work.',
        };
      }

      let credits = swappaCredits;
      if (!soundOk) {
        credits = Math.round(credits * 0.7); // 30% deduction
      }
      if (!buttonsOk) {
        credits = Math.round(credits * 0.75); // 25% deduction
      }

      return { estimatedCredits: Math.max(0, credits), estimatedCreditsReason: null as string | null };
    }

    if (swappaCategories.includes(category) && swappaCredits !== null && swappaCredits > 0) {
      // Console, Video Games, Headphones, Speaker: Yes/No functional → if No, 0.4 × average
      if (category === 'Console' || category === 'Video Games' || category === 'Headphones' || category === 'Speaker') {
        const credits = consoleFunctional === false ? Math.round(swappaCredits * 0.4) : swappaCredits;
        return { estimatedCredits: credits, estimatedCreditsReason: null as string | null };
      }
      const totalDeduction = FUNCTIONALITY_CHECKS.filter((c) => !functionalityOptions.includes(c.text)).reduce((sum, c) => sum + c.weight, 0);
      const adjustedCredits = Math.round(swappaCredits * (1 - totalDeduction));
      return { estimatedCredits: Math.max(0, adjustedCredits), estimatedCreditsReason: null as string | null };
    }
    if (valuationCategories.includes(category) && swappaLookupError) {
      return { estimatedCredits: null as number | null, estimatedCreditsReason: swappaLookupError };
    }
    // Video Games, Headphones, Speaker: use swappaCredits when available (not in swappaCategories so missed above)
    if ((category === 'Video Games' || category === 'Headphones' || category === 'Speaker') && swappaCredits !== null && swappaCredits > 0) {
      const credits = consoleFunctional === false ? (category === 'Video Games' ? 0 : Math.round(swappaCredits * 0.4)) : swappaCredits;
      return { estimatedCredits: credits, estimatedCreditsReason: null as string | null };
    }
    if (category === 'Phones' || category === 'Tablets' || category === 'Laptops' || category === 'Console' || category === 'Video Games') {
      return { estimatedCredits: null as number | null, estimatedCreditsReason: 'Tap Get Valuation on the Photos step (after adding 6+ photos) to see market-based credits.' };
    }
    if (category === 'MP3') {
      return { estimatedCredits: null as number | null, estimatedCreditsReason: 'Tap Get Valuation on the Photos step (after adding 6+ photos) to see eBay-based credits.' };
    }
    // Other categories (Headphones, Speaker, etc.): eBay-only valuation; Console uses PriceCharting above. Video Games non-functional already returns 0 above.
    if (swappaCredits !== null && swappaCredits > 0) {
      const credits = (category === 'Headphones' || category === 'Speaker' || category === 'Video Games') && consoleFunctional === false
        ? (category === 'Video Games' ? 0 : Math.round(swappaCredits * 0.4))
        : swappaCredits;
      return { estimatedCredits: credits, estimatedCreditsReason: null as string | null };
    }
    if (swappaLookupError) {
      return { estimatedCredits: null as number | null, estimatedCreditsReason: swappaLookupError };
    }
    const reason = (category === 'Headphones' || category === 'Speaker')
      ? `Tap Get Valuation on the Photos step (after adding ${minListingPhotos}+ photos) to see HiFi Shark-based credits.`
      : 'Valuation may not be available for this category.';
    return { estimatedCredits: null as number | null, estimatedCreditsReason: reason };
  }, [category, swappaCredits, swappaLookupError, functionalityOptions, consoleFunctional, minListingPhotos]);
  const consoleAccessoryBonus = useMemo(() => {
    if (category !== 'Console') return 0;
    if (baseEstimatedCredits == null || baseEstimatedCredits <= 0) return 0;
    let bonus = 0;
    if (accessories.includes('Controller')) bonus += 15;
    if (accessories.includes('Power cord')) bonus += 8;
    return bonus;
  }, [category, baseEstimatedCredits, accessories]);
  const estimatedCredits = baseEstimatedCredits != null ? baseEstimatedCredits + consoleAccessoryBonus : null;
  const categoryToDeviceType = (): DeviceType => (({ Phones: 'phone', Laptops: 'laptop', Tablets: 'tablet', Headphones: 'headphones', Speaker: 'speaker', Console: 'gaming_console', 'Video Games': 'video_game', MP3: 'phone', 'Gaming Handhelds': 'gaming_handheld' } as Record<string, DeviceType>)[category] ?? 'phone');
  const showSPen = brand === 'Samsung' && /ultra/i.test(modelName);
  const hideSimPin = brand === 'Apple' && /iphone\s*1[56]/i.test(modelName);

  const openDeviceCapture = useCallback(() => {
    setPhotoError(null);
    if (!userId) { setPhotoError('Sign in to take photos.'); return; }
    const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();
    const secure = typeof window !== 'undefined' && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || isNative);
    if (!secure) { setPhotoError('Camera requires HTTPS.'); return; }
    setDeviceCaptureOpen(true);
  }, [userId, setPhotoError, setDeviceCaptureOpen]);

  const handleDeviceCaptureComplete = useCallback((urls: string[]) => {
    setListingPhotoUrls(urls);
    setDeviceCaptureOpen(false);
    setCondition(null);
    setConditionPercentage(null);
    setConditionError(null);
    setSwappaCredits(null);
    setSwappaPrice(null);
  }, [setListingPhotoUrls, setDeviceCaptureOpen, setCondition, setConditionPercentage, setConditionError, setSwappaCredits, setSwappaPrice]);

  const removeListingPhoto = useCallback((index: number) => {
    setListingPhotoUrls((prev) => prev.filter((_, i) => i !== index));
    setCondition(null);
    setConditionPercentage(null);
    setConditionError(null);
    setSwappaCredits(null);
    setSwappaPrice(null);
  }, [setListingPhotoUrls, setCondition, setConditionPercentage, setConditionError, setSwappaCredits, setSwappaPrice]);

  const requestListingLocation = useCallback(async () => {
    const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();
    const secure = typeof window !== 'undefined' && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || isNative);
    if (!secure) { setLocationError('Location requires HTTPS.'); return; }
    if (!isNative && !navigator.geolocation) { setLocationError('Location not supported.'); return; }
    setLocationError(null);
    setLocationLoading(true);

    if (isNative) {
      try {
        const { Geolocation } = await import('@capacitor/geolocation');
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 15000, maximumAge: 0 });
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const parsed = await reverseGeocode(lat, lng);
        setListingLocation({ latitude: lat, longitude: lng, city: parsed?.city ?? '', state: parsed?.state ?? '' });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('0003') || msg.toLowerCase().includes('denied')) {
          setLocationError('Location blocked.');
        } else if (msg.includes('0010') || msg.toLowerCase().includes('timeout')) {
          setLocationError('Timed out.');
        } else {
          setLocationError('Location unavailable.');
        }
      } finally {
        setLocationLoading(false);
      }
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        const parsed = await reverseGeocode(lat, lng);
        setListingLocation({ latitude: lat, longitude: lng, city: parsed?.city ?? '', state: parsed?.state ?? '' });
        setLocationLoading(false);
      },
      (err: GeolocationPositionError) => {
        setLocationError(err?.code === 1 ? 'Location blocked.' : err?.code === 3 ? 'Timed out.' : 'Location unavailable.');
        setLocationLoading(false);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 }
    );
  }, [setListingLocation, setLocationLoading, setLocationError]);

  const handleSubmitListing = useCallback(async () => {
    if (!userId) { setSubmitError('Please sign in.'); router.push('/login'); return; }
    import('@capacitor/haptics').then(({ Haptics, ImpactStyle }) => {
      Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
      });
    }).catch(() => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
    });
    const cond = isVideoGamesFlow ? 'Good' : (condition ?? getWorstCondition(frontCondition, backCondition, sideTop, sideBottom, sideLeft, sideRight));
    if (!cond) { setSubmitError(isConsoleLikeFlow ? 'Please complete the condition step.' : 'Please complete the condition steps (Front and Back).'); return; }
    const videoGamesNonFunctional = isVideoGamesFlow && consoleFunctional === false;
    if (!videoGamesNonFunctional && (estimatedCredits == null || estimatedCredits <= 0)) {
      setSubmitError(estimatedCreditsReason ?? 'Get valuation on the Photos step before listing.');
      return;
    }
    setSubmitError(null);
    setIsSubmitting(true);
    const specsParts: string[] = [];
    if (hasStorage) {
      const storageSpec = category === 'MP3' || category === 'Laptops' || category === 'Console' ? effectiveStorage : storage;
      if (category !== 'Console' || storageSpec !== CONSOLE_NO_STORAGE_OPTION) specsParts.push(storageSpec);
    }
    if (imei.trim()) specsParts.push(imei.trim());
    if (category === 'Video Games' && videoGameCondition) specsParts.push(videoGameCondition);
    if (category === 'Tablets') { if (size) specsParts.push(size); if (year) specsParts.push(year); }
    const specs = specsParts.length ? specsParts.join(' • ') : undefined;
    const result = await createGadget(userId, {
      name: isVideoGamesFlow && videoGameName.trim() ? videoGameName.trim() : (modelName.trim() || `${brand} ${category}`),
      brand,
      category,
      condition: cond,
      specs,
      description: [
        accessories.length ? `Accessories: ${accessories.join(', ')}` : '',
        functionalityOptions.length ? `Functional: ${functionalityOptions.join('. ')}` : '',
        isConsoleLikeFlow && consoleFunctional !== null ? `Device functional: ${consoleFunctional ? 'Yes' : 'No'}` : '',
        ['Phones', 'Tablets', 'Laptops', 'Gaming Handhelds', 'MP3'].includes(category) && batteryHealth.trim() ? `Battery health: ${batteryHealth.trim()}%` : '',
        frontCondition ? `Condition details: Front: ${frontCondition}${backCondition ? `, Back: ${backCondition}` : ''}` : '',
        description.trim(),
      ].filter(Boolean).join('\n') || undefined,
      ...(color.trim() && { color: color.trim() }),
      ...(carrier && !['Laptops', 'Headphones', 'Speaker', 'Console', 'Video Games', 'MP3', 'Gaming Handhelds'].includes(category) && { carrier }),
      verification_code: verificationCode,
      credits: estimatedCredits ?? 0,
      ...(listingLocation && { latitude: listingLocation.latitude, longitude: listingLocation.longitude, city: listingLocation.city || undefined, state: listingLocation.state || undefined }),
      ...(listingPhotoUrls.length > 0 && { image_urls: listingPhotoUrls }),
    });
    setIsSubmitting(false);
    if ('error' in result) { setSubmitError(result.error); return; }
    setNewGadgetId(result.id);
    setPickupLocation1(null);
    setPickupLocation2(null);
    setLocation1Query('');
    setLocation2Query('');
    setLocation1Suggestions([]);
    setLocation2Suggestions([]);
    setPickupDropdownVisible(null);
    setPickupLocationsError(null);
    setShowPickupLocationsModal(true);
  }, [userId, condition, frontCondition, backCondition, sideTop, sideBottom, sideLeft, sideRight, storage, effectiveStorage, imei, category, size, year, brand, modelName, accessories, functionalityOptions, consoleFunctional, description, color, carrier, verificationCode, estimatedCredits, estimatedCreditsReason, listingLocation, listingPhotoUrls, router, setIsSubmitting, setSubmitError, isConsoleLikeFlow, isVideoGamesFlow, videoGameName, videoGameCondition, batteryHealth]);

  const handlePickupLocationsConfirm = useCallback(async () => {
    if (!userId || !newGadgetId || !pickupLocation1 || !pickupLocation2) return;
    setPickupLocationsSaving(true);
    const result = await updateGadgetPickupLocations(userId, newGadgetId, [pickupLocation1, pickupLocation2]);
    setPickupLocationsSaving(false);
    if ('error' in result) {
      setPickupLocationsError(result.error);
      setSubmitError(result.error);
      return;
    }

    const hasAvail = userId ? await hasAvailability(userId) : false;

    if (hasAvail) {
      // Scenario 2: user already has availability → award credits after pickup confirmation
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token && estimatedCredits != null && estimatedCredits > 0) {
        const creditRes = await fetch('/api/credits/listing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ gadgetId: newGadgetId, credits: estimatedCredits }),
        });
        if (!creditRes.ok) {
          const err = await creditRes.json().catch(() => ({}));
          console.warn('[list] Credits not applied (from pickup confirm):', creditRes.status, err);
        }
      }
    } else {
      // Scenario 1: user has no availability → defer credit until they confirm availability (stored for availability page)
      if (typeof window !== 'undefined' && newGadgetId && estimatedCredits != null && estimatedCredits > 0) {
        try {
          sessionStorage.setItem('relay_pending_listing_credit', JSON.stringify({ gadgetId: newGadgetId, credits: estimatedCredits }));
        } catch {}
      }
    }

    setPickupLocationsError(null);
    setShowPickupLocationsModal(false);
    setNewGadgetId(null);
    setPickupLocation1(null);
    setPickupLocation2(null);
    clearDraft();
    setCelebrationCredits(estimatedCredits ?? 0);
    setShowCelebration(true);

    // After confirming pickup locations and creating the listing, ensure the seller
    // has at least one availability window configured. First-time listers without
    // availability are guided to Settings > Availability after the celebration.
    (async () => {
      const profileId = userId;
      let shouldRouteToAvailability = false;
      if (profileId) {
        const hasAvail = await hasAvailability(profileId);
        shouldRouteToAvailability = !hasAvail;
      }
      const target = shouldRouteToAvailability ? '/settings/availability?onboarding=1&from=list' : '/?listed=1';
      setTimeout(() => router.push(target), 3200);
    })();
  }, [userId, newGadgetId, pickupLocation1, pickupLocation2, clearDraft, estimatedCredits, setSubmitError, router]);

  const handleNext = useCallback(() => {
    if (currentStep >= totalSteps) return;
    import('@capacitor/haptics').then(({ Haptics, ImpactStyle }) => {
      Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
      });
    }).catch(() => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
    });
    if (isPhoneFlow && currentStep === 1 && !imei.trim()) return;
    if (isPhoneFlow && currentStep === 2 && verificationStatus !== 'passed') return;
    if (currentStep === 2 && isTabletFlow && isTabletUnlocked && verificationStatus !== 'passed') return;
    if (currentStep === 2 && (isLaptopFlow || (isTabletFlow && !isTabletUnlocked)) && laptopVerificationStatus !== 'passed') return;
    // Gaming Handhelds: if any critical checks fail, block progression with a message
    if (
      !isPhoneFlow &&
      !isLaptopFlow &&
      !isTabletFlow &&
      isConsoleLikeFlow &&
      !isVideoGamesFlow &&
      category === 'Gaming Handhelds' &&
      currentStep === 3 &&
      consoleFunctional === false
    ) {
      if (typeof window !== 'undefined') {
        window.alert("Sorry, we don't accept gaming handhelds with power, cartridge, hinge, screen, or touchscreen issues. Please try listing a different device.");
      }
      return;
    }
    // Video Games: when user selects No (not functional), skip Photos step and go to Review (step 4) with valuation 0
    if (isVideoGamesFlow && currentStep === 2 && consoleFunctional === false) {
      router.push('/list/4');
      return;
    }
    router.push(`/list/${currentStep + 1}`);
  }, [currentStep, totalSteps, isPhoneFlow, isLaptopFlow, isTabletFlow, isVideoGamesFlow, consoleFunctional, imei, verificationStatus, laptopVerificationStatus, router]);

  const setCategoryAndBrand = useCallback((cat: string) => {
    setCategory(cat);
    if (['Phones', 'Tablets', 'Headphones', 'Speaker', 'Console', 'Video Games', 'MP3', 'Gaming Handhelds'].includes(cat)) setBrand('');
    else setBrand(BRANDS_BY_CATEGORY[cat]?.[0] ?? '');
    if (cat !== 'Video Games') { setVideoGameName(''); setVideoGameCondition(''); }
  }, [setCategory, setBrand, setVideoGameName, setVideoGameCondition]);

  const handleToggleHandheldCheck = useCallback(
    (text: string) => {
      const isSelected = functionalityOptions.includes(text);
      const nextOptions = isSelected
        ? functionalityOptions.filter((t) => t !== text)
        : [...functionalityOptions, text];

      toggleFunctionality(text);

      if (nextOptions.length === 0) {
        setConsoleFunctional(null);
      } else {
        const has = (val: string) => nextOptions.includes(val);
        const powersOk = has(HANDHELD_FUNCTIONALITY_CHECKS[0]); // powers on/off + charges
        const cartridgesOk = has(HANDHELD_FUNCTIONALITY_CHECKS[1]);
        const hingeOk = has(HANDHELD_FUNCTIONALITY_CHECKS[2]);
        const screenOk = has(HANDHELD_FUNCTIONALITY_CHECKS[3]);
        const touchOk = has(HANDHELD_FUNCTIONALITY_CHECKS[4]);

        const reject =
          !powersOk ||
          !cartridgesOk ||
          !hingeOk ||
          !screenOk ||
          !touchOk;

        setConsoleFunctional(!reject);
      }
    },
    [functionalityOptions, toggleFunctionality, setConsoleFunctional]
  );

  const handleLeaveSaveDraft = useCallback(() => {
    saveDraft(currentStep);
    setShowLeaveModal(false);
    hasResumedDraftRef.current = false; // so next time they open /list/1 they see resume modal if draft exists
    const navigate = pendingLeaveCallback;
    setPendingLeaveCallback(null);
    if (navigate) {
      savingDraftAndLeavingRef.current = true;
      navigate();
    } else {
      savingDraftAndLeavingRef.current = true;
      router.back();
    }
  }, [currentStep, saveDraft, setShowLeaveModal, hasResumedDraftRef, pendingLeaveCallback, setPendingLeaveCallback, router]);

  const handleLeaveDiscard = useCallback(() => {
    clearDraft();
    setShowLeaveModal(false);
    hasResumedDraftRef.current = false;
    const navigate = pendingLeaveCallback;
    setPendingLeaveCallback(null);
    if (navigate) {
      savingDraftAndLeavingRef.current = true;
      navigate();
    } else {
      router.back();
    }
  }, [clearDraft, setShowLeaveModal, hasResumedDraftRef, pendingLeaveCallback, setPendingLeaveCallback, router]);

  const handleResumeDraft = useCallback(() => {
    hasResumedDraftRef.current = true; // set synchronously so it's true when we navigate back to step 1
    const result = loadDraft();
    setShowResumeDraftModal(false);
    if (result) {
      // Defer navigation so React commits all draft state updates before we navigate; otherwise step 2 can render with stale context and effects may overwrite fields
      const step = result.step;
      queueMicrotask(() => router.replace(`/list/${step}`));
    }
  }, [loadDraft, hasResumedDraftRef, router]);

  const handleStartNewListing = useCallback(() => {
    hasResumedDraftRef.current = false;
    clearDraft();
    setShowResumeDraftModal(false);
  }, [clearDraft, hasResumedDraftRef]);

  if (showCelebration) return <CoinCelebration credits={celebrationCredits} />;
  if (deviceCaptureOpen && userId) return <DeviceCaptureFlow deviceType={categoryToDeviceType()} userId={userId} onComplete={handleDeviceCaptureComplete} onCancel={() => setDeviceCaptureOpen(false)} />;

  if (showPickupLocationsModal && newGadgetId) {
    const canConfirm = pickupLocation1 && pickupLocation2;
    const mapVisible = !!pickupLocation1;
    const selectLocation = (which: '1' | '2', s: LocationSuggestion) => {
      const exactLocation = s.displayName || [s.city, s.state].filter(Boolean).join(', ') || 'Unknown';
      const loc: PickupLocationRow = { latitude: s.latitude, longitude: s.longitude, city: s.city, state: s.state, displayName: exactLocation };
      if (which === '1') {
        setPickupLocation1(loc);
        setLocation1Query(exactLocation);
        setLocation1Suggestions([]);
        setPickupDropdownVisible(null);
      } else {
        setPickupLocation2(loc);
        setLocation2Query(exactLocation);
        setLocation2Suggestions([]);
        setPickupDropdownVisible(null);
      }
    };
    const renderLocationInput = (which: '1' | '2') => {
      const is1 = which === '1';
      const query = is1 ? location1Query : location2Query;
      const setQuery = is1 ? (v: string) => { setLocation1Query(v); if (!v) setPickupLocation1(null); } : (v: string) => { setLocation2Query(v); if (!v) setPickupLocation2(null); };
      const value = is1 ? pickupLocation1 : pickupLocation2;
      const suggestions = is1 ? location1Suggestions : location2Suggestions;
      const open = pickupDropdownVisible === which;
      const setOpen = (v: boolean) => setPickupDropdownVisible(v ? which : null);
      const dotColor = is1 ? '#f08070' : '#3b82f6';
      const other = is1 ? pickupLocation2 : pickupLocation1;
      const makeKey = (d: { displayName?: string; city: string; state: string }) =>
        [d.displayName ?? '', d.city ?? '', d.state ?? ''].join(' | ').toLowerCase();
      const excludeKey = other ? makeKey(other) : null;
      const filtered = excludeKey
        ? suggestions.filter((s) => makeKey(s) !== excludeKey)
        : suggestions;
      return (
        <div key={which} className="relative">
          <label className="flex items-center gap-1.5 text-[11px] font-bold tracking-widest text-[#aaa] mb-1.5 uppercase">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} />
            LOCATION {which}
          </label>
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 160)}
            placeholder="Search for a location..."
            className={`w-full py-3.5 px-4 rounded-xl text-sm text-[#222] outline-none font-[inherit] box-border transition-all border-[1.5px] bg-[#f2f1ee] dark:bg-[#2a2a2a] dark:text-gray-100 placeholder:text-[#999] ${
              value
                ? is1
                  ? 'border-[#f08070]/30 dark:border-[#f08070]/40'
                  : 'border-[#3b82f6]/30 dark:border-[#3b82f6]/40'
                : 'border-transparent dark:border-transparent'
            }`}
          />
          {value && (
            <div className="flex items-center gap-1 mt-1.5 pl-0.5 text-[11px] text-[#aaa]">
              <span style={{ color: dotColor }}>✓</span>
              <span className="truncate">
                {value.displayName}
                {([value.city, value.state].filter(Boolean).join(', ') || '').trim()
                  ? ` — ${[value.city, value.state].filter(Boolean).join(', ')}`
                  : ''}
              </span>
            </div>
          )}
          {open && (filtered.length > 0 || locationSuggestionsLoading) && (
            <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 bg-white dark:bg-[#1a1a1a] rounded-[14px] shadow-lg overflow-hidden border border-[#f0f0ee] dark:border-gray-700">
              {locationSuggestionsLoading ? (
                <div className="p-3 text-center text-[#888] text-xs">Searching...</div>
              ) : (
                filtered.map((s, i) => {
                  const cityState = [s.city, s.state].filter(Boolean).join(', ');
                  const exact = s.displayName || cityState || 'Unknown';
                  return (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={() => { selectLocation(which, s); setQuery(exact); setOpen(false); }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm text-[#222] dark:text-gray-100 hover:bg-[#fafaf8] dark:hover:bg-[#252525] border-b border-[#f8f8f6] dark:border-gray-800 last:border-0"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[#f5f4f0] dark:bg-[#333] flex items-center justify-center text-sm shrink-0">📍</div>
                      <div className="min-w-0">
                        <div className="font-semibold text-[#222] dark:text-gray-100 truncate">
                          {s.displayName?.split(',')[0]?.trim() || s.city || 'Location'}
                        </div>
                        <div className="text-[11px] text-[#aaa] mt-0.5 truncate">
                          {cityState || s.displayName}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      );
    };
    return (
      <div className="fixed inset-0 z-[9998] flex items-center justify-center p-6 bg-[#e8e6e0]/90 dark:bg-black/60">
        <div className="w-full max-w-[420px]">
          <div className="w-9 h-1 rounded-full bg-[#ccc] mx-auto mb-4" aria-hidden />
          <div className="bg-white dark:bg-[#1a1a1a] rounded-[28px] pt-7 px-[22px] pb-[22px] shadow-[0_2px_40px_rgba(0,0,0,0.08)]">
            <h2 className="text-[22px] font-extrabold tracking-tight text-[#111] dark:text-gray-100 mb-2">
              PICKUP LOCATIONS
            </h2>
            <p className="text-sm text-[#aaa] dark:text-gray-400 leading-relaxed mb-6">
              Choose 2 pickup locations so the buyer can pick one when they swap. Type to search.
            </p>
            <div className="flex flex-col gap-[18px]">
              {renderLocationInput('1')}
              {renderLocationInput('2')}
              <div
                className="overflow-hidden transition-all duration-500 ease-out"
                style={{
                  maxHeight: mapVisible ? 220 : 0,
                  opacity: mapVisible ? 1 : 0,
                  transitionProperty: 'max-height, opacity',
                  transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1), ease',
                }}
              >
                <SharedMap loc1={pickupLocation1} loc2={pickupLocation2} />
              </div>
            </div>
            {pickupLocationsError && (
              <p className="text-sm text-center mt-2 text-red-600 dark:text-red-400">
                {pickupLocationsError}
              </p>
            )}
            <button
              type="button"
              onClick={handlePickupLocationsConfirm}
              disabled={!canConfirm || pickupLocationsSaving}
              className="w-full mt-5 py-4 rounded-[14px] text-[13px] font-extrabold tracking-widest transition-all duration-250 font-[inherit] disabled:cursor-not-allowed"
              style={{
                background: canConfirm ? '#f08070' : '#f2f1ee',
                color: canConfirm ? '#fff' : '#ccc',
                cursor: canConfirm ? 'pointer' : 'default',
              }}
            >
              {pickupLocationsSaving ? 'Saving...' : 'CONFIRM AND FINISH'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isReviewStep = (isPhoneFlow && currentStep === 7) || (isLaptopFlow && currentStep === 7) || (isTabletFlow && currentStep === 7) || (!isPhoneFlow && !isLaptopFlow && !isTabletFlow && (isVideoGamesFlow ? currentStep === 4 : isConsoleLikeFlow ? currentStep === 5 : currentStep === 6));
  const isPhotosStep = (isPhoneFlow && currentStep === 6) || (isLaptopFlow && currentStep === 6) || (isTabletFlow && currentStep === 6) || (!isPhoneFlow && !isLaptopFlow && !isTabletFlow && (((isConsoleLikeFlow && !isVideoGamesFlow) && currentStep === 4) || (isVideoGamesFlow && currentStep === 3) || (!isConsoleLikeFlow && !isVideoGamesFlow && currentStep === 5)));
  const isVerificationStep = (isPhoneFlow && currentStep === 2) || (isLaptopFlow && currentStep === 2) || (isTabletFlow && currentStep === 2);
  const isConditionPartStep = (isPhoneFlow && [3, 4].includes(currentStep)) || (isLaptopFlow && [3, 4].includes(currentStep)) || (isTabletFlow && [3, 4].includes(currentStep)) || (!isPhoneFlow && !isLaptopFlow && !isTabletFlow && ((isConsoleLikeFlow && currentStep === 2 && !isVideoGamesFlow) || (!isConsoleLikeFlow && !isVideoGamesFlow && [2, 3].includes(currentStep))));
  const isFunctionalityStep = (isPhoneFlow && currentStep === 5) || (isLaptopFlow && currentStep === 5) || (isTabletFlow && currentStep === 5) || (!isPhoneFlow && !isLaptopFlow && !isTabletFlow && (((isConsoleLikeFlow && !isVideoGamesFlow) && currentStep === 3) || (isVideoGamesFlow && currentStep === 2) || (!isConsoleLikeFlow && !isVideoGamesFlow && currentStep === 4)));
  const BATTERY_HEALTH_CATEGORIES = ['Phones', 'Tablets', 'Laptops', 'Gaming Handhelds', 'MP3'] as const;
  const hasBatteryHealth = (BATTERY_HEALTH_CATEGORIES as readonly string[]).includes(category);
  const conditionPartBlocked = isConditionPartStep && (
    ((isPhoneFlow && currentStep === 3) || (isLaptopFlow && currentStep === 3) || (isTabletFlow && currentStep === 3) || (!isPhoneFlow && !isLaptopFlow && !isTabletFlow && currentStep === 2)) ? !frontCondition || (hasBatteryHealth && batteryHealth.trim() === '') :
    ((isPhoneFlow && currentStep === 4) || (isLaptopFlow && currentStep === 4) || (isTabletFlow && currentStep === 4) || (!isPhoneFlow && !isLaptopFlow && !isTabletFlow && !isConsoleLikeFlow && currentStep === 3)) ? !backCondition :
    false
  );
  const functionalityBlocked = isFunctionalityStep && isConsoleLikeFlow && consoleFunctional === null;
  const videoGamesNonFunctionalReview = isVideoGamesFlow && consoleFunctional === false;
  const step1NextDisabled = (isVideoGamesFlow && (!modelName.trim() || !videoGameName.trim() || !videoGameCondition)) || ((isPhoneFlow || isLaptopFlow || category === 'Tablets') && ((category === 'Tablets' && carrier === 'Unlocked' ? imei.trim().replace(/\D/g, '').length !== 15 : !imei.trim()) || !brand?.trim() || !modelName?.trim())) || (['MP3', 'Gaming Handhelds', 'Console', 'Headphones', 'Speaker'].includes(category) && (!brand?.trim() || !modelName?.trim()));
  const needLocation = isReviewStep && !listingLocation;
  const needValuation = videoGamesNonFunctionalReview ? false : (estimatedCredits == null || estimatedCredits <= 0);
  const reviewPrimaryLabel = isSubmitting ? 'Listing...' : needLocation ? 'USE MY LOCATION TO FINALIZE' : needValuation ? (estimatedCreditsReason?.includes('not available') ? 'VALUATION NOT AVAILABLE' : 'GET VALUATION ON PHOTOS STEP FIRST') : 'FINALIZE LISTING';
  const reviewPrimaryDisabled = isSubmitting || !userId || !listingLocation || (!videoGamesNonFunctionalReview && (!hasEnoughPhotos || estimatedCredits == null || estimatedCredits <= 0));
  const photosPrimaryLabel = isValuating ? 'Processing...' : !hasEnoughPhotos ? 'CAPTURE PHOTOS' : 'COMPLETE EVALUATION';
  const photosPrimaryDisabled = isValuating || !hasEnoughPhotos;
  const photosNextDisabled = !hasEnoughPhotos;

  let footerProps: ListingStepFooterProps;
  if (currentStep === 1) {
    footerProps = { variant: 'step1', nextDisabled: step1NextDisabled, onNext: handleNext };
  } else if (isVerificationStep) {
    if (isPhoneFlow) {
      footerProps = { variant: 'verify-and-next', verifyDisabled: !canRunVerification || verificationStatus === 'verifying', verifying: verificationStatus === 'verifying', nextDisabled: verificationStatus !== 'passed', onVerify: runVerification, onNext: handleNext };
    } else if (isTabletFlow && isTabletUnlocked) {
      footerProps = { variant: 'verify-and-next', verifyDisabled: !canRunTabletImeiVerification || verificationStatus === 'verifying', verifying: verificationStatus === 'verifying', nextDisabled: verificationStatus !== 'passed', onVerify: runTabletImeiVerification, onNext: handleNext };
    } else {
      footerProps = { variant: 'verify-and-next', verifyDisabled: !canRunSerialVerification || laptopVerificationStatus === 'verifying', verifying: laptopVerificationStatus === 'verifying', nextDisabled: laptopVerificationStatus !== 'passed', onVerify: runSerialVerification, onNext: handleNext };
    }
  } else if (isConditionPartStep || isFunctionalityStep) {
    footerProps = { variant: 'condition-or-functionality', nextDisabled: conditionPartBlocked || functionalityBlocked, onNext: handleNext };
  } else if (isPhotosStep) {
    footerProps = {
      variant: 'photos',
      primaryLabel: photosPrimaryLabel,
      primaryDisabled: photosPrimaryDisabled,
      onPrimary: simulateValuation,
      nextDisabled: photosNextDisabled,
      onNext: handleNext,
    };
  } else if (isReviewStep) {
    footerProps = {
      variant: 'review',
      primaryLabel: reviewPrimaryLabel,
      primaryDisabled: reviewPrimaryDisabled,
      onPrimary: handleSubmitListing,
      leftSlot: estimatedCredits != null && estimatedCredits > 0 ? <ValuationCountUp credits={estimatedCredits} /> : undefined,
    };
  } else {
    footerProps = { variant: 'step1', nextDisabled: true, onNext: () => {} };
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 pb-36">
      <div className="px-6 py-6 space-y-6 max-w-md mx-auto w-full">
        {/* Leave confirmation modal */}
        {showLeaveModal && (
          <div className="fixed inset-0 z-[9998] flex items-center justify-center p-6 bg-relay-bg/70 dark:bg-relay-bg-dark/70" role="dialog" aria-modal="true" aria-labelledby="leave-modal-title" onClick={() => { setShowLeaveModal(false); setPendingLeaveCallback(null); }}>
            <div className="relative z-10 w-full max-w-sm glass-card shadow-xl p-6 space-y-4 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
              <h2 id="leave-modal-title" className="text-lg font-semibold text-relay-text dark:text-relay-text-dark uppercase">Leave listing?</h2>
              <p className="text-sm text-relay-muted dark:text-relay-muted-light">You can save a draft and continue later, or discard your progress.</p>
              <div className="flex flex-col gap-3">
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleLeaveSaveDraft}
                    className="text-xs font-semibold tracking-tight text-emerald-500 active-scale uppercase"
                  >
                    Save as draft
                  </button>
                </div>
              <button
                type="button"
                onClick={handleLeaveDiscard}
                className="w-full rounded-xl border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark text-xs font-medium cursor-pointer"
                style={{ height: '42px' }}
                >
                  DISCARD
                </button>
              <button
                type="button"
                onClick={() => {
                  setShowLeaveModal(false);
                  setPendingLeaveCallback(null);
                }}
                className="w-full rounded-xl border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark text-xs font-medium cursor-pointer uppercase"
                style={{ height: '42px' }}
              >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Resume draft modal (step 1 only) */}
        {showResumeDraftModal && (
          <div className="fixed inset-0 z-[9998] flex items-center justifycenter p-6 bg-relay-bg/70 dark:bg-relay-bg-dark/70" role="dialog" aria-modal="true" aria-labelledby="resume-modal-title" onClick={() => setShowResumeDraftModal(false)}>
            <div className="relative z-10 w-full max-w-sm glass-card shadow-xl p-6 space-y-4 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
              <h2 id="resume-modal-title" className="text-lg font-semibold text-relay-text dark:text-relay-text-dark uppercase">Saved draft</h2>
              <p className="text-sm text-relay-muted dark:text-relay-muted-light">You have a saved draft. Resume where you left off?</p>
              <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleResumeDraft}
                className="w-full rounded-xl bg-primary text-white text-xs font-semibold tracking-widest cursor-pointer uppercase"
                style={{ height: '42px' }}
              >
                  RESUME DRAFT
                </button>
              <button
                type="button"
                onClick={handleStartNewListing}
                className="w-full rounded-xl border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark text-sm font-medium cursor-pointer uppercase"
                style={{ height: '42px' }}
              >
                  START NEW LISTING
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Device Details */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest text-relay-muted dark:text-relay-muted-light uppercase">Category</label>
                <select value={category} onChange={(e) => setCategoryAndBrand(e.target.value)} className="w-full h-12 bg-relay-surface dark:bg-relay-surface-dark border border-relay-border dark:border-relay-border-dark rounded-lg text-relay-text dark:text-relay-text-dark px-4 text-sm">
                  {Object.keys(BRANDS_BY_CATEGORY).map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest text-relay-muted dark:text-relay-muted-light uppercase">Brand</label>
                <select value={brand} onChange={(e) => setBrand(e.target.value)} disabled={Boolean((category === 'Phones' && phoneBrandsLoading && !phoneBrands.length) || (category === 'Tablets' && tabletBrandsLoading && !tabletBrands.length) || (category === 'MP3' && relicBrandsLoading && !relicBrands.length) || (category === 'Gaming Handhelds' && handheldBrandsLoading && !handheldBrands.length) || (accessoryType && accessoryBrandsLoading && !accessoryBrands.length))} className="w-full h-12 bg-relay-surface dark:bg-relay-surface-dark border border-relay-border dark:border-relay-border-dark rounded-lg text-relay-text dark:text-relay-text-dark px-4 text-sm">
                  <option value="">Select brand</option>
                  {category === 'Phones' && phoneBrands.map((b) => <option key={b} value={b}>{b}</option>)}
                  {category === 'Tablets' && tabletBrands.map((b) => <option key={b} value={b}>{b}</option>)}
                  {category === 'MP3' && relicBrands.map((b) => <option key={b} value={b}>{b}</option>)}
                  {category === 'Gaming Handhelds' && handheldBrands.map((b) => <option key={b} value={b}>{b}</option>)}
                  {accessoryType && accessoryBrands.map((b) => <option key={b} value={b}>{b}</option>)}
                  {!['Phones','Tablets','MP3','Gaming Handhelds'].includes(category) && !accessoryType && (BRANDS_BY_CATEGORY[category] ?? []).map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold tracking-widest text-relay-muted dark:text-relay-muted-light uppercase">{category === 'Video Games' ? 'Console name' : 'Model Name'}</label>
                {category === 'Laptops' && (
                <select value={modelName} onChange={(e) => setModelName(e.target.value)} disabled={laptopModelsLoading} className="w-full h-12 bg-relay-surface dark:bg-relay-surface-dark border border-relay-border dark:border-relay-border-dark rounded-lg text-relay-text dark:text-relay-text-dark px-4 text-sm">
                  <option value="">{laptopModelsLoading ? 'Loading...' : 'Select model'}</option>
                  {laptopModels.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              )}
              {category === 'Phones' && (
                <select value={modelName} onChange={(e) => setModelName(e.target.value)} disabled={phoneModelsLoading} className="w-full h-12 bg-relay-surface dark:bg-relay-surface-dark border border-relay-border dark:border-relay-border-dark rounded-lg text-relay-text dark:text-relay-text-dark px-4 text-sm">
                  <option value="">{phoneModelsLoading ? 'Loading...' : 'Select model'}</option>
                  {phoneModels.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              )}
              {category === 'Tablets' && (
                <select value={modelName} onChange={(e) => setModelName(e.target.value)} disabled={tabletModelsLoading} className="w-full h-12 bg-relay-surface dark:bg-relay-surface-dark border border-relay-border dark:border-relay-border-dark rounded-lg text-relay-text dark:text-relay-text-dark px-4 text-sm">
                  <option value="">{tabletModelsLoading ? 'Loading...' : 'Select model'}</option>
                  {tabletModels.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              )}
              {accessoryType && (
                <select value={modelName} onChange={(e) => setModelName(e.target.value)} disabled={accessoryModelsLoading} className="w-full h-12 bg-relay-surface dark:bg-relay-surface-dark border border-relay-border dark:border-relay-border-dark rounded-lg text-relay-text dark:text-relay-text-dark px-4 text-sm">
                  <option value="">{accessoryModelsLoading ? 'Loading...' : 'Select model'}</option>
                  {accessoryModels.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              )}
              {category === 'MP3' && (
                <select
                  value={modelName}
                  onChange={(e) => {
                    const value = e.target.value;
                    setModelName(value);
                    // Only auto-fill storage for Sony Walkman (each model has fixed storage)
                    if (brand.trim().toLowerCase() === 'sony') {
                      const opts = getRelicStorageOptions(value);
                      if (opts.length === 1 && opts[0] !== NO_STORAGE_OPTION) setStorage(opts[0]);
                    }
                  }}
                  disabled={relicModelsLoading}
                  className="w-full h-12 bg-relay-surface dark:bg-relay-surface-dark border border-relay-border dark:border-relay-border-dark rounded-lg text-relay-text dark:text-relay-text-dark px-4 text-sm"
                >
                  <option value="">{relicModelsLoading ? 'Loading...' : 'Select model'}</option>
                  {relicModels.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              )}
              {category === 'Gaming Handhelds' && (
                <select value={modelName} onChange={(e) => setModelName(e.target.value)} disabled={handheldModelsLoading} className="w-full h-12 bg-relay-surface dark:bg-relay-surface-dark border border-relay-border dark:border-relay-border-dark rounded-lg text-relay-text dark:text-relay-text-dark px-4 text-sm">
                  <option value="">{handheldModelsLoading ? 'Loading...' : 'Select model'}</option>
                  {handheldModels.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              )}
              {category === 'Video Games' && (
                <select value={modelName} onChange={(e) => setModelName(e.target.value)} disabled={videoGameConsolesLoading} className="w-full h-12 bg-relay-surface dark:bg-relay-surface-dark border border-relay-border dark:border-relay-border-dark rounded-lg text-relay-text dark:text-relay-text-dark px-4 text-sm">
                  <option value="">{!brand.trim() ? 'Select brand first' : videoGameConsolesLoading ? 'Loading...' : 'Select console (NTSC USA)'}</option>
                  {videoGameConsoles.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              {!['Laptops','Phones','Tablets','MP3','Gaming Handhelds','Video Games'].includes(category) && !accessoryType && (
                <input
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="e.g. iPhone 15 Pro"
                  className="w-full h-12 bg-relay-surface dark:bg-relay-surface-dark border border-relay-border dark:border-relay-border-dark rounded-lg text-relay-text dark:text-relay-text-dark px-4 text-sm"
                />
              )}
            </div>
            {category === 'Video Games' && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest text-relay-muted dark:text-relay-muted-light uppercase">Name</label>
                  <SearchableGameDropdown
                    value={videoGameName}
                    onChange={setVideoGameName}
                    consoleName={modelName}
                    placeholder="Search games..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest text-relay-muted dark:text-relay-muted-light uppercase">Condition</label>
                  <select value={videoGameCondition} onChange={(e) => setVideoGameCondition(e.target.value)} className="w-full h-12 bg-relay-surface dark:bg-relay-surface-dark border border-relay-border dark:border-relay-border-dark rounded-lg text-relay-text dark:text-relay-text-dark px-4 text-sm">
                    <option value="">Select condition</option>
                    <option value="Loose cartridge">Loose</option>
                    <option value="CIB (cart + box + manual)">CIB (cart + box + manual)</option>
                  </select>
                </div>
              </>
            )}
            {category !== 'Video Games' && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest text-relay-muted dark:text-relay-muted-light uppercase">Color</label>
                <select value={color} onChange={(e) => setColor(e.target.value)} disabled={colorOptionsLoading} className="w-full h-12 bg-relay-surface dark:bg-relay-surface-dark border border-relay-border dark:border-relay-border-dark rounded-lg text-relay-text dark:text-relay-text-dark px-4 text-sm">
                  <option value="">{colorOptionsLoading ? 'Loading...' : 'Select color (optional)'}</option>
                  {color && !colorOptions.includes(color) ? <option value={color}>{color}</option> : null}
                  {colorOptions.map((c: string) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
            {category === 'Tablets' && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest text-relay-muted dark:text-relay-muted-light uppercase">Carrier</label>
                <select value={carrier} onChange={(e) => setCarrier(e.target.value)} className="w-full h-12 bg-relay-surface dark:bg-relay-surface-dark border border-relay-border dark:border-relay-border-dark rounded-lg text-relay-text dark:text-relay-text-dark px-4 text-sm">
                  <option value="Wifi">Wifi</option>
                  <option value="Unlocked">Unlocked</option>
                </select>
              </div>
            )}
            {!['Laptops', 'Tablets', 'Headphones', 'Speaker', 'Console', 'Video Games', 'MP3', 'Gaming Handhelds'].includes(category) && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest text-relay-muted dark:text-relay-muted-light uppercase">Carrier</label>
                <select value={carrier} onChange={(e) => setCarrier(e.target.value)} className="w-full h-12 bg-relay-surface dark:bg-relay-surface-dark border border-relay-border dark:border-relay-border-dark rounded-lg text-relay-text dark:text-relay-text-dark px-4 text-sm">
                  <option value="Unlocked">Unlocked</option>
                  <option value="AT&T">AT&T</option>
                  <option value="T-Mobile">T‑Mobile</option>
                  <option value="Verizon">Verizon</option>
                  <option value="Google Fi">Google Fi</option>
                  <option value="Other carriers">Other carriers</option>
                </select>
              </div>
            )}
            {category === 'Tablets' && (tabletYearOptions.length > 0 || tabletSizeOptions.length > 0) && (
              <div className="grid grid-cols-2 gap-4">
                {tabletYearOptions.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-widest text-relay-muted dark:text-relay-muted-light uppercase">Year</label>
                    <select value={year} onChange={(e) => setYear(e.target.value)} disabled={tabletOptionsLoading} className="w-full h-12 bg-relay-surface dark:bg-relay-surface-dark border border-relay-border dark:border-relay-border-dark rounded-lg text-relay-text dark:text-relay-text-dark px-4 text-sm">
                      <option value="">Select year (optional)</option>
                      {tabletYearOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                )}
                {tabletSizeOptions.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-widest text-relay-muted dark:text-relay-muted-light uppercase">Size</label>
                    <select value={size} onChange={(e) => setSize(e.target.value)} disabled={tabletOptionsLoading} className="w-full h-12 bg-relay-surface dark:bg-relay-surface-dark border border-relay-border dark:border-relay-border-dark rounded-lg text-relay-text dark:text-relay-text-dark px-4 text-sm">
                      <option value="">Select size (optional)</option>
                      {tabletSizeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}
            {category === 'Laptops' && modelName.trim() && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest text-relay-muted dark:text-relay-muted-light uppercase">Processor</label>
                <select value={chipCpu} onChange={(e) => setChipCpu(e.target.value)} disabled={laptopOptionsLoading} className="w-full h-12 bg-relay-surface dark:bg-relay-surface-dark border border-relay-border dark:border-relay-border-dark rounded-lg text-relay-text dark:text-relay-text-dark px-4 text-sm">
                  <option value="">{laptopOptionsLoading ? 'Loading...' : 'Select processor'}</option>
                  {laptopChipOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            )}
            {category === 'Laptops' && (laptopYearOptionsFrom2020.length > 0 || laptopRamOptions.length > 0 || laptopSizeOptions.length > 0) && (
              <div className="grid grid-cols-2 gap-4">
                {laptopYearOptionsFrom2020.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-widest text-relay-muted dark:text-relay-muted-light uppercase">Year</label>
                    <select value={year} onChange={(e) => setYear(e.target.value)} disabled={laptopOptionsLoading} className="w-full h-12 bg-relay-surface dark:bg-relay-surface-dark border border-relay-border dark:border-relay-border-dark rounded-lg text-relay-text dark:text-relay-text-dark px-4 text-sm">
                      <option value="">Select year</option>
                      {laptopYearOptionsFrom2020.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                )}
                {laptopRamOptions.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-widest text-relay-muted dark:text-relay-muted-light uppercase">RAM</label>
                    <select value={ram} onChange={(e) => setRam(e.target.value)} disabled={laptopOptionsLoading} className="w-full h-12 bg-relay-surface dark:bg-relay-surface-dark border border-relay-border dark:border-relay-border-dark rounded-lg text-relay-text dark:text-relay-text-dark px-4 text-sm">
                      <option value="">Select RAM</option>
                      {laptopRamOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                )}
                {laptopSizeOptions.length > 0 && (
                  <div className="space-y-2 col-span-2">
                    <label className="text-[10px] font-bold tracking-widest text-relay-muted dark:text-relay-muted-light uppercase">Size</label>
                    <select value={size} onChange={(e) => setSize(e.target.value)} disabled={laptopOptionsLoading} className="w-full h-12 bg-relay-surface dark:bg-relay-surface-dark border border-relay-border dark:border-relay-border-dark rounded-lg text-relay-text dark:text-relay-text-dark px-4 text-sm">
                      <option value="">Select size</option>
                      {laptopSizeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}
            {category !== 'Video Games' && (
              <div className="grid grid-cols-2 gap-4">
                {hasStorage && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-widest text-relay-muted dark:text-relay-muted-light uppercase">Storage</label>
                    <select value={hasStorage ? effectiveStorage : storage} onChange={(e) => setStorage(e.target.value)} className="w-full h-12 bg-relay-surface dark:bg-relay-surface-dark border border-relay-border dark:border-relay-border-dark rounded-lg text-relay-text dark:text-relay-text-dark px-4 text-sm">
                      {category === 'MP3'
                        ? relicStorageOptions.map((s) => <option key={s} value={s}>{s}</option>)
                        : category === 'Laptops'
                          ? laptopStorageOptions.map((s) => <option key={s} value={s}>{s}</option>)
                          : category === 'Console'
                            ? consoleStorageOptions.map((s) => <option key={s} value={s}>{s}</option>)
                            : (['64GB', '128GB', '256GB', '512GB', '1TB'] as const).map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest text-relay-muted dark:text-relay-muted-light uppercase">{identifierLabel}</label>
                  <input value={imei} onChange={(e) => setImei(e.target.value)} placeholder={identifierLabel === 'IMEI Number' ? '15-digit' : 'Serial #'} className="w-full h-12 bg-relay-surface dark:bg-relay-surface-dark border border-relay-border dark:border-relay-border-dark rounded-lg text-relay-text dark:text-relay-text-dark px-4 text-sm" />
                </div>
              </div>
            )}
            {category === 'Tablets' && carrier === 'Unlocked' && imei.trim().length > 0 && imei.trim().length < 15 && (
              <p className="text-amber-600 dark:text-amber-400 text-xs">IMEI must be 15 digits for Unlocked iPad.</p>
            )}
          </div>
        )}

        {/* Step 2 (Phone): Verification */}
        {isPhoneFlow && currentStep === 2 && (
          <div className="space-y-8">
            <div className="space-y-3">
              <p className="text-sm text-relay-muted dark:text-relay-muted-light leading-relaxed">
                {isGooglePhone
                  ? <>Upload a screenshot of your phone&apos;s <strong className="font-semibold text-relay-text dark:text-relay-text-dark">About</strong> page. For Google Pixel we also need a Storage page screenshot, and if you selected Unlocked, a screenshot of Developer Options with &quot;OEM unlocking&quot; toggled on.</>
                  : <>Upload a screenshot of your phone&apos;s <strong className="font-semibold text-relay-text dark:text-relay-text-dark">About</strong> page. We&apos;ll verify IMEI, carrier, and storage match.</>}
              </p>
            </div>

            {/* About page upload */}
            <div className="flex flex-col items-center gap-3">
              <span className="text-[10px] font-bold tracking-widest text-relay-muted dark:text-relay-muted-light uppercase">About Page Screenshot</span>
              {aboutScreenshotPreviewUrl ? (
                <label className="cursor-pointer w-full">
                  <input type="file" accept="image/*" onChange={handleAboutScreenshotChange} className="sr-only" />
                  <div className="rounded-2xl overflow-hidden border border-relay-border dark:border-relay-border-dark max-h-48">
                    <img src={aboutScreenshotPreviewUrl} alt="About screenshot" className="w-full h-auto object-contain max-h-48" />
                  </div>
                </label>
              ) : (
                <label className="inline-flex items-center justify-center size-14 rounded-xl bg-primary text-white text-2xl font-light cursor-pointer hover:opacity-90 shadow-lg shadow-primary/20 transition-opacity active-scale">
                  <input type="file" accept="image/*" onChange={handleAboutScreenshotChange} className="sr-only" />
                  +
                </label>
              )}
            </div>

            {isGooglePhone && (
              <>
                <div className="flex flex-col items-center gap-3">
                  <span className="text-[10px] font-bold tracking-widest text-relay-muted dark:text-relay-muted-light uppercase">Storage Page Screenshot</span>
                  <p className="text-xs text-relay-muted dark:text-relay-muted-light">Settings → Storage</p>
                  {storageScreenshotPreviewUrl ? (
                    <label className="cursor-pointer w-full">
                      <input type="file" accept="image/*" onChange={handleStorageScreenshotChange} className="sr-only" />
                      <div className="rounded-2xl overflow-hidden border border-relay-border dark:border-relay-border-dark max-h-48">
                        <img src={storageScreenshotPreviewUrl} alt="Storage screenshot" className="w-full h-auto object-contain max-h-48" />
                      </div>
                    </label>
                  ) : (
                    <label className="inline-flex items-center justify-center size-14 rounded-xl bg-primary text-white text-2xl font-light cursor-pointer hover:opacity-90 shadow-lg shadow-primary/20 transition-opacity active-scale">
                      <input type="file" accept="image/*" onChange={handleStorageScreenshotChange} className="sr-only" />
                      +
                    </label>
                  )}
                </div>
                {requireOemUnlockingScreenshot && (
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-[10px] font-bold tracking-widest text-relay-muted dark:text-relay-muted-light uppercase">OEM Unlocking (Developer Options)</span>
                    <p className="text-xs text-relay-muted dark:text-relay-muted-light">Settings → Developer options → OEM unlocking toggled ON</p>
                    {oemUnlockingScreenshotPreviewUrl ? (
                      <label className="cursor-pointer w-full">
                        <input type="file" accept="image/*" onChange={handleOemUnlockingScreenshotChange} className="sr-only" />
                        <div className="rounded-2xl overflow-hidden border border-relay-border dark:border-relay-border-dark max-h-48">
                          <img src={oemUnlockingScreenshotPreviewUrl} alt="OEM unlocking screenshot" className="w-full h-auto object-contain max-h-48" />
                        </div>
                      </label>
                    ) : (
                      <label className="inline-flex items-center justify-center size-14 rounded-xl bg-primary text-white text-2xl font-light cursor-pointer hover:opacity-90 shadow-lg shadow-primary/20 transition-opacity active-scale">
                        <input type="file" accept="image/*" onChange={handleOemUnlockingScreenshotChange} className="sr-only" />
                        +
                      </label>
                    )}
                  </div>
                )}
              </>
            )}

            {verificationStatus === 'failed' && (
              <div className="p-4 rounded-2xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark">
                <p className="text-sm text-relay-text dark:text-relay-text-dark/80">{verificationMessage}</p>
              </div>
            )}
            {verificationStatus === 'passed' && (
              <div className="p-4 rounded-2xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">check_circle</span>
                <p className="text-sm text-relay-text dark:text-relay-text-dark">{verificationMessage}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 2 (Tablet Unlocked): IMEI verification */}
        {isTabletFlow && currentStep === 2 && isTabletUnlocked && (
          <div className="space-y-8">
            <div className="space-y-3">
              <p className="text-sm text-relay-muted dark:text-relay-muted-light leading-relaxed">
                Upload a screenshot of your iPad&apos;s <strong className="font-semibold text-relay-text dark:text-relay-text-dark">About</strong> page (Settings → General → About) showing the IMEI.
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <span className="text-[10px] font-bold tracking-widest text-relay-muted dark:text-relay-muted-light uppercase">About Page Screenshot</span>
              {aboutScreenshotPreviewUrl ? (
                <label className="cursor-pointer w-full">
                  <input type="file" accept="image/*" onChange={handleAboutScreenshotChange} className="sr-only" />
                  <div className="rounded-2xl overflow-hidden border border-relay-border dark:border-relay-border-dark max-h-48">
                    <img src={aboutScreenshotPreviewUrl} alt="About screenshot" className="w-full h-auto object-contain max-h-48" />
                  </div>
                </label>
              ) : (
                <label className="inline-flex items-center justify-center size-14 rounded-xl bg-primary text-white text-2xl font-light cursor-pointer hover:opacity-90 shadow-lg shadow-primary/20 transition-opacity active-scale">
                  <input type="file" accept="image/*" onChange={handleAboutScreenshotChange} className="sr-only" />
                  +
                </label>
              )}
            </div>
            {verificationStatus === 'failed' && (
              <div className="p-4 rounded-xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark">
                <p className="text-sm text-relay-text dark:text-relay-text-dark/80">{verificationMessage}</p>
              </div>
            )}
            {verificationStatus === 'passed' && (
              <div className="p-4 rounded-xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">check_circle</span>
                <p className="text-sm text-relay-text dark:text-relay-text-dark">{verificationMessage}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 2 (Laptop / Tablet Wifi): Serial verification */}
        {((isLaptopFlow || (isTabletFlow && !isTabletUnlocked)) && currentStep === 2) && (
          <div className="space-y-8">
            <div className="space-y-3">
              <p className="text-sm text-relay-muted dark:text-relay-muted-light leading-relaxed">
                Upload a screenshot showing the serial number (e.g. About This Mac, Settings → About, or the serial on the device/label).
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <span className="text-[10px] font-bold tracking-widest text-relay-muted dark:text-relay-muted-light uppercase">Serial Number Screenshot</span>
              {laptopSerialScreenshotPreviewUrl ? (
                <label className="cursor-pointer w-full">
                  <input type="file" accept="image/*" onChange={handleLaptopSerialScreenshotChange} className="sr-only" />
                  <div className="rounded-2xl overflow-hidden border border-relay-border dark:border-relay-border-dark max-h-48">
                    <img src={laptopSerialScreenshotPreviewUrl} alt="Serial screenshot" className="w-full h-auto object-contain max-h-48" />
                  </div>
                </label>
              ) : (
                <label className="inline-flex items-center justify-center size-14 rounded-xl bg-primary text-white text-2xl font-light cursor-pointer hover:opacity-90 shadow-lg shadow-primary/20 transition-opacity active-scale">
                  <input type="file" accept="image/*" onChange={handleLaptopSerialScreenshotChange} className="sr-only" />
                  +
                </label>
              )}
            </div>
            {laptopVerificationStatus === 'failed' && (
              <div className="p-4 rounded-xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark">
                <p className="text-sm text-relay-text dark:text-relay-text-dark/80">{laptopVerificationMessage}</p>
              </div>
            )}
            {laptopVerificationStatus === 'passed' && (
              <div className="p-4 rounded-xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">check_circle</span>
                <p className="text-sm text-relay-text dark:text-relay-text-dark">{laptopVerificationMessage}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 3 (phone/laptop/tablet) / 2 (other, not Video Games): Front condition — Video Games uses 4-step flow, step 2 = Functionality */}
        {((isPhoneFlow && currentStep === 3) || (isLaptopFlow && currentStep === 3) || (isTabletFlow && currentStep === 3) || (!isPhoneFlow && !isLaptopFlow && !isTabletFlow && currentStep === 2 && !isVideoGamesFlow)) && (
          <div className="space-y-6">
            <ConditionStepPart
              question={isConsoleLikeFlow ? 'How does the device look?' : 'How does the front look?'}
              value={frontCondition}
              onChange={(v) => setFrontCondition(v)}
              onClear={() => { setFrontCondition(null); setBatteryHealth(''); }}
              category={isConsoleLikeFlow ? category : undefined}
              showBatteryHealth={hasBatteryHealth}
              batteryHealth={batteryHealth}
              onBatteryHealthChange={(v) => setBatteryHealth(v)}
            />
          </div>
        )}

        {/* Step 4 (phone) / 3 (non-phone, 6-step only): Back condition — skipped for Console, Headphones, Gaming Handhelds, Speaker */}
        {((isPhoneFlow && currentStep === 4) || (isLaptopFlow && currentStep === 4) || (isTabletFlow && currentStep === 4) || (!isPhoneFlow && !isLaptopFlow && !isTabletFlow && !isConsoleLikeFlow && currentStep === 3)) && (
          <div className="space-y-6">
            <ConditionStepPart
              question="How does the back look?"
              value={backCondition}
              onChange={(v) => setBackCondition(v)}
              variant="back"
            />
          </div>
        )}

        {/* Step 5 (phone) / 4 (non-phone 6-step) / 3 (non-phone 5-step) / 2 (Video Games 4-step): Functionality */}
        {((isPhoneFlow && currentStep === 5) || (isLaptopFlow && currentStep === 5) || (isTabletFlow && currentStep === 5) || (!isPhoneFlow && !isLaptopFlow && !isTabletFlow && (((isConsoleLikeFlow && !isVideoGamesFlow) && currentStep === 3) || (isVideoGamesFlow && currentStep === 2) || (!isConsoleLikeFlow && !isVideoGamesFlow && currentStep === 4)))) && (
          <div className="space-y-6">
            {isConsoleLikeFlow || isVideoGamesFlow ? (
              <>
                <h2 className="text-lg font-semibold text-relay-text dark:text-relay-text-dark">
                  {category === 'Console' && 'Is your console functional?'}
                  {category === 'Video Games' && 'Is your Disc/Cartridge functional?'}
                  {category === 'Headphones' && 'Are your headphones functional?'}
                  {category === 'Gaming Handhelds' && 'Is your gaming handheld functional?'}
                  {category === 'MP3' && 'Is your MP3 player functional?'}
                  {category === 'Speaker' && 'Is your speaker functional?'}
                </h2>
                {category !== 'Gaming Handhelds' && (
                  <ul className="list-disc list-inside text-sm text-relay-muted dark:text-relay-muted-light space-y-2">
                    {category === 'Video Games' ? (
                      <>
                        <li>The disc/cartridge is free of deep scratches or cracks.</li>
                        <li>The game loads and plays without freezing or errors.</li>
                        <li>There is no water damage or corrosion on the contacts.</li>
                      </>
                    ) : (
                      <>
                        <li>All features work without exception.</li>
                        <li>The device turns on, turns off, and charges.</li>
                        <li>There are no bugs.</li>
                      </>
                    )}
                  </ul>
                )}
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Important:</strong> {category === 'Video Games' ? "We don't accept bent and/or oxidized items." : "Accessories must be provided if they're necessary to use the item, like a charger or HDMI cable. We don't accept bent and/or oxidized items."}
                  </p>
                </div>
                {category === 'Gaming Handhelds' ? (
                  <>
                    <p className="text-sm text-relay-muted dark:text-relay-muted-light">Select all that apply.</p>
                    <div className="space-y-1.5">
                      {HANDHELD_FUNCTIONALITY_CHECKS.map((text) => (
                        <label
                          key={text}
                          className="flex items-start gap-2.5 p-2.5 rounded-lg border-2 border-relay-border dark:border-relay-border-dark bg-relay-surface dark:bg-relay-surface-dark cursor-pointer hover:border-relay-muted transition-colors"
                          onClick={() => handleToggleHandheldCheck(text)}
                        >
                          <span
                            className={`w-4 h-4 rounded-full mt-0.5 flex-shrink-0 flex items-center justify-center border-2 ${
                              functionalityOptions.includes(text)
                                ? 'border-transparent bg-primary'
                                : 'bg-white border-[#C2C2C2] opacity-60'
                            }`}
                          >
                            {functionalityOptions.includes(text) && (
                              <span className="w-1.5 h-1.5 rounded-full bg-relay-bg dark:bg-relay-bg-dark" />
                            )}
                          </span>
                          <span className="text-sm text-relay-text dark:text-relay-text-dark">{text}</span>
                        </label>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    {(['Yes', 'No'] as const).map((option) => (
                      <label
                        key={option}
                        className="flex items-center gap-3 p-4 rounded-xl border-2 border-relay-border dark:border-relay-border-dark bg-relay-surface dark:bg-relay-surface-dark cursor-pointer hover:border-relay-muted transition-colors"
                        onClick={() => setConsoleFunctional(option === 'Yes')}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center border-2 ${
                            consoleFunctional === (option === 'Yes')
                              ? 'border-transparent bg-primary'
                              : 'bg-white border-[#C2C2C2] opacity-60'
                          }`}
                        >
                          {consoleFunctional === (option === 'Yes') && <span className="w-2 h-2 rounded-full bg-relay-bg dark:bg-relay-bg-dark" />}
                        </span>
                        <span className="text-sm font-medium text-relay-text dark:text-relay-text-dark">{option}</span>
                      </label>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-relay-text dark:text-relay-text-dark">Is it functional?</h2>
                <p className="text-sm text-relay-muted dark:text-relay-muted-light">Select all that apply.</p>
                <div className="space-y-3">
                  {FUNCTIONALITY_CHECKS.map(({ text }) => (
                    <label
                      key={text}
                      className="flex items-start gap-3 p-4 rounded-xl border-2 border-relay-border dark:border-relay-border-dark bg-relay-surface dark:bg-relay-surface-dark cursor-pointer hover:border-relay-muted transition-colors"
                      onClick={() => toggleFunctionality(text)}
                    >
                      <span
                        className={`w-5 h-5 rounded mt-0.5 flex-shrink-0 flex items-center justify-center border-2 ${
                          functionalityOptions.includes(text)
                            ? 'border-transparent bg-primary'
                            : 'bg-white border-[#C2C2C2] opacity-60'
                        }`}
                      >
                        {functionalityOptions.includes(text) && <span className="material-symbols-outlined !text-xs text-white">check</span>}
                      </span>
                      <span className="text-sm text-relay-text dark:text-relay-text-dark">{text}</span>
                    </label>
                  ))}
                </div>
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Important:</strong> iCloud, Google, or any other accounts must be disconnected whether your item is functional or not. We don&apos;t accept bent and/or oxidized items.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 6 (phone) / 5 (non-phone) / 4 (Video Games): Photos */}
        {((isPhoneFlow && currentStep === 6) || (isLaptopFlow && currentStep === 6) || (isTabletFlow && currentStep === 6) || (!isPhoneFlow && !isLaptopFlow && !isTabletFlow && (((isConsoleLikeFlow && !isVideoGamesFlow) && currentStep === 4) || (isVideoGamesFlow && currentStep === 3) || (!isConsoleLikeFlow && !isVideoGamesFlow && currentStep === 5)))) && (
          <div className="space-y-6">
            <div className="rounded-xl border border-relay-border dark:border-relay-border-dark bg-[#faf9f6] dark:bg-[#1a1916] p-5 space-y-3">
              <div className="flex items-center gap-2"><span className="material-symbols-outlined text-primary !text-lg">verified</span><span className="text-[10px] font-bold tracking-[0.2em] text-primary uppercase">Verification Code</span></div>
              <div className="flex justify-center py-3"><span className="text-4xl font-mono font-bold tracking-[0.4em] text-relay-text dark:text-relay-text-dark select-all">{verificationCode}</span></div>
              <p className="text-xs text-relay-muted dark:text-relay-muted-light">Write this code on paper and place it next to your device when taking photos.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold tracking-widest text-relay-muted dark:text-relay-muted-light uppercase">Photos</label>
                <p className="text-xs text-relay-muted dark:text-relay-muted-light">{listingPhotoUrls.length} / {minListingPhotos} Captured</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={openDeviceCapture} disabled={!userId} className="aspect-square rounded-xl border-2 border-dashed border-relay-border dark:border-relay-border-dark flex flex-col items-center justify-center gap-2 bg-transparent hover:bg-relay-surface dark:hover:bg-relay-surface-dark disabled:opacity-50 overflow-hidden">
                  {listingPhotoUrls[0] ? (
                    <div className="relative w-full h-full rounded-lg overflow-hidden">
                      <img src={listingPhotoUrls[0]} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={(e) => { e.stopPropagation(); removeListingPhoto(0); }} className="absolute top-1 right-1 size-6 rounded-full bg-relay-text dark:bg-relay-text-dark text-relay-bg flex items-center justify-center"><span className="material-symbols-outlined !text-sm">close</span></button>
                    </div>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-relay-muted dark:text-relay-muted-light !text-2xl">photo_camera</span>
                      <span className="text-[10px] font-semibold tracking-widest text-relay-muted dark:text-relay-muted-light uppercase">Add Photo</span>
                    </>
                  )}
                </button>
                <button type="button" onClick={openDeviceCapture} disabled={!userId} className="aspect-square rounded-xl border border-relay-border dark:border-relay-border-dark flex flex-col items-center justify-center bg-[#e8e9ec] dark:bg-relay-surface-dark hover:bg-relay-surface dark:hover:bg-relay-surface disabled:opacity-50 overflow-hidden">
                  {listingPhotoUrls[1] ? (
                    <div className="relative w-full h-full rounded-lg overflow-hidden">
                      <img src={listingPhotoUrls[1]} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={(e) => { e.stopPropagation(); removeListingPhoto(1); }} className="absolute top-1 right-1 size-6 rounded-full bg-relay-text dark:bg-relay-text-dark text-relay-bg flex items-center justify-center"><span className="material-symbols-outlined !text-sm">close</span></button>
                    </div>
                  ) : (
                    <span className="text-xs font-medium text-relay-muted dark:text-relay-muted-light">BACK SIDE</span>
                  )}
                </button>
              </div>
              {minListingPhotos > 2 && (
                <div className="flex flex-wrap gap-3 pt-2">
                  {listingPhotoUrls.slice(2).map((url, i) => (
                    <div key={url} className="relative aspect-square w-24 rounded-xl overflow-hidden border border-relay-border dark:border-relay-border-dark bg-relay-bg dark:bg-relay-bg-dark">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeListingPhoto(i + 2)} className="absolute top-1 right-1 size-6 rounded-full bg-relay-text dark:bg-relay-text-dark text-relay-bg flex items-center justify-center"><span className="material-symbols-outlined !text-sm">close</span></button>
                    </div>
                  ))}
                  {listingPhotoUrls.length < minListingPhotos && (
                    <button type="button" onClick={openDeviceCapture} disabled={!userId} className="aspect-square w-24 rounded-xl border-2 border-dashed border-relay-border dark:border-relay-border-dark flex items-center justify-center hover:bg-relay-surface dark:hover:bg-relay-surface-dark bg-relay-bg dark:bg-relay-bg-dark disabled:opacity-50">
                      <span className="material-symbols-outlined text-relay-muted dark:text-relay-muted-light !text-2xl">add</span>
                    </button>
                  )}
                </div>
              )}
            {photoError && (
              <p className="text-[10px] text-relay-text dark:text-relay-text-dark/80">
                {photoError}
              </p>
            )}
            </div>
            {conditionError && (
              <p className="text-sm text-relay-text dark:text-relay-text-dark/80">
                {conditionError}
              </p>
            )}
            {swappaLookupError && (
              <p className="text-sm text-relay-text dark:text-relay-text-dark/80">
                {swappaLookupError}
              </p>
            )}
            {category === 'Phones' && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest text-relay-muted dark:text-relay-muted-light uppercase">Included Accessories</label>
                {[{ id: 'Charging Cable', show: true }, { id: 'SIM Ejector Pin', show: !hideSimPin }, { id: 'S Pen', show: showSPen }, { id: 'Original Box', show: true }].filter((a) => a.show).map((a) => (
                  <label key={a.id} className="flex items-center gap-3 cursor-pointer" onClick={() => toggleAccessory(a.id)}>
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${accessories.includes(a.id) ? 'border-transparent bg-primary' : 'border-relay-border dark:border-relay-border-dark'}`}>{accessories.includes(a.id) && <span className="w-2 h-2 rounded-full bg-relay-bg dark:bg-relay-bg-dark" />}</span>
                    <span className="text-[9px] tracking-widest text-relay-muted">{a.id}</span>
                  </label>
                ))}
              </div>
            )}
            {category === 'Console' && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest text-relay-muted dark:text-relay-muted-light uppercase">
                  Included Accessories
                </label>
                {CONSOLE_ACCESSORY_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => toggleAccessory(opt.id)}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        accessories.includes(opt.id)
                          ? 'border-transparent bg-primary'
                          : 'border-relay-border dark:border-relay-border-dark'
                      }`}
                    >
                      {accessories.includes(opt.id) && (
                        <span className="w-2 h-2 rounded-full bg-relay-bg dark:bg-relay-bg-dark" />
                      )}
                    </span>
                    <span className="text-[9px] tracking-widest text-relay-muted">
                      {opt.id}
                      {opt.required ? ' (required)' : ''}
                    </span>
                  </label>
                ))}
              </div>
            )}
            {category === 'Tablets' && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest text-relay-muted dark:text-relay-muted-light uppercase">
                  Included Accessories
                </label>
                {TABLET_ACCESSORY_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => toggleAccessory(opt.id)}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        accessories.includes(opt.id)
                          ? 'border-transparent bg-primary'
                          : 'border-relay-border dark:border-relay-border-dark'
                      }`}
                    >
                      {accessories.includes(opt.id) && (
                        <span className="w-2 h-2 rounded-full bg-relay-bg dark:bg-relay-bg-dark" />
                      )}
                    </span>
                    <span className="text-[9px] tracking-widest text-relay-muted">
                      {opt.id}
                    </span>
                  </label>
                ))}
              </div>
            )}
            {category === 'Laptops' && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest text-relay-muted dark:text-relay-muted-light uppercase">
                  Included Accessories
                </label>
                {LAPTOP_ACCESSORY_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => toggleAccessory(opt.id)}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        accessories.includes(opt.id)
                          ? 'border-transparent bg-primary'
                          : 'border-relay-border dark:border-relay-border-dark'
                      }`}
                    >
                      {accessories.includes(opt.id) && (
                        <span className="w-2 h-2 rounded-full bg-relay-bg dark:bg-relay-bg-dark" />
                      )}
                    </span>
                    <span className="text-[9px] tracking-widest text-relay-muted">
                      {opt.id}
                    </span>
                  </label>
                ))}
              </div>
            )}
            {category === 'Gaming Handhelds' && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest text-relay-muted dark:text-relay-muted-light uppercase">
                  Included Accessories
                </label>
                {HANDHELD_ACCESSORY_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => toggleAccessory(opt.id)}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        accessories.includes(opt.id)
                          ? 'border-transparent bg-primary'
                          : 'border-relay-border dark:border-relay-border-dark'
                      }`}
                    >
                      {accessories.includes(opt.id) && (
                        <span className="w-2 h-2 rounded-full bg-relay-bg dark:bg-relay-bg-dark" />
                      )}
                    </span>
                    <span className="text-[9px] tracking-widest text-relay-muted">
                      {opt.id}
                    </span>
                  </label>
                ))}
              </div>
            )}
            {category === 'Headphones' && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest text-relay-muted dark:text-relay-muted-light uppercase">
                  Included Accessories
                </label>
                {HEADPHONES_ACCESSORY_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => toggleAccessory(opt.id)}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        accessories.includes(opt.id)
                          ? 'border-transparent bg-primary'
                          : 'border-relay-border dark:border-relay-border-dark'
                      }`}
                    >
                      {accessories.includes(opt.id) && (
                        <span className="w-2 h-2 rounded-full bg-relay-bg dark:bg-relay-bg-dark" />
                      )}
                    </span>
                    <span className="text-[9px] tracking-widest text-relay-muted">
                      {opt.id}
                    </span>
                  </label>
                ))}
              </div>
            )}
            {category === 'Speaker' && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest text-relay-muted dark:text-relay-muted-light uppercase">
                  Included Accessories
                </label>
                {SPEAKER_ACCESSORY_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => toggleAccessory(opt.id)}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        accessories.includes(opt.id)
                          ? 'border-transparent bg-primary'
                          : 'border-relay-border dark:border-relay-border-dark'
                      }`}
                    >
                      {accessories.includes(opt.id) && (
                        <span className="w-2 h-2 rounded-full bg-relay-bg dark:bg-relay-bg-dark" />
                      )}
                    </span>
                    <span className="text-[9px] tracking-widest text-relay-muted">
                      {opt.id}
                    </span>
                  </label>
                ))}
              </div>
            )}
            {category === 'MP3' && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest text-relay-muted dark:text-relay-muted-light uppercase">
                  Included Accessories
                </label>
                {MP3_ACCESSORY_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => toggleAccessory(opt.id)}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        accessories.includes(opt.id)
                          ? 'border-transparent bg-primary'
                          : 'border-relay-border dark:border-relay-border-dark'
                      }`}
                    >
                      {accessories.includes(opt.id) && (
                        <span className="w-2 h-2 rounded-full bg-relay-bg dark:bg-relay-bg-dark" />
                      )}
                    </span>
                    <span className="text-[9px] tracking-widest text-relay-muted">
                      {opt.id}
                    </span>
                  </label>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-[10px] font-bold tracking-widest text-relay-muted dark:text-relay-muted-light uppercase">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Any additional details..." className="w-full bg-relay-surface dark:bg-relay-surface-dark border border-relay-border dark:border-relay-border-dark rounded-lg text-relay-text dark:text-relay-text-dark p-4 text-base min-h-20" />
            </div>
          </div>
        )}

        {/* Step 7 (phone) / 6 (non-phone 6-step) / 5 (non-phone 5-step) / 4 (Video Games): Review */}
        {((isPhoneFlow && currentStep === 7) || (isLaptopFlow && currentStep === 7) || (isTabletFlow && currentStep === 7) || (!isPhoneFlow && !isLaptopFlow && !isTabletFlow && ((isConsoleLikeFlow && currentStep === 5) || (isVideoGamesFlow && currentStep === 4) || (!isConsoleLikeFlow && !isVideoGamesFlow && currentStep === 6)))) && (
          <div className="space-y-8 py-4">
            {category === 'Laptops' && laptopSupported === false && laptopMessage && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center">
                <p className="text-amber-700 dark:text-amber-400 font-medium">{laptopMessage}</p>
              </div>
            )}
            <div className="space-y-3 p-5 rounded-2xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark">
              <p className="text-[10px] font-bold tracking-widest text-relay-muted dark:text-relay-muted-light uppercase">Listing location</p>
              {listingLocation && <p className="text-sm font-medium">{[listingLocation.city, listingLocation.state].filter(Boolean).join(', ') || 'Location set'}</p>}
              {locationError && (
                <p className="text-[10px] text-relay-text dark:text-relay-text-dark/80">
                  {locationError}
                </p>
              )}
              <button type="button" onClick={requestListingLocation} disabled={locationLoading} className="w-full flex items-center justify-center gap-2 text-primary text-[10px] font-bold tracking-widest no-underline disabled:opacity-60 mt-2">
                {locationLoading ? <span className="size-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0" /> : <span className="material-symbols-outlined !text-lg shrink-0">location_on</span>}
                <span className="underline-offset-2 uppercase">{listingLocation ? 'Update location' : 'Use my location'}</span>
              </button>
            </div>
            {listingLocation && (
              <LocationMapWithAvatar
                latitude={listingLocation.latitude}
                longitude={listingLocation.longitude}
                avatarUrl={userAvatarUrl}
                alt="Your location"
                className="mt-3"
              />
            )}
            {swappaLookupError && <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4"><p className="text-amber-700 dark:text-amber-400 text-sm text-center">{swappaLookupError}</p><p className="text-amber-600 dark:text-amber-300 text-xs mt-1">Valuation is based on condition estimate. Go back to Step 1 to select model for market-based pricing.</p></div>}
            {submitError && (
              <div className="rounded-xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark p-4">
                <p className="text-sm text-center text-relay-text dark:text-relay-text-dark/80">
                  {submitError}
                </p>
              </div>
            )}
            {!authChecked ? <p className="text-relay-muted text-sm text-center">Checking sign-in...</p> : null}
            {authChecked && !userId && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 text-center">
                <p className="text-amber-700 dark:text-amber-400 text-sm">Sign in to list.</p>
                <NextStepButton type="button" onClick={() => router.push('/login')} className="mt-3 px-8 py-3 rounded-xl tracking-widest">
                  GO TO LOG IN
                </NextStepButton>
              </div>
            )}
            {!hasEnoughPhotos && !(isVideoGamesFlow && consoleFunctional === false) && <p className="text-[10px] text-amber-600 font-medium">Complete the camera flow before listing.</p>}
          </div>
        )}
      </div>

      <ListingStepFooter {...footerProps} />
    </div>
  );
}
