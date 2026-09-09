import api from '../../services/api/httpClient';

const chatService = {
  async getChannels() {
    try { const { data } = await api.get('/chat/channels'); return data || []; }
    catch { return []; }
  },

  async getChannel(id) {
    const { data } = await api.get(`/chat/channels/${id}`);
    return data;
  },

  async createChannel(vals) {
    const { data } = await api.post('/chat/channels', vals);
    return data;
  },

  async getMessages(channelId, { limit = 50, before = null } = {}) {
    try {
      const { data } = await api.get(`/chat/channels/${channelId}/messages`, {
        params: { limit, before: before || undefined },
      });
      return data || [];
    } catch { return []; }
  },

  async sendMessage(channelId, body) {
    const { data } = await api.post(`/chat/channels/${channelId}/messages`, { body });
    return data;
  },

  async markRead(channelId) {
    try { await api.post(`/chat/channels/${channelId}/mark-read`); } catch {}
  },

  async getDirectChannel(userId) {
    const { data } = await api.post('/chat/direct', { user_id: userId });
    return data;
  },
};

export default chatService;
