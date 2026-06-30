"use client";

import React, { createContext, useContext, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Locale = "en" | "ar";

interface LanguageContextType {
  locale: Locale;
  dictionary: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  setLocale: (locale: Locale) => void;
  isPending: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({
  children,
  initialLocale,
  initialDictionary,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
  initialDictionary: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [dictionary, setDictionary] = useState(initialDictionary);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const setLocale = (newLocale: Locale) => {
    if (newLocale === locale) return;

    startTransition(async () => {
      // Set cookie for persistence
      document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
      
      setLocaleState(newLocale);
      
      // Update dictionary
      const response = await fetch(`/api/i18n?locale=${newLocale}`);
      if (response.ok) {
        const newDictionary = await response.json();
        setDictionary(newDictionary);
      }

      router.refresh();
    });
  };

  return (
    <LanguageContext.Provider value={{ locale, dictionary, setLocale, isPending }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  
  const t = (path: string, fallback?: string): string => {
    const keys = path.split(".");
    let value = context.dictionary;
    for (const key of keys) {
      value = value?.[key];
    }
    return (value as unknown as string) || fallback || path;
  };

  return { t, locale: context.locale, setLocale: context.setLocale, isPending: context.isPending };
}
