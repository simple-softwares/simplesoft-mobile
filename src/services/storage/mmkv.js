import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV({
  id: 'simplesoft-workspace',
});

export const getItem = (key) => {
  const value = storage.getString(key);
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return value;
  }
};

export const setItem = (key, value) => {
  if (typeof value === 'object') {
    storage.set(key, JSON.stringify(value));
  } else {
    storage.set(key, value);
  }
};

export const removeItem = (key) => {
  storage.delete(key);
};

export const clearAll = () => {
  storage.clearAll();
};

export default {
  getItem,
  setItem,
  removeItem,
  clearAll,
};
