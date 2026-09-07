import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemeMode = 'dark' | 'light';

interface ThemeContextValue {
  theme: ThemeMode;
  toggle: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_KEY = 'coderunner-theme';

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
}

function readInitial(): ThemeMode {
  try {
    const raw = window.localStorage.getItem(THEME_KEY);
    if (raw === 'light' || raw === 'dark') return raw;
  } catch {
    /* noop */
  }
  return systemPrefersDark() ? 'dark' : 'light';
}

function applyToDom(theme: ThemeMode) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.classList.toggle('light', theme === 'light');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0b1120' : '#f7f9fc');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(readInitial);

  useEffect(() => {
    applyToDom(theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  // Follow system theme only until user overrides
  useEffect(() => {
    const override = (() => {
      try {
        return window.localStorage.getItem(THEME_KEY);
      } catch {
        return null;
      }
    })();
    if (override === 'light' || override === 'dark') return;

    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const handler = (e: MediaQueryListEvent) => setTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
      setMode: (mode) => setTheme(mode),
    }),
    [theme],
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* noop */
    }
  }, [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}