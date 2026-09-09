/**
 * useProjects — Data-fetching hook for projects
 *
 * Usage:
 *   const { projects, loading, error, refreshing, refresh } = useProjects();
 *   const { projects, loading } = useProjects({ limit: 50 });
 */

import { useCallback } from 'react';
import useQuery from './useQuery';
import ProjectService from '../services/project/projectService';

/**
 * Fetch projects
 * @param {object} opts { limit? }
 * @returns {object} { projects, loading, error, refreshing, refresh, reload }
 */
export const useProjects = (opts = {}) => {
  const fetchFn = useCallback(async () => {
    return ProjectService.getProjects([], opts.limit || 100);
  }, [opts.limit]);

  const { data, ...rest } = useQuery(
    `projects`,
    fetchFn,
    [opts.limit],
    { initialData: [] }
  );

  return {
    projects: data,
    ...rest,
  };
};

export default useProjects;
