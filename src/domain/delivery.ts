// Pure delivery model. No IndexedDB, no React — takes resolved entities and
// returns the estimate, so it is trivially unit-testable. The simulated API
// (src/api) is responsible for loading the entities and calling in here; the
// UI never calls this directly (see docs/ADR.md → "API boundary is sacred").

import { EARTH_RADIUS_KM } from './constants';
import type {
  DeliveryEstimate,
  DeliveryLeg,
  GeoLocation,
  Item,
  Stock,
  Vehicle,
} from './types';

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Great-circle (straight-line) distance in km between two points.
 * Helicopters don't follow roads, so straight-line is the right model.
 */
export function haversineKm(a: GeoLocation, b: GeoLocation): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** What is being flown from one source stock, already resolved to entities. */
export interface DeliverySourceLoad {
  source: Stock;
  /** Item + quantity pairs pulled from this source. */
  lines: Array<{ item: Item; quantity: number }>;
}

/**
 * Model an order's delivery from its per-source loads.
 *
 * - Cargo weight per source ÷ helicopter payload → helicopters for that leg
 *   (rounded up). Total vehicles = sum over legs, because a helicopter can't
 *   consolidate cargo from two different sources.
 * - Distance per source ÷ helicopter cruise speed → leg duration. Legs fly in
 *   parallel, so the order's duration is the longest leg.
 *
 * Sources contributing zero weight are ignored.
 */
export function calculateDelivery(
  target: Stock,
  loads: DeliverySourceLoad[],
  vehicle: Vehicle,
): DeliveryEstimate {
  const legs: DeliveryLeg[] = [];

  for (const { source, lines } of loads) {
    const weightKg = lines.reduce(
      (sum, { item, quantity }) => sum + item.weightKg * quantity,
      0,
    );
    if (weightKg <= 0) continue;

    const distanceKm = haversineKm(source.location, target.location);

    legs.push({
      sourceStockId: source.id,
      distanceKm,
      weightKg,
      vehicles: Math.ceil(weightKg / vehicle.maxPayloadKg),
      durationHours: distanceKm / vehicle.maxSpeedKmh,
    });
  }

  return {
    legs,
    totalWeightKg: legs.reduce((sum, leg) => sum + leg.weightKg, 0),
    totalVehicles: legs.reduce((sum, leg) => sum + leg.vehicles, 0),
    durationHours: legs.reduce((max, leg) => Math.max(max, leg.durationHours), 0),
  };
}
