'use client';

import { useState, useEffect } from 'react';
import type { UserAccount } from '@/types';

interface UseUserAccountsReturn {
  accounts: UserAccount[];
  loading: boolean;
  error: string | null;
}

export function useUserAccounts(): UseUserAccountsReturn {
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAccounts() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/user-subdomain');
        if (!response.ok) {
          throw new Error('Failed to fetch accounts');
        }

        const data = await response.json();
        console.log('[useUserAccounts] API response:', data);
        if (data.success && data.data?.accounts) {
          console.log(`[useUserAccounts] Setting ${data.data.accounts.length} accounts:`, data.data.accounts);
          setAccounts(data.data.accounts);
        } else {
          console.log('[useUserAccounts] No accounts in response or request failed');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch accounts');
        console.error('Error fetching user accounts:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAccounts();
  }, []);

  return { accounts, loading, error };
}
