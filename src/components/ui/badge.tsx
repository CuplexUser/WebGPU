import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

type Variant = 'neutral' | 'success' | 'warning' | 'info';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export function Badge({ className, variant = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium',
        variant === 'neutral' && 'bg-slate-800 text-slate-300',
        variant === 'success' && 'bg-emerald-500/15 text-emerald-300',
        variant === 'warning' && 'bg-amber-500/15 text-amber-300',
        variant === 'info' && 'bg-sky-500/15 text-sky-300',
        className,
      )}
      {...props}
    />
  );
}
