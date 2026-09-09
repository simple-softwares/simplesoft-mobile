import api from '../../services/api/httpClient';
import { storage } from '../../services/storage/mmkv';
import { API_BASE_URL } from '../../config';

// ── Status configs ────────────────────────────────────────────────────────────

export const INVOICE_STATES = {
  draft:     { label: 'Draft',     color: '#9090AA', bg: '#9090AA18' },
  sent:      { label: 'Sent',      color: '#6366F1', bg: '#6366F118' },
  paid:      { label: 'Paid',      color: '#10B981', bg: '#10B98118' },
  overdue:   { label: 'Overdue',   color: '#EF4444', bg: '#EF444418' },
  cancelled: { label: 'Cancelled', color: '#9090AA', bg: '#9090AA10' },
};

export const QUOTATION_STATES = {
  draft:    { label: 'Draft',    color: '#9090AA', bg: '#9090AA18' },
  sent:     { label: 'Sent',    color: '#6366F1', bg: '#6366F118' },
  accepted: { label: 'Accepted', color: '#10B981', bg: '#10B98118' },
  invoiced: { label: 'Invoiced', color: '#7C3AED', bg: '#7C3AED18' },
  declined: { label: 'Declined', color: '#EF4444', bg: '#EF444418' },
  expired:  { label: 'Expired',  color: '#F59E0B', bg: '#F59E0B18' },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

export const fmtINR = (n) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export const fmtDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
};

// Build the authenticated PDF URL — token in query so it opens in browser/WebView
// Uses the stored per-workspace base URL so it works for any client slug.
export const pdfUrl = (path) => {
  const token = storage.getString('access_token');
  const base = storage.getString('api_base_url') || API_BASE_URL || 'http://10.0.2.2:8000/api';
  return `${base}${path}?token=${token}`;
};

// ── Invoice service ────────────────────────────────────────────────────────────

const invoiceService = {
  INVOICE_STATES,
  QUOTATION_STATES,
  fmtINR,
  fmtDate,

  // ── Invoices ────────────────────────────────────────────────────────────────

  async listInvoices({ search = '', state = null, limit = 80 } = {}) {
    try {
      const { data } = await api.get('/invoices', {
        params: { search: search || undefined, state: state || undefined, limit },
      });
      return data || [];
    } catch { return []; }
  },

  async getInvoice(id) {
    const { data } = await api.get(`/invoices/${id}`);
    return data;
  },

  async sendInvoice(id) {
    const { data } = await api.post(`/invoices/${id}/send`);
    return data;
  },

  async recordPayment(id, body) {
    const { data } = await api.post(`/invoices/${id}/record-payment`, body);
    return data;
  },

  async sendWhatsApp(id) {
    const { data } = await api.post(`/invoices/${id}/send-whatsapp`);
    return data;
  },

  invoicePdfUrl(id) { return pdfUrl(`/invoices/${id}/pdf`); },

  async createInvoice(body) {
    const { data } = await api.post('/invoices', body);
    return data;
  },

  async updateInvoice(id, body) {
    const { data } = await api.patch(`/invoices/${id}`, body);
    return data;
  },

  // ── Quotations ──────────────────────────────────────────────────────────────

  async listQuotations({ search = '', state = null, limit = 80 } = {}) {
    try {
      const { data } = await api.get('/quotations', {
        params: { search: search || undefined, state: state || undefined, limit },
      });
      return data || [];
    } catch { return []; }
  },

  async getQuotation(id) {
    const { data } = await api.get(`/quotations/${id}`);
    return data;
  },

  async sendQuotation(id) {
    const { data } = await api.post(`/quotations/${id}/send`);
    return data;
  },

  async createQuotation(body) {
    const { data } = await api.post('/quotations', body);
    return data;
  },

  async updateQuotation(id, body) {
    const { data } = await api.patch(`/quotations/${id}`, body);
    return data;
  },

  async convertToInvoice(id) {
    const { data } = await api.post(`/quotations/${id}/convert`);
    return data;
  },

  quotationPdfUrl(id) { return pdfUrl(`/quotations/${id}/pdf`); },
};

export default invoiceService;
