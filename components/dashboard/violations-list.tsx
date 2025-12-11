'use client';

import { ViolationCard } from './violation-card';
import { ViolationsTable } from './violations-table';
import { Skeleton } from '@/components/ui/skeleton';
import type { Violation } from '@/types';

interface ViolationsListProps {
  violations: Violation[];
  isLoading: boolean;
  onViewDetails: (violation: Violation) => void;
}

export function ViolationsList({
  violations,
  isLoading,
  onViewDetails,
}: ViolationsListProps) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
    );
  }

  if (violations.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium mb-1">No violations found</h3>
        <p className="text-sm text-muted-foreground">
          Try adjusting your filters or check back later.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: Card layout */}
      <div className="md:hidden p-4 space-y-3">
        {violations.map((violation) => (
          <ViolationCard
            key={violation.id}
            violation={violation}
            onClick={() => onViewDetails(violation)}
          />
        ))}
      </div>

      {/* Desktop: Table layout */}
      <div className="hidden md:block">
        <ViolationsTable violations={violations} onViewDetails={onViewDetails} />
      </div>
    </>
  );
}
