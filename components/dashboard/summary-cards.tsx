'use client';

import { AlertTriangle, DollarSign, TrendingUp, CheckCircle } from 'lucide-react';
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
  highImpactCount,
  resolvedCount,
  isLoading,
}: SummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 p-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: 'Open Violations',
      value: totalViolations.toString(),
      icon: AlertTriangle,
      iconColor: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'At-Risk Sales',
      value: formatCurrency(atRiskSales),
      icon: DollarSign,
      iconColor: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'High Impact',
      value: highImpactCount.toString(),
      icon: TrendingUp,
      iconColor: 'text-red-400',
      bgColor: 'bg-red-500/10',
    },
    {
      label: 'Resolved',
      value: resolvedCount.toString(),
      icon: CheckCircle,
      iconColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 p-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-card border border-border rounded-lg p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-1.5 rounded-md ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.iconColor}`} />
            </div>
          </div>
          <p className="text-2xl font-bold">{card.value}</p>
          <p className="text-xs text-muted-foreground">{card.label}</p>
        </div>
      ))}
    </div>
  );
}
