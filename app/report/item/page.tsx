'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { createReport } from '@/lib/reports';

function FakePictureIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-7 h-7"
      aria-hidden
    >
      <path
        d="M8 2.25C4.82436 2.25 2.25 4.82436 2.25 8V9C2.25 9.41421 2.58579 9.75 3 9.75C3.41421 9.75 3.75 9.41421 3.75 9V8C3.75 5.65279 5.65279 3.75 8 3.75H9C9.41421 3.75 9.75 3.41421 9.75 3C9.75 2.58579 9.41421 2.25 9 2.25H8Z"
        fill="currentColor"
      />
      <path
        d="M15 2.25C14.5858 2.25 14.25 2.58579 14.25 3C14.25 3.41421 14.5858 3.75 15 3.75H16C18.3472 3.75 20.25 5.65279 20.25 8V9C20.25 9.41421 20.5858 9.75 21 9.75C21.4142 9.75 21.75 9.41421 21.75 9V8C21.75 4.82436 19.1756 2.25 16 2.25H15Z"
        fill="currentColor"
      />
      <path
        d="M6 11.25C5.58579 11.25 5.25 11.5858 5.25 12C5.25 12.4142 5.58579 12.75 6 12.75H18C18.4142 12.75 18.75 12.4142 18.75 12C18.75 11.5858 18.4142 11.25 18 11.25H6Z"
        fill="currentColor"
      />
      <path
        d="M3.75 15C3.75 14.5858 3.41421 14.25 3 14.25C2.58579 14.25 2.25 14.5858 2.25 15V16C2.25 19.1756 4.82436 21.75 8 21.75H9C9.41421 21.75 9.75 21.4142 9.75 21C9.75 20.5858 9.41421 20.25 9 20.25H8C5.65279 20.25 3.75 18.3472 3.75 16V15Z"
        fill="currentColor"
      />
      <path
        d="M21.75 15C21.75 14.5858 21.4142 14.25 21 14.25C20.5858 14.25 20.25 14.5858 20.25 15V16C20.25 18.3472 18.3472 20.25 16 20.25H15C14.5858 20.25 14.25 20.5858 14.25 21C14.25 21.4142 14.5858 21.75 15 21.75H16C19.1756 21.75 21.75 19.1756 21.75 16V15Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CounterfeitIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-7 h-7"
      aria-hidden
    >
      <path
        d="M14.8945 10.6516C15.1874 10.3588 15.1874 9.88388 14.8945 9.59099C14.6016 9.2981 14.1268 9.2981 13.8339 9.59099L12.2429 11.182L10.6519 9.59099C10.359 9.2981 9.88412 9.2981 9.59122 9.59099C9.29833 9.88388 9.29833 10.3588 9.59122 10.6517L11.1822 12.2426L9.59122 13.8336C9.29833 14.1265 9.29833 14.6014 9.59122 14.8943C9.88412 15.1872 10.359 15.1872 10.6519 14.8943L12.2429 13.3033L13.8339 14.8943C14.1268 15.1872 14.6016 15.1872 14.8945 14.8943C15.1874 14.6014 15.1874 14.1265 14.8945 13.8336L13.3035 12.2426L14.8945 10.6516Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.56308 1.25C8.02129 1.25 6.77141 2.49987 6.77141 4.04167C6.77141 4.75503 6.19312 5.33333 5.47975 5.33333H5.17088C3.59483 5.33333 2.19091 6.55273 2.27642 8.24648C2.37794 10.2575 2.82459 13.3918 4.45375 16.3608C4.91004 17.1923 5.51943 18.0092 6.1782 18.7703L6.22779 18.8276C7.17546 19.9226 7.96562 20.8356 8.81509 21.4579C9.72878 22.1273 10.704 22.4607 12.0003 22.4607C13.2965 22.4607 14.2717 22.1273 15.1854 21.4579C16.0349 20.8356 16.825 19.9226 17.7727 18.8276L17.8223 18.7703C18.4811 18.0092 19.0905 17.1923 19.5468 16.3608C21.2301 13.2931 21.6498 9.82667 21.7326 7.66561C21.7972 5.97999 20.4033 4.75 18.8184 4.75H18.2291C17.6768 4.75 17.2291 4.30228 17.2291 3.75C17.2291 2.36929 16.1098 1.25 14.7291 1.25H9.56308ZM8.27141 4.04167C8.27141 3.3283 8.84971 2.75 9.56308 2.75H14.7291C15.2814 2.75 15.7291 3.19772 15.7291 3.75C15.7291 5.13071 16.8484 6.25 18.2291 6.25H18.8184C19.6561 6.25 20.2619 6.8731 20.2337 7.60819C20.1546 9.67293 19.752 12.8686 18.2317 15.6392C17.8428 16.348 17.3042 17.0768 16.6881 17.7886C15.678 18.9557 14.9959 19.7373 14.2989 20.2479C13.6514 20.7223 12.9891 20.9607 12.0003 20.9607C11.0114 20.9607 10.3491 20.7223 9.70155 20.2479C9.00457 19.7373 8.32248 18.9557 7.31237 17.7886C6.69628 17.0768 6.15772 16.348 5.76878 15.6392C4.29029 12.9448 3.86996 10.0616 3.77451 8.17085C3.73819 7.45149 4.33075 6.83333 5.17088 6.83333H5.47975C7.02154 6.83333 8.27141 5.58346 8.27141 4.04167Z"
        fill="currentColor"
      />
    </svg>
  );
}

function MaterialIcon({ name }: { name: string }) {
  return (
    <span className="material-symbols-outlined text-[28px]" aria-hidden>
      {name}
    </span>
  );
}

type ReportReason = {
  id:
    | 'prohibited'
    | 'counterfeit'
    | 'advertising'
    | 'trade_offline'
    | 'inappropriate'
    | 'hate'
    | 'stolen'
    | 'wrong_brand'
    | 'other';
  label: string;
  icon: React.ReactNode;
};

const REPORT_REASONS: ReportReason[] = [
  { id: 'prohibited', label: 'Fake picture', icon: <FakePictureIcon /> },
  { id: 'counterfeit', label: 'Counterfeit item', icon: <CounterfeitIcon /> },
  { id: 'advertising', label: 'Advertising/soliciting', icon: <MaterialIcon name="campaign" /> },
  { id: 'trade_offline', label: 'Trade/offline transaction', icon: <MaterialIcon name="payments" /> },
  { id: 'inappropriate', label: 'Inappropriate content', icon: <MaterialIcon name="visibility_off" /> },
  { id: 'hate', label: 'Hate/offensive', icon: <MaterialIcon name="block" /> },
  { id: 'stolen', label: 'Stolen goods', icon: <MaterialIcon name="inventory_2" /> },
  { id: 'wrong_brand', label: 'Wrong brand/category', icon: <MaterialIcon name="category" /> },
  { id: 'other', label: 'Other', icon: <MaterialIcon name="flag" /> },
];

const ESCALATED_REASON_IDS = ['prohibited', 'wrong_brand', 'stolen', 'other'] as const;

export default function ReportItemPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listingId = searchParams.get('listingId') ?? '';
  const reportedUserId = searchParams.get('userId') ?? '';
  const from = searchParams.get('from');
  const fromCategory = searchParams.get('category');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAlreadyReported, setShowAlreadyReported] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .auth
      .getUser()
      .then(({ data: { user } }) => setUserId(user?.id ?? null))
      .catch(() => setUserId(null));
  }, []);

  const navigateBackToListing = () => {
    if (!listingId) {
      router.back();
      return;
    }
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (fromCategory) params.set('category', fromCategory);
    const query = params.toString();
    const targetUrl = query ? `/listing/${listingId}?${query}` : `/listing/${listingId}`;
    router.push(targetUrl);
  };

  const markListingReported = () => {
    if (!listingId) return;
    try {
      const key = 'relay_reported_listings';
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      const parsed = raw ? (JSON.parse(raw) as string[]) : [];
      if (!parsed.includes(listingId)) {
        const next = [...parsed, listingId];
        window.localStorage.setItem(key, JSON.stringify(next));
      }
    } catch {
      // ignore storage errors
    }
  };

  useEffect(() => {
    if (!listingId) return;
    try {
      const key = 'relay_reported_listings';
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed) && parsed.includes(listingId)) {
        setShowAlreadyReported(true);
      }
    } catch {
      // ignore parse errors
    }
  }, [listingId]);

  const handleBack = () => {
    navigateBackToListing();
  };

  const handleSubmit = async () => {
    if (!selectedId) return;
    const isEscalated = ESCALATED_REASON_IDS.includes(selectedId as (typeof ESCALATED_REASON_IDS)[number]);
    const reasonLabel = REPORT_REASONS.find((r) => r.id === selectedId)?.label ?? selectedId;

    if (isEscalated) {
      setSubmitted(true);
      router.push(
        `/report?userId=${encodeURIComponent(reportedUserId)}&listingId=${encodeURIComponent(
          listingId,
        )}&reason=${encodeURIComponent(reasonLabel)}`,
      );
      return;
    }

    // Non-escalated: create a lightweight report immediately when signed in.
    if (userId) {
      try {
        const details = `Quick item report from listing ${listingId || 'unknown'}: ${reasonLabel}`;
        await createReport({
          reporter_id: userId,
          reported_user_id: reportedUserId || null,
          reason: reasonLabel,
          details,
        });
      } catch {
        // Ignore errors; user still sees local success state.
      }
    }

    markListingReported();
    setShowSuccess(true);
  };

  if (submitted) {
    return (
      <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark items-center justify-center px-6">
        <div className="size-16 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
        <p className="text-sm text-relay-muted">Redirecting…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark transition-colors">
      <div className="page-scroll">
      <header
        className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-relay-border dark:border-relay-border-dark bg-relay-surface dark:bg-relay-surface-dark z-30 pt-safe-1"
      >
        <button
          type="button"
          onClick={handleBack}
          className="flex size-10 items-center justify-center rounded-full text-relay-text dark:text-relay-text-dark hover:bg-relay-bg dark:hover:bg-relay-bg-dark active-scale"
          aria-label="Back"
        >
          <span className="material-symbols-outlined text-[24px]">chevron_left</span>
        </button>
        <h1 className="text-lg font-semibold text-relay-text dark:text-relay-text-dark">
          Report item
        </h1>
        <div className="w-10" aria-hidden />
      </header>

      <main className="px-6 pt-6 pb-20">
        <p className="text-sm text-relay-text dark:text-relay-text-dark mb-1 flex items-center gap-1.5">
          Choose a reason for reporting
          <button
            type="button"
            className="size-5 rounded-full border border-relay-border dark:border-relay-border-dark flex items-center justify-center text-relay-muted hover:text-relay-text"
            aria-label="Help"
          >
            <span className="material-symbols-outlined text-[14px]">help</span>
          </button>
        </p>

        <div className="grid grid-cols-3 gap-4 mt-8">
          {REPORT_REASONS.map((reason) => (
            <button
              key={reason.id}
              type="button"
              onClick={() => setSelectedId(selectedId === reason.id ? null : reason.id)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all active-scale ${
                selectedId === reason.id
                  ? 'border-primary bg-primary/5'
                  : 'border-relay-border dark:border-relay-border-dark bg-relay-bg dark:bg-relay-bg-dark hover:border-primary/50'
              }`}
            >
              <div
                className={`size-14 rounded-full flex items-center justify-center border-2 ${
                  selectedId === reason.id
                    ? 'border-primary text-primary'
                    : 'border-primary/40 text-primary/80'
                }`}
              >
                {reason.icon}
              </div>
              <span className="text-[11px] font-medium text-relay-text dark:text-relay-text-dark text-center leading-tight">
                {reason.label}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-12 px-2 flex justify-center">
          {(() => {
            const isEscalatedSelection =
              selectedId != null &&
              ESCALATED_REASON_IDS.includes(selectedId as (typeof ESCALATED_REASON_IDS)[number]);
            if (isEscalatedSelection) {
              return (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="size-14 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30 active-scale"
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </button>
              );
            }
            return (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!selectedId}
                className={`w-full py-4 rounded-2xl text-base font-semibold transition-all active-scale ${
                  selectedId
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'bg-relay-border dark:bg-relay-border-dark text-relay-muted cursor-not-allowed'
                }`}
              >
                Submit
              </button>
            );
          })()}
        </div>
      </main>
      </div>
      {showSuccess && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-8 bg-black/40">
          <div className="rounded-3xl bg-relay-surface dark:bg-relay-surface-dark px-6 py-8 text-center shadow-2xl max-w-sm w-full">
            <p className="text-sm font-semibold text-relay-text dark:text-relay-text-dark mb-3">
              You’ve successfully reported this listing.
            </p>
            <p className="text-xs text-relay-muted mb-6">
              We’ll start investigating this listing and take action if it violates our guidelines.
            </p>
            <button
              type="button"
              onClick={() => {
                setShowSuccess(false);
                navigateBackToListing();
              }}
              className="mt-2 text-xs font-semibold tracking-widest text-primary active-scale"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {showAlreadyReported && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center px-8 bg-black/40">
          <div className="rounded-3xl bg-relay-surface dark:bg-relay-surface-dark px-6 py-8 text-center shadow-2xl max-w-sm w-full">
            <p className="text-sm font-semibold text-relay-text dark:text-relay-text-dark mb-3">
              You’ve already reported this listing.
            </p>
            <p className="text-xs text-relay-muted mb-6">
              Our team is already reviewing it. You can track the status from the Safety Center → Recent Reports.
            </p>
            <button
              type="button"
              onClick={() => {
                setShowAlreadyReported(false);
                navigateBackToListing();
              }}
              className="mt-2 text-xs font-semibold tracking-widest text-primary active-scale"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
