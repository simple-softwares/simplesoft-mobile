import api from '../../services/api/httpClient';
import { storage } from '../../services/storage/mmkv';
import { API_BASE_URL } from '../../config';

// ── Status configs ────────────────────────────────────────────────────────────

export const TICKET_STATUSES = {
  open:          { label: 'Open',        color: '#6366F1', bg: '#6366F118', icon: 'radio-button-on-outline' },
  assigned:      { label: 'Assigned',    color: '#F59E0B', bg: '#F59E0B18', icon: 'person-outline' },
  wip:           { label: 'In Progress', color: '#0EA5E9', bg: '#0EA5E918', icon: 'build-outline' },
  hold:          { label: 'Hold',        color: '#F97316', bg: '#F9731618', icon: 'pause-circle-outline' },
  pending_parts: { label: 'Hold',        color: '#F97316', bg: '#F9731618', icon: 'pause-circle-outline' },  // legacy alias
  resolved:      { label: 'Closed',      color: '#10B981', bg: '#10B98118', icon: 'checkmark-circle-outline' },
  cancelled:     { label: 'Cancelled',   color: '#9090AA', bg: '#9090AA12', icon: 'close-circle-outline' },
};

export const URGENCY_CONFIGS = {
  Normal:   { color: '#6366F1', bg: '#6366F115' },
  Urgent:   { color: '#F59E0B', bg: '#F59E0B15' },
  Critical: { color: '#EF4444', bg: '#EF444415' },
};

export const NATURE_OPTIONS = ['Breakdown', 'Maintenance', 'Installation', 'Demo', 'Calibration', 'Support', 'Other'];
export const CALL_TYPE_OPTIONS = ['Installation', 'Breakdown', 'Maintenance', 'Support', 'Visit'];
export const URGENCY_OPTIONS = ['Normal', 'Urgent', 'Critical'];
export const LOG_STATUS_OPTIONS = ['completed', 'escalated', 'pending_parts'];

// ── Helpers ───────────────────────────────────────────────────────────────────

export const fmtDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
};

export const fmtDateTime = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

export const fmtDuration = (startIso, endIso) => {
  if (!startIso || !endIso) return null;
  const mins = Math.round((new Date(endIso) - new Date(startIso)) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

// Build server media URL (not authenticated — served directly by nginx)
export const mediaUrl = (path) => {
  const base = (storage.getString('api_base_url') || API_BASE_URL || 'http://10.0.2.2:8000/api')
    .replace('/api', '');
  return path.startsWith('http') ? path : `${base}${path}`;
};

// ── Service API ───────────────────────────────────────────────────────────────

const serviceService = {
  TICKET_STATUSES,
  fmtDate,
  fmtDateTime,
  fmtDuration,
  mediaUrl,

  // ── Tickets ────────────────────────────────────────────────────────────────

  async listTickets({ status = null, assigned_to = null, search = null, mine = false } = {}) {
    try {
      const { data } = await api.get('/service/tickets', {
        params: {
          status:      status || undefined,
          assigned_to: assigned_to || undefined,
          search:      search || undefined,
        },
      });
      return data || [];
    } catch { return []; }
  },

  async getTicket(id) {
    const { data } = await api.get(`/service/tickets/${id}`);
    return data;
  },

  async createTicket(body) {
    const { data } = await api.post('/service/tickets', body);
    return data;
  },

  async updateTicket(id, body) {
    const { data } = await api.patch(`/service/tickets/${id}`, body);
    return data;
  },

  // ── State transitions ──────────────────────────────────────────────────────

  async startTicket(id) {
    const { data } = await api.post(`/service/tickets/${id}/start`);
    return data;
  },

  async resolveTicket(id, body) {
    // body: { action_taken, distance_km, remarks }
    const { data } = await api.post(`/service/tickets/${id}/resolve`, body);
    return data;
  },

  async cancelTicket(id) {
    const { data } = await api.post(`/service/tickets/${id}/cancel`);
    return data;
  },

  async reopenTicket(id) {
    const { data } = await api.post(`/service/tickets/${id}/reopen`);
    return data;
  },

  async crosscheckTicket(id, body) {
    // body: { customer_feedback, verification_remarks }
    const { data } = await api.post(`/service/tickets/${id}/crosscheck`, body);
    return data;
  },

  // ── Work Logs ──────────────────────────────────────────────────────────────

  async listWorkLogs(ticketId) {
    try {
      const { data } = await api.get(`/service/tickets/${ticketId}/work-logs`);
      return data || [];
    } catch { return []; }
  },

  async createWorkLog(ticketId, body) {
    // body: { action_taken, distance_km, status, remarks, call_start, call_end, photos }
    const { data } = await api.post(`/service/tickets/${ticketId}/work-logs`, body);
    return data;
  },

  // ── Photos ─────────────────────────────────────────────────────────────────

  // Upload any file (photo, voice note, document) — returns the server URL
  async uploadFile(uri, mimeType = 'application/octet-stream', originalName = null) {
    const base  = storage.getString('api_base_url') || API_BASE_URL || 'http://10.0.2.2:8000/api';
    const token = storage.getString('access_token');
    const slug  = storage.getString('workspace_slug');

    const ext      = originalName ? originalName.split('.').pop() : 'bin';
    const filename = `service_${Date.now()}.${ext}`;
    const form = new FormData();
    form.append('file', { uri, name: filename, type: mimeType });

    const res = await fetch(`${base}/media/upload?category=service`, {
      method:  'POST',
      headers: {
        Authorization:      `Bearer ${token}`,
        'X-Workspace-Slug': slug || '',
      },
      body: form,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Upload failed (${res.status})`);
    }
    const json = await res.json();
    return json.url;
  },

  // Convenience alias for photo uploads
  async uploadPhoto(uri, mimeType = 'image/jpeg') {
    return this.uploadFile(uri, mimeType, `photo.jpg`);
  },

  // Register a URL on the ticket's photos list
  async addTicketPhoto(ticketId, url) {
    const { data } = await api.post(`/service/tickets/${ticketId}/photos`, { url });
    return data;
  },

  async removeTicketPhoto(ticketId, url) {
    const { data } = await api.delete(`/service/tickets/${ticketId}/photos`, { params: { url } });
    return data;
  },

  // ── Spares ─────────────────────────────────────────────────────────────────

  async addSpare(ticketId, body) {
    // body: { item_name, qty_issued, unit, product_id? }
    const { data } = await api.post(`/service/tickets/${ticketId}/spares`, body);
    return data;
  },

  async deleteSpare(ticketId, spareId) {
    await api.delete(`/service/tickets/${ticketId}/spares/${spareId}`);
  },

  // ── Daily Report ───────────────────────────────────────────────────────────

  async getDailyReport({ report_date, engineer_id } = {}) {
    try {
      const { data } = await api.get('/service/reports/daily', {
        params: { report_date, engineer_id: engineer_id || undefined },
      });
      return data;
    } catch { return null; }
  },

  async listUsers() {
    try {
      const { data } = await api.get('/users');
      return data || [];
    } catch { return []; }
  },

  // ── PDF ────────────────────────────────────────────────────────────────────

  pdfUrl(ticketId) {
    const token = storage.getString('access_token');
    const base  = storage.getString('api_base_url') || API_BASE_URL || 'http://10.0.2.2:8000/api';
    return `${base}/service/tickets/${ticketId}/pdf?token=${token}`;
  },
};

export default serviceService;
