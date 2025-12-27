'use client';

import { useState, useMemo } from 'react';
import { ArrowUpDown, Search, ExternalLink, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Violation, ViolationStatus } from '@/types';

type SortKey = keyof Violation | 'none';
type SortDirection = 'asc' | 'desc';

interface ViolationsTableProps {
  violations: Violation[];
  onRowClick: (violation: Violation) => void;
  isActiveTab: boolean;
}

// Status badge styling
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

// Impact badge styling
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

export function ViolationsTable({ violations, onRowClick, isActiveTab }: ViolationsTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [impactFilter, setImpactFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('importedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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

      {/* Results count */}
      <div className="text-sm text-gray-400">
        Showing {filteredViolations.length} of {violations.length} violations
      </div>

      {/* Table */}
      <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#111111] border-b border-gray-800">
              <tr>
                <SortableHeader label="ID" sortKeyName="id" />
                <SortableHeader label="Imported" sortKeyName="importedAt" />
                <SortableHeader label="Reason" sortKeyName="reason" />
                <SortableHeader label="ASIN" sortKeyName="asin" />
                <SortableHeader label="Product" sortKeyName="productTitle" />
                <SortableHeader label="At-Risk" sortKeyName="atRiskSales" className="text-right" />
                <SortableHeader label="Impact" sortKeyName="ahrImpact" />
                <SortableHeader label="Status" sortKeyName="status" />
                {isActiveTab && (
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Docs
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredViolations.map((violation, index) => {
                const hasHighImpact = violation.ahrImpact === 'High';
                const hasDocsNeeded = isActiveTab && violation.docsNeeded;
                return (
                  <tr
                    key={violation.id}
                    onClick={() => onRowClick(violation)}
                    className={`
                      cursor-pointer transition-colors
                      ${index % 2 === 0 ? 'bg-[#1a1a1a]' : 'bg-[#161616]'}
                      ${hasHighImpact ? 'hover:bg-red-950/30' : 'hover:bg-gray-800/50'}
                    `}
                  >
                    <td className="px-3 py-2">
                      <span className="font-mono text-xs text-gray-400">
                        {violation.id.substring(0, 8)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-300 whitespace-nowrap">
                      {formatDate(violation.importedAt)}
                    </td>
                    <td className="px-3 py-2 text-white max-w-[150px]">
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
                    <td className="px-3 py-2 text-gray-300 max-w-[200px]">
                      {truncateText(violation.productTitle, 30)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className={violation.atRiskSales > 0 ? 'text-white font-medium' : 'text-gray-500'}>
                        {formatCurrency(violation.atRiskSales)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={getImpactBadgeClass(violation.ahrImpact)}>
                        {violation.ahrImpact}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={getStatusBadgeClass(violation.status)}>
                        {violation.status}
                      </span>
                    </td>
                    {isActiveTab && (
                      <td className="px-3 py-2">
                        {hasDocsNeeded ? (
                          <span className="inline-flex items-center gap-1 text-yellow-400">
                            <FileText className="h-3 w-3" />
                            <span className="text-xs">Needed</span>
                          </span>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
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
