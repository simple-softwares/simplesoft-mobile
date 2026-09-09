/**
 * i18n Translation Loader
 *
 * Dynamically loads translation JSON files and provides lookup utilities.
 * Supports fallback to English if a key is missing in the selected language.
 */

import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from './config';

// Preload all available translation files
const translations = {
  en: require('./translations/en.json'),
  hi: require('./translations/hi.json'),
};

/**
 * Get translation value for a key in the specified language
 * Supports dot notation: 'dashboard.title' → translations[lang].dashboard.title
 * Falls back to English if key is missing
 */
export const t = (key, language = DEFAULT_LANGUAGE) => {
  if (!translations[language]) {
    language = DEFAULT_LANGUAGE;
  }

  // Split key by dots for nested access: 'dashboard.title' → ['dashboard', 'title']
  const keys = key.split('.');
  let value = translations[language];

  for (const k of keys) {
    value = value?.[k];
    if (!value) break;
  }

  // If not found in selected language, try English
  if (!value && language !== DEFAULT_LANGUAGE) {
    value = translations[DEFAULT_LANGUAGE];
    for (const k of keys) {
      value = value?.[k];
      if (!value) break;
    }
  }

  // Return key as-is if not found (helps identify missing translations)
  return value || key;
};

/**
 * Get all translations for a language
 */
export const getTranslations = (language = DEFAULT_LANGUAGE) => {
  return translations[language] || translations[DEFAULT_LANGUAGE];
};

/**
 * Check if a language is supported
 */
export const isLanguageSupported = (language) => {
  return language in SUPPORTED_LANGUAGES;
};

/**
 * Load a new translation dynamically (for future extensions)
 */
export const addTranslation = (languageCode, translationObj) => {
  translations[languageCode] = translationObj;
};

export default { t, getTranslations, isLanguageSupported, addTranslation };
