'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { type } from '@/lib/typography';

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

export default function AboutPage() {
  const router = useRouter();
  const [openId, setOpenId] = useState<number>(1);

  const toggleItem = (id: number) => {
    setOpenId((current) => (current === id ? -1 : id));
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark transition-colors">
      <header className="shrink-0 px-6 pb-6 flex items-center gap-4 bg-transparent z-30" style={{ paddingTop: 'max(3rem, env(safe-area-inset-top))' }}>
        <button
          onClick={() => router.back()}
          className="flex size-10 items-center justify-center rounded-full bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark hover:text-primary transition-colors active-scale"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className={`${type.h1} !font-semibold text-relay-text dark:text-relay-text-dark`}>About.</h1>
      </header>
      <div className="page-scroll" style={{ marginTop: '-1px' }}>
      <div className="px-6 py-12 pb-20 space-y-16">
        <section className="text-center">
          <div className="aspect-video rounded-[48px] overflow-hidden mb-12 shadow-2xl border border-relay-border dark:border-relay-border-dark bg-white dark:bg-relay-bg-dark flex items-center justify-center">
            <img
              src="/about-hero.svg"
              alt="Rellaey rotation illustration"
              className="w-full h-full object-contain"
            />
          </div>
          <h2 className="text-5xl font-serif  text-relay-text dark:text-relay-text-dark mb-6 tracking-tighter">The Rotation.</h2>
          <p className="text-relay-muted dark:text-relay-muted-light text-base leading-relaxed font-light  opacity-80 max-w-[320px] mx-auto">
            Rellaey was born from a simple observation: great technology shouldn&apos;t gather dust. We created a circular economy for tech enthusiasts who value quality, authenticity, and the thrill of the new.
          </p>
        </section>

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

        <section className="py-12 border-t border-relay-border dark:border-relay-border-dark text-center">
          <p className="text-[10px] font-bold tracking-[0.5em] text-primary mb-12">Version 2.4 Gold</p>
          <p className="text-relay-muted dark:text-relay-muted-light text-[9px] font-bold tracking-[0.3em] px-12 leading-loose">
            Curated in Brooklyn. <br />
            Engineered for the World. <br />
            © 2024 Rellaey Marketplace Inc.
          </p>
        </section>
      </div>
      </div>
    </div>
  );
}
