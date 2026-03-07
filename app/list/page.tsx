'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ListRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/list/1');
  }, [router]);
  return null;
}
