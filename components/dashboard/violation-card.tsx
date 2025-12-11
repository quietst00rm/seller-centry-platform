'use client';

import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Violation, ViolationStatus } from '@/types';

interface ViolationCardProps {
  violation: Violation;
  onClick: () => void;
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

export function ViolationCard({ violation, onClick }: ViolationCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card border border-border rounded-lg p-4 touch-target active:bg-accent transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Product Title */}
          <p className="font-medium text-sm line-clamp-2 mb-1">
            {violation.productTitle || 'Unknown Product'}
          </p>

          {/* ASIN and Issue Type */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <span className="font-mono">{violation.asin}</span>
            <span>•</span>
            <span className="truncate">{violation.reason}</span>
          </div>

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariantMap[violation.status]}>
              {violation.status}
            </Badge>
            <Badge variant={impactVariantMap[violation.ahrImpact]}>
              {violation.ahrImpact}
            </Badge>
            {violation.atRiskSales > 0 && (
              <span className="text-xs text-green-400 font-medium">
                {formatCurrency(violation.atRiskSales)}
              </span>
            )}
          </div>

          {/* Date */}
          <p className="text-xs text-muted-foreground mt-2">
            Opened {formatDate(violation.date)}
          </p>
        </div>

        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
      </div>

      {/* Notes indicator */}
      {violation.notes && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-yellow-400 line-clamp-1">
            Note: {violation.notes}
          </p>
        </div>
      )}
    </button>
  );
}
