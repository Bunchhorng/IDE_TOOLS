import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface EditorPreferences {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  fontLigatures: boolean;
  autoSave: boolean;
  defaultLanguage: string;
}

const DEFAULTS: EditorPreferences = {
  fontSize: 14,
  tabSize: 4,
  wordWrap: false,
  minimap: true,
  fontLigatures: true,
  autoSave: false,
  defaultLanguage: 'cpp',
};

interface PreferencesContextValue {
  prefs: EditorPreferences;
  updatePrefs: (patch: Partial<EditorPreferences>) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

const PREFS_KEY = 'coderunner-prefs';

function readPrefs(): EditorPreferences {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<EditorPreferences>) };
  } catch {
    /* noop */
  }
  return DEFAULTS;
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<EditorPreferences>(readPrefs);

  useEffect(() => {
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* noop */
    }
  }, [prefs]);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      prefs,
      updatePrefs: (patch) => setPrefs((p) => ({ ...p, ...patch })),
    }),
    [prefs],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}