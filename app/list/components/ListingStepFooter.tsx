'use client';

import React from 'react';
import { ChevronIcon } from '@/app/components/ChevronIcon';

type BaseFooterProps = {
  /** Safe area bottom padding so content is not hidden behind the bar (e.g. pb-20 on scroll container). */
  className?: string;
};

type Step1OrConditionFooterProps = BaseFooterProps & {
  variant: 'step1' | 'condition-or-functionality';
  nextDisabled: boolean;
  onNext: () => void;
};

type VerifyAndNextFooterProps = BaseFooterProps & {
  variant: 'verify-and-next';
  verifyDisabled: boolean;
  verifying: boolean;
  nextDisabled: boolean;
  onVerify: () => void;
  onNext: () => void;
};

type PhotosFooterProps = BaseFooterProps & {
  variant: 'photos';
  primaryLabel: string;
  primaryDisabled: boolean;
  onPrimary: () => void;
  nextDisabled: boolean;
  onNext: () => void;
};

type ReviewFooterProps = BaseFooterProps & {
  variant: 'review';
  primaryLabel: string;
  primaryDisabled: boolean;
  onPrimary: () => void;
  leftSlot?: React.ReactNode;
};

export type ListingStepFooterProps =
  | Step1OrConditionFooterProps
  | VerifyAndNextFooterProps
  | PhotosFooterProps
  | ReviewFooterProps;

const barClassName =
  'fixed bottom-0 left-0 right-0 pt-2 px-4 pb-[calc(var(--safe-bottom)*0.4+0.5rem)] glass-card border-0 border-t border-relay-border dark:border-relay-border-dark backdrop-blur-[12px] z-[9999] max-w-md mx-auto rounded-t-2xl';
const barStyle: React.CSSProperties = { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 };

export function ListingStepFooter(props: ListingStepFooterProps) {
  const { variant, className } = props;

  if (variant === 'step1' || variant === 'condition-or-functionality') {
    const { nextDisabled, onNext } = props;
    return (
      <div className={`${barClassName} ${className ?? ''}`.trim()} style={barStyle}>
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            className="flex items-center justify-center h-10 w-10 rounded-full text-relay-text dark:text-relay-text-dark disabled:opacity-50 disabled:cursor-not-allowed bg-relay-surface dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark shadow-sm"
            aria-label="Next step"
          >
            <ChevronIcon direction="right" className="size-5" />
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'verify-and-next') {
    const { verifyDisabled, verifying, nextDisabled, onVerify, onNext } = props;
    return (
      <div className={`${barClassName} ${className ?? ''}`.trim()} style={barStyle}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onVerify}
            disabled={verifyDisabled}
            className="flex-1 h-9 rounded-full bg-primary text-white font-semibold text-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {verifying ? (
              <>
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify'
            )}
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            className="shrink-0 flex items-center justify-center size-9 rounded-full bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
            aria-label="Next step"
          >
            <ChevronIcon direction="right" className="size-5" />
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'photos') {
    const { primaryLabel, primaryDisabled, onPrimary, nextDisabled, onNext } = props;
    return (
      <div className={`${barClassName} ${className ?? ''}`.trim()} style={barStyle}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onPrimary}
            disabled={primaryDisabled}
            className="flex-1 h-9 rounded-full bg-primary text-white font-semibold text-[10px] tracking-widest uppercase disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {primaryLabel}
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            className="shrink-0 flex items-center justify-center size-9 rounded-full bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
            aria-label="Next step"
          >
            <ChevronIcon direction="right" className="size-5" />
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'review') {
    const { primaryLabel, primaryDisabled, onPrimary, leftSlot } = props;
    return (
      <div className={`${barClassName} ${className ?? ''}`.trim()} style={barStyle}>
        <div className="flex items-center justify-between gap-4">
          {leftSlot ?? null}
          <button
            type="button"
            disabled={primaryDisabled}
            onClick={onPrimary}
            className="flex-1 h-9 rounded-full bg-primary text-white font-semibold text-[10px] tracking-widest uppercase disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
