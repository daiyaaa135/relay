'use client';

import React from 'react';

interface RatingDisplayProps {
  rating: number;
  count?: number;
  /** Size variant: 'sm' for compact (e.g. listing cards), 'md' for default */
  size?: 'sm' | 'md';
}

export function RatingDisplay({ rating, count = 0, size = 'md' }: RatingDisplayProps) {
  const starSize = size === 'sm' ? '!text-[11px]' : '!text-[16px]';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-[12px]';

  if (rating <= 0) {
    return null;
  }

  const rounded = Math.min(5, Math.max(0, Math.round(rating)));

  return (
    <div className="flex flex-col items-start gap-1">
      <p className={`${textSize} font-normal text-relay-text dark:text-relay-text-dark text-left`}>
        {rating.toFixed(1)}
        {count > 0 && (
          <span className="text-relay-muted ml-0.5">({count})</span>
        )}
      </p>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <span
            key={s}
            className={`material-symbols-outlined ${starSize} ${s <= rounded ? 'text-primary' : 'text-relay-muted opacity-40'}`}
            style={s <= rounded ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            star
          </span>
        ))}
      </div>
    </div>
  );
}
