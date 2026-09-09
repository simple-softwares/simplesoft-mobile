import { createSlice } from '@reduxjs/toolkit';

const themeSlice = createSlice({
  name: 'theme',
  initialState: { mode: 'auto' }, // 'auto' | 'light' | 'dark'
  reducers: {
    setThemeMode: (state, action) => { state.mode = action.payload; },
  },
});

export const { setThemeMode } = themeSlice.actions;
export default themeSlice.reducer;
