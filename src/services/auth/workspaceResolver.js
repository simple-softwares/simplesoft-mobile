/**
 * Workspace resolver — derives the workspace slug from a user's email address.
 *
 * Email convention: firstname@workspace_slug.in
 * Also supports the subdomain form: user@workspace_slug.simplesoft.co.in
 *
 * After extraction the slug is verified against the backend public endpoint
 * so the login screen can show the workspace display name before the user
 * types their password.
 */

import { workspaceApiUrl } from '../../config';

/**
 * Extract workspace slug from an email address domain.
 *   john@acmecorp.in              → "acmecorp"
 *   john@acmecorp.simplesoft.co.in → "acmecorp"
 *   admin@gmail.com               → null  (can't determine)
 */
export function extractSlug(email) {
  const domain = (email || '').toLowerCase().split('@')[1];
  if (!domain) return null;

  // Subdomain form: slug.simplesoft.co.in
  if (domain.endsWith('.simplesoft.co.in')) {
    const slug = domain.slice(0, -'.simplesoft.co.in'.length);
    return slug || null;
  }
  if (domain.endsWith('.simplesoft.in')) {
    const slug = domain.slice(0, -'.simplesoft.in'.length);
    return slug || null;
  }

  // Primary workspace email form: slug.in
  const parts = domain.split('.');
  if (parts.length === 2 && parts[1] === 'in') {
    return parts[0] || null;
  }

  // Unknown domain (.com, .org, etc.) — cannot reliably determine slug
  return null;
}

/**
 * Verify a slug exists on the backend and return the workspace display name.
 * Returns null on network error so the caller can degrade gracefully
 * (proceed to login without confirmation).
 *
 * @returns {{ slug: string, name: string, found: boolean } | null}
 */
export async function verifyWorkspace(slug) {
  if (!slug) return null;
  try {
    const base = workspaceApiUrl(slug);
    const res  = await fetch(`${base}/public/workspace/${slug}`, {
      method:  'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      return { slug: data.slug, name: data.name, found: true };
    }
    if (res.status === 404) {
      return { slug, name: slug, found: false };
    }
    return null; // server error — degrade gracefully
  } catch {
    return null; // network error — degrade gracefully
  }
}
