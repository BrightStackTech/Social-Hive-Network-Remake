import React from 'react';
import { cn } from '../../lib/utils';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border-dark bg-surface-card-dark text-text-dark shadow-xl overflow-hidden [html.light_&]:bg-surface-card-light [html.light_&]:border-border-light [html.light_&]:text-text-light',
        className
      )}
      {...props}
    />
  );
};
