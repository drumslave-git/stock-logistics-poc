// UI kit — the single source of visual truth. Pages compose these rather than
// hand-styling primitives (see docs/ADR.md → "UI Kit").
export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';

export { Input } from './Input';
export type { InputProps } from './Input';

export { Card, CardHeader, CardTitle, CardBody, CardFooter } from './Card';
export type { CardProps } from './Card';

export { Badge } from './Badge';
export type { BadgeProps, BadgeTone } from './Badge';

export { Table } from './Table';
export type { TableProps, Column } from './Table';

export { PageLayout } from './PageLayout';
export type { PageLayoutProps } from './PageLayout';

export { Spinner, LoadingState } from './Spinner';
export type { SpinnerProps } from './Spinner';

export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { cn } from './cn';
export type { ClassValue } from './cn';
