import { useCallback, useEffect, useState, type DependencyList } from 'react';

export interface AsyncState<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
  /** Re-run the factory (e.g. after a mutation) without changing deps. */
  reload: () => void;
}

/**
 * Run an async factory (typically an API call) and expose its loading / error /
 * data state to a component. Re-runs when `deps` change; stale results from a
 * superseded run are discarded. Pages use this to talk to the simulated API
 * without each re-implementing the same effect boilerplate.
 */
export function useAsync<T>(factory: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(undefined);

    factory()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // `factory` is intentionally excluded — callers pass an inline closure, and
    // `deps` is the explicit re-run key (plus `nonce` for manual reloads).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { data, error, loading, reload };
}
