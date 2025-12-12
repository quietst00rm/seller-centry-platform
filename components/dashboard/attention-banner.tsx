'use client';

import { useState } from 'react';
import { MessageSquare, AlertTriangle, X } from 'lucide-react';
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
    <div className="mx-4 mb-4">
      <div className="bg-gradient-to-r from-amber-900/40 to-amber-900/10 rounded-lg border-l-4 border-orange-500 p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left icon */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="bg-orange-500/20 rounded-full p-2.5 flex-shrink-0">
              <MessageSquare className="h-5 w-5 text-orange-500" />
            </div>

            {/* Text content */}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">
                {needsAttention.length} violation{needsAttention.length !== 1 ? 's' : ''} need{needsAttention.length === 1 ? 's' : ''} your attention
              </p>
              <p className="text-xs text-[#9ca3af] mt-0.5">
                We&apos;ve added notes requiring your review
              </p>
            </div>
          </div>

          {/* Right side: warning icon and close */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1.5 text-[#6b7280] hover:text-white transition-colors rounded-full hover:bg-white/10"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Quick links to violations with notes */}
        <div className="mt-3 flex flex-wrap gap-2">
          {needsAttention.slice(0, 3).map((violation) => (
            <button
              key={violation.id}
              onClick={() => onViewViolation(violation)}
              className="text-xs bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 px-3 py-1.5 rounded-full transition-colors font-medium"
            >
              {violation.asin}
            </button>
          ))}
          {needsAttention.length > 3 && (
            <span className="text-xs text-[#6b7280] px-3 py-1.5">
              +{needsAttention.length - 3} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
