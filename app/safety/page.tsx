'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { GuidelinesIcon } from '@/app/components/GuidelinesIcon';

export default function SafetyPage() {
  const router = useRouter();

  const safetyActions = [
    {
      title: 'Reporting',
      items: [
        { label: 'Recent Reports', desc: 'Track status of your submitted reports', icon: 'history', path: '/safety/reports' },
      ]
    },
    {
      title: 'Privacy & Blocking',
      items: [
        { label: 'Blocked Accounts', desc: 'Manage users you have restricted', icon: 'block', path: '/safety/blocked' },
      ]
    },
    {
      title: 'Resources',
      items: [
        { label: 'Community Guidelines', desc: 'Our rules for a safe marketplace', icon: 'menu_book', path: '/guidelines', iconComponent: GuidelinesIcon },
        { label: 'Contact Support Team', desc: 'Direct line for urgent safety concerns', icon: 'support_agent', path: '/help' },
      ]
    }
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark transition-colors">
      <header className="shrink-0 px-6 pb-6 flex items-center gap-4 bg-transparent z-30" style={{ paddingTop: 'max(3rem, env(safe-area-inset-top))' }}>
        <button 
          onClick={() => router.back()}
          className="flex size-10 items-center justify-center rounded-full bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark hover:text-primary transition-colors active-scale"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-2xl font-serif  text-relay-text dark:text-relay-text-dark tracking-tighter">Safety Center</h1>
      </header>
      <div className="page-scroll" style={{ marginTop: '-1px' }}>
      <div className="px-6 py-8 pb-20 space-y-12">
        <div className="p-8 rounded-[40px] bg-primary/5 relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-xl font-serif  text-relay-text dark:text-relay-text-dark mb-2">Your Safety is Priority</h2>
            <p className="text-relay-muted dark:text-relay-muted-light text-xs font-light leading-relaxed">
              Rellaey is built on trust. If someone makes you feel uncomfortable or attempts to defraud you, please let us know immediately.
            </p>
          </div>
          <span className="absolute -bottom-4 -right-4 material-symbols-outlined !text-8xl text-primary/10 rotate-12">shield_with_heart</span>
        </div>

        {safetyActions.map((section) => (
          <div key={section.title} className="space-y-6">
            <h3 className="text-[10px] font-bold tracking-[0.3em] text-relay-muted px-2">{section.title}</h3>
            <div className="space-y-3">
              {section.items.map((item) => {
                const IconComponent = 'iconComponent' in item ? item.iconComponent : null;
                return (
                <button
                  key={item.label}
                  onClick={() => item.path !== '#' && router.push(item.path)}
                  className="w-full flex items-center gap-5 p-5 rounded-3xl bg-relay-bg dark:bg-relay-bg-dark transition-all text-left group active-scale"
                >
                  <div className="size-12 rounded-2xl bg-relay-surface dark:bg-relay-surface-dark flex items-center justify-center text-relay-muted group-hover:text-primary group-hover:bg-primary/5 transition-all">
                    {IconComponent ? (
                      <IconComponent className="size-6 shrink-0 text-current" />
                    ) : 'image' in item && item.image ? (
                      <img src={item.image} alt="" className="size-6 object-contain dark:invert" />
                    ) : (
                      <span className="material-symbols-outlined">{item.icon}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-relay-text dark:text-relay-text-dark group-hover:text-primary">{item.label}</h4>
                    <p className="text-[10px] text-relay-muted font-light mt-0.5">{item.desc}</p>
                  </div>
                  <span className="material-symbols-outlined text-relay-border dark:text-relay-border-dark !text-sm group-hover:text-primary">arrow_forward_ios</span>
                </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
