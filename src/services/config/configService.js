/**
 * Configuration Service - Fetches all app configuration from server
 *
 * Server is the single source of truth for:
 * - All tier information (pricing, storage limits, features)
 * - All available modules
 * - Module-to-tier mapping
 * - Feature matrix
 * - All system configuration
 *
 * This eliminates all hardcoding in the mobile app.
 *
 * Usage:
 *   import ConfigService from '../services/config/configService';
 *   const config = await ConfigService.getAppConfig();
 */

import axios from 'axios';
import { syncStorage } from '../storage/storageRegistry';
import { PROVISION_BASE } from '../../config';

const CACHE_TTL = 3600000; // 1 hour in milliseconds
const CACHE_KEYS = {
  APP_CONFIG: 'config:app',
  TIERS: 'config:tiers',
  MODULES: 'config:modules',
};

const configClient = axios.create({
  baseURL: PROVISION_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

class ConfigService {
  /**
   * Get complete app configuration from server
   * Includes: tiers, modules, feature matrix, limits, feature flags
   *
   * Calls: GET https://provision.simplesoft.co.in/api/config/app
   *
   * @param {boolean} skipCache - If true, bypass cache and fetch fresh from API
   */
  async getAppConfig(skipCache = true) {
    // skipCache defaults to true - always get fresh config
    if (!skipCache) {
      const cached = this._getCache(CACHE_KEYS.APP_CONFIG);
      if (cached) return cached;
    }

    try {
      const response = await configClient.get('/api/config/app');
      const config = response.data;

      if (!skipCache) {
        this._setCache(CACHE_KEYS.APP_CONFIG, config);
      }

      return config;
    } catch (error) {
      return this._getDefaultConfig();
    }
  }

  /**
   * Get tier configuration specifically
   *
   * Calls: GET https://provision.simplesoft.co.in/api/config/tiers
   *
   * @param {boolean} skipCache - If true, bypass cache and fetch fresh from API
   */
  async getTiersConfig(skipCache = true) {
    if (!skipCache) {
      const cached = this._getCache(CACHE_KEYS.TIERS);
      if (cached) return cached;
    }

    try {
      const response = await configClient.get('/api/config/tiers');
      const tiers = response.data?.tiers || {};

      if (!skipCache) {
        this._setCache(CACHE_KEYS.TIERS, tiers);
      }

      return tiers;
    } catch (error) {
      return this._getDefaultTiers();
    }
  }

  /**
   * Get module configuration with tier mapping
   *
   * Calls: GET https://provision.simplesoft.co.in/api/config/modules
   *
   * @param {boolean} skipCache - If true, bypass cache and fetch fresh from API
   */
  async getModulesConfig(skipCache = true) {
    if (!skipCache) {
      const cached = this._getCache(CACHE_KEYS.MODULES);
      if (cached) return cached;
    }

    try {
      const response = await configClient.get('/api/config/modules');
      const config = {
        all_modules: response.data?.all_modules || [],
        tiers: response.data?.tiers || {},
      };

      if (!skipCache) {
        this._setCache(CACHE_KEYS.MODULES, config);
      }

      return config;
    } catch (error) {
      return this._getDefaultModulesConfig();
    }
  }

  /**
   * Clear all config cache to force refresh
   */
  clearCache() {
    syncStorage.delete(CACHE_KEYS.APP_CONFIG);
    syncStorage.delete(CACHE_KEYS.TIERS);
    syncStorage.delete(CACHE_KEYS.MODULES);
  }

  // ── Cache utilities ──────────────────────────────────────────

  _getCache(key) {
    try {
      const cached = syncStorage.getString(key);
      if (!cached) return null;

      const data = JSON.parse(cached);
      const now = Date.now();
      if (data.expires && now > data.expires) {
        syncStorage.delete(key);
        return null;
      }
      return data.value;
    } catch (e) {
      return null;
    }
  }

  _setCache(key, value) {
    try {
      const data = {
        value,
        expires: Date.now() + CACHE_TTL,
      };
      syncStorage.set(key, JSON.stringify(data));
    } catch (e) {
    }
  }

  // ── Default fallback config ──────────────────────────────────

  _getDefaultConfig() {
    return {
      success: true,
      tiers: this._getDefaultTiers(),
      all_modules: this._getDefaultModules(),
      feature_matrix: {},
      limits: {
        max_file_size_mb: 500,
        max_workspace_name_length: 50,
        max_project_name_length: 100,
      },
      features: {
        enable_payments: true,
        enable_trials: true,
        enable_custom_plans: false,
      },
    };
  }

  _getDefaultTiers() {
    return {
      foundation: {
        name: 'Foundation',
        description: 'Core features for admin only',
        monthly: 0,
        annual: 0,
        discount_percent: 0,
        storage_limit_gb: 2,
        max_users: 1,
        max_projects: 5,
        features: ['tasks', 'projects', 'notes', 'contacts', 'chat', 'files'],
      },
      operations: {
        name: 'Operations',
        description: 'Advanced tools for team collaboration. CRM, Sales, HR modules included.',
        monthly: 599,
        annual: 5390,
        discount_percent: 10,
        storage_limit_gb: 5,
        max_users: -1,
        max_projects: -1,
        features: ['tasks', 'projects', 'notes', 'contacts', 'chat', 'files', 'crm', 'sales', 'hr', 'attendance', 'inventory'],
      },
      automated: {
        name: 'Automated',
        description: 'Everything plus AI and automation',
        monthly: 999,
        annual: 8991,
        discount_percent: 25,
        storage_limit_gb: 50,
        max_users: -1,
        max_projects: -1,
        features: ['tasks', 'projects', 'notes', 'contacts', 'chat', 'files', 'crm', 'sales', 'hr', 'attendance', 'inventory', 'ai', 'automation', 'performance'],
      },
      enterprise: {
        name: 'Enterprise',
        description: 'Custom solutions for large organizations',
        monthly: null,
        annual: null,
        discount_percent: 0,
        storage_limit_gb: null,
        max_users: -1,
        max_projects: -1,
        features: [],
      },
    };
  }

  _getDefaultModules() {
    return [
      { key: 'tasks', name: 'Tasks', description: 'Task management, checklists, and collaboration', icon: 'checkbox-outline', color: '#2196F3', category: 'other', price: 0, is_free_builtin: true },
      { key: 'projects', name: 'Projects', description: 'Project planning and tracking', icon: 'briefcase-outline', color: '#FF6B6B', category: 'other', price: 0, is_free_builtin: true },
      { key: 'contacts', name: 'Contacts', description: 'Contact management and directory', icon: 'people-outline', color: '#FF9800', category: 'other', price: 0, is_free_builtin: true },
      { key: 'notes', name: 'Notes', description: 'Rich text notes and documentation', icon: 'document-text-outline', color: '#4CAF50', category: 'other', price: 0, is_free_builtin: true },
      { key: 'teams', name: 'Teams', description: 'Team management and workspace organization', icon: 'shield-outline', color: '#9C27B0', category: 'other', price: 0, is_free_builtin: true },
      { key: 'crm', name: 'CRM', description: 'Customer relationship management', icon: 'person-circle-outline', color: '#E91E63', category: 'sales', price: 499 },
      { key: 'sales', name: 'Sales', description: 'Sales pipeline and order management', icon: 'trending-up-outline', color: '#00BCD4', category: 'sales', price: 399 },
      { key: 'hr', name: 'HR', description: 'Human resources and employee management', icon: 'school-outline', color: '#673AB7', category: 'hr', price: 399 },
      { key: 'inventory', name: 'Inventory', description: 'Stock and inventory management', icon: 'cube-outline', color: '#3F51B5', category: 'operations', price: 299 },
      { key: 'accounting', name: 'Accounting', description: 'Invoicing, expenses, and financial reports', icon: 'calculator-outline', color: '#1976D2', category: 'finance', price: 599 },
      { key: 'ai', name: 'AI Assistant', description: 'AI-powered suggestions and automation', icon: 'sparkles', color: '#7C3AED', category: 'services', price: 1999 },
    ];
  }

  _getDefaultModulesConfig() {
    return {
      all_modules: this._getDefaultModules(),
      tiers: {
        foundation: {
          name: 'Foundation',
          enabled_modules: ['tasks', 'projects', 'notes', 'contacts', 'chat', 'files'],
          storage_limit_gb: 2,
          monthly_price: 0,
          annual_price: 0,
        },
        operations: {
          name: 'Operations',
          enabled_modules: ['tasks', 'projects', 'notes', 'contacts', 'chat', 'files', 'crm', 'sales', 'hr', 'attendance', 'inventory'],
          storage_limit_gb: 5,
          monthly_price: 599,
          annual_price: 5390,
        },
      },
    };
  }
}

export default new ConfigService();
