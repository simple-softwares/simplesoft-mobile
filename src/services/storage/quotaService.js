/**
 * Storage Quota Service
 * Manages file storage limits per tier
 * Tracks usage and prevents uploads if quota exceeded
 */

import axios from 'axios';
import { PROVISION_BASE } from '../../config';

class StorageQuotaService {
  /**
   * Get storage quota for current workspace
   * Returns: { limit_gb, used_gb, available_gb, percentage_used }
   */
  async getStorageQuota(slug) {
    try {
      const res = await axios.get(`${PROVISION_BASE}/api/workspace/${slug}/storage/quota`, {
        timeout: 10000
      });
      return res.data;
    } catch (error) {
      return {
        limit_gb: 2,
        used_gb: 0,
        available_gb: 2,
        percentage_used: 0
      };
    }
  }

  /**
   * Get file count and size breakdown by category
   * Returns: { documents: {count, size_gb}, images: {...}, videos: {...}, total: {...} }
   */
  async getStorageBreakdown(slug) {
    try {
      const res = await axios.get(`${PROVISION_BASE}/api/workspace/${slug}/storage/breakdown`, {
        timeout: 10000
      });
      return res.data;
    } catch (error) {
      return { documents: { count: 0, size_gb: 0 }, images: { count: 0, size_gb: 0 }, videos: { count: 0, size_gb: 0 }, other: { count: 0, size_gb: 0 } };
    }
  }

  /**
   * Check if file can be uploaded (won't exceed quota)
   * @param {number} fileSizeBytes - Size of file to upload
   * @param {number} limitGb - Storage limit in GB
   * @param {number} usedGb - Current used storage in GB
   * @returns {object} { allowed: bool, reason: string }
   */
  canUploadFile(fileSizeBytes, limitGb, usedGb) {
    const fileSizeGb = fileSizeBytes / (1024 * 1024 * 1024);
    const availableGb = limitGb - usedGb;

    if (fileSizeGb > availableGb) {
      return {
        allowed: false,
        reason: `File size (${this.formatGB(fileSizeGb)}) exceeds available space (${this.formatGB(availableGb)})`,
      };
    }

    if (usedGb + fileSizeGb > limitGb) {
      return {
        allowed: false,
        reason: `Upload would exceed quota. Available: ${this.formatGB(availableGb)}, File size: ${this.formatGB(fileSizeGb)}`,
      };
    }

    return { allowed: true, reason: '' };
  }

  /**
   * Calculate usage percentage
   */
  getUsagePercentage(usedGb, limitGb) {
    if (!limitGb) return 0;
    return Math.round((usedGb / limitGb) * 100);
  }

  /**
   * Check if user is approaching quota warning threshold (80%)
   */
  isApproachingQuota(usedGb, limitGb, threshold = 0.8) {
    if (!limitGb) return false;
    return (usedGb / limitGb) >= threshold;
  }

  /**
   * Format bytes to GB with 2 decimal places
   */
  formatGB(gb) {
    return `${gb.toFixed(2)} GB`;
  }

  /**
   * Format bytes to human-readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get storage status message for display
   */
  getStorageStatus(usedGb, limitGb) {
    if (!limitGb) {
      return { status: 'unlimited', message: 'Unlimited storage' };
    }

    const percentage = this.getUsagePercentage(usedGb, limitGb);
    const availableGb = limitGb - usedGb;

    if (percentage >= 95) {
      return {
        status: 'critical',
        message: `${percentage}% full - ${this.formatGB(availableGb)} remaining`,
      };
    } else if (percentage >= 80) {
      return {
        status: 'warning',
        message: `${percentage}% full - ${this.formatGB(availableGb)} remaining`,
      };
    } else if (percentage >= 50) {
      return {
        status: 'moderate',
        message: `${percentage}% full - ${this.formatGB(availableGb)} remaining`,
      };
    }

    return {
      status: 'ok',
      message: `${percentage}% full - ${this.formatGB(availableGb)} available`,
    };
  }
}

export default new StorageQuotaService();
