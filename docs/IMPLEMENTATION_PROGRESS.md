# Implementation Progress

Tracks implementation of the POC described in [REQUIREMENTS.md](./REQUIREMENTS.md) and [ADR.md](./ADR.md).

Legend: `[ ]` not started · `[~]` in progress · `[x]` done

## 1. Project setup

- [ ] Scaffold Vite + React + TypeScript
- [ ] Tailwind CSS (design tokens in config)
- [ ] React Router (HashRouter)
- [ ] Vitest + React Testing Library
- [ ] Lint/format (ESLint + Prettier)

## 2. UI kit

- [ ] `PageLayout` (header, nav, content area)
- [ ] `Button` (variants: primary / secondary)
- [ ] `Input` (text / number)
- [ ] `Card`
- [ ] `Table` / `List`
- [ ] `Badge` (e.g. "low on" indicator)
- [ ] Loading / empty states

## 3. Data layer

- [ ] Entity types (Stock, Item, Vehicle, StockItem, Order)
- [ ] Fixtures: 10 stocks, 10 items (name, image, weight), helicopter vehicles (max payload, max speed) — deterministic quantities, some items < 10; bundled placeholder SVG images
- [ ] IndexedDB wrapper: seed on first run, re-seed on version bump
- [ ] Simulated API module (async, request/response-shaped)
  - [ ] `getStocks` / `getStock(id)` (with totals and low-stock info)
  - [ ] `getItems`
  - [ ] Order placement: transactional decrement of sources, increment of target
- [ ] Delivery calculation: cargo weight → vehicle count; haversine distance / max speed → duration (multi-source: longest leg)

## 4. Pages

- [ ] Stocks list: name, total items, "low on" (< 10) per stock
- [ ] Stock details: name, Google Maps location, item list with quantity, count input + "add to order"
- [ ] Map: pins for all stocks, pin → stock details
- [ ] Order confirmation: item list, source-stock allocation, delivery info, confirm

## 5. Order flow

- [ ] Cart entity in IndexedDB via the simulated API (add items from stock details, target stock = viewed stock; survives reload)
- [ ] Source-stock candidates + user allocation UI (allocation capped at availability; confirm disabled until fully allocated)
- [ ] Vehicles-needed and duration display
- [ ] Confirm → apply inventory changes via simulated API

## 6. Access gate & deploy

- [ ] Token gate screen: SHA-256 (Web Crypto) compare against embedded hash, remember in `localStorage`
- [ ] GitHub Actions workflow: build with token-hash secret, deploy to GitHub Pages
- [ ] Google Maps API key, referrer-restricted to the Pages origin

## 7. Tests

- [ ] Delivery calculation (vehicle count, duration)
- [ ] Low-stock computation
- [ ] Cart / order logic
- [ ] Simulated API against in-memory / fake IndexedDB
- [ ] Key page components (RTL)
