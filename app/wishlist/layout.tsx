import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wishlist — Relay',
  description: 'Your saved items on Relay.',
};

export default function WishlistLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
