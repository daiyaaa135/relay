'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /signup redirects to the welcome flow (phone → SMS → email → etc.).
 * The legacy Create Account page (display name, username, email, password) has been removed.
 */
export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/welcome');
  }, [router]);

  return null;
}
