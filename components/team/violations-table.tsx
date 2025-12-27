'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  ArrowUpDown,
  Search,
  ExternalLink,
  FileText,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  EditableTextCell,
  EditableStatusCell,
  EditableImpactCell,
  EditableDocsNeededCell,
} from './editable-cells';
import { toast } from '@/hooks/use-toast';
import type { Violation, ViolationStatus } from '@/types';

type SortKey = keyof Violation | 'none';
type SortDirection = 'asc' | 'desc';

interface ViolationsTableProps {
  violations: Violation[];
  onRowClick: (violation: Violation) => void;
  onViolationUpdate?: (violationId: string, updates: Partial<Violation>) => void;
  subdomain: string;
  isActiveTab: boolean;
}

// Impact badge styling (for static display)
const getImpactBadgeClass = (impact: string): string => {
  const baseClass = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium';
  switch (impact) {
    case 'High':
      return `${baseClass} bg-red-500/20 text-red-400`;
    case 'Low':
      return `${baseClass} bg-yellow-500/20 text-yellow-400`;
    default:
      return `${baseClass} bg-gray-500/20 text-gray-500`;
  }
};

// Status badge styling (for static display)
const getStatusBadgeClass = (status: ViolationStatus): string => {
  const baseClass = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap';
  switch (status) {
    case 'Assessing':
      return `${baseClass} bg-blue-500/20 text-blue-400`;
    case 'Working':
      return `${baseClass} bg-cyan-500/20 text-cyan-400`;
    case 'Waiting on Client':
      return `${baseClass} bg-yellow-500/20 text-yellow-400`;
    case 'Submitted':
      return `${baseClass} bg-purple-500/20 text-purple-400`;
    case 'Review Resolved':
      return `${baseClass} bg-teal-500/20 text-teal-400`;
    case 'Denied':
      return `${baseClass} bg-red-500/20 text-red-400`;
    case 'Resolved':
      return `${baseClass} bg-green-500/20 text-green-400`;
    case 'Ignored':
      return `${baseClass} bg-gray-500/20 text-gray-400`;
    case 'Acknowledged':
      return `${baseClass} bg-indigo-500/20 text-indigo-400`;
    default:
      return `${baseClass} bg-gray-500/20 text-gray-400`;
  }
};

const statusOptions: ViolationStatus[] = [
  'Assessing',
  'Working',
  'Waiting on Client',
  'Submitted',
  'Review Resolved',
  'Denied',
  'Ignored',
  'Resolved',
  'Acknowledged',
];

const impactOptions = ['High', 'Low', 'No impact'];

type ImpactType = 'High' | 'Low' | 'No impact';

export function ViolationsTable({
  violations,
  onRowClick,
  onViolationUpdate,
  subdomain,
  isActiveTab,
}: ViolationsTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [impactFilter, setImpactFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('importedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isBulkResolving, setIsBulkResolving] = useState(false);

  // Filter and sort violations
  const filteredViolations = useMemo(() => {
    let result = [...violations];

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (v) =>
          v.asin.toLowerCase().includes(searchLower) ||
          v.productTitle.toLowerCase().includes(searchLower) ||
          v.reason.toLowerCase().includes(searchLower) ||
          v.id.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((v) => v.status === statusFilter);
    }

    // Impact filter
    if (impactFilter !== 'all') {
      result = result.filter((v) => v.ahrImpact === impactFilter);
    }

    // Sort
    if (sortKey !== 'none') {
      result.sort((a, b) => {
        const aValue = a[sortKey as keyof Violation];
        const bValue = b[sortKey as keyof Violation];

        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          // Date sorting
          if (sortKey === 'importedAt' || sortKey === 'date' || sortKey === 'dateResolved') {
            const dateA = new Date(aValue).getTime();
            const dateB = new Date(bValue).getTime();
            if (!isNaN(dateA) && !isNaN(dateB)) {
              return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
            }
          }
          const comparison = aValue.localeCompare(bValue);
          return sortDirection === 'asc' ? comparison : -comparison;
        }

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }

        return 0;
      });
    }

    return result;
  }, [violations, search, statusFilter, impactFilter, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const truncateText = (text: string, maxLength: number) => {
    if (!text) return '-';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // API update function
  const updateViolation = useCallback(
    async (violationId: string, field: string, value: string | ViolationStatus) => {
      try {
        const response = await fetch('/api/team/violations/update', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subdomain,
            violationId,
            updates: { [field]: value },
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Update failed');
        }

        // Notify parent of update for optimistic UI
        if (onViolationUpdate) {
          onViolationUpdate(violationId, { [field]: value } as Partial<Violation>);
        }

        toast({
          title: 'Updated',
          description: `${field} updated successfully`,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Update failed';
        toast({
          title: 'Update failed',
          description: message,
          variant: 'destructive',
        });
        throw error; // Re-throw so editable cell can revert
      }
    },
    [subdomain, onViolationUpdate]
  );

  // Resolve violation function
  const handleResolve = useCallback(
    async (violationId: string) => {
      setResolvingIds((prev) => new Set(prev).add(violationId));

      try {
        const response = await fetch('/api/team/violations/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subdomain,
            violationId,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Resolve failed');
        }

        // Notify parent to refresh data
        if (onViolationUpdate) {
          onViolationUpdate(violationId, { status: 'Resolved' as ViolationStatus });
        }

        toast({
          title: 'Violation Resolved',
          description: 'Moved to resolved violations tab',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Resolve failed';
        toast({
          title: 'Resolve failed',
          description: message,
          variant: 'destructive',
        });
      } finally {
        setResolvingIds((prev) => {
          const next = new Set(prev);
          next.delete(violationId);
          return next;
        });
      }
    },
    [subdomain, onViolationUpdate]
  );

  // Selection handlers
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredViolations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredViolations.map((v) => v.id)));
    }
  }, [filteredViolations, selectedIds.size]);

  const handleSelectRow = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Bulk update status
  const handleBulkStatusUpdate = useCallback(
    async (newStatus: ViolationStatus) => {
      if (selectedIds.size === 0) return;

      setIsBulkUpdating(true);

      try {
        const response = await fetch('/api/team/violations/bulk-update', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subdomain,
            violations: Array.from(selectedIds).map((id) => ({
              violationId: id,
              updates: { status: newStatus },
            })),
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Bulk update failed');
        }

        // Update local state optimistically
        const idsSet = selectedIds;
        if (onViolationUpdate) {
          idsSet.forEach((id) => {
            onViolationUpdate(id, { status: newStatus });
          });
        }

        toast({
          title: 'Bulk Update Complete',
          description: `Updated ${data.data?.succeeded || selectedIds.size} violations to "${newStatus}"`,
        });

        setSelectedIds(new Set());
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Bulk update failed';
        toast({
          title: 'Bulk Update Failed',
          description: message,
          variant: 'destructive',
        });
      } finally {
        setIsBulkUpdating(false);
      }
    },
    [selectedIds, subdomain, onViolationUpdate]
  );

  // Bulk resolve
  const handleBulkResolve = useCallback(async () => {
    if (selectedIds.size === 0) return;

    setIsBulkResolving(true);

    try {
      // Resolve each violation sequentially to avoid rate limiting
      const results: { id: string; success: boolean }[] = [];

      for (const id of Array.from(selectedIds)) {
        try {
          const response = await fetch('/api/team/violations/resolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subdomain, violationId: id }),
          });
          const data = await response.json();
          results.push({ id, success: response.ok && data.success });
        } catch {
          results.push({ id, success: false });
        }
      }

      const succeeded = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      if (succeeded > 0 && onViolationUpdate) {
        // Trigger refresh
        results
          .filter((r) => r.success)
          .forEach((r) => {
            onViolationUpdate(r.id, { status: 'Resolved' as ViolationStatus });
          });
      }

      if (failed === 0) {
        toast({
          title: 'Bulk Resolve Complete',
          description: `Resolved ${succeeded} violations`,
        });
      } else {
        toast({
          title: 'Bulk Resolve Partial',
          description: `Resolved ${succeeded}, failed ${failed}`,
          variant: 'destructive',
        });
      }

      setSelectedIds(new Set());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bulk resolve failed';
      toast({
        title: 'Bulk Resolve Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsBulkResolving(false);
    }
  }, [selectedIds, subdomain, onViolationUpdate]);

  const SortableHeader = ({
    label,
    sortKeyName,
    className = '',
  }: {
    label: string;
    sortKeyName: SortKey;
    className?: string;
  }) => (
    <th
      className={`px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors select-none ${className}`}
      onClick={() => handleSort(sortKeyName)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown
          className={`h-3 w-3 ${
            sortKey === sortKeyName ? 'text-orange-500' : 'text-gray-600'
          }`}
        />
      </div>
    </th>
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search ASIN, product, reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-[#1a1a1a] border-gray-700 text-white placeholder:text-gray-500"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] bg-[#1a1a1a] border-gray-700 text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-gray-700">
              <SelectItem value="all">All Statuses</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={impactFilter} onValueChange={setImpactFilter}>
            <SelectTrigger className="w-[140px] bg-[#1a1a1a] border-gray-700 text-white">
              <SelectValue placeholder="Impact" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-gray-700">
              <SelectItem value="all">All Impact</SelectItem>
              {impactOptions.map((impact) => (
                <SelectItem key={impact} value={impact}>
                  {impact}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count and bulk actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm text-gray-400">
          {selectedIds.size > 0 ? (
            <span className="text-orange-400">
              {selectedIds.size} selected
            </span>
          ) : (
            <>Showing {filteredViolations.length} of {violations.length} violations</>
          )}
        </div>
        {selectedIds.size > 0 && isActiveTab && (
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              onValueChange={(value) => handleBulkStatusUpdate(value as ViolationStatus)}
              disabled={isBulkUpdating}
            >
              <SelectTrigger className="w-[160px] h-8 bg-[#1a1a1a] border-gray-700 text-white text-xs">
                <SelectValue placeholder="Set Status..." />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-gray-700">
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status} className="text-xs">
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleBulkResolve}
              disabled={isBulkResolving}
              className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
            >
              {isBulkResolving ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Resolving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Resolve All
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedIds(new Set())}
              className="border-gray-700 text-gray-300 hover:bg-gray-800 h-8 text-xs"
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#111111] border-b border-gray-800">
              <tr>
                {isActiveTab && (
                  <th className="px-3 py-2 w-10">
                    <input
                      type="checkbox"
                      checked={filteredViolations.length > 0 && selectedIds.size === filteredViolations.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-orange-500 focus:ring-orange-500 focus:ring-offset-0"
                    />
                  </th>
                )}
                <SortableHeader label="ID" sortKeyName="id" />
                <SortableHeader label="Imported" sortKeyName="importedAt" />
                <SortableHeader label="Reason" sortKeyName="reason" />
                <SortableHeader label="ASIN" sortKeyName="asin" />
                <SortableHeader label="Product" sortKeyName="productTitle" />
                <SortableHeader label="At-Risk" sortKeyName="atRiskSales" className="text-right" />
                <SortableHeader label="Impact" sortKeyName="ahrImpact" />
                <SortableHeader label="Status" sortKeyName="status" />
                {isActiveTab && (
                  <>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Docs
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider w-20">
                      Action
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredViolations.map((violation, index) => {
                const hasHighImpact = violation.ahrImpact === 'High';
                const isSelected = selectedIds.has(violation.id);
                const isResolving = resolvingIds.has(violation.id);

                return (
                  <tr
                    key={violation.id}
                    className={`
                      transition-colors
                      ${index % 2 === 0 ? 'bg-[#1a1a1a]' : 'bg-[#161616]'}
                      ${hasHighImpact ? 'hover:bg-red-950/30' : 'hover:bg-gray-800/50'}
                      ${isSelected ? 'bg-orange-500/10' : ''}
                    `}
                  >
                    {isActiveTab && (
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(violation.id, e as unknown as React.MouseEvent)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-orange-500 focus:ring-orange-500 focus:ring-offset-0"
                        />
                      </td>
                    )}
                    <td
                      className="px-3 py-2 cursor-pointer"
                      onClick={() => onRowClick(violation)}
                    >
                      <span className="font-mono text-xs text-gray-400">
                        {violation.id.substring(0, 8)}
                      </span>
                    </td>
                    <td
                      className="px-3 py-2 text-gray-300 whitespace-nowrap cursor-pointer"
                      onClick={() => onRowClick(violation)}
                    >
                      {formatDate(violation.importedAt)}
                    </td>
                    <td
                      className="px-3 py-2 text-white max-w-[150px] cursor-pointer"
                      onClick={() => onRowClick(violation)}
                    >
                      {truncateText(violation.reason, 25)}
                    </td>
                    <td className="px-3 py-2">
                      <a
                        href={`https://www.amazon.com/dp/${violation.asin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="font-mono text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1"
                      >
                        {violation.asin}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                    <td
                      className="px-3 py-2 text-gray-300 max-w-[200px] cursor-pointer"
                      onClick={() => onRowClick(violation)}
                    >
                      {truncateText(violation.productTitle, 30)}
                    </td>
                    <td
                      className="px-3 py-2 text-right cursor-pointer"
                      onClick={() => onRowClick(violation)}
                    >
                      <span className={violation.atRiskSales > 0 ? 'text-white font-medium' : 'text-gray-500'}>
                        {formatCurrency(violation.atRiskSales)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {isActiveTab ? (
                        <EditableImpactCell
                          value={violation.ahrImpact as ImpactType}
                          onSave={async (value) => {
                            await updateViolation(violation.id, 'ahrImpact', value);
                          }}
                        />
                      ) : (
                        <span className={getImpactBadgeClass(violation.ahrImpact)}>
                          {violation.ahrImpact}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {isActiveTab ? (
                        <EditableStatusCell
                          value={violation.status}
                          onSave={async (value) => {
                            await updateViolation(violation.id, 'status', value);
                          }}
                        />
                      ) : (
                        <span className={getStatusBadgeClass(violation.status)}>
                          {violation.status}
                        </span>
                      )}
                    </td>
                    {isActiveTab && (
                      <>
                        <td className="px-3 py-2">
                          <EditableDocsNeededCell
                            value={violation.docsNeeded || ''}
                            onSave={async (value) => {
                              await updateViolation(violation.id, 'docsNeeded', value);
                            }}
                          />
                        </td>
                        <td className="px-3 py-2 max-w-[150px]">
                          <EditableTextCell
                            value={violation.notes || ''}
                            onSave={async (value) => {
                              await updateViolation(violation.id, 'notes', value);
                            }}
                            placeholder="Add note..."
                            maxLength={500}
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResolve(violation.id);
                            }}
                            disabled={isResolving}
                            className="text-green-500 hover:text-green-400 hover:bg-green-500/10 h-7 px-2"
                            title="Mark as Resolved"
                          >
                            {isResolving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                          </Button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty state */}
      {filteredViolations.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">
            {search || statusFilter !== 'all' || impactFilter !== 'all'
              ? 'No violations match your filters'
              : 'No violations found'}
          </p>
        </div>
      )}
    </div>
  );
}
