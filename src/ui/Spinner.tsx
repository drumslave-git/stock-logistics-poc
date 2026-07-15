import { cn } from './cn';

export interface SpinnerProps {
  /** Pixel size of the spinner square. Defaults to 20. */
  size?: number;
  className?: string;
  label?: string;
}

/** Indeterminate loading indicator. */
export function Spinner({ size = 20, className, label = 'Loading' }: SpinnerProps) {
  return (
    <svg
      className={cn('animate-spin text-brand-600', className)}
      style={{ width: size, height: size }}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label={label}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

/** Centered spinner for full-section loading states. */
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="grid place-items-center gap-3 py-16 text-ink-muted">
      <Spinner size={28} />
      <p className="text-sm">{label}</p>
    </div>
  );
}
