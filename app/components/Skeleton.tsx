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
