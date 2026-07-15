import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';
import type { GeoLocation } from '../domain/types';
import { Button, cn } from '../ui';

/** Minimal shape a map pin needs — satisfied by StockSummary and StockDetail. */
export interface MapMarker {
  id: string;
  name: string;
  location: GeoLocation;
}

export interface StockMapProps {
  markers: MapMarker[];
  /** Map center; defaults to the centroid of the markers. */
  center?: GeoLocation;
  zoom?: number;
  /** Called with a stock id when its pin is clicked. */
  onSelect?: (stockId: string) => void;
  /** Sets the map's height (and the fallback's) — pass e.g. "h-80". */
  className?: string;
}

// Read once at module load — the key is a build-time env var (see docs/ADR.md).
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function centroid(markers: MapMarker[]): GeoLocation {
  if (markers.length === 0) return { lat: 44.5, lng: 31 }; // central Black Sea
  const sum = markers.reduce(
    (acc, m) => ({ lat: acc.lat + m.location.lat, lng: acc.lng + m.location.lng }),
    { lat: 0, lng: 0 },
  );
  return { lat: sum.lat / markers.length, lng: sum.lng / markers.length };
}

/**
 * Google Map with a pin per stock. When no API key is configured the map can't
 * load, so we render an informative fallback that still lets the user navigate
 * to each stock — the app stays fully usable without a key (see docs/ADR.md →
 * "Google Maps API key is exposed").
 */
export function StockMap({ markers, center, zoom = 6, onSelect, className }: StockMapProps) {
  if (!apiKey) {
    return <MapFallback markers={markers} onSelect={onSelect} className={className} />;
  }

  return (
    <div className={cn('overflow-hidden rounded-card border border-surface-border', className)}>
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={center ?? centroid(markers)}
          defaultZoom={zoom}
          gestureHandling="greedy"
          style={{ width: '100%', height: '100%' }}
        >
          {markers.map((m) => (
            <Marker
              key={m.id}
              position={m.location}
              title={m.name}
              onClick={onSelect ? () => onSelect(m.id) : undefined}
            />
          ))}
        </Map>
      </APIProvider>
    </div>
  );
}

function MapFallback({ markers, onSelect, className }: StockMapProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-card border border-dashed ' +
          'border-surface-border bg-surface-muted p-6 text-center',
        className,
      )}
    >
      <PinIcon />
      <div>
        <p className="text-sm font-medium text-ink">Map preview unavailable</p>
        <p className="mt-0.5 max-w-sm text-xs text-ink-muted">
          Set <code className="rounded bg-surface px-1">VITE_GOOGLE_MAPS_API_KEY</code> to render
          the interactive Google Map.
        </p>
      </div>
      {markers.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {markers.map((m) =>
            onSelect ? (
              <Button key={m.id} size="sm" variant="secondary" onClick={() => onSelect(m.id)}>
                {m.name}
              </Button>
            ) : (
              <span key={m.id} className="text-xs text-ink-subtle">
                {m.name} · {m.location.lat.toFixed(3)}, {m.location.lng.toFixed(3)}
              </span>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function PinIcon() {
  return (
    <svg
      className="h-8 w-8 text-ink-subtle"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
      />
    </svg>
  );
}
