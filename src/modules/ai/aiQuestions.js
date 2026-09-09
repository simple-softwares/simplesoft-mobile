import api from '../../services/api/httpClient';

const _d   = () => new Date();
const _iso = dt => dt.toISOString().split('T')[0];

export const TODAY          = () => _iso(_d());
export const START_OF_WEEK  = () => { const d = _d(); d.setDate(d.getDate() - d.getDay() + 1); return _iso(d); };
export const END_OF_WEEK    = () => { const d = _d(); d.setDate(d.getDate() - d.getDay() + 7); return _iso(d); };
export const START_OF_MONTH = () => { const d = _d(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; };

const num = n => Number(n || 0).toLocaleString('en-IN');
const rs  = n => `Rs${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export const CATEGORIES = [
  { key: 'all',      label: 'All',      icon: 'apps-outline',        color: '#6B7280' },
  { key: 'projects', label: 'Projects', icon: 'folder-outline',      color: '#7C3AED' },
  { key: 'tasks',    label: 'Tasks',    icon: 'checkbox-outline',    color: '#2563EB' },
  { key: 'contacts', label: 'Contacts', icon: 'people-outline',      color: '#EA580C' },
  { key: 'sales',    label: 'Sales',    icon: 'cash-outline',        color: '#16A34A' },
  { key: 'crm',      label: 'CRM',      icon: 'trending-up-outline', color: '#DB2777' },
];

let _statsCache = null;
let _statsCacheTime = 0;
async function getDashboardStats() {
  if (_statsCache && Date.now() - _statsCacheTime < 60_000) return _statsCache;
  const { data } = await api.get('/dashboard');
  _statsCache = data.stats || {};
  _statsCacheTime = Date.now();
  return _statsCache;
}

let _erpCache = null;
let _erpCacheTime = 0;
async function getErpStats() {
  if (_erpCache && Date.now() - _erpCacheTime < 60_000) return _erpCache;
  const { data } = await api.get('/dashboard/erp');
  _erpCache = data || {};
  _erpCacheTime = Date.now();
  return _erpCache;
}

export const QUESTIONS = [
  // Projects
  {
    id: 'prj_001', text: 'Total active projects', cat: 'projects',
    icon: 'folder-open-outline', color: '#7C3AED',
    exec: async () => { const s = await getDashboardStats(); return { value: num(s.total_projects), sub: 'Active projects in workspace' }; },
  },
  {
    id: 'prj_002', text: 'Projects with overdue tasks', cat: 'projects',
    icon: 'alert-circle-outline', color: '#EF4444',
    exec: async () => {
      const today = TODAY();
      const { data } = await api.get('/tasks', { params: { limit: 500 } });
      const ids = new Set((data || []).filter(t => t.date_deadline && t.date_deadline < today).map(t => t.project_id).filter(Boolean));
      return { value: num(ids.size), sub: 'Projects containing overdue tasks' };
    },
  },

  // Tasks
  {
    id: 'tsk_001', text: 'Total tasks', cat: 'tasks',
    icon: 'checkbox-outline', color: '#2563EB',
    exec: async () => { const s = await getDashboardStats(); return { value: num(s.total_tasks), sub: 'All tasks in workspace' }; },
  },
  {
    id: 'tsk_002', text: 'Open (pending) tasks', cat: 'tasks',
    icon: 'radio-button-on-outline', color: '#2563EB',
    exec: async () => { const s = await getDashboardStats(); return { value: num(s.open_tasks), sub: 'Tasks not yet completed' }; },
  },
  {
    id: 'tsk_003', text: 'Overdue tasks', cat: 'tasks',
    icon: 'warning-outline', color: '#EF4444',
    exec: async () => { const s = await getDashboardStats(); return { value: num(s.overdue_tasks), sub: 'Tasks past their deadline' }; },
  },
  {
    id: 'tsk_004', text: 'Tasks due this week', cat: 'tasks',
    icon: 'calendar-outline', color: '#F59E0B',
    exec: async () => {
      const t = TODAY(); const end = END_OF_WEEK();
      const { data } = await api.get('/tasks', { params: { limit: 500 } });
      const due = (data || []).filter(t2 => t2.date_deadline >= t && t2.date_deadline <= end);
      return { value: num(due.length), sub: 'Due by end of this week' };
    },
  },
  {
    id: 'tsk_005', text: 'High priority tasks', cat: 'tasks',
    icon: 'star-outline', color: '#EF4444',
    exec: async () => {
      const { data } = await api.get('/tasks', { params: { limit: 500 } });
      const high = (data || []).filter(t => t.priority === '3' || t.priority === '2');
      return { value: num(high.length), sub: 'High or urgent priority tasks' };
    },
  },

  // Contacts
  {
    id: 'cnt_001', text: 'Total contacts', cat: 'contacts',
    icon: 'people-circle-outline', color: '#EA580C',
    exec: async () => { const s = await getDashboardStats(); return { value: num(s.total_contacts), sub: 'Contacts in workspace' }; },
  },
  {
    id: 'cnt_002', text: 'Total employees', cat: 'contacts',
    icon: 'person-outline', color: '#7C3AED',
    exec: async () => {
      const { data } = await api.get('/hr/employees', { params: { limit: 1 } });
      return { value: num(data?.total || data?.length || 0), sub: 'Employees in workspace' };
    },
  },

  // Sales
  {
    id: 'inv_001', text: 'Total invoiced this month (paid)', cat: 'sales',
    icon: 'cash-outline', color: '#16A34A',
    exec: async () => { const s = await getErpStats(); return { value: rs(s.paid_this_month ?? 0), sub: 'Paid invoices this month' }; },
  },
  {
    id: 'inv_002', text: 'Outstanding (unpaid) invoices', cat: 'sales',
    icon: 'time-outline', color: '#F59E0B',
    exec: async () => { const s = await getErpStats(); return { value: rs(s.outstanding_ar ?? 0), sub: 'Sent + overdue invoices' }; },
  },

  // CRM
  {
    id: 'crm_001', text: 'Open CRM leads', cat: 'crm',
    icon: 'trending-up-outline', color: '#DB2777',
    exec: async () => {
      const { data } = await api.get('/crm/leads', { params: { limit: 500 } });
      const open = (data || []).filter(l => l.stage_type !== 'won' && l.stage_type !== 'lost');
      return { value: num(open.length), sub: 'Leads in pipeline' };
    },
  },
  {
    id: 'crm_002', text: 'Won deals this month', cat: 'crm',
    icon: 'trophy-outline', color: '#16A34A',
    exec: async () => {
      const { data } = await api.get('/crm/leads', { params: { limit: 500 } });
      const mon = START_OF_MONTH();
      const won = (data || []).filter(l => l.stage_type === 'won' && (l.closed_at || l.updated_at) >= mon);
      return { value: num(won.length), sub: 'Won this month' };
    },
  },
];

export const searchQuestions = (query, category = 'all') => {
  const q = query.toLowerCase().trim();
  return QUESTIONS.filter(item => {
    if (category !== 'all' && item.cat !== category) return false;
    if (!q) return true;
    return item.text.toLowerCase().includes(q);
  });
};
