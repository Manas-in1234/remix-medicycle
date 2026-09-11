import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { LanguageCode } from '../types';
import { TRANSLATIONS, TranslationKey } from '../lib/translations';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: TranslationKey, fallback?: string) => string;
}

const STORAGE_KEY = 'medicycle-language';

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && saved in TRANSLATIONS) {
        return saved as LanguageCode;
      }
    } catch {
      // ignore localStorage errors in restricted environments
    }
    return 'en';
  });

  const setLanguage = useCallback((newLang: LanguageCode) => {
    if (!newLang || !(newLang in TRANSLATIONS)) return;
    setLanguageState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey, fallback?: string): string => {
      const currentDict = TRANSLATIONS[language];
      if (currentDict && currentDict[key]) {
        return currentDict[key];
      }
      // Fallback to English
      const enDict = TRANSLATIONS.en;
      if (enDict && enDict[key]) {
        return enDict[key];
      }
      return fallback || key;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
