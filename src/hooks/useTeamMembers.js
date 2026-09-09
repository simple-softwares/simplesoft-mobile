/**
 * useTeamMembers — Data-fetching hook for team members
 *
 * Usage:
 *   const { members, loading, error, refreshing, refresh } = useTeamMembers();
 */

import { useCallback } from 'react';
import useQuery from './useQuery';
import TeamService from '../services/team/teamService';

/**
 * Fetch team members
 * @param {object} opts { forceRefresh? }
 * @returns {object} { members, loading, error, refreshing, refresh, reload }
 */
export const useTeamMembers = (opts = {}) => {
  const fetchFn = useCallback(async () => {
    return TeamService.getMembers(opts.forceRefresh || false);
  }, [opts.forceRefresh]);

  const { data, ...rest } = useQuery(
    'team-members',
    fetchFn,
    [opts.forceRefresh],
    { initialData: [] }
  );

  return {
    members: data,
    ...rest,
  };
};

export default useTeamMembers;
