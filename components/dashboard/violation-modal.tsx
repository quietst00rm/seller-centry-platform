'use client';

import { X, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Violation, ViolationStatus } from '@/types';

interface ViolationModalProps {
  violation: Violation | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusVariantMap: Record<ViolationStatus, 'working' | 'waiting' | 'submitted' | 'denied' | 'resolved' | 'ignored'> = {
  'Working': 'working',
  'Waiting on Client': 'waiting',
  'Submitted': 'submitted',
  'Denied': 'denied',
  'Resolved': 'resolved',
  'Ignored': 'ignored',
};

const impactVariantMap: Record<string, 'high' | 'low' | 'none'> = {
  'High': 'high',
  'Low': 'low',
  'No impact': 'none',
};

export function ViolationModal({ violation, isOpen, onClose }: ViolationModalProps) {
  if (!isOpen || !violation) return null;

  const amazonUrl = `https://www.amazon.com/dp/${violation.asin}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-lg max-h-[90vh] bg-card border border-border rounded-t-2xl sm:rounded-2xl overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Violation Details</h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors touch-target"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-60px)] p-4 space-y-4">
          {/* Product Title */}
          <div>
            <h3 className="text-base font-medium mb-1">
              {violation.productTitle || 'Unknown Product'}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-muted-foreground">
                {violation.asin}
              </span>
              <a
                href={amazonUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
              >
                View on Amazon
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Status and Impact */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={statusVariantMap[violation.status]}>
              {violation.status}
            </Badge>
            <Badge variant={impactVariantMap[violation.ahrImpact]}>
              {violation.ahrImpact} Impact
            </Badge>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <DetailItem label="Issue Type" value={violation.reason} />
            <DetailItem label="At Risk Sales" value={formatCurrency(violation.atRiskSales)} />
            <DetailItem label="Date Opened" value={formatDate(violation.date)} />
            <DetailItem label="Imported" value={formatDate(violation.importedAt)} />
            {violation.dateResolved && (
              <DetailItem label="Date Resolved" value={formatDate(violation.dateResolved)} />
            )}
          </div>

          {/* Action Taken */}
          {violation.actionTaken && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Action Taken
              </p>
              <p className="text-sm">{violation.actionTaken}</p>
            </div>
          )}

          {/* Next Steps */}
          {violation.nextSteps && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Next Steps
              </p>
              <p className="text-sm">{violation.nextSteps}</p>
            </div>
          )}

          {/* Options */}
          {violation.options && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Options
              </p>
              <p className="text-sm">{violation.options}</p>
            </div>
          )}

          {/* Notes */}
          {violation.notes && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <p className="text-xs text-yellow-400 uppercase tracking-wider mb-1">
                Notes
              </p>
              <p className="text-sm text-yellow-100">{violation.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t border-border p-4">
          <Button onClick={onClose} className="w-full touch-target">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className="text-sm">{value || '-'}</p>
    </div>
  );
}
