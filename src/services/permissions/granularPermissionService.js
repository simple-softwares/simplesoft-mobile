/**
 * Permission service — now calls our FastAPI backend.
 * Same public API as before so permissionsSlice and usePermissions are unchanged.
 */

import api from '../api/httpClient';

const CACHE_TTL = 5 * 60 * 1000;

class GranularPermissionService {
  constructor() {
    this._cache = new Map();
  }

  _key(userId) { return `user:${userId}`; }
  _valid(entry) { return entry && Date.now() - entry.ts < CACHE_TTL; }

  invalidateCache(userId) { this._cache.delete(this._key(userId)); }
  invalidateAllCache()    { this._cache.clear(); }

  async getPermissionSummary(userId) {
    const key = this._key(userId);
    const cached = this._cache.get(key);
    if (this._valid(cached)) return cached.data;

    const { data } = await api.get('/permissions/me');
    this._cache.set(key, { data, ts: Date.now() });
    return data;
  }

  // Keep getPermissionRecord as an alias — permissionsSlice calls this
  async getPermissionRecord(userId) {
    return this.getPermissionSummary(userId);
  }
}

export default new GranularPermissionService();
