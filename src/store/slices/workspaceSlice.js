import { createSlice } from '@reduxjs/toolkit';
import ProvisionService from '../../services/provision/provisionService';

const ws = ProvisionService.getWorkspace();

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState: {
    configured:    !!ws,
    slug:          ws?.slug          || null,
    workspace_url: ws?.workspace_url || null,
    company:       ws?.company       || null,
    modules:       ws?.modules       || [],
    cloudAi: {
      enabled:  false,
      provider: null,   // 'openai' | 'anthropic' | 'gemini'
      model:    null,   // model name shown in UI
      isAdmin:  false,  // whether current user can configure
      hasKey:   false,  // admin-only: whether an API key is saved
    },
  },
  reducers: {
    setWorkspace: (state, action) => {
      const w = action.payload;
      state.configured    = true;
      state.slug          = w.slug;
      state.workspace_url = w.workspace_url;
      state.company       = w.company;
      state.modules       = w.modules || [];
      ProvisionService.saveWorkspace(w);
    },
    clearWorkspace: (state) => {
      state.configured    = false;
      state.slug          = null;
      state.workspace_url = null;
      state.company       = null;
      state.modules       = [];
      state.cloudAi       = { enabled: false, provider: null, model: null, isAdmin: false, hasKey: false };
      ProvisionService.clearWorkspace();
    },
    setCloudAi: (state, action) => {
      state.cloudAi = { ...state.cloudAi, ...action.payload };
    },
  },
});

export const { setWorkspace, clearWorkspace, setCloudAi } = workspaceSlice.actions;
export default workspaceSlice.reducer;
