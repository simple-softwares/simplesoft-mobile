import api from '../../services/api/httpClient';
import { storage } from '../../services/storage/mmkv';
import { API_BASE_URL } from '../../config';

// ── Status configs ────────────────────────────────────────────────────────────

export const EXPENSE_STATES = {
  draft:     { label: 'Draft',     color: '#9090AA', bg: '#9090AA18', icon: 'document-outline' },
  submitted: { label: 'Submitted', color: '#6366F1', bg: '#6366F118', icon: 'time-outline' },
  approved:  { label: 'Approved',  color: '#F59E0B', bg: '#F59E0B18', icon: 'checkmark-circle-outline' },
  paid:      { label: 'Paid',      color: '#10B981', bg: '#10B98118', icon: 'checkmark-done-outline' },
  rejected:  { label: 'Rejected',  color: '#EF4444', bg: '#EF444418', icon: 'close-circle-outline' },
};

export const EXPENSE_TYPES = {
  reimbursement: { label: 'Reimbursement', icon: 'person-outline', color: '#7C3AED' },
  vendor_bill:   { label: 'Vendor Bill',   icon: 'business-outline', color: '#059669' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export const fmtINR = (n) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export const fmtDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
};

export const toISODate = (d) => {
  if (!d) return '';
  const p = d instanceof Date ? d : new Date(d);
  return p.toISOString().slice(0, 10);
};

export const GST_RATES = [0, 5, 12, 18, 28];

// ── Expense service ───────────────────────────────────────────────────────────

const expenseService = {
  EXPENSE_STATES,
  EXPENSE_TYPES,
  fmtINR,
  fmtDate,

  // ── Categories ──────────────────────────────────────────────────────────────

  async listCategories() {
    try {
      const { data } = await api.get('/expenses/categories');
      return data || [];
    } catch { return []; }
  },

  async createCategory(body) {
    const { data } = await api.post('/expenses/categories', body);
    return data;
  },

  // ── Expenses ────────────────────────────────────────────────────────────────

  async listExpenses({ state = null, expense_type = null, employee_id = null,
                       from_date = null, to_date = null, limit = 80 } = {}) {
    try {
      const { data } = await api.get('/expenses', {
        params: {
          state: state || undefined,
          expense_type: expense_type || undefined,
          employee_id: employee_id || undefined,
          from_date: from_date || undefined,
          to_date: to_date || undefined,
          limit,
        },
      });
      return data || [];
    } catch { return []; }
  },

  async getExpense(id) {
    const { data } = await api.get(`/expenses/${id}`);
    return data;
  },

  // Upload a receipt photo; returns server URL string
  async uploadReceipt(uri, mimeType = 'image/jpeg') {
    const base  = storage.getString('api_base_url') || API_BASE_URL || 'http://10.0.2.2:8000/api';
    const token = storage.getString('access_token');
    const slug  = storage.getString('workspace_slug');

    const form = new FormData();
    form.append('file', { uri, name: `receipt_${Date.now()}.jpg`, type: mimeType });

    const res = await fetch(`${base}/media/upload?category=expense`, {
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

  async createExpense(body) {
    const { data } = await api.post('/expenses', body);
    return data;
  },

  async updateExpense(id, body) {
    const { data } = await api.patch(`/expenses/${id}`, body);
    return data;
  },

  async deleteExpense(id) {
    await api.delete(`/expenses/${id}`);
  },

  async submitExpense(id) {
    const { data } = await api.post(`/expenses/${id}/submit`);
    return data;
  },

  async approveExpense(id) {
    const { data } = await api.post(`/expenses/${id}/approve`);
    return data;
  },

  async rejectExpense(id) {
    const { data } = await api.post(`/expenses/${id}/reject`);
    return data;
  },

  async payExpense(id) {
    const { data } = await api.post(`/expenses/${id}/pay`);
    return data;
  },
};

export default expenseService;
