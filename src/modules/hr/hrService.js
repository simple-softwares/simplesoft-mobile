import api from '../../services/api/httpClient';

const hrService = {
  STATE_LABELS: {
    confirm:  { label: 'Pending',  color: '#FF9800' },
    validate: { label: 'Approved', color: '#4CAF50' },
    refuse:   { label: 'Refused',  color: '#F44336' },
  },

  async getEmployees({ search = '', departmentId = null, limit = 80 } = {}) {
    const params = { limit };
    if (search)       params.search = search;
    if (departmentId) params.department_id = departmentId;
    const { data } = await api.get('/hr/employees', { params });
    return data || [];
  },

  async getEmployee(id) {
    const { data } = await api.get(`/hr/employees/${id}`);
    return data;
  },

  async createEmployee(vals) {
    const { data } = await api.post('/hr/employees', vals);
    return data;
  },

  async updateEmployee(id, vals) {
    const { data } = await api.patch(`/hr/employees/${id}`, vals);
    return data;
  },

  async deleteEmployee(id) {
    await api.delete(`/hr/employees/${id}`);
  },

  async setPassword(employeeId, newPassword) {
    const { data } = await api.post(`/hr/employees/${employeeId}/set-password`, { password: newPassword });
    return data;
  },

  async createAccount(employeeId, email, password) {
    const { data } = await api.post(`/hr/employees/${employeeId}/create-account`, { email, password });
    return data;
  },

  async getDepartments() {
    const { data } = await api.get('/hr/departments');
    return data || [];
  },

  async createDepartment(vals) {
    const { data } = await api.post('/hr/departments', vals);
    return data;
  },

  async updateDepartment(id, vals) {
    const { data } = await api.patch(`/hr/departments/${id}`, vals);
    return data;
  },

  async deleteDepartment(id) {
    await api.delete(`/hr/departments/${id}`);
  },

  async getMyLeaves() {
    try {
      const { data } = await api.get('/hr/leaves');
      return data || [];
    } catch { return []; }
  },

  async getTeamLeaves() {
    try {
      const { data } = await api.get('/hr/leaves/pending-approval');
      return data || [];
    } catch { return []; }
  },

  async getLeaveTypes() {
    try {
      const { data } = await api.get('/hr/leave-types');
      return data || [];
    } catch { return []; }
  },

  async createLeave(vals) {
    const { data } = await api.post('/hr/leaves', vals);
    return data;
  },

  async approveLeave(id) {
    const { data } = await api.post(`/hr/leaves/${id}/approve`);
    return data;
  },

  async refuseLeave(id) {
    const { data } = await api.post(`/hr/leaves/${id}/refuse`);
    return data;
  },

  async getEducation(employeeId) {
    try {
      const { data } = await api.get(`/hr/employees/${employeeId}/education`);
      return data || [];
    } catch { return []; }
  },

  async createEducation(employeeId, vals) {
    const { data } = await api.post(`/hr/employees/${employeeId}/education`, vals);
    return data;
  },

  async deleteEducation(employeeId, eduId) {
    await api.delete(`/hr/employees/${employeeId}/education/${eduId}`);
  },

  async getExperience(employeeId) {
    try {
      const { data } = await api.get(`/hr/employees/${employeeId}/experience`);
      return data || [];
    } catch { return []; }
  },

  async createExperience(employeeId, vals) {
    const { data } = await api.post(`/hr/employees/${employeeId}/experience`, vals);
    return data;
  },

  async deleteExperience(employeeId, expId) {
    await api.delete(`/hr/employees/${employeeId}/experience/${expId}`);
  },
};

export default hrService;
