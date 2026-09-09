import { syncStorage as storage } from '../storage/storageRegistry';
import SyncService from './syncService';

const OFFLINE_DATA_PREFIX   = 'offline_';
const OFFLINE_QUERIES_PREFIX = 'offline_query_';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

class OfflineStorage {
  constructor() {
    this.cache = new Map();
    this.pendingWrites = new Map();
  }

  storeData(key, data, ttl = CACHE_TTL) {
    const entry = { data, timestamp: Date.now(), ttl, version: 1 };
    storage.set(OFFLINE_DATA_PREFIX + key, JSON.stringify(entry));
    this.cache.set(key, entry);
  }

  getData(key, ignoreExpiry = false) {
    if (this.cache.has(key)) {
      const entry = this.cache.get(key);
      if (ignoreExpiry || !this.isExpired(entry)) return entry.data;
    }
    const stored = storage.getString(OFFLINE_DATA_PREFIX + key);
    if (stored) {
      try {
        const entry = JSON.parse(stored);
        if (ignoreExpiry || !this.isExpired(entry)) {
          this.cache.set(key, entry);
          return entry.data;
        }
      } catch {}
    }
    return null;
  }

  storeQueryResults(queryKey, results, params) {
    storage.set(OFFLINE_QUERIES_PREFIX + queryKey, JSON.stringify({ results, params, timestamp: Date.now(), ttl: CACHE_TTL }));
  }

  getQueryResults(queryKey, params = null) {
    const stored = storage.getString(OFFLINE_QUERIES_PREFIX + queryKey);
    if (!stored) return null;
    try {
      const entry = JSON.parse(stored);
      if (this.isExpired(entry)) return null;
      if (params && !this.paramsMatch(entry.params, params)) return null;
      return entry.results;
    } catch { return null; }
  }

  isExpired(entry) { return Date.now() - entry.timestamp > entry.ttl; }

  paramsMatch(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  storeModelData(model, ids, data) {
    const modelKey = `model_${model}`;
    let cache = this.getData(modelKey, true) || {};
    if (Array.isArray(ids)) {
      ids.forEach((id, i) => { cache[id] = { ...cache[id], ...(Array.isArray(data) ? data[i] : data), _lastUpdated: Date.now() }; });
    } else {
      cache[ids] = { ...cache[ids], ...data, _lastUpdated: Date.now() };
    }
    this.storeData(modelKey, cache, CACHE_TTL);
  }

  getModelData(model, ids) {
    const cache = this.getData(`model_${model}`, true) || {};
    if (ids === undefined) return Object.values(cache).filter(item => !item._deleted);
    if (Array.isArray(ids)) return ids.map(id => cache[id]).filter(Boolean);
    return cache[ids];
  }

  markDeleted(model, id) {
    const modelKey = `model_${model}`;
    const cache    = this.getData(modelKey, true) || {};
    if (cache[id]) {
      cache[id]._deleted = true;
      cache[id]._deletedAt = Date.now();
      this.storeData(modelKey, cache, CACHE_TTL);
    }
  }

  clearExpired() {
    try {
      const keys = storage.getAllKeys?.() || [];
      const now  = Date.now();
      keys.forEach(key => {
        if (key.startsWith(OFFLINE_DATA_PREFIX) || key.startsWith(OFFLINE_QUERIES_PREFIX)) {
          try {
            const val = storage.getString(key);
            if (val) {
              const entry = JSON.parse(val);
              if (now - entry.timestamp > entry.ttl) storage.delete(key);
            }
          } catch { storage.delete(key); }
        }
      });
    } catch {}
  }

  getStats() {
    const keys = storage.getAllKeys?.() || [];
    let offlineDataCount = 0, queryCacheCount = 0, totalSize = 0;
    keys.forEach(key => {
      if (key.startsWith(OFFLINE_DATA_PREFIX)) offlineDataCount++;
      else if (key.startsWith(OFFLINE_QUERIES_PREFIX)) queryCacheCount++;
      const val = storage.getString(key);
      if (val) totalSize += val.length;
    });
    return { offlineDataCount, queryCacheCount, totalSize: (totalSize / 1024).toFixed(2) + ' KB', pendingSync: SyncService.getPendingCount() };
  }

  clearAll() {
    const keys = storage.getAllKeys?.() || [];
    keys.forEach(key => {
      if (key.startsWith(OFFLINE_DATA_PREFIX) || key.startsWith(OFFLINE_QUERIES_PREFIX)) storage.delete(key);
    });
    this.cache.clear();
  }
}

export default new OfflineStorage();
