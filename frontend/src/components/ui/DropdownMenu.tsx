import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';

interface DropdownMenuProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ children, open: controlledOpen, onOpenChange }) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen;

  return (
    <div className="relative inline-block text-left">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { open, setOpen });
        }
        return child;
      })}
    </div>
  );
};

export const DropdownMenuTrigger: React.FC<{ children: React.ReactNode; asChild?: boolean; open?: boolean; setOpen?: (open: boolean) => void }> = ({ children, open, setOpen }) => {
  return (
    <div onClick={() => setOpen?.(!open)} className="cursor-pointer">
      {children}
    </div>
  );
};

export const DropdownMenuContent: React.FC<{ children: React.ReactNode; align?: 'start' | 'end'; className?: string; open?: boolean; setOpen?: (open: boolean) => void }> = ({ children, align = 'end', className, open, setOpen }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen?.(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-50 mt-2 min-w-[8rem] overflow-hidden rounded-xl border border-border-dark bg-surface-elevated-dark p-1 text-text-dark shadow-2xl animate-in fade-in zoom-in-95 duration-100 [html.light_&]:bg-white [html.light_&]:border-border-light [html.light_&]:text-text-light',
        align === 'end' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
        className
      )}
    >
      {children}
    </div>
  );
};

export const DropdownMenuItem: React.FC<{ 
  children: React.ReactNode; 
  onClick?: () => void; 
  className?: string; 
}> = ({ children, onClick, className }) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2 text-sm outline-none transition-colors hover:bg-white/5 hover:text-white [html.light_&]:hover:bg-slate-100 [html.light_&]:hover:text-slate-900',
        className
      )}
    >
      {children}
    </div>
  );
};
