import api from '../../services/api/httpClient';

const crmService = {
  async getLeads({ search = '', stageId = null, limit = 80 } = {}) {
    try {
      const { data } = await api.get('/crm/leads', {
        params: { search: search || undefined, stage_id: stageId || undefined, limit },
      });
      return data || [];
    } catch { return []; }
  },

  async getLead(id) {
    const { data } = await api.get(`/crm/leads/${id}`);
    return data;
  },

  async createLead(vals) {
    const { data } = await api.post('/crm/leads', vals);
    return data;
  },

  async updateLead(id, vals) {
    const { data } = await api.patch(`/crm/leads/${id}`, vals);
    return data;
  },

  async deleteLead(id) {
    await api.delete(`/crm/leads/${id}`);
  },

  async markWon(id) {
    const { data } = await api.patch(`/crm/leads/${id}`, { is_won: true });
    return data;
  },

  async markLost(id) {
    const { data } = await api.patch(`/crm/leads/${id}`, { active: false });
    return data;
  },

  async getStages() {
    try { const { data } = await api.get('/crm/stages'); return data || []; }
    catch { return []; }
  },

  async moveLead(id, stageId) {
    const { data } = await api.patch(`/crm/leads/${id}`, { stage_id: stageId });
    return data;
  },

  async getPipelineStats() {
    try { const { data } = await api.get('/crm/stats'); return data || {}; }
    catch { return {}; }
  },

  async getLeadSources() {
    try { const { data } = await api.get('/crm/lead-sources'); return data || []; }
    catch { return []; }
  },

  // ── Visit Logs ────────────────────────────────────────────────────────
  async getVisitLogs(params = {}) {
    try { const { data } = await api.get('/crm/visit-logs', { params }); return data || []; }
    catch { return []; }
  },

  async createVisitLog(vals) {
    const { data } = await api.post('/crm/visit-logs', vals);
    return data;
  },

  async updateVisitLog(id, vals) {
    const { data } = await api.patch(`/crm/visit-logs/${id}`, vals);
    return data;
  },

  async deleteVisitLog(id) {
    await api.delete(`/crm/visit-logs/${id}`);
  },
};

export default crmService;
