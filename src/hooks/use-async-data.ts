"use client";

import * as React from "react";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Tiny data-fetching hook with loading/error states and a refetch.
 * Keeps the demo dependency-light; swap for TanStack Query in production.
 */
export function useAsyncData<T>(fetcher: () => Promise<T>, deps: React.DependencyList = []) {
  const [state, setState] = React.useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetcherRef = React.useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = React.useCallback(() => {
    let active = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetcherRef
      .current()
      .then((data) => active && setState({ data, loading: false, error: null }))
      .catch((error) => active && setState({ data: null, loading: false, error }));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  React.useEffect(() => load(), [load]);

  return { ...state, refetch: load } as AsyncState<T> & { refetch: () => void };
}
