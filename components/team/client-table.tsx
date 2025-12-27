'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  Users,
  AlertTriangle,
  Clock,
  DollarSign,
  CheckCircle,
  ExternalLink,
  type LucideIcon,
} from 'lucide-react';
import type { ClientOverview } from '@/types';

type SortKey = keyof ClientOverview;
type SortDirection = 'asc' | 'desc';
type FilterType = 'all' | 'high-impact' | 'new-activity' | 'high-revenue';

interface ClientTableProps {
  clients: ClientOverview[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

// KPI Card Component matching mockup design
function KpiCard({
  label,
  value,
  icon: Icon,
  labelColor = 'text-gray-500 dark:text-gray-400',
  iconBgColor = 'bg-gray-50 dark:bg-gray-800',
  iconColor = 'text-gray-400',
  borderColor = '',
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  labelColor?: string;
  iconBgColor?: string;
  iconColor?: string;
  borderColor?: string;
}) {
  return (
    <div className={`bg-white dark:bg-[#161b22] p-6 rounded-xl border border-gray-200 dark:border-[#30363d] shadow-sm hover:shadow-md transition-shadow ${borderColor}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${labelColor}`}>
            {label}
          </p>
          <p className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
            {value}
          </p>
        </div>
        <div className={`w-10 h-10 rounded-full ${iconBgColor} flex items-center justify-center border border-gray-100 dark:border-gray-700`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

// Filter Button Component - Pill style matching mockup
function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-5 py-2 rounded-full text-sm font-medium transition-all shadow-sm
        ${active
          ? 'bg-gradient-to-b from-gray-800 to-gray-950 dark:from-gray-100 dark:to-gray-300 text-white dark:text-gray-900 border border-transparent'
          : 'bg-white dark:bg-[#161b22] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-[#1f262e] hover:text-gray-900 dark:hover:text-white'
        }
      `}
    >
      {label}
    </button>
  );
}

export function ClientTable({ clients, onRefresh, isRefreshing }: ClientTableProps) {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('highImpactCount');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Calculate KPI metrics
  const kpiMetrics = useMemo(() => {
    const totalClients = clients.length;
    const needsAttention = clients.filter(c => c.highImpactCount > 0).length;
    const total48h = clients.reduce((sum, c) => sum + (c.violations48h || 0), 0);
    const totalAtRisk = clients.reduce((sum, c) => sum + (c.atRiskSales || 0), 0);
    const totalResolvedMonth = clients.reduce((sum, c) => sum + (c.resolvedThisMonth || 0), 0);

    return { totalClients, needsAttention, total48h, totalAtRisk, totalResolvedMonth };
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
        result = result.filter(c => c.violations48h > 0 || c.violationsThisWeek > 0);
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

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const handleExternalLinkClick = (e: React.MouseEvent, subdomain: string) => {
    e.stopPropagation();
    window.open(`https://${subdomain}.sellercentry.com`, '_blank', 'noopener,noreferrer');
  };

  // Format currency for table cells - full format: $###,###
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format currency for KPI cards - abbreviated: $17.2M
  const formatCurrencyAbbrev = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const clearSearch = () => {
    setSearch('');
    searchInputRef.current?.focus();
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
      scope="col"
      className={`px-6 py-5 font-bold tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 transition-colors text-center ${className}`}
      onClick={() => handleSort(sortKeyName)}
    >
      {label}
    </th>
  );

  return (
    <div className="space-y-10">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <KpiCard
          label="Total Clients"
          value={kpiMetrics.totalClients}
          icon={Users}
          iconBgColor="bg-gray-50 dark:bg-gray-800"
          iconColor="text-gray-400"
        />
        <KpiCard
          label="Needs Attention"
          value={kpiMetrics.needsAttention}
          icon={AlertTriangle}
          labelColor="text-amber-600 dark:text-amber-500"
          iconBgColor="bg-amber-50 dark:bg-amber-900/20"
          iconColor="text-amber-500"
          borderColor="border-amber-100 dark:border-amber-900/30"
        />
        <KpiCard
          label="New (48H)"
          value={kpiMetrics.total48h}
          icon={Clock}
          labelColor="text-orange-600 dark:text-orange-500"
          iconBgColor="bg-orange-50 dark:bg-orange-900/20"
          iconColor="text-orange-500"
        />
        <KpiCard
          label="At-Risk Revenue"
          value={formatCurrencyAbbrev(kpiMetrics.totalAtRisk)}
          icon={DollarSign}
          labelColor="text-red-600 dark:text-red-500"
          iconBgColor="bg-red-50 dark:bg-red-900/20"
          iconColor="text-red-500"
        />
        <KpiCard
          label="Resolved (Month)"
          value={kpiMetrics.totalResolvedMonth}
          icon={CheckCircle}
          labelColor="text-teal-600 dark:text-teal-500"
          iconBgColor="bg-teal-50 dark:bg-teal-900/20"
          iconColor="text-teal-500"
        />
      </div>

      {/* Filters and Search Row */}
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
        {/* Filter Buttons */}
        <div className="flex items-center gap-3">
          <FilterButton
            label="All Clients"
            active={activeFilter === 'all'}
            onClick={() => setActiveFilter('all')}
          />
          <FilterButton
            label="High Impact"
            active={activeFilter === 'high-impact'}
            onClick={() => setActiveFilter('high-impact')}
          />
          <FilterButton
            label="New Activity"
            active={activeFilter === 'new-activity'}
            onClick={() => setActiveFilter('new-activity')}
          />
          <FilterButton
            label="Revenue Risk"
            active={activeFilter === 'high-revenue'}
            onClick={() => setActiveFilter('high-revenue')}
          />
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80 group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-[18px] w-[18px] text-gray-400 group-focus-within:text-gray-600 dark:group-focus-within:text-gray-300 transition-colors" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search clients by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-10 pr-12 py-2.5 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
          />
          {search ? (
            <button
              onClick={clearSearch}
              className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                ⌘K
              </kbd>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50/80 dark:bg-[#1a2027] border-b border-gray-200 dark:border-[#30363d] sticky top-0 backdrop-blur-sm z-10">
              <tr>
                <SortableHeader label="Client Name" sortKeyName="storeName" className="text-left" />
                <SortableHeader label="New (48h)" sortKeyName="violations48h" />
                <SortableHeader label="This Week" sortKeyName="violationsThisWeek" />
                <SortableHeader label="Resolved (Month)" sortKeyName="resolvedThisMonth" />
                <SortableHeader label="Resolved (Week)" sortKeyName="resolvedThisWeek" />
                <SortableHeader label="Active Violations" sortKeyName="activeViolations" />
                <SortableHeader label="High Impact" sortKeyName="highImpactCount" />
                <SortableHeader label="Revenue At-Risk" sortKeyName="atRiskSales" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#30363d]">
              {filteredClients.map((client) => {
                const isHighRisk = client.atRiskSales >= 1000000;
                const hasHighImpact = client.highImpactCount >= 3;
                const hasNewActivity = client.violations48h > 0 || client.violationsThisWeek > 0;

                return (
                  <tr
                    key={client.subdomain}
                    onClick={() => handleRowClick(client.subdomain)}
                    className={`
                      cursor-pointer transition-colors group
                      border-l-[3px] hover:border-l-orange-500
                      ${hasNewActivity || hasHighImpact
                        ? 'bg-orange-50/50 dark:bg-orange-900/10 hover:bg-orange-100/50 dark:hover:bg-orange-900/20 border-l-orange-500'
                        : 'bg-white dark:bg-[#161b22] hover:bg-gray-50 dark:hover:bg-[#1f262e] border-l-transparent hover:border-l-orange-500/30'
                      }
                    `}
                  >
                    {/* Client Name */}
                    <td className="px-6 py-5 font-medium text-gray-900 dark:text-white whitespace-nowrap text-left">
                      <div className="flex items-center gap-2">
                        {client.storeName}
                        <ExternalLink
                          onClick={(e) => handleExternalLinkClick(e, client.subdomain)}
                          className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-gray-600 dark:hover:text-white transition-all cursor-pointer"
                        />
                      </div>
                    </td>

                    {/* New (48h) */}
                    <td className="px-6 py-5 text-center">
                      {client.violations48h > 0 ? (
                        <span className="text-orange-600 dark:text-orange-400 font-semibold">{client.violations48h}</span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">0</span>
                      )}
                    </td>

                    {/* This Week */}
                    <td className="px-6 py-5 text-center">
                      {client.violationsThisWeek > 0 ? (
                        <span className="text-orange-600 dark:text-orange-400 font-semibold">{client.violationsThisWeek}</span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">0</span>
                      )}
                    </td>

                    {/* Resolved (Month) */}
                    <td className="px-6 py-5 text-center">
                      {client.resolvedThisMonth > 0 ? (
                        <span className="text-teal-600 dark:text-teal-400 font-semibold">{client.resolvedThisMonth}</span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">0</span>
                      )}
                    </td>

                    {/* Resolved (Week) */}
                    <td className="px-6 py-5 text-center">
                      {client.resolvedThisWeek > 0 ? (
                        <span className="text-teal-600 dark:text-teal-400 font-semibold">{client.resolvedThisWeek}</span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">0</span>
                      )}
                    </td>

                    {/* Active Violations */}
                    <td className="px-6 py-5 text-center text-gray-900 dark:text-gray-300">
                      {client.activeViolations}
                    </td>

                    {/* High Impact */}
                    <td className="px-6 py-5 text-center">
                      {client.highImpactCount > 0 ? (
                        <span className="text-amber-700 dark:text-amber-500 font-bold">
                          {client.highImpactCount}
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">0</span>
                      )}
                    </td>

                    {/* Revenue At-Risk */}
                    <td className="px-6 py-5 text-center">
                      {isHighRisk ? (
                        <span className="inline-block bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-200 font-bold font-mono px-2.5 py-1 rounded border border-red-100 dark:border-red-800/50 shadow-sm">
                          {formatCurrency(client.atRiskSales)}
                        </span>
                      ) : (
                        <span className="text-gray-900 dark:text-gray-200 font-mono tracking-tight">
                          {formatCurrency(client.atRiskSales)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty state */}
      {filteredClients.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl">
          <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No clients found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Try adjusting your search or filters</p>
          <button
            onClick={() => {
              setActiveFilter('all');
              setSearch('');
            }}
            className="px-4 py-2 bg-gray-100 dark:bg-[#1f262e] hover:bg-gray-200 dark:hover:bg-[#2d333b] text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
