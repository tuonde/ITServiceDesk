import React from 'react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon, title, description, action, ...props }, ref) => {
    return (
      <div 
        ref={ref}
        className={cn(
          "bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center",
          className
        )}
        {...props}
      >
        {icon && (
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
            {icon}
          </div>
        )}
        <h3 className="text-xl font-bold text-slate-700 mb-2">{title}</h3>
        {description && (
          <p className="text-slate-500 mb-6 max-w-md">{description}</p>
        )}
        {action && (
          <Button onClick={action.onClick} variant="primary" className="flex items-center gap-2">
            {action.icon}
            {action.label}
          </Button>
        )}
      </div>
    );
  }
);
EmptyState.displayName = 'EmptyState';
