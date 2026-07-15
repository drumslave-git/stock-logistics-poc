/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Google Maps JavaScript API key. Supplied via `.env.local` in development
   * and a GitHub Actions secret at build time (see docs/ADR.md). When absent,
   * map views degrade to a static fallback instead of failing.
   */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;

  /**
   * Google Maps Map ID, required to render Advanced Markers. When absent the map
   * falls back to Google's public `DEMO_MAP_ID`; set a styled Map ID from the
   * Google Cloud console for production map styling.
   */
  readonly VITE_GOOGLE_MAPS_MAP_ID?: string;

  /**
   * SHA-256 hex hash of the shared access token, embedded at build time from a
   * GitHub Actions secret (see docs/ADR.md → "Access gating"). When empty or
   * absent the access gate is disabled — useful for local development.
   */
  readonly VITE_ACCESS_TOKEN_HASH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
