import React from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-12 w-full rounded-xl border border-border-dark bg-surface-elevated-dark px-4 py-2 text-sm text-text-dark ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-muted-dark/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 [html.light_&]:bg-gray-50 [html.light_&]:border-gray-200 [html.light_&]:text-text-light [html.light_&]:placeholder:text-text-muted-light/40',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
