# ADR-001: Architecture of the Stock & Logistics POC

**Status:** Accepted
**Date:** 2026-07-15
**Related:** [REQUIREMENTS.md](./REQUIREMENTS.md)

## Context

We are building a POC (see [REQUIREMENTS.md](./REQUIREMENTS.md)): a set of geographically distributed stocks (warehouses) holding items, with helicopters delivering items between stocks, and an ordering flow that moves inventory from source stock(s) to a target stock.

Constraints that shape the architecture:

- It is a **POC** — speed of development and simplicity beat production-grade robustness.
- **No real backend.** The app is a static site deployed to **GitHub Pages**.
- Data must still be **mutable at runtime** (orders change stock levels) and ideally survive a page reload.
- The app should be structured so that a real backend could replace the simulated one later without rewriting the UI.
- The deployment must not be usable by random visitors — access is gated by a shared secret token.

## Decision

Build a client-only SPA with a simulated API backed by IndexedDB, seeded from in-code fixtures.

### Stack

| Concern | Choice |
|---|---|
| Build tool | Vite |
| Language | TypeScript |
| UI | React |
| Routing | React Router |
| Styling | Tailwind CSS |
| Persistence | IndexedDB (seeded from in-code fixtures) |
| Maps | Google Maps via `@vis.gl/react-google-maps` (Google's endorsed React wrapper) |
| Unit tests | Vitest + React Testing Library |
| Hosting | GitHub Pages (deployed via GitHub Actions) |

### Data layer: fixtures → IndexedDB → simulated API

1. **Fixtures live in code** (typed TypeScript modules): 10 stocks, 10 item types, vehicle definitions. Quantities are **deterministic** (not randomized), and deliberately include a few items below 10 units so the "low on" indicator is demonstrable on first load. Item images are **small placeholder SVGs bundled in the repo** — no external image hosting.
2. On first launch the app **seeds IndexedDB** from the fixtures. From that point IndexedDB is the source of truth; all reads and writes go through it, so mutations (orders) persist across reloads. A "reset data" path (re-seed from fixtures) is trivial to add for demos.
3. **API simulation:** the UI never touches IndexedDB directly. It calls an API client (`api.getStocks()`, `api.placeOrder(...)`, etc.) that is request/response-shaped and async. The implementation resolves against IndexedDB and performs the domain operations locally (inventory math, vehicle calculation). Swapping in a real HTTP backend later means replacing only this module.

### Domain model

- **Stock** — `id`, `name`, `location` (lat/lng). Holds many items with quantities.
- **Item** — `id`, `name`, `image`, `weight` (kg). 10 types (nails, wine, oil barrels, …).
- **Vehicle** — helicopters: `maxPayloadKg` (e.g. 300), `maxSpeed`. The fleet is **unlimited**: vehicles are calculation parameters ("this order needs N helicopters, T hours"), not tracked resources with availability.
- **StockItem** (relation) — `stockId`, `itemId`, `quantity`.
- **Order** — target stock, ordered lines (item + quantity), per-line source stock allocation, computed delivery info (vehicle count, duration).

### UI Kit

To keep UI/UX consistent across pages, all screens are composed from a **minimal in-project UI kit** of reusable components (e.g. `Button`, `Input`, `Card`, `Table`/`List`, `Badge`, `PageLayout`, `Spinner`/empty state) living in `src/ui/`. Rules:

- Pages and feature components **do not use raw Tailwind-styled primitives directly** for things the kit covers — they compose kit components; Tailwind classes for one-off layout (spacing, grid) are fine.
- Design tokens (colors, spacing, radii, typography) are centralized in the Tailwind config; kit components are the only place that encode visual decisions like button variants or card chrome.
- The kit stays minimal: a component is added when it's needed by a second call site, not speculatively. No external component library — the POC's needs are small and a dependency (MUI, shadcn/ui, …) would add more surface than value here.

### Pages (React Router)

| Route | Page | Contents |
|---|---|---|
| `/stocks` | Stocks list | Per stock: name, total item count (all types), "low on" list (items with quantity < 10) |
| `/stocks/:id` | Stock details | Name, location on Google Maps, items in stock with quantity, per-item count input + "add to order" button |
| `/map` | Map | Google Map with a pin per stock; pin navigates to that stock's details |
| `/order` | Order confirmation | Ordered items, candidate source stocks per item (user picks allocation), delivery info (vehicles needed, duration), confirm button |

### Order flow

1. On Stock details, each item row has a count input and an "add to order" button → items accumulate in a cart (target stock = the stock being viewed). The cart is **stored in IndexedDB through the simulated API** like every other entity, so an unfinished cart survives a reload and the UI keeps a single data path (no separate client-state store). There is exactly **one cart, targeting a single stock**: adding items while viewing a different stock starts a fresh cart, since one order delivers to one destination.
2. Order confirmation lists the items, shows which stocks have them, and lets the user allocate quantities across source stocks.
3. Delivery info is computed from the allocation: cargo weight vs. helicopter `maxPayloadKg` → number of vehicles; distance vs. `maxSpeed` → duration. Distance is **straight-line (haversine)** — helicopters don't follow roads. For multi-source orders, each source→target leg is modelled independently and legs fly **in parallel**, so order duration = the longest leg. Vehicles are counted **per leg and summed** (`ceil(legWeight / maxPayloadKg)` per source), because a single helicopter cannot consolidate cargo picked up from two different sources. Estimates use a single **standard helicopter** (the first fixture vehicle); mixed-fleet optimization is out of scope.
   - **Over-ordering is prevented, not handled:** allocation per source is capped at that source's available quantity, and the confirm button is disabled until every ordered line is fully allocated. No partial fulfillment, no negative stock.
4. On confirm, the simulated API transactionally decrements source stocks and increments the target stock in IndexedDB. Transfer is **instant** — there is no in-transit state, and per-stock inbound/outbound shipment views are out of scope; the computed delivery time is informational only.

### Access gating

The deploy workflow injects a **hash of the secret token** as a build-time variable (GitHub Actions secret → Vite env var) — the raw token never ships in the bundle. On first visit the user must enter the token; the app hashes the input and compares it to the embedded hash, then remembers success (e.g. `localStorage`) so it is asked only once per browser.

Hash algorithm: **SHA-256 via the built-in Web Crypto API** (`crypto.subtle.digest`) — MD5 was considered but is not available in Web Crypto and would require a third-party library, for no benefit. Note that either way this only hides the token value; it does not prevent a determined visitor from bypassing the client-side check (see Trade-offs).

Concrete wiring (`src/lib/auth.ts` + `src/components/AccessGate.tsx`):

- Embedded hash env var: **`VITE_ACCESS_TOKEN_HASH`**, fed from the GitHub Actions secret **`ACCESS_TOKEN_HASH`** at build time. Compute it with `npm run hash-token -- "<token>"`.
- **When no hash is embedded the gate is open** — so local dev (no secret) runs unguarded; only the deployed build with the secret set is gated.
- The `localStorage` remember stores the *matched hash* (key `slp.access.hash`), so **rotating the token invalidates every remembered unlock** automatically, since the stored value no longer equals the current embedded hash.

### Testing

Unit tests with **React Testing Library** (on Vitest, the natural runner for Vite). Priority targets: order/cart logic, delivery calculation (vehicle count, duration), low-stock computation, and the API-simulation module (against a fake/in-memory IndexedDB).

## Options Considered

### Persistence: IndexedDB (chosen) vs. localStorage vs. in-memory only

- **IndexedDB** — structured, async, comfortably fits relational-ish data and transactional updates; survives reloads. Slightly more setup (mitigated by a thin wrapper such as `idb`). **Chosen.**
- **localStorage** — simpler, but synchronous, string-only, and awkward for multi-entity transactional updates.
- **In-memory only** — simplest, but all demo state is lost on refresh.

### API layer: simulated API module (chosen) vs. direct DB access from components

- **Simulated async API** — keeps a realistic request boundary, so the app genuinely "makes requests"; enables a later real backend and makes the domain logic unit-testable in isolation. **Chosen (required by brief).**
- **Direct IndexedDB access from components** — less code today, but couples UI to storage and makes a future backend swap a rewrite.

### Routing on GitHub Pages: BrowserRouter + 404 fallback vs. HashRouter

GitHub Pages has no server-side rewrites, so deep links like `/stocks/3` 404 by default. Either use **HashRouter** (`/#/stocks/3`, works with zero config) or **BrowserRouter with the 404.html redirect trick** and a Vite `base` set to the repo path. Default to **HashRouter** for the POC — least moving parts; revisit if clean URLs matter.

## Trade-off Analysis

- **Static + simulated API vs. small real backend:** a real backend would give true access control and shared state between users, but costs hosting, deployment, and development time a POC doesn't justify. Each visitor gets their own IndexedDB world — acceptable, even convenient, for demos.
- **Client-side token gate is obfuscation, not security.** Only the token's hash ships in the bundle, so the token value itself is protected, but the check still runs in the visitor's browser and can be skipped by anyone willing to open dev tools — and the site content is in the repo/bundle regardless. This meets the "not publicly usable" bar for a POC, but nothing sensitive may live in the app. If real protection is ever needed, that's a backend/auth-proxy decision (would supersede this section).
- **Google Maps API key is exposed** in the bundle by nature of the Maps JS API. Mitigate by restricting the key to the GitHub Pages origin (HTTP referrer restriction) and to the Maps JavaScript API only. For local development the same key is used with `localhost` added to the allowed referrers, supplied via `.env.local` (gitignored) — no key is committed.
- **IndexedDB seeding introduces versioning:** when fixtures change shape, existing visitors have stale schemas. For a POC, bumping the DB version and re-seeding (dropping local changes) is acceptable.

## Consequences

- Zero infrastructure: deploy is a static upload; the whole app runs in the browser.
- Demos are stateful and persistent per browser, and resettable by re-seeding.
- The API boundary keeps a path open to a real backend with the UI untouched.
- No shared state between users; no real security. Both are explicitly out of scope.
- Delivery math (distance, duration, vehicle count) is simplified/model-based, not real routing.

## Implementation Plan

Implementation steps and their current status are tracked in [IMPLEMENTATION_PROGRESS.md](./IMPLEMENTATION_PROGRESS.md).
