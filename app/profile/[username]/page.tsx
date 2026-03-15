import type { Metadata } from 'next';
import ProfileContent from '../ProfileContent';

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const decoded = decodeURIComponent(username);
  return {
    title: `${decoded} — Relay`,
    description: `View ${decoded}'s listings and profile on Relay.`,
  };
}

export default async function ProfileUsernamePage({ params }: Props) {
  const { username } = await params;
  return <ProfileContent username={username} />;
}
