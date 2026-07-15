// In-code fixtures seeded into IndexedDB on first launch (see docs/ADR.md →
// "Data layer"). Everything here is deterministic — no randomness — so the
// demo looks identical on every fresh browser, and a few holdings are
// deliberately below the low-stock threshold so the "low on" indicator shows
// on first load.

import { LOW_STOCK_THRESHOLD } from '../domain/constants';
import type { Item, Stock, StockItem, Vehicle } from '../domain/types';
import { placeholderImage } from './images';

// --- Stocks: coastal depots and offshore rigs around the Black Sea ---------

export const stocks: Stock[] = [
  {
    id: 's1',
    name: 'Odesa Port Warehouse',
    description: 'Main coastal supply depot at the Port of Odesa.',
    location: { lat: 46.4825, lng: 30.7233 },
  },
  {
    id: 's2',
    name: 'Chornomorsk Depot',
    description: 'Secondary warehouse south of Odesa.',
    location: { lat: 46.3, lng: 30.65 },
  },
  {
    id: 's3',
    name: 'Snake Island Outpost',
    description: 'Forward storage outpost on Zmiinyi Island.',
    location: { lat: 45.2556, lng: 30.2031 },
  },
  {
    id: 's4',
    name: 'Rig Poseidon',
    description: 'Offshore drilling platform, central sector.',
    location: { lat: 44.6, lng: 31.2 },
  },
  {
    id: 's5',
    name: 'Rig Triton',
    description: 'Offshore drilling platform, western sector.',
    location: { lat: 44.9, lng: 30.5 },
  },
  {
    id: 's6',
    name: 'Rig Neptune',
    description: 'Offshore drilling platform, northern sector.',
    location: { lat: 45.5, lng: 31.5 },
  },
  {
    id: 's7',
    name: 'Constanța Warehouse',
    description: 'Romanian coastal storage terminal.',
    location: { lat: 44.1733, lng: 28.6383 },
  },
  {
    id: 's8',
    name: 'Varna Coastal Store',
    description: 'Bulgarian coastal supply store.',
    location: { lat: 43.2141, lng: 27.9147 },
  },
  {
    id: 's9',
    name: 'Rig Kraken',
    description: 'Offshore drilling platform, southern sector.',
    location: { lat: 43.5, lng: 29.0 },
  },
  {
    id: 's10',
    name: 'Batumi Terminal',
    description: 'Eastern Black Sea coastal terminal.',
    location: { lat: 41.6168, lng: 41.6367 },
  },
];

// --- Items: 10 types with distinct unit weights ----------------------------

export const items: Item[] = [
  { id: 'i1', name: 'Iron Nails (crate)', image: placeholderImage('IN', '#64748b'), weightKg: 25 },
  { id: 'i2', name: 'Whisky (case)', image: placeholderImage('WH', '#b45309'), weightKg: 18 },
  { id: 'i3', name: 'Diesel Fuel (barrel)', image: placeholderImage('DF', '#334155'), weightKg: 180 },
  { id: 'i4', name: 'Drinking Water (pack)', image: placeholderImage('DW', '#0ea5e9'), weightKg: 20 },
  { id: 'i5', name: 'Cement (bags)', image: placeholderImage('CE', '#78716c'), weightKg: 50 },
  { id: 'i6', name: 'Steel Cable (spool)', image: placeholderImage('SC', '#475569'), weightKg: 40 },
  { id: 'i7', name: 'Medical Kit', image: placeholderImage('MK', '#dc2626'), weightKg: 8 },
  { id: 'i8', name: 'Canned Food (pallet)', image: placeholderImage('CF', '#16a34a'), weightKg: 12 },
  { id: 'i9', name: 'Oxygen Tank', image: placeholderImage('OT', '#0891b2'), weightKg: 60 },
  { id: 'i10', name: 'Rotor Blade (spare)', image: placeholderImage('RB', '#7c3aed'), weightKg: 120 },
];

// --- Vehicles: the delivery helicopter -------------------------------------
// The fleet is unlimited; the estimate uses the standard helicopter (the first
// entry). A mixed-fleet optimization is out of scope for the POC.

export const vehicles: Vehicle[] = [
  { id: 'v1', name: 'Mi-8 Cargo Helicopter', maxPayloadKg: 500, maxSpeedKmh: 260 },
];

/** The helicopter used for delivery estimates. */
export const defaultVehicle = vehicles[0];

// --- Stock inventory -------------------------------------------------------

/**
 * Deterministic per-(stock, item) quantity. A fixed arithmetic formula (no
 * RNG) spreads holdings roughly across 2..43 units; the distribution lands a
 * handful of pairs below {@link LOW_STOCK_THRESHOLD} so the "low on" indicator
 * is demonstrable on first load, without any hand-tuning.
 */
export function seededQuantity(stockIndex: number, itemIndex: number): number {
  return ((stockIndex * 5 + itemIndex * 8 + 3) % 42) + 2;
}

export const stockItems: StockItem[] = stocks.flatMap((stock, stockIndex) =>
  items.map((item, itemIndex): StockItem => ({
    id: `${stock.id}:${item.id}`,
    stockId: stock.id,
    itemId: item.id,
    quantity: seededQuantity(stockIndex, itemIndex),
  })),
);

/** True when there is at least one holding below the threshold (sanity check). */
export const hasLowStockFixtures = stockItems.some(
  (si) => si.quantity < LOW_STOCK_THRESHOLD,
);
