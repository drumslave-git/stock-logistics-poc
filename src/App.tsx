import { Navigate, Route, Routes } from 'react-router-dom';

/**
 * Application routing shell. Pages are stubbed during scaffolding (Section 1)
 * and filled in under Section 4 of the implementation progress.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/stocks" replace />} />
      <Route path="/stocks" element={<Placeholder title="Stocks" />} />
      <Route path="/stocks/:id" element={<Placeholder title="Stock details" />} />
      <Route path="/map" element={<Placeholder title="Map" />} />
      <Route path="/order" element={<Placeholder title="Order" />} />
      <Route path="*" element={<Placeholder title="Not found" />} />
    </Routes>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <div className="grid min-h-full place-items-center p-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        <p className="mt-2 text-ink-muted">Coming soon.</p>
      </div>
    </div>
  );
}
