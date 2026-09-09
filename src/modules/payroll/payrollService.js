import api from '../../services/api/httpClient';
import { storage } from '../../services/storage/mmkv';
import { API_BASE_URL } from '../../config';

export const PAYROLL_STATES = {
  draft:    { label: 'Draft',    color: '#6366F1', bg: '#6366F118', icon: 'document-outline' },
  approved: { label: 'Approved', color: '#F59E0B', bg: '#F59E0B18', icon: 'checkmark-circle-outline' },
  paid:     { label: 'Paid',     color: '#10B981', bg: '#10B98118', icon: 'cash-outline' },
};

export const fmtINR = (n) => {
  if (!n && n !== 0) return '₹0';
  return '₹' + Number(n).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

export const fmtMonth = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    month: 'long', year: 'numeric',
  });
};

const payrollService = {
  async listRuns() {
    try {
      const { data } = await api.get('/payroll/runs');
      return data || [];
    } catch { return []; }
  },

  async getRun(id) {
    const { data } = await api.get(`/payroll/runs/${id}`);
    return data;
  },

  payslipUrl(runId, lineId) {
    const token = storage.getString('access_token');
    const base  = storage.getString('api_base_url') || API_BASE_URL || 'http://10.0.2.2:8000/api';
    return `${base}/payroll/runs/${runId}/lines/${lineId}/payslip?token=${token}`;
  },
};

export default payrollService;
