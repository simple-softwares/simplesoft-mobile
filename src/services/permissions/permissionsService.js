import axios from 'axios';
import { PROVISION_BASE } from '../../config';

class PermissionsService {
  /**
   * Fetch all employees with their permissions
   * @param {string} slug - Workspace slug (db name)
   */
  async getEmployeePermissions(slug) {
    try {
      const res = await axios.get(
        `${PROVISION_BASE}/api/workspace/${slug}/employees/permissions`,
        { timeout: 10000 }
      );
      return res.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update employee's enabled modules
   * @param {string} slug - Workspace slug
   * @param {number} employeeId - HR employee ID
   * @param {array} modules - Array of module keys: ["ai", "crm", "sales"]
   */
  async updateEmployeeModules(slug, employeeId, modules) {
    try {
      const res = await axios.post(
        `${PROVISION_BASE}/api/workspace/${slug}/employee/${employeeId}/permissions`,
        { enabled_modules: modules },
        { timeout: 10000 }
      );
      return res.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update employee's enabled features
   * @param {string} slug - Workspace slug
   * @param {number} employeeId - HR employee ID
   * @param {array} features - Array of feature keys: ["whatsapp", "email"]
   */
  async updateEmployeeFeatures(slug, employeeId, features) {
    try {
      const res = await axios.post(
        `${PROVISION_BASE}/api/workspace/${slug}/employee/${employeeId}/permissions`,
        { enabled_features: features },
        { timeout: 10000 }
      );
      return res.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all available modules and features
   */
  getAvailableModules() {
    return [
      { key: 'ai', label: 'AI & Automation', icon: 'sparkles-outline', color: '#7C3AED' },
      { key: 'crm', label: 'CRM', icon: 'trending-up-outline', color: '#E91E63' },
      { key: 'sales', label: 'Sales', icon: 'cash-outline', color: '#FF9800' },
      { key: 'hr', label: 'HR & Payroll', icon: 'people-outline', color: '#2196F3' },
      { key: 'attendance', label: 'Attendance', icon: 'time-outline', color: '#009688' },
      { key: 'inventory', label: 'Inventory', icon: 'cube-outline', color: '#795548' },
      { key: 'projects', label: 'Projects', icon: 'folder-outline', color: '#3F51B5' },
      { key: 'tasks', label: 'Tasks', icon: 'checkbox-outline', color: '#4CAF50' },
      { key: 'contacts', label: 'Contacts', icon: 'people-circle-outline', color: '#00BCD4' },
      { key: 'chat', label: 'Chat & Messaging', icon: 'chatbubbles-outline', color: '#9C27B0' },
      { key: 'files', label: 'Files & Storage', icon: 'document-outline', color: '#607D8B' },
      { key: 'performance', label: 'Performance', icon: 'bar-chart-outline', color: '#F57C00' },
      { key: 'automation', label: 'Automation', icon: 'flash-outline', color: '#FFB300' },
      { key: 'notes',     label: 'Notes',    icon: 'document-text-outline', color: '#78909C' },
      { key: 'settings',  label: 'Settings', icon: 'settings-outline',      color: '#546E7A' },
    ];
  }

  getAvailableFeatures() {
    return [
      { key: 'whatsapp', label: 'WhatsApp Integration', icon: 'logo-whatsapp' },
      { key: 'email', label: 'Email', icon: 'mail-outline' },
      { key: 'video_call', label: 'Video Calls', icon: 'videocam-outline' },
      { key: 'sms', label: 'SMS Gateway', icon: 'call-outline' },
      { key: 'api_webhooks', label: 'API & Webhooks', icon: 'code-outline' },
    ];
  }
}

export default new PermissionsService();
