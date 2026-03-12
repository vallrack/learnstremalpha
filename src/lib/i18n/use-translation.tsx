
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { en } from './dictionaries/en';
import { es } from './dictionaries/es';

type Language = 'es' | 'en';
type Dictionary = typeof es;

interface TranslationContextType {
  t: Dictionary;
  language: Language;
  setLanguage: (lang: Language) => void;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('es');

  const dictionary = language === 'en' ? en : es;

  return (
    <TranslationContext.Provider value={{ t: dictionary, language, setLanguage }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}
