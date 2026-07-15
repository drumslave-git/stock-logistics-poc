import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ApiError,
  estimateDelivery,
  getItems,
  getStock,
  getStocks,
  placeOrder,
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
