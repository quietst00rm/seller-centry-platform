'use client';

import { useState, useMemo } from 'react';
import { ViolationsFilterControls } from './violations-filter-controls';
import { SimpleKPICards, CardFilterType } from './simple-kpi-cards';
import { NeedsAttentionCard } from './needs-attention-card';
import { IssueTable, Issue } from './issue-table';
import { useViolationsData } from '@/hooks/use-violations-data';

interface ViolationsMainProps {
  subdomain: string;
  onViewCase?: (issue: Issue) => void;
}

interface FilterState {
  dateRange: string;
  statuses: string[];
  search: string;
  showNotesOnly: boolean;
}

export function ViolationsMain({ subdomain, onViewCase }: ViolationsMainProps) {
  const { violations, loading, error } = useViolationsData({ subdomain });
  const [filters, setFilters] = useState<FilterState>({
    dateRange: 'All Time',
    statuses: [],
    search: '',
    showNotesOnly: false,
  });
  const [cardFilter, setCardFilter] = useState<CardFilterType>(null);

  // Count violations with notes
  const violationsWithNotesCount = useMemo(() => {
    return violations.filter(
      (v) => v.notes && v.notes.trim() !== '' && v.status.toLowerCase() !== 'resolved'
    ).length;
  }, [violations]);

  // Calculate "Needs Your Action" count - violations with status "Waiting" or "Waiting on Client"
  const needsActionCount = useMemo(() => {
    return violations.filter((v) => {
      const statusLower = v.status.toLowerCase().trim();
      return statusLower === 'waiting' || statusLower === 'waiting on client';
    }).length;
  }, [violations]);

  // Calculate "New This Week" count - violations from the last 7 days
  const newThisWeekCount = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return violations.filter((v) => {
      if (v.status.toLowerCase() === 'resolved') return false;
      const violationDate = new Date(v.date);
      return violationDate >= sevenDaysAgo;
    }).length;
  }, [violations]);

  // Helper to check if a violation matches "Needs Your Action"
  const isNeedsAction = (status: string) => {
    const statusLower = status.toLowerCase().trim();
    return statusLower === 'waiting' || statusLower === 'waiting on client';
  };

  // Helper to check if a violation is "New This Week"
  const isNewThisWeek = (dateStr: string) => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const violationDate = new Date(dateStr);
    return violationDate >= sevenDaysAgo;
  };

  // Filter the violations based on current filters
  const filteredViolations = useMemo(() => {
    // Debug: log raw violations before filtering
    console.log(`[ViolationsMain] Raw violations count: ${violations.length}`);
    if (violations.length > 0) {
      const statuses = [...new Set(violations.map((v) => v.status))];
      console.log(`[ViolationsMain] Statuses before filtering: ${statuses.join(', ')}`);
    }

    const filtered = violations.filter((violation) => {
      // Note: We no longer auto-hide "Resolved" status violations here.
      // The tab selection (active vs resolved) already determines which Google Sheet tab to fetch from.
      // Users can use the status dropdown to filter by specific statuses if needed.

      // Card filter - "Needs Your Action"
      if (cardFilter === 'needsAction') {
        if (!isNeedsAction(violation.status)) return false;
      }

      // Card filter - "New This Week"
      if (cardFilter === 'newThisWeek') {
        if (!isNewThisWeek(violation.date)) return false;
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

    // Debug: log filtered result
    console.log(`[ViolationsMain] Filtered violations count: ${filtered.length}`);
    if (filtered.length !== violations.length) {
      const filteredOut = violations.length - filtered.length;
      console.log(`[ViolationsMain] ${filteredOut} violations were filtered out`);
    }

    return filtered;
  }, [violations, filters, cardFilter]);

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

  // Convert violations to issues format for the table
  // Note: violation.status is already a ViolationStatus from the API, pass it through directly
  const issuesForTable: Issue[] = filteredViolations
    .map((violation) => {
      return {
        id: violation.id,
        asin: violation.asin,
        product: violation.productTitle,
        type: violation.reason,
        status: violation.status,
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

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center h-64 text-center px-4">
          <div className="text-destructive font-medium mb-2">Unable to load violations</div>
          <div className="text-muted-foreground text-sm max-w-md">
            There was an error loading the violations data. This could be due to a connection issue or the data source being unavailable.
          </div>
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
      <SimpleKPICards
        openViolations={kpiMetrics.openViolations}
        atRiskSales={kpiMetrics.atRiskSales}
        needsActionCount={needsActionCount}
        newThisWeekCount={newThisWeekCount}
        activeCardFilter={cardFilter}
        onCardFilterChange={setCardFilter}
      />

      {/* Filter Controls */}
      <ViolationsFilterControls
        filters={filters}
        onFilterChange={handleFilterChange}
        isActiveTab={true}
        cardFilter={cardFilter}
        onCardFilterClear={() => setCardFilter(null)}
      />

      {/* Enhanced Table */}
      <div className="bg-card rounded-xl border border-border shadow-card">
        <IssueTable
          issues={issuesForTable}
          onViewCase={onViewCase || (() => {})}
          statusOptions={[
            { value: 'all', label: 'All Statuses' },
            { value: 'Assessing', label: 'Assessing' },
            { value: 'Working', label: 'Working' },
            { value: 'Submitted', label: 'Submitted' },
            { value: 'Waiting on Client', label: 'Waiting on Client' },
            { value: 'Denied', label: 'Denied' },
            { value: 'Resolved', label: 'Resolved' },
            { value: 'Review Resolved', label: 'Review Resolved' },
          ]}
        />
      </div>
    </div>
  );
}
