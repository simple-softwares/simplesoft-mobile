/**
 * DashboardService — Aggregates dashboard data
 *
 * Previously: 5 inline callOdoo() calls in DashboardScreen
 * Now: Single call to BackendService.getDashboardData()
 *
 * This service is a thin wrapper around the backend, but it's useful for:
 *   - Caching dashboard data
 *   - Logging/analytics
 *   - Error handling and fallbacks
 */

import backend from '../../backend/BackendService';

class DashboardService {

  /**
   * Get aggregated dashboard data for a user
   * @param {number} userId
   * @param {object} workspaceContext - Optional workspace context
   * @returns {Promise<{ stats: object, tasks: Task[], projects: Project[], contacts: Contact[] }>}
   */
  async getData(userId, workspaceContext = null) {
    try {
      return await backend.getDashboardData(userId, workspaceContext);
    } catch (e) {
      console.error('[DashboardService] getData error:', e);
      // Return empty fallback on error
      return {
        stats: { total: 0, open: 0, overdue: 0, projects: 0 },
        tasks: [],
        projects: [],
        contacts: [],
      };
    }
  }

}

export default new DashboardService();
