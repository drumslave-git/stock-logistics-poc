// Placeholder item images: small, self-contained SVGs encoded as `data:` URIs
// and bundled in the repo (no external image hosting — see docs/ADR.md). Each
// item gets a colored tile with a short label so they're visually distinct.

/** Build a `data:image/svg+xml` URI for a labelled colored tile. */
export function placeholderImage(label: string, color: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" role="img">` +
    `<rect width="96" height="96" rx="12" fill="${color}"/>` +
    `<text x="48" y="48" fill="#ffffff" font-family="system-ui,sans-serif" font-size="34" ` +
    `font-weight="700" text-anchor="middle" dominant-baseline="central">${label}</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
