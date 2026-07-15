import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  addToCart,
  ApiError,
  clearCart,
  estimateDelivery,
  getCart,
  getItems,
  getOrderPlan,
  getStock,
  getStocks,
  placeOrder,
  removeCartLine,
  resetData,
} from './index';
import { LOW_STOCK_THRESHOLD } from '../domain/constants';
import { items as itemFixtures, stocks as stockFixtures } from '../data/fixtures';

// Fresh, fully-seeded database before each test.
beforeEach(async () => {
  await resetData();
});

/** Quantity of one item at one stock (0 if absent), via the API. */
async function qtyAt(stockId: string, itemId: string): Promise<number> {
  const detail = await getStock(stockId);
  return detail.items.find((r) => r.item.id === itemId)?.quantity ?? 0;
}

describe('reads', () => {
  it('getItems returns all fixture items, sorted by name', async () => {
    const items = await getItems();
    expect(items).toHaveLength(itemFixtures.length);
    const names = items.map((i) => i.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('getStocks returns every stock with totals and low-stock info', async () => {
    const stocks = await getStocks();
    expect(stocks).toHaveLength(stockFixtures.length);

    for (const s of stocks) {
      expect(s.totalQuantity).toBeGreaterThan(0);
      expect(s.distinctItemCount).toBeGreaterThan(0);
      for (const low of s.lowStock) {
        expect(low.quantity).toBeLessThan(LOW_STOCK_THRESHOLD);
      }
    }

    // The fixtures deliberately include low holdings somewhere.
    expect(stocks.some((s) => s.lowStock.length > 0)).toBe(true);
  });

  it('getStock throws ApiError for an unknown id', async () => {
    await expect(getStock('nope')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('placeOrder', () => {
  it('moves inventory from source to target transactionally', async () => {
    const source = stockFixtures[2]; // Snake Island Outpost
    const target = stockFixtures[0]; // Odesa Port Warehouse
    const itemId = itemFixtures[0].id;

    const sourceBefore = await qtyAt(source.id, itemId);
    const targetBefore = await qtyAt(target.id, itemId);
    expect(sourceBefore).toBeGreaterThanOrEqual(2);

    const order = await placeOrder({
      targetStockId: target.id,
      lines: [
        {
          itemId,
          quantity: 2,
          allocations: [{ sourceStockId: source.id, quantity: 2 }],
        },
      ],
    });

    expect(order.id).toBeTruthy();
    expect(order.delivery.totalVehicles).toBeGreaterThanOrEqual(1);
    expect(order.delivery.legs).toHaveLength(1);

    expect(await qtyAt(source.id, itemId)).toBe(sourceBefore - 2);
    expect(await qtyAt(target.id, itemId)).toBe(targetBefore + 2);
  });

  it('rejects an order that draws a source below zero, leaving stock untouched', async () => {
    const source = stockFixtures[3];
    const target = stockFixtures[0];
    const itemId = itemFixtures[1].id;

    const available = await qtyAt(source.id, itemId);
    const targetBefore = await qtyAt(target.id, itemId);

    await expect(
      placeOrder({
        targetStockId: target.id,
        lines: [
          {
            itemId,
            quantity: available + 1,
            allocations: [{ sourceStockId: source.id, quantity: available + 1 }],
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ApiError);

    // Transaction aborted → nothing changed.
    expect(await qtyAt(source.id, itemId)).toBe(available);
    expect(await qtyAt(target.id, itemId)).toBe(targetBefore);
  });

  it('rejects a line that is not fully allocated', async () => {
    const target = stockFixtures[0];
    const source = stockFixtures[4];
    await expect(
      placeOrder({
        targetStockId: target.id,
        lines: [
          {
            itemId: itemFixtures[0].id,
            quantity: 5,
            allocations: [{ sourceStockId: source.id, quantity: 3 }],
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});

describe('cart', () => {
  it('accumulates lines and merges repeated adds of the same item', async () => {
    const target = stockFixtures[0];
    await addToCart(target.id, itemFixtures[0].id, 2);
    await addToCart(target.id, itemFixtures[1].id, 1);
    await addToCart(target.id, itemFixtures[0].id, 3); // merge

    const cart = await getCart();
    expect(cart).not.toBeNull();
    expect(cart!.targetStockId).toBe(target.id);
    expect(cart!.lines).toHaveLength(2);
    const first = cart!.lines.find((l) => l.item.id === itemFixtures[0].id);
    expect(first!.quantity).toBe(5);
  });

  it('starts a fresh cart when items are added for a different target stock', async () => {
    await addToCart(stockFixtures[0].id, itemFixtures[0].id, 2);
    await addToCart(stockFixtures[1].id, itemFixtures[2].id, 1);

    const cart = await getCart();
    expect(cart!.targetStockId).toBe(stockFixtures[1].id);
    expect(cart!.lines).toHaveLength(1);
    expect(cart!.lines[0].item.id).toBe(itemFixtures[2].id);
  });

  it('rejects a non-positive quantity', async () => {
    await expect(addToCart(stockFixtures[0].id, itemFixtures[0].id, 0)).rejects.toBeInstanceOf(
      ApiError,
    );
  });

  it('removes a line and clears the cart', async () => {
    const target = stockFixtures[0];
    await addToCart(target.id, itemFixtures[0].id, 1);
    await addToCart(target.id, itemFixtures[1].id, 1);

    const afterRemove = await removeCartLine(itemFixtures[0].id);
    expect(afterRemove!.lines).toHaveLength(1);

    await clearCart();
    expect(await getCart()).toBeNull();
  });
});

describe('getOrderPlan', () => {
  it('lists candidate source stocks excluding the target, with availability', async () => {
    const target = stockFixtures[0];
    const itemId = itemFixtures[0].id;
    await addToCart(target.id, itemId, 4);

    const plan = await getOrderPlan();
    expect(plan).not.toBeNull();
    expect(plan!.targetStockId).toBe(target.id);
    expect(plan!.lines).toHaveLength(1);

    const line = plan!.lines[0];
    expect(line.candidates.every((c) => c.stockId !== target.id)).toBe(true);
    expect(line.candidates.every((c) => c.available > 0)).toBe(true);
    // Sorted by availability descending.
    const avail = line.candidates.map((c) => c.available);
    expect(avail).toEqual([...avail].sort((a, b) => b - a));
  });

  it('returns null when the cart is empty', async () => {
    expect(await getOrderPlan()).toBeNull();
  });
});

describe('placeOrder clears the cart', () => {
  it('empties the cart after a successful order', async () => {
    const source = stockFixtures[2];
    const target = stockFixtures[0];
    const itemId = itemFixtures[0].id;

    await addToCart(target.id, itemId, 1);
    await placeOrder({
      targetStockId: target.id,
      lines: [{ itemId, quantity: 1, allocations: [{ sourceStockId: source.id, quantity: 1 }] }],
    });

    expect(await getCart()).toBeNull();
  });
});

describe('estimateDelivery', () => {
  it('does not mutate inventory', async () => {
    const source = stockFixtures[5];
    const target = stockFixtures[0];
    const itemId = itemFixtures[2].id;
    const before = await qtyAt(source.id, itemId);

    const est = await estimateDelivery({
      targetStockId: target.id,
      lines: [
        { itemId, quantity: 1, allocations: [{ sourceStockId: source.id, quantity: 1 }] },
      ],
    });

    expect(est.totalWeightKg).toBe(itemFixtures[2].weightKg);
    expect(await qtyAt(source.id, itemId)).toBe(before);
  });
});
