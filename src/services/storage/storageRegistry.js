// Central registry of all named MMKV instances
// Rule: every MMKV instance in the app is created here and ONLY here
// Services import the named export they need — never call `new MMKV(...)` elsewhere

import { MMKV } from 'react-native-mmkv';

// General-purpose / auth (replaces bare `new MMKV()` used in 5 files)
// Used for: sw_session, auth_user, active_timer
export const authStorage = new MMKV({ id: 'simplesoft-workspace' });

// Workspace configuration (slug, workspace_url, company, modules)
export const workspaceStorage = new MMKV({ id: 'workspace-config' });

// Redux persist store
export const reduxStorage = new MMKV({ id: 'redux-persist-store' });

// Notes/Obsidian feature (local notes with categories, tags)
export const notesStorage = new MMKV({ id: 'obsidian-notes' });

// Field discovery cache (field_get results per model)
export const fieldStorage = new MMKV({ id: 'field-discovery' });

// Module checker cache (installed modules)
export const moduleStorage = new MMKV({ id: 'module-checker' });

// Team service cache (member lists, teams)
export const teamStorage = new MMKV({ id: 'team-svc' });

// Plan/subscription data from provision API
export const planStorage = new MMKV({ id: 'plan-cache' });

// Payment records (local fallback cache)
export const paymentStorage = new MMKV({ id: 'payment-records' });

// Notifications (FCM token, notification history)
export const notifStorage = new MMKV({ id: 'notifications' });

// Search history (recent searches across all record types)
export const searchStorage = new MMKV({ id: 'search-history' });

// Sync service (offline queue, pending operations, dead letters)
export const syncStorage = new MMKV({ id: 'sync-store' });

// Phase 3 modules
export const calendarStorage = new MMKV({ id: 'calendar-cache' });
export const chatStorage = new MMKV({ id: 'chat-cache' });
export const filesStorage = new MMKV({ id: 'files-cache' });

// Default export for backward compatibility with existing imports like:
// import { MMKV } from 'react-native-mmkv'; const storage = new MMKV();
export default authStorage;
