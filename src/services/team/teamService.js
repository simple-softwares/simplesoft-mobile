import api from '../api/httpClient';

const COLORS = ['#7C3AED','#2563EB','#D97706','#059669','#DC2626','#0891B2','#BE185D','#9333EA'];

class TeamService {
  getColor(colorIndex) { return COLORS[colorIndex % COLORS.length] || COLORS[0]; }
  getRoleColor(role)   { return role === 'admin' ? '#7C3AED' : role === 'manager' ? '#2563EB' : '#059669'; }
  getRoleLabel(role)   { return role === 'admin' ? 'Admin' : role === 'manager' ? 'Manager' : 'Member'; }
  canManage(role)      { return role === 'admin' || role === 'manager'; }

  async getMembers() {
    try { const { data } = await api.get('/users'); return data || []; }
    catch { return []; }
  }

  async getTeams() {
    const { data } = await api.get('/teams');
    return data || [];
  }

  async getTeam(teamId) {
    const { data } = await api.get(`/teams/${teamId}`);
    return data;
  }

  async createTeam({ name, description, color }) {
    const { data } = await api.post('/teams', { name, description, color: color || 0 });
    return data;
  }

  async updateTeam(teamId, vals) {
    const { data } = await api.patch(`/teams/${teamId}`, vals);
    return data;
  }

  async deleteTeam(teamId) {
    await api.delete(`/teams/${teamId}`);
  }

  async addMember(teamId, userId, role = 'member') {
    const { data } = await api.post(`/teams/${teamId}/members`, { user_id: userId, role });
    return data;
  }

  async removeMember(teamId, userId) {
    await api.delete(`/teams/${teamId}/members/${userId}`);
  }

  async updateMemberRole(teamId, userId, role) {
    const { data } = await api.patch(`/teams/${teamId}/members/${userId}`, { role });
    return data;
  }
}

export default new TeamService();
