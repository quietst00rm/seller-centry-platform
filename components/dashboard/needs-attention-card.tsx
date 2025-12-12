'use client';

import { MessageSquare, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NeedsAttentionCardProps {
  count: number;
  onClick: () => void;
  isActive?: boolean;
}

export function NeedsAttentionCard({ count, onClick, isActive }: NeedsAttentionCardProps) {
  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-4 rounded-xl border text-left transition-all duration-200',
        'bg-attention border-warning/30',
        'hover:shadow-card-hover hover:-translate-y-0.5',
        isActive && 'ring-2 ring-warning ring-offset-2 ring-offset-background'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
          <MessageSquare className="h-5 w-5 text-warning" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground font-headline">
            {count} violation{count !== 1 ? 's' : ''} need{count === 1 ? 's' : ''} your attention
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            We&apos;ve added notes requiring your review
          </p>
        </div>

        <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
      </div>
    </button>
  );
}
