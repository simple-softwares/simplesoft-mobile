import { syncStorage } from '../storage/storageRegistry';

const QUEUE_KEY       = 'pending_operations';
const DEAD_LETTER_KEY = 'dead_letter_queue';
const MAX_RETRIES     = 3;

class SyncService {
  getPendingCount() {
    return this._load(QUEUE_KEY).length;
  }

  addToQueue(operation) {
    const queue = this._load(QUEUE_KEY);
    const op = {
      id:        `op_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      method:    operation.method,
      url:       operation.url,
      body:      operation.body ?? null,
      createdAt: Date.now(),
      retries:   0,
    };
    queue.push(op);
    this._save(QUEUE_KEY, queue);
    return op.id;
  }

  getQueue() {
    return this._load(QUEUE_KEY);
  }

  removeFromQueue(id) {
    const queue = this._load(QUEUE_KEY).filter(op => op.id !== id);
    this._save(QUEUE_KEY, queue);
  }

  markFailed(id) {
    const queue = this._load(QUEUE_KEY);
    const idx   = queue.findIndex(op => op.id === id);
    if (idx === -1) return;
    queue[idx].retries = (queue[idx].retries || 0) + 1;
    if (queue[idx].retries >= MAX_RETRIES) {
      const dead = this._load(DEAD_LETTER_KEY);
      dead.push({ ...queue[idx], failedAt: Date.now() });
      this._save(DEAD_LETTER_KEY, dead);
      queue.splice(idx, 1);
    }
    this._save(QUEUE_KEY, queue);
  }

  clearQueue() {
    this._save(QUEUE_KEY, []);
  }

  getDeadLetters() {
    return this._load(DEAD_LETTER_KEY);
  }

  _load(key) {
    try {
      const raw = syncStorage.getString(key);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  _save(key, value) {
    syncStorage.set(key, JSON.stringify(value));
  }
}

export default new SyncService();
