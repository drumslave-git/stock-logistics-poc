/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Google Maps JavaScript API key. Supplied via `.env.local` in development
   * and a GitHub Actions secret at build time (see docs/ADR.md). When absent,
   * map views degrade to a static fallback instead of failing.
   */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
