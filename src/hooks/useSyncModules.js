import { useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setWorkspace } from '../store/slices/workspaceSlice';
import { arraysEqual } from '../utils/moduleSyncUtils';

/**
 * Hook to sync modules from plan to workspace state when plan changes.
 * Detects tier upgrades by comparing plan modules with workspace modules.
 * 
 * Improvements:
 * 1. Better comparison logic (order-independent array comparison)
 * 2. Prevents multiple dispatches with ref tracking
 * 3. More detailed debugging
 * 4. Skip dispatch when modules already match
 * 5. Force sync capability
 */
export const useSyncModules = (forceSync = false) => {
  const dispatch = useDispatch();
  const workspace = useSelector(s => s.workspace);
  const plan = useSelector(s => s.plan);
  const isAuthenticated = useSelector(s => !!s.auth.user);
  
  // Use refs to track previous values and prevent infinite loops
  const prevPlanModulesRef = useRef([]);
  const prevWorkspaceModulesRef = useRef([]);
  const syncAttemptRef = useRef(0);
  const lastSyncTimeRef = useRef(0);

  // Function to perform the actual sync
  const performSync = useCallback((planModules, workspaceData) => {
    const syncId = ++syncAttemptRef.current;
    const now = Date.now();
    
    // Prevent too frequent syncs (min 2 seconds between syncs)
    if (now - lastSyncTimeRef.current < 2000 && !forceSync) {
      return false;
    }

    try {
      dispatch(setWorkspace({
        slug: workspaceData.slug || null,
        workspace_url: workspaceData.workspace_url || null,
        company: workspaceData.company || null,
        modules: [...planModules], // Copy to avoid mutation issues
      }));
      
      lastSyncTimeRef.current = now;
      return true;
    } catch (error) {
      return false;
    }
  }, [dispatch, forceSync]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    if (!plan?.modules || !workspace) {
      return;
    }

    // Get current modules
    const currentPlanModules = plan.modules || [];
    const currentWorkspaceModules = workspace.modules || [];
    
    // Check if modules have actually changed
    const planChanged = !arraysEqual(currentPlanModules, prevPlanModulesRef.current);
    const workspaceChanged = !arraysEqual(currentWorkspaceModules, prevWorkspaceModulesRef.current);

    // Update refs for next comparison
    prevPlanModulesRef.current = [...currentPlanModules];
    prevWorkspaceModulesRef.current = [...currentWorkspaceModules];

    // Check if modules already match
    const modulesMatch = arraysEqual(currentPlanModules, currentWorkspaceModules);
    
    if (modulesMatch && !forceSync) {
      return;
    }

    // Perform the sync
    performSync(currentPlanModules, workspace);
  }, [
    plan?.modules, 
    workspace?.modules, 
    workspace?.slug, 
    workspace?.workspace_url, 
    workspace?.company, 
    isAuthenticated,
    forceSync,
    performSync
  ]);

  // Return a function to force sync manually if needed
  const forceSyncNow = useCallback(() => {
    if (!plan?.modules || !workspace) {
      return false;
    }
    return performSync(plan.modules, workspace);
  }, [plan?.modules, workspace, performSync]);

  return { forceSyncNow };
};

export default useSyncModules;