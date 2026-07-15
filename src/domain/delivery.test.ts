import { describe, expect, it } from 'vitest';
import { calculateDelivery, haversineKm, type DeliverySourceLoad } from './delivery';
import type { Item, Stock, Vehicle } from './types';

const stock = (id: string, lat: number, lng: number): Stock => ({
  id,
  name: id,
  description: '',
  location: { lat, lng },
});

const item = (id: string, weightKg: number): Item => ({
  id,
  name: id,
  image: '',
  weightKg,
});

const helicopter: Vehicle = {
  id: 'v1',
  name: 'Test Heli',
  maxPayloadKg: 500,
  maxSpeedKmh: 260,
};

describe('haversineKm', () => {
  it('is zero for identical points', () => {
    expect(haversineKm({ lat: 10, lng: 20 }, { lat: 10, lng: 20 })).toBe(0);
  });

  it('matches a known distance (Odesa → Constanța ≈ 200 km)', () => {
    const km = haversineKm({ lat: 46.4825, lng: 30.7233 }, { lat: 44.1733, lng: 28.6383 });
    expect(km).toBeGreaterThan(290);
    expect(km).toBeLessThan(310);
  });

  it('is symmetric', () => {
    const a = { lat: 46.4, lng: 30.7 };
    const b = { lat: 43.2, lng: 27.9 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 9);
  });
});

describe('calculateDelivery', () => {
  const target = stock('target', 44.0, 30.0);

  it('rounds vehicle count up from cargo weight', () => {
    // 501 kg over a 500 kg payload → 2 helicopters.
    const loads: DeliverySourceLoad[] = [
      { source: stock('a', 45, 30), lines: [{ item: item('i', 501), quantity: 1 }] },
    ];
    const est = calculateDelivery(target, loads, helicopter);
    expect(est.totalVehicles).toBe(2);
    expect(est.legs).toHaveLength(1);
  });

  it('sums vehicles across parallel legs but takes the longest leg for duration', () => {
    const near = stock('near', 44.1, 30.0); // close to target
    const far = stock('far', 47.0, 30.0); // farther from target
    const loads: DeliverySourceLoad[] = [
      { source: near, lines: [{ item: item('n', 600), quantity: 1 }] }, // 2 heli
      { source: far, lines: [{ item: item('f', 100), quantity: 1 }] }, // 1 heli
    ];
    const est = calculateDelivery(target, loads, helicopter);

    expect(est.totalVehicles).toBe(3); // 2 + 1, not ceil(700/500)=2
    expect(est.totalWeightKg).toBe(700);

    const farLeg = est.legs.find((l) => l.sourceStockId === 'far')!;
    expect(est.durationHours).toBeCloseTo(farLeg.durationHours, 9);
    expect(farLeg.durationHours).toBeGreaterThan(
      est.legs.find((l) => l.sourceStockId === 'near')!.durationHours,
    );
  });

  it('ignores zero-weight loads and returns an empty estimate', () => {
    const est = calculateDelivery(target, [], helicopter);
    expect(est).toEqual({ legs: [], totalWeightKg: 0, totalVehicles: 0, durationHours: 0 });
  });

  it('derives duration as distance / speed', () => {
    const source = stock('a', 45.0, 30.0);
    const loads: DeliverySourceLoad[] = [
      { source, lines: [{ item: item('i', 10), quantity: 1 }] },
    ];
    const est = calculateDelivery(target, loads, helicopter);
    const leg = est.legs[0];
    expect(leg.durationHours).toBeCloseTo(leg.distanceKm / helicopter.maxSpeedKmh, 9);
  });
});
