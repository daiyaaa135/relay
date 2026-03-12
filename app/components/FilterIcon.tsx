/** Filter/sliders icon matching the stroke style of category scroller icons. */
export function FilterIcon({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <line x1="8" y1="18" x2="56" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="22" cy="18" r="5" stroke="currentColor" strokeWidth="2" />
      <line x1="8" y1="32" x2="56" y2="32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="42" cy="32" r="5" stroke="currentColor" strokeWidth="2" />
      <line x1="8" y1="46" x2="56" y2="46" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="30" cy="46" r="5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
