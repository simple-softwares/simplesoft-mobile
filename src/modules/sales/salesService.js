import api from '../../services/api/httpClient';

const STATUS_CONFIG = {
  draft:                { label: 'Draft',       color: '#9E9E9E' },
  confirmed:            { label: 'Confirmed',   color: '#4CAF50' },
  partially_dispatched: { label: 'In Progress', color: '#FF9800' },
  fully_fulfilled:      { label: 'Fulfilled',   color: '#2196F3' },
  cancelled:            { label: 'Cancelled',   color: '#F44336' },
};

const salesService = {
  STATUS_CONFIG,

  async getOrders({ search = '', status = null, limit = 100 } = {}) {
    try {
      const { data } = await api.get('/sales/orders', {
        params: { search: search || undefined, status: status || undefined, limit },
      });
      return data || [];
    } catch { return []; }
  },

  async getQuotations(opts = {}) {
    return salesService.getOrders({ ...opts, status: 'draft' });
  },

  async getOrder(id) {
    const { data } = await api.get(`/sales/orders/${id}`);
    return data;
  },

  async createOrder(vals) {
    const { data } = await api.post('/sales/orders', vals);
    return data;
  },

  async updateOrder(id, vals) {
    const { data } = await api.patch(`/sales/orders/${id}`, vals);
    return data;
  },

  async confirmOrder(id) {
    const { data } = await api.post(`/sales/orders/${id}/confirm`);
    return data;
  },

  async cancelOrder(id) {
    const { data } = await api.post(`/sales/orders/${id}/cancel`);
    return data;
  },

  async dispatchOrder(id, lines) {
    const { data } = await api.post(`/sales/orders/${id}/dispatch`, { lines });
    return data;
  },

  async deleteOrder(id) {
    await api.delete(`/sales/orders/${id}`);
  },

  async getStats() {
    try { const { data } = await api.get('/sales/stats'); return data || {}; }
    catch { return {}; }
  },

  async getCustomers({ search = '', limit = 50 } = {}) {
    try {
      const { data } = await api.get('/contacts/customers', {
        params: { search: search || undefined, limit },
      });
      return data || [];
    } catch { return []; }
  },

  async getCustomer(id) {
    try {
      const { data } = await api.get(`/contacts/customers/${id}`);
      return data;
    } catch { return null; }
  },

  async getOrdersByPartner(partnerId) {
    try {
      const { data } = await api.get('/sales/orders', {
        params: { customer_id: partnerId, limit: 50 },
      });
      return data || [];
    } catch { return []; }
  },

  getStatusLabel(status) { return STATUS_CONFIG[status]?.label || status; },
  getStatusColor(status) { return STATUS_CONFIG[status]?.color || '#9E9E9E'; },
};

export default salesService;
