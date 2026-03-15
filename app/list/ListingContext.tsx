'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';

export const VALUATION_STORAGE_KEY = 'relay_listing_valuation';
export const LISTING_DRAFT_KEY = 'relay_listing_draft';

/** Serializable listing draft (no File or blob URLs). */
export interface ListingDraft {
  step: number;
  savedAt: number;
  category: string;
  brand: string;
  modelName: string;
  condition: string | null;
  frontCondition: string | null;
  backCondition: string | null;
  sideTop: string | null;
  sideBottom: string | null;
  sideLeft: string | null;
  sideRight: string | null;
  conditionPercentage: number | null;
  storage: string;
  ram: string;
  color: string;
  carrier: string;
  imei: string;
  description: string;
  accessories: string[];
  functionalityOptions: string[];
  /** Console only: true = Yes, false = No, null = not answered */
  consoleFunctional: boolean | null;
  verificationCode: string;
  listingLocation: { latitude: number; longitude: number; city: string; state: string } | null;
  /** Only persisted if URLs are http/https (not blob) */
  listingPhotoUrls: string[];
  swappaCredits: number | null;
  swappaPrice: number | null;
  chipCpu: string;
  year: string;
  size: string;
  verificationStatus: 'idle' | 'verifying' | 'passed' | 'failed';
  verificationMessage: string;
  laptopSerialNumber: string;
  laptopVerificationStatus: 'idle' | 'verifying' | 'passed' | 'failed';
  laptopVerificationMessage: string;
  /** Video Games only */
  videoGameName: string;
  videoGameCondition: string;
  /** Battery health percentage string (e.g. "87"). Phones, Tablets, Laptops, Gaming Handhelds, MP3 only. */
  batteryHealth: string;
}

function persistValuation(credits: number | null, price: number | null) {
  if (typeof window === 'undefined') return;
  try {
    if (credits == null) sessionStorage.removeItem(VALUATION_STORAGE_KEY);
    else sessionStorage.setItem(VALUATION_STORAGE_KEY, JSON.stringify({ credits, price: price ?? null }));
  } catch {}
}

// ============================================================
// Catalog Context — API-loaded brand/model options.
// Memoized separately so components subscribing ONLY to catalog
// data won't re-render on every keystroke in the form.
// Use `useListingCatalog()` in step pages that need dropdowns.
// ============================================================
export interface ListingCatalogValue {
  laptopModels: string[];
  setLaptopModels: (v: string[]) => void;
  laptopModelsLoading: boolean;
  setLaptopModelsLoading: (v: boolean) => void;
  laptopChipOptions: string[];
  setLaptopChipOptions: (v: string[]) => void;
  laptopYearOptions: string[];
  setLaptopYearOptions: (v: string[]) => void;
  laptopRamOptions: string[];
  setLaptopRamOptions: (v: string[]) => void;
  laptopSizeOptions: string[];
  setLaptopSizeOptions: (v: string[]) => void;
  laptopOptionsLoading: boolean;
  setLaptopOptionsLoading: (v: boolean) => void;
  phoneBrands: string[];
  setPhoneBrands: (v: string[]) => void;
  phoneBrandsLoading: boolean;
  setPhoneBrandsLoading: (v: boolean) => void;
  phoneModels: string[];
  setPhoneModels: (v: string[]) => void;
  phoneModelsLoading: boolean;
  setPhoneModelsLoading: (v: boolean) => void;
  tabletBrands: string[];
  setTabletBrands: (v: string[]) => void;
  tabletBrandsLoading: boolean;
  setTabletBrandsLoading: (v: boolean) => void;
  tabletModels: string[];
  setTabletModels: (v: string[]) => void;
  tabletModelsLoading: boolean;
  setTabletModelsLoading: (v: boolean) => void;
  tabletYearOptions: string[];
  setTabletYearOptions: (v: string[]) => void;
  tabletSizeOptions: string[];
  setTabletSizeOptions: (v: string[]) => void;
  tabletOptionsLoading: boolean;
  setTabletOptionsLoading: (v: boolean) => void;
  accessoryBrands: string[];
  setAccessoryBrands: (v: string[]) => void;
  accessoryBrandsLoading: boolean;
  setAccessoryBrandsLoading: (v: boolean) => void;
  accessoryModels: string[];
  setAccessoryModels: (v: string[]) => void;
  accessoryModelsLoading: boolean;
  setAccessoryModelsLoading: (v: boolean) => void;
  relicBrands: string[];
  setRelicBrands: (v: string[]) => void;
  relicBrandsLoading: boolean;
  setRelicBrandsLoading: (v: boolean) => void;
  relicModels: string[];
  setRelicModels: (v: string[]) => void;
  relicModelsLoading: boolean;
  setRelicModelsLoading: (v: boolean) => void;
  handheldBrands: string[];
  setHandheldBrands: (v: string[]) => void;
  handheldBrandsLoading: boolean;
  setHandheldBrandsLoading: (v: boolean) => void;
  handheldModels: string[];
  setHandheldModels: (v: string[]) => void;
  handheldModelsLoading: boolean;
  setHandheldModelsLoading: (v: boolean) => void;
  videoGameConsoles: string[];
  setVideoGameConsoles: (v: string[]) => void;
  videoGameConsolesLoading: boolean;
  setVideoGameConsolesLoading: (v: boolean) => void;
  dynamicColorOptions: string[] | null;
  setDynamicColorOptions: (v: string[] | null) => void;
  colorOptionsLoading: boolean;
  setColorOptionsLoading: (v: boolean) => void;
}

const ListingCatalogCtx = createContext<ListingCatalogValue | null>(null);

// ============================================================
// Main Listing Context
// ============================================================
export interface ListingContextValue {
  // Auth
  userId: string | null;
  authChecked: boolean;
  setUserId: (v: string | null) => void;
  setAuthChecked: (v: boolean) => void;

  // Core form
  category: string;
  setCategory: (v: string) => void;
  brand: string;
  setBrand: (v: string) => void;
  modelName: string;
  setModelName: (v: string) => void;
  condition: string | null;
  setCondition: (v: string | null) => void;
  frontCondition: string | null;
  setFrontCondition: (v: string | null) => void;
  backCondition: string | null;
  setBackCondition: (v: string | null) => void;
  sideTop: string | null;
  setSideTop: (v: string | null) => void;
  sideBottom: string | null;
  setSideBottom: (v: string | null) => void;
  sideLeft: string | null;
  setSideLeft: (v: string | null) => void;
  sideRight: string | null;
  setSideRight: (v: string | null) => void;
  conditionPercentage: number | null;
  setConditionPercentage: (v: number | null) => void;
  conditionAnalyzing: boolean;
  setConditionAnalyzing: (v: boolean) => void;
  conditionError: string | null;
  setConditionError: (v: string | null) => void;

  // Specs
  storage: string;
  setStorage: (v: string) => void;
  ram: string;
  setRam: (v: string) => void;
  color: string;
  setColor: (v: string) => void;
  carrier: string;
  setCarrier: (v: string) => void;
  imei: string;
  setImei: (v: string) => void;
  videoGameName: string;
  setVideoGameName: (v: string) => void;
  videoGameCondition: string;
  setVideoGameCondition: (v: string) => void;
  batteryHealth: string;
  setBatteryHealth: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  accessories: string[];
  setAccessories: (v: string[]) => void;
  toggleAccessory: (item: string) => void;
  functionalityOptions: string[];
  setFunctionalityOptions: (v: string[]) => void;
  toggleFunctionality: (item: string) => void;
  consoleFunctional: boolean | null;
  setConsoleFunctional: (v: boolean | null) => void;
  verificationCode: string;

  // Swappa / credits
  swappaCredits: number | null;
  setSwappaCredits: (v: number | null) => void;
  swappaPrice: number | null;
  setSwappaPrice: (v: number | null) => void;
  swappaLookupError: string | null;
  setSwappaLookupError: (v: string | null) => void;

  // Location
  listingLocation: { latitude: number; longitude: number; city: string; state: string } | null;
  setListingLocation: (v: { latitude: number; longitude: number; city: string; state: string } | null) => void;
  locationLoading: boolean;
  setLocationLoading: (v: boolean) => void;
  locationError: string | null;
  setLocationError: (v: string | null) => void;

  // Photos
  listingPhotoUrls: string[];
  setListingPhotoUrls: (v: string[] | ((prev: string[]) => string[])) => void;
  photoUploading: boolean;
  setPhotoUploading: (v: boolean) => void;
  photoError: string | null;
  setPhotoError: (v: string | null) => void;

  // Laptop
  chipCpu: string;
  setChipCpu: (v: string) => void;
  year: string;
  setYear: (v: string) => void;
  size: string;
  setSize: (v: string) => void;
  laptopCredits: number | null;
  setLaptopCredits: (v: number | null) => void;
  laptopSupported: boolean | null;
  setLaptopSupported: (v: boolean | null) => void;
  laptopMessage: string | null;
  setLaptopMessage: (v: string | null) => void;

  // Loading / API data (also in ListingCatalogValue — kept here for useListing() backward compat)
  laptopModels: string[];
  setLaptopModels: (v: string[]) => void;
  laptopModelsLoading: boolean;
  setLaptopModelsLoading: (v: boolean) => void;
  laptopChipOptions: string[];
  setLaptopChipOptions: (v: string[]) => void;
  laptopYearOptions: string[];
  setLaptopYearOptions: (v: string[]) => void;
  laptopRamOptions: string[];
  setLaptopRamOptions: (v: string[]) => void;
  laptopSizeOptions: string[];
  setLaptopSizeOptions: (v: string[]) => void;
  laptopOptionsLoading: boolean;
  setLaptopOptionsLoading: (v: boolean) => void;
  phoneBrands: string[];
  setPhoneBrands: (v: string[]) => void;
  phoneBrandsLoading: boolean;
  setPhoneBrandsLoading: (v: boolean) => void;
  phoneModels: string[];
  setPhoneModels: (v: string[]) => void;
  phoneModelsLoading: boolean;
  setPhoneModelsLoading: (v: boolean) => void;
  tabletBrands: string[];
  setTabletBrands: (v: string[]) => void;
  tabletBrandsLoading: boolean;
  setTabletBrandsLoading: (v: boolean) => void;
  tabletModels: string[];
  setTabletModels: (v: string[]) => void;
  tabletModelsLoading: boolean;
  setTabletModelsLoading: (v: boolean) => void;
  tabletYearOptions: string[];
  setTabletYearOptions: (v: string[]) => void;
  tabletSizeOptions: string[];
  setTabletSizeOptions: (v: string[]) => void;
  tabletOptionsLoading: boolean;
  setTabletOptionsLoading: (v: boolean) => void;
  accessoryBrands: string[];
  setAccessoryBrands: (v: string[]) => void;
  accessoryBrandsLoading: boolean;
  setAccessoryBrandsLoading: (v: boolean) => void;
  accessoryModels: string[];
  setAccessoryModels: (v: string[]) => void;
  accessoryModelsLoading: boolean;
  setAccessoryModelsLoading: (v: boolean) => void;
  relicBrands: string[];
  setRelicBrands: (v: string[]) => void;
  relicBrandsLoading: boolean;
  setRelicBrandsLoading: (v: boolean) => void;
  relicModels: string[];
  setRelicModels: (v: string[]) => void;
  relicModelsLoading: boolean;
  setRelicModelsLoading: (v: boolean) => void;
  handheldBrands: string[];
  setHandheldBrands: (v: string[]) => void;
  handheldBrandsLoading: boolean;
  setHandheldBrandsLoading: (v: boolean) => void;
  handheldModels: string[];
  setHandheldModels: (v: string[]) => void;
  handheldModelsLoading: boolean;
  setHandheldModelsLoading: (v: boolean) => void;
  videoGameConsoles: string[];
  setVideoGameConsoles: (v: string[]) => void;
  videoGameConsolesLoading: boolean;
  setVideoGameConsolesLoading: (v: boolean) => void;
  dynamicColorOptions: string[] | null;
  setDynamicColorOptions: (v: string[] | null) => void;
  colorOptionsLoading: boolean;
  setColorOptionsLoading: (v: boolean) => void;

  // Verification (phones)
  aboutScreenshotFile: File | null;
  setAboutScreenshotFile: (v: File | null) => void;
  aboutScreenshotPreviewUrl: string | null;
  setAboutScreenshotPreviewUrl: (v: string | null) => void;
  storageScreenshotFile: File | null;
  setStorageScreenshotFile: (v: File | null) => void;
  storageScreenshotPreviewUrl: string | null;
  setStorageScreenshotPreviewUrl: (v: string | null) => void;
  oemUnlockingScreenshotFile: File | null;
  setOemUnlockingScreenshotFile: (v: File | null) => void;
  oemUnlockingScreenshotPreviewUrl: string | null;
  setOemUnlockingScreenshotPreviewUrl: (v: string | null) => void;
  verificationStatus: 'idle' | 'verifying' | 'passed' | 'failed';
  setVerificationStatus: (v: 'idle' | 'verifying' | 'passed' | 'failed') => void;
  verificationMessage: string;
  setVerificationMessage: (v: string) => void;

  // Laptop serial verification
  laptopSerialScreenshotFile: File | null;
  setLaptopSerialScreenshotFile: (v: File | null) => void;
  laptopSerialScreenshotPreviewUrl: string | null;
  setLaptopSerialScreenshotPreviewUrl: (v: string | null) => void;
  laptopSerialNumber: string;
  setLaptopSerialNumber: (v: string) => void;
  laptopVerificationStatus: 'idle' | 'verifying' | 'passed' | 'failed';
  setLaptopVerificationStatus: (v: 'idle' | 'verifying' | 'passed' | 'failed') => void;
  laptopVerificationMessage: string;
  setLaptopVerificationMessage: (v: string) => void;

  // UI
  deviceCaptureOpen: boolean;
  setDeviceCaptureOpen: (v: boolean) => void;
  isValuating: boolean;
  setIsValuating: (v: boolean) => void;
  isSubmitting: boolean;
  setIsSubmitting: (v: boolean) => void;
  submitError: string | null;
  setSubmitError: (v: string | null) => void;
  showCelebration: boolean;
  setShowCelebration: (v: boolean) => void;
  celebrationCredits: number;
  setCelebrationCredits: (v: number) => void;

  // Draft
  saveDraft: (step: number) => void;
  loadDraft: () => { step: number } | null;
  clearDraft: () => void;
  hasDraft: () => boolean;
  /** Ref set to true when user clicks "Resume draft"; prevents showing resume modal when they go back to step 1. Reset when they leave the list or start new. Ref is used so the value is available synchronously after navigation. */
  hasResumedDraftRef: React.MutableRefObject<boolean>;

  // Leave confirmation (save draft popup when navigating away)
  showLeaveModal: boolean;
  setShowLeaveModal: (v: boolean) => void;
  pendingLeaveCallback: (() => void) | null;
  setPendingLeaveCallback: (cb: (() => void) | null) => void;
  requestLeave: (navigateAway: () => void) => void;
  hasProgress: (step: number) => boolean;
}

const ListingContext = createContext<ListingContextValue | null>(null);

function generateVerificationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/** Shape of the ref used by saveDraft to read latest state without deps. */
type FormSnap = Omit<ListingDraft, 'step' | 'savedAt'>;

export function ListingProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [category, setCategory] = useState('Phones');
  const [brand, setBrand] = useState('Apple');
  const [modelName, setModelName] = useState('');
  const [condition, setCondition] = useState<string | null>(null);
  const [frontCondition, setFrontCondition] = useState<string | null>(null);
  const [backCondition, setBackCondition] = useState<string | null>(null);
  const [sideTop, setSideTop] = useState<string | null>(null);
  const [sideBottom, setSideBottom] = useState<string | null>(null);
  const [sideLeft, setSideLeft] = useState<string | null>(null);
  const [sideRight, setSideRight] = useState<string | null>(null);
  const [conditionPercentage, setConditionPercentage] = useState<number | null>(null);
  const [conditionAnalyzing, setConditionAnalyzing] = useState(false);
  const [conditionError, setConditionError] = useState<string | null>(null);
  const [swappaCredits, setSwappaCreditsState] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const s = sessionStorage.getItem(VALUATION_STORAGE_KEY);
      if (!s) return null;
      const { credits } = JSON.parse(s) as { credits?: number; price?: number };
      return credits != null && credits > 0 ? credits : null;
    } catch {
      return null;
    }
  });
  const [swappaPrice, setSwappaPriceState] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const s = sessionStorage.getItem(VALUATION_STORAGE_KEY);
      if (!s) return null;
      const { price } = JSON.parse(s) as { credits?: number; price?: number };
      return price != null && price > 0 ? price : null;
    } catch {
      return null;
    }
  });
  const setSwappaCredits = useCallback((v: number | null) => {
    setSwappaCreditsState(v);
    persistValuation(v, null);
  }, []);
  const setSwappaPrice = useCallback((v: number | null) => {
    setSwappaPriceState(v);
    if (typeof window !== 'undefined') {
      try {
        const s = sessionStorage.getItem(VALUATION_STORAGE_KEY);
        const prev = s ? (JSON.parse(s) as { credits?: number; price?: number }) : {};
        persistValuation(prev.credits ?? null, v);
      } catch {}
    }
  }, []);

  // Rehydrate from sessionStorage when we have null but storage has valuation (e.g. after navigation remount)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (swappaCredits != null && swappaCredits > 0) return;
    try {
      const s = sessionStorage.getItem(VALUATION_STORAGE_KEY);
      if (!s) return;
      const { credits, price } = JSON.parse(s) as { credits?: number; price?: number };
      if (credits != null && credits > 0) {
        setSwappaCreditsState(credits);
        if (price != null && price > 0) setSwappaPriceState(price);
      }
    } catch {}
  }, [swappaCredits]);

  const [swappaLookupError, setSwappaLookupError] = useState<string | null>(null);
  const [storage, setStorage] = useState('128GB');
  const [ram, setRam] = useState('16GB');
  const [description, setDescription] = useState('');
  const [accessories, setAccessories] = useState<string[]>([]);
  const [functionalityOptions, setFunctionalityOptions] = useState<string[]>([]);
  const [consoleFunctional, setConsoleFunctional] = useState<boolean | null>(null);
  const [verificationCode, setVerificationCodeState] = useState('------');
  useEffect(() => {
    if (verificationCode !== '------') return;
    setVerificationCodeState(generateVerificationCode());
  }, [verificationCode]);
  const [imei, setImei] = useState('');
  const [videoGameName, setVideoGameName] = useState('');
  const [videoGameCondition, setVideoGameCondition] = useState('');
  const [batteryHealth, setBatteryHealth] = useState('');
  const [color, setColor] = useState('');
  const [carrier, setCarrier] = useState('Unlocked');
  const [listingLocation, setListingLocation] = useState<{
    latitude: number;
    longitude: number;
    city: string;
    state: string;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [listingPhotoUrls, setListingPhotoUrls] = useState<string[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [chipCpu, setChipCpu] = useState('');
  const [year, setYear] = useState('');
  const [size, setSize] = useState('');
  const [laptopModels, setLaptopModels] = useState<string[]>([]);
  const [laptopModelsLoading, setLaptopModelsLoading] = useState(false);
  const [laptopChipOptions, setLaptopChipOptions] = useState<string[]>([]);
  const [laptopYearOptions, setLaptopYearOptions] = useState<string[]>([]);
  const [laptopRamOptions, setLaptopRamOptions] = useState<string[]>([]);
  const [laptopSizeOptions, setLaptopSizeOptions] = useState<string[]>([]);
  const [laptopOptionsLoading, setLaptopOptionsLoading] = useState(false);
  const [laptopCredits, setLaptopCredits] = useState<number | null>(null);
  const [laptopSupported, setLaptopSupported] = useState<boolean | null>(null);
  const [laptopMessage, setLaptopMessage] = useState<string | null>(null);
  const [phoneBrands, setPhoneBrands] = useState<string[]>([]);
  const [phoneBrandsLoading, setPhoneBrandsLoading] = useState(false);
  const [phoneModels, setPhoneModels] = useState<string[]>([]);
  const [phoneModelsLoading, setPhoneModelsLoading] = useState(false);
  const [tabletBrands, setTabletBrands] = useState<string[]>([]);
  const [tabletBrandsLoading, setTabletBrandsLoading] = useState(false);
  const [tabletModels, setTabletModels] = useState<string[]>([]);
  const [tabletModelsLoading, setTabletModelsLoading] = useState(false);
  const [tabletYearOptions, setTabletYearOptions] = useState<string[]>([]);
  const [tabletSizeOptions, setTabletSizeOptions] = useState<string[]>([]);
  const [tabletOptionsLoading, setTabletOptionsLoading] = useState(false);
  const [accessoryBrands, setAccessoryBrands] = useState<string[]>([]);
  const [accessoryBrandsLoading, setAccessoryBrandsLoading] = useState(false);
  const [accessoryModels, setAccessoryModels] = useState<string[]>([]);
  const [accessoryModelsLoading, setAccessoryModelsLoading] = useState(false);
  const [relicBrands, setRelicBrands] = useState<string[]>([]);
  const [relicBrandsLoading, setRelicBrandsLoading] = useState(false);
  const [relicModels, setRelicModels] = useState<string[]>([]);
  const [relicModelsLoading, setRelicModelsLoading] = useState(false);
  const [handheldBrands, setHandheldBrands] = useState<string[]>([]);
  const [handheldBrandsLoading, setHandheldBrandsLoading] = useState(false);
  const [handheldModels, setHandheldModels] = useState<string[]>([]);
  const [handheldModelsLoading, setHandheldModelsLoading] = useState(false);
  const [videoGameConsoles, setVideoGameConsoles] = useState<string[]>([]);
  const [videoGameConsolesLoading, setVideoGameConsolesLoading] = useState(false);
  const [dynamicColorOptions, setDynamicColorOptions] = useState<string[] | null>(null);
  const [colorOptionsLoading, setColorOptionsLoading] = useState(false);
  const [aboutScreenshotFile, setAboutScreenshotFile] = useState<File | null>(null);
  const [aboutScreenshotPreviewUrl, setAboutScreenshotPreviewUrl] = useState<string | null>(null);
  const [storageScreenshotFile, setStorageScreenshotFile] = useState<File | null>(null);
  const [storageScreenshotPreviewUrl, setStorageScreenshotPreviewUrl] = useState<string | null>(null);
  const [oemUnlockingScreenshotFile, setOemUnlockingScreenshotFile] = useState<File | null>(null);
  const [oemUnlockingScreenshotPreviewUrl, setOemUnlockingScreenshotPreviewUrl] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'passed' | 'failed'>('idle');
  const [verificationMessage, setVerificationMessage] = useState('');
  const [laptopSerialScreenshotFile, setLaptopSerialScreenshotFile] = useState<File | null>(null);
  const [laptopSerialScreenshotPreviewUrl, setLaptopSerialScreenshotPreviewUrl] = useState<string | null>(null);
  const [laptopSerialNumber, setLaptopSerialNumber] = useState('');
  const [laptopVerificationStatus, setLaptopVerificationStatus] = useState<'idle' | 'verifying' | 'passed' | 'failed'>('idle');
  const [laptopVerificationMessage, setLaptopVerificationMessage] = useState('');
  const [deviceCaptureOpen, setDeviceCaptureOpen] = useState(false);
  const [isValuating, setIsValuating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationCredits, setCelebrationCredits] = useState(0);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [pendingLeaveCallback, setPendingLeaveCallback] = useState<(() => void) | null>(null);
  const hasResumedDraftRef = useRef(false);

  // ──────────────────────────────────────────────────────────
  // formStateRef — always holds the latest form snapshot.
  // saveDraft reads from this ref so it needs ZERO deps,
  // eliminating the previous 30+ dependency array that caused
  // a new function reference (and subscriber re-renders) on
  // every single keystroke.
  // ──────────────────────────────────────────────────────────
  const formStateRef = useRef<FormSnap>({
    category: 'Phones',
    brand: 'Apple',
    modelName: '',
    condition: null,
    frontCondition: null,
    backCondition: null,
    sideTop: null,
    sideBottom: null,
    sideLeft: null,
    sideRight: null,
    conditionPercentage: null,
    storage: '128GB',
    ram: '16GB',
    color: '',
    carrier: 'Unlocked',
    imei: '',
    description: '',
    accessories: [],
    functionalityOptions: [],
    consoleFunctional: null,
    verificationCode: '------',
    listingLocation: null,
    listingPhotoUrls: [],
    swappaCredits: null,
    swappaPrice: null,
    chipCpu: '',
    year: '',
    size: '',
    verificationStatus: 'idle',
    verificationMessage: '',
    laptopSerialNumber: '',
    laptopVerificationStatus: 'idle',
    laptopVerificationMessage: '',
    videoGameName: '',
    videoGameCondition: '',
    batteryHealth: '',
  });

  // Sync ref after every render (no cleanup needed — the ref is just a read).
  useEffect(() => {
    formStateRef.current = {
      category,
      brand,
      modelName,
      condition,
      frontCondition,
      backCondition,
      sideTop,
      sideBottom,
      sideLeft,
      sideRight,
      conditionPercentage,
      storage,
      ram,
      color,
      carrier,
      imei,
      description,
      accessories,
      functionalityOptions,
      consoleFunctional,
      verificationCode,
      listingLocation,
      listingPhotoUrls,
      swappaCredits,
      swappaPrice,
      chipCpu,
      year,
      size,
      verificationStatus,
      verificationMessage,
      laptopSerialNumber,
      laptopVerificationStatus,
      laptopVerificationMessage,
      videoGameName,
      videoGameCondition,
      batteryHealth,
    };
  });

  const hasProgress = useCallback((step: number) => {
    return step > 1 || category !== 'Phones' || brand !== 'Apple' || modelName.trim() !== '';
  }, [category, brand, modelName]);

  const requestLeave = useCallback((navigateAway: () => void) => {
    setPendingLeaveCallback(() => navigateAway);
    setShowLeaveModal(true);
  }, []);

  const toggleAccessory = useCallback((item: string) => {
    setAccessories((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    );
  }, []);

  const toggleFunctionality = useCallback((item: string) => {
    setFunctionalityOptions((prev) =>
      prev.includes(item) ? prev.filter((f) => f !== item) : [...prev, item]
    );
  }, []);

  /**
   * Persist a draft to localStorage.
   * Reads from formStateRef so the dep array stays empty — this function
   * reference never changes, preventing subscriber re-renders on keystrokes.
   */
  const saveDraft = useCallback((step: number) => {
    if (typeof window === 'undefined') return;
    try {
      const s = formStateRef.current;
      const photoUrls = s.listingPhotoUrls.filter(
        (u) => typeof u === 'string' && (u.startsWith('http://') || u.startsWith('https://'))
      );
      const draft: ListingDraft = {
        step,
        savedAt: Date.now(),
        category: s.category,
        brand: s.brand,
        modelName: s.modelName,
        condition: s.condition,
        frontCondition: s.frontCondition,
        backCondition: s.backCondition,
        sideTop: s.sideTop,
        sideBottom: s.sideBottom,
        sideLeft: s.sideLeft,
        sideRight: s.sideRight,
        conditionPercentage: s.conditionPercentage,
        storage: s.storage,
        ram: s.ram,
        color: s.color,
        carrier: s.carrier,
        imei: s.imei,
        description: s.description,
        accessories: [...s.accessories],
        functionalityOptions: [...s.functionalityOptions],
        consoleFunctional: s.consoleFunctional,
        verificationCode: s.verificationCode,
        listingLocation: s.listingLocation ? { ...s.listingLocation } : null,
        listingPhotoUrls: photoUrls,
        swappaCredits: s.swappaCredits,
        swappaPrice: s.swappaPrice,
        chipCpu: s.chipCpu,
        year: s.year,
        size: s.size,
        verificationStatus: s.verificationStatus,
        verificationMessage: s.verificationMessage,
        laptopSerialNumber: s.laptopSerialNumber,
        laptopVerificationStatus: s.laptopVerificationStatus,
        laptopVerificationMessage: s.laptopVerificationMessage,
        videoGameName: s.videoGameName,
        videoGameCondition: s.videoGameCondition,
        batteryHealth: s.batteryHealth,
      };
      window.localStorage.setItem(LISTING_DRAFT_KEY, JSON.stringify(draft));
      if (s.swappaCredits != null || s.swappaPrice != null) {
        persistValuation(s.swappaCredits, s.swappaPrice);
      }
    } catch {}
  }, []); // ← intentionally empty: reads from formStateRef instead of closing over state

  const loadDraft = useCallback((): { step: number } | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(LISTING_DRAFT_KEY);
      if (!raw) return null;
      const draft = JSON.parse(raw) as ListingDraft;
      if (!draft || typeof draft.step !== 'number') return null;
      setCategory(draft.category ?? 'Phones');
      setBrand(draft.brand ?? '');
      setModelName(draft.modelName ?? '');
      setCondition(draft.condition ?? null);
      setFrontCondition(draft.frontCondition ?? null);
      setBackCondition(draft.backCondition ?? null);
      setSideTop(draft.sideTop ?? null);
      setSideBottom(draft.sideBottom ?? null);
      setSideLeft(draft.sideLeft ?? null);
      setSideRight(draft.sideRight ?? null);
      setConditionPercentage(draft.conditionPercentage ?? null);
      setStorage(draft.storage ?? '128GB');
      setRam(draft.ram ?? '16GB');
      setColor(draft.color ?? '');
      setCarrier(draft.carrier ?? 'Unlocked');
      setImei(draft.imei ?? '');
      setDescription(draft.description ?? '');
      setAccessories(draft.accessories ?? []);
      setFunctionalityOptions(draft.functionalityOptions ?? []);
      setConsoleFunctional(draft.consoleFunctional ?? null);
      setListingLocation(draft.listingLocation ?? null);
      setListingPhotoUrls(draft.listingPhotoUrls ?? []);
      setSwappaCreditsState(draft.swappaCredits ?? null);
      setSwappaPriceState(draft.swappaPrice ?? null);
      if (draft.swappaCredits != null || draft.swappaPrice != null) {
        persistValuation(draft.swappaCredits ?? null, draft.swappaPrice ?? null);
      }
      setChipCpu(draft.chipCpu ?? '');
      setYear(draft.year ?? '');
      setSize(draft.size ?? '');
      setVerificationStatus(draft.verificationStatus ?? 'idle');
      setVerificationMessage(draft.verificationMessage ?? '');
      setLaptopSerialNumber(draft.laptopSerialNumber ?? '');
      setLaptopVerificationStatus(draft.laptopVerificationStatus ?? 'idle');
      setLaptopVerificationMessage(draft.laptopVerificationMessage ?? '');
      setVideoGameName(draft.videoGameName ?? '');
      setVideoGameCondition(draft.videoGameCondition ?? '');
      setBatteryHealth(draft.batteryHealth ?? '');
      return { step: draft.step };
    } catch {
      return null;
    }
  }, []);

  const clearDraft = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(LISTING_DRAFT_KEY);
    } catch {}
  }, []);

  const hasDraft = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      return !!window.localStorage.getItem(LISTING_DRAFT_KEY);
    } catch {
      return false;
    }
  }, []);

  // ──────────────────────────────────────────────────────────
  // Catalog context value — memoized by catalog data only.
  // Components using useListingCatalog() will NOT re-render
  // when form fields (category, brand, description, etc.) change.
  // ──────────────────────────────────────────────────────────
  const catalogValue = useMemo<ListingCatalogValue>(() => ({
    laptopModels, setLaptopModels,
    laptopModelsLoading, setLaptopModelsLoading,
    laptopChipOptions, setLaptopChipOptions,
    laptopYearOptions, setLaptopYearOptions,
    laptopRamOptions, setLaptopRamOptions,
    laptopSizeOptions, setLaptopSizeOptions,
    laptopOptionsLoading, setLaptopOptionsLoading,
    phoneBrands, setPhoneBrands,
    phoneBrandsLoading, setPhoneBrandsLoading,
    phoneModels, setPhoneModels,
    phoneModelsLoading, setPhoneModelsLoading,
    tabletBrands, setTabletBrands,
    tabletBrandsLoading, setTabletBrandsLoading,
    tabletModels, setTabletModels,
    tabletModelsLoading, setTabletModelsLoading,
    tabletYearOptions, setTabletYearOptions,
    tabletSizeOptions, setTabletSizeOptions,
    tabletOptionsLoading, setTabletOptionsLoading,
    accessoryBrands, setAccessoryBrands,
    accessoryBrandsLoading, setAccessoryBrandsLoading,
    accessoryModels, setAccessoryModels,
    accessoryModelsLoading, setAccessoryModelsLoading,
    relicBrands, setRelicBrands,
    relicBrandsLoading, setRelicBrandsLoading,
    relicModels, setRelicModels,
    relicModelsLoading, setRelicModelsLoading,
    handheldBrands, setHandheldBrands,
    handheldBrandsLoading, setHandheldBrandsLoading,
    handheldModels, setHandheldModels,
    handheldModelsLoading, setHandheldModelsLoading,
    videoGameConsoles, setVideoGameConsoles,
    videoGameConsolesLoading, setVideoGameConsolesLoading,
    dynamicColorOptions, setDynamicColorOptions,
    colorOptionsLoading, setColorOptionsLoading,
  }), [
    laptopModels, laptopModelsLoading, laptopChipOptions, laptopYearOptions,
    laptopRamOptions, laptopSizeOptions, laptopOptionsLoading,
    phoneBrands, phoneBrandsLoading, phoneModels, phoneModelsLoading,
    tabletBrands, tabletBrandsLoading, tabletModels, tabletModelsLoading,
    tabletYearOptions, tabletSizeOptions, tabletOptionsLoading,
    accessoryBrands, accessoryBrandsLoading, accessoryModels, accessoryModelsLoading,
    relicBrands, relicBrandsLoading, relicModels, relicModelsLoading,
    handheldBrands, handheldBrandsLoading, handheldModels, handheldModelsLoading,
    videoGameConsoles, videoGameConsolesLoading,
    dynamicColorOptions, colorOptionsLoading,
  ]);

  const value: ListingContextValue = {
    userId,
    authChecked,
    setUserId,
    setAuthChecked,
    category,
    setCategory,
    brand,
    setBrand,
    modelName,
    setModelName,
    condition,
    setCondition,
    frontCondition,
    setFrontCondition,
    backCondition,
    setBackCondition,
    sideTop,
    setSideTop,
    sideBottom,
    setSideBottom,
    sideLeft,
    setSideLeft,
    sideRight,
    setSideRight,
    conditionPercentage,
    setConditionPercentage,
    conditionAnalyzing,
    setConditionAnalyzing,
    conditionError,
    setConditionError,
    storage,
    setStorage,
    ram,
    setRam,
    color,
    setColor,
    carrier,
    setCarrier,
    imei,
    setImei,
    videoGameName,
    setVideoGameName,
    videoGameCondition,
    setVideoGameCondition,
    batteryHealth,
    setBatteryHealth,
    description,
    setDescription,
    accessories,
    setAccessories,
    toggleAccessory,
    functionalityOptions,
    setFunctionalityOptions,
    toggleFunctionality,
    consoleFunctional,
    setConsoleFunctional,
    verificationCode,
    swappaCredits,
    setSwappaCredits,
    swappaPrice,
    setSwappaPrice,
    swappaLookupError,
    setSwappaLookupError,
    listingLocation,
    setListingLocation,
    locationLoading,
    setLocationLoading,
    locationError,
    setLocationError,
    listingPhotoUrls,
    setListingPhotoUrls,
    photoUploading,
    setPhotoUploading,
    photoError,
    setPhotoError,
    chipCpu,
    setChipCpu,
    year,
    setYear,
    size,
    setSize,
    laptopCredits,
    setLaptopCredits,
    laptopSupported,
    setLaptopSupported,
    laptopMessage,
    setLaptopMessage,
    laptopModels,
    setLaptopModels,
    laptopModelsLoading,
    setLaptopModelsLoading,
    laptopChipOptions,
    setLaptopChipOptions,
    laptopYearOptions,
    setLaptopYearOptions,
    laptopRamOptions,
    setLaptopRamOptions,
    laptopSizeOptions,
    setLaptopSizeOptions,
    laptopOptionsLoading,
    setLaptopOptionsLoading,
    phoneBrands,
    setPhoneBrands,
    phoneBrandsLoading,
    setPhoneBrandsLoading,
    phoneModels,
    setPhoneModels,
    phoneModelsLoading,
    setPhoneModelsLoading,
    tabletBrands,
    setTabletBrands,
    tabletBrandsLoading,
    setTabletBrandsLoading,
    tabletModels,
    setTabletModels,
    tabletModelsLoading,
    setTabletModelsLoading,
    tabletYearOptions,
    setTabletYearOptions,
    tabletSizeOptions,
    setTabletSizeOptions,
    tabletOptionsLoading,
    setTabletOptionsLoading,
    accessoryBrands,
    setAccessoryBrands,
    accessoryBrandsLoading,
    setAccessoryBrandsLoading,
    accessoryModels,
    setAccessoryModels,
    accessoryModelsLoading,
    setAccessoryModelsLoading,
    relicBrands,
    setRelicBrands,
    relicBrandsLoading,
    setRelicBrandsLoading,
    relicModels,
    setRelicModels,
    relicModelsLoading,
    setRelicModelsLoading,
    handheldBrands,
    setHandheldBrands,
    handheldBrandsLoading,
    setHandheldBrandsLoading,
    handheldModels,
    setHandheldModels,
    handheldModelsLoading,
    setHandheldModelsLoading,
    videoGameConsoles,
    setVideoGameConsoles,
    videoGameConsolesLoading,
    setVideoGameConsolesLoading,
    dynamicColorOptions,
    setDynamicColorOptions,
    colorOptionsLoading,
    setColorOptionsLoading,
    aboutScreenshotFile,
    setAboutScreenshotFile,
    aboutScreenshotPreviewUrl,
    setAboutScreenshotPreviewUrl,
    storageScreenshotFile,
    setStorageScreenshotFile,
    storageScreenshotPreviewUrl,
    setStorageScreenshotPreviewUrl,
    oemUnlockingScreenshotFile,
    setOemUnlockingScreenshotFile,
    oemUnlockingScreenshotPreviewUrl,
    setOemUnlockingScreenshotPreviewUrl,
    verificationStatus,
    setVerificationStatus,
    verificationMessage,
    setVerificationMessage,
    laptopSerialScreenshotFile,
    setLaptopSerialScreenshotFile,
    laptopSerialScreenshotPreviewUrl,
    setLaptopSerialScreenshotPreviewUrl,
    laptopSerialNumber,
    setLaptopSerialNumber,
    laptopVerificationStatus,
    setLaptopVerificationStatus,
    laptopVerificationMessage,
    setLaptopVerificationMessage,
    deviceCaptureOpen,
    setDeviceCaptureOpen,
    isValuating,
    setIsValuating,
    isSubmitting,
    setIsSubmitting,
    submitError,
    setSubmitError,
    showCelebration,
    setShowCelebration,
    celebrationCredits,
    setCelebrationCredits,
    saveDraft,
    loadDraft,
    clearDraft,
    hasDraft,
    hasResumedDraftRef,
    showLeaveModal,
    setShowLeaveModal,
    pendingLeaveCallback,
    setPendingLeaveCallback,
    requestLeave,
    hasProgress,
  };

  return (
    <ListingCatalogCtx.Provider value={catalogValue}>
      <ListingContext.Provider value={value}>{children}</ListingContext.Provider>
    </ListingCatalogCtx.Provider>
  );
}

/** Full listing context — backward compatible. */
export function useListing() {
  const ctx = useContext(ListingContext);
  if (!ctx) throw new Error('useListing must be used within ListingProvider');
  return ctx;
}

/**
 * Subscribe only to API-loaded catalog data (brands, models, options).
 *
 * Prefer this over useListing() in step-page dropdown components so they
 * skip re-renders caused by form-field keystrokes.
 *
 * @example
 * const { phoneBrands, phoneModels } = useListingCatalog();
 */
export function useListingCatalog(): ListingCatalogValue {
  const catalog = useContext(ListingCatalogCtx);
  if (!catalog) throw new Error('useListingCatalog must be used within ListingProvider');
  return catalog;
}
