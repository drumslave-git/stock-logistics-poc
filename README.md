# Stock & Logistics POC

A client-only React SPA for tracking geographically distributed storage sites and the cargo moving between them. Warehouses ("stocks") hold items; helicopters deliver items between them; users can order items into a stock. There is **no backend** — data lives in the browser's IndexedDB behind a simulated async API, and the whole app is deployed as a static site to GitHub Pages.

> This is a proof of concept. It has no real security or shared state — each visitor gets their own in-browser data world. See the [ADR](docs/ADR.md) for the reasoning behind every architectural choice.

## Features

- **Stocks list** — every site with its total item count and a "low on" indicator (items under 10 units).
- **Stock details** — metadata, location on a Google Map, current inventory, and per-item "add to order" controls.
- **Map** — all stocks as pins; click a pin to open its details.
- **Order flow** — accumulate items into a cart, allocate each line across source stocks (capped at availability), see the computed delivery estimate (helicopters needed + duration), and confirm to transfer inventory.
- **Access gate** — the deployed build is gated by a shared token (SHA-256 hash embedded at build time); local dev runs open.

## Tech stack

| Concern | Choice |
|---|---|
| Build tool | Vite |
| Language | TypeScript |
| UI | React + React Router (HashRouter) |
| Styling | Tailwind CSS |
| Persistence | IndexedDB (seeded from in-code fixtures, via `idb`) |
| Maps | Google Maps via `@vis.gl/react-google-maps` |
| Tests | Vitest + React Testing Library |
| Hosting | GitHub Pages (via GitHub Actions) |

## Getting started

Requires Node 20+.

```bash
npm install
npm run dev
```

The app runs unguarded in dev (no access token needed). Maps degrade to a static, still-navigable fallback when no Google Maps key is set — so you can develop without one.

### Optional local config

Copy `.env.example` to `.env.local` (gitignored) and fill in what you need:

```bash
# Google Maps JavaScript API key (referrer-restricted). Optional.
VITE_GOOGLE_MAPS_API_KEY=

# SHA-256 hex of the shared access token. Empty = access gate open (dev).
VITE_ACCESS_TOKEN_HASH=
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and produce a production build |
| `npm run preview` | Serve the production build locally |
| `npm run test` | Run unit tests once (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Lint with ESLint |
| `npm run format` | Format with Prettier |
| `npm run hash-token -- "<token>"` | Print the SHA-256 hash for an access token |

## Architecture

The UI never touches IndexedDB directly — everything goes through a simulated, request/response-shaped API in [`src/api/`](src/api). On first launch the app seeds IndexedDB from typed fixtures ([`src/data/fixtures.ts`](src/data/fixtures.ts)); from then on IndexedDB is the source of truth, so orders persist across reloads. Domain logic (inventory math, haversine-based delivery calculation) lives behind the API boundary, not in components. This keeps a path open to a real HTTP backend later by replacing only the API module.

```
src/
  api/         Simulated async API (the only thing that talks to IndexedDB)
  data/        IndexedDB wrapper, fixtures, bundled placeholder images
  domain/      Entity types, constants, delivery calculation
  ui/          Reusable UI kit (Button, Input, Card, Table, Badge, …)
  components/  Feature components (StockMap, AccessGate)
  pages/       Route screens (Stocks, StockDetails, Map, Order)
  hooks/       useAsync (loading/error/data + reload)
  lib/         auth, formatting helpers
```

## Deployment

Pushing to `main` triggers [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which lints, tests, builds, and publishes to GitHub Pages. Two GitHub Actions secrets feed the build:

- `ACCESS_TOKEN` — the raw shared access token. The workflow computes its SHA-256 at build time; only the hash is embedded, never the token itself. (Prefer to hash it yourself? Set `VITE_ACCESS_TOKEN_HASH` from `npm run hash-token` instead and drop the hashing step.)
- `GOOGLE_MAPS_API_KEY` — a Maps JS API key, restricted to the Pages origin.

Vite's `base` defaults to `/stock-logistics-poc/` to match the Pages path; override it with the `BASE_PATH` env var for other hosts.

## Documentation

- [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) — what the product must do.
- [docs/ADR.md](docs/ADR.md) — how it's built, and why (stack, data layer, domain model, order flow, access gating, trade-offs).
- [docs/IMPLEMENTATION_PROGRESS.md](docs/IMPLEMENTATION_PROGRESS.md) — the implementation plan and its status.
- [AGENTS.md](AGENTS.md) — conventions for anyone (human or AI) working in the repo.
