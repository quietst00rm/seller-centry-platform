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
}

// KPI Card Component with left border accent
function KpiCard({
  label,
  value,
  icon: Icon,
  accentColor,
  textColor = 'text-white',
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accentColor?: string;
  textColor?: string;
}) {
  return (
    <div
      className={`bg-[#161b22] p-4 rounded-lg border border-[#2d333b] shadow-sm ${
        accentColor ? `border-l-4 ${accentColor}` : ''
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className={`text-xs font-semibold uppercase tracking-wider ${
          textColor === 'text-white' ? 'text-gray-400' : textColor
        }`}>
          {label}
        </span>
        <Icon className={`h-5 w-5 ${textColor === 'text-white' ? 'text-gray-400' : textColor}`} />
      </div>
      <div className={`text-2xl font-bold ${textColor}`}>{value}</div>
    </div>
  );
}

// Filter Button Component - Pill style
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
        px-4 py-2 rounded-full text-sm font-medium transition-colors
        ${active
          ? 'bg-orange-600 text-white shadow-sm hover:bg-orange-700'
          : 'bg-[#161b22] text-gray-300 border border-[#2d333b] hover:bg-[#1f262e]'
        }
      `}
    >
      {label}
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

  const formatCurrency = (value: number): string => {
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
      className={`px-6 py-3 font-semibold tracking-wider cursor-pointer hover:text-gray-200 transition-colors ${className}`}
      onClick={() => handleSort(sortKeyName)}
    >
      {label}
    </th>
  );

  return (
    <div className="space-y-8">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Total Clients"
          value={kpiMetrics.totalClients}
          icon={Users}
          textColor="text-white"
        />
        <KpiCard
          label="Needs Attention"
          value={kpiMetrics.needsAttention}
          icon={AlertTriangle}
          accentColor="border-l-amber-500"
          textColor="text-amber-500"
        />
        <KpiCard
          label="New (48H)"
          value={kpiMetrics.total48h}
          icon={Clock}
          accentColor="border-l-orange-500"
          textColor="text-orange-500"
        />
        <KpiCard
          label="At-Risk Revenue"
          value={formatCurrency(kpiMetrics.totalAtRisk)}
          icon={DollarSign}
          accentColor="border-l-red-500"
          textColor="text-red-500"
        />
        <KpiCard
          label="Resolved (Month)"
          value={kpiMetrics.totalResolved}
          icon={CheckCircle}
          accentColor="border-l-teal-500"
          textColor="text-teal-500"
        />
      </div>

      {/* Search and Filters Row */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80 group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-[18px] w-[18px] text-gray-400 group-focus-within:text-orange-500 transition-colors" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-10 pr-12 py-2 bg-[#161b22] border border-[#2d333b] rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-shadow"
          />
          {search ? (
            <button
              onClick={clearSearch}
              className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-xs font-mono text-gray-500 bg-[#1f262e] border border-[#2d333b] rounded">
                {typeof navigator !== 'undefined' && navigator.platform?.includes('Mac') ? '⌘K' : 'Ctrl+K'}
              </kbd>
            </div>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          <FilterButton
            label="All"
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
            label="High Revenue Risk"
            active={activeFilter === 'high-revenue'}
            onClick={() => setActiveFilter('high-revenue')}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#161b22] border border-[#2d333b] rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-400 uppercase bg-[#1f262e] border-b border-[#2d333b] sticky top-0">
              <tr>
                <SortableHeader label="Client Name" sortKeyName="storeName" className="text-left" />
                <SortableHeader label="48H" sortKeyName="violations48h" className="text-right" />
                <SortableHeader label="72H" sortKeyName="violations72h" className="text-right hidden md:table-cell" />
                <SortableHeader label="Month" sortKeyName="resolvedThisMonth" className="text-right hidden md:table-cell" />
                <SortableHeader label="Total" sortKeyName="resolvedTotal" className="text-right" />
                <SortableHeader label="High" sortKeyName="highImpactCount" className="text-right" />
                <SortableHeader label="At-Risk" sortKeyName="atRiskSales" className="text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d333b]">
              {filteredClients.map((client) => {
                const isHighRisk = client.atRiskSales >= 1000000;
                const hasHighImpact = client.highImpactCount > 0;

                return (
                  <tr
                    key={client.subdomain}
                    onClick={() => handleRowClick(client.subdomain)}
                    className={`
                      cursor-pointer transition-colors group
                      border-l-2 border-l-transparent hover:border-l-orange-500
                      ${hasHighImpact && client.highImpactCount >= 5
                        ? 'bg-amber-900/10 hover:bg-amber-900/20'
                        : 'bg-[#161b22] hover:bg-[#1f262e]'
                      }
                    `}
                  >
                    {/* Client Name */}
                    <td className="px-6 py-4 font-medium text-white whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {client.storeName}
                        <ExternalLink
                          onClick={(e) => handleExternalLinkClick(e, client.subdomain)}
                          className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-white transition-all cursor-pointer"
                        />
                      </div>
                    </td>

                    {/* 48H */}
                    <td className="px-6 py-4 text-right">
                      {client.violations48h > 0 ? (
                        <span className="text-orange-400 font-medium">{client.violations48h}</span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>

                    {/* 72H */}
                    <td className="px-6 py-4 text-right hidden md:table-cell">
                      {client.violations72h > 0 ? (
                        <span className="text-orange-400 font-medium">{client.violations72h}</span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>

                    {/* Month */}
                    <td className="px-6 py-4 text-right hidden md:table-cell">
                      {client.resolvedThisMonth > 0 ? (
                        <span className="text-teal-400 font-medium">{client.resolvedThisMonth}</span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>

                    {/* Total */}
                    <td className="px-6 py-4 text-right text-gray-300">
                      {client.resolvedTotal}
                    </td>

                    {/* High */}
                    <td className="px-6 py-4 text-right">
                      {client.highImpactCount > 0 ? (
                        <span className="bg-amber-900/30 text-amber-400 py-0.5 px-2 rounded font-bold">
                          {client.highImpactCount}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>

                    {/* At-Risk */}
                    <td className="px-6 py-4 text-right font-mono">
                      <span className={isHighRisk ? 'text-red-400 font-bold' : 'text-gray-200'}>
                        {formatCurrency(client.atRiskSales)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Footer Legend */}
        <div className="px-6 py-4 bg-[#1f262e] border-t border-[#2d333b] flex flex-wrap gap-6 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-400"></span>
            <span>48h/72h - New violations</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-400"></span>
            <span>Month - Resolved this month</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>High - High impact violations</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400"></span>
            <span>Critical urgency (5+ high impact)</span>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {filteredClients.length === 0 && (
        <div className="text-center py-12 bg-[#161b22] border border-[#2d333b] rounded-lg">
          <Search className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No clients found</h3>
          <p className="text-gray-400 mb-4">Try adjusting your search or filters</p>
          <button
            onClick={() => {
              setActiveFilter('all');
              setSearch('');
            }}
            className="px-4 py-2 bg-[#1f262e] hover:bg-[#2d333b] text-gray-300 hover:text-white rounded transition-colors"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
