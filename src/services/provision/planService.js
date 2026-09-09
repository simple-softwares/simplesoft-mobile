import axios from 'axios';
import { planStorage as storage } from '../storage/storageRegistry';
import { store } from '../../store';
import { setPlan } from '../../store/slices/planSlice';
import { PROVISION_BASE } from '../../config';
 
class PlanService {
 
  // ── Fetch plan from server ────────────────────────────────
  async fetchPlan(slug) {
    try {
      const res = await axios.get(`${PROVISION_BASE}/api/workspace/${slug}`, { timeout: 8000 });
      const data = res.data.plan || res.data;


      // Map selected_modules to modules for compatibility
      if (data && data.selected_modules && !data.modules) {
        data.modules = data.selected_modules;
      } else if (data) {
      }

      storage.set('plan_data', JSON.stringify(data));
      store.dispatch(setPlan(data));
      return data;
    } catch (e) {
      const cached = storage.getString('plan_data');
      return cached ? JSON.parse(cached) : null;
    }
  }
 
  // ── Get cached plan (sync) ────────────────────────────────
  getCachedPlan() {
    const cached = storage.getString('plan_data');
    return cached ? JSON.parse(cached) : null;
  }
 
  // ── Check specific limits ─────────────────────────────────
  canCreateTask() {
    const plan = this.getCachedPlan();
    if (!plan) return { allowed: true };
    if (plan.is_read_only) return { allowed: false, reason: 'readonly' };
    return { allowed: true };
  }
 
  canCreateProject() {
    const plan = this.getCachedPlan();
    if (!plan) return { allowed: true };
    if (plan.is_read_only) return { allowed: false, reason: 'readonly' };
    return { allowed: true };
  }
 
  canAddMember() {
    const plan = this.getCachedPlan();
    if (!plan) return { allowed: true };
    if (plan.is_read_only) return { allowed: false, reason: 'readonly' };
    return { allowed: true };
  }
 
  canAddModule() {
    const plan = this.getCachedPlan();
    if (!plan) return { allowed: true };
    if (plan.is_read_only) return { allowed: false, reason: 'readonly' };
    return { allowed: true };
  }
 
  isReadOnly() {
    return this.getCachedPlan()?.is_read_only || false;
  }
 
  /**
   * Convenience: fetch plan and return it (same as fetchPlan but always returns result).
   */
  async refreshPlan(slug) {
    return this.fetchPlan(slug);
  }

  /**
   * True only when workspace is not read-only (active).
   */
  isActive() {
    const plan = this.getCachedPlan();
    if (!plan) return true;
    return !plan.is_read_only;
  }
}

export default new PlanService();
