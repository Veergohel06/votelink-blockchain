import { useState, useEffect } from 'react';
import { i18nService } from '../services/i18nService';

// Initialize exactly once at module load — not on every component mount
i18nService.initializeLanguage();

export const useTranslation = () => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [, forceUpdate] = useState({});

  useEffect(() => {
    setCurrentLanguage(i18nService.getCurrentLanguage());

    const handleLanguageChange = () => {
      setCurrentLanguage(i18nService.getCurrentLanguage());
      forceUpdate({});
    };

    window.addEventListener('languageChanged', handleLanguageChange);
    return () => window.removeEventListener('languageChanged', handleLanguageChange);
  }, []);

  const t = (key: string): string => {
    return i18nService.getTranslation(key);
  };

  const changeLanguage = (languageCode: string) => {
    i18nService.setLanguage(languageCode);
    setCurrentLanguage(languageCode);
    
    // Dispatch custom event to notify all components
    window.dispatchEvent(new CustomEvent('languageChanged'));
  };

  return {
    t,
    currentLanguage,
    changeLanguage,
    availableLanguages: i18nService.getSupportedLanguages()
  };
};