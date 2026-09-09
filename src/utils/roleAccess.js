/**
 * Role-based module visibility.
 *
 * Uses department_id (Odoo integer) not department name string — survives
 * admins renaming "Sales" to "Sales & Marketing" in the backend.
 *
 * Roles:
 *   admin    — sees everything (billing, all modules, analytics)
 *   manager  — sees their department modules + collaboration tools
 *   employee — sees only personal tools (tasks, attendance, leave, notes, chat)
 */

// Modules every role can always see
const UNIVERSAL_MODULES = ['tasks', 'attendance', 'chat', 'notes', 'calendar', 'files', 'leave'];

// Modules only admin sees (never manager or employee)
const ADMIN_ONLY_MODULES = ['automation'];

// Modules managers see regardless of department
const MANAGER_BASE_MODULES = [...UNIVERSAL_MODULES, 'performance'];

// Department ID → extra modules unlocked for managers in that department.
// Key is the Odoo hr.department id (integer).
// We also keep a fuzzy name fallback for workspaces that skipped HR setup.
const DEPT_MODULE_MAP = [
  { keywords: ['sale', 'business', 'revenue', 'commercial'], modules: ['crm', 'sales'] },
  { keywords: ['hr', 'human', 'people', 'personnel', 'talent'], modules: ['hr', 'leave'] },
  { keywords: ['operation', 'ops', 'logistics', 'warehouse', 'supply'], modules: ['inventory'] },
  { keywords: ['finance', 'account', 'billing'], modules: [] },
  // Engineering / Marketing / other: no extra modules beyond MANAGER_BASE
];

// Pre-built department_id → module map (populated at runtime via setDepartmentMap)
let _deptIdMap = {};  // { departmentId: ['crm', 'sales', ...] }

/**
 * Call this once after login if you want ID-based lookups.
 * Pass an array of { id, name } department objects from Odoo.
 * Falls back to keyword matching if not called.
 */
export function setDepartmentMap(departments = []) {
  _deptIdMap = {};
  for (const dept of departments) {
    const nameLower = (dept.name || '').toLowerCase();
    for (const entry of DEPT_MODULE_MAP) {
      if (entry.keywords.some(k => nameLower.includes(k))) {
        _deptIdMap[dept.id] = entry.modules;
        break;
      }
    }
    if (_deptIdMap[dept.id] === undefined) {
      _deptIdMap[dept.id] = [];  // known department, no extra modules
    }
  }
}

/**
 * Get extra modules for a department by ID, falling back to name-based matching.
 */
function _deptModules(departmentId, departmentName) {
  // ID-based (preferred — critique #3)
  if (departmentId && _deptIdMap[departmentId] !== undefined) {
    return _deptIdMap[departmentId];
  }
  // Name-based fuzzy fallback
  const nameLower = (departmentName || '').toLowerCase();
  for (const entry of DEPT_MODULE_MAP) {
    if (entry.keywords.some(k => nameLower.includes(k))) {
      return entry.modules;
    }
  }
  return [];
}

/**
 * Returns the set of module keys visible to a user, given their role and
 * the modules their subscription tier has unlocked.
 *
 * @param {string} role            'admin' | 'manager' | 'employee'
 * @param {number|null} departmentId  Odoo department ID integer
 * @param {string} departmentName  Fallback department name
 * @param {string[]} tierModules   Modules the subscription tier allows
 * @returns {string[]}             Final list of module keys to render
 */
export function getRoleModules(role, departmentId, departmentName, tierModules) {
  if (role === 'admin') {
    return tierModules;  // admin sees everything the tier allows
  }

  if (role === 'manager') {
    const extra = _deptModules(departmentId, departmentName);
    const allowed = new Set([...MANAGER_BASE_MODULES, ...extra]);
    return tierModules.filter(m => allowed.has(m));
  }

  // employee — universal modules only
  return tierModules.filter(m => UNIVERSAL_MODULES.includes(m));
}

/**
 * Single module check — use in navigator conditional rendering.
 */
export function roleHasModule(role, departmentId, departmentName, moduleKey, tierModules) {
  return getRoleModules(role, departmentId, departmentName, tierModules).includes(moduleKey);
}

/**
 * True if the user can see billing / plan / add-ons screens.
 * Only admins can.
 */
export function canSeeBilling(role) {
  return role === 'admin';
}
