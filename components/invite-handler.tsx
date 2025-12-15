'use client';

import { useEffect } from 'react';

export function InviteHandler() {
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=invite')) {
      // Use window.location.href for reliable redirect with hash fragment
      window.location.href = '/auth/setup-password' + hash;
    }
  }, []);

  return null;
}
