'use client';

import React, { useState } from 'react';
import { PRICING_PLANS } from '@/lib/constants';
import { type } from '@/lib/typography';
import { PageHeader } from '@/app/components/PageHeader';

const STRIPE_MEMBERSHIP_PAYMENT_LINK = process.env.NEXT_PUBLIC_STRIPE_MEMBERSHIP_PAYMENT_LINK ?? '';

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark transition-colors">
      <div className="page-scroll">
      <PageHeader className="sticky top-0">
        <h1 className={`${type.h1} !font-semibold text-relay-text dark:text-relay-text-dark`}>Membership</h1>
      </PageHeader>
      <div className="pb-20">
      <div className="px-6 text-center mb-10 pt-8">
        <p className="text-relay-muted dark:text-relay-muted-light text-sm font-light leading-relaxed max-w-[280px] mx-auto">
          Unlock the full potential of tech swapping. Join the Rellaey+ community.
        </p>
      </div>

      <div className="px-6 flex justify-center mb-12">
        <div className="bg-relay-bg dark:bg-relay-bg-dark p-1.5 rounded-2xl flex items-center border border-relay-border dark:border-relay-border-dark shadow-sm">
          <button 
            onClick={() => setBillingCycle('monthly')}
            className={`px-8 py-3 rounded-xl text-[10px] font-bold tracking-widest transition-all ${billingCycle === 'monthly' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-relay-muted hover:text-relay-text dark:hover:text-relay-text-dark'}`}
          >
            Monthly
          </button>
          <button 
            onClick={() => setBillingCycle('annual')}
            className={`px-8 py-3 rounded-xl text-[10px] font-bold tracking-widest transition-all ${billingCycle === 'annual' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-relay-muted hover:text-relay-text dark:hover:text-relay-text-dark'}`}
          >
            Annual <span className="ml-1 text-[8px] opacity-70">Save 20%</span>
          </button>
        </div>
      </div>

      <div className="px-6 space-y-10">
        {PRICING_PLANS.map((plan) => {
          const isRelayPlus = plan.id === 'relay-plus';
          const displayPrice = isRelayPlus && billingCycle === 'annual' ? plan.annualPrice : plan.price;
          const displayInterval = isRelayPlus && billingCycle === 'annual' ? 'year' : plan.interval;

          return (
            <div 
              key={plan.id}
              className={`relative p-10 rounded-[56px] border transition-all duration-500 ${plan.popular ? 'border-transparent bg-primary/5 shadow-2xl shadow-primary/5' : 'border-relay-border dark:border-relay-border-dark bg-relay-bg dark:bg-relay-bg-dark'}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-2.5 bg-primary rounded-full text-[9px] font-bold tracking-[0.3em] text-white shadow-xl shadow-primary/30">
                  Recommended
                </div>
              )}
              <div className="mb-8">
                <h3 className="font-serif text-4xl  text-relay-text dark:text-relay-text-dark mb-2 tracking-tighter">{plan.name}</h3>
                {plan.description ? <p className="text-relay-muted text-xs font-light tracking-tighter">{plan.description}</p> : null}
              </div>
              <div className="flex items-baseline gap-2 mb-10">
                <span className="text-6xl font-display font-bold text-relay-text dark:text-relay-text-dark tracking-tighter">{displayPrice}</span>
                <span className="text-primary text-[10px] font-bold tracking-widest">/ {displayInterval}</span>
              </div>
              <div className="w-full h-px bg-relay-border dark:border-relay-border-dark mb-10"></div>
              <ul className="space-y-6 mb-12">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className={`flex items-start gap-4 text-xs ${feature.included ? 'text-relay-text dark:text-relay-text-dark' : 'text-relay-muted opacity-30 line-through'}`}>
                    <span className={`material-symbols-outlined !text-[20px] ${feature.included ? 'text-primary' : 'text-relay-muted'}`}>
                      {feature.included ? 'verified' : 'cancel'}
                    </span>
                    <span className="font-medium tracking-tighter mt-0.5">{feature.text}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => {
                  if (plan.id === 'guest') {
                    router.push('/');
                    return;
                  }
                  if (STRIPE_MEMBERSHIP_PAYMENT_LINK) {
                    window.location.href = STRIPE_MEMBERSHIP_PAYMENT_LINK;
                  } else {
                    router.push('/profile');
                  }
                }}
                className={`w-full max-w-[50%] mx-auto h-8 rounded-[24px] text-xs font-semibold tracking-[0.15em] transition-all active-scale ${plan.popular ? 'bg-primary text-white hover:bg-primary/90 shadow-2xl shadow-primary/30' : 'border-2 border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark hover:bg-relay-bg transition-colors'}`}
              >
                {plan.id === 'guest' ? 'Continue as Guest' : `Get ${plan.name} ${billingCycle === 'annual' ? 'Annual' : 'Monthly'}`}
              </button>
            </div>
          );
        })}
      </div>

      <div className="px-6 mt-20 text-center space-y-6">
        <p className="text-[10px] font-bold tracking-[0.4em] text-relay-muted">Rellaey Secure Checkout</p>
        <div className="flex justify-center items-center gap-8 opacity-40 grayscale hover:grayscale-0 transition-all">
          <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" alt="Stripe" className="h-5" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-5" />
        </div>
        <p className="text-[9px] text-relay-muted px-10 leading-relaxed ">
          Subscriptions can be managed or cancelled at any time from your account settings. Taxes may apply based on your location.
        </p>
      </div>
      </div>
      </div>
    </div>
  );
}
