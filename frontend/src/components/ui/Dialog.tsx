import React, { createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

interface DialogContextProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextProps | undefined>(undefined);

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
};

export const DialogContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  const context = useContext(DialogContext);
  
  if (!context?.open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={() => context.onOpenChange(false)} 
      />
      <div className={cn(
        "relative z-[1101] w-full max-w-xl animate-in zoom-in-95 fade-in duration-200 overflow-hidden rounded-2xl border border-border-dark bg-surface-card-dark shadow-2xl [html.light_&]:bg-surface-card-light [html.light_&]:border-border-light p-4",
        className
      )}>
        <button 
          onClick={() => context.onOpenChange(false)}
          className="absolute right-4 top-4 p-2 rounded-full hover:bg-white/10 [html.light_&]:hover:bg-black/10 transition-colors z-[1102]"
        >
          <svg className="w-5 h-5 text-text-muted-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
};

export const DialogHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left mb-6', className)}>
    {children}
  </div>
);

export const DialogTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <h3 className={cn('text-xl font-display font-bold text-text-dark [html.light_&]:text-text-light', className)}>
    {children}
  </h3>
);

export const DialogTrigger: React.FC<{ children: React.ReactNode; asChild?: boolean }> = ({ children }) => {
  const context = useContext(DialogContext);
  return (
    <div onClick={(e) => {
      e.stopPropagation();
      context?.onOpenChange(true);
    }} className="cursor-pointer">
      {children}
    </div>
  );
};

export const DialogClose: React.FC<{ children: React.ReactNode; asChild?: boolean }> = ({ children }) => {
  const context = useContext(DialogContext);
  return (
    <div onClick={() => context?.onOpenChange(false)} className="cursor-pointer">
      {children}
    </div>
  );
};
