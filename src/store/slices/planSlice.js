import { createSlice } from '@reduxjs/toolkit';
import { moduleToTier, getModulesForTier } from '../../config/tierFeatures';

const planSlice = createSlice({
  name: 'plan',
  initialState: {
    state:            'active',
    is_read_only:     false,
    tier:             'foundation',  // 'foundation' | 'operations' | 'automated' | 'enterprise'
    billing_cycle:    'annual',      // 'monthly' | 'annual'
    user_count:       1,
    modules:          ['tasks', 'projects', 'contacts', 'notes', 'chat', 'files'],  // Current enabled modules
    selected_modules: ['tasks', 'projects', 'contacts', 'notes', 'chat', 'files'],  // Legacy support
    total_monthly:    0,
    expires_at:       null,
  },
  reducers: {
    setPlan: (state, action) => {
      const newState = { ...state, ...action.payload };

      // Ensure modules field exists (backward compatibility)
      if (action.payload.selected_modules && !action.payload.modules) {
        newState.modules = action.payload.selected_modules;
      }
      
      // If old selected_modules is provided, auto-detect tier
      if (action.payload.selected_modules && !action.payload.tier) {
        newState.tier = moduleToTier(action.payload.selected_modules);
      }
      
      // If tier is provided but modules aren't, infer modules from tier
      if (action.payload.tier && !action.payload.modules && !action.payload.selected_modules) {
        newState.modules = getModulesForTier(action.payload.tier);
      }

      return newState;
    },

    // Convenience: set tier directly (will infer modules)
    setTier: (state, action) => {
      state.tier = action.payload;
      // Update modules based on new tier
      state.modules = getModulesForTier(action.payload);
    },

    // Set billing cycle
    setBillingCycle: (state, action) => {
      state.billing_cycle = action.payload; // 'monthly' | 'annual'
    },

    // Set user count for team
    setUserCount: (state, action) => {
      state.user_count = action.payload;
    },

    clearPlan: () => ({
      state: 'active',
      is_read_only: false,
      tier: 'foundation',
      billing_cycle: 'annual',
      user_count: 1,
      modules: ['tasks', 'projects', 'contacts', 'notes', 'chat', 'files'],
      selected_modules: ['tasks', 'projects', 'contacts', 'notes', 'chat', 'files'],
      total_monthly: 0,
      expires_at: null,
    }),
  },
});

export const { setPlan, setTier, setBillingCycle, setUserCount, clearPlan } = planSlice.actions;
export default planSlice.reducer;