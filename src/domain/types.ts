// Domain entities for the stock & logistics POC. Typed once here and reused
// across fixtures, the IndexedDB layer, the simulated API, and the UI
// (see docs/ADR.md → "Domain model").

/** A point on the globe. Feeds both the map view and haversine distance. */
export interface GeoLocation {
  lat: number;
  lng: number;
}

/** A geographic site that acts as a warehouse (oil rig, coastal depot). */
export interface Stock {
  id: string;
  name: string;
  description: string;
  location: GeoLocation;
}

/** An item type that can be stocked and moved. */
export interface Item {
  id: string;
  name: string;
  /** Bundled placeholder SVG, stored as a `data:` URI — no external hosting. */
  image: string;
  /** Unit weight in kilograms; drives the delivery vehicle-count calc. */
  weightKg: number;
}

/**
 * A delivery vehicle (helicopter). The fleet is unlimited — vehicles are
 * calculation parameters ("this order needs N helicopters, T hours"), not
 * tracked resources with availability.
 */
export interface Vehicle {
  id: string;
  name: string;
  maxPayloadKg: number;
  maxSpeedKmh: number;
}

/**
 * How much of one item a stock holds. Persisted with a composite id so a
 * (stock, item) pair is addressable directly.
 */
export interface StockItem {
  /** `${stockId}:${itemId}` */
  id: string;
  stockId: string;
  itemId: string;
  quantity: number;
}

// ---------------------------------------------------------------------------
// Orders & delivery
// ---------------------------------------------------------------------------

/** A quantity of one order line pulled from one source stock. */
export interface Allocation {
  sourceStockId: string;
  quantity: number;
}

/** One ordered item, with its quantity allocated across source stocks. */
export interface OrderLine {
  itemId: string;
  quantity: number;
  allocations: Allocation[];
}

/** A single source→target flight, aggregating everything from that source. */
export interface DeliveryLeg {
  sourceStockId: string;
  distanceKm: number;
  weightKg: number;
  vehicles: number;
  durationHours: number;
}

/**
 * Computed delivery model for an order. Legs fly in parallel, so the order's
 * duration is the longest leg; vehicles are summed across legs (a helicopter
 * can't consolidate cargo from two different sources). See docs/ADR.md.
 */
export interface DeliveryEstimate {
  legs: DeliveryLeg[];
  totalWeightKg: number;
  totalVehicles: number;
  durationHours: number;
}

/** A placed order, recorded after inventory has been moved. */
export interface Order {
  id: string;
  targetStockId: string;
  lines: OrderLine[];
  delivery: DeliveryEstimate;
  /** ISO-8601 timestamp. */
  placedAt: string;
}

// ---------------------------------------------------------------------------
// Cart (persisted like every other entity, through the API — see ADR order flow)
// ---------------------------------------------------------------------------

export interface CartLine {
  itemId: string;
  quantity: number;
}

/**
 * The single in-progress cart. Its target stock is the stock being viewed
 * when items were added. Stored under a fixed id so there is exactly one.
 */
export interface Cart {
  id: 'current';
  targetStockId: string;
  lines: CartLine[];
}

// ---------------------------------------------------------------------------
// API response shapes (derived/joined views the UI consumes)
// ---------------------------------------------------------------------------

/** An item a stock is running low on (quantity below the threshold). */
export interface LowStockEntry {
  itemId: string;
  name: string;
  quantity: number;
}

/** Row on the stocks list: identity + rolled-up totals + low-stock info. */
export interface StockSummary {
  id: string;
  name: string;
  description: string;
  location: GeoLocation;
  /** Number of distinct item types held (quantity > 0). */
  distinctItemCount: number;
  /** Sum of all item quantities. */
  totalQuantity: number;
  lowStock: LowStockEntry[];
}

/** One inventory row on the stock-details page. */
export interface StockItemView {
  item: Item;
  quantity: number;
  isLow: boolean;
}

/** A resolved cart line: the item entity plus the desired quantity. */
export interface CartLineView {
  item: Item;
  quantity: number;
}

/** The current cart, resolved for display (target name + item entities). */
export interface CartView {
  targetStockId: string;
  targetStockName: string;
  lines: CartLineView[];
}

/** A stock that can supply an ordered item, with how much it currently holds. */
export interface SourceCandidate {
  stockId: string;
  stockName: string;
  available: number;
}

/** One order line with the source stocks that could fulfil it. */
export interface OrderPlanLine {
  item: Item;
  quantity: number;
  candidates: SourceCandidate[];
}

/**
 * The order-confirmation payload: the cart plus, per line, the candidate source
 * stocks the user allocates across. Powers the allocation UI (see docs/ADR.md →
 * "Order flow").
 */
export interface OrderPlan {
  targetStockId: string;
  targetStockName: string;
  lines: OrderPlanLine[];
}

/** Full stock-details payload: the stock plus its resolved inventory. */
export interface StockDetail extends Stock {
  items: StockItemView[];
  distinctItemCount: number;
  totalQuantity: number;
  lowStock: LowStockEntry[];
}
