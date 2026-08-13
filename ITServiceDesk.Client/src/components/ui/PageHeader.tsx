import React from 'react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  };
}

export const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, title, description, action, ...props }, ref) => {
    return (
      <div 
        ref={ref}
        className={cn(
          "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8",
          className
        )}
        {...props}
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">{title}</h1>
          {description && (
            <p className="text-sm md:text-base text-slate-500 mt-1">{description}</p>
          )}
        </div>
        {action && (
          <Button 
            onClick={action.onClick} 
            variant={action.variant || 'primary'} 
            className="flex items-center gap-2 shrink-0 w-full sm:w-auto"
          >
            {action.icon}
            {action.label}
          </Button>
        )}
      </div>
    );
  }
);
PageHeader.displayName = 'PageHeader';
