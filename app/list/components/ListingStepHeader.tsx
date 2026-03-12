'use client';

import React from 'react';
import { ChevronIcon } from '@/app/components/ChevronIcon';

type ListingStepHeaderProps = {
  currentStep: number;
  totalSteps: number;
  title: string;
  onBack: () => void;
};

export function ListingStepHeader({ currentStep, totalSteps, title, onBack }: ListingStepHeaderProps) {
  const progressPercent = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

  return (
    <header className="shrink-0 bg-relay-surface dark:bg-relay-surface-dark z-50 pt-safe">
      <div className="flex items-center justify-between h-14 px-4">
        <button
          type="button"
          onClick={onBack}
          className="p-2 -ml-2 text-relay-text dark:text-relay-text-dark hover:bg-relay-bg dark:hover:bg-relay-bg-dark rounded-lg transition-colors"
          aria-label="Back"
        >
          <ChevronIcon direction="left" className="size-6" />
        </button>
        <h1 className="text-sm font-medium text-relay-text dark:text-relay-text-dark truncate uppercase">
          {currentStep} OF {totalSteps}: {title.toUpperCase()}
        </h1>
        <span className="w-9" />
      </div>
      <div className="h-1 bg-gray-200 dark:bg-gray-700">
        <div
          className="h-full bg-gray-600 dark:bg-gray-500 transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </header>
  );
}
