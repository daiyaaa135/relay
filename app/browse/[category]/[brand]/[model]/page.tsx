'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ChevronDown, Smartphone, MapPin, SlidersHorizontal } from 'lucide-react';
import { PageHeader } from '@/app/components/PageHeader';

/** Subscribe (notifications) icon: bell with diagonal line + dot. Use className for size/color. */
function SubscribeIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M15.1831 2.61489C14.4812 2.22405 13.671 2 12.8029 2H11.0999C8.15552 2 5.87737 4.58064 6.24258 7.50234L6.32194 8.13719C6.46808 9.30631 6.04102 10.4741 5.17514 11.2731C3.99242 12.3645 3.66383 14.1016 4.36619 15.5496L4.46954 15.7627C5.13331 17.1311 6.52054 18 8.04144 18H16.2623C17.5656 18 18.7785 17.3342 19.4783 16.2347C20.4661 14.6826 20.2045 12.6465 18.8564 11.3945L18.8125 11.3538C18.3991 10.9698 18.0805 10.5067 17.8697 10C17.7836 9.79308 17.7154 9.5789 17.6662 9.35988M9.18317 21L9.48317 21.4C10.8332 23.2 13.5332 23.2 14.8832 21.4L15.1832 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M19.1831 6C19.1831 7.10457 18.2877 8 17.1831 8C16.0785 8 15.1831 7.10457 15.1831 6C15.1831 4.89543 16.0785 4 17.1831 4C18.2877 4 19.1831 4.89543 19.1831 6Z" fill="currentColor" />
    </svg>
  );
}

/** List (price tag) icon. Use className for size/color. */
function ListIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M9 12.25C8.58579 12.25 8.25 12.5858 8.25 13C8.25 13.4142 8.58579 13.75 9 13.75V12.25ZM15 13.75C15.4142 13.75 15.75 13.4142 15.75 13C15.75 12.5858 15.4142 12.25 15 12.25V13.75ZM11.25 16C11.25 16.4142 11.5858 16.75 12 16.75C12.4142 16.75 12.75 16.4142 12.75 16H11.25ZM12.75 10C12.75 9.58579 12.4142 9.25 12 9.25C11.5858 9.25 11.25 9.58579 11.25 10H12.75ZM5.06107 21.0451L5.50191 20.4383L5.06107 21.0451ZM3.95491 19.9389L4.56168 19.4981L3.95491 19.9389ZM20.0451 19.9389L19.4383 19.4981L20.0451 19.9389ZM18.9389 21.0451L18.4981 20.4383L18.9389 21.0451ZM18.9389 4.95491L18.4981 5.56168L18.9389 4.95491ZM20.0451 6.06107L19.4383 6.50191L20.0451 6.06107ZM5.06107 4.95491L5.50191 5.56168H5.50191L5.06107 4.95491ZM3.95491 6.06107L4.56168 6.50191L3.95491 6.06107ZM15.5451 1.24472L15.3134 1.95801V1.95801L15.5451 1.24472ZM18.7553 4.45492L18.042 4.68668V4.68668L18.7553 4.45492ZM8.45497 1.24472L8.68673 1.95801V1.95801L8.45497 1.24472ZM5.24477 4.45492L5.95806 4.68668V4.68668L5.24477 4.45492ZM9 13.75H15V12.25H9V13.75ZM12.75 16V10H11.25V16H12.75ZM12 21.25C10.1084 21.25 8.74999 21.249 7.69804 21.135C6.66013 21.0225 6.00992 20.8074 5.50191 20.4383L4.62023 21.6518C5.42656 22.2377 6.37094 22.5 7.53648 22.6263C8.68798 22.751 10.1418 22.75 12 22.75V21.25ZM2.25 13C2.25 14.8582 2.24897 16.312 2.37373 17.4635C2.50001 18.6291 2.76232 19.5734 3.34815 20.3798L4.56168 19.4981C4.19259 18.9901 3.97745 18.3399 3.865 17.302C3.75103 16.25 3.75 14.8916 3.75 13H2.25ZM5.50191 20.4383C5.14111 20.1762 4.82382 19.8589 4.56168 19.4981L3.34815 20.3798C3.70281 20.8679 4.13209 21.2972 4.62023 21.6518L5.50191 20.4383ZM20.25 13C20.25 14.8916 20.249 16.25 20.135 17.302C20.0225 18.3399 19.8074 18.9901 19.4383 19.4981L20.6518 20.3798C21.2377 19.5734 21.5 18.6291 21.6263 17.4635C21.751 16.312 21.75 14.8582 21.75 13H20.25ZM12 22.75C13.8582 22.75 15.312 22.751 16.4635 22.6263C17.6291 22.5 18.5734 22.2377 19.3798 21.6518L18.4981 20.4383C17.9901 20.8074 17.3399 21.0225 16.302 21.135C15.25 21.249 13.8916 21.25 12 21.25V22.75ZM19.4383 19.4981C19.1762 19.8589 18.8589 20.1762 18.4981 20.4383L19.3798 21.6518C19.8679 21.2972 20.2972 20.8679 20.6518 20.3798L19.4383 19.4981ZM21.75 13C21.75 11.1418 21.751 9.68798 21.6263 8.53648C21.5 7.37094 21.2377 6.42656 20.6518 5.62023L19.4383 6.50191C19.8074 7.00992 20.0225 7.66013 20.135 8.69804C20.249 9.74999 20.25 11.1084 20.25 13H21.75ZM18.4981 5.56168C18.8589 5.82382 19.1762 6.14111 19.4383 6.50191L20.6518 5.62023C20.2972 5.13209 19.8679 4.70281 19.3798 4.34815L18.4981 5.56168ZM3.75 13C3.75 11.1084 3.75103 9.74999 3.865 8.69804C3.97745 7.66013 4.19259 7.00992 4.56168 6.50191L3.34815 5.62023C2.76232 6.42656 2.50001 7.37094 2.37373 8.53648C2.24897 9.68798 2.25 11.1418 2.25 13H3.75ZM4.62023 4.34815C4.13209 4.70281 3.70281 5.13209 3.34815 5.62023L4.56168 6.50191C4.82382 6.14111 5.14111 5.82382 5.50191 5.56168L4.62023 4.34815ZM12.0001 1.75C13.9197 1.75 14.7017 1.75925 15.3134 1.95801L15.7769 0.531425C14.8823 0.240747 13.803 0.25 12.0001 0.25V1.75ZM15.3134 1.95801C16.6072 2.37841 17.6216 3.39282 18.042 4.68668L19.4686 4.22315C18.8998 2.47263 17.5274 1.1002 15.7769 0.531425L15.3134 1.95801ZM12.0001 0.25C10.1971 0.25 9.11782 0.240747 8.22321 0.531425L8.68673 1.95801C9.29844 1.75925 10.0804 1.75 12.0001 1.75V0.25ZM8.22321 0.531425C6.47269 1.1002 5.10026 2.47263 4.53148 4.22315L5.95806 4.68668C6.37846 3.39282 7.39287 2.37841 8.68673 1.95801L8.22321 0.531425ZM5.86748 5.04567C5.89261 4.91348 5.9226 4.79583 5.95806 4.68668L4.53148 4.22315C4.47453 4.39842 4.42955 4.57785 4.39387 4.76553L5.86748 5.04567ZM12 3.25C10.1738 3.25 8.73872 3.24906 7.59818 3.36719C6.44603 3.48652 5.50714 3.73401 4.70441 4.28851L5.55694 5.52269C6.0652 5.17159 6.71896 4.96628 7.75271 4.85921C8.79808 4.75094 10.1422 4.75 12 4.75V3.25ZM4.70441 4.28851C4.67613 4.30805 4.64807 4.32793 4.62023 4.34815L5.50191 5.56168C5.52013 5.54844 5.53847 5.53545 5.55694 5.52269L4.70441 4.28851ZM19.6063 4.76563C19.5706 4.57791 19.5256 4.39845 19.4686 4.22315L18.042 4.68668C18.0775 4.79585 18.1075 4.91352 18.1326 5.04574L19.6063 4.76563ZM12 4.75C13.8579 4.75 15.202 4.75094 16.2474 4.85922C17.2811 4.9663 17.9349 5.17163 18.4432 5.52275L19.2957 4.28862C18.493 3.73405 17.5541 3.48655 16.4019 3.3672C15.2614 3.24906 13.8263 3.25 12 3.25V4.75ZM18.4432 5.52275C18.4616 5.53549 18.4799 5.54846 18.4981 5.56168L19.3798 4.34815C19.352 4.32797 19.324 4.30812 19.2957 4.28862L18.4432 5.52275Z" fill="currentColor" />
    </svg>
  );
}
import type { DeviceListingsResponse, DeviceListing } from '@/app/api/device-listings/route';
import { RatingDisplay } from '@/app/components/RatingDisplay';
import { type } from '@/lib/typography';
import { getDefaultAvatar } from '@/lib/avatars';
import { formatJoinedDate } from '@/lib/dateFormatters';

const COND_DISPLAY: Record<string, string> = {
  new: 'New', mint: 'Mint', good: 'Good', fair: 'Fair', poor: 'Poor',
  New: 'New', Mint: 'Mint', Good: 'Good', Fair: 'Fair', Poor: 'Poor',
};

type SortOption = 'newest' | 'nearest' | 'credits_asc' | 'credits_desc' | 'condition';
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'nearest', label: 'Nearest location' },
  { value: 'credits_asc', label: 'Lowest Credits' },
  { value: 'credits_desc', label: 'Highest Credits' },
  { value: 'condition', label: 'Best Condition' },
];
const CONDITION_RANK: Record<string, number> = {
  new: 5, mint: 5, New: 5, Mint: 5,
  good: 3, Good: 3,
  fair: 2, Fair: 2,
  poor: 1, Poor: 1,
};

function getOsTag(category: string, brand: string): string | null {
  if (category === 'Phones') return brand === 'Apple' ? 'iOS' : 'Android';
  if (category === 'Laptops') return brand === 'Apple' ? 'macOS' : 'Windows';
  if (category === 'Tablets') return brand === 'Apple' ? 'iPadOS' : 'Android';
  return null;
}

const PAGE_SIZE = 20;


/** Derive storage string from specs (e.g. "512 GB") for display. */
function getStorageFromSpecs(specs: string | null): string | null {
  if (!specs) return null;
  const m = specs.match(/\b(\d+\s*[GT]B)\b/i);
  return m ? m[1].replace(/\s+/g, ' ') : null;
}

function ListingCard({ listing, onPress }: { listing: DeviceListing; onPress: () => void }) {
  const cond = COND_DISPLAY[listing.condition] ?? listing.condition;
  const storage = getStorageFromSpecs(listing.specs);
  const carrier = listing.carrier?.trim() || null;
  const specParts = [cond, storage, carrier].filter(Boolean);
  const specTags = specParts.length > 0 ? specParts.join(' • ') : null;
  const avatar = listing.seller_avatar || getDefaultAvatar(listing.seller_name);

  return (
    <button
      type="button"
      onClick={onPress}
      className="w-full text-left flex gap-3 bg-[#FBFBFB] dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark rounded-2xl p-3 active:scale-[0.98] transition-transform shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
    >
      {/* Left: product image + spec tags + device name */}
      <div className="flex flex-col gap-1.5 w-[76px] flex-shrink-0">
        <div className="size-[76px] rounded-xl overflow-hidden bg-[#FBFBFB] dark:bg-relay-surface-dark">
          {listing.image_url ? (
            <img src={listing.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Smartphone className="size-8 text-relay-muted" />
            </div>
          )}
        </div>
        {specTags ? (
          <p className="text-[9px] text-relay-muted dark:text-relay-muted-light leading-tight tracking-tight">
            {specTags}
          </p>
        ) : null}
        <p className="text-[9px] text-relay-muted dark:text-relay-muted-light leading-tight line-clamp-2">{listing.name}</p>
      </div>

      {/* Right: location + seller + price */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Location top-right */}
        <div className="flex justify-end mb-1">
          {listing.city && listing.state ? (
            <div className="flex items-center gap-1">
              <MapPin className="size-3 text-relay-muted shrink-0" />
              <p className="text-[9px] tracking-tight text-relay-muted dark:text-relay-muted-light">
                {listing.city}, {listing.state}
              </p>
            </div>
          ) : null}
        </div>

        {/* Seller info */}
        <div className="flex items-center gap-2 mt-1">
          <img
            src={avatar}
            alt=""
            className="size-7 rounded-full object-cover flex-shrink-0 border border-relay-border dark:border-relay-border-dark"
          />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-relay-text dark:text-relay-text-dark truncate">{listing.seller_name}</p>
            {listing.seller_joined_at && (
              <p className="text-[10px] font-normal text-relay-muted dark:text-relay-muted-light">
                {formatJoinedDate(listing.seller_joined_at)}
              </p>
            )}
            <RatingDisplay rating={listing.seller_rating} size="sm" />
          </div>
        </div>

        {/* Price bottom-right */}
        <div className="flex-1 flex items-end justify-end mt-2">
          <div className="text-right">
            <span className="text-base font-bold text-relay-text dark:text-relay-text-dark leading-none">
              {listing.credits.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-primary ml-1">Cr</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function DeviceDetailContent() {
  const router = useRouter();
  const rawParams = useParams();
  const searchParams = useSearchParams();

  const category = decodeURIComponent((rawParams.category as string) || '');
  const brand = decodeURIComponent((rawParams.brand as string) || '');
  const model = decodeURIComponent((rawParams.model as string) || '');
  const imageUrl = searchParams.get('img') || null;

  const productName = `${brand} ${model}`;

  const [listings, setListings] = useState<DeviceListing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [subscribed, setSubscribed] = useState(false);
  const [showSubscribeToast, setShowSubscribeToast] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  const fetchListings = useCallback(async (off: number, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const q = new URLSearchParams({ brand, model, category, offset: String(off), limit: String(PAGE_SIZE) });
      const res = await fetch(`/api/device-listings?${q}`);
      if (!res.ok) throw new Error('Failed');
      const data: DeviceListingsResponse = await res.json();
      if (append) setListings(prev => [...prev, ...data.listings]);
      else setListings(data.listings);
      setTotal(data.total);
    } catch {
      // silently fail
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  }, [brand, model, category]);

  useEffect(() => {
    if (!brand || !model) return;
    setOffset(0);
    fetchListings(0);
  }, [brand, model, category, fetchListings]);

  const handleLoadMore = useCallback(() => {
    const newOffset = offset + PAGE_SIZE;
    setOffset(newOffset);
    fetchListings(newOffset, true);
  }, [offset, fetchListings]);

  const handleList = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('relay_list_prefill', JSON.stringify({ category, brand, model }));
    }
    router.push('/list/1');
  }, [category, brand, model, router]);

  const handleSubscribe = useCallback(() => {
    setSubscribed(s => !s);
    setShowSubscribeToast(true);
    setTimeout(() => setShowSubscribeToast(false), 2200);
  }, []);

  const sortedListings = React.useMemo(() => {
    const list = [...listings];
    switch (sortBy) {
      case 'newest':
      case 'nearest':
        return list;
      case 'credits_asc':
        return list.sort((a, b) => a.credits - b.credits);
      case 'credits_desc':
        return list.sort((a, b) => b.credits - a.credits);
      case 'condition':
        return list.sort((a, b) => (CONDITION_RANK[b.condition] ?? 0) - (CONDITION_RANK[a.condition] ?? 0));
      default:
        return list;
    }
  }, [listings, sortBy]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setFilterDropdownOpen(false);
      }
    }
    if (filterDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [filterDropdownOpen]);

  return (
    <div className="flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark flex flex-col">
      <div className="page-scroll">

      {/* Toast */}
      {showSubscribeToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-relay-text dark:bg-relay-bg-dark text-relay-bg dark:text-relay-text-dark text-xs font-bold tracking-widest px-5 py-2.5 rounded-full shadow-lg transition-all">
          {subscribed ? 'Subscribed — we\'ll notify you' : 'Unsubscribed'}
        </div>
      )}

      {/* Fixed header — matches Settings/Wallet/Listings (z-30, bg-relay-surface/95) */}
      <PageHeader
        onBack={() => router.push(`/browse/${encodeURIComponent(category)}`)}
        className="sticky top-0 z-30"
      >
        <h1 className="text-lg font-semibold text-relay-text dark:text-relay-text-dark truncate min-w-0">
          {model}
        </h1>
      </PageHeader>

      {/* Scrollable content — top padding so content is not under fixed header */}
      <main
        className="pb-20 bg-[#F2F2F2] dark:bg-relay-surface-dark"
      >

        {/* Hero: device image + name */}
        <div className="flex flex-col items-center pt-7 pb-5 px-4">
          <div className="size-36 flex items-center justify-center">
            {imageUrl ? (
              <img src={imageUrl} alt={productName} className="w-full h-full object-contain drop-shadow-md" />
            ) : (
              <Smartphone className="size-20 text-relay-muted" />
            )}
          </div>
          <h2 className={`${type.h2} text-relay-text dark:text-relay-text-dark text-center mt-4`}>{productName}</h2>
        </div>

        {/* Action bar */}
        <div className="px-4 mb-5">
          <div className="border border-relay-border dark:border-relay-border-dark rounded-2xl overflow-hidden flex">
            <button
              type="button"
              onClick={handleSubscribe}
              className="flex-1 flex flex-col items-center gap-2 py-4 active:bg-relay-surface dark:active:bg-relay-surface-dark transition-colors"
            >
              <SubscribeIcon
                className={`size-7 ${subscribed ? 'text-primary' : 'text-relay-muted dark:text-relay-muted-light'}`}
              />
              <span className="text-[10px] font-bold tracking-widest text-relay-text dark:text-relay-text-dark">
                Subscribe
              </span>
            </button>

            <div className="w-px bg-relay-border dark:bg-relay-border-dark" />

            <button
              type="button"
              onClick={handleList}
              className="flex-1 flex flex-col items-center gap-2 py-4 active:bg-relay-surface dark:active:bg-relay-surface-dark transition-colors"
            >
              <ListIcon className="size-7 text-primary" />
              <span className="text-[10px] font-bold tracking-widest text-relay-text dark:text-relay-text-dark">
                List
              </span>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-relay-border dark:bg-relay-border-dark mx-4 mb-5" />

        {/* Listings header + sort dropdown */}
        <div className="px-4 flex items-center justify-between mb-4">
          <p className="text-base font-bold text-relay-text dark:text-relay-text-dark">
            {loading ? (
              <span className="inline-block w-10 h-4 rounded bg-relay-border dark:bg-relay-border-dark animate-pulse" />
            ) : (
              `${total} listing${total !== 1 ? 's' : ''}`
            )}
          </p>
          <div className="relative" ref={filterDropdownRef}>
            <button
              type="button"
              onClick={() => setFilterDropdownOpen((open) => !open)}
              className="flex items-center gap-1 size-9 rounded-full border border-relay-border dark:border-relay-border-dark text-relay-muted dark:text-relay-muted-light hover:border-primary hover:text-primary transition-colors"
              aria-label="Sort listings"
              aria-expanded={filterDropdownOpen}
            >
              <SlidersHorizontal className="size-5" />
              <ChevronDown className={`size-4 transition-transform ${filterDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {filterDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 z-40 min-w-[180px] py-1 rounded-xl border border-relay-border dark:border-relay-border-dark bg-white dark:bg-relay-surface-dark shadow-lg overflow-hidden">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setSortBy(opt.value);
                      setFilterDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      sortBy === opt.value
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-relay-text dark:text-relay-text-dark hover:bg-relay-bg dark:hover:bg-relay-bg-dark'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cards */}
        <div className="px-4 space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="size-9 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && listings.length === 0 && (
            <div className="py-16 text-center flex flex-col items-center">
              <div className="size-20 flex items-center justify-center mb-6">
                <img src="/no-gear-found.png" alt="" className="w-20 h-20 object-contain" />
              </div>
              <p className="text-relay-muted dark:text-relay-muted-light text-sm mb-5">
                No listings for this device yet.
              </p>
              <button
                type="button"
                onClick={handleList}
                className="px-7 py-2.5 bg-primary text-white text-xs font-semibold tracking-widest rounded-full"
              >
                Be the first to list
              </button>
            </div>
          )}

          {!loading && sortedListings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onPress={() => router.push(`/listing/${listing.id}`)}
            />
          ))}

          {/* Load more / spinner */}
          {!loading && listings.length < total && (
            <div className="flex justify-center py-6">
              {loadingMore ? (
                <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <button
                  type="button"
                  onClick={handleLoadMore}
                  className="text-primary text-[10px] font-bold tracking-widest"
                >
                  Load more
                </button>
              )}
            </div>
          )}
        </div>
      </main>
      </div>
    </div>
  );
}

function DeviceDetailPageContent() {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center bg-relay-surface dark:bg-relay-surface-dark">
          <div className="size-9 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <DeviceDetailContent />
    </Suspense>
  );
}

export default function DeviceDetailPage() {
  return (
    <Suspense>
      <DeviceDetailPageContent />
    </Suspense>
  );
}
