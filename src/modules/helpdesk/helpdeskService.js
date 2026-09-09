import api from '../../services/api/httpClient';

// ── Status configs ─────────────────────────────────────────────────────────────

export const HD_STATUSES = {
  open:        { label: 'Open',        color: '#6366F1', bg: '#6366F118', icon: 'radio-button-on-outline' },
  in_progress: { label: 'In Progress', color: '#0EA5E9', bg: '#0EA5E918', icon: 'build-outline' },
  on_hold:     { label: 'On Hold',     color: '#F59E0B', bg: '#F59E0B18', icon: 'pause-circle-outline' },
  resolved:    { label: 'Resolved',    color: '#10B981', bg: '#10B98118', icon: 'checkmark-circle-outline' },
  closed:      { label: 'Closed',      color: '#9090AA', bg: '#9090AA12', icon: 'close-circle-outline' },
};

export const HD_PRIORITIES = {
  low:    { label: 'Low',    color: '#10B981' },
  medium: { label: 'Medium', color: '#6366F1' },
  high:   { label: 'High',   color: '#F59E0B' },
  urgent: { label: 'Urgent', color: '#EF4444' },
};

export const HD_STATUS_OPTIONS  = ['open', 'in_progress', 'on_hold', 'resolved', 'closed'];
export const HD_PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];
export const HD_SOURCE_OPTIONS   = ['internal', 'phone', 'email', 'web'];

// ── Helpers ────────────────────────────────────────────────────────────────────

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

// ── API ────────────────────────────────────────────────────────────────────────

const helpdeskService = {
  async listTickets({ status = null, priority = null, assigned_to = null, search = null } = {}) {
    try {
      const { data } = await api.get('/helpdesk/tickets', {
        params: {
          status:      status      || undefined,
          priority:    priority    || undefined,
          assigned_to: assigned_to || undefined,
          search:      search      || undefined,
        },
      });
      return data || [];
    } catch { return []; }
  },

  async getTicket(id) {
    const { data } = await api.get(`/helpdesk/tickets/${id}`);
    return data;
  },

  async createTicket(body) {
    const { data } = await api.post('/helpdesk/tickets', body);
    return data;
  },

  async updateTicket(id, body) {
    const { data } = await api.patch(`/helpdesk/tickets/${id}`, body);
    return data;
  },

  async deleteTicket(id) {
    await api.delete(`/helpdesk/tickets/${id}`);
  },

  async addComment(ticketId, body) {
    // body: { body: string, is_internal: bool }
    const { data } = await api.post(`/helpdesk/tickets/${ticketId}/comments`, body);
    return data;
  },

  async listCategories() {
    try {
      const { data } = await api.get('/helpdesk/categories');
      return data || [];
    } catch { return []; }
  },

  async getStats() {
    try {
      const { data } = await api.get('/helpdesk/stats');
      return data;
    } catch { return null; }
  },
};

export default helpdeskService;
