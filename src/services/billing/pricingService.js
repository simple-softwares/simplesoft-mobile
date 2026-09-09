/**
 * Pricing Service - Fetches plan and module pricing from backend
 *
 * All pricing data is now centralized on the backend (Odoo).
 * This service caches the pricing data in MMKV to reduce API calls.
 *
 * Usage:
 *   import PricingService from '../services/billing/pricingService';
 *   const plans = await PricingService.getPlans();
 *   const modules = await PricingService.getModules();
 */

import axios from 'axios';
import { syncStorage } from '../storage/storageRegistry';
import { PROVISION_BASE } from '../../config';

const CACHE_TTL = 3600000; // 1 hour in milliseconds
const CACHE_KEYS = {
  PLANS: 'pricing:plans',
  MODULES: 'pricing:modules',
  PRICING: 'pricing:all',
  ADDONS: 'pricing:addons',
};

/**
 * Direct axios instance for billing API (bypasses workspace auth/baseURL)
 * Uses provision.simplesoft.co.in as server, not workspace.simplesoft.co.in
 */
const billingClient = axios.create({
  baseURL: PROVISION_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

class PricingService {
  /**
   * Get all available plans with pricing and features
   *
   * Calls: GET https://provision.simplesoft.co.in/api/billing/plans
   *
   * @param {boolean} skipCache - If true, bypass MMKV cache and fetch fresh from API
   */
  async getPlans(skipCache = false) {
    if (!skipCache) {
      const cached = this._getCache(CACHE_KEYS.PLANS);
      if (cached) return cached;
    }

    try {
      const response = await billingClient.get('/api/billing/plans');
      const plans = response.data?.plans || [];
      this._setCache(CACHE_KEYS.PLANS, plans);
      return plans;
    } catch (error) {
      return this._getDefaultPlans();
    }
  }

  /**
   * Get a specific plan by code
   *
   * Calls: GET https://provision.simplesoft.co.in/api/billing/plan/{code}
   */
  async getPlan(planCode) {
    const plans = await this.getPlans();
    return plans.find(p => p.code === planCode);
  }

  /**
   * Get all available modules with pricing
   * If planCode specified, only returns modules available for that plan
   *
   * Calls: GET https://provision.simplesoft.co.in/api/billing/modules?plan_code={code}
   *
   * @param {string} planCode - Optional: filter modules available for this plan
   * @param {boolean} skipCache - If true, bypass MMKV cache and fetch fresh from API
   */
  async getModules(planCode = null, skipCache = false) {
    const cacheKey = planCode ? `${CACHE_KEYS.MODULES}:${planCode}` : CACHE_KEYS.MODULES;

    if (!skipCache) {
      const cached = this._getCache(cacheKey);
      if (cached) return cached;
    }

    try {
      const params = planCode ? { plan_code: planCode } : {};
      const response = await billingClient.get('/api/billing/modules', { params });
      const modules = response.data?.modules || [];
      this._setCache(cacheKey, modules);
      return modules;
    } catch (error) {
      return this._getDefaultModules();
    }
  }

  /**
   * Get all pricing info (tiers + modules) in one call
   * Useful for signup and pricing pages
   *
   * Calls: GET https://provision.simplesoft.co.in/api/billing/pricing
   *
   * @param {boolean} skipCache - If true, bypass MMKV cache and fetch fresh from API
   */
  async getAllPricing(skipCache = false) {
    if (!skipCache) {
      const cached = this._getCache(CACHE_KEYS.PRICING);
      if (cached) return cached;
    }

    try {
      const response = await billingClient.get('/api/billing/pricing');
      const pricing = {
        tiers: response.data?.tiers || {},
        modules: response.data?.modules || [],
      };
      this._setCache(CACHE_KEYS.PRICING, pricing);
      return pricing;
    } catch (error) {
      return {
        tiers: this._getDefaultTierPricing(),
        modules: this._getDefaultModules(),
      };
    }
  }

  /**
   * Get tier pricing specifically
   *
   * Calls: GET https://provision.simplesoft.co.in/api/config/tiers
   *
   * @param {boolean} skipCache - If true, bypass MMKV cache and fetch fresh from API
   */
  async getTierPricing(skipCache = true) {
    // skipCache defaults to true - always get fresh tier pricing
    if (!skipCache) {
      const cached = this._getCache(CACHE_KEYS.PLANS);
      if (cached) return cached;
    }

    try {
      const response = await billingClient.get('/api/config/tiers');
      const tiers = response.data?.tiers || {};
      if (!skipCache) {
        this._setCache(CACHE_KEYS.PLANS, tiers);
      }
      return tiers;
    } catch (error) {
      return this._getDefaultTierPricing();
    }
  }

  /**
   * Get all available add-ons (WhatsApp, Telecalling, Field Tracking, etc.)
   *
   * Calls: GET https://provision.simplesoft.co.in/api/config/addons
   *
   * @param {boolean} skipCache - If true, bypass MMKV cache and fetch fresh from API
   */
  async getAddons(skipCache = false) {
    if (!skipCache) {
      const cached = this._getCache(CACHE_KEYS.ADDONS);
      if (cached) return cached;
    }

    try {
      // Fetch addons from /api/config/app which includes all_addons
      const response = await billingClient.get('/api/config/app');
      const addons = response.data?.all_addons || [];
      this._setCache(CACHE_KEYS.ADDONS, addons);
      return addons;
    } catch (error) {
      return this._getDefaultAddons();
    }
  }

  /**
   * Subscribe to selected modules (new modular pricing model)
   *
   * Calls: POST https://provision.simplesoft.co.in/api/workspace/{slug}/subscribe
   *
   * @param {string} slug - Workspace slug
   * @param {string[]} modules - Array of module keys (e.g., ['crm', 'inventory', 'ai'])
   * @param {number} months - Number of months to subscribe for (default: 1)
   *
   * Returns: {success, payment_id, total_monthly, total_amount, modules, upi_url}
   */
  async subscribeModules(slug, modules, months = 1) {
    try {
      const response = await billingClient.post(`/api/workspace/${slug}/subscribe`, {
        modules,
        months,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get current subscription details
   *
   * Calls: GET https://provision.simplesoft.co.in/api/workspace/{slug}/subscription
   *
   * @param {string} slug - Workspace slug
   *
   * Returns: {success, plan, selected_modules, total_monthly, state, expires_at, modules_detail}
   */
  async getSubscription(slug) {
    try {
      const response = await billingClient.get(`/api/workspace/${slug}/subscription`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Add a module to existing subscription (mid-cycle)
   *
   * Calls: POST https://provision.simplesoft.co.in/api/workspace/{slug}/subscription/add-module
   *
   * @param {string} slug - Workspace slug
   * @param {string} moduleKey - Module key to add (e.g., 'crm')
   * @param {number} months - Months to commit for this module (default: 1)
   *
   * Returns: {success, payment_id, new_module, prorated_charge, upi_url}
   */
  async addModule(slug, moduleKey, months = 1) {
    try {
      const response = await billingClient.post(
        `/api/workspace/${slug}/subscription/add-module`,
        { module_key: moduleKey, months }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Remove a module from subscription (effective at next renewal)
   *
   * Calls: POST https://provision.simplesoft.co.in/api/workspace/{slug}/subscription/remove-module
   *
   * @param {string} slug - Workspace slug
   * @param {string} moduleKey - Module key to remove
   *
   * Returns: {success, module_removed, effective_from, remaining_modules}
   */
  async removeModule(slug, moduleKey) {
    try {
      const response = await billingClient.post(
        `/api/workspace/${slug}/subscription/remove-module`,
        { module_key: moduleKey }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Confirm a pending payment and activate subscription
   *
   * Calls: POST https://provision.simplesoft.co.in/api/workspace/{slug}/payment/{payment_id}/confirm
   *
   * @param {string} slug - Workspace slug
   * @param {number} paymentId - Payment ID to confirm
   *
   * Returns: {success, payment_id, message, plan}
   */
  async confirmPayment(slug, paymentId) {
    try {
      const response = await billingClient.post(
        `/api/workspace/${slug}/payment/${paymentId}/confirm`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get payment history for a workspace
   *
   * Calls: GET https://provision.simplesoft.co.in/api/workspace/{slug}/payments
   *
   * @param {string} slug - Workspace slug
   *
   * Returns: {success, payments: [{id, amount, status, payment_date, method, ...}]}
   */
  async getPayments(slug) {
    try {
      const response = await billingClient.get(`/api/workspace/${slug}/payments`);
      return response.data?.payments || [];
    } catch (error) {
      // Return empty array if payments endpoint doesn't exist
      return [];
    }
  }

  /**
   * Clear pricing cache to force refresh
   */
  clearCache() {
    syncStorage.delete(CACHE_KEYS.PLANS);
    syncStorage.delete(CACHE_KEYS.MODULES);
    syncStorage.delete(CACHE_KEYS.PRICING);
    syncStorage.delete(CACHE_KEYS.ADDONS);
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

  // ── Default fallback data ────────────────────────────────────

  _getDefaultPlans() {
    // All plans come from server (/api/billing/plans)
    return [];
  }

  _getDefaultTierPricing() {
    // All tier pricing comes from server (/api/config/tiers)
    // Return empty object on API failure to prevent crashes
    return {};
  }

  _getDefaultModules() {
    // All modules come from server (/api/billing/modules)
    return [];
  }

  _getDefaultAddons() {
    // All add-ons come from server (/api/config/addons)
    // Return empty array on API failure
    return [];
  }
}

export default new PricingService();
