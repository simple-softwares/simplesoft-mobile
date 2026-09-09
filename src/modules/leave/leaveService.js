import api from '../../services/api/httpClient';

const LEAVE_STATUSES = {
  draft:     'Draft',
  confirm:   'Waiting Approval',
  refuse:    'Refused',
  validate1: 'Approved by Manager',
  validate:  'Approved',
  cancel:    'Cancelled',
};

const STATUS_COLORS = {
  draft:     '#6B7280',
  confirm:   '#F59E0B',
  validate1: '#3B82F6',
  validate:  '#10B981',
  refuse:    '#EF4444',
  cancel:    '#9CA3AF',
};

const calculateWorkingDays = (startDate, endDate) => {
  let count = 0;
  const current = new Date(startDate);
  while (current <= new Date(endDate)) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
};

const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const LeaveService = {

  async getLeaveTypes() {
    try {
      const { data } = await api.get('/hr/leave-types');
      return data || [];
    } catch { return []; }
  },

  async getLeaveBalance(leaveTypeId = null) {
    try {
      const params = leaveTypeId ? { leave_type_id: leaveTypeId } : {};
      const { data } = await api.get('/hr/leave-balance', { params });
      return data || [];
    } catch { return []; }
  },

  async createLeaveRequest({ leaveTypeId, startDate, endDate, reason = '' }) {
    const startStr     = formatDate(startDate);
    const endStr       = formatDate(endDate);
    const numberOfDays = calculateWorkingDays(startDate, endDate);
    const { data } = await api.post('/hr/leaves', {
      leave_type_id: leaveTypeId,
      date_from:     startStr,
      date_to:       endStr,
      number_of_days: numberOfDays,
      reason:        reason || 'Leave Request',
    });
    return data;
  },

  async getMyLeaveRequests({ state = null, limit = 50 } = {}) {
    try {
      const params = { limit };
      if (state) params.state = state;
      const { data } = await api.get('/hr/leaves', { params });
      return data || [];
    } catch { return []; }
  },

  async getLeaveRequestsForApproval({ state = 'confirm', limit = 50 } = {}) {
    try {
      const { data } = await api.get('/hr/leaves/pending-approval', { params: { state, limit } });
      return data || [];
    } catch { return []; }
  },

  async approveLeave(leaveId) {
    const { data } = await api.post(`/hr/leaves/${leaveId}/approve`);
    return data;
  },

  async refuseLeave(leaveId, reason = '') {
    const { data } = await api.post(`/hr/leaves/${leaveId}/refuse`, { reason });
    return data;
  },

  async cancelLeave(leaveId) {
    const { data } = await api.post(`/hr/leaves/${leaveId}/cancel`);
    return data;
  },

  async getLeave(leaveId) {
    try {
      const { data } = await api.get(`/hr/leaves/${leaveId}`);
      return data;
    } catch { return null; }
  },

  async getLeaveCalendar(year, month) {
    try {
      const { data } = await api.get('/hr/leave-calendar', { params: { year, month } });
      return data || [];
    } catch { return []; }
  },

  getStatusLabel(state) { return LEAVE_STATUSES[state] || state; },
  getStatusColor(state) { return STATUS_COLORS[state] || '#CCCCCC'; },

  formatDateRange(startDate, endDate) {
    const start = new Date(startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    const end   = new Date(endDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${start} – ${end}`;
  },
};

export default LeaveService;
