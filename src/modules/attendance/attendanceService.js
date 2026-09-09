import api from '../../services/api/httpClient';

const attendanceService = {
  STATUS_COLORS: { checked_in: '#4CAF50', checked_out: '#9E9E9E' },

  async getStatus(employeeId) {
    try { const { data } = await api.get(`/attendance/status/${employeeId}`); return data; }
    catch { return { attendance_state: 'checked_out' }; }
  },

  async checkIn(employeeId) {
    const { data } = await api.post('/attendance/check-in', { employee_id: employeeId });
    return data;
  },

  async checkOut(employeeId) {
    const { data } = await api.post('/attendance/check-out', { employee_id: employeeId });
    return data;
  },

  async getMyAttendance(employeeId, { dateFrom, dateTo } = {}) {
    try {
      const { data } = await api.get('/attendance', {
        params: { employee_id: employeeId, date_from: dateFrom, date_to: dateTo },
      });
      return data || [];
    } catch { return []; }
  },

  async getTeamAttendance({ dateFrom, dateTo } = {}) {
    try {
      const { data } = await api.get('/attendance/team', {
        params: { date_from: dateFrom, date_to: dateTo },
      });
      return data || [];
    } catch { return []; }
  },
};

export default attendanceService;
