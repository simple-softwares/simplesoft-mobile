// This must be imported first
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a UUID v4
 * @returns {string} UUID v4 string
 */
export const generateUUID = () => {
  return uuidv4();
};

/**
 * Generate a short ID (first 8 characters of UUID)
 * @returns {string} Short ID
 */
export const generateShortUUID = () => {
  return uuidv4().split('-')[0];
};

/**
 * Validate a UUID v4
 * @param {string} uuid - UUID to validate
 * @returns {boolean} True if valid UUID v4
 */
export const isValidUUID = (uuid) => {
  if (!uuid) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Default export for backward compatibility
export default {
  generateUUID,
  generateShortUUID,
  isValidUUID
};
