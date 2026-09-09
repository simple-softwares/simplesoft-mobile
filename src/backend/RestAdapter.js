/**
 * RestAdapter — replaces OdooAdapter
 * Calls the new FastAPI backend instead of Odoo JSON-RPC.
 * API contract is identical to OdooAdapter so BackendService and all screens stay unchanged.
 */

import axios from 'axios';
import { API_BASE_URL, workspaceApiUrl } from '../config';
import { authStorage as storage } from '../services/storage/storageRegistry';
import SyncService from '../services/sync/syncService';
import SessionService from '../services/auth/sessionService';

function isNetworkError(err) {
  return !err.response && (err.request || err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED' || err.message === 'Network Error');
}

const KEYS = {
  ACCESS_TOKEN:   'access_token',
  REFRESH_TOKEN:  'refresh_token',
  WORKSPACE_SLUG: 'workspace_slug',
  API_BASE_URL:   'api_base_url',
};

const api = axios.create({
  baseURL: API_BASE_URL || 'http://10.0.2.2:8000/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token + workspace slug, and resolve the per-workspace baseURL
api.interceptors.request.use(config => {
  const storedBase = storage.getString(KEYS.API_BASE_URL);
  if (storedBase) config.baseURL = storedBase;
  const token = storage.getString(KEYS.ACCESS_TOKEN);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const slug = storage.getString(KEYS.WORKSPACE_SLUG);
  if (slug) config.headers['X-Workspace-Slug'] = slug;
  console.log('[API] -->', config.method?.toUpperCase(), config.baseURL + config.url);
  return config;
});

// Auto-refresh on 401 + queue offline mutations
api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = storage.getString(KEYS.REFRESH_TOKEN);
      if (refreshToken) {
        try {
          const base = storage.getString(KEYS.API_BASE_URL) || API_BASE_URL || 'http://10.0.2.2:8000/api';
          const { data } = await axios.post(`${base}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          storage.set(KEYS.ACCESS_TOKEN,  data.access_token);
          storage.set(KEYS.REFRESH_TOKEN, data.refresh_token);
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return api(original);
        } catch {
          SessionService.clearSession(true);
        }
      } else {
        SessionService.clearSession(true); // no refresh token — session is unrecoverable
      }
    }

    // Queue mutating operations that fail due to network (not server) errors
    const method = original?.method?.toUpperCase();
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method) && isNetworkError(err) && !original?._isFlush) {
      try {
        SyncService.addToQueue({
          method,
          url: original.url,
          body: original.data ? JSON.parse(original.data) : null,
        });
      } catch { /* never block the rejection */ }
    }

    return Promise.reject(err);
  }
);

/**
 * Replay queued operations after coming back online.
 * Called by useNetworkStatus when offline→online transition is detected.
 */
export async function flushPendingOperations() {
  const queue = SyncService.getQueue();
  if (queue.length === 0) return;

  for (const op of queue) {
    try {
      await api.request({
        method: op.method,
        url:    op.url,
        data:   op.body,
        _isFlush: true, // prevent re-queuing on failure during flush
      });
      SyncService.removeFromQueue(op.id);
    } catch (err) {
      if (isNetworkError(err)) break; // still offline — stop and wait for next reconnect
      SyncService.markFailed(op.id); // permanent server error → dead-letter after MAX_RETRIES
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────

export async function restLogin(email, password, workspace) {
  const apiUrl = workspaceApiUrl(workspace);
  console.log('[LOGIN] workspace:', workspace, '| url:', apiUrl);
  storage.set(KEYS.API_BASE_URL,   apiUrl);
  storage.set(KEYS.WORKSPACE_SLUG, workspace);
  try {
    // Pass X-Workspace-Slug directly — don't rely solely on MMKV-based interceptor
    const { data } = await api.post('/auth/login', { email, password }, {
      headers: { 'X-Workspace-Slug': workspace },
    });
    storage.set(KEYS.ACCESS_TOKEN,  data.access_token);
    storage.set(KEYS.REFRESH_TOKEN, data.refresh_token);
    console.log('[LOGIN] success, user:', data?.user?.email);
    return {
      success: true,
      user: {
        uid:        data.user.id,
        id:         data.user.id,
        name:       data.user.name,
        email:      data.user.email,
        role:       data.user.role,
        is_admin:   data.user.role === 'admin',
        workspace_id: data.user.workspace_id,
        db:         data.user.workspace_slug,
      },
    };
  } catch (err) {
    console.log('[LOGIN] FAILED — status:', err.response?.status, '| code:', err.code, '| msg:', err.message);
    console.log('[LOGIN] response data:', JSON.stringify(err.response?.data));
    throw err;
  }
}

export function restLogout() {
  storage.delete(KEYS.ACCESS_TOKEN);
  storage.delete(KEYS.REFRESH_TOKEN);
  storage.delete(KEYS.WORKSPACE_SLUG);
  storage.delete(KEYS.API_BASE_URL);
}

export async function registerFcmToken(token) {
  await api.post('/notifications/token', { token });
}

export async function clearFcmToken() {
  try { await api.delete('/notifications/token'); } catch { /* ignore if already logged out */ }
}

// ─────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────

class RestAdapter {
  async getDashboardData(userId) {
    const { data } = await api.get('/dashboard');
    return {
      stats: {
        total:    data.stats.total_tasks,
        open:     data.stats.open_tasks,
        overdue:  data.stats.overdue_tasks,
        projects: data.stats.total_projects,
        contacts: data.stats.total_contacts,
      },
      tasks:    data.recent_tasks.map(normTask),
      projects: data.recent_projects.map(normProject),
      contacts: data.recent_contacts,
    };
  }

  // ── Projects ───────────────────────────────────────────────

  async getProjects(domain = [], opts = {}) {
    const { data } = await api.get('/projects');
    return data.map(normProject);
  }

  async createProject(vals) {
    const { data } = await api.post('/projects', {
      name: vals.name,
      description: vals.description,
      color: vals.color || 0,
    });
    return normProject(data);
  }

  async updateProject(id, vals) {
    const { data } = await api.patch(`/projects/${id}`, vals);
    return normProject(data);
  }

  async deleteProject(id) {
    await api.delete(`/projects/${id}`);
  }

  // ── Tasks ──────────────────────────────────────────────────

  async getTasks(domain = [], opts = {}) {
    const params = { limit: opts.limit || 200 };
    const { data } = await api.get('/tasks', { params });
    return data.map(normTask);
  }

  async getMyTasks(userId, limit = 200) {
    const { data } = await api.get('/tasks', { params: { mine: true, limit } });
    return data.map(normTask);
  }

  async getAllTasks(limit = 200) {
    const { data } = await api.get('/tasks', { params: { limit } });
    return data.map(normTask);
  }

  async getProjectTasks(projectId, limit = 200) {
    const { data } = await api.get('/tasks', { params: { project_id: projectId, limit } });
    return data.map(normTask);
  }

  async getTask(taskId) {
    const { data } = await api.get(`/tasks/${taskId}`);
    return normTask(data);
  }

  async createTask(vals) {
    const { data } = await api.post('/tasks', {
      name:          vals.name,
      description:   vals.description,
      priority:      vals.priority || '1',
      date_deadline: vals.date_deadline,
      project_id:    vals.project_id,
      stage_id:      vals.stage_id,
      assignee_ids:  vals.user_ids || [],
    });
    return normTask(data);
  }

  async updateTask(id, vals) {
    const body = {};
    if (vals.name         !== undefined) body.name          = vals.name;
    if (vals.description  !== undefined) body.description   = vals.description;
    if (vals.priority     !== undefined) body.priority      = vals.priority;
    if (vals.date_deadline !== undefined) body.date_deadline = vals.date_deadline;
    if (vals.stage_id     !== undefined) body.stage_id      = vals.stage_id;
    if (vals.user_ids     !== undefined) body.assignee_ids  = vals.user_ids;
    const { data } = await api.patch(`/tasks/${id}`, body);
    return normTask(data);
  }

  async deleteTask(id) {
    await api.delete(`/tasks/${id}`);
  }

  // ── Stages ─────────────────────────────────────────────────

  async getTaskStages(projectId) {
    const { data } = await api.get(`/projects/${projectId}/stages`);
    return data.map(s => ({ id: s.id, name: s.name, sequence: s.sequence, fold: s.is_closed }));
  }

  async createStage(name, projectId) {
    const { data } = await api.post(`/projects/${projectId}/stages`, { name });
    return data;
  }

  async updateStage(stageId, projectId, vals) {
    const { data } = await api.patch(`/projects/${projectId}/stages/${stageId}`, vals);
    return data;
  }

  async deleteStage(stageId, projectId) {
    await api.delete(`/projects/${projectId}/stages/${stageId}`);
  }

  // ── Contacts ───────────────────────────────────────────────

  async getContacts(opts = {}) {
    const params = {
      search: opts.search || undefined,
      type:   opts.type   || undefined,
      limit:  opts.limit  || 50,
      offset: opts.offset || 0,
    };
    const { data } = await api.get('/contacts', { params });
    return data;
  }

  async getContact(id) {
    const { data } = await api.get(`/contacts/${id}`);
    return data;
  }

  async createContact(vals) {
    const { data } = await api.post('/contacts', vals);
    return data;
  }

  async updateContact(id, vals) {
    const { data } = await api.patch(`/contacts/${id}`, vals);
    return data;
  }

  async deleteContact(id) {
    await api.delete(`/contacts/${id}`);
  }

  // ── Members (for avatar stacks / assignment) ───────────────

  async getMembers() {
    const { data } = await api.get('/users');
    return data.map(u => ({ id: u.id, name: u.name, email: u.email }));
  }
}

// ─────────────────────────────────────────────────────────────
// Normalizers — keep the same shape screens expect
// ─────────────────────────────────────────────────────────────

function normTask(t) {
  return {
    id:            t.id,
    name:          t.name,
    description:   t.description,
    priority:      t.priority,
    date_deadline: t.date_deadline,
    project_id:    t.project_id ? [t.project_id, t.project_name] : false,
    stage_id:      t.stage_id   ? [t.stage_id,   t.stage_name]   : false,
    user_ids:      (t.assignees || []).map(u => [u.id, u.name]),
  };
}

function normProject(p) {
  return {
    id:            p.id,
    name:          p.name,
    description:   p.description,
    color:         p.color,
    task_count:    p.task_count    || 0,
    done_count:    p.done_count    || 0,
    overdue_count: p.overdue_count || 0,
    active:        true,
  };
}

export default new RestAdapter();
