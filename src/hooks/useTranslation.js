import { useSelector } from 'react-redux';
import { t as translateKey } from '../i18n/i18n';

/**
 * useTranslation hook — provides translation function with current language from Redux
 *
 * Usage:
 *   const { t } = useTranslation();
 *   <Text>{t('dashboard.title')}</Text>
 *   <Text>{t('tasks.create_task')}</Text>
 */
export const useTranslation = () => {
  const language = useSelector((state) => state.language?.code);

  const t = (key) => translateKey(key, language);

  return { t, language };
};

export default useTranslation;
