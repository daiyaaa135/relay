'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronIcon } from '@/app/components/ChevronIcon';

type PageHeaderProps = {
  children: React.ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
  /** Optional right-side content (e.g. Cancel, Save). */
  right?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** When true, applies the standard safe-area top padding used across pages. */
  useSafeAreaTopPadding?: boolean;
};

const baseClasses =
  'shrink-0 px-6 pb-4 border-b border-relay-border dark:border-relay-border-dark flex items-center gap-4 bg-relay-surface/95 dark:bg-relay-surface-dark/95 backdrop-blur-md z-30';

export function PageHeader({
  children,
  showBackButton = true,
  onBack,
  right,
  className,
  style,
  useSafeAreaTopPadding = true,
}: PageHeaderProps) {
  const router = useRouter();

  const handleBack = React.useCallback(() => {
    if (onBack) onBack();
    else router.back();
  }, [onBack, router]);

  const safeAreaClass = useSafeAreaTopPadding ? ' pt-safe-2_25' : '';
  const mergedClassName = (className ? `${baseClasses} ${className}` : baseClasses) + safeAreaClass;
  const mergedStyle: React.CSSProperties = {
    ...style,
  };

  return (
    <header className={mergedClassName} style={mergedStyle}>
      {showBackButton && (
        <button
          onClick={handleBack}
          className="flex size-10 items-center justify-center rounded-full bg-relay-surface dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark shadow-sm active-scale"
          aria-label="Go back"
        >
          <ChevronIcon direction="left" className="size-6" />
        </button>
      )}
      <div className="min-w-0 flex-1 flex items-center gap-4">
        {children}
      </div>
      {right != null ? <div className="shrink-0">{right}</div> : null}
    </header>
  );
}

