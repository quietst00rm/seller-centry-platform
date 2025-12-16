'use client';

import { X, ExternalLink } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Violation, ViolationStatus } from '@/types';

interface ViolationModalProps {
  violation: Violation | null;
  isOpen: boolean;
  onClose: () => void;
}

// Status badge styling
const getStatusBadgeClass = (status: ViolationStatus): string => {
  const baseClass = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium';
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

export function ViolationModal({ violation, isOpen, onClose }: ViolationModalProps) {
  if (!isOpen || !violation) return null;

  const amazonUrl = `https://www.amazon.com/dp/${violation.asin}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal - Full screen on mobile, centered card on desktop */}
      <div className="relative w-full h-full sm:h-auto sm:max-w-lg sm:max-h-[90vh] bg-[#111111] sm:rounded-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="sticky top-0 bg-[#111111] border-b border-gray-800 px-4 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Violation Details</h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-[#6b7280] hover:text-white transition-colors rounded-full hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-140px)] sm:max-h-[calc(90vh-140px)] p-4 space-y-5">
          {/* Product Title */}
          <div>
            <h3 className="text-base font-medium text-white mb-2">
              {violation.productTitle || 'Unknown Product'}
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-[#9ca3af]">
                {violation.asin}
              </span>
              <a
                href={amazonUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-500 hover:text-orange-400 inline-flex items-center gap-1 text-sm transition-colors"
              >
                View on Amazon
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Status and Impact badges */}
          <div className="flex flex-wrap gap-2">
            <span className={getStatusBadgeClass(violation.status)}>
              {violation.status}
            </span>
            <span className={getImpactBadgeClass(violation.ahrImpact)}>
              {violation.ahrImpact} Impact
            </span>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 bg-[#1a1a1a] rounded-lg p-4">
            <DetailItem label="Issue Type" value={violation.reason} />
            <DetailItem
              label="At Risk Sales"
              value={formatCurrency(violation.atRiskSales)}
              highlight={violation.atRiskSales > 0}
            />
            <DetailItem label="Date Opened" value={formatDate(violation.date)} />
            <DetailItem label="Imported" value={formatDate(violation.importedAt)} />
            {violation.dateResolved && (
              <DetailItem label="Date Resolved" value={formatDate(violation.dateResolved)} />
            )}
          </div>

          {/* Action Taken */}
          {violation.actionTaken && (
            <div className="bg-[#1a1a1a] rounded-lg p-4">
              <p className="text-xs text-[#6b7280] uppercase tracking-wider mb-2">
                Action Taken
              </p>
              <p className="text-sm text-white">{violation.actionTaken}</p>
            </div>
          )}

          {/* Next Steps */}
          {violation.nextSteps && (
            <div className="bg-[#1a1a1a] rounded-lg p-4">
              <p className="text-xs text-[#6b7280] uppercase tracking-wider mb-2">
                Next Steps
              </p>
              <p className="text-sm text-white">{violation.nextSteps}</p>
            </div>
          )}

          {/* Options */}
          {violation.options && (
            <div className="bg-[#1a1a1a] rounded-lg p-4">
              <p className="text-xs text-[#6b7280] uppercase tracking-wider mb-2">
                Options
              </p>
              <p className="text-sm text-white">{violation.options}</p>
            </div>
          )}

          {/* Notes - highlighted with orange */}
          {violation.notes && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
              <p className="text-xs text-orange-400 uppercase tracking-wider mb-2">
                Notes - Requires Attention
              </p>
              <p className="text-sm text-orange-100">{violation.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#111111] border-t border-gray-800 p-4">
          <button
            onClick={onClose}
            className="w-full h-12 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
  highlight = false
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-[#6b7280] uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className={`text-sm ${highlight ? 'text-orange-400 font-medium' : 'text-white'}`}>
        {value || '-'}
      </p>
    </div>
  );
}
