'use client';

import { AlertTriangle, DollarSign, Bell, CalendarPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CardFilterType = 'needsAction' | 'newThisWeek' | null;

interface SimpleKPICardsProps {
  openViolations: number;
  atRiskSales: number;
  needsActionCount: number;
  newThisWeekCount: number;
  activeCardFilter: CardFilterType;
  onCardFilterChange: (filter: CardFilterType) => void;
}

// Currency formatter with commas - show exact values
function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function SimpleKPICards({
  openViolations,
  atRiskSales,
  needsActionCount,
  newThisWeekCount,
  activeCardFilter,
  onCardFilterChange,
}: SimpleKPICardsProps) {
  const handleCardClick = (filterType: CardFilterType) => {
    // Toggle: if clicking the same card, clear the filter
    if (activeCardFilter === filterType) {
      onCardFilterChange(null);
    } else {
      onCardFilterChange(filterType);
    }
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
      {/* Open Violations Card */}
      <div className={cn(
        "relative bg-card rounded-2xl border border-border/50",
        "border-l-4 border-l-warning p-4 md:p-6",
        "shadow-[var(--shadow-elevated)]",
        "transition-all duration-300 ease-out",
        "hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1",
        "group cursor-default"
      )}>
        <div className="flex items-center justify-between gap-2 md:gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] md:text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-1 md:mb-2">
              Open Violations
            </p>
            <p className="text-2xl md:text-4xl font-bold text-foreground font-headline font-tabular tracking-tight">
              {openViolations.toLocaleString()}
            </p>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 md:mt-2 hidden sm:block">
              Active issues
            </p>
          </div>

          <div className={cn(
            'flex-shrink-0 w-10 h-10 md:w-14 md:h-14 rounded-full',
            'bg-amber-500/20',
            'flex items-center justify-center',
            'transition-transform duration-300 group-hover:scale-110'
          )}>
            <AlertTriangle className="h-5 w-5 md:h-7 md:w-7 text-amber-500" />
          </div>
        </div>
      </div>

      {/* At-Risk Sales Card */}
      <div className={cn(
        "relative bg-card rounded-2xl border border-border/50",
        "border-l-4 border-l-primary p-4 md:p-6",
        "shadow-[var(--shadow-elevated)]",
        "transition-all duration-300 ease-out",
        "hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1",
        "group cursor-default"
      )}>
        <div className="flex items-center justify-between gap-2 md:gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] md:text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-1 md:mb-2">
              At-Risk Sales
            </p>
            <p className="text-2xl md:text-4xl font-bold text-foreground font-headline font-tabular tracking-tight">
              {formatCurrency(atRiskSales)}
            </p>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 md:mt-2 hidden sm:block">
              Revenue impact
            </p>
          </div>

          <div className={cn(
            'flex-shrink-0 w-10 h-10 md:w-14 md:h-14 rounded-full',
            'bg-orange-500/20',
            'flex items-center justify-center',
            'transition-transform duration-300 group-hover:scale-110'
          )}>
            <DollarSign className="h-5 w-5 md:h-7 md:w-7 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Needs Your Action Card - Clickable */}
      <button
        onClick={() => handleCardClick('needsAction')}
        className={cn(
          "relative bg-card rounded-2xl border text-left",
          "border-l-4 border-l-yellow-500 p-4 md:p-6",
          "shadow-[var(--shadow-elevated)]",
          "transition-all duration-300 ease-out",
          "hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 hover:brightness-110",
          "group cursor-pointer",
          activeCardFilter === 'needsAction'
            ? "ring-2 ring-yellow-500 ring-offset-2 ring-offset-background border-yellow-500/50 bg-yellow-500/10"
            : "border-border/50"
        )}
      >
        <div className="flex items-center justify-between gap-2 md:gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] md:text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-1 md:mb-2">
              Needs Your Action
            </p>
            <p className="text-2xl md:text-4xl font-bold text-foreground font-headline font-tabular tracking-tight">
              {needsActionCount.toLocaleString()}
            </p>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 md:mt-2 hidden sm:block">
              Awaiting response
            </p>
          </div>

          <div className={cn(
            'flex-shrink-0 w-10 h-10 md:w-14 md:h-14 rounded-full',
            'bg-yellow-500/20',
            'flex items-center justify-center',
            'transition-transform duration-300 group-hover:scale-110'
          )}>
            <Bell className="h-5 w-5 md:h-7 md:w-7 text-yellow-500" />
          </div>
        </div>
      </button>

      {/* New This Week Card - Clickable */}
      <button
        onClick={() => handleCardClick('newThisWeek')}
        className={cn(
          "relative bg-card rounded-2xl border text-left",
          "border-l-4 border-l-primary p-4 md:p-6",
          "shadow-[var(--shadow-elevated)]",
          "transition-all duration-300 ease-out",
          "hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 hover:brightness-110",
          "group cursor-pointer",
          activeCardFilter === 'newThisWeek'
            ? "ring-2 ring-orange-500 ring-offset-2 ring-offset-background border-orange-500/50 bg-orange-500/10"
            : "border-border/50"
        )}
      >
        <div className="flex items-center justify-between gap-2 md:gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] md:text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-1 md:mb-2">
              New This Week
            </p>
            <p className="text-2xl md:text-4xl font-bold text-foreground font-headline font-tabular tracking-tight">
              {newThisWeekCount.toLocaleString()}
            </p>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 md:mt-2 hidden sm:block">
              Added in 7 days
            </p>
          </div>

          <div className={cn(
            'flex-shrink-0 w-10 h-10 md:w-14 md:h-14 rounded-full',
            'bg-orange-500/20',
            'flex items-center justify-center',
            'transition-transform duration-300 group-hover:scale-110'
          )}>
            <CalendarPlus className="h-5 w-5 md:h-7 md:w-7 text-orange-500" />
          </div>
        </div>
      </button>
    </div>
  );
}
