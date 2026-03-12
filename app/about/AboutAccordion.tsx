'use client';

import React, { useState } from 'react';

const ROTATION_ITEMS = [
  {
    id: 1,
    icon: 'phone_iphone',
    title: '1. List',
    description:
      'Upload your device in minutes. Snap a few photos, set your price, and go live. Every listing is reviewed to ensure quality and authenticity before buyers can see it.',
  },
  {
    id: 2,
    icon: 'payments',
    title: '2. Earn',
    description:
      'Get credits when your device gets listed. Credits are released securely once you list the device straight to your wallet.',
  },
  {
    id: 3,
    icon: 'sync_alt',
    title: '3. Swap',
    description:
      'Found something you want? Use your credits directly with a device you like. Browse verified listings, propose a time, and upgrade your tech without spending a dollar.',
  },
] as const;

export function AboutAccordion() {
  const [openId, setOpenId] = useState<number>(1);

  const toggleItem = (id: number) => {
    setOpenId((current) => (current === id ? -1 : id));
  };

  return (
    <section>
      <p className="text-[10px] font-bold tracking-[0.4em] text-primary mb-5 uppercase">The Rotation</p>
      <div className="space-y-4">
        {ROTATION_ITEMS.map((item) => {
          const isOpen = openId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => toggleItem(item.id)}
              className="w-full text-left rounded-2xl bg-relay-surface dark:bg-relay-surface-dark shadow-[0_18px_45px_rgba(15,23,42,0.18)] border border-relay-border dark:border-relay-border-dark active-scale transition-all"
            >
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className="size-11 rounded-full bg-primary/8 flex items-center justify-center border border-primary/20">
                    <span className="material-symbols-outlined text-[18px] text-primary">{item.icon}</span>
                  </div>
                  <span className="text-base font-semibold text-relay-text dark:text-relay-text-dark tracking-tight">
                    {item.title}
                  </span>
                </div>
                <span className="material-symbols-outlined text-[18px] text-relay-muted">
                  {isOpen ? 'expand_less' : 'expand_more'}
                </span>
              </div>
              <div
                className={`px-5 pb-5 pt-0 text-sm text-relay-muted dark:text-relay-muted-light leading-relaxed transition-[max-height,opacity] duration-300 ease-out ${
                  isOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
                }`}
              >
                {item.description}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
