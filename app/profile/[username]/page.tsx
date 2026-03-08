'use client';

import { useParams } from 'next/navigation';
import ProfileContent from '../ProfileContent';

export default function ProfileUsernamePage() {
  const params = useParams();
  const username = params.username as string;

  return <ProfileContent username={username} />;
}
