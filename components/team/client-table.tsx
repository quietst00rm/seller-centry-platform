'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, ArrowUpDown, Search, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { ClientOverview } from '@/types';

type SortKey = keyof ClientOverview;
type SortDirection = 'asc' | 'desc';

interface ClientTableProps {
  clients: ClientOverview[];
}

export function ClientTable({ clients }: ClientTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('storeName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Filter and sort clients
  const filteredClients = useMemo(() => {
    let result = [...clients];

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
  }, [clients, search, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handleRowClick = (subdomain: string) => {
    router.push(`/team/client/${subdomain}`);
  };

  const handleClientLinkClick = (e: React.MouseEvent, subdomain: string) => {
    e.stopPropagation();
    window.open(`https://${subdomain}.sellercentry.com`, '_blank', 'noopener,noreferrer');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
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
      className={`px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors select-none ${className}`}
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
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-[#1a1a1a] border-gray-700 text-white placeholder:text-gray-500"
        />
      </div>

      {/* Table */}
      <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#111111] border-b border-gray-800">
              <tr>
                <SortableHeader label="Client Name" sortKeyName="storeName" />
                <SortableHeader label="48h" sortKeyName="violations48h" className="text-center" />
                <SortableHeader label="72h" sortKeyName="violations72h" className="text-center" />
                <SortableHeader label="Month" sortKeyName="resolvedThisMonth" className="text-center" />
                <SortableHeader label="Total" sortKeyName="resolvedTotal" className="text-center" />
                <SortableHeader label="High" sortKeyName="highImpactCount" className="text-center" />
                <SortableHeader label="At-Risk" sortKeyName="atRiskSales" className="text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredClients.map((client, index) => {
                const hasHighImpact = client.highImpactCount > 0;
                return (
                  <tr
                    key={client.subdomain}
                    onClick={() => handleRowClick(client.subdomain)}
                    className={`
                      cursor-pointer transition-colors
                      ${index % 2 === 0 ? 'bg-[#1a1a1a]' : 'bg-[#161616]'}
                      ${hasHighImpact ? 'hover:bg-red-950/30' : 'hover:bg-gray-800/50'}
                    `}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {hasHighImpact && (
                          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                        )}
                        <button
                          onClick={(e) => handleClientLinkClick(e, client.subdomain)}
                          className="text-white hover:text-orange-500 font-medium flex items-center gap-1 transition-colors"
                        >
                          {client.storeName}
                          <ExternalLink className="h-3 w-3 text-gray-500" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`font-mono ${
                          client.violations48h > 0 ? 'text-orange-400' : 'text-gray-500'
                        }`}
                      >
                        {client.violations48h}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`font-mono ${
                          client.violations72h > 0 ? 'text-yellow-400' : 'text-gray-500'
                        }`}
                      >
                        {client.violations72h}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`font-mono ${
                          client.resolvedThisMonth > 0 ? 'text-green-400' : 'text-gray-500'
                        }`}
                      >
                        {client.resolvedThisMonth}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono text-gray-300">{client.resolvedTotal}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`font-mono font-medium ${
                          client.highImpactCount > 0 ? 'text-red-400' : 'text-gray-500'
                        }`}
                      >
                        {client.highImpactCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-mono ${
                          client.atRiskSales > 0 ? 'text-white' : 'text-gray-500'
                        }`}
                      >
                        {formatCurrency(client.atRiskSales)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty state for search */}
      {filteredClients.length === 0 && search && (
        <div className="text-center py-8">
          <p className="text-gray-400">No clients found matching &quot;{search}&quot;</p>
        </div>
      )}
    </div>
  );
}
