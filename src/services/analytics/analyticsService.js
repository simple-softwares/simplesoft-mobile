/**
 * AnalyticsService — Firebase Analytics + Crashlytics wrapper
 * Uses the v22 modular API (getAnalytics / getCrashlytics).
 *
 * Usage:
 *   import Analytics from '../services/analytics/analyticsService';
 *   Analytics.screen('TaskDetail');
 *   Analytics.taskCreated({ projectId: 3 });
 *   Analytics.recordError(error, 'TaskDetailsScreen');
 */

import {
  getAnalytics,
  logEvent,
  setUserId    as analyticsSetUserId,
  setUserProperties,
} from '@react-native-firebase/analytics';

import {
  getCrashlytics,
  log          as crashLog,
  recordError  as crashRecord,
  setUserId    as crashSetUserId,
} from '@react-native-firebase/crashlytics';

// Resolve once — avoids repeated getApp() calls
const _analytics    = getAnalytics();
const _crashlytics  = getCrashlytics();

// ── Safe call helper — analytics must never crash the app ─────
const safe = async (fn) => {
  try { await fn(); } catch {}
};

const Analytics = {

  // ── Identity ────────────────────────────────────────────────
  setUser(uid, name) {
    safe(() => analyticsSetUserId(_analytics, String(uid)));
    safe(() => setUserProperties(_analytics, { user_name: name || '' }));
    safe(() => crashSetUserId(_crashlytics, String(uid)));
  },

  clearUser() {
    safe(() => analyticsSetUserId(_analytics, null));
    safe(() => crashSetUserId(_crashlytics, ''));
  },

  // ── Auth events ─────────────────────────────────────────────
  login(method = 'email') {
    safe(() => logEvent(_analytics, 'login', { method }));
    safe(() => crashLog(_crashlytics, `login:${method}`));
  },

  logout() {
    safe(() => logEvent(_analytics, 'logout'));
  },

  // ── Screen tracking — logScreenView removed in v22 ──────────
  screen(screenName, screenClass) {
    safe(() => logEvent(_analytics, 'screen_view', {
      screen_name:  screenName,
      screen_class: screenClass || screenName,
    }));
  },

  // ── Task events ─────────────────────────────────────────────
  taskCreated(params = {}) {
    safe(() => logEvent(_analytics, 'task_created', {
      project_id:   params.projectId  || 0,
      has_deadline: !!params.deadline,
      priority:     params.priority   || '0',
    }));
  },

  taskUpdated(field) {
    safe(() => logEvent(_analytics, 'task_updated', { field: field || 'unknown' }));
  },

  taskDeleted() {
    safe(() => logEvent(_analytics, 'task_deleted'));
  },

  taskMarkedDone() {
    safe(() => logEvent(_analytics, 'task_marked_done'));
  },

  // ── Project events ───────────────────────────────────────────
  projectCreated() {
    safe(() => logEvent(_analytics, 'project_created'));
  },

  // ── Search ──────────────────────────────────────────────────
  search(term) {
    safe(() => logEvent(_analytics, 'search', { search_term: term || '' }));
  },

  // ── Notes ───────────────────────────────────────────────────
  noteCreated() {
    safe(() => logEvent(_analytics, 'note_created'));
  },

  // ── Error reporting ─────────────────────────────────────────
  recordError(error, context = '') {
    safe(() => {
      if (context) crashLog(_crashlytics, `[${context}]`);
      crashRecord(_crashlytics, error instanceof Error ? error : new Error(String(error)));
    });
  },

  log(message) {
    safe(() => crashLog(_crashlytics, message));
  },
};

export default Analytics;
