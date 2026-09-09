import httpClient from '../api/httpClient';
import { notesStorage as storage } from '../storage/storageRegistry';
import SyncService from '../sync/syncService';


// ── Cache ─────────────────────────────────────────────────────
const KEYS = {
  LIST: 'nv2_list',
  CATS: 'nv2_cats',
  note: id => `nv2_n_${id}`,
};
const cGet = k => { try { const v = storage.getString(k); return v ? JSON.parse(v) : null; } catch { return null; } };
const cSet = (k, v) => storage.set(k, JSON.stringify(v));
const cDel = k => storage.delete(k);

// ── Block ID counter ──────────────────────────────────────────
let _ctr = Date.now();
const mkId  = () => _ctr++;
const mkBlk = (type = 'text', content = '', checked = false) => ({ id: mkId(), type, content, checked });

// ── blocks ↔ HTML conversion ──────────────────────────────────
const esc   = s => (s || '').replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
const unesc = s => (s || '').replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/&nbsp;/g, ' ');

export const blocksToHtml = (blocks = []) =>
  blocks.map(b => {
    const c = esc(b.content || '');
    if (b.type === 'h1')      return `<h1>${c}</h1>`;
    if (b.type === 'h2')      return `<h2>${c}</h2>`;
    if (b.type === 'todo')    return `<li data-checked="${b.checked ? 'true' : 'false'}">${c}</li>`;
    if (b.type === 'code')    return `<pre><code>${c}</code></pre>`;
    if (b.type === 'divider') return `<hr/>`;
    return `<p>${c}</p>`;
  }).join('\n');

export const htmlToBlocks = (html = '') => {
  if (!html?.trim()) return [mkBlk()];
  const blocks = [];
  // Match all block-level elements (code blocks may be multi-line)
  const RE = /<h1>(.*?)<\/h1>|<h2>(.*?)<\/h2>|<li data-checked="(true|false)">(.*?)<\/li>|<pre><code>([\s\S]*?)<\/code><\/pre>|<hr\/>|<p>(.*?)<\/p>/gis;
  let m;
  while ((m = RE.exec(html)) !== null) {
    if      (m[1] !== undefined) blocks.push(mkBlk('h1',      unesc(m[1])));
    else if (m[2] !== undefined) blocks.push(mkBlk('h2',      unesc(m[2])));
    else if (m[3] !== undefined) blocks.push(mkBlk('todo',    unesc(m[4]), m[3] === 'true'));
    else if (m[5] !== undefined) blocks.push(mkBlk('code',    unesc(m[5])));
    else if (m[0] === '<hr/>')   blocks.push(mkBlk('divider', ''));
    else if (m[6] !== undefined) { const c = unesc(m[6]); if (c.trim()) blocks.push(mkBlk('text', c)); }
  }
  return blocks.length ? blocks : [mkBlk()];
};

// ── Shape normalization ───────────────────────────────────────
const normNote = raw => ({
  id:          raw.id,
  title:       raw.title || '',
  blocks:      htmlToBlocks(raw.body),
  category_id: Array.isArray(raw.category_id) ? raw.category_id[0] : (raw.category_id || null),
  tags:        (raw.tags || []).map(t => (typeof t === 'string' ? t : t.name)),
  color:       raw.color || 0,
  is_pinned:   raw.is_pinned  || false,
  is_archived: raw.is_archived || false,
  created_at:  raw.created_at  || raw.create_date || new Date().toISOString(),
  updated_at:  raw.updated_at  || raw.write_date   || new Date().toISOString(),
});

const toPayload = note => ({
  title:       note.title       || '',
  body:        blocksToHtml(note.blocks || []),
  category_id: note.category_id || null,
  tags:        note.tags        || [],
  color:       note.color       || 0,
  is_pinned:   note.is_pinned   || false,
  is_archived: note.is_archived || false,
});

// ── Service ───────────────────────────────────────────────────
class NotesService {

  // Call on workspace switch — wipe all local notes cache
  clearCache() {
    try {
      const keys = storage.getAllKeys ? storage.getAllKeys() : [];
      keys.filter(k => k.startsWith('nv2_')).forEach(k => cDel(k));
    } catch {}
  }

  // ── NOTES ─────────────────────────────────────────────────
  async list({ search = '', categoryId = null, tag = null } = {}) {
    try {
      const params = { limit: 200 };
      if (search.trim()) params.search = search.trim();
      if (categoryId)    params.category_id = categoryId;
      if (tag)           params.tag = tag;

      const res = await httpClient.get('/api/notes', { params });
      // Handle multiple server response shapes:
      // {notes:[...]}, {records:[...]}, {result:{notes:[...]}}, {result:[...]}, [...]
      const raw = res.data?.notes
        ?? res.data?.records
        ?? res.data?.result?.notes
        ?? res.data?.result?.records
        ?? (Array.isArray(res.data?.result) ? res.data.result : null)
        ?? (Array.isArray(res.data) ? res.data : null)
        ?? [];
      const notes = raw.map(normNote);

      // Refresh list cache; cache individual notes too
      cSet(KEYS.LIST, notes);
      notes.forEach(n => cSet(KEYS.note(n.id), n));
      return notes;
    } catch (e) {
      // Return empty list on error
      return [];
    }
  }

  async get(id) {
    try {
      const res  = await httpClient.get(`/api/notes/${id}`);
      const note = normNote(res.data?.note || res.data);
      cSet(KEYS.note(id), note);
      return note;
    } catch (e) {
      // 404 = backend not yet deployed; fall back silently to cache
      if (e?.response?.status !== 404) {
      }
      return cGet(KEYS.note(id)) || null;
    }
  }

  async create(data = {}) {
    const blocks  = data.blocks || [mkBlk(data.firstBlockType || 'text')];
    const payload = {
      title:       data.title       || '',
      body:        blocksToHtml(blocks),
      category_id: data.category_id || null,
      tags:        data.tags        || [],
      color:       0,
      is_pinned:   false,
      is_archived: false,
    };
    const res  = await httpClient.post('/api/notes', payload);
    const note = normNote(res.data?.note || res.data);
    // Keep blocks from local (avoid round-trip HTML artifacts on fresh note)
    note.blocks = blocks.map(b => ({ ...b, id: mkId() }));
    cSet(KEYS.note(note.id), note);
    cDel(KEYS.LIST);
    return note;
  }

  async save(id, patch) {
    const current = cGet(KEYS.note(id)) || {};
    const merged  = { ...current, ...patch };

    // Optimistic write — local state is always up-to-date immediately
    cSet(KEYS.note(id), merged);
    cDel(KEYS.LIST);

    try {
      const res   = await httpClient.put(`/api/notes/${id}`, toPayload(merged));
      const saved = normNote(res.data?.note || res.data || merged);
      // Preserve local blocks (server round-trip through HTML can alter IDs)
      if (patch.blocks) saved.blocks = patch.blocks;
      cSet(KEYS.note(id), saved);
      return saved;
    } catch (e) {
      // Network error (no response) → queue for background sync, return local copy
      if (!e.response) {
        SyncService.queueOperation({
          type:     'rest',
          method:   'put',
          endpoint: `/api/notes/${id}`,
          data:     toPayload(merged),
          status:   'pending',
        });
        return merged;
      }
      throw e;
    }
  }

  async delete(id) {
    await httpClient.delete(`/api/notes/${id}`);
    cDel(KEYS.note(id));
    cDel(KEYS.LIST);
  }

  // ── CATEGORIES ────────────────────────────────────────────
  async getCategories() {
    try {
      const res  = await httpClient.get('/api/notes/categories');
      const cats = res.data?.categories || res.data || [];
      cSet(KEYS.CATS, cats);
      return cats;
    } catch (e) {
      // Return empty categories on error
      return [];
    }
  }

  async createCategory({ name, color = '#7C3AED', icon = 'folder-outline' }) {
    const res = await httpClient.post('/api/notes/categories', { name, color, icon });
    cDel(KEYS.CATS);
    return res.data?.category || res.data;
  }

  async updateCategory(id, vals) {
    const res = await httpClient.put(`/api/notes/categories/${id}`, vals);
    cDel(KEYS.CATS);
    return res.data?.category || res.data;
  }

  async deleteCategory(id) {
    await httpClient.delete(`/api/notes/categories/${id}`);
    cDel(KEYS.CATS);
  }

  // ── TAGS ──────────────────────────────────────────────────
  async getTagsWithCount() {
    try {
      const res  = await httpClient.get('/api/notes/tags');
      const tags = res.data?.tags || res.data || [];
      return tags.map(t =>
        typeof t === 'string' ? { tag: t, count: 0 } : { tag: t.name, count: t.note_count || 0 }
      );
    } catch {
      const notes = cGet(KEYS.LIST) || [];
      const map   = {};
      notes.forEach(n => (n.tags || []).forEach(t => { map[t] = (map[t] || 0) + 1; }));
      return Object.entries(map).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count);
    }
  }
}

export { mkBlk };
export default new NotesService();