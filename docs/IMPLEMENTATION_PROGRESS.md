# Implementation Progress

Tracks implementation of the POC described in [REQUIREMENTS.md](./REQUIREMENTS.md) and [ADR.md](./ADR.md).

Legend: `[ ]` not started · `[~]` in progress · `[x]` done

## 1. Project setup

- [x] Scaffold Vite + React + TypeScript
- [x] Tailwind CSS (design tokens in config)
- [x] React Router (HashRouter)
- [x] Vitest + React Testing Library
- [x] Lint/format (ESLint + Prettier)

## 2. UI kit

- [x] `PageLayout` (header, nav, content area)
- [x] `Button` (variants: primary / secondary — plus ghost / danger, `loading` state)
- [x] `Input` (text / number — with label, error, hint)
- [x] `Card` (+ `CardHeader` / `CardTitle` / `CardBody` / `CardFooter`)
- [x] `Table` / `List` (generic column-config `Table<T>`, optional row-click + empty slot)
- [x] `Badge` (e.g. "low on" indicator — neutral / brand / danger / warning / success tones)
- [x] Loading / empty states (`Spinner`, `LoadingState`, `EmptyState`)

All in `src/ui/` behind the `src/ui/index.ts` barrel; unit-tested (Button, Input, Badge, Table).

## 3. Data layer

- [x] Entity types (Stock, Item, Vehicle, StockItem, Order) — `src/domain/types.ts`
- [x] Fixtures: 10 stocks, 10 items (name, image, weight), helicopter vehicles (max payload, max speed) — deterministic quantities, some items < 10; bundled placeholder SVG images — `src/data/fixtures.ts`, `src/data/images.ts`
- [x] IndexedDB wrapper: seed on first run, re-seed on version bump — `src/data/db.ts` (+ `resetData()`)
- [x] Simulated API module (async, request/response-shaped) — `src/api/index.ts`
  - [x] `getStocks` / `getStock(id)` (with totals and low-stock info)
  - [x] `getItems`
  - [x] Order placement: transactional decrement of sources, increment of target (`placeOrder`; + `estimateDelivery`)
- [x] Delivery calculation: cargo weight → vehicle count; haversine distance / max speed → duration (multi-source: longest leg) — `src/domain/delivery.ts`

## 4. Pages

- [x] Stocks list: name, total items, "low on" (< 10) per stock — `src/pages/StocksPage.tsx` (+ "reset demo data" control)
- [x] Stock details: name, Google Maps location, item list with quantity, count input + "add to order" — `src/pages/StockDetailsPage.tsx`
- [x] Map: pins for all stocks, pin → stock details — `src/pages/MapPage.tsx`
- [x] Order confirmation: item list, source-stock allocation, delivery info, confirm — `src/pages/OrderPage.tsx`

Shared page infra: `src/hooks/useAsync.ts` (loading/error/data + reload), `src/components/StockMap.tsx` (Google Map via `@vis.gl/react-google-maps`; degrades to an informative, still-navigable fallback when `VITE_GOOGLE_MAPS_API_KEY` is absent), `src/lib/format.ts` (duration/distance/weight). Pages mounted on the routes in `src/App.tsx`.

## 5. Order flow

- [x] Cart entity in IndexedDB via the simulated API (add items from stock details, target stock = viewed stock; survives reload) — `getCart`/`addToCart`/`removeCartLine`/`clearCart` in `src/api/index.ts`; adding for a different target starts a fresh cart (single-target orders)
- [x] Source-stock candidates + user allocation UI (allocation capped at availability; confirm disabled until fully allocated) — `getOrderPlan` + `OrderPage` (auto-allocates greedily from highest-stocked sources as a starting point)
- [x] Vehicles-needed and duration display — live `estimateDelivery` readout on `OrderPage`
- [x] Confirm → apply inventory changes via simulated API — `placeOrder` (clears the cart on success)

## 6. Access gate & deploy

- [x] Token gate screen: SHA-256 (Web Crypto) compare against embedded hash, remember in `localStorage` — `src/lib/auth.ts` + `src/components/AccessGate.tsx` (wraps `<App>` in `src/main.tsx`); gate is open when `VITE_ACCESS_TOKEN_HASH` is unset (dev), and a remembered unlock is invalidated when the token rotates. Hash generator: `npm run hash-token`.
- [x] GitHub Actions workflow: build with token secret, deploy to GitHub Pages — `.github/workflows/deploy.yml` (lint + test + build on push to `main`; hashes the raw `ACCESS_TOKEN` secret at build time → `VITE_ACCESS_TOKEN_HASH`, `GOOGLE_MAPS_API_KEY` → `VITE_*` env, `upload-pages-artifact` + `deploy-pages`)
- [x] Google Maps API key, referrer-restricted to the Pages origin — supplied via the `GOOGLE_MAPS_API_KEY` secret; restriction is a Google Cloud console setting documented in [ADR.md](./ADR.md) Trade-offs and `.env.example`

## 7. Tests

- [x] Delivery calculation (vehicle count, duration) — `src/domain/delivery.test.ts`
- [x] Low-stock computation — asserted in `src/api/index.test.ts` (`getStocks` low-stock) and surfaced in `StocksPage`
- [x] Cart / order logic — `src/api/index.test.ts` (cart, order-plan, place-order) + `src/pages/OrderPage.test.tsx`
- [x] Simulated API against in-memory / fake IndexedDB — `src/api/index.test.ts` (`fake-indexeddb`, now global via `src/test/setup.ts`)
- [x] Key page components (RTL) — `src/pages/StocksPage.test.tsx`, `src/pages/OrderPage.test.tsx`
