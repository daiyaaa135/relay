import React from 'react';

/** 24×24 heart outline for add-to-wishlist. When active, uses glass gradient fill (same as Save as draft button). */
export function WishlistHeartIcon({ className, active }: { className?: string; active?: boolean }) {
  const gradientId = React.useId().replace(/:/g, '');
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
      {active && (
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF5621" />
            <stop offset="100%" stopColor="#FF8900" stopOpacity="0.49" />
          </linearGradient>
        </defs>
      )}
      <path
        d="M20.3115 4.46071C17.9773 2.08032 15.2743 3.08425 13.6007 4.14593C12.655 4.74582 11.345 4.74582 10.3993 4.14593C8.72564 3.08427 6.02272 2.08035 3.68853 4.46072C-1.85249 10.1114 7.64988 21 12 21C16.3502 21 25.8525 10.1114 20.3115 4.46071Z"
        stroke={active ? 'none' : 'currentColor'}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill={active ? `url(#${gradientId})` : 'none'}
      />
    </svg>
  );
}
