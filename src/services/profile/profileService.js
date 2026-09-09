import api from '../api/httpClient';
import SessionService from '../auth/sessionService';

class ProfileService {

  async getProfile() {
    const { data } = await api.get('/users/me');
    return data;
  }

  async updateProfile({ name, phone }) {
    const vals = {};
    if (name?.trim())       vals.name  = name.trim();
    if (phone !== undefined) vals.phone = phone?.trim() || null;

    const { data } = await api.patch('/users/me', vals);

    try {
      const saved = SessionService.getSession() || {};
      if (vals.name) saved.name = vals.name;
      SessionService.saveSession(saved);
    } catch {}

    return data;
  }

  async uploadPhoto(base64Image) {
    const clean = base64Image.replace(/^data:image\/\w+;base64,/, '');
    await api.patch('/users/me', { avatar_base64: clean });
    return true;
  }

  async changePassword(currentPassword, newPassword) {
    const { data } = await api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password:     newPassword,
    });
    return data;
  }

  avatarUrl(userId) {
    return null;
  }
}

export default new ProfileService();
