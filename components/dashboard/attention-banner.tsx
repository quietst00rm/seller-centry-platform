'use client';

import { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import type { Violation } from '@/types';

interface AttentionBannerProps {
  violations: Violation[];
  onViewViolation: (violation: Violation) => void;
}

export function AttentionBanner({ violations, onViewViolation }: AttentionBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  // Filter violations that have notes (need attention)
  const needsAttention = violations.filter((v) => v.notes && v.notes.trim().length > 0);

  if (isDismissed || needsAttention.length === 0) {
    return null;
  }

  return (
    <div className="mx-4 mb-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-100">
              {needsAttention.length} violation{needsAttention.length !== 1 ? 's' : ''} need{needsAttention.length === 1 ? 's' : ''} your attention
            </p>
            <p className="text-xs text-yellow-200/70 mt-1">
              These violations have notes from your account manager.
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="p-1 text-yellow-400/70 hover:text-yellow-400 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Quick links to violations with notes */}
      <div className="mt-3 flex flex-wrap gap-2">
        {needsAttention.slice(0, 3).map((violation) => (
          <button
            key={violation.id}
            onClick={() => onViewViolation(violation)}
            className="text-xs bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-100 px-2 py-1 rounded transition-colors"
          >
            {violation.asin}
          </button>
        ))}
        {needsAttention.length > 3 && (
          <span className="text-xs text-yellow-200/70 px-2 py-1">
            +{needsAttention.length - 3} more
          </span>
        )}
      </div>
    </div>
  );
}
