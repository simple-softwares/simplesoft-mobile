import { createSlice } from '@reduxjs/toolkit';
import { DEFAULT_LANGUAGE } from '../../i18n/config';

const languageSlice = createSlice({
  name: 'language',
  initialState: { code: DEFAULT_LANGUAGE },
  reducers: {
    setLanguage: (state, action) => { state.code = action.payload; },
  },
});

export const { setLanguage } = languageSlice.actions;
export default languageSlice.reducer;
