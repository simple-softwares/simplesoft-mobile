import { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import PlanService from '../services/provision/planService';
 
/**
 * Usage:
 * const { check, UpgradeModal } = usePlanGuard();
 *
 * // Before creating a task:
 * const ok = await check('task', taskCount);
 * if (!ok) return; // UpgradeModal already shown
 * // proceed with creation
 */
const usePlanGuard = () => {
  const [promptVisible, setPromptVisible] = useState(false);
  const [promptReason,  setPromptReason]  = useState('task_limit');
  const workspace = useSelector(s => s.workspace);
 
  const check = useCallback(async (type, currentCount = 0) => {
    let result;
    switch (type) {
      case 'task':    result = PlanService.canCreateTask(currentCount);    break;
      case 'project': result = PlanService.canCreateProject(currentCount); break;
      case 'member':  result = PlanService.canAddMember(currentCount);     break;
      case 'module':  result = PlanService.canAddModule();                 break;
      default:
        if (PlanService.isReadOnly()) {
          result = { allowed: false, reason: 'readonly' };
        } else {
          result = { allowed: true };
        }
    }
 
    if (!result.allowed) {
      setPromptReason(result.reason || `${type}_limit`);
      setPromptVisible(true);
      return false;
    }
    return true;
  }, []);
 
  const handleUpgrade = useCallback(async (plan) => {
    setPromptVisible(false);
    if (workspace?.slug) {
      await PlanService.upgrade(workspace.slug, plan);
    }
  }, [workspace]);
 
  return {
    check,
    promptVisible,
    promptReason,
    closePrompt:   () => setPromptVisible(false),
    handleUpgrade,
  };
};
 
export default usePlanGuard;
