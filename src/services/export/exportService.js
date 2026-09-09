import httpClient from '../api/httpClient';
import RNFS from 'react-native-fs';

/**
 * Export Service
 *
 * Handles data export operations: manual exports (CSV/XLSX),
 * scheduled export configuration, and test exports.
 */

class ExportService {
  /**
   * Generate an on-demand export file
   *
   * @param {object} payload
   * @param {string} payload.export_type - 'mydata' or 'workspace'
   * @param {string} payload.format - 'csv' or 'xlsx'
   * @param {string} payload.field_scope - 'essential' or 'all'
   * @param {object} payload.sources - { tasks, projects, contacts, notes, members, timesheets, payments }
   * @param {object} payload.date_range - { start: '2026-01-01', end: '2026-12-31' } (optional)
   *
   * @returns {Promise} { filename, file_content (base64), mime_type }
   */
  async exportData(payload) {
    try {
      const response = await httpClient.post('/api/export', payload);
      return response.data;
    } catch (error) {
      throw this._handleError(error, 'Export failed');
    }
  }

  /**
   * Get current scheduled export configuration
   *
   * @returns {Promise} { enabled, day_of_week, hour, minute, field_scope, last_sent_at }
   */
  async getScheduleConfig() {
    try {
      const response = await httpClient.get('/api/export/schedule');
      return response.data;
    } catch (error) {
      throw this._handleError(error, 'Failed to load schedule configuration');
    }
  }

  /**
   * Update scheduled export configuration
   *
   * @param {object} config
   * @param {boolean} config.enabled - Enable/disable scheduled exports
   * @param {string} config.day_of_week - 'monday', 'tuesday', etc.
   * @param {number} config.hour - 0-23
   * @param {number} config.minute - 0-59
   * @param {string} config.field_scope - 'essential' or 'all'
   * @param {string} config.timezone - e.g., 'Asia/Kolkata'
   *
   * @returns {Promise} { success: true }
   */
  async updateScheduleConfig(config) {
    try {
      const response = await httpClient.post('/api/export/schedule', config);
      return response.data;
    } catch (error) {
      throw this._handleError(error, 'Failed to save schedule configuration');
    }
  }

  /**
   * Send test export immediately (admin only)
   *
   * @returns {Promise} { success: true }
   */
  async sendTestExport() {
    try {
      const response = await httpClient.post('/api/export/send-now', {});
      return response.data;
    } catch (error) {
      throw this._handleError(error, 'Test export failed');
    }
  }

  /**
   * Convert base64 file content to a file URL for download
   *
   * @param {string} filename
   * @param {string} fileContent - base64 encoded
   * @param {string} mimeType - e.g., 'text/csv'
   *
   * @returns {string} file:// URI
   */
  async downloadFile(filename, fileContent, mimeType) {
    try {
      // Write file to device storage
      const filePath = `${RNFS.DocumentDirectoryPath}/${filename}`;
      await RNFS.writeFile(filePath, fileContent, 'base64');

      return `file://${filePath}`;
    } catch (error) {
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  /**
   * Parse CSV content into structured data (for testing)
   *
   * @param {string} csvContent - raw CSV text
   * @returns {Array} array of objects per CSV section
   */
  parseCsv(csvContent) {
    const lines = csvContent.split('\n');
    const sections = {};
    let currentSection = null;
    let headers = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      // Check if this is a section header (uppercase, single line)
      if (line === line.toUpperCase() && !line.includes(',')) {
        currentSection = line.toLowerCase();
        sections[currentSection] = [];
      } else if (currentSection) {
        // Parse as CSV row
        if (!headers[currentSection]) {
          // This is the header row
          headers[currentSection] = line.split(',').map(h => h.trim());
        } else {
          // This is a data row
          const values = line.split(',').map(v => v.trim());
          const row = {};
          headers[currentSection].forEach((header, i) => {
            row[header] = values[i] || '';
          });
          sections[currentSection].push(row);
        }
      }
    }

    return sections;
  }

  /**
   * Validate export payload before sending
   *
   * @param {object} payload
   * @throws {Error} if payload is invalid
   */
  validatePayload(payload) {
    const { export_type, format, field_scope, sources } = payload;

    if (!['mydata', 'workspace'].includes(export_type)) {
      throw new Error('Invalid export_type');
    }
    if (!['csv', 'xlsx'].includes(format)) {
      throw new Error('Invalid format');
    }
    if (!['essential', 'all'].includes(field_scope)) {
      throw new Error('Invalid field_scope');
    }
    if (!sources || Object.keys(sources).length === 0) {
      throw new Error('At least one data source must be selected');
    }

    return true;
  }

  /**
   * Handle API errors with user-friendly messages
   */
  _handleError(error, defaultMsg) {
    if (error.response?.status === 403) {
      return new Error('You do not have permission to perform this action');
    }
    if (error.response?.status === 429) {
      return new Error('Rate limit exceeded. Maximum 5 exports per hour.');
    }
    if (error.response?.data?.error) {
      return new Error(error.response.data.error);
    }
    return new Error(error.message || defaultMsg);
  }
}

export default new ExportService();
