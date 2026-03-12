'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { fetchProfile } from '@/lib/profiles';
import { fetchTransactions, transactionDisplay } from '@/lib/transactions';
import { type } from '@/lib/typography';
import { ChevronIcon } from '@/app/components/ChevronIcon';
import { PageHeader } from '@/app/components/PageHeader';
import { NextStepButton } from '@/app/components/NextStepButton';

function WalletCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="w-full relative overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.10)]"
      style={{ aspectRatio: '334 / 206', borderRadius: '6%', background: '#0b091b' }}
    >
      {/* Rectangle 5 — main glass gradient */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: 'linear-gradient(112.83deg, rgba(255,255,255,0.47) 0%, rgba(255,255,255,0) 110.84%)',
          backdropFilter: 'blur(21px)',
          WebkitBackdropFilter: 'blur(21px)',
        }}
      />
      {/* Rectangle 6 — secondary glass gradient */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: 'linear-gradient(112.32deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 101.12%)',
          backdropFilter: 'blur(21px)',
          WebkitBackdropFilter: 'blur(21px)',
        }}
      />
      {/* Ellipse 30 — large decorative ring */}
      <div
        className="absolute z-0"
        style={{
          left: '17.96%',
          width: '115.69%',
          top: '-24.18%',
          height: '186.87%',
          border: '2px solid rgba(255,255,255,0.06)',
          borderRadius: '50%',
          transform: 'rotate(15deg)',
        }}
      />
      {/* Ellipse 31 — medium decorative ring */}
      <div
        className="absolute z-0"
        style={{
          left: '36.32%',
          width: '85.77%',
          top: '5.35%',
          height: '138.54%',
          border: '2px solid rgba(255,255,255,0.06)',
          borderRadius: '50%',
          transform: 'rotate(15deg)',
        }}
      />
      {/* Ellipse 34 — bottom-right glass accent */}
      <div
        className="absolute z-0"
        style={{
          left: '60.18%',
          width: '57.19%',
          top: '44.01%',
          height: '92.38%',
          background: 'linear-gradient(105.9deg, rgba(255,255,255,0.47) -16.48%, rgba(255,255,255,0) 80.65%)',
          backdropFilter: 'blur(21px)',
          WebkitBackdropFilter: 'blur(21px)',
          borderRadius: '50%',
        }}
      />
      {/* Content */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-end pb-6">
        {children}
      </div>
    </div>
  );
}

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
        <PageHeader onBack={() => router.push('/more')}>
          <h1 className={`${type.h1} !font-semibold text-relay-text dark:text-relay-text-dark`}>Wallet</h1>
        </PageHeader>
        <section className="shrink-0 px-6 py-8 flex flex-col items-center justify-center bg-transparent overflow-hidden pt-safe-2" aria-label="Credit balance">
          <WalletCard>
            <p className="text-[10px] text-white/60 font-bold tracking-[0.3em]">Available credits:</p>
            <div className="h-8 w-24 bg-white/20 rounded animate-pulse mt-1" />
          </WalletCard>
        </section>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="size-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!profileId) {
    return (
      <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark transition-colors">
        <PageHeader onBack={() => router.push('/more')}>
          <h1 className={`${type.h1} !font-semibold text-relay-text dark:text-relay-text-dark`}>Wallet</h1>
        </PageHeader>
        <section className="shrink-0 px-6 py-8 flex flex-col items-center justify-center bg-transparent overflow-hidden pt-safe-2" aria-label="Credit balance">
          <WalletCard>
            <p className="text-[10px] text-white/60 font-bold tracking-[0.3em]">Available credits:</p>
            <p className="font-display text-2xl font-bold text-white tracking-tighter mt-1">0</p>
          </WalletCard>
        </section>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <p className="text-relay-muted dark:text-relay-muted-light text-sm mb-4">Log in to view your wallet.</p>
          <NextStepButton
            type="button"
            onClick={() => router.push('/login')}
            className="px-10 py-3 rounded-xl tracking-widest"
          >
            Log in
          </NextStepButton>
        </div>
      </div>
    );
  }

  const balance = credits ?? 0;

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark transition-colors">
      <PageHeader onBack={() => router.push('/more')}>
        <h1 className={`${type.h1} !font-semibold text-relay-text dark:text-relay-text-dark`}>Wallet</h1>
      </PageHeader>
      <section className="shrink-0 px-6 py-8 flex flex-col items-center justify-center bg-transparent pt-safe-2" aria-label="Credit balance">
        <WalletCard>
          <p className="text-[10px] text-white/60 font-bold tracking-[0.3em]">Available credits:</p>
          <p className="font-display text-3xl font-bold text-white tracking-tighter mt-1">
            {balance.toLocaleString()} <span className="text-[#FFEB87] text-xl font-serif">Cr</span>
          </p>
        </WalletCard>
      </section>

      <div className="px-6 pt-8 pb-20">
        <div className="flex justify-end mb-6">
          <span className="text-[9px] font-bold text-primary tracking-[0.2em] border-b border-primary/20">All transactions</span>
        </div>

        {transactions.length > 0 ? (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between bg-white dark:bg-relay-bg-dark rounded-2xl px-4 py-4 shadow-sm group cursor-default">
                <div className="flex items-center gap-4">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-muted transition-colors ${
                      tx.type === 'credit' ? 'group-hover:text-emerald-500' : 'group-hover:text-red-500'
                    }`}>
                    <span className="material-symbols-outlined text-[20px]">
                      {tx.type === 'credit' ? 'arrow_upward' : 'arrow_downward'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-relay-text dark:text-relay-text-dark tracking-tighter">{tx.title}</span>
                    <span className="text-[10px] text-relay-muted font-medium tracking-widest mt-0.5">{tx.date} • {tx.status}</span>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <span
                    className={`text-base font-bold tracking-tighter ${
                      tx.type === 'credit' ? 'text-emerald-500' : ''
                    }`}
                    style={tx.type === 'debit' ? { color: '#EF4444' } : undefined}
                  >
                    {tx.type === 'credit' ? '+' : '-'}{tx.amount.toLocaleString()}
                  </span>
                  <span
                    className={`block text-[8px] font-bold tracking-widest ${
                      tx.type === 'credit' ? 'text-emerald-500' : ''
                    }`}
                    style={tx.type === 'debit' ? { color: '#EF4444' } : undefined}
                  >
                    Cr
                  </span>
                </div>
              </div>
            ))}
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
  );
}
