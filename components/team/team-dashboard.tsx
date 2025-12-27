'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Users, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ClientTable } from './client-table';
import { toast } from '@/hooks/use-toast';
import type { ClientOverview, ClientsResponse } from '@/types';

const AUTO_REFRESH_INTERVAL = 3 * 60 * 1000; // 3 minutes

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
          title: 'Data refreshed',
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

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <Skeleton className="h-8 w-48 bg-gray-800" />
              <Skeleton className="h-4 w-32 mt-2 bg-gray-800" />
            </div>
            <Skeleton className="h-10 w-24 bg-gray-800" />
          </div>

          {/* Search skeleton */}
          <Skeleton className="h-10 w-full mb-4 bg-gray-800" />

          {/* Table skeleton */}
          <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 overflow-hidden">
            <div className="p-4 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full bg-gray-800" />
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
            <h1 className="text-2xl font-bold text-white">Client Overview</h1>
            <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
              <span>{clients.length} clients</span>
              <span className="text-gray-600">|</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                Updated {formatLastRefreshed(lastRefreshed)}
              </span>
            </div>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
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

        {/* Client table */}
        <ClientTable clients={clients} />

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="text-orange-400 font-mono">48h</span>
            <span>Violations in last 48 hours</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 font-mono">72h</span>
            <span>Violations in last 72 hours</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-400 font-mono">Month</span>
            <span>Resolved this month</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-400 font-mono">High</span>
            <span>High impact violations</span>
          </div>
        </div>
      </div>
    </div>
  );
}
