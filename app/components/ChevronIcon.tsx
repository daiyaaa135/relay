import React from 'react';

type ChevronDirection = 'left' | 'right';

export function ChevronIcon({
  direction = 'right',
  className,
}: {
  direction?: ChevronDirection;
  className?: string;
}) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M9 5L16 12L9 19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform={direction === 'left' ? 'rotate(180 12 12)' : undefined}
      />
    </svg>
  );
}

