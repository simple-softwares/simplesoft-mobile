import api from '../../services/api/httpClient';

const calendarService = {
  async getEvents({ dateFrom, dateTo } = {}) {
    try {
      const { data } = await api.get('/calendar/events', {
        params: { date_from: dateFrom, date_to: dateTo },
      });
      return data || [];
    } catch { return []; }
  },

  async getEvent(id) {
    const { data } = await api.get(`/calendar/events/${id}`);
    return data;
  },

  async createEvent(vals) {
    const { data } = await api.post('/calendar/events', vals);
    return data;
  },

  async updateEvent(id, vals) {
    const { data } = await api.patch(`/calendar/events/${id}`, vals);
    return data;
  },

  async deleteEvent(id) {
    await api.delete(`/calendar/events/${id}`);
  },
};

export default calendarService;
