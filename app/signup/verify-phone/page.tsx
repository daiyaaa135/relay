'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function VerifyPhonePage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits ? `(${digits}` : '';
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setPhone(formatPhone(raw));
  };

  const displayValue = phone || '';
  const digitsOnly = phone.replace(/\D/g, '');
  const isValidLength = digitsOnly.length === 10;
  const isDisabled = !isValidLength;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="shrink-0 flex justify-end p-4 pr-5 pt-6">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="size-10 flex items-center justify-center rounded-full text-[#5f6368] hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <span className="material-symbols-outlined text-[28px]">close</span>
        </button>
      </div>

      <main className="flex-1 flex flex-col items-center px-6 pb-8 max-w-[400px] mx-auto w-full">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center shrink-0 mb-8"
          style={{ backgroundColor: '#E8F0FE' }}
        >
          <div className="relative">
            <span className="material-symbols-outlined text-[48px] text-[#5f6368]">smartphone</span>
            <span
              className="absolute -bottom-0.5 -right-0.5 material-symbols-outlined text-[22px] text-[#5f6368] bg-[#E8F0FE] rounded-full"
              style={{ padding: 2 }}
              aria-hidden
            >
              verified
            </span>
          </div>
        </div>

        <h1 className="text-[28px] font-bold text-[#202124] text-center tracking-tight mb-2">
          Verify your phone
        </h1>
        <p className="text-[16px] text-[#5f6368] text-center mb-10 leading-normal">
          We will send you a code to verify your number
        </p>

        <div className="w-full space-y-2 mb-6">
          <label htmlFor="phone" className="block text-[14px] font-medium text-[#202124]">
            Enter mobile number*
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5f6368] text-base select-none">
              +1
            </span>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={displayValue}
              onChange={handlePhoneChange}
              placeholder="(000)-000-0000"
              className="w-full h-12 pl-11 pr-4 rounded-xl border border-[#dadce0] bg-white text-[#202124] text-base placeholder:text-[#9aa0a6] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30 focus:border-[#1a73e8] transition-shadow"
            />
          </div>
        </div>

        <button
          type="button"
          disabled={isDisabled}
          className="w-full h-12 rounded-xl text-base font-medium transition-colors disabled:bg-[#e8eaed] disabled:text-[#5f6368] enabled:bg-[#1a73e8] enabled:text-white enabled:hover:bg-[#1765cc] disabled:cursor-not-allowed mb-12"
        >
          Next
        </button>

        <div className="w-full space-y-4 text-left">
          <p className="text-[13px] text-[#202124] leading-relaxed">
            By requesting a verification code you are consenting to allow Rellaey to send a message via text/SMS to your phone number.{' '}
            <a
              href="/help/legal-terms-of-service"
              className="text-[#1a73e8] underline underline-offset-1"
            >
              Learn more.
            </a>
          </p>
          <p className="text-[12px] text-[#5f6368] leading-relaxed">
            * Receive 1 message per request. Message and data rates may apply.
          </p>
          <div className="flex flex-col gap-2 pt-1">
            <a
              href="/help/legal-terms-of-service"
              className="text-[13px] text-[#1a73e8] underline underline-offset-1"
            >
              Rellaey SMS Terms of Service
            </a>
            <a
              href="/help/legal-privacy-policy"
              className="text-[13px] text-[#1a73e8] underline underline-offset-1"
            >
              Rellaey Privacy Policy
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
