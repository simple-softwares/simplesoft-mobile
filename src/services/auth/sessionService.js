// JWT session management — all MMKV auth reads/writes go through here

import { storage } from '../storage/mmkv';
import { store } from '../../store';
import { logoutSuccess, sessionExpiredAction } from '../../store/slices/authSlice';

export const KEYS = {
  ACCESS:  'access_token',
  REFRESH: 'refresh_token',
  USER:    'current_user',
};

const SessionService = {

  getSession() {
    try {
      const raw = storage.getString(KEYS.USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  saveSession(userData) {
    storage.set(KEYS.USER, JSON.stringify(userData));
  },

  getUser() {
    return this.getSession();
  },

  saveUser(userData) {
    this.saveSession(userData);
  },

  isAuthenticated() {
    return !!storage.getString(KEYS.ACCESS);
  },

  getUserId() {
    const user = this.getSession();
    return user?.id || user?.uid || null;
  },

  getAccessToken() {
    return storage.getString(KEYS.ACCESS) || '';
  },

  clearSession(expired = false) {
    storage.delete(KEYS.ACCESS);
    storage.delete(KEYS.REFRESH);
    storage.delete(KEYS.USER);
    store.dispatch(expired ? sessionExpiredAction() : logoutSuccess());
  },
};

export default SessionService;
