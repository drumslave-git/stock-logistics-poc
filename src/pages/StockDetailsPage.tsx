import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { addToCart, getCart, getStock } from '../api';
import type { StockItemView } from '../domain/types';
import { StockMap } from '../components/StockMap';
import { useAsync } from '../hooks/useAsync';
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
  Table,
  type Column,
} from '../ui';

/**
 * Stock details — the warehouse's location on a map, its current inventory, and
 * a per-item "add to order" control that accumulates a cart targeting this
 * stock (see docs/ADR.md → "Order flow").
 */
export default function StockDetailsPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const { data: stock, error, loading } = useAsync(() => getStock(id), [id]);
  const { data: cart, reload: reloadCart } = useAsync(() => getCart(), []);

  // Per-row order quantity (defaults to 1) and transient add feedback.
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);

  const qtyFor = (itemId: string) => quantities[itemId] ?? 1;

  async function handleAdd(row: StockItemView) {
    const quantity = qtyFor(row.item.id);
    if (quantity <= 0) return;
    setAddingId(row.item.id);
    try {
      await addToCart(id, row.item.id, quantity);
      reloadCart();
      setAddedId(row.item.id);
      window.setTimeout(() => setAddedId((cur) => (cur === row.item.id ? null : cur)), 1500);
    } finally {
      setAddingId(null);
    }
  }

  if (loading) {
    return (
      <PageLayout title="Stock details">
        <LoadingState label="Loading stock…" />
      </PageLayout>
    );
  }

  if (error || !stock) {
    return (
      <PageLayout title="Stock details">
        <EmptyState
          title="Stock not found"
          description={error?.message ?? `No stock with id ${id}.`}
          action={
            <Button variant="secondary" onClick={() => navigate('/stocks')}>
              Back to stocks
            </Button>
          }
        />
      </PageLayout>
    );
  }

  const cartCount = cart?.lines.reduce((sum, l) => sum + l.quantity, 0) ?? 0;

  const columns: Column<StockItemView>[] = [
    {
      key: 'item',
      header: 'Item',
      render: (row) => (
        <div className="flex items-center gap-3">
          <img
            src={row.item.image}
            alt=""
            className="h-9 w-9 shrink-0 rounded-md border border-surface-border"
          />
          <div>
            <div className="font-medium text-ink">{row.item.name}</div>
            <div className="text-xs text-ink-subtle">{row.item.weightKg} kg each</div>
          </div>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'In stock',
      align: 'right',
      render: (row) => (
        <span className="inline-flex items-center gap-2">
          {row.isLow && <Badge tone="warning">Low</Badge>}
          <span className="tabular-nums">{row.quantity}</span>
        </span>
      ),
    },
    {
      key: 'order',
      header: 'Order',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <div className="w-20">
            <Input
              type="number"
              min={1}
              aria-label={`Quantity of ${row.item.name} to order`}
              value={qtyFor(row.item.id)}
              onChange={(e) =>
                setQuantities((q) => ({
                  ...q,
                  [row.item.id]: Math.max(1, Number(e.target.value) || 1),
                }))
              }
            />
          </div>
          <Button
            size="sm"
            variant={addedId === row.item.id ? 'secondary' : 'primary'}
            loading={addingId === row.item.id}
            onClick={() => handleAdd(row)}
          >
            {addedId === row.item.id ? 'Added ✓' : 'Add'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      title={stock.name}
      actions={
        cartCount > 0 && (
          <Button onClick={() => navigate('/order')}>Review order ({cartCount})</Button>
        )
      }
    >
      <div className="mb-4">
        <Link to="/stocks" className="text-sm text-brand-600 hover:text-brand-700">
          ← All stocks
        </Link>
        <p className="mt-1 text-ink-muted">{stock.description}</p>
      </div>

      {cart && cart.targetStockId === stock.id && cartCount > 0 && (
        <Card className="mb-4 border-brand-200 bg-brand-50">
          <CardBody className="flex items-center justify-between gap-4">
            <span className="text-sm text-ink">
              <strong>{cartCount}</strong> unit{cartCount === 1 ? '' : 's'} across{' '}
              <strong>{cart.lines.length}</strong> item{cart.lines.length === 1 ? '' : 's'} queued
              for this stock.
            </span>
            <Button size="sm" onClick={() => navigate('/order')}>
              Review order
            </Button>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardBody>
            <StockMap
              markers={[{ id: stock.id, name: stock.name, location: stock.location }]}
              center={stock.location}
              zoom={9}
              className="h-64"
            />
            <p className="mt-2 text-xs text-ink-subtle">
              {stock.location.lat.toFixed(4)}, {stock.location.lng.toFixed(4)}
            </p>
          </CardBody>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Inventory</CardTitle>
          </CardHeader>
          <Table
            columns={columns}
            rows={stock.items}
            rowKey={(row) => row.item.id}
            empty={<EmptyState title="Empty stock" description="This stock holds no items." />}
          />
        </Card>
      </div>
    </PageLayout>
  );
}
