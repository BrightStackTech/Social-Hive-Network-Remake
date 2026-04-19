import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline' | 'accent';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: 'bg-primary text-white hover:bg-primary-light shadow-lg shadow-primary/20',
      secondary: 'bg-surface-elevated-dark text-text-dark hover:bg-white/10 [html.light_&]:bg-gray-100 [html.light_&]:text-text-light [html.light_&]:hover:bg-gray-200',
      ghost: 'bg-transparent hover:bg-white/5 [html.light_&]:hover:bg-black/5',
      destructive: 'bg-danger text-white hover:bg-danger/80 shadow-lg shadow-danger/20',
      outline: 'bg-transparent border border-border-dark hover:bg-white/5 [html.light_&]:border-gray-200 [html.light_&]:hover:bg-black/5',
      accent: 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20'
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base',
      icon: 'p-2',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
