import httpClient from '../../services/api/httpClient';

const AutomationService = {
  async getNodeTypes() {
    try {
      const res = await httpClient.get('/automation/node-types');
      return res.data || [];
    } catch {
      return [];
    }
  },

  async list() {
    try {
      const res = await httpClient.get('/automation/workflows');
      return res.data || [];
    } catch {
      return [];
    }
  },

  async get(id) {
    try {
      const res = await httpClient.get(`/automation/workflows/${id}`);
      return res.data || null;
    } catch {
      return null;
    }
  },

  async create(data) {
    const res = await httpClient.post('/automation/workflows', data);
    return res.data || null;
  },

  async update(id, data) {
    const res = await httpClient.put(`/automation/workflows/${id}`, data);
    return res.data || null;
  },

  async delete(id) {
    await httpClient.delete(`/automation/workflows/${id}`);
  },

  // Pass currentActive so we know which endpoint to call
  async toggle(id, currentActive) {
    const endpoint = currentActive ? 'deactivate' : 'activate';
    const res = await httpClient.post(`/automation/workflows/${id}/${endpoint}`);
    return res.data?.active ?? !currentActive;
  },

  async trigger(id) {
    await httpClient.post(`/automation/workflows/${id}/run`);
  },

  async history(workflowId) {
    try {
      const res = await httpClient.get('/automation/runs', { params: { workflow_id: workflowId } });
      return (res.data || []).filter(r => !workflowId || r.workflow_id === workflowId);
    } catch {
      return [];
    }
  },
};

export default AutomationService;
