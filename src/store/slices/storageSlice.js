import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import StorageQuotaService from '../../services/storage/quotaService';

export const fetchStorageQuota = createAsyncThunk(
  'storage/fetchQuota',
  async (slug, { rejectWithValue }) => {
    try {
      const quota = await StorageQuotaService.getStorageQuota(slug);
      return {
        quota,
        fetchedAt: Date.now(),
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchStorageBreakdown = createAsyncThunk(
  'storage/fetchBreakdown',
  async (slug, { rejectWithValue }) => {
    try {
      const breakdown = await StorageQuotaService.getStorageBreakdown(slug);
      return {
        breakdown,
        fetchedAt: Date.now(),
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  quota: {
    limit_gb: 2, // Default foundation tier
    used_gb: 0,
    available_gb: 2,
    percentage_used: 0,
  },
  breakdown: {
    documents: { count: 0, size_gb: 0 },
    images: { count: 0, size_gb: 0 },
    videos: { count: 0, size_gb: 0 },
    other: { count: 0, size_gb: 0 },
    total: { count: 0, size_gb: 0 },
  },
  loading: false,
  error: null,
  quotaFetchedAt: null,
  breakdownFetchedAt: null,
};

const storageSlice = createSlice({
  name: 'storage',
  initialState,
  reducers: {
    updateQuotaLocally: (state, action) => {
      state.quota = action.payload;
    },
    clearStorageError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Quota
      .addCase(fetchStorageQuota.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStorageQuota.fulfilled, (state, action) => {
        state.loading = false;
        state.quota = action.payload.quota;
        state.quotaFetchedAt = action.payload.fetchedAt;
        state.error = null;
      })
      .addCase(fetchStorageQuota.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Breakdown
      .addCase(fetchStorageBreakdown.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchStorageBreakdown.fulfilled, (state, action) => {
        state.loading = false;
        state.breakdown = action.payload.breakdown;
        state.breakdownFetchedAt = action.payload.fetchedAt;
      })
      .addCase(fetchStorageBreakdown.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { updateQuotaLocally, clearStorageError } = storageSlice.actions;
export default storageSlice.reducer;
