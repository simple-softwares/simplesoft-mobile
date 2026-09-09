/**
 * i18n Configuration — Add new languages by updating this file + adding translation JSON
 *
 * To add a new language:
 * 1. Add entry to SUPPORTED_LANGUAGES
 * 2. Create src/i18n/translations/XX.json (copy from template.json)
 * 3. Translate all strings
 * 4. (Optional) Import and register in i18n.js
 */

export const SUPPORTED_LANGUAGES = {
  'en': {
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
  },
  'hi': {
    name: 'Hindi',
    nativeName: 'हिंदी',
    flag: '🇮🇳',
  },
  // Add new languages here: uncomment to enable
  // 'es': { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  // 'fr': { name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  // 'pt': { name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
};

export const DEFAULT_LANGUAGE = 'en';

/**
 * Get a list of available language options for picker UI
 */
export const getLanguageOptions = () =>
  Object.entries(SUPPORTED_LANGUAGES).map(([code, meta]) => ({
    code,
    ...meta,
  }));
