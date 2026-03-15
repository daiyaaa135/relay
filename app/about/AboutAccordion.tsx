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
              className="w-full text-left flex items-center gap-4 py-3.5 px-4 rounded-[28px] bg-relay-bg dark:bg-relay-bg-dark active-scale transition-all group"
            >
              <div className="size-11 rounded-full bg-relay-surface dark:bg-relay-surface-dark flex items-center justify-center shrink-0 transition-all text-primary">
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-relay-text dark:text-relay-text-dark tracking-tight">
                  {item.title}
                </span>
                <div
                  className={`text-xs text-relay-muted dark:text-relay-muted-light leading-relaxed transition-[max-height,opacity] duration-300 ease-out ${
                    isOpen ? 'max-h-48 opacity-100 mt-1' : 'max-h-0 opacity-0 overflow-hidden'
                  }`}
                >
                  {item.description}
                </div>
              </div>
              <span className="material-symbols-outlined text-relay-border dark:text-relay-border-dark group-hover:text-primary transition-colors">
                {isOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
