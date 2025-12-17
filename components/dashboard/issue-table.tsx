'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { StatusChip, getStatusType } from '@/components/ui/status-chip';
import { ImpactBadge, getImpactLevel } from '@/components/ui/impact-badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ArrowUpDown, DollarSign, Calendar, ExternalLink, Search, Filter, MessageSquare } from 'lucide-react';
import type { ViolationStatus } from '@/types';

export interface Issue {
  id: string;
  asin: string;
  product: string;
  type: string;
  status: ViolationStatus;
  opened: string;
  atRiskSales: number;
  impact: 'Low' | 'Medium' | 'High';
  log: Array<{ ts: string; event: string }>;
  dateResolved?: string;
  notes?: string;
  actionTaken?: string;
  nextSteps?: string;
  options?: string;
}

interface StatusOption {
  value: string;
  label: string;
}

interface IssueTableProps {
  issues: Issue[];
  onViewCase: (issue: Issue) => void;
  showResolvedDate?: boolean;
  statusOptions?: StatusOption[];
}

type SortField = 'impact' | 'atRiskSales' | 'opened' | 'product' | 'dateResolved';
type SortDirection = 'asc' | 'desc';

interface SortState {
  field: SortField;
  direction: SortDirection;
}

const defaultStatusOptions: StatusOption[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'Working', label: 'Working' },
  { value: 'Submitted', label: 'Submitted' },
  { value: 'Waiting on Client', label: 'Waiting on Client' },
  { value: 'Denied', label: 'Denied' },
];

export function IssueTable({ issues, onViewCase, showResolvedDate = false, statusOptions = defaultStatusOptions }: IssueTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortState, setSortState] = useState<SortState>({
    field: 'opened',
    direction: 'desc',
  });

  const handleSort = (field: SortField) => {
    setSortState((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const filteredAndSortedIssues = useMemo(() => {
    let filtered = issues.filter((issue) => {
      const matchesSearch =
        issue.asin.toLowerCase().includes(search.toLowerCase()) ||
        issue.product.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || issue.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    return filtered.sort((a, b) => {
      const impactPriority = { 'High': 3, 'Medium': 2, 'Low': 1 };

      if (sortState.field === 'impact') {
        const diff = impactPriority[b.impact] - impactPriority[a.impact];
        return sortState.direction === 'desc' ? diff : -diff;
      }

      if (sortState.field === 'atRiskSales') {
        const diff = b.atRiskSales - a.atRiskSales;
        return sortState.direction === 'desc' ? diff : -diff;
      }

      if (sortState.field === 'opened') {
        const diff = new Date(b.opened).getTime() - new Date(a.opened).getTime();
        return sortState.direction === 'desc' ? diff : -diff;
      }

      if (sortState.field === 'dateResolved') {
        const dateA = a.dateResolved ? new Date(a.dateResolved).getTime() : 0;
        const dateB = b.dateResolved ? new Date(b.dateResolved).getTime() : 0;
        const diff = dateB - dateA;
        return sortState.direction === 'desc' ? diff : -diff;
      }

      if (sortState.field === 'product') {
        const diff = a.product.localeCompare(b.product);
        return sortState.direction === 'desc' ? -diff : diff;
      }

      return 0;
    });
  }, [issues, search, statusFilter, sortState]);

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className={cn(
        'flex items-center gap-1 text-left transition-colors group',
        sortState.field === field ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
      )}
      aria-label={`Sort by ${field}`}
    >
      {children}
      <ArrowUpDown
        className={cn(
          'h-3 w-3 transition-opacity',
          sortState.field === field ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
        )}
      />
    </button>
  );

  // Mobile card view
  const MobileCard = ({ issue }: { issue: Issue }) => (
    <TooltipProvider>
      <div
        onClick={() => onViewCase(issue)}
        className="bg-card rounded-xl border border-border p-4 space-y-3 cursor-pointer hover:shadow-card-hover transition-all active:scale-[0.98]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-foreground truncate">{issue.product}</p>
              {issue.notes && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <MessageSquare className="h-4 w-4 text-primary flex-shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent>Has notes - tap to view</TooltipContent>
                </Tooltip>
              )}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={`https://www.amazon.com/dp/${issue.asin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <span className="font-mono">{issue.asin}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </TooltipTrigger>
              <TooltipContent>View on Amazon</TooltipContent>
            </Tooltip>
          </div>
          <ImpactBadge impact={getImpactLevel(issue.impact)} />
        </div>

        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">{issue.type}</span>
          <span className="font-semibold font-tabular">${issue.atRiskSales.toLocaleString()}</span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <StatusChip status={getStatusType(issue.status)} />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {showResolvedDate && issue.dateResolved && <span>Resolved: {issue.dateResolved}</span>}
            {!showResolvedDate && <span>{issue.opened}</span>}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );

  return (
    <TooltipProvider>
      <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-border bg-muted/30">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Violation Tracker</h2>
              <p className="text-sm text-muted-foreground">{filteredAndSortedIssues.length} issues found</p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search ASIN or Product..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-full sm:w-64 h-10"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-44 h-10">
                  <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full" role="table" aria-label="ASIN Issues">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th scope="col" className="text-left py-3 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <SortButton field="product">PRODUCT</SortButton>
                </th>
                <th scope="col" className="text-center py-3 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  ISSUE TYPE
                </th>
                <th scope="col" className="text-center py-3 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <SortButton field="atRiskSales">
                    <DollarSign className="h-3 w-3 inline mr-1" />
                    AT RISK
                  </SortButton>
                </th>
                <th scope="col" className="text-center py-3 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <SortButton field="impact">IMPACT</SortButton>
                </th>
                <th scope="col" className="text-center py-3 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  STATUS
                </th>
                <th scope="col" className="text-center py-3 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <SortButton field="opened">
                    <Calendar className="h-3 w-3 inline mr-1" />
                    OPENED
                  </SortButton>
                </th>
                {showResolvedDate && (
                  <th scope="col" className="text-center py-3 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <SortButton field="dateResolved">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      RESOLVED
                    </SortButton>
                  </th>
                )}
                <th scope="col" className="text-center py-3 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAndSortedIssues.length === 0 ? (
                <tr>
                  <td colSpan={showResolvedDate ? 8 : 7} className="text-center py-16 text-muted-foreground">
                    <div className="space-y-2">
                      <p className="font-medium">No issues found</p>
                      <p className="text-sm">Try adjusting your search or filter settings.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedIssues.map((issue) => (
                  <tr
                    key={issue.id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer group h-16"
                    onClick={() => onViewCase(issue)}
                    role="row"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onViewCase(issue);
                      }
                    }}
                  >
                    <td className="py-2 px-4 max-w-[320px]">
                      <div className="flex items-center gap-3">
                        {issue.notes && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex-shrink-0 p-1.5 rounded-full bg-primary/10">
                                <MessageSquare className="h-4 w-4 text-primary" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>This case has notes - click to view</TooltipContent>
                          </Tooltip>
                        )}
                        <div className="min-w-0 flex-1">
                          {/* ASIN - Primary identifier */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a
                                href={`https://www.amazon.com/dp/${issue.asin}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1.5 font-mono font-bold text-sm text-foreground hover:text-primary transition-colors"
                              >
                                {issue.asin}
                                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </a>
                            </TooltipTrigger>
                            <TooltipContent>View on Amazon</TooltipContent>
                          </Tooltip>
                          {/* Product title - Secondary, truncated */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[280px]">{issue.product}</p>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-sm">
                              {issue.product}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-sm text-foreground text-center">{issue.type}</td>
                    <td className="py-3.5 px-4 font-tabular text-sm text-foreground font-semibold text-center">
                      ${issue.atRiskSales.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <ImpactBadge impact={getImpactLevel(issue.impact)} />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <StatusChip status={getStatusType(issue.status)} />
                    </td>
                    <td className="py-3.5 px-4 text-sm text-muted-foreground text-center">{issue.opened}</td>
                    {showResolvedDate && (
                      <td className="py-3.5 px-4 text-sm text-muted-foreground text-center">{issue.dateResolved || '-'}</td>
                    )}
                    <td className="py-3.5 px-4 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewCase(issue);
                        }}
                        className="text-primary hover:text-primary hover:bg-primary/10 transition-colors"
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile List */}
        <div className="md:hidden p-4 space-y-3">
          {filteredAndSortedIssues.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="font-medium">No issues found</p>
              <p className="text-sm mt-1">Try adjusting your search or filter settings.</p>
            </div>
          ) : (
            filteredAndSortedIssues.map((issue) => <MobileCard key={issue.id} issue={issue} />)
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
