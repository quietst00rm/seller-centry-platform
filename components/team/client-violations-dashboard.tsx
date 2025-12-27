'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  FileText,
  CheckCircle,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ViolationsTable } from './violations-table';
import { ViolationDetailModal } from './violation-detail-modal';
import { toast } from '@/hooks/use-toast';
import type { Violation, Tenant, ViolationsResponse, ViolationTab } from '@/types';

interface ClientViolationsDashboardProps {
  subdomain: string;
  tenant: Tenant;
}

export function ClientViolationsDashboard({
  subdomain,
  tenant,
}: ClientViolationsDashboardProps) {
  const router = useRouter();
  const [activeViolations, setActiveViolations] = useState<Violation[]>([]);
  const [resolvedViolations, setResolvedViolations] = useState<Violation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ViolationTab>('active');
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchViolations = useCallback(
    async (showRefreshIndicator = false) => {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      }
      setError(null);

      try {
        // Fetch both active and resolved violations in parallel
        const [activeRes, resolvedRes] = await Promise.all([
          fetch(`/api/team/violations?subdomain=${subdomain}&tab=active`),
          fetch(`/api/team/violations?subdomain=${subdomain}&tab=resolved`),
        ]);

        const [activeData, resolvedData]: [ViolationsResponse, ViolationsResponse] =
          await Promise.all([activeRes.json(), resolvedRes.json()]);

        if (!activeRes.ok || !activeData.success) {
          throw new Error(activeData.error || 'Failed to fetch active violations');
        }

        if (!resolvedRes.ok || !resolvedData.success) {
          throw new Error(resolvedData.error || 'Failed to fetch resolved violations');
        }

        setActiveViolations(activeData.data?.violations || []);
        setResolvedViolations(resolvedData.data?.violations || []);

        if (showRefreshIndicator) {
          toast({
            title: 'Data refreshed',
            description: `${activeData.data?.total || 0} active, ${resolvedData.data?.total || 0} resolved`,
          });
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch violations';
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
    },
    [subdomain]
  );

  useEffect(() => {
    fetchViolations();
  }, [fetchViolations]);

  const handleRefresh = () => {
    fetchViolations(true);
  };

  const handleRowClick = (violation: Violation) => {
    setSelectedViolation(violation);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedViolation(null);
  };

  // Calculate stats
  const stats = useMemo(() => {
    const totalActive = activeViolations.length;
    const highImpact = activeViolations.filter((v) => v.ahrImpact === 'High').length;
    const totalAtRisk = activeViolations.reduce((sum, v) => sum + v.atRiskSales, 0);
    const docsPending = activeViolations.filter((v) => v.docsNeeded).length;
    return { totalActive, highImpact, totalAtRisk, docsPending };
  }, [activeViolations]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const currentViolations =
    activeTab === 'active' ? activeViolations : resolvedViolations;

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Skeleton className="h-10 w-24 bg-gray-800" />
            <Skeleton className="h-8 w-64 bg-gray-800" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 bg-gray-800 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-10 w-48 mb-4 bg-gray-800" />
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full bg-gray-800" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && activeViolations.length === 0 && resolvedViolations.length === 0) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.push('/team')}
            className="mb-6 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Overview
          </Button>
          <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 p-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                Failed to Load Violations
              </h2>
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

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/team')}
              className="text-gray-400 hover:text-white -ml-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">{tenant.storeName}</h1>
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <span className="font-mono">{tenant.merchantId}</span>
                <a
                  href={`https://${subdomain}.sellercentry.com`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-500 hover:text-orange-400 inline-flex items-center gap-1 transition-colors"
                >
                  Open Dashboard
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Active Violations"
            value={stats.totalActive}
            icon={AlertTriangle}
            iconColor="text-orange-500"
          />
          <StatCard
            label="High Impact"
            value={stats.highImpact}
            icon={AlertCircle}
            iconColor="text-red-500"
            highlight={stats.highImpact > 0}
          />
          <StatCard
            label="At-Risk Sales"
            value={formatCurrency(stats.totalAtRisk)}
            icon={DollarSign}
            iconColor="text-green-500"
          />
          <StatCard
            label="Docs Pending"
            value={stats.docsPending}
            icon={FileText}
            iconColor="text-yellow-500"
            highlight={stats.docsPending > 0}
          />
        </div>

        {/* Error banner (when we have cached data) */}
        {error && (activeViolations.length > 0 || resolvedViolations.length > 0) && (
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

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as ViolationTab)}
          className="mb-4"
        >
          <TabsList className="bg-[#1a1a1a] border border-gray-800">
            <TabsTrigger
              value="active"
              className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
            >
              Active ({activeViolations.length})
            </TabsTrigger>
            <TabsTrigger
              value="resolved"
              className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Resolved ({resolvedViolations.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Violations Table */}
        <ViolationsTable
          violations={currentViolations}
          onRowClick={handleRowClick}
          isActiveTab={activeTab === 'active'}
        />

        {/* Violation Detail Modal */}
        <ViolationDetailModal
          violation={selectedViolation}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  iconColor,
  highlight = false,
}: {
  label: string;
  value: number | string;
  icon: typeof AlertTriangle;
  iconColor: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`bg-[#1a1a1a] rounded-lg border p-4 ${
        highlight ? 'border-red-500/50' : 'border-gray-800'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <span className="text-xs text-gray-400 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p
        className={`text-2xl font-bold ${
          highlight ? 'text-red-400' : 'text-white'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
