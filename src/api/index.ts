// Simulated async API. The UI calls these request/response-shaped functions
// and never touches IndexedDB directly; the implementation resolves against
// IndexedDB and runs the domain logic locally. Swapping in a real HTTP backend
// later means replacing only this module (see docs/ADR.md → "API boundary").

import { LOW_STOCK_THRESHOLD } from '../domain/constants';
import { calculateDelivery, type DeliverySourceLoad } from '../domain/delivery';
import type {
  CartView,
  DeliveryEstimate,
  Item,
  LowStockEntry,
  Order,
  OrderLine,
  OrderPlan,
  OrderPlanLine,
  SourceCandidate,
  Stock,
  StockDetail,
  StockItemView,
  StockSummary,
  Vehicle,
} from '../domain/types';
import { defaultVehicle } from '../data/fixtures';
import { getDB, resetData, type AppDB } from '../data/db';

/** Simulated network latency so callers experience a real async boundary. */
const LATENCY_MS = 60;

const delay = (ms = LATENCY_MS): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Thrown for domain/validation failures (mirrors a 4xx from a real backend). */
export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function getItems(): Promise<Item[]> {
  await delay();
  const db = await getDB();
  const all = await db.getAll('items');
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getVehicles(): Promise<Vehicle[]> {
  await delay();
  const db = await getDB();
  return db.getAll('vehicles');
}

function lowStockFrom(
  holdings: Array<{ itemId: string; quantity: number }>,
  itemsById: Map<string, Item>,
): LowStockEntry[] {
  return holdings
    .filter((h) => h.quantity > 0 && h.quantity < LOW_STOCK_THRESHOLD)
    .map((h) => ({
      itemId: h.itemId,
      name: itemsById.get(h.itemId)?.name ?? h.itemId,
      quantity: h.quantity,
    }))
    .sort((a, b) => a.quantity - b.quantity);
}

export async function getStocks(): Promise<StockSummary[]> {
  await delay();
  const db = await getDB();
  const [stocks, items] = await Promise.all([db.getAll('stocks'), db.getAll('items')]);
  const itemsById = new Map(items.map((i) => [i.id, i]));

  const summaries = await Promise.all(
    stocks.map(async (stock): Promise<StockSummary> => {
      const holdings = await db.getAllFromIndex('stockItems', 'byStock', stock.id);
      const present = holdings.filter((h) => h.quantity > 0);
      return {
        id: stock.id,
        name: stock.name,
        description: stock.description,
        location: stock.location,
        distinctItemCount: present.length,
        totalQuantity: present.reduce((sum, h) => sum + h.quantity, 0),
        lowStock: lowStockFrom(holdings, itemsById),
      };
    }),
  );

  return summaries.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getStock(id: string): Promise<StockDetail> {
  await delay();
  const db = await getDB();
  const stock = await db.get('stocks', id);
  if (!stock) throw new ApiError(`Stock not found: ${id}`);

  const [items, holdings] = await Promise.all([
    db.getAll('items'),
    db.getAllFromIndex('stockItems', 'byStock', id),
  ]);
  const itemsById = new Map(items.map((i) => [i.id, i]));
  const qtyByItem = new Map(holdings.map((h) => [h.itemId, h.quantity]));

  const rows: StockItemView[] = items
    .map((item): StockItemView => {
      const quantity = qtyByItem.get(item.id) ?? 0;
      return { item, quantity, isLow: quantity > 0 && quantity < LOW_STOCK_THRESHOLD };
    })
    .filter((row) => row.quantity > 0)
    .sort((a, b) => a.item.name.localeCompare(b.item.name));

  return {
    ...stock,
    items: rows,
    distinctItemCount: rows.length,
    totalQuantity: rows.reduce((sum, r) => sum + r.quantity, 0),
    lowStock: lowStockFrom(holdings, itemsById),
  };
}

// ---------------------------------------------------------------------------
// Cart
//
// The in-progress cart is persisted in IndexedDB like every other entity, so an
// unfinished order survives a reload and the UI keeps a single data path (see
// docs/ADR.md → "Order flow"). There is exactly one cart, stored under the
// fixed id 'current'; its target stock is whichever stock the user was viewing
// when they added items.
// ---------------------------------------------------------------------------

const CART_ID = 'current';

/** Resolve the stored cart into item entities + target name for display. */
async function resolveCart(db: AppDB): Promise<CartView | null> {
  const cart = await db.get('cart', CART_ID);
  if (!cart || cart.lines.length === 0) return null;

  const [target, items] = await Promise.all([
    db.get('stocks', cart.targetStockId),
    db.getAll('items'),
  ]);
  const itemsById = new Map(items.map((i) => [i.id, i]));

  const lines = cart.lines
    .map((line) => {
      const item = itemsById.get(line.itemId);
      return item ? { item, quantity: line.quantity } : null;
    })
    .filter((line): line is { item: Item; quantity: number } => line !== null)
    .sort((a, b) => a.item.name.localeCompare(b.item.name));

  return {
    targetStockId: cart.targetStockId,
    targetStockName: target?.name ?? cart.targetStockId,
    lines,
  };
}

export async function getCart(): Promise<CartView | null> {
  await delay();
  return resolveCart(await getDB());
}

/**
 * Add a quantity of one item to the cart, targeting the given stock. The cart's
 * target is the stock being viewed; adding items while targeting a *different*
 * stock starts a fresh cart (a single order delivers to one destination).
 */
export async function addToCart(
  targetStockId: string,
  itemId: string,
  quantity: number,
): Promise<CartView> {
  await delay();
  const db = await getDB();

  if (quantity <= 0) throw new ApiError('Quantity must be positive.');
  const [target, item] = await Promise.all([
    db.get('stocks', targetStockId),
    db.get('items', itemId),
  ]);
  if (!target) throw new ApiError(`Stock not found: ${targetStockId}`);
  if (!item) throw new ApiError(`Item not found: ${itemId}`);

  const existing = await db.get('cart', CART_ID);
  const lines =
    existing && existing.targetStockId === targetStockId ? [...existing.lines] : [];

  const row = lines.find((l) => l.itemId === itemId);
  if (row) row.quantity += quantity;
  else lines.push({ itemId, quantity });

  await db.put('cart', { id: CART_ID, targetStockId, lines });
  return (await resolveCart(db)) as CartView;
}

/** Remove one item line from the cart. Returns the cart, or null if now empty. */
export async function removeCartLine(itemId: string): Promise<CartView | null> {
  await delay();
  const db = await getDB();
  const existing = await db.get('cart', CART_ID);
  if (!existing) return null;

  const lines = existing.lines.filter((l) => l.itemId !== itemId);
  if (lines.length === 0) {
    await db.delete('cart', CART_ID);
    return null;
  }
  await db.put('cart', { ...existing, lines });
  return resolveCart(db);
}

export async function clearCart(): Promise<void> {
  await delay();
  const db = await getDB();
  await db.delete('cart', CART_ID);
}

/**
 * Build the order-confirmation plan from the current cart: each line plus the
 * source stocks (other than the target) that currently hold the item, with
 * their available quantity, so the UI can offer a per-source allocation.
 */
export async function getOrderPlan(): Promise<OrderPlan | null> {
  await delay();
  const db = await getDB();
  const cart = await db.get('cart', CART_ID);
  if (!cart || cart.lines.length === 0) return null;

  const [target, stocks, items] = await Promise.all([
    db.get('stocks', cart.targetStockId),
    db.getAll('stocks'),
    db.getAll('items'),
  ]);
  const stocksById = new Map(stocks.map((s) => [s.id, s]));
  const itemsById = new Map(items.map((i) => [i.id, i]));

  const lines = await Promise.all(
    cart.lines.map(async (line): Promise<OrderPlanLine | null> => {
      const item = itemsById.get(line.itemId);
      if (!item) return null;

      const holdings = await db.getAllFromIndex('stockItems', 'byItem', line.itemId);
      const candidates: SourceCandidate[] = holdings
        .filter((h) => h.stockId !== cart.targetStockId && h.quantity > 0)
        .map((h) => ({
          stockId: h.stockId,
          stockName: stocksById.get(h.stockId)?.name ?? h.stockId,
          available: h.quantity,
        }))
        .sort((a, b) => b.available - a.available || a.stockName.localeCompare(b.stockName));

      return { item, quantity: line.quantity, candidates };
    }),
  );

  return {
    targetStockId: cart.targetStockId,
    targetStockName: target?.name ?? cart.targetStockId,
    lines: lines
      .filter((l): l is OrderPlanLine => l !== null)
      .sort((a, b) => a.item.name.localeCompare(b.item.name)),
  };
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export interface OrderRequest {
  targetStockId: string;
  lines: OrderLine[];
}

/**
 * Group order allocations into per-source loads and resolve them against the
 * given entity maps, for the delivery calculation.
 */
function buildLoads(
  lines: OrderLine[],
  stocksById: Map<string, Stock>,
  itemsById: Map<string, Item>,
): DeliverySourceLoad[] {
  const bySource = new Map<string, DeliverySourceLoad>();

  for (const line of lines) {
    const item = itemsById.get(line.itemId);
    if (!item) throw new ApiError(`Item not found: ${line.itemId}`);

    for (const alloc of line.allocations) {
      const source = stocksById.get(alloc.sourceStockId);
      if (!source) throw new ApiError(`Stock not found: ${alloc.sourceStockId}`);

      let load = bySource.get(source.id);
      if (!load) {
        load = { source, lines: [] };
        bySource.set(source.id, load);
      }
      load.lines.push({ item, quantity: alloc.quantity });
    }
  }

  return [...bySource.values()];
}

/**
 * Estimate delivery for a would-be order without mutating anything. Powers the
 * live vehicle/duration readout on the order-confirmation page.
 */
export async function estimateDelivery(req: OrderRequest): Promise<DeliveryEstimate> {
  await delay();
  const db = await getDB();
  const [stocks, items] = await Promise.all([db.getAll('stocks'), db.getAll('items')]);

  const target = stocks.find((s) => s.id === req.targetStockId);
  if (!target) throw new ApiError(`Stock not found: ${req.targetStockId}`);

  const stocksById = new Map(stocks.map((s) => [s.id, s]));
  const itemsById = new Map(items.map((i) => [i.id, i]));
  const loads = buildLoads(req.lines, stocksById, itemsById);

  return calculateDelivery(target, loads, defaultVehicle);
}

/**
 * Validate and apply an order: transactionally decrement each source stock and
 * increment the target, then record the order. Over-ordering is rejected, not
 * partially fulfilled — every line must be fully allocated and no source may be
 * drawn below zero (see docs/ADR.md → "Order flow").
 */
export async function placeOrder(req: OrderRequest): Promise<Order> {
  await delay();
  const db = await getDB();

  const [stocks, items] = await Promise.all([db.getAll('stocks'), db.getAll('items')]);
  const target = stocks.find((s) => s.id === req.targetStockId);
  if (!target) throw new ApiError(`Stock not found: ${req.targetStockId}`);
  const stocksById = new Map(stocks.map((s) => [s.id, s]));
  const itemsById = new Map(items.map((i) => [i.id, i]));

  if (req.lines.length === 0) throw new ApiError('Order has no lines.');

  // Structural validation (fully allocated, positive quantities, known refs).
  for (const line of req.lines) {
    if (line.quantity <= 0) throw new ApiError(`Line quantity must be positive: ${line.itemId}`);
    if (!itemsById.has(line.itemId)) throw new ApiError(`Item not found: ${line.itemId}`);

    const allocated = line.allocations.reduce((sum, a) => sum + a.quantity, 0);
    if (allocated !== line.quantity) {
      throw new ApiError(
        `Line ${line.itemId} allocated ${allocated} of ${line.quantity} units.`,
      );
    }
    for (const alloc of line.allocations) {
      if (alloc.quantity <= 0) {
        throw new ApiError(`Allocation quantity must be positive: ${line.itemId}`);
      }
      if (!stocksById.has(alloc.sourceStockId)) {
        throw new ApiError(`Stock not found: ${alloc.sourceStockId}`);
      }
    }
  }

  const delivery = calculateDelivery(
    target,
    buildLoads(req.lines, stocksById, itemsById),
    defaultVehicle,
  );

  const order: Order = {
    id: crypto.randomUUID(),
    targetStockId: req.targetStockId,
    lines: req.lines,
    delivery,
    placedAt: new Date().toISOString(),
  };

  // Apply inventory changes atomically: a single readwrite transaction over the
  // stockItems store, plus the order record. Availability is re-checked inside
  // the transaction so it can't race a stale read.
  const tx = db.transaction(['stockItems', 'orders'], 'readwrite');
  const store = tx.objectStore('stockItems');

  // Net delta per (stock, item): sources go down, the target goes up.
  const deltas = new Map<string, { stockId: string; itemId: string; delta: number }>();
  const bump = (stockId: string, itemId: string, delta: number) => {
    const key = `${stockId}:${itemId}`;
    const existing = deltas.get(key);
    if (existing) existing.delta += delta;
    else deltas.set(key, { stockId, itemId, delta });
  };
  for (const line of req.lines) {
    for (const alloc of line.allocations) {
      bump(alloc.sourceStockId, line.itemId, -alloc.quantity);
    }
    bump(req.targetStockId, line.itemId, line.quantity);
  }

  for (const { stockId, itemId, delta } of deltas.values()) {
    const key = `${stockId}:${itemId}`;
    const current = (await store.get(key))?.quantity ?? 0;
    const next = current + delta;
    if (next < 0) {
      tx.abort();
      // Consume the abort-triggered rejection so it isn't unhandled.
      await tx.done.catch(() => undefined);
      throw new ApiError(
        `Insufficient stock at ${stockId} for ${itemId}: have ${current}, need ${-delta}.`,
      );
    }
    await store.put({ id: key, stockId, itemId, quantity: next });
  }

  await tx.objectStore('orders').put(order);
  await tx.done;

  // The order is placed; drop the now-fulfilled cart.
  await db.delete('cart', CART_ID);

  return order;
}

/** Re-export so callers reset demo data through the API boundary. */
export { resetData };
