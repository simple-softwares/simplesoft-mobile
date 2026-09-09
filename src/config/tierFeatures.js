/**
 * Tier-based feature matrix
 * Maps subscription tiers to available features/modules
 */

export const TIERS = {
  FOUNDATION: 'foundation',
  OPERATIONS: 'operations',
  AUTOMATED: 'automated',
  ENTERPRISE: 'enterprise',
};

export const TIER_NAMES = {
  foundation: 'Foundation',
  operations: 'Operations',
  automated: 'Automated',
  enterprise: 'Enterprise',
};

export const TIER_PRICES = {
  foundation: {
    monthly: 0,
    annual: 0,
    userLimit: 1, // Admin only
    currency: '₹'
  },
  operations: {
    monthly: 599,
    annual: 499,
    userLimit: null, // Unlimited
    currency: '₹'
  },
  automated: {
    monthly: 999,
    annual: 899,
    userLimit: null, // Unlimited
    currency: '₹'
  },
  enterprise: {
    monthly: null, // Custom
    annual: null,
    userLimit: null,
    currency: '₹',
    custom: true
  },
};

export const TIER_DESCRIPTIONS = {
  foundation: 'Workspace admin only. Core tools for personal productivity.',
  operations: 'Complete team access. Control over staff, sales, and inventory.',
  automated: 'Zero manual work; AI-driven insights, automations, and workflows.',
  enterprise: 'Tailored integrations and dedicated support.',
};

export const TIER_AUDIENCES = {
  foundation: 'Workspace admins & solo users',
  operations: 'Growing teams & field operations',
  automated: 'Tech-forward businesses with unlimited teams',
  enterprise: 'Large organizations with custom needs',
};

/**
 * Feature matrix: which modules are included in each tier
 * Key = module key from MODULE_REGISTRY
 * Value = minimum tier required
 */
export const FEATURE_MATRIX = {
  // Core features (all tiers)
  projects: { foundation: true, operations: true, automated: true, label: 'Projects & Tasks' },
  tasks: { foundation: true, operations: true, automated: true, label: 'Projects & Tasks' },
  notes: { foundation: true, operations: true, automated: true, label: 'Notes & Contacts' },
  contacts: { foundation: true, operations: true, automated: true, label: 'Notes & Contacts' },
  chat: { foundation: true, operations: true, automated: true, label: 'Chat & File Sharing' },
  files: { foundation: true, operations: true, automated: true, label: 'Chat & File Sharing' },

  // Operations tier (includes team/HR features)
  crm: { foundation: false, operations: true, automated: true, label: 'CRM & Sales' },
  sales: { foundation: false, operations: true, automated: true, label: 'CRM & Sales' },
  hr: { foundation: false, operations: true, automated: true, label: 'HR & Team Management' },
  attendance: { foundation: false, operations: true, automated: true, label: 'Attendance Tracking' },
  inventory: { foundation: false, operations: true, automated: true, label: 'Inventory Tracking' },

  // Automated tier (premium)
  ai: { foundation: false, operations: false, automated: true, label: 'Local AI Assistant' },
  automation: { foundation: false, operations: false, automated: true, label: 'Custom Automations' },
  performance: { foundation: false, operations: false, automated: true, label: 'Advanced Performance' },
};

export const TIER_FEATURES = {
  foundation: [
    // Admin-only access to core features
    'projects',
    'tasks',
    'notes',
    'contacts',
    'chat',
    'files',
  ],
  operations: [
    // Full team access
    'projects',
    'tasks',
    'notes',
    'contacts',
    'chat',
    'files',
    'crm',
    'hr',        // Teams, Employees, Departments, Leaves
    'attendance',
    'inventory',
    'sales',     // Field ops & sales tracking
  ],
  automated: [
    // Everything + AI & Automations
    'projects',
    'tasks',
    'notes',
    'contacts',
    'chat',
    'files',
    'crm',
    'hr',
    'attendance',
    'inventory',
    'sales',
    'ai',
    'automation',
    'performance',
  ],
  enterprise: [
    // Everything including calendar
    'projects',
    'tasks',
    'notes',
    'contacts',
    'chat',
    'files',
    'crm',
    'hr',
    'attendance',
    'inventory',
    'sales',
    'ai',
    'automation',
    'performance',
    'calendar',
  ],
};

/**
 * Legacy: Map old module keys to their tier
 * If a subscription was built with individual modules, map them to tiers
 */
export const moduleToTier = (modulesList) => {
  if (!modulesList || modulesList.length === 0) {
    return TIERS.FOUNDATION;
  }

  const hasAI = modulesList.includes('ai') || modulesList.includes('automation');
  const hasOperations = modulesList.includes('hr') || modulesList.includes('attendance');

  if (hasAI) return TIERS.AUTOMATED;
  if (hasOperations) return TIERS.OPERATIONS;
  return TIERS.FOUNDATION;
};

/**
 * Get the minimum tier required to access a module
 */
export const getMinTierForModule = (moduleKey) => {
  for (const [tier, modules] of Object.entries(TIER_FEATURES)) {
    if (modules.includes(moduleKey)) {
      return tier;
    }
  }
  return TIERS.ENTERPRISE; // Unknown modules require enterprise
};

/**
 * Check if a tier has access to a module
 */
export const tierHasModule = (tier, moduleKey) => {
  return TIER_FEATURES[tier]?.includes(moduleKey) || false;
};

/**
 * Get all modules available in a tier
 */
export const getModulesForTier = (tier) => {
  return TIER_FEATURES[tier] || [];
};

export default {
  TIERS,
  TIER_NAMES,
  TIER_PRICES,
  TIER_DESCRIPTIONS,
  TIER_FEATURES,
  moduleToTier,
  getMinTierForModule,
  tierHasModule,
  getModulesForTier,
};
