'use client';

import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { useToast } from '@/hooks/use-toast';
import { DashboardHeader } from './header';
import { SummaryCards } from './summary-cards';
import { FilterBar } from './filter-bar';
import { AttentionBanner } from './attention-banner';
import { ViolationsList } from './violations-list';
import { ViolationModal } from './violation-modal';
import { SubmitTicketModal } from './submit-ticket-modal';
import { Skeleton } from '@/components/ui/skeleton';
import type { Violation } from '@/types';

interface DashboardClientProps {
  subdomain: string;
  user: User;
}

export function DashboardClient({ subdomain, user }: DashboardClientProps) {
  const { toast } = useToast();
  const {
    tenant,
    violations,
    isLoadingTenant,
    isLoadingViolations,
    lastSynced,
    filters,
    setTab,
    setTimeFilter,
    setStatusFilter,
    setSearch,
    refresh,
  } = useDashboardData({ subdomain });

  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
  const [isViolationModalOpen, setIsViolationModalOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const handleViewViolation = (violation: Violation) => {
    setSelectedViolation(violation);
    setIsViolationModalOpen(true);
  };

  const handleExport = () => {
    if (violations.length === 0) {
      toast({
        title: 'No data to export',
        description: 'There are no violations matching your current filters.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Create CSV content
      const headers = [
        'ASIN',
        'Product Title',
        'Issue Type',
        'At Risk Sales',
        'Impact',
        'Status',
        'Date Opened',
        'Action Taken',
        'Next Steps',
        'Notes',
      ];

      const rows = violations.map((v) => [
        v.asin,
        `"${(v.productTitle || '').replace(/"/g, '""')}"`,
        `"${(v.reason || '').replace(/"/g, '""')}"`,
        v.atRiskSales,
        v.ahrImpact,
        v.status,
        v.date,
        `"${(v.actionTaken || '').replace(/"/g, '""')}"`,
        `"${(v.nextSteps || '').replace(/"/g, '""')}"`,
        `"${(v.notes || '').replace(/"/g, '""')}"`,
      ]);

      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      // Download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const tabLabel = filters.tab === 'active' ? 'active' : 'resolved';
      a.download = `${subdomain}-${tabLabel}-violations-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export complete',
        description: `Exported ${violations.length} violations to CSV.`,
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'There was an error exporting the data.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      {isLoadingTenant ? (
        <div className="border-b border-border bg-card px-4 py-3">
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
      ) : (
        <DashboardHeader
          storeName={tenant?.storeName || subdomain}
          user={user}
          lastSynced={lastSynced}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          onSubmitTicket={() => setIsTicketModalOpen(true)}
          onExport={handleExport}
          documentFolderUrl={tenant?.documentFolderUrl}
        />
      )}

      {/* Summary Cards */}
      <SummaryCards
        totalViolations={tenant?.totalViolations || 0}
        atRiskSales={tenant?.atRiskSales || 0}
        highImpactCount={tenant?.highImpactCount || 0}
        resolvedCount={tenant?.resolvedCount || 0}
        isLoading={isLoadingTenant}
      />

      {/* Attention Banner */}
      {!isLoadingViolations && filters.tab === 'active' && (
        <AttentionBanner
          violations={violations}
          onViewViolation={handleViewViolation}
        />
      )}

      {/* Filters */}
      <FilterBar
        tab={filters.tab}
        timeFilter={filters.timeFilter}
        statusFilter={filters.statusFilter}
        search={filters.search}
        onTabChange={setTab}
        onTimeFilterChange={setTimeFilter}
        onStatusFilterChange={setStatusFilter}
        onSearchChange={setSearch}
      />

      {/* Violations List */}
      <div className="mt-4">
        <ViolationsList
          violations={violations}
          isLoading={isLoadingViolations}
          onViewDetails={handleViewViolation}
        />
      </div>

      {/* Violation Detail Modal */}
      <ViolationModal
        violation={selectedViolation}
        isOpen={isViolationModalOpen}
        onClose={() => setIsViolationModalOpen(false)}
      />

      {/* Submit Ticket Modal */}
      <SubmitTicketModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        storeName={tenant?.storeName || subdomain}
        userEmail={user.email || ''}
      />
    </div>
  );
}
