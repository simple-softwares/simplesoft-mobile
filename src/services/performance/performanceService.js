import axios from 'axios';
import { PROVISION_BASE } from '../../config';

/**
 * Performance Monitoring Service
 * Handles metrics, badges, and leaderboard API calls to provision server.
 */
class PerformanceService {
  constructor() {
    this.baseUrl = PROVISION_BASE;
  }

  /**
   * Get user's performance metrics for today/recent days
   * @param {string} workspaceSlug - Workspace slug
   * @param {number} userId - Odoo user ID
   * @param {number} days - Number of days back (default: 1)
   * @returns {Promise} {date, metrics{type: count}, trend{type: {value, direction}}}
   */
  async getMetrics(workspaceSlug, userId, days = 1) {
    try {
      const res = await axios.get(
        `${this.baseUrl}/api/performance/metrics/${workspaceSlug}`,
        {
          params: { user_id: userId, days },
          timeout: 8000,
        }
      );
      return res.data.metrics;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Submit a performance metric from mobile app
   * @param {string} workspaceSlug - Workspace slug
   * @param {object} metricData - {metric_type, value, amount, user_id}
   * @returns {Promise} {success, metric_id, metric_type}
   */
  async submitMetric(workspaceSlug, metricData) {
    try {
      const res = await axios.post(
        `${this.baseUrl}/api/performance/metrics/${workspaceSlug}`,
        metricData,
        { timeout: 8000 }
      );
      return res.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user's badges (earned and locked)
   * @param {string} workspaceSlug - Workspace slug
   * @param {number} userId - Odoo user ID
   * @returns {Promise} {earned: [...], locked: [...], total_earned, total_available}
   */
  async getBadges(workspaceSlug, userId) {
    try {
      const res = await axios.get(
        `${this.baseUrl}/api/performance/badges/${workspaceSlug}`,
        {
          params: { user_id: userId },
          timeout: 8000,
        }
      );
      return res.data.badges;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mark badges as shown in mobile app
   * @param {string} workspaceSlug - Workspace slug
   * @param {number} userId - Odoo user ID
   * @param {array} badgeIds - List of badge IDs to mark as shown
   * @returns {Promise} {success, marked_count}
   */
  async markBadgesShown(workspaceSlug, userId, badgeIds) {
    try {
      const res = await axios.post(
        `${this.baseUrl}/api/performance/badges/${workspaceSlug}/mark-shown`,
        { badge_ids: badgeIds },
        {
          params: { user_id: userId },
          timeout: 8000,
        }
      );
      return res.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get workspace leaderboard
   * @param {string} workspaceSlug - Workspace slug
   * @param {number} userId - Current user ID
   * @param {string} period - daily|weekly|monthly (default: weekly)
   * @param {string} metricType - task_completed|contact_reached|deal_closed|note_created
   * @returns {Promise} {period, metric_type, leaderboard: [{rank, user_id, user_name, score, is_you}]}
   */
  async getLeaderboard(workspaceSlug, userId, period = 'weekly', metricType = 'task_completed') {
    try {
      const res = await axios.get(
        `${this.baseUrl}/api/performance/leaderboard/${workspaceSlug}`,
        {
          params: { user_id: userId, period, metric_type: metricType },
          timeout: 8000,
        }
      );
      return res.data.leaderboard;
    } catch (error) {
      throw error;
    }
  }
}

export default new PerformanceService();
