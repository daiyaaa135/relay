'use client';

import React, { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SuccessTransition } from '@/app/components/SuccessTransition';

export default function LocationPage() {
  const router = useRouter();
  const [showSuccess, setShowSuccess] = useState(false);
  const hasNavigatedRef = useRef(false);

  const handleGrantAccess = () => {
    // In a future iteration this is where we would request native location access.
    setShowSuccess(true);
  };

  const handleAnimationComplete = useCallback(() => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    router.replace('/');
  }, [router]);

  return (
    <>
      <div className="min-h-screen flex flex-col bg-white dark:bg-relay-bg-dark transition-colors">
        <main className="flex-1 flex flex-col px-6 pt-8 pb-10">
          <p className="text-[10px] font-semibold text-relay-muted uppercase tracking-wide mb-2">
            Two things and we&rsquo;re done
          </p>
          <h1 className="text-[22px] font-bold text-relay-text dark:text-relay-text-dark tracking-tight mb-12">
            Second, we need access to Location
          </h1>

          {/* Map pin with concentric ellipses */}
          <div className="flex-1 flex items-center justify-center relative my-8">
            <svg width="375" height="275" viewBox="0 0 375 275" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g filter="url(#filter0_f_7_882)">
                <ellipse cx="188" cy="146" rx="215" ry="104" fill="#F2F2F2" fillOpacity="0.8"/>
              </g>
              <ellipse cx="188" cy="146" rx="201" ry="104" fill="white"/>
              <path d="M188 42.5C243.441 42.5 293.609 54.1287 329.898 72.9053C366.213 91.6949 388.5 117.564 388.5 146C388.5 174.436 366.213 200.305 329.898 219.095C293.609 237.871 243.441 249.5 188 249.5C132.559 249.5 82.3909 237.871 46.1016 219.095C9.787 200.305 -12.5 174.436 -12.5 146C-12.5 117.564 9.787 91.6949 46.1016 72.9053C82.3909 54.1287 132.559 42.5 188 42.5Z" stroke="#D8D8D8" strokeOpacity="0.24"/>
              <g filter="url(#filter1_f_7_882)">
                <ellipse cx="188" cy="166" rx="143" ry="58" fill="#F2F2F2" fillOpacity="0.8"/>
              </g>
              <ellipse cx="188" cy="166" rx="134" ry="58" fill="white"/>
              <path d="M188 108.5C224.951 108.5 258.381 114.983 282.554 125.446C294.641 130.678 304.391 136.896 311.112 143.773C317.831 150.649 321.5 158.159 321.5 166C321.5 173.841 317.831 181.351 311.112 188.227C304.391 195.104 294.641 201.322 282.554 206.554C258.381 217.017 224.951 223.5 188 223.5C151.049 223.5 117.619 217.017 93.4463 206.554C81.359 201.322 71.6088 195.104 64.8877 188.227C58.169 181.351 54.5 173.841 54.5 166C54.5 158.159 58.169 150.649 64.8877 143.773C71.6088 136.896 81.359 130.678 93.4463 125.446C117.619 114.983 151.049 108.5 188 108.5Z" stroke="#D8D8D8" strokeOpacity="0.54"/>
              <g filter="url(#filter2_f_7_882)">
                <ellipse cx="188" cy="180" rx="60" ry="26" fill="#F2F2F2" fillOpacity="0.8"/>
              </g>
              <ellipse cx="188" cy="180" rx="48" ry="21" fill="white"/>
              <path d="M188 159.5C201.202 159.5 213.131 161.842 221.74 165.608C226.046 167.492 229.499 169.723 231.868 172.174C234.235 174.622 235.5 177.266 235.5 180C235.5 182.734 234.235 185.378 231.868 187.826C229.499 190.277 226.046 192.508 221.74 194.392C213.131 198.158 201.202 200.5 188 200.5C174.798 200.5 162.869 198.158 154.26 194.392C149.954 192.508 146.501 190.277 144.132 187.826C141.765 185.378 140.5 182.734 140.5 180C140.5 177.266 141.765 174.622 144.132 172.174C146.501 169.723 149.954 167.492 154.26 165.608C162.869 161.842 174.798 159.5 188 159.5Z" stroke="#D8D8D8" strokeOpacity="0.54"/>
              <ellipse cx="188" cy="182" rx="18" ry="8" fill="white"/>
              <path d="M188 174.5C192.917 174.5 197.345 175.387 200.524 176.8C202.115 177.507 203.372 178.335 204.224 179.23C205.073 180.123 205.5 181.058 205.5 182C205.5 182.942 205.073 183.877 204.224 184.77C203.372 185.665 202.115 186.493 200.524 187.2C197.345 188.613 192.917 189.5 188 189.5C183.083 189.5 178.655 188.613 175.476 187.2C173.885 186.493 172.628 185.665 171.776 184.77C170.927 183.877 170.5 182.942 170.5 182C170.5 181.058 170.927 180.123 171.776 179.23C172.628 178.335 173.885 177.507 175.476 176.8C178.655 175.387 183.083 174.5 188 174.5Z" stroke="#D8D8D8" strokeOpacity="0.36"/>
              <rect width="375" height="170" fill="url(#paint0_linear_7_882)"/>
              <path d="M212 146C212 164.667 188 180.667 188 180.667C188 180.667 164 164.667 164 146C164 139.635 166.529 133.53 171.029 129.029C175.53 124.529 181.635 122 188 122C194.365 122 200.47 124.529 204.971 129.029C209.471 133.53 212 139.635 212 146Z" fill="#101010"/>
              <path d="M188 154C192.418 154 196 150.418 196 146C196 141.582 192.418 138 188 138C183.582 138 180 141.582 180 146C180 150.418 183.582 154 188 154Z" fill="white"/>
              <defs>
                <filter id="filter0_f_7_882" x="-52" y="17" width="480" height="258" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                  <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                  <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                  <feGaussianBlur stdDeviation="12.5" result="effect1_foregroundBlur_7_882"/>
                </filter>
                <filter id="filter1_f_7_882" x="20" y="83" width="336" height="166" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                  <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                  <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                  <feGaussianBlur stdDeviation="12.5" result="effect1_foregroundBlur_7_882"/>
                </filter>
                <filter id="filter2_f_7_882" x="103" y="129" width="170" height="102" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                  <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                  <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                  <feGaussianBlur stdDeviation="12.5" result="effect1_foregroundBlur_7_882"/>
                </filter>
                <linearGradient id="paint0_linear_7_882" x1="187.5" y1="113.5" x2="187.5" y2="170" gradientUnits="userSpaceOnUse">
                  <stop stopColor="white"/>
                  <stop offset="1" stopColor="white" stopOpacity="0"/>
                </linearGradient>
              </defs>
            </svg>
          </div>

          <button
            type="button"
            onClick={handleGrantAccess}
            className="h-12 w-full rounded-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-relay-surface-dark text-xs font-medium text-neutral-900 dark:text-relay-text-dark tracking-tight"
          >
            Grant Access to Location
          </button>
        </main>
      </div>

      {showSuccess && <SuccessTransition onComplete={handleAnimationComplete} />}
    </>
  );
}

