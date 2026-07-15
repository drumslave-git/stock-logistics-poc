import { Navigate, Route, Routes } from 'react-router-dom';
import StocksPage from './pages/StocksPage';
import StockDetailsPage from './pages/StockDetailsPage';
import MapPage from './pages/MapPage';
import OrderPage from './pages/OrderPage';
import { Button, EmptyState, PageLayout } from './ui';
import { useNavigate } from 'react-router-dom';

/** Application routing shell. Pages compose the UI kit and talk to the API. */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/stocks" replace />} />
      <Route path="/stocks" element={<StocksPage />} />
      <Route path="/stocks/:id" element={<StockDetailsPage />} />
      <Route path="/map" element={<MapPage />} />
      <Route path="/order" element={<OrderPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function NotFound() {
  const navigate = useNavigate();
  return (
    <PageLayout title="Not found">
      <EmptyState
        title="Page not found"
        description="The page you're looking for doesn't exist."
        action={<Button onClick={() => navigate('/stocks')}>Back to stocks</Button>}
      />
    </PageLayout>
  );
}
