'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Users, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
      className={`relative overflow-hidden bg-gray-800 rounded ${className}`}
      style={{
        backgroundImage: 'linear-gradient(90deg, #1f2937 0px, #374151 40px, #1f2937 80px)',
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
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Add shimmer keyframes */}
          <style jsx>{`
            @keyframes shimmer {
              0% { background-position: -200px 0; }
              100% { background-position: calc(200px + 100%) 0; }
            }
          `}</style>

          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <SkeletonShimmer className="h-8 w-48" />
              <SkeletonShimmer className="h-4 w-32 mt-2" />
            </div>
            <SkeletonShimmer className="h-10 w-24" />
          </div>

          {/* KPI Cards skeleton */}
          <div className="flex flex-wrap gap-4 mb-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-lg p-4 min-w-[160px]">
                <SkeletonShimmer className="h-3 w-20 mb-2" />
                <SkeletonShimmer className="h-8 w-16" />
              </div>
            ))}
          </div>

          {/* Search and filters skeleton */}
          <div className="flex gap-4 mb-6">
            <SkeletonShimmer className="h-10 w-80" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonShimmer key={i} className="h-8 w-24" />
              ))}
            </div>
          </div>

          {/* Table skeleton */}
          <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 overflow-hidden">
            {/* Header row */}
            <div className="bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.08)] p-4">
              <div className="flex gap-4">
                <SkeletonShimmer className="h-4 w-32" />
                <SkeletonShimmer className="h-4 w-12" />
                <SkeletonShimmer className="h-4 w-12" />
                <SkeletonShimmer className="h-4 w-16" />
                <SkeletonShimmer className="h-4 w-12" />
                <SkeletonShimmer className="h-4 w-12" />
                <SkeletonShimmer className="h-4 w-20" />
              </div>
            </div>
            {/* Data rows */}
            <div className="p-4 space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <SkeletonShimmer className="h-4 w-4" />
                  <SkeletonShimmer className="h-12 flex-1" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && clients.length === 0) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 p-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Failed to Load Clients</h2>
              <p className="text-gray-400 mb-6">{error}</p>
              <Button
                onClick={handleRefresh}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (clients.length === 0) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 p-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                <Users className="h-8 w-8 text-gray-500" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">No Clients Found</h2>
              <p className="text-gray-400 mb-6">
                There are no clients in the system yet.
              </p>
              <Button
                onClick={handleRefresh}
                variant="outline"
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main content
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Internal Tool /</span>
              <h1 className="text-2xl font-semibold text-white">Client Overview</h1>
            </div>
            <p className="text-sm text-gray-500 mt-1">{clients.length} clients</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Data freshness indicator */}
            <div className="flex items-center gap-2 text-sm">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  freshness.status === 'fresh'
                    ? 'bg-emerald-500'
                    : freshness.status === 'stale'
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                }`}
              />
              <span className={`${
                freshness.status === 'fresh'
                  ? 'text-gray-400'
                  : freshness.status === 'stale'
                    ? 'text-amber-400'
                    : 'text-red-400'
              }`}>
                {freshness.message}
              </span>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Error banner (shown when refresh fails but we have cached data) */}
        {error && clients.length > 0 && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-400">
              Failed to refresh: {error}. Showing cached data.
            </p>
            <Button
              onClick={handleRefresh}
              size="sm"
              variant="ghost"
              className="ml-auto text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Stale data warning */}
        {freshness.status === 'critical' && !error && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-400">
              Data may be stale. Last updated over 15 minutes ago.
            </p>
            <Button
              onClick={handleRefresh}
              size="sm"
              variant="ghost"
              className="ml-auto text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
            >
              Refresh Now
            </Button>
          </div>
        )}

        {/* Client table */}
        <ClientTable clients={clients} />
      </div>
    </div>
  );
}
