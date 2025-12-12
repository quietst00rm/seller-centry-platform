'use client';

import { cn } from '@/lib/utils';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

type ImpactLevel = 'low' | 'medium' | 'high';

interface ImpactBadgeProps {
  impact: ImpactLevel;
  className?: string;
  showIcon?: boolean;
}

const impactConfig = {
  'low': {
    label: 'Low',
    icon: Info,
    className: 'text-success',
  },
  'medium': {
    label: 'Medium',
    icon: AlertCircle,
    className: 'text-warning',
  },
  'high': {
    label: 'High',
    icon: AlertTriangle,
    className: 'text-danger',
  },
} as const;

export function ImpactBadge({ impact, className, showIcon = true }: ImpactBadgeProps) {
  const config = impactConfig[impact];
  const Icon = config.icon;

  return (
    <span className={cn(
      'inline-flex items-center gap-1 font-semibold text-sm',
      config.className,
      className
    )}>
      {showIcon && <Icon className="h-3.5 w-3.5" />}
      {config.label}
    </span>
  );
}

// Helper function to convert legacy impact strings to new impact types
export function getImpactLevel(impact: string): ImpactLevel {
  switch (impact.toLowerCase()) {
    case 'low':
      return 'low';
    case 'medium':
      return 'medium';
    case 'high':
      return 'high';
    default:
      return 'low';
  }
}
