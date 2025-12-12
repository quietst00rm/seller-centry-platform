'use client';

import { formatCurrency, formatDate } from '@/lib/utils';
import type { Violation, ViolationStatus } from '@/types';

interface ViolationsTableProps {
  violations: Violation[];
  onViewDetails: (violation: Violation) => void;
}

// Status badge styling
const getStatusBadgeClass = (status: ViolationStatus): string => {
  const baseClass = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium';
  switch (status) {
    case 'Working':
      return `${baseClass} bg-cyan-500/20 text-cyan-400`;
    case 'Waiting on Client':
      return `${baseClass} bg-yellow-500/20 text-yellow-400`;
    case 'Submitted':
      return `${baseClass} bg-purple-500/20 text-purple-400`;
    case 'Denied':
      return `${baseClass} bg-red-500/20 text-red-400`;
    case 'Resolved':
      return `${baseClass} bg-green-500/20 text-green-400`;
    case 'Ignored':
      return `${baseClass} bg-gray-500/20 text-gray-400`;
    default:
      return `${baseClass} bg-gray-500/20 text-gray-400`;
  }
};

// Impact badge styling
const getImpactBadgeClass = (impact: string): string => {
  const baseClass = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium';
  switch (impact) {
    case 'High':
      return `${baseClass} bg-red-500/20 text-red-400`;
    case 'Low':
      return `${baseClass} bg-yellow-500/20 text-yellow-400`;
    default:
      return `${baseClass} bg-gray-500/20 text-gray-500`;
  }
};

export function ViolationsTable({ violations, onViewDetails }: ViolationsTableProps) {
  if (violations.length === 0) {
    return (
      <div className="text-center py-12 text-[#6b7280]">
        No violations found
      </div>
    );
  }

  return (
    <div className="px-4">
      {/* Section header */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Violation Tracker</h2>
        <p className="text-sm text-[#6b7280]">{violations.length} issues found</p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg bg-[#111111]">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left py-4 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="text-left py-4 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                ASIN
              </th>
              <th className="text-left py-4 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Issue Type
              </th>
              <th className="text-right py-4 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                $ At Risk
              </th>
              <th className="text-left py-4 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Impact
              </th>
              <th className="text-left py-4 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left py-4 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Opened
              </th>
              <th className="text-right py-4 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {violations.map((violation) => (
              <tr
                key={violation.id}
                className="hover:bg-gray-800/30 transition-colors cursor-pointer"
                onClick={() => onViewDetails(violation)}
              >
                <td className="py-4 px-4">
                  <div className="max-w-[200px]">
                    <p className="text-sm font-medium text-white truncate">
                      {violation.productTitle || 'Unknown Product'}
                    </p>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className="text-sm font-mono text-[#9ca3af]">
                    {violation.asin}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <span className="text-sm text-[#9ca3af] max-w-[150px] truncate block">
                    {violation.reason}
                  </span>
                </td>
                <td className="py-4 px-4 text-right">
                  <span className={`text-sm font-medium ${violation.atRiskSales > 0 ? 'text-orange-400' : 'text-[#6b7280]'}`}>
                    {formatCurrency(violation.atRiskSales)}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <span className={getImpactBadgeClass(violation.ahrImpact)}>
                    {violation.ahrImpact}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <span className={getStatusBadgeClass(violation.status)}>
                    {violation.status}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <span className="text-sm text-[#6b7280]">
                    {formatDate(violation.date)}
                  </span>
                </td>
                <td className="py-4 px-4 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetails(violation);
                    }}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
