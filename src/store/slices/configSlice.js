import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import ConfigService from '../../services/config/configService';
import PricingService from '../../services/billing/pricingService';

export const fetchAppConfig = createAsyncThunk(
  'config/fetchApp',
  async (skipCache = true, { rejectWithValue }) => {
    try {
      const config = await ConfigService.getAppConfig(skipCache);
      return config;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchAddons = createAsyncThunk(
  'config/fetchAddons',
  async (skipCache = false, { rejectWithValue }) => {
    try {
      const addons = await PricingService.getAddons(skipCache);
      return addons;
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
      features: ['tasks', 'projects', 'notes', 'contacts', 'chat', 'files'],
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
      features: ['tasks', 'projects', 'notes', 'contacts', 'chat', 'files', 'crm', 'sales', 'hr', 'attendance', 'inventory'],
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
      features: ['tasks', 'projects', 'notes', 'contacts', 'chat', 'files', 'crm', 'sales', 'hr', 'attendance', 'inventory', 'ai', 'automation', 'performance'],
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
      features: [],
    },
  },
  all_modules: [],
  tier_modules: {},
  feature_matrix: {},
  addons: [],
  limits: {
    max_file_size_mb: 500,
    max_workspace_name_length: 50,
    max_project_name_length: 100,
  },
  features: {
    enable_payments: true,
    enable_trials: true,
    enable_custom_plans: false,
    enable_addons: true,
  },
  loading: false,
  error: null,
  fetchedAt: null,
};

const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    clearConfigError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAppConfig.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAppConfig.fulfilled, (state, action) => {
        state.loading = false;
        state.tiers = action.payload?.tiers || state.tiers;
        state.all_modules = action.payload?.all_modules || [];
        state.tier_modules = action.payload?.tier_modules || {};
        state.feature_matrix = action.payload?.feature_matrix || {};
        state.limits = action.payload?.limits || state.limits;
        state.features = action.payload?.features || state.features;
        state.fetchedAt = Date.now();
        state.error = null;
      })
      .addCase(fetchAppConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchAddons.fulfilled, (state, action) => {
        state.addons = action.payload || [];
        state.error = null;
      })
      .addCase(fetchAddons.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { clearConfigError } = configSlice.actions;
export default configSlice.reducer;
