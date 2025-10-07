import { translations, TranslationKey, Language } from '@/i18n/translations';

export const useTranslation = (language: Language) => {
  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations.fr[key] || key;
  };

  return { t };
};
