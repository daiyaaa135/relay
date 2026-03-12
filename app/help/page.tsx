'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const featuredArticles = [
  {
    id: 'credits',
    title: 'How Rellaey Credits Work',
    category: 'Credits',
  },
  {
    id: 'swaps',
    title: 'How Swaps Work (Start to Finish)',
    category: 'Swap',
  },
  {
    id: 'cancellations',
    title: 'How Cancellations, Refunds, and Your Credits Work',
    category: 'Credits',
  },
] as const;

type SectionId = 'account' | 'legal' | 'listing' | 'swap' | 'membership' | 'safety' | 'returns';

type ArticleLinkId =
  | 'credits'
  | 'swaps'
  | 'cancellations'
  | 'account-profile-notifications'
  | 'account-delete-pause'
  | 'listing-how-to-list'
  | 'listing-condition-guide'
  | 'listing-edit-remove'
  | 'swap-starting-with-credits'
  | 'swap-pickup-times-locations'
  | 'swap-rating-partner'
  | 'membership-rellaey-plus'
  | 'membership-verified-tech'
  | 'safety-meetup-checklist'
  | 'safety-blocking-reporting'
  | 'returns-swap-reversed'
  | 'returns-item-condition-disputes'
  | 'legal-terms-of-service'
  | 'legal-privacy-policy';

const sections: { id: SectionId; title: string; articles: { id: ArticleLinkId; title: string }[] }[] = [
  {
    id: 'account',
    title: 'Account',
    articles: [
      {
        id: 'account-profile-notifications',
        title: 'Managing your profile and notifications',
      },
      {
        id: 'account-delete-pause',
        title: 'Deleting or pausing your account',
      },
    ],
  },
  {
    id: 'legal',
    title: 'Legal',
    articles: [
      {
        id: 'legal-terms-of-service',
        title: 'RELLAEY TERMS OF SERVICE',
      },
      {
        id: 'legal-privacy-policy',
        title: 'Rellaey Privacy Policy',
      },
    ],
  },
  {
    id: 'listing',
    title: 'Listing',
    articles: [
      {
        id: 'listing-how-to-list',
        title: 'How to list your gadget',
      },
      {
        id: 'listing-condition-guide',
        title: 'Condition guide and photos',
      },
      {
        id: 'listing-edit-remove',
        title: 'Editing or removing a listing',
      },
    ],
  },
  {
    id: 'swap',
    title: 'Swap',
    articles: [
      {
        id: 'swap-starting-with-credits',
        title: 'Starting a swap with credits',
      },
      {
        id: 'swap-pickup-times-locations',
        title: 'Pickup times and locations',
      },
      {
        id: 'swap-rating-partner',
        title: 'Rating your swap partner',
      },
    ],
  },
  {
    id: 'membership',
    title: 'Membership',
    articles: [
      {
        id: 'membership-rellaey-plus',
        title: 'What Rellaey+ means',
      },
      {
        id: 'membership-verified-tech',
        title: 'Verified Tech and protections',
      },
    ],
  },
  {
    id: 'safety',
    title: 'Safety',
    articles: [
      {
        id: 'safety-meetup-checklist',
        title: 'Meetup safety checklist',
      },
      {
        id: 'safety-blocking-reporting',
        title: 'Blocking and reporting another user',
      },
    ],
  },
  {
    id: 'returns',
    title: 'Returns',
    articles: [
      {
        id: 'returns-swap-reversed',
        title: 'When a swap can be reversed',
      },
      {
        id: 'returns-item-condition-disputes',
        title: 'Handling disputes about item condition',
      },
    ],
  },
];

export default function HelpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from'); // 'login' | 'signup' when arrived from auth or from article after "Back to help home"
  const [openSectionId, setOpenSectionId] = useState<SectionId | null>('account');
  const [query, setQuery] = useState('');
  const [openSearch, setOpenSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);

  const articleIndex = useMemo(
    () =>
      [
        ...featuredArticles.map((a) => ({
          id: a.id as ArticleLinkId,
          title: a.title,
          category: a.category,
        })),
        ...sections.flatMap((section) =>
          section.articles.map((a) => ({
            id: a.id,
            title: a.title,
            category: section.title,
          })),
        ),
      ] as { id: ArticleLinkId; title: string; category: string }[],
    [],
  );

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return articleIndex.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q),
    );
  }, [articleIndex, query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setOpenSearch(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark transition-colors">
      <header
        className="shrink-0 px-6 pb-5 border-b border-relay-border dark:border-relay-border-dark flex items-center justify-between bg-relay-surface/95 dark:bg-relay-surface-dark/95 backdrop-blur-md z-30 pt-safe-3"
      >
        <button
          onClick={() => {
            if (from === 'login') router.push('/login');
            else if (from === 'signup') router.push('/signup');
            else router.back();
          }}
          className="flex size-10 items-center justify-center rounded-full bg-relay-surface dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark shadow-sm active-scale"
          aria-label="Close help center"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        <div className="flex-1 flex flex-col items-center -ml-10">
          <span className="text-xs font-semibold tracking-[0.25em] text-primary uppercase">
            Rellaey
          </span>
          <h1 className="text-base font-semibold text-relay-text dark:text-relay-text-dark">
            Help Center
          </h1>
        </div>
        <div className="w-10" aria-hidden />
      </header>

      <div className="page-scroll" style={{ marginTop: '-1px' }}>
      <div className="px-6 pt-0 pb-20 space-y-10">
        <div ref={searchRef} className="relative group">
          <span className="absolute left-5 top-1/2 -translate-y-1/2 material-symbols-outlined text-relay-muted group-focus-within:text-primary transition-colors pointer-events-none z-10">
            search
          </span>
          <input
            className="w-full h-14 bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark rounded-2xl pl-14 pr-5 text-sm text-relay-text dark:text-relay-text-dark placeholder-relay-muted focus:ring-1 focus:ring-primary/40 outline-none transition-all shadow-inner"
            placeholder="Search help articles"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpenSearch(true);
            }}
            onFocus={() => setOpenSearch(true)}
            autoComplete="off"
          />
          {openSearch && searchResults.length > 0 && (
            <ul className="absolute z-50 left-0 right-0 mt-1 max-h-[60vh] overflow-auto rounded-2xl border border-relay-border dark:border-relay-border-dark bg-relay-surface dark:bg-relay-surface-dark shadow-xl py-2 text-sm">
              {searchResults.map((article) => (
                <li
                  key={article.id}
                  className="px-4 py-2.5 cursor-pointer hover:bg-relay-bg dark:hover:bg-relay-bg-dark transition-colors flex flex-col gap-0.5"
                  onClick={() => {
                    setOpenSearch(false);
                    setQuery('');
                    router.push(`/help/${article.id}${from ? `?from=${from}` : ''}`);
                  }}
                >
                  <span className="text-[11px] font-semibold tracking-[0.14em] text-relay-muted uppercase">
                    {article.category}
                  </span>
                  <span className="text-relay-text dark:text-relay-text-dark">
                    {article.title}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-relay-text dark:text-relay-text-dark">
            Featured articles
          </h2>
          <div className="-mx-2 px-1">
            <div className="flex gap-3 overflow-x-auto pb-1 pl-1 pr-3 hide-scrollbar">
              {featuredArticles.map((article) => (
                <button
                  key={article.id}
                  type="button"
                  onClick={() => router.push(`/help/${article.id}${from ? `?from=${from}` : ''}`)}
                  className="min-w-[230px] max-w-[260px] flex-shrink-0 flex items-center justify-between rounded-2xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark px-4 py-4 text-left active-scale"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold tracking-[0.14em] text-relay-muted uppercase mb-1">
                      {article.category}
                    </p>
                    <p className="text-sm font-semibold text-relay-text dark:text-relay-text-dark leading-snug">
                      {article.title}
                    </p>
                    <p className="text-[10px] font-bold tracking-tight text-primary mt-3">
                      See more
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-relay-muted ml-3">
                    chevron_right
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-relay-text dark:text-relay-text-dark">
            All about Rellaey
          </h2>

          <div className="space-y-2">
            {sections.map((section) => {
              const isOpen = openSectionId === section.id;
              return (
                <div
                  key={section.id}
                  className="rounded-2xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenSectionId((prev) => (prev === section.id ? null : section.id))
                    }
                    className="w-full flex items-center justify-between px-4 py-4 text-left"
                  >
                    <span className="text-sm font-medium text-relay-text dark:text-relay-text-dark">
                      {section.title}
                    </span>
                    <span
                      className={`material-symbols-outlined text-relay-muted transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    >
                      expand_more
                    </span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-relay-border dark:border-relay-border-dark px-3 pb-3 pt-1 space-y-1">
                      {section.articles.map((article) => (
                        <button
                          key={article.id}
                          type="button"
                          onClick={() => router.push(`/help/${article.id}${from ? `?from=${from}` : ''}`)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-relay-surface/60 dark:hover:bg-relay-surface-dark/60 text-left transition-colors"
                        >
                          <span className="text-xs text-relay-text dark:text-relay-text-dark">
                            {article.title}
                          </span>
                          <span className="material-symbols-outlined text-relay-border dark:text-relay-border-dark text-sm ml-3">
                            chevron_right
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="pt-4 border-t border-relay-border dark:border-relay-border-dark flex flex-col gap-4">
          <h2 className="text-[10px] font-bold tracking-[0.4em] text-relay-muted px-1">
            Direct support
          </h2>
          <button
            type="button"
            onClick={() => router.push('/help/contact')}
            className="self-start text-sm font-semibold text-primary"
          >
            Contact us
          </button>
          <p className="text-[9px] text-relay-muted text-left px-1">
            For urgent safety concerns, our team typically responds within 2 hours during
            business hours.
          </p>
        </section>
      </div>
      </div>
    </div>
  );
}

