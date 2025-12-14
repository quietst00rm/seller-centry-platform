'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Violation, ViolationTab } from '@/types';

interface UseViolationsDataOptions {
  tab?: ViolationTab;
}

interface UseViolationsDataReturn {
  violations: Violation[];
  loading: boolean;
  error: string | null;
  lastSync: Date | null;
  refetch: () => Promise<void>;
}

export function useViolationsData(options: UseViolationsDataOptions = {}): UseViolationsDataReturn {
  const { tab = 'active' } = options;
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const fetchViolations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ tab });
      const response = await fetch(`/api/violations?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch violations');
      }

      const data = await response.json();
      setViolations(data.data?.violations || []);
      setLastSync(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch violations');
      console.error('Error fetching violations:', err);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  // Initial fetch
  useEffect(() => {
    fetchViolations();
  }, [fetchViolations]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchViolations, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchViolations]);

  return {
    violations,
    loading,
    error,
    lastSync,
    refetch: fetchViolations,
  };
}
