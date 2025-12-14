'use client';

import { useState, useMemo } from 'react';
import { ViolationsFilterControls } from './violations-filter-controls';
import { ResolvedKPIGrid } from './resolved-kpi-grid';
import { IssueTable, Issue } from './issue-table';
import { useViolationsData } from '@/hooks/use-violations-data';

interface ResolvedViolationsMainProps {
  onViewCase?: (issue: Issue) => void;
}

interface FilterState {
  dateRange: string;
  statuses: string[];
  search: string;
  showNotesOnly?: boolean;
}

export function ResolvedViolationsMain({ onViewCase }: ResolvedViolationsMainProps) {
  const { violations, loading } = useViolationsData({ tab: 'resolved' });
  const [filters, setFilters] = useState<FilterState>({
    dateRange: 'Last 30 Days',
    statuses: [],
    search: '',
  });

  // Filter to only resolved/ignored violations
  const resolvedViolations = useMemo(() => {
    return violations.filter((violation) => {
      const statusLower = violation.status.toLowerCase();
      return statusLower === 'resolved' || statusLower === 'ignored' || statusLower === 'acknowledged';
    });
  }, [violations]);

  // Apply additional filters to resolved violations
  const filteredResolvedViolations = useMemo(() => {
    return resolvedViolations.filter((violation) => {
      // Date range filter
      if (filters.dateRange !== 'All Time') {
        const violationDate = new Date(violation.dateResolved || violation.date);
        const now = new Date();
        let daysAgo = 30;

        if (filters.dateRange === 'Last 7 Days') daysAgo = 7;
        else if (filters.dateRange === 'Last 30 Days') daysAgo = 30;
        else if (filters.dateRange === 'Last 90 Days') daysAgo = 90;

        const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        if (violationDate < cutoffDate) return false;
      }

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const searchMatch =
          violation.asin.toLowerCase().includes(searchLower) ||
          violation.productTitle.toLowerCase().includes(searchLower) ||
          violation.reason.toLowerCase().includes(searchLower) ||
          violation.id.toLowerCase().includes(searchLower);
        if (!searchMatch) return false;
      }

      // Status filter
      if (filters.statuses.length > 0) {
        if (!filters.statuses.includes(violation.status)) return false;
      }

      return true;
    });
  }, [resolvedViolations, filters]);

  // Calculate KPI metrics from resolved violations
  const kpiMetrics = useMemo(() => {
    const totalResolved = resolvedViolations.length;
    const totalRevenueSaved = resolvedViolations.reduce((sum, violation) => sum + violation.atRiskSales, 0);

    // Calculate average resolution time
    const resolvedWithDates = resolvedViolations.filter((v) => v.date && v.dateResolved);
    const avgResolutionTime =
      resolvedWithDates.length > 0
        ? resolvedWithDates.reduce((sum, v) => {
            const startDate = new Date(v.date);
            const endDate = new Date(v.dateResolved!);
            const days = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            return sum + days;
          }, 0) / resolvedWithDates.length
        : 0;

    // Calculate this month resolved
    const thisMonthResolved = resolvedViolations.filter((v) => {
      if (!v.dateResolved) return false;
      const resolvedDate = new Date(v.dateResolved);
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      return resolvedDate.getMonth() === currentMonth && resolvedDate.getFullYear() === currentYear;
    }).length;

    return {
      totalResolved,
      revenueSaved: totalRevenueSaved,
      avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
      thisMonthResolved,
    };
  }, [resolvedViolations]);

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const mapViolationStatusToIssueStatus = (status: string): Issue['status'] => {
    const statusLower = status.toLowerCase().trim();

    if (statusLower === 'working') return 'Working';
    if (statusLower === 'submitted') return 'Submitted';
    if (statusLower === 'waiting on client') return 'Waiting on Client';
    if (statusLower === 'resolved') return 'Resolved';
    if (statusLower === 'ignored') return 'Ignored';
    if (statusLower === 'acknowledged') return 'Acknowledged';
    if (statusLower === 'denied') return 'Denied';

    return 'Working';
  };

  // Convert resolved violations to issues format for the table
  const issuesForTable: Issue[] = filteredResolvedViolations
    .map((violation) => ({
      id: violation.id,
      asin: violation.asin,
      product: violation.productTitle,
      type: violation.reason,
      status: mapViolationStatusToIssueStatus(violation.status),
      opened: violation.date,
      atRiskSales: violation.atRiskSales,
      impact: (violation.ahrImpact as 'Low' | 'Medium' | 'High') || 'Low',
      dateResolved: violation.dateResolved,
      notes: violation.notes,
      actionTaken: violation.actionTaken,
      nextSteps: violation.nextSteps,
      options: violation.options,
      log: [
        { ts: violation.date, event: `Violation detected: ${violation.reason}` },
        { ts: violation.dateResolved || violation.date, event: `Case resolved` },
      ],
    }))
    .sort((a, b) => new Date(b.opened).getTime() - new Date(a.opened).getTime());

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading resolved violations data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <ViolationsFilterControls filters={filters} onFilterChange={handleFilterChange} isActiveTab={false} />

      {/* KPI Grid */}
      <ResolvedKPIGrid metrics={kpiMetrics} />

      {/* Enhanced Table */}
      <div className="bg-card rounded-xl border border-border shadow-card">
        <IssueTable
          issues={issuesForTable}
          onViewCase={onViewCase || (() => {})}
          showResolvedDate={true}
          statusOptions={[
            { value: 'all', label: 'All' },
            { value: 'Resolved', label: 'Resolved' },
            { value: 'Ignored', label: 'Ignored' },
            { value: 'Acknowledged', label: 'Acknowledged' },
          ]}
        />
      </div>
    </div>
  );
}
