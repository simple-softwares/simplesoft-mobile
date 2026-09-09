import { paymentStorage } from '../storage/storageRegistry';

class PaymentService {

  _generatePaymentId() {
    return `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  _paymentKey(slug, id) { return `payment:${slug}:${id}`; }
  _listKey(slug)        { return `payments:${slug}`; }

  async createPayment({ workspace_slug, workspace_id, tier, duration_months,
                        total_amount, payment_method = 'upi', payment_reference = '', notes = '' }) {
    const paymentId = this._generatePaymentId();
    const record = {
      id:             paymentId,
      workspace_slug: workspace_slug || '',
      workspace_id:   workspace_id || null,
      tier,
      months:         duration_months,
      amount:         total_amount,
      method:         payment_method,
      transaction_ref: payment_reference,
      notes,
      status:         'pending',
      payment_date:   new Date().toISOString().split('T')[0],
      created_at:     new Date().toISOString(),
      _local:         true,
    };

    paymentStorage.set(this._paymentKey(workspace_slug, paymentId), JSON.stringify(record));

    try {
      const existing = paymentStorage.getString(this._listKey(workspace_slug));
      const ids = existing ? JSON.parse(existing) : [];
      ids.push(paymentId);
      paymentStorage.set(this._listKey(workspace_slug), JSON.stringify(ids));
    } catch {}

    return record;
  }

  async getPayment(paymentId, workspaceSlug) {
    if (workspaceSlug) {
      const stored = paymentStorage.getString(this._paymentKey(workspaceSlug, paymentId));
      if (stored) return JSON.parse(stored);
    }
    throw new Error('Payment not found');
  }

  async getPaymentsByWorkspace(workspaceId, workspaceSlug) {
    if (!workspaceSlug) return [];
    try {
      const stored = paymentStorage.getString(this._listKey(workspaceSlug));
      if (!stored) return [];
      const ids = JSON.parse(stored);
      const results = [];
      for (const id of ids) {
        try { results.push(await this.getPayment(id, workspaceSlug)); } catch {}
      }
      return results.reverse();
    } catch {
      return [];
    }
  }

  async updatePaymentStatus(paymentId, status, workspaceSlug) {
    const key = this._paymentKey(workspaceSlug, paymentId);
    const stored = paymentStorage.getString(key);
    if (stored) {
      const payment = { ...JSON.parse(stored), status };
      if (status === 'confirmed') payment.confirmed_date = new Date().toISOString().split('T')[0];
      paymentStorage.set(key, JSON.stringify(payment));
    }
    return true;
  }

  async getCurrentSubscription() {
    return null;
  }

  formatPaymentForDisplay(payment) {
    return {
      id:            payment.id,
      tier:          payment.tier,
      amount:        payment.amount,
      duration:      payment.months,
      method:        payment.method,
      reference:     payment.transaction_ref,
      status:        payment.status,
      date:          payment.payment_date,
      confirmedDate: payment.confirmed_date,
      notes:         payment.notes,
    };
  }
}

export default new PaymentService();
