import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import SessionService from '../../services/auth/sessionService';

// Check if a saved session exists on app start
export const checkSession = createAsyncThunk('auth/checkSession', async () => {
  const session = SessionService.getSession();
  const hasToken = SessionService.isAuthenticated(); // verifies access_token key exists in MMKV
  if (session?.uid && hasToken) {
    return { isAuthenticated: true, user: session };
  }
  // Clear stale user record if token is gone
  if (session && !hasToken) SessionService.clearSession();
  return { isAuthenticated: false, user: null };
});

// Logout — clear all storage (delegates to SessionService)
export const logout = createAsyncThunk('auth/logout', async () => {
  SessionService.clearSession();
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    isAuthenticated: false,
    isLoading:       false,
    user:            null,
    error:           null,
    sessionExpired:  false,
    enabledModules:  [],  // granular: which modules user can access (empty = all allowed)
    enabledFeatures: [],  // granular: which features user can use (empty = all allowed)
  },
  reducers: {
    loginSuccess: (state, action) => {
      const sessionData = action.payload;
      state.isAuthenticated = true;
      state.user            = sessionData;
      state.enabledModules  = sessionData.enabled_modules || [];
      state.enabledFeatures = sessionData.enabled_features || [];
      state.error           = null;
      state.sessionExpired  = false;
    },
    setUserRole: (state, action) => {
      if (state.user) {
        state.user.role          = action.payload.role;
        state.user.department    = action.payload.department;
        state.user.department_id = action.payload.department_id;
      }
    },
    logoutSuccess: (state) => {
      state.isAuthenticated = false;
      state.user            = null;
    },
    sessionExpiredAction: (state) => {
      state.isAuthenticated = false;
      state.user            = null;
      state.sessionExpired  = true;
    },
    clearSessionExpired: (state) => { state.sessionExpired = false; },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: builder => {
    builder
      .addCase(checkSession.fulfilled, (state, action) => {
        state.isAuthenticated = action.payload.isAuthenticated;
        state.user            = action.payload.user;
      })
      .addCase(logout.fulfilled, state => {
        state.isAuthenticated = false;
        state.user            = null;
      });
  },
});

export const { loginSuccess, logoutSuccess, sessionExpiredAction, clearSessionExpired, clearError, setUserRole } = authSlice.actions;
export default authSlice.reducer;
