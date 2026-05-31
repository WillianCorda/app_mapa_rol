import * as React from 'react';
import { cn } from '@/lib/utils';

export function AlertDialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => onOpenChange(false)}>
      <div className={cn('bg-zinc-900 rounded-lg border border-zinc-700 p-6 shadow-xl max-w-sm')} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function AlertDialogContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('', className)} {...props} />;
}

export function AlertDialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('mb-4', className)} {...props} />;
}

export function AlertDialogTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('font-semibold', className)} {...props} />;
}

export function AlertDialogDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('text-sm text-zinc-500 mt-1', className)} {...props} />;
}

export function AlertDialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex gap-2 justify-end mt-4', className)} {...props} />;
}

export function AlertDialogAction({ className, ...props }: React.ComponentProps<'button'>) {
  return <button className={cn('px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm', className)} {...props} />;
}

export function AlertDialogCancel({ className, ...props }: React.ComponentProps<'button'>) {
  return <button className={cn('px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-sm', className)} {...props} />;
}
