import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

interface SelectContextProps {
  value?: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = React.createContext<SelectContextProps | undefined>(undefined);

export const Select: React.FC<{ 
  children: React.ReactNode; 
  value?: string; 
  onValueChange?: (value: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}> = ({ children, value, onValueChange, open: controlledOpen, onOpenChange }) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen;

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className="relative w-full">{children}</div>
    </SelectContext.Provider>
  );
};

export const SelectTrigger: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error('SelectTrigger must be used within Select');

  return (
    <button
      type="button"
      onClick={() => context.setOpen(!context.open)}
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-border-dark bg-surface-dark px-3 py-2 text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [html.light_&]:bg-white [html.light_&]:border-border-light [html.light_&]:text-text-light',
        className
      )}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  );
};

export const SelectValue: React.FC<{ placeholder?: string }> = ({ placeholder }) => {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error('SelectValue must be used within Select');

  return (
    <span className="block truncate">
      {context.value || placeholder}
    </span>
  );
};

export const SelectContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  const context = React.useContext(SelectContext);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        context?.setOpen(false);
      }
    };
    if (context?.open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [context?.open]);

  if (!context?.open) return null;

  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border-dark bg-surface-elevated-dark p-1 text-text-dark shadow-md animate-in fade-in zoom-in-95 duration-100 [html.light_&]:bg-white [html.light_&]:border-border-light [html.light_&]:text-text-light',
        className
      )}
    >
      {children}
    </div>
  );
};

export const SelectItem: React.FC<{ value: string; children: React.ReactNode; className?: string }> = ({ value, children, className }) => {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error('SelectItem must be used within Select');

  const isSelected = context.value === value;

  return (
    <div
      onClick={() => {
        context.onValueChange?.(value);
        context.setOpen(false);
      }}
      className={cn(
        'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-white/10 [html.light_&]:hover:bg-black/5',
        isSelected ? 'bg-white/10 [html.light_&]:bg-black/5' : '',
        className
      )}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {isSelected && <span className="h-2 w-2 rounded-full bg-primary" />}
      </span>
      <span className="block truncate">{children}</span>
    </div>
  );
};
