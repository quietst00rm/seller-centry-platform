'use client';

import { AlertTriangle, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface SummaryCardsProps {
  totalViolations: number;
  atRiskSales: number;
  highImpactCount: number;
  resolvedCount: number;
  isLoading?: boolean;
}

export function SummaryCards({
  totalViolations,
  atRiskSales,
  isLoading,
}: SummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-4 py-4">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-4 py-4">
      {/* Open Violations Card */}
      <div className="bg-[#1a1a1a] rounded-lg p-6 border-l-4 border-orange-500 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-[#9ca3af] mb-1">
            Open Violations
          </p>
          <p className="text-3xl font-bold text-white">{totalViolations}</p>
          <p className="text-sm text-[#6b7280] mt-1">Active issues</p>
        </div>
        <div className="bg-orange-500/20 rounded-full p-3">
          <AlertTriangle className="h-6 w-6 text-orange-500" />
        </div>
      </div>

      {/* At-Risk Sales Card */}
      <div className="bg-[#1a1a1a] rounded-lg p-6 border-l-4 border-orange-500 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-[#9ca3af] mb-1">
            At-Risk Sales
          </p>
          <p className="text-3xl font-bold text-white">{formatCurrency(atRiskSales)}</p>
          <p className="text-sm text-[#6b7280] mt-1">Potential revenue impact</p>
        </div>
        <div className="bg-orange-500/20 rounded-full p-3">
          <DollarSign className="h-6 w-6 text-orange-500" />
        </div>
      </div>
    </div>
  );
}
