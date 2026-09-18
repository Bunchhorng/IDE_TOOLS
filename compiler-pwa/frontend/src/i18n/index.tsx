import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translations, type Locale, type TranslationKey } from './translations';

export type { Locale, TranslationKey } from './translations';

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const STORAGE_KEY = 'coderunner-locale';

function getInitial(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'km') return stored;
  } catch { /* SSR / private mode */ }
  try {
    const lang = navigator.language?.toLowerCase() ?? '';
    if (lang.startsWith('km')) return 'km';
  } catch { /* unavailable */ }
  return 'en';
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitial);

  // Keep <html lang> in sync so screen readers, spellcheckers and font fallback
  // (e.g. Khmer-capable fonts) follow the selected UI language.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => {
      let str = translations[locale]?.[key] ?? translations.en[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replaceAll(`{${k}}`, String(v));
        }
      }
      return str;
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
