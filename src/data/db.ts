// IndexedDB wrapper (via `idb`). On first launch — or whenever DB_VERSION is
// bumped — the object stores are (re)created and the reference data is seeded
// from the in-code fixtures. From then on IndexedDB is the source of truth and
// every read/write goes through the simulated API (see docs/ADR.md).

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Cart, Order, Stock, Item, Vehicle, StockItem } from '../domain/types';
import { stocks, items, vehicles, stockItems } from './fixtures';

export const DB_NAME = 'stock-logistics';
// Bump when the fixture/schema shape changes → existing visitors get re-seeded.
export const DB_VERSION = 1;

export interface StockLogisticsSchema extends DBSchema {
  stocks: { key: string; value: Stock };
  items: { key: string; value: Item };
  vehicles: { key: string; value: Vehicle };
  stockItems: {
    key: string;
    value: StockItem;
    indexes: { byStock: string; byItem: string };
  };
  orders: { key: string; value: Order };
  cart: { key: string; value: Cart };
}

export type AppDB = IDBPDatabase<StockLogisticsSchema>;

let dbPromise: Promise<AppDB> | null = null;

function open(): Promise<AppDB> {
  return openDB<StockLogisticsSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, _oldVersion, _newVersion, tx) {
      // Re-create every store from scratch so a version bump reseeds cleanly.
      for (const name of db.objectStoreNames) {
        db.deleteObjectStore(name);
      }

      db.createObjectStore('stocks', { keyPath: 'id' });
      db.createObjectStore('items', { keyPath: 'id' });
      db.createObjectStore('vehicles', { keyPath: 'id' });

      const stockItemStore = db.createObjectStore('stockItems', { keyPath: 'id' });
      stockItemStore.createIndex('byStock', 'stockId');
      stockItemStore.createIndex('byItem', 'itemId');

      db.createObjectStore('orders', { keyPath: 'id' });
      db.createObjectStore('cart', { keyPath: 'id' });

      // Seed reference data within the upgrade transaction.
      for (const stock of stocks) tx.objectStore('stocks').put(stock);
      for (const item of items) tx.objectStore('items').put(item);
      for (const vehicle of vehicles) tx.objectStore('vehicles').put(vehicle);
      for (const si of stockItems) tx.objectStore('stockItems').put(si);
    },
  });
}

/** Lazily open (and memoize) the shared database connection. */
export function getDB(): Promise<AppDB> {
  if (!dbPromise) dbPromise = open();
  return dbPromise;
}

/**
 * Drop the database and re-open it, re-seeding from fixtures. Handy for a demo
 * "reset data" control; also used by tests to isolate state.
 */
export async function resetData(): Promise<void> {
  if (dbPromise) {
    (await dbPromise).close();
    dbPromise = null;
  }
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
  await getDB();
}
