import backend from '../../backend/BackendService';
import api from '../api/httpClient';

class ContactsService {

  /**
   * List contacts with optional filtering and search
   * @param {object} opts { search?: string, type?: 'all'|'person'|'company', limit?: number }
   * @returns {Promise<Contact[]>}
   */
  async list({ search = '', type = 'all', limit = 50, offset = 0 } = {}) {
    try {
      return await backend.getContacts({ search: search.trim(), type, limit, offset });
    } catch (e) {
      return [];
    }
  }

  /**
   * Get a single contact by ID
   * @param {number} id Contact ID
   * @returns {Promise<Contact|null>}
   */
  async get(id) {
    try {
      return await backend.getContact(id);
    } catch (e) {
      return null;
    }
  }

  /**
   * Create a contact
   * @param {object} vals Contact data
   * @returns {Promise<number>} Contact ID
   */
  async create(vals) {
    return backend.createContact(vals);
  }

  /**
   * Update a contact
   * @param {number} id Contact ID
   * @param {object} vals Fields to update
   * @returns {Promise<void>}
   */
  async update(id, vals) {
    return backend.updateContact(id, vals);
  }

  /**
   * Delete a contact
   * @param {number} id Contact ID
   * @returns {Promise<void>}
   */
  async delete(id) {
    return backend.deleteContact(id);
  }

  /**
   * Get tasks linked to a contact
   * @param {number} partnerId Contact ID
   * @returns {Promise<Task[]>}
   */
  async getLinkedTasks(contactId) {
    try {
      const { data } = await api.get('/tasks', { params: { contact_id: contactId, limit: 20 } });
      return data || [];
    } catch (e) {
      return [];
    }
  }

  // ── Helpers ──
  getColor(id) {
    const colors = ['#7C3AED', '#2563EB', '#D97706', '#059669', '#DC2626', '#0891B2', '#BE185D', '#9333EA'];
    return colors[(id || 0) % colors.length];
  }

  getInitials(name) {
    return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }
}

export default new ContactsService();
