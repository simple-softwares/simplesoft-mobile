import axios from 'axios';
import { ADMIN_PROVISION_BASE, ADMIN_PROVISION_SECRET } from '../../config';

const PROVISION_BASE = ADMIN_PROVISION_BASE;
const PROVISION_SECRET = ADMIN_PROVISION_SECRET;

const headers = {
  'X-Provision-Secret': PROVISION_SECRET,
  'Content-Type': 'application/json',
};

class AdminService {
  /**
   * Fetch all workspaces with their tier information.
   * Admin-only endpoint.
   */
  async getAllWorkspaces() {
    try {
      const res = await axios.get(`${PROVISION_BASE}/api/admin/workspaces`, {
        headers,
        timeout: 15000,
      });
      return res.data.workspaces || [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Change a workspace's tier.
   * @param {string} slug - Workspace slug
   * @param {string} tier - 'foundation', 'operations', 'automated', or 'enterprise'
   * @param {string} endDate - Optional end date (ISO format)
   * @param {string} reason - Optional reason for change
   */
  async changeTier(slug, tier, endDate = null, reason = null) {
    try {
      const res = await axios.patch(
        `${PROVISION_BASE}/api/admin/workspace/${slug}/tier`,
        { tier, end_date: endDate, reason },
        { headers, timeout: 15000 }
      );
      return res.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Activate a suspended workspace.
   * @param {string} slug - Workspace slug
   */
  async activate(slug) {
    try {
      const res = await axios.post(
        `${PROVISION_BASE}/api/admin/workspace/${slug}/activate`,
        {},
        { headers, timeout: 15000 }
      );
      return res.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Deactivate/suspend a workspace.
   * @param {string} slug - Workspace slug
   */
  async deactivate(slug) {
    try {
      const res = await axios.post(
        `${PROVISION_BASE}/api/admin/workspace/${slug}/deactivate`,
        {},
        { headers, timeout: 15000 }
      );
      return res.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get workspace count by tier.
   * @param {Array} workspaces - List of workspaces
   */
  getWorkspaceCountByTier(workspaces) {
    const counts = {
      foundation: 0,
      operations: 0,
      automated: 0,
      enterprise: 0,
      suspended: 0,
    };

    workspaces.forEach(ws => {
      if (ws.status === 'suspended') {
        counts.suspended++;
      } else if (ws.subscription?.tier) {
        counts[ws.subscription.tier]++;
      }
    });

    return counts;
  }

  /**
   * Get total monthly recurring revenue from active subscriptions.
   * @param {Array} workspaces - List of workspaces
   */
  calculateMRR(workspaces) {
    return workspaces.reduce((total, ws) => {
      if (ws.status === 'active' && ws.subscription) {
        // Each tier has a fixed monthly price
        const tierPrices = {
          foundation: 0,
          operations: 599,
          automated: 999,
          enterprise: 0, // custom pricing
        };
        return total + (tierPrices[ws.subscription.tier] || 0);
      }
      return total;
    }, 0);
  }

  /**
   * Format tier info for display.
   */
  getTierLabel(tier) {
    const labels = {
      foundation: 'Foundation',
      operations: 'Operations',
      automated: 'Automated',
      enterprise: 'Enterprise',
    };
    return labels[tier] || tier;
  }

  /**
   * Get tier color for badge.
   */
  getTierColor(tier) {
    const colors = {
      foundation: '#9E9E9E', // grey
      operations: '#2196F3', // blue
      automated: '#9C27B0', // purple
      enterprise: '#FF9800', // orange
    };
    return colors[tier] || '#757575';
  }
}

export default new AdminService();
