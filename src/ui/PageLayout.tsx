import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from './cn';

interface NavItem {
  to: string;
  label: string;
}

const NAV: NavItem[] = [
  { to: '/stocks', label: 'Stocks' },
  { to: '/map', label: 'Map' },
  { to: '/order', label: 'Order' },
];

export interface PageLayoutProps {
  /** Page heading shown above the content. */
  title?: ReactNode;
  /** Optional actions rendered on the right of the page header (e.g. buttons). */
  actions?: ReactNode;
  children: ReactNode;
}

/** App shell: top bar with brand + nav, and a constrained content area. */
export function PageLayout({ title, actions, children }: PageLayoutProps) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-surface-border bg-surface">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-6 px-4">
          <NavLink to="/stocks" className="text-sm font-bold tracking-tight text-ink">
            Stock&nbsp;&amp;&nbsp;Logistics
          </NavLink>
          <nav className="flex items-center gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {(title || actions) && (
          <div className="mb-5 flex items-center justify-between gap-4">
            {title && <h1 className="text-2xl font-semibold text-ink">{title}</h1>}
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
