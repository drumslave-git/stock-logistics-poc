// Small presentation helpers shared across pages. Pure formatting — no domain
// logic (that lives behind the API boundary, see docs/ADR.md).

/** Human-readable delivery duration, e.g. 2.4h → "2 h 24 min". */
export function formatDuration(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  if (totalMinutes < 1) return '<1 min';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/** Whole-kilometre distance, e.g. "142 km". */
export function formatDistance(km: number): string {
  return `${Math.round(km).toLocaleString()} km`;
}

/** Weight with a thousands separator, e.g. "1,250 kg". */
export function formatWeight(kg: number): string {
  return `${Math.round(kg).toLocaleString()} kg`;
}
