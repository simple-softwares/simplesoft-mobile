// ── API Base URL ──────────────────────────────────────────────
// Each workspace gets its own subdomain: https://{slug}.simplesoft.co.in/api
// In dev (emulator), override with the local server. On a real device, always use the subdomain.
const LOCAL_API_BASE_URL = 'http://127.0.0.1:8000/api';
const PUBLIC_APP_DOMAIN = 'simplesoft.co.in';

export const API_BASE_URL = __DEV__ ? LOCAL_API_BASE_URL : null;
export const PROVISION_BASE = __DEV__ ? LOCAL_API_BASE_URL.replace(/\/api$/, '') : `https://provision.${PUBLIC_APP_DOMAIN}`;
export const ADMIN_PROVISION_BASE = PROVISION_BASE;
export const ADMIN_PROVISION_SECRET = '';

// Build the workspace API URL from a slug. Called at login time.
export function workspaceApiUrl(slug) {
  if (API_BASE_URL) return API_BASE_URL;
  return `https://${slug}.${PUBLIC_APP_DOMAIN}/api`;
}

export function workspaceWebUrl(slug) {
  if (__DEV__) return LOCAL_API_BASE_URL.replace(/\/api$/, '');
  return `https://${slug}.${PUBLIC_APP_DOMAIN}`;
}

// ── 3rd Party Configuration ───────────────────────────────────
export const GOOGLE_WEB_CLIENT_ID = '480330871250-0hrts60lab2algs69vqtk9r011rn1k1h.apps.googleusercontent.com';

// ── Billing contact info ──────────────────────────────────────
export const BILLING_UPI_ID   = 'simplesoftsolutions@ybl';
export const BILLING_UPI_NAME = 'SimpleSoft Solutions';
export const BILLING_WHATSAPP = '+919XXXXXXXXX';
export const BILLING_EMAIL    = 'billing@simplesoft.co.in';

// ── Plan tiers (UI display only — not enforced here) ─────────
export const PLAN_TIERS = [
  {
    key: 'foundation', name: 'Foundation', price: 999, color: '#2196F3', popular: false,
    features: ['Up to 5 users', 'Projects & Tasks', 'Notes, Contacts'],
  },
  {
    key: 'operations', name: 'Operations', price: 2999, color: '#7C3AED', popular: true,
    features: ['Up to 20 users', 'All core modules', 'CRM, Sales, HR'],
  },
  {
    key: 'automated', name: 'Automated', price: 5999, color: '#059669', popular: false,
    features: ['Unlimited users', 'AI features', 'Automation', 'Performance'],
  },
];

// ── Feature Flags ─────────────────────────────────────────────
export const FEATURES = {
  TIMESHEETS:    true,
  KANBAN:        true,
  TEAM_INVITES:  true,
  NOTIFICATIONS: true,
};

// ── Task priority constants ───────────────────────────────────
export const TASK_PRIORITIES = {
  '0': { label: 'Low',    color: '#9090AA', icon: '⬇️' },
  '1': { label: 'Normal', color: '#7C3AED', icon: '➡️' },
  '2': { label: 'High',   color: '#F59E0B', icon: '⬆️' },
  '3': { label: 'Urgent', color: '#EF4444', icon: '🔺' },
};
