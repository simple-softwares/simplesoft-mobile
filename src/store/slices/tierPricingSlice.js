import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import PricingService from '../../services/billing/pricingService';

export const fetchTierPricing = createAsyncThunk(
  'tierPricing/fetch',
  async (skipCache = true, { rejectWithValue }) => {
    // skipCache defaults to true - always fetch fresh pricing from server
    try {
      // Fetch tier pricing directly from the dedicated endpoint
      const tiers = await PricingService.getTierPricing(skipCache);

      return {
        tiers: tiers || {},
        fetchedAt: Date.now(),
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  tiers: {
    foundation: {
      name: 'Foundation',
      description: 'Core features for admin only',
      monthly: 0,
      annual: 0,
      discount_percent: 0,
      storage_limit_gb: 2,
      max_users: 1,
      max_projects: 5,
      features: ['tasks', 'projects', 'notes', 'contacts', 'chat', 'files']
    },
    operations: {
      name: 'Operations',
      description: 'Advanced tools for team collaboration. CRM, Sales, HR modules included.',
      monthly: 599,
      annual: 5390,
      discount_percent: 10,
      storage_limit_gb: 5,
      max_users: -1,
      max_projects: -1,
      features: ['tasks', 'projects', 'notes', 'contacts', 'chat', 'files', 'crm', 'sales', 'hr', 'attendance', 'inventory']
    },
    automated: {
      name: 'Automated',
      description: 'Everything plus AI and automation',
      monthly: 999,
      annual: 8991,
      discount_percent: 25,
      storage_limit_gb: 50,
      max_users: -1,
      max_projects: -1,
      features: ['tasks', 'projects', 'notes', 'contacts', 'chat', 'files', 'crm', 'sales', 'hr', 'attendance', 'inventory', 'ai', 'automation', 'performance']
    },
    enterprise: {
      name: 'Enterprise',
      description: 'Custom solutions for large organizations',
      monthly: null,
      annual: null,
      discount_percent: 0,
      storage_limit_gb: null,
      max_users: -1,
      max_projects: -1,
      features: []
    },
  },
  loading: false,
  error: null,
  fetchedAt: null,
};

const tierPricingSlice = createSlice({
  name: 'tierPricing',
  initialState,
  reducers: {
    clearTierPricingError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTierPricing.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTierPricing.fulfilled, (state, action) => {
        state.loading = false;
        state.tiers = action.payload.tiers;
        state.modules = action.payload.modules;
        state.fetchedAt = action.payload.fetchedAt;
        state.error = null;
      })
      .addCase(fetchTierPricing.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearTierPricingError } = tierPricingSlice.actions;
export default tierPricingSlice.reducer;
