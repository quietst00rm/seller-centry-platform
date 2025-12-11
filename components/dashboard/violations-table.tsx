'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Violation, ViolationStatus } from '@/types';

interface ViolationsTableProps {
  violations: Violation[];
  onViewDetails: (violation: Violation) => void;
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

export function ViolationsTable({ violations, onViewDetails }: ViolationsTableProps) {
  if (violations.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No violations found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Product
            </th>
            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              ASIN
            </th>
            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Issue Type
            </th>
            <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              $ At Risk
            </th>
            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Impact
            </th>
            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Status
            </th>
            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Opened
            </th>
            <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {violations.map((violation) => (
            <tr
              key={violation.id}
              className="hover:bg-accent/50 transition-colors"
            >
              <td className="py-3 px-4">
                <div className="max-w-[200px]">
                  <p className="text-sm font-medium truncate">
                    {violation.productTitle || 'Unknown Product'}
                  </p>
                </div>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm font-mono text-muted-foreground">
                  {violation.asin}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm text-muted-foreground max-w-[150px] truncate block">
                  {violation.reason}
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                <span className="text-sm text-green-400 font-medium">
                  {formatCurrency(violation.atRiskSales)}
                </span>
              </td>
              <td className="py-3 px-4">
                <Badge variant={impactVariantMap[violation.ahrImpact]}>
                  {violation.ahrImpact}
                </Badge>
              </td>
              <td className="py-3 px-4">
                <Badge variant={statusVariantMap[violation.status]}>
                  {violation.status}
                </Badge>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm text-muted-foreground">
                  {formatDate(violation.date)}
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewDetails(violation)}
                >
                  View
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
