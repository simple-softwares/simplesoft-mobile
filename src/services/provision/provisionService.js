import axios from 'axios';
import { workspaceStorage as storage } from '../storage/storageRegistry';
import { PROVISION_BASE, workspaceWebUrl } from '../../config';
 
class ProvisionService {
 
  // ── Workspace config stored in MMKV ─────────────────────
  saveWorkspace(config) {
    storage.set('workspace', JSON.stringify(config));
  }
 
  getWorkspace() {
    const raw = storage.getString('workspace');
    return raw ? JSON.parse(raw) : null;
  }
 
  clearWorkspace() {
    storage.delete('workspace');
  }
 
  getBaseUrl() {
    const ws = this.getWorkspace();
    return ws?.workspace_url || workspaceWebUrl('workspace');
  }
 
  getModules() {
    const ws = this.getWorkspace();
    return ws?.modules || [];
  }
 
  isModuleEnabled(key) {
    return this.getModules().includes(key);
  }
 
  // ── API calls ────────────────────────────────────────────
  async checkSlug(slug) {
    // Use existing findWorkspace API by creating a dummy email with the slug
    // findWorkspace extracts slug from email domain: test@blackloop.in → blackloop
    const dummyEmail = `test@${slug}.in`;
    let lastError = null;

    // Retry once on network error (Odoo XMLRPC can be slow)
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await axios.get(
          `${PROVISION_BASE}/api/find-workspace?email=${encodeURIComponent(dummyEmail)}`,
          { timeout: 15000 } // 15 second timeout (was 8)
        );

        // If workspace found, slug is taken. If not found, slug is available.
        if (res.data.found) {
          return { available: false, message: `'${slug}' is already taken` };
        } else {
          return { available: true, message: `'${slug}' is available` };
        }
      } catch (e) {
        lastError = e;
        if (attempt === 1) {
        } else {
        }
      }
    }

    // If both attempts fail, assume available to not block signup
    return { available: true, message: `'${slug}' is available` };
  }

  async getModuleList() {
    const res = await axios.get(`${PROVISION_BASE}/api/billing/modules`, { timeout: 8000 });
    return res.data.modules;
  }
 
  async provision(data) {
    // Step 1: Create workspace (with admin credentials)
    const wsRes = await axios.post(`${PROVISION_BASE}/api/workspace`,
      {
        slug: data.slug,
        company_name: data.company,
        admin_email: data.email,
        phone: data.phone,
        password: data.password || '',  // Include password for admin user setup
      },
      { timeout: 15000 }
    );

    // Step 2: If modules provided, subscribe to them
    if (data.modules && data.modules.length > 0) {
      try {
        await axios.post(
          `${PROVISION_BASE}/api/workspace/${data.slug}/subscribe`,
          { modules: data.modules, months: 1 },
          { timeout: 15000 }
        );
      } catch (e) {
        // Don't throw - workspace was created successfully, just modules failed
      }
    }

    return wsRes.data;
  }
 
  async findWorkspace(email) {
    const res = await axios.get(
      `${PROVISION_BASE}/api/find-workspace?email=${encodeURIComponent(email)}`,
      { timeout: 15000 } // 15 second timeout for Odoo XMLRPC
    );
    return res.data; // { found, slug, company, workspace_url }
  }

  async getSubscription(slug) {
    const res = await axios.get(
      `${PROVISION_BASE}/api/workspace/${slug}/subscription`,
      { timeout: 8000 }
    );
    return res.data;
  }

  async registerFCMToken(userId, token, userEmail) {
    try {
      // Check if token is valid
      if (!token || token.length < 10) {
        return;
      }

      await axios.post(
        `${PROVISION_BASE}/api/notifications/register`,
        { user_id: userId, fcm_token: token, platform: 'mobile', user_email: userEmail },
        { timeout: 8000 }
      );
    } catch (error) {
      // Don't log as error for 404 - endpoint might not be implemented yet
      if (error.response?.status === 404) {
      } else {
      }
    }
  }

  async pollStatus(jobId) {
    const res = await axios.get(`${PROVISION_BASE}/status/${jobId}`,
      { timeout: 8000 }
    );
    return res.data;
  }
}
 
export default new ProvisionService();
