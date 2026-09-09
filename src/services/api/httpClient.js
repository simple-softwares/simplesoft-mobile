/**
 * REST API client — replaces Odoo JSON-RPC httpClient.
 * All Odoo callKw / readGroup logic removed.
 * Uses JWT Bearer tokens instead of session cookies.
 */

import axios from 'axios';
import { authStorage as storage } from '../storage/storageRegistry';
import { API_BASE_URL } from '../../config';
import SyncService from '../sync/syncService';
import SessionService from '../auth/sessionService';

function isNetworkError(err) {
  return !err.response && (err.request || err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED' || err.message === 'Network Error');
}

const KEYS = { ACCESS: 'access_token', REFRESH: 'refresh_token', WORKSPACE: 'workspace_slug', BASE_URL: 'api_base_url' };

const api = axios.create({
  baseURL: API_BASE_URL || 'http://10.0.2.2:8000/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Resolve per-workspace baseURL, attach JWT and workspace slug to every request
api.interceptors.request.use(config => {
  const storedBase = storage.getString(KEYS.BASE_URL);
  if (storedBase) config.baseURL = storedBase;
  const token = storage.getString(KEYS.ACCESS);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const slug = storage.getString(KEYS.WORKSPACE);
  if (slug) config.headers['X-Workspace-Slug'] = slug;
  console.log('[HTTP] -->', config.method?.toUpperCase(), (config.baseURL || '') + config.url, '| token:', token ? token.slice(0, 20) + '...' : 'NONE');
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = storage.getString(KEYS.REFRESH);
      if (refreshToken) {
        try {
          const base = storage.getString(KEYS.BASE_URL) || API_BASE_URL || 'http://10.0.2.2:8000/api';
          const { data } = await axios.post(`${base}/auth/refresh`, { refresh_token: refreshToken });
          storage.set(KEYS.ACCESS,   data.access_token);
          storage.set(KEYS.REFRESH,  data.refresh_token);
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return api(original);
        } catch {
          SessionService.clearSession(true);
        }
      } else {
        SessionService.clearSession(true); // no refresh token — session is unrecoverable
      }
    }
    // Queue mutating requests that fail due to network errors
    const method = original?.method?.toUpperCase();
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method) && isNetworkError(err) && !original?._isFlush) {
      SyncService.addToQueue({
        method,
        url: original.url,
        body: original.data ? JSON.parse(original.data) : null,
      });
    }
    return Promise.reject(err);
  }
);

export default api;
