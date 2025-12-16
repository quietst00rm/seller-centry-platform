'use client';

import { ChevronRight } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Violation, ViolationStatus } from '@/types';

interface ViolationCardProps {
  violation: Violation;
  onClick: () => void;
}

// Status badge styling
const getStatusBadgeClass = (status: ViolationStatus): string => {
  const baseClass = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium';
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

export function ViolationCard({ violation, onClick }: ViolationCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-gray-800/50 rounded-lg border-l-4 border-orange-500 p-4 min-h-[100px] active:bg-gray-700/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Top row: Issue type + Status badge */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-sm font-semibold text-white truncate">
              {violation.reason}
            </span>
            <span className={getStatusBadgeClass(violation.status)}>
              {violation.status}
            </span>
          </div>

          {/* Middle: Product title (2 lines max) + ASIN */}
          <p className="text-sm text-[#9ca3af] line-clamp-2 mb-1">
            {violation.productTitle || 'Unknown Product'}
          </p>
          <p className="text-xs font-mono text-[#6b7280] mb-3">
            {violation.asin}
          </p>

          {/* Bottom row: At-Risk + Impact + Date */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${violation.atRiskSales > 0 ? 'text-orange-400' : 'text-[#6b7280]'}`}>
                {formatCurrency(violation.atRiskSales)}
              </span>
              <span className={getImpactBadgeClass(violation.ahrImpact)}>
                {violation.ahrImpact}
              </span>
            </div>
            <span className="text-xs text-[#6b7280]">
              {formatDate(violation.date)}
            </span>
          </div>
        </div>

        <ChevronRight className="h-5 w-5 text-[#6b7280] flex-shrink-0 mt-1" />
      </div>

      {/* Notes indicator */}
      {violation.notes && (
        <div className="mt-3 pt-3 border-t border-gray-700/50">
          <p className="text-xs text-orange-400 line-clamp-1">
            Note: {violation.notes}
          </p>
        </div>
      )}
    </button>
  );
}
