/**
 * Utility functions for module synchronization after payment
 */

import { getModulesForTier } from '../config/tierFeatures';

/**
 * Check if modules have been activated (payment confirmed)
 * @param {Array} currentModules - Current modules from plan
 * @param {string} currentTier - Current tier from plan
 * @param {Array} previousModules - Previous modules (optional, for comparison)
 * @returns {Object} - { activated: boolean, tierChanged: boolean, moduleCount: number }
 */
export const checkModuleActivation = (currentModules, currentTier, previousModules = []) => {
  if (!Array.isArray(currentModules)) {
    return { activated: false, tierChanged: false, moduleCount: 0, error: 'Invalid currentModules' };
  }

  const expectedModules = getModulesForTier(currentTier) || [];
  const moduleCount = currentModules.length;
  
  // Check if we have at least the expected modules for the tier
  const hasExpectedModules = expectedModules.every(module => 
    currentModules.includes(module)
  );
  
  // Check if modules changed from previous state
  const modulesChanged = previousModules.length > 0 && 
    !arraysEqual(currentModules, previousModules);
  
  // For Foundation tier (6 modules), check if we have at least 6
  // For Operations (12), check if we have at least 12, etc.
  const tierModuleCounts = {
    foundation: 6,
    operations: 12,
    automated: 15,
    enterprise: 16 // includes calendar
  };
  
  const expectedCount = tierModuleCounts[currentTier] || 0;
  const hasMinimumModules = moduleCount >= expectedCount;
  
  return {
    activated: hasExpectedModules && hasMinimumModules,
    tierChanged: modulesChanged || (previousModules.length === 0 && moduleCount > 0),
    moduleCount,
    expectedCount,
    hasExpectedModules,
    hasMinimumModules
  };
};

/**
 * Compare two arrays for equality (order-independent)
 */
export const arraysEqual = (arr1, arr2) => {
  if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false;
  if (arr1.length !== arr2.length) return false;
  
  const sorted1 = [...arr1].sort();
  const sorted2 = [...arr2].sort();
  
  return sorted1.every((item, index) => item === sorted2[index]);
};

/**
 * Get tier from module count (fallback logic)
 */
export const estimateTierFromModules = (modules) => {
  if (!Array.isArray(modules)) return 'foundation';
  
  const count = modules.length;
  if (count >= 15) return 'automated';
  if (count >= 12) return 'operations';
  if (count >= 6) return 'foundation';
  return 'foundation';
};

export default {
  checkModuleActivation,
  arraysEqual,
  estimateTierFromModules
};