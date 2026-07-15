/**
 * Tiny className combiner: filters out falsy values and joins with spaces.
 * Kept local so the UI kit doesn't pull in a dependency (clsx/classnames) for
 * what is a one-line utility. Later-listed classes win only by CSS specificity,
 * so keep token-level styles in the kit and pass layout-only classes from pages.
 */
export type ClassValue = string | false | null | undefined;

export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
