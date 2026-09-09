import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import { reduxStorage as mmkv } from '../services/storage/storageRegistry';
import authReducer from './slices/authSlice';
import themeReducer from './slices/themeSlice';
import workspaceReducer from './slices/workspaceSlice';
import planReducer from './slices/planSlice';
import languageReducer from './slices/languageSlice';
import tierPricingReducer from './slices/tierPricingSlice';
import storageReducer from './slices/storageSlice';
import configReducer from './slices/configSlice';
import permissionsReducer from './slices/permissionsSlice';

// ─── Build a redux-persist compatible adapter from react-native-mmkv ───
// Using the centralized reduxStorage instance from storageRegistry
const mmkvStorage = {
  setItem: (key, value) => {
    mmkv.set(key, value);
    return Promise.resolve(true);
  },
  getItem: (key) => {
    const value = mmkv.getString(key);
    return Promise.resolve(value);
  },
  removeItem: (key) => {
    mmkv.delete(key);
    return Promise.resolve();
  },
};

// ─── Persist config using MMKV (30x faster than AsyncStorage) ───
const persistConfig = {
  key: 'root',
  storage: mmkvStorage,
  whitelist: ['auth', 'language'],
};

const rootReducer = combineReducers({
  auth: authReducer,
  theme: themeReducer,
  workspace: workspaceReducer,
  plan: planReducer,
  language: languageReducer,
  tierPricing: tierPricingReducer,
  storage: storageReducer,
  config: configReducer,
  permissions: permissionsReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});

export const persistor = persistStore(store);
