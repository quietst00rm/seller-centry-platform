'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function InviteHandler() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=invite')) {
      router.replace('/auth/setup-password' + hash);
    }
  }, [router]);

  return null;
}
