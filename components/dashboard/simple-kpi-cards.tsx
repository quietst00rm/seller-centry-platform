'use client';

import { AlertTriangle, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SimpleKPICardsProps {
  openViolations: number;
  atRiskSales: number;
}

// Currency formatter with commas - show exact values
function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function SimpleKPICards({ openViolations, atRiskSales }: SimpleKPICardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
      {/* Open Violations Card */}
      <div className={cn(
        'relative bg-card rounded-2xl border border-border/50',
        'border-l-4 border-l-warning p-6 md:p-8',
        'shadow-card',
        'transition-all duration-300 ease-out',
        'hover:shadow-card-hover hover:-translate-y-1',
        'group cursor-default'
      )}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-2">
              Open Violations
            </p>
            <p className="text-4xl md:text-5xl font-bold text-foreground font-headline font-tabular tracking-tight">
              {openViolations.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Active cases requiring attention
            </p>
          </div>

          <div className={cn(
            'flex-shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-2xl',
            'bg-gradient-to-br from-warning/20 to-warning/5',
            'flex items-center justify-center',
            'transition-transform duration-300 group-hover:scale-110'
          )}>
            <AlertTriangle className="h-7 w-7 md:h-8 md:w-8 text-warning" />
          </div>
        </div>
      </div>

      {/* At-Risk Sales Card */}
      <div className={cn(
        'relative bg-card rounded-2xl border border-border/50',
        'border-l-4 border-l-primary p-6 md:p-8',
        'shadow-card',
        'transition-all duration-300 ease-out',
        'hover:shadow-card-hover hover:-translate-y-1',
        'group cursor-default'
      )}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-2">
              At-Risk Sales
            </p>
            <p className="text-4xl md:text-5xl font-bold text-foreground font-headline font-tabular tracking-tight">
              {formatCurrency(atRiskSales)}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Potential revenue impact
            </p>
          </div>

          <div className={cn(
            'flex-shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-2xl',
            'bg-gradient-to-br from-primary/20 to-primary/5',
            'flex items-center justify-center',
            'transition-transform duration-300 group-hover:scale-110'
          )}>
            <DollarSign className="h-7 w-7 md:h-8 md:w-8 text-primary" />
          </div>
        </div>
      </div>
    </div>
  );
}
