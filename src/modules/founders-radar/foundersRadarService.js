import api from '../../services/api/httpClient';

function fyStart() {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-04-01`;
}

function today() {
  return new Date().toISOString().split('T')[0];
}

const foundersRadarService = {
  async getBusinessPulse() {
    const [dashRes, erpRes, plRes, empRes] = await Promise.allSettled([
      api.get('/dashboard'),
      api.get('/dashboard/erp'),
      api.get('/accounting/reports/profit-loss', {
        params: { from_date: fyStart(), to_date: today() },
      }),
      api.get('/hr/employees', { params: { limit: 200 } }),
    ]);

    return {
      dashboard: dashRes.status === 'fulfilled' ? dashRes.value.data : null,
      erp:       erpRes.status === 'fulfilled'  ? erpRes.value.data  : null,
      pl:        plRes.status === 'fulfilled'   ? plRes.value.data   : null,
      teamSize:  empRes.status === 'fulfilled'  ? (empRes.value.data?.length || 0) : 0,
    };
  },
};

export default foundersRadarService;
