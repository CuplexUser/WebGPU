import { cn } from '../../lib/utils';

interface SwitchProps {
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
}

export function Switch({ checked, disabled, onCheckedChange, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className="inline-flex items-center gap-3 rounded-md text-sm text-slate-300 outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 disabled:opacity-45"
    >
      <span
        className={cn(
          'relative h-5 w-9 rounded-full border transition-colors',
          checked ? 'border-sky-400 bg-sky-400/25' : 'border-slate-700 bg-slate-900',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all',
            checked ? 'left-[18px] bg-sky-300' : 'left-0.5 bg-slate-500',
          )}
        />
      </span>
      <span>{label}</span>
    </button>
  );
}
