import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import granularPermissionService from '../../services/permissions/granularPermissionService';

const initialState = {
  currentPermissions: null,
  currentPermissionSummary: null,
  loading: false,
  error: null,
  lastFetched: null,
};

export const fetchUserPermissions = createAsyncThunk(
  'permissions/fetchUserPermissions',
  async (userId, { rejectWithValue }) => {
    try {
      const summary = await granularPermissionService.getPermissionSummary(userId);
      return { permissions: summary, summary, userId, timestamp: Date.now() };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch permissions');
    }
  }
);

const permissionsSlice = createSlice({
  name: 'permissions',
  initialState,
  reducers: {
    clearPermissions: (state) => {
      state.currentPermissions = null;
      state.currentPermissionSummary = null;
      state.lastFetched = null;
      state.error = null;
      granularPermissionService.invalidateAllCache();
    },
    invalidatePermissions: (state) => { state.lastFetched = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserPermissions.pending,   (state) => { state.loading = true; state.error = null; })
      .addCase(fetchUserPermissions.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPermissions = action.payload.permissions;
        state.currentPermissionSummary = action.payload.summary;
        state.lastFetched = action.payload.timestamp;
        state.error = null;
      })
      .addCase(fetchUserPermissions.rejected,  (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.currentPermissions = null;
        state.currentPermissionSummary = null;
      });
  },
});

export const { clearPermissions, invalidatePermissions } = permissionsSlice.actions;

export const selectCurrentPermissions       = s => s.permissions.currentPermissions;
export const selectCurrentPermissionSummary = s => s.permissions.currentPermissionSummary;
export const selectPermissionsLoading       = s => s.permissions.loading;
export const selectPermissionsError         = s => s.permissions.error;
export const selectPermissionsLastFetched   = s => s.permissions.lastFetched;
export const selectCanReadProjects          = s => s.permissions.currentPermissionSummary?.projects?.read ?? false;
export const selectCanCreateProject         = s => s.permissions.currentPermissionSummary?.projects?.create ?? false;
export const selectCanReadTasks             = s => s.permissions.currentPermissionSummary?.tasks?.read ?? false;
export const selectCanCreateTask            = s => s.permissions.currentPermissionSummary?.tasks?.create ?? false;
export const selectCanReadNotes             = s => s.permissions.currentPermissionSummary?.notes?.read ?? false;
export const selectCanManageTeam            = s => s.permissions.currentPermissionSummary?.features?.manageTeam ?? false;
export const selectPermissionVisibility     = s => s.permissions.currentPermissionSummary?.visibility ?? null;
export const selectModuleAccess             = s => s.permissions.currentPermissionSummary?.moduleAccess ?? null;

export default permissionsSlice.reducer;
