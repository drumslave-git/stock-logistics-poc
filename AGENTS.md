# AGENTS.md

Guide for AI agents (and humans) working in this repository.

## What this project is

A stock & logistics POC: a client-only React SPA (no real backend) deployed to GitHub Pages. Warehouses ("stocks") hold items; helicopters move items between them; users can order items into a stock. Data lives in IndexedDB, seeded from in-code fixtures, behind a simulated async API.

## Source-of-truth documents

Read these before making changes, in this order:

1. [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) — what the product must do.
2. [docs/ADR.md](docs/ADR.md) — how it is built: stack, data layer, domain model, pages, order flow, UI kit rules, access gating. **Architectural decisions are made here, not ad hoc in code.**
3. [docs/IMPLEMENTATION_PROGRESS.md](docs/IMPLEMENTATION_PROGRESS.md) — the implementation plan and its current status.

## The process

1. **Pick work from the progress file.** Take the next logical unchecked item in [docs/IMPLEMENTATION_PROGRESS.md](docs/IMPLEMENTATION_PROGRESS.md) (respect section order — e.g. data layer before pages that need it), or the item the user asked for.
2. **Check the ADR before deviating.** If the implementation needs a decision the ADR doesn't cover, or contradicts it, update the ADR first (or ask the user), then implement.
3. **Implement following the conventions below.**
4. **Write/update unit tests** for logic you add or change (Vitest + React Testing Library).
5. **Update [docs/IMPLEMENTATION_PROGRESS.md](docs/IMPLEMENTATION_PROGRESS.md)** — mark items `[~]` when started, `[x]` when done and tested. Add newly discovered work as new checklist items rather than doing it silently.
6. **Keep docs in sync.** If scope or behavior changes, reflect it in REQUIREMENTS.md / ADR.md in the same change.

## Conventions

- **UI kit first.** Pages compose reusable components from `src/ui/` (`Button`, `Input`, `Card`, `Table`, `Badge`, `PageLayout`, …). Don't hand-style one-off buttons/inputs in pages; if the kit lacks something needed twice, add it to the kit. Raw Tailwind in pages is fine only for layout (spacing/grid).
- **API boundary is sacred.** UI code never touches IndexedDB directly — everything goes through the simulated API module (async, request/response-shaped). Domain logic (inventory math, delivery calculation) lives behind that boundary, not in components.
- **TypeScript throughout**; entities are typed once and reused (fixtures, API, UI).
- **Routing:** HashRouter (GitHub Pages has no rewrites).
- **Secrets:** never commit the access token or a raw Google Maps key restriction bypass. The token's SHA-256 hash arrives via a build-time env var from a GitHub Actions secret.

## Commands

Once scaffolded (section 1 of the progress file), the standard Vite scripts apply:

- `npm run dev` — dev server
- `npm run test` — unit tests (Vitest)
- `npm run build` — production build
- `npm run lint` — lint

## Definition of done (per checklist item)

- Implemented per ADR conventions.
- Unit tests for new logic pass; existing tests still pass.
- Progress file updated; docs updated if behavior/scope changed.
