/**
 * useTasks — Data-fetching hook for tasks
 *
 * Usage:
 *   const { tasks, loading, error, refreshing, refresh } = useTasks(userId);
 *   const { tasks, loading } = useTasks(userId, { limit: 50 });
 */

import { useCallback } from 'react';
import useQuery from './useQuery';
import ProjectService from '../services/project/projectService';

/**
 * Fetch tasks for a user
 * @param {number} userId User ID
 * @param {object} opts { limit?, forceRefresh? }
 * @returns {object} { tasks, loading, error, refreshing, refresh, reload }
 */
export const useTasks = (userId, opts = {}) => {
  const fetchFn = useCallback(async () => {
    return ProjectService.getMyTasks(userId, opts.limit || 100);
  }, [userId, opts.limit]);

  const { data, ...rest } = useQuery(
    `tasks-${userId}`,
    fetchFn,
    [userId, opts.limit],
    { initialData: [] }
  );

  return {
    tasks: data,
    ...rest,
  };
};

export default useTasks;
