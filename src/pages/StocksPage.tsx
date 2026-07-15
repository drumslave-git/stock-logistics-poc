import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStocks, resetData } from '../api';
import type { StockSummary } from '../domain/types';
import { useAsync } from '../hooks/useAsync';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingState,
  PageLayout,
  Table,
  type Column,
} from '../ui';

/**
 * Stocks list — every warehouse with its distinct-item count, total units, and
 * the items it is running low on. Rows navigate to the stock's details.
 */
export default function StocksPage() {
  const navigate = useNavigate();
  const { data, error, loading, reload } = useAsync(() => getStocks(), []);
  const [resetting, setResetting] = useState(false);

  async function handleReset() {
    setResetting(true);
    try {
      await resetData();
      reload();
    } finally {
      setResetting(false);
    }
  }

  const columns: Column<StockSummary>[] = [
    {
      key: 'name',
      header: 'Stock',
      render: (s) => (
        <div>
          <div className="font-medium text-ink">{s.name}</div>
          <div className="text-xs text-ink-subtle">{s.description}</div>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Item types',
      align: 'right',
      render: (s) => s.distinctItemCount,
    },
    {
      key: 'total',
      header: 'Total units',
      align: 'right',
      render: (s) => s.totalQuantity.toLocaleString(),
    },
    {
      key: 'low',
      header: 'Low on',
      render: (s) =>
        s.lowStock.length === 0 ? (
          <span className="text-ink-subtle">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {s.lowStock.map((l) => (
              <Badge key={l.itemId} tone="warning">
                {l.name} · {l.quantity}
              </Badge>
            ))}
          </div>
        ),
    },
  ];

  return (
    <PageLayout
      title="Stocks"
      actions={
        <Button variant="ghost" size="sm" onClick={handleReset} loading={resetting}>
          Reset demo data
        </Button>
      }
    >
      {loading ? (
        <LoadingState label="Loading stocks…" />
      ) : error ? (
        <EmptyState
          title="Couldn't load stocks"
          description={error.message}
          action={
            <Button variant="secondary" onClick={reload}>
              Retry
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <Table
            columns={columns}
            rows={data ?? []}
            rowKey={(s) => s.id}
            onRowClick={(s) => navigate(`/stocks/${s.id}`)}
            empty={<EmptyState title="No stocks" description="Seed data may have failed to load." />}
          />
        </Card>
      )}
    </PageLayout>
  );
}
