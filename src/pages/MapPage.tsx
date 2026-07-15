import { useNavigate } from 'react-router-dom';
import { getStocks } from '../api';
import { StockMap } from '../components/StockMap';
import { useAsync } from '../hooks/useAsync';
import { Button, EmptyState, LoadingState, PageLayout } from '../ui';

/** Map — one pin per stock; clicking a pin opens that stock's details. */
export default function MapPage() {
  const navigate = useNavigate();
  const { data, error, loading, reload } = useAsync(() => getStocks(), []);

  return (
    <PageLayout title="Map">
      {loading ? (
        <LoadingState label="Loading map…" />
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
        <StockMap
          markers={(data ?? []).map((s) => ({ id: s.id, name: s.name, location: s.location }))}
          onSelect={(stockId) => navigate(`/stocks/${stockId}`)}
          className="h-[70vh] min-h-[420px]"
        />
      )}
    </PageLayout>
  );
}
