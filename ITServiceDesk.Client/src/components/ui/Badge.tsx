import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'emerald' | 'rose' | 'amber' | 'blue' | 'purple' | 'slate';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'neutral', ...props }, ref) => {
    
    const variants: Record<string, string> = {
      success: 'bg-emerald-100 text-emerald-800',
      emerald: 'bg-emerald-100 text-emerald-800',
      error: 'bg-rose-100 text-rose-800',
      rose: 'bg-rose-100 text-rose-800',
      warning: 'bg-amber-100 text-amber-800',
      amber: 'bg-amber-100 text-amber-800',
      info: 'bg-blue-100 text-blue-800',
      blue: 'bg-blue-100 text-blue-800',
      purple: 'bg-purple-100 text-purple-800',
      neutral: 'bg-slate-100 text-slate-800',
      slate: 'bg-slate-100 text-slate-800'
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap',
          variants[variant] || variants.neutral,
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';
