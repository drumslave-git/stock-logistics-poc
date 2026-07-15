import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearCart, estimateDelivery, getOrderPlan, placeOrder, type OrderRequest } from '../api';
import type { Order, OrderPlan, OrderPlanLine } from '../domain/types';
import { useAsync } from '../hooks/useAsync';
import { formatDistance, formatDuration, formatWeight } from '../lib/format';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  LoadingState,
  PageLayout,
} from '../ui';

/** Allocation map: itemId → (sourceStockId → quantity taken from that source). */
type Allocation = Record<string, Record<string, number>>;

/** Greedily fill each line from its highest-stocked sources first. */
function autoAllocate(plan: OrderPlan): Allocation {
  const result: Allocation = {};
  for (const line of plan.lines) {
    let remaining = line.quantity;
    const perSource: Record<string, number> = {};
    for (const c of line.candidates) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, c.available);
      if (take > 0) {
        perSource[c.stockId] = take;
        remaining -= take;
      }
    }
    result[line.item.id] = perSource;
  }
  return result;
}

interface LineStatus {
  allocated: number;
  supply: number;
  over: boolean;
  fullyAllocated: boolean;
}

function statusOf(line: OrderPlanLine, perSource: Record<string, number> = {}): LineStatus {
  const availableById = new Map(line.candidates.map((c) => [c.stockId, c.available]));
  const allocated = Object.values(perSource).reduce((sum, q) => sum + q, 0);
  const supply = line.candidates.reduce((sum, c) => sum + c.available, 0);
  const over = Object.entries(perSource).some(
    ([stockId, q]) => q > (availableById.get(stockId) ?? 0),
  );
  return { allocated, supply, over, fullyAllocated: allocated === line.quantity && !over };
}

export default function OrderPage() {
  const navigate = useNavigate();
  const { data: plan, error, loading, reload } = useAsync(() => getOrderPlan(), []);

  const [alloc, setAlloc] = useState<Allocation>({});
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);

  // Seed a sensible default allocation whenever a fresh plan loads.
  useEffect(() => {
    if (plan) setAlloc(autoAllocate(plan));
  }, [plan]);

  // Build the order request from the current allocation (drops zero lines).
  const request = useMemo<OrderRequest | null>(() => {
    if (!plan) return null;
    return {
      targetStockId: plan.targetStockId,
      lines: plan.lines.map((line) => ({
        itemId: line.item.id,
        quantity: line.quantity,
        allocations: Object.entries(alloc[line.item.id] ?? {})
          .map(([sourceStockId, quantity]) => ({ sourceStockId, quantity }))
          .filter((a) => a.quantity > 0),
      })),
    };
  }, [plan, alloc]);

  const requestKey = JSON.stringify(request);
  const hasAllocation = (request?.lines ?? []).some((l) => l.allocations.length > 0);

  // Live delivery estimate for whatever is currently allocated.
  const { data: estimate } = useAsync(
    () => (request && hasAllocation ? estimateDelivery(request) : Promise.resolve(null)),
    [requestKey],
  );

  function setSourceQty(itemId: string, stockId: string, value: number, max: number) {
    const clamped = Math.max(0, Math.min(max, Math.floor(value) || 0));
    setAlloc((cur) => ({
      ...cur,
      [itemId]: { ...(cur[itemId] ?? {}), [stockId]: clamped },
    }));
  }

  async function handleConfirm() {
    if (!request) return;
    setPlacing(true);
    setPlaceError(null);
    try {
      setPlacedOrder(await placeOrder(request));
    } catch (e) {
      setPlaceError(e instanceof Error ? e.message : String(e));
    } finally {
      setPlacing(false);
    }
  }

  async function handleClear() {
    await clearCart();
    reload();
  }

  // ---- Success state -------------------------------------------------------
  if (placedOrder) {
    return (
      <PageLayout title="Order placed">
        <Card className="border-success-500 bg-success-50">
          <CardBody className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge tone="success">Confirmed</Badge>
              <span className="text-sm text-ink-muted">
                Inventory moved to the target stock.
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
              <Stat label="Helicopters" value={String(placedOrder.delivery.totalVehicles)} />
              <Stat label="Duration" value={formatDuration(placedOrder.delivery.durationHours)} />
              <Stat label="Cargo" value={formatWeight(placedOrder.delivery.totalWeightKg)} />
              <Stat label="Legs" value={String(placedOrder.delivery.legs.length)} />
            </dl>
            <div className="flex gap-2 pt-1">
              <Button onClick={() => navigate(`/stocks/${placedOrder.targetStockId}`)}>
                View target stock
              </Button>
              <Button variant="secondary" onClick={() => navigate('/stocks')}>
                Back to stocks
              </Button>
            </div>
          </CardBody>
        </Card>
      </PageLayout>
    );
  }

  // ---- Loading / error / empty --------------------------------------------
  if (loading) {
    return (
      <PageLayout title="Order">
        <LoadingState label="Loading order…" />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title="Order">
        <EmptyState
          title="Couldn't load your order"
          description={error.message}
          action={
            <Button variant="secondary" onClick={reload}>
              Retry
            </Button>
          }
        />
      </PageLayout>
    );
  }

  if (!plan) {
    return (
      <PageLayout title="Order">
        <EmptyState
          title="Your order is empty"
          description="Add items to an order from a stock's details page."
          action={<Button onClick={() => navigate('/stocks')}>Browse stocks</Button>}
        />
      </PageLayout>
    );
  }

  const statuses = plan.lines.map((line) => statusOf(line, alloc[line.item.id]));
  const canConfirm = statuses.length > 0 && statuses.every((s) => s.fullyAllocated);

  return (
    <PageLayout
      title="Order confirmation"
      actions={
        <Button variant="ghost" size="sm" onClick={handleClear}>
          Clear order
        </Button>
      }
    >
      <p className="mb-4 text-ink-muted">
        Delivering to <strong className="text-ink">{plan.targetStockName}</strong>. Allocate each
        item across the stocks that hold it, then confirm.
      </p>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* Allocation lines */}
        <div className="space-y-4">
          {plan.lines.map((line, i) => {
            const status = statuses[i];
            const perSource = alloc[line.item.id] ?? {};
            const remaining = line.quantity - status.allocated;
            return (
              <Card key={line.item.id} className="overflow-hidden">
                <CardHeader className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={line.item.image}
                      alt=""
                      className="h-9 w-9 rounded-md border border-surface-border"
                    />
                    <div>
                      <CardTitle>{line.item.name}</CardTitle>
                      <div className="text-xs text-ink-subtle">
                        {line.quantity} unit{line.quantity === 1 ? '' : 's'} · {line.item.weightKg}{' '}
                        kg each
                      </div>
                    </div>
                  </div>
                  {status.fullyAllocated ? (
                    <Badge tone="success">Allocated</Badge>
                  ) : status.over ? (
                    <Badge tone="danger">Over available</Badge>
                  ) : (
                    <Badge tone="warning">{remaining} to allocate</Badge>
                  )}
                </CardHeader>
                <CardBody>
                  {line.candidates.length === 0 ? (
                    <p className="text-sm text-danger-600">
                      No other stock holds this item — it can't be fulfilled.
                    </p>
                  ) : (
                    <>
                      {status.supply < line.quantity && (
                        <p className="mb-2 text-sm text-danger-600">
                          Only {status.supply} unit{status.supply === 1 ? '' : 's'} available across
                          all stocks.
                        </p>
                      )}
                      <ul className="divide-y divide-surface-border">
                        {line.candidates.map((c) => (
                          <li
                            key={c.stockId}
                            className="flex items-center justify-between gap-3 py-2"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm text-ink">{c.stockName}</div>
                              <div className="text-xs text-ink-subtle">{c.available} available</div>
                            </div>
                            <div className="w-24">
                              <Input
                                type="number"
                                min={0}
                                max={c.available}
                                aria-label={`Units of ${line.item.name} from ${c.stockName}`}
                                value={perSource[c.stockId] ?? 0}
                                onChange={(e) =>
                                  setSourceQty(
                                    line.item.id,
                                    c.stockId,
                                    Number(e.target.value),
                                    c.available,
                                  )
                                }
                              />
                            </div>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>

        {/* Delivery summary + confirm */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Delivery</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <Stat
                  label="Helicopters"
                  value={estimate ? String(estimate.totalVehicles) : '—'}
                />
                <Stat
                  label="Duration"
                  value={estimate ? formatDuration(estimate.durationHours) : '—'}
                />
                <Stat label="Cargo" value={estimate ? formatWeight(estimate.totalWeightKg) : '—'} />
                <Stat label="Legs" value={estimate ? String(estimate.legs.length) : '—'} />
              </dl>

              {estimate && estimate.legs.length > 0 && (
                <ul className="space-y-1 border-t border-surface-border pt-2 text-xs text-ink-muted">
                  {estimate.legs.map((leg) => (
                    <li key={leg.sourceStockId} className="flex justify-between gap-2">
                      <span>
                        {plan.lines
                          .flatMap((l) => l.candidates)
                          .find((c) => c.stockId === leg.sourceStockId)?.stockName ??
                          leg.sourceStockId}
                      </span>
                      <span className="tabular-nums">
                        {formatDistance(leg.distanceKm)} · {leg.vehicles}×
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {placeError && <p className="text-sm text-danger-600">{placeError}</p>}

              <Button className="w-full" disabled={!canConfirm} loading={placing} onClick={handleConfirm}>
                Confirm order
              </Button>
              {!canConfirm && (
                <p className="text-center text-xs text-ink-subtle">
                  Fully allocate every item to confirm.
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-subtle">{label}</dt>
      <dd className="text-base font-semibold text-ink">{value}</dd>
    </div>
  );
}
