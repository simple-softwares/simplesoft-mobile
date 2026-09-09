import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchUserPermissions,
  selectCurrentPermissionSummary,
  selectPermissionsLoading,
  selectPermissionsError,
  selectPermissionsLastFetched,
  clearPermissions,
  invalidatePermissions,
} from '../store/slices/permissionsSlice';
import granularPermissionService from '../services/permissions/granularPermissionService';

const PERMISSIONS_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Hook to manage user permissions.
 *
 * Rules:
 *   - Admin users (role === 'admin') always get full access to everything.
 *   - Employees get exactly what their permission record says.
 *   - While loading, all permissions return false — UI elements are hidden
 *     silently (no Alert popups anywhere in the app).
 *   - On error, permissions stay false — user sees restricted UI, no crashes.
 */
export const usePermissions = (userId, autoRefresh = true) => {
  const dispatch = useDispatch();
  const user = useSelector(s => s.auth.user);
  const permissionSummary = useSelector(selectCurrentPermissionSummary);
  const loading = useSelector(selectPermissionsLoading);
  const error = useSelector(selectPermissionsError);
  const lastFetched = useSelector(selectPermissionsLastFetched);

  const isAdmin = user?.role === 'admin' || user?.is_admin === true;

  // True only when admin, or when permissions are loaded and field is true
  // While loading → false (hides UI silently, no alerts)
  const _can = (field) => {
    if (isAdmin) return true;
    if (!lastFetched) return false; // not loaded yet — hide silently
    return field ?? false;
  };

  useEffect(() => {
    if (userId) {
      dispatch(fetchUserPermissions(userId));
    }
  }, [userId, dispatch]);

  useEffect(() => {
    if (!autoRefresh || !userId) return;
    const interval = setInterval(() => {
      dispatch(invalidatePermissions());
      dispatch(fetchUserPermissions(userId));
    }, PERMISSIONS_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [userId, autoRefresh, dispatch]);

  const refreshPermissions = async () => dispatch(fetchUserPermissions(userId));
  const clearUserPermissions = () => dispatch(clearPermissions());
  const invalidateServiceCache = () => {
    granularPermissionService.invalidateCache(userId);
    return refreshPermissions();
  };

  // ── Project permissions ──────────────────────────────────────
  const canReadProjects    = () => _can(permissionSummary?.projects?.read);
  const canCreateProject   = () => _can(permissionSummary?.projects?.create);
  const canEditAllProjects = () => _can(permissionSummary?.projects?.editAll);
  const canDeleteAllProjects = () => _can(permissionSummary?.projects?.deleteAll);

  // ── Task permissions ─────────────────────────────────────────
  const canReadTasks       = () => _can(permissionSummary?.tasks?.read);
  const canCreateTask      = () => _can(permissionSummary?.tasks?.create);
  const canChangeTaskStage = () => _can(permissionSummary?.tasks?.changeStage);
  const canAssignTasks     = () => _can(permissionSummary?.tasks?.assignUsers);

  // ── Note permissions ─────────────────────────────────────────
  const canReadNotes  = () => _can(permissionSummary?.notes?.read);
  const canCreateNote = () => _can(permissionSummary?.notes?.create);
  const canShareNote  = () => _can(permissionSummary?.notes?.share);

  // ── Contact permissions ──────────────────────────────────────
  const canReadContacts  = () => _can(permissionSummary?.contacts?.read);
  const canCreateContact = () => _can(permissionSummary?.contacts?.create);

  // ── Feature flags ────────────────────────────────────────────
  const canUseAI          = () => _can(permissionSummary?.features?.ai);
  const canUseAutomation  = () => _can(permissionSummary?.features?.automation);
  const canUsePerformance = () => _can(permissionSummary?.features?.performance);
  const canExportData     = () => _can(permissionSummary?.features?.exportData);
  const canManageTeam     = () => _can(permissionSummary?.features?.manageTeam);

  // ── Visibility ───────────────────────────────────────────────
  // viewOwnOnly: admins never restricted; employees use actual value
  const viewOwnOnly          = () => isAdmin ? false : (permissionSummary?.visibility?.viewOwnOnly ?? false);
  const canSeeAllDepartments = () => _can(permissionSummary?.visibility?.seeAllDepartments);
  const getVisibility        = () => permissionSummary?.visibility ?? null;

  return {
    // State
    permissionSummary,
    loading,
    error,
    lastFetched,
    isAdmin,

    // Methods
    refreshPermissions,
    clearUserPermissions,
    invalidateServiceCache,

    // Project
    canReadProjects,
    canCreateProject,
    canEditAllProjects,
    canDeleteAllProjects,

    // Task
    canReadTasks,
    canCreateTask,
    canChangeTaskStage,
    canAssignTasks,

    // Note
    canReadNotes,
    canCreateNote,
    canShareNote,

    // Contact
    canReadContacts,
    canCreateContact,

    // Feature
    canUseAI,
    canUseAutomation,
    canUsePerformance,
    canExportData,
    canManageTeam,

    // Visibility
    viewOwnOnly,
    canSeeAllDepartments,
    getVisibility,
  };
};

export default usePermissions;
