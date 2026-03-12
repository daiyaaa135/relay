'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchGadgetById } from '@/lib/gadgets';
import { loadWishlist, toggleWishlistItem } from '@/lib/wishlist';
import type { Gadget } from '@/lib/types';
import { type } from '@/lib/typography';
import { WishlistHeartIcon } from '@/app/components/WishlistHeartIcon';

export default function WishlistPage() {
  const router = useRouter();
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [wishlistProfileId, setWishlistProfileId] = useState<string | null>(null);
  const [wishlistedItems, setWishlistedItems] = useState<Gadget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWishlist().then(({ ids, profileId }) => {
      setWishlistIds(ids);
      setWishlistProfileId(profileId);
    });
  }, []);

  useEffect(() => {
    if (wishlistIds.length === 0) {
      setWishlistedItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    (async () => {
      const results = await Promise.all(wishlistIds.map((id) => fetchGadgetById(id)));
      if (cancelled) return;
      setWishlistedItems(results.filter((g): g is Gadget => g != null));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [wishlistIds]);

  const removeItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlistItem(wishlistProfileId, id, wishlistIds).then((newIds) => {
      setWishlistIds(newIds);
      setWishlistedItems((prev) => prev.filter((item) => item.id !== id));
    });
  };

  const clearAll = async () => {
    for (const id of wishlistIds) {
      await toggleWishlistItem(wishlistProfileId, id, wishlistIds.filter((_, i) => wishlistIds.indexOf(id) <= i));
    }
    setWishlistIds([]);
    setWishlistedItems([]);
  };

  const getStatusLabel = (status?: string | null) => {
    if (!status || status === 'available') return 'Available';
    if (status === 'pending_swap' || status === 'swapped') return 'Unavailable';
    if (status === 'removed') return 'Unavailable';
    return 'Unavailable';
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 transition-colors bg-relay-surface dark:bg-relay-surface-dark">
      <header
        className="shrink-0 z-30 px-6 pb-4 border-b border-relay-border dark:border-relay-border-dark flex items-center bg-relay-surface/95 dark:bg-relay-surface-dark/95 backdrop-blur-md pt-safe-2_25"
      >
        <h1 className={`${type.h1} !font-semibold text-relay-text dark:text-relay-text-dark`}>Wishlist</h1>
      </header>

      <div className="page-scroll" style={{ marginTop: '-1px' }}>
      <div className="px-6 pt-0 pb-20">
        <div className="flex items-center justify-between mb-10">
          <p className="text-[10px] font-bold tracking-tight text-relay-muted dark:text-relay-muted-light">
            {loading ? 'Loading…' : `${wishlistedItems.length} Saved Items`}
          </p>
          {wishlistedItems.length > 0 && !loading && (
            <button 
              onClick={clearAll}
            className="text-[10px] font-bold tracking-tight text-primary hover:text-primary/90 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="size-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : wishlistedItems.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-12">
            {wishlistedItems.map((item) => (
              <div 
                key={item.id} 
                onClick={() => router.push(`/listing/${item.id}`)}
                className="group flex flex-col gap-4 cursor-pointer active-scale transition-all"
              >
                <div className="aspect-[3/4] rounded-[40px] overflow-hidden relative bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark shadow-lg group-hover:-translate-y-2 transition-all duration-500">
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110"
                  />
                  <div className="absolute top-4 right-4">
                    <button
                      type="button"
                      className="size-10 rounded-full glass-card flex items-center justify-center transition-colors active-scale"
                      onClick={(e) => removeItem(item.id, e)}
                      aria-label="Remove from wishlist"
                    >
                      <WishlistHeartIcon active className="w-5 h-5 shrink-0 text-current" />
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 px-4 py-2.5 glass-card flex items-center gap-1">
                    <span className="text-white font-display font-bold text-sm tracking-tighter">{item.credits}</span>
                    <span className="text-[8px] font-bold text-primary tracking-tight">Credits</span>
                  </div>
                </div>
                <div className="px-2">
                  <h3 className="text-sm font-serif  text-relay-text dark:text-relay-text-dark group-hover:text-primary transition-colors truncate">{item.name}</h3>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[9px] text-relay-muted dark:text-relay-muted-light font-bold tracking-tight">{item.brand}</p>
                    <span className="text-[8px] text-primary font-bold tracking-tight">
                      {getStatusLabel(item.status)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <img src="/wishlist-empty-icon.png" alt="" className="w-24 h-24 object-contain mb-8" aria-hidden />
            <h2 className="text-relay-text dark:text-relay-text-dark font-serif text-lg font-semibold mb-2">Nothing saved yet</h2>
            <p className="text-relay-muted dark:text-relay-muted-light text-[11px] font-normal max-w-[240px] leading-relaxed mb-6">
              Explore the marketplace and heart items you want to keep an eye on.
            </p>
            <button
              type="button"
              onClick={() => router.push('/?category=All')}
              className="text-primary text-xs font-semibold tracking-tight hover:text-primary/80 transition-colors"
            >
              Start exploring
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
