'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Search,
  AlertTriangle,
  Users,
  Clock,
  DollarSign,
  CheckCircle,
  X,
  Eye,
  SearchX,
  type LucideIcon,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { ClientOverview } from '@/types';

type SortKey = keyof ClientOverview;
type SortDirection = 'asc' | 'desc';
type FilterType = 'all' | 'high-impact' | 'new-activity' | 'high-revenue';

interface ClientTableProps {
  clients: ClientOverview[];
}

// KPI Card Component
function KpiCard({
  label,
  value,
  icon: Icon,
  color = 'text-white',
  glowColor,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  glowColor?: string;
}) {
  return (
    <div
      className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-lg p-4 min-w-[160px] relative"
      style={glowColor ? { boxShadow: `0 0 20px ${glowColor}` } : undefined}
    >
      <Icon className="absolute top-4 right-4 h-4 w-4 text-gray-500" />
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

// Filter Button Component
function FilterButton({
  label,
  active,
  count,
  onClick,
}: {
  label: string;
  active: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 text-[13px] rounded-md border transition-all duration-150
        ${active
          ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
          : 'bg-transparent border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-gray-300'
        }
      `}
    >
      {label}
      {count !== undefined && count > 0 && active && (
        <span className="ml-2 bg-orange-500 text-white text-xs rounded-full min-w-[20px] px-1.5 py-0.5 inline-block text-center">
          {count}
        </span>
      )}
    </button>
  );
}

export function ClientTable({ clients }: ClientTableProps) {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('highImpactCount');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(-1);

  // Calculate KPI metrics
  const kpiMetrics = useMemo(() => {
    const totalClients = clients.length;
    const needsAttention = clients.filter(c => c.highImpactCount > 0).length;
    const total48h = clients.reduce((sum, c) => sum + (c.violations48h || 0), 0);
    const totalAtRisk = clients.reduce((sum, c) => sum + (c.atRiskSales || 0), 0);
    const totalResolved = clients.reduce((sum, c) => sum + (c.resolvedThisMonth || 0), 0);

    return { totalClients, needsAttention, total48h, totalAtRisk, totalResolved };
  }, [clients]);

  // Filter and sort clients
  const filteredClients = useMemo(() => {
    let result = [...clients];

    // Apply filter
    switch (activeFilter) {
      case 'high-impact':
        result = result.filter(c => c.highImpactCount > 0);
        break;
      case 'new-activity':
        result = result.filter(c => c.violations48h > 0);
        break;
      case 'high-revenue':
        result = result.filter(c => c.atRiskSales > 100000);
        break;
    }

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (client) =>
          client.storeName.toLowerCase().includes(searchLower) ||
          client.subdomain.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    result.sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

    return result;
  }, [clients, search, sortKey, sortDirection, activeFilter]);

  // Get filter counts
  const filterCounts = useMemo(() => ({
    'high-impact': clients.filter(c => c.highImpactCount > 0).length,
    'new-activity': clients.filter(c => c.violations48h > 0).length,
    'high-revenue': clients.filter(c => c.atRiskSales > 100000).length,
  }), [clients]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      // Arrow navigation when not in search
      if (document.activeElement !== searchInputRef.current) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setFocusedRowIndex(prev => Math.min(prev + 1, filteredClients.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setFocusedRowIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && focusedRowIndex >= 0) {
          const client = filteredClients[focusedRowIndex];
          if (client) {
            if (e.metaKey || e.ctrlKey) {
              window.open(`https://${client.subdomain}.sellercentry.com`, '_blank');
            } else {
              router.push(`/team/client/${client.subdomain}`);
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredClients, focusedRowIndex, router]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const handleRowClick = (subdomain: string) => {
    router.push(`/team/client/${subdomain}`);
  };

  const handleClientLinkClick = (e: React.MouseEvent, subdomain: string) => {
    e.stopPropagation();
    window.open(`https://${subdomain}.sellercentry.com`, '_blank', 'noopener,noreferrer');
  };

  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatAtRiskRevenue = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const getUrgencyClass = (highImpactCount: number): string => {
    if (highImpactCount >= 5) return 'border-l-[3px] border-l-red-500';
    if (highImpactCount >= 1) return 'border-l-[3px] border-l-amber-500';
    return 'border-l-[3px] border-l-transparent';
  };

  const getWarningIconClass = (highImpactCount: number): string => {
    if (highImpactCount >= 5) return 'text-red-500 animate-pulse';
    if (highImpactCount >= 1) return 'text-amber-500';
    return 'invisible';
  };

  const SortableHeader = ({
    label,
    sortKeyName,
    className = '',
    tooltip,
  }: {
    label: string;
    sortKeyName: SortKey;
    className?: string;
    tooltip?: string;
  }) => {
    const isActive = sortKey === sortKeyName;
    return (
      <th
        className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.05em] cursor-pointer select-none transition-colors ${
          isActive ? 'text-white' : 'text-[rgba(255,255,255,0.5)]'
        } hover:text-white ${className}`}
        onClick={() => handleSort(sortKeyName)}
        title={tooltip}
      >
        <div className="flex items-center gap-1">
          {label}
          {isActive ? (
            sortDirection === 'asc' ? (
              <ChevronUp className="h-3.5 w-3.5 text-orange-400" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-orange-400" />
            )
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-gray-600 opacity-0 group-hover:opacity-100" />
          )}
        </div>
      </th>
    );
  };

  const clearSearch = () => {
    setSearch('');
    searchInputRef.current?.focus();
  };

  const clearFilters = () => {
    setActiveFilter('all');
    setSearch('');
  };

  return (
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      <div className="flex flex-wrap gap-4">
        <KpiCard
          label="Total Clients"
          value={kpiMetrics.totalClients}
          icon={Users}
          color="text-white"
        />
        <KpiCard
          label="Needs Attention"
          value={kpiMetrics.needsAttention}
          icon={AlertTriangle}
          color="text-amber-400"
          glowColor={kpiMetrics.needsAttention > 0 ? 'rgba(251, 191, 36, 0.1)' : undefined}
        />
        <KpiCard
          label="New (48h)"
          value={kpiMetrics.total48h}
          icon={Clock}
          color="text-orange-400"
        />
        <KpiCard
          label="At-Risk Revenue"
          value={formatCurrency(kpiMetrics.totalAtRisk)}
          icon={DollarSign}
          color={kpiMetrics.totalAtRisk > 1000000 ? 'text-red-400' : kpiMetrics.totalAtRisk > 500000 ? 'text-orange-400' : 'text-gray-300'}
        />
        <KpiCard
          label="Resolved (Month)"
          value={kpiMetrics.totalResolved}
          icon={CheckCircle}
          color="text-emerald-400"
        />
      </div>

      {/* Search and Filters Row */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-[320px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-[18px] w-[18px] text-gray-500" />
          <Input
            ref={searchInputRef}
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-20 h-10 bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.1)] text-white placeholder:text-gray-500 rounded-lg focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/10"
          />
          {search && (
            <button
              onClick={clearSearch}
              className="absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white p-1"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded hidden sm:inline">
            {typeof navigator !== 'undefined' && navigator.platform?.includes('Mac') ? '⌘K' : 'Ctrl+K'}
          </kbd>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <FilterButton
            label="All"
            active={activeFilter === 'all'}
            onClick={() => setActiveFilter('all')}
          />
          <FilterButton
            label="High Impact"
            active={activeFilter === 'high-impact'}
            count={filterCounts['high-impact']}
            onClick={() => setActiveFilter('high-impact')}
          />
          <FilterButton
            label="New Activity"
            active={activeFilter === 'new-activity'}
            count={filterCounts['new-activity']}
            onClick={() => setActiveFilter('new-activity')}
          />
          <FilterButton
            label="High Revenue Risk"
            active={activeFilter === 'high-revenue'}
            count={filterCounts['high-revenue']}
            onClick={() => setActiveFilter('high-revenue')}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.08)] sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="w-8 px-2 py-3"></th>
                <SortableHeader label="Client Name" sortKeyName="storeName" />
                <SortableHeader label="48h" sortKeyName="violations48h" className="text-center" tooltip="Violations imported in last 48 hours" />
                <SortableHeader label="72h" sortKeyName="violations72h" className="text-center hidden md:table-cell" tooltip="Violations imported in last 72 hours" />
                <SortableHeader label="Month" sortKeyName="resolvedThisMonth" className="text-center hidden md:table-cell" tooltip="Violations resolved this calendar month" />
                <SortableHeader label="Total" sortKeyName="resolvedTotal" className="text-center" tooltip="Total active violations" />
                <SortableHeader label="High" sortKeyName="highImpactCount" className="text-center" tooltip="High impact violations affecting account health" />
                <SortableHeader label="At-Risk" sortKeyName="atRiskSales" className="text-right" tooltip="Total revenue at risk from active violations" />
                <th className="w-20 px-2 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {filteredClients.map((client, index) => {
                const hasHighImpact = client.highImpactCount > 0;
                const isFocused = index === focusedRowIndex;
                return (
                  <tr
                    key={client.subdomain}
                    onClick={() => handleRowClick(client.subdomain)}
                    className={`
                      cursor-pointer transition-colors duration-150 group
                      ${getUrgencyClass(client.highImpactCount)}
                      ${isFocused ? 'ring-2 ring-orange-500/50 ring-inset bg-[rgba(255,255,255,0.04)]' : ''}
                      ${hasHighImpact ? 'hover:bg-red-950/20' : 'hover:bg-[rgba(255,255,255,0.04)]'}
                    `}
                    onMouseEnter={() => setFocusedRowIndex(index)}
                  >
                    {/* Warning Icon Column */}
                    <td className="w-8 px-2 py-3 text-center">
                      <AlertTriangle className={`h-4 w-4 ${getWarningIconClass(client.highImpactCount)}`} />
                    </td>

                    {/* Client Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium group-hover:underline">
                          {client.storeName}
                        </span>
                        <ExternalLink
                          onClick={(e) => handleClientLinkClick(e, client.subdomain)}
                          className="h-3.5 w-3.5 text-gray-500 opacity-0 group-hover:opacity-100 hover:text-orange-400 transition-all cursor-pointer"
                        />
                      </div>
                    </td>

                    {/* 48h */}
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`font-mono tabular-nums ${
                          client.violations48h > 10
                            ? 'bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded'
                            : client.violations48h > 0
                              ? 'text-orange-400'
                              : 'text-gray-600'
                        }`}
                      >
                        {client.violations48h === 0 ? '—' : client.violations48h}
                      </span>
                    </td>

                    {/* 72h */}
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      <span
                        className={`font-mono tabular-nums ${
                          client.violations72h > 0 ? 'text-orange-400' : 'text-gray-600'
                        }`}
                      >
                        {client.violations72h === 0 ? '—' : client.violations72h}
                      </span>
                    </td>

                    {/* Month */}
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      <span
                        className={`font-mono tabular-nums ${
                          client.resolvedThisMonth > 0 ? 'text-teal-400' : 'text-gray-600'
                        }`}
                      >
                        {client.resolvedThisMonth === 0 ? '—' : client.resolvedThisMonth}
                      </span>
                    </td>

                    {/* Total */}
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono tabular-nums text-gray-300">
                        {client.resolvedTotal}
                      </span>
                    </td>

                    {/* High */}
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`font-mono tabular-nums font-medium ${
                          client.highImpactCount > 0
                            ? 'bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded'
                            : 'text-gray-600'
                        }`}
                      >
                        {client.highImpactCount === 0 ? '—' : client.highImpactCount}
                      </span>
                    </td>

                    {/* At-Risk */}
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-mono tabular-nums ${
                          client.atRiskSales > 1000000
                            ? 'text-red-400'
                            : client.atRiskSales > 0
                              ? 'text-white'
                              : 'text-gray-600'
                        }`}
                      >
                        {client.atRiskSales === 0 ? '—' : formatAtRiskRevenue(client.atRiskSales)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="w-20 px-2 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/team/client/${client.subdomain}`);
                          }}
                          className="h-7 px-2 bg-gray-700/80 hover:bg-gray-600 rounded text-gray-300 hover:text-white transition-colors"
                          title="View violations"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleClientLinkClick(e, client.subdomain)}
                          className="h-7 px-2 bg-transparent hover:bg-gray-700/50 rounded text-gray-400 hover:text-white transition-colors"
                          title="Open client dashboard"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty state for filtered results */}
      {filteredClients.length === 0 && (search || activeFilter !== 'all') && (
        <div className="text-center py-12">
          <SearchX className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No clients found</h3>
          <p className="text-gray-400 mb-4">Try adjusting your search or filters</p>
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="bg-[rgba(255,255,255,0.02)] rounded-md p-3 inline-flex flex-wrap gap-6">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500"></span>
          <span className="text-xs text-gray-500">48h/72h - New violations</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-500"></span>
          <span className="text-xs text-gray-500">Month - Resolved this month</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span className="text-xs text-gray-500">High - High impact violations</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500"></span>
          <span className="text-xs text-gray-500">Critical urgency (5+ high impact)</span>
        </div>
      </div>
    </div>
  );
}
