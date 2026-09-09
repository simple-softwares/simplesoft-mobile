/**
 * useQuery — Universal data-fetching hook with cache-first reads
 *
 * Flow:
 *  1. If a cached result exists for `key`, show it immediately (no spinner)
 *  2. Always attempt a network fetch in the background
 *  3. On success: update cache + state
 *  4. On failure: if cache hit, keep showing cached data silently;
 *                 if no cache, set error state
 *
 * Usage:
 *   const { data, loading, error, refreshing, refresh } = useQuery(
 *     'tasks',
 *     () => backend.getTasks([]),
 *     [userId]
 *   );
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import OfflineStorage from '../services/sync/offlineStorage';

export const useQuery = (key, fetchFn, deps = [], opts = {}) => {
  const [data, setData] = useState(opts.initialData ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  const load = useCallback(
    async (isRefresh = false) => {
      let hasCached = false;
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          // Cache-first: show stale data instantly, skip spinner if cache hit
          const cached = key ? OfflineStorage.getQueryResults(key) : null;
          if (cached !== null && isMountedRef.current) {
            setData(cached);
            setLoading(false);
            hasCached = true;
          } else {
            setLoading(true);
          }
        }
        setError(null);

        const result = await fetchFn();

        if (isMountedRef.current) {
          setData(result);
          setError(null);
          if (key) OfflineStorage.storeQueryResults(key, result, null);
        }
      } catch (e) {
        if (isMountedRef.current) {
          // Keep showing cached data when offline; only surface error if nothing to show
          const cached = key ? OfflineStorage.getQueryResults(key) : null;
          if (cached === null && !hasCached) {
            setError(e.message || 'An error occurred');
          }
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [fetchFn, key]
  );

  useEffect(() => {
    load(false);
  }, [load, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(() => { load(true); }, [load]);

  const reload = useCallback(() => {
    setData(opts.initialData ?? null);
    setError(null);
    load(false);
  }, [load, opts.initialData]);

  return { data, loading, error, refreshing, refresh, reload };
};

export default useQuery;
