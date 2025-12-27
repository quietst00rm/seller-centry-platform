'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Users, AlertCircle } from 'lucide-react';
import { ClientTable } from './client-table';
import { toast } from '@/hooks/use-toast';
import type { ClientOverview, ClientsResponse } from '@/types';

const AUTO_REFRESH_INTERVAL = 3 * 60 * 1000; // 3 minutes
const STALE_DATA_WARNING = 5 * 60 * 1000; // 5 minutes
const STALE_DATA_CRITICAL = 15 * 60 * 1000; // 15 minutes

// Skeleton shimmer animation component
function SkeletonShimmer({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden bg-[#1f262e] rounded ${className}`}
      style={{
        backgroundImage: 'linear-gradient(90deg, #1f262e 0px, #2d333b 40px, #1f262e 80px)',
        backgroundSize: '200px 100%',
        animation: 'shimmer 1.5s infinite',
      }}
    />
  );
}

export function TeamDashboard() {
  const [clients, setClients] = useState<ClientOverview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchClients = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      const response = await fetch('/api/team/clients?detailed=true');
      const data: ClientsResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch clients');
      }

      setClients(data.data?.clients || []);
      setLastRefreshed(new Date());

      if (showRefreshIndicator) {
        toast({
          title: 'Client data refreshed',
          description: `${data.data?.total || 0} clients loaded`,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch clients';
      setError(errorMessage);

      if (showRefreshIndicator) {
        toast({
          title: 'Refresh failed',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Auto-refresh every 3 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchClients(false);
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchClients]);

  const handleRefresh = () => {
    fetchClients(true);
  };

  const formatLastRefreshed = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getDataFreshness = (): { status: 'fresh' | 'stale' | 'critical'; message: string } => {
    if (!lastRefreshed) return { status: 'critical', message: 'Never synced' };
    const age = Date.now() - lastRefreshed.getTime();
    if (age > STALE_DATA_CRITICAL) return { status: 'critical', message: 'Data may be stale' };
    if (age > STALE_DATA_WARNING) return { status: 'stale', message: 'Data is 5+ min old' };
    return { status: 'fresh', message: `Updated ${formatLastRefreshed(lastRefreshed)}` };
  };

  const freshness = getDataFreshness();

  // Loading state with enhanced skeleton
  if (isLoading) {
    return (
      <main className="flex-1 px-6 py-8 w-full max-w-[1920px] mx-auto">
        {/* Add shimmer keyframes */}
        <style jsx>{`
          @keyframes shimmer {
            0% { background-position: -200px 0; }
            100% { background-position: calc(200px + 100%) 0; }
          }
        `}</style>

        {/* Header skeleton */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <SkeletonShimmer className="h-8 w-48 mb-2" />
            <SkeletonShimmer className="h-4 w-32" />
          </div>
          <div className="flex items-center gap-4">
            <SkeletonShimmer className="h-4 w-24" />
            <SkeletonShimmer className="h-9 w-24" />
          </div>
        </div>

        {/* KPI Cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-[#161b22] border border-[#2d333b] rounded-lg p-4">
              <SkeletonShimmer className="h-3 w-20 mb-3" />
              <SkeletonShimmer className="h-8 w-16" />
            </div>
          ))}
        </div>

        {/* Search and filters skeleton */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <SkeletonShimmer className="h-10 w-80" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonShimmer key={i} className="h-10 w-28 rounded-full" />
            ))}
          </div>
        </div>

        {/* Table skeleton */}
        <div className="bg-[#161b22] rounded-lg border border-[#2d333b] overflow-hidden">
          <div className="bg-[#1f262e] border-b border-[#2d333b] p-4">
            <div className="flex gap-6">
              <SkeletonShimmer className="h-4 w-32" />
              <SkeletonShimmer className="h-4 w-12" />
              <SkeletonShimmer className="h-4 w-12" />
              <SkeletonShimmer className="h-4 w-16" />
              <SkeletonShimmer className="h-4 w-12" />
              <SkeletonShimmer className="h-4 w-12" />
              <SkeletonShimmer className="h-4 w-20" />
            </div>
          </div>
          <div className="divide-y divide-[#2d333b]">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="px-6 py-4">
                <SkeletonShimmer className="h-6 w-full" />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // Error state
  if (error && clients.length === 0) {
    return (
      <main className="flex-1 px-6 py-8 w-full max-w-[1920px] mx-auto">
        <div className="bg-[#161b22] rounded-lg border border-[#2d333b] p-8">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Failed to Load Clients</h2>
            <p className="text-gray-400 mb-6">{error}</p>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded font-medium transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Empty state
  if (clients.length === 0) {
    return (
      <main className="flex-1 px-6 py-8 w-full max-w-[1920px] mx-auto">
        <div className="bg-[#161b22] rounded-lg border border-[#2d333b] p-8">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1f262e] flex items-center justify-center">
              <Users className="h-8 w-8 text-gray-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No Clients Found</h2>
            <p className="text-gray-400 mb-6">
              There are no clients in the system yet.
            </p>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#1f262e] hover:bg-[#2d333b] text-gray-300 border border-[#2d333b] rounded font-medium transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Main content
  return (
    <main className="flex-1 px-6 py-8 w-full max-w-[1920px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1">Client Overview</h1>
          <p className="text-sm text-gray-400">{clients.length} clients active</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Data freshness indicator */}
          <div className="flex items-center gap-2 text-xs font-medium">
            <span
              className={`w-2 h-2 rounded-full ${
                freshness.status === 'fresh'
                  ? 'bg-emerald-500 animate-pulse'
                  : freshness.status === 'stale'
                    ? 'bg-amber-500'
                    : 'bg-red-500'
              }`}
            />
            <span className={`${
              freshness.status === 'fresh'
                ? 'text-emerald-400'
                : freshness.status === 'stale'
                  ? 'text-amber-400'
                  : 'text-red-400'
            }`}>
              {freshness.message}
            </span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#1f262e] hover:bg-[#2d333b] text-gray-300 rounded text-sm font-medium transition-colors border border-[#2d333b] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Error banner (shown when refresh fails but we have cached data) */}
      {error && clients.length > 0 && (
        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-400">
            Failed to refresh: {error}. Showing cached data.
          </p>
          <button
            onClick={handleRefresh}
            className="ml-auto text-sm text-red-400 hover:text-red-300 font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stale data warning */}
      {freshness.status === 'critical' && !error && (
        <div className="mb-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-400">
            Data may be stale. Last updated over 15 minutes ago.
          </p>
          <button
            onClick={handleRefresh}
            className="ml-auto text-sm text-amber-400 hover:text-amber-300 font-medium"
          >
            Refresh Now
          </button>
        </div>
      )}

      {/* Client table */}
      <ClientTable clients={clients} />
    </main>
  );
}
