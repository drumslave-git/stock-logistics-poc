import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Visible field label. Associated via a generated id for accessibility. */
  label?: ReactNode;
  /** Error message; also flips the field into an error style. */
  error?: string;
  /** Helper text shown below the field when there is no error. */
  hint?: ReactNode;
}

const control =
  'block w-full rounded-lg border bg-surface px-3 text-sm text-ink placeholder:text-ink-subtle ' +
  'h-10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ' +
  'focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-60';

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, id, className, type = 'text', ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedById = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        type={type}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedById}
        className={cn(
          control,
          error ? 'border-danger-500 focus-visible:ring-danger-500' : 'border-surface-border',
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-danger-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1 text-sm text-ink-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
