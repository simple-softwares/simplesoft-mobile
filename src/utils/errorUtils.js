/**
 * Converts any caught error into a user-friendly display string.
 * Handles Odoo RPC errors, axios HTTP errors, network failures, and generic JS errors.
 *
 * @param {any}    e        - The caught error object
 * @param {string} fallback - Shown when no friendly message can be extracted
 * @returns {string}
 */
export const friendlyError = (e, fallback = 'Something went wrong. Please try again.') => {
  if (!e) return fallback;

  const msg    = e?.message || '';
  const status = e?.response?.status;

  // ── Network / connectivity ─────────────────────────────────
  if (
    msg.includes('Network request failed') ||
    msg.toLowerCase().includes('network error') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ENOTFOUND') ||
    msg.includes('timeout') ||
    msg.includes('ETIMEDOUT')
  ) return 'Network error. Please check your connection.';

  // ── Auth ───────────────────────────────────────────────────
  if (
    msg.includes('SessionExpired') ||
    msg.includes('Session expired') ||
    status === 401
  ) return 'Your session has expired. Please log in again.';

  if (
    msg.includes('AccessDenied') ||
    msg.includes('Access Denied') ||
    status === 403
  ) return 'Access denied. You don\'t have permission for this action.';

  // ── HTTP status ────────────────────────────────────────────
  if (status === 404) return 'Not found. The item may have been deleted.';
  if (status >= 500)  return 'Server error. Please try again later.';

  // ── Server validation message (usually readable) ──────────
  const serverMsg = e?.response?.data?.error?.data?.message;
  if (serverMsg && typeof serverMsg === 'string' && serverMsg.length < 200 && !serverMsg.includes('\n')) {
    return serverMsg;
  }

  // ── Plain JS message — use only if it looks user-friendly ──
  if (
    msg &&
    msg.length < 150 &&
    !msg.includes(' at ') &&     // no stack frames
    !msg.includes('\n') &&        // no multiline
    !msg.includes('Error:') &&    // no chained errors
    !msg.includes('undefined')    // no internal nulls
  ) {
    return msg;
  }

  return fallback;
};
