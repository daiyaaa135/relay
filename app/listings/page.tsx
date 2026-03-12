'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { fetchGadgetsByProfileId } from '@/lib/gadgets';
import type { Gadget } from '@/lib/types';
import { type } from '@/lib/typography';
import { PageHeader } from '@/app/components/PageHeader';

function formatDate(createdAt: string | undefined): string {
  if (!createdAt) return '';
  const d = new Date(createdAt);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ListingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'listings' | 'swapped'>('listings');
  const [profileId, setProfileId] = useState<string | null>(null);
  const [listings, setListings] = useState<Gadget[]>([]);
  const [swappedItems, setSwappedItems] = useState<Gadget[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        setAuthChecked(true);
        if (!user?.id) {
          setLoading(false);
          return;
        }
        setProfileId(user.id);
        const [active, swapped] = await Promise.all([
          fetchGadgetsByProfileId(user.id, 'active'),
          fetchGadgetsByProfileId(user.id, 'swapped'),
        ]);
        if (cancelled) return;
        setListings(active);
        setSwappedItems(swapped);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (authChecked && !profileId) router.replace('/login');
  }, [authChecked, profileId, router]);

  const list = activeTab === 'listings' ? listings : swappedItems;

  if (!authChecked || loading) {
    return (
      <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark transition-colors">
        <PageHeader>
          <h1 className={`${type.h1} !font-semibold text-relay-text dark:text-relay-text-dark`}>My Listings</h1>
        </PageHeader>
        <div className="flex-1 flex items-center justify-center px-6">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
        </div>
      </div>
    );
  }

  if (!profileId) {
    return (
      <div className="flex flex-1 min-h-0 items-center justify-center bg-relay-surface dark:bg-relay-surface-dark">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark transition-colors">
      <PageHeader>
        <h1 className={`${type.h1} !font-semibold text-relay-text dark:text-relay-text-dark`}>My Listings</h1>
      </PageHeader>
      <header className="shrink-0 z-30 px-6 pb-0 border-b border-relay-border dark:border-relay-border-dark bg-relay-surface/95 dark:bg-relay-surface-dark/95" style={{ marginTop: '-0.5rem' }}>
        <div className="flex gap-8 px-6 pt-2 pb-4">
          <button
            onClick={() => setActiveTab('listings')}
            className={`pb-4 text-[10px] font-bold tracking-tight transition-all border-b-2 ${
              activeTab === 'listings'
                ? 'border-relay-text dark:border-relay-text-dark text-relay-text dark:text-relay-text-dark'
                : 'border-transparent text-relay-muted'
            }`}
          >
            Listings <span className="ml-1 opacity-50">{listings.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('swapped')}
            className={`pb-4 text-[10px] font-bold tracking-tight transition-all border-b-2 ${
              activeTab === 'swapped'
                ? 'border-relay-text dark:border-relay-text-dark text-relay-text dark:text-relay-text-dark'
                : 'border-transparent text-relay-muted'
            }`}
          >
            Swapped Items <span className="ml-1 opacity-50">{swappedItems.length}</span>
          </button>
        </div>
      </header>

      <div className="page-scroll" style={{ marginTop: '-1px' }}>
      <div className="px-6 pt-0 pb-20 space-y-8">
        {list.map((item) => {
          const img = item.images?.[0] ?? item.image ?? 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=400';
          const dateStr = formatDate(item.created_at);
          const canNavigate = activeTab === 'listings';

          return (
            <div key={item.id} className="flex gap-4 group">
              <div
                onClick={canNavigate ? () => router.push(`/listing/${item.id}`) : undefined}
                className={`size-20 bg-relay-bg dark:bg-relay-bg-dark rounded-xl overflow-hidden border border-relay-border dark:border-relay-border-dark shrink-0 ${canNavigate ? 'cursor-pointer active-scale transition-all' : ''}`}
              >
                <img
                  src={img}
                  alt={item.name}
                  loading="lazy"
                  className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all"
                />
              </div>
              <div className="flex-1 flex flex-col justify-between py-1">
                <div className="flex justify-between items-start">
                  <div
                    onClick={canNavigate ? () => router.push(`/listing/${item.id}`) : undefined}
                    className={canNavigate ? 'cursor-pointer' : ''}
                  >
                    <h3 className="text-relay-text dark:text-relay-text-dark font-serif  text-base leading-tight group-hover:text-primary transition-colors">{item.name}</h3>
                    <p className="text-[10px] text-relay-muted font-bold tracking-widest mt-1">{item.id.slice(0, 8)}…{dateStr ? ` • ${dateStr}` : ''}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-bold text-relay-text dark:text-relay-text-dark tracking-tighter">{item.credits}</span>
                    <span className="block text-[8px] text-primary font-bold tracking-widest">Cr</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {(() => {
                    const isSwappedTab = activeTab === 'swapped';
                    const isPending = item.status === 'pending_swap';
                    const dotColor = isSwappedTab
                      ? 'bg-green-500'
                      : isPending
                        ? 'bg-amber-500'
                        : 'bg-primary';
                    const textColor = isSwappedTab
                      ? 'text-relay-muted'
                      : isPending
                        ? 'text-amber-600'
                        : 'text-primary';
                    const label = isSwappedTab
                      ? 'Swapped'
                      : isPending
                        ? 'Pending'
                        : 'Active';
                    return (
                      <>
                        <span className={`size-1.5 rounded-full ${dotColor}`} />
                        <span className={`text-[9px] font-bold tracking-widest ${textColor}`}>
                          {label}
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          );
        })}

        {list.length === 0 && (
          <div className="py-20 text-center">
            <span className="material-symbols-outlined text-4xl text-relay-border dark:text-relay-border-dark mb-4">inventory_2</span>
            <p className="text-relay-muted text-[10px] font-bold tracking-widest">
              {activeTab === 'listings' ? 'No active listings' : 'No swapped items yet'}
            </p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
