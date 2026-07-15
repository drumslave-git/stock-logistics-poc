import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  /** Optional call-to-action (e.g. a Button). */
  action?: ReactNode;
  icon?: ReactNode;
}

/** Placeholder shown when a list or view has no data. */
export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="grid place-items-center gap-2 px-6 py-16 text-center">
      {icon && <div className="text-ink-subtle">{icon}</div>}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description && <p className="max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
