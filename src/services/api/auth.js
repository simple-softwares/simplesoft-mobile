/**
 * Auth service — calls the new FastAPI backend.
 * No Odoo dependency.
 */

import { restLogin, restLogout, clearFcmToken } from '../../backend/RestAdapter';

/**
 * Login with email + password + workspace slug.
 * Returns { success, user } or { success: false, message }
 */
export const login = async (email, password, workspace) => {
  try {
    const result = await restLogin(email, password, workspace);
    return result;
  } catch (err) {
    const status = err.response?.status;
    const detail = err.response?.data?.detail;

    if (status === 401) return { success: false, message: 'Incorrect email or password' };
    if (status === 404) return { success: false, message: 'Workspace not found. Check your email or contact your admin.' };
    return { success: false, message: detail || 'Connection failed. Check your internet.' };
  }
};

export const logout = async () => {
  await clearFcmToken();
  restLogout();
};

// Google sign-in — stub for now, wire up later
export const initGoogleSignIn = () => {};
export const loginWithGoogle = async () => { throw new Error('Google sign-in not yet configured'); };
export const logoutGoogle = async () => {};
