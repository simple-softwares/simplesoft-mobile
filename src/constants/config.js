// REFACTORED: Re-export from the centralized src/config/index.js
// Kept for backward compatibility with existing imports

export { FALLBACK_BASE_URL as API_BASE_URL, DATABASE, TASK_PRIORITIES } from '../config';
export { KEYS as STORAGE_KEYS } from '../services/auth/sessionService';


export const DEFAULT_PRIORITY = '1';
