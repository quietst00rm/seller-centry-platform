'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Tenant, Violation, ViolationTab, TimeFilter, ViolationStatus } from '@/types';

interface UseDashboardDataOptions {
  subdomain: string;
}

interface DashboardState {
  tenant: Tenant | null;
  violations: Violation[];
  isLoadingTenant: boolean;
  isLoadingViolations: boolean;
  error: string | null;
  lastSynced: Date | null;
}

interface FilterState {
  tab: ViolationTab;
  timeFilter: TimeFilter;
  statusFilter: ViolationStatus | 'all';
  search: string;
}

export function useDashboardData({ subdomain }: UseDashboardDataOptions) {
  const [state, setState] = useState<DashboardState>({
    tenant: null,
    violations: [],
    isLoadingTenant: true,
    isLoadingViolations: true,
    error: null,
    lastSynced: null,
  });

  const [filters, setFilters] = useState<FilterState>({
    tab: 'active',
    timeFilter: 'all',
    statusFilter: 'all',
    search: '',
  });

  // Fetch tenant data
  const fetchTenant = useCallback(async () => {
    try {
      const response = await fetch(`/api/tenant?subdomain=${subdomain}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch tenant');
      }

      setState((prev) => ({
        ...prev,
        tenant: data.data,
        isLoadingTenant: false,
        error: null,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoadingTenant: false,
        error: err instanceof Error ? err.message : 'Failed to fetch tenant',
      }));
    }
  }, [subdomain]);

  // Fetch violations - takes tab as parameter to ensure correct value is used
  const fetchViolations = useCallback(async (currentTab: ViolationTab) => {
    setState((prev) => ({ ...prev, isLoadingViolations: true }));

    try {
      const params = new URLSearchParams({
        subdomain,
        tab: currentTab,
        time: filters.timeFilter,
        status: filters.statusFilter,
        search: filters.search,
      });

      const response = await fetch(`/api/violations?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch violations');
      }

      setState((prev) => ({
        ...prev,
        violations: data.data.violations,
        isLoadingViolations: false,
        lastSynced: new Date(),
        error: null,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoadingViolations: false,
        error: err instanceof Error ? err.message : 'Failed to fetch violations',
      }));
    }
  }, [subdomain, filters.timeFilter, filters.statusFilter, filters.search]);

  // Refresh all data
  const refresh = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      isLoadingTenant: true,
      isLoadingViolations: true,
    }));
    await Promise.all([fetchTenant(), fetchViolations(filters.tab)]);
  }, [fetchTenant, fetchViolations, filters.tab]);

  // Initial fetch
  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  // Fetch violations when filters change - explicitly watch tab and pass it as parameter
  useEffect(() => {
    fetchViolations(filters.tab);
  }, [fetchViolations, filters.tab]);

  // Filter setters
  const setTab = (tab: ViolationTab) => {
    setFilters((prev) => ({ ...prev, tab, statusFilter: 'all' }));
  };

  const setTimeFilter = (timeFilter: TimeFilter) => {
    setFilters((prev) => ({ ...prev, timeFilter }));
  };

  const setStatusFilter = (statusFilter: ViolationStatus | 'all') => {
    setFilters((prev) => ({ ...prev, statusFilter }));
  };

  const setSearch = (search: string) => {
    setFilters((prev) => ({ ...prev, search }));
  };

  return {
    ...state,
    filters,
    setTab,
    setTimeFilter,
    setStatusFilter,
    setSearch,
    refresh,
  };
}
