'use client';

import { useState, useMemo } from 'react';
import { ViolationsFilterControls } from './violations-filter-controls';
import { SimpleKPICards } from './simple-kpi-cards';
import { NeedsAttentionCard } from './needs-attention-card';
import { IssueTable, Issue } from './issue-table';
import { useViolationsData } from '@/hooks/use-violations-data';

interface ViolationsMainProps {
  onViewCase?: (issue: Issue) => void;
}

interface FilterState {
  dateRange: string;
  statuses: string[];
  search: string;
  showNotesOnly: boolean;
}

export function ViolationsMain({ onViewCase }: ViolationsMainProps) {
  const { violations, loading } = useViolationsData();
  const [filters, setFilters] = useState<FilterState>({
    dateRange: 'All Time',
    statuses: [],
    search: '',
    showNotesOnly: false,
  });

  // Count violations with notes
  const violationsWithNotesCount = useMemo(() => {
    return violations.filter(
      (v) => v.notes && v.notes.trim() !== '' && v.status.toLowerCase() !== 'resolved'
    ).length;
  }, [violations]);

  // Filter the violations based on current filters
  const filteredViolations = useMemo(() => {
    const filtered = violations.filter((violation) => {
      // Hide resolved violations by default
      if (filters.statuses.length === 0 && violation.status.toLowerCase() === 'resolved') {
        return false;
      }

      // Notes filter
      if (filters.showNotesOnly) {
        if (!violation.notes || violation.notes.trim() === '') return false;
      }

      // Date range filter
      if (filters.dateRange !== 'All Time') {
        const violationDate = new Date(violation.date);
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

    return filtered;
  }, [violations, filters]);

  // Calculate simple KPI metrics
  const kpiMetrics = useMemo(() => {
    const openViolations = filteredViolations.filter(
      (violation) => violation.status.toLowerCase() !== 'resolved'
    );
    const atRiskSales = openViolations.reduce((sum, violation) => sum + violation.atRiskSales, 0);

    return {
      openViolations: openViolations.length,
      atRiskSales,
    };
  }, [filteredViolations]);

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleNotesFilterToggle = () => {
    setFilters((prev) => ({ ...prev, showNotesOnly: !prev.showNotesOnly }));
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

  // Convert violations to issues format for the table
  const issuesForTable: Issue[] = filteredViolations
    .map((violation) => {
      const mappedStatus: Issue['status'] = mapViolationStatusToIssueStatus(violation.status);

      return {
        id: violation.id,
        asin: violation.asin,
        product: violation.productTitle,
        type: violation.reason,
        status: mappedStatus,
        opened: violation.date,
        atRiskSales: violation.atRiskSales,
        impact: (violation.ahrImpact as 'Low' | 'Medium' | 'High') || 'Low',
        notes: violation.notes,
        actionTaken: violation.actionTaken,
        nextSteps: violation.nextSteps,
        options: violation.options,
        dateResolved: violation.dateResolved,
        log: [
          { ts: violation.date, event: `Violation detected: ${violation.reason}` },
          { ts: violation.date, event: `Status: ${violation.status}` },
        ],
      };
    })
    .sort((a, b) => new Date(b.opened).getTime() - new Date(a.opened).getTime());

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading violations data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Needs Attention Card */}
      <NeedsAttentionCard
        count={violationsWithNotesCount}
        onClick={handleNotesFilterToggle}
        isActive={filters.showNotesOnly}
      />

      {/* Simple KPI Cards */}
      <SimpleKPICards openViolations={kpiMetrics.openViolations} atRiskSales={kpiMetrics.atRiskSales} />

      {/* Filter Controls */}
      <ViolationsFilterControls filters={filters} onFilterChange={handleFilterChange} isActiveTab={true} />

      {/* Enhanced Table */}
      <div className="bg-card rounded-xl border border-border shadow-card">
        <IssueTable
          issues={issuesForTable}
          onViewCase={onViewCase || (() => {})}
          statusOptions={[
            { value: 'all', label: 'All Statuses' },
            { value: 'Working', label: 'Working' },
            { value: 'Submitted', label: 'Submitted' },
            { value: 'Waiting on Client', label: 'Waiting on Client' },
            { value: 'Denied', label: 'Denied' },
          ]}
        />
      </div>
    </div>
  );
}
