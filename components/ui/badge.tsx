import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary/10 text-primary',
        secondary: 'bg-secondary text-secondary-foreground',
        destructive: 'bg-destructive/10 text-destructive',
        outline: 'border border-border text-foreground',
        // Status variants
        working: 'bg-blue-500/10 text-blue-400',
        waiting: 'bg-yellow-500/10 text-yellow-400',
        submitted: 'bg-purple-500/10 text-purple-400',
        denied: 'bg-red-500/10 text-red-400',
        resolved: 'bg-green-500/10 text-green-400',
        ignored: 'bg-gray-500/10 text-gray-400',
        // Impact variants
        high: 'bg-red-500/10 text-red-400',
        low: 'bg-yellow-500/10 text-yellow-400',
        none: 'bg-gray-500/10 text-gray-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
