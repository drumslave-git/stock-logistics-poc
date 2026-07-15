# Requirements — Stock & Logistics POC

> Compiled from a voice-note briefing (originally in Ukrainian). Wording has been cleaned up and structured; open questions from unclear parts of the recording are listed at the end.

## 1. Overview

Build an application for tracking geographically distributed storage sites and the cargo moving between them.

The sites are geographic objects — for example, offshore oil rigs at sea or warehouses on the coastline. Each site acts as a warehouse holding a stock of items, and vehicles (ships, helicopters) transport items between sites.

## 2. Core Concepts

### 2.1 Sites (geographic objects)

- Examples: offshore oil rigs, coastal warehouses.
- Each site has **general metadata** (name, description, etc.) including a geographic location that can be linked/integrated with Google Maps.
- Each site **is a warehouse**: it holds a set of inventory entries (e.g., "Odesa: X units of fuel, Y units of iron nails").

### 2.2 Inventory

- Inventory is a set of item types with quantities, held per site.
- Example item types: fuel, iron nails, whisky.

### 2.3 Vehicles & Trips

- Vehicles (ships, helicopters) move between sites.
- **Not real-time**: this is not a continuous live-tracking view; movements are modeled as trips, not streamed positions.
- Each trip has:
  - an **origin** site (from),
  - a **destination** site (to),
  - a **cargo manifest** (what it is carrying and in what quantities).

## 3. Functional Requirements

### 3.1 Listing page

- A listing page showing all geographic objects (sites).

### 3.2 Site detail page

For each site, the user can view:

- General metadata (including location, potentially rendered via Google Maps).
- **Current inventory** — what the site holds right now.
- ~~**Inbound shipments** — what is currently on its way *to* this site.~~
- ~~**Outbound shipments** — what is currently on its way *from* this site.~~

> Scope decision (see [ADR.md](./ADR.md)): order transfers are instant in the POC — there is no in-transit state, so inbound/outbound shipment views were cut.

### 3.3 Orders (optional / stretch)

- Ability to place an order from a site, e.g. "I order a cartload of nails and a case of whisky."
- An order presumably results in a trip being scheduled from a site that has the requested stock.

## 4. Non-Requirements

- No real-time vehicle tracking (no live position streaming).

## 5. Open Questions

All resolved in [ADR.md](./ADR.md): embedded Google Map (details page + map page with pins); order sources are picked manually by the user on the confirmation page; transfers are instant (no trip schedules/ETAs beyond an informational delivery-time estimate); access is a shared-token gate rather than user accounts.
