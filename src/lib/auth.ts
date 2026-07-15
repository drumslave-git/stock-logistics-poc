// Client-side access gate. A SHA-256 hash of the shared token is embedded at
// build time (VITE_ACCESS_TOKEN_HASH, from a GitHub Actions secret); the raw
// token never ships in the bundle. On entry we hash the user's input and
// compare. This only hides the token value — it is obfuscation, not real
// security (see docs/ADR.md → "Access gating" / Trade-offs).

/** Where a successful unlock is remembered — stores the hash it matched. */
const STORAGE_KEY = 'slp.access.hash';

/** SHA-256 of `input` as lowercase hex, via the built-in Web Crypto API. */
export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** The embedded token hash, normalized. Empty string when the gate is unconfigured. */
export function configuredHash(): string {
  return (import.meta.env.VITE_ACCESS_TOKEN_HASH ?? '').trim().toLowerCase();
}

/**
 * Whether the gate is active. With no hash embedded (e.g. local dev without the
 * secret) the gate is open so the app stays usable.
 */
export function isGateEnabled(): boolean {
  return configuredHash().length > 0;
}

/**
 * True if this browser previously unlocked with the *current* embedded hash.
 * Rotating the token invalidates a remembered unlock automatically, since the
 * stored hash no longer matches.
 */
export function isUnlocked(): boolean {
  if (!isGateEnabled()) return true;
  try {
    return localStorage.getItem(STORAGE_KEY) === configuredHash();
  } catch {
    return false;
  }
}

/**
 * Hash `token` and, if it matches the embedded hash, remember the unlock.
 * Returns whether the token was correct.
 */
export async function tryUnlock(token: string): Promise<boolean> {
  const hash = await sha256Hex(token);
  if (hash !== configuredHash()) return false;
  try {
    localStorage.setItem(STORAGE_KEY, hash);
  } catch {
    // Non-fatal: the unlock still holds for this session if storage is blocked.
  }
  return true;
}
