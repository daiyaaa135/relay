import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-relay-surface dark:bg-relay-surface-dark px-6">
      <h1 className="text-6xl font-serif  text-relay-text dark:text-relay-text-dark mb-4 tracking-tighter">404</h1>
      <p className="text-relay-muted font-bold text-[10px] tracking-widest mb-8">Page not found</p>
      <Link href="/" className="px-10 py-4 bg-primary text-white text-xs font-semibold tracking-widest rounded-full shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all">
        Back to Explore
      </Link>
    </div>
  );
}
