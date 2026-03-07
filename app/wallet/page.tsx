'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { fetchProfile } from '@/lib/profiles';
import { fetchTransactions, transactionDisplay } from '@/lib/transactions';
import { type } from '@/lib/typography';
import { CONDITION_BG } from '@/lib/constants';

export default function WalletPage() {
  const router = useRouter();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<ReturnType<typeof transactionDisplay>[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      setAuthChecked(true);
      if (!user?.id) {
        setLoading(false);
        return;
      }
      setProfileId(user.id);
      const [profile, txList] = await Promise.all([
        fetchProfile(user.id),
        fetchTransactions(user.id),
      ]);
      if (cancelled) return;
      const balanceFromLedger = txList.length > 0 ? txList.reduce((sum, t) => sum + t.amount, 0) : null;
      setCredits(profile?.credits_balance ?? balanceFromLedger ?? 0);
      setTransactions(txList.map(transactionDisplay));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (!authChecked || loading) {
    return (
      <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark transition-colors">
        <header className="shrink-0 px-6 pb-6 border-b border-relay-border dark:border-relay-border-dark flex items-center gap-4 bg-relay-surface/95 dark:bg-relay-surface-dark/95 backdrop-blur-md z-30" style={{ paddingTop: 'max(3rem, env(safe-area-inset-top))' }}>
          <button
            onClick={() => router.back()}
            className="flex size-10 items-center justify-center rounded-full bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark hover:text-primary transition-colors active-scale"
            aria-label="Go back"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className={`${type.h1} !font-semibold text-relay-text dark:text-relay-text-dark`}>Wallet</h1>
        </header>
        <header className="shrink-0 px-6 py-8 flex flex-col items-center justify-center bg-transparent" style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))' }}>
          <div className="w-full rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] overflow-hidden relative aspect-[4/3] bg-cover bg-center" style={{ backgroundImage: 'url(/wallet-credits-bg.png)' }}>
            <div className="absolute inset-x-4 bottom-4 rounded-xl glass-card px-6 py-5 flex flex-col items-center justify-center gap-2">
              <p className="text-[10px] text-relay-muted font-bold tracking-[0.3em]">Available credits:</p>
              <div className="h-8 w-24 bg-relay-surface/60 rounded animate-pulse" />
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="size-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!profileId) {
    return (
      <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark transition-colors">
        <header className="shrink-0 px-6 pb-6 border-b border-relay-border dark:border-relay-border-dark flex items-center gap-4 bg-relay-surface/95 dark:bg-relay-surface-dark/95 backdrop-blur-md z-30" style={{ paddingTop: 'max(3rem, env(safe-area-inset-top))' }}>
          <button
            onClick={() => router.back()}
            className="flex size-10 items-center justify-center rounded-full bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark hover:text-primary transition-colors active-scale"
            aria-label="Go back"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className={`${type.h1} !font-semibold text-relay-text dark:text-relay-text-dark`}>Wallet</h1>
        </header>
        <header className="shrink-0 px-6 py-8 flex flex-col items-center justify-center bg-transparent" style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))' }}>
          <div className="w-full rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] overflow-hidden relative aspect-[4/3] bg-cover bg-center" style={{ backgroundImage: 'url(/wallet-credits-bg.png)' }}>
            <div className="absolute inset-x-4 bottom-4 rounded-xl glass-card px-6 py-5 flex flex-col items-center justify-center gap-2">
              <p className="text-[10px] text-relay-muted font-bold tracking-[0.3em]">Available credits:</p>
              <p className="font-display text-2xl font-bold text-relay-text dark:text-relay-text-dark tracking-tighter">0</p>
            </div>
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <p className="text-relay-muted dark:text-relay-muted-light text-sm mb-4">Log in to view your wallet.</p>
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="next-step-button px-10 py-3 rounded-xl text-white text-xs font-semibold tracking-widest"
          >
            Log in
          </button>
        </div>
      </div>
    );
  }

  const balance = credits ?? 0;

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark transition-colors">
      <header className="shrink-0 px-6 pb-6 border-b border-relay-border dark:border-relay-border-dark flex items-center gap-4 bg-relay-surface/95 dark:bg-relay-surface-dark/95 backdrop-blur-md z-30" style={{ paddingTop: 'max(3rem, env(safe-area-inset-top))' }}>
        <button
          onClick={() => router.back()}
          className="flex size-10 items-center justify-center rounded-full bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark hover:text-primary transition-colors active-scale"
          aria-label="Go back"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className={`${type.h1} !font-semibold text-relay-text dark:text-relay-text-dark`}>Wallet</h1>
      </header>
      <header className="shrink-0 px-6 py-8 flex flex-col items-center justify-center bg-transparent" style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))' }}>
        <div className="w-full rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] overflow-hidden relative aspect-[4/3] bg-cover bg-center" style={{ backgroundImage: 'url(/wallet-credits-bg.png)' }}>
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl glass-card px-6 py-5 flex flex-col items-center justify-center gap-3" style={{ borderBottomWidth: 0 }}>
            <p className="text-[10px] text-relay-muted font-bold tracking-[0.3em]">Available credits:</p>
              <p className="font-display text-3xl font-bold text-relay-text dark:text-relay-text-dark tracking-tighter">{balance.toLocaleString()} <span className="text-primary text-xl font-serif ">Cr</span></p>
          </div>
        </div>
      </header>

      <div className="px-6 pt-12 pb-20">
        <div className="flex items-end justify-between mb-10">
          <h2 className={`${type.h1} !font-semibold text-relay-text dark:text-relay-text-dark`}>Ledger.</h2>
          <span className="text-[9px] font-bold text-primary tracking-[0.2em] border-b border-primary/20">All transactions</span>
        </div>

        <div className="space-y-12">
          {transactions.length > 0 ? (
            <div>
              <div className="flex items-center gap-3 mb-8">
                <span className="text-[9px] font-bold text-relay-muted tracking-[0.3em]">Transactions</span>
                <div className="flex-1 h-px bg-relay-border dark:bg-relay-border-dark" />
              </div>
              <div className="space-y-8">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-start justify-between group cursor-default">
                    <div className="flex gap-4">
                      <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-muted group-hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-[20px]">
                          {tx.type === 'credit' ? 'arrow_downward' : 'arrow_upward'}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-relay-text dark:text-relay-text-dark tracking-tighter">{tx.title}</span>
                        <span className="text-[10px] text-relay-muted font-medium tracking-widest mt-0.5">{tx.date} • {tx.status}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-base font-bold tracking-tighter ${tx.type === 'credit' ? 'text-primary' : ''}`}
                        style={tx.type === 'debit' ? { color: CONDITION_BG.New } : undefined}
                      >
                        {tx.type === 'credit' ? '+' : '-'}{tx.amount.toLocaleString()}
                      </span>
                      <span
                        className={`block text-[8px] font-bold tracking-widest ${tx.type === 'credit' ? 'text-primary' : ''}`}
                        style={tx.type === 'debit' ? { color: CONDITION_BG.New } : undefined}
                      >
                        Cr
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-16 text-center">
              <span className="material-symbols-outlined text-4xl text-relay-muted dark:text-relay-muted-light">account_balance_wallet</span>
              <p className="text-relay-muted dark:text-relay-muted-light text-[10px] font-bold tracking-widest mt-4">No transactions yet</p>
              <p className="text-relay-muted dark:text-relay-muted-light text-xs mt-2 max-w-[260px] mx-auto">Swap or list items to see credit movements here.</p>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
