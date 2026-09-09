# Multi-Language Support (i18n)

This directory contains the internationalization (i18n) system for the SimpleSoft Workspace app.

## Architecture

The i18n system is designed to be **flexible and config-driven**:
- Add a new language by adding one entry to `config.js` and creating a translation JSON file
- No code changes required — translations are loaded dynamically
- Language selection is persisted in Redux/MMKV storage
- All translations are keyed with dot notation (e.g., `dashboard.title`)

## Files

- **config.js** — Language metadata and configuration
  - `SUPPORTED_LANGUAGES` — Dictionary of available languages
  - `DEFAULT_LANGUAGE` — Fallback language (currently 'en')
  - `getLanguageOptions()` — Returns array for UI pickers

- **i18n.js** — Translation loader and lookup utilities
  - `t(key, language)` — Translate a key in a specific language
  - `getTranslations(language)` — Get all translations for a language
  - `isLanguageSupported(code)` — Check if language is available
  - `addTranslation(code, obj)` — Dynamically add translations (for future extensions)

- **translations/** — Translation JSON files
  - `template.json` — Reference template (use when adding new languages)
  - `en.json` — English translations
  - `hi.json` — Hindi translations

## Adding a New Language

### Step 1: Update config.js
```js
// src/i18n/config.js
export const SUPPORTED_LANGUAGES = {
  'en': { name: 'English',  nativeName: 'English',   flag: '🇺🇸' },
  'hi': { name: 'Hindi',    nativeName: 'हिंदी',    flag: '🇮🇳' },
  'es': { name: 'Spanish',  nativeName: 'Español',   flag: '🇪🇸' },  // ← ADD THIS
};
```

### Step 2: Create translation file
```bash
cp src/i18n/translations/template.json src/i18n/translations/es.json
```

### Step 3: Translate strings
Edit `es.json` and translate all values (keys stay the same).

### Step 4: Language appears in Settings
The new language automatically appears in Settings → Language picker.

## Using Translations in Components

### With the useTranslation Hook (Recommended)

```jsx
import { useTranslation } from '../../hooks/useTranslation';

export const MyScreen = () => {
  const { t, language } = useTranslation();

  return (
    <View>
      <Text>{t('dashboard.title')}</Text>
      <Text>{t('tasks.create_task')}</Text>
      <Text>Current language: {language}</Text>
    </View>
  );
};
```

### Without a Hook (for non-React code)

```js
import { t } from '../i18n/i18n';

const greeting = t('dashboard.good_morning', 'en');  // Specify language explicitly
```

## Redux Integration

Language preference is stored in Redux:

```js
const language = useSelector(s => s.language?.code);  // e.g., 'en'
```

To change language:
```js
import { useDispatch } from 'react-redux';
import { setLanguage } from '../store/slices/languageSlice';

const dispatch = useDispatch();
dispatch(setLanguage('hi'));  // User's selection persists on next app launch
```

## Translation Keys

Keys follow dot notation: `section.subsection.key`

### Current Sections
- **common** — App-wide strings (OK, Cancel, Save, Edit, Loading, etc.)
- **auth** — Login/signup (Login, Email, Password, Sign Up, etc.)
- **dashboard** — Dashboard screen (Title, Greetings, Tasks, Projects, etc.)
- **tasks** — Task management (Create Task, Mark as Done, Delete Task, etc.)
- **projects** — Project management (Create Project, Members, Delete Project, etc.)
- **contacts** — Contacts (Add Contact, Phone, Email, Company, etc.)
- **notes** — Notes (Create Note, Content, Category, Tags, etc.)
- **team** — Team management (Members, Invite, Role, Admin, etc.)
- **settings** — Settings screen (Language, Theme, Notifications, Account, etc.)
- **validation** — Form validation errors (Required, Invalid Email, Password Too Short, etc.)
- **messages** — System messages (Confirm Delete, No Internet, Offline Mode, etc.)

## Example: Translating a Screen

**Before:**
```jsx
const DashboardScreen = () => {
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return <Text>{getGreeting()}</Text>;
};
```

**After:**
```jsx
import { useTranslation } from '../../hooks/useTranslation';

const DashboardScreen = () => {
  const { t } = useTranslation();

  const getGreeting = useCallback(() => {
    const h = new Date().getHours();
    if (h < 12) return t('dashboard.good_morning');
    if (h < 17) return t('dashboard.good_afternoon');
    return t('dashboard.good_evening');
  }, [t]);

  return <Text>{getGreeting()}</Text>;
};
```

## Features

✅ **Dynamic loading** — Translations loaded from JSON at runtime  
✅ **Dot notation** — Organized keys (dashboard.title, tasks.create_task)  
✅ **Automatic fallback** — Missing keys fall back to English  
✅ **Persistence** — User's language choice persists across app sessions  
✅ **No code changes** — Add new languages without touching code  
✅ **React integration** — useTranslation hook for easy access  
✅ **Redux state** — Language is centralized in Redux store  

## Performance

- Translations are loaded once at module initialization (via `require()`)
- Language lookup is O(1) with dot notation parsing
- No network calls for language switching
- Minimal memory overhead (~50KB for all translations)

## Future Extensions

To add language-specific features (e.g., RTL support for Arabic):

```js
// src/i18n/config.js
export const SUPPORTED_LANGUAGES = {
  ar: { name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', rtl: true },
};

// Component:
const { t, language } = useTranslation();
const isRTL = SUPPORTED_LANGUAGES[language]?.rtl;
```

Or to add translations dynamically:

```js
import { addTranslation } from '../i18n/i18n';

const customTranslations = require('./translations/custom-module.json');
addTranslation('en', customTranslations);
```
