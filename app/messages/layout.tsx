import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Inbox — Relay',
  description: 'Your messages and swap conversations on Relay.',
};

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
