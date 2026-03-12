'use client';

import React from 'react';

const shimmerStyle: React.CSSProperties = {
  background:
    'linear-gradient(90deg, var(--skeleton-base) 0%, var(--skeleton-highlight) 50%, var(--skeleton-base) 100%)',
  backgroundSize: '200% 100%',
  animation: 'skeletonShimmer 1.5s ease-in-out infinite',
};

type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Rounded rectangle; use className for size (e.g. h-4 w-full, h-24 rounded-xl) */
};

/** Base skeleton block — rounded rectangle with shimmer. Use for cards, bars, text lines. */
export function Skeleton({ className = '', style, ...props }: SkeletonProps) {
  return (
    <div
      className={`rounded-md bg-[var(--skeleton-base)] ${className}`}
      style={{ ...shimmerStyle, ...style }}
      aria-hidden
      {...props}
    />
  );
}

type SkeletonCircleProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Use for avatars and icons (e.g. size-10, size-16) */
};

/** Circle skeleton for avatars/icons. */
export function SkeletonCircle({ className = '', style, ...props }: SkeletonCircleProps) {
  return (
    <div
      className={`rounded-full bg-[var(--skeleton-base)] ${className}`}
      style={{ ...shimmerStyle, ...style }}
      aria-hidden
      {...props}
    />
  );
}

type SkeletonTextProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Width of the line for a natural look — e.g. "60%", "80%", "40%" */
  width?: string;
};

/** Single text-line skeleton with natural varying width. */
export function SkeletonText({
  width = '80%',
  className = '',
  style,
  ...props
}: SkeletonTextProps) {
  return (
    <Skeleton
      className={`h-4 ${className}`}
      style={{ width, maxWidth: '100%', ...style }}
      {...props}
    />
  );
}

type ScreenSkeletonProps = {
  /** Optional background + layout classes for the outer container */
  className?: string;
  /** Number of text bars to show under the header block */
  rows?: number;
  /** Whether to include a circular avatar skeleton at the top */
  showCircle?: boolean;
};

/**
 * Generic full-screen skeleton for page-level loading states.
 * Uses the global skeleton tokens + shimmer so blank spinner screens are avoided.
 */
export function ScreenSkeleton({
  className = 'bg-relay-surface dark:bg-relay-surface-dark',
  rows = 3,
  showCircle = false,
}: ScreenSkeletonProps) {
  const safeRows = Number.isFinite(rows) && rows > 0 ? Math.min(Math.floor(rows), 6) : 3;
  const widths = ['80%', '60%', '90%', '70%', '50%', '85%'];

  return (
    <div className={`flex flex-1 min-h-0 items-center justify-center ${className}`}>
      <div className="w-full max-w-xs px-6 space-y-4">
        {showCircle && (
          <div className="flex justify-center mb-2">
            <SkeletonCircle className="size-14" />
          </div>
        )}
        <Skeleton className="h-4 w-2/3 mb-2" />
        {Array.from({ length: safeRows }).map((_, idx) => (
          <Skeleton
            // eslint-disable-next-line react/no-array-index-key
            key={idx}
            className="h-3 rounded-md"
            style={{ width: widths[idx] ?? widths[widths.length - 1] }}
          />
        ))}
      </div>
    </div>
  );
}

type SkeletonScreenProps = {
  isLoading: boolean;
  /** Layout built from Skeleton / SkeletonCircle / SkeletonText that mirrors the real screen */
  skeleton: React.ReactNode;
  /** Real content; when isLoading flips to false, this fades in with opacity 0.3s ease */
  children: React.ReactNode;
  /** Optional wrapper className for the content container */
  className?: string;
};

/**
 * When isLoading is true, shows skeleton layout.
 * When isLoading becomes false, shows children with a smooth fade-in (opacity 0.3s ease).
 */
export function SkeletonScreen({ isLoading, skeleton, children, className = '' }: SkeletonScreenProps) {
  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0" aria-busy="true" aria-live="polite">
          {skeleton}
        </div>
      )}
      <div
        className="transition-opacity duration-300 ease-out"
        style={{ opacity: isLoading ? 0 : 1 }}
        aria-hidden={isLoading}
      >
        {children}
      </div>
    </div>
  );
}
