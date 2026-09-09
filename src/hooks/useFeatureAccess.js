import { useState } from 'react';
import { useSelector } from 'react-redux';
import { hasModuleAccess, getUpgradeTierForModule, getUpgradeMessage } from '../utils/tierAccess';

/**
 * Hook to check feature access and handle upgrade prompts
 * Usage:
 *   const { hasAccess, checkAccess } = useFeatureAccess();
 *
 *   if (!hasAccess('crm')) {
 *     return <UpgradePrompt />;
 *   }
 */
export const useFeatureAccess = () => {
  const plan = useSelector(s => s.plan);
  const currentTier = plan?.tier || 'foundation';

  const [upgradePrompt, setUpgradePrompt] = useState({
    visible: false,
    moduleKey: null,
    moduleName: null,
    requiredTier: null,
    currentTier: currentTier,
    message: null,
  });

  /**
   * Check if user has access to a feature
   * @param {string} moduleKey - Module to check
   * @returns {boolean}
   */
  const checkAccess = (moduleKey) => {
    return hasModuleAccess(currentTier, moduleKey);
  };

  /**
   * Attempt to access a feature
   * Shows upgrade prompt if no access
   * @param {string} moduleKey - Module key
   * @param {string} moduleName - Display name for prompt
   * @returns {boolean} True if has access, false if locked
   */
  const tryAccess = (moduleKey, moduleName = moduleKey) => {
    if (checkAccess(moduleKey)) {
      return true;
    }

    const requiredTier = getUpgradeTierForModule(currentTier, moduleKey);
    setUpgradePrompt({
      visible: true,
      moduleKey,
      moduleName,
      requiredTier,
      currentTier,
      message: getUpgradeMessage(moduleKey, requiredTier),
    });

    return false;
  };

  /**
   * Close the upgrade prompt
   */
  const closePrompt = () => {
    setUpgradePrompt(prev => ({ ...prev, visible: false }));
  };

  return {
    currentTier,
    hasAccess: checkAccess,
    tryAccess,
    upgradePrompt,
    closePrompt,
  };
};
