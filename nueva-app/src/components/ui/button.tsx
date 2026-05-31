import * as React from 'react';
import { cn } from '@/lib/utils';

export function Button({ className, variant = 'default', size = 'default', ...props }: React.ComponentProps<'button'> & { variant?: 'default' | 'outline' | 'ghost' | 'destructive'; size?: 'default' | 'sm' | 'icon' }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
        variant === 'default' && 'bg-zinc-800 text-white hover:bg-zinc-700',
        variant === 'outline' && 'border border-zinc-700 bg-transparent hover:bg-zinc-800',
        variant === 'ghost' && 'hover:bg-zinc-800',
        variant === 'destructive' && 'bg-red-900/50 text-red-200 hover:bg-red-900/70',
        size === 'default' && 'h-9 px-4',
        size === 'sm' && 'h-8 px-3 text-xs',
        size === 'icon' && 'h-9 w-9 p-0',
        className
      )}
      {...props}
    />
  );
}
