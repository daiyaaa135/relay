import React from 'react';
export function LaptopIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <path d="M23 2.5H1V16.5H23V2.5Z" fill="currentColor" fillOpacity={0.9} />
      <path d="M22.5 3V16H1.5V3H22.5Z" stroke="currentColor" strokeOpacity={0.2} />
      <path d="M15 16.92H9V22H15V16.92Z" fill="currentColor" />
      <path d="M18 20.5H6C5.72 20.5 5.5 20.72 5.5 21V21.5C5.5 21.78 5.72 22 6 22H18C18.28 22 18.5 21.78 18.5 21.5V21C18.5 20.72 18.28 20.5 18 20.5Z" fill="currentColor" fillOpacity={0.3} />
    </svg>
  );
}
