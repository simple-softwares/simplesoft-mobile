/**
 * Tier access utilities
 * Check feature/module availability based on current tier
 */

import { tierHasModule, getMinTierForModule, TIER_NAMES } from '../config/tierFeatures';

export { tierHasModule, getMinTierForModule, TIER_NAMES };

/**
 * Check if current plan has access to a module
 * @param {string} tier - Current subscription tier
 * @param {string} moduleKey - Module to check access for
 * @returns {boolean} True if tier has access
 */
export const hasModuleAccess = (tier, moduleKey) => {
  if (!tier || !moduleKey) return false;
  return tierHasModule(tier, moduleKey);
};

/**
 * Get upgrade tier needed to access a module
 * @param {string} currentTier - Current subscription tier
 * @param {string} moduleKey - Module to check
 * @returns {string|null} Required tier, or null if already has access
 */
export const getUpgradeTierForModule = (currentTier, moduleKey) => {
  if (hasModuleAccess(currentTier, moduleKey)) {
    return null;
  }

  const minTier = getMinTierForModule(moduleKey);
  return minTier;
};

/**
 * Get human-readable upgrade message
 * @param {string} moduleKey - Module name
 * @param {string} requiredTier - Tier required
 * @returns {string} Message for upgrade prompt
 */
export const getUpgradeMessage = (moduleKey, requiredTier) => {
  const tierName = TIER_NAMES[requiredTier] || requiredTier;
  const moduleDisplay = {
    hr: 'HR & Employees',
    attendance: 'Attendance Tracking',
    crm: 'CRM & Sales',
    inventory: 'Inventory Management',
    sales: 'Field Operations',
    ai: 'AI Assistant',
    automation: 'Custom Automations',
    performance: 'Performance Analytics',
  };

  const display = moduleDisplay[moduleKey] || moduleKey;

  return `${display} is only available in the ${tierName} tier and above. Upgrade your team for access.`;
};

/**
 * List of modules gated behind each tier (for UI reference)
 */
export const TIER_UPGRADES = {
  foundation: {
    locked: ['crm', 'hr', 'attendance', 'inventory', 'sales', 'ai', 'automation', 'performance'],
    label: 'Foundation (Free)',
    hint: 'Upgrade to Operations to unlock team management, CRM, and more.',
  },
  operations: {
    locked: ['ai', 'automation', 'performance'],
    label: 'Operations (₹499/user/mo)',
    hint: 'Upgrade to Automated to unlock AI and advanced automations.',
  },
  automated: {
    locked: [],
    label: 'Automated (₹899/user/mo)',
    hint: 'You have access to all features.',
  },
  enterprise: {
    locked: [],
    label: 'Enterprise (Custom)',
    hint: 'You have access to all features.',
  },
};

/**
 * Track which modules are "locked" for a given tier
 * @param {string} tier
 * @returns {string[]} Array of locked module keys
 */
export const getLockedModules = (tier) => {
  return TIER_UPGRADES[tier]?.locked || [];
};

/**
 * Check if ANY module in an array is locked
 * Useful for showing a badge or lock icon in tab bar
 * @param {string} tier
 * @param {string[]} moduleKeys
 * @returns {boolean}
 */
export const hasLockedModules = (tier, moduleKeys) => {
  const locked = getLockedModules(tier);
  return moduleKeys.some(key => locked.includes(key));
};

export default {
  tierHasModule,
  getMinTierForModule,
  TIER_NAMES,
  hasModuleAccess,
  getUpgradeTierForModule,
  getUpgradeMessage,
  TIER_UPGRADES,
  getLockedModules,
  hasLockedModules,
};
