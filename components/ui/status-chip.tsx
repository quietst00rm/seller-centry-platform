'use client';

import { cn } from '@/lib/utils';
import { Check, Clock, FileText, Loader2, EyeOff, CheckCircle2, XCircle } from 'lucide-react';

export type StatusType = 'working' | 'submitted' | 'waiting-on-client' | 'resolved' | 'ignored' | 'acknowledged' | 'denied';

interface StatusChipProps {
  status: StatusType;
  className?: string;
  showIcon?: boolean;
}

// Status colors based on valid sheet values:
// WORKING, SUBMITTED, WAITING ON CLIENT, RESOLVED, IGNORED, ACKNOWLEDGED, DENIED
const statusConfig = {
  'working': {
    label: 'Working',
    icon: Loader2,
    // Info Blue #0284C7
    className: 'bg-info/10 text-info border-info/20',
  },
  'submitted': {
    label: 'Submitted',
    icon: FileText,
    // Success Green #059669
    className: 'bg-success/10 text-success border-success/20',
  },
  'waiting-on-client': {
    label: 'Waiting on Client',
    icon: Clock,
    // Alert Amber #D97706
    className: 'bg-warning/10 text-warning border-warning/20',
  },
  'resolved': {
    label: 'Resolved',
    icon: Check,
    // Cool Gray #64748B
    className: 'bg-muted text-muted-foreground border-border',
  },
  'ignored': {
    label: 'Ignored',
    icon: EyeOff,
    // Cool Gray #64748B
    className: 'bg-muted text-muted-foreground border-border',
  },
  'acknowledged': {
    label: 'Acknowledged',
    icon: CheckCircle2,
    // Purple/violet for acknowledged
    className: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
  'denied': {
    label: 'Denied',
    icon: XCircle,
    // Critical Red #DC2626
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
} as const;

export function StatusChip({ status, className, showIcon = true }: StatusChipProps) {
  const config = statusConfig[status] || statusConfig['working'];
  const Icon = config.icon;

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border transition-colors',
      config.className,
      className
    )}>
      {showIcon && <Icon className={cn('h-3 w-3', status === 'working' && 'animate-spin')} />}
      {config.label}
    </span>
  );
}

// Helper function to convert sheet status strings to status types
export function getStatusType(status: string): StatusType {
  const statusLower = status.toLowerCase().trim();

  if (statusLower === 'working') return 'working';
  if (statusLower === 'submitted') return 'submitted';
  if (statusLower === 'waiting on client') return 'waiting-on-client';
  if (statusLower === 'resolved') return 'resolved';
  if (statusLower === 'ignored') return 'ignored';
  if (statusLower === 'acknowledged') return 'acknowledged';
  if (statusLower === 'denied') return 'denied';

  // Fallback for any unrecognized status
  return 'working';
}
