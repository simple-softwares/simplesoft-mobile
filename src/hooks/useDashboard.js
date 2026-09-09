/**
 * useDashboard — Data-fetching hook for dashboard data
 *
 * Usage:
 *   const { stats, tasks, projects, contacts, loading, error, refreshing, refresh } = useDashboard(userId);
 */

import { useCallback } from 'react';
import useQuery from './useQuery';
import DashboardService from '../services/dashboard/dashboardService';

/**
 * Fetch aggregated dashboard data
 * @param {number} userId User ID
 * @returns {object} { stats, tasks, projects, contacts, loading, error, refreshing, refresh, reload }
 */
export const useDashboard = (userId) => {
  const fetchFn = useCallback(async () => {
    return DashboardService.getData(userId);
  }, [userId]);

  const { data, ...rest } = useQuery(
    `dashboard-${userId}`,
    fetchFn,
    [userId],
    {
      initialData: {
        stats: { total: 0, open: 0, overdue: 0, projects: 0 },
        tasks: [],
        projects: [],
        contacts: [],
      },
    }
  );

  return {
    stats: data.stats,
    tasks: data.tasks,
    projects: data.projects,
    contacts: data.contacts,
    ...rest,
  };
};

export default useDashboard;
